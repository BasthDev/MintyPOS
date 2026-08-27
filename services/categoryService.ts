import * as SQLite from 'expo-sqlite';
import { dbOperations } from '../lib/database';

export interface CategoryCreateInput {
  name: string;
}

export interface CategoryUpdateInput {
  name?: string;
}

export class CategoryService {
  /**
   * Get all categories
   */
  static async getAll(db: SQLite.SQLiteDatabase) {
    return await dbOperations.getAllCategories(db);
  }

  /**
   * Get category by ID
   */
  static async getById(db: SQLite.SQLiteDatabase, id: number) {
    const categories = await db.getAllAsync<{ id: number; name: string }>(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );
    return categories[0] || null;
  }

  /**
   * Create new category
   */
  static async create(db: SQLite.SQLiteDatabase, input: CategoryCreateInput) {
    const categoryId = await dbOperations.createCategory(db, input.name);
    return await this.getById(db, categoryId);
  }

  /**
   * Update category
   */
  static async update(db: SQLite.SQLiteDatabase, id: number, input: CategoryUpdateInput) {
    const updates: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }

    if (updates.length === 0) return await this.getById(db, id);

    values.push(id);
    await db.runAsync(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return await this.getById(db, id);
  }

  /**
   * Delete category
   */
  static async delete(db: SQLite.SQLiteDatabase, id: number) {
    // Foreign key actions (ON DELETE SET NULL) handle cleanup automatically
    // products.category_id will SET NULL automatically
    await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
  }

  /**
   * Search categories by name
   */
  static async search(db: SQLite.SQLiteDatabase, query: string) {
    return await db.getAllAsync(
      'SELECT * FROM categories WHERE name LIKE ? ORDER BY name',
      [`%${query}%`]
    );
  }
}