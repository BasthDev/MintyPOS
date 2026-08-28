import * as SQLite from 'expo-sqlite';
import { dbOperations, getCurrentStock, processRestockToSmallestUnit } from '../lib/database';

export interface InventoryBatchCreateInput {
  ingredientId: number;
  supplierId: number;
  quantityBought: number;
  boughtUnit: string;
  unitMultiplier: number;
  totalCostPaid: number;
  expirationDate?: string;
}

export interface InventoryBatchUpdateInput {
  remainingQuantityBase?: number;
  costPerBaseUnit?: number;
}

export class InventoryService {
  /**
   * Get all inventory batches
   */
  static async getAllBatches(db: SQLite.SQLiteDatabase) {
    return await db.getAllAsync(
      `SELECT ib.*, i.name as ingredient_name, s.name as supplier_name, u.symbol as unit_symbol, i.minimum_stock
       FROM inventory_batches ib
       JOIN ingredients i ON ib.ingredient_id = i.id
       JOIN suppliers s ON ib.supplier_id = s.id
       JOIN units u ON i.base_unit_id = u.id
       ORDER BY ib.received_date DESC`
    );
  }

  /**
   * Get batches by ingredient ID
   */
  static async getBatchesByIngredient(db: SQLite.SQLiteDatabase, ingredientId: number) {
    return await dbOperations.getIngredientBatches(db, ingredientId);
  }

  /**
   * Get current stock for ingredient
   */
  static async getCurrentStock(db: SQLite.SQLiteDatabase, ingredientId: number) {
    return await getCurrentStock(db, ingredientId);
  }

  /**
   * Create new inventory batch (restock)
   */
  static async createBatch(db: SQLite.SQLiteDatabase, input: InventoryBatchCreateInput) {
    // Process restock data using business logic
    const batchData = processRestockToSmallestUnit(input);

    const batchId = await dbOperations.createInventoryBatch(
      db,
      batchData.ingredient_id,
      batchData.supplier_id,
      batchData.initial_quantity_base,
      batchData.cost_per_base_unit,
      input.expirationDate
    );

    return await this.getBatchById(db, batchId);
  }

  /**
   * Get batch by ID
   */
  static async getBatchById(db: SQLite.SQLiteDatabase, id: number) {
    const batches = await db.getAllAsync(
      `SELECT ib.*, i.name as ingredient_name, s.name as supplier_name, u.symbol as unit_symbol
       FROM inventory_batches ib
       JOIN ingredients i ON ib.ingredient_id = i.id
       JOIN suppliers s ON ib.supplier_id = s.id
       JOIN units u ON i.base_unit_id = u.id
       WHERE ib.id = ?`,
      [id]
    );
    return batches[0] || null;
  }

  /**
   * Update inventory batch
   */
  static async updateBatch(db: SQLite.SQLiteDatabase, id: number, input: InventoryBatchUpdateInput) {
    const updates: string[] = [];
    const values: any[] = [];

    if (input.remainingQuantityBase !== undefined) {
      updates.push('remaining_quantity_base = ?');
      values.push(input.remainingQuantityBase);
    }
    if (input.costPerBaseUnit !== undefined) {
      updates.push('cost_per_base_unit = ?');
      values.push(input.costPerBaseUnit);
    }

    if (updates.length === 0) return await this.getBatchById(db, id);

    values.push(id);
    await db.runAsync(
      `UPDATE inventory_batches SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return await this.getBatchById(db, id);
  }

  /**
   * Delete inventory batch
   */
  static async deleteBatch(db: SQLite.SQLiteDatabase, id: number) {
    await db.runAsync('DELETE FROM inventory_batches WHERE id = ?', [id]);
  }

  /**
   * Get low stock items
   */
  static async getLowStockItems(db: SQLite.SQLiteDatabase) {
    return await db.getAllAsync(
      `SELECT i.*, u.name as unit_name, u.symbol as unit_symbol,
       COALESCE(SUM(ib.remaining_quantity_base), 0) as current_stock,
       i.minimum_stock,
       (COALESCE(SUM(ib.remaining_quantity_base), 0) - i.minimum_stock) as stock_diff
       FROM ingredients i 
       JOIN units u ON i.base_unit_id = u.id
       LEFT JOIN inventory_batches ib ON i.id = ib.ingredient_id AND ib.remaining_quantity_base > 0
       GROUP BY i.id
       HAVING current_stock < i.minimum_stock
       ORDER BY stock_diff ASC`
    );
  }

  /**
   * Get total inventory value
   */
  static async getTotalInventoryValue(db: SQLite.SQLiteDatabase) {
    const result = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(ib.remaining_quantity_base * ib.cost_per_base_unit), 0) as total
       FROM inventory_batches ib
       WHERE ib.remaining_quantity_base > 0`
    );
    return result?.total || 0;
  }

  /**
   * Get inventory value by ingredient
   */
  static async getIngredientInventoryValue(db: SQLite.SQLiteDatabase, ingredientId: number) {
    const result = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(remaining_quantity_base * cost_per_base_unit), 0) as total
       FROM inventory_batches
       WHERE ingredient_id = ? AND remaining_quantity_base > 0`,
      [ingredientId]
    );
    return result?.total || 0;
  }

  /**
   * Get recent restocks
   */
  static async getRecentRestocks(db: SQLite.SQLiteDatabase, limit: number = 10) {
    return await db.getAllAsync(
      `SELECT ib.*, i.name as ingredient_name, s.name as supplier_name
       FROM inventory_batches ib
       JOIN ingredients i ON ib.ingredient_id = i.id
       JOIN suppliers s ON ib.supplier_id = s.id
       ORDER BY ib.received_date DESC
       LIMIT ?`,
      [limit]
    );
  }
}