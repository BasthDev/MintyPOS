import { StoreRecord, StoreService } from '@/services/storeService';
import { StoreInput, StoreValidator } from '@/validators/storeValidator';

export class StoreProcess {
  static async create(
    orgId: string,
    input: StoreInput
  ): Promise<{ success: boolean; data?: StoreRecord; error?: string; errors?: string[] }> {
    const validation = StoreValidator.validate(input);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors, error: validation.errors[0] };
    }

    try {
      const data = await StoreService.create(orgId, input);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to create store' };
    }
  }

  static async getAll(): Promise<{ success: boolean; data?: StoreRecord[]; error?: string }> {
    try {
      const data = await StoreService.getAll();
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to fetch stores' };
    }
  }

  static async getActiveStore(): Promise<{ success: boolean; data?: StoreRecord | null; error?: string }> {
    try {
      const data = await StoreService.getActiveStore();
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to get active store' };
    }
  }

  static async switchStore(storeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await StoreService.setActiveStoreId(storeId);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to switch store' };
    }
  }
}
