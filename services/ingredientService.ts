import * as SQLite from 'expo-sqlite';
import { dbOperations } from '../lib/database';

export interface IngredientCreateInput {
  name: string;
  baseUnitId: number;
  minimumStock: number;
}

export interface IngredientUpdateInput {
  name?: string;
  baseUnitId?: number;
  minimumStock?: number;
}

export class IngredientService {
  /**
   * Get all ingredients with unit info
   */
  static async getAll(db: SQLite.SQLiteDatabase) {
    return await dbOperations.getAllIngredients(db);
  }

  /**
   * Get ingredient by ID
   */
  static async getById(db: SQLite.SQLiteDatabase, id: number) {
    const ingredients = await db.getAllAsync(
      `SELECT i.*, u.name as unit_name, u.symbol as unit_symbol 
       FROM ingredients i 
       JOIN units u ON i.base_unit_id = u.id 
       WHERE i.id = ?`,
      [id]
    );
    return ingredients[0] || null;
  }

  /**
   * Create new ingredient
   */
  static async create(db: SQLite.SQLiteDatabase, input: IngredientCreateInput) {
    const ingredientId = await dbOperations.createIngredient(
      db,
      input.name,
      input.baseUnitId,
      input.minimumStock
    );
    return await this.getById(db, ingredientId);
  }

  /**
   * Update ingredient
   */
  static async update(db: SQLite.SQLiteDatabase, id: number, input: IngredientUpdateInput) {
    const updates: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.baseUnitId !== undefined) {
      updates.push('base_unit_id = ?');
      values.push(input.baseUnitId);
    }
    if (input.minimumStock !== undefined) {
      updates.push('minimum_stock = ?');
      values.push(input.minimumStock);
    }

    if (updates.length === 0) return await this.getById(db, id);

    values.push(id);
    await db.runAsync(
      `UPDATE ingredients SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return await this.getById(db, id);
  }

  /**
   * Delete ingredient
   */
  static async delete(db: SQLite.SQLiteDatabase, id: number) {
    // Temporarily disable foreign keys to allow cleanup
    await db.execAsync('PRAGMA foreign_keys = OFF;');

    try {
      // Delete related ingredient units
      await db.runAsync('DELETE FROM ingredient_units WHERE ingredient_id = ?', [id]);

      // Preserve historical inventory batches - set ingredient_id to NULL to keep records
      await db.runAsync('UPDATE inventory_batches SET ingredient_id = NULL WHERE ingredient_id = ?', [id]);

      // Delete recipe_ingredients that reference this ingredient (recipes remain, just remove ingredient)
      await db.runAsync('DELETE FROM recipe_ingredients WHERE ingredient_id = ?', [id]);

      // Finally delete the ingredient
      await db.runAsync('DELETE FROM ingredients WHERE id = ?', [id]);
    } finally {
      // Re-enable foreign keys
      await db.execAsync('PRAGMA foreign_keys = ON;');
    }
  }

  /**
   * Search ingredients by name
   */
  static async search(db: SQLite.SQLiteDatabase, query: string) {
    return await db.getAllAsync(
      `SELECT i.*, u.name as unit_name, u.symbol as unit_symbol 
       FROM ingredients i 
       JOIN units u ON i.base_unit_id = u.id 
       WHERE i.name LIKE ? 
       ORDER BY i.name`,
      [`%${query}%`]
    );
  }

  /**
   * Get ingredients with low stock
   */
  static async getLowStockIngredients(db: SQLite.SQLiteDatabase) {
    return await db.getAllAsync(
      `SELECT i.*, u.name as unit_name, u.symbol as unit_symbol,
       COALESCE(SUM(ib.remaining_quantity_base), 0) as current_stock
       FROM ingredients i 
       JOIN units u ON i.base_unit_id = u.id
       LEFT JOIN inventory_batches ib ON i.id = ib.ingredient_id AND ib.remaining_quantity_base > 0
       GROUP BY i.id
       HAVING current_stock < i.minimum_stock
       ORDER BY i.name`
    );
  }

  /**
   * Add conversion unit for ingredient
   */
  static async addConversionUnit(
    db: SQLite.SQLiteDatabase,
    ingredientId: number,
    unitName: string,
    multiplierToBase: number
  ) {
    return await dbOperations.createIngredientUnit(
      db,
      ingredientId,
      unitName,
      multiplierToBase
    );
  }

  /**
   * Get conversion units for ingredient
   */
  static async getConversionUnits(db: SQLite.SQLiteDatabase, ingredientId: number) {
    return await dbOperations.getIngredientUnits(db, ingredientId);
  }
}