import { useTheme } from '@/constants/colorTheme';
import { CreditCard, QrCode, Sliders, Wallet } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DripButton } from '../Button';
import { DripInput } from '../Input';
import { DripSheet } from '../Sheet';

const PRESET_TYPES = [
  { key: 'qris', label: 'QRIS', icon: QrCode },
  { key: 'transfer', label: 'Bank Transfer', icon: CreditCard },
  { key: 'ewallet', label: 'E-Wallet', icon: Wallet },
  { key: 'card', label: 'Card (Debit/Credit)', icon: CreditCard },
  { key: 'other', label: 'Other', icon: Sliders },
];

export interface PaymentMethodFormData {
  typeKey: string;
  typeLabel: string;
  methodName: string;
}

interface PaymentMethodFormSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentMethodFormData) => void;
  initialData?: {
    typeKey: string;
    typeLabel: string;
    methodName: string;
  };
  mode: 'create' | 'edit';
  loading?: boolean;
}

export const PaymentMethodFormSheet: React.FC<PaymentMethodFormSheetProps> = ({
  visible,
  onClose,
  onSubmit,
  initialData,
  mode,
  loading = false,
}) => {
  const { theme } = useTheme();

  const [typeKey, setTypeKey] = useState('qris');
  const [typeLabel, setTypeLabel] = useState('QRIS');
  const [customTypeLabel, setCustomTypeLabel] = useState('');
  const [methodName, setMethodName] = useState('');
  const [errors, setErrors] = useState<{ methodName?: string; customTypeLabel?: string }>({});

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setTypeKey(initialData.typeKey || 'qris');
        setTypeLabel(initialData.typeLabel || 'QRIS');
        setCustomTypeLabel(initialData.typeLabel || '');
        setMethodName(initialData.methodName || '');
      } else {
        setTypeKey('qris');
        setTypeLabel('QRIS');
        setCustomTypeLabel('');
        setMethodName('');
      }
      setErrors({});
    }
  }, [visible, initialData]);

  const validateForm = () => {
    const newErrors: { methodName?: string; customTypeLabel?: string } = {};

    if (!methodName.trim()) {
      newErrors.methodName = 'Method/Bank name is required (e.g. BYOND, DANA, BCA)';
    } else if (methodName.trim().length < 2) {
      newErrors.methodName = 'Name must be at least 2 characters';
    }

    if (typeKey === 'other' && !customTypeLabel.trim()) {
      newErrors.customTypeLabel = 'Custom type name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    let finalTypeLabel = typeLabel;
    let finalTypeKey = typeKey;

    if (typeKey === 'other' && customTypeLabel.trim()) {
      finalTypeLabel = customTypeLabel.trim();
      finalTypeKey = customTypeLabel.trim().toLowerCase().replace(/\s+/g, '_');
    }

    onSubmit({
      typeKey: finalTypeKey,
      typeLabel: finalTypeLabel,
      methodName: methodName.trim(),
    });
  };

  const footer = (
    <DripButton
      title={loading ? 'Saving...' : mode === 'create' ? 'Add Payment Method' : 'Save Changes'}
      onPress={handleSubmit}
      disabled={loading}
    />
  );

  return (
    <DripSheet
      visible={visible}
      onClose={onClose}
      title={mode === 'create' ? 'Add Payment Method' : 'Edit Payment Method'}
      headerIcon={<CreditCard size={20} color={theme.primary} />}
      footer={footer}
    >
      <View style={styles.container}>
        {mode === 'create' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>1. Select Payment Type</Text>
            <View style={styles.typePresetGrid}>
              {PRESET_TYPES.map((preset) => {
                const isSelected = typeKey === preset.key;
                const IconComp = preset.icon;

                return (
                  <TouchableOpacity
                    key={preset.key}
                    activeOpacity={0.7}
                    style={[
                      styles.typeChip,
                      { borderColor: theme.border, backgroundColor: theme.card },
                      isSelected && {
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                      },
                    ]}
                    onPress={() => {
                      setTypeKey(preset.key);
                      setTypeLabel(preset.label);
                    }}
                  >
                    <IconComp size={16} color={isSelected ? '#FFFFFF' : theme.textSecondary} />
                    <Text
                      style={[
                        styles.typeChipText,
                        { color: theme.textSecondary },
                        isSelected && { color: '#FFFFFF', fontWeight: '700' },
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {typeKey === 'other' && (
              <DripInput
                label="Custom Type Name"
                placeholder="e.g. Voucher, Gift Card, Crypto"
                value={customTypeLabel}
                onChangeText={(text) => {
                  setCustomTypeLabel(text);
                  if (errors.customTypeLabel) setErrors((prev) => ({ ...prev, customTypeLabel: undefined }));
                }}
                error={errors.customTypeLabel}
                style={{ marginTop: 10 }}
              />
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {mode === 'create' ? '2. Provider / Bank Name' : 'Payment Method Details'}
          </Text>
          <DripInput
            label="Method / Bank / Provider Name"
            placeholder="e.g. BYOND, DANA, GoPay, BCA, Mandiri"
            value={methodName}
            onChangeText={(text) => {
              setMethodName(text);
              if (errors.methodName) setErrors((prev) => ({ ...prev, methodName: undefined }));
            }}
            error={errors.methodName}
          />
        </View>
      </View>
    </DripSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  typePresetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  typeChipText: {
    fontSize: 12,
  },
});
