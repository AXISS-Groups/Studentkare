import { apiRequest } from '@/data/services/http';

/** backend/services/push_api.py: super-admin announcements. Counts only; no recipient is ever named. */
export type AnnouncementKind = 'ANNOUNCEMENT' | 'OFFER';
export type AnnouncementStatus = 'SCHEDULED' | 'SENDING' | 'SENT' | 'CANCELLED';

export interface AnnouncementCounts {
  devices: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  suppressed: number;
}

export interface Announcement {
  id: string;
  kind: AnnouncementKind;
  title: string;
  body: string;
  campus: string;
  status: AnnouncementStatus;
  scheduledAt: number;
  createdAt: number;
  sentAt: number | null;
  recipients: number;
  counts: AnnouncementCounts;
}

export interface AnnouncementList {
  items: Announcement[];
  campuses: { name: string; students: number }[];
  providers: { phone: boolean; web: boolean };
  limits: { titleMax: number; bodyMax: number; scheduleMaxDays: number };
}

export interface AnnouncementDraft {
  kind: AnnouncementKind;
  title: string;
  body: string;
  campus: string;
  scheduledAt?: number;
}

export interface AnnouncementPreview {
  problems: string[];
  students: number;
  devices: number;
  lockScreen: { title: string; body: string };
}

export interface AnnouncementsRepository {
  list(): Promise<AnnouncementList>;
  preview(draft: AnnouncementDraft): Promise<AnnouncementPreview>;
  create(draft: AnnouncementDraft): Promise<Announcement>;
  cancel(id: string): Promise<Announcement>;
}

export const announcementsRepository: AnnouncementsRepository = {
  list: () => apiRequest<AnnouncementList>('/v1/admin/announcements'),
  preview: (draft) => apiRequest<AnnouncementPreview>('/v1/admin/announcements/preview', { method: 'POST', body: JSON.stringify(draft) }),
  create: (draft) => apiRequest<Announcement>('/v1/admin/announcements', { method: 'POST', body: JSON.stringify(draft) }),
  cancel: (id) => apiRequest<Announcement>(`/v1/admin/announcements/${encodeURIComponent(id)}/cancel`, { method: 'POST' }),
};
