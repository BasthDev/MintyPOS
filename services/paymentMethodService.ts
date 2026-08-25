import * as SQLite from 'expo-sqlite';
import { dbOperations, PaymentMethodItem } from '../lib/database';

export interface PaymentMethodCreateInput {
  typeKey: string;
  typeLabel: string;
  methodName: string;
}

export interface PaymentMethodUpdateInput {
  methodName?: string;
  isActive?: boolean;
}

export class PaymentMethodService {
  /**
   * Get all payment methods
   */
  static async getAll(db: SQLite.SQLiteDatabase): Promise<PaymentMethodItem[]> {
    return await dbOperations.getAllPaymentMethods(db);
  }

  /**
   * Get active payment methods
   */
  static async getActive(db: SQLite.SQLiteDatabase): Promise<PaymentMethodItem[]> {
    return await dbOperations.getActivePaymentMethods(db);
  }

  /**
   * Get payment method by ID
   */
  static async getById(db: SQLite.SQLiteDatabase, id: number): Promise<PaymentMethodItem | null> {
    const items = await db.getAllAsync<PaymentMethodItem>(
      'SELECT * FROM payment_methods WHERE id = ?',
      [id]
    );
    return items[0] || null;
  }

  /**
   * Create new payment method
   */
  static async create(
    db: SQLite.SQLiteDatabase,
    input: PaymentMethodCreateInput
  ): Promise<PaymentMethodItem | null> {
    const id = await dbOperations.addPaymentMethod(
      db,
      input.typeKey,
      input.typeLabel,
      input.methodName
    );
    return await this.getById(db, id);
  }

  /**
   * Update payment method
   */
  static async update(
    db: SQLite.SQLiteDatabase,
    id: number,
    input: PaymentMethodUpdateInput
  ): Promise<PaymentMethodItem | null> {
    if (input.methodName !== undefined) {
      await dbOperations.updatePaymentMethod(db, id, input.methodName);
    }
    if (input.isActive !== undefined) {
      await dbOperations.togglePaymentMethod(db, id, input.isActive);
    }
    return await this.getById(db, id);
  }

  /**
   * Toggle active state
   */
  static async toggleActive(db: SQLite.SQLiteDatabase, id: number, isActive: boolean): Promise<void> {
    await dbOperations.togglePaymentMethod(db, id, isActive);
  }

  /**
   * Delete payment method
   */
  static async delete(db: SQLite.SQLiteDatabase, id: number): Promise<void> {
    await dbOperations.deletePaymentMethod(db, id);
  }
}
