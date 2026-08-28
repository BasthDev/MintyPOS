import { useTheme } from '@/constants/colorTheme';
import { Tag } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { DripDropdown } from '../Dropdown';
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
}) => {
  const { theme } = useTheme();

  return (
    <DripSheet
      visible={visible}
      onClose={onClose}
      title="Actions"
      headerIcon={<Tag size={20} color={theme.primary} />}
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
