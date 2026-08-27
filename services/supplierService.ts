import * as SQLite from 'expo-sqlite';
import { dbOperations } from '../lib/database';

export interface SupplierCreateInput {
  name: string;
  contact?: string;
}

export interface SupplierUpdateInput {
  name?: string;
  contact?: string;
}

export class SupplierService {
  /**
   * Get all suppliers
   */
  static async getAll(db: SQLite.SQLiteDatabase) {
    return await dbOperations.getAllSuppliers(db);
  }

  /**
   * Get supplier by ID
   */
  static async getById(db: SQLite.SQLiteDatabase, id: number) {
    const suppliers = await db.getAllAsync(
      'SELECT * FROM suppliers WHERE id = ?',
      [id]
    );
    return suppliers[0] || null;
  }

  /**
   * Create new supplier
   */
  static async create(db: SQLite.SQLiteDatabase, input: SupplierCreateInput) {
    const supplierId = await dbOperations.createSupplier(db, input.name, input.contact || '');
    return await this.getById(db, supplierId);
  }

  /**
   * Update supplier
   */
  static async update(db: SQLite.SQLiteDatabase, id: number, input: SupplierUpdateInput) {
    const updates: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.contact !== undefined) {
      updates.push('contact = ?');
      values.push(input.contact);
    }

    if (updates.length === 0) return await this.getById(db, id);

    values.push(id);
    await db.runAsync(
      `UPDATE suppliers SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return await this.getById(db, id);
  }

  /**
   * Delete supplier
   */
  static async delete(db: SQLite.SQLiteDatabase, id: number) {
    // Foreign key actions (ON DELETE SET NULL) handle cleanup automatically
    // inventory_batches.supplier_id will SET NULL automatically
    await db.runAsync('DELETE FROM suppliers WHERE id = ?', [id]);
  }

  /**
   * Get supplier statistics
   */
  static async getStats(db: SQLite.SQLiteDatabase, supplierId: number) {
    const totalBatches = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM inventory_batches WHERE supplier_id = ?',
      [supplierId]
    );

    const totalValue = await db.getFirstAsync<{ total: number }>(
      'SELECT COALESCE(SUM(initial_quantity_base * cost_per_base_unit), 0) as total FROM inventory_batches WHERE supplier_id = ?',
      [supplierId]
    );

    const ingredientCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(DISTINCT ingredient_id) as count FROM inventory_batches WHERE supplier_id = ?',
      [supplierId]
    );

    const totalQuantity = await db.getFirstAsync<{ total: number }>(
      'SELECT COALESCE(SUM(initial_quantity_base), 0) as total FROM inventory_batches WHERE supplier_id = ?',
      [supplierId]
    );

    return {
      totalBatches: totalBatches?.count || 0,
      totalValue: totalValue?.total || 0,
      ingredientCount: ingredientCount?.count || 0,
      totalQuantity: totalQuantity?.total || 0,
    };
  }

  /**
   * Search suppliers
   */
  static async search(db: SQLite.SQLiteDatabase, query: string) {
    return await db.getAllAsync(
      'SELECT * FROM suppliers WHERE name LIKE ? ORDER BY name',
      [`%${query}%`]
    );
  }
}