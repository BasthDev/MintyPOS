import { OrderSplitItem, dbOperations } from '@/lib/database';
import * as SQLite from 'expo-sqlite';

export class SplitPaymentService {
  static async createSplits(
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
    await dbOperations.createOrderSplits(db, parentOrderId, splits);
  }

  static async getSplitsByParentId(
    db: SQLite.SQLiteDatabase,
    parentOrderId: number
  ): Promise<OrderSplitItem[]> {
    return await dbOperations.getOrderSplits(db, parentOrderId);
  }
}
