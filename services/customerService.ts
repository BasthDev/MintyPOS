import { CustomerItem, CustomerLoyaltyTransactionItem, CustomerBalanceTransactionItem, dbOperations } from '@/lib/database';
import * as SQLite from 'expo-sqlite';

export class CustomerService {
  static async getAll(db: SQLite.SQLiteDatabase): Promise<CustomerItem[]> {
    return await dbOperations.getCustomers(db);
  }

  static async getById(db: SQLite.SQLiteDatabase, id: number): Promise<CustomerItem | null> {
    return await dbOperations.getCustomerById(db, id);
  }

  static async create(
    db: SQLite.SQLiteDatabase,
    data: { name: string; phone?: string; email?: string; notes?: string }
  ): Promise<number> {
    return await dbOperations.createCustomer(db, data);
  }

  static async update(
    db: SQLite.SQLiteDatabase,
    id: number,
    data: { name?: string; phone?: string; email?: string; notes?: string; tier?: 'regular' | 'bronze' | 'silver' | 'gold' }
  ): Promise<void> {
    await dbOperations.updateCustomer(db, id, data);
  }

  static async delete(db: SQLite.SQLiteDatabase, id: number): Promise<void> {
    await dbOperations.deleteCustomer(db, id);
  }

  static async updatePoints(
    db: SQLite.SQLiteDatabase,
    customerId: number,
    pointsDelta: number,
    type: 'earn' | 'redeem' | 'adjust',
    orderId?: number,
    notes?: string
  ): Promise<void> {
    await dbOperations.updateCustomerPoints(db, customerId, pointsDelta, type, orderId, notes);
  }

  static async depositCredit(
    db: SQLite.SQLiteDatabase,
    customerId: number,
    amount: number,
    notes?: string
  ): Promise<void> {
    await dbOperations.depositStoreCredit(db, customerId, amount, notes);
  }

  static async spendCredit(
    db: SQLite.SQLiteDatabase,
    customerId: number,
    amount: number,
    orderId?: number,
    notes?: string
  ): Promise<void> {
    await dbOperations.spendStoreCredit(db, customerId, amount, orderId, notes);
  }

  static async getLoyaltyLogs(db: SQLite.SQLiteDatabase, customerId: number): Promise<CustomerLoyaltyTransactionItem[]> {
    return await dbOperations.getCustomerLoyaltyLogs(db, customerId);
  }

  static async getBalanceLogs(db: SQLite.SQLiteDatabase, customerId: number): Promise<CustomerBalanceTransactionItem[]> {
    return await dbOperations.getCustomerBalanceLogs(db, customerId);
  }
}
