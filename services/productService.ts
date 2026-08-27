import * as SQLite from 'expo-sqlite';
import { dbOperations } from '../lib/database';

export interface ProductCreateInput {
  name: string;
  sellingPrice: number;
  sku?: string;
  categoryId?: number;
  buyPrice?: number;
  recipeDefinitionId?: number;
  stockDeductionMethod?: 'none' | 'product' | 'recipe';
  currentStock?: number;
  imageUri?: string;
}

export interface ProductUpdateInput {
  name?: string;
  sellingPrice?: number;
  sku?: string;
  categoryId?: number;
  buyPrice?: number;
  recipeDefinitionId?: number;
  stockDeductionMethod?: 'none' | 'product' | 'recipe';
  currentStock?: number;
  imageUri?: string;
}

export class ProductService {
  /**
   * Get all products
   */
  static async getAll(db: SQLite.SQLiteDatabase) {
    return await dbOperations.getAllProducts(db);
  }

  /**
   * Get product by ID
   */
  static async getById(db: SQLite.SQLiteDatabase, id: number) {
    const products = await db.getAllAsync(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );
    return products[0] || null;
  }

  /**
   * Create new product
   */
  static async create(db: SQLite.SQLiteDatabase, input: ProductCreateInput) {
    const productId = await dbOperations.createProduct(
      db,
      input.name,
      input.sellingPrice,
      input.sku,
      input.categoryId,
      input.buyPrice,
      input.recipeDefinitionId,
      input.stockDeductionMethod || 'product',
      input.currentStock,
      input.imageUri
    );
    return await this.getById(db, productId);
  }

  /**
   * Update product
   */
  static async update(db: SQLite.SQLiteDatabase, id: number, input: ProductUpdateInput) {
    const updates: any = {};

    if (input.name !== undefined) updates.name = input.name;
    if (input.sellingPrice !== undefined) updates.selling_price = input.sellingPrice;
    if (input.sku !== undefined) updates.sku = input.sku;
    if (input.categoryId !== undefined) updates.category_id = input.categoryId;
    if (input.buyPrice !== undefined) updates.buy_price = input.buyPrice;
    if (input.recipeDefinitionId !== undefined) updates.recipe_definition_id = input.recipeDefinitionId;
    if (input.stockDeductionMethod !== undefined) updates.stock_deduction_method = input.stockDeductionMethod;
    if (input.currentStock !== undefined) updates.current_stock = input.currentStock;
    if (input.imageUri !== undefined) updates.image_uri = input.imageUri;

    if (Object.keys(updates).length === 0) return await this.getById(db, id);

    await dbOperations.updateProduct(db, id, updates);
    return await this.getById(db, id);
  }

  /**
   * Delete product
   */
  static async delete(db: SQLite.SQLiteDatabase, id: number) {
    // Temporarily disable foreign keys to allow cleanup
    await db.execAsync('PRAGMA foreign_keys = OFF;');

    try {
      // Set recipe_definition_id to NULL in products (unselect recipe, keep recipe in database)
      await db.runAsync('UPDATE products SET recipe_definition_id = NULL, has_recipe = 0 WHERE id = ?', [id]);

      // Preserve historical order items - set product_id to NULL to keep order records
      await db.runAsync('UPDATE order_items SET product_id = NULL WHERE product_id = ?', [id]);

      // Finally delete the product
      await db.runAsync('DELETE FROM products WHERE id = ?', [id]);
    } finally {
      // Re-enable foreign keys
      await db.execAsync('PRAGMA foreign_keys = ON;');
    }
  }

  /**
   * Search products by name
   */
  static async search(db: SQLite.SQLiteDatabase, query: string) {
    return await db.getAllAsync(
      'SELECT * FROM products WHERE name LIKE ? ORDER BY name',
      [`%${query}%`]
    );
  }

  /**
   * Get products with recipes
   */
  static async getProductsWithRecipes(db: SQLite.SQLiteDatabase) {
    return await db.getAllAsync(
      'SELECT * FROM products WHERE has_recipe = 1 ORDER BY name'
    );
  }

  /**
   * Get products without recipes (simple products)
   */
  static async getSimpleProducts(db: SQLite.SQLiteDatabase) {
    return await db.getAllAsync(
      'SELECT * FROM products WHERE has_recipe = 0 ORDER BY name'
    );
  }
}