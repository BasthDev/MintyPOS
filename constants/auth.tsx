import { clearAllDatabases, closeStoreDatabase } from '@/lib/database';
import { supabase } from '@/lib/supabase';
import { OrganizationService } from '@/services/organizationService';
import { StaffService } from '@/services/staffService';
import { StoreService } from '@/services/storeService';
import { useStore } from '@/store/useStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Cashier' | 'Staff';
  userType: 'owner' | 'staff';
  businessName?: string;
  orgId?: string;
  storeId?: string;
  storeName?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (user: User) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Prevent duplicate loads triggered by onAuthStateChange + initial loadUser
  const isLoadingRef = useRef(false);

  useEffect(() => {
    // Initial load on mount
    loadUser();

    // Listen to Supabase auth state changes (sign in / sign out / token refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip INITIAL_SESSION — already handled by loadUser()
      if (event === 'INITIAL_SESSION') return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        await AsyncStorage.removeItem('user');
        return;
      }

      if (session?.user) {
        // Avoid duplicate concurrent loads
        if (isLoadingRef.current) return;
        await loadOwnerProfile(session.user);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  /**
   * Build owner User object from Supabase user + org/store data.
   * Always resolves isLoading when called.
   */
  const loadOwnerProfile = async (supabaseUser: any): Promise<void> => {
    isLoadingRef.current = true;
    try {
      // Load org and active store in parallel
      const [orgData, storeData] = await Promise.allSettled([
        OrganizationService.getCurrent(),
        StoreService.getActiveStore(),
      ]);

      let org = orgData.status === 'fulfilled' ? orgData.value : null;
      let store = storeData.status === 'fulfilled' ? storeData.value : null;

      // Verify org belongs to current authenticated user
      if (org && org.owner_id && org.owner_id !== supabaseUser.id) {
        console.warn('⚠️ [AUTH] Cached org owner mismatch, clearing stale org cache...');
        org = null;
        await OrganizationService.clear();
      }

      // If no active store set locally, select existing store from cloud if any
      if (!store && supabaseUser?.id) {
        try {
          const storesList = await StoreService.getAll();
          if (storesList && storesList.length > 0) {
            store = storesList[0];
            await StoreService.setActiveStoreId(store.id);
          }
        } catch (storeErr) {
          console.warn('⚠️ [AUTH] Could not load stores list:', storeErr);
        }
      }

      const ownerUser: User = {
        id: supabaseUser.id,
        name:
          org?.owner_name ||
          supabaseUser.user_metadata?.full_name ||
          supabaseUser.email?.split('@')[0] ||
          'Owner',
        email: supabaseUser.email || '',
        role: 'Admin',
        userType: 'owner',
        businessName: org?.name || '',
        orgId: org?.id,
        storeId: store?.id,
        storeName: store?.name,
      };

      setUser(ownerUser);
      await AsyncStorage.setItem('user', JSON.stringify(ownerUser));
    } catch (e) {
      console.warn('Failed to load owner profile:', e);
      // Even on failure, set a minimal user so app doesn't stay loading
      const fallbackUser: User = {
        id: supabaseUser.id,
        name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'Owner',
        email: supabaseUser.email || '',
        role: 'Admin',
        userType: 'owner',
      };
      setUser(fallbackUser);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  };

  /**
   * Main user loader — called on app startup and after explicit refreshUser().
   * Always sets isLoading = false in finally.
   */
  const loadUser = async (): Promise<void> => {
    try {
      // 1. Check active staff session first (local only, fast)
      const staffSession = await StaffService.getCurrentSession();
      if (staffSession) {
        const staffUser: User = {
          id: staffSession.id,
          name: staffSession.name,
          email: `${staffSession.username}@store.local`,
          role: staffSession.role,
          userType: 'staff',
          orgId: staffSession.org_id,
          storeId: staffSession.store_id,
          storeName: staffSession.store_name || 'Assigned Store',
        };
        setUser(staffUser);
        return;
      }

      // 2. Check Supabase auth session (network)
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        await loadOwnerProfile(sessionData.session.user);
        return; // loadOwnerProfile sets isLoading=false in its own finally
      }

      // 3. No active session
      setUser(null);
      await AsyncStorage.removeItem('user');
    } catch (error) {
      console.error('Failed to load user:', error);
      setUser(null);
    } finally {
      // Always ensure isLoading is resolved, even if loadOwnerProfile short-circuited
      setIsLoading(false);
    }
  };

  const signIn = async (userData: User): Promise<void> => {
    setUser(userData);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
  };

  const signOut = async (): Promise<void> => {
    try {
      console.log('[AUTH] Starting complete local database & cache cleanup on logout...');

      // 1. Wipe all local SQLite database files and connections
      try {
        await clearAllDatabases();
        console.log('[AUTH] All local SQLite databases successfully wiped and closed');
      } catch (dbError) {
        console.error('[AUTH] Error wiping SQLite databases:', dbError);
      }

      // 2. Clear in-memory Zustand store states
      try {
        useStore.getState().clearCart();
        useStore.getState().setProducts([]);
        useStore.getState().setIngredients([]);
        useStore.getState().setRecipes([]);
        useStore.getState().setInventoryBatches([]);
        useStore.getState().setUnits([]);
        useStore.getState().setIngredientUnits([]);
      } catch (storeError) {
        console.warn('[AUTH] Error resetting Zustand store:', storeError);
      }

      // 3. Clear local cache and session keys from AsyncStorage
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const keysToRemove = allKeys.filter(
          (key) =>
            key === 'user' ||
            key === 'mintypos-storage' ||
            key.startsWith('mintypos_') ||
            key.startsWith('mintypos-')
        );
        if (keysToRemove.length > 0) {
          await AsyncStorage.multiRemove(keysToRemove);
        }
        console.log('[AUTH] All local storage cache keys removed:', keysToRemove);
      } catch (storageError) {
        console.error('[AUTH] Error clearing AsyncStorage keys:', storageError);
      }

      // 4. Clear user state
      setUser(null);

      // 5. Staff and Supabase cloud logout
      await StaffService.logout().catch(() => {});
      await supabase.auth.signOut().catch(() => {});

      console.log('✅ [AUTH] Logout complete: Local database and session clean.');
    } catch (error) {
      console.error('[AUTH] Error during logout:', error);
      setUser(null);
      await StaffService.logout().catch(() => {});
      await supabase.auth.signOut().catch(() => {});
    }
  };

  const updateUser = (updates: Partial<User>): void => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const refreshUser = async (): Promise<void> => {
    setIsLoading(true);
    await loadUser();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};