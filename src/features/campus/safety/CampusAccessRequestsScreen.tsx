import React, { useState } from 'react';
import { ConsoleTablePage } from '@/design-system/console/ConsoleTablePage';
import { Drawer } from '@/design-system/overlays/Drawer';
import { Icon } from '@/design-system/icons';
import { SkButton } from '@/design-system/primitives';
import { useOnline } from '@/design-system/States';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import { Unavailable } from '@/features/campus/boards/boardKit';
import { OfflineNotice, SafetyNotice } from './safetyKit';
import './campus-safety.css';

/**
 * Access requests (design page 4, CampusAccessRequests; Tier 1, approved
 * 2026-10-21): a campus asks one student to share named fields for a stated
 * purpose; nothing is visible until the student approves.
 *
 * No consent-request model or endpoint exists yet (create, list by campus,
 * student approve/decline, expire, audit), so the list is "not connected" and
 * the "New request" drawer fails closed: its send button is always disabled
 * and says why. What the drawer can show honestly it shows: the purposes and
 * the allow-list of coarse fields (done/due, validity, normal/follow-up),
 * never free text. It does not show expiry choices (no setting, legal to
 * decide) or a preview of the student's wording (that wording must come from
 * the student's own consent inbox, one source, not from this screen).
 */
const PURPOSES: readonly MessageKey[] = [
  'campusSafety.access.purpose.hostel',
  'campusSafety.access.purpose.sports',
  'campusSafety.access.purpose.exam',
  'campusSafety.access.purpose.internship',
];

export type AccessField = 'vacc' | 'allergy' | 'blood' | 'cert' | 'camp';

/** The only fields a campus may ask for: coarse projections, never "anything else". */
export const ACCESS_FIELDS: ReadonlyArray<{ id: AccessField; label: MessageKey; meta: MessageKey }> = [
  { id: 'vacc', label: 'campusSafety.access.field.vacc', meta: 'campusSafety.access.field.vaccMeta' },
  { id: 'allergy', label: 'campusSafety.access.field.allergy', meta: 'campusSafety.access.field.allergyMeta' },
  { id: 'blood', label: 'campusSafety.access.field.blood', meta: 'campusSafety.access.field.bloodMeta' },
  { id: 'cert', label: 'campusSafety.access.field.cert', meta: 'campusSafety.access.field.certMeta' },
  { id: 'camp', label: 'campusSafety.access.field.camp', meta: 'campusSafety.access.field.campMeta' },
];

const FILTERS = ['all', 'pending', 'approved', 'declined', 'expired'] as const;
type Filter = typeof FILTERS[number];

const BOARD = 'CampusAccessRequests';

export function CampusAccessRequestsScreen(): React.ReactElement {
  const t = useT();
  const online = useOnline();
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState(false);
  const [purpose, setPurpose] = useState<MessageKey>(PURPOSES[0]);
  const [fields, setFields] = useState<ReadonlySet<AccessField>>(new Set<AccessField>(['vacc']));

  const toggle = (id: AccessField) => setFields((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <>
      <ConsoleTablePage
        className="cs-board"
        status="unconnected"
        header={{
          title: t('campusSafety.access.title'),
          subtitle: t('campusSafety.access.subtitle'),
          actions: <SkButton onClick={() => setOpen(true)} disabled={!online}><Icon name="plus" size={17} />{t('campusSafety.access.new')}</SkButton>,
        }}
        note={(
          <>
            <OfflineNotice />
            <div className="sk-ctp-chips" role="group" aria-label={t('campusSafety.access.filters')}>
              {FILTERS.map((id) => (
                <button key={id} type="button" className={`sk-ctp-chip${id === filter ? ' is-on' : ''}`} aria-pressed={id === filter} onClick={() => setFilter(id)}>
                  {t(`campusSafety.access.filter.${id}` as MessageKey)}
                </button>
              ))}
            </div>
          </>
        )}
        table={{
          caption: t('campusSafety.access.title'),
          columns: [
            { label: t('campusSafety.access.col.student'), width: '220px' },
            { label: t('campusSafety.access.col.purpose') },
            { label: t('campusSafety.access.col.by'), width: '200px' },
            { label: t('campusSafety.access.col.state'), width: '170px', align: 'end' },
          ],
          rows: [],
        }}
        unconnected={{ title: t('campusSafety.access.unconnectedTitle'), body: t('campusSafety.access.unconnectedBody') }}
        empty={{ title: t('campusSafety.access.empty'), body: t('campusSafety.emptyBody'), icon3d: 'chart-alt--p4', action: { label: t('campusSafety.emptyCta'), onSelect: () => navigate('campus/students') } }}
        error={{ title: t('campusSafety.access.error'), reference: t('campusBoards.ref', { code: 'NET', board: BOARD }), onRetry: () => undefined }}
        loadingLabel={t('campusSafety.access.loading')}
      />

      <Drawer open={open} title={t('campusSafety.access.drawer.title')} subtitle={t('campusSafety.access.drawer.sub')} onClose={() => setOpen(false)}>
        <form className="cs-drawer" onSubmit={(event) => event.preventDefault()}>
          <div className="cs-field">
            <span className="cs-field__label">{t('campusSafety.access.drawer.student')}</span>
            <p className="cs-field__hint">{t('campusSafety.access.drawer.studentUnavailable')}</p>
          </div>

          <fieldset className="cs-field">
            <legend className="cs-field__label">{t('campusSafety.access.drawer.purpose')}</legend>
            <div className="cs-options">
              {PURPOSES.map((key) => (
                <button key={key} type="button" className="cs-option" aria-pressed={purpose === key} onClick={() => setPurpose(key)}>{t(key)}</button>
              ))}
            </div>
          </fieldset>

          <fieldset className="cs-field">
            <legend className="cs-field__label">{t('campusSafety.access.drawer.fields')}</legend>
            <div className="cs-options">
              {ACCESS_FIELDS.map((field) => {
                const on = fields.has(field.id);
                return (
                  <button key={field.id} type="button" role="checkbox" aria-checked={on} className="cs-option" onClick={() => toggle(field.id)}>
                    <span className="cs-option__box" aria-hidden="true">{on ? <Icon name="check" size={14} strokeWidth={3} /> : null}</span>
                    <span className="cs-option__text">
                      <span>{t(field.label)}</span>
                      <span className="cs-option__meta">{t(field.meta)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="cs-field">
            <span className="cs-field__label">{t('campusSafety.access.drawer.expiry')}</span>
            <p className="cs-field__hint">{t('campusSafety.access.drawer.expiryUnavailable')}</p>
          </div>

          <div className="cs-field">
            <span className="cs-field__label">{t('campusSafety.access.drawer.preview')}</span>
            <p className="cs-field__hint">{t('campusSafety.access.drawer.previewUnavailable')}</p>
          </div>

          <SkButton type="submit" className="cs-submit" disabled>
            {t('campusSafety.access.drawer.send')}
            <Unavailable reason="campusSafety.access.drawer.sendUnavailable" />
          </SkButton>
          <SafetyNotice icon="lock">{t('campusSafety.access.drawer.sendUnavailable')}</SafetyNotice>
        </form>
      </Drawer>
    </>
  );
}
