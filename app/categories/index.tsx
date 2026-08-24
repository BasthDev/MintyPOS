import { CategoryFormSheet } from '@/components/forms/CategoryFormSheet';
import { Edit, Folder, Plus, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DripButton } from '../../components/Button';
import { DripContainer } from '../../components/Container';
import { Header } from '../../components/Header';
import { useTheme } from '../../constants/colorTheme';
import { getDatabase } from '../../lib/database';
import { CategoryProcess } from '../../processes/categoryProcess';

export default function CategoriesScreen() {
  const { theme } = useTheme();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const db = await getDatabase();
      const result = await CategoryProcess.getAll(db);
      if (result.success && result.data) {
        setCategories(result.data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setFormMode('create');
    setFormVisible(true);
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setFormMode('edit');
    setFormVisible(true);
  };

  const handleDeleteCategory = async (categoryId: number) => {
    Alert.alert(
      'Delete Category',
      'Are you sure you want to delete this category? Products in this category will be unassigned.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDatabase();
              const result = await CategoryProcess.delete(db, categoryId);
              if (result.success) {
                loadCategories();
              } else {
                Alert.alert('Error', result.error || 'Failed to delete category');
              }
            } catch (error) {
              console.error('Failed to delete category:', error);
              Alert.alert('Error', 'Failed to delete category');
            }
          },
        },
      ]
    );
  };

  const handleFormSubmit = async (data: { name: string }) => {
    try {
      const db = await getDatabase();
      let result;

      if (formMode === 'create') {
        result = await CategoryProcess.create(db, data);
      } else {
        result = await CategoryProcess.update(db, editingCategory.id, data);
      }

      if (result.success) {
        setFormVisible(false);
        loadCategories();
      } else {
        Alert.alert('Error', result.errors?.join(', ') || result.error || 'Operation failed');
      }
    } catch (error) {
      console.error('Failed to save category:', error);
      Alert.alert('Error', 'Failed to save category');
    }
  };

  const leftPanel = (
    <View style={styles.content}>
      <Text style={styles.title}>Categories Management</Text>
      <Text style={styles.subtitle}>Organize your products into categories</Text>
      
      <DripButton
        title="Add New Category"
        icon={<Plus size={20} color="white" />}
        onPress={handleAddCategory}
        style={styles.addButton}
      />
    </View>
  );

  const rightPanel = (
    <View style={styles.categoriesList}>
      <Text style={styles.listTitle}>Categories List</Text>
      {loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      ) : categories.length === 0 ? (
        <View style={styles.emptyState}>
          <Folder size={48} color="#888" />
          <Text style={styles.emptyText}>No categories yet</Text>
          <Text style={styles.emptySubtext}>Add your first category to get started</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer}>
          {categories.map((category) => (
            <View key={category.id} style={[styles.categoryItem, { borderColor: theme.border }]}>
              <View style={styles.categoryInfo}>
                <Text style={[styles.categoryName, { color: theme.text }]}>{category.name}</Text>
              </View>
              <View style={styles.categoryActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditCategory(category)}
                >
                  <Edit size={16} color={theme.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeleteCategory(category.id)}
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
      <Header title="Categories" />
      <DripContainer
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        showSecondaryMobile={false}
        childrenPadding={16}
      />
      <CategoryFormSheet
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSubmit={handleFormSubmit}
        initialData={editingCategory}
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
  addButton: {
    marginTop: 8,
  },
  categoriesList: {
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
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
  },
});