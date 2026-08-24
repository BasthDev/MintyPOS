import { SupplierCreateInput, SupplierUpdateInput } from '../services/supplierService';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class SupplierValidator {
  /**
   * Validate supplier creation input
   */
  static validateCreate(input: SupplierCreateInput): ValidationResult {
    const errors: string[] = [];

    // Name validation
    if (!input.name || input.name.trim().length === 0) {
      errors.push('Supplier name is required');
    } else if (input.name.length < 2) {
      errors.push('Supplier name must be at least 2 characters');
    } else if (input.name.length > 100) {
      errors.push('Supplier name must not exceed 100 characters');
    }

    // Contact validation
    if (input.contact !== undefined && input.contact.length > 100) {
      errors.push('Contact must not exceed 100 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate supplier update input
   */
  static validateUpdate(input: SupplierUpdateInput): ValidationResult {
    const errors: string[] = [];

    // Name validation
    if (input.name !== undefined) {
      if (input.name.trim().length === 0) {
        errors.push('Supplier name cannot be empty');
      } else if (input.name.length < 2) {
        errors.push('Supplier name must be at least 2 characters');
      } else if (input.name.length > 100) {
        errors.push('Supplier name must not exceed 100 characters');
      }
    }

    // Contact validation
    if (input.contact !== undefined && input.contact.length > 100) {
      errors.push('Contact must not exceed 100 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate supplier ID
   */
  static validateId(id: number): ValidationResult {
    const errors: string[] = [];

    if (!id || typeof id !== 'number' || id <= 0) {
      errors.push('Invalid supplier ID');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}