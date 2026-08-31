import { DripButton } from '@/components/Button';
import { DripDatePicker } from '@/components/DatePicker';
import { DripInput } from '@/components/Input';
import { DripSheet } from '@/components/Sheet';
import { useTheme } from '@/constants/colorTheme';
import { PurchaseOrder } from '@/lib/database';
import { formatCurrency } from '@/lib/utils';
import { CheckCircle2, PackageCheck } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

interface ReceiveItemState {
  itemId: number;
  ingredientId: number;
  ingredientName: string;
  unitName: string;
  multiplierToBase: number;
  baseUnitSymbol: string;
  quantityOrdered: number;
  quantityReceived: string;
  actualCost: string;
  expirationDate: string;
}

interface ReceiveGoodsFormSheetProps {
  visible: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrder | null;
  onSubmit: (data: {
    poId: number;
    items: Array<{
      itemId: number;
      quantityReceived: number;
      actualCost?: number;
      expirationDate?: string | null;
    }>;
  }) => void;
  loading?: boolean;
}

export const ReceiveGoodsFormSheet: React.FC<ReceiveGoodsFormSheetProps> = ({
  visible,
  onClose,
  purchaseOrder,
  onSubmit,
  loading = false,
}) => {
  const { theme } = useTheme();
  const [items, setItems] = useState<ReceiveItemState[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible && purchaseOrder && purchaseOrder.items) {
      setItems(
        purchaseOrder.items.map((it) => ({
          itemId: it.id,
          ingredientId: it.ingredient_id,
          ingredientName: it.ingredient_name || 'Ingredient',
          unitName: it.unit_name,
          multiplierToBase: it.multiplier_to_base || 1,
          baseUnitSymbol: it.base_unit_symbol || 'unit',
          quantityOrdered: it.quantity_ordered,
          quantityReceived: it.quantity_ordered.toString(),
          actualCost: it.total_price.toString(),
          expirationDate: '',
        }))
      );
      setErrors({});
    }
  }, [visible, purchaseOrder]);

  const updateItem = (index: number, field: keyof ReceiveItemState, value: string) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    items.forEach((it, idx) => {
      const qty = parseFloat(it.quantityReceived);
      if (isNaN(qty) || qty < 0) {
        errs[`item_${idx}_qty`] = 'Valid received quantity required';
      }
      const cost = parseFloat(it.actualCost);
      if (isNaN(cost) || cost < 0) {
        errs[`item_${idx}_cost`] = 'Valid cost required';
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleConfirm = () => {
    if (!purchaseOrder) return;
    if (!validate()) return;

    onSubmit({
      poId: purchaseOrder.id,
      items: items.map((it) => ({
        itemId: it.itemId,
        quantityReceived: parseFloat(it.quantityReceived) || 0,
        actualCost: parseFloat(it.actualCost) || 0,
        expirationDate: it.expirationDate || null,
      })),
    });
  };

  const calculateTotalReceivedCost = () => {
    return items.reduce((sum, it) => sum + (parseFloat(it.actualCost) || 0), 0);
  };

  const footer = (
    <View style={styles.footer}>
      <View style={styles.footerRow}>
        <Text style={[styles.footerLabel, { color: theme.textSecondary }]}>Total Received Value:</Text>
        <Text style={[styles.footerVal, { color: theme.primary }]}>
          {formatCurrency(calculateTotalReceivedCost())}
        </Text>
      </View>
      <DripButton
        title="Confirm & Receive Stock"
        onPress={handleConfirm}
        loading={loading}
      />
    </View>
  );

  return (
    <DripSheet
      visible={visible}
      onClose={onClose}
      title="Goods Receipt (Penerimaan Stok)"
      headerIcon={<PackageCheck size={20} color={theme.primary} />}
      footer={footer}
    >
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {purchaseOrder && (
          <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>PO Number:</Text>
              <Text style={[styles.summaryVal, { color: theme.text }]}>{purchaseOrder.po_number}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Supplier:</Text>
              <Text style={[styles.summaryVal, { color: theme.text }]}>{purchaseOrder.supplier_name || 'N/A'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Order Date:</Text>
              <Text style={[styles.summaryVal, { color: theme.text }]}>{purchaseOrder.order_date}</Text>
            </View>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Verify Physical Goods Received
        </Text>
        <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>
          Input verified physical quantities and costs. Stock batches will be created automatically in warehouse inventory.
        </Text>

        {items.map((it, idx) => {
          const qty = parseFloat(it.quantityReceived) || 0;
          const baseQty = qty * it.multiplierToBase;
          const cost = parseFloat(it.actualCost) || 0;
          const costPerBase = baseQty > 0 ? cost / baseQty : 0;

          return (
            <View key={it.itemId} style={[styles.itemCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.itemHeader}>
                <View style={styles.itemTitleGroup}>
                  <CheckCircle2 size={16} color={theme.primary} />
                  <Text style={[styles.itemName, { color: theme.text }]}>{it.ingredientName}</Text>
                </View>
                <Text style={[styles.orderedBadge, { color: theme.textSecondary }]}>
                  Ordered: {it.quantityOrdered} {it.unitName}
                </Text>
              </View>

              <DripInput
                label={`Qty Received (${it.unitName})`}
                value={it.quantityReceived}
                onChangeText={(val) => updateItem(idx, 'quantityReceived', val)}
                error={errors[`item_${idx}_qty`]}
                keyboardType="numeric"
              />

              <DripInput
                label="Total Cost Paid (Rp)"
                value={it.actualCost}
                onChangeText={(val) => updateItem(idx, 'actualCost', val)}
                error={errors[`item_${idx}_cost`]}
                keyboardType="numeric"
              />

              <DripDatePicker
                label="Expiration Date (Optional)"
                value={it.expirationDate}
                onSelect={(val: string) => updateItem(idx, 'expirationDate', val)}
              />

              <View style={[styles.calcSummary, { backgroundColor: theme.input }]}>
                <Text style={[styles.calcText, { color: theme.textSecondary }]}>
                  Adding <Text style={{ fontWeight: '700', color: theme.text }}>{baseQty} {it.baseUnitSymbol}</Text> @{' '}
                  <Text style={{ fontWeight: '700', color: theme.primary }}>Rp {costPerBase.toFixed(2)}/{it.baseUnitSymbol}</Text>
                </Text>
              </View>
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </DripSheet>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  summaryCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  itemCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
  },
  orderedBadge: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  calcSummary: {
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  calcText: {
    fontSize: 12,
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
    fontSize: 14,
    fontWeight: '600',
  },
  footerVal: {
    fontSize: 18,
    fontWeight: '800',
  },
});
