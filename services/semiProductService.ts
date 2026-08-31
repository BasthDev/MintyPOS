import * as SQLite from 'expo-sqlite';
import { dbOperations, SemiProduct, SemiProductBatch, SemiProductRecipe } from '../lib/database';

export interface CreateSemiProductInput {
  name: string;
  code?: string | null;
  baseUnitId: number;
  yieldQuantity: number;
  minimumStock?: number;
  ingredients?: Array<{ ingredientId: number; quantityNeededBase: number }>;
}

export interface UpdateSemiProductInput {
  name?: string;
  code?: string | null;
  baseUnitId?: number;
  yieldQuantity?: number;
  minimumStock?: number;
  ingredients?: Array<{ ingredientId: number; quantityNeededBase: number }>;
}

export class SemiProductService {
  static async getAll(db: SQLite.SQLiteDatabase): Promise<SemiProduct[]> {
    return await dbOperations.getAllSemiProducts(db);
  }

  static async getById(db: SQLite.SQLiteDatabase, id: number): Promise<SemiProduct | null> {
    return await dbOperations.getSemiProductById(db, id);
  }

  static async create(db: SQLite.SQLiteDatabase, input: CreateSemiProductInput): Promise<SemiProduct | null> {
    const id = await dbOperations.createSemiProduct(db, {
      name: input.name,
      code: input.code,
      baseUnitId: input.baseUnitId,
      yieldQuantity: input.yieldQuantity,
      minimumStock: input.minimumStock,
    });

    if (input.ingredients && input.ingredients.length > 0) {
      await dbOperations.saveSemiProductRecipe(db, id, input.ingredients);
    }

    return await this.getById(db, id);
  }

  static async update(
    db: SQLite.SQLiteDatabase,
    id: number,
    input: UpdateSemiProductInput
  ): Promise<SemiProduct | null> {
    await dbOperations.updateSemiProduct(db, id, {
      name: input.name,
      code: input.code,
      baseUnitId: input.baseUnitId,
      yieldQuantity: input.yieldQuantity,
      minimumStock: input.minimumStock,
    });

    if (input.ingredients) {
      await dbOperations.saveSemiProductRecipe(db, id, input.ingredients);
    }

    return await this.getById(db, id);
  }

  static async delete(db: SQLite.SQLiteDatabase, id: number): Promise<void> {
    await dbOperations.deleteSemiProduct(db, id);
  }

  static async getFormula(db: SQLite.SQLiteDatabase, id: number): Promise<SemiProductRecipe[]> {
    return await dbOperations.getSemiProductRecipes(db, id);
  }

  static async saveFormula(
    db: SQLite.SQLiteDatabase,
    id: number,
    ingredients: Array<{ ingredientId: number; quantityNeededBase: number }>
  ): Promise<void> {
    await dbOperations.saveSemiProductRecipe(db, id, ingredients);
  }

  static async getBatches(db: SQLite.SQLiteDatabase, id: number): Promise<SemiProductBatch[]> {
    return await dbOperations.getSemiProductBatches(db, id);
  }

  static async executeBatch(
    db: SQLite.SQLiteDatabase,
    id: number,
    producedQuantityBase: number,
    notes?: string
  ): Promise<{ batchId: number; totalCost: number; costPerBaseUnit: number }> {
    return await dbOperations.executeSemiProductBatch(db, id, producedQuantityBase, notes);
  }
}
