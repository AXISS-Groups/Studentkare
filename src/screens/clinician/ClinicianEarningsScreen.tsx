import React from 'react';
import { CalendarClock, Info, Receipt } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { DataState, EmptyState } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

interface EarningsPeriod {
  start: string;
  end: string;
  consults: number;
  grossPaise: number;
}

interface Earnings {
  periods: EarningsPeriod[];
  grossPaise: number;
  consults: number;
  windowDays: number;
  commissionRate: number | null;
  settlementConfigured: boolean;
}

/**
 * Clinician earnings (design page 5, `ClinicianEarnings`, Tier 3).
 *
 * The design shows a fortnightly statement with gross, a 10% commission, a net
 * figure, and "₹6,806 · Due 3 October". Only volume and gross exist: they are
 * summed from COMPLETED appointments at the price of the item actually booked.
 *
 * There is no settlement table, no payout record, and no configured commission
 * rate anywhere in this repo — which elsewhere states "zero commercial
 * commissions" — so the rate is a product decision, not a default to assume.
 * `commissionRate` comes back null and `settlementConfigured` false, and this
 * screen says so where the design put the net and the due date. A clinician
 * reading a figure headed "net to you" would plan around it.
 *
 * Also omitted: "Download statement". Nothing generates one, and a button that
 * produces a file the finance team has not defined is worse than its absence.
 */
export function ClinicianEarningsScreen(): React.ReactElement {
  const earnings = useApiResource<Earnings>('/work/earnings');

  return (
    <>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">PRACTICE</span>
          <h2>Earnings</h2>
          <p>
            Consults you have completed, and what they came to. Figures are summed from the
            appointments themselves — nothing here is an estimate.
          </p>
        </div>
      </div>

      <DataState {...earnings} retry={earnings.reload}>
        {earnings.data ? (
          <EarningsBody data={earnings.data} />
        ) : null}
      </DataState>
    </>
  );
}

function EarningsBody({ data }: { data: Earnings }): React.ReactElement {
  if (data.periods.length === 0) {
    return (
      <EmptyState
        title="Nothing in earnings yet."
        description={`Once you complete a consult it appears here, grouped by fortnight. Only completed consults count — a cancellation or a no-show does not.`}
      />
    );
  }

  return (
    <>
      <div className="wf-record-grid">
        <article className="wf-card">
          <span className="wf-record-icon">
            <Receipt size={24} aria-hidden="true" />
          </span>
          <h3>{rupees(data.grossPaise)}</h3>
          <p>Gross, last {Math.round(data.windowDays / 30)} months</p>
        </article>
        <article className="wf-card">
          <span className="wf-record-icon">
            <CalendarClock size={24} aria-hidden="true" />
          </span>
          <h3>{data.consults}</h3>
          <p>Consults completed</p>
        </article>
      </div>

      {/*
        Where the design put "₹6,806 · Due 3 October" and a 10% commission.
        Stating the absence is the honest version of those two tiles.
      */}
      {!data.settlementConfigured || data.commissionRate === null ? (
        <div className="wf-notice wf-section-gap" role="note">
          <Info size={18} aria-hidden="true" />
          <span>
            <strong>These are gross figures.</strong>{' '}
            {data.commissionRate === null
              ? 'No commission rate is configured, so no deduction is shown and no net figure is calculated.'
              : `Commission is ${(data.commissionRate * 100).toFixed(0)}%.`}{' '}
            {!data.settlementConfigured
              ? 'Settlement is not set up yet either, so this does not tell you when you will be paid. Ask your campus contact.'
              : null}
          </span>
        </div>
      ) : null}

      <section className="wf-card wf-section-gap">
        <div className="wf-panel-heading">
          <div>
            <span className="care-eyebrow">BY FORTNIGHT</span>
            <h3>Completed consults</h3>
          </div>
        </div>
        <div className="wf-table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Period</th>
                <th scope="col">Consults</th>
                <th scope="col">Gross</th>
              </tr>
            </thead>
            <tbody>
              {data.periods.map((period) => (
                <tr key={period.start}>
                  <th scope="row">{periodLabel(period)}</th>
                  <td style={NUMERIC}>{period.consults}</td>
                  <td style={NUMERIC}>{rupees(period.grossPaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

/** Figures in a column line up. No utility class exists for this. */
const NUMERIC: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };

/** Paise to rupees. Integer paise in, no floating-point money arithmetic. */
export function rupees(paise: number): string {
  const whole = Math.trunc(paise / 100);
  const remainder = Math.abs(paise % 100);
  const grouped = whole.toLocaleString('en-IN');
  return remainder === 0 ? `₹${grouped}` : `₹${grouped}.${String(remainder).padStart(2, '0')}`;
}

/** "1–15 Sep 2026" — one month named once when the period sits inside it. */
export function periodLabel({ start, end }: { start: string; end: string }): string {
  const from = new Date(`${start}T00:00:00Z`);
  const to = new Date(`${end}T00:00:00Z`);
  const month = to.toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' });
  const year = to.toLocaleDateString('en-IN', { year: 'numeric', timeZone: 'UTC' });
  return `${from.getUTCDate()}–${to.getUTCDate()} ${month} ${year}`;
}
