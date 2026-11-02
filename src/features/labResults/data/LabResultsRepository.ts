import { apiRequest } from '@/data/services/http';

/**
 * A student's stored lab values (backend services/lab_results.py; Mobile 2.0
 * plan Gap 1). Data layer only: M2Insights, M2Trends and M2ReportUpload are
 * Tier 1 screens and are built in their own tickets.
 *
 * Every number here is the server's. Whether a value is inside a range is the
 * server's `rangeState`, computed from the range the lab printed (`rangeSource`
 * says where that range came from); nothing on the client compares a value
 * with a threshold. Test names are health data: they are never put in client
 * storage, a route, a query string to a store page or a notification.
 */

export type RangeState = 'IN_RANGE' | 'ABOVE' | 'BELOW' | 'NO_RANGE';
export const RANGE_STATES: readonly RangeState[] = ['IN_RANGE', 'ABOVE', 'BELOW', 'NO_RANGE'];
/** LAB_REPORT: printed by a StudentKare lab with the released report. TYPED_FROM_REPORT: copied by the student. */
type RangeSource = 'LAB_REPORT' | 'TYPED_FROM_REPORT';
type ValueSource = 'LAB_RELEASED' | 'STUDENT_CONFIRMED';
type ValueStatus = 'DRAFT' | 'CONFIRMED';
export type BodySystem =
  | 'HEART_BLOOD' | 'BLOOD_SUGAR' | 'VITAMINS' | 'THYROID' | 'KIDNEY' | 'LIVER' | 'BLOOD_COUNT' | 'OTHER';

export interface LabValue {
  id: string;
  /** Groups one test's values: its reference code, or `name:<printed name>` when it has none. */
  testKey: string;
  testCode: string | null;
  testName: string;
  testNameAsPrinted: string;
  bodySystem: BodySystem | null;
  valueNumeric: number | null;
  valueText: string;
  unit: string;
  refLow: number | null;
  refHigh: number | null;
  /** The range exactly as printed ("4.0 - 5.6"). */
  refText: string;
  rangeState: RangeState;
  rangeSource: RangeSource | null;
  /** ISO date (YYYY-MM-DD) the sample was collected. */
  collectedOn: string;
  labName: string;
  source: ValueSource;
  documentId: string | null;
  labOrderId: string | null;
  status: ValueStatus;
  createdAt: number;
  confirmedAt: number | null;
}

type RangeCounts = Record<RangeState, number>;

export interface LabReportGroup {
  key: string;
  documentId: string | null;
  labOrderId: string | null;
  labName: string;
  collectedOn: string;
  source: ValueSource;
  rangeCounts: RangeCounts;
  items: LabValue[];
}

export interface BodySystemSummary {
  bodySystem: BodySystem;
  tests: number;
  outsideRange: number;
  noRange: number;
}

export interface LabValuesList {
  reports: LabReportGroup[];
  bodySystems: BodySystemSummary[];
  total: number;
}

export interface TestWithValues {
  testKey: string;
  testCode: string | null;
  testName: string;
  bodySystem: BodySystem | null;
  count: number;
  latestCollectedOn: string;
  latestRangeState: RangeState;
  pinned: boolean;
}

export interface TestsWithValues {
  items: TestWithValues[];
  pinned: string[];
  minPointsForLine: number;
}

export interface TestTrend {
  testKey: string;
  testName: string | null;
  /** Newest first, each with its own lab's range. */
  items: LabValue[];
  pinned: boolean;
  minPointsForLine: number;
}

export interface ReferenceTest {
  code: string;
  displayName: string;
  bodySystem: BodySystem;
  defaultUnit: string;
}

export interface Pinned {
  codes: string[];
  max: number;
}

/** One line of a report as the student typed it on the Check step. */
export interface ValueInput {
  testCode?: string | null;
  testName: string;
  valueNumeric?: number | null;
  valueText?: string;
  unit?: string;
  refLow?: number | null;
  refHigh?: number | null;
  refText?: string;
}

export interface DraftInput {
  collectedOn: string;
  labName: string;
  rows: ValueInput[];
}

export type DraftPatch = Partial<ValueInput> & { collectedOn?: string; labName?: string };

export interface ReportValues {
  documentId: string;
  items: LabValue[];
  maxRows: number;
}

export interface ConfirmResult {
  documentId: string;
  confirmed: number;
  discarded: number;
  rangeCounts: RangeCounts;
  outsideRange: number;
  items: LabValue[];
}

const enc = encodeURIComponent;

function hasArray<K extends string>(body: unknown, key: K): body is Record<K, unknown[]> {
  return typeof body === 'object' && body !== null && Array.isArray((body as Record<string, unknown>)[key]);
}

function checked<T, K extends string>(body: T, key: K, what: string): T {
  if (!hasArray(body, key)) throw new Error(`Invalid ${what} response.`);
  return body;
}

export class LabResultsRepository {
  constructor(private readonly request: typeof apiRequest = apiRequest) {}

  async list(): Promise<LabValuesList> {
    const body = await this.request<LabValuesList>('/health/lab-results');
    checked(body, 'bodySystems', 'lab values');
    return checked(body, 'reports', 'lab values');
  }

  async tests(): Promise<TestsWithValues> {
    return checked(await this.request<TestsWithValues>('/health/lab-results/tests'), 'items', 'tests');
  }

  async trend(testKey: string): Promise<TestTrend> {
    return checked(await this.request<TestTrend>(`/health/lab-results/trends?test=${enc(testKey)}`), 'items', 'trend');
  }

  async reference(): Promise<ReferenceTest[]> {
    return checked(await this.request<{ items: ReferenceTest[] }>('/lab-tests/reference'), 'items', 'test list').items;
  }

  async pinned(): Promise<Pinned> {
    return checked(await this.request<Pinned>('/health/lab-results/pinned'), 'codes', 'bookmarks');
  }

  async setPinned(codes: string[]): Promise<Pinned> {
    const body = await this.request<Pinned>('/health/lab-results/pinned', { method: 'PUT', body: JSON.stringify({ codes }) });
    return checked(body, 'codes', 'bookmarks');
  }

  async reportValues(documentId: string): Promise<ReportValues> {
    return checked(await this.request<ReportValues>(`/health/documents/${enc(documentId)}/lab-results`), 'items', 'report values');
  }

  async addDrafts(documentId: string, input: DraftInput): Promise<{ documentId: string; items: LabValue[] }> {
    const body = await this.request<{ documentId: string; items: LabValue[] }>(
      `/health/documents/${enc(documentId)}/lab-results`, { method: 'POST', body: JSON.stringify(input) });
    return checked(body, 'items', 'draft');
  }

  correctDraft(id: string, patch: DraftPatch): Promise<LabValue> {
    return this.request<LabValue>(`/health/lab-results/${enc(id)}`, { method: 'PATCH', body: JSON.stringify(patch) });
  }

  remove(id: string): Promise<{ success: boolean }> {
    return this.request(`/health/lab-results/${enc(id)}`, { method: 'DELETE' });
  }

  /** All or nothing: the ticked ids are saved and the report's other drafts are discarded. */
  async confirm(documentId: string, ids: string[]): Promise<ConfirmResult> {
    const body = await this.request<ConfirmResult>(`/health/documents/${enc(documentId)}/lab-results/confirm`, {
      method: 'POST', body: JSON.stringify({ ids }),
    });
    return checked(body, 'items', 'confirm');
  }
}

export const labResultsRepository = new LabResultsRepository();
