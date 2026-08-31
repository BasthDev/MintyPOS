import { DripDrawer } from "@/components/drawer/index";
import { LockScreen } from "@/components/LockScreen";
import { SyncModal } from "@/components/SyncModal";
import { AuthProvider, useAuth } from "@/constants/auth";
import { ThemeProvider, useTheme } from "@/constants/colorTheme";
import { DrawerProvider } from "@/constants/drawerContext";
import { StoreProvider, useStoreContext } from "@/constants/storeContext";
import { SyncProvider, useSync } from "@/constants/syncContext";
import { closeStoreDatabase, initDatabase } from "@/lib/database";
import { SyncService } from "@/services/syncService";
import { checkLockStatus } from "@/lib/lock";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import { Platform } from "react-native";
import { useEffect, useRef, useState } from "react";

/**
 * Initializes the per-store SQLite database when a storeId becomes available.
 * Must be inside both AuthProvider and StoreProvider.
 * Handles database isolation when switching between stores.
 */
function DatabaseInitializer() {
  const { user } = useAuth();
  const { activeStore } = useStoreContext();
  const initializedRef = useRef<Set<string>>(new Set());
  const previousStoreIdRef = useRef<string | null>(null);

  useEffect(() => {
    const storeId = activeStore?.id || user?.storeId;
    if (!storeId) return;

    const initializeDB = async () => {
      try {
        // Close previous store's database for isolation when switching stores
        if (previousStoreIdRef.current && previousStoreIdRef.current !== storeId) {
          try {
            await closeStoreDatabase(previousStoreIdRef.current);
            console.log(`[DB] Closed previous store database: ${previousStoreIdRef.current}`);
            initializedRef.current.delete(previousStoreIdRef.current);
          } catch (closeError) {
            console.error(`[DB] Error closing previous store database:`, closeError);
          }
        }

        // Prevent re-initializing the same store DB multiple times
        if (initializedRef.current.has(storeId)) {
          console.log(`[DB] Database already initialized for store: ${storeId}`);
          return;
        }

        await initDatabase(storeId);
        initializedRef.current.add(storeId);
        previousStoreIdRef.current = storeId;
        console.log(`[DB] Initialized database for store: ${storeId}`);

        // Automatically pull store data from cloud on initialization for multi-device sync
        try {
          console.log(`[SYNC] Initiating background cloud pull for store: ${storeId}`);
          SyncService.syncStore(storeId)
            .then((result) => {
              console.log(`[SYNC] Initial cloud sync completed for store ${storeId}. Pulled: ${result.pulledCount}, Pushed: ${result.pushedCount}`);
            })
            .catch((syncErr) => {
              console.warn(`[SYNC] Initial cloud sync notice:`, syncErr?.message || syncErr);
            });
        } catch (syncErr) {
          console.warn(`[SYNC] Failed to initiate cloud sync:`, syncErr);
        }
      } catch (error) {
        console.error("[DB] Failed to initialize database:", error);
      }
    };

    initializeDB();
  }, [activeStore?.id, user?.storeId]);

  return null;
}

/**
 * License / lock check overlay.
 * Renders NOTHING if valid — does not block the navigator.
 */
function LicenseChecker({ onValid }: { onValid: () => void }) {
  const [lockStatus, setLockStatus] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkLicense = async () => {
      try {
        const status = await checkLockStatus();
        setLockStatus(status);
        if (!status.isLocked) {
          onValid();
        }
      } catch (error) {
        console.error("License check failed:", error);
        onValid(); // Fail-safe: allow app to run
      } finally {
        setIsChecking(false);
      }
    };
    checkLicense();
  }, [onValid]);

  if (isChecking || !lockStatus?.isLocked) return null;

  return <LockScreen lockStatus={lockStatus} />;
}

/**
 * Global Sync Modal Overlay
 * Renders SyncModal at the highest level as a global overlay
 */
function GlobalSyncModal() {
  const { isSyncModalVisible, hideSyncModal, syncFunction } = useSync();

  // Don't render if modal is not visible or no sync function is set
  if (!isSyncModalVisible || !syncFunction) return null;

  return (
    <SyncModal
      visible={isSyncModalVisible}
      onClose={hideSyncModal}
      syncFunction={syncFunction}
    />
  );
}

/**
 * Inner app content — always renders Stack navigator so routing always works.
 * LicenseChecker is rendered as an OVERLAY above the stack, not instead of it.
 */
function ThemedAppContent() {
  const { colorMode } = useTheme();
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android') {
      try {
        NavigationBar.setVisibilityAsync('hidden').catch(() => {});
        NavigationBar.setBehaviorAsync('overlay-swipe').catch(() => {});
      } catch (e) {
        console.warn('Failed to configure Android NavigationBar:', e);
      }
    }
  }, []);

  return (
    <>
      <StatusBar
        style={colorMode === "dark" ? "light" : "dark"}
        translucent
        backgroundColor="transparent"
      />

      {/* Stack navigator is ALWAYS rendered so expo-router can navigate */}
      <Stack screenOptions={{ headerShown: false, animation: "none" }} />

      {/* Drawer overlay */}
      <DripDrawer />

      {/* Global Sync Modal overlay - always on top */}
      <GlobalSyncModal />

      {/* License overlay — blocks UI if locked, otherwise invisible */}
      {!isValid && <LicenseChecker onValid={() => setIsValid(true)} />}
    </>
  );
}

/**
 * App shell inside all providers — initializes DB, then renders themed content.
 */
function AppShell() {
  return (
    <>
      <DatabaseInitializer />
      <ThemedAppContent />
    </>
  );
}

export default function RootLayout() {
  return (
    // AuthProvider is outermost so all children can use useAuth()
    <AuthProvider>
      {/* StoreProvider is inside AuthProvider so it can be triggered after login */}
      <StoreProvider>
        <ThemeProvider>
          <DrawerProvider>
            <SyncProvider>
              <AppShell />
            </SyncProvider>
          </DrawerProvider>
        </ThemeProvider>
      </StoreProvider>
    </AuthProvider>
  );
}