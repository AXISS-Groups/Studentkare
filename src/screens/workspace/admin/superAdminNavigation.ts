import type { SkIconName } from '../../../design-system/icons';
import type { MessageKey } from '@/i18n';
import type { RoutePath } from '../../../lib/utils/workflowRouting';

/**
 * The Super Admin sidebar, in the order of the approved SuperAdminConsole design.
 *
 * Every designed entry opens a screen. Screens with no data source show the design's
 * layout with an empty state; Tier 1 screens are read-only empty layouts (see
 * SuperAdminScreens.tsx). Older admin pages live on as tabs of the screen they belong to. An entry without a `route` would render greyed out and
 * never navigate. Labels are only matched to a route when the screen behind it
 * does what the label says.
 */
/**
 * `label`/`title` are the English names (stable for keys and tests); `labelKey`/`titleKey`
 * are what the sidebar shows, in the chosen language. `icon` is the manifest name
 * from design/screens/briefs/SuperAdminConsole.md. `activeFor`: tab routes inside
 * this screen, which highlight this entry too.
 */
export interface SuperAdminNavItem { label: string; labelKey: MessageKey; icon: SkIconName; route?: RoutePath; activeFor?: RoutePath[] }
export interface SuperAdminNavGroup { title: string; titleKey: MessageKey; items: SuperAdminNavItem[] }

export const SUPER_ADMIN_NAVIGATION: SuperAdminNavGroup[] = [
  {
    title: 'Platform',
    titleKey: 'admin.eyebrow.platform',
    items: [
      { label: 'Overview', labelKey: 'console.admin.nav.overview', icon: 'users-small', route: 'admin' },
      { label: 'Operations & SOS', labelKey: 'console.admin.nav.ops', icon: 'alert-triangle-3', route: 'admin/ops', activeFor: ['admin/activity', 'admin/support', 'admin/requests'] },
      { label: 'Surveillance map', labelKey: 'console.admin.nav.surveillance', icon: 'map', route: 'admin/surveillance' },
      { label: 'Feature flags', labelKey: 'console.admin.nav.flags', icon: 'settings-2', route: 'admin/flags' },
      { label: 'Accounts', labelKey: 'console.admin.nav.accounts', icon: 'users-2', route: 'admin/accounts' },
      // Not on the design canvas: the shared team accounts (founder decision 2026-10-22).
      { label: 'Team accounts', labelKey: 'team.screen.title', icon: 'key', route: 'admin/team-accounts' },
    ],
  },
  {
    title: 'Tenants',
    titleKey: 'admin.eyebrow.tenants',
    items: [
      { label: 'Organisations', labelKey: 'console.admin.nav.organisations', icon: 'box', route: 'admin/organisations', activeFor: ['admin/billing'] },
      { label: 'Integrations', labelKey: 'console.admin.nav.integrations', icon: 'plug', route: 'admin/integrations', activeFor: ['admin/telemetry', 'admin/api-keys'] },
      { label: 'Code sentinel', labelKey: 'console.admin.nav.sentinel', icon: 'shield-2', route: 'admin/sentinel' },
      { label: 'Token sync', labelKey: 'console.admin.nav.tokens', icon: 'settings-2', route: 'admin/tokens' },
    ],
  },
  {
    title: 'Gatekeeping',
    titleKey: 'admin.eyebrow.gatekeeping',
    items: [
      { label: 'Clinician verification', labelKey: 'console.admin.nav.verification', icon: 'shield', route: 'admin/verification' },
      { label: 'Partner applications', labelKey: 'console.admin.nav.partners', icon: 'hand-pointer', route: 'admin/partners', activeFor: ['admin/preventive'] },
      { label: 'Catalogue ops', labelKey: 'console.admin.nav.catalog', icon: 'box', route: 'admin/catalog' },
      // Not on the design canvas: the Find care directory's curated listings and partner verification.
      { label: 'Care directory', labelKey: 'console.admin.nav.careDirectory', icon: 'hospital', route: 'admin/care-directory' },
      // Not on the design canvas: reviewed medicine information (pharmacists approve; super admins edit and import).
      { label: 'Medicine info', labelKey: 'console.admin.nav.medicineInfo', icon: 'pill', route: 'admin/medicine-info' },
      // Not on the design canvas: added for held lab reports with no reviewer.
      { label: 'Lab report reviewers', labelKey: 'console.admin.nav.labReviews', icon: 'flask', route: 'admin/lab-reviews' },
    ],
  },
  {
    title: 'Commerce',
    titleKey: 'admin.eyebrow.commerce',
    items: [
      { label: 'Plans & pricing', labelKey: 'console.admin.nav.plans', icon: 'banknote', route: 'admin/plans', activeFor: ['admin/price-fix'] },
      { label: 'Billing ledger', labelKey: 'console.admin.nav.ledger', icon: 'bar-chart', route: 'admin/ledger' },
    ],
  },
  {
    title: 'Content & AI',
    titleKey: 'admin.eyebrow.contentAi',
    items: [
      { label: 'Message templates', labelKey: 'console.admin.nav.templates', icon: 'message-circle', route: 'admin/templates' },
      // Not on the design canvas: added for the notification outbox.
      { label: 'Message outbox', labelKey: 'console.admin.nav.outbox', icon: 'inbox', route: 'admin/outbox' },
      // Not on the design canvas: push announcements to a campus (non-health text, counts only).
      { label: 'Announcements', labelKey: 'push.adm.title', icon: 'megaphone', route: 'admin/announcements' },
      { label: 'Knowledge base', labelKey: 'console.admin.nav.knowledge', icon: 'file', route: 'admin/knowledge' },
      // Not on the design canvas: Content (News, Blog, series, categories, autopilot, share kit) in the SK templates; health posts need a clinician.
      { label: 'Content', labelKey: 'news.adm.title', icon: 'megaphone', route: 'admin/posts' },
      { label: 'Intake & OCR', labelKey: 'console.admin.nav.intake', icon: 'clipboard', route: 'admin/intake' },
    ],
  },
  {
    title: 'Governance',
    titleKey: 'admin.eyebrow.governance',
    items: [
      { label: 'Rule L firewall', labelKey: 'console.admin.nav.ruleL', icon: 'rows-split', route: 'admin/rule-l' },
      { label: 'Consent policy', labelKey: 'console.admin.nav.consentPolicy', icon: 'book', route: 'admin/consent-policy' },
      // Not on the design canvas: the privacy notice, terms and grievance officer, versioned (audit H2).
      { label: 'Legal documents', labelKey: 'console.admin.nav.legalDocuments', icon: 'file-text', route: 'admin/legal-documents' },
      { label: 'Break-glass log', labelKey: 'console.admin.nav.breakGlassLog', icon: 'heart-plus', route: 'admin/break-glass-log' },
      { label: 'Check-in audit', labelKey: 'console.admin.nav.checkins', icon: 'heart-plus', route: 'admin/checkins', activeFor: ['admin/case'] },
      { label: 'Casualty handover', labelKey: 'console.admin.nav.handover', icon: 'arrows-left-right', route: 'admin/handover' },
      { label: 'Audit explorer', labelKey: 'console.admin.nav.audit', icon: 'book', route: 'admin/audit' },
      { label: 'AI governance', labelKey: 'console.admin.nav.aiGovernance', icon: 'cpu', route: 'admin/ai-governance' },
      { label: 'Erasure queue', labelKey: 'console.admin.nav.erasure', icon: 'shield-2', route: 'admin/erasure' },
    ],
  },
];
