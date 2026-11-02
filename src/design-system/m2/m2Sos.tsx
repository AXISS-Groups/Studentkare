import { createContext, useContext } from 'react';

/**
 * SOS in the header of every Mobile 2.0 board (founder decision, 23 Oct 2026,
 * parity audit: "SOS button in the header of every screen, phone and web").
 * The shell that draws the boards says what SOS opens: the web phone frame its
 * helplines dialog, the Expo app the Emergency screen. The desktop web shell
 * provides none, because its own top bar carries SOS on every page; a board
 * drawn there shows no second one in its header. The header pill itself,
 * M2HeaderSos, lives in M2Parts beside the button it draws.
 */
const SosContext = createContext<(() => void) | null>(null);

/** Provided by the shells that draw Mobile 2.0 boards (StudentPhoneFrame, the Expo StudentShell). */
export const M2SosProvider = SosContext.Provider;

/** What SOS opens here, or null where the surrounding shell carries SOS itself. */
export function useM2Sos(): (() => void) | null {
  return useContext(SosContext);
}
