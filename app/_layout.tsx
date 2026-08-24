import { DripDrawer } from "@/components/drawer/index";
import { AuthProvider } from "@/constants/auth";
import { ThemeProvider } from "@/constants/colorTheme";
import { DrawerProvider, useDrawer } from "@/constants/drawerContext";
import { initDatabase } from "@/lib/database";
import { Stack } from "expo-router";
import { useEffect } from "react";

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

function AppContent() {
  const { isDrawerOpen } = useDrawer();

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <DripDrawer />
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <DrawerProvider>
          <DatabaseInitializer />
          <AppContent />
        </DrawerProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
