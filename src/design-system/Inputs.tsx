import React, { useId, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { color, focusRing, font, fontWeight, radius, size, space } from './theme';

interface FieldFrameProps {
  label: string;
  hint?: string;
  error?: string;
  children: (ids: { labelId: string; messageId?: string }) => React.ReactNode;
}

/** Label above, message below — the same frame as TextField. */
function FieldFrame({ label, hint, error, children }: FieldFrameProps) {
  const labelId = useId();
  const messageId = useId();
  const message = error ?? hint;
  return (
    <View style={styles.field}>
      <Text nativeID={labelId} style={styles.label}>{label}</Text>
      {children({ labelId, messageId: message ? messageId : undefined })}
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

export interface CodeInputProps {
  label: string;
  value: string;
  onChangeText: (digits: string) => void;
  length?: number;
  hint?: string;
  error?: string;
  disabled?: boolean;
  testID?: string;
}

/**
 * Code input (DESIGN.md §4: 6-digit; empty, filled, invalid, disabled). One
 * real field — not six boxes — so paste, autofill ("one-time-code") and screen
 * readers all work; the digits are spaced for reading.
 */
export function CodeInput({ label, value, onChangeText, length = 6, hint, error, disabled = false, testID }: CodeInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <FieldFrame label={label} hint={hint} error={error}>
      {({ labelId, messageId }) => (
        <TextInput
          testID={testID}
          value={value}
          onChangeText={(text: string) => onChangeText(text.replace(/\D/g, '').slice(0, length))}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={length}
          editable={!disabled}
          accessibilityLabel={label}
          accessibilityLabelledBy={labelId}
          aria-invalid={Boolean(error)}
          aria-describedby={messageId}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            styles.code,
            { borderColor: error ? color.danger : focused ? color.action : color.rule, backgroundColor: disabled ? color.surface2 : color.surface },
            focused ? focusRing : null,
          ]}
        />
      )}
    </FieldFrame>
  );
}

export interface PhoneInputProps {
  label: string;
  /** The 10-digit national number, without +91. */
  value: string;
  onChangeText: (digits: string) => void;
  hint?: string;
  error?: string;
  disabled?: boolean;
  testID?: string;
}

/** Phone input (DESIGN.md §4: +91; empty, filled, invalid, disabled). Stores the 10 digits only. */
export function PhoneInput({ label, value, onChangeText, hint, error, disabled = false, testID }: PhoneInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <FieldFrame label={label} hint={hint} error={error}>
      {({ labelId, messageId }) => (
        <View
          style={[
            styles.phone,
            { borderColor: error ? color.danger : focused ? color.action : color.rule, backgroundColor: disabled ? color.surface2 : color.surface },
            focused ? focusRing : null,
          ]}
        >
          <Text style={styles.prefix} accessibilityElementsHidden importantForAccessibility="no">+91</Text>
          <TextInput
            testID={testID}
            value={value}
            onChangeText={(text: string) => onChangeText(text.replace(/\D/g, '').slice(0, 10))}
            keyboardType="phone-pad"
            autoComplete="tel"
            maxLength={10}
            editable={!disabled}
            accessibilityLabel={`${label}, India +91`}
            accessibilityLabelledBy={labelId}
            aria-invalid={Boolean(error)}
            aria-describedby={messageId}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={styles.phoneField}
          />
        </View>
      )}
    </FieldFrame>
  );
}

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export interface SelectProps<T extends string> {
  label: string;
  options: ReadonlyArray<SelectOption<T>>;
  value: T | null;
  onChange: (value: T) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  testID?: string;
}

/**
 * Select (DESIGN.md §4: empty, filled, invalid, disabled). A button that opens
 * an inline list of options — works the same on web and native, and each
 * option is a 44 px row.
 */
export function Select<T extends string>({ label, options, value, onChange, placeholder = 'Choose…', hint, error, disabled = false, testID }: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <FieldFrame label={label} hint={hint} error={error}>
      {({ messageId }) => (
        <View>
          <Pressable
            testID={testID}
            role="combobox"
            aria-expanded={open}
            aria-describedby={messageId}
            aria-invalid={Boolean(error)}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${current ? current.label : 'not chosen'}`}
            accessibilityState={{ expanded: open, disabled }}
            disabled={disabled}
            onPress={() => setOpen(!open)}
            style={({ focused }: { pressed: boolean; focused?: boolean }) => [
              styles.input,
              styles.select,
              { borderColor: error ? color.danger : open ? color.action : color.rule, backgroundColor: disabled ? color.surface2 : color.surface },
              focused ? focusRing : null,
            ]}
          >
            <Text style={[styles.selectText, current ? null : { color: color.text3 }]}>{current ? current.label : placeholder}</Text>
            <Text style={styles.chevron} accessibilityElementsHidden importantForAccessibility="no">{open ? '▴' : '▾'}</Text>
          </Pressable>
          {open ? (
            <View role="radiogroup" accessibilityLabel={label} style={styles.list}>
              {options.map((o) => (
                <Pressable
                  key={o.value}
                  role="radio"
                  aria-checked={o.value === value}
                  accessibilityRole="radio"
                  accessibilityLabel={o.label}
                  accessibilityState={{ checked: o.value === value }}
                  onPress={() => { onChange(o.value); setOpen(false); }}
                  style={({ focused }: { pressed: boolean; focused?: boolean }) => [
                    styles.option,
                    o.value === value ? { backgroundColor: color.surface3 } : null,
                    focused ? focusRing : null,
                  ]}
                >
                  <Text style={styles.selectText}>{o.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      )}
    </FieldFrame>
  );
}

const styles = StyleSheet.create({
  field: { minWidth: 0, gap: space.s6 },
  label: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  message: { fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: font.size.caption * font.lineHeight.body },
  input: { width: '100%', minWidth: 0, minHeight: size.control, paddingHorizontal: space.s14, borderWidth: 1, borderRadius: radius.lg, fontSize: font.size.body, color: color.text },
  code: { fontFamily: font.family.mono, fontSize: font.size.title, letterSpacing: 8, textAlign: 'center' },
  phone: { flexDirection: 'row', alignItems: 'center', minHeight: size.control, borderWidth: 1, borderRadius: radius.lg, paddingLeft: space.s14 },
  prefix: { fontFamily: font.family.mono, fontSize: font.size.body, color: color.text2, paddingRight: space.s8 },
  phoneField: { flex: 1, minWidth: 0, minHeight: size.control, fontFamily: font.family.mono, fontSize: font.size.body, color: color.text, paddingRight: space.s14 },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectText: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text },
  chevron: { fontSize: font.size.bodySm, color: color.text2 },
  list: { marginTop: space.s4, borderWidth: 1, borderColor: color.rule, borderRadius: radius.lg, backgroundColor: color.surface, overflow: 'hidden' },
  option: { minHeight: size.touchTarget, justifyContent: 'center', paddingHorizontal: space.s14 },
});
