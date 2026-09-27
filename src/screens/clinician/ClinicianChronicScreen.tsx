import React from 'react';
import { CalendarClock, HeartPulse, Info } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { DataState, EmptyState } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

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
  const tracker = useApiResource<Tracker>('/work/chronic');

  return (
    <>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">PATIENTS</span>
          <h2>Chronic tracker</h2>
          <p>Students on a care programme with you, and when each is next due a review.</p>
        </div>
      </div>

      <DataState {...tracker} retry={tracker.reload}>
        {tracker.data ? <TrackerBody data={tracker.data} /> : null}
      </DataState>
    </>
  );
}

function TrackerBody({ data }: { data: Tracker }): React.ReactElement {
  if (data.items.length === 0) {
    return (
      <EmptyState
        title="Nothing in the chronic tracker yet."
        description="Students you put on a care programme appear here with their review dates. Nobody is added without agreeing to it."
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
          <p>On a programme</p>
        </article>
        <article className="wf-card">
          <span className="wf-record-icon">
            <CalendarClock size={24} aria-hidden="true" />
          </span>
          <h3>{data.overdue}</h3>
          <p>Review overdue</p>
        </article>
        <article className="wf-card">
          <span className="wf-record-icon">
            <CalendarClock size={24} aria-hidden="true" />
          </span>
          <h3>{data.dueThisWeek}</h3>
          <p>Due this week</p>
        </article>
        <article className="wf-card">
          <span className="wf-record-icon">
            <HeartPulse size={24} aria-hidden="true" />
          </span>
          <h3>{data.endedByStudent}</h3>
          <p>Left, records kept</p>
        </article>
      </div>

      <section className="wf-card wf-section-gap">
        <div className="wf-panel-heading">
          <div>
            <span className="care-eyebrow">FOLLOW-UP</span>
            <h3>Programmes</h3>
          </div>
        </div>
        <div className="wf-table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Student</th>
                <th scope="col">Programme &amp; target</th>
                <th scope="col">Last review</th>
                <th scope="col">Next due</th>
                <th scope="col">State</th>
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
                  <td style={NUMERIC}>{item.lastReviewAt ? shortDate(item.lastReviewAt) : 'Not yet'}</td>
                  <td style={NUMERIC}>{nextDueText(item)}</td>
                  <td>{stateText(item)}</td>
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
        <span>
          A student who leaves a programme drops off your follow-up list and keeps everything
          recorded. Nobody is chased after they opt out, and leaving is never reported to their
          campus.
        </span>
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
export function nextDueText(item: Programme): string {
  if (item.state === ENDED_BY_STUDENT) return '—';
  if (item.overdueByDays !== null) {
    return `Overdue by ${item.overdueByDays} ${item.overdueByDays === 1 ? 'day' : 'days'}`;
  }
  return item.nextDueAt ? shortDate(item.nextDueAt) : 'After first review';
}

export function stateText(item: Programme): string {
  if (item.state === ENDED_BY_STUDENT) return 'Ended by student';
  if (item.overdueByDays !== null) return 'Chase';
  return 'On track';
}
