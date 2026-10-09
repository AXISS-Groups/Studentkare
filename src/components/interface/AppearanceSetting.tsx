import React from 'react';
import { RadioGroup } from '@/design-system';
import { useTheme } from '@/theme/tokens/theme';
import type { ThemePreference } from '@/theme/tokens/theme';

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Match my device' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/** Light / dark / follow the device (DESIGN.md D3). Saved in this browser only. */
export function AppearanceSetting(): React.ReactElement {
  const { preference, setPreference } = useTheme();
  return (
    <section className="wf-card" aria-labelledby="appearance-heading">
      <span className="care-eyebrow" id="appearance-heading">APPEARANCE</span>
      <RadioGroup<ThemePreference> label="Theme" options={OPTIONS} value={preference} onChange={setPreference} />
    </section>
  );
}
