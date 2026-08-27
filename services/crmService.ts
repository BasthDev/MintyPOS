import { CRMConfigItem, dbOperations } from '@/lib/database';
import * as SQLite from 'expo-sqlite';

export class CRMService {
  static async getConfig(db: SQLite.SQLiteDatabase): Promise<CRMConfigItem | null> {
    return await dbOperations.getCRMConfig(db);
  }

  static async updateConfig(
    db: SQLite.SQLiteDatabase,
    config: Partial<CRMConfigItem>
  ): Promise<void> {
    await dbOperations.updateCRMConfig(db, config);
  }
}
