import React from 'react';
import { ConfirmDialog as DsConfirmDialog } from '@/design-system/overlays/ConfirmDialog';
import type { ConfirmIcon } from '@/design-system/overlays/ConfirmDialog';

export { nextFocusIndex } from '@/design-system/overlays/useOverlay';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** What actually happens. Say it plainly; this is the last thing read before committing. */
  body: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  busyLabel?: string;
  /** `destructive` colours the confirm button as danger. Use it when the action removes or ends something. */
  tone?: 'default' | 'destructive';
  /** Kept for existing callers; the design-system dialog has one size (board ConfirmDialogs). */
  size?: 'default' | 'compact';
  icon?: ConfirmIcon;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Legacy entry point, kept so existing callers need no change: a thin wrapper
 * over the design-system ConfirmDialog (src/design-system/overlays), which owns
 * the look, focus trap, Esc/scrim handling and focus return. New code imports
 * the design-system one directly.
 */
export function ConfirmDialog({ tone = 'default', ...rest }: ConfirmDialogProps): React.ReactElement | null {
  return <DsConfirmDialog {...rest} tone={tone === 'destructive' ? 'danger' : 'action'} />;
}
