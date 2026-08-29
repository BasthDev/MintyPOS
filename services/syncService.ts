import { getDatabase } from '@/lib/database';
import { supabase } from '@/lib/supabase';
import { buildInsertSQL, quoteTable, SYNC_ENTITIES } from '@/lib/syncConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SyncResult {
  pulledCount: number;
  pushedCount: number;
  syncedAt: string;
  errors: string[];
  entityBreakdown: { [key: string]: { pushed: number; pulled: number } };
}

const tableColumnsCache: Record<string, Set<string>> = {};

export class SyncService {
  private static getSyncKey(storeId: string) {
    return `mintypos_last_synced_${storeId}`;
  }

  /**
   * Get the timestamp of the last successful sync
   */
  static async getLastSyncedAt(storeId: string): Promise<string | null> {
    return await AsyncStorage.getItem(this.getSyncKey(storeId));
  }

  /**
   * Cache and retrieve valid column names for a SQLite table
   */
  private static async getTableColumns(db: any, table: string): Promise<Set<string>> {
    if (!tableColumnsCache[table] || tableColumnsCache[table].size === 0) {
      try {
        const columns: any = await db.getAllAsync(`PRAGMA table_info(${quoteTable(table)})`);
        if (Array.isArray(columns)) {
          tableColumnsCache[table] = new Set(columns.map((c: any) => c.name));
        } else {
          tableColumnsCache[table] = new Set();
        }
      } catch {
        return new Set();
      }
    }
    return tableColumnsCache[table];
  }

  /**
   * Execute dedicated 1-to-1 table synchronization for all 20 entities between local SQLite and Supabase
   */
  static async syncStore(storeId: string): Promise<SyncResult> {
    const lastSyncedAt = await this.getLastSyncedAt(storeId);
    const now = new Date().toISOString();
    const result: SyncResult = {
      pulledCount: 0,
      pushedCount: 0,
      syncedAt: now,
      errors: [],
      entityBreakdown: {},
    };

    const db = await getDatabase(storeId);

    // Initialize breakdown
    SYNC_ENTITIES.forEach((e) => {
      result.entityBreakdown[e.type] = { pushed: 0, pulled: 0 };
    });

    try {
      // =========================================================================
      // 1. PUSH PHASE: Push delta records directly to dedicated Supabase tables
      // =========================================================================
      for (const entity of SYNC_ENTITIES) {
        try {
          const validCols = await this.getTableColumns(db, entity.table);
          if (validCols.size === 0) continue;

          let query = `SELECT * FROM ${quoteTable(entity.table)}`;
          let params: any[] = [];

          if (validCols.has('updated_at') && lastSyncedAt) {
            query += ` WHERE updated_at > ?`;
            params = [lastSyncedAt];
          } else if (validCols.has('created_at') && lastSyncedAt) {
            query += ` WHERE created_at > ?`;
            params = [lastSyncedAt];
          }

          const localRows: any = await db.getAllAsync(query, params);

          if (localRows && localRows.length > 0) {
            // Attach store_id and ensure timestamp on all rows
            const pushRows = localRows.map((row: any) => ({
              ...row,
              store_id: storeId,
              created_at: row.created_at || now,
              updated_at: row.updated_at || row.created_at || now,
            }));

            // Upsert in batches of 50 to dedicated table
            for (let i = 0; i < pushRows.length; i += 50) {
              const batch = pushRows.slice(i, i + 50);
              const { error: pushErr } = await supabase.from(entity.table).upsert(batch, {
                onConflict: 'store_id,id',
              });

              if (pushErr) {
                result.errors.push(`Failed to push table ${entity.table}: ${pushErr.message}`);
              } else {
                result.pushedCount += batch.length;
                result.entityBreakdown[entity.type].pushed += batch.length;
              }
            }
          }
        } catch (entityPushErr: any) {
          result.errors.push(`Push error on ${entity.table}: ${entityPushErr?.message}`);
        }
      }

      // =========================================================================
      // 2. PULL PHASE: Pull from dedicated Supabase tables in foreign-key order
      // =========================================================================
      await db.execAsync('PRAGMA foreign_keys = OFF;');
      await db.execAsync('BEGIN TRANSACTION;');

      try {
        for (const entity of SYNC_ENTITIES) {
          try {
            let pullQuery = supabase.from(entity.table).select('*').eq('store_id', storeId);
            if (lastSyncedAt) {
              pullQuery = pullQuery.gt('updated_at', lastSyncedAt);
            }

            const { data: cloudRows, error: pullErr } = await pullQuery;

            if (pullErr) {
              result.errors.push(`Failed to pull table ${entity.table}: ${pullErr.message}`);
            } else if (cloudRows && cloudRows.length > 0) {
              const validCols = await this.getTableColumns(db, entity.table);

              for (const cloudRow of cloudRows) {
                // Filter out non-local columns like store_id if not in local schema
                const rowData: Record<string, any> = {};
                for (const key of Object.keys(cloudRow)) {
                  if (validCols.has(key)) {
                    rowData[key] = cloudRow[key];
                  }
                }

                if (Object.keys(rowData).length > 0) {
                  const { sql, values } = buildInsertSQL(entity.table, rowData);
                  await db.runAsync(sql, values as any[]);
                  result.pulledCount++;
                  result.entityBreakdown[entity.type].pulled++;
                }
              }
            }
          } catch (entityPullErr: any) {
            result.errors.push(`Pull error on ${entity.table}: ${entityPullErr?.message}`);
          }
        }

        await db.execAsync('COMMIT;');
      } catch (applyErr: any) {
        await db.execAsync('ROLLBACK;');
        result.errors.push(`Failed to commit pulled transactions: ${applyErr?.message}`);
      } finally {
        await db.execAsync('PRAGMA foreign_keys = ON;');
      }

      await AsyncStorage.setItem(this.getSyncKey(storeId), now);
    } catch (err: any) {
      result.errors.push(err?.message || 'Synchronization failed');
    }

    return result;
  }
}
