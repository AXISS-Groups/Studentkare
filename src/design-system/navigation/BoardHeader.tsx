import React, { createContext, useContext, useLayoutEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '../icons';
import { color, focusRing, radius, size, space } from '../theme';
import { PhoneHeader } from './PhoneHeader';
import type { PhoneHeaderAction } from './PhoneHeader';

/** What a phone board puts in its header: the canvas header of that board. */
export interface BoardHeaderConfig {
  /** Already translated. */
  title: string;
  subtitle?: string;
  /** Canvas back icon for the board (`arrow-left` on most, `chevron-left` on some). Omit on a tab root. */
  backIcon?: 'arrow-left' | 'chevron-left';
  /** Already translated accessible name of the back button. */
  backLabel?: string;
  /** Where back goes when the board is drawn on its own (Expo). In the web frame back is the browser's. */
  onBack?: () => void;
  /** The board's own header controls (a "Book" link, a filter, "New request"). */
  actions?: readonly PhoneHeaderAction[];
  /** A control the action pills cannot draw (e.g. the brand avatar); changes only when `trailingKey` does. */
  trailing?: React.ReactNode;
  trailingKey?: string;
}

export interface PhoneHeaderSlot {
  /** The board's header, or null to go back to the frame's own. */
  set: (config: BoardHeaderConfig | null) => void;
  /** Opens the frame's More panel (the student menu). */
  openMore: () => void;
  /**
   * A Mobile 2.0 board draws its whole header itself (its own back, cart and
   * SOS): true hides the frame's header while that board is shown.
   */
  setOwnChrome?: (own: boolean) => void;
  /** Opens the frame's SOS helplines (the same dialog as the header's SOS). */
  openSos?: () => void;
}

const SlotContext = createContext<PhoneHeaderSlot | null>(null);

/** Provided by the web phone frame (StudentPhoneFrame). */
export const PhoneHeaderSlotProvider = SlotContext.Provider;

/** The frame's slot, or null when the board is drawn on its own (Expo, tests). */
export function usePhoneHeaderSlot(): PhoneHeaderSlot | null {
  return useContext(SlotContext);
}

/**
 * A Mobile 2.0 board draws its own header (back, cart, SOS): inside the web
 * phone frame this hides the frame's header while the board is mounted.
 * Drawn on its own (Expo, tests) it does nothing.
 */
export function useOwnPhoneChrome(): void {
  const slot = usePhoneHeaderSlot();
  useLayoutEffect(() => {
    if (!slot?.setOwnChrome) return undefined;
    slot.setOwnChrome(true);
    return () => slot.setOwnChrome?.(false);
  }, [slot]);
}

/** What decides whether the frame's header must change: everything but the callbacks. */
function signatureOf(config: BoardHeaderConfig): string {
  return JSON.stringify([
    config.title, config.subtitle ?? '', config.backIcon ?? '', config.backLabel ?? '', config.trailingKey ?? '',
    (config.actions ?? []).map((a) => [a.key, a.icon, a.label, a.tone ?? '', a.showLabel ?? false, a.expanded ?? null, a.controls ?? '']),
  ]);
}

/**
 * A phone board's header (canvas: the back button, title and the board's own
 * controls). Inside the web phone frame it hands the config to the frame, which
 * draws it with its SOS and More controls, and renders nothing itself. Drawn on
 * its own (the Expo app) it renders a PhoneHeader in place.
 *
 * The frame is updated only when something visible changes; action callbacks are
 * read through a ref, so a re-render never loops back into the frame.
 */
export function BoardHeader(props: BoardHeaderConfig): React.ReactElement | null {
  const slot = usePhoneHeaderSlot();
  const latest = useRef(props);
  latest.current = props;
  const signature = signatureOf(props);
  const forFrame = useMemo<BoardHeaderConfig>(() => ({
    ...latest.current,
    actions: (latest.current.actions ?? []).map((action) => ({
      ...action,
      onPress: () => (latest.current.actions ?? []).find((a) => a.key === action.key)?.onPress(),
    })),
  }), [signature]);

  useLayoutEffect(() => {
    if (!slot) return undefined;
    slot.set(forFrame);
    return () => slot.set(null);
  }, [slot, forFrame]);

  if (slot) return null;
  const { title, subtitle, backIcon, backLabel, onBack, actions, trailing } = props;
  return (
    <PhoneHeader
      title={title}
      subtitle={subtitle}
      back={backIcon && onBack ? { label: backLabel ?? title, onPress: onBack, icon: backIcon } : undefined}
      actions={actions}
      trailing={trailing}
    />
  );
}

/**
 * A board's own header controls in the web phone frame, on a row under the
 * frame's header: the frame's row already holds back, the title, More and SOS,
 * and at 390 px a board's "Book" or filter there would cut the title short.
 */
export function BoardToolbar({ actions = [], trailing }: { actions?: readonly PhoneHeaderAction[]; trailing?: React.ReactNode }): React.ReactElement | null {
  if (!actions.length && !trailing) return null;
  return (
    <View style={styles.toolbar} testID="board-toolbar">
      {trailing}
      {actions.map((action) => (
        <Pressable
          key={action.key}
          testID={`phone-header-${action.key}`}
          role="button"
          accessibilityRole="button"
          accessibilityLabel={action.label}
          aria-label={action.label}
          onPress={action.onPress}
          style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.round, focused ? focusRing : null]}
        >
          <Icon name={action.icon} size={size.navIcon} color={color.action} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: space.s10, paddingHorizontal: space.gutterPhone, paddingBottom: space.s8, backgroundColor: color.canvas },
  round: { width: size.touchTarget, height: size.touchTarget, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface2 },
});
