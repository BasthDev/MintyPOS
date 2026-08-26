import { Decimal } from 'decimal.js';
import * as SQLite from 'expo-sqlite';

// Database name
const DB_NAME = 'mintypos.db';

// Types
export interface Category {
  id: number;
  name: string;
}

export interface RecipeDefinition {
  id: number;
  name: string;
  description?: string;
  created_at: string;
}

export interface RecipeIngredient {
  id: number;
  recipe_id: number;
  ingredient_id: number;
  quantity_needed_base: number;
}

export interface Unit {
  id: number;
  name: string;
  symbol: string;
}

export interface IngredientUnit {
  id: number;
  ingredient_id: number;
  unit_name: string;
  multiplier_to_base: number;
}

export interface Ingredient {
  id: number;
  name: string;
  base_unit_id: number;
  minimum_stock: number;
}

export interface InventoryBatch {
  id: number;
  ingredient_id: number;
  supplier_id: number;
  initial_quantity_base: number;
  remaining_quantity_base: number;
  cost_per_base_unit: number;
  received_date: string;
  expiration_date?: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  category_id: number;
  buy_price: number;
  selling_price: number;
  recipe_definition_id: number;
  current_stock: number;
  stock_deduction_method: 'product' | 'recipe';
}

export interface Recipe {
  id: number;
  product_id: number;
  ingredient_id: number;
  quantity_needed_base: number;
}

export interface Supplier {
  id: number;
  name: string;
  contact: string;
}

export interface ActivityLog {
  id: number;
  type: 'stock_add' | 'stock_deduct' | 'order' | 'restock';
  entity_type: 'ingredient' | 'product' | 'order';
  entity_id: number;
  entity_name: string;
  quantity: number;
  unit: string;
  description: string;
  created_at: string;
}

export interface PaymentMethodItem {
  id: number;
  type_key: string;
  type_label: string;
  method_name: string;
  is_active: number;
  is_system: number;
  created_at?: string;
}

export interface TaxConfigItem {
  id: number;
  name: string;
  rate: number;
  type: 'percentage' | 'flat';
  is_active: number;
  created_at?: string;
}

export interface DiscountItem {
  id: number;
  name: string;
  type: 'percentage' | 'flat';
  value: number;
  min_order_amount: number;
  max_discount_amount?: number | null;
  is_active: number;
  created_at?: string;
}

export interface CompletedOrder {
  id: number;
  order_number: string;
  subtotal: number;
  discount_amount: number;
  discount_name?: string | null;
  tax_amount: number;
  service_amount: number;
  total: number;
  payment_type: string;
  payment_method: string;
  amount_paid: number;
  change_amount: number;
  items_count: number;
  created_at: string;
  items?: CompletedOrderItem[];
}

export interface CompletedOrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

// Database singleton instance and initialization promise
let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// Database initialization
export const initDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (dbInstance) {
    return dbInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);

      // Enable foreign keys and WAL (Write-Ahead Logging) mode for robust multi-threaded read/write
      await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');

      // Get current database version
      const versionResult = await db.getFirstAsync<{ version: number }>('PRAGMA user_version');
      const currentVersion = versionResult?.version || 0;
      const TARGET_VERSION = 5;

  // Create all base tables first
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact TEXT
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      base_unit_id INTEGER NOT NULL,
      minimum_stock REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (base_unit_id) REFERENCES units(id)
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ingredient_units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingredient_id INTEGER NOT NULL,
      unit_name TEXT NOT NULL,
      multiplier_to_base REAL NOT NULL,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS inventory_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingredient_id INTEGER NOT NULL,
      supplier_id INTEGER NOT NULL,
      initial_quantity_base REAL NOT NULL,
      remaining_quantity_base REAL NOT NULL,
      cost_per_base_unit REAL NOT NULL,
      received_date TEXT NOT NULL,
      expiration_date TEXT,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS recipe_definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL,
      ingredient_id INTEGER NOT NULL,
      quantity_needed_base REAL NOT NULL,
      FOREIGN KEY (recipe_id) REFERENCES recipe_definitions(id),
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT,
      category_id INTEGER,
      buy_price REAL,
      selling_price REAL NOT NULL,
      recipe_definition_id INTEGER,
      current_stock REAL DEFAULT 0,
      stock_deduction_method TEXT NOT NULL DEFAULT 'none',
      image_uri TEXT,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (recipe_definition_id) REFERENCES recipe_definitions(id)
    );
  `);

  // Create indexes for better performance
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_inventory_batches_ingredient 
    ON inventory_batches(ingredient_id);
    
    CREATE INDEX IF NOT EXISTS idx_inventory_batches_date 
    ON inventory_batches(received_date);
    
    CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe 
    ON recipe_ingredients(recipe_id);
    
    CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient 
    ON recipe_ingredients(ingredient_id);
    
    CREATE INDEX IF NOT EXISTS idx_products_recipe 
    ON products(recipe_definition_id);
  `);

  // Migration: Incremental migrations to preserve data
  if (currentVersion < TARGET_VERSION) {
    // Version 4: Add expiration_date to inventory_batches and update stock_deduction_method default
    if (currentVersion < 4) {
      try {
        // Check if column exists
        const columns = await db.getAllAsync('PRAGMA table_info(inventory_batches)');
        const hasExpirationDate = columns.some((col: any) => col.name === 'expiration_date');
        
        if (!hasExpirationDate) {
          await db.execAsync('ALTER TABLE inventory_batches ADD COLUMN expiration_date TEXT');
        }

        // Update existing products with 'product' method to 'none' if they don't have stock
        await db.execAsync(`
          UPDATE products 
          SET stock_deduction_method = 'none' 
          WHERE stock_deduction_method = 'product' AND (current_stock IS NULL OR current_stock = 0)
        `);

        // Add image_uri column to products
        const productColumns = await db.getAllAsync('PRAGMA table_info(products)');
        const hasImageUri = productColumns.some((col: any) => col.name === 'image_uri');
        
        if (!hasImageUri) {
          await db.execAsync('ALTER TABLE products ADD COLUMN image_uri TEXT');
        }
      } catch (error) {
        console.error('Migration error for version 4:', error);
      }
    }

    // Version 5: Add activity_logs table
    if (currentVersion < 5) {
      try {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id INTEGER NOT NULL,
            entity_name TEXT NOT NULL,
            quantity REAL,
            unit TEXT,
            description TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
        `);
        
        // Create index for faster queries
        await db.execAsync('CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);');
        await db.execAsync('CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs(type);');
      } catch (error) {
        console.error('Migration error for version 5:', error);
      }
    }
  }

  // Update database version
  await db.execAsync(`PRAGMA user_version = ${TARGET_VERSION};`);

  // Create payment_methods table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS payment_methods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type_key TEXT NOT NULL,
      type_label TEXT NOT NULL,
      method_name TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_system INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create tax_configs table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS tax_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      rate REAL NOT NULL,
      type TEXT NOT NULL DEFAULT 'percentage',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create discounts table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS discounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'percentage',
      value REAL NOT NULL,
      min_order_amount REAL NOT NULL DEFAULT 0,
      max_discount_amount REAL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create orders table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL,
      subtotal REAL NOT NULL,
      discount_amount REAL NOT NULL DEFAULT 0,
      discount_name TEXT,
      tax_amount REAL NOT NULL DEFAULT 0,
      service_amount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      payment_type TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      amount_paid REAL NOT NULL,
      change_amount REAL NOT NULL DEFAULT 0,
      items_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create order_items table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );
  `);

  // Insert default units if they don't exist
  const existingUnits = await db.getAllAsync<Unit>('SELECT * FROM units LIMIT 1');
  if (existingUnits.length === 0) {
    await db.execAsync(`
      INSERT INTO units (name, symbol) VALUES 
      ('gram', 'g'),
      ('milliliter', 'ml'),
      ('piece', 'pcs');
    `);
  }

  // Insert default categories if they don't exist
  const existingCategories = await db.getAllAsync('SELECT * FROM categories LIMIT 1');
  if (existingCategories.length === 0) {
    await db.execAsync(`
      INSERT INTO categories (name) VALUES 
      ('Beverages'),
      ('Food'),
      ('Snacks'),
      ('Merchandise');
    `);
  }

  // Insert default payment methods if they don't exist
  const existingPayments = await db.getAllAsync('SELECT * FROM payment_methods LIMIT 1');
  if (existingPayments.length === 0) {
    await db.execAsync(`
      INSERT INTO payment_methods (type_key, type_label, method_name, is_active, is_system) VALUES 
      ('cash', 'Cash', 'Cash', 1, 1),
      ('qris', 'QRIS', 'BYOND', 1, 0),
      ('qris', 'QRIS', 'DANA', 1, 0),
      ('qris', 'QRIS', 'GoPay', 1, 0),
      ('qris', 'QRIS', 'OVO', 1, 0),
      ('qris', 'QRIS', 'ShopeePay', 1, 0),
      ('transfer', 'Bank Transfer', 'BCA', 1, 0),
      ('transfer', 'Bank Transfer', 'Mandiri', 1, 0),
      ('transfer', 'Bank Transfer', 'BRI', 1, 0),
      ('transfer', 'Bank Transfer', 'BNI', 1, 0);
    `);
  }

  // Insert default tax configs if they don't exist
  const existingTaxes = await db.getAllAsync('SELECT * FROM tax_configs LIMIT 1');
  if (existingTaxes.length === 0) {
    await db.execAsync(`
      INSERT INTO tax_configs (name, rate, type, is_active) VALUES 
      ('PB1 / PPN', 10, 'percentage', 1),
      ('Service Charge', 5, 'percentage', 0);
    `);
  }

  // Insert default discounts if they don't exist
  const existingDiscounts = await db.getAllAsync('SELECT * FROM discounts LIMIT 1');
  if (existingDiscounts.length === 0) {
    await db.execAsync(`
      INSERT INTO discounts (name, type, value, min_order_amount, max_discount_amount, is_active) VALUES 
      ('Member Discount', 'percentage', 10, 50000, 25000, 1),
      ('Opening Promo', 'flat', 10000, 30000, NULL, 1);
    `);
  }

  // Insert default conversion units if they don't exist
  const existingConversionUnits = await db.getAllAsync('SELECT * FROM ingredient_units LIMIT 1');
  if (existingConversionUnits.length === 0) {
    // Example conversions
  }

      dbInstance = db;
      return db;
    } catch (error) {
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
};

// Get database instance (always awaits singleton initialization)
export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (dbInstance) {
    return dbInstance;
  }
  return await initDatabase();
};

// Database operations
export const dbOperations = {
  // Categories operations
  async getAllCategories(db: SQLite.SQLiteDatabase): Promise<Category[]> {
    return await db.getAllAsync<Category>('SELECT * FROM categories ORDER BY name');
  },

  async createCategory(db: SQLite.SQLiteDatabase, name: string): Promise<number> {
    const result = await db.runAsync('INSERT INTO categories (name) VALUES (?)', [name]);
    return result.lastInsertRowId;
  },

  // Recipe Definitions operations
  async getAllRecipeDefinitions(db: SQLite.SQLiteDatabase): Promise<RecipeDefinition[]> {
    return await db.getAllAsync<RecipeDefinition>('SELECT * FROM recipe_definitions ORDER BY name');
  },

  async createRecipeDefinition(
    db: SQLite.SQLiteDatabase,
    name: string,
    description?: string
  ): Promise<number> {
    const result = await db.runAsync(
      'INSERT INTO recipe_definitions (name, description) VALUES (?, ?)',
      [name, description || null]
    );
    return result.lastInsertRowId;
  },

  async getRecipeDefinitionById(db: SQLite.SQLiteDatabase, id: number): Promise<RecipeDefinition | null> {
    const recipes = await db.getAllAsync<RecipeDefinition>(
      'SELECT * FROM recipe_definitions WHERE id = ?',
      [id]
    );
    return recipes[0] || null;
  },

  async updateRecipeDefinition(
    db: SQLite.SQLiteDatabase,
    id: number,
    updates: { name?: string; description?: string }
  ): Promise<void> {
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      values.push(updates.description);
    }

    if (updateFields.length > 0) {
      values.push(id);
      await db.runAsync(
        `UPDATE recipe_definitions SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );
    }
  },

  async deleteRecipeDefinition(db: SQLite.SQLiteDatabase, id: number): Promise<void> {
    await db.runAsync('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [id]);
    await db.runAsync('DELETE FROM recipe_definitions WHERE id = ?', [id]);
  },

  // Recipe Ingredients operations
  async getRecipeIngredients(db: SQLite.SQLiteDatabase, recipeId: number): Promise<RecipeIngredient[]> {
    return await db.getAllAsync<RecipeIngredient>(
      `SELECT ri.*, i.name as ingredient_name, u.symbol as unit_symbol
       FROM recipe_ingredients ri
       JOIN ingredients i ON ri.ingredient_id = i.id
       JOIN units u ON i.base_unit_id = u.id
       WHERE ri.recipe_id = ?`,
      [recipeId]
    );
  },

  async addRecipeIngredient(
    db: SQLite.SQLiteDatabase,
    recipeId: number,
    ingredientId: number,
    quantityNeededBase: number
  ): Promise<number> {
    const result = await db.runAsync(
      'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity_needed_base) VALUES (?, ?, ?)',
      [recipeId, ingredientId, quantityNeededBase]
    );
    return result.lastInsertRowId;
  },

  async updateRecipeIngredient(
    db: SQLite.SQLiteDatabase,
    id: number,
    quantityNeededBase: number
  ): Promise<void> {
    await db.runAsync(
      'UPDATE recipe_ingredients SET quantity_needed_base = ? WHERE id = ?',
      [quantityNeededBase, id]
    );
  },

  async removeRecipeIngredient(db: SQLite.SQLiteDatabase, id: number): Promise<void> {
    await db.runAsync('DELETE FROM recipe_ingredients WHERE id = ?', [id]);
  },

  // Units operations
  async getAllUnits(db: SQLite.SQLiteDatabase): Promise<Unit[]> {
    return await db.getAllAsync<Unit>('SELECT * FROM units ORDER BY id');
  },

  async createUnit(db: SQLite.SQLiteDatabase, name: string, symbol: string): Promise<number> {
    const result = await db.runAsync('INSERT INTO units (name, symbol) VALUES (?, ?)', [name, symbol]);
    return result.lastInsertRowId;
  },

  // Ingredients operations
  async getAllIngredients(db: SQLite.SQLiteDatabase): Promise<Ingredient[]> {
    return await db.getAllAsync<Ingredient>(`
      SELECT i.*, u.name as unit_name, u.symbol as unit_symbol 
      FROM ingredients i 
      JOIN units u ON i.base_unit_id = u.id 
      ORDER BY i.name
    `);
  },

  async createIngredient(
    db: SQLite.SQLiteDatabase,
    name: string,
    baseUnitId: number,
    minimumStock: number
  ): Promise<number> {
    const result = await db.runAsync(
      'INSERT INTO ingredients (name, base_unit_id, minimum_stock) VALUES (?, ?, ?)',
      [name, baseUnitId, minimumStock]
    );
    return result.lastInsertRowId;
  },

  // Ingredient units operations
  async getIngredientUnits(db: SQLite.SQLiteDatabase, ingredientId: number): Promise<IngredientUnit[]> {
    return await db.getAllAsync<IngredientUnit>(
      'SELECT * FROM ingredient_units WHERE ingredient_id = ?',
      [ingredientId]
    );
  },

  async createIngredientUnit(
    db: SQLite.SQLiteDatabase,
    ingredientId: number,
    unitName: string,
    multiplierToBase: number
  ): Promise<number> {
    const result = await db.runAsync(
      'INSERT INTO ingredient_units (ingredient_id, unit_name, multiplier_to_base) VALUES (?, ?, ?)',
      [ingredientId, unitName, multiplierToBase]
    );
    return result.lastInsertRowId;
  },

  // Products operations
  async getAllProducts(db: SQLite.SQLiteDatabase): Promise<Product[]> {
    return await db.getAllAsync<Product>(`
      SELECT p.*, c.name as category_name, rd.name as recipe_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      LEFT JOIN recipe_definitions rd ON p.recipe_definition_id = rd.id 
      ORDER BY p.name
    `);
  },

  async createProduct(
    db: SQLite.SQLiteDatabase,
    name: string,
    sellingPrice: number,
    sku?: string,
    categoryId?: number,
    buyPrice?: number,
    recipeDefinitionId?: number,
    stockDeductionMethod: string = 'product',
    currentStock?: number,
    imageUri?: string
  ): Promise<number> {
    const result = await db.runAsync(
      `INSERT INTO products (name, selling_price, sku, category_id, buy_price, recipe_definition_id, stock_deduction_method, current_stock, image_uri) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, sellingPrice, sku || null, categoryId || null, buyPrice || null, recipeDefinitionId || null, stockDeductionMethod, currentStock || 0, imageUri || null]
    );
    return result.lastInsertRowId;
  },

  // async updateProduct(
  //   db: SQLite.SQLiteDatabase,
  //   id: number,
  //   updates: {
  //     name?: string;
  //     selling_price?: number;
  //     has_recipe?: number;
  //     sku?: string;
  //     category_id?: number;
  //     buy_price?: number;
  //     stock_deduction_method?: string;
  //     current_stock?: number;
  //   }
  // ): Promise<void> {
  //   const updateFields: string[] = [];
  //   const values: any[] = [];

  //   if (updates.name !== undefined) {
  //     updateFields.push('name = ?');
  //     values.push(updates.name);
  //   }
  //   if (updates.selling_price !== undefined) {
  //     updateFields.push('selling_price = ?');
  //     values.push(updates.selling_price);
  //   }
  //   if (updates.has_recipe !== undefined) {
  //     updateFields.push('has_recipe = ?');
  //     values.push(updates.has_recipe);
  //   }
  //   if (updates.sku !== undefined) {
  //     updateFields.push('sku = ?');
  //     values.push(updates.sku);
  //   }
  //   if (updates.category_id !== undefined) {
  //     updateFields.push('category_id = ?');
  //     values.push(updates.category_id);
  //   }
  //   if (updates.buy_price !== undefined) {
  //     updateFields.push('buy_price = ?');
  //     values.push(updates.buy_price);
  //   }
  //   if (updates.stock_deduction_method !== undefined) {
  //     updateFields.push('stock_deduction_method = ?');
  //     values.push(updates.stock_deduction_method);
  //   }
  //   if (updates.current_stock !== undefined) {
  //     updateFields.push('current_stock = ?');
  //     values.push(updates.current_stock);
  //   }

  //   if (updateFields.length > 0) {
  //     values.push(id);
  //     await db.runAsync(
  //       `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`,
  //       values
  //     );
  //   }
  // },

  async updateProduct(
    db: SQLite.SQLiteDatabase,
    id: number,
    updates: {
      name?: string;
      selling_price?: number;
      sku?: string;
      category_id?: number;
      buy_price?: number;
      recipe_definition_id?: number;
      stock_deduction_method?: string;
      current_stock?: number;
      image_uri?: string | null;
    }
  ): Promise<void> {
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.selling_price !== undefined) {
      updateFields.push('selling_price = ?');
      values.push(updates.selling_price);
    }
    if (updates.sku !== undefined) {
      updateFields.push('sku = ?');
      values.push(updates.sku);
    }
    if (updates.category_id !== undefined) {
      updateFields.push('category_id = ?');
      values.push(updates.category_id);
    }
    if (updates.buy_price !== undefined) {
      updateFields.push('buy_price = ?');
      values.push(updates.buy_price);
    }
    if (updates.recipe_definition_id !== undefined) {
      updateFields.push('recipe_definition_id = ?');
      values.push(updates.recipe_definition_id);
    }
    if (updates.stock_deduction_method !== undefined) {
      updateFields.push('stock_deduction_method = ?');
      values.push(updates.stock_deduction_method);
    }
    if (updates.current_stock !== undefined) {
      updateFields.push('current_stock = ?');
      values.push(updates.current_stock);
    }
    if (updates.image_uri !== undefined) {
      updateFields.push('image_uri = ?');
      values.push(updates.image_uri);
    }

    if (updateFields.length > 0) {
      values.push(id);
      await db.runAsync(
        `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );
    }
  },

  // Recipes operations
  async getProductRecipes(db: SQLite.SQLiteDatabase, productId: number): Promise<Recipe[]> {
    return await db.getAllAsync<Recipe>(
      'SELECT * FROM recipes WHERE product_id = ?',
      [productId]
    );
  },

  async createRecipe(
    db: SQLite.SQLiteDatabase,
    productId: number,
    ingredientId: number,
    quantityNeededBase: number
  ): Promise<number> {
    const result = await db.runAsync(
      'INSERT INTO recipes (product_id, ingredient_id, quantity_needed_base) VALUES (?, ?, ?)',
      [productId, ingredientId, quantityNeededBase]
    );
    return result.lastInsertRowId;
  },

  // Inventory operations
  async getIngredientBatches(db: SQLite.SQLiteDatabase, ingredientId: number): Promise<InventoryBatch[]> {
    return await db.getAllAsync<InventoryBatch>(
      `SELECT * FROM inventory_batches 
       WHERE ingredient_id = ? AND remaining_quantity_base > 0 
       ORDER BY 
         CASE 
           WHEN expiration_date IS NOT NULL AND expiration_date < datetime('now') THEN 0
           ELSE 1
         END,
         expiration_date ASC,
         received_date ASC`,
      [ingredientId]
    );
  },

  async createInventoryBatch(
    db: SQLite.SQLiteDatabase,
    ingredientId: number,
    supplierId: number,
    initialQuantityBase: number,
    costPerBaseUnit: number,
    expirationDate?: string
  ): Promise<number> {
    const result = await db.runAsync(
      `INSERT INTO inventory_batches 
       (ingredient_id, supplier_id, initial_quantity_base, remaining_quantity_base, cost_per_base_unit, received_date, expiration_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [ingredientId, supplierId, initialQuantityBase, initialQuantityBase, costPerBaseUnit, new Date().toISOString(), expirationDate || null]
    );
    
    // Log activity
    const ingredient = await db.getFirstAsync<{ name: string; base_unit_id: number }>(
      'SELECT name, base_unit_id FROM ingredients WHERE id = ?',
      [ingredientId]
    );
    const unit = await db.getFirstAsync<{ symbol: string }>(
      'SELECT symbol FROM units WHERE id = ?',
      [ingredient?.base_unit_id || 0]
    );
    
    await this.logActivity(
      db,
      'restock',
      'ingredient',
      ingredientId,
      ingredient?.name || 'Unknown',
      initialQuantityBase,
      unit?.symbol || 'unit',
      `Restocked ${initialQuantityBase} ${unit?.symbol || 'unit'} at Rp ${costPerBaseUnit}/${unit?.symbol || 'unit'}`
    );
    
    return result.lastInsertRowId;
  },

  // Suppliers operations
  async getAllSuppliers(db: SQLite.SQLiteDatabase): Promise<Supplier[]> {
    return await db.getAllAsync<Supplier>('SELECT * FROM suppliers ORDER BY name');
  },

  async createSupplier(db: SQLite.SQLiteDatabase, name: string, contact: string): Promise<number> {
    const result = await db.runAsync(
      'INSERT INTO suppliers (name, contact) VALUES (?, ?)',
      [name, contact]
    );
    return result.lastInsertRowId;
  },

  // Activity logs operations
  async logActivity(
    db: SQLite.SQLiteDatabase,
    type: 'stock_add' | 'stock_deduct' | 'order' | 'restock',
    entityType: 'ingredient' | 'product' | 'order',
    entityId: number,
    entityName: string,
    quantity?: number,
    unit?: string,
    description?: string
  ): Promise<void> {
    await db.runAsync(
      `INSERT INTO activity_logs (type, entity_type, entity_id, entity_name, quantity, unit, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [type, entityType, entityId, entityName, quantity || null, unit || null, description || null]
    );
  },

  async getAllActivityLogs(db: SQLite.SQLiteDatabase, limit: number = 100): Promise<ActivityLog[]> {
    return await db.getAllAsync<ActivityLog>(
      `SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ?`,
      [limit]
    );
  },

  async getActivityLogsByType(
    db: SQLite.SQLiteDatabase,
    type: 'stock_add' | 'stock_deduct' | 'order' | 'restock',
    limit: number = 50
  ): Promise<ActivityLog[]> {
    return await db.getAllAsync<ActivityLog>(
      `SELECT * FROM activity_logs WHERE type = ? ORDER BY created_at DESC LIMIT ?`,
      [type, limit]
    );
  },

  // Payment Methods operations
  async getAllPaymentMethods(db: SQLite.SQLiteDatabase): Promise<PaymentMethodItem[]> {
    return await db.getAllAsync<PaymentMethodItem>(
      'SELECT * FROM payment_methods ORDER BY id ASC'
    );
  },

  async getActivePaymentMethods(db: SQLite.SQLiteDatabase): Promise<PaymentMethodItem[]> {
    return await db.getAllAsync<PaymentMethodItem>(
      'SELECT * FROM payment_methods WHERE is_active = 1 ORDER BY id ASC'
    );
  },

  async addPaymentMethod(
    db: SQLite.SQLiteDatabase,
    typeKey: string,
    typeLabel: string,
    methodName: string
  ): Promise<number> {
    const result = await db.runAsync(
      'INSERT INTO payment_methods (type_key, type_label, method_name, is_active, is_system) VALUES (?, ?, ?, 1, 0)',
      [typeKey, typeLabel, methodName]
    );
    return result.lastInsertRowId;
  },

  async updatePaymentMethod(
    db: SQLite.SQLiteDatabase,
    id: number,
    methodName: string
  ): Promise<void> {
    await db.runAsync(
      'UPDATE payment_methods SET method_name = ? WHERE id = ?',
      [methodName, id]
    );
  },

  async togglePaymentMethod(
    db: SQLite.SQLiteDatabase,
    id: number,
    isActive: boolean
  ): Promise<void> {
    const item = await db.getFirstAsync<PaymentMethodItem>(
      'SELECT * FROM payment_methods WHERE id = ?',
      [id]
    );
    if (item && item.is_system === 1 && !isActive) {
      throw new Error('Cash payment method cannot be disabled');
    }
    await db.runAsync(
      'UPDATE payment_methods SET is_active = ? WHERE id = ?',
      [isActive ? 1 : 0, id]
    );
  },

  async deletePaymentMethod(db: SQLite.SQLiteDatabase, id: number): Promise<void> {
    const item = await db.getFirstAsync<PaymentMethodItem>(
      'SELECT * FROM payment_methods WHERE id = ?',
      [id]
    );
    if (item && item.is_system === 1) {
      throw new Error('System payment method cannot be deleted');
    }
    await db.runAsync('DELETE FROM payment_methods WHERE id = ?', [id]);
  },

  // Tax Configs operations
  async getAllTaxConfigs(db: SQLite.SQLiteDatabase): Promise<TaxConfigItem[]> {
    return await db.getAllAsync<TaxConfigItem>(
      'SELECT * FROM tax_configs ORDER BY id ASC'
    );
  },

  async getActiveTaxConfigs(db: SQLite.SQLiteDatabase): Promise<TaxConfigItem[]> {
    return await db.getAllAsync<TaxConfigItem>(
      'SELECT * FROM tax_configs WHERE is_active = 1 ORDER BY id ASC'
    );
  },

  async createTaxConfig(
    db: SQLite.SQLiteDatabase,
    name: string,
    rate: number,
    type: 'percentage' | 'flat' = 'percentage'
  ): Promise<number> {
    const result = await db.runAsync(
      'INSERT INTO tax_configs (name, rate, type, is_active) VALUES (?, ?, ?, 1)',
      [name, rate, type]
    );
    return result.lastInsertRowId;
  },

  async updateTaxConfig(
    db: SQLite.SQLiteDatabase,
    id: number,
    name: string,
    rate: number,
    type: 'percentage' | 'flat' = 'percentage'
  ): Promise<void> {
    await db.runAsync(
      'UPDATE tax_configs SET name = ?, rate = ?, type = ? WHERE id = ?',
      [name, rate, type, id]
    );
  },

  async toggleTaxConfig(
    db: SQLite.SQLiteDatabase,
    id: number,
    isActive: boolean
  ): Promise<void> {
    await db.runAsync(
      'UPDATE tax_configs SET is_active = ? WHERE id = ?',
      [isActive ? 1 : 0, id]
    );
  },

  async deleteTaxConfig(db: SQLite.SQLiteDatabase, id: number): Promise<void> {
    await db.runAsync('DELETE FROM tax_configs WHERE id = ?', [id]);
  },

  // Discounts operations
  async getAllDiscounts(db: SQLite.SQLiteDatabase): Promise<DiscountItem[]> {
    return await db.getAllAsync<DiscountItem>(
      'SELECT * FROM discounts ORDER BY id ASC'
    );
  },

  async getActiveDiscounts(db: SQLite.SQLiteDatabase): Promise<DiscountItem[]> {
    return await db.getAllAsync<DiscountItem>(
      'SELECT * FROM discounts WHERE is_active = 1 ORDER BY id ASC'
    );
  },

  async createDiscount(
    db: SQLite.SQLiteDatabase,
    name: string,
    type: 'percentage' | 'flat',
    value: number,
    minOrderAmount: number = 0,
    maxDiscountAmount?: number | null
  ): Promise<number> {
    const result = await db.runAsync(
      'INSERT INTO discounts (name, type, value, min_order_amount, max_discount_amount, is_active) VALUES (?, ?, ?, ?, ?, 1)',
      [name, type, value, minOrderAmount, maxDiscountAmount || null]
    );
    return result.lastInsertRowId;
  },

  async updateDiscount(
    db: SQLite.SQLiteDatabase,
    id: number,
    name: string,
    type: 'percentage' | 'flat',
    value: number,
    minOrderAmount: number = 0,
    maxDiscountAmount?: number | null
  ): Promise<void> {
    await db.runAsync(
      'UPDATE discounts SET name = ?, type = ?, value = ?, min_order_amount = ?, max_discount_amount = ? WHERE id = ?',
      [name, type, value, minOrderAmount, maxDiscountAmount || null, id]
    );
  },

  async toggleDiscount(
    db: SQLite.SQLiteDatabase,
    id: number,
    isActive: boolean
  ): Promise<void> {
    await db.runAsync(
      'UPDATE discounts SET is_active = ? WHERE id = ?',
      [isActive ? 1 : 0, id]
    );
  },

  async deleteDiscount(db: SQLite.SQLiteDatabase, id: number): Promise<void> {
    await db.runAsync('DELETE FROM discounts WHERE id = ?', [id]);
  },

  // Orders operations
  async getAllOrders(db: SQLite.SQLiteDatabase, limit: number = 100): Promise<CompletedOrder[]> {
    const orders = await db.getAllAsync<CompletedOrder>(
      'SELECT * FROM orders ORDER BY created_at DESC LIMIT ?',
      [limit]
    );

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await db.getAllAsync<CompletedOrderItem>(
          'SELECT * FROM order_items WHERE order_id = ?',
          [order.id]
        );
        return {
          ...order,
          items,
        };
      })
    );

    return ordersWithItems;
  },

  async getOrderById(db: SQLite.SQLiteDatabase, id: number): Promise<CompletedOrder | null> {
    const order = await db.getFirstAsync<CompletedOrder>(
      'SELECT * FROM orders WHERE id = ?',
      [id]
    );
    if (!order) return null;

    const items = await db.getAllAsync<CompletedOrderItem>(
      'SELECT * FROM order_items WHERE order_id = ?',
      [id]
    );
    return {
      ...order,
      items,
    };
  },

  async createCompletedOrder(
    db: SQLite.SQLiteDatabase,
    orderData: {
      orderNumber: string;
      subtotal: number;
      discountAmount: number;
      discountName?: string | null;
      taxAmount: number;
      serviceAmount: number;
      total: number;
      paymentType: string;
      paymentMethod: string;
      amountPaid: number;
      changeAmount: number;
      items: Array<{
        productId: number;
        productName: string;
        price: number;
        quantity: number;
        subtotal: number;
      }>;
    }
  ): Promise<number> {
    const result = await db.runAsync(
      `INSERT INTO orders (
        order_number, subtotal, discount_amount, discount_name, 
        tax_amount, service_amount, total, payment_type, 
        payment_method, amount_paid, change_amount, items_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderData.orderNumber,
        orderData.subtotal,
        orderData.discountAmount,
        orderData.discountName || null,
        orderData.taxAmount,
        orderData.serviceAmount,
        orderData.total,
        orderData.paymentType,
        orderData.paymentMethod,
        orderData.amountPaid,
        orderData.changeAmount,
        orderData.items.length,
      ]
    );

    const orderId = result.lastInsertRowId;

    for (const item of orderData.items) {
      await db.runAsync(
        'INSERT INTO order_items (order_id, product_id, product_name, price, quantity, subtotal) VALUES (?, ?, ?, ?, ?, ?)',
        [orderId, item.productId, item.productName, item.price, item.quantity, item.subtotal]
      );
    }

    return orderId;
  },

  async getTodaysSalesStats(db: SQLite.SQLiteDatabase): Promise<{ totalSales: number; orderCount: number }> {
    const today = new Date().toISOString().split('T')[0];
    const result = await db.getFirstAsync<{ total: number; count: number }>(
      `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count 
       FROM orders 
       WHERE date(created_at) = date('now')`
    );
    return {
      totalSales: result?.total || 0,
      orderCount: result?.count || 0,
    };
  },
};

// Get current stock for an ingredient (sum of all batch remaining quantities)
export const getCurrentStock = async (db: SQLite.SQLiteDatabase, ingredientId: number): Promise<number> => {
  const result = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(remaining_quantity_base), 0) as total 
     FROM inventory_batches 
     WHERE ingredient_id = ?`,
    [ingredientId]
  );
  return result?.total || 0;
};

// FEFO (First Expired First Out) stock deduction logic
// Priority: 1. Expired items first, 2. Soonest expiration date, 3. FIFO as fallback
export const deductStockFIFO = async (
  db: SQLite.SQLiteDatabase,
  ingredientId: number,
  totalRequiredBaseQty: number
): Promise<void> => {
  const activeBatches = await db.getAllAsync<InventoryBatch>(
    `SELECT * FROM inventory_batches 
     WHERE ingredient_id = ? AND remaining_quantity_base > 0 
     ORDER BY 
       CASE 
         WHEN expiration_date IS NOT NULL AND expiration_date < datetime('now') THEN 0
         ELSE 1
       END,
       expiration_date ASC,
       received_date ASC`,
    [ingredientId]
  );

  let remainingToDeduct = new Decimal(totalRequiredBaseQty);

  for (const batch of activeBatches) {
    if (remainingToDeduct.lte(0)) break;

    const batchQuantity = new Decimal(batch.remaining_quantity_base);

    if (batchQuantity.gte(remainingToDeduct)) {
      // This batch has enough stock
      const newRemaining = batchQuantity.minus(remainingToDeduct);
      await db.runAsync(
        'UPDATE inventory_batches SET remaining_quantity_base = ? WHERE id = ?',
        [newRemaining.toNumber(), batch.id]
      );
      remainingToDeduct = new Decimal(0);
    } else {
      // Use this entire batch and move to the next
      remainingToDeduct = remainingToDeduct.minus(batchQuantity);
      await db.runAsync(
        'UPDATE inventory_batches SET remaining_quantity_base = 0 WHERE id = ?',
        [batch.id]
      );
    }
  }

  if (remainingToDeduct.gt(0)) {
    throw new Error(
      `Insufficient stock for ingredient ID ${ingredientId}. Missing ${remainingToDeduct.toNumber()} base units.`
    );
  }

  // Log stock deduction activity
  const ingredient = await db.getFirstAsync<{ name: string; base_unit_id: number }>(
    'SELECT name, base_unit_id FROM ingredients WHERE id = ?',
    [ingredientId]
  );
  const unit = await db.getFirstAsync<{ symbol: string }>(
    'SELECT symbol FROM units WHERE id = ?',
    [ingredient?.base_unit_id || 0]
  );
  
  await dbOperations.logActivity(
    db,
    'stock_deduct',
    'ingredient',
    ingredientId,
    ingredient?.name || 'Unknown',
    totalRequiredBaseQty,
    unit?.symbol || 'unit',
    `Deducted ${totalRequiredBaseQty} ${unit?.symbol || 'unit'} from stock`
  );
};

// Process restock with unit conversion
export interface RestockPayload {
  ingredientId: number;
  supplierId: number;
  quantityBought: number;
  boughtUnit: string;
  unitMultiplier: number;
  totalCostPaid: number;
}

export const processRestockToSmallestUnit = (payload: RestockPayload) => {
  // Convert to base unit using Decimal.js for precision
  const quantityBought = new Decimal(payload.quantityBought);
  const unitMultiplier = new Decimal(payload.unitMultiplier);
  const totalCostPaid = new Decimal(payload.totalCostPaid);

  const totalQuantityInBase = quantityBought.mul(unitMultiplier);
  const costPerBaseUnit = totalCostPaid.div(totalQuantityInBase);

  return {
    ingredient_id: payload.ingredientId,
    supplier_id: payload.supplierId,
    initial_quantity_base: totalQuantityInBase.toNumber(),
    remaining_quantity_base: totalQuantityInBase.toNumber(),
    cost_per_base_unit: costPerBaseUnit.toNumber(),
    received_date: new Date().toISOString(),
  };
};

// Handle checkout order with recipe processing
export interface CartItem {
  productId: number;
  quantitySold: number;
}

export const handleCheckoutOrder = async (
  db: SQLite.SQLiteDatabase,
  cartItems: CartItem[]
): Promise<void> => {
  await db.execAsync('BEGIN TRANSACTION');

  try {
    for (const item of cartItems) {
      // Check if product has recipe definition
      const product = await db.getFirstAsync<{ recipe_definition_id: number; stock_deduction_method: string }>(
        'SELECT recipe_definition_id, stock_deduction_method FROM products WHERE id = ?',
        [item.productId]
      );

      if (product && product.stock_deduction_method === 'product') {
        await db.runAsync(
          'UPDATE products SET current_stock = MAX(0, current_stock - ?) WHERE id = ?',
          [item.quantitySold, item.productId]
        );
      }

      if (product && product.recipe_definition_id && product.stock_deduction_method === 'recipe') {
        // Get recipe components from new structure
        const recipes = await db.getAllAsync<{ ingredient_id: number; quantity_needed_base: number }>(
          'SELECT ingredient_id, quantity_needed_base FROM recipe_ingredients WHERE recipe_id = ?',
          [product.recipe_definition_id]
        );

        // Deduct stock for each recipe ingredient using FIFO
        for (const recipe of recipes) {
          const quantityNeeded = new Decimal(recipe.quantity_needed_base);
          const quantitySold = new Decimal(item.quantitySold);
          const totalDeductionNeeded = quantityNeeded.mul(quantitySold);

          await deductStockFIFO(db, recipe.ingredient_id, totalDeductionNeeded.toNumber());
        }
      }

      // Log order activity
      const productWithDetails = await db.getFirstAsync<{ name: string }>(
        'SELECT name FROM products WHERE id = ?',
        [item.productId]
      );
      await dbOperations.logActivity(
        db,
        'order',
        'product',
        item.productId,
        productWithDetails?.name || 'Unknown',
        item.quantitySold,
        'pcs',
        `Sold ${item.quantitySold} units of ${productWithDetails?.name || 'Unknown'}`
      );
    }

    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
};