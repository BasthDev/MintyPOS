/**
 * Example usage of the core MintyPOS functionality
 * This file demonstrates how to use the database, business logic, and store
 */

import { initDatabase, dbOperations, processRestockToSmallestUnit, handleCheckoutOrder } from './database';
import { useStore } from '../store/useStore';
import { 
  calculateProductCOGS, 
  calculateProfitMargin, 
  checkLowStockIngredients,
  validateRecipeStock 
} from './businessLogic';

// ============================================
// DATABASE INITIALIZATION EXAMPLE
// ============================================
export async function initializeApp() {
  try {
    const db = await initDatabase();
    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// ============================================
// INGREDIENT MANAGEMENT EXAMPLE
// ============================================
export async function createExampleIngredient(db: any) {
  // Create a new ingredient
  const ingredientId = await dbOperations.createIngredient(
    db,
    'Coffee Beans Arabica',
    1, // base_unit_id (assuming 1 = gram)
    1000 // minimum_stock in grams
  );

  // Add conversion units for this ingredient
  await dbOperations.createIngredientUnit(
    db,
    ingredientId,
    'kg',
    1000 // 1 kg = 1000 grams
  );

  await dbOperations.createIngredientUnit(
    db,
    ingredientId,
    'pack',
    500 // 1 pack = 500 grams
  );

  console.log('Ingredient created with ID:', ingredientId);
  return ingredientId;
}

// ============================================
// RESTOCK EXAMPLE WITH UNIT CONVERSION
// ============================================
export async function restockIngredientExample(db: any) {
  const restockPayload = {
    ingredientId: 1,
    supplierId: 1,
    quantityBought: 5, // 5 kg
    boughtUnit: 'kg',
    unitMultiplier: 1000, // 1 kg = 1000 grams
    totalCostPaid: 250000, // Rp 250,000
  };

  // Convert to base unit using the business logic
  const batchData = processRestockToSmallestUnit(restockPayload);

  // Create inventory batch
  const batchId = await dbOperations.createInventoryBatch(
    db,
    batchData.ingredient_id,
    batchData.supplier_id,
    batchData.initial_quantity_base,
    batchData.cost_per_base_unit
  );

  console.log('Restock completed. Batch ID:', batchId);
  console.log('Cost per gram:', batchData.cost_per_base_unit);
  
  return batchId;
}

// ============================================
// PRODUCT AND RECIPE MANAGEMENT EXAMPLE
// ============================================
export async function createProductWithRecipe(db: any) {
  // Create a product
  const productId = await dbOperations.createProduct(
    db,
    'Cappuccino',
    25000, // selling price in Rp
    1 // has_recipe = true
  );

  // Add recipe components
  await dbOperations.createRecipe(
    db,
    productId,
    1, // coffee beans ingredient ID
    18 // 18 grams per cup
  );

  await dbOperations.createRecipe(
    db,
    productId,
    2, // milk ingredient ID
    150 // 150 ml per cup
  );

  console.log('Product created with ID:', productId);
  return productId;
}

// ============================================
// POS CHECKOUT EXAMPLE
// ============================================
export async function processCheckoutExample(db: any) {
  const cartItems = [
    { productId: 1, quantitySold: 2 }, // 2 Cappuccinos
    { productId: 2, quantitySold: 1 }, // 1 Americano
  ];

  try {
    await handleCheckoutOrder(db, cartItems);
    console.log('Checkout processed successfully');
    console.log('Inventory updated using FIFO');
  } catch (error) {
    console.error('Checkout failed:', error);
    throw error;
  }
}

// ============================================
// ZUSTAND STORE USAGE EXAMPLE
// ============================================
export function useStoreExample() {
  const {
    // Cart operations
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    getCartTotal,

    // Product operations
    products,
    setProducts,
    addProduct,
    updateProduct,
    deleteProduct,

    // UI operations
    isDrawerOpen,
    setDrawerOpen,
    toggleDrawer,
  } = useStore();

  // Add item to cart
  const addToCartExample = () => {
    addToCart({
      productId: 1,
      name: 'Cappuccino',
      price: 25000,
      quantity: 1,
      hasRecipe: true,
    });
  };

  // Get cart total
  const total = getCartTotal();
  console.log('Cart total:', total);

  // Toggle drawer
  const toggleDrawerExample = () => {
    toggleDrawer();
  };
}

// ============================================
// BUSINESS ANALYTICS EXAMPLE
// ============================================
export async function runBusinessAnalytics(db: any) {
  // Calculate COGS for a product
  const productId = 1;
  const cogs = await calculateProductCOGS(db, productId);
  console.log('Cost of Goods Sold:', cogs);

  // Calculate profit margin
  const sellingPrice = 25000;
  const { margin, percentage } = await calculateProfitMargin(db, productId, sellingPrice);
  console.log('Profit margin:', margin, '(', percentage.toFixed(1), '%)');

  // Check for low stock
  const lowStockItems = await checkLowStockIngredients(db);
  console.log('Low stock items:', lowStockItems);

  // Validate stock before processing order
  const validationResult = await validateRecipeStock(db, productId, 5);
  if (!validationResult.isValid) {
    console.log('Cannot fulfill order - missing ingredients:', validationResult.missingIngredients);
  } else {
    console.log('Sufficient stock available');
  }
}

// ============================================
// COMPLETE WORKFLOW EXAMPLE
// ============================================
export async function completeWorkflow() {
  try {
    // 1. Initialize database
    const db = await initializeApp();

    // 2. Create ingredients
    const coffeeId = await createExampleIngredient(db);

    // 3. Restock inventory
    await restockIngredientExample(db);

    // 4. Create product with recipe
    const productId = await createProductWithRecipe(db);

    // 5. Process customer order
    await processCheckoutExample(db);

    // 6. Run analytics
    await runBusinessAnalytics(db);

    console.log('Workflow completed successfully!');
  } catch (error) {
    console.error('Workflow failed:', error);
  }
}

// ============================================
// UTILITY FUNCTIONS EXAMPLE
// ============================================
import { 
  formatCurrency, 
  formatNumber, 
  formatDate, 
  getRelativeTime,
  calculatePercentage 
} from './utils';

export function utilityExamples() {
  // Format currency
  const price = 25000;
  console.log(formatCurrency(price)); // "Rp 25000.00"

  // Format numbers with precision
  const weight = 18.5;
  console.log(formatNumber(weight, 1)); // "18.5"

  // Format dates
  const date = new Date();
  console.log(formatDate(date)); // "Aug 24, 2026"
  console.log(getRelativeTime(date)); // "just now"

  // Calculate percentages
  const percentage = calculatePercentage(75, 100);
  console.log(percentage); // 75
}