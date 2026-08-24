import { ChefHat, Check } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../constants/colorTheme';
import { dbOperations, getDatabase } from '../lib/database';

interface Recipe {
  id: number;
  name: string;
  description?: string;
  ingredient_count?: number;
}

interface RecipeSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (recipeId: number) => void;
}

export const RecipeSelectionModal: React.FC<RecipeSelectionModalProps> = ({
  visible,
  onClose,
  onSelect,
}) => {
  const { theme } = useTheme();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      loadRecipes();
    }
  }, [visible]);

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const db = await getDatabase();
      const recipeList = await dbOperations.getAllRecipeDefinitions(db);
      
      // Get ingredient count for each recipe
      const recipesWithCount = await Promise.all(
        recipeList.map(async (recipe) => {
          const ingredients = await dbOperations.getRecipeIngredients(db, recipe.id);
          return {
            ...recipe,
            ingredient_count: ingredients.length,
          };
        })
      );
      
      setRecipes(recipesWithCount);
    } catch (error) {
      console.error('Failed to load recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (recipeId: number) => {
    setSelectedId(recipeId);
    onSelect(recipeId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <ChefHat size={24} color={theme.primary} />
            <Text style={[styles.headerTitle, { color: theme.text }]}>Select Recipe</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading recipes...</Text>
            </View>
          ) : recipes.length === 0 ? (
            <View style={styles.centerContainer}>
              <ChefHat size={48} color={theme.textDisabled} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No recipes found</Text>
              <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
                Create a recipe first to connect it to a product
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollView}>
              {recipes.map((recipe) => (
                <TouchableOpacity
                  key={recipe.id}
                  style={[
                    styles.recipeItem,
                    { 
                      borderColor: theme.border,
                      backgroundColor: selectedId === recipe.id ? theme.primary : 'transparent',
                    },
                  ]}
                  onPress={() => handleSelect(recipe.id)}
                >
                  <View style={styles.recipeInfo}>
                    <Text
                      style={[
                        styles.recipeName,
                        { color: selectedId === recipe.id ? theme.background : theme.text },
                      ]}
                    >
                      {recipe.name}
                    </Text>
                    {recipe.description && (
                      <Text
                        style={[
                          styles.recipeDescription,
                          { color: selectedId === recipe.id ? theme.background : theme.textSecondary },
                        ]}
                      >
                        {recipe.description}
                      </Text>
                    )}
                    <Text
                      style={[
                        styles.recipeMeta,
                        { color: selectedId === recipe.id ? theme.background : theme.textTertiary },
                      ]}
                    >
                      {recipe.ingredient_count} ingredient{recipe.ingredient_count !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  {selectedId === recipe.id && (
                    <Check size={20} color={theme.background} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    marginLeft: 12,
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  recipeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  recipeInfo: {
    flex: 1,
  },
  recipeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  recipeDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  recipeMeta: {
    fontSize: 12,
  },
});