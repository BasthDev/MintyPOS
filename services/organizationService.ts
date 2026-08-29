import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface OrganizationRecord {
  id: string;
  name: string;
  owner_id: string;
  owner_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

const LOCAL_ORG_KEY = 'mintypos_current_organization';

export class OrganizationService {
  /**
   * Create an organization record in Supabase only (no local fallback for owners)
   */
  static async create(data: {
    name: string;
    ownerName?: string;
    phone?: string;
    email?: string;
    address?: string;
  }): Promise<OrganizationRecord> {
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData?.user?.id) {
      throw new Error('User must be authenticated to create organization');
    }

    const ownerId = userData.user.id;

    const { data: cloudOrg, error } = await supabase
      .from('organizations')
      .insert({
        name: data.name,
        owner_id: ownerId,
        owner_name: data.ownerName,
        phone: data.phone,
        email: data.email,
        address: data.address,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create organization in Supabase: ${error.message}`);
    }

    if (!cloudOrg) {
      throw new Error('Failed to create organization: No data returned from Supabase');
    }

    await AsyncStorage.setItem(LOCAL_ORG_KEY, JSON.stringify(cloudOrg));
    return cloudOrg;
  }

  /**
   * Get current organization from cache or Supabase
   */
  static async getCurrent(): Promise<OrganizationRecord | null> {
    try {
      const cached = await AsyncStorage.getItem(LOCAL_ORG_KEY);
      if (cached) {
        return JSON.parse(cached);
      }

      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) {
        const { data: cloudOrg, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('owner_id', userData.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!error && cloudOrg) {
          await AsyncStorage.setItem(LOCAL_ORG_KEY, JSON.stringify(cloudOrg));
          return cloudOrg;
        }
      }
    } catch (e) {
      console.warn('Failed to get current organization:', e);
    }

    return null;
  }

  /**
   * Clear local organization cache
   */
  static async clear(): Promise<void> {
    await AsyncStorage.removeItem(LOCAL_ORG_KEY);
  }
}
