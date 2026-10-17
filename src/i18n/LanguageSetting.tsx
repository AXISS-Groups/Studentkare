import React from 'react';
import { View } from 'react-native';
import { Note, RadioGroup } from '@/design-system';
import { LANGUAGE_NAMES, REVIEW_STATUS, useLanguage, useT } from './index';
import type { Lang } from './index';

const OPTIONS = (Object.keys(LANGUAGE_NAMES) as Lang[]).map((lang) => ({ value: lang, label: LANGUAGE_NAMES[lang] }));

/** EN / తెలుగు / हिंदी. Says plainly when the chosen translation hasn't been reviewed. */
export function LanguageSetting(): React.ReactElement {
  const { lang, setLang } = useLanguage();
  const t = useT();
  return (
    <View style={{ gap: 8 }}>
      <RadioGroup<Lang> label={t('lang.label')} options={OPTIONS} value={lang} onChange={setLang} />
      {REVIEW_STATUS[lang] === 'unreviewed' ? <Note tone="info">{t('lang.reviewNote')}</Note> : null}
    </View>
  );
}
