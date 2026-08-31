import { DripButton } from '@/components/Button';
import { DripDropdown } from '@/components/Dropdown';
import { DripInput } from '@/components/Input';
import { DripSheet } from '@/components/Sheet';
import { useTheme } from '@/constants/colorTheme';
import { dbOperations, getDatabase, Ingredient, Unit } from '@/lib/database';
import { Layers, Plus, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SemiFormulaItemInput {
  id: string;
  ingredientId: string;
  quantityNeededBase: string;
}

interface SemiProductFormSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    code?: string | null;
    baseUnitId: number;
    yieldQuantity: number;
    minimumStock?: number;
    ingredients: Array<{ ingredientId: number; quantityNeededBase: number }>;
  }) => void;
  initialData?: any;
  mode: 'create' | 'edit';
}

export const SemiProductFormSheet: React.FC<SemiProductFormSheetProps> = ({
  visible,
  onClose,
  onSubmit,
  initialData,
  mode,
}) => {
  const { theme } = useTheme();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [baseUnitId, setBaseUnitId] = useState('');
  const [yieldQuantity, setYieldQuantity] = useState('1000');
  const [minimumStock, setMinimumStock] = useState('0');

  const [formulaItems, setFormulaItems] = useState<SemiFormulaItemInput[]>([
    { id: '1', ingredientId: '', quantityNeededBase: '' },
  ]);

  const [units, setUnits] = useState<Unit[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      loadMasterData();
      if (initialData) {
        setName(initialData.name || '');
        setCode(initialData.code || '');
        setBaseUnitId(initialData.base_unit_id ? initialData.base_unit_id.toString() : '');
        setYieldQuantity(initialData.yield_quantity ? initialData.yield_quantity.toString() : '1000');
        setMinimumStock(initialData.minimum_stock ? initialData.minimum_stock.toString() : '0');
        if (initialData.ingredients && initialData.ingredients.length > 0) {
          setFormulaItems(
            initialData.ingredients.map((it: any, idx: number) => ({
              id: idx.toString(),
              ingredientId: it.ingredient_id.toString(),
              quantityNeededBase: it.quantity_needed_base.toString(),
            }))
          );
        } else {
          setFormulaItems([{ id: '1', ingredientId: '', quantityNeededBase: '' }]);
        }
      } else {
        setName('');
        setCode('');
        setBaseUnitId('');
        setYieldQuantity('1000');
        setMinimumStock('0');
        setFormulaItems([{ id: '1', ingredientId: '', quantityNeededBase: '' }]);
      }
      setErrors({});
    }
  }, [visible, initialData]);

  const loadMasterData = async () => {
    setLoading(true);
    try {
      const db = await getDatabase();
      const [unitList, ingList] = await Promise.all([
        dbOperations.getAllUnits(db),
        dbOperations.getAllIngredients(db),
      ]);
      setUnits(unitList);
      setIngredients(ingList);
      if (!baseUnitId && unitList.length > 0) {
        // default to gram or pcs or first
        const gUnit = unitList.find((u) => u.name.toLowerCase() === 'gram' || u.symbol === 'g');
        if (gUnit) setBaseUnitId(gUnit.id.toString());
      }
    } catch (e) {
      console.error('Failed to load semi-product master data:', e);
    } finally {
      setLoading(false);
    }
  };

  const addFormulaItem = () => {
    setFormulaItems([
      ...formulaItems,
      { id: Date.now().toString(), ingredientId: '', quantityNeededBase: '' },
    ]);
  };

  const removeFormulaItem = (id: string) => {
    if (formulaItems.length > 1) {
      setFormulaItems(formulaItems.filter((f) => f.id !== id));
    }
  };

  const updateFormulaItem = (id: string, field: keyof SemiFormulaItemInput, value: string) => {
    setFormulaItems(
      formulaItems.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Semi-product name is required';
    if (!baseUnitId) errs.baseUnitId = 'Unit is required';
    const yQty = parseFloat(yieldQuantity);
    if (!yieldQuantity || isNaN(yQty) || yQty <= 0) {
      errs.yieldQuantity = 'Yield quantity must be > 0';
    }

    formulaItems.forEach((f, idx) => {
      if (!f.ingredientId) errs[`f_${idx}_ing`] = 'Raw ingredient required';
      const q = parseFloat(f.quantityNeededBase);
      if (!f.quantityNeededBase || isNaN(q) || q <= 0) {
        errs[`f_${idx}_qty`] = 'Quantity must be > 0';
      }
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    onSubmit({
      name: name.trim(),
      code: code.trim() || null,
      baseUnitId: parseInt(baseUnitId, 10),
      yieldQuantity: parseFloat(yieldQuantity) || 1,
      minimumStock: parseFloat(minimumStock) || 0,
      ingredients: formulaItems.map((f) => ({
        ingredientId: parseInt(f.ingredientId, 10),
        quantityNeededBase: parseFloat(f.quantityNeededBase) || 0,
      })),
    });
  };

  const unitOptions = units.map((u) => ({
    label: `${u.name} (${u.symbol})`,
    value: u.id.toString(),
  }));

  const ingredientOptions = ingredients.map((i) => ({
    label: `${i.name} (${(i as any).unit_symbol || 'unit'})`,
    value: i.id.toString(),
  }));

  const selectedUnit = units.find((u) => u.id.toString() === baseUnitId);

  const footer = (
    <DripButton
      title={mode === 'create' ? 'Save Semi-Product & Formula' : 'Update Semi-Product'}
      onPress={handleSubmit}
      loading={loading}
    />
  );

  return (
    <DripSheet
      visible={visible}
      onClose={onClose}
      title={mode === 'create' ? 'New Semi-Finished Product' : 'Edit Semi-Product'}
      headerIcon={<Layers size={20} color={theme.primary} />}
      footer={footer}
    >
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <DripInput
          label="Semi-Product Name (e.g. Bumbu Nasi Goreng, Adonan Pizza)"
          value={name}
          onChangeText={setName}
          error={errors.name}
          placeholder="Enter item name"
        />

        <DripInput
          label="SKU / Item Code (Optional)"
          value={code}
          onChangeText={setCode}
          placeholder="SMP-001"
        />

        <DripDropdown
          label="Satuan Output / Unit"
          options={unitOptions}
          value={baseUnitId}
          onSelect={setBaseUnitId}
          error={errors.baseUnitId}
          placeholder="Select Unit (e.g. g, ml, pcs, kg)"
        />

        <DripInput
          label={`Standard Batch Yield (${selectedUnit?.symbol || 'unit'})`}
          value={yieldQuantity}
          onChangeText={setYieldQuantity}
          error={errors.yieldQuantity}
          placeholder="1000"
          keyboardType="numeric"
        />

        <DripInput
          label={`Min Stock Alert (${selectedUnit?.symbol || 'unit'})`}
          value={minimumStock}
          onChangeText={setMinimumStock}
          placeholder="0"
          keyboardType="numeric"
        />

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Recipe Formulation (Komponen Bahan Baku Mentah)
        </Text>
        <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>
          Tentukan takaran bahan baku mentah yang dibutuhkan untuk menghasilkan{' '}
          <Text style={{ fontWeight: '700', color: theme.primary }}>
            {yieldQuantity || '0'} {selectedUnit?.symbol || 'unit'}
          </Text>{' '}
          semi-produk ini.
        </Text>

        {formulaItems.map((f, idx) => {
          const selIng = ingredients.find((i) => i.id.toString() === f.ingredientId);
          return (
            <View key={f.id} style={[styles.formulaCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <View style={styles.formulaHeader}>
                <Text style={[styles.formulaIndex, { color: theme.primary }]}>Component #{idx + 1}</Text>
                {formulaItems.length > 1 && (
                  <TouchableOpacity onPress={() => removeFormulaItem(f.id)} style={styles.deleteBtn}>
                    <Trash2 size={16} color={theme.error} />
                  </TouchableOpacity>
                )}
              </View>

              <DripDropdown
                label="Raw Ingredient"
                options={ingredientOptions}
                value={f.ingredientId}
                onSelect={(val) => updateFormulaItem(f.id, 'ingredientId', val)}
                error={errors[`f_${idx}_ing`]}
                placeholder="Select raw ingredient"
              />

              <DripInput
                label={`Quantity Needed (${(selIng as any)?.unit_symbol || 'unit'})`}
                value={f.quantityNeededBase}
                onChangeText={(val) => updateFormulaItem(f.id, 'quantityNeededBase', val)}
                error={errors[`f_${idx}_qty`]}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
          );
        })}

        <TouchableOpacity onPress={addFormulaItem} style={[styles.addBtn, { borderColor: theme.primary }]}>
          <Plus size={18} color={theme.primary} />
          <Text style={[styles.addBtnText, { color: theme.primary }]}>Add Component Ingredient</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </DripSheet>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  formulaCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  formulaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  formulaIndex: {
    fontSize: 13,
    fontWeight: '700',
  },
  deleteBtn: {
    padding: 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
    gap: 8,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
