import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { color, focusRing, font, fontWeight, radius, size, space } from './theme';
import { useReducedMotion } from './motion';
import { useT } from '@/i18n';
import { Icon } from './icons';

export interface SheetProps {
  visible: boolean;
  title: string;
  /** Closing is refused while `busy`, so a half-finished action can't be abandoned by a stray tap. */
  onClose: () => void;
  busy?: boolean;
  children: React.ReactNode;
  testID?: string;
}

/**
 * Native (Expo) bottom sheet (DESIGN.md §4: open, busy, done). The web build
 * uses Sheet.tsx, the frosted overlay shared with drawers and dialogs; this
 * keeps the same props on a real native Modal. "Done" is the caller's content.
 */
export function Sheet({ visible, title, onClose, busy = false, children, testID }: SheetProps) {
  const t = useT();
  const close = () => { if (!busy) onClose(); };
  const reduced = useReducedMotion();
  return (
    <Modal visible={visible} transparent animationType={reduced ? 'none' : 'slide'} onRequestClose={close}>
      <View style={styles.backdrop}>
        {/* The scrim closes on tap but is not a tab stop; the Close button is the accessible way out. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={close} focusable={false} aria-hidden />
        <View testID={testID} accessibilityViewIsModal style={styles.sheet}>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('ds.overlay.close')}
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={close}
              style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.close, focused ? focusRing : null, busy ? styles.disabled : null]}
            >
              <Icon name="x" size={18} strokeWidth={2.2} color={color.text2} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: color.scrim },
  sheet: {
    width: '100%', maxWidth: 560, maxHeight: '90%', backgroundColor: color.surface,
    borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingBottom: space.s24,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.gutterPhone, paddingTop: space.s16 },
  title: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  close: { minWidth: size.touchTarget, minHeight: size.touchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  body: { paddingHorizontal: space.gutterPhone, paddingTop: space.s12, gap: space.s12 },
  disabled: { opacity: 0.4 },
});
