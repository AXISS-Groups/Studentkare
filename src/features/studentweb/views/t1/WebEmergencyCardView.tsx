import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon } from '@/design-system/icons';
import { useOnline } from '@/design-system';
import { useAuth } from '@/data/contexts/AuthContext';
import { shortNameOf } from '@/design-system/student-shell/StudentWebShell';
import { BLOOD_GROUPS, EmergencyCardViewModel, RELATIONS, isValidIndianMobile } from '@/features/emergency/viewmodel/EmergencyCardViewModel';
import type { EmergencyCardDraft } from '@/features/emergency/viewmodel/EmergencyCardViewModel';
import { WalletPassSection } from '@/features/emergency/views/WalletPassPanel';
import { ErrorPanel, LoadingRows, OfflinePanel, PageHead } from '../parts';
import { CrisisLine } from './shared';
import '../../studentweb.css';
import './t1web.css';

const splitList = (text: string): string[] => text.split(',').map((item) => item.trim()).filter(Boolean);

/** What a responder needs first, computed from the card being edited (never a guess). */
export function readiness(draft: EmergencyCardDraft): { checks: Array<{ key: MessageKey; done: boolean }>; percent: number } {
  const checks = [
    { key: 'swt.ice.check.blood' as MessageKey, done: draft.bloodGroup !== '' },
    { key: 'swt.ice.check.contact' as MessageKey, done: draft.contactName.trim() !== '' && isValidIndianMobile(draft.contactPhone) },
  ];
  const done = checks.filter((check) => check.done).length;
  return { checks, percent: Math.round((done / checks.length) * 100) };
}

/**
 * Emergency card, web (canvas 3b, WebEmergencyCard, Tier 1 — approved by
 * Krishna Chintakayala, 2026-10-21). The editor beside a live preview of the
 * card, built from the draft. Same view-model, fields and validation as before
 * (GET/PATCH /api/profile); allergies stay red, blood group defaults to "Not set".
 *
 * Not drawn, on purpose: the QR and "anyone who scans" (no public card URL,
 * D9-7), "Works offline on your phone" (no offline card, D6-2), up to three
 * contacts (the profile holds one, D6-6), current medicines (not on the
 * profile) and the break-glass notification line (no break-glass flow in the
 * backend). Print is the browser's print of the card.
 */
export const WebEmergencyCardView = observer(function WebEmergencyCardView({ vm }: { vm: EmergencyCardViewModel }) {
  const t = useT();
  const online = useOnline();
  const { user } = useAuth();
  const [allergyInput, setAllergyInput] = useState('');
  const draft = vm.draft;

  const head = (
    <PageHead
      title={t('swt.ice.title')}
      sub={t('swt.ice.sub')}
      actions={draft ? (
        <button type="button" className="sk-sw-btn sk-sw-btn--outline sk-swt-noprint" disabled={vm.dirty} title={vm.dirty ? t('swt.ice.printSaveFirst') : undefined} onClick={() => window.print()}>
          {t('swt.ice.print')}
        </button>
      ) : null}
    />
  );

  if (vm.loading) return <div className="sk-sw-page">{head}<LoadingRows label={t('ice.loading')} rows={4} /><CrisisLine /></div>;
  if (vm.loadFailed || !draft) {
    return (
      <div className="sk-sw-page">
        {head}
        {online ? <ErrorPanel title={t('ice.failedTitle')} body={t('ice.failedBody')} onRetry={() => void vm.load()} /> : <OfflinePanel onRetry={() => void vm.load()} />}
        <CrisisLine />
      </div>
    );
  }

  const allergies = splitList(draft.allergies);
  const setAllergies = (next: string[]) => vm.set('allergies', next.join(', '));
  const addAllergy = () => {
    const value = allergyInput.trim().replace(/,/g, ' ');
    if (value && !allergies.some((item) => item.toLowerCase() === value.toLowerCase())) setAllergies([...allergies, value]);
    setAllergyInput('');
  };
  const ready = readiness(draft);
  const name = user ? shortNameOf(user.fullName) : '';
  const relation = (value: string) => ((RELATIONS as readonly string[]).includes(value) ? t(`ice.rel.${value}` as MessageKey) : value);

  return (
    <div className="sk-sw-page" data-testid="web-emergency-card">
      {head}
      <div className="sk-swt-two sk-swt-two--wide-side">
        <form className="sk-sw-card sk-swt-form sk-swt-noprint" aria-label={t('swt.ice.editorLabel')} onSubmit={(event) => { event.preventDefault(); void vm.save(); }}>
          <fieldset className="sk-swt-chips">
            <legend className="sk-swt-group-label">{t('ice.blood')}</legend>
            <div className="sk-swt-bloods">
              {BLOOD_GROUPS.map((group) => (
                <button key={group || 'none'} type="button" className="sk-swt-chip" aria-pressed={draft.bloodGroup === group} onClick={() => vm.set('bloodGroup', group)}>
                  {group || t('swt.ice.notSet')}
                </button>
              ))}
            </div>
          </fieldset>
          <p className="sk-sw-fine">{t('swt.ice.bloodHint')}</p>

          <div className="sk-swt-col">
            <label className="sk-swt-group-label" htmlFor="sk-swt-allergy">{t('ice.allergies')}</label>
            <div className="sk-swt-tags">
              {allergies.map((item) => (
                <span key={item} className="sk-swt-tag">
                  {item}
                  <button type="button" aria-label={t('swt.ice.removeAllergy', { name: item })} onClick={() => setAllergies(allergies.filter((entry) => entry !== item))}><Icon name="x" size={13} /></button>
                </span>
              ))}
              <input
                id="sk-swt-allergy"
                value={allergyInput}
                placeholder={t('swt.ice.allergyPlaceholder')}
                onChange={(event) => setAllergyInput(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addAllergy(); } }}
                onBlur={addAllergy}
              />
            </div>
            <p className="sk-sw-fine">{t('swt.ice.allergyHint')}</p>
          </div>

          <label className="sk-sw-field">{t('ice.conditions')}
            <input value={draft.conditions} placeholder={t('swt.ice.conditionsPlaceholder')} onChange={(event) => vm.set('conditions', event.target.value)} />
          </label>

          <div className="sk-swt-col">
            <span className="sk-swt-group-label">{t('swt.ice.contactTitle')}</span>
            <div className="sk-swt-grid2">
              <label className="sk-sw-field">{t('ice.contactName')}
                <input value={draft.contactName} autoComplete="off" onChange={(event) => vm.set('contactName', event.target.value)} />
              </label>
              <label className="sk-sw-field">{t('ice.contactPhone')}
                <input
                  inputMode="numeric"
                  value={draft.contactPhone}
                  aria-invalid={vm.phoneError}
                  aria-describedby={vm.phoneError ? 'sk-swt-phone-error' : undefined}
                  placeholder={t('swt.ice.phonePlaceholder')}
                  onChange={(event) => vm.set('contactPhone', event.target.value)}
                />
              </label>
            </div>
            <div className="sk-swt-chips" role="group" aria-label={t('ice.relation')}>
              {RELATIONS.map((value) => (
                <button key={value} type="button" className="sk-swt-chip" aria-pressed={draft.contactRelation === value} onClick={() => vm.set('contactRelation', value)}>{relation(value)}</button>
              ))}
            </div>
            {vm.phoneError ? <p id="sk-swt-phone-error" className="sk-sw-danger" role="alert">{t('ice.contactPhoneError')}</p> : null}
            <p className="sk-sw-fine">{t('swt.ice.oneContact')}</p>
          </div>

          {vm.error ? <p className="sk-sw-error" role="alert">{t(vm.error)}</p> : null}
          {vm.notice ? <p className="sk-sw-success" role="status"><Icon name="check" size={15} />{t(vm.notice)}</p> : null}
          <CrisisLine />
        </form>

        <aside className="sk-swt-col" aria-label={t('swt.ice.previewLabel')}>
          <section className="sk-swt-card-preview" aria-labelledby="sk-swt-card-name" data-testid="ice-preview">
            <div className="sk-swt-card-preview__head">
              <span className="sk-swt-card-preview__mark" aria-hidden="true"><Icon name="heart-plus" size={22} /></span>
              <div>
                <span className="sk-swt-card-preview__eyebrow">{t('swt.ice.inCase')}</span>
                <strong id="sk-swt-card-name" className="sk-swt-card-preview__name">{name || t('swt.ice.you')}</strong>
              </div>
            </div>
            <dl className="sk-swt-card-preview__grid">
              <div><dt>{t('ice.blood')}</dt><dd>{draft.bloodGroup || t('swt.ice.notSet')}</dd></div>
              <div><dt>{t('ice.allergies')}</dt><dd>{allergies.length ? allergies.join(', ') : t('ice.noneRecorded')}</dd></div>
              <div className="is-wide"><dt>{t('ice.conditions')}</dt><dd>{draft.conditions.trim() || t('ice.noneRecorded')}</dd></div>
              <div className="is-wide">
                <dt>{t('swt.ice.call')}</dt>
                <dd>{draft.contactName.trim()
                  ? `${draft.contactName.trim()}${draft.contactRelation ? ` (${relation(draft.contactRelation)})` : ''}${isValidIndianMobile(draft.contactPhone) ? ` · +91 ${draft.contactPhone}` : ''}`
                  : t('swt.ice.noContact')}</dd>
              </div>
            </dl>
            <p className="sk-swt-card-preview__note">{t('swt.ice.previewNote')}</p>
          </section>

          <section className="sk-sw-card sk-swt-side sk-swt-noprint" aria-labelledby="sk-swt-ready-title">
            <h2 id="sk-swt-ready-title" className="sk-sw-card__title">{t('swt.ice.ready', { percent: ready.percent })}</h2>
            <div className="sk-swt-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={ready.percent} aria-label={t('swt.ice.readyLabel')}>
              <span className={ready.percent === 100 ? 'is-done' : undefined} style={{ width: `${ready.percent}%` }} />
            </div>
            <ul className="sk-swt-checks">
              {ready.checks.map((check) => (
                <li key={check.key} className={check.done ? 'is-done' : 'is-todo'}>
                  <Icon name={check.done ? 'check-2' : 'circle'} size={15} />
                  {t(check.key)}<span className="sk-visually-hidden">{check.done ? t('swt.ice.done') : t('swt.ice.todo')}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="sk-swt-noprint"><WalletPassSection refreshKey={vm.saved} /></div>

          <section className="sk-sw-card sk-swt-side sk-swt-noprint" aria-labelledby="sk-swt-who-title">
            <h2 id="sk-swt-who-title" className="sk-sw-card__title">{t('swt.ice.whoTitle')}</h2>
            <ul>
              <li><Icon name="check" size={15} />{t('swt.ice.who1')}</li>
              <li><Icon name="check" size={15} />{t('swt.ice.who2')}</li>
              <li><Icon name="check" size={15} />{t('swt.ice.who3')}</li>
            </ul>
          </section>
        </aside>
      </div>

      {vm.dirty ? (
        <div className="sk-swt-unsaved" role="region" aria-label={t('swt.ice.unsavedLabel')}>
          <div className="sk-swt-unsaved__text"><span className="sk-swt-unsaved__dot" aria-hidden="true" />{t('swt.ice.unsaved')}</div>
          <div className="sk-swt-unsaved__actions">
            <button type="button" className="sk-sw-btn sk-sw-btn--ghost" disabled={vm.saving} onClick={vm.discard}>{t('ice.discard')}</button>
            <button type="button" className="sk-sw-btn sk-sw-btn--light" disabled={!vm.canSave} aria-busy={vm.saving} onClick={() => void vm.save()}>{vm.saving ? t('swt.ice.saving') : t('swt.ice.save')}</button>
          </div>
        </div>
      ) : null}
    </div>
  );
});

/** Route /emergency-card on the web. */
export function WebEmergencyCardRoute(): React.ReactElement {
  const [vm] = useState(() => new EmergencyCardViewModel());
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return <WebEmergencyCardView vm={vm} />;
}
