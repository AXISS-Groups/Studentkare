import { apiRequest } from '@/data/services/http';

export type InviteChannel = 'EMAIL' | 'WHATSAPP';
export type InviteStatus = 'PENDING' | 'CLAIMED' | 'EXPIRED';

/** One invite, as GET /campus/invites lists it. Never a token or a password. */
export interface StudentInvite {
  id: string;
  fullName: string;
  rollNumber: string;
  university: string;
  email: string;
  phone: string;
  sentBy: InviteChannel;
  status: InviteStatus;
  /** The provider accepted the link message. */
  linkSent: boolean;
  createdAt: number;
  expiresAt: number;
  claimedAt: number | null;
  locked: boolean;
}

/** The one answer that carries the temporary password (create and resend). */
export interface IssuedInvite extends StudentInvite { tempPassword: string }

export interface InviteDraft {
  fullName: string;
  rollNumber: string;
  email?: string;
  phone?: string;
  sendBy: InviteChannel;
  /** Super admin only: a campus admin always invites to their own campus. */
  university?: string;
}

/** Campus, Students, Invite. The only place that knows the /campus/invites endpoints. */
export interface StudentInvitesRepository {
  /** `chooseCampus`: the form asks for the campus (a super admin); a campus admin always invites to their own. */
  list(signal?: AbortSignal): Promise<{ items: StudentInvite[]; chooseCampus: boolean }>;
  create(draft: InviteDraft): Promise<IssuedInvite>;
  resend(id: string): Promise<IssuedInvite>;
  cancel(id: string): Promise<void>;
}

const path = (id: string, action: string) => `/campus/invites/${encodeURIComponent(id)}/${action}`;

export const studentInvitesRepository: StudentInvitesRepository = {
  list: signal => apiRequest<{ items: StudentInvite[]; chooseCampus: boolean }>('/campus/invites', { signal }),
  create: draft => apiRequest<IssuedInvite>('/campus/invites', { method: 'POST', body: JSON.stringify(draft) }),
  resend: id => apiRequest<IssuedInvite>(path(id, 'resend'), { method: 'POST' }),
  cancel: id => apiRequest<void>(path(id, 'cancel'), { method: 'POST' }),
};
