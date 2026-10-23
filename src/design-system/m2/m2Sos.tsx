import React, { createContext, useContext } from 'react';
import { StyleSheet, View } from 'react-native';
import { useT } from '@/i18n';
import { SosButton } from './M2Parts';

/**
 * SOS in the header of every Mobile 2.0 board (founder decision, 23 Oct 2026,
 * parity audit: "SOS button in the header of every screen, phone and web").
 * The shell that draws the boards says what SOS opens: the web phone frame its
 * helplines dialog, the Expo app the Emergency screen. The desktop web shell
 * provides none, because its own top bar carries SOS on every page; a board
 * drawn there shows no second one in its header.
 */
const SosContext = createContext<(() => void) | null>(null);

/** Provided by the shells that draw Mobile 2.0 boards (StudentPhoneFrame, the Expo StudentShell). */
export const M2SosProvider = SosContext.Provider;

/** What SOS opens here, or null where the surrounding shell carries SOS itself. */
export function useM2Sos(): (() => void) | null {
  return useContext(SosContext);
}

/** The red SOS pill for a board's own header, bound to the shell's SOS. Draws nothing where the shell has its own. */
export function M2HeaderSos({ onPress, push = false, testID = 'm2-header-sos' }: { onPress?: () => void; push?: boolean; testID?: string }) {
  const t = useT();
  const shell = useM2Sos();
  const open = onPress ?? shell;
  if (!open) return null;
  const button = <SosButton label={t('m2.sos')} spoken={t('m2.sosSpoken')} onPress={open} testID={testID} />;
  // `push`: the header row has no spacer, so SOS takes the far end itself.
  return push ? <View style={styles.push}>{button}</View> : button;
}

const styles = StyleSheet.create({ push: { marginLeft: 'auto' } });
