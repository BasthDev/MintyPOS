import { CreatePurchaseOrderInput } from '../services/purchaseOrderService';

export class PurchaseOrderValidator {
  static validateCreate(input: CreatePurchaseOrderInput): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input.poNumber || input.poNumber.trim().length === 0) {
      errors.push('PO number is required');
    }

    if (!input.supplierId || input.supplierId <= 0) {
      errors.push('Supplier is required');
    }

    if (!input.orderDate || input.orderDate.trim().length === 0) {
      errors.push('Order date is required');
    }

    if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
      errors.push('Purchase order must have at least one ingredient item');
    } else {
      input.items.forEach((item, index) => {
        if (!item.ingredientId || item.ingredientId <= 0) {
          errors.push(`Item #${index + 1}: Ingredient is required`);
        }
        if (!item.quantityOrdered || item.quantityOrdered <= 0) {
          errors.push(`Item #${index + 1}: Quantity must be greater than 0`);
        }
        if (!item.unitName || item.unitName.trim().length === 0) {
          errors.push(`Item #${index + 1}: Unit is required`);
        }
        if (item.unitPrice === undefined || item.unitPrice < 0) {
          errors.push(`Item #${index + 1}: Unit price must be 0 or greater`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
