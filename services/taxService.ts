import * as SQLite from 'expo-sqlite';
import { dbOperations, TaxConfigItem } from '../lib/database';

export interface TaxCreateInput {
  name: string;
  rate: number;
  type?: 'percentage' | 'flat';
}

export interface TaxUpdateInput {
  name?: string;
  rate?: number;
  type?: 'percentage' | 'flat';
  isActive?: boolean;
}

export class TaxService {
  /**
   * Get all tax configs
   */
  static async getAll(db: SQLite.SQLiteDatabase): Promise<TaxConfigItem[]> {
    return await dbOperations.getAllTaxConfigs(db);
  }

  /**
   * Get active tax configs
   */
  static async getActive(db: SQLite.SQLiteDatabase): Promise<TaxConfigItem[]> {
    return await dbOperations.getActiveTaxConfigs(db);
  }

  /**
   * Get tax config by ID
   */
  static async getById(db: SQLite.SQLiteDatabase, id: number): Promise<TaxConfigItem | null> {
    const items = await db.getAllAsync<TaxConfigItem>(
      'SELECT * FROM tax_configs WHERE id = ?',
      [id]
    );
    return items[0] || null;
  }

  /**
   * Create tax config
   */
  static async create(db: SQLite.SQLiteDatabase, input: TaxCreateInput): Promise<TaxConfigItem | null> {
    const id = await dbOperations.createTaxConfig(db, input.name, input.rate, input.type || 'percentage');
    return await this.getById(db, id);
  }

  /**
   * Update tax config
   */
  static async update(db: SQLite.SQLiteDatabase, id: number, input: TaxUpdateInput): Promise<TaxConfigItem | null> {
    if (input.name !== undefined && input.rate !== undefined) {
      await dbOperations.updateTaxConfig(db, id, input.name, input.rate, input.type || 'percentage');
    }
    if (input.isActive !== undefined) {
      await dbOperations.toggleTaxConfig(db, id, input.isActive);
    }
    return await this.getById(db, id);
  }

  /**
   * Toggle active state
   */
  static async toggleActive(db: SQLite.SQLiteDatabase, id: number, isActive: boolean): Promise<void> {
    await dbOperations.toggleTaxConfig(db, id, isActive);
  }

  /**
   * Delete tax config
   */
  static async delete(db: SQLite.SQLiteDatabase, id: number): Promise<void> {
    await dbOperations.deleteTaxConfig(db, id);
  }
}
