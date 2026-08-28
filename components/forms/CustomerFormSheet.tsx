import { useTheme } from '@/constants/colorTheme';
import { CustomerInput } from '@/validators/customerValidator';
import { FileText, Mail, Phone, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { DripButton } from '../Button';
import { DeskInput } from '../DeskInput';
import { DripInput } from '../Input';
import { DripSheet } from '../Sheet';

interface CustomerFormSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CustomerInput) => void;
  initialData?: {
    name: string;
    phone?: string;
    email?: string;
    notes?: string;
  };
  mode: 'create' | 'edit';
  loading?: boolean;
}

export const CustomerFormSheet: React.FC<CustomerFormSheetProps> = ({
  visible,
  onClose,
  onSubmit,
  initialData,
  mode,
  loading = false,
}) => {
  const { theme } = useTheme();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setName(initialData.name || '');
        setPhone(initialData.phone || '');
        setEmail(initialData.email || '');
        setNotes(initialData.notes || '');
      } else {
        setName('');
        setPhone('');
        setEmail('');
        setNotes('');
      }
      setErrors({});
    }
  }, [visible, initialData]);

  const handleSubmit = () => {
    const newErrors: { name?: string; email?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Customer name is required';
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = 'Invalid email address format';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <DripSheet
      visible={visible}
      onClose={onClose}
      title={mode === 'create' ? 'New Customer' : 'Edit Customer'}
      headerIcon={<User size={22} color={theme.primary} />}
      footer={
        <View style={styles.footerRow}>
          <View style={{ flex: 1 }}>
            <DripButton
              title="Cancel"
              variant="secondary"
              onPress={onClose}
              disabled={loading}
            />
          </View>
          <View style={{ flex: 1 }}>
            <DripButton
              title={mode === 'create' ? 'Create Customer' : 'Save Changes'}
              onPress={handleSubmit}
              loading={loading}
            />
          </View>
        </View>
      }
    >
      <View style={styles.container}>
        <DripInput
          label="Customer Name *"
          placeholder="e.g. John Smith"
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
          }}
          error={errors.name}
          leftIcon={<User size={18} color={theme.textSecondary} />}
        />

        <DripInput
          label="Phone Number"
          placeholder="e.g. +1 555 0192"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          leftIcon={<Phone size={18} color={theme.textSecondary} />}
        />

        <DripInput
          label="Email Address"
          placeholder="e.g. john@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
          }}
          error={errors.email}
          leftIcon={<Mail size={18} color={theme.textSecondary} />}
        />

        <DeskInput
          label="Notes / Address (Optional)"
          placeholder="e.g. VIP Customer, prefers extra hot latte"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          leftIcon={<FileText size={18} color={theme.textSecondary} />}
        />
      </View>
    </DripSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
});
