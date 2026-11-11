import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './icons';
import { color, focusRing, font, fontWeight, space } from './theme';

/**
 * A 1-5 star rating: read-only when `onChange` is omitted (e.g. a product's
 * average rating), interactive when it's passed (e.g. a post-booking
 * feedback modal — the "rate your phlebotomist/doctor" pattern seen in
 * every reference app, which this repo had no shared component for).
 * Never auto-advances or nags; the caller decides when/if to show it.
 */
export interface StarRatingProps {
  value: number;
  max?: number;
  onChange?: (value: number) => void;
  size?: number;
  /** Shown after the stars, e.g. "4.6 (2,310)". */
  label?: string;
  testID?: string;
}

export function StarRating({ value, max = 5, onChange, size = 20, label, testID }: StarRatingProps): React.ReactElement {
  const stars = Array.from({ length: max }, (_, i) => i + 1);
  const interactive = typeof onChange === 'function';
  return (
    <View style={styles.row} testID={testID} accessibilityRole={interactive ? undefined : 'text'} accessibilityLabel={interactive ? undefined : `Rated ${value} out of ${max}`}>
      {stars.map((n) =>
        interactive ? (
          <Pressable
            key={n}
            role="button"
            accessibilityRole="button"
            accessibilityLabel={`Rate ${n} out of ${max}`}
            accessibilityState={{ selected: n <= value }}
            onPress={() => onChange(n)}
            style={({ focused }: { focused?: boolean }) => [styles.star, focused ? focusRing : null]}
          >
            <Icon name={n <= value ? 'star-filled' : 'star'} size={size} color={n <= value ? color.attention : color.text3} />
          </Pressable>
        ) : (
          <Icon key={n} name={n <= Math.round(value) ? 'star-filled' : 'star'} size={size} color={n <= Math.round(value) ? color.attention : color.text3} />
        ),
      )}
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  star: { padding: 2 },
  label: { marginLeft: space.s6, fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
});
