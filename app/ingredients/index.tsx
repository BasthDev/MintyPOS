import { IngredientFormSheet } from '@/components/forms/IngredientFormSheet';
import { Edit, Plus, Scale, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DripButton } from '../../components/Button';
import { DripContainer } from '../../components/Container';
import { Header } from '../../components/Header';
import { useTheme } from '../../constants/colorTheme';
import { getDatabase } from '../../lib/database';
import { IngredientProcess } from '../../processes/ingredientProcess';

export default function IngredientsScreen() {
  const { theme } = useTheme();
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, lowStock: 0 });
  const [formVisible, setFormVisible] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  useEffect(() => {
    loadIngredients();
  }, []);

  const loadIngredients = async () => {
    try {
      const db = await getDatabase();
      const result = await IngredientProcess.getAll(db);
      if (result.success && result.data) {
        setIngredients(result.data);
        setStats({
          total: result.data.length,
          lowStock: 0, // Will be calculated when low stock logic is implemented
        });
      }
    } catch (error) {
      console.error('Failed to load ingredients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddIngredient = () => {
    setEditingIngredient(null);
    setFormMode('create');
    setFormVisible(true);
  };

  const handleEditIngredient = (ingredient: any) => {
    setEditingIngredient(ingredient);
    setFormMode('edit');
    setFormVisible(true);
  };

  const handleDeleteIngredient = async (ingredientId: number) => {
    Alert.alert(
      'Delete Ingredient',
      'Are you sure you want to delete this ingredient? This will also delete related inventory and recipes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDatabase();
              const result = await IngredientProcess.delete(db, ingredientId);
              if (result.success) {
                loadIngredients();
              } else {
                Alert.alert('Error', result.error || 'Failed to delete ingredient');
              }
            } catch (error) {
              console.error('Failed to delete ingredient:', error);
              Alert.alert('Error', 'Failed to delete ingredient');
            }
          },
        },
      ]
    );
  };

  const handleFormSubmit = async (data: { name: string; baseUnitId: number; minimumStock: number }) => {
    try {
      const db = await getDatabase();
      let result;

      if (formMode === 'create') {
        result = await IngredientProcess.create(db, data);
      } else {
        result = await IngredientProcess.update(db, editingIngredient.id, data);
      }

      if (result.success) {
        setFormVisible(false);
        loadIngredients();
      } else {
        Alert.alert('Error', result.errors?.join(', ') || result.error || 'Operation failed');
      }
    } catch (error) {
      console.error('Failed to save ingredient:', error);
      Alert.alert('Error', 'Failed to save ingredient');
    }
  };

  const leftPanel = (
    <View style={styles.content}>
      <Text style={styles.title}>Ingredients Management</Text>
      <Text style={styles.subtitle}>Manage raw materials and inventory</Text>
      
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { borderColor: theme.border }]}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Ingredients</Text>
        </View>
        <View style={[styles.statCard, { borderColor: theme.border }]}>
          <Text style={styles.statNumber}>{stats.lowStock}</Text>
          <Text style={styles.statLabel}>Low Stock</Text>
        </View>
      </View>

      <DripButton
        title="Add New Ingredient"
        icon={<Plus size={20} color="white" />}
        onPress={handleAddIngredient}
        style={styles.addButton}
      />
    </View>
  );

  const rightPanel = (
    <View style={styles.ingredientsList}>
      <Text style={styles.listTitle}>Ingredients List</Text>
      {loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      ) : ingredients.length === 0 ? (
        <View style={styles.emptyState}>
          <Scale size={48} color="#888" />
          <Text style={styles.emptyText}>No ingredients yet</Text>
          <Text style={styles.emptySubtext}>Add your first ingredient to get started</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer}>
          {ingredients.map((ingredient) => (
            <View key={ingredient.id} style={[styles.ingredientItem, { borderColor: theme.border }]}>
              <View style={styles.ingredientInfo}>
                <Text style={[styles.ingredientName, { color: theme.text }]}>{ingredient.name}</Text>
                <Text style={[styles.ingredientUnit, { color: theme.textSecondary }]}>
                  Unit: {ingredient.unit_symbol}
                </Text>
              </View>
              <View style={styles.ingredientActions}>
                <View style={styles.stockInfo}>
                  <Text style={[styles.minStock, { color: theme.textSecondary }]}>
                    Min: {ingredient.minimum_stock}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleEditIngredient(ingredient)}
                >
                  <Edit size={16} color={theme.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeleteIngredient(ingredient.id)}
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
      <Header title="Ingredients" />
      <DripContainer
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        showSecondaryMobile={false}
        childrenPadding={16}
      />
      <IngredientFormSheet
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSubmit={handleFormSubmit}
        initialData={editingIngredient}
        mode={formMode}
      />
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
  ingredientsList: {
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
  ingredientItem: {
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
    fontWeight: '600',
    marginBottom: 4,
  },
  ingredientUnit: {
    fontSize: 12,
  },
  stockInfo: {
    alignItems: 'flex-end',
  },
  minStock: {
    fontSize: 12,
  },
  ingredientActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
  },
});