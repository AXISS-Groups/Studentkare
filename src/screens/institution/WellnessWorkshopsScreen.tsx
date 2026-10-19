import React from 'react';
import { CalendarDays, Info, Users } from 'lucide-react';
import { useApiResource } from '../../hooks/api/useApiResource';
import { DataState, EmptyState } from '../../components/interface/WorkflowUI';
import { rupees, sittingWhen } from '../wellbeing/WellnessTrainingScreen';
import { useT } from '@/i18n';
import '../../theme/workflows.css';

interface Sitting {
  slotId: string;
  slotStart: string;
  slotEnd: string;
  capacity: number;
  spotsLeft: number;
}

interface WellnessSession {
  id: string;
  name: string;
  category: string;
  description: string;
  pack: string;
  pricePaise: number;
  providerName: string;
  sittings: Sitting[];
}

/**
 * Campus wellness sessions (design page 4, `CampusWellness`, Tier 3).
 *
 * This screen used to hold a hardcoded `useState` of two invented workshops with
 * invented instructors — "Dr. Neha Kapoor (Clinical Psychologist)" and "Coach S.
 * Ramakrishnan" — and invented RSVP counts of 42 and 28. Nothing routed it, so
 * nobody ever saw them; but a named clinical psychologist who does not exist is
 * not a thing to leave in the tree for whoever wires it up next.
 *
 * It now reads the same /wellness/timetable the student screen does, so a campus
 * sees exactly what its students see, and take-up is the real booking count
 * rather than a number typed into the source.
 *
 * What it deliberately does not show: who booked. A campus administrator gets how
 * many spots are taken and nothing about which students took them — attending a
 * meditation session before exams is not something a university needs a name
 * against, and the endpoint does not return one to anybody.
 */
export function WellnessWorkshopsScreen(): React.ReactElement {
  const t = useT();
  const timetable = useApiResource<WellnessSession[]>('/wellness/timetable');
  const sessions = timetable.data ?? [];

  const sittings = sessions.flatMap((session) => session.sittings);
  const spots = sittings.reduce((total, sitting) => total + sitting.capacity, 0);
  const taken = sittings.reduce(
    (total, sitting) => total + (sitting.capacity - sitting.spotsLeft),
    0,
  );

  return (
    <>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">{t('campus.wellness.eyebrow')}</span>
          <h2>{t('campus.wellness.title')}</h2>
          <p>{t('campus.wellness.lead')}</p>
        </div>
      </div>

      <DataState {...timetable} retry={timetable.reload}>
        {sessions.length === 0 ? (
          <EmptyState
            title={t('campus.wellness.emptyTitle')}
            description={t('campus.wellness.emptyBody')}
          />
        ) : (
          <>
            <div className="wf-record-grid">
              <article className="wf-card">
                <span className="wf-record-icon">
                  <CalendarDays size={24} aria-hidden="true" />
                </span>
                <h3>{sessions.length}</h3>
                <p>{t('campus.wellness.statSessions')}</p>
              </article>
              <article className="wf-card">
                <span className="wf-record-icon">
                  <CalendarDays size={24} aria-hidden="true" />
                </span>
                <h3>{sittings.length}</h3>
                <p>{t('campus.wellness.statSittings')}</p>
              </article>
              <article className="wf-card">
                <span className="wf-record-icon">
                  <Users size={24} aria-hidden="true" />
                </span>
                <h3>
                  {taken} / {spots}
                </h3>
                <p>{t('campus.wellness.statSpots')}</p>
              </article>
            </div>

            {sessions.map((session) => (
              <section className="wf-card wf-section-gap" key={session.id}>
                <div className="wf-panel-heading">
                  <div>
                    <span className="care-eyebrow">{session.category}</span>
                    <h3>{session.name}</h3>
                    <p>{session.description}</p>
                  </div>
                  <span className="wf-status status-accepted">{rupees(session.pricePaise)}</span>
                </div>

                {session.sittings.length === 0 ? (
                  <p className="wf-form-message">{t('campus.wellness.noSittings')}</p>
                ) : (
                  <div className="wf-table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">{t('campus.wellness.col.when')}</th>
                          <th scope="col">{t('campus.wellness.col.taken')}</th>
                          <th scope="col">{t('campus.wellness.col.capacity')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.sittings.map((sitting) => (
                          <tr key={sitting.slotId}>
                            <th scope="row">{sittingWhen(sitting)}</th>
                            <td style={NUMERIC}>{sitting.capacity - sitting.spotsLeft}</td>
                            <td style={NUMERIC}>{sitting.capacity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))}

            <div className="wf-notice wf-section-gap" role="note">
              <Info size={18} aria-hidden="true" />
              <span>{t('campus.wellness.privacyNote')}</span>
            </div>
          </>
        )}
      </DataState>
    </>
  );
}

const NUMERIC: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };
