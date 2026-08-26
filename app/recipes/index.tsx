import { RecipeFormSheet } from '@/components/forms/RecipeFormSheet';
import { Header } from '@/components/Header';
import { DripSearchBar } from '@/components/SearchBar';
import { Section } from '@/components/Section';
import { useTheme } from '@/constants/colorTheme';
import { dbOperations, getDatabase } from '@/lib/database';
import { RecipeProcess } from '@/processes/recipeProcess';
import { ChefHat, ChevronRight, Edit, Plus, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function RecipesScreen() {
  const { theme } = useTheme();

  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);
  const [search, setSearch] = useState('');

  const [formVisible, setFormVisible] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const db = await getDatabase();
      const result = await RecipeProcess.getAllDefinitions(db);
      if (result.success && result.data) {
        const recipesWithDetails = await Promise.all(
          result.data.map(async (recipe: any) => {
            const ingredients = await dbOperations.getRecipeIngredients(db, recipe.id);
            const ingredientsWithCost = await Promise.all(
              ingredients.map(async (ing: any) => {
                const batch = await db.getFirstAsync<{ cost_per_base_unit: number }>(
                  `SELECT cost_per_base_unit FROM inventory_batches 
                   WHERE ingredient_id = ? AND remaining_quantity_base > 0 
                   ORDER BY received_date ASC LIMIT 1`,
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
            const totalCost = ingredientsWithCost.reduce(
              (sum: number, ing: any) => sum + ing.ingredient_cost,
              0
            );
            return {
              ...recipe,
              ingredient_count: ingredients.length,
              ingredients: ingredientsWithCost,
              total_cost: totalCost,
            };
          })
        );
        setRecipes(recipesWithDetails);
        if (selectedRecipe) {
          const updated = recipesWithDetails.find((r: any) => r.id === selectedRecipe.id);
          setSelectedRecipe(updated || null);
        }
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
    setEditingRecipe({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description || '',
      ingredients: (recipe.ingredients || []).map((ing: any) => ({
        ingredientId: ing.ingredient_id,
        quantityNeededBase: ing.quantity_needed_base,
      })),
    });
    setFormMode('edit');
    setFormVisible(true);
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
                if (selectedRecipe?.id === recipeId) {
                  setSelectedRecipe(null);
                }
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
        result = await RecipeProcess.updateCompleteRecipe(
          db,
          editingRecipe.id,
          { name: data.name, description: data.description },
          data.ingredients
        );
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

  const filteredRecipes = recipes.filter((r) => {
    const query = search.toLowerCase();
    return r.name?.toLowerCase().includes(query) || r.description?.toLowerCase().includes(query);
  });

  // --- LEFT PANEL (Main Screen: List + Search + FAB) ---
  const leftPanel = (
    <View style={styles.leftPanelContainer}>
      <DripSearchBar
        placeholder="Search recipes..."
        value={search}
        onChangeText={setSearch}
        onClear={() => setSearch('')}
        style={styles.searchBar}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : filteredRecipes.length === 0 ? (
        <View style={styles.emptyListContainer}>
          <ChefHat size={48} color={theme.textTertiary || '#888'} />
          <Text style={[styles.emptyListText, { color: theme.textSecondary }]}>
            {search ? 'No recipes match your search' : 'No recipes found'}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
          {filteredRecipes.map((r) => {
            const isSelected = selectedRecipe?.id === r.id;

            return (
              <TouchableOpacity
                key={r.id}
                activeOpacity={0.7}
                style={[
                  styles.recipeCard,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.card,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setSelectedRecipe(r)}
              >
                <View style={styles.cardMain}>
                  <View style={styles.cardHeaderInfo}>
                    <Text
                      style={[
                        styles.cardName,
                        { color: isSelected ? '#FFFFFF' : theme.text },
                      ]}
                      numberOfLines={1}
                    >
                      {r.name}
                    </Text>
                    {r.description && (
                      <Text
                        style={[
                          styles.cardDesc,
                          { color: isSelected ? '#E0F2FE' : theme.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {r.description}
                      </Text>
                    )}
                    <Text
                      style={[
                        styles.cardMeta,
                        { color: isSelected ? '#CBD5E1' : theme.textTertiary },
                      ]}
                    >
                      {r.ingredient_count} ingredient{r.ingredient_count !== 1 ? 's' : ''} • Cost: Rp{' '}
                      {r.total_cost ? r.total_cost.toFixed(2) : '0.00'}
                    </Text>
                  </View>

                  <ChevronRight
                    size={20}
                    color={isSelected ? '#FFFFFF' : theme.textTertiary || '#888'}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.fabButton, { backgroundColor: theme.primary }]}
        onPress={handleAddRecipe}
      >
        <Plus size={22} color="#FFFFFF" />
        <Text style={styles.fabText}>New Recipe</Text>
      </TouchableOpacity>
    </View>
  );

  // --- RIGHT PANEL (Item Details View) ---
  const rightPanel = selectedRecipe ? (
    <View style={styles.detailsContainer}>
      <View style={[styles.detailsHeader, { borderBottomColor: theme.border }]}>
        <View style={styles.detailsTitleRow}>
          <View style={[styles.detailsIconBadge, { backgroundColor: theme.input }]}>
            <ChefHat size={28} color={theme.primary} />
          </View>
          <View style={styles.detailsHeaderMeta}>
            <Text style={[styles.detailsTitle, { color: theme.text }]} numberOfLines={1}>
              {selectedRecipe.name}
            </Text>
            <Text style={[styles.detailsCost, { color: theme.primary }]}>
              Estimated Cost: Rp {selectedRecipe.total_cost ? selectedRecipe.total_cost.toFixed(2) : '0.00'}
            </Text>
          </View>
        </View>

        <View style={styles.detailsHeaderActions}>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => handleEditRecipe(selectedRecipe)}
          >
            <Edit size={18} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => handleDeleteRecipe(selectedRecipe.id)}
          >
            <Trash2 size={18} color={theme.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false}>
        {selectedRecipe.description && (
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border, marginBottom: 12 }]}>
            <Text style={[styles.infoCardTitle, { color: theme.text }]}>Description</Text>
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>{selectedRecipe.description}</Text>
          </View>
        )}

        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.infoCardTitle, { color: theme.text }]}>
            Ingredients ({selectedRecipe.ingredients?.length || 0})
          </Text>
          {selectedRecipe.ingredients?.map((ing: any, index: number) => (
            <View key={index} style={[styles.ingredientRow, { borderBottomColor: theme.border }]}>
              <View style={styles.ingredientInfoLeft}>
                <Text style={[styles.ingredientName, { color: theme.text }]}>{ing.ingredient_name}</Text>
                <Text style={[styles.ingredientQty, { color: theme.textSecondary }]}>
                  {ing.quantity_needed_base} {ing.unit_symbol}
                </Text>
              </View>
              <Text style={[styles.ingredientCost, { color: theme.primary }]}>
                Rp {ing.ingredient_cost ? ing.ingredient_cost.toFixed(2) : '0.00'}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  ) : (
    <View style={styles.emptyDetailsState}>
      <ChefHat size={64} color={theme.textTertiary || '#888'} />
      <Text style={[styles.emptyDetailsTitle, { color: theme.text }]}>No Recipe Selected</Text>
      <Text style={[styles.emptyDetailsSubtext, { color: theme.textSecondary }]}>
        Select a recipe from the list to view its ingredient breakdown and costs.
      </Text>
    </View>
  );

  return (
    <>
      <Header title="Recipes" />
      <Section
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        showNextScreen={!!selectedRecipe}
        onBack={() => setSelectedRecipe(null)}
        backButtonTitle="Back to Recipes"
        childrenPadding={16}
      />
      <RecipeFormSheet
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSubmit={handleFormSubmit}
        initialData={editingRecipe}
        mode={formMode}
      />
    </>
  );
}

const styles = StyleSheet.create({
  leftPanelContainer: {
    flex: 1,
    position: 'relative',
  },
  searchBar: {
    marginBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyListText: {
    marginTop: 12,
    fontSize: 14,
  },
  listScroll: {
    flex: 1,
  },
  recipeCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  cardMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderInfo: {
    flex: 1,
    marginRight: 12,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 12,
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 12,
  },

  // FAB
  fabButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 28,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    gap: 8,
  },
  fabText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // Details
  detailsContainer: {
    flex: 1,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  detailsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  detailsIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsHeaderMeta: {
    flex: 1,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  detailsCost: {
    fontSize: 14,
    marginTop: 2,
  },
  detailsHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionBtn: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  detailsScroll: {
    flex: 1,
    marginTop: 16,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  ingredientInfoLeft: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: '600',
  },
  ingredientQty: {
    fontSize: 12,
    marginTop: 2,
  },
  ingredientCost: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyDetailsState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyDetailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 6,
  },
  emptyDetailsSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});