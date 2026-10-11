import React, { useMemo, useState } from 'react';
import { CalendarDays, Info, MapPin } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { DataState, EmptyState, FormError, useMutation } from '../../components/interface/WorkflowUI';
import { apiRequest } from '../../data/http';
import { translate, useT } from '@/i18n';
import type { MessageKey, Vars } from '@/i18n';
import '../../theme/workflows.css';

type Translate = (key: MessageKey, vars?: Vars) => string;
const english: Translate = (key, vars) => translate('en', key, vars);

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
 * Wellness training (design page 3, `WebWellness`, Tier 3).
 *
 * Campus fitness and wellbeing sessions, booked through the appointment path
 * that already reserves capacity under a row lock — so the spots shown here are
 * the same number a booking decrements, not a display value.
 *
 * "No leaderboards, no body scores" is kept from the design, and it is true:
 * Rule L forbids gamifying body metrics, the timetable payload carries none, and
 * this screen shows attendance only as spots remaining.
 *
 * Dropped, each checked first:
 *
 * - "run by certified coaches". No certification is recorded or verified for
 *   anyone. Guardrail 6, and the same reason /clinicians does not say
 *   "NMC-verified".
 * - "Premium: ₹20 off every session". No per-item plan discount exists; plans
 *   do not alter a catalog price anywhere in the system.
 * - "Cancel up to 2 hours before, free". Cancelling is free and returns the
 *   spot, but there is no cutoff implemented, so the screen does not invent one.
 * - "12 sessions on campus today". Shown from the real timetable instead.
 */
export function WellnessTrainingScreen(): React.ReactElement {
  const t = useT();
  const timetable = useApiResource<WellnessSession[]>('/wellness/timetable');
  const [category, setCategory] = useState('');
  const [booked, setBooked] = useState<string[]>([]);
  const mutation = useMutation();

  const sessions = timetable.data ?? [];
  const categories = useMemo(
    () => [...new Set(sessions.map((session) => session.category))].sort(),
    [sessions],
  );
  const shown = category ? sessions.filter((session) => session.category === category) : sessions;

  const book = (sitting: Sitting) =>
    mutation.run(
      () => apiRequest('/appointments', { method: 'POST', body: JSON.stringify({ slotId: sitting.slotId }) }),
      () => {
        setBooked((current) => [...current, sitting.slotId]);
        // Re-read rather than decrementing locally: someone else may have taken
        // a spot in the meantime, and the server count is the real one.
        timetable.reload();
      },
    );

  return (
    <>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">{t('assist.wellness.eyebrow')}</span>
          <h2>{t('assist.wellness.title')}</h2>
          <p>{t('assist.wellness.intro')}</p>
        </div>
      </div>

      <FormError message={mutation.error} />

      <DataState {...timetable} retry={timetable.reload}>
        {sessions.length === 0 ? (
          <EmptyState
            title={t('assist.wellness.emptyTitle')}
            description={t('assist.wellness.emptyBody')}
          />
        ) : (
          <>
            {categories.length > 1 ? (
              <div className="wf-catalog-tabs" role="group" aria-label={t('assist.wellness.filter')}>
                <button
                  type="button"
                  style={{ minHeight: 44 }}
                  className={`exercise-saved-filter ${category === '' ? 'is-active' : ''}`}
                  aria-pressed={category === ''}
                  onClick={() => setCategory('')}
                >
                  {t('assist.wellness.all')}
                </button>
                {categories.map((option) => (
                  <button
                    type="button"
                    style={{ minHeight: 44 }}
                    key={option}
                    className={`exercise-saved-filter ${category === option ? 'is-active' : ''}`}
                    aria-pressed={category === option}
                    onClick={() => setCategory(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : null}

            {shown.map((session) => (
              <section className="wf-card wf-section-gap" key={session.id}>
                <div className="wf-panel-heading">
                  <div>
                    <span className="care-eyebrow">{session.category}</span>
                    <h3>{session.name}</h3>
                    <p>{session.description}</p>
                  </div>
                  <span className="wf-status status-accepted">{rupees(session.pricePaise, t)}</span>
                </div>

                <p className="wf-order-meta">
                  <MapPin size={13} aria-hidden="true" /> {session.providerName}
                  {session.pack ? ` · ${session.pack}` : ''}
                </p>

                {session.sittings.length === 0 ? (
                  <p className="wf-form-message">
                    {t('assist.wellness.noSittings')}
                  </p>
                ) : (
                  <div className="wf-table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">{t('assist.wellness.when')}</th>
                          <th scope="col">{t('assist.wellness.spotsLeft')}</th>
                          <th scope="col">{t('assist.wellness.book')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.sittings.map((sitting) => (
                          <tr key={sitting.slotId}>
                            <th scope="row">
                              <CalendarDays size={13} aria-hidden="true" /> {sittingWhen(sitting)}
                            </th>
                            <td style={NUMERIC}>{spotsText(sitting, t)}</td>
                            <td>
                              {booked.includes(sitting.slotId) ? (
                                <span className="wf-status status-accepted">{t('assist.wellness.booked')}</span>
                              ) : (
                                <button
                                  type="button"
                                  style={{ minHeight: 44 }}
                                  className="health-button"
                                  disabled={mutation.busy || sitting.spotsLeft === 0}
                                  onClick={() => void book(sitting)}
                                >
                                  {sitting.spotsLeft === 0 ? t('assist.wellness.full') : t('assist.wellness.bookSpot')}
                                </button>
                              )}
                            </td>
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
              <span>{t('assist.wellness.cancelNote')}</span>
            </div>
          </>
        )}
      </DataState>
    </>
  );
}

/** Figures in a column line up. No utility class exists for this. */
const NUMERIC: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };

/** Paise to rupees. Integer paise in, no floating-point money arithmetic. */
export function rupees(paise: number, t: Translate = english): string {
  if (paise === 0) return t('assist.wellness.free');
  const whole = Math.trunc(paise / 100);
  const remainder = Math.abs(paise % 100);
  const grouped = whole.toLocaleString('en-IN');
  return remainder === 0 ? `₹${grouped}` : `₹${grouped}.${String(remainder).padStart(2, '0')}`;
}

export function spotsText(sitting: Sitting, t: Translate = english): string {
  if (sitting.spotsLeft === 0) return t('assist.wellness.full');
  return t('assist.wellness.spotsOf', { left: sitting.spotsLeft, capacity: sitting.capacity });
}

export function sittingWhen({ slotStart }: Sitting): string {
  const when = new Date(slotStart);
  if (Number.isNaN(when.getTime())) return slotStart;
  return when.toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}
