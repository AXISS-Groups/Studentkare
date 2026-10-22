import type { MessageKey } from '@/i18n';
import type { SkIcon3dName, SkIconName } from '@/design-system/icons';
import type { ServiceHue } from '@/design-system/m2';

/**
 * The five SK post templates (the "SK template styles"). Each is a fixed layout
 * and cover: the section it belongs to, the service-palette hue of its cover
 * gradient (deep to shade, white text AA across it), the kit's 3D art an author
 * may put on the cover, its icon, and the body blocks it allows. Authors pick a
 * template; they never pick fonts or colours — everything comes from tokens.
 *
 * The backend keeps the same table (backend/services/newsroom.py TEMPLATES and
 * content/newsroom/cover.json); backend/tests/test_newsroom.py compares the two.
 */
export type PostTemplate = 'HEALTH_TIP' | 'STORY' | 'CAMPUS_NEWS' | 'PRODUCT_UPDATE' | 'PRESS_RELEASE';
export type SectionPath = 'blog' | 'news';
export type BlockType = 'heading' | 'paragraph' | 'list' | 'quote' | 'callout' | 'image' | 'facts' | 'cta';

export interface TemplateSpec {
  section: SectionPath;
  hue: ServiceHue;
  /** The cover's art, from the kit's 3D tiles. */
  art: readonly SkIcon3dName[];
  icon: SkIconName;
  blocks: readonly BlockType[];
  /** A clinician must approve exactly what is published. */
  review: boolean;
  label: MessageKey;
  plural: MessageKey;
  about: MessageKey;
}

export const TEMPLATES: Readonly<Record<PostTemplate, TemplateSpec>> = {
  HEALTH_TIP: {
    section: 'blog', hue: 'green', icon: 'heart-pulse', review: true,
    art: ['heart--p1', 'wellness-alt--p5', 'brain-alt--p3', 'thermo-alt--p1'],
    blocks: ['heading', 'paragraph', 'list', 'callout', 'image', 'facts', 'cta'],
    label: 'news.tpl.HEALTH_TIP', plural: 'news.tplPlural.HEALTH_TIP', about: 'news.tplAbout.HEALTH_TIP',
  },
  STORY: {
    section: 'blog', hue: 'violet', icon: 'mic', review: false,
    art: ['user--p4', 'chat-alt--p4', 'home-alt--p4'],
    blocks: ['heading', 'paragraph', 'quote', 'image', 'callout', 'cta'],
    label: 'news.tpl.STORY', plural: 'news.tplPlural.STORY', about: 'news.tplAbout.STORY',
  },
  CAMPUS_NEWS: {
    section: 'news', hue: 'amber', icon: 'graduation-cap', review: false,
    art: ['calendar-alt--p4', 'home-alt--p4', 'idcard-alt--p4'],
    blocks: ['heading', 'paragraph', 'list', 'image', 'facts', 'quote', 'cta'],
    label: 'news.tpl.CAMPUS_NEWS', plural: 'news.tplPlural.CAMPUS_NEWS', about: 'news.tplAbout.CAMPUS_NEWS',
  },
  PRODUCT_UPDATE: {
    section: 'news', hue: 'indigo', icon: 'sparkles', review: false,
    art: ['bell--p2', 'settings-alt--p4', 'vault-alt--p4'],
    blocks: ['heading', 'paragraph', 'list', 'image', 'callout', 'cta'],
    label: 'news.tpl.PRODUCT_UPDATE', plural: 'news.tplPlural.PRODUCT_UPDATE', about: 'news.tplAbout.PRODUCT_UPDATE',
  },
  PRESS_RELEASE: {
    section: 'news', hue: 'blue', icon: 'megaphone', review: false,
    art: ['doc--p4', 'chat-alt--p4'],
    blocks: ['heading', 'paragraph', 'quote', 'list', 'facts', 'image'],
    label: 'news.tpl.PRESS_RELEASE', plural: 'news.tplPlural.PRESS_RELEASE', about: 'news.tplAbout.PRESS_RELEASE',
  },
};

export const TEMPLATE_ORDER: readonly PostTemplate[] = ['HEALTH_TIP', 'STORY', 'CAMPUS_NEWS', 'PRODUCT_UPDATE', 'PRESS_RELEASE'];

export function templatesIn(section: SectionPath): PostTemplate[] {
  return TEMPLATE_ORDER.filter((tpl) => TEMPLATES[tpl].section === section);
}

/** Where a post's button may lead: the app's own pages, never an outside link (the server checks the same list). */
export const CTA_ROUTES = [
  '/blog', '/consult', '/crisis', '/find-care', '/lab-tests', '/medicine-info', '/news', '/plans',
  '/preventive-care', '/records', '/shop', '/signup', '/support',
] as const;
export type CtaRoute = (typeof CTA_ROUTES)[number];

export const BLOCK_LABEL: Readonly<Record<BlockType, MessageKey>> = {
  heading: 'news.block.heading', paragraph: 'news.block.paragraph', list: 'news.block.list', quote: 'news.block.quote',
  callout: 'news.block.callout', image: 'news.block.image', facts: 'news.block.facts', cta: 'news.block.cta',
};

export const BLOCK_ICON: Readonly<Record<BlockType, SkIconName>> = {
  heading: 'align-left', paragraph: 'align-left-2', list: 'rows-split', quote: 'message-square-text',
  callout: 'info', image: 'camera', facts: 'clipboard', cta: 'arrow-up-right',
};
