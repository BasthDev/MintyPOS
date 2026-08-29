import { useAuth } from '@/constants/auth';
import { useTheme } from '@/constants/colorTheme';
import { OrganizationProcess } from '@/processes/organizationProcess';
import { router } from 'expo-router';
import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  User,
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

export default function NewOrganizationScreen() {
  const { theme } = useTheme();
  const { user, refreshUser } = useAuth();

  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState(user?.name || '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!businessName || businessName.trim().length === 0) {
      Alert.alert('Required Field', 'Please enter your business or organization name');
      return;
    }

    setLoading(true);
    try {
      const res = await OrganizationProcess.create({
        name: businessName.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
      });

      if (res.success && res.data) {
        await refreshUser();
        Alert.alert(
          'Business Profile Registered!',
          `Welcome to MintyPOS, ${businessName}! Now let\'s set up your first store branch.`,
          [
            {
              text: 'Set Up First Store',
              onPress: () => {
                router.replace('/(protected)/setup-store' as any);
              },
            },
          ]
        );
      } else {
        Alert.alert('Registration Error', res.error || 'Failed to register business');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save business organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Step Indicator Header */}
        <View style={styles.header}>
          <View style={[styles.stepBadge, { backgroundColor: theme.primary + '20' }]}>
            <Sparkles size={16} color={theme.primary} />
            <Text style={[styles.stepBadgeText, { color: theme.primary }]}>STEP 1 OF 2 • BUSINESS ONBOARDING</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Register Your Business</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Set up your organization profile to manage branches, POS registers, and inventory catalogs.
          </Text>
        </View>

        {/* Onboarding Form Card */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
              Business / Organization Name <Text style={{ color: theme.error }}>*</Text>
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}>
              <Building2 size={18} color={theme.textTertiary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="e.g. Minty Coffee & Roastery"
                placeholderTextColor={theme.textTertiary}
                value={businessName}
                onChangeText={setBusinessName}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Owner / Representative Name</Text>
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

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Business Contact Phone</Text>
            <View style={[styles.inputWrapper, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}>
              <Phone size={18} color={theme.textTertiary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="e.g. +62 812 3456 7890"
                placeholderTextColor={theme.textTertiary}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Business Email</Text>
            <View style={[styles.inputWrapper, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}>
              <Mail size={18} color={theme.textTertiary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="contact@mybusiness.com"
                placeholderTextColor={theme.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Headquarters / Primary Address</Text>
            <View style={[styles.inputWrapper, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}>
              <MapPin size={18} color={theme.textTertiary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="e.g. Jl. Sudirman No. 12, Jakarta"
                placeholderTextColor={theme.textTertiary}
                value={address}
                onChangeText={setAddress}
              />
            </View>
          </View>

          {/* Submit Action Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.submitBtn, { backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Save & Proceed to Store Setup</Text>
                <ArrowRight size={18} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
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
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 14,
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
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 10,
    marginTop: 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
