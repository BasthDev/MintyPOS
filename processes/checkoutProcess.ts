import { validateSaleStock } from '../lib/businessLogic';
import {
  CompletedOrder,
  dbOperations,
  DiscountItem,
  getDatabase,
  handleCheckoutOrder
} from '../lib/database';
import { CartItem } from '../store/useStore';
import { CheckoutValidator } from '../validators/checkoutValidator';

export interface CheckoutResult {
  success: boolean;
  order?: CompletedOrder;
  errors?: string[];
}

export interface ProcessCheckoutInput {
  cart: CartItem[];
  subtotal: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'qris' | 'transfer' | 'ewallet' | 'split' | string;
  paymentAmount: number;
  selectedBank: string | null;
  selectedDiscount: DiscountItem | null;
  discountAmount: number;
  taxAmount: number;
  serviceAmount: number;
  change: number;
  customerId?: number | null;
  customerName?: string | null;
  isSplit?: boolean;
  splitParentId?: number | null;
}

function calcDiscountAmount(discount: DiscountItem | null, subtotal: number): number {
  if (!discount) return 0;
  if (discount.min_order_amount && subtotal < discount.min_order_amount) return 0;
  if (discount.type === 'percentage') {
    const raw = (subtotal * discount.value) / 100;
    if (discount.max_discount_amount && raw > discount.max_discount_amount)
      return discount.max_discount_amount;
    return raw;
  }
  return Math.min(discount.value, subtotal);
}

export class CheckoutProcess {
  /**
   * Validate discount selection before applying
   */
  static validateDiscountSelection(
    discount: DiscountItem | null,
    subtotal: number
  ): { isValid: boolean; errors: string[] } {
    return CheckoutValidator.validateDiscountSelection(discount, subtotal);
  }

  /**
   * Process a complete checkout: validate → deduct stock → save order → return receipt
   */
  static async processCheckout(input: ProcessCheckoutInput): Promise<CheckoutResult> {
    // 1. Validate
    const validation = CheckoutValidator.validateCheckout({
      cart: input.cart,
      subtotal: input.subtotal,
      total: input.total,
      paymentMethod: input.paymentMethod,
      paymentAmount: input.paymentAmount,
      selectedBank: input.selectedBank,
      selectedDiscount: input.selectedDiscount,
      discountAmount: input.discountAmount,
    });

    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    // 2. Process
    try {
      const db = await getDatabase();

      // 2a. Pre-sale Stock Validation (Respects stock ON/OFF per product)
      const stockErrors = await validateSaleStock(
        db,
        input.cart.map((c) => ({
          productId: c.productId,
          quantitySold: c.quantity,
          productName: c.name,
        }))
      );

      if (stockErrors.length > 0) {
        const messages = stockErrors.map((e) =>
          e.ingredientName
            ? `${e.productName}: ${e.ingredientName} needs ${e.required} ${e.unit || ''}, only ${e.available} left in stock`
            : `${e.productName}: needs ${e.required}, only ${e.available} in stock`
        );
        return { success: false, errors: messages };
      }

      const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
      const displayMethodName =
        (input.paymentMethod === 'qris' || input.paymentMethod === 'transfer') && input.selectedBank
          ? `${input.paymentMethod.toUpperCase()} | ${input.selectedBank}`
          : input.paymentMethod.toUpperCase();

      // 2b. Deduct Stock FIFO/FEFO
      await handleCheckoutOrder(
        db,
        input.cart.map((c) => ({
          productId: c.productId,
          quantitySold: c.quantity,
        }))
      );

      // 2b. Save Order to SQLite DB
      const orderId = await dbOperations.createCompletedOrder(db, {
        orderNumber,
        subtotal: input.subtotal,
        discountAmount: input.discountAmount,
        discountName: input.selectedDiscount?.name || null,
        taxAmount: input.taxAmount,
        serviceAmount: input.serviceAmount,
        total: input.total,
        paymentType: input.paymentMethod,
        paymentMethod: displayMethodName,
        amountPaid: input.paymentMethod === 'cash' ? input.paymentAmount : input.total,
        changeAmount: input.change,
        customerId: input.customerId,
        customerName: input.customerName,
        isSplit: input.isSplit,
        splitParentId: input.splitParentId,
        items: input.cart.map((c) => ({
          productId: c.productId,
          productName: c.name,
          price: c.price,
          quantity: c.quantity,
          subtotal: c.price * c.quantity,
          note: c.note,
        })),
      });

      // 2c. Update customer total_spent if customer is attached
      if (input.customerId) {
        await db.runAsync(
          'UPDATE customers SET total_spent = total_spent + ?, updated_at = datetime("now") WHERE id = ?',
          [input.total, input.customerId]
        );

        // 2d. Evaluate and update customer tier based on total_spent
        const crmConfig = await db.getFirstAsync<any>('SELECT * FROM crm_configs LIMIT 1');
        if (crmConfig && crmConfig.tier_upgrade_enabled === 1) {
          const customer = await db.getFirstAsync<any>('SELECT total_spent FROM customers WHERE id = ?', [input.customerId]);
          if (customer) {
            let newTier = 'regular';
            if (customer.total_spent >= crmConfig.gold_threshold) {
              newTier = 'gold';
            } else if (customer.total_spent >= crmConfig.silver_threshold) {
              newTier = 'silver';
            } else if (customer.total_spent >= crmConfig.bronze_threshold) {
              newTier = 'bronze';
            }

            await db.runAsync(
              'UPDATE customers SET tier = ?, updated_at = datetime("now") WHERE id = ?',
              [newTier, input.customerId]
            );
          }
        }
      }

      // 3. Build receipt
      const receiptOrder: CompletedOrder = {
        id: orderId,
        order_number: orderNumber,
        subtotal: input.subtotal,
        discount_amount: input.discountAmount,
        discount_name: input.selectedDiscount?.name || null,
        tax_amount: input.taxAmount,
        service_amount: input.serviceAmount,
        total: input.total,
        payment_type: input.paymentMethod,
        payment_method: displayMethodName,
        amount_paid: input.paymentMethod === 'cash' ? input.paymentAmount : input.total,
        change_amount: input.change,
        items_count: input.cart.length,
        created_at: new Date().toISOString(),
        items: input.cart.map((c, idx) => ({
          id: idx,
          order_id: orderId,
          product_id: c.productId,
          product_name: c.name,
          price: c.price,
          quantity: c.quantity,
          subtotal: c.price * c.quantity,
          note: c.note,
        })),
      };

      return { success: true, order: receiptOrder };
    } catch (error: any) {
      return {
        success: false,
        errors: [`Payment processing failed: ${error?.message || 'Unknown error'}`],
      };
    }
  }
}
