import React from 'react';
import { useT } from '@/i18n';
import { Overlay } from './Overlay';
import type { OverlayEyebrowTone } from './Overlay';

export interface DrawerProps {
  open: boolean;
  title: string;
  /** Small line above the title, e.g. "CRITICAL · POTASSIUM 6.8 mmol/L". */
  eyebrow?: string;
  eyebrowTone?: OverlayEyebrowTone;
  subtitle?: string;
  /** While true, Esc, the scrim and the close button do not close it (an action is running). */
  busy?: boolean;
  /** False for a critical value, which only closes by acting (board Sheets, "Close"). */
  dismissible?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Right-hand drawer (web): a decision that keeps its context. The side-panel
 * form of the one design-system overlay (see Overlay): 480 px, full height,
 * 440 ms in, focus trapped, Esc closes, focus returns to whatever opened it.
 * On a phone it fills the screen.
 */
export function Drawer({ open, title, eyebrow, eyebrowTone = 'muted', subtitle, busy = false, dismissible = true, onClose, children }: DrawerProps): React.ReactElement | null {
  const t = useT();
  return (
    <Overlay
      open={open}
      variant="drawer"
      title={title}
      eyebrow={eyebrow}
      eyebrowTone={eyebrowTone}
      subtitle={subtitle}
      busy={busy}
      dismissible={dismissible}
      closeLabel={t('ds.overlay.closePanel')}
      onClose={onClose}
    >
      {children}
    </Overlay>
  );
}
