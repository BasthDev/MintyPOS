import { DripDrawer } from "@/components/drawer/index";
import { AuthProvider } from "@/constants/auth";
import { ThemeProvider, useTheme } from "@/constants/colorTheme";
import { DrawerProvider, useDrawer } from "@/constants/drawerContext";
import { initDatabase } from "@/lib/database";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
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

  return (
    <>
      <DatabaseInitializer />
      <ThemedAppContent />
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