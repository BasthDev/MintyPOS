import { TaxCreateInput, TaxUpdateInput } from '../services/taxService';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class TaxValidator {
  /**
   * Validate tax creation input
   */
  static validateCreate(input: TaxCreateInput): ValidationResult {
    const errors: string[] = [];

    if (!input.name || input.name.trim().length === 0) {
      errors.push('Tax/Service name is required (e.g. PB1, Service Charge)');
    } else if (input.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters');
    } else if (input.name.trim().length > 50) {
      errors.push('Name must not exceed 50 characters');
    }

    if (input.rate === undefined || input.rate === null || typeof input.rate !== 'number') {
      errors.push('Rate is required and must be a valid number');
    } else if (input.rate < 0) {
      errors.push('Rate cannot be negative');
    } else if (input.type === 'percentage' && input.rate > 100) {
      errors.push('Percentage rate cannot exceed 100%');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate tax update input
   */
  static validateUpdate(input: TaxUpdateInput): ValidationResult {
    const errors: string[] = [];

    if (input.name !== undefined) {
      if (!input.name || input.name.trim().length === 0) {
        errors.push('Tax/Service name cannot be empty');
      } else if (input.name.trim().length < 2) {
        errors.push('Name must be at least 2 characters');
      }
    }

    if (input.rate !== undefined) {
      if (typeof input.rate !== 'number' || input.rate < 0) {
        errors.push('Rate must be a positive number');
      } else if (input.type === 'percentage' && input.rate > 100) {
        errors.push('Percentage rate cannot exceed 100%');
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
      errors.push('Invalid tax configuration ID');
    }
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
