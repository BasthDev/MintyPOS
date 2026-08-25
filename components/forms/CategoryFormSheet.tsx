import { DripSheet } from '../Sheet';
import { DripInput } from '../Input';
import { DripButton } from '../Button';
import { Folder } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../constants/colorTheme';

interface CategoryFormSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string }) => void;
  initialData?: { name: string } | null;
  mode: 'create' | 'edit';
}

export const CategoryFormSheet: React.FC<CategoryFormSheetProps> = ({
  visible,
  onClose,
  onSubmit,
  initialData,
  mode,
}) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
  });
  const [errors, setErrors] = useState<{ name?: string }>({});

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setFormData({
          name: initialData.name || '',
        });
      } else {
        setFormData({
          name: '',
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
    const newErrors: { name?: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Name must not exceed 50 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit({
        name: formData.name.trim(),
      });
    }
  };

  const footer = (
    <DripButton
      title={mode === 'create' ? 'Create Category' : 'Update Category'}
      onPress={handleSubmit}
    />
  );

  return (
    <DripSheet
      visible={visible}
      onClose={onClose}
      title={mode === 'create' ? 'Add New Category' : 'Edit Category'}
      headerIcon={<Folder size={20} color={theme.primary} />}
      footer={footer}
    >
      <View>
        <DripInput
          label="Category Name"
          value={formData.name}
          onChangeText={(text) => handleChange('name', text)}
          error={errors.name}
          placeholder="Enter category name"
        />
      </View>
    </DripSheet>
  );
};