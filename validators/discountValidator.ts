import { DiscountCreateInput, DiscountUpdateInput } from '../services/discountService';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class DiscountValidator {
  /**
   * Validate discount creation input
   */
  static validateCreate(input: DiscountCreateInput): ValidationResult {
    const errors: string[] = [];

    if (!input.name || input.name.trim().length === 0) {
      errors.push('Discount name is required');
    } else if (input.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters');
    } else if (input.name.trim().length > 50) {
      errors.push('Name must not exceed 50 characters');
    }

    if (input.value === undefined || input.value === null || typeof input.value !== 'number') {
      errors.push('Discount value is required');
    } else if (input.value <= 0) {
      errors.push('Discount value must be greater than 0');
    } else if (input.type === 'percentage' && input.value > 100) {
      errors.push('Percentage discount cannot exceed 100%');
    }

    if (input.minOrderAmount !== undefined && input.minOrderAmount < 0) {
      errors.push('Minimum order amount cannot be negative');
    }

    if (
      input.maxDiscountAmount !== undefined &&
      input.maxDiscountAmount !== null &&
      input.maxDiscountAmount < 0
    ) {
      errors.push('Max discount amount cannot be negative');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate discount update input
   */
  static validateUpdate(input: DiscountUpdateInput): ValidationResult {
    const errors: string[] = [];

    if (input.name !== undefined) {
      if (!input.name || input.name.trim().length === 0) {
        errors.push('Discount name cannot be empty');
      } else if (input.name.trim().length < 2) {
        errors.push('Name must be at least 2 characters');
      }
    }

    if (input.value !== undefined) {
      if (typeof input.value !== 'number' || input.value <= 0) {
        errors.push('Discount value must be greater than 0');
      } else if (input.type === 'percentage' && input.value > 100) {
        errors.push('Percentage discount cannot exceed 100%');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate ID
   */
  static validateId(id: number): ValidationResult {
    const errors: string[] = [];
    if (!id || typeof id !== 'number' || id <= 0) {
      errors.push('Invalid discount ID');
    }
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
