/** GET /work/earnings, and the money and date formatting the board shows it with. */

interface EarningsPeriod {
  start: string;
  end: string;
  consults: number;
  grossPaise: number;
  /** Per-line deduction and net, only if the server ever reports them. */
  commissionPaise?: number | null;
  netPaise?: number | null;
}

export interface EarningsResponse {
  periods: EarningsPeriod[];
  grossPaise: number;
  consults: number;
  windowDays: number;
  /** Null: no platform commission is configured. The client renders the absence, never a default. */
  commissionRate: number | null;
  settlementConfigured: boolean;
}

/** Paise to rupees. Integer paise in, no floating-point money arithmetic. */
export function rupees(paise: number): string {
  const whole = Math.trunc(paise / 100);
  const remainder = Math.abs(paise % 100);
  const grouped = whole.toLocaleString('en-IN');
  return remainder === 0 ? `₹${grouped}` : `₹${grouped}.${String(remainder).padStart(2, '0')}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Sep 1–15", as on the canvas. */
export function periodLabel({ start, end }: { start: string; end: string }): string {
  const from = new Date(`${start}T00:00:00Z`);
  const to = new Date(`${end}T00:00:00Z`);
  return `${MONTHS[to.getUTCMonth()]} ${from.getUTCDate()}–${to.getUTCDate()}`;
}
