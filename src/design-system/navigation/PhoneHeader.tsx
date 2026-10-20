import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BrandLogo, Icon } from '../icons';
import type { SkIconName } from '../icons';
import { color, font, fontWeight, focusRing, radius, size, space } from '../theme';

export interface PhoneHeaderAction {
  key: string;
  /** A name from design/icons/icon-manifest.json. */
  icon: SkIconName;
  /** Already translated: the accessible name, and the visible text when `showLabel` is set. */
  label: string;
  onPress: () => void;
  /** `sos` is the red SOS pill (red is for SOS and danger only, DESIGN.md §3). */
  tone?: 'neutral' | 'sos';
  /** Draw the label next to the icon (the SOS pill does). */
  showLabel?: boolean;
  /** For an action that opens and closes a panel (the menu). */
  expanded?: boolean;
  /** Id of the panel `expanded` refers to. */
  controls?: string;
}

export interface PhoneHeaderProps {
  /** Already translated. */
  title: string;
  subtitle?: string;
  /** A back button before the title (canvas `arrow-left`; some boards use `chevron-left`). */
  back?: { label: string; onPress: () => void; icon?: Extract<SkIconName, 'arrow-left' | 'chevron-left'> };
  /** The Student Kare mark before the title (tab roots such as Discover). */
  brand?: boolean;
  actions?: readonly PhoneHeaderAction[];
}

type PressState = { pressed: boolean; focused?: boolean };

/**
 * The phone boards' header (canvas: Notifications, Appointments, HomeDiscover):
 * a round back button, the page title (with an optional subtitle, or the brand
 * mark on a tab root) and up to three round actions on the right. Every
 * control is at least 44 px and named; the title is the page heading.
 */
export function PhoneHeader({ title, subtitle, back, brand = false, actions = [] }: PhoneHeaderProps): React.ReactElement {
  return (
    <View style={styles.header}>
      {back ? (
        <Pressable
          testID="phone-header-back"
          role="button"
          accessibilityRole="button"
          accessibilityLabel={back.label}
          aria-label={back.label}
          onPress={back.onPress}
          style={({ focused }: PressState) => [styles.round, focused ? focusRing : null]}
        >
          <Icon name={back.icon ?? 'arrow-left'} size={size.navIcon} color={color.text} />
        </Pressable>
      ) : null}
      {brand ? <BrandLogo size={size.navIcon + space.s4} label="" /> : null}
      <View style={styles.titles}>
        <Text accessibilityRole="header" numberOfLines={1} style={brand ? styles.brandTitle : styles.title}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actions.map((action) => {
        const sos = action.tone === 'sos';
        return (
          <Pressable
            key={action.key}
            testID={`phone-header-${action.key}`}
            role="button"
            accessibilityRole="button"
            accessibilityLabel={action.label}
            aria-label={action.label}
            aria-expanded={action.expanded}
            aria-controls={action.controls}
            accessibilityState={action.expanded === undefined ? undefined : { expanded: action.expanded }}
            onPress={action.onPress}
            style={({ focused }: PressState) => [
              sos ? styles.sos : styles.round,
              action.showLabel && !sos ? styles.withLabel : null,
              focused ? focusRing : null,
            ]}
          >
            <Icon name={action.icon} size={size.navIcon} color={sos ? color.onDangerFill : color.action} />
            {action.showLabel ? (
              <Text numberOfLines={1} style={sos ? styles.sosLabel : styles.actionLabel}>
                {action.label}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s10,
    paddingHorizontal: space.gutterPhone,
    paddingTop: space.s20,
    paddingBottom: space.s12,
    backgroundColor: color.canvas,
  },
  round: {
    width: size.touchTarget,
    height: size.touchTarget,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: color.surface2,
    flexShrink: 0,
  },
  withLabel: {
    width: 'auto',
    paddingHorizontal: space.s14,
    gap: space.s6,
  },
  sos: {
    minWidth: size.touchTarget,
    height: size.touchTarget,
    paddingHorizontal: space.s14,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s6,
    backgroundColor: color.dangerFill,
    flexShrink: 0,
  },
  titles: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: space.s2,
  },
  title: {
    fontFamily: font.family.sans,
    fontSize: font.size.title,
    lineHeight: font.size.title * font.lineHeight.tight,
    fontWeight: fontWeight(font.weight.heavy),
    color: color.text,
  },
  brandTitle: {
    fontFamily: font.family.sans,
    fontSize: font.size.titleSm,
    lineHeight: font.size.titleSm * font.lineHeight.tight,
    fontWeight: fontWeight(font.weight.heavy),
    color: color.text,
  },
  subtitle: {
    fontFamily: font.family.sans,
    fontSize: font.size.caption,
    fontWeight: fontWeight(font.weight.regular),
    color: color.text2,
  },
  actionLabel: {
    fontFamily: font.family.sans,
    fontSize: font.size.caption,
    fontWeight: fontWeight(font.weight.strong),
    color: color.action,
  },
  sosLabel: {
    fontFamily: font.family.sans,
    fontSize: font.size.caption,
    fontWeight: fontWeight(font.weight.heavy),
    color: color.onDangerFill,
  },
});
