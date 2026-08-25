import { PaymentMethodCreateInput, PaymentMethodUpdateInput } from '../services/paymentMethodService';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class PaymentMethodValidator {
  /**
   * Validate payment method creation input
   */
  static validateCreate(input: PaymentMethodCreateInput): ValidationResult {
    const errors: string[] = [];

    if (!input.typeKey || input.typeKey.trim().length === 0) {
      errors.push('Payment type key is required');
    }

    if (!input.typeLabel || input.typeLabel.trim().length === 0) {
      errors.push('Payment type label is required');
    }

    if (!input.methodName || input.methodName.trim().length === 0) {
      errors.push('Method name is required (e.g. BYOND, DANA, BCA)');
    } else if (input.methodName.trim().length < 2) {
      errors.push('Method name must be at least 2 characters');
    } else if (input.methodName.trim().length > 50) {
      errors.push('Method name must not exceed 50 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate payment method update input
   */
  static validateUpdate(input: PaymentMethodUpdateInput): ValidationResult {
    const errors: string[] = [];

    if (input.methodName !== undefined) {
      if (!input.methodName || input.methodName.trim().length === 0) {
        errors.push('Method name cannot be empty');
      } else if (input.methodName.trim().length < 2) {
        errors.push('Method name must be at least 2 characters');
      } else if (input.methodName.trim().length > 50) {
        errors.push('Method name must not exceed 50 characters');
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
      errors.push('Invalid payment method ID');
    }
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
