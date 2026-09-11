export type AccountRole = 'STUDENT' | 'SUPER_ADMIN' | 'CAMPUS_ADMIN' | 'VENDOR' | 'NMC_DOCTOR';
export interface Account {
  id: string; fullName: string; role: AccountRole; email: string; phone: string;
  dob: string; university: string; rollNumber: string; bloodGroup: string;
  ageVerified: boolean; isVerifiedStudent: boolean;
}
export interface SessionResponse { user: Account | null; csrfToken: string; requiresSignup?: boolean; requires2FA?: boolean; tempToken?: string }
export interface ServiceHealth { status: string; persistent: boolean; integrations: { otpChannels: string[]; payments: boolean; insurer: boolean; deviceSync: boolean; prescriptionReview: boolean } }
export interface LiveCatalogItem {
  id: string; providerId: string; kind: 'product' | 'lab' | 'consultation'; name: string; brand: string;
  category: string; description: string; pack: string; pricePaise: number; mrpPaise: number; stock: number;
  active: boolean; requiresPrescription: boolean; preparation: string;
}
export interface MetricDefinition { id: string; label: string; unit: string; min: number; max: number }
export interface LiveReading { id: string; metric: string; value: number; unit: string; recordedAt: string; source: string }
export interface LiveDocument { id: string; title: string; category: string; filename: string; mimeType: string; createdAt: number }
export type RequestStatus = 'REQUESTED' | 'ACCEPTED' | 'DECLINED' | 'DISPATCHED' | 'COMPLETED' | 'CANCELLED';
export interface OrderLine { id: string; itemId: string; name: string; kind: LiveCatalogItem['kind']; quantity: number; pricePaise: number; status: RequestStatus }
export interface Delivery { mode: 'delivery' | 'pickup'; address: string; city: string; pincode: string }
export interface LiveOrder { id: string; createdAt: number; totalPaise: number; delivery: Delivery; requestedSlot: string; lines: OrderLine[] }
export interface WorkRequest extends OrderLine { orderId: string; customer: string; contact: string; delivery: Delivery; requestedSlot: string; createdAt: number }
export interface LivePolicy { id: string; insurer: string; policyNumber: string; sumInsured: number; validUntil: string; verification: string }
export interface SupportTicket { id: string; subject: string; message: string; status: string; createdAt: number }
export interface StaffAccount { id: string; fullName: string; identifier: string; role: AccountRole; active: boolean }
export interface AuditEvent { id: string; actorId: string; action: string; resourceId: string; createdAt: number }
export interface OpsSummary { accounts: number; catalogItems: number; orderRequests: number; openSupport: number; statuses: Record<string, number> }
export interface HomeContentItem { key: string; title: string; eyebrow: string; body: string; summary: string; action: string; target: string; icon: string; color: string; sort: number }
export interface HomeArticle { id: string; tag: string; title: string; readTime: string; color: string; body: string[] }
export interface HomeContent { hero: HomeContentItem[]; aside: HomeContentItem[]; features: HomeContentItem[]; movement: HomeContentItem[]; links: HomeContentItem[]; articles: HomeArticle[] }
export const money = (paise: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(paise / 100);
export const discountPercent = (mrpPaise: number, pricePaise: number) => mrpPaise > pricePaise && mrpPaise > 0 ? Math.round((1 - pricePaise / mrpPaise) * 100) : 0;
export const displayDate = (value: number | string) => new Date(typeof value === 'number' ? value * 1000 : value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
