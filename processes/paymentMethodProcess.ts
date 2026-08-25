import * as SQLite from 'expo-sqlite';
import { PaymentMethodItem } from '../lib/database';
import {
  PaymentMethodCreateInput,
  PaymentMethodService,
  PaymentMethodUpdateInput,
} from '../services/paymentMethodService';
import { PaymentMethodValidator } from '../validators/paymentMethodValidator';

export interface ProcessResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

export class PaymentMethodProcess {
  static async getAll(db: SQLite.SQLiteDatabase): Promise<ProcessResult<PaymentMethodItem[]>> {
    try {
      const items = await PaymentMethodService.getAll(db);
      return { success: true, data: items };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch payment methods',
      };
    }
  }

  static async create(
    db: SQLite.SQLiteDatabase,
    input: PaymentMethodCreateInput
  ): Promise<ProcessResult<PaymentMethodItem>> {
    const validation = PaymentMethodValidator.validateCreate(input);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    try {
      const item = await PaymentMethodService.create(db, input);
      if (!item) {
        return { success: false, error: 'Failed to create payment method' };
      }
      return { success: true, data: item };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment method',
      };
    }
  }

  static async update(
    db: SQLite.SQLiteDatabase,
    id: number,
    input: PaymentMethodUpdateInput
  ): Promise<ProcessResult<PaymentMethodItem>> {
    const idValidation = PaymentMethodValidator.validateId(id);
    if (!idValidation.isValid) {
      return { success: false, errors: idValidation.errors };
    }

    const validation = PaymentMethodValidator.validateUpdate(input);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    try {
      const item = await PaymentMethodService.update(db, id, input);
      if (!item) {
        return { success: false, error: 'Payment method not found' };
      }
      return { success: true, data: item };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update payment method',
      };
    }
  }

  static async toggleActive(
    db: SQLite.SQLiteDatabase,
    id: number,
    isActive: boolean
  ): Promise<ProcessResult<void>> {
    const idValidation = PaymentMethodValidator.validateId(id);
    if (!idValidation.isValid) {
      return { success: false, errors: idValidation.errors };
    }

    try {
      const existing = await PaymentMethodService.getById(db, id);
      if (!existing) {
        return { success: false, error: 'Payment method not found' };
      }
      if (existing.is_system === 1 && !isActive) {
        return { success: false, error: 'Cash payment method is default and cannot be disabled.' };
      }

      await PaymentMethodService.toggleActive(db, id, isActive);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to toggle payment method',
      };
    }
  }

  static async delete(db: SQLite.SQLiteDatabase, id: number): Promise<ProcessResult<void>> {
    const idValidation = PaymentMethodValidator.validateId(id);
    if (!idValidation.isValid) {
      return { success: false, errors: idValidation.errors };
    }

    try {
      const existing = await PaymentMethodService.getById(db, id);
      if (!existing) {
        return { success: false, error: 'Payment method not found' };
      }
      if (existing.is_system === 1) {
        return { success: false, error: 'Cash payment method cannot be deleted.' };
      }

      await PaymentMethodService.delete(db, id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete payment method',
      };
    }
  }
}
