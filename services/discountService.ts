import * as SQLite from 'expo-sqlite';
import { dbOperations, DiscountItem } from '../lib/database';

export interface DiscountCreateInput {
  name: string;
  type: 'percentage' | 'flat';
  value: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number | null;
}

export interface DiscountUpdateInput {
  name?: string;
  type?: 'percentage' | 'flat';
  value?: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number | null;
  isActive?: boolean;
}

export class DiscountService {
  /**
   * Get all discounts
   */
  static async getAll(db: SQLite.SQLiteDatabase): Promise<DiscountItem[]> {
    return await dbOperations.getAllDiscounts(db);
  }

  /**
   * Get active discounts
   */
  static async getActive(db: SQLite.SQLiteDatabase): Promise<DiscountItem[]> {
    return await dbOperations.getActiveDiscounts(db);
  }

  /**
   * Get discount by ID
   */
  static async getById(db: SQLite.SQLiteDatabase, id: number): Promise<DiscountItem | null> {
    const items = await db.getAllAsync<DiscountItem>(
      'SELECT * FROM discounts WHERE id = ?',
      [id]
    );
    return items[0] || null;
  }

  /**
   * Create discount preset
   */
  static async create(db: SQLite.SQLiteDatabase, input: DiscountCreateInput): Promise<DiscountItem | null> {
    const id = await dbOperations.createDiscount(
      db,
      input.name,
      input.type,
      input.value,
      input.minOrderAmount || 0,
      input.maxDiscountAmount || null
    );
    return await this.getById(db, id);
  }

  /**
   * Update discount preset
   */
  static async update(
    db: SQLite.SQLiteDatabase,
    id: number,
    input: DiscountUpdateInput
  ): Promise<DiscountItem | null> {
    if (input.name !== undefined && input.type !== undefined && input.value !== undefined) {
      await dbOperations.updateDiscount(
        db,
        id,
        input.name,
        input.type,
        input.value,
        input.minOrderAmount || 0,
        input.maxDiscountAmount || null
      );
    }
    if (input.isActive !== undefined) {
      await dbOperations.toggleDiscount(db, id, input.isActive);
    }
    return await this.getById(db, id);
  }

  /**
   * Toggle active state
   */
  static async toggleActive(db: SQLite.SQLiteDatabase, id: number, isActive: boolean): Promise<void> {
    await dbOperations.toggleDiscount(db, id, isActive);
  }

  /**
   * Delete discount preset
   */
  static async delete(db: SQLite.SQLiteDatabase, id: number): Promise<void> {
    await dbOperations.deleteDiscount(db, id);
  }
}
