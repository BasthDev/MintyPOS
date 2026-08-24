import * as SQLite from 'expo-sqlite';
import { CategoryService, CategoryCreateInput, CategoryUpdateInput } from '../services/categoryService';
import { CategoryValidator } from '../validators/categoryValidator';

export interface ProcessResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

export class CategoryProcess {
  /**
   * Create category with validation
   */
  static async create(
    db: SQLite.SQLiteDatabase,
    input: CategoryCreateInput
  ): Promise<ProcessResult<any>> {
    // Validate input
    const validation = CategoryValidator.validateCreate(input);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    try {
      const category = await CategoryService.create(db, input);
      return {
        success: true,
        data: category,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create category',
      };
    }
  }

  /**
   * Update category with validation
   */
  static async update(
    db: SQLite.SQLiteDatabase,
    id: number,
    input: CategoryUpdateInput
  ): Promise<ProcessResult<any>> {
    // Validate ID
    const idValidation = CategoryValidator.validateId(id);
    if (!idValidation.isValid) {
      return {
        success: false,
        errors: idValidation.errors,
      };
    }

    // Validate input
    const validation = CategoryValidator.validateUpdate(input);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    try {
      const category = await CategoryService.update(db, id, input);
      if (!category) {
        return {
          success: false,
          error: 'Category not found',
        };
      }
      return {
        success: true,
        data: category,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update category',
      };
    }
  }

  /**
   * Delete category with validation
   */
  static async delete(
    db: SQLite.SQLiteDatabase,
    id: number
  ): Promise<ProcessResult<void>> {
    // Validate ID
    const idValidation = CategoryValidator.validateId(id);
    if (!idValidation.isValid) {
      return {
        success: false,
        errors: idValidation.errors,
      };
    }

    try {
      await CategoryService.delete(db, id);
      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete category',
      };
    }
  }

  /**
   * Get all categories
   */
  static async getAll(db: SQLite.SQLiteDatabase): Promise<ProcessResult<any[]>> {
    try {
      const categories = await CategoryService.getAll(db);
      return {
        success: true,
        data: categories,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch categories',
      };
    }
  }

  /**
   * Get category by ID
   */
  static async getById(db: SQLite.SQLiteDatabase, id: number): Promise<ProcessResult<any>> {
    const idValidation = CategoryValidator.validateId(id);
    if (!idValidation.isValid) {
      return {
        success: false,
        errors: idValidation.errors,
      };
    }

    try {
      const category = await CategoryService.getById(db, id);
      if (!category) {
        return {
          success: false,
          error: 'Category not found',
        };
      }
      return {
        success: true,
        data: category,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch category',
      };
    }
  }

  /**
   * Search categories
   */
  static async search(db: SQLite.SQLiteDatabase, query: string): Promise<ProcessResult<any[]>> {
    if (!query || query.trim().length === 0) {
      return {
        success: false,
        errors: ['Search query is required'],
      };
    }

    try {
      const categories = await CategoryService.search(db, query);
      return {
        success: true,
        data: categories,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search categories',
      };
    }
  }
}