import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StoreRecord {
  id: string;
  org_id: string;
  owner_id: string;
  name: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  currency_code?: string;
  currency_symbol?: string;
  created_at: string;
  updated_at: string;
}

const LOCAL_STORES_KEY = 'mintypos_user_stores';
const ACTIVE_STORE_KEY = 'mintypos_active_store_id';

export class StoreService {
  /**
   * Create a new store record in Supabase only (no local fallback for owners)
   */
  static async create(
    orgId: string,
    data: {
      name: string;
      logoUrl?: string;
      address?: string;
      phone?: string;
      currencyCode?: string;
      currencySymbol?: string;
    }
  ): Promise<StoreRecord> {
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData?.user?.id) {
      throw new Error('User must be authenticated to create store');
    }

    const ownerId = userData.user.id;

    const { data: cloudStore, error } = await supabase
      .from('stores')
      .insert({
        org_id: orgId,
        owner_id: ownerId,
        name: data.name,
        logo_url: data.logoUrl,
        address: data.address,
        phone: data.phone,
        currency_code: data.currencyCode || 'IDR',
        currency_symbol: data.currencySymbol || 'Rp',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create store in Supabase: ${error.message}`);
    }

    if (!cloudStore) {
      throw new Error('Failed to create store: No data returned from Supabase');
    }

    await this.saveLocalStore(cloudStore);
    await this.setActiveStoreId(cloudStore.id);
    return cloudStore;
  }

  /**
   * Get all stores for owner / staff
   */
  static async getAll(): Promise<StoreRecord[]> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) {
        const { data: cloudStores, error } = await supabase
          .from('stores')
          .select('*')
          .eq('owner_id', userData.user.id)
          .order('created_at', { ascending: true });

        if (!error) {
          if (cloudStores && cloudStores.length > 0) {
            await AsyncStorage.setItem(LOCAL_STORES_KEY, JSON.stringify(cloudStores));
            return cloudStores;
          } else {
            await AsyncStorage.removeItem(LOCAL_STORES_KEY);
            return [];
          }
        }
      }

      const cached = await AsyncStorage.getItem(LOCAL_STORES_KEY);
      if (cached) {
        const parsed: StoreRecord[] = JSON.parse(cached);
        if (userData?.user?.id) {
          return parsed.filter((s) => s.owner_id === userData.user.id);
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to fetch stores from Supabase:', e);
    }

    const cached = await AsyncStorage.getItem(LOCAL_STORES_KEY);
    return cached ? JSON.parse(cached) : [];
  }

  /**
   * Save or update store in local storage
   */
  private static async saveLocalStore(store: StoreRecord): Promise<void> {
    const existing = await this.getAll();
    const index = existing.findIndex((s) => s.id === store.id);
    if (index >= 0) {
      existing[index] = store;
    } else {
      existing.push(store);
    }
    await AsyncStorage.setItem(LOCAL_STORES_KEY, JSON.stringify(existing));
  }

  /**
   * Get active store ID
   */
  static async getActiveStoreId(): Promise<string | null> {
    return await AsyncStorage.getItem(ACTIVE_STORE_KEY);
  }

  /**
   * Set active store ID
   */
  static async setActiveStoreId(storeId: string): Promise<void> {
    await AsyncStorage.setItem(ACTIVE_STORE_KEY, storeId);
  }

  /**
   * Get active store details
   */
  static async getActiveStore(): Promise<StoreRecord | null> {
    const activeId = await this.getActiveStoreId();
    const all = await this.getAll();
    if (!activeId && all.length > 0) {
      await this.setActiveStoreId(all[0].id);
      return all[0];
    }
    return all.find((s) => s.id === activeId) || (all.length > 0 ? all[0] : null);
  }
}
