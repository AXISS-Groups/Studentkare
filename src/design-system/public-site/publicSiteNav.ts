import type { MessageKey } from '@/i18n';
import type { PublicSettingKey } from '@/generated/settings';
import type { SkIconName } from '../icons';

/**
 * Where the public site's header and footer lead (design board Landing, canvas
 * page 3a). Every href is a route the app registers; the canvas links that had
 * no page behind them ("Careers", "Press") are left out rather than pointed at
 * an unrelated page.
 */

export type PublicNavId = 'discover' | 'wellness' | 'training' | 'labTests' | 'findDoctor' | 'findCare' | 'programmes' | 'plans';

export interface PublicLink {
  label: MessageKey;
  href: string;
}

export const PUBLIC_NAV: ReadonlyArray<PublicLink & { id: PublicNavId }> = [
  { id: 'discover', label: 'landing.home.nav.discover', href: '/' },
  { id: 'wellness', label: 'landing.home.nav.wellness', href: '/shop' },
  { id: 'training', label: 'landing.home.nav.training', href: '/wellness' },
  { id: 'labTests', label: 'landing.home.nav.labTests', href: '/lab-tests' },
  { id: 'findDoctor', label: 'landing.home.nav.findDoctor', href: '/consult' },
  { id: 'findCare', label: 'fc.nav.findCare', href: '/find-care' },
  { id: 'programmes', label: 'landing.home.nav.programmes', href: '/programs' },
  { id: 'plans', label: 'landing.home.nav.plans', href: '/plans' },
];

/** The shop has no category filter yet, so each category opens the shop itself. */
export const PUBLIC_CATEGORIES: readonly PublicLink[] = [
  { label: 'landing.home.cat.vitamins', href: '/shop' },
  { label: 'landing.home.cat.skin', href: '/shop' },
  { label: 'landing.home.cat.nutrition', href: '/shop' },
  { label: 'landing.home.cat.devices', href: '/shop' },
  { label: 'landing.home.cat.ayurveda', href: '/shop' },
  { label: 'landing.home.cat.firstAid', href: '/shop' },
  { label: 'landing.home.cat.medicines', href: '/shop' },
];
/** The last category carries an arrow on the canvas. */
export const PUBLIC_CATEGORY_MORE: PublicLink = { label: 'landing.site.cat.vaccines', href: '/shop' };

/** The partner-facing pages (campus, clinician, partnerships) have their own short nav. */
export type PublicAudienceId = 'students' | 'campuses' | 'clinicians' | 'partnerships';

export const PUBLIC_AUDIENCE_NAV: ReadonlyArray<PublicLink & { id: PublicAudienceId }> = [
  { id: 'students', label: 'landing.campus.nav.forStudents', href: '/' },
  { id: 'campuses', label: 'landing.campus.nav.forCampuses', href: '/campuses' },
  { id: 'clinicians', label: 'landing.campus.nav.forClinicians', href: '/clinicians' },
  { id: 'partnerships', label: 'landing.campus.nav.partnerships', href: '/partnerships' },
];

export const PUBLIC_ROUTES = {
  home: '/',
  plans: '/plans',
  signIn: '/login',
  cart: '/checkout',
  shop: '/shop',
  prescriptions: '/prescriptions',
  crisis: '/crisis',
} as const;

export interface FooterColumn {
  heading: MessageKey;
  aria: MessageKey;
  links: readonly PublicLink[];
}

export const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    heading: 'landing.site.footer.col.studentkare',
    aria: 'landing.site.footer.col.studentkareAria',
    links: [
      { label: 'landing.site.footer.about', href: '/campuses' },
      { label: 'landing.site.footer.money', href: '/plans' },
      { label: 'landing.site.footer.contact', href: '/support' },
    ],
  },
  {
    heading: 'landing.site.footer.col.students',
    aria: 'landing.site.footer.col.studentsAria',
    links: [
      { label: 'landing.site.footer.labTest', href: '/lab-tests' },
      { label: 'landing.site.footer.consult', href: '/consult' },
      { label: 'fc.nav.findCare', href: '/find-care' },
      { label: 'landing.site.footer.programmes', href: '/programs' },
      { label: 'landing.site.footer.plans', href: '/plans' },
      { label: 'landing.site.footer.vault', href: '/records' },
    ],
  },
  {
    heading: 'landing.site.footer.col.partners',
    aria: 'landing.site.footer.col.partnersAria',
    links: [
      { label: 'landing.site.footer.campus', href: '/campuses' },
      { label: 'landing.site.footer.clinician', href: '/clinicians' },
      { label: 'landing.site.footer.listPartner', href: '/partnerships' },
      { label: 'landing.site.footer.partnerships', href: '/partnerships' },
    ],
  },
  {
    heading: 'landing.site.footer.col.policies',
    aria: 'landing.site.footer.col.policiesAria',
    links: [
      { label: 'landing.site.footer.privacy', href: '/privacy' },
      { label: 'landing.site.footer.terms', href: '/terms' },
      // The plans page states the commerce firewall; the legal page carries grievance.
      { label: 'landing.site.footer.firewall', href: '/plans' },
      { label: 'landing.site.footer.grievance', href: '/privacy' },
      { label: 'landing.site.footer.export', href: '/records' },
    ],
  },
];

/** The registry's public-site links (all text settings; empty means not published). */
export type PublicSiteLinkSetting = Extract<PublicSettingKey, `public_site.${string}`>;

/** Social accounts: shown only when the settings registry holds a published https URL. */
export const FOOTER_SOCIAL: ReadonlyArray<{ setting: PublicSiteLinkSetting; icon: SkIconName; label: MessageKey }> = [
  { setting: 'public_site.instagram_url', icon: 'brand-instagram', label: 'landing.site.footer.instagram' },
  { setting: 'public_site.linkedin_url', icon: 'brand-linkedin', label: 'landing.site.footer.linkedin' },
  { setting: 'public_site.x_url', icon: 'x-2', label: 'landing.site.footer.x' },
  { setting: 'public_site.youtube_url', icon: 'brand-youtube', label: 'landing.site.footer.youtube' },
];

/** Store badges: shown only when a listing is published (settings registry). */
export const FOOTER_STORES: ReadonlyArray<{ setting: PublicSiteLinkSetting; icon: SkIconName; top: MessageKey; name: MessageKey }> = [
  { setting: 'public_site.app_store_url', icon: 'brand-apple', top: 'landing.site.footer.appStoreTop', name: 'landing.site.footer.appStore' },
  { setting: 'public_site.play_store_url', icon: 'brand-google-play', top: 'landing.site.footer.playTop', name: 'landing.site.footer.play' },
];

/** A configured link is used only when it is an https URL; anything else counts as not published. */
export function publishedUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith('https://')) return null;
  try {
    return new URL(trimmed).protocol === 'https:' ? trimmed : null;
  } catch {
    return null;
  }
}
