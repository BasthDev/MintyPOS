import { DripButton } from '@/components/Button';
import { DeskInput } from '@/components/DeskInput';
import { DripInput } from '@/components/Input';
import { DripSheet } from '@/components/Sheet';
import { useTheme } from '@/constants/colorTheme';
import { getCurrentStock, getDatabase, SemiProduct, SemiProductRecipe } from '@/lib/database';
import { formatCurrency } from '@/lib/utils';
import { AlertCircle, ChefHat, CheckCircle2, Flame } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

interface SemiProductBatchFormSheetProps {
  visible: boolean;
  onClose: () => void;
  semiProduct: SemiProduct | null;
  onSubmit: (data: {
    semiProductId: number;
    targetProducedBaseQty: number;
    notes?: string;
  }) => void;
  loading?: boolean;
}

interface ComponentDemand {
  ingredientId: number;
  ingredientName: string;
  unitSymbol: string;
  requiredBaseQty: number;
  availableStock: number;
  unitCost: number;
  totalCost: number;
  isSufficient: boolean;
}

export const SemiProductBatchFormSheet: React.FC<SemiProductBatchFormSheetProps> = ({
  visible,
  onClose,
  semiProduct,
  onSubmit,
  loading = false,
}) => {
  const { theme } = useTheme();

  const [producedQuantity, setProducedQuantity] = useState('1000');
  const [notes, setNotes] = useState('');
  const [formula, setFormula] = useState<SemiProductRecipe[]>([]);
  const [demands, setDemands] = useState<ComponentDemand[]>([]);
  const [loadingFormula, setLoadingFormula] = useState(false);

  useEffect(() => {
    if (visible && semiProduct) {
      setProducedQuantity((semiProduct.yield_quantity || 1000).toString());
      setNotes('');
      loadFormulaAndStock(semiProduct);
    }
  }, [visible, semiProduct]);

  const loadFormulaAndStock = async (sp: SemiProduct) => {
    setLoadingFormula(true);
    try {
      const db = await getDatabase();
      const recipes = await db.getAllAsync<SemiProductRecipe>(`
        SELECT spr.*, i.name as ingredient_name, u.symbol as unit_symbol
        FROM semi_product_recipes spr
        JOIN ingredients i ON spr.ingredient_id = i.id
        LEFT JOIN units u ON i.base_unit_id = u.id
        WHERE spr.semi_product_id = ?
      `, [sp.id]);

      setFormula(recipes);
      await recalculateDemands(recipes, sp.yield_quantity || 1, parseFloat(producedQuantity) || sp.yield_quantity || 1);
    } catch (e) {
      console.error('Failed to load formula for batch:', e);
    } finally {
      setLoadingFormula(false);
    }
  };

  const recalculateDemands = async (
    recipes: SemiProductRecipe[],
    standardYield: number,
    targetQty: number
  ) => {
    if (standardYield <= 0) standardYield = 1;
    if (targetQty <= 0) targetQty = 0;

    const scale = targetQty / standardYield;
    const db = await getDatabase();

    const items: ComponentDemand[] = [];
    for (const r of recipes) {
      const needed = r.quantity_needed_base * scale;
      const available = await getCurrentStock(db, r.ingredient_id);

      const batch = await db.getFirstAsync<{ cost_per_base_unit: number }>(
        `SELECT cost_per_base_unit FROM inventory_batches 
         WHERE ingredient_id = ? AND remaining_quantity_base > 0 
         ORDER BY received_date ASC LIMIT 1`,
        [r.ingredient_id]
      );
      const unitCost = batch?.cost_per_base_unit || 0;

      items.push({
        ingredientId: r.ingredient_id,
        ingredientName: r.ingredient_name || 'Ingredient',
        unitSymbol: r.unit_symbol || 'unit',
        requiredBaseQty: needed,
        availableStock: available,
        unitCost,
        totalCost: needed * unitCost,
        isSufficient: available >= needed,
      });
    }

    setDemands(items);
  };

  const handleQtyChange = (text: string) => {
    setProducedQuantity(text);
    const parsed = parseFloat(text) || 0;
    if (semiProduct) {
      recalculateDemands(formula, semiProduct.yield_quantity || 1, parsed);
    }
  };

  const hasShortage = demands.some((d) => !d.isSufficient);
  const totalBatchCost = demands.reduce((sum, d) => sum + d.totalCost, 0);
  const targetNum = parseFloat(producedQuantity) || 0;
  const costPerUnit = targetNum > 0 ? totalBatchCost / targetNum : 0;

  const handleExecute = () => {
    if (!semiProduct) return;
    if (targetNum <= 0) {
      alert('Please enter a valid production quantity');
      return;
    }
    if (hasShortage) {
      alert('Cannot process batch: Some raw ingredients do not have sufficient stock.');
      return;
    }

    onSubmit({
      semiProductId: semiProduct.id,
      targetProducedBaseQty: targetNum,
      notes: notes.trim() || undefined,
    });
  };

  const footer = (
    <View style={styles.footer}>
      <View style={styles.footerRow}>
        <View>
          <Text style={[styles.footerLabel, { color: theme.textSecondary }]}>Total Batch Cost:</Text>
          <Text style={[styles.footerCost, { color: theme.primary }]}>
            {formatCurrency(totalBatchCost)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.footerLabel, { color: theme.textSecondary }]}>HPP per {semiProduct?.base_unit_symbol || 'unit'}:</Text>
          <Text style={[styles.footerUnitHpp, { color: theme.text }]}>
            {formatCurrency(costPerUnit)}
          </Text>
        </View>
      </View>
      <DripButton
        title={hasShortage ? 'Insufficient Raw Stock' : 'Cook & Process Batch'}
        onPress={handleExecute}
        loading={loading || loadingFormula}
        disabled={hasShortage || targetNum <= 0}
      />
    </View>
  );

  return (
    <DripSheet
      visible={visible}
      onClose={onClose}
      title="Produce Batch"
      headerIcon={<Flame size={20} color={theme.warning || '#F59E0B'} />}
      footer={footer}
    >
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {semiProduct && (
          <View style={[styles.productHeaderCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.productHeaderTop}>
              <ChefHat size={24} color={theme.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.productName, { color: theme.text }]}>{semiProduct.name}</Text>
                <Text style={[styles.productSub, { color: theme.textSecondary }]}>
                  Current Stock: {semiProduct.current_stock} {semiProduct.base_unit_symbol || 'unit'} • Standard Yield: {semiProduct.yield_quantity} {semiProduct.base_unit_symbol}
                </Text>
              </View>
            </View>
          </View>
        )}

        <DripInput
          label={`Target Output Quantity (${semiProduct?.base_unit_symbol || 'unit'})`}
          value={producedQuantity}
          onChangeText={handleQtyChange}
          placeholder="e.g. 1000"
          keyboardType="numeric"
        />

        <DeskInput
          label="Production Notes (Optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. Morning batch, main kitchen batch..."
          numberOfLines={2}
        />

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Raw Ingredients Deduction Preview
        </Text>
        <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>
          Raw ingredient stock will be automatically deducted using FIFO/FEFO upon batch execution.
        </Text>

        {demands.length === 0 ? (
          <View style={[styles.emptyFormulaCard, { borderColor: theme.border }]}>
            <Text style={[styles.emptyFormulaText, { color: theme.textSecondary }]}>
              Semi-product does not have any recipe components configured yet.
            </Text>
          </View>
        ) : (
          demands.map((d) => (
            <View
              key={d.ingredientId}
              style={[
                styles.demandCard,
                {
                  backgroundColor: d.isSufficient ? theme.card : '#FEF2F2',
                  borderColor: d.isSufficient ? theme.border : theme.error,
                },
              ]}
            >
              <View style={styles.demandTop}>
                <View style={styles.demandLeft}>
                  {d.isSufficient ? (
                    <CheckCircle2 size={16} color={theme.primary} />
                  ) : (
                    <AlertCircle size={16} color={theme.error} />
                  )}
                  <Text style={[styles.demandIngName, { color: theme.text }]}>{d.ingredientName}</Text>
                </View>
                <Text
                  style={[
                    styles.demandStatusText,
                    { color: d.isSufficient ? theme.primary : theme.error, fontWeight: '700' },
                  ]}
                >
                  {d.isSufficient ? 'Stock Ready' : 'Insufficient Stock!'}
                </Text>
              </View>

              <View style={styles.demandDetailsRow}>
                <Text style={[styles.demandDetailText, { color: theme.textSecondary }]}>
                  Required: <Text style={{ fontWeight: '700', color: theme.text }}>{d.requiredBaseQty.toFixed(1)} {d.unitSymbol}</Text>
                </Text>
                <Text style={[styles.demandDetailText, { color: theme.textSecondary }]}>
                  Available in Stock: <Text style={{ fontWeight: '700', color: d.isSufficient ? theme.text : theme.error }}>{d.availableStock} {d.unitSymbol}</Text>
                </Text>
              </View>

              <View style={[styles.demandCostRow, { borderTopColor: theme.border }]}>
                <Text style={[styles.demandDetailText, { color: theme.textSecondary }]}>
                  Cost: {formatCurrency(d.unitCost)}/{d.unitSymbol}
                </Text>
                <Text style={[styles.demandDetailCost, { color: theme.text }]}>
                  Subtotal: {formatCurrency(d.totalCost)}
                </Text>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </DripSheet>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  productHeaderCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  productHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
  },
  productSub: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  emptyFormulaCard: {
    padding: 20,
    borderWidth: 1,
    borderRadius: 10,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyFormulaText: {
    fontSize: 13,
  },
  demandCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  demandTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  demandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  demandIngName: {
    fontSize: 14,
    fontWeight: '700',
  },
  demandStatusText: {
    fontSize: 12,
  },
  demandDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  demandDetailText: {
    fontSize: 12,
  },
  demandCostRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
  },
  demandDetailCost: {
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    gap: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 12,
  },
  footerCost: {
    fontSize: 18,
    fontWeight: '800',
  },
  footerUnitHpp: {
    fontSize: 16,
    fontWeight: '700',
  },
});
