export interface SyncPayload {
  storeId: string;
  lastSyncedAt?: string | null;
}

export class SyncValidator {
  static validate(payload: SyncPayload): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!payload.storeId || payload.storeId.trim().length === 0) {
      errors.push('Store ID is required for cloud synchronization');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
