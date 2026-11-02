/**
 * Released StudentKare lab reports (GET /lab-orders), shared by My health's
 * "Reviewed lab reports" card and the Report insights page (Tier 1 parity
 * plan 2026-10-24 §3, Q3). Only a released order with its report document
 * counts; the server already scopes /lab-orders to the signed-in student.
 */
export interface ReleasedReportFields {
  id: string;
  status: string;
  reportDocumentId?: string | null;
  reviewedAt?: number | null;
  createdAt: number;
}

/** Every released report with a document, in the server's order. */
export function releasedReports<T extends ReleasedReportFields>(tests: readonly T[]): T[] {
  return tests.filter((test) => test.status === 'REPORT_RELEASED' && Boolean(test.reportDocumentId));
}

/** The report to show: the one asked for (?id=), else the newest released one. */
export function pickReport<T extends ReleasedReportFields>(tests: readonly T[], id: string | null): T | null {
  const released = releasedReports(tests)
    .sort((a, b) => (b.reviewedAt ?? b.createdAt) - (a.reviewedAt ?? a.createdAt));
  return (id ? released.find((test) => test.id === id) : undefined) ?? released[0] ?? null;
}
