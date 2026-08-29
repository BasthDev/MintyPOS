import AsyncStorage from '@react-native-async-storage/async-storage';
import { Decimal } from 'decimal.js';
import * as SQLite from 'expo-sqlite';

// Database name
const DB_NAME = 'mintypos.db';

// ==========================================
// MOCK DATA CONFIGURATION FLAG
// ==========================================
// Set to true to seed/reset mock data on app restart.
// Set to false for production or to preserve user data.
const ENABLE_MOCK_DATA = false;

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
  stock_deduction_method: 'product' | 'recipe' | 'none';
  image_uri?: string;
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
  tax_name?: string | null;
  service_amount: number;
  service_name?: string | null;
  total: number;
  payment_type: string;
  payment_method: string;
  amount_paid: number;
  change_amount: number;
  items_count: number;
  note?: string;
  customer_id?: number | null;
  customer_name?: string | null;
  is_split?: number;
  split_parent_id?: number | null;
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
  note?: string;
}

export interface CustomerItem {
  id: number;
  uuid: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  tier: 'regular' | 'bronze' | 'silver' | 'gold';
  loyalty_points: number;
  total_spent: number;
  store_credit_balance: number;
  created_at: string;
  updated_at: string;
}

export interface CRMConfigItem {
  id: number;
  loyalty_enabled: number;
  points_per_currency: number;
  min_transaction_for_points: number;
  tier_upgrade_enabled: number;
  tier_upgrade_period: string;
  bronze_threshold: number;
  silver_threshold: number;
  gold_threshold: number;
  redemption_enabled: number;
  points_to_currency_ratio: number;
  min_points_to_redeem: number;
  max_redemption_pct: number;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerLoyaltyTransactionItem {
  id: number;
  customer_id: number;
  order_id?: number;
  order_number?: string;
  type: 'earn' | 'redeem' | 'adjust';
  points: number;
  notes?: string;
  created_at: string;
}

export interface CustomerBalanceTransactionItem {
  id: number;
  customer_id: number;
  order_id?: number;
  type: 'deposit' | 'spend' | 'refund';
  amount: number;
  notes?: string;
  created_at: string;
}

export interface OrderSplitItem {
  id: number;
  parent_order_id: number;
  split_index: number;
  total_splits: number;
  amount: number;
  payment_method: string;
  payment_provider?: string;
  customer_id?: number;
  status: string;
  created_at: string;
}

// Database singleton instance and initialization promise
let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// Mock Data Seeding Helper
const seedMockDataIfNeeded = async (db: SQLite.SQLiteDatabase) => {
  if (!ENABLE_MOCK_DATA) return;

  try {
    // Temporarily disable foreign keys for clean resetting
    await db.execAsync('PRAGMA foreign_keys = OFF;');

    // Clear existing transactional & master data to prevent duplication on restart
    await db.execAsync(`
      DELETE FROM order_items;
      DELETE FROM orders;
      DELETE FROM activity_logs;
      DELETE FROM inventory_batches;
      DELETE FROM recipe_ingredients;
      DELETE FROM products;
      DELETE FROM recipe_definitions;
      DELETE FROM ingredient_units;
      DELETE FROM ingredients;
      DELETE FROM suppliers;
      DELETE FROM categories;
      DELETE FROM payment_methods;
      DELETE FROM tax_configs;
      DELETE FROM discounts;
      DELETE FROM units;
    `);

    // Re-enable foreign keys
    await db.execAsync('PRAGMA foreign_keys = ON;');

    // 1. Units
    await db.execAsync(`
      INSERT INTO units (id, name, symbol) VALUES 
      (1, 'gram', 'g'),
      (2, 'milliliter', 'ml'),
      (3, 'piece', 'pcs');
    `);

    // 2. Categories
    await db.execAsync(`
      INSERT INTO categories (id, name) VALUES
      (1, 'Beverages'),
      (2, 'Food'),
      (3, 'Snacks'),
      (4, 'Merchandise');
    `);

    // 3. Suppliers
    await db.execAsync(`
      INSERT INTO suppliers (id, name, contact) VALUES
      (1, 'Global Coffee Suppliers Ltd', '+1 555-123-4567'),
      (2, 'Fresh Dairy Farms Inc', '+1 555-987-6543'),
      (3, 'Sweeteners & Syrups Co', '+1 555-456-7890'),
      (4, 'Premium Packaging Supplies', '+1 555-321-0987'),
      (5, 'Food Merchandise Wholesalers', '+1 555-654-3210');
    `);

    // 4. Ingredients
    await db.execAsync(`
      INSERT INTO ingredients (id, name, base_unit_id, minimum_stock) VALUES
      (1, 'Arabica Coffee Beans', 1, 1000),
      (2, 'Fresh Whole Milk', 2, 5000),
      (3, 'Vanilla Sugar Syrup', 2, 2000),
      (4, 'Paper Cup 12oz', 3, 100),
      (5, 'Espresso Coffee Beans', 1, 800),
      (6, 'Oat Milk', 2, 3000),
      (7, 'Caramel Syrup', 2, 1500),
      (8, 'Paper Cup 16oz', 3, 80),
      (9, 'Croissant Dough', 1, 500),
      (10, 'Butter', 1, 400);
    `);

    // 5. Ingredient Units (Conversions)
    await db.execAsync(`
      INSERT INTO ingredient_units (ingredient_id, unit_name, multiplier_to_base) VALUES
      (1, 'Bag (500g)', 500),
      (2, 'Gallon (3785ml)', 3785),
      (3, 'Bottle (750ml)', 750),
      (5, 'Bag (500g)', 500),
      (6, 'Carton (1000ml)', 1000),
      (7, 'Bottle (750ml)', 750),
      (8, 'Case (100pcs)', 100),
      (9, 'Box (20pcs)', 20),
      (10, 'Block (500g)', 500);
    `);

    // 6. Inventory Batches (with proper HPP calculations)
    const today = new Date().toISOString();
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Coffee beans batches
    await db.runAsync(
      `INSERT INTO inventory_batches (ingredient_id, supplier_id, initial_quantity_base, remaining_quantity_base, cost_per_base_unit, received_date) VALUES (?, ?, ?, ?, ?, ?)`,
      [1, 1, 5000, 4800, 180, lastMonth] // 5000g Arabica @ 180/g
    );
    await db.runAsync(
      `INSERT INTO inventory_batches (ingredient_id, supplier_id, initial_quantity_base, remaining_quantity_base, cost_per_base_unit, received_date) VALUES (?, ?, ?, ?, ?, ?)`,
      [1, 1, 3000, 3000, 195, lastWeek] // 3000g Arabica @ 195/g
    );

    // Fresh milk batches
    await db.runAsync(
      `INSERT INTO inventory_batches (ingredient_id, supplier_id, initial_quantity_base, remaining_quantity_base, cost_per_base_unit, received_date) VALUES (?, ?, ?, ?, ?, ?)`,
      [2, 2, 20000, 18000, 22, lastWeek] // 20000ml milk @ 22/ml
    );
    await db.runAsync(
      `INSERT INTO inventory_batches (ingredient_id, supplier_id, initial_quantity_base, remaining_quantity_base, cost_per_base_unit, received_date) VALUES (?, ?, ?, ?, ?, ?)`,
      [2, 2, 15000, 15000, 25, today] // 15000ml milk @ 25/ml
    );

    // Oat milk batches
    await db.runAsync(
      `INSERT INTO inventory_batches (ingredient_id, supplier_id, initial_quantity_base, remaining_quantity_base, cost_per_base_unit, received_date) VALUES (?, ?, ?, ?, ?, ?)`,
      [6, 2, 8000, 7500, 35, lastWeek] // 8000ml oat milk @ 35/ml
    );

    // Syrups batches
    await db.runAsync(
      `INSERT INTO inventory_batches (ingredient_id, supplier_id, initial_quantity_base, remaining_quantity_base, cost_per_base_unit, received_date) VALUES (?, ?, ?, ?, ?, ?)`,
      [3, 3, 5000, 4800, 45, lastMonth] // 5000ml vanilla syrup @ 45/ml
    );
    await db.runAsync(
      `INSERT INTO inventory_batches (ingredient_id, supplier_id, initial_quantity_base, remaining_quantity_base, cost_per_base_unit, received_date) VALUES (?, ?, ?, ?, ?, ?)`,
      [7, 3, 4000, 4000, 50, lastWeek] // 4000ml caramel syrup @ 50/ml
    );

    // Paper cups batches
    await db.runAsync(
      `INSERT INTO inventory_batches (ingredient_id, supplier_id, initial_quantity_base, remaining_quantity_base, cost_per_base_unit, received_date) VALUES (?, ?, ?, ?, ?, ?)`,
      [4, 4, 500, 450, 250, lastMonth] // 500 cups 12oz @ 250/pcs
    );
    await db.runAsync(
      `INSERT INTO inventory_batches (ingredient_id, supplier_id, initial_quantity_base, remaining_quantity_base, cost_per_base_unit, received_date) VALUES (?, ?, ?, ?, ?, ?)`,
      [8, 4, 400, 380, 300, lastWeek] // 400 cups 16oz @ 300/pcs
    );

    // Food ingredients batches
    await db.runAsync(
      `INSERT INTO inventory_batches (ingredient_id, supplier_id, initial_quantity_base, remaining_quantity_base, cost_per_base_unit, received_date) VALUES (?, ?, ?, ?, ?, ?)`,
      [9, 5, 2000, 1800, 80, lastWeek] // 2000g croissant dough @ 80/g
    );
    await db.runAsync(
      `INSERT INTO inventory_batches (ingredient_id, supplier_id, initial_quantity_base, remaining_quantity_base, cost_per_base_unit, received_date) VALUES (?, ?, ?, ?, ?, ?)`,
      [10, 5, 1500, 1400, 120, lastWeek] // 1500g butter @ 120/g
    );

    // 7. Recipe Definitions
    await db.runAsync(
      `INSERT INTO recipe_definitions (id, name, description) VALUES (?, ?, ?)`,
      [1, 'Classic Caffe Latte', 'Standard 12oz hot cafe latte with espresso and steamed milk']
    );
    await db.runAsync(
      `INSERT INTO recipe_definitions (id, name, description) VALUES (?, ?, ?)`,
      [2, 'Iced Caramel Latte', '16oz iced latte with caramel syrup and cold milk']
    );
    await db.runAsync(
      `INSERT INTO recipe_definitions (id, name, description) VALUES (?, ?, ?)`,
      [3, 'Oat Milk Latte', '12oz latte made with oat milk for dairy-free option']
    );

    // 8. Recipe Ingredients (with proper quantities)
    await db.execAsync(`
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity_needed_base) VALUES
      (1, 1, 18),   -- 18g Arabica Coffee Beans
      (1, 2, 150),  -- 150ml Fresh Whole Milk
      (1, 3, 20),   -- 20ml Vanilla Sugar Syrup
      (1, 4, 1);    -- 1 Paper Cup 12oz
    `);

    await db.execAsync(`
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity_needed_base) VALUES
      (2, 5, 20),   -- 20g Espresso Coffee Beans
      (2, 2, 180),  -- 180ml Fresh Whole Milk
      (2, 7, 25),   -- 25ml Caramel Syrup
      (2, 8, 1);    -- 1 Paper Cup 16oz
    `);

    await db.execAsync(`
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity_needed_base) VALUES
      (3, 1, 18),   -- 18g Arabica Coffee Beans
      (3, 6, 150),  -- 150ml Oat Milk
      (3, 3, 20),   -- 20ml Vanilla Sugar Syrup
      (3, 4, 1);    -- 1 Paper Cup 12oz
    `);

    // 9. Products (with proper HPP calculations)
    await db.execAsync(`
      INSERT INTO products (name, sku, category_id, buy_price, selling_price, recipe_definition_id, current_stock, stock_deduction_method) VALUES
      ('Classic Caffe Latte', 'BEV-001', 1, 9490, 28000, 1, 0, 'recipe'),
      ('Iced Caramel Latte', 'BEV-002', 1, 11100, 32000, 2, 0, 'recipe'),
      ('Oat Milk Latte', 'BEV-003', 1, 10490, 30000, 3, 0, 'recipe'),
      ('Butter Croissant', 'SND-001', 3, 5200, 15000, NULL, 45, 'product'),
      ('Chocolate Muffin', 'SND-002', 3, 4500, 12000, NULL, 30, 'product'),
      ('Blueberry Danish', 'SND-003', 3, 4800, 14000, NULL, 25, 'product'),
      ('Cinnamon Roll', 'SND-004', 3, 5000, 13000, NULL, 20, 'product'),
      ('Apple Pie Slice', 'SND-005', 3, 4000, 11000, NULL, 35, 'product'),
      ('Cheese Danish', 'SND-006', 3, 4600, 13500, NULL, 22, 'product'),
      ('Mineral Water 500ml', 'BEV-004', 1, 2000, 5000, NULL, 60, 'product'),
      ('Sparkling Water 330ml', 'BEV-005', 1, 2500, 6000, NULL, 45, 'product'),
      ('Diet Cola 330ml', 'BEV-006', 1, 3000, 7000, NULL, 40, 'product'),
      ('Orange Juice 250ml', 'BEV-007', 1, 3500, 8000, NULL, 35, 'product'),
      ('Iced Tea 300ml', 'BEV-008', 1, 2200, 5500, NULL, 50, 'product'),
      ('Lemonade 300ml', 'BEV-009', 1, 2400, 6000, NULL, 40, 'product'),
      ('MintyPOS T-Shirt', 'MER-001', 4, 45000, 99000, NULL, 20, 'product'),
      ('MintyPOS Cap', 'MER-002', 4, 25000, 55000, NULL, 30, 'product'),
      ('MintyPOS Tote Bag', 'MER-003', 4, 18000, 35000, NULL, 25, 'product'),
      ('Coffee Mug', 'MER-004', 4, 22000, 45000, NULL, 15, 'product'),
      ('Espresso Shot Glass', 'MER-005', 4, 15000, 30000, NULL, 40, 'product'),
      ('Barista Apron', 'MER-006', 4, 65000, 120000, NULL, 12, 'product'),
      ('Coffee Beans Bag 250g', 'MER-007', 4, 35000, 75000, NULL, 18, 'product'),
      ('Lunch Box', 'MER-008', 4, 38000, 85000, NULL, 15, 'product'),
      ('Travel Tumbler', 'MER-009', 4, 55000, 110000, NULL, 10, 'product'),
      ('Keychain', 'MER-010', 4, 8000, 15000, NULL, 50, 'product');
    `);

    // 10. Payment Methods (International)
    await db.execAsync(`
      INSERT INTO payment_methods (type_key, type_label, method_name, is_active, is_system) VALUES
      ('cash', 'Cash', 'Cash', 1, 1),
      ('card', 'Card', 'Visa', 1, 0),
      ('card', 'Card', 'Mastercard', 1, 0),
      ('card', 'Card', 'American Express', 1, 0),
      ('card', 'Card', 'Discover', 1, 0),
      ('transfer', 'Bank Transfer', 'Chase Bank', 1, 0),
      ('transfer', 'Bank Transfer', 'Bank of America', 1, 0),
      ('transfer', 'Bank Transfer', 'Wells Fargo', 1, 0),
      ('transfer', 'Bank Transfer', 'Citibank', 1, 0),
      ('ewallet', 'Digital Wallet', 'Apple Pay', 1, 0),
      ('ewallet', 'Digital Wallet', 'Google Pay', 1, 0),
      ('ewallet', 'Digital Wallet', 'PayPal', 1, 0),
      ('ewallet', 'Digital Wallet', 'Samsung Pay', 1, 0),
      ('ewallet', 'Digital Wallet', 'Venmo', 1, 0);
    `);

    // 11. Tax Configs
    await db.execAsync(`
      INSERT INTO tax_configs (name, rate, type, is_active) VALUES
      ('VAT / GST', 10, 'percentage', 1),
      ('Service Charge', 5, 'percentage', 1);
    `);

    // 12. Discounts
    await db.execAsync(`
      INSERT INTO discounts (name, type, value, min_order_amount, max_discount_amount, is_active) VALUES
      ('Loyalty Member Discount', 'percentage', 10, 50000, 25000, 1),
      ('Happy Hour Special', 'percentage', 15, 30000, 15000, 1),
      ('Bulk Order Discount', 'percentage', 5, 100000, 10000, 1),
      ('First Time Customer', 'flat', 5000, 20000, NULL, 1),
      ('Weekend Promo', 'flat', 10000, 50000, NULL, 1);
    `);

    console.log('Mock data seeded successfully.');
  } catch (error) {
    console.error('Error seeding mock data:', error);
  }
};

// Multi-store Database instances cache
const dbStoreInstances = new Map<string, SQLite.SQLiteDatabase>();
const dbStorePromises = new Map<string, Promise<SQLite.SQLiteDatabase>>();

// Database initialization
export const initDatabase = async (storeId?: string): Promise<SQLite.SQLiteDatabase> => {
  const dbName = storeId ? `mintypos_store_${storeId}.db` : DB_NAME;

  if (dbStoreInstances.has(dbName)) {
    return dbStoreInstances.get(dbName)!;
  }

  if (dbStorePromises.has(dbName)) {
    return dbStorePromises.get(dbName)!;
  }

  const promise = (async () => {
    try {
      const db = await SQLite.openDatabaseAsync(dbName);

      // Enable foreign keys and WAL (Write-Ahead Logging) mode
      await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');

      // Set user_version
      await db.execAsync('PRAGMA user_version = 10;');

      // 1. Create all 20 tables with complete schemas
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS units (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          symbol TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS suppliers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          contact TEXT
        );

        CREATE TABLE IF NOT EXISTS ingredients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          base_unit_id INTEGER NOT NULL,
          minimum_stock REAL NOT NULL DEFAULT 0,
          is_active INTEGER DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (base_unit_id) REFERENCES units(id)
        );

        CREATE TABLE IF NOT EXISTS ingredient_units (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ingredient_id INTEGER NOT NULL,
          unit_name TEXT NOT NULL,
          multiplier_to_base REAL NOT NULL,
          FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS inventory_batches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ingredient_id INTEGER NOT NULL,
          supplier_id INTEGER NOT NULL,
          initial_quantity_base REAL NOT NULL,
          remaining_quantity_base REAL NOT NULL,
          cost_per_base_unit REAL NOT NULL,
          received_date TEXT NOT NULL,
          expiration_date TEXT,
          FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE SET NULL,
          FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS recipe_definitions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS recipe_ingredients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          recipe_id INTEGER NOT NULL,
          ingredient_id INTEGER NOT NULL,
          quantity_needed_base REAL NOT NULL,
          FOREIGN KEY (recipe_id) REFERENCES recipe_definitions(id) ON DELETE CASCADE,
          FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
        );

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
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
          FOREIGN KEY (recipe_definition_id) REFERENCES recipe_definitions(id) ON DELETE SET NULL
        );

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

        CREATE TABLE IF NOT EXISTS payment_methods (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type_key TEXT NOT NULL,
          type_label TEXT NOT NULL,
          method_name TEXT NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          is_system INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS tax_configs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          rate REAL NOT NULL,
          type TEXT NOT NULL DEFAULT 'percentage',
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

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

        CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uuid TEXT UNIQUE,
          name TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          notes TEXT,
          tier TEXT DEFAULT 'regular',
          loyalty_points INTEGER DEFAULT 0,
          total_spent REAL DEFAULT 0,
          store_credit_balance REAL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS crm_configs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          loyalty_enabled INTEGER DEFAULT 1,
          points_per_currency REAL DEFAULT 0.01,
          min_transaction_for_points REAL DEFAULT 0,
          tier_upgrade_enabled INTEGER DEFAULT 1,
          tier_upgrade_period TEXT DEFAULT 'lifetime',
          bronze_threshold REAL DEFAULT 1000000,
          silver_threshold REAL DEFAULT 5000000,
          gold_threshold REAL DEFAULT 10000000,
          redemption_enabled INTEGER DEFAULT 1,
          points_to_currency_ratio REAL DEFAULT 0.01,
          min_points_to_redeem INTEGER DEFAULT 100,
          max_redemption_pct REAL DEFAULT 50,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_number TEXT NOT NULL,
          subtotal REAL NOT NULL,
          discount_amount REAL NOT NULL DEFAULT 0,
          discount_name TEXT,
          tax_amount REAL NOT NULL DEFAULT 0,
          tax_name TEXT,
          service_amount REAL NOT NULL DEFAULT 0,
          service_name TEXT,
          total REAL NOT NULL,
          payment_type TEXT NOT NULL,
          payment_method TEXT NOT NULL,
          amount_paid REAL NOT NULL,
          change_amount REAL NOT NULL DEFAULT 0,
          items_count INTEGER NOT NULL DEFAULT 0,
          note TEXT,
          customer_id INTEGER,
          customer_name TEXT,
          is_split INTEGER DEFAULT 0,
          split_parent_id INTEGER,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          product_name TEXT NOT NULL,
          price REAL NOT NULL,
          quantity REAL NOT NULL,
          subtotal REAL NOT NULL,
          note TEXT,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS order_splits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          parent_order_id INTEGER NOT NULL,
          split_index INTEGER NOT NULL,
          total_splits INTEGER NOT NULL,
          amount REAL NOT NULL,
          payment_method TEXT NOT NULL,
          payment_provider TEXT,
          customer_id INTEGER,
          status TEXT DEFAULT 'completed',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (parent_order_id) REFERENCES orders(id) ON DELETE CASCADE,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS customer_loyalty_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL,
          order_id INTEGER,
          order_number TEXT,
          type TEXT NOT NULL,
          points INTEGER NOT NULL,
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS customer_balance_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL,
          order_id INTEGER,
          type TEXT NOT NULL,
          amount REAL NOT NULL,
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
        );
      `);

      // 2. Create performance indexes
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_inventory_batches_ingredient ON inventory_batches(ingredient_id);
        CREATE INDEX IF NOT EXISTS idx_inventory_batches_date ON inventory_batches(received_date);
        CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
        CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id);
        CREATE INDEX IF NOT EXISTS idx_products_recipe ON products(recipe_definition_id);
        CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs(type);
      `);

      // 3. Ensure Default Seeding for Clean Operations
      // Units: Always ensure standard base units exist
      const existingUnits = await db.getAllAsync<Unit>('SELECT * FROM units LIMIT 1');
      if (existingUnits.length === 0) {
        await db.execAsync(`
          INSERT INTO units (name, symbol) VALUES 
          ('gram', 'g'),
          ('milliliter', 'ml'),
          ('piece', 'pcs'),
          ('kilogram', 'kg'),
          ('liter', 'L');
        `);
      }

      // Payment Methods: Always ensure Cash exists
      const existingMethods = await db.getAllAsync<any>('SELECT * FROM payment_methods LIMIT 1');
      if (existingMethods.length === 0) {
        await db.execAsync(`
          INSERT INTO payment_methods (type_key, type_label, method_name, is_active, is_system) VALUES 
          ('cash', 'Cash', 'Cash', 1, 1);
        `);
      }

      // CRM Configs: Always ensure default loyalty configuration exists
      const existingCrm = await db.getAllAsync<any>('SELECT * FROM crm_configs LIMIT 1');
      if (existingCrm.length === 0) {
        await db.execAsync(`
          INSERT INTO crm_configs (
            loyalty_enabled, points_per_currency, min_transaction_for_points,
            tier_upgrade_enabled, bronze_threshold, silver_threshold, gold_threshold,
            redemption_enabled, points_to_currency_ratio, min_points_to_redeem, max_redemption_pct
          ) VALUES (
            1, 0.01, 0,
            1, 1000000, 5000000, 10000000,
            1, 0.01, 100, 50
          );
        `);
      }

      // If mock data is enabled explicitly, seed mock datasets
      if (ENABLE_MOCK_DATA) {
        await seedMockDataIfNeeded(db);
      }

      dbStoreInstances.set(dbName, db);
      dbInstance = db;
      return db;
    } catch (error) {
      dbStorePromises.delete(dbName);
      initPromise = null;
      throw error;
    }
  })();

  dbStorePromises.set(dbName, promise);
  return promise;
};

// Get database instance (always awaits store-isolated initialization)
export const getDatabase = async (storeId?: string): Promise<SQLite.SQLiteDatabase> => {
  let targetStoreId = storeId;
  if (!targetStoreId) {
    try {
      targetStoreId = (await AsyncStorage.getItem('mintypos_active_store_id')) || undefined;
    } catch {
      targetStoreId = undefined;
    }
  }

  const dbName = targetStoreId ? `mintypos_store_${targetStoreId}.db` : DB_NAME;
  if (dbStoreInstances.has(dbName)) {
    return dbStoreInstances.get(dbName)!;
  }
  return await initDatabase(targetStoreId);
};

// Clean & reset all local database connections & cache
export const clearAllDatabases = async (): Promise<void> => {
  try {
    for (const [dbName, db] of dbStoreInstances.entries()) {
      try {
        await db.closeAsync();
      } catch (e) {
        // Ignore close errors
      }
      try {
        await SQLite.deleteDatabaseAsync(dbName);
      } catch (e) {
        // Ignore delete errors
      }
    }
    try {
      await SQLite.deleteDatabaseAsync(DB_NAME);
    } catch (e) {
      // Ignore
    }
  } finally {
    dbStoreInstances.clear();
    dbStorePromises.clear();
    dbInstance = null;
    initPromise = null;
  }
};


// Database operations (same as your implementation)
export const dbOperations = {
  async getAllCategories(db: SQLite.SQLiteDatabase): Promise<Category[]> {
    return await db.getAllAsync<Category>('SELECT * FROM categories ORDER BY name');
  },

  async createCategory(db: SQLite.SQLiteDatabase, name: string): Promise<number> {
    const result = await db.runAsync('INSERT INTO categories (name) VALUES (?)', [name]);
    return result.lastInsertRowId;
  },

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
    // Foreign key actions (ON DELETE SET NULL/CASCADE) handle cleanup automatically
    // products.recipe_definition_id will SET NULL automatically
    // recipe_ingredients will CASCADE delete automatically
    await db.runAsync('DELETE FROM recipe_definitions WHERE id = ?', [id]);
  },

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

  async getAllUnits(db: SQLite.SQLiteDatabase): Promise<Unit[]> {
    return await db.getAllAsync<Unit>('SELECT * FROM units ORDER BY id');
  },

  async createUnit(db: SQLite.SQLiteDatabase, name: string, symbol: string): Promise<number> {
    const result = await db.runAsync('INSERT INTO units (name, symbol) VALUES (?, ?)', [name, symbol]);
    return result.lastInsertRowId;
  },

  async getAllIngredients(db: SQLite.SQLiteDatabase): Promise<Ingredient[]> {
    return await db.getAllAsync<Ingredient>(`
      SELECT i.*, u.name as unit_name, u.symbol as unit_symbol 
      FROM ingredients i 
      JOIN units u ON i.base_unit_id = u.id 
      WHERE i.is_active = 1
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
      taxName?: string | null;
      serviceAmount: number;
      serviceName?: string | null;
      total: number;
      paymentType: string;
      paymentMethod: string;
      amountPaid: number;
      changeAmount: number;
      note?: string;
      customerId?: number | null;
      customerName?: string | null;
      isSplit?: boolean;
      splitParentId?: number | null;
      items: Array<{
        productId: number;
        productName: string;
        price: number;
        quantity: number;
        subtotal: number;
        note?: string;
      }>;
    }
  ): Promise<number> {
    try {
      const result = await db.runAsync(
        `INSERT INTO orders (
          order_number, subtotal, discount_amount, discount_name, 
          tax_amount, tax_name, service_amount, service_name, total, payment_type, 
          payment_method, amount_paid, change_amount, items_count, note,
          customer_id, customer_name, is_split, split_parent_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderData.orderNumber,
          orderData.subtotal,
          orderData.discountAmount,
          orderData.discountName || null,
          orderData.taxAmount,
          orderData.taxName || null,
          orderData.serviceAmount,
          orderData.serviceName || null,
          orderData.total,
          orderData.paymentType,
          orderData.paymentMethod,
          orderData.amountPaid,
          orderData.changeAmount,
          orderData.items.length,
          orderData.note || null,
          orderData.customerId || null,
          orderData.customerName || null,
          orderData.isSplit ? 1 : 0,
          orderData.splitParentId || null,
        ]
      );

      const orderId = result.lastInsertRowId;

      for (const item of orderData.items) {
        await db.runAsync(
          'INSERT INTO order_items (order_id, product_id, product_name, price, quantity, subtotal, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [orderId, item.productId, item.productName, item.price, item.quantity, item.subtotal, item.note || null]
        );
      }

      return orderId;
    } catch (insertErr: any) {
      if (insertErr?.message && (insertErr.message.includes('has no column') || insertErr.message.includes('column'))) {
        try {
          const orderCols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(orders)');
          const colNames = new Set(orderCols.map((col: any) => col.name));
          if (!colNames.has('note')) await db.execAsync('ALTER TABLE orders ADD COLUMN note TEXT;');
          if (!colNames.has('customer_id')) await db.execAsync('ALTER TABLE orders ADD COLUMN customer_id INTEGER;');
          if (!colNames.has('customer_name')) await db.execAsync('ALTER TABLE orders ADD COLUMN customer_name TEXT;');
          if (!colNames.has('is_split')) await db.execAsync('ALTER TABLE orders ADD COLUMN is_split INTEGER DEFAULT 0;');
          if (!colNames.has('split_parent_id')) await db.execAsync('ALTER TABLE orders ADD COLUMN split_parent_id INTEGER;');
          if (!colNames.has('tax_name')) await db.execAsync('ALTER TABLE orders ADD COLUMN tax_name TEXT;');
          if (!colNames.has('service_name')) await db.execAsync('ALTER TABLE orders ADD COLUMN service_name TEXT;');

          const result = await db.runAsync(
            `INSERT INTO orders (
              order_number, subtotal, discount_amount, discount_name, 
              tax_amount, service_amount, total, payment_type, 
              payment_method, amount_paid, change_amount, items_count, note,
              customer_id, customer_name, is_split, split_parent_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
              orderData.note || null,
              orderData.customerId || null,
              orderData.customerName || null,
              orderData.isSplit ? 1 : 0,
              orderData.splitParentId || null,
            ]
          );

          const orderId = result.lastInsertRowId;

          for (const item of orderData.items) {
            await db.runAsync(
              'INSERT INTO order_items (order_id, product_id, product_name, price, quantity, subtotal, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [orderId, item.productId, item.productName, item.price, item.quantity, item.subtotal, item.note || null]
            );
          }

          return orderId;
        } catch (retryErr) {
          console.error('Failed after retrying order migration:', retryErr);
        }
      }
      throw insertErr;
    }
  },

  async getTodaysSalesStats(db: SQLite.SQLiteDatabase): Promise<{ totalSales: number; orderCount: number }> {
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

  // ─── CRM & CUSTOMER OPERATIONS ───
  async getCustomers(db: SQLite.SQLiteDatabase): Promise<CustomerItem[]> {
    return await db.getAllAsync<CustomerItem>('SELECT * FROM customers ORDER BY name ASC');
  },

  async getCustomerById(db: SQLite.SQLiteDatabase, id: number): Promise<CustomerItem | null> {
    return await db.getFirstAsync<CustomerItem>('SELECT * FROM customers WHERE id = ?', [id]);
  },

  async createCustomer(
    db: SQLite.SQLiteDatabase,
    data: { name: string; phone?: string; email?: string; notes?: string }
  ): Promise<number> {
    const uuid = 'cust_' + Math.random().toString(36).substring(2, 10);
    const result = await db.runAsync(
      'INSERT INTO customers (uuid, name, phone, email, notes, tier, loyalty_points, total_spent, store_credit_balance) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0)',
      [uuid, data.name, data.phone || null, data.email || null, data.notes || null, 'regular']
    );
    return result.lastInsertRowId;
  },

  async updateCustomer(
    db: SQLite.SQLiteDatabase,
    id: number,
    data: { name?: string; phone?: string; email?: string; notes?: string; tier?: 'regular' | 'bronze' | 'silver' | 'gold' }
  ): Promise<void> {
    const existing = await db.getFirstAsync<CustomerItem>('SELECT * FROM customers WHERE id = ?', [id]);
    if (!existing) return;
    await db.runAsync(
      `UPDATE customers SET 
        name = ?, phone = ?, email = ?, notes = ?, tier = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        data.name ?? existing.name,
        data.phone ?? existing.phone ?? null,
        data.email ?? existing.email ?? null,
        data.notes ?? existing.notes ?? null,
        data.tier ?? existing.tier ?? 'regular',
        id,
      ]
    );
  },

  async deleteCustomer(db: SQLite.SQLiteDatabase, id: number): Promise<void> {
    // Foreign key actions (ON DELETE SET NULL/CASCADE) handle cleanup automatically
    // customer_loyalty_transactions and customer_balance_transactions will CASCADE delete
    // orders.customer_id and order_splits.customer_id will SET NULL automatically
    await db.runAsync('DELETE FROM customers WHERE id = ?', [id]);
  },

  async updateCustomerPoints(
    db: SQLite.SQLiteDatabase,
    customerId: number,
    pointsDelta: number,
    type: 'earn' | 'redeem' | 'adjust',
    orderId?: number,
    orderNumber?: string,
    notes?: string
  ): Promise<void> {
    const customer = await db.getFirstAsync<CustomerItem>('SELECT * FROM customers WHERE id = ?', [customerId]);
    if (!customer) return;
    const newPoints = Math.max(0, (customer.loyalty_points || 0) + pointsDelta);
    await db.runAsync('UPDATE customers SET loyalty_points = ?, updated_at = datetime("now") WHERE id = ?', [
      newPoints,
      customerId,
    ]);
    await db.runAsync(
      'INSERT INTO customer_loyalty_transactions (customer_id, order_id, order_number, type, points, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [customerId, orderId || null, orderNumber || null, type, pointsDelta, notes || null]
    );
  },

  async depositStoreCredit(
    db: SQLite.SQLiteDatabase,
    customerId: number,
    amount: number,
    notes?: string
  ): Promise<void> {
    const customer = await db.getFirstAsync<CustomerItem>('SELECT * FROM customers WHERE id = ?', [customerId]);
    if (!customer) return;
    const newBal = (customer.store_credit_balance || 0) + amount;
    await db.runAsync('UPDATE customers SET store_credit_balance = ?, updated_at = datetime("now") WHERE id = ?', [
      newBal,
      customerId,
    ]);
    await db.runAsync(
      'INSERT INTO customer_balance_transactions (customer_id, type, amount, notes) VALUES (?, ?, ?, ?)',
      [customerId, 'deposit', amount, notes || 'Deposit store credit']
    );
  },

  async spendStoreCredit(
    db: SQLite.SQLiteDatabase,
    customerId: number,
    amount: number,
    orderId?: number,
    notes?: string
  ): Promise<void> {
    const customer = await db.getFirstAsync<CustomerItem>('SELECT * FROM customers WHERE id = ?', [customerId]);
    if (!customer || (customer.store_credit_balance || 0) < amount) {
      throw new Error('Insufficient store credit balance');
    }
    const newBal = (customer.store_credit_balance || 0) - amount;
    await db.runAsync('UPDATE customers SET store_credit_balance = ?, updated_at = datetime("now") WHERE id = ?', [
      newBal,
      customerId,
    ]);
    await db.runAsync(
      'INSERT INTO customer_balance_transactions (customer_id, order_id, type, amount, notes) VALUES (?, ?, ?, ?, ?)',
      [customerId, orderId || null, 'spend', amount, notes || 'Spent store credit']
    );
  },

  async getCustomerLoyaltyLogs(db: SQLite.SQLiteDatabase, customerId: number): Promise<CustomerLoyaltyTransactionItem[]> {
    return await db.getAllAsync<CustomerLoyaltyTransactionItem>(
      'SELECT * FROM customer_loyalty_transactions WHERE customer_id = ? ORDER BY created_at DESC',
      [customerId]
    );
  },

  async getCustomerBalanceLogs(db: SQLite.SQLiteDatabase, customerId: number): Promise<CustomerBalanceTransactionItem[]> {
    return await db.getAllAsync<CustomerBalanceTransactionItem>(
      'SELECT * FROM customer_balance_transactions WHERE customer_id = ? ORDER BY created_at DESC',
      [customerId]
    );
  },

  // ─── CRM CONFIG OPERATIONS ───
  async getCRMConfig(db: SQLite.SQLiteDatabase): Promise<CRMConfigItem | null> {
    const res = await db.getFirstAsync<CRMConfigItem>('SELECT * FROM crm_configs ORDER BY id ASC LIMIT 1');
    return res || null;
  },

  async updateCRMConfig(
    db: SQLite.SQLiteDatabase,
    config: Partial<CRMConfigItem>
  ): Promise<void> {
    const existing = await db.getFirstAsync<CRMConfigItem>('SELECT * FROM crm_configs ORDER BY id ASC LIMIT 1');
    if (!existing) return;
    await db.runAsync(
      `UPDATE crm_configs SET
        loyalty_enabled = ?,
        points_per_currency = ?,
        min_transaction_for_points = ?,
        tier_upgrade_enabled = ?,
        bronze_threshold = ?,
        silver_threshold = ?,
        gold_threshold = ?,
        redemption_enabled = ?,
        points_to_currency_ratio = ?,
        min_points_to_redeem = ?,
        max_redemption_pct = ?,
        updated_at = datetime('now')
       WHERE id = ?`,
      [
        config.loyalty_enabled !== undefined ? config.loyalty_enabled : existing.loyalty_enabled,
        config.points_per_currency !== undefined ? config.points_per_currency : existing.points_per_currency,
        config.min_transaction_for_points !== undefined ? config.min_transaction_for_points : existing.min_transaction_for_points,
        config.tier_upgrade_enabled !== undefined ? config.tier_upgrade_enabled : existing.tier_upgrade_enabled,
        config.bronze_threshold !== undefined ? config.bronze_threshold : existing.bronze_threshold,
        config.silver_threshold !== undefined ? config.silver_threshold : existing.silver_threshold,
        config.gold_threshold !== undefined ? config.gold_threshold : existing.gold_threshold,
        config.redemption_enabled !== undefined ? config.redemption_enabled : existing.redemption_enabled,
        config.points_to_currency_ratio !== undefined ? config.points_to_currency_ratio : existing.points_to_currency_ratio,
        config.min_points_to_redeem !== undefined ? config.min_points_to_redeem : existing.min_points_to_redeem,
        config.max_redemption_pct !== undefined ? config.max_redemption_pct : existing.max_redemption_pct,
        existing.id,
      ]
    );
  },

  // ─── SPLIT PAYMENT OPERATIONS ───
  async createOrderSplits(
    db: SQLite.SQLiteDatabase,
    parentOrderId: number,
    splits: Array<{
      splitIndex: number;
      totalSplits: number;
      amount: number;
      paymentMethod: string;
      paymentProvider?: string;
      customerId?: number;
    }>
  ): Promise<void> {
    for (const s of splits) {
      await db.runAsync(
        `INSERT INTO order_splits (
          parent_order_id, split_index, total_splits, amount, 
          payment_method, payment_provider, customer_id, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'completed')`,
        [
          parentOrderId,
          s.splitIndex,
          s.totalSplits,
          s.amount,
          s.paymentMethod,
          s.paymentProvider || null,
          s.customerId || null,
        ]
      );
    }
  },

  async getOrderSplits(db: SQLite.SQLiteDatabase, parentOrderId: number): Promise<OrderSplitItem[]> {
    return await db.getAllAsync<OrderSplitItem>(
      'SELECT * FROM order_splits WHERE parent_order_id = ? ORDER BY split_index ASC',
      [parentOrderId]
    );
  },
};

export const getCurrentStock = async (db: SQLite.SQLiteDatabase, ingredientId: number): Promise<number> => {
  const result = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(remaining_quantity_base), 0) as total 
     FROM inventory_batches 
     WHERE ingredient_id = ?`,
    [ingredientId]
  );
  return result?.total || 0;
};

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
      const newRemaining = batchQuantity.minus(remainingToDeduct);
      await db.runAsync(
        'UPDATE inventory_batches SET remaining_quantity_base = ? WHERE id = ?',
        [newRemaining.toNumber(), batch.id]
      );
      remainingToDeduct = new Decimal(0);
    } else {
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

export interface RestockPayload {
  ingredientId: number;
  supplierId: number;
  quantityBought: number;
  boughtUnit: string;
  unitMultiplier: number;
  totalCostPaid: number;
}

export const processRestockToSmallestUnit = (payload: RestockPayload) => {
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
        const recipes = await db.getAllAsync<{ ingredient_id: number; quantity_needed_base: number }>(
          'SELECT ingredient_id, quantity_needed_base FROM recipe_ingredients WHERE recipe_id = ?',
          [product.recipe_definition_id]
        );

        for (const recipe of recipes) {
          const quantityNeeded = new Decimal(recipe.quantity_needed_base);
          const quantitySold = new Decimal(item.quantitySold);
          const totalDeductionNeeded = quantityNeeded.mul(quantitySold);

          await deductStockFIFO(db, recipe.ingredient_id, totalDeductionNeeded.toNumber());
        }
      }

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

/**
 * Fetch the active SQLite user_version directly from the database
 */
export const getDatabaseVersion = async (db: SQLite.SQLiteDatabase): Promise<number> => {
  const versionResult = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  return versionResult?.user_version || 8;
};

/**
 * Reset database to a clean default state (clearing all transactions, catalog, CRM data, and re-seeding default config)
 */
export const resetToCleanDatabase = async (db: SQLite.SQLiteDatabase): Promise<void> => {
  await db.execAsync('PRAGMA foreign_keys = OFF;');
  await db.execAsync(`
    DELETE FROM order_items;
    DELETE FROM order_splits;
    DELETE FROM customer_loyalty_transactions;
    DELETE FROM customer_balance_transactions;
    DELETE FROM orders;
    DELETE FROM activity_logs;
    DELETE FROM recipe_ingredients;
    DELETE FROM recipe_definitions;
    DELETE FROM products;
    DELETE FROM inventory_batches;
    DELETE FROM ingredient_units;
    DELETE FROM ingredients;
    DELETE FROM suppliers;
    DELETE FROM categories;
    DELETE FROM discounts;
    DELETE FROM tax_configs;
    DELETE FROM payment_methods;
    DELETE FROM customers;
    DELETE FROM units;
    DELETE FROM crm_configs;
  `);

  // Seed default base units (clean production state)
  await db.execAsync(`
    INSERT INTO units (name, symbol) VALUES 
    ('gram', 'g'),
    ('milliliter', 'ml'),
    ('piece', 'pcs'),
    ('kilogram', 'kg'),
    ('liter', 'L');
  `);

  // Seed Cash as the ONLY default system payment method
  await db.execAsync(`
    INSERT INTO payment_methods (type_key, type_label, method_name, is_active, is_system) VALUES 
    ('cash', 'Cash', 'Cash', 1, 1);
  `);

  await db.execAsync('PRAGMA foreign_keys = ON;');
};