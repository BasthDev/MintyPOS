import * as SQLite from 'expo-sqlite';
import { SupplierService, SupplierCreateInput, SupplierUpdateInput } from '../services/supplierService';
import { SupplierValidator } from '../validators/supplierValidator';

export interface ProcessResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

export class SupplierProcess {
  /**
   * Create supplier with validation
   */
  static async create(
    db: SQLite.SQLiteDatabase,
    input: SupplierCreateInput
  ): Promise<ProcessResult<any>> {
    const validation = SupplierValidator.validateCreate(input);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    try {
      const supplier = await SupplierService.create(db, input);
      return {
        success: true,
        data: supplier,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create supplier',
      };
    }
  }

  /**
   * Update supplier with validation
   */
  static async update(
    db: SQLite.SQLiteDatabase,
    id: number,
    input: SupplierUpdateInput
  ): Promise<ProcessResult<any>> {
    const idValidation = SupplierValidator.validateId(id);
    if (!idValidation.isValid) {
      return {
        success: false,
        errors: idValidation.errors,
      };
    }

    const validation = SupplierValidator.validateUpdate(input);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    try {
      const supplier = await SupplierService.update(db, id, input);
      if (!supplier) {
        return {
          success: false,
          error: 'Supplier not found',
        };
      }
      return {
        success: true,
        data: supplier,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update supplier',
      };
    }
  }

  /**
   * Delete supplier with validation
   */
  static async delete(
    db: SQLite.SQLiteDatabase,
    id: number
  ): Promise<ProcessResult<void>> {
    const idValidation = SupplierValidator.validateId(id);
    if (!idValidation.isValid) {
      return {
        success: false,
        errors: idValidation.errors,
      };
    }

    try {
      await SupplierService.delete(db, id);
      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete supplier',
      };
    }
  }

  /**
   * Get all suppliers
   */
  static async getAll(db: SQLite.SQLiteDatabase): Promise<ProcessResult<any[]>> {
    try {
      const suppliers = await SupplierService.getAll(db);
      return {
        success: true,
        data: suppliers,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch suppliers',
      };
    }
  }

  /**
   * Get supplier by ID
   */
  static async getById(db: SQLite.SQLiteDatabase, id: number): Promise<ProcessResult<any>> {
    const idValidation = SupplierValidator.validateId(id);
    if (!idValidation.isValid) {
      return {
        success: false,
        errors: idValidation.errors,
      };
    }

    try {
      const supplier = await SupplierService.getById(db, id);
      if (!supplier) {
        return {
          success: false,
          error: 'Supplier not found',
        };
      }
      return {
        success: true,
        data: supplier,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch supplier',
      };
    }
  }

  /**
   * Get supplier statistics
   */
  static async getStats(db: SQLite.SQLiteDatabase, id: number): Promise<ProcessResult<any>> {
    const idValidation = SupplierValidator.validateId(id);
    if (!idValidation.isValid) {
      return {
        success: false,
        errors: idValidation.errors,
      };
    }

    try {
      const stats = await SupplierService.getStats(db, id);
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch supplier statistics',
      };
    }
  }

  /**
   * Search suppliers
   */
  static async search(db: SQLite.SQLiteDatabase, query: string): Promise<ProcessResult<any[]>> {
    if (!query || query.trim().length === 0) {
      return {
        success: false,
        errors: ['Search query is required'],
      };
    }

    try {
      const suppliers = await SupplierService.search(db, query);
      return {
        success: true,
        data: suppliers,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search suppliers',
      };
    }
  }
}