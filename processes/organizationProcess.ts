import { OrganizationRecord, OrganizationService } from '@/services/organizationService';
import { OrganizationInput, OrganizationValidator } from '@/validators/organizationValidator';

export class OrganizationProcess {
  static async create(
    input: OrganizationInput
  ): Promise<{ success: boolean; data?: OrganizationRecord; error?: string; errors?: string[] }> {
    const validation = OrganizationValidator.validate(input);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors, error: validation.errors[0] };
    }

    try {
      const data = await OrganizationService.create(input);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to create business organization' };
    }
  }

  static async getCurrent(): Promise<{ success: boolean; data?: OrganizationRecord | null; error?: string }> {
    try {
      const data = await OrganizationService.getCurrent();
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to fetch organization' };
    }
  }
}
