import React, { useId } from 'react';
import { View, TextInput, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../theme/theme';

export interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  mono?: boolean;
  error?: string;
  helperText?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  maxLength?: number;
  multiline?: boolean;
  numberOfLines?: number;
  disabled?: boolean;
  editable?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  iconLeft?: React.ReactNode;
  accessibilityLabel?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  mono,
  error,
  helperText,
  keyboardType = 'default',
  maxLength,
  multiline = false,
  numberOfLines = 1,
  disabled = false,
  editable = true,
  style,
  inputStyle,
  iconLeft,
  accessibilityLabel,
}) => {
  const { tokens, radius, spacing, typography } = useTheme();
  const isEditable = editable && !disabled;
  const accLabel = accessibilityLabel || label || placeholder || 'Text input';
  const helperId = useId();

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, { color: tokens.text, fontFamily: typography.fontFamily }]}>
          {label}
        </Text>
      )}
      <View
        dataSet={{ ui: 'input-frame', invalid: Boolean(error) }}
        style={[
          styles.inputWrapper,
          {
            backgroundColor: isEditable ? tokens.surface : tokens.surface2,
            borderColor: error ? tokens.emergency : tokens.rule,
            borderRadius: radius.lg,
            minHeight: multiline ? numberOfLines * 24 + 16 : 46,
            opacity: isEditable ? 1 : 0.7,
          },
        ]}
      >
        {iconLeft && <View style={{ paddingLeft: spacing.s12 }}>{iconLeft}</View>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={tokens.text3}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          maxLength={maxLength}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={isEditable}
          accessibilityLabel={accLabel}
          aria-invalid={Boolean(error)}
          aria-describedby={error || helperText ? helperId : undefined}
          style={[
            styles.textInput,
            {
              color: isEditable ? tokens.text : tokens.text2,
              fontFamily: mono ? typography.fontMono : typography.fontFamily,
            },
            inputStyle,
          ]}
        />
      </View>
      {error ? (
        <Text nativeID={helperId} accessibilityRole="alert" style={[styles.helper, { color: tokens.emergency }]}>{error}</Text>
      ) : helperText ? (
        <Text nativeID={helperId} style={[styles.helper, { color: tokens.text3 }]}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
  },
  helper: {
    fontSize: 11,
    marginTop: 4,
  },
});
