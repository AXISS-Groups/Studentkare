import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage, useT } from '@/i18n';
import { privacyRepository, paragraphs } from './privacyRepository';
import type { LegalDocument, LegalKind } from './privacyRepository';
import { dateOf } from './dates';
import './privacy.css';

export type LegalState = { status: 'loading' } | { status: 'error'; retry: () => void } | { status: 'ready'; doc: LegalDocument };

/** The published version of a legal document (GET /legal/{kind}), with loading and error. */
export function useLegalDocument(kind: LegalKind, load: (kind: LegalKind) => Promise<LegalDocument> = privacyRepository.legal): LegalState {
  const [state, setState] = useState<LegalState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  useEffect(() => {
    let live = true;
    setState({ status: 'loading' });
    load(kind).then((doc) => { if (live) setState({ status: 'ready', doc }); }, () => { if (live) setState({ status: 'error', retry }); });
    return () => { live = false; };
  }, [kind, load, attempt, retry]);
  return state;
}

/**
 * A published legal text exactly as the super admin published it from legal's
 * words: its version and date, then its paragraphs. Never authored in code.
 */
export function LegalText({ doc, headingLevel = 2 }: { doc: LegalDocument; headingLevel?: 2 | 3 }): React.ReactElement | null {
  const t = useT();
  const { lang } = useLanguage();
  if (!doc.published || !doc.body) return null;
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <article className="sk-legal-text">
      {doc.title ? <Heading className="sk-legal-text__title">{doc.title}</Heading> : null}
      <p className="sk-legal-text__version">{t('privacy.legal.version', { version: doc.version ?? '', date: dateOf(doc.publishedAt ?? 0, lang) })}</p>
      {paragraphs(doc.body).map((text, index) => <p key={index}>{text}</p>)}
    </article>
  );
}
