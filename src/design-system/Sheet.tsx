import React from 'react';
import { Overlay } from './overlays/Overlay';

export interface SheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  /** Closing is refused while `busy`, so a half-finished action can't be abandoned by a stray tap. */
  onClose: () => void;
  busy?: boolean;
  /** False when the decision may only end by acting. */
  dismissible?: boolean;
  children: React.ReactNode;
  testID?: string;
}

/**
 * Bottom sheet on a phone, side panel on a wide screen (DESIGN.md §4: open,
 * busy, done; board Sheets). The sheet form of the one design-system overlay,
 * so it traps focus, closes on Esc and the scrim, and returns focus the same
 * way drawers and dialogs do. Native builds use Sheet.native.tsx with the same
 * props. "Done" is the caller's content: the sheet only frames it.
 */
export function Sheet({ visible, title, subtitle, onClose, busy = false, dismissible = true, children, testID }: SheetProps): React.ReactElement | null {
  return (
    <Overlay open={visible} variant="sheet" title={title} subtitle={subtitle} busy={busy} dismissible={dismissible} onClose={onClose} testID={testID}>
      {children}
    </Overlay>
  );
}
