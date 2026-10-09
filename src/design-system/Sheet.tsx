import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { color, focusRing, font, fontWeight, radius, size, space } from './theme';
import { useReducedMotion } from './motion';

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
 * Bottom sheet on phone, centred dialog on wide screens (DESIGN.md §4: open,
 * busy, done). Built on Modal, which on web supplies role="dialog",
 * aria-modal, Escape to close and a focus trap; on native it is a real modal.
 * "Done" is the caller's content — the sheet only frames it.
 */
export function Sheet({ visible, title, onClose, busy = false, children, testID }: SheetProps) {
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
              accessibilityLabel="Close"
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={close}
              style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.close, focused ? focusRing : null, busy ? styles.disabled : null]}
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // A scrim derived from the brand navy token, not a raw colour.
  backdrop: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: `${color.brandNavy}80` },
  sheet: {
    width: '100%', maxWidth: 560, maxHeight: '90%', backgroundColor: color.surface,
    borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingBottom: space.s24,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.gutterPhone, paddingTop: space.s16 },
  title: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  close: { minWidth: size.touchTarget, minHeight: size.touchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  closeText: { fontSize: font.size.title, color: color.text2 },
  body: { paddingHorizontal: space.gutterPhone, paddingTop: space.s12, gap: space.s12 },
  disabled: { opacity: 0.4 },
});
