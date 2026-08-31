import { DripButton } from '@/components/Button';
import { DripDatePicker } from '@/components/DatePicker';
import { DeskInput } from '@/components/DeskInput';
import { DripDropdown } from '@/components/Dropdown';
import { DripInput } from '@/components/Input';
import { DripSheet } from '@/components/Sheet';
import { useTheme } from '@/constants/colorTheme';
import { dbOperations, getDatabase, Ingredient, Supplier } from '@/lib/database';
import { formatCurrency } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { Plus, ShoppingCart, Trash2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface POItemInput {
  id: string;
  ingredientId: string;
  quantityOrdered: string;
  unitName: string;
  multiplierToBase: string;
  unitPrice: string;
}

interface PurchaseOrderFormSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    poNumber: string;
    supplierId: number;
    orderDate: string;
    expectedDate?: string | null;
    notes?: string | null;
    items: Array<{
      ingredientId: number;
      quantityOrdered: number;
      unitName: string;
      multiplierToBase: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  }) => void;
  initialData?: any;
  mode: 'create' | 'edit';
}

export const PurchaseOrderFormSheet: React.FC<PurchaseOrderFormSheetProps> = ({
  visible,
  onClose,
  onSubmit,
  initialData,
  mode,
}) => {
  const { theme } = useTheme();
  const currency = useStore((state) => state.currency);

  const [poNumber, setPoNumber] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<POItemInput[]>([
    {
      id: '1',
      ingredientId: '',
      quantityOrdered: '',
      unitName: '',
      multiplierToBase: '1',
      unitPrice: '',
    },
  ]);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      loadMasterData();
      if (initialData) {
        setPoNumber(initialData.po_number || initialData.poNumber || '');
        setSupplierId(initialData.supplier_id ? initialData.supplier_id.toString() : '');
        setOrderDate(initialData.order_date || new Date().toISOString().split('T')[0]);
        setExpectedDate(initialData.expected_date || '');
        setNotes(initialData.notes || '');
        if (initialData.items && initialData.items.length > 0) {
          setItems(
            initialData.items.map((it: any, idx: number) => ({
              id: idx.toString(),
              ingredientId: it.ingredient_id.toString(),
              quantityOrdered: it.quantity_ordered.toString(),
              unitName: it.unit_name || '',
              multiplierToBase: (it.multiplier_to_base || 1).toString(),
              unitPrice: it.unit_price.toString(),
            }))
          );
        }
      } else {
        const rand = Math.floor(1000 + Math.random() * 9000);
        const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
        setPoNumber(`PO-${dateStr}-${rand}`);
        setSupplierId('');
        setOrderDate(new Date().toISOString().split('T')[0]);
        setExpectedDate('');
        setNotes('');
        setItems([
          {
            id: '1',
            ingredientId: '',
            quantityOrdered: '',
            unitName: '',
            multiplierToBase: '1',
            unitPrice: '',
          },
        ]);
      }
      setErrors({});
    }
  }, [visible]);

  const loadMasterData = async () => {
    setLoadingData(true);
    try {
      const db = await getDatabase();
      const [suppList, ingList] = await Promise.all([
        dbOperations.getAllSuppliers(db),
        dbOperations.getAllIngredients(db),
      ]);
      setSuppliers(suppList);
      setIngredients(ingList);
    } catch (e) {
      console.error('Failed to load PO master data:', e);
    } finally {
      setLoadingData(false);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        ingredientId: '',
        quantityOrdered: '',
        unitName: '',
        multiplierToBase: '1',
        unitPrice: '',
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((it) => it.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof POItemInput, value: string) => {
    setItems(
      items.map((it) => {
        if (it.id !== id) return it;
        return { ...it, [field]: value };
      })
    );
  };

  const handleIngredientChange = useCallback((id: string, value: string) => {
    const selectedIng = ingredients.find((i) => i.id.toString() === value);
    const unitSymbol = (selectedIng as any)?.unit_symbol || 'unit';

    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id
          ? {
              ...item,
              ingredientId: value,
              unitName: item.unitName || unitSymbol,
              multiplierToBase: item.multiplierToBase || '1',
            }
          : item
      )
    );
  }, [ingredients]);

  const calculateTotal = () => {
    return items.reduce((sum, it) => {
      const qty = parseFloat(it.quantityOrdered) || 0;
      const price = parseFloat(it.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!poNumber.trim()) errs.poNumber = 'PO number is required';
    if (!supplierId) errs.supplierId = 'Supplier is required';
    if (!orderDate) errs.orderDate = 'Order date is required';

    items.forEach((it, idx) => {
      if (!it.ingredientId) errs[`item_${idx}_ing`] = 'Ingredient is required';
      const qty = parseFloat(it.quantityOrdered);
      if (!it.quantityOrdered || isNaN(qty) || qty <= 0) {
        errs[`item_${idx}_qty`] = 'Quantity must be a positive number';
      }
      const price = parseFloat(it.unitPrice);
      if (it.unitPrice === '' || isNaN(price) || price < 0) {
        errs[`item_${idx}_price`] = 'Price must be a valid number';
      }
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    onSubmit({
      poNumber: poNumber.trim(),
      supplierId: parseInt(supplierId, 10),
      orderDate,
      expectedDate: expectedDate || null,
      notes: notes.trim() || null,
      items: items.map((it) => {
        const qty = parseFloat(it.quantityOrdered);
        const price = parseFloat(it.unitPrice);
        const mult = parseFloat(it.multiplierToBase) || 1;
        return {
          ingredientId: parseInt(it.ingredientId, 10),
          quantityOrdered: qty,
          unitName: it.unitName || 'unit',
          multiplierToBase: mult,
          unitPrice: price,
          totalPrice: qty * price,
        };
      }),
    });
  };

  const supplierOptions = suppliers.map((s) => ({
    label: s.name,
    value: s.id.toString(),
  }));

  const ingredientOptions = ingredients.map((i) => ({
    label: `${i.name} (${(i as any).unit_symbol || 'unit'})`,
    value: i.id.toString(),
  }));

  const getUnitEquivalent = (item: POItemInput) => {
    const selected = ingredients.find((i) => i.id.toString() === item.ingredientId);
    if (!selected || !item.quantityOrdered) return '';
    const symbol = (selected as any).unit_symbol || 'unit';
    const qty = parseFloat(item.quantityOrdered) || 0;
    const mult = parseFloat(item.multiplierToBase) || 1;
    const totalBase = qty * mult;
    return `(Total stok: ${totalBase} ${symbol})`;
  };

  const footer = (
    <DripButton
      title={mode === 'create' ? `Create PO (${formatCurrency(calculateTotal())})` : `Update PO (${formatCurrency(calculateTotal())})`}
      onPress={handleSubmit}
      loading={loadingData}
    />
  );

  return (
    <DripSheet
      visible={visible}
      onClose={onClose}
      title={mode === 'create' ? 'New Purchase Order (PO)' : 'Edit Purchase Order'}
      headerIcon={<ShoppingCart size={20} color={theme.primary} />}
      footer={footer}
      loading={loadingData}
    >
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header Order Information - 1 input per line */}
        <DripInput
          label="PO Number"
          value={poNumber}
          onChangeText={setPoNumber}
          error={errors.poNumber}
          placeholder="PO-XXXXXX"
        />

        <DripDropdown
          label="Supplier"
          options={supplierOptions}
          value={supplierId}
          onSelect={setSupplierId}
          error={errors.supplierId}
          placeholder="Select Supplier"
        />

        <DripDatePicker
          label="Order Date"
          value={orderDate}
          onSelect={setOrderDate}
          error={errors.orderDate}
        />

        <DripDatePicker
          label="Expected Delivery Date (Optional)"
          value={expectedDate}
          onSelect={setExpectedDate}
        />

        <DeskInput
          label="Notes / Instructions (Optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. Catatan untuk supplier atau instruksi pengiriman..."
          numberOfLines={3}
        />

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Ordered Items ({items.length})
        </Text>

        {/* Ordered items list - matching Restock design */}
        {items.map((item, index) => {
          const selected = ingredients.find((i) => i.id.toString() === item.ingredientId);
          const symbol = (selected as any)?.unit_symbol || 'unit';

          return (
            <View key={item.id} style={[styles.itemContainer, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <View style={styles.itemHeader}>
                <Text style={[styles.itemLabel, { color: theme.text }]}>Item #{index + 1}</Text>
                {items.length > 1 && (
                  <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.removeButton}>
                    <Trash2 size={16} color={theme.error} />
                  </TouchableOpacity>
                )}
              </View>

              <DripDropdown
                label="Ingredient"
                options={ingredientOptions}
                value={item.ingredientId}
                onSelect={(value) => handleIngredientChange(item.id, value)}
                error={errors[`item_${index}_ing`]}
                disabled={loadingData}
                placeholder="Select ingredient"
              />

              <DripInput
                label="Quantity Ordered"
                value={item.quantityOrdered}
                onChangeText={(text) => updateItem(item.id, 'quantityOrdered', text)}
                error={errors[`item_${index}_qty`]}
                placeholder="0"
                keyboardType="numeric"
                helperText={getUnitEquivalent(item)}
              />

              <DripInput
                label="Unit Name (e.g. kg, sack, pcs, karton)"
                value={item.unitName}
                onChangeText={(text) => updateItem(item.id, 'unitName', text)}
                placeholder={symbol}
              />

              <DripInput
                label={`Unit Multiplier (1 ${item.unitName || 'unit'} = ... ${symbol})`}
                value={item.multiplierToBase}
                onChangeText={(text) => updateItem(item.id, 'multiplierToBase', text)}
                placeholder="1"
                keyboardType="numeric"
              />

              <DripInput
                label={`Unit Price (${currency?.symbol || 'Rp'})`}
                value={item.unitPrice}
                onChangeText={(text) => updateItem(item.id, 'unitPrice', text)}
                error={errors[`item_${index}_price`]}
                placeholder="0"
                keyboardType="numeric"
              />

              {item.quantityOrdered && item.unitPrice ? (
                <View style={[styles.lineTotalContainer, { backgroundColor: theme.input }]}>
                  <Text style={[styles.lineTotalText, { color: theme.textSecondary }]}>
                    Subtotal Item: <Text style={{ fontWeight: '700', color: theme.primary }}>{formatCurrency((parseFloat(item.quantityOrdered) || 0) * (parseFloat(item.unitPrice) || 0))}</Text>
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })}

        <TouchableOpacity
          onPress={addItem}
          style={[styles.addButton, { borderColor: theme.primary }]}
        >
          <Plus size={18} color={theme.primary} />
          <Text style={[styles.addButtonText, { color: theme.primary }]}>Add Another Item</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
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
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  itemContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  removeButton: {
    padding: 4,
  },
  lineTotalContainer: {
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  lineTotalText: {
    fontSize: 13,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    borderStyle: 'dashed',
    gap: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
