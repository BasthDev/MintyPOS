import { CartItem } from '../store/useStore';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class CartValidator {
  /**
   * Validate adding item to cart
   */
  static validateAddItem(item: CartItem): ValidationResult {
    const errors: string[] = [];

    if (!item.productId || typeof item.productId !== 'number' || item.productId <= 0) {
      errors.push('Invalid product ID for cart item');
    }

    if (!item.name || item.name.trim().length === 0) {
      errors.push('Product name is required');
    }

    if (item.price === undefined || item.price === null || typeof item.price !== 'number' || item.price < 0) {
      errors.push('Price must be a valid positive number');
    }

    if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
      errors.push('Quantity must be at least 1');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate updating item quantity
   */
  static validateUpdateQuantity(productId: number, quantity: number): ValidationResult {
    const errors: string[] = [];

    if (!productId || typeof productId !== 'number' || productId <= 0) {
      errors.push('Invalid product ID');
    }

    if (quantity === undefined || quantity === null || typeof quantity !== 'number' || quantity < 0) {
      errors.push('Quantity must be a valid non-negative number');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate removing item
   */
  static validateRemoveItem(productId: number): ValidationResult {
    const errors: string[] = [];

    if (!productId || typeof productId !== 'number' || productId <= 0) {
      errors.push('Invalid product ID');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
