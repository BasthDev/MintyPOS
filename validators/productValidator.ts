import { ProductCreateInput, ProductUpdateInput } from '../services/productService';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class ProductValidator {
  /**
   * Validate product creation input
   */
  static validateCreate(input: ProductCreateInput): ValidationResult {
    const errors: string[] = [];

    // Name validation
    if (!input.name || input.name.trim().length === 0) {
      errors.push('Product name is required');
    } else if (input.name.length < 2) {
      errors.push('Product name must be at least 2 characters');
    } else if (input.name.length > 100) {
      errors.push('Product name must not exceed 100 characters');
    }

    // SKU validation
    if (input.sku !== undefined && input.sku !== null) {
      if (input.sku.trim().length === 0) {
        errors.push('SKU cannot be empty');
      } else if (input.sku.length > 50) {
        errors.push('SKU must not exceed 50 characters');
      }
    }

    // Price validation
    if (input.sellingPrice === undefined || input.sellingPrice === null) {
      errors.push('Selling price is required');
    } else if (typeof input.sellingPrice !== 'number' || input.sellingPrice < 0) {
      errors.push('Selling price must be a positive number');
    } else if (input.sellingPrice > 1000000000) {
      errors.push('Selling price is too high');
    }

    // Buy price validation
    if (input.buyPrice !== undefined && input.buyPrice !== null) {
      if (typeof input.buyPrice !== 'number' || input.buyPrice < 0) {
        errors.push('Buy price must be a positive number');
      } else if (input.buyPrice > 1000000000) {
        errors.push('Buy price is too high');
      }
    }

    // Stock deduction method validation
    if (input.stockDeductionMethod !== undefined) {
      if (!['none', 'product', 'recipe'].includes(input.stockDeductionMethod)) {
        errors.push('Stock deduction method must be either "none", "product", or "recipe"');
      }
    }

    // Recipe definition ID validation (required when using recipe method)
    if (input.stockDeductionMethod === 'recipe') {
      if (!input.recipeDefinitionId || input.recipeDefinitionId <= 0) {
        errors.push('Recipe is required when using ingredient stock deduction');
      }
    }

    // Current stock validation (required when using product method)
    if (input.stockDeductionMethod === 'product') {
      if (input.currentStock === undefined || input.currentStock === null) {
        errors.push('Current stock is required when using product stock deduction');
      } else if (typeof input.currentStock !== 'number' || input.currentStock < 0) {
        errors.push('Current stock must be a positive number');
      }
    } else if (input.currentStock !== undefined && input.currentStock !== null) {
      // Optional validation for other methods
      if (typeof input.currentStock !== 'number' || input.currentStock < 0) {
        errors.push('Current stock must be a positive number');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate product update input
   */
  static validateUpdate(input: ProductUpdateInput): ValidationResult {
    const errors: string[] = [];

    // Name validation
    if (input.name !== undefined) {
      if (input.name.trim().length === 0) {
        errors.push('Product name cannot be empty');
      } else if (input.name.length < 2) {
        errors.push('Product name must be at least 2 characters');
      } else if (input.name.length > 100) {
        errors.push('Product name must not exceed 100 characters');
      }
    }

    // SKU validation
    if (input.sku !== undefined) {
      if (input.sku.trim().length === 0) {
        errors.push('SKU cannot be empty');
      } else if (input.sku.length > 50) {
        errors.push('SKU must not exceed 50 characters');
      }
    }

    // Price validation
    if (input.sellingPrice !== undefined) {
      if (typeof input.sellingPrice !== 'number' || input.sellingPrice < 0) {
        errors.push('Selling price must be a positive number');
      } else if (input.sellingPrice > 1000000000) {
        errors.push('Selling price is too high');
      }
    }

    // Buy price validation
    if (input.buyPrice !== undefined) {
      if (typeof input.buyPrice !== 'number' || input.buyPrice < 0) {
        errors.push('Buy price must be a positive number');
      } else if (input.buyPrice > 1000000000) {
        errors.push('Buy price is too high');
      }
    }

    // Stock deduction method validation
    if (input.stockDeductionMethod !== undefined) {
      if (!['none', 'product', 'recipe'].includes(input.stockDeductionMethod)) {
        errors.push('Stock deduction method must be either "none", "product", or "recipe"');
      }
    }

    // Recipe definition ID validation (required when using recipe method)
    if (input.stockDeductionMethod === 'recipe') {
      if (!input.recipeDefinitionId || input.recipeDefinitionId <= 0) {
        errors.push('Recipe is required when using ingredient stock deduction');
      }
    }

    // Current stock validation (required when using product method)
    if (input.stockDeductionMethod === 'product') {
      if (input.currentStock === undefined || input.currentStock === null) {
        errors.push('Current stock is required when using product stock deduction');
      } else if (typeof input.currentStock !== 'number' || input.currentStock < 0) {
        errors.push('Current stock must be a positive number');
      }
    } else if (input.currentStock !== undefined) {
      // Optional validation for other methods
      if (typeof input.currentStock !== 'number' || input.currentStock < 0) {
        errors.push('Current stock must be a positive number');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate product ID
   */
  static validateId(id: number): ValidationResult {
    const errors: string[] = [];

    if (!id || typeof id !== 'number' || id <= 0) {
      errors.push('Invalid product ID');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}