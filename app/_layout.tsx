import { DripDrawer } from "@/components/drawer/index";
import { LockScreen } from "@/components/LockScreen";
import { AuthProvider } from "@/constants/auth";
import { ThemeProvider, useTheme } from "@/constants/colorTheme";
import { DrawerProvider, useDrawer } from "@/constants/drawerContext";
import { initDatabase } from "@/lib/database";
import { checkLockStatus } from "@/lib/lock";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";

function DatabaseInitializer() {
  useEffect(() => {
    const initializeDB = async () => {
      try {
        await initDatabase();
        console.log("Database initialized successfully");
      } catch (error) {
        console.error("Failed to initialize database:", error);
      }
    };

    initializeDB();
  }, []);

  return null;
}

function LicenseChecker({ onValid }: { onValid: () => void }) {
  const [isChecking, setIsChecking] = useState(true);
  const [lockStatus, setLockStatus] = useState<any>(null);

  useEffect(() => {
    const checkLicense = async () => {
      try {
        const status = await checkLockStatus();
        setLockStatus(status);

        if (!status.isLocked) {
          onValid();
        }
      } catch (error) {
        console.error('License check failed:', error);
        // On error, allow app to run (fail-safe)
        onValid();
      } finally {
        setIsChecking(false);
      }
    };

    checkLicense();
  }, [onValid]);

  if (isChecking) {
    return null;
  }

  // If locked, show lock screen with status
  if (lockStatus?.isLocked) {
    return <LockScreen lockStatus={lockStatus} />;
  }

  return null;
}

function ThemedAppContent() {
  const { isDrawerOpen } = useDrawer();
  const { colorMode } = useTheme();

  return (
    <>
      <StatusBar
        style={colorMode === 'dark' ? 'light' : 'dark'}
        translucent
        backgroundColor="transparent"
      />

      <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
      <DripDrawer />
    </>
  );
}

function AppContent() {
  const { isDrawerOpen } = useDrawer();
  const [isValid, setIsValid] = useState(false);

  return (
    <>
      <DatabaseInitializer />
      {!isValid ? (
        <LicenseChecker onValid={() => setIsValid(true)} />
      ) : (
        <ThemedAppContent />
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <DrawerProvider>
          <AppContent />
        </DrawerProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}