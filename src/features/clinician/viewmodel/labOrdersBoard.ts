import { apiRequest } from '@/data/services/http';
import type { DataTableRow, SkTone } from '@/design-system';
import type { MessageKey } from '@/i18n';
import type { ConsoleTableData, ConsoleTableSource } from './ConsoleTableViewModel';
import { cell, muted, pill, strong } from './cells';
import { dateOnly } from '../model/clinicalData';
import type { Request, T } from '../model/clinicalData';
import { INDICATION_MIN } from './DoctorLabOrderViewModel';
import type { PlacedLabOrder } from './DoctorLabOrderViewModel';

const OPEN = new Set(['BOOKED', 'ASSIGNED', 'SAMPLE_COLLECTED', 'IN_TRANSIT', 'RECEIVED_AT_LAB', 'IN_ANALYSIS', 'REPORT_READY', 'RECOLLECTION_REQUIRED', 'SAMPLE_REJECTED']);
const STATUS_TONE: Record<string, SkTone> = {
  BOOKED: 'action', ASSIGNED: 'action', SAMPLE_COLLECTED: 'positive', IN_TRANSIT: 'positive', RECEIVED_AT_LAB: 'positive',
  IN_ANALYSIS: 'positive', REPORT_READY: 'attention', REPORT_RELEASED: 'positive', SAMPLE_REJECTED: 'danger',
  RECOLLECTION_REQUIRED: 'attention', CANCELLED: 'neutral',
};
const PERCENT = 100;

const STATUS_KEY: Record<string, MessageKey> = {
  BOOKED: 'clinLab.status.BOOKED', ASSIGNED: 'clinLab.status.ASSIGNED', SAMPLE_COLLECTED: 'clinLab.status.SAMPLE_COLLECTED',
  IN_TRANSIT: 'clinLab.status.IN_TRANSIT', RECEIVED_AT_LAB: 'clinLab.status.RECEIVED_AT_LAB', IN_ANALYSIS: 'clinLab.status.IN_ANALYSIS',
  REPORT_READY: 'clinLab.status.REPORT_READY', REPORT_RELEASED: 'clinLab.status.REPORT_RELEASED', SAMPLE_REJECTED: 'clinLab.status.SAMPLE_REJECTED',
  RECOLLECTION_REQUIRED: 'clinLab.status.RECOLLECTION_REQUIRED', CANCELLED: 'clinLab.status.CANCELLED',
};

function statusLabel(status: string, t: T): string {
  return t(STATUS_KEY[status] ?? 'clinLab.status.other');
}

export function mapLabOrders(orders: PlacedLabOrder[], t: T): ConsoleTableData {
  const open = orders.filter((o) => OPEN.has(o.status));
  const withIndication = orders.filter((o) => o.clinicalIndication.trim().length >= INDICATION_MIN).length;
  const rows: DataTableRow[] = orders.map((o) => ({
    id: o.id,
    cells: [
      strong(o.patientName || t('clinLab.nameUnknown')),
      strong(o.testPanel.join(', '), o.clinicalIndication),
      cell(o.fastingRequired ? t('clinLab.fasting') : t('clinLab.noFasting'), o.fastingRequired ? 'attention' : undefined),
      muted(o.labName || '—'),
      pill(t('clinLab.stateOn', { status: statusLabel(o.status, t), date: dateOnly(o.createdAt) }), STATUS_TONE[o.status] ?? 'neutral'),
    ],
  }));
  return {
    stats: [
      { value: String(open.length), label: t('clinLab.stat.open') },
      // Orders carry no urgency field: shown as unreported, never guessed.
      { value: null, label: t('clinLab.stat.urgent'), meta: t('clinLab.notReported') },
      { value: String(open.filter((o) => o.fastingRequired).length), label: t('clinLab.stat.fasting'), tone: 'attention' },
      { value: orders.length ? `${Math.round((withIndication / orders.length) * PERCENT)}%` : null, label: t('clinLab.stat.indication'), tone: 'positive' },
    ],
    rows,
  };
}

export function labOrdersApiSource(t: T, request: Request = apiRequest): ConsoleTableSource {
  return { load: async () => mapLabOrders((await request<{ items: PlacedLabOrder[] }>('/work/doctor-lab-orders')).items, t) };
}
