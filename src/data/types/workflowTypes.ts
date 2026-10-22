export type AccountRole = 'STUDENT' | 'SUPER_ADMIN' | 'CAMPUS_ADMIN' | 'COUNSELLOR' | 'VENDOR' | 'NMC_DOCTOR';
/** Set on a VENDOR account by a super admin; decides which partner dashboard it gets. */
export type PartnerKind = 'PHARMACY' | 'LAB' | 'CLINIC' | 'WELLNESS';
export interface Account {
  id: string; fullName: string; role: AccountRole; email: string; phone: string;
  dob: string; university: string; rollNumber: string; bloodGroup: string;
  ageVerified: boolean; isVerifiedStudent: boolean;
  /** "" (or absent, from an older server) until a super admin assigns one. */
  partnerKind?: PartnerKind | '';
  /** Session answers only: the role must use 2FA and it is not on, so only Sign-in & security opens. */
  twoFactorSetupRequired?: boolean;
  /** A shared team account (one per role, PIN sign-in). The consoles show a "Team account" badge. Older servers omit it. */
  isTeamAccount?: boolean;
}
export interface SessionResponse { user: Account | null; csrfToken: string; requiresSignup?: boolean; requires2FA?: boolean; tempToken?: string }
export interface MemberProfile extends Account {
  emergencyContactName: string; emergencyContactPhone: string; emergencyContactRelation: string;
  allergies: string[]; chronicConditions: string[]; updatedAt: number | null;
  /**
   * True only when the student said they have no known allergies. An empty
   * `allergies` without it means "not answered". Older servers omit it.
   */
  noKnownAllergies?: boolean;
  /** Where the student lives on campus (GET /profile; "" until set). Older servers omit them. */
  hostelBlock?: string; room?: string;
}
export interface IdentitySummary {
  memberId: string; fullName: string; university: string; rollNumber: string;
  campusStatus: 'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
}
/** One pre-signed 30 s step of the check-in pass. Held in memory only. */
export interface PassWindowEntry {
  step: number; token: string; passCode: string; startsAt: number; expiresAt: number; qrMatrix: string[];
}
export interface MemberIdentity extends IdentitySummary {
  issued: boolean; issuedAt: number | null; code?: string; qrSvg?: string;
  /** This 30 s step's 6-digit code, read out when a scanner isn't available. */
  passCode?: string;
  /** Unix seconds after which the code and QR are refused. Fetch again then. */
  expiresAt?: number; rotateSeconds?: number;
  /** The next ten minutes of codes, for a weak signal at the counter. Never persisted. */
  passWindow?: PassWindowEntry[];
  /** The same QR as rows of '1'/'0' cells, for clients with no SVG renderer. */
  qrMatrix?: string[];
}
export interface ServiceHealth { status: string; persistent: boolean; integrations: { otpChannels: string[]; payments: boolean; insurer: boolean; deviceSync: boolean; prescriptionReview: boolean } }
export interface LiveCatalogItem {
  id: string; providerId: string; kind: 'product' | 'lab' | 'consultation' | 'vaccine'; name: string; brand: string;
  category: string; description: string; pack: string; pricePaise: number; mrpPaise: number; stock: number;
  active: boolean; requiresPrescription: boolean; preparation: string;
  imageUrl?: string | null;
  /** Medicine-master record of a product listing and its salts + strengths, e.g. "Paracetamol 500 mg". */
  medicineId?: string | null;
  composition?: string | null;
}
export interface MetricDefinition { id: string; label: string; unit: string; min: number; max: number }
export interface LiveReading { id: string; metric: string; value: number; unit: string; recordedAt: string; source: string }
export interface LiveDocument { id: string; title: string; category: string; filename: string; mimeType: string; createdAt: number }
export type RequestStatus = 'REQUESTED' | 'ACCEPTED' | 'DECLINED' | 'DISPATCHED' | 'COMPLETED' | 'CANCELLED';
export interface OrderLine { id: string; itemId: string; name: string; kind: LiveCatalogItem['kind']; quantity: number; pricePaise: number; status: RequestStatus }
export interface Delivery { mode: 'delivery' | 'pickup'; address: string; city: string; pincode: string }
export interface LiveOrder { id: string; createdAt: number; totalPaise: number; delivery: Delivery; requestedSlot: string; paymentStatus: string; lines: OrderLine[] }
export interface WorkRequest extends OrderLine { orderId: string; customer: string; contact: string; delivery: Delivery; requestedSlot: string; createdAt: number }
export interface StaffAppointment { id: string; catalogItemId: string; providerId: string; slotStart: string; slotEnd: string; status: string; createdAt: number; updatedAt: number; customer: string; contact: string }
export interface LivePolicy { id: string; insurer: string; policyNumber: string; sumInsured: number; validUntil: string; verification: string }
export interface ReviewedBenefit { id: string; category: string; title: string; description: string; reviewed: boolean }
export interface ClaimRequest { id: string; policyId: string; providerName: string; service: string; amountPaise: number; status: string; createdAt: number }
export interface RecordShare { id: string; clinician: string; document: string; grantedAt: number; expiresAt: number; revoked: boolean; active: boolean }
export interface FollowUpTask { id: string; orderId: string; note: string; status: string; createdAt: number; resolvedAt: number | null }
export interface SupportTicket { id: string; subject: string; message: string; status: string; createdAt: number; pointsAwarded?: number }
export interface StaffAccount { id: string; fullName: string; identifier: string; role: AccountRole; active: boolean; partnerKind?: PartnerKind | ''; /** Campus administrators only: the campus they act for ('' = not set). */ campus?: string; /** An authenticator is on, so a super admin can reset it. */ twoFactorEnabled?: boolean }
export interface AuditEvent { id: string; actorId: string; action: string; resourceId: string; createdAt: number }
export interface OpsSummary { accounts: number; catalogItems: number; orderRequests: number; openSupport: number; statuses: Record<string, number> }
/** GET /ops/feed — `summary` carries counts and states only, never clinical detail (Rule L). */
export type OpsSeverity = 'INFO' | 'ATTENTION' | 'CRITICAL';
export interface OpsFeedEvent { id: string; kind: string; domain: string; severity: OpsSeverity; actorId: string; actorRole: string; subjectId: string; providerId: string; resourceType: string; resourceId: string; summary: string; createdAt: number; acknowledgedAt: number | null; acknowledgedBy: string }
export interface OpsFeed { items: OpsFeedEvent[]; total: number; critical: number; scope: string }
/** GET /ops/integration-health — a configured service with no probe reports 'unknown', never 'online'. */
export type IntegrationStatus = 'online' | 'unavailable' | 'degraded' | 'unknown';
export interface IntegrationCheck { name: string; configured: boolean; reachable: boolean | null; status: IntegrationStatus; detail: string; checked_at: number }
/** GET /ops/jobs */
export interface ScheduledJob { key: string; name: string; enabled: boolean; intervalSeconds: number; lastRunAt: number | null; nextRunAt: number | null; lastStatus: string; lastError: string | null }
export interface IntegrationHealth { summary: { checked_at: number; interval_seconds: number; checks: IntegrationCheck[]; overall: 'operational' | 'degraded' } }
export interface HomeContentItem { key: string; title: string; eyebrow: string; body: string; summary: string; action: string; target: string; icon: string; color: string; sort: number }
export interface HomeArticle { id: string; tag: string; title: string; readTime: string; color: string; body: string[] }
export interface HomeContent { hero: HomeContentItem[]; aside: HomeContentItem[]; features: HomeContentItem[]; movement: HomeContentItem[]; links: HomeContentItem[]; articles: HomeArticle[] }
export const money = (paise: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(paise / 100);
export const discountPercent = (mrpPaise: number, pricePaise: number) => mrpPaise > pricePaise && mrpPaise > 0 ? Math.round((1 - pricePaise / mrpPaise) * 100) : 0;
export const displayDate = (value: number | string) => new Date(typeof value === 'number' ? value * 1000 : value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
