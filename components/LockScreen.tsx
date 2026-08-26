import { useTheme } from '@/constants/colorTheme';
import { LockStatus, checkLockStatus, formatDate } from '@/lib/lock';
import { AlertCircle, Calendar, Lock } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface LockScreenProps {
  onUnlock?: () => void;
  lockStatus?: LockStatus | null;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock, lockStatus: propLockStatus }) => {
  const { theme } = useTheme();
  const [lockStatus, setLockStatus] = useState<LockStatus | null>(propLockStatus || null);
  const [loading, setLoading] = useState(!propLockStatus);

  useEffect(() => {
    if (!propLockStatus) {
      checkLockStatus().then((status) => {
        setLockStatus(status);
        setLoading(false);

        // If not locked, call unlock callback
        if (!status.isLocked && onUnlock) {
          onUnlock();
        }
      });
    } else {
      // If propLockStatus is provided, use it directly
      setLockStatus(propLockStatus);
      setLoading(false);
    }
  }, [propLockStatus, onUnlock]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Checking license status...
        </Text>
      </View>
    );
  }

  // If not locked, don't render anything (app should proceed)
  if (!lockStatus?.isLocked) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        {/* Lock Icon */}
        <View style={[styles.iconContainer, { backgroundColor: theme.error + '20' }]}>
          <Lock size={64} color={theme.error} />
        </View>

        {/* Expired Message */}
        <Text style={[styles.title, { color: theme.text }]}>
          Trial Period Expired
        </Text>
        <Text style={[styles.message, { color: theme.textSecondary }]}>
          {lockStatus.message}
        </Text>

        {/* Dates Info */}
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.infoRow}>
            <Calendar size={20} color={theme.textSecondary} />
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                Installation Date
              </Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {lockStatus.installDate ? formatDate(lockStatus.installDate) : 'Unknown'}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.infoRow}>
            <AlertCircle size={20} color={theme.error} />
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                Expiration Date
              </Text>
              <Text style={[styles.infoValue, { color: theme.error }]}>
                {lockStatus.expirationDate ? formatDate(lockStatus.expirationDate) : 'Unknown'}
              </Text>
            </View>
          </View>
        </View>

        {/* Warning */}
        <View style={[styles.warningCard, { backgroundColor: theme.error + '10', borderColor: theme.error }]}>
          <AlertCircle size={24} color={theme.error} />
          <Text style={[styles.warningText, { color: theme.error }]}>
            This application is locked and cannot be used. Please contact the administrator for a valid license.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  infoCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  warningCard: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});
