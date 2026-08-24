import { RecipeFormSheet } from '@/components/forms/RecipeFormSheet';
import { ChefHat, Eye, Plus, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DripButton } from '../../components/Button';
import { DripContainer } from '../../components/Container';
import { Header } from '../../components/Header';
import { useTheme } from '../../constants/colorTheme';
import { dbOperations, getDatabase } from '../../lib/database';
import { RecipeProcess } from '../../processes/recipeProcess';

export default function RecipesScreen() {
  const { theme } = useTheme();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, totalIngredients: 0 });
  const [formVisible, setFormVisible] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [viewingRecipe, setViewingRecipe] = useState<any>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      const db = await getDatabase();
      const result = await RecipeProcess.getAllDefinitions(db);
      if (result.success && result.data) {
        // Load ingredient counts, costs, and per-ingredient costs for each recipe
        const recipesWithDetails = await Promise.all(
          result.data.map(async (recipe: any) => {
            const ingredients = await dbOperations.getRecipeIngredients(db, recipe.id);
            
            // Calculate cost for each ingredient
            const ingredientsWithCost = await Promise.all(
              ingredients.map(async (ing: any) => {
                // Get cost per base unit using FEFO logic
                const batch = await db.getFirstAsync<{ cost_per_base_unit: number }>(
                  `SELECT cost_per_base_unit FROM inventory_batches 
                   WHERE ingredient_id = ? AND remaining_quantity_base > 0 
                   ORDER BY 
                     CASE 
                       WHEN expiration_date IS NOT NULL THEN 
                         CASE 
                           WHEN datetime(expiration_date) < datetime('now') THEN 0 
                           ELSE 1 
                         END
                       ELSE 2 
                     END,
                     CASE 
                       WHEN expiration_date IS NOT NULL THEN expiration_date 
                       ELSE received_date 
                     END ASC
                   LIMIT 1`,
                  [ing.ingredient_id]
                );
                
                const costPerUnit = batch?.cost_per_base_unit || 0;
                const ingredientCost = costPerUnit * ing.quantity_needed_base;
                
                return {
                  ...ing,
                  cost_per_unit: costPerUnit,
                  ingredient_cost: ingredientCost,
                };
              })
            );
            
            const totalCost = ingredientsWithCost.reduce((sum: number, ing: any) => sum + ing.ingredient_cost, 0);
            
            return {
              ...recipe,
              ingredient_count: ingredients.length,
              ingredients: ingredientsWithCost,
              total_cost: totalCost,
            };
          })
        );
        setRecipes(recipesWithDetails);
        const totalIngredients = recipesWithDetails.reduce((sum: number, r: any) => sum + r.ingredient_count, 0);
        setStats({
          total: recipesWithDetails.length,
          totalIngredients,
        });
      }
    } catch (error) {
      console.error('Failed to load recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecipe = () => {
    setEditingRecipe(null);
    setFormMode('create');
    setFormVisible(true);
  };

  const handleEditRecipe = (recipe: any) => {
    setEditingRecipe(recipe);
    setFormMode('edit');
    setFormVisible(true);
  };

  const handleViewRecipe = (recipe: any) => {
    setViewingRecipe(recipe);
    setViewModalVisible(true);
  };

  const handleDeleteRecipe = async (recipeId: number) => {
    Alert.alert(
      'Delete Recipe',
      'Are you sure you want to delete this recipe? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDatabase();
              const result = await RecipeProcess.deleteDefinition(db, recipeId);
              if (result.success) {
                loadRecipes();
              } else {
                Alert.alert('Error', result.error || 'Failed to delete recipe');
              }
            } catch (error) {
              console.error('Failed to delete recipe:', error);
              Alert.alert('Error', 'Failed to delete recipe');
            }
          },
        },
      ]
    );
  };

  const handleFormSubmit = async (data: {
    name: string;
    description: string;
    ingredients: Array<{ ingredientId: number; quantityNeededBase: number }>;
  }) => {
    try {
      const db = await getDatabase();
      let result;

      if (formMode === 'create') {
        result = await RecipeProcess.createCompleteRecipe(db, data, data.ingredients);
      } else {
        // For edit, we would need to implement update logic
        Alert.alert('Info', 'Edit functionality coming soon');
        return;
      }

      if (result.success) {
        setFormVisible(false);
        loadRecipes();
      } else {
        Alert.alert('Error', result.errors?.join(', ') || result.error || 'Operation failed');
      }
    } catch (error) {
      console.error('Failed to save recipe:', error);
      Alert.alert('Error', 'Failed to save recipe');
    }
  };

  const leftPanel = (
    <View style={styles.content}>
      <Text style={styles.title}>Recipes Management</Text>
      <Text style={styles.subtitle}>Define product compositions with multiple ingredients</Text>
      
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { borderColor: theme.border }]}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Recipes</Text>
        </View>
        <View style={[styles.statCard, { borderColor: theme.border }]}>
          <Text style={styles.statNumber}>{stats.totalIngredients}</Text>
          <Text style={styles.statLabel}>Total Ingredients</Text>
        </View>
      </View>

      <DripButton
        title="Create New Recipe"
        icon={<Plus size={20} color="white" />}
        onPress={handleAddRecipe}
        style={styles.addButton}
      />
    </View>
  );

  const rightPanel = (
    <View style={styles.recipesList}>
      <Text style={styles.listTitle}>Recipes List</Text>
      {loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      ) : recipes.length === 0 ? (
        <View style={styles.emptyState}>
          <ChefHat size={48} color="#888" />
          <Text style={styles.emptyText}>No recipes yet</Text>
          <Text style={styles.emptySubtext}>Create your first recipe to get started</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer}>
          {recipes.map((recipe) => (
            <View key={recipe.id} style={[styles.recipeItem, { borderColor: theme.border }]}>
              <View style={styles.recipeInfo}>
                <Text style={[styles.recipeName, { color: theme.text }]}>{recipe.name}</Text>
                {recipe.description && (
                  <Text style={[styles.recipeDescription, { color: theme.textSecondary }]}>
                    {recipe.description}
                  </Text>
                )}
                <Text style={[styles.recipeMeta, { color: theme.textTertiary }]}>
                  {recipe.ingredient_count} ingredient{recipe.ingredient_count !== 1 ? 's' : ''}
                </Text>
                <Text style={[styles.recipeCost, { color: theme.primary }]}>
                  Cost: Rp {recipe.total_cost?.toFixed(2) || '0.00'}
                </Text>
              </View>
              <View style={styles.recipeActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleViewRecipe(recipe)}
                >
                  <Eye size={16} color={theme.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeleteRecipe(recipe.id)}
                >
                  <Trash2 size={16} color={theme.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <>
      <Header title="Recipes" />
      <DripContainer
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        showSecondaryMobile={false}
        childrenPadding={16}
      />
      <RecipeFormSheet
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSubmit={handleFormSubmit}
        initialData={editingRecipe}
        mode={formMode}
      />
      
      {/* Recipe View Modal */}
      <Modal
        visible={viewModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setViewModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {viewingRecipe?.name}
              </Text>
              <TouchableOpacity onPress={() => setViewModalVisible(false)} style={styles.closeButton}>
                <Text style={[styles.closeText, { color: theme.textSecondary }]}>Close</Text>
              </TouchableOpacity>
            </View>
            
            {viewingRecipe?.description && (
              <View style={styles.modalSection}>
                <Text style={[styles.modalSectionTitle, { color: theme.text }]}>Description</Text>
                <Text style={[styles.modalText, { color: theme.textSecondary }]}>
                  {viewingRecipe.description}
                </Text>
              </View>
            )}
            
            <View style={styles.modalSection}>
              <Text style={[styles.modalSectionTitle, { color: theme.text }]}>Recipe Cost</Text>
              <Text style={[styles.modalCost, { color: theme.primary }]}>
                Rp {viewingRecipe?.total_cost?.toFixed(2) || '0.00'}
              </Text>
              <Text style={[styles.modalCostNote, { color: theme.textTertiary }]}>
                Calculated based on current inventory stock prices (FEFO)
              </Text>
            </View>
            
            <View style={styles.modalSection}>
              <Text style={[styles.modalSectionTitle, { color: theme.text }]}>Ingredients (Base Units)</Text>
              {viewingRecipe?.ingredients?.map((ing: any) => (
                <View key={ing.id} style={[styles.ingredientRow, { borderColor: theme.border }]}>
                  <View style={styles.ingredientInfo}>
                    <Text style={[styles.ingredientName, { color: theme.text }]}>
                      {ing.ingredient_name}
                    </Text>
                    <Text style={[styles.ingredientCost, { color: theme.primary }]}>
                      Rp {ing.ingredient_cost?.toFixed(2) || '0.00'}
                    </Text>
                  </View>
                  <View style={styles.ingredientDetails}>
                    <Text style={[styles.ingredientQuantity, { color: theme.textSecondary }]}>
                      {ing.quantity_needed_base} {ing.unit_symbol}
                    </Text>
                    <Text style={[styles.ingredientUnitCost, { color: theme.textTertiary }]}>
                      @ Rp {ing.cost_per_unit?.toFixed(2) || '0.00'}/{ing.unit_symbol}
                    </Text>
                  </View>
                </View>
              ))}
              <Text style={[styles.baseUnitNote, { color: theme.textTertiary }]}>
                All quantities are in the smallest base unit (g, ml, pcs)
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  addButton: {
    marginTop: 8,
  },
  recipesList: {
    flex: 1,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
  },
  scrollContainer: {
    flex: 1,
  },
  recipeItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  recipeInfo: {
    flex: 1,
  },
  recipeName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  recipeDescription: {
    fontSize: 12,
    marginBottom: 4,
  },
  recipeMeta: {
    fontSize: 11,
  },
  recipeCost: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  recipeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalCost: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalCostNote: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  ingredientCost: {
    fontSize: 13,
    fontWeight: '600',
  },
  ingredientDetails: {
    alignItems: 'flex-end',
  },
  ingredientQuantity: {
    fontSize: 14,
    marginBottom: 2,
  },
  ingredientUnitCost: {
    fontSize: 11,
  },
  baseUnitNote: {
    fontSize: 11,
    marginTop: 8,
    fontStyle: 'italic',
  },
});