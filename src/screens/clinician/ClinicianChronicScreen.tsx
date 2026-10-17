import React from 'react';
import { CalendarClock, HeartPulse, Info } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { DataState, EmptyState } from '../../components/interface/WorkflowUI';
import { translate, useT } from '@/i18n';
import type { MessageKey, Vars } from '@/i18n';
import '../../theme/workflows.css';

type T = (key: MessageKey, vars?: Vars) => string;
const english: T = (key, vars) => translate('en', key, vars);

const ENDED_BY_STUDENT = 'ENDED_BY_STUDENT';

interface Programme {
  id: string;
  /** Room and initials, e.g. "B-214 · KC". The API sends no name. */
  label: string;
  programme: string;
  target: string;
  lastReviewAt: number | null;
  nextDueAt: number | null;
  state: string;
  overdueByDays: number | null;
}

interface Tracker {
  items: Programme[];
  onProgramme: number;
  overdue: number;
  dueThisWeek: number;
  endedByStudent: number;
}

/**
 * Chronic tracker (design page 5, `ClinicianChronic`, Tier 3).
 *
 * Students on a care programme with this clinician, and when each is next due a
 * review. The enrolment is the consent — this is not a campus roster.
 *
 * Two things the design is deliberate about, and so is this:
 *
 * - A student is "B-214 · KC", room and initials. The API sends no name and no
 *   condition list; a clinician needs to recognise who they are chasing, and a
 *   tracker does not need a roster of names to do that.
 * - A student who leaves keeps their record and stops being chased. The row
 *   stays, shown as ended, with no next review — and leaving is never reported
 *   to their campus. That guarantee is why someone will leave a programme they
 *   need to leave, so it is stated on the screen, not just honoured in the API.
 */
export function ClinicianChronicScreen(): React.ReactElement {
  const t = useT();
  const tracker = useApiResource<Tracker>('/work/chronic');

  return (
    <>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">{t('partner.clin.chronic.eyebrow')}</span>
          <h2>{t('partner.clin.chronic.title')}</h2>
          <p>{t('partner.clin.chronic.intro')}</p>
        </div>
      </div>

      <DataState {...tracker} retry={tracker.reload}>
        {tracker.data ? <TrackerBody data={tracker.data} /> : null}
      </DataState>
    </>
  );
}

function TrackerBody({ data }: { data: Tracker }): React.ReactElement {
  const t = useT();
  if (data.items.length === 0) {
    return (
      <EmptyState
        title={t('partner.clin.chronic.emptyTitle')}
        description={t('partner.clin.chronic.emptyBody')}
      />
    );
  }

  return (
    <>
      <div className="wf-record-grid">
        <article className="wf-card">
          <span className="wf-record-icon">
            <HeartPulse size={24} aria-hidden="true" />
          </span>
          <h3>{data.onProgramme}</h3>
          <p>{t('partner.clin.chronic.statOn')}</p>
        </article>
        <article className="wf-card">
          <span className="wf-record-icon">
            <CalendarClock size={24} aria-hidden="true" />
          </span>
          <h3>{data.overdue}</h3>
          <p>{t('partner.clin.chronic.statOverdue')}</p>
        </article>
        <article className="wf-card">
          <span className="wf-record-icon">
            <CalendarClock size={24} aria-hidden="true" />
          </span>
          <h3>{data.dueThisWeek}</h3>
          <p>{t('partner.clin.chronic.statWeek')}</p>
        </article>
        <article className="wf-card">
          <span className="wf-record-icon">
            <HeartPulse size={24} aria-hidden="true" />
          </span>
          <h3>{data.endedByStudent}</h3>
          <p>{t('partner.clin.chronic.statLeft')}</p>
        </article>
      </div>

      <section className="wf-card wf-section-gap">
        <div className="wf-panel-heading">
          <div>
            <span className="care-eyebrow">{t('partner.clin.chronic.sectionEyebrow')}</span>
            <h3>{t('partner.clin.chronic.sectionTitle')}</h3>
          </div>
        </div>
        <div className="wf-table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">{t('partner.clin.chronic.colStudent')}</th>
                <th scope="col">{t('partner.clin.chronic.colProgramme')}</th>
                <th scope="col">{t('partner.clin.chronic.colLast')}</th>
                <th scope="col">{t('partner.clin.chronic.colNext')}</th>
                <th scope="col">{t('partner.clin.chronic.colState')}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <th scope="row">{item.label}</th>
                  <td>
                    {item.programme}
                    {item.target ? <small>{item.target}</small> : null}
                  </td>
                  <td style={NUMERIC}>{item.lastReviewAt ? shortDate(item.lastReviewAt) : t('partner.clin.chronic.notYet')}</td>
                  <td style={NUMERIC}>{nextDueText(item, t)}</td>
                  <td>{stateText(item, t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/*
        On the screen rather than only in the API, because it is the reason a
        student will leave a programme they need to leave.
      */}
      <div className="wf-notice wf-section-gap" role="note">
        <Info size={18} aria-hidden="true" />
        <span>{t('partner.clin.chronic.leaveNote')}</span>
      </div>
    </>
  );
}

/** Figures in a column line up. No utility class exists for this. */
const NUMERIC: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };

export function shortDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

/** No date for a programme that was left, and none invented for one never reviewed. */
export function nextDueText(item: Programme, t: T = english): string {
  if (item.state === ENDED_BY_STUDENT) return '—';
  if (item.overdueByDays !== null) {
    return item.overdueByDays === 1
      ? t('partner.clin.chronic.overdueOne')
      : t('partner.clin.chronic.overdueOther', { n: item.overdueByDays });
  }
  return item.nextDueAt ? shortDate(item.nextDueAt) : t('partner.clin.chronic.afterFirst');
}

export function stateText(item: Programme, t: T = english): string {
  if (item.state === ENDED_BY_STUDENT) return t('partner.clin.chronic.stateEnded');
  if (item.overdueByDays !== null) return t('partner.clin.chronic.stateChase');
  return t('partner.clin.chronic.stateOnTrack');
}
