import { useAuth } from '@/constants/auth';
import { useTheme } from '@/constants/colorTheme';
import { useStoreContext } from '@/constants/storeContext';
import { clearAllDatabases } from '@/lib/database';
import { supabase } from '@/lib/supabase';
import { OrganizationProcess } from '@/processes/organizationProcess';
import { StaffProcess } from '@/processes/staffProcess';
import { StoreProcess } from '@/processes/storeProcess';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import {
  Globe,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  Shield,
  ShoppingBag,
  User,
  UserCheck,
  Users
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function AuthScreen() {
  const { theme } = useTheme();
  const { refreshUser } = useAuth();
  const { refreshStoresForUser } = useStoreContext();

  const [activeTab, setActiveTab] = useState<'owner' | 'staff'>('owner');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);

  // Owner Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ownerName, setOwnerName] = useState('');

  // Staff Form State
  const [username, setUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');

  // 1. Handle Owner Login / Register
  const handleOwnerSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      if (isRegistering) {
        console.log('🔷 [AUTH] Starting Owner Registration...');
        console.log('🔷 [AUTH] Payload:', { email: email.trim(), ownerName: ownerName.trim() });

        // Register new owner with Supabase Auth with email confirmation enabled
        const res = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: { full_name: ownerName.trim() },
            emailRedirectTo: 'mintypos://auth-callback', // Deep link for mobile app
          },
        });

        console.log('🔷 [AUTH] Supabase SignUp Response:', {
          hasUser: !!res.data?.user,
          hasSession: !!res.data?.session,
          userId: res.data?.user?.id,
          userEmail: res.data?.user?.email,
          error: res.error
            ? {
                name: res.error.name,
                message: res.error.message,
                status: (res.error as any).status,
                code: (res.error as any).code,
              }
            : null,
        });

        if (res.error) {
          console.error('❌ [AUTH] SignUp Failed with Error:', JSON.stringify(res.error, null, 2));
          
          // Handle email confirmation errors specifically
          if (res.error.message.includes('email') || res.error.status === 500) {
            Alert.alert(
              'Email Service Configuration Required',
              'To enable email confirmation, you need to configure email service in Supabase:\n\n1. Go to Supabase Dashboard → Authentication → Providers\n2. Under Email provider, configure SMTP settings\n3. Or use Supabase\'s built-in email service (paid tier)\n\n\nAlternative: Disable "Confirm email" in Supabase Dashboard for development.',
              [
                { text: 'OK', onPress: () => setIsRegistering(false) }
              ]
            );
          } else {
            Alert.alert(
              'Registration Failed',
              `Error: ${res.error.message}\nStatus: ${(res.error as any).status || 'N/A'}`
            );
          }
          return;
        }

        if (res.data?.session) {
          console.log('✅ [AUTH] Registration Succeeded with active session! Routing to /(new)...');
          await refreshUser();
          router.replace('/(new)' as any);
        } else if (res.data?.user) {
          console.log('✅ [AUTH] User created successfully. Email confirmation required.');
          Alert.alert(
            'Registration Successful - Email Confirmation Required',
            'We\'ve sent a confirmation email to ' + email.trim() + '\n\nPlease check your inbox and click the confirmation link to activate your account.\n\nAfter confirming, you can log in with your credentials.',
            [
              {
                text: 'OK',
                onPress: () => {
                  setIsRegistering(false);
                },
              },
            ]
          );
        } else {
          console.log('✅ [AUTH] Registration complete, refreshing user...');
          await refreshUser();
          router.replace('/(new)' as any);
        }
      } else {
        // Owner Login
        console.log('🔷 [AUTH] Starting Owner Login for:', email.trim());
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) {
          console.error('❌ [AUTH] Login Failed:', JSON.stringify(error, null, 2));
          Alert.alert('Login Failed', `Error: ${error.message}\nStatus: ${(error as any).status || 'N/A'}`);
          return;
        }

        console.log('✅ [AUTH] Login Succeeded. User ID:', data?.user?.id);

        // Refresh user profile + store data with the new session
        await refreshUser();
        await refreshStoresForUser(data?.user?.id);

        // Check if owner already has an organization
        const orgRes = await OrganizationProcess.getCurrent();
        console.log('🔷 [AUTH] Organization check:', orgRes);
        if (!orgRes.data) {
          console.log('🔷 [AUTH] No organization found. Routing to /(new)...');
          router.replace('/(new)' as any);
          return;
        }

        // Check if owner has stores
        const storeRes = await StoreProcess.getAll();
        console.log('🔷 [AUTH] Stores check count:', storeRes.data?.length || 0);
        if (!storeRes.data || storeRes.data.length === 0) {
          router.replace('/(protected)/setup-store' as any);
        } else if (storeRes.data.length > 1) {
          router.replace('/(protected)/select-store' as any);
        } else {
          await StoreProcess.switchStore(storeRes.data[0].id);
          router.replace('/(protected)' as any);
        }
      }
    } catch (err: any) {
      console.error('❌ [AUTH] Unexpected Exception:', err);
      Alert.alert('Authentication Error', `${err?.name || 'Error'}: ${err?.message || 'Failed to authenticate'}`);
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Google OAuth for Owner (email click verification)
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      console.log('🔷 [AUTH] Starting Google OAuth...');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: Platform.OS === 'web' ? window.location.origin : 'mintypos://auth-callback',
        },
      });

      if (error) {
        console.error('❌ [AUTH] Google OAuth error:', error);
        Alert.alert('Google Sign-In Failed', error.message);
      }
    } catch (e: any) {
      console.error('❌ [AUTH] Google OAuth exception:', e);
      Alert.alert('Error', e?.message || 'Google OAuth failed');
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Staff Login
  const handleStaffSubmit = async () => {
    if (!username || !staffPassword) {
      Alert.alert('Error', 'Please enter staff username and password');
      return;
    }

    setLoading(true);
    try {
      console.log('🔷 [AUTH] Attempting Staff Login for username:', username.trim());
      const res = await StaffProcess.login(username, staffPassword);
      console.log('🔷 [AUTH] Staff Login Response:', res);
      if (res.success && res.staff) {
        console.log('✅ [AUTH] Staff authenticated:', res.staff.name, res.staff.role);
        await refreshUser();
        router.replace('/(protected)' as any);
      } else {
        console.error('❌ [AUTH] Staff authentication rejected:', res.error);
        Alert.alert('Staff Login Failed', res.error || 'Invalid credentials');
      }
    } catch (err: any) {
      console.error('❌ [AUTH] Staff login exception:', err);
      Alert.alert('Error', err?.message || 'Staff login failed');
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Clean Session, Storage & Local Database
  const handleCleanSessionAndDatabase = () => {
    Alert.alert(
      'Clean Session & Database',
      'This will sign out all accounts, clear AsyncStorage cache, and wipe all local SQLite database files so you can start completely fresh. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clean Everything',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // 1. Sign out from cloud & staff
              await supabase.auth.signOut().catch(() => {});
              await StaffProcess.logout().catch(() => {});

              // 2. Wipe SQLite database instances
              await clearAllDatabases();

              // 3. Wipe AsyncStorage
              await AsyncStorage.clear();

              // 4. Reset form inputs
              setEmail('');
              setPassword('');
              setOwnerName('');
              setUsername('');
              setStaffPassword('');

              // 5. Refresh context states
              await refreshUser();
              await refreshStoresForUser();

              Alert.alert(
                'Cleaned Successfully',
                'All local sessions, cached stores, and SQLite databases have been cleared.'
              );
            } catch (err: any) {
              Alert.alert('Clean Error', err?.message || 'Failed to clear local cache');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <View style={[styles.brandLogoBadge, { backgroundColor: theme.primary }]}>
            <ShoppingBag size={32} color="#FFFFFF" />
          </View>
          <Text style={[styles.brandTitle, { color: theme.text }]}>MintyPOS</Text>
          <Text style={[styles.brandSubtitle, { color: theme.textSecondary }]}>
            Cloud Point of Sale & Multi-Store Management
          </Text>
        </View>

        {/* Tab Switcher (Owner vs Staff) */}
        <View style={[styles.tabBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'owner' && { backgroundColor: theme.primary },
            ]}
            onPress={() => {
              setActiveTab('owner');
              setIsRegistering(false);
            }}
          >
            <Shield size={16} color={activeTab === 'owner' ? '#FFFFFF' : theme.textSecondary} />
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === 'owner' ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              Business Owner
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'staff' && { backgroundColor: theme.primary },
            ]}
            onPress={() => {
              setActiveTab('staff');
              setIsRegistering(false);
            }}
          >
            <Users size={16} color={activeTab === 'staff' ? '#FFFFFF' : theme.textSecondary} />
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === 'staff' ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              Store Staff
            </Text>
          </TouchableOpacity>
        </View>

        {/* --- OWNER LOGIN / REGISTER FORM --- */}
        {activeTab === 'owner' && (
          <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {isRegistering ? 'Create Owner Account' : 'Owner Sign In'}
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
              {isRegistering
                ? 'Register your organization to start managing multi-branch stores'
                : 'Sign in to access your business analytics, stores & inventory'}
            </Text>

            {isRegistering && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Owner Full Name</Text>
                <View style={[styles.inputWrapper, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}>
                  <User size={18} color={theme.textTertiary} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="e.g. John Doe"
                    placeholderTextColor={theme.textTertiary}
                    value={ownerName}
                    onChangeText={setOwnerName}
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email Address</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}>
                <Mail size={18} color={theme.textTertiary} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="owner@business.com"
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Password</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}>
                <Lock size={18} color={theme.textTertiary} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="••••••••"
                  placeholderTextColor={theme.textTertiary}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.primaryBtn, { backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 }]}
              onPress={handleOwnerSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <LogIn size={18} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>
                    {isRegistering ? 'Register Business' : 'Sign In as Owner'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Google OAuth Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.googleBtn, { backgroundColor: theme.input, borderColor: theme.border }]}
              onPress={handleGoogleLogin}
              disabled={loading}
            >
              <Globe size={18} color={theme.primary} />
              <Text style={[styles.googleBtnText, { color: theme.text }]}>Continue with Google (OAuth)</Text>
            </TouchableOpacity>

            {/* Toggle Register / Login */}
            <View style={styles.toggleRow}>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                {isRegistering ? 'Already have an owner account?' : 'New business owner?'}
              </Text>
              <TouchableOpacity onPress={() => setIsRegistering(!isRegistering)}>
                <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 13 }}>
                  {isRegistering ? 'Sign In' : 'Register Now'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* --- STAFF LOGIN FORM --- */}
        {activeTab === 'staff' && (
          <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Store Staff Sign In</Text>
            <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
              Enter the username and password provided by your Store Manager or Business Owner
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Staff Username</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}>
                <UserCheck size={18} color={theme.textTertiary} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="e.g. cashier1"
                  placeholderTextColor={theme.textTertiary}
                  autoCapitalize="none"
                  value={username}
                  onChangeText={setUsername}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Staff Password</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}>
                <KeyRound size={18} color={theme.textTertiary} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="••••••••"
                  placeholderTextColor={theme.textTertiary}
                  secureTextEntry
                  value={staffPassword}
                  onChangeText={setStaffPassword}
                />
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.primaryBtn, { backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 }]}
              onPress={handleStaffSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <LogIn size={18} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Sign In to Store POS</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Clean Cache, Session & Local Database Button */}
        {/* <View style={styles.cleanSection}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.resetBtn,
              { borderColor: theme.border, backgroundColor: theme.card },
            ]}
            onPress={handleCleanSessionAndDatabase}
            disabled={loading}
          >
            <RotateCcw size={14} color={theme.error} />
            <Text style={[styles.resetBtnText, { color: theme.error }]}>
              Clean Session & Local Database
            </Text>
          </TouchableOpacity>
          <Text style={[styles.cleanHelpText, { color: theme.textTertiary }]}>
            Use this to wipe local SQLite storage and sign out completely
          </Text>
        </View> */}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandLogoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
  },
  brandSubtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 10,
    marginTop: 6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
  },
  googleBtnText: {
    fontWeight: '600',
    fontSize: 13,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  cleanSection: {
    alignItems: 'center',
    marginTop: 28,
    gap: 6,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cleanHelpText: {
    fontSize: 11,
    textAlign: 'center',
  },
});
