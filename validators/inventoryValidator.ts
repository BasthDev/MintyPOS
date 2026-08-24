import { InventoryBatchCreateInput, InventoryBatchUpdateInput } from '../services/inventoryService';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class InventoryValidator {
  /**
   * Validate inventory batch creation input
   */
  static validateCreate(input: InventoryBatchCreateInput): ValidationResult {
    const errors: string[] = [];

    // Ingredient ID validation
    if (!input.ingredientId || typeof input.ingredientId !== 'number' || input.ingredientId <= 0) {
      errors.push('Valid ingredient ID is required');
    }

    // Supplier ID validation
    if (!input.supplierId || typeof input.supplierId !== 'number' || input.supplierId <= 0) {
      errors.push('Valid supplier ID is required');
    }

    // Quantity validation
    if (input.quantityBought === undefined || input.quantityBought === null) {
      errors.push('Quantity is required');
    } else if (typeof input.quantityBought !== 'number' || input.quantityBought <= 0) {
      errors.push('Quantity must be a positive number');
    }

    // Unit validation
    if (!input.boughtUnit || input.boughtUnit.trim().length === 0) {
      errors.push('Unit name is required');
    } else if (input.boughtUnit.length > 20) {
      errors.push('Unit name must not exceed 20 characters');
    }

    // Multiplier validation
    if (input.unitMultiplier === undefined || input.unitMultiplier === null) {
      errors.push('Unit multiplier is required');
    } else if (typeof input.unitMultiplier !== 'number' || input.unitMultiplier <= 0) {
      errors.push('Unit multiplier must be a positive number');
    }

    // Cost validation
    if (input.totalCostPaid === undefined || input.totalCostPaid === null) {
      errors.push('Total cost is required');
    } else if (typeof input.totalCostPaid !== 'number' || input.totalCostPaid <= 0) {
      errors.push('Total cost must be a positive number');
    }

    // Expiration date is optional, but if provided, should be valid
    if (input.expirationDate !== undefined && input.expirationDate !== null) {
      if (typeof input.expirationDate !== 'string' || input.expirationDate.trim().length === 0) {
        errors.push('Expiration date must be a valid date string');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate inventory batch update input
   */
  static validateUpdate(input: InventoryBatchUpdateInput): ValidationResult {
    const errors: string[] = [];

    // Remaining quantity validation
    if (input.remainingQuantityBase !== undefined) {
      if (typeof input.remainingQuantityBase !== 'number' || input.remainingQuantityBase < 0) {
        errors.push('Remaining quantity must be a positive number');
      }
    }

    // Cost per unit validation
    if (input.costPerBaseUnit !== undefined) {
      if (typeof input.costPerBaseUnit !== 'number' || input.costPerBaseUnit <= 0) {
        errors.push('Cost per unit must be a positive number');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate inventory batch ID
   */
  static validateId(id: number): ValidationResult {
    const errors: string[] = [];

    if (!id || typeof id !== 'number' || id <= 0) {
      errors.push('Invalid inventory batch ID');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate stock deduction
   */
  static validateStockDeduction(ingredientId: number, quantityToDeduct: number): ValidationResult {
    const errors: string[] = [];

    if (!ingredientId || typeof ingredientId !== 'number' || ingredientId <= 0) {
      errors.push('Valid ingredient ID is required');
    }

    if (quantityToDeduct === undefined || quantityToDeduct === null) {
      errors.push('Quantity to deduct is required');
    } else if (typeof quantityToDeduct !== 'number' || quantityToDeduct <= 0) {
      errors.push('Quantity to deduct must be a positive number');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}