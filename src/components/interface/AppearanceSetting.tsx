import React from 'react';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { LanguageSetting } from '@/i18n/LanguageSetting';
import { Button, Note, RadioGroup } from '@/design-system';
import type { NoteTone } from '@/design-system';
import { useTheme } from '@/theme/tokens/theme';
import type { ThemePreference } from '@/theme/tokens/theme';
import { useAccountAppearance } from '@/features/account/views/AccountAppearanceSync';
import type { AppearanceSyncState } from '@/features/account/viewmodel/AccountAppearanceViewModel';

const SYNC_NOTE: Record<AppearanceSyncState, { key: MessageKey; tone: NoteTone } | null> = {
  device: { key: 'appearance.deviceOnly', tone: 'info' },
  checking: null,
  synced: { key: 'appearance.savedAccount', tone: 'positive' },
  saving: { key: 'appearance.saving', tone: 'info' },
  saveFailed: { key: 'appearance.saveFailed', tone: 'attention' },
  loadFailed: { key: 'appearance.loadFailed', tone: 'attention' },
};

/**
 * Light / dark / follow the device (DESIGN.md D3). Applied at once from this
 * browser's cache; when signed in, also saved to the account so the app and
 * other browsers follow (AccountAppearanceProvider).
 */
export const AppearanceSetting = observer(function AppearanceSetting(): React.ReactElement {
  const { preference, setPreference } = useTheme();
  const account = useAccountAppearance();
  const t = useT();
  const options: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: t('appearance.system') },
    { value: 'light', label: t('appearance.light') },
    { value: 'dark', label: t('appearance.dark') },
  ];
  const note = account ? SYNC_NOTE[account.state] : null;
  return (
    <section className="wf-card" aria-labelledby="appearance-heading">
      <span className="care-eyebrow" id="appearance-heading">{t('appearance.title').toUpperCase()}</span>
      <RadioGroup<ThemePreference> label={t('appearance.theme')} options={options} value={preference} onChange={setPreference} />
      {note ? <div role="status"><Note tone={note.tone}>{t(note.key)}</Note></div> : null}
      {account?.state === 'saveFailed' ? <Button variant="secondary" label={t('common.tryAgain')} onPress={() => void account.retry()} /> : null}
      <LanguageSetting />
    </section>
  );
});
