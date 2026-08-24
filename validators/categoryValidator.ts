import { CategoryCreateInput, CategoryUpdateInput } from '../services/categoryService';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class CategoryValidator {
  /**
   * Validate category creation input
   */
  static validateCreate(input: CategoryCreateInput): ValidationResult {
    const errors: string[] = [];

    // Name validation
    if (!input.name || input.name.trim().length === 0) {
      errors.push('Category name is required');
    } else if (input.name.length < 2) {
      errors.push('Category name must be at least 2 characters');
    } else if (input.name.length > 50) {
      errors.push('Category name must not exceed 50 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate category update input
   */
  static validateUpdate(input: CategoryUpdateInput): ValidationResult {
    const errors: string[] = [];

    // Name validation
    if (input.name !== undefined) {
      if (input.name.trim().length === 0) {
        errors.push('Category name cannot be empty');
      } else if (input.name.length < 2) {
        errors.push('Category name must be at least 2 characters');
      } else if (input.name.length > 50) {
        errors.push('Category name must not exceed 50 characters');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate category ID
   */
  static validateId(id: number): ValidationResult {
    const errors: string[] = [];

    if (!id || typeof id !== 'number' || id <= 0) {
      errors.push('Invalid category ID');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}