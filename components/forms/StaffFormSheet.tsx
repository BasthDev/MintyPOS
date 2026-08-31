import { DripButton } from '@/components/Button';
import { DripDropdown } from '@/components/Dropdown';
import { DripInput } from '@/components/Input';
import { DripSheet } from '@/components/Sheet';
import { useAuth } from '@/constants/auth';
import { useTheme } from '@/constants/colorTheme';
import { useStoreContext } from '@/constants/storeContext';
import { StaffProcess } from '@/processes/staffProcess';
import { StaffRecord } from '@/services/staffService';
import { StaffInput, StaffValidator } from '@/validators/staffValidator';
import { KeyRound, Phone, ShieldCheck, User, UserCheck } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

interface StaffFormSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  staff?: StaffRecord | null;
}

export const StaffFormSheet: React.FC<StaffFormSheetProps> = ({
  visible,
  onClose,
  onSuccess,
  staff,
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { activeStore } = useStoreContext();

  const isEditing = !!staff;

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Manager' | 'Cashier' | 'Staff'>('Cashier');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (staff) {
      setName(staff.name || '');
      setUsername(staff.username || '');
      setPassword('');
      setRole(staff.role || 'Cashier');
      setPhone(staff.phone || '');
    } else {
      setName('');
      setUsername('');
      setPassword('');
      setRole('Cashier');
      setPhone('');
    }
    setErrors({});
  }, [staff, visible]);

  const handleSubmit = async () => {
    const input: StaffInput = {
      name: name.trim(),
      username: username.toLowerCase().trim(),
      password: password ? password.trim() : undefined,
      role,
      storeId: staff?.store_id || activeStore?.id || user?.storeId || 'default-store',
      phone: phone.trim(),
    };

    const validation = StaffValidator.validate(input, isEditing);
    if (!validation.isValid) {
      const errorMap: { [key: string]: string } = {};
      validation.errors.forEach((err) => {
        if (err.toLowerCase().includes('name')) errorMap.name = err;
        else if (err.toLowerCase().includes('username')) errorMap.username = err;
        else if (err.toLowerCase().includes('password')) errorMap.password = err;
        else if (err.toLowerCase().includes('role')) errorMap.role = err;
      });
      setErrors(errorMap);
      return;
    }

    setLoading(true);
    try {
      const orgId = user?.orgId || 'default-org';
      const ownerId = user?.id || 'owner';

      const res = await StaffProcess.create(orgId, ownerId, input);
      if (res.success) {
        Alert.alert(
          'Success',
          isEditing ? 'Staff member updated successfully' : 'New staff account created successfully'
        );
        onSuccess();
        onClose();
      } else {
        Alert.alert('Error', res.error || 'Failed to save staff member');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { label: 'Cashier (POS & Sales only)', value: 'Cashier' },
    { label: 'Manager (Sales, Inventory & Reports)', value: 'Manager' },
    { label: 'Staff (General Assistant)', value: 'Staff' },
  ];

  const footer = (
    <DripButton
      title={loading ? 'Saving...' : isEditing ? 'Update Staff' : 'Create Staff'}
      variant="primary"
      onPress={handleSubmit}
      loading={loading}
    />
  );

  return (
    <DripSheet
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Edit Staff Member' : 'Add New Staff Member'}
      headerIcon={<User size={20} color={theme.primary} />}
      footer={footer}
    >
      <View style={styles.container}>
        <DripInput
          label="Full Name *"
          placeholder="e.g. Sarah Jenkins"
          value={name}
          onChangeText={(v) => {
            setName(v);
            if (errors.name) setErrors({ ...errors, name: '' });
          }}
          error={errors.name}
          leftIcon={<User size={18} color={theme.textTertiary} />}
        />

        <DripInput
          label="Username (for POS Login) *"
          placeholder="e.g. sarah_cashier"
          value={username}
          onChangeText={(v) => {
            setUsername(v);
            if (errors.username) setErrors({ ...errors, username: '' });
          }}
          error={errors.username}
          autoCapitalize="none"
          leftIcon={<UserCheck size={18} color={theme.textTertiary} />}
        />

        <DripInput
          label={isEditing ? 'New Password (leave blank to keep current)' : 'Password *'}
          placeholder="••••••••"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            if (errors.password) setErrors({ ...errors, password: '' });
          }}
          secureTextEntry
          error={errors.password}
          leftIcon={<KeyRound size={18} color={theme.textTertiary} />}
        />

        <DripDropdown
          label="Assigned Role *"
          options={roleOptions}
          value={role}
          onSelect={(val) => setRole(val as any)}
        />

        <DripInput
          label="Phone Number"
          placeholder="e.g. +62 812 3456 7890"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          leftIcon={<Phone size={18} color={theme.textTertiary} />}
        />
      </View>
    </DripSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
});
