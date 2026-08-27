import { useTheme } from '@/constants/colorTheme';
import { useStore } from '@/store/useStore';
import { Tag } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DripButton } from '../Button';
import { DripInput } from '../Input';
import { DripSheet } from '../Sheet';

export interface DiscountFormData {
  name: string;
  type: 'percentage' | 'flat';
  value: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
}

interface DiscountFormSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: DiscountFormData) => void;
  initialData?: {
    name: string;
    type: 'percentage' | 'flat';
    value: number;
    minOrderAmount?: number;
    maxDiscountAmount?: number | null;
  };
  mode: 'create' | 'edit';
  loading?: boolean;
}

export const DiscountFormSheet: React.FC<DiscountFormSheetProps> = ({
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
  const [type, setType] = useState<'percentage' | 'flat'>('percentage');
  const [value, setValue] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [errors, setErrors] = useState<{ name?: string; value?: string }>({});

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setName(initialData.name || '');
        setType(initialData.type || 'percentage');
        setValue(initialData.value ? initialData.value.toString() : '');
        setMinOrder(initialData.minOrderAmount ? initialData.minOrderAmount.toString() : '');
        setMaxDiscount(initialData.maxDiscountAmount ? initialData.maxDiscountAmount.toString() : '');
      } else {
        setName('');
        setType('percentage');
        setValue('10');
        setMinOrder('0');
        setMaxDiscount('');
      }
      setErrors({});
    }
  }, [visible, initialData]);

  const validateForm = () => {
    const newErrors: { name?: string; value?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Discount name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    const valNum = parseFloat(value);
    if (!value || isNaN(valNum) || valNum <= 0) {
      newErrors.value = 'Please enter a valid discount value greater than 0';
    } else if (type === 'percentage' && valNum > 100) {
      newErrors.value = 'Percentage discount cannot exceed 100%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    onSubmit({
      name: name.trim(),
      type,
      value: parseFloat(value),
      minOrderAmount: minOrder ? parseFloat(minOrder) : 0,
      maxDiscountAmount: maxDiscount ? parseFloat(maxDiscount) : null,
    });
  };

  const footer = (
    <DripButton
      title={loading ? 'Saving...' : mode === 'create' ? 'Create Discount' : 'Save Changes'}
      onPress={handleSubmit}
      disabled={loading}
    />
  );

  return (
    <DripSheet
      visible={visible}
      onClose={onClose}
      title={mode === 'create' ? 'Add Discount Preset' : 'Edit Discount'}
      headerIcon={<Tag size={20} color={theme.primary} />}
      footer={footer}
    >
      <View style={styles.container}>
        <DripInput
          label="Discount Name"
          placeholder="e.g. Member 10%, Weekend Flash Sale, Grand Opening"
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
          }}
          error={errors.name}
        />

        {/* Discount Type Selector */}
        <Text style={[styles.fieldLabel, { color: theme.text }]}>Discount Type</Text>
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
          label={type === 'percentage' ? 'Percentage Value (%)' : `Discount Amount (${currency?.symbol || '$'})`}
          placeholder={type === 'percentage' ? '10' : '15000'}
          keyboardType="decimal-pad"
          value={value}
          onChangeText={(text) => {
            setValue(text);
            if (errors.value) setErrors((prev) => ({ ...prev, value: undefined }));
          }}
          error={errors.value}
        />

        <DripInput
          label={`Minimum Order Spend (${currency?.symbol || '$'}) (Optional)`}
          placeholder="0"
          keyboardType="decimal-pad"
          value={minOrder}
          onChangeText={setMinOrder}
        />

        {type === 'percentage' && (
          <DripInput
            label={`Max Discount Cap (${currency?.symbol || '$'}) (Optional)`}
            placeholder="e.g. 25000 (leave blank for no cap)"
            keyboardType="decimal-pad"
            value={maxDiscount}
            onChangeText={setMaxDiscount}
          />
        )}
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
