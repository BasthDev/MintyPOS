import { CustomerBalanceTransactionItem, CustomerItem, CustomerLoyaltyTransactionItem } from '@/lib/database';
import { CustomerService } from '@/services/customerService';
import { CustomerInput, CustomerValidator } from '@/validators/customerValidator';
import * as SQLite from 'expo-sqlite';

export class CustomerProcess {
  static async getAll(db: SQLite.SQLiteDatabase): Promise<{ success: boolean; data?: CustomerItem[]; error?: string }> {
    try {
      const data = await CustomerService.getAll(db);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch customers' };
    }
  }

  static async getById(db: SQLite.SQLiteDatabase, id: number): Promise<{ success: boolean; data?: CustomerItem; error?: string }> {
    try {
      const data = await CustomerService.getById(db, id);
      if (!data) return { success: false, error: 'Customer not found' };
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch customer' };
    }
  }

  static async create(
    db: SQLite.SQLiteDatabase,
    input: CustomerInput
  ): Promise<{ success: boolean; id?: number; error?: string; errors?: string[] }> {
    const validation = CustomerValidator.validate(input);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors, error: validation.errors[0] };
    }

    try {
      const id = await CustomerService.create(db, input);
      return { success: true, id };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to create customer' };
    }
  }

  static async update(
    db: SQLite.SQLiteDatabase,
    id: number,
    input: CustomerInput & { tier?: 'regular' | 'bronze' | 'silver' | 'gold' }
  ): Promise<{ success: boolean; error?: string; errors?: string[] }> {
    const validation = CustomerValidator.validate(input);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors, error: validation.errors[0] };
    }

    try {
      await CustomerService.update(db, id, input);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update customer' };
    }
  }

  static async delete(db: SQLite.SQLiteDatabase, id: number): Promise<{ success: boolean; error?: string }> {
    try {
      await CustomerService.delete(db, id);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete customer' };
    }
  }

  static async depositCredit(
    db: SQLite.SQLiteDatabase,
    customerId: number,
    amount: number,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (amount <= 0) return { success: false, error: 'Deposit amount must be greater than 0' };
    try {
      await CustomerService.depositCredit(db, customerId, amount, notes);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to deposit store credit' };
    }
  }

  static async spendCredit(
    db: SQLite.SQLiteDatabase,
    customerId: number,
    amount: number,
    orderId?: number,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (amount <= 0) return { success: false, error: 'Spend amount must be greater than 0' };
    try {
      await CustomerService.spendCredit(db, customerId, amount, orderId, notes);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to spend store credit' };
    }
  }

  static async earnPoints(
    db: SQLite.SQLiteDatabase,
    customerId: number,
    points: number,
    orderId?: number,
    orderNumber?: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (points <= 0) return { success: false, error: 'Points must be greater than 0' };
    try {
      await CustomerService.updatePoints(db, customerId, points, 'earn', orderId, notes);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to earn points' };
    }
  }

  static async redeemPoints(
    db: SQLite.SQLiteDatabase,
    customerId: number,
    points: number,
    orderId?: number,
    orderNumber?: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (points <= 0) return { success: false, error: 'Points must be greater than 0' };
    try {
      await CustomerService.updatePoints(db, customerId, -points, 'redeem', orderId, notes);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to redeem points' };
    }
  }

  static async updateTotalSpent(
    db: SQLite.SQLiteDatabase,
    customerId: number,
    amount: number
  ): Promise<{ success: boolean; error?: string }> {
    if (amount < 0) return { success: false, error: 'Amount must be non-negative' };
    try {
      await db.runAsync(
        'UPDATE customers SET total_spent = total_spent + ?, updated_at = datetime("now") WHERE id = ?',
        [amount, customerId]
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update total spent' };
    }
  }

  static async updateTier(
    db: SQLite.SQLiteDatabase,
    customerId: number,
    tier: 'regular' | 'bronze' | 'silver' | 'gold'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await db.runAsync(
        'UPDATE customers SET tier = ?, updated_at = datetime("now") WHERE id = ?',
        [tier, customerId]
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update customer tier' };
    }
  }

  static async getLogs(
    db: SQLite.SQLiteDatabase,
    customerId: number
  ): Promise<{
    success: boolean;
    loyaltyLogs?: CustomerLoyaltyTransactionItem[];
    balanceLogs?: CustomerBalanceTransactionItem[];
    error?: string;
  }> {
    try {
      const [loyaltyLogs, balanceLogs] = await Promise.all([
        CustomerService.getLoyaltyLogs(db, customerId),
        CustomerService.getBalanceLogs(db, customerId),
      ]);
      return { success: true, loyaltyLogs, balanceLogs };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch customer logs' };
    }
  }
}
