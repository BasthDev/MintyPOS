import { DripSheet } from '../Sheet';
import { DripInput } from '../Input';
import { DripButton } from '../Button';
import { DripDropdown } from '../Dropdown';
import { Package } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../constants/colorTheme';
import { getDatabase } from '../../lib/database';
import { dbOperations } from '../../lib/database';

interface ProductRestockFormSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    productId: number;
    quantityToAdd: number;
  }) => void;
  mode: 'create';
}

export const ProductRestockFormSheet: React.FC<ProductRestockFormSheetProps> = ({
  visible,
  onClose,
  onSubmit,
  mode,
}) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    productId: '',
    quantityToAdd: '',
  });
  const [errors, setErrors] = useState<{
    productId?: string;
    quantityToAdd?: string;
  }>({});
  const [products, setProducts] = useState<Array<any>>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (visible) {
      loadProducts();
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setFormData({
        productId: '',
        quantityToAdd: '',
      });
      setErrors({});
    }
  }, [visible]);

  const loadProducts = async () => {
    setLoadingData(true);
    try {
      const db = await getDatabase();
      // Only load products with HPP OFF and Use Product Stock ON
      const productList = await db.getAllAsync(`
        SELECT * FROM products 
        WHERE recipe_definition_id IS NULL 
        AND stock_deduction_method = 'product'
        ORDER BY name
      `);
      setProducts(productList);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const validateForm = () => {
    const newErrors: {
      productId?: string;
      quantityToAdd?: string;
    } = {};

    if (!formData.productId) {
      newErrors.productId = 'Product is required';
    }

    if (!formData.quantityToAdd) {
      newErrors.quantityToAdd = 'Quantity is required';
    } else {
      const quantity = parseFloat(formData.quantityToAdd);
      if (isNaN(quantity) || quantity <= 0) {
        newErrors.quantityToAdd = 'Quantity must be a positive number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit({
        productId: parseInt(formData.productId),
        quantityToAdd: parseFloat(formData.quantityToAdd),
      });
    }
  };

  const productOptions = products.map(product => ({
    label: `${product.name} (Current: ${product.current_stock || 0})`,
    value: product.id.toString(),
  }));

  const footer = (
    <DripButton
      title="Restock Product"
      onPress={handleSubmit}
      loading={loadingData}
    />
  );

  return (
    <DripSheet
      visible={visible}
      onClose={onClose}
      title="Restock Product"
      headerIcon={<Package size={20} color={theme.primary} />}
      footer={footer}
      loading={loadingData}
    >
      <View>
        <DripDropdown
          label="Product"
          options={productOptions}
          value={formData.productId}
          onSelect={(value) => setFormData({ ...formData, productId: value })}
          error={errors.productId}
          disabled={loadingData}
        />

        <DripInput
          label="Quantity to Add"
          value={formData.quantityToAdd}
          onChangeText={(text) => setFormData({ ...formData, quantityToAdd: text })}
          error={errors.quantityToAdd}
          placeholder="0"
          keyboardType="numeric"
        />
      </View>
    </DripSheet>
  );
};