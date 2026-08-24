import * as SQLite from 'expo-sqlite';
import { ProductCreateInput, ProductService, ProductUpdateInput } from '../services/productService';
import { ProductValidator } from '../validators/productValidator';

export interface ProcessResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

export class ProductProcess {
  /**
   * Create product with validation
   */
  static async create(
    db: SQLite.SQLiteDatabase,
    input: ProductCreateInput
  ): Promise<ProcessResult<any>> {
    // Validate input
    const validation = ProductValidator.validateCreate(input);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    try {
      const product = await ProductService.create(db, input);
      return {
        success: true,
        data: product,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create product',
      };
    }
  }

  /**
   * Update product with validation
   */
  static async update(
    db: SQLite.SQLiteDatabase,
    id: number,
    input: ProductUpdateInput
  ): Promise<ProcessResult<any>> {
    // Validate ID
    const idValidation = ProductValidator.validateId(id);
    if (!idValidation.isValid) {
      return {
        success: false,
        errors: idValidation.errors,
      };
    }

    // Validate input
    const validation = ProductValidator.validateUpdate(input);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    try {
      const product = await ProductService.update(db, id, input);
      if (!product) {
        return {
          success: false,
          error: 'Product not found',
        };
      }
      return {
        success: true,
        data: product,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update product',
      };
    }
  }

  /**
   * Delete product with validation and cleanup
   */
  static async delete(
    db: SQLite.SQLiteDatabase,
    id: number
  ): Promise<ProcessResult<void>> {
    // Validate ID
    const idValidation = ProductValidator.validateId(id);
    if (!idValidation.isValid) {
      return {
        success: false,
        errors: idValidation.errors,
      };
    }

    try {
      // Check if product exists
      const product = await ProductService.getById(db, id);
      if (!product) {
        return {
          success: false,
          error: 'Product not found',
        };
      }

      // Delete product (service handles recipe cleanup)
      await ProductService.delete(db, id);
      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete product',
      };
    }
  }

  /**
   * Get all products
   */
  static async getAll(db: SQLite.SQLiteDatabase): Promise<ProcessResult<any[]>> {
    try {
      const products = await ProductService.getAll(db);
      return {
        success: true,
        data: products,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch products',
      };
    }
  }

  /**
   * Get product by ID
   */
  static async getById(db: SQLite.SQLiteDatabase, id: number): Promise<ProcessResult<any>> {
    const idValidation = ProductValidator.validateId(id);
    if (!idValidation.isValid) {
      return {
        success: false,
        errors: idValidation.errors,
      };
    }

    try {
      const product = await ProductService.getById(db, id);
      if (!product) {
        return {
          success: false,
          error: 'Product not found',
        };
      }
      return {
        success: true,
        data: product,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch product',
      };
    }
  }

  /**
   * Search products
   */
  static async search(db: SQLite.SQLiteDatabase, query: string): Promise<ProcessResult<any[]>> {
    if (!query || query.trim().length === 0) {
      return {
        success: false,
        errors: ['Search query is required'],
      };
    }

    try {
      const products = await ProductService.search(db, query);
      return {
        success: true,
        data: products,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search products',
      };
    }
  }

  /**
   * Toggle recipe status for product
   */
  static async toggleRecipeStatus(
    db: SQLite.SQLiteDatabase,
    id: number
  ): Promise<ProcessResult<any>> {
    const idValidation = ProductValidator.validateId(id);
    if (!idValidation.isValid) {
      return {
        success: false,
        errors: idValidation.errors,
      };
    }

    try {
      const product = await ProductService.getById(db, id) as any;
      if (!product) {
        return {
          success: false,
          error: 'Product not found',
        };
      }

      // Toggle recipe definition ID
      const newRecipeId = product.recipe_definition_id ? undefined : undefined;
      await ProductService.update(db, id, { recipeDefinitionId: newRecipeId });
      
      const updatedProduct = await ProductService.getById(db, id);
      return {
        success: true,
        data: updatedProduct,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to toggle recipe status',
      };
    }
  }
}