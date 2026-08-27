export interface CustomerInput {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface CustomerValidationResult {
  isValid: boolean;
  errors: string[];
}

export class CustomerValidator {
  static validate(input: CustomerInput): CustomerValidationResult {
    const errors: string[] = [];

    if (!input.name || !input.name.trim()) {
      errors.push('Customer name is required');
    }

    if (input.email && input.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input.email.trim())) {
        errors.push('Invalid email address format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
