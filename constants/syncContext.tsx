import React, { createContext, ReactNode, useContext, useState } from 'react';

interface SyncProgress {
  entity: string;
  entityLabel: string;
  pushed: number;
  pulled: number;
  total: number;
  status: 'pending' | 'pushing' | 'pulling' | 'completed' | 'error';
  error?: string;
}

interface SyncContextType {
  isSyncModalVisible: boolean;
  isLogoutSync: boolean;
  showSyncModal: (isLogout?: boolean) => void;
  hideSyncModal: () => void;
  syncFunction: ((onProgress: (progress: SyncProgress) => void) => Promise<any>) | null;
  setSyncFunction: (fn: ((onProgress: (progress: SyncProgress) => void) => Promise<any>) | null) => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isSyncModalVisible, setIsSyncModalVisible] = useState(false);
  const [isLogoutSync, setIsLogoutSync] = useState(false);
  const [syncFunction, setSyncFunction] = useState<((onProgress: (progress: SyncProgress) => void) => Promise<any>) | null>(null);

  const showSyncModal = (isLogout = false) => {
    console.log('[SyncContext] showSyncModal called, isLogout:', isLogout, 'current syncFunction:', !!syncFunction);
    setIsLogoutSync(isLogout);
    setIsSyncModalVisible(true);
  };

  const hideSyncModal = () => {
    console.log('[SyncContext] hideSyncModal called');
    setIsSyncModalVisible(false);
    setIsLogoutSync(false);
  };

  const handleSetSyncFunction = (fn: ((onProgress: (progress: SyncProgress) => void) => Promise<any>) | null) => {
    console.log('[SyncContext] setSyncFunction called, fn provided:', !!fn);
    setSyncFunction(() => fn);
  };

  return (
    <SyncContext.Provider
      value={{
        isSyncModalVisible,
        isLogoutSync,
        showSyncModal,
        hideSyncModal,
        syncFunction,
        setSyncFunction: handleSetSyncFunction,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};