import type { LucideIcon } from 'lucide-react';
import { ArrowLeftRight, BadgeCheck, BookOpen, Bot, Building2, Code2, CreditCard, Flag, Handshake, LayoutDashboard, Map, MessageSquare, Package, Plug, QrCode, Receipt, RefreshCw, ScanText, ScrollText, Search, ShieldAlert, ShieldBan, Siren, Trash2, Users } from 'lucide-react';
import type { RoutePath } from '../../../lib/workflowRouting';

/**
 * The Super Admin sidebar, in the order of the approved SuperAdminConsole design.
 *
 * Every designed entry opens a screen. Screens with no data source show the design's
 * layout with an empty state; Tier 1 screens are read-only empty layouts (see
 * SuperAdminScreens.tsx). Older admin pages live on as tabs of the screen they belong to. An entry without a `route` would render greyed out and
 * never navigate. Labels are only matched to a route when the screen behind it
 * does what the label says.
 */
/** `activeFor`: tab routes inside this screen, which highlight this entry too. */
export interface SuperAdminNavItem { label: string; icon: LucideIcon; route?: RoutePath; activeFor?: RoutePath[] }
export interface SuperAdminNavGroup { title: string; items: SuperAdminNavItem[] }

export const SUPER_ADMIN_NAVIGATION: SuperAdminNavGroup[] = [
  {
    title: 'Platform',
    items: [
      { label: 'Overview', icon: LayoutDashboard, route: 'admin' },
      { label: 'Operations & SOS', icon: Siren, route: 'admin/ops', activeFor: ['admin/activity', 'admin/support', 'admin/requests'] },
      { label: 'Surveillance map', icon: Map, route: 'admin/surveillance' },
      { label: 'Feature flags', icon: Flag, route: 'admin/flags' },
      { label: 'Accounts', icon: Users, route: 'admin/accounts' },
    ],
  },
  {
    title: 'Tenants',
    items: [
      { label: 'Organisations', icon: Building2, route: 'admin/organisations', activeFor: ['admin/billing'] },
      { label: 'Integrations', icon: Plug, route: 'admin/integrations', activeFor: ['admin/telemetry', 'admin/api-keys'] },
      { label: 'Code sentinel', icon: Code2, route: 'admin/sentinel' },
      { label: 'Token sync', icon: RefreshCw, route: 'admin/tokens' },
    ],
  },
  {
    title: 'Gatekeeping',
    items: [
      { label: 'Clinician verification', icon: BadgeCheck, route: 'admin/verification' },
      { label: 'Partner applications', icon: Handshake, route: 'admin/partners', activeFor: ['admin/preventive'] },
      { label: 'Catalogue ops', icon: Package, route: 'admin/catalog' },
    ],
  },
  {
    title: 'Commerce',
    items: [
      { label: 'Plans & pricing', icon: CreditCard, route: 'admin/plans', activeFor: ['admin/price-fix'] },
      { label: 'Billing ledger', icon: Receipt, route: 'admin/ledger' },
    ],
  },
  {
    title: 'Content & AI',
    items: [
      { label: 'Message templates', icon: MessageSquare, route: 'admin/templates' },
      { label: 'Knowledge base', icon: BookOpen, route: 'admin/knowledge' },
      { label: 'Intake & OCR', icon: ScanText, route: 'admin/intake' },
    ],
  },
  {
    title: 'Governance',
    items: [
      { label: 'Rule L firewall', icon: ShieldBan, route: 'admin/rule-l' },
      { label: 'Consent policy', icon: ScrollText, route: 'admin/consent-policy' },
      { label: 'Break-glass log', icon: ShieldAlert, route: 'admin/break-glass-log' },
      { label: 'Check-in audit', icon: QrCode, route: 'admin/checkins', activeFor: ['admin/case'] },
      { label: 'Casualty handover', icon: ArrowLeftRight, route: 'admin/handover' },
      { label: 'Audit explorer', icon: Search, route: 'admin/audit' },
      { label: 'AI governance', icon: Bot, route: 'admin/ai-governance' },
      { label: 'Erasure queue', icon: Trash2, route: 'admin/erasure' },
    ],
  },
];
