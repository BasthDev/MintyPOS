import { getDatabase } from '@/lib/database';
import { supabase } from '@/lib/supabase';
import { buildInsertSQL, quoteTable, SYNC_ENTITIES } from '@/lib/syncConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SyncResult {
  pulledCount: number;
  pushedCount: number;
  syncedAt: string;
  errors: string[];
  entityBreakdown: { [key: string]: { pushed: number; pulled: number; label: string } };
}

export interface SyncProgress {
  entity: string;
  entityLabel: string;
  pushed: number;
  pulled: number;
  total: number;
  status: 'pending' | 'pushing' | 'pulling' | 'completed' | 'error';
  error?: string;
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
   * Ensure that the organization and store record exist in Supabase cloud before pushing entity data
   */
  private static async ensureCloudStore(storeId: string): Promise<boolean> {
    try {
      // 1. Check if store already exists in Supabase
      const { data: existingStore } = await supabase
        .from('stores')
        .select('id, org_id, owner_id')
        .eq('id', storeId)
        .maybeSingle();

      if (existingStore) {
        return true;
      }

      // 2. If not found, get authenticated user to link owner & organization
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        console.warn(`[SYNC] Cannot auto-create store in cloud: No authenticated user`);
        return false;
      }

      const ownerId = userData.user.id;
      const ownerName =
        userData.user.user_metadata?.full_name ||
        userData.user.email?.split('@')[0] ||
        'Owner';

      // 3. Ensure organization exists
      let orgId: string | null = null;
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', ownerId)
        .limit(1)
        .maybeSingle();

      if (existingOrg?.id) {
        orgId = existingOrg.id;
      } else {
        const { data: newOrg, error: orgCreateErr } = await supabase
          .from('organizations')
          .insert({
            name: `${ownerName}'s Business`,
            owner_id: ownerId,
            owner_name: ownerName,
            email: userData.user.email,
          })
          .select('id')
          .single();

        if (orgCreateErr) {
          console.warn(`[SYNC] Failed to auto-create organization in cloud:`, orgCreateErr);
        }
        orgId = newOrg?.id || null;
      }

      if (!orgId) {
        console.warn(`[SYNC] Cannot create store: Missing org_id`);
        return false;
      }

      // 4. Create store in Supabase cloud
      const { error: storeInsertErr } = await supabase.from('stores').upsert(
        {
          id: storeId,
          org_id: orgId,
          owner_id: ownerId,
          name: 'Main Store',
          currency_code: 'IDR',
          currency_symbol: 'Rp',
        },
        { onConflict: 'id' }
      );

      if (storeInsertErr) {
        console.error(`[SYNC] Failed to auto-create store in Supabase:`, storeInsertErr);
        return false;
      }

      console.log(`✅ [SYNC] Auto-created store ${storeId} in Supabase cloud.`);
      return true;
    } catch (e) {
      console.warn(`[SYNC] ensureCloudStore error:`, e);
      return false;
    }
  }

  /**
   * Execute dedicated 1-to-1 table synchronization for all 25 entities between local SQLite and Supabase
   */
  static async syncStore(
    storeId: string,
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncResult> {
    const lastSyncedAt = await this.getLastSyncedAt(storeId);
    const now = new Date().toISOString();
    const result: SyncResult = {
      pulledCount: 0,
      pushedCount: 0,
      syncedAt: now,
      errors: [],
      entityBreakdown: {},
    };

    // Ensure store exists in Supabase cloud before pushing entity records
    await this.ensureCloudStore(storeId);

    const db = await getDatabase(storeId);

    // Initialize breakdown and set all entities to pending status
    SYNC_ENTITIES.forEach((e) => {
      result.entityBreakdown[e.type] = { pushed: 0, pulled: 0, label: e.label };
      if (onProgress) {
        onProgress({
          entity: e.type,
          entityLabel: e.label,
          pushed: 0,
          pulled: 0,
          total: 0,
          status: 'pending',
        });
      }
    });

    try {
      // =========================================================================
      // 1. PUSH PHASE: Push local changes to Supabase cloud tables
      // =========================================================================
      for (const entity of SYNC_ENTITIES) {
        try {
          if (onProgress) {
            onProgress({
              entity: entity.type,
              entityLabel: entity.label,
              pushed: 0,
              pulled: 0,
              total: 0,
              status: 'pushing',
            });
          }

          const validCols = await this.getTableColumns(db, entity.table);
          if (validCols.size === 0) {
            if (onProgress) {
              onProgress({
                entity: entity.type,
                entityLabel: entity.label,
                pushed: 0,
                pulled: 0,
                total: 0,
                status: 'completed',
              });
            }
            continue;
          }

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
            // Attach store_id and guarantee timestamps
            const pushRows = localRows.map((row: any) => ({
              ...row,
              store_id: storeId,
              created_at: row.created_at || now,
              updated_at: row.updated_at || row.created_at || now,
            }));

            // Upsert in batches of 50 to Supabase
            for (let i = 0; i < pushRows.length; i += 50) {
              const batch = pushRows.slice(i, i + 50);
              const { error: pushErr } = await supabase.from(entity.table).upsert(batch, {
                onConflict: 'store_id,id',
              });

              if (pushErr) {
                result.errors.push(`[PUSH] ${entity.label}: ${pushErr.message}`);
                if (onProgress) {
                  onProgress({
                    entity: entity.type,
                    entityLabel: entity.label,
                    pushed: result.entityBreakdown[entity.type].pushed,
                    pulled: 0,
                    total: pushRows.length,
                    status: 'error',
                    error: pushErr.message,
                  });
                }
                break;
              } else {
                result.pushedCount += batch.length;
                result.entityBreakdown[entity.type].pushed += batch.length;

                if (onProgress) {
                  onProgress({
                    entity: entity.type,
                    entityLabel: entity.label,
                    pushed: result.entityBreakdown[entity.type].pushed,
                    pulled: 0,
                    total: pushRows.length,
                    status: 'pushing',
                  });
                }
              }
            }
          }

          if (onProgress) {
            onProgress({
              entity: entity.type,
              entityLabel: entity.label,
              pushed: result.entityBreakdown[entity.type].pushed,
              pulled: 0,
              total: result.entityBreakdown[entity.type].pushed,
              status: 'completed',
            });
          }
        } catch (entityPushErr: any) {
          result.errors.push(`[PUSH] ${entity.label}: ${entityPushErr?.message}`);
          if (onProgress) {
            onProgress({
              entity: entity.type,
              entityLabel: entity.label,
              pushed: result.entityBreakdown[entity.type].pushed,
              pulled: 0,
              total: 0,
              status: 'error',
              error: entityPushErr?.message,
            });
          }
        }
      }

      // =========================================================================
      // 2. PULL PHASE: Pull from Supabase cloud tables in foreign-key order
      // =========================================================================
      await db.execAsync('PRAGMA foreign_keys = OFF;');
      await db.execAsync('BEGIN TRANSACTION;');

      try {
        for (const entity of SYNC_ENTITIES) {
          try {
            if (onProgress) {
              onProgress({
                entity: entity.type,
                entityLabel: entity.label,
                pushed: result.entityBreakdown[entity.type].pushed,
                pulled: 0,
                total: 0,
                status: 'pulling',
              });
            }

            let pullQuery = supabase.from(entity.table).select('*').eq('store_id', storeId);
            if (lastSyncedAt) {
              pullQuery = pullQuery.gt('updated_at', lastSyncedAt);
            }

            const { data: cloudRows, error: pullErr } = await pullQuery;

            if (pullErr) {
              result.errors.push(`[PULL] ${entity.label}: ${pullErr.message}`);
              if (onProgress) {
                onProgress({
                  entity: entity.type,
                  entityLabel: entity.label,
                  pushed: result.entityBreakdown[entity.type].pushed,
                  pulled: 0,
                  total: 0,
                  status: 'error',
                  error: pullErr.message,
                });
              }
            } else if (cloudRows && cloudRows.length > 0) {
              const validCols = await this.getTableColumns(db, entity.table);

              for (let i = 0; i < cloudRows.length; i++) {
                const cloudRow = cloudRows[i];
                // Filter out non-local columns like store_id
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

                  if (onProgress) {
                    onProgress({
                      entity: entity.type,
                      entityLabel: entity.label,
                      pushed: result.entityBreakdown[entity.type].pushed,
                      pulled: result.entityBreakdown[entity.type].pulled,
                      total: cloudRows.length,
                      status: 'pulling',
                    });
                  }
                }
              }

              if (onProgress) {
                onProgress({
                  entity: entity.type,
                  entityLabel: entity.label,
                  pushed: result.entityBreakdown[entity.type].pushed,
                  pulled: result.entityBreakdown[entity.type].pulled,
                  total: cloudRows.length,
                  status: 'completed',
                });
              }
            } else {
              if (onProgress) {
                onProgress({
                  entity: entity.type,
                  entityLabel: entity.label,
                  pushed: result.entityBreakdown[entity.type].pushed,
                  pulled: 0,
                  total: 0,
                  status: 'completed',
                });
              }
            }
          } catch (entityPullErr: any) {
            result.errors.push(`[PULL] ${entity.label}: ${entityPullErr?.message}`);
            if (onProgress) {
              onProgress({
                entity: entity.type,
                entityLabel: entity.label,
                pushed: result.entityBreakdown[entity.type].pushed,
                pulled: 0,
                total: 0,
                status: 'error',
                error: entityPullErr?.message,
              });
            }
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
