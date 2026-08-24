import * as SQLite from 'expo-sqlite';
import { IngredientService, IngredientCreateInput, IngredientUpdateInput } from '../services/ingredientService';
import { IngredientValidator } from '../validators/ingredientValidator';

export interface ProcessResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

export class IngredientProcess {
  /**
   * Create ingredient with validation
   */
  static async create(
    db: SQLite.SQLiteDatabase,
    input: IngredientCreateInput
  ): Promise<ProcessResult<any>> {
    const validation = IngredientValidator.validateCreate(input);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    try {
      const ingredient = await IngredientService.create(db, input);
      return {
        success: true,
        data: ingredient,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create ingredient',
      };
    }
  }

  /**
   * Update ingredient with validation
   */
  static async update(
    db: SQLite.SQLiteDatabase,
    id: number,
    input: IngredientUpdateInput
  ): Promise<ProcessResult<any>> {
    const idValidation = IngredientValidator.validateId(id);
    if (!idValidation.isValid) {
      return {
        success: false,
        errors: idValidation.errors,
      };
    }

    const validation = IngredientValidator.validateUpdate(input);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    try {
      const ingredient = await IngredientService.update(db, id, input);
      if (!ingredient) {
        return {
          success: false,
          error: 'Ingredient not found',
        };
      }
      return {
        success: true,
        data: ingredient,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update ingredient',
      };
    }
  }

  /**
   * Delete ingredient with validation and cleanup
   */
  static async delete(
    db: SQLite.SQLiteDatabase,
    id: number
  ): Promise<ProcessResult<void>> {
    const idValidation = IngredientValidator.validateId(id);
    if (!idValidation.isValid) {
      return {
        success: false,
        errors: idValidation.errors,
      };
    }

    try {
      const ingredient = await IngredientService.getById(db, id);
      if (!ingredient) {
        return {
          success: false,
          error: 'Ingredient not found',
        };
      }

      await IngredientService.delete(db, id);
      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete ingredient',
      };
    }
  }

  /**
   * Get all ingredients
   */
  static async getAll(db: SQLite.SQLiteDatabase): Promise<ProcessResult<any[]>> {
    try {
      const ingredients = await IngredientService.getAll(db);
      return {
        success: true,
        data: ingredients,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch ingredients',
      };
    }
  }

  /**
   * Get ingredient by ID
   */
  static async getById(db: SQLite.SQLiteDatabase, id: number): Promise<ProcessResult<any>> {
    const idValidation = IngredientValidator.validateId(id);
    if (!idValidation.isValid) {
      return {
        success: false,
        errors: idValidation.errors,
      };
    }

    try {
      const ingredient = await IngredientService.getById(db, id);
      if (!ingredient) {
        return {
          success: false,
          error: 'Ingredient not found',
        };
      }
      return {
        success: true,
        data: ingredient,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch ingredient',
      };
    }
  }

  /**
   * Search ingredients
   */
  static async search(db: SQLite.SQLiteDatabase, query: string): Promise<ProcessResult<any[]>> {
    if (!query || query.trim().length === 0) {
      return {
        success: false,
        errors: ['Search query is required'],
      };
    }

    try {
      const ingredients = await IngredientService.search(db, query);
      return {
        success: true,
        data: ingredients,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search ingredients',
      };
    }
  }

  /**
   * Add conversion unit
   */
  static async addConversionUnit(
    db: SQLite.SQLiteDatabase,
    ingredientId: number,
    unitName: string,
    multiplierToBase: number
  ): Promise<ProcessResult<any>> {
    const idValidation = IngredientValidator.validateId(ingredientId);
    if (!idValidation.isValid) {
      return {
        success: false,
        errors: idValidation.errors,
      };
    }

    const unitValidation = IngredientValidator.validateConversionUnit(unitName, multiplierToBase);
    if (!unitValidation.isValid) {
      return {
        success: false,
        errors: unitValidation.errors,
      };
    }

    try {
      const unit = await IngredientService.addConversionUnit(db, ingredientId, unitName, multiplierToBase);
      return {
        success: true,
        data: unit,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add conversion unit',
      };
    }
  }

  /**
   * Get low stock ingredients
   */
  static async getLowStock(db: SQLite.SQLiteDatabase): Promise<ProcessResult<any[]>> {
    try {
      const ingredients = await IngredientService.getLowStockIngredients(db);
      return {
        success: true,
        data: ingredients,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch low stock ingredients',
      };
    }
  }
}