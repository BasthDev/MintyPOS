import { DripSheet } from '../Sheet';
import { DripInput } from '../Input';
import { DripButton } from '../Button';
import { DripDropdown } from '../Dropdown';
import { Scale } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../constants/colorTheme';
import { getDatabase } from '../../lib/database';
import { dbOperations } from '../../lib/database';

interface IngredientFormSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; baseUnitId: number; minimumStock: number }) => void;
  initialData?: {
    name?: string;
    baseUnitId?: number;
    minimumStock?: number;
    base_unit_id?: number;
    minimum_stock?: number;
  } | null;
  mode: 'create' | 'edit';
}

export const IngredientFormSheet: React.FC<IngredientFormSheetProps> = ({
  visible,
  onClose,
  onSubmit,
  initialData,
  mode,
}) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    baseUnitId: '',
    minimumStock: '',
  });
  const [errors, setErrors] = useState<{ name?: string; baseUnitId?: string; minimumStock?: string }>({});
  const [units, setUnits] = useState<Array<{ id: number; name: string; symbol: string }>>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  useEffect(() => {
    if (visible) {
      loadUnits();
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          baseUnitId: (initialData.baseUnitId ?? initialData.base_unit_id ?? '').toString(),
          minimumStock: (initialData.minimumStock ?? initialData.minimum_stock ?? '').toString(),
        });
      } else {
        setFormData({
          name: '',
          baseUnitId: '',
          minimumStock: '',
        });
      }
      setErrors({});
    }
  }, [visible]);

  const loadUnits = async () => {
    setLoadingUnits(true);
    try {
      const db = await getDatabase();
      const unitList = await dbOperations.getAllUnits(db);
      setUnits(unitList);
    } catch (error) {
      console.error('Failed to load units:', error);
    } finally {
      setLoadingUnits(false);
    }
  };

  const unitOptions = units.map(unit => ({
    label: `${unit.name} (${unit.symbol})`,
    value: unit.id.toString(),
  }));

  const validateForm = () => {
    const newErrors: { name?: string; baseUnitId?: string; minimumStock?: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Ingredient name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.baseUnitId) {
      newErrors.baseUnitId = 'Base unit is required';
    }

    if (formData.minimumStock === '' || formData.minimumStock === undefined) {
      newErrors.minimumStock = 'Minimum stock is required';
    } else {
      const stock = parseFloat(formData.minimumStock);
      if (isNaN(stock) || stock < 0) {
        newErrors.minimumStock = 'Minimum stock must be a positive number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit({
        name: formData.name.trim(),
        baseUnitId: parseInt(formData.baseUnitId, 10),
        minimumStock: parseFloat(formData.minimumStock) || 0,
      });
    }
  };

  const footer = (
    <DripButton
      title={mode === 'create' ? 'Create Ingredient' : 'Update Ingredient'}
      onPress={handleSubmit}
      loading={loadingUnits}
    />
  );

  return (
    <DripSheet
      visible={visible}
      onClose={onClose}
      title={mode === 'create' ? 'Add New Ingredient' : 'Edit Ingredient'}
      headerIcon={<Scale size={20} color={theme.primary} />}
      footer={footer}
      loading={loadingUnits}
    >
      <View>
        <DripInput
          label="Ingredient Name"
          value={formData.name}
          onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
          error={errors.name}
          placeholder="Enter ingredient name"
        />

        <DripDropdown
          label="Base Unit"
          options={unitOptions}
          value={formData.baseUnitId}
          onSelect={(value) => setFormData(prev => ({ ...prev, baseUnitId: value }))}
          error={errors.baseUnitId}
          disabled={loadingUnits}
        />

        <DripInput
          label="Minimum Stock"
          value={formData.minimumStock}
          onChangeText={(text) => {
            const cleaned = text.replace(/[^0-9.]/g, '');
            setFormData(prev => ({ ...prev, minimumStock: cleaned }));
          }}
          error={errors.minimumStock}
          placeholder="0"
          keyboardType="decimal-pad"
        />
      </View>
    </DripSheet>
  );
};