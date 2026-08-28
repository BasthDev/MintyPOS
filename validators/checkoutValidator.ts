import { DiscountItem } from '../lib/database';
import { CartItem } from '../store/useStore';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface CheckoutInput {
  cart: CartItem[];
  subtotal: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'qris' | 'transfer' | 'ewallet' | 'split' | string;
  paymentAmount: number;
  selectedBank: string | null;
  selectedDiscount: DiscountItem | null;
  discountAmount: number;
}

export class CheckoutValidator {
  /**
   * Validate the entire checkout before processing payment
   */
  static validateCheckout(input: CheckoutInput): ValidationResult {
    const errors: string[] = [];

    // 1. Cart must have items
    if (!input.cart || input.cart.length === 0) {
      errors.push('Cart is empty. Add items before checkout.');
    }

    // 2. Validate each cart item
    if (input.cart) {
      input.cart.forEach((item, idx) => {
        if (!item.productId || item.productId <= 0) {
          errors.push(`Item #${idx + 1}: Invalid product ID`);
        }
        if (!item.name || item.name.trim().length === 0) {
          errors.push(`Item #${idx + 1}: Missing product name`);
        }
        if (typeof item.price !== 'number' || item.price < 0) {
          errors.push(`Item #${idx + 1}: Invalid price`);
        }
        if (typeof item.quantity !== 'number' || item.quantity <= 0) {
          errors.push(`Item #${idx + 1} (${item.name}): Quantity must be at least 1`);
        }
      });
    }

    // 3. Subtotal must be positive
    if (typeof input.subtotal !== 'number' || input.subtotal <= 0) {
      errors.push('Order subtotal must be greater than 0');
    }

    // 4. Total must be non-negative
    if (typeof input.total !== 'number' || input.total < 0) {
      errors.push('Order total cannot be negative');
    }

    // 5. Payment method specific validation
    const normalizedMethod = input.paymentMethod.toUpperCase();
    if (normalizedMethod === 'CASH') {
      if (typeof input.paymentAmount !== 'number' || input.paymentAmount < input.total) {
        errors.push(
          `Insufficient cash payment. Required: ${input.total}, Received: ${input.paymentAmount}`
        );
      }
    } else if (normalizedMethod === 'STORE CREDIT' || normalizedMethod === 'STORE_CREDIT') {
      // Store credit doesn't require a provider, it uses customer balance
      // Validation is done in the payment screen before calling checkout
    } else if (normalizedMethod === 'SPLIT PAYMENT') {
      // Split payment doesn't require a provider, individual splits are validated separately
    } else {
      // Non-cash methods (card, qris, transfer, ewallet, etc.)
      if (!input.selectedBank || input.selectedBank.trim().length === 0) {
        const methodLabel =
          normalizedMethod === 'CARD'
            ? 'Card (Debit/Credit)'
            : normalizedMethod === 'QRIS'
            ? 'QRIS'
            : normalizedMethod === 'TRANSFER'
            ? 'Bank Transfer'
            : normalizedMethod === 'EWALLET'
            ? 'Digital Wallet'
            : input.paymentMethod;
        errors.push(`Please select a ${methodLabel} provider`);
      }
    }

    // 6. Validate discount if selected
    if (input.selectedDiscount) {
      if (input.selectedDiscount.min_order_amount && input.subtotal < input.selectedDiscount.min_order_amount) {
        errors.push(
          `Discount "${input.selectedDiscount.name}" requires minimum order of ${input.selectedDiscount.min_order_amount}`
        );
      }
      if (typeof input.discountAmount !== 'number' || input.discountAmount < 0) {
        errors.push('Invalid discount amount');
      }
      if (input.discountAmount > input.subtotal) {
        errors.push('Discount amount cannot exceed subtotal');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate discount selection for a given subtotal
   */
  static validateDiscountSelection(
    discount: DiscountItem | null,
    subtotal: number
  ): ValidationResult {
    const errors: string[] = [];

    if (!discount) {
      // Clearing discount is always valid
      return { isValid: true, errors: [] };
    }

    if (discount.min_order_amount && subtotal < discount.min_order_amount) {
      errors.push(
        `Discount "${discount.name}" requires minimum order of ${discount.min_order_amount}. Current subtotal: ${subtotal}`
      );
    }

    if (!discount.is_active) {
      errors.push(`Discount "${discount.name}" is not active`);
    }

    if (discount.type === 'percentage' && (discount.value <= 0 || discount.value > 100)) {
      errors.push('Percentage discount must be between 0 and 100');
    }

    if (discount.type === 'flat' && discount.value <= 0) {
      errors.push('Flat discount must be greater than 0');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
