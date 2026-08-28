import { useTheme } from '@/constants/colorTheme';
import { Award, Settings2 } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';
import { DripButton } from '../Button';
import { DripDropdown } from '../Dropdown';
import { DripInput } from '../Input';
import { DripSheet } from '../Sheet';

export interface DropdownOption {
  label: string;
  value: string;
}

interface ActionSheetFormSheetProps {
  visible: boolean;
  onClose: () => void;
  customerOptions: DropdownOption[];
  selectedCustomer: string | undefined;
  onCustomerSelect: (value: string) => void;
  discountOptions: DropdownOption[];
  selectedDiscount: string | undefined;
  onDiscountSelect: (value: string) => void;
  customerPoints?: number;
  pointsToRedeem?: number;
  onPointsRedeemChange?: (value: number) => void;
  maxRedeemablePoints?: number;
  pointsToCurrencyRatio?: number;
}

export const ActionSheetFormSheet: React.FC<ActionSheetFormSheetProps> = ({
  visible,
  onClose,
  customerOptions,
  selectedCustomer,
  onCustomerSelect,
  discountOptions,
  selectedDiscount,
  onDiscountSelect,
  customerPoints = 0,
  pointsToRedeem = 0,
  onPointsRedeemChange,
  maxRedeemablePoints = 0,
  pointsToCurrencyRatio = 0,
}) => {
  const { theme } = useTheme();

  const hasCustomer = selectedCustomer && selectedCustomer !== '';
  const currencyValue = pointsToRedeem * pointsToCurrencyRatio;

  return (
    <DripSheet
      visible={visible}
      onClose={onClose}
      title="Actions"
      headerIcon={<Settings2 size={20} color={theme.primary} />}
      footer={
        <DripButton
          title="Done"
          onPress={onClose}
          style={{ width: 120 }}
        />
      }
    >
      <View style={{ gap: 16 }}>
        <View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text, marginBottom: 8 }}>
            Customer
          </Text>
          <DripDropdown
            label="Select Customer"
            options={customerOptions}
            value={selectedCustomer}
            onSelect={onCustomerSelect}
          />
        </View>

        {hasCustomer && (
          <View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text, marginBottom: 8 }}>
              Loyalty Points
            </Text>
            <View style={{ backgroundColor: theme.input, borderRadius: 12, paddingVertical: 12, gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Award size={16} color={theme.primary} />
                  <Text style={{ fontSize: 13, color: theme.textSecondary }}>Available Points</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: theme.primary }}>{customerPoints}</Text>
              </View>
              {maxRedeemablePoints > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: theme.textSecondary }}>Max Redeemable</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>{maxRedeemablePoints}</Text>
                </View>
              )}
              <DripInput
                label="Points to Redeem"
                placeholder="0"
                value={String(pointsToRedeem)}
                onChangeText={(value) => {
                  const points = parseInt(value) || 0;
                  onPointsRedeemChange?.(points);
                }}
                keyboardType="number-pad"
              />
              {pointsToRedeem > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.divider }}>
                  <Text style={{ fontSize: 13, color: theme.textSecondary }}>Currency Value</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: theme.success }}>{currencyValue.toFixed(2)}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text, marginBottom: 8 }}>
            Discount
          </Text>
          <DripDropdown
            label="Select Discount"
            options={discountOptions}
            value={selectedDiscount}
            onSelect={onDiscountSelect}
          />
        </View>
      </View>
    </DripSheet>
  );
};
