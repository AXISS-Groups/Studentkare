import React from 'react';
import { SkNote } from '@/design-system';
import { useT } from '@/i18n';

/**
 * Offline on a clinical screen: what is on screen was loaded at this time, it
 * is read-only, and nothing is acknowledged, signed, sent or ordered until the
 * connection is back. Renders nothing online.
 */
export function OfflineNote({ online, loadedAt }: { online: boolean; loadedAt: number | null }): React.ReactElement | null {
  const t = useT();
  if (online) return null;
  const time = loadedAt ? new Date(loadedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null;
  return (
    <div role="status" className="sk-offline-note">
      <SkNote tone="attention">{time ? t('clinShared.offlineAt', { time }) : t('clinShared.offline')}</SkNote>
    </div>
  );
}
