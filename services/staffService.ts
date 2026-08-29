import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StaffRecord {
  id: string;
  org_id: string;
  owner_id: string;
  store_id: string;
  store_name?: string;
  name: string;
  username: string;
  password?: string;
  role: 'Manager' | 'Cashier' | 'Staff';
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const LOCAL_STAFF_KEY = 'mintypos_store_staff_list';
const ACTIVE_STAFF_SESSION = 'mintypos_active_staff_session';

export class StaffService {
  /**
   * Create new staff record
   */
  static async create(
    orgId: string,
    ownerId: string,
    data: {
      name: string;
      username: string;
      password?: string;
      role: 'Manager' | 'Cashier' | 'Staff';
      storeId: string;
      phone?: string;
    }
  ): Promise<StaffRecord> {
    const newStaff: StaffRecord = {
      id: 'staff_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      org_id: orgId,
      owner_id: ownerId,
      store_id: data.storeId,
      name: data.name,
      username: data.username.toLowerCase().trim(),
      password: data.password || '',
      role: data.role,
      phone: data.phone || '',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const { data: cloudStaff, error } = await supabase
        .from('staff')
        .insert({
          org_id: orgId,
          owner_id: ownerId,
          store_id: data.storeId,
          name: data.name,
          username: data.username.toLowerCase().trim(),
          password: data.password,
          role: data.role,
          phone: data.phone,
          is_active: true,
        })
        .select()
        .single();

      if (!error && cloudStaff) {
        await this.saveLocalStaff(cloudStaff);
        return cloudStaff;
      }
    } catch (e) {
      console.warn('Could not save staff to Supabase, saving locally:', e);
    }

    await this.saveLocalStaff(newStaff);
    return newStaff;
  }

  /**
   * Authenticate staff via username & password
   */
  static async authenticate(
    username: string,
    password: string
  ): Promise<StaffRecord | null> {
    const cleanUsername = username.toLowerCase().trim();

    try {
      const { data: cloudStaff, error } = await supabase
        .from('staff')
        .select('*, stores(name)')
        .eq('username', cleanUsername)
        .eq('password', password)
        .eq('is_active', true)
        .single();

      if (!error && cloudStaff) {
        await AsyncStorage.setItem(ACTIVE_STAFF_SESSION, JSON.stringify(cloudStaff));
        return cloudStaff;
      }
    } catch (e) {
      console.warn('Supabase staff auth failed, trying local fallback:', e);
    }

    // Local fallback check
    const all = await this.getAll();
    const matched = all.find(
      (s) => s.username.toLowerCase() === cleanUsername && s.password === password && s.is_active
    );

    if (matched) {
      await AsyncStorage.setItem(ACTIVE_STAFF_SESSION, JSON.stringify(matched));
      return matched;
    }

    return null;
  }

  /**
   * Get all staff for store
   */
  static async getAll(storeId?: string): Promise<StaffRecord[]> {
    try {
      let query = supabase.from('staff').select('*');
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      const { data: cloudStaff, error } = await query;
      if (!error && cloudStaff) {
        await AsyncStorage.setItem(LOCAL_STAFF_KEY, JSON.stringify(cloudStaff));
        return cloudStaff;
      }
    } catch (e) {
      console.warn('Failed to load staff from Supabase:', e);
    }

    const cached = await AsyncStorage.getItem(LOCAL_STAFF_KEY);
    const list: StaffRecord[] = cached ? JSON.parse(cached) : [];
    if (storeId) {
      return list.filter((s) => s.store_id === storeId);
    }
    return list;
  }

  /**
   * Get current active staff session
   */
  static async getCurrentSession(): Promise<StaffRecord | null> {
    const cached = await AsyncStorage.getItem(ACTIVE_STAFF_SESSION);
    return cached ? JSON.parse(cached) : null;
  }

  /**
   * Clear active staff session
   */
  static async logout(): Promise<void> {
    await AsyncStorage.removeItem(ACTIVE_STAFF_SESSION);
  }

  private static async saveLocalStaff(staff: StaffRecord): Promise<void> {
    const all = await this.getAll();
    const index = all.findIndex((s) => s.id === staff.id);
    if (index >= 0) {
      all[index] = staff;
    } else {
      all.push(staff);
    }
    await AsyncStorage.setItem(LOCAL_STAFF_KEY, JSON.stringify(all));
  }
}
