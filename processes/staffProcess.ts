import { StaffRecord, StaffService } from '@/services/staffService';
import { StoreService } from '@/services/storeService';
import { StaffInput, StaffValidator } from '@/validators/staffValidator';

export class StaffProcess {
  static async create(
    orgId: string,
    ownerId: string,
    input: StaffInput
  ): Promise<{ success: boolean; data?: StaffRecord; error?: string; errors?: string[] }> {
    const validation = StaffValidator.validate(input);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors, error: validation.errors[0] };
    }

    try {
      const data = await StaffService.create(orgId, ownerId, input);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to create staff account' };
    }
  }

  static async login(
    username: string,
    password: string
  ): Promise<{ success: boolean; staff?: StaffRecord; error?: string }> {
    if (!username || !password) {
      return { success: false, error: 'Please enter username and password' };
    }

    try {
      const staff = await StaffService.authenticate(username, password);
      if (!staff) {
        return { success: false, error: 'Invalid staff username or password' };
      }

      // Automatically switch active store to staff's assigned store
      if (staff.store_id) {
        await StoreService.setActiveStoreId(staff.store_id);
      }

      return { success: true, staff };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Staff authentication failed' };
    }
  }

  static async getAll(storeId?: string): Promise<{ success: boolean; data?: StaffRecord[]; error?: string }> {
    try {
      const data = await StaffService.getAll(storeId);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to fetch staff list' };
    }
  }

  static async getCurrentSession(): Promise<{ success: boolean; data?: StaffRecord | null }> {
    try {
      const data = await StaffService.getCurrentSession();
      return { success: true, data };
    } catch {
      return { success: true, data: null };
    }
  }

  static async logout(): Promise<{ success: boolean }> {
    await StaffService.logout();
    return { success: true };
  }
}
