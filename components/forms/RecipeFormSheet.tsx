import { ChefHat, Plus, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../constants/colorTheme';
import { dbOperations, getDatabase } from '../../lib/database';
import { DripButton } from '../Button';
import { DeskInput } from '../DeskInput';
import { DripDropdown } from '../Dropdown';
import { DripInput } from '../Input';
import { DripSheet } from '../Sheet';

interface RecipeIngredientInput {
  id: string;
  ingredientId: string;
  quantityNeededBase: string;
}

interface RecipeFormSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    ingredients: Array<{ ingredientId: number; quantityNeededBase: number }>;
  }) => void;
  initialData?: {
    name: string;
    description: string;
    ingredients: Array<{ ingredientId: number; quantityNeededBase: number }>;
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
  const [ingredients, setIngredients] = useState<RecipeIngredientInput[]>([
    { id: '1', ingredientId: '', quantityNeededBase: '' },
  ]);
  const [errors, setErrors] = useState<{
    name?: string;
    ingredients?: Record<string, { ingredientId?: string; quantityNeededBase?: string }>;
  }>({});
  const [availableIngredients, setAvailableIngredients] = useState<Array<any>>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (visible) {
      loadIngredients();
    }
  }, [visible]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        description: initialData.description || '',
      });
      setIngredients(
        initialData.ingredients.map((ing, index) => ({
          id: index.toString(),
          ingredientId: ing.ingredientId.toString(),
          quantityNeededBase: ing.quantityNeededBase.toString(),
        }))
      );
    } else {
      setFormData({
        name: '',
        description: '',
      });
      setIngredients([{ id: '1', ingredientId: '', quantityNeededBase: '' }]);
    }
    setErrors({});
  }, [visible, initialData]);

  const loadIngredients = async () => {
    setLoadingData(true);
    try {
      const db = await getDatabase();
      const ingredientList = await dbOperations.getAllIngredients(db);
      setAvailableIngredients(ingredientList);
    } catch (error) {
      console.error('Failed to load ingredients:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const ingredientOptions = availableIngredients.map(ingredient => ({
    label: `${ingredient.name} (Base: ${ingredient.unit_symbol || ingredient.symbol || 'unit'})`,
    value: ingredient.id.toString(),
  }));

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { id: Date.now().toString(), ingredientId: '', quantityNeededBase: '' },
    ]);
  };

  const removeIngredient = (id: string) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter(ing => ing.id !== id));
    }
  };

  const updateIngredient = (id: string, field: keyof RecipeIngredientInput, value: string) => {
    setIngredients(
      ingredients.map(ing =>
        ing.id === id ? { ...ing, [field]: value } : ing
      )
    );
  };

  const validateForm = () => {
    const newErrors: {
      name?: string;
      ingredients?: Record<string, { ingredientId?: string; quantityNeededBase?: string }>;
    } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Recipe name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Recipe name must be at least 2 characters';
    }

    const ingredientErrors: Record<string, { ingredientId?: string; quantityNeededBase?: string }> = {};

    ingredients.forEach((ing, index) => {
      const ingErrors: { ingredientId?: string; quantityNeededBase?: string } = {};

      if (!ing.ingredientId) {
        ingErrors.ingredientId = 'Ingredient is required';
      }

      if (!ing.quantityNeededBase) {
        ingErrors.quantityNeededBase = 'Quantity is required';
      } else {
        const quantity = parseFloat(ing.quantityNeededBase);
        if (isNaN(quantity) || quantity <= 0) {
          ingErrors.quantityNeededBase = 'Quantity must be a positive number';
        }
      }

      if (Object.keys(ingErrors).length > 0) {
        ingredientErrors[ing.id] = ingErrors;
      }
    });

    if (Object.keys(ingredientErrors).length > 0) {
      newErrors.ingredients = ingredientErrors;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit({
        name: formData.name.trim(),
        description: formData.description.trim(),
        ingredients: ingredients.map(ing => ({
          ingredientId: parseInt(ing.ingredientId),
          quantityNeededBase: parseFloat(ing.quantityNeededBase),
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
      title={mode === 'create' ? 'Create New Recipe' : 'Edit Recipe'}
      headerIcon={<ChefHat size={20} color={theme.primary} />}
      footer={footer}
      loading={loadingData}
    >
      <ScrollView style={styles.scrollContainer}>
        <View>
          <DripInput
            label="Recipe Name"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            error={errors.name}
            placeholder="Enter recipe name"
          />

          <DeskInput
            label="Description (Optional)"
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Enter recipe description"
            numberOfLines={4}
          />

          <Text style={[styles.sectionTitle, { color: theme.text }]}>Ingredients</Text>

          {ingredients.map((ing, index) => (
            <View key={ing.id} style={[styles.ingredientRow, { borderColor: theme.border }]}>
              <View style={styles.ingredientHeader}>
                <Text style={[styles.ingredientLabel, { color: theme.textSecondary }]}>
                  Ingredient {index + 1}
                </Text>
                {ingredients.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeIngredient(ing.id)}
                    style={styles.removeButton}
                  >
                    <Trash2 size={16} color={theme.error} />
                  </TouchableOpacity>
                )}
              </View>

              <DripDropdown
                label="Select Ingredient"
                options={ingredientOptions}
                value={ing.ingredientId}
                onSelect={(value) => updateIngredient(ing.id, 'ingredientId', value)}
                error={errors.ingredients?.[ing.id]?.ingredientId}
                disabled={loadingData}
              />

              <DripInput
                label="Quantity (Base Unit)"
                value={ing.quantityNeededBase}
                onChangeText={(text) => updateIngredient(ing.id, 'quantityNeededBase', text)}
                error={errors.ingredients?.[ing.id]?.quantityNeededBase}
                placeholder="0"
                keyboardType="numeric"
              />
              {ing.ingredientId && (
                <Text style={[styles.baseUnitNote, { color: theme.textTertiary }]}>
                  Base unit: {availableIngredients.find(i => i.id.toString() === ing.ingredientId)?.unit_symbol || 'unit'}
                </Text>
              )}
              <Text style={[styles.baseUnitNote, { color: theme.textTertiary }]}>
                Note: All recipe quantities are in the smallest base unit (g, ml, pcs)
              </Text>
            </View>
          ))}

          <TouchableOpacity
            onPress={addIngredient}
            style={[styles.addButton, { borderColor: theme.primary }]}
          >
            <Plus size={18} color={theme.primary} />
            <Text style={[styles.addButtonText, { color: theme.primary }]}>
              Add Another Ingredient
            </Text>
          </TouchableOpacity>
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
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
  },
  ingredientRow: {
    borderWidth: 1,
    borderRadius: 8,
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
    fontSize: 12,
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
  baseUnitNote: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
});