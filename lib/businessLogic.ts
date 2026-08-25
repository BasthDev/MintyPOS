import { Decimal } from 'decimal.js';
import * as SQLite from 'expo-sqlite';
import {
  deductStockFIFO,
  getCurrentStock,
  handleCheckoutOrder,
  processRestockToSmallestUnit
} from './database';

// Re-export core business logic functions
export {
  deductStockFIFO, getCurrentStock, handleCheckoutOrder, processRestockToSmallestUnit
};

// Types
export interface RestockPayload {
  ingredientId: number;
  supplierId: number;
  quantityBought: number;
  boughtUnit: string;
  unitMultiplier: number;
  totalCostPaid: number;
}

export interface CartItem {
  productId: number;
  quantitySold: number;
}

// Additional business logic utilities

/**
 * Calculate total cost of a recipe based on inventory batches (FEFO pricing)
 * This is used to display recipe cost in the recipe list
 */
export const calculateRecipeCost = async (
  db: SQLite.SQLiteDatabase,
  recipeId: number
): Promise<number> => {
  const recipes = await db.getAllAsync<{ ingredient_id: number; quantity_needed_base: number }>(
    'SELECT ingredient_id, quantity_needed_base FROM recipe_ingredients WHERE recipe_id = ?',
    [recipeId]
  );

  let totalCost = new Decimal(0);

  for (const recipe of recipes) {
    // Get cost per base unit using FEFO logic
    const batch = await db.getFirstAsync<{ cost_per_base_unit: number }>(
      `SELECT cost_per_base_unit FROM inventory_batches 
       WHERE ingredient_id = ? AND remaining_quantity_base > 0 
       ORDER BY 
         CASE 
           WHEN expiration_date IS NOT NULL THEN 
             CASE 
               WHEN datetime(expiration_date) < datetime('now') THEN 0 
               ELSE 1 
             END
           ELSE 2 
         END,
         CASE 
           WHEN expiration_date IS NOT NULL THEN expiration_date 
           ELSE received_date 
         END ASC
       LIMIT 1`,
      [recipe.ingredient_id]
    );

    if (batch) {
      const quantityNeeded = new Decimal(recipe.quantity_needed_base);
      const costPerUnit = new Decimal(batch.cost_per_base_unit);
      totalCost = totalCost.add(quantityNeeded.mul(costPerUnit));
    }
  }

  return totalCost.toNumber();
};

/**
 * Calculate cost of goods sold (COGS) for a product based on its recipe
 * Uses FEFO (First Expired, First Out) pricing - prioritizes expiring stock
 */
export const calculateProductCOGS = async (
  db: SQLite.SQLiteDatabase,
  productId: number
): Promise<number> => {
  const product = await db.getFirstAsync<{ recipe_definition_id: number }>(
    'SELECT recipe_definition_id FROM products WHERE id = ?',
    [productId]
  );

  if (!product || !product.recipe_definition_id) {
    return 0;
  }

  return await calculateRecipeCost(db, product.recipe_definition_id);
};

/**
 * Calculate profit margin for a product
 */
export const calculateProfitMargin = async (
  db: SQLite.SQLiteDatabase,
  productId: number,
  sellingPrice: number
): Promise<{ margin: number; percentage: number }> => {
  const cogs = await calculateProductCOGS(db, productId);
  const margin = new Decimal(sellingPrice).minus(new Decimal(cogs));
  const percentage = margin.div(new Decimal(sellingPrice)).mul(100);

  return {
    margin: margin.toNumber(),
    percentage: percentage.toNumber(),
  };
};

/**
 * Check if ingredient stock is below minimum threshold
 */
export const checkLowStockIngredients = async (
  db: SQLite.SQLiteDatabase
): Promise<Array<{ ingredient: any; currentStock: number; minimumStock: number }>> => {
  const ingredients = await db.getAllAsync<any>(`
    SELECT i.*, u.name as unit_name, u.symbol as unit_symbol 
    FROM ingredients i 
    JOIN units u ON i.base_unit_id = u.id
  `);

  const lowStockItems = [];

  for (const ingredient of ingredients) {
    const currentStock = await getCurrentStock(db, ingredient.id);
    const minimumStock = new Decimal(ingredient.minimum_stock);

    if (new Decimal(currentStock).lt(minimumStock)) {
      lowStockItems.push({
        ingredient,
        currentStock,
        minimumStock: minimumStock.toNumber(),
      });
    }
  }

  return lowStockItems;
};

/**
 * Get inventory value for an ingredient
 */
export const getIngredientInventoryValue = async (
  db: SQLite.SQLiteDatabase,
  ingredientId: number
): Promise<number> => {
  const batches = await db.getAllAsync<{ remaining_quantity_base: number; cost_per_base_unit: number }>(
    'SELECT remaining_quantity_base, cost_per_base_unit FROM inventory_batches WHERE ingredient_id = ? AND remaining_quantity_base > 0',
    [ingredientId]
  );

  let totalValue = new Decimal(0);

  for (const batch of batches) {
    const quantity = new Decimal(batch.remaining_quantity_base);
    const cost = new Decimal(batch.cost_per_base_unit);
    totalValue = totalValue.add(quantity.mul(cost));
  }

  return totalValue.toNumber();
};

/**
 * Get total inventory value for all ingredients
 */
export const getTotalInventoryValue = async (
  db: SQLite.SQLiteDatabase
): Promise<number> => {
  const ingredients = await db.getAllAsync<{ id: number }>('SELECT id FROM ingredients');
  let totalValue = new Decimal(0);

  for (const ingredient of ingredients) {
    const value = await getIngredientInventoryValue(db, ingredient.id);
    totalValue = totalValue.add(new Decimal(value));
  }

  return totalValue.toNumber();
};

/**
 * Convert quantity from one unit to base unit
 */
export const convertToBaseUnit = (
  quantity: number,
  multiplierToBase: number
): number => {
  const qty = new Decimal(quantity);
  const multiplier = new Decimal(multiplierToBase);
  return qty.mul(multiplier).toNumber();
};

/**
 * Convert quantity from base unit to another unit
 */
export const convertFromBaseUnit = (
  baseQuantity: number,
  multiplierToBase: number
): number => {
  const qty = new Decimal(baseQuantity);
  const multiplier = new Decimal(multiplierToBase);
  return qty.div(multiplier).toNumber();
};

/**
 * Validate if sufficient stock exists for recipe
 */
export const validateRecipeStock = async (
  db: SQLite.SQLiteDatabase,
  productId: number,
  quantity: number
): Promise<{ isValid: boolean; missingIngredients: Array<{ ingredientId: number; ingredientName: string; needed: number; available: number }> }> => {
  const product = await db.getFirstAsync<{ recipe_definition_id: number }>(
    'SELECT recipe_definition_id FROM products WHERE id = ?',
    [productId]
  );

  if (!product || !product.recipe_definition_id) {
    return { isValid: true, missingIngredients: [] };
  }

  const recipes = await db.getAllAsync<{ ingredient_id: number; quantity_needed_base: number }>(
    'SELECT ingredient_id, quantity_needed_base FROM recipe_ingredients WHERE recipe_id = ?',
    [product.recipe_definition_id]
  );

  const missingIngredients = [];
  const quantityNeeded = new Decimal(quantity);

  for (const recipe of recipes) {
    const currentStock = await getCurrentStock(db, recipe.ingredient_id);
    const requiredStock = new Decimal(recipe.quantity_needed_base).mul(quantityNeeded);

    if (new Decimal(currentStock).lt(requiredStock)) {
      const ingredient = await db.getFirstAsync<{ name: string }>(
        'SELECT name FROM ingredients WHERE id = ?',
        [recipe.ingredient_id]
      );

      missingIngredients.push({
        ingredientId: recipe.ingredient_id,
        ingredientName: ingredient?.name || 'Unknown',
        needed: requiredStock.toNumber(),
        available: currentStock,
      });
    }
  }

  return {
    isValid: missingIngredients.length === 0,
    missingIngredients,
  };
};

export interface StockValidationError {
  productId: number;
  productName: string;
  ingredientName?: string;
  unit?: string;
  required: number;
  available: number;
}

/**
 * Validate sale stock for an entire cart before checkout.
 * Strictly respects stock ON vs OFF (stock_deduction_method: 'product' | 'recipe' | 'none').
 */
export const validateSaleStock = async (
  db: SQLite.SQLiteDatabase,
  cartItems: Array<{ productId: number; quantitySold: number; productName?: string }>
): Promise<StockValidationError[]> => {
  const errors: StockValidationError[] = [];
  const ingredientDemands = new Map<
    number,
    { required: Decimal; ingredientName: string; unit: string; productName: string }
  >();

  for (const item of cartItems) {
    const product = await db.getFirstAsync<{
      name: string;
      stock_deduction_method: string;
      current_stock: number;
      recipe_definition_id: number | null;
    }>(
      'SELECT name, stock_deduction_method, current_stock, recipe_definition_id FROM products WHERE id = ?',
      [item.productId]
    );

    if (!product) continue;

    // If stock deduction is 'none', stock tracking is turned OFF for this product
    if (product.stock_deduction_method === 'none') {
      continue;
    }

    // If stock deduction is 'product', check direct product stock
    if (product.stock_deduction_method === 'product') {
      const currentStock = product.current_stock || 0;
      if (currentStock < item.quantitySold) {
        errors.push({
          productId: item.productId,
          productName: product.name,
          required: item.quantitySold,
          available: currentStock,
        });
      }
    }

    // If stock deduction is 'recipe', check recipe ingredients
    if (product.stock_deduction_method === 'recipe' && product.recipe_definition_id) {
      const recipeIngredients = await db.getAllAsync<{
        ingredient_id: number;
        quantity_needed_base: number;
        ingredient_name: string;
        unit_symbol: string;
      }>(
        `SELECT ri.ingredient_id, ri.quantity_needed_base, i.name as ingredient_name, u.symbol as unit_symbol
         FROM recipe_ingredients ri
         JOIN ingredients i ON ri.ingredient_id = i.id
         JOIN units u ON i.base_unit_id = u.id
         WHERE ri.recipe_id = ?`,
        [product.recipe_definition_id]
      );

      for (const ring of recipeIngredients) {
        const itemDemand = new Decimal(ring.quantity_needed_base).mul(new Decimal(item.quantitySold));
        const existing = ingredientDemands.get(ring.ingredient_id);
        if (existing) {
          existing.required = existing.required.add(itemDemand);
        } else {
          ingredientDemands.set(ring.ingredient_id, {
            required: itemDemand,
            ingredientName: ring.ingredient_name,
            unit: ring.unit_symbol,
            productName: product.name,
          });
        }
      }
    }
  }

  // Verify all aggregated ingredient demands against available batch stocks
  for (const [ingredientId, demand] of ingredientDemands.entries()) {
    const currentStock = await getCurrentStock(db, ingredientId);
    if (new Decimal(currentStock).lt(demand.required)) {
      errors.push({
        productId: 0,
        productName: demand.productName,
        ingredientName: demand.ingredientName,
        unit: demand.unit,
        required: demand.required.toNumber(),
        available: currentStock,
      });
    }
  }

  return errors;
};