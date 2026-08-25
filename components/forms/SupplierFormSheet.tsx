import { DripSheet } from '../Sheet';
import { DripInput } from '../Input';
import { DripButton } from '../Button';
import { Truck } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../constants/colorTheme';

interface SupplierFormSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; contact: string }) => void;
  initialData?: { name: string; contact?: string } | null;
  mode: 'create' | 'edit';
}

export const SupplierFormSheet: React.FC<SupplierFormSheetProps> = ({
  visible,
  onClose,
  onSubmit,
  initialData,
  mode,
}) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
  });
  const [errors, setErrors] = useState<{ name?: string; contact?: string }>({});

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          contact: initialData.contact || '',
        });
      } else {
        setFormData({
          name: '',
          contact: '',
        });
      }
      setErrors({});
    }
  }, [visible]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const validateForm = () => {
    const newErrors: { name?: string; contact?: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Supplier name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (formData.contact && formData.contact.length > 100) {
      newErrors.contact = 'Contact must not exceed 100 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit({
        name: formData.name.trim(),
        contact: formData.contact.trim(),
      });
    }
  };

  const footer = (
    <DripButton
      title={mode === 'create' ? 'Create Supplier' : 'Update Supplier'}
      onPress={handleSubmit}
    />
  );

  return (
    <DripSheet
      visible={visible}
      onClose={onClose}
      title={mode === 'create' ? 'Add New Supplier' : 'Edit Supplier'}
      headerIcon={<Truck size={20} color={theme.primary} />}
      footer={footer}
    >
      <View>
        <DripInput
          label="Supplier Name"
          value={formData.name}
          onChangeText={(text) => handleChange('name', text)}
          error={errors.name}
          placeholder="Enter supplier name"
        />

        <DripInput
          label="Contact (Optional)"
          value={formData.contact}
          onChangeText={(text) => handleChange('contact', text)}
          error={errors.contact}
          placeholder="Phone, email, or address"
        />
      </View>
    </DripSheet>
  );
};