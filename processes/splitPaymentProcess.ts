import { OrderSplitItem } from '@/lib/database';
import { SplitPaymentService } from '@/services/splitPaymentService';
import { SplitPaymentInput, SplitPaymentValidator } from '@/validators/splitPaymentValidator';
import * as SQLite from 'expo-sqlite';

export class SplitPaymentProcess {
  static validate(input: SplitPaymentInput) {
    return SplitPaymentValidator.validate(input);
  }

  static async saveSplits(
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
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await SplitPaymentService.createSplits(db, parentOrderId, splits);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to save split payments' };
    }
  }

  static async getSplits(
    db: SQLite.SQLiteDatabase,
    parentOrderId: number
  ): Promise<{ success: boolean; data?: OrderSplitItem[]; error?: string }> {
    try {
      const data = await SplitPaymentService.getSplitsByParentId(db, parentOrderId);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch split payments' };
    }
  }
}
