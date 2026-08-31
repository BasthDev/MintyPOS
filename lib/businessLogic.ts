import { Decimal } from 'decimal.js';
import * as SQLite from 'expo-sqlite';
import {
  dbOperations,
  deductSemiProductStockFIFO,
  deductStockFIFO,
  getCurrentStock,
  getSemiProductStock,
  handleCheckoutOrder,
  processRestockToSmallestUnit
} from './database';

// Re-export core business logic functions
export {
  deductSemiProductStockFIFO,
  deductStockFIFO,
  getCurrentStock,
  getSemiProductStock,
  handleCheckoutOrder,
  processRestockToSmallestUnit
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
 * Calculate total cost of a recipe based on inventory batches & semi-product batches (FEFO pricing)
 * This is used to display recipe cost in the recipe list and calculate product COGS.
 */
export const calculateRecipeCost = async (
  db: SQLite.SQLiteDatabase,
  recipeId: number
): Promise<number> => {
  const components = await dbOperations.getRecipeIngredients(db, recipeId);

  let totalCost = new Decimal(0);

  for (const comp of components) {
    let costPerUnit = new Decimal(0);

    if (comp.item_type === 'semi_product' && comp.semi_product_id) {
      // 1. Try to get unit cost from active semi_product_batches
      const batch = await db.getFirstAsync<{ cost_per_base_unit: number }>(
        `SELECT cost_per_base_unit FROM semi_product_batches 
         WHERE semi_product_id = ? AND remaining_quantity_base > 0 
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
             ELSE produced_date 
           END ASC
         LIMIT 1`,
        [comp.semi_product_id]
      );

      if (batch && batch.cost_per_base_unit > 0) {
        costPerUnit = new Decimal(batch.cost_per_base_unit);
      } else {
        // Fallback: estimate from semi-product formula and raw batches
        const formula = await dbOperations.getSemiProductRecipes(db, comp.semi_product_id);
        const sp = await db.getFirstAsync<{ yield_quantity: number }>(
          'SELECT yield_quantity FROM semi_products WHERE id = ?',
          [comp.semi_product_id]
        );
        let formulaTotal = new Decimal(0);
        for (const item of formula) {
          const rawBatch = await db.getFirstAsync<{ cost_per_base_unit: number }>(
            `SELECT cost_per_base_unit FROM inventory_batches 
             WHERE ingredient_id = ? AND remaining_quantity_base > 0 
             ORDER BY received_date ASC LIMIT 1`,
            [item.ingredient_id]
          );
          const rawUnitCost = new Decimal(rawBatch?.cost_per_base_unit || 0);
          formulaTotal = formulaTotal.add(new Decimal(item.quantity_needed_base).mul(rawUnitCost));
        }
        const yieldQty = sp && sp.yield_quantity > 0 ? new Decimal(sp.yield_quantity) : new Decimal(1);
        costPerUnit = formulaTotal.div(yieldQty);
      }
    } else if (comp.ingredient_id) {
      // 2. Get cost per base unit of raw ingredient using FEFO logic
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
        [comp.ingredient_id]
      );

      if (batch) {
        costPerUnit = new Decimal(batch.cost_per_base_unit);
      }
    }

    const quantityNeeded = new Decimal(comp.quantity_needed_base);
    totalCost = totalCost.add(quantityNeeded.mul(costPerUnit));
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
  const percentage = sellingPrice > 0 ? margin.div(new Decimal(sellingPrice)).mul(100) : new Decimal(0);

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
 * Get total inventory value for all ingredients & semi-products
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

  // Also include semi-product batches value
  const spBatches = await db.getAllAsync<{ remaining_quantity_base: number; cost_per_base_unit: number }>(
    'SELECT remaining_quantity_base, cost_per_base_unit FROM semi_product_batches WHERE remaining_quantity_base > 0'
  );
  for (const spb of spBatches) {
    const qty = new Decimal(spb.remaining_quantity_base);
    const cost = new Decimal(spb.cost_per_base_unit);
    totalValue = totalValue.add(qty.mul(cost));
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
 * Validate if sufficient stock exists for recipe (both raw ingredients & semi-products)
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

  const components = await dbOperations.getRecipeIngredients(db, product.recipe_definition_id);
  const missingIngredients = [];
  const quantityNeeded = new Decimal(quantity);

  for (const comp of components) {
    const requiredStock = new Decimal(comp.quantity_needed_base).mul(quantityNeeded);

    if (comp.item_type === 'semi_product' && comp.semi_product_id) {
      const currentStock = await getSemiProductStock(db, comp.semi_product_id);
      if (new Decimal(currentStock).lt(requiredStock)) {
        missingIngredients.push({
          ingredientId: comp.semi_product_id,
          ingredientName: comp.ingredient_name || 'Semi-Product',
          needed: requiredStock.toNumber(),
          available: currentStock,
        });
      }
    } else if (comp.ingredient_id) {
      const currentStock = await getCurrentStock(db, comp.ingredient_id);
      if (new Decimal(currentStock).lt(requiredStock)) {
        missingIngredients.push({
          ingredientId: comp.ingredient_id,
          ingredientName: comp.ingredient_name || 'Ingredient',
          needed: requiredStock.toNumber(),
          available: currentStock,
        });
      }
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
 * Supports multi-level cascade BOM (raw ingredients & semi-products).
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
  const semiProductDemands = new Map<
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

    // If stock deduction is 'recipe', check recipe components (raw ingredients & semi-products)
    if (product.stock_deduction_method === 'recipe' && product.recipe_definition_id) {
      const recipeComponents = await dbOperations.getRecipeIngredients(db, product.recipe_definition_id);

      for (const comp of recipeComponents) {
        const itemDemand = new Decimal(comp.quantity_needed_base).mul(new Decimal(item.quantitySold));

        if (comp.item_type === 'semi_product' && comp.semi_product_id) {
          const existing = semiProductDemands.get(comp.semi_product_id);
          if (existing) {
            existing.required = existing.required.add(itemDemand);
          } else {
            semiProductDemands.set(comp.semi_product_id, {
              required: itemDemand,
              ingredientName: comp.ingredient_name || 'Semi-Product',
              unit: comp.unit_symbol || 'unit',
              productName: product.name,
            });
          }
        } else if (comp.ingredient_id) {
          const existing = ingredientDemands.get(comp.ingredient_id);
          if (existing) {
            existing.required = existing.required.add(itemDemand);
          } else {
            ingredientDemands.set(comp.ingredient_id, {
              required: itemDemand,
              ingredientName: comp.ingredient_name || 'Ingredient',
              unit: comp.unit_symbol || 'unit',
              productName: product.name,
            });
          }
        }
      }
    }
  }

  // Verify all aggregated raw ingredient demands against available batch stocks
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

  // Verify all aggregated semi-product demands against available semi-product batch stocks
  for (const [semiProductId, demand] of semiProductDemands.entries()) {
    const currentStock = await getSemiProductStock(db, semiProductId);
    if (new Decimal(currentStock).lt(demand.required)) {
      errors.push({
        productId: 0,
        productName: demand.productName,
        ingredientName: `[Semi-Product] ${demand.ingredientName}`,
        unit: demand.unit,
        required: demand.required.toNumber(),
        available: currentStock,
      });
    }
  }

  return errors;
};