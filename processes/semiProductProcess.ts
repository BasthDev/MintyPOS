import * as SQLite from 'expo-sqlite';
import {
  CreateSemiProductInput,
  SemiProductService,
  UpdateSemiProductInput
} from '../services/semiProductService';
import { SemiProductValidator } from '../validators/semiProductValidator';

export class SemiProductProcess {
  static async getAll(db: SQLite.SQLiteDatabase) {
    try {
      const data = await SemiProductService.getAll(db);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch semi-products' };
    }
  }

  static async getById(db: SQLite.SQLiteDatabase, id: number) {
    try {
      const data = await SemiProductService.getById(db, id);
      if (!data) {
        return { success: false, error: 'Semi-product not found' };
      }
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch semi-product' };
    }
  }

  static async create(db: SQLite.SQLiteDatabase, input: CreateSemiProductInput) {
    const validation = SemiProductValidator.validateCreate(input);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    try {
      const data = await SemiProductService.create(db, input);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create semi-product' };
    }
  }

  static async update(db: SQLite.SQLiteDatabase, id: number, input: UpdateSemiProductInput) {
    const validation = SemiProductValidator.validateUpdate(input);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    try {
      const data = await SemiProductService.update(db, id, input);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update semi-product' };
    }
  }

  static async delete(db: SQLite.SQLiteDatabase, id: number) {
    try {
      await SemiProductService.delete(db, id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to delete semi-product' };
    }
  }

  static async getFormula(db: SQLite.SQLiteDatabase, id: number) {
    try {
      const data = await SemiProductService.getFormula(db, id);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch formula' };
    }
  }

  static async saveFormula(
    db: SQLite.SQLiteDatabase,
    id: number,
    ingredients: Array<{ ingredientId: number; quantityNeededBase: number }>
  ) {
    try {
      await SemiProductService.saveFormula(db, id, ingredients);
      const data = await SemiProductService.getFormula(db, id);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to save formula' };
    }
  }

  static async getBatches(db: SQLite.SQLiteDatabase, id: number) {
    try {
      const data = await SemiProductService.getBatches(db, id);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch batches' };
    }
  }

  static async executeBatch(
    db: SQLite.SQLiteDatabase,
    id: number,
    producedQuantityBase: number,
    notes?: string
  ) {
    const validation = SemiProductValidator.validateBatchExecution(producedQuantityBase);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    try {
      const result = await SemiProductService.executeBatch(db, id, producedQuantityBase, notes);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to execute production batch' };
    }
  }
}
