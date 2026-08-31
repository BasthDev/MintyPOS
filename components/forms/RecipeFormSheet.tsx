import { ChefHat, Layers, Plus, Scale, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../constants/colorTheme';
import { dbOperations, getDatabase, Ingredient, SemiProduct } from '../../lib/database';
import { DripButton } from '../Button';
import { DeskInput } from '../DeskInput';
import { DripDropdown } from '../Dropdown';
import { DripInput } from '../Input';
import { DripSheet } from '../Sheet';

interface RecipeComponentInput {
  id: string;
  itemType: 'ingredient' | 'semi_product';
  itemId: string;
  quantityNeededBase: string;
}

interface RecipeFormSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    ingredients: Array<{
      ingredientId?: number | null;
      semiProductId?: number | null;
      itemType: 'ingredient' | 'semi_product';
      quantityNeededBase: number;
    }>;
  }) => void;
  initialData?: {
    name: string;
    description: string;
    ingredients: Array<{
      ingredientId?: number | null;
      semiProductId?: number | null;
      itemType?: 'ingredient' | 'semi_product';
      quantityNeededBase: number;
    }>;
  };
  mode: 'create' | 'edit';
}

export const RecipeFormSheet: React.FC<RecipeFormSheetProps> = ({
  visible,
  onClose,
  onSubmit,
  initialData,
  mode,
}) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [components, setComponents] = useState<RecipeComponentInput[]>([
    { id: '1', itemType: 'ingredient', itemId: '', quantityNeededBase: '' },
  ]);
  const [errors, setErrors] = useState<{
    name?: string;
    components?: Record<string, { itemId?: string; quantityNeededBase?: string }>;
  }>({});
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
  const [availableSemiProducts, setAvailableSemiProducts] = useState<SemiProduct[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (visible) {
      loadMasterData();
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          description: initialData.description || '',
        });
        if (initialData.ingredients && Array.isArray(initialData.ingredients)) {
          setComponents(
            initialData.ingredients.map((ing: any, index: number) => {
              const itemType = ing.item_type || ing.itemType || (ing.semi_product_id || ing.semiProductId ? 'semi_product' : 'ingredient');
              const itemId = itemType === 'semi_product'
                ? (ing.semi_product_id ?? ing.semiProductId ?? '').toString()
                : (ing.ingredient_id ?? ing.ingredientId ?? '').toString();
              return {
                id: index.toString(),
                itemType,
                itemId,
                quantityNeededBase: (ing.quantityNeededBase ?? ing.quantity_needed_base ?? '').toString(),
              };
            })
          );
        } else {
          setComponents([{ id: '1', itemType: 'ingredient', itemId: '', quantityNeededBase: '' }]);
        }
      } else {
        setFormData({
          name: '',
          description: '',
        });
        setComponents([{ id: '1', itemType: 'ingredient', itemId: '', quantityNeededBase: '' }]);
      }
      setErrors({});
    }
  }, [visible, initialData]);

  const loadMasterData = async () => {
    setLoadingData(true);
    try {
      const db = await getDatabase();
      const [ingredientList, semiProductList] = await Promise.all([
        dbOperations.getAllIngredients(db),
        dbOperations.getAllSemiProducts(db),
      ]);
      setAvailableIngredients(ingredientList);
      setAvailableSemiProducts(semiProductList);
    } catch (error) {
      console.error('Failed to load recipe master data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const ingredientOptions = availableIngredients.map((ingredient) => ({
    label: `${ingredient.name} (${(ingredient as any).unit_symbol || 'unit'})`,
    value: ingredient.id.toString(),
  }));

  const semiProductOptions = availableSemiProducts.map((sp) => ({
    label: `[Semi-Product] ${sp.name} (${sp.base_unit_symbol || 'unit'})`,
    value: sp.id.toString(),
  }));

  const addComponent = () => {
    setComponents([
      ...components,
      { id: Date.now().toString(), itemType: 'ingredient', itemId: '', quantityNeededBase: '' },
    ]);
  };

  const removeComponent = (id: string) => {
    if (components.length > 1) {
      setComponents(components.filter((c) => c.id !== id));
    }
  };

  const updateComponent = (id: string, field: keyof RecipeComponentInput, value: any) => {
    setComponents(
      components.map((c) => {
        if (c.id !== id) return c;
        if (field === 'itemType') {
          return { ...c, itemType: value, itemId: '' };
        }
        return { ...c, [field]: value };
      })
    );
  };

  const validateForm = () => {
    const newErrors: {
      name?: string;
      components?: Record<string, { itemId?: string; quantityNeededBase?: string }>;
    } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Recipe name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Recipe name must be at least 2 characters';
    }

    const componentErrors: Record<string, { itemId?: string; quantityNeededBase?: string }> = {};

    components.forEach((c) => {
      const cErrors: { itemId?: string; quantityNeededBase?: string } = {};

      if (!c.itemId) {
        cErrors.itemId = `${c.itemType === 'semi_product' ? 'Semi-product' : 'Ingredient'} is required`;
      }

      if (!c.quantityNeededBase) {
        cErrors.quantityNeededBase = 'Quantity is required';
      } else {
        const quantity = parseFloat(c.quantityNeededBase);
        if (isNaN(quantity) || quantity <= 0) {
          cErrors.quantityNeededBase = 'Quantity must be a positive number';
        }
      }

      if (Object.keys(cErrors).length > 0) {
        componentErrors[c.id] = cErrors;
      }
    });

    if (Object.keys(componentErrors).length > 0) {
      newErrors.components = componentErrors;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit({
        name: formData.name.trim(),
        description: formData.description.trim(),
        ingredients: components.map((c) => ({
          ingredientId: c.itemType === 'ingredient' ? parseInt(c.itemId, 10) : null,
          semiProductId: c.itemType === 'semi_product' ? parseInt(c.itemId, 10) : null,
          itemType: c.itemType,
          quantityNeededBase: parseFloat(c.quantityNeededBase),
        })),
      });
    }
  };

  const footer = (
    <DripButton
      title={mode === 'create' ? 'Create Recipe' : 'Update Recipe'}
      onPress={handleSubmit}
      loading={loadingData}
    />
  );

  return (
    <DripSheet
      visible={visible}
      onClose={onClose}
      title={mode === 'create' ? 'Create Hybrid Product Recipe' : 'Edit Product Recipe'}
      headerIcon={<ChefHat size={20} color={theme.primary} />}
      footer={footer}
      loading={loadingData}
    >
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View>
          <DripInput
            label="Recipe Name (e.g. Nasi Goreng Spesial, Pizza Supreme)"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            error={errors.name}
            placeholder="Enter recipe name"
          />

          <DeskInput
            label="Description (Optional)"
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Enter recipe description..."
            numberOfLines={3}
          />

          <Text style={[styles.sectionTitle, { color: theme.text }]}>Recipe Components (Hybrid BOM)</Text>
          <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>
            Anda dapat menggabungkan bahan baku mentah langsung (Direct Ingredients) dan bahan setengah jadi (Semi-Products).
          </Text>

          {components.map((c, index) => {
            const isSemi = c.itemType === 'semi_product';
            const selectedItem = isSemi
              ? availableSemiProducts.find((sp) => sp.id.toString() === c.itemId)
              : availableIngredients.find((i) => i.id.toString() === c.itemId);
            const unitSymbol = isSemi
              ? (selectedItem as any)?.base_unit_symbol || 'unit'
              : (selectedItem as any)?.unit_symbol || 'unit';

            return (
              <View key={c.id} style={[styles.ingredientRow, { borderColor: theme.border, backgroundColor: theme.card }]}>
                <View style={styles.ingredientHeader}>
                  <Text style={[styles.ingredientLabel, { color: theme.primary }]}>
                    Component #{index + 1}
                  </Text>
                  {components.length > 1 && (
                    <TouchableOpacity onPress={() => removeComponent(c.id)} style={styles.removeButton}>
                      <Trash2 size={16} color={theme.error} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Toggle Component Type */}
                <View style={styles.typeSelectorRow}>
                  <TouchableOpacity
                    onPress={() => updateComponent(c.id, 'itemType', 'ingredient')}
                    style={[
                      styles.typeOptionBtn,
                      {
                        backgroundColor: !isSemi ? theme.primary : theme.input,
                        borderColor: !isSemi ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Scale size={14} color={!isSemi ? '#FFFFFF' : theme.textSecondary} />
                    <Text style={[styles.typeOptionText, { color: !isSemi ? '#FFFFFF' : theme.text }]}>
                      Raw Ingredient
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => updateComponent(c.id, 'itemType', 'semi_product')}
                    style={[
                      styles.typeOptionBtn,
                      {
                        backgroundColor: isSemi ? theme.primary : theme.input,
                        borderColor: isSemi ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Layers size={14} color={isSemi ? '#FFFFFF' : theme.textSecondary} />
                    <Text style={[styles.typeOptionText, { color: isSemi ? '#FFFFFF' : theme.text }]}>
                      Semi-Product
                    </Text>
                  </TouchableOpacity>
                </View>

                <DripDropdown
                  label={isSemi ? 'Select Semi-Product' : 'Select Raw Ingredient'}
                  options={isSemi ? semiProductOptions : ingredientOptions}
                  value={c.itemId}
                  onSelect={(value) => updateComponent(c.id, 'itemId', value)}
                  error={errors.components?.[c.id]?.itemId}
                  disabled={loadingData}
                  placeholder={isSemi ? 'Choose semi-finished product' : 'Choose raw ingredient'}
                />

                <DripInput
                  label={`Quantity (${unitSymbol})`}
                  value={c.quantityNeededBase}
                  onChangeText={(text) => updateComponent(c.id, 'quantityNeededBase', text)}
                  error={errors.components?.[c.id]?.quantityNeededBase}
                  placeholder="0"
                  keyboardType="numeric"
                />

                {c.itemId ? (
                  <Text style={[styles.baseUnitNote, { color: theme.textTertiary }]}>
                    Takaran pemakaian per 1 porsi menu: {c.quantityNeededBase || '0'} {unitSymbol}
                  </Text>
                ) : null}
              </View>
            );
          })}

          <TouchableOpacity
            onPress={addComponent}
            style={[styles.addButton, { borderColor: theme.primary }]}
          >
            <Plus size={18} color={theme.primary} />
            <Text style={[styles.addButtonText, { color: theme.primary }]}>
              Add Another Component
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </DripSheet>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  ingredientRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  ingredientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ingredientLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  removeButton: {
    padding: 4,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  typeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
    gap: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  baseUnitNote: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
});