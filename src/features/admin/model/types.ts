import type { AuditEvent, FollowUpTask, LiveCatalogItem, RequestStatus, StaffAccount, StaffAppointment, WorkRequest } from '@/data/workflowTypes';
import type { ContractRecord, EnterpriseInquiry } from '@/data/datasets/billing';

/** GET /ops/audit — one page of audit events and the total across all pages. */
export interface AuditPage { items: AuditEvent[]; total: number }

/** GET /ops/agents/ayush/quality — Agent Ayush's recorded turns, summarised. Rates are 0–1. */
export interface AyushQuality { turns: number; groundedRate: number; answerRate: number; refusalBreakdown: Record<string, number>; avgLatencyMs: number; avgTopScore: number }

/** One OCR-extracted field the reader wasn't sure of. Confidence is 0–1. */
export interface ReviewItem { id: string; intakeId: string; field: string; value: string; confidence: number; documentId: string }

/** GET /ops/intake/review — fields waiting for a person, across documents. */
export interface IntakeQueue { items: ReviewItem[] }

/** A person's decision on one field: confirm it (with the value to keep) or reject it. */
export interface FieldDecision { approved: boolean; correctedValue: string }

/** A knowledge source Agent Ayush may quote. expiresAt is in Unix seconds. */
export interface KnowledgeSource { id: string; title: string; category: string; version: number; author: string; reviewed: boolean; expiresAt: number | null }

/** GET /knowledge/sources */
export interface KnowledgeSources { items: KnowledgeSource[] }

/** GET /ops/knowledge/index-status — what the retrieval index holds. `missing` lists approved source ids not indexed. */
export interface IndexStatus { approvedSources: number; indexedSources: number; chunks: number; embedder: string; semantic: boolean; missing: string[]; mismatchedEmbedder: number }

/** POST /ops/knowledge — a source to publish. */
export interface NewKnowledgeSource { title: string; category: string; content: string; author: string; expiresInDays: number }

/** Categories a knowledge source can be published under, in the order the form offers them. */
export const KNOWLEDGE_CATEGORIES = ['appointments', 'records', 'insurance', 'medications', 'support', 'services', 'general'] as const;

/** GET /billing/admin/inquiries — institutional inquiries, newest first as the server sends them. */
export interface InquiryList { items: EnterpriseInquiry[] }

/** GET /billing/contracts */
export interface ContractList { items: ContractRecord[] }

/** Where an institutional inquiry stands, in the order the status menu offers them. */
export const INQUIRY_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED'] as const;

/** POST /billing/admin/contracts — a signed contract to record. Amounts are in paise. */
export interface NewContract { organization: string; planId: string; managerEmail: string; seats: number; annualAmountPaise: number; signedReference: string }

/** GET /ops/feed/counts — outstanding (unacknowledged) events per domain. */
export interface OpsFeedCounts { domains: Record<string, number> }

/** Which slice of the activity feed to read. */
export interface FeedQuery { limit: number; domain?: string; unacknowledgedOnly?: boolean }

/** Feed domains with a card on the Activity screen, in the order they are shown. */
export const FEED_DOMAINS = ['MARKETPLACE', 'CLINICAL', 'PHARMACY', 'LAB', 'CAMPUS', 'SAFETY', 'SUPPORT'] as const;

/** GET /ops/accounts — one page of accounts and the total matching the filters. */
export interface AccountPage { items: StaffAccount[]; total: number }

/** Which page of accounts to read; an empty query or role means no filter. */
export interface AccountListQuery { limit: number; offset: number; query: string; role: string }

/** POST /ops/accounts — a staff account to provision. The holder verifies the contact at sign-in. */
export interface NewStaffAccount { fullName: string; identifier: string; channel: string; role: string }

/** GET /ops/accounts with no filters — every account, for choosing a provider. */
export interface AccountList { items: StaffAccount[] }

/** GET /ops/catalog — one page of catalogue entries and the total across all pages. */
export interface CatalogPage { items: LiveCatalogItem[]; total: number }

/** Which page of the catalogue to read; an empty query means no search. */
export interface CatalogListQuery { limit: number; offset: number; query: string }

/** The publish form as typed: price is in rupees and stock is text until the entry is sent. */
export interface CatalogEntryForm { name: string; brand: string; kind: string; category: string; description: string; pack: string; price: string; stock: string; providerId: string; preparation: string; requiresPrescription: boolean }

/** POST /ops/catalog — an entry to publish. The price is in paise. */
export interface NewCatalogEntry { name: string; brand: string; kind: string; category: string; description: string; pack: string; stock: number; providerId: string; preparation: string; requiresPrescription: boolean; pricePaise: number }

/** PATCH /ops/catalog/{id} — an entry's stock and whether it is published. */
export interface CatalogEntryChange { stock: number; active: boolean }

/** Categories an entry can be published under, in the order the form offers them. */
export const CATALOG_CATEGORIES = ['devices', 'vitamins', 'skin', 'nutrition', 'first-aid', 'ayurveda', 'medicines', 'labs', 'general-care'] as const;

/** GET /work/requests — one page of the requests assigned to the signed-in account. The total may be missing. */
export interface WorkRequestPage { items: WorkRequest[]; total?: number }

/** The status filter on the request list, in the order it is offered. ALL means no filter. */
export const WORK_REQUEST_FILTERS = ['ALL', 'REQUESTED', 'ACCEPTED', 'DISPATCHED', 'COMPLETED', 'DECLINED', 'CANCELLED'] as const;
export type WorkRequestFilter = typeof WORK_REQUEST_FILTERS[number];

/** Which page of requests to read. */
export interface WorkRequestQuery { limit: number; offset: number; status: WorkRequestFilter }

/** PATCH /work/requests/{id} — the statuses staff can move a request to. */
export type WorkRequestTransition = Extract<RequestStatus, 'ACCEPTED' | 'DECLINED' | 'DISPATCHED' | 'COMPLETED'>;

/** PATCH /work/appointments/{id} — the statuses staff can move an appointment to. */
export type AppointmentTransition = 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

/** GET /work/appointments — the appointments on the signed-in account's services. */
export interface AppointmentList { items?: StaffAppointment[] }

/** GET /work/followups — follow-up tasks raised on overdue requests. */
export interface FollowUpList { items?: FollowUpTask[] }

/** One source's server state, as a ViewModel holds it: nothing loaded is never a value. */
export interface SourceState<T> { data: T | null; loading: boolean; error: string }

/** A count the Overview may not have. Anything not loaded is unknown, never 0. */
export type MetricValue = { state: 'ready'; value: number } | { state: 'loading' | 'error' | 'unreported' };

/** Tone of an Overview status line. */
export type StatusTone = 'positive' | 'attention' | 'danger' | 'neutral';

/** An Overview status line: what it says and how it is coloured. */
export interface StatusReading { status: string; tone: StatusTone }
