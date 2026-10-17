import React, { useId, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { color, focusRing, font, fontWeight, radius, size, space } from './theme';

export interface TextFieldProps {
  /** Always visible. A placeholder is not a label. */
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Shown under the field when there is no error. */
  hint?: string;
  /** Makes the field invalid and is announced to assistive tech. */
  error?: string;
  disabled?: boolean;
  /** Clinical values, codes and IDs use the mono face (DESIGN.md §3). */
  mono?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  autoComplete?: 'email' | 'name' | 'tel' | 'off' | 'one-time-code';
  maxLength?: number;
  testID?: string;
}

/**
 * Input from the design system's core set (DESIGN.md §4): empty, filled,
 * invalid with message, disabled. A 50 px control with a visible label.
 */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  error,
  disabled = false,
  mono = false,
  keyboardType = 'default',
  autoComplete,
  maxLength,
  testID,
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const inputId = useId();
  const messageId = useId();
  const message = error ?? hint;

  return (
    <View style={styles.field}>
      <Text nativeID={`${inputId}-label`} style={styles.label}>
        {label}
      </Text>
      <TextInput
        testID={testID}
        nativeID={inputId}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={color.text3}
        editable={!disabled}
        keyboardType={keyboardType}
        autoComplete={autoComplete}
        maxLength={maxLength}
        accessibilityLabel={label}
        accessibilityLabelledBy={`${inputId}-label`}
        accessibilityState={{ disabled }}
        aria-invalid={Boolean(error)}
        aria-describedby={message ? messageId : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          {
            fontFamily: mono ? font.family.mono : font.family.sans,
            backgroundColor: disabled ? color.surface2 : color.surface,
            borderColor: error ? color.danger : focused ? color.action : color.rule,
            color: disabled ? color.text2 : color.text,
          },
          focused ? focusRing : null,
        ]}
      />
      {message ? (
        <Text
          nativeID={messageId}
          accessibilityRole={error ? 'alert' : undefined}
          accessibilityLiveRegion={error ? 'polite' : 'none'}
          style={[styles.message, { color: error ? color.danger : color.text3 }]}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    minWidth: 0,
    gap: space.s6,
  },
  label: {
    fontFamily: font.family.sans,
    fontSize: font.size.bodySm,
    fontWeight: fontWeight(font.weight.strong),
    color: color.text,
  },
  input: {
    // A browser <input> has an intrinsic ~20-character width; without these
    // two, side-by-side fields push their column wider than a phone screen.
    width: '100%',
    minWidth: 0,
    minHeight: size.control,
    paddingHorizontal: space.s14,
    borderWidth: 1,
    borderRadius: radius.lg,
    fontSize: font.size.body,
  },
  message: {
    fontFamily: font.family.sans,
    fontSize: font.size.caption,
    lineHeight: font.size.caption * font.lineHeight.body,
  },
});
