import { useTheme } from '@/constants/colorTheme';
import { useStore } from '@/store/useStore';
import { Percent, Receipt } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DripButton } from '../Button';
import { DripInput } from '../Input';
import { DripSheet } from '../Sheet';

export interface TaxFormData {
  name: string;
  rate: number;
  type: 'percentage' | 'flat';
}

interface TaxFormSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: TaxFormData) => void;
  initialData?: {
    name: string;
    rate: number;
    type: 'percentage' | 'flat';
  };
  mode: 'create' | 'edit';
  loading?: boolean;
}

export const TaxFormSheet: React.FC<TaxFormSheetProps> = ({
  visible,
  onClose,
  onSubmit,
  initialData,
  mode,
  loading = false,
}) => {
  const { theme } = useTheme();
  const currency = useStore((state) => state.currency);

  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  const [type, setType] = useState<'percentage' | 'flat'>('percentage');
  const [errors, setErrors] = useState<{ name?: string; rate?: string }>({});

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setName(initialData.name || '');
        setRate(initialData.rate ? initialData.rate.toString() : '');
        setType(initialData.type || 'percentage');
      } else {
        setName('');
        setRate('10');
        setType('percentage');
      }
      setErrors({});
    }
  }, [visible, initialData]);

  const validateForm = () => {
    const newErrors: { name?: string; rate?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Tax / Charge name is required (e.g. PB1, Service Charge)';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    const rateNum = parseFloat(rate);
    if (!rate || isNaN(rateNum) || rateNum < 0) {
      newErrors.rate = 'Please enter a valid positive rate';
    } else if (type === 'percentage' && rateNum > 100) {
      newErrors.rate = 'Percentage rate cannot exceed 100%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    onSubmit({
      name: name.trim(),
      rate: parseFloat(rate),
      type,
    });
  };

  const footer = (
    <DripButton
      title={loading ? 'Saving...' : mode === 'create' ? 'Create Tax Rule' : 'Save Changes'}
      onPress={handleSubmit}
      disabled={loading}
    />
  );

  return (
    <DripSheet
      visible={visible}
      onClose={onClose}
      title={mode === 'create' ? 'Add Tax / Service Charge' : 'Edit Tax Rule'}
      headerIcon={<Receipt size={20} color={theme.primary} />}
      footer={footer}
    >
      <View style={styles.container}>
        <DripInput
          label="Tax or Charge Name"
          placeholder="e.g. PB1 (Pajak Restoran), Service Charge 5%, Takeaway Fee"
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
          }}
          error={errors.name}
        />

        {/* Rate Type Selector */}
        <Text style={[styles.fieldLabel, { color: theme.text }]}>Rate Type</Text>
        <View style={styles.typeSelectorRow}>
          <TouchableOpacity
            style={[
              styles.typeOption,
              { borderColor: theme.border, backgroundColor: theme.card },
              type === 'percentage' && {
                backgroundColor: theme.primary,
                borderColor: theme.primary,
              },
            ]}
            onPress={() => setType('percentage')}
          >
            <Text
              style={[
                styles.typeOptionText,
                { color: theme.textSecondary },
                type === 'percentage' && { color: '#FFFFFF', fontWeight: '700' },
              ]}
            >
              Percentage (%)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeOption,
              { borderColor: theme.border, backgroundColor: theme.card },
              type === 'flat' && {
                backgroundColor: theme.primary,
                borderColor: theme.primary,
              },
            ]}
            onPress={() => setType('flat')}
          >
            <Text
              style={[
                styles.typeOptionText,
                { color: theme.textSecondary },
                type === 'flat' && { color: '#FFFFFF', fontWeight: '700' },
              ]}
            >
              Flat Amount ({currency?.symbol || '$'})
            </Text>
          </TouchableOpacity>
        </View>

        <DripInput
          label={type === 'percentage' ? 'Rate Percentage (%)' : `Flat Amount (${currency?.symbol || '$'})`}
          placeholder={type === 'percentage' ? '10' : '5000'}
          keyboardType="decimal-pad"
          value={rate}
          onChangeText={(text) => {
            setRate(text);
            if (errors.rate) setErrors((prev) => ({ ...prev, rate: undefined }));
          }}
          error={errors.rate}
        />
      </View>
    </DripSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: -4,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeOptionText: {
    fontSize: 13,
  },
});
