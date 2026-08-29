export interface StaffInput {
  name: string;
  username: string;
  password?: string;
  role: 'Manager' | 'Cashier' | 'Staff';
  storeId: string;
  phone?: string;
}

export class StaffValidator {
  static validate(input: StaffInput, isEditing = false): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input.name || input.name.trim().length === 0) {
      errors.push('Staff name is required');
    }

    if (!input.username || input.username.trim().length < 3) {
      errors.push('Username must be at least 3 characters long');
    } else if (!/^[a-zA-Z0-9._-]+$/.test(input.username.trim())) {
      errors.push('Username can only contain letters, numbers, dots, and hyphens');
    }

    if (!isEditing) {
      if (!input.password || input.password.length < 4) {
        errors.push('Password must be at least 4 characters long');
      }
    }

    if (!input.role) {
      errors.push('Staff role is required');
    }

    if (!input.storeId) {
      errors.push('Assigned store ID is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
