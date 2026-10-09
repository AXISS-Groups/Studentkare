import React from 'react';
import { useT } from '@/i18n';
import { LanguageSetting } from '@/i18n/LanguageSetting';
import { RadioGroup } from '@/design-system';
import { useTheme } from '@/theme/tokens/theme';
import type { ThemePreference } from '@/theme/tokens/theme';


/** Light / dark / follow the device (DESIGN.md D3). Saved in this browser only. */
export function AppearanceSetting(): React.ReactElement {
  const { preference, setPreference } = useTheme();
  const t = useT();
  const options: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: t('appearance.system') },
    { value: 'light', label: t('appearance.light') },
    { value: 'dark', label: t('appearance.dark') },
  ];
  return (
    <section className="wf-card" aria-labelledby="appearance-heading">
      <span className="care-eyebrow" id="appearance-heading">{t('appearance.title').toUpperCase()}</span>
      <RadioGroup<ThemePreference> label={t('appearance.theme')} options={options} value={preference} onChange={setPreference} />
      <LanguageSetting />
    </section>
  );
}
