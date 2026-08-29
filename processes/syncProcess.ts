import { SyncResult, SyncService } from '@/services/syncService';
import { SyncValidator } from '@/validators/syncValidator';

export class SyncProcess {
  static async sync(
    storeId: string
  ): Promise<{ success: boolean; data?: SyncResult; error?: string; errors?: string[] }> {
    const validation = SyncValidator.validate({ storeId });
    if (!validation.isValid) {
      return { success: false, errors: validation.errors, error: validation.errors[0] };
    }

    try {
      const data = await SyncService.syncStore(storeId);
      return { success: data.errors.length === 0, data, errors: data.errors };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Sync failed' };
    }
  }

  static async getLastSyncedAt(storeId: string): Promise<string | null> {
    return await SyncService.getLastSyncedAt(storeId);
  }
}
