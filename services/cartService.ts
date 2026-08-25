import { CartItem, useStore } from '../store/useStore';

export class CartService {
  /**
   * Get current cart items
   */
  static getCart(): CartItem[] {
    return useStore.getState().cart;
  }

  /**
   * Add item to cart
   */
  static addItem(item: CartItem): CartItem[] {
    useStore.getState().addToCart(item);
    return useStore.getState().cart;
  }

  /**
   * Remove item from cart
   */
  static removeItem(productId: number): CartItem[] {
    useStore.getState().removeFromCart(productId);
    return useStore.getState().cart;
  }

  /**
   * Update item quantity in cart
   */
  static updateQuantity(productId: number, quantity: number): CartItem[] {
    useStore.getState().updateCartQuantity(productId, quantity);
    return useStore.getState().cart;
  }

  /**
   * Clear all items from cart
   */
  static clear(): CartItem[] {
    useStore.getState().clearCart();
    return useStore.getState().cart;
  }

  /**
   * Calculate total price of cart items
   */
  static getTotal(): number {
    return useStore.getState().getCartTotal();
  }
}
