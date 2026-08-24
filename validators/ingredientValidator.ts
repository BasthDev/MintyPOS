import { IngredientCreateInput, IngredientUpdateInput } from '../services/ingredientService';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class IngredientValidator {
  /**
   * Validate ingredient creation input
   */
  static validateCreate(input: IngredientCreateInput): ValidationResult {
    const errors: string[] = [];

    // Name validation
    if (!input.name || input.name.trim().length === 0) {
      errors.push('Ingredient name is required');
    } else if (input.name.length < 2) {
      errors.push('Ingredient name must be at least 2 characters');
    } else if (input.name.length > 100) {
      errors.push('Ingredient name must not exceed 100 characters');
    }

    // Base unit ID validation
    if (!input.baseUnitId || typeof input.baseUnitId !== 'number' || input.baseUnitId <= 0) {
      errors.push('Valid base unit is required');
    }

    // Minimum stock validation
    if (input.minimumStock === undefined || input.minimumStock === null) {
      errors.push('Minimum stock is required');
    } else if (typeof input.minimumStock !== 'number' || input.minimumStock < 0) {
      errors.push('Minimum stock must be a positive number');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate ingredient update input
   */
  static validateUpdate(input: IngredientUpdateInput): ValidationResult {
    const errors: string[] = [];

    // Name validation
    if (input.name !== undefined) {
      if (input.name.trim().length === 0) {
        errors.push('Ingredient name cannot be empty');
      } else if (input.name.length < 2) {
        errors.push('Ingredient name must be at least 2 characters');
      } else if (input.name.length > 100) {
        errors.push('Ingredient name must not exceed 100 characters');
      }
    }

    // Base unit ID validation
    if (input.baseUnitId !== undefined) {
      if (typeof input.baseUnitId !== 'number' || input.baseUnitId <= 0) {
        errors.push('Valid base unit is required');
      }
    }

    // Minimum stock validation
    if (input.minimumStock !== undefined) {
      if (typeof input.minimumStock !== 'number' || input.minimumStock < 0) {
        errors.push('Minimum stock must be a positive number');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate ingredient ID
   */
  static validateId(id: number): ValidationResult {
    const errors: string[] = [];

    if (!id || typeof id !== 'number' || id <= 0) {
      errors.push('Invalid ingredient ID');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate conversion unit
   */
  static validateConversionUnit(unitName: string, multiplierToBase: number): ValidationResult {
    const errors: string[] = [];

    if (!unitName || unitName.trim().length === 0) {
      errors.push('Unit name is required');
    } else if (unitName.length > 20) {
      errors.push('Unit name must not exceed 20 characters');
    }

    if (multiplierToBase === undefined || multiplierToBase === null) {
      errors.push('Multiplier is required');
    } else if (typeof multiplierToBase !== 'number' || multiplierToBase <= 0) {
      errors.push('Multiplier must be a positive number');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}