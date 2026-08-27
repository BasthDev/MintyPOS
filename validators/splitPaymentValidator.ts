export interface SplitPaymentInput {
  splitCount: number;
  splitType: 'equal' | 'custom';
  orderTotal: number;
  customAmounts: number[];
}

export interface SplitPaymentValidationResult {
  isValid: boolean;
  errors: string[];
}

export class SplitPaymentValidator {
  static validate(input: SplitPaymentInput): SplitPaymentValidationResult {
    const errors: string[] = [];

    if (input.splitCount < 2 || input.splitCount > 10) {
      errors.push('Split payment count must be between 2 and 10');
    }

    if (input.orderTotal <= 0) {
      errors.push('Order total must be greater than 0 to split payment');
    }

    if (input.splitType === 'custom') {
      if (!input.customAmounts || input.customAmounts.length !== input.splitCount) {
        errors.push(`Custom split amounts must be provided for all ${input.splitCount} splits`);
      } else {
        const sum = input.customAmounts.reduce((acc, curr) => acc + curr, 0);
        if (Math.abs(sum - input.orderTotal) > 0.01) {
          errors.push(`Sum of custom split amounts (${sum}) must equal order total (${input.orderTotal})`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
