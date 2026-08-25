import * as SQLite from 'expo-sqlite';
import { TaxConfigItem } from '../lib/database';
import { TaxCreateInput, TaxService, TaxUpdateInput } from '../services/taxService';
import { TaxValidator } from '../validators/taxValidator';

export interface ProcessResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

export class TaxProcess {
  static async getAll(db: SQLite.SQLiteDatabase): Promise<ProcessResult<TaxConfigItem[]>> {
    try {
      const items = await TaxService.getAll(db);
      return { success: true, data: items };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch tax configs',
      };
    }
  }

  static async create(
    db: SQLite.SQLiteDatabase,
    input: TaxCreateInput
  ): Promise<ProcessResult<TaxConfigItem>> {
    const validation = TaxValidator.validateCreate(input);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    try {
      const item = await TaxService.create(db, input);
      if (!item) {
        return { success: false, error: 'Failed to create tax config' };
      }
      return { success: true, data: item };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create tax config',
      };
    }
  }

  static async update(
    db: SQLite.SQLiteDatabase,
    id: number,
    input: TaxUpdateInput
  ): Promise<ProcessResult<TaxConfigItem>> {
    const idValidation = TaxValidator.validateId(id);
    if (!idValidation.isValid) {
      return { success: false, errors: idValidation.errors };
    }

    const validation = TaxValidator.validateUpdate(input);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    try {
      const item = await TaxService.update(db, id, input);
      if (!item) {
        return { success: false, error: 'Tax configuration not found' };
      }
      return { success: true, data: item };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update tax config',
      };
    }
  }

  static async toggleActive(
    db: SQLite.SQLiteDatabase,
    id: number,
    isActive: boolean
  ): Promise<ProcessResult<void>> {
    const idValidation = TaxValidator.validateId(id);
    if (!idValidation.isValid) {
      return { success: false, errors: idValidation.errors };
    }

    try {
      await TaxService.toggleActive(db, id, isActive);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to toggle tax config',
      };
    }
  }

  static async delete(db: SQLite.SQLiteDatabase, id: number): Promise<ProcessResult<void>> {
    const idValidation = TaxValidator.validateId(id);
    if (!idValidation.isValid) {
      return { success: false, errors: idValidation.errors };
    }

    try {
      await TaxService.delete(db, id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete tax config',
      };
    }
  }
}
