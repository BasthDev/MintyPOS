import { FileText } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../constants/colorTheme';
import { DripButton } from '../Button';
import { DeskInput } from '../DeskInput';
import { DripSheet } from '../Sheet';

interface CartNoteFormSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (note: string) => void;
  initialNote?: string;
  productName: string;
  autoClose?: boolean;
}

export const CartNoteFormSheet: React.FC<CartNoteFormSheetProps> = ({
  visible,
  onClose,
  onSubmit,
  initialNote = '',
  productName,
  autoClose = true,
}) => {
  const { theme } = useTheme();
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) {
      setNote(initialNote);
    }
  }, [visible, initialNote]);

  const handleSubmit = () => {
    onSubmit(note.trim());
    if (autoClose) {
      onClose();
    }
  };

  const footer = (
    <DripButton
      title="Save Note"
      onPress={handleSubmit}
    />
  );

  const isEditing = initialNote && initialNote.trim().length > 0;
  const title = isEditing ? `Edit Note - ${productName}` : `Add Note - ${productName}`;

  return (
    <DripSheet
      visible={visible}
      onClose={onClose}
      title={title}
      headerIcon={<FileText size={20} color={theme.primary} />}
      footer={footer}
    >
      <View>
        <DeskInput
          label="Order Note"
          value={note}
          onChangeText={setNote}
          placeholder="Enter any special instructions for this item..."
          helperText="This note will be included with the order"
          numberOfLines={4}
        />
      </View>
    </DripSheet>
  );
};
