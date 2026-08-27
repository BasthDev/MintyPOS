import { Layers, Plus, Trash2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../constants/colorTheme';
import { dbOperations, getDatabase } from '../../lib/database';
import { useStore } from '../../store/useStore';
import { DripButton } from '../Button';
import { DripDatePicker } from '../DatePicker';
import { DripDropdown } from '../Dropdown';
import { DripInput } from '../Input';
import { DripSheet } from '../Sheet';

interface RestockItem {
  id: string;
  ingredientId: string;
  supplierId: string;
  quantityBought: string;
  boughtUnit: string;
  unitMultiplier: string;
  totalCostPaid: string;
  expirationDate?: string;
}

interface InventoryFormSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    items: Array<{
      ingredientId: number;
      supplierId: number;
      quantityBought: number;
      boughtUnit: string;
      unitMultiplier: number;
      totalCostPaid: number;
      expirationDate?: string;
    }>;
  }) => void;
  mode: 'create';
}

export const InventoryFormSheet: React.FC<InventoryFormSheetProps> = ({
  visible,
  onClose,
  onSubmit,
  mode,
}) => {
  const { theme } = useTheme();
  const currency = useStore((state) => state.currency);
  const [items, setItems] = useState<RestockItem[]>([
    { id: '1', ingredientId: '', supplierId: '', quantityBought: '', boughtUnit: '', unitMultiplier: '', totalCostPaid: '' },
  ]);
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});
  const [ingredients, setIngredients] = useState<Array<any>>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: number; name: string }>>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setItems([{ id: '1', ingredientId: '', supplierId: '', quantityBought: '', boughtUnit: '', unitMultiplier: '', totalCostPaid: '' }]);
      setErrors({});
    }
  }, [visible]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const db = await getDatabase();
      const [ingredientList, supplierList] = await Promise.all([
        dbOperations.getAllIngredients(db),
        dbOperations.getAllSuppliers(db),
      ]);
      setIngredients(ingredientList);
      setSuppliers(supplierList);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), ingredientId: '', supplierId: '', quantityBought: '', boughtUnit: '', unitMultiplier: '', totalCostPaid: '' },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof RestockItem, value: string) => {
    setItems(
      items.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const validateForm = () => {
    const newErrors: Record<string, Record<string, string>> = {};

    items.forEach((item, index) => {
      const itemErrors: Record<string, string> = {};

      if (!item.ingredientId) {
        itemErrors.ingredientId = 'Ingredient is required';
      }

      if (!item.supplierId) {
        itemErrors.supplierId = 'Supplier is required';
      }

      if (!item.quantityBought) {
        itemErrors.quantityBought = 'Quantity is required';
      } else {
        const quantity = parseFloat(item.quantityBought);
        if (isNaN(quantity) || quantity <= 0) {
          itemErrors.quantityBought = 'Quantity must be a positive number';
        }
      }

      if (!item.boughtUnit) {
        itemErrors.boughtUnit = 'Unit is required';
      }

      if (!item.unitMultiplier) {
        itemErrors.unitMultiplier = 'Unit multiplier is required';
      } else {
        const multiplier = parseFloat(item.unitMultiplier);
        if (isNaN(multiplier) || multiplier <= 0) {
          itemErrors.unitMultiplier = 'Multiplier must be a positive number';
        }
      }

      if (!item.totalCostPaid) {
        itemErrors.totalCostPaid = 'Total cost is required';
      } else {
        const cost = parseFloat(item.totalCostPaid);
        if (isNaN(cost) || cost <= 0) {
          itemErrors.totalCostPaid = 'Total cost must be a positive number';
        }
      }

      if (Object.keys(itemErrors).length > 0) {
        newErrors[item.id] = itemErrors;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit({
        items: items.map(item => ({
          ingredientId: parseInt(item.ingredientId),
          supplierId: parseInt(item.supplierId),
          quantityBought: parseFloat(item.quantityBought),
          boughtUnit: item.boughtUnit,
          unitMultiplier: parseFloat(item.unitMultiplier),
          totalCostPaid: parseFloat(item.totalCostPaid),
          expirationDate: item.expirationDate,
        })),
      });
    }
  };

  const ingredientOptions = React.useMemo(() => 
    ingredients.map(ingredient => ({
      label: `${ingredient.name} (${ingredient.unit_symbol})`,
      value: ingredient.id.toString(),
    })), [ingredients]
  );

  const supplierOptions = React.useMemo(() =>
    suppliers.map(supplier => ({
      label: supplier.name,
      value: supplier.id.toString(),
    })), [suppliers]
  );

  const getUnitOptions = React.useCallback((ingredientId: string) => {
    const selectedIngredient = ingredients.find(i => i.id.toString() === ingredientId);
    if (!selectedIngredient) return [];

    const baseUnitOption = {
      label: `Base Unit (${selectedIngredient.unit_symbol})`,
      value: 'base',
      multiplier: '1',
    };

    return [baseUnitOption];
  }, [ingredients]);

  const handleIngredientChange = useCallback((id: string, value: string) => {
    // Auto-select base unit and update all fields in one state update
    const unitOptions = getUnitOptions(value);
    const boughtUnit = unitOptions.length > 0 ? unitOptions[0].value : '';
    const unitMultiplier = unitOptions.length > 0 ? unitOptions[0].multiplier : '';
    
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === id 
          ? { ...item, ingredientId: value, boughtUnit, unitMultiplier }
          : item
      )
    );
  }, [getUnitOptions]);

  const handleUnitChange = (id: string, value: string) => {
    const unitOptions = getUnitOptions(items.find(i => i.id === id)?.ingredientId || '');
    const selectedOption = unitOptions.find(opt => opt.value === value);
    if (selectedOption) {
      updateItem(id, 'boughtUnit', value);
      updateItem(id, 'unitMultiplier', selectedOption.multiplier);
    }
  };

  const getBaseUnitEquivalent = (item: RestockItem) => {
    const selectedIngredient = ingredients.find(i => i.id.toString() === item.ingredientId);
    if (!selectedIngredient || !item.quantityBought || !item.unitMultiplier) return '';
    
    const quantity = parseFloat(item.quantityBought);
    const multiplier = parseFloat(item.unitMultiplier);
    if (isNaN(quantity) || isNaN(multiplier)) return '';
    
    const baseQuantity = quantity * multiplier;
    return `(in base unit: ${baseQuantity}${selectedIngredient.unit_symbol})`;
  };

  const footer = (
    <DripButton
      title="Restock Items"
      onPress={handleSubmit}
      loading={loadingData}
    />
  );

  return (
    <DripSheet
      visible={visible}
      onClose={onClose}
      title="Restock Inventory"
      headerIcon={<Layers size={20} color={theme.primary} />}
      footer={footer}
      loading={loadingData}
    >
      <ScrollView style={styles.scrollContainer}>
        {items.map((item, index) => (
          <View key={item.id} style={[styles.itemContainer, { borderColor: theme.border }]}>
            <View style={styles.itemHeader}>
              <Text style={[styles.itemLabel, { color: theme.text }]}>Item {index + 1}</Text>
              {items.length > 1 && (
                <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.removeButton}>
                  <Trash2 size={16} color={theme.error} />
                </TouchableOpacity>
              )}
            </View>

            <DripDropdown
              label="Ingredient"
              options={ingredientOptions}
              value={item.ingredientId}
              onSelect={(value) => handleIngredientChange(item.id, value)}
              error={errors[item.id]?.ingredientId}
              disabled={loadingData}
            />

            <DripDropdown
              label="Supplier"
              options={supplierOptions}
              value={item.supplierId}
              onSelect={(value) => updateItem(item.id, 'supplierId', value)}
              error={errors[item.id]?.supplierId}
              disabled={loadingData}
            />

            <DripInput
              label="Quantity Bought"
              value={item.quantityBought}
              onChangeText={(text) => updateItem(item.id, 'quantityBought', text)}
              error={errors[item.id]?.quantityBought}
              placeholder="0"
              keyboardType="numeric"
              helperText={getBaseUnitEquivalent(item)}
            />

            <DripDropdown
              label="Unit"
              options={getUnitOptions(item.ingredientId)}
              value={item.boughtUnit}
              onSelect={(value) => handleUnitChange(item.id, value)}
              error={errors[item.id]?.boughtUnit}
              disabled={!item.ingredientId}
            />

            <DripInput
              label={`Total Cost (${currency?.symbol || '$'})`}
              value={item.totalCostPaid}
              onChangeText={(text) => updateItem(item.id, 'totalCostPaid', text)}
              error={errors[item.id]?.totalCostPaid}
              placeholder="0"
              keyboardType="numeric"
            />

            <DripDatePicker
              label="Expiration Date (Optional)"
              value={item.expirationDate}
              onSelect={(date) => updateItem(item.id, 'expirationDate', date)}
              placeholder="Select expiration date"
            />
          </View>
        ))}

        <TouchableOpacity
          onPress={addItem}
          style={[styles.addButton, { borderColor: theme.primary }]}
        >
          <Plus size={18} color={theme.primary} />
          <Text style={[styles.addButtonText, { color: theme.primary }]}>Add Another Item</Text>
        </TouchableOpacity>
      </ScrollView>
    </DripSheet>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  itemContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  removeButton: {
    padding: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    gap: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});