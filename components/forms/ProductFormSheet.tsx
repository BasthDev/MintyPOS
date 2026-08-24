import { calculateRecipeCost } from '@/lib/businessLogic';
import * as ImagePicker from 'expo-image-picker';
import { Barcode, Package, Scan, Upload, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../constants/colorTheme';
import { dbOperations, getDatabase } from '../../lib/database';
import { DripButton } from '../Button';
import { DripDropdown } from '../Dropdown';
import { InlineScanner } from '../InlineScanner';
import { DripInput } from '../Input';
import { DripSheet } from '../Sheet';
import { DripSwitch } from '../Switch';

interface ProductFormSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    sku: string;
    categoryId: number;
    buyPrice?: number;
    sellingPrice: number;
    recipeDefinitionId?: number;
    stockDeductionMethod: 'none' | 'product' | 'recipe';
    currentStock: number;
    imageUri?: string;
  }) => void;
  initialData?: {
    name: string;
    sku: string;
    categoryId: number;
    buyPrice?: number;
    sellingPrice: number;
    recipeDefinitionId?: number;
    stockDeductionMethod: 'none' | 'product' | 'recipe';
    currentStock: number;
    recipeName?: string;
    imageUri?: string;
  };
  mode: 'create' | 'edit';
}

export const ProductFormSheet: React.FC<ProductFormSheetProps> = ({
  visible,
  onClose,
  onSubmit,
  initialData,
  mode,
}) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    categoryId: '',
    buyPrice: '',
    sellingPrice: '',
    recipeDefinitionId: '',
    stockDeductionMethod: 'none',
    currentStock: '',
    selectedRecipeName: '',
    useHPP: false,
    imageUri: '' as string | null,
  });
  const [errors, setErrors] = useState<{
    name?: string;
    sku?: string;
    categoryId?: string;
    buyPrice?: string;
    sellingPrice?: string;
    stockDeductionMethod?: string;
    currentStock?: string;
    recipeDefinitionId?: string;
  }>({});
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [recipes, setRecipes] = useState<Array<{ id: number; name: string; total_cost?: number }>>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [calculatedHPP, setCalculatedHPP] = useState<number>(0);

  useEffect(() => {
    if (visible) {
      loadCategories();
      loadRecipes();
    }
  }, [visible]);

  // Calculate HPP when recipe is selected
  useEffect(() => {
    const calculateHPP = async () => {
      if (formData.recipeDefinitionId) {
        const selectedRecipe = recipes.find(r => r.id.toString() === formData.recipeDefinitionId);
        if (selectedRecipe && selectedRecipe.total_cost !== undefined && selectedRecipe.total_cost !== null) {
          const cost = selectedRecipe.total_cost;
          setCalculatedHPP(cost);
          // Auto-fill buy price with calculated HPP
          setFormData(prev => ({
            ...prev,
            buyPrice: cost.toString(),
          }));
        }
      } else {
        setCalculatedHPP(0);
      }
    };
    calculateHPP();
  }, [formData.recipeDefinitionId, recipes]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        sku: initialData.sku || '',
        categoryId: initialData.categoryId?.toString() || '',
        buyPrice: initialData.buyPrice?.toString() || '',
        sellingPrice: initialData.sellingPrice.toString(),
        recipeDefinitionId: initialData.recipeDefinitionId?.toString() || '',
        stockDeductionMethod: initialData.stockDeductionMethod || 'none',
        currentStock: initialData.currentStock?.toString() || '',
        selectedRecipeName: initialData.recipeName || '',
        useHPP: !!initialData.recipeDefinitionId,
        imageUri: initialData.imageUri || null,
      });
    } else {
      setFormData({
        name: '',
        sku: '',
        categoryId: '',
        buyPrice: '',
        sellingPrice: '',
        recipeDefinitionId: '',
        stockDeductionMethod: 'none',
        currentStock: '',
        selectedRecipeName: '',
        useHPP: false,
        imageUri: null,
      });
    }
    setErrors({});
  }, [visible, initialData]);

  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const db = await getDatabase();
      const categoryList = await dbOperations.getAllCategories(db);
      setCategories(categoryList);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadRecipes = async () => {
    setLoadingRecipes(true);
    try {
      const db = await getDatabase();
      const recipeList = await dbOperations.getAllRecipeDefinitions(db);
      
      // Calculate cost for each recipe
      const recipesWithCost = await Promise.all(
        recipeList.map(async (recipe) => {
          const cost = await calculateRecipeCost(db, recipe.id);
          return {
            ...recipe,
            total_cost: cost,
          };
        })
      );
      
      setRecipes(recipesWithCost);
    } catch (error) {
      console.error('Failed to load recipes:', error);
    } finally {
      setLoadingRecipes(false);
    }
  };

  const categoryOptions = categories.map(cat => ({
    label: cat.name,
    value: cat.id.toString(),
  }));

  const stockMethodOptions = [
    { label: 'Deduct from Product Stock', value: 'product' },
    { label: 'Deduct from Recipe Ingredients', value: 'recipe' },
  ];

  const handleScanSuccess = (data: string) => {
    setFormData({ ...formData, sku: data });
    setShowScanner(false);
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFormData({ ...formData, imageUri: result.assets[0].uri });
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, imageUri: null });
  };

  const handleClearRecipe = () => {
    setFormData({
      ...formData,
      recipeDefinitionId: '',
      selectedRecipeName: '',
    });
  };

  const handleUseHPPToggle = (value: boolean) => {
    setFormData({
      ...formData,
      useHPP: value,
      recipeDefinitionId: '',
      selectedRecipeName: '',
    });
  };

  const validateForm = () => {
    const newErrors: {
      name?: string;
      sku?: string;
      categoryId?: string;
      buyPrice?: string;
      sellingPrice?: string;
      stockDeductionMethod?: string;
      currentStock?: string;
      recipeDefinitionId?: string;
    } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Category is required';
    }

    if (!formData.sellingPrice) {
      newErrors.sellingPrice = 'Selling price is required';
    } else {
      const price = parseFloat(formData.sellingPrice);
      if (isNaN(price) || price <= 0) {
        newErrors.sellingPrice = 'Price must be a positive number';
      }
    }

    if (formData.useHPP) {
      if (!formData.recipeDefinitionId) {
        newErrors.recipeDefinitionId = 'Recipe is required when using HPP';
      }
    } else {
      if (!formData.buyPrice) {
        newErrors.buyPrice = 'Buy price is required';
      } else {
        const price = parseFloat(formData.buyPrice);
        if (isNaN(price) || price < 0) {
          newErrors.buyPrice = 'Buy price must be a positive number';
        }
      }
    }

    // Recipe validation when using ingredient stock
    if (formData.stockDeductionMethod === 'recipe' && !formData.recipeDefinitionId) {
      newErrors.recipeDefinitionId = 'Recipe is required when using ingredient stock';
    }

    // Current stock validation when using product stock
    if (formData.stockDeductionMethod === 'product' && !formData.currentStock) {
      newErrors.currentStock = 'Current stock is required for product stock deduction';
    } else if (formData.currentStock) {
      const stock = parseFloat(formData.currentStock);
      if (isNaN(stock) || stock < 0) {
        newErrors.currentStock = 'Stock must be a positive number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit({
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        categoryId: parseInt(formData.categoryId),
        buyPrice: formData.buyPrice ? parseFloat(formData.buyPrice) : undefined,
        sellingPrice: parseFloat(formData.sellingPrice),
        recipeDefinitionId: formData.recipeDefinitionId ? parseInt(formData.recipeDefinitionId) : undefined,
        stockDeductionMethod: formData.stockDeductionMethod as 'none' | 'product' | 'recipe',
        currentStock: formData.currentStock ? parseFloat(formData.currentStock) : 0,
        imageUri: formData.imageUri || undefined,
      });
    }
  };

  const footer = (
    <DripButton
      title={mode === 'create' ? 'Create Product' : 'Update Product'}
      onPress={handleSubmit}
    />
  );

  return (
    <>
      <DripSheet
        visible={visible}
        onClose={onClose}
        title={mode === 'create' ? 'Add New Product' : 'Edit Product'}
        headerIcon={<Package size={20} color={theme.primary} />}
        footer={footer}
      >
        <View>
          <DripInput
            label="Product Name"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            error={errors.name}
            placeholder="Enter product name"
          />

          <DripInput
            label="SKU / Barcode"
            value={formData.sku}
            onChangeText={(text) => setFormData({ ...formData, sku: text })}
            error={errors.sku}
            placeholder="Enter SKU"
            leftIcon={<Barcode size={20} color={theme.primary} />}
            rightIcon={<Scan size={20} color={theme.primary} />}
            onRightIconPress={() => setShowScanner(!showScanner)}
          />

          {showScanner && (
            <InlineScanner
              onScanSuccess={handleScanSuccess}
            />
          )}

          {/* Product Image Upload */}
          <View style={styles.imageSection}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>Product Image (Optional)</Text>
            {formData.imageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: formData.imageUri }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={handleRemoveImage}
                >
                  <X size={16} color="white" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.uploadButton, { borderColor: theme.border }]}
                onPress={handlePickImage}
              >
                <Upload size={24} color={theme.textSecondary} />
                <Text style={[styles.uploadButtonText, { color: theme.textSecondary }]}>
                  Upload Image
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <DripDropdown
            label="Category"
            options={categoryOptions}
            value={formData.categoryId}
            onSelect={(value) => setFormData({ ...formData, categoryId: value })}
            error={errors.categoryId}
            disabled={loadingCategories}
          />

          <DripSwitch
            label="Use HPP / Recipe Cost"
            value={formData.useHPP}
            onValueChange={handleUseHPPToggle}
          />

          {formData.useHPP ? (
            <>
              <DripDropdown
                label="Recipe"
                options={recipes.map(r => ({ 
                  label: `${r.name} (Cost: Rp ${r.total_cost?.toFixed(2) || '0.00'})`, 
                  value: r.id.toString() 
                }))}
                value={formData.recipeDefinitionId}
                onSelect={(value) => setFormData({ ...formData, recipeDefinitionId: value })}
                disabled={loadingRecipes}
              />
              
              {calculatedHPP > 0 && (
                <View style={[styles.hppInfo, { backgroundColor: theme.primary + '10', borderColor: theme.primary }]}>
                  <Text style={[styles.hppLabel, { color: theme.primary }]}>Calculated HPP:</Text>
                  <Text style={[styles.hppValue, { color: theme.primary }]}>Rp {calculatedHPP.toFixed(2)}</Text>
                  <Text style={[styles.hppNote, { color: theme.textSecondary }]}>
                    Based on current inventory stock prices (FEFO)
                  </Text>
                </View>
              )}
              
              <DripInput
                label="Selling Price (Rp)"
                value={formData.sellingPrice}
                onChangeText={(text) => setFormData({ ...formData, sellingPrice: text })}
                error={errors.sellingPrice}
                placeholder="0"
                keyboardType="numeric"
              />
              
              <DripSwitch
                label="Use Ingredient Stock"
                description="Deduct stock from recipe ingredients when sold"
                value={formData.stockDeductionMethod === 'recipe'}
                onValueChange={(value) => setFormData({ ...formData, stockDeductionMethod: value ? 'recipe' : 'none' })}
              />

              {formData.stockDeductionMethod === 'recipe' && (
                <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                  Note: Stock will be deducted from recipe ingredients automatically
                </Text>
              )}

              {formData.stockDeductionMethod === 'none' && (
                <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                  Note: HPP will be used for cost calculation without deducting stock
                </Text>
              )}
            </>
          ) : (
            <>
              <DripInput
                label="Buy Price (Rp)"
                value={formData.buyPrice}
                onChangeText={(text) => setFormData({ ...formData, buyPrice: text })}
                error={errors.buyPrice}
                placeholder="0"
                keyboardType="numeric"
              />
              <DripInput
                label="Selling Price (Rp)"
                value={formData.sellingPrice}
                onChangeText={(text) => setFormData({ ...formData, sellingPrice: text })}
                error={errors.sellingPrice}
                placeholder="0"
                keyboardType="numeric"
              />
              
              <DripSwitch
                label="Use Product Stock"
                description="Track and deduct stock from product inventory"
                value={formData.stockDeductionMethod === 'product'}
                onValueChange={(value) => setFormData({ ...formData, stockDeductionMethod: value ? 'product' : 'none' })}
              />

              {formData.stockDeductionMethod === 'product' && (
                <DripInput
                  label="Current Stock"
                  value={formData.currentStock}
                  onChangeText={(text) => setFormData({ ...formData, currentStock: text })}
                  error={errors.currentStock}
                  placeholder="0"
                  keyboardType="numeric"
                />
              )}

              {formData.stockDeductionMethod === 'product' && (
                <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                  Note: Stock will be deducted directly from this product's inventory
                </Text>
              )}

              {formData.stockDeductionMethod === 'none' && (
                <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                  Note: No stock tracking - product can be sold without inventory
                </Text>
              )}
            </>
          )}
        </View>
      </DripSheet>
    </>
  );
};

const styles = StyleSheet.create({
  infoText: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  hppInfo: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 8,
  },
  hppLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  hppValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  hppNote: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  imageSection: {
    marginTop: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  imagePreviewContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },
  uploadButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
});