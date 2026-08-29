export interface OrganizationInput {
  name: string;
  ownerName?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export class OrganizationValidator {
  static validate(input: OrganizationInput): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input.name || input.name.trim().length === 0) {
      errors.push('Business / Organization name is required');
    } else if (input.name.trim().length < 2) {
      errors.push('Business name must be at least 2 characters long');
    }

    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
      errors.push('Invalid email address format');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
