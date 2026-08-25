import { CartService } from '../services/cartService';
import { CartItem } from '../store/useStore';
import { CartValidator } from '../validators/cartValidator';

export interface ProcessResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

export class CartProcess {
  /**
   * Get all cart items
   */
  static getCart(): ProcessResult<CartItem[]> {
    try {
      const cart = CartService.getCart();
      return { success: true, data: cart };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve cart items',
      };
    }
  }

  /**
   * Add item to cart with validation
   */
  static addItem(item: CartItem): ProcessResult<CartItem[]> {
    const validation = CartValidator.validateAddItem(item);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    try {
      const updatedCart = CartService.addItem(item);
      return { success: true, data: updatedCart };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add item to cart',
      };
    }
  }

  /**
   * Update item quantity in cart with validation
   */
  static updateQuantity(productId: number, quantity: number): ProcessResult<CartItem[]> {
    const validation = CartValidator.validateUpdateQuantity(productId, quantity);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    try {
      const updatedCart = CartService.updateQuantity(productId, quantity);
      return { success: true, data: updatedCart };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update item quantity',
      };
    }
  }

  /**
   * Remove item from cart with validation
   */
  static removeItem(productId: number): ProcessResult<CartItem[]> {
    const validation = CartValidator.validateRemoveItem(productId);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    try {
      const updatedCart = CartService.removeItem(productId);
      return { success: true, data: updatedCart };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove item from cart',
      };
    }
  }

  /**
   * Clear all items from cart
   */
  static clearCart(): ProcessResult<CartItem[]> {
    try {
      const clearedCart = CartService.clear();
      return { success: true, data: clearedCart };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear cart',
      };
    }
  }

  /**
   * Get total amount of cart
   */
  static getTotal(): number {
    return CartService.getTotal();
  }
}
