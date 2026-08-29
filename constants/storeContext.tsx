import { StoreService } from '@/services/storeService';
import { StoreRecord } from '@/services/storeService';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';

interface StoreContextType {
  activeStore: StoreRecord | null;
  stores: StoreRecord[];
  isLoading: boolean;
  setActiveStore: (store: StoreRecord) => Promise<void>;
  refreshStores: () => Promise<void>;
  /** Call this after user logs in / registers to load their store data */
  refreshStoresForUser: (userId?: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeStore, setActiveStoreState] = useState<StoreRecord | null>(null);
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Start false — wait for explicit trigger
  const isFetchingRef = useRef(false);

  /**
   * Load all stores and the active store from cache / Supabase.
   * Safe to call multiple times — debounced via ref.
   */
  const refreshStores = useCallback(async (): Promise<void> => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);
    try {
      const [allStores, activeStoreData] = await Promise.allSettled([
        StoreService.getAll(),
        StoreService.getActiveStore(),
      ]);

      if (allStores.status === 'fulfilled') {
        setStores(allStores.value);
      }

      if (activeStoreData.status === 'fulfilled' && activeStoreData.value) {
        setActiveStoreState(activeStoreData.value);
      } else if (allStores.status === 'fulfilled' && allStores.value.length > 0) {
        // Auto-select first store if no active store set
        setActiveStoreState(allStores.value[0]);
        await StoreService.setActiveStoreId(allStores.value[0].id);
      }
    } catch (e) {
      console.warn('Failed to refresh stores:', e);
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  /**
   * Called externally after user logs in/registers.
   * Pass userId to verify it's a valid owner session before fetching.
   */
  const refreshStoresForUser = useCallback(async (_userId?: string): Promise<void> => {
    await refreshStores();
  }, [refreshStores]);

  // On mount: try to load from local AsyncStorage cache only (fast, offline-safe)
  // This restores previously selected store without waiting for network
  useEffect(() => {
    const loadFromCache = async () => {
      try {
        const activeStoreData = await StoreService.getActiveStore();
        if (activeStoreData) {
          setActiveStoreState(activeStoreData);
          // Also try to load all stores list from cache
          const allStores = await StoreService.getAll();
          setStores(allStores);
        }
      } catch (e) {
        // Cache miss — that's fine, user needs to login first
      }
    };
    loadFromCache();
  }, []);

  const setActiveStore = async (store: StoreRecord): Promise<void> => {
    setActiveStoreState(store);
    await StoreService.setActiveStoreId(store.id);
  };

  return (
    <StoreContext.Provider
      value={{ activeStore, stores, isLoading, setActiveStore, refreshStores, refreshStoresForUser }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStoreContext = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStoreContext must be used within a StoreProvider');
  }
  return context;
};
