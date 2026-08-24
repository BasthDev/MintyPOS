import { useTheme } from '@/constants/colorTheme';
import { FileText } from 'lucide-react-native'; // Or any icon you prefer for descriptions
import React, { useRef, useState } from 'react';
import {
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

interface DeskInputProps extends TextInputProps {
    label: string;
    error?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    onRightIconPress?: () => void;
    helperText?: string;
}

export const DeskInput: React.FC<DeskInputProps> = ({
    label,
    value,
    onChangeText,
    error,
    leftIcon,
    rightIcon,
    onRightIconPress,
    helperText,
    multiline = true,
    numberOfLines = 3,
    ...props
}) => {
    const { theme } = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const textInputRef = useRef<TextInput>(null);

    const handleFocus = () => {
        setIsFocused(true);
    };

    const handleBlur = () => {
        setIsFocused(false);
    };

    const handleContainerPress = () => {
        textInputRef.current?.focus();
    };

    const labelColor = error
        ? theme.error
        : isFocused
            ? theme.primary
            : theme.textTertiary;

    // Default icon for description/desk input if none provided
    const iconToRender = leftIcon || <FileText size={20} color={theme.iconSecondary || theme.textTertiary} />;

    return (
        <View style={styles.container}>
            {/* Label */}
            <Text
                style={[
                    styles.label,
                    {
                        color: labelColor,
                    },
                ]}
            >
                {label}
            </Text>

            {/* Input Container */}
            <TouchableWithoutFeedback onPress={handleContainerPress}>
                <View
                    style={[
                        styles.inputContainer,
                        {
                            backgroundColor: theme.input,
                            borderColor: error
                                ? theme.error
                                : isFocused
                                    ? theme.primary
                                    : theme.inputBorder,
                        },
                        isFocused && { borderWidth: 1.5 },
                    ]}
                >
                    {/* Left Icon (Aligned to top for multiline) */}
                    <View style={styles.iconContainerLeft}>{iconToRender}</View>

                    <TextInput
                        ref={textInputRef}
                        style={[
                            styles.input,
                            {
                                color: theme.text,
                                paddingLeft: 8,
                                paddingRight: rightIcon ? 8 : 0,
                            },
                        ]}
                        value={value}
                        onChangeText={onChangeText}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        multiline={multiline}
                        numberOfLines={numberOfLines}
                        placeholderTextColor="transparent"
                        placeholder=""
                        {...props}
                    />

                    {/* Right Icon */}
                    {rightIcon && (
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {
                                textInputRef.current?.blur();
                                Keyboard.dismiss();
                                onRightIconPress?.();
                            }}
                            style={styles.iconContainerRight}
                        >
                            {rightIcon}
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableWithoutFeedback>

            {/* Error Text */}
            {error && (
                <Text style={[styles.errorText, { color: theme.error }]}>
                    {error}
                </Text>
            )}

            {/* Helper Text */}
            {helperText && !error && (
                <Text style={[styles.helperText, { color: theme.textSecondary }]}>
                    {helperText}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 10,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 6,
        marginLeft: 2,
    },
    inputContainer: {
        minHeight: 100, // Adjusted height for ~3 lines plus padding
        borderWidth: 1,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'flex-start', // Align items to top for multiline inputs
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    input: {
        flex: 1,
        minHeight: 76,
        padding: 0,
        fontSize: 16,
        fontWeight: '500',
        textAlignVertical: 'top', // Crucial for Android multiline alignment
    },
    iconContainerLeft: {
        width: 24,
        height: 24,
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginRight: 8,
        marginTop: 2, // Slight offset to align with first text line
    },
    iconContainerRight: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    errorText: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 5,
        marginLeft: 4,
    },
    helperText: {
        fontSize: 12,
        fontWeight: '400',
        marginTop: 5,
        marginLeft: 4,
        fontStyle: 'italic',
    },
});