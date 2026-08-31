import { CreateSemiProductInput, UpdateSemiProductInput } from '../services/semiProductService';

export class SemiProductValidator {
  static validateCreate(input: CreateSemiProductInput): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input.name || input.name.trim().length === 0) {
      errors.push('Semi-product name is required');
    } else if (input.name.trim().length < 2) {
      errors.push('Semi-product name must be at least 2 characters');
    }

    if (!input.baseUnitId || input.baseUnitId <= 0) {
      errors.push('Base unit is required');
    }

    if (input.yieldQuantity === undefined || input.yieldQuantity <= 0) {
      errors.push('Standard yield/batch output quantity must be greater than 0');
    }

    if (input.ingredients && input.ingredients.length > 0) {
      input.ingredients.forEach((ing, index) => {
        if (!ing.ingredientId || ing.ingredientId <= 0) {
          errors.push(`Ingredient #${index + 1}: Raw ingredient must be selected`);
        }
        if (!ing.quantityNeededBase || ing.quantityNeededBase <= 0) {
          errors.push(`Ingredient #${index + 1}: Quantity needed must be greater than 0`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static validateUpdate(input: UpdateSemiProductInput): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (input.name !== undefined) {
      if (!input.name || input.name.trim().length === 0) {
        errors.push('Semi-product name is required');
      } else if (input.name.trim().length < 2) {
        errors.push('Semi-product name must be at least 2 characters');
      }
    }

    if (input.baseUnitId !== undefined && input.baseUnitId <= 0) {
      errors.push('Base unit is required');
    }

    if (input.yieldQuantity !== undefined && input.yieldQuantity <= 0) {
      errors.push('Standard yield quantity must be greater than 0');
    }

    if (input.ingredients && input.ingredients.length > 0) {
      input.ingredients.forEach((ing, index) => {
        if (!ing.ingredientId || ing.ingredientId <= 0) {
          errors.push(`Ingredient #${index + 1}: Raw ingredient must be selected`);
        }
        if (!ing.quantityNeededBase || ing.quantityNeededBase <= 0) {
          errors.push(`Ingredient #${index + 1}: Quantity needed must be greater than 0`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static validateBatchExecution(
    producedQuantityBase: number
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!producedQuantityBase || producedQuantityBase <= 0) {
      errors.push('Production target quantity must be greater than 0');
    }
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
