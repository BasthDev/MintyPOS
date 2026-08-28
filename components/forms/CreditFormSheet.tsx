import { useTheme } from '@/constants/colorTheme';
import { getDatabase } from '@/lib/database';
import { formatCurrency } from '@/lib/utils';
import { CustomerProcess } from '@/processes/customerProcess';
import { useStore } from '@/store/useStore';
import { Wallet } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { DripButton } from '../Button';
import { DeskInput } from '../DeskInput';
import { DripInput } from '../Input';
import { DripSheet } from '../Sheet';

interface CreditFormSheetProps {
  visible: boolean;
  onClose: () => void;
  customerId: number;
  customerName: string;
  currentBalance: number;
  onSuccess?: () => void;
}

export const CreditFormSheet: React.FC<CreditFormSheetProps> = ({
  visible,
  onClose,
  customerId,
  customerName,
  currentBalance,
  onSuccess,
}) => {
  const { theme } = useTheme();
  const currency = useStore((state) => state.currency);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const amountNum = parseFloat(amount);
    
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0');
      return;
    }

    setLoading(true);
    try {
      const db = await getDatabase();
      const result = await CustomerProcess.depositCredit(
        db,
        customerId,
        amountNum,
        notes || 'Credit deposit'
      );

      if (result.success) {
        Alert.alert(
          'Success',
          `Successfully added ${formatCurrency(amountNum)} to ${customerName}'s balance`,
          [
            {
              text: 'OK',
              onPress: () => {
                setAmount('');
                setNotes('');
                onClose();
                onSuccess?.();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to add credit');
      }
    } catch (error: any) {
      console.error('Failed to add credit:', error);
      Alert.alert('Error', error?.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DripSheet
      visible={visible}
      onClose={onClose}
      title="Add Store Credit"
      headerIcon={<Wallet size={20} color={theme.primary} />}
      footer={
        <DripButton
          title={loading ? 'Processing...' : 'Add Credit'}
          onPress={handleSubmit}
          loading={loading}
          disabled={loading || !amount}
          style={{ width: 140 }}
        />
      }
    >
      <View style={{ gap: 16 }}>
        {/* Customer Info Card */}
        <View style={[styles.infoCard, { backgroundColor: theme.input, borderColor: theme.border }]}>
          <Text style={[styles.customerName, { color: theme.text }]}>{customerName}</Text>
          <View style={styles.balanceRow}>
            <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>Current Balance:</Text>
            <Text style={[styles.balanceValue, { color: theme.primary }]}>
              {formatCurrency(currentBalance)}
            </Text>
          </View>
        </View>

        {/* Amount Input */}
        <DripInput
          label="Amount to Add"
          placeholder="0.00"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          leftIcon={<Wallet size={20} color={theme.textSecondary} />}
        />

        {/* Notes Input */}
        <DeskInput
          label="Notes (Optional)"
          placeholder="Reason for credit deposit..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />
      </View>
    </DripSheet>
  );
};

const styles = StyleSheet.create({
  infoCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: '700',
  },
});
