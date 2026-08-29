import { useAuth } from '@/constants/auth';
import { useTheme } from '@/constants/colorTheme';
import { useStoreContext } from '@/constants/storeContext';
import { OrganizationService } from '@/services/organizationService';
import { StoreService } from '@/services/storeService';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function RootIndex() {
  const { theme } = useTheme();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { activeStore, refreshStoresForUser } = useStoreContext();
  const hasRoutedRef = useRef(false);

  useEffect(() => {
    // Wait for auth to finish loading before routing
    if (isAuthLoading) return;

    // Prevent double-routing on re-renders
    if (hasRoutedRef.current) return;

    const routeUser = async () => {
      hasRoutedRef.current = true;

      // 1. Not logged in → Auth screen
      if (!user) {
        router.replace('/(auth)' as any);
        return;
      }

      // 2. Staff login → straight to POS
      if (user.userType === 'staff') {
        router.replace('/(protected)' as any);
        return;
      }

      // 3. Owner: load their stores (triggers network fetch now that we know user is logged in)
      await refreshStoresForUser(user.id);

      // 4. Check if owner has set up an organization
      let orgData = null;
      try {
        orgData = await OrganizationService.getCurrent();
      } catch (e) {
        console.warn('Could not load org:', e);
      }

      const hasOrg = !!(orgData || user.orgId);
      if (!hasOrg) {
        router.replace('/(new)' as any);
        return;
      }

      // 5. Check if owner has any stores
      let userStores: any[] = [];
      try {
        userStores = await StoreService.getAll();
      } catch (e) {
        console.warn('Could not load stores:', e);
      }

      if (!userStores || userStores.length === 0) {
        // No stores → setup first store
        router.replace('/(protected)/setup-store' as any);
      } else if (userStores.length > 1 && !activeStore) {
        // Multiple stores → let user select
        router.replace('/(protected)/select-store' as any);
      } else {
        // Single store or active store already selected → enter POS
        if (!activeStore && userStores.length > 0) {
          await StoreService.setActiveStoreId(userStores[0].id);
        }
        router.replace('/(protected)' as any);
      }
    };

    routeUser();
  }, [user, isAuthLoading]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading MintyPOS...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
