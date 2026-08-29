import { DripDrawer } from "@/components/drawer/index";
import { LockScreen } from "@/components/LockScreen";
import { AuthProvider, useAuth } from "@/constants/auth";
import { ThemeProvider, useTheme } from "@/constants/colorTheme";
import { DrawerProvider } from "@/constants/drawerContext";
import { StoreProvider, useStoreContext } from "@/constants/storeContext";
import { initDatabase } from "@/lib/database";
import { checkLockStatus } from "@/lib/lock";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";

/**
 * Initializes the per-store SQLite database when a storeId becomes available.
 * Must be inside both AuthProvider and StoreProvider.
 */
function DatabaseInitializer() {
  const { user } = useAuth();
  const { activeStore } = useStoreContext();
  const initializedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const storeId = activeStore?.id || user?.storeId;
    if (!storeId) return;
    // Prevent re-initializing the same store DB multiple times
    if (initializedRef.current.has(storeId)) return;

    const initializeDB = async () => {
      try {
        await initDatabase(storeId);
        initializedRef.current.add(storeId);
        console.log(`[DB] Initialized database for store: ${storeId}`);
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
 * Inner app content — always renders Stack navigator so routing always works.
 * LicenseChecker is rendered as an OVERLAY above the stack, not instead of it.
 */
function ThemedAppContent() {
  const { colorMode } = useTheme();
  const [isValid, setIsValid] = useState(false);

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
            <AppShell />
          </DrawerProvider>
        </ThemeProvider>
      </StoreProvider>
    </AuthProvider>
  );
}