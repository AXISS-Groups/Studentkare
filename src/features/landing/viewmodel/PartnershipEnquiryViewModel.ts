import { makeAutoObservable, runInAction } from 'mobx';

export const PARTNER_CATEGORIES = ['Laboratory', 'Pharmacy', 'Clinic', 'Campus', 'Insurer', 'Other'] as const;
export type PartnerCategory = (typeof PARTNER_CATEGORIES)[number];

/** The body POST /billing/inquiries accepts (backend/services/billing.py, InquiryInput). */
export interface EnquiryBody {
  organization: string;
  contactName: string;
  email: string;
  seats: 0;
  planId: 'ENTERPRISE';
  message: string;
  consent: true;
}

export type SubmitEnquiry = (body: EnquiryBody) => Promise<void>;

export type EnquiryStatus = 'editing' | 'sending' | 'sent';

/**
 * The partnership application, shared by native and web. Sending is injected
 * at the platform boundary.
 *
 * Consent is never pre-ticked, and nothing is sent without it: the body type
 * only admits `consent: true`, and submit() refuses before calling out. The
 * backend refuses too; this is the first of two gates, not the only one.
 */
export class PartnershipEnquiryViewModel {
  organization = '';
  contactName = '';
  email = '';
  category: PartnerCategory = PARTNER_CATEGORIES[0];
  message = '';
  consent = false;
  status: EnquiryStatus = 'editing';
  error = '';

  constructor(private readonly send: SubmitEnquiry) {
    makeAutoObservable<this, 'send'>(this, { send: false }, { autoBind: true });
  }

  setOrganization(value: string) { this.organization = value; }
  setContactName(value: string) { this.contactName = value; }
  setEmail(value: string) { this.email = value; }
  setCategory(value: PartnerCategory) { this.category = value; }
  setMessage(value: string) { this.message = value; }
  toggleConsent() { this.consent = !this.consent; }

  /** Mirrors the server's rules, so a student-facing error is caught before the network. */
  get problem(): string {
    if (this.organization.trim().length < 2) return 'Enter your organisation’s name.';
    const email = this.email.trim();
    if (email.length < 5 || !email.includes('@')) return 'Enter an email address we can reply to.';
    if (!this.consent) return 'Tick the box to let us contact you about this enquiry.';
    return '';
  }

  get canSubmit(): boolean {
    return this.status === 'editing' && this.problem === '';
  }

  async submit() {
    if (this.status !== 'editing') return;
    if (this.problem || !this.consent) {
      this.error = this.problem;
      return;
    }
    this.status = 'sending';
    this.error = '';
    try {
      await this.send({
        organization: this.organization.trim().slice(0, 160),
        contactName: this.contactName.trim().slice(0, 120),
        email: this.email.trim().slice(0, 254),
        // Seats belong to a campus seat licence, not a partner listing.
        seats: 0,
        planId: 'ENTERPRISE',
        message: `Partnership enquiry · ${this.category}\n\n${this.message.trim()}`.slice(0, 4000),
        consent: true,
      });
      runInAction(() => { this.status = 'sent'; });
    } catch (reason) {
      runInAction(() => {
        this.status = 'editing';
        this.error = reason instanceof Error ? reason.message : 'Your enquiry was not sent. Try again.';
      });
    }
  }
}
