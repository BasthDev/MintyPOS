import * as SQLite from 'expo-sqlite';
import { InventoryService, InventoryBatchCreateInput, InventoryBatchUpdateInput } from '../services/inventoryService';
import { InventoryValidator } from '../validators/inventoryValidator';
import { deductStockFIFO, handleCheckoutOrder } from '../lib/database';

export interface ProcessResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

export class InventoryProcess {
  /**
   * Create inventory batch (restock) with validation
   */
  static async createBatch(
    db: SQLite.SQLiteDatabase,
    input: InventoryBatchCreateInput
  ): Promise<ProcessResult<any>> {
    const validation = InventoryValidator.validateCreate(input);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    try {
      const batch = await InventoryService.createBatch(db, input);
      return {
        success: true,
        data: batch,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create inventory batch',
      };
    }
  }

  /**
   * Update inventory batch with validation
   */
  static async updateBatch(
    db: SQLite.SQLiteDatabase,
    id: number,
    input: InventoryBatchUpdateInput
  ): Promise<ProcessResult<any>> {
    const idValidation = InventoryValidator.validateId(id);
    if (!idValidation.isValid) {
      return {
        success: false,
        errors: idValidation.errors,
      };
    }

    const validation = InventoryValidator.validateUpdate(input);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    try {
      const batch = await InventoryService.updateBatch(db, id, input);
      if (!batch) {
        return {
          success: false,
          error: 'Inventory batch not found',
        };
      }
      return {
        success: true,
        data: batch,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update inventory batch',
      };
    }
  }

  /**
   * Delete inventory batch with validation
   */
  static async deleteBatch(
    db: SQLite.SQLiteDatabase,
    id: number
  ): Promise<ProcessResult<void>> {
    const idValidation = InventoryValidator.validateId(id);
    if (!idValidation.isValid) {
      return {
        success: false,
        errors: idValidation.errors,
      };
    }

    try {
      const batch = await InventoryService.getBatchById(db, id);
      if (!batch) {
        return {
          success: false,
          error: 'Inventory batch not found',
        };
      }

      await InventoryService.deleteBatch(db, id);
      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete inventory batch',
      };
    }
  }

  /**
   * Get all inventory batches
   */
  static async getAllBatches(db: SQLite.SQLiteDatabase): Promise<ProcessResult<any[]>> {
    try {
      const batches = await InventoryService.getAllBatches(db);
      return {
        success: true,
        data: batches,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch inventory batches',
      };
    }
  }

  /**
   * Get batches by ingredient ID
   */
  static async getBatchesByIngredient(db: SQLite.SQLiteDatabase, ingredientId: number): Promise<ProcessResult<any[]>> {
    const idValidation = InventoryValidator.validateId(ingredientId);
    if (!idValidation.isValid) {
      return {
        success: false,
        errors: idValidation.errors,
      };
    }

    try {
      const batches = await InventoryService.getBatchesByIngredient(db, ingredientId);
      return {
        success: true,
        data: batches,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch inventory batches',
      };
    }
  }

  /**
   * Get current stock for ingredient
   */
  static async getCurrentStock(db: SQLite.SQLiteDatabase, ingredientId: number): Promise<ProcessResult<number>> {
    const idValidation = InventoryValidator.validateId(ingredientId);
    if (!idValidation.isValid) {
      return {
        success: false,
        errors: idValidation.errors,
      };
    }

    try {
      const stock = await InventoryService.getCurrentStock(db, ingredientId);
      return {
        success: true,
        data: stock,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch current stock',
      };
    }
  }

  /**
   * Get low stock items
   */
  static async getLowStockItems(db: SQLite.SQLiteDatabase): Promise<ProcessResult<any[]>> {
    try {
      const items = await InventoryService.getLowStockItems(db);
      return {
        success: true,
        data: items,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch low stock items',
      };
    }
  }

  /**
   * Get total inventory value
   */
  static async getTotalInventoryValue(db: SQLite.SQLiteDatabase): Promise<ProcessResult<number>> {
    try {
      const value = await InventoryService.getTotalInventoryValue(db);
      return {
        success: true,
        data: value,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate inventory value',
      };
    }
  }

  /**
   * Process checkout with stock deduction
   */
  static async processCheckout(
    db: SQLite.SQLiteDatabase,
    cartItems: { productId: number; quantitySold: number }[]
  ): Promise<ProcessResult<void>> {
    if (!cartItems || cartItems.length === 0) {
      return {
        success: false,
        errors: ['Cart is empty'],
      };
    }

    try {
      await handleCheckoutOrder(db, cartItems);
      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process checkout',
      };
    }
  }

  /**
   * Get recent restocks
   */
  static async getRecentRestocks(db: SQLite.SQLiteDatabase, limit: number = 10): Promise<ProcessResult<any[]>> {
    try {
      const restocks = await InventoryService.getRecentRestocks(db, limit);
      return {
        success: true,
        data: restocks,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch recent restocks',
      };
    }
  }
}