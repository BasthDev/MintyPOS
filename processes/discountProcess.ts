import * as SQLite from 'expo-sqlite';
import { DiscountItem } from '../lib/database';
import { DiscountCreateInput, DiscountService, DiscountUpdateInput } from '../services/discountService';
import { DiscountValidator } from '../validators/discountValidator';

export interface ProcessResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

export class DiscountProcess {
  static async getAll(db: SQLite.SQLiteDatabase): Promise<ProcessResult<DiscountItem[]>> {
    try {
      const items = await DiscountService.getAll(db);
      return { success: true, data: items };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch discounts',
      };
    }
  }

  static async create(
    db: SQLite.SQLiteDatabase,
    input: DiscountCreateInput
  ): Promise<ProcessResult<DiscountItem>> {
    const validation = DiscountValidator.validateCreate(input);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    try {
      const item = await DiscountService.create(db, input);
      if (!item) {
        return { success: false, error: 'Failed to create discount preset' };
      }
      return { success: true, data: item };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create discount preset',
      };
    }
  }

  static async update(
    db: SQLite.SQLiteDatabase,
    id: number,
    input: DiscountUpdateInput
  ): Promise<ProcessResult<DiscountItem>> {
    const idValidation = DiscountValidator.validateId(id);
    if (!idValidation.isValid) {
      return { success: false, errors: idValidation.errors };
    }

    const validation = DiscountValidator.validateUpdate(input);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    try {
      const item = await DiscountService.update(db, id, input);
      if (!item) {
        return { success: false, error: 'Discount preset not found' };
      }
      return { success: true, data: item };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update discount preset',
      };
    }
  }

  static async toggleActive(
    db: SQLite.SQLiteDatabase,
    id: number,
    isActive: boolean
  ): Promise<ProcessResult<void>> {
    const idValidation = DiscountValidator.validateId(id);
    if (!idValidation.isValid) {
      return { success: false, errors: idValidation.errors };
    }

    try {
      await DiscountService.toggleActive(db, id, isActive);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to toggle discount preset',
      };
    }
  }

  static async delete(db: SQLite.SQLiteDatabase, id: number): Promise<ProcessResult<void>> {
    const idValidation = DiscountValidator.validateId(id);
    if (!idValidation.isValid) {
      return { success: false, errors: idValidation.errors };
    }

    try {
      await DiscountService.delete(db, id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete discount preset',
      };
    }
  }
}
