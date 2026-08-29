export interface StoreInput {
  name: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  currencyCode?: string;
  currencySymbol?: string;
}

export class StoreValidator {
  static validate(input: StoreInput): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input.name || input.name.trim().length === 0) {
      errors.push('Store / Branch name is required');
    } else if (input.name.trim().length < 2) {
      errors.push('Store name must be at least 2 characters long');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
