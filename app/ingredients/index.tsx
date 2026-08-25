import { IngredientFormSheet } from '@/components/forms/IngredientFormSheet';
import { Header } from '@/components/Header';
import { DripSearchBar } from '@/components/SearchBar';
import { Section } from '@/components/Section';
import { useTheme } from '@/constants/colorTheme';
import { getDatabase } from '@/lib/database';
import { IngredientProcess } from '@/processes/ingredientProcess';
import { Edit, Plus, Scale, Trash2 } from 'lucide-react-native';
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

export default function IngredientsScreen() {
  const { theme } = useTheme();

  const [ingredients, setIngredients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIngredient, setSelectedIngredient] = useState<any | null>(null);
  const [search, setSearch] = useState('');

  const [formVisible, setFormVisible] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  useEffect(() => {
    loadIngredients();
  }, []);

  const loadIngredients = async () => {
    setLoading(true);
    try {
      const db = await getDatabase();
      const result = await IngredientProcess.getAll(db);
      if (result.success && result.data) {
        setIngredients(result.data);
        if (selectedIngredient) {
          const updated = result.data.find((item: any) => item.id === selectedIngredient.id);
          setSelectedIngredient(updated || null);
        }
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
                if (selectedIngredient?.id === ingredientId) {
                  setSelectedIngredient(null);
                }
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

  const filteredIngredients = ingredients.filter((item) => {
    const query = search.toLowerCase();
    return item.name?.toLowerCase().includes(query) || item.unit_symbol?.toLowerCase().includes(query);
  });

  // --- LEFT PANEL (Main screen on Mobile: Item List + Search + FAB) ---
  const leftPanel = (
    <View style={styles.leftPanelContainer}>
      <DripSearchBar
        placeholder="Search ingredients..."
        value={search}
        onChangeText={setSearch}
        onClear={() => setSearch('')}
        style={styles.searchBar}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : filteredIngredients.length === 0 ? (
        <View style={styles.emptyListContainer}>
          <Scale size={48} color={theme.textTertiary || '#888'} />
          <Text style={[styles.emptyListText, { color: theme.textSecondary }]}>
            {search ? 'No ingredients match search' : 'No ingredients found'}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
          {filteredIngredients.map((item) => {
            const isSelected = selectedIngredient?.id === item.id;

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                style={[
                  styles.ingredientCard,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.card,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setSelectedIngredient(item)}
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
                      {item.name}
                    </Text>
                    <Text
                      style={[
                        styles.cardSubText,
                        { color: isSelected ? '#CBD5E1' : theme.textSecondary },
                      ]}
                    >
                      Unit: {item.unit_symbol || 'Base'} • Min Stock: {item.minimum_stock || 0}
                    </Text>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[
                        styles.actionIconBtn,
                        { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : theme.input },
                      ]}
                      onPress={() => handleEditIngredient(item)}
                    >
                      <Edit size={16} color={isSelected ? '#FFFFFF' : theme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.actionIconBtn,
                        { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#FEE2E2' },
                      ]}
                      onPress={() => handleDeleteIngredient(item.id)}
                    >
                      <Trash2 size={16} color={isSelected ? '#FFFFFF' : theme.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* FAB Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.fabButton, { backgroundColor: theme.primary }]}
        onPress={handleAddIngredient}
      >
        <Plus size={22} color="#FFFFFF" />
        <Text style={styles.fabText}>New Ingredient</Text>
      </TouchableOpacity>
    </View>
  );

  // --- RIGHT PANEL (Next screen on Mobile & Right panel on Tablet) ---
  const rightPanel = selectedIngredient ? (
    <View style={styles.detailsContainer}>
      <View style={[styles.detailsHeader, { borderBottomColor: theme.border }]}>
        <View style={styles.detailsTitleRow}>
          <View style={[styles.detailsIconBadge, { backgroundColor: theme.input }]}>
            <Scale size={28} color={theme.primary} />
          </View>
          <View style={styles.detailsHeaderMeta}>
            <Text style={[styles.detailsTitle, { color: theme.text }]} numberOfLines={1}>
              {selectedIngredient.name}
            </Text>
            <Text style={[styles.detailsSubtitle, { color: theme.textSecondary }]}>
              Base Unit: {selectedIngredient.unit_name || selectedIngredient.unit_symbol}
            </Text>
          </View>
        </View>

        <View style={styles.detailsHeaderActions}>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => handleEditIngredient(selectedIngredient)}
          >
            <Edit size={18} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => handleDeleteIngredient(selectedIngredient.id)}
          >
            <Trash2 size={18} color={theme.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.infoCardTitle, { color: theme.text }]}>Ingredient Details</Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Name:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{selectedIngredient.name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Base Unit:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {selectedIngredient.unit_name} ({selectedIngredient.unit_symbol})
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Minimum Stock Threshold:</Text>
            <Text style={[styles.infoValue, { color: theme.primary, fontWeight: '700' }]}>
              {selectedIngredient.minimum_stock || 0} {selectedIngredient.unit_symbol}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  ) : (
    <View style={styles.emptyDetailsState}>
      <Scale size={64} color={theme.textTertiary || '#888'} />
      <Text style={[styles.emptyDetailsTitle, { color: theme.text }]}>No Ingredient Selected</Text>
      <Text style={[styles.emptyDetailsSubtext, { color: theme.textSecondary }]}>
        Select an ingredient from the list to view its details.
      </Text>
    </View>
  );

  return (
    <>
      <Header title="Ingredients" />
      <Section
        leftPanel={leftPanel}
        rightPanel={rightPanel}
        showNextScreen={!!selectedIngredient}
        onBack={() => setSelectedIngredient(null)}
        backButtonTitle="Back to Ingredients"
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
  ingredientCard: {
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
    marginBottom: 4,
  },
  cardSubText: {
    fontSize: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionIconBtn: {
    padding: 8,
    borderRadius: 6,
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

  // Details Panel
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
  detailsSubtitle: {
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
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