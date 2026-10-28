import type { MessageKey } from '@/i18n';
import type { SkAnimatedName, SkIcon3dName, SkIconName } from '@/design-system/icons';
import type { ServiceHue } from '@/design-system/m2';

/**
 * The twelve SK post templates (the "SK template styles"). Each is a fixed layout
 * and cover: the section it belongs to, the service-palette hue of its cover
 * gradient (deep to shade, white text AA across it), the kit's 3D art an author
 * may put on the cover, its icon, and the body blocks it allows. Authors pick a
 * template; they never pick fonts or colours — everything comes from tokens.
 *
 * The backend keeps the same table (backend/services/newsroom.py TEMPLATES and
 * content/newsroom/cover.json); backend/tests/test_newsroom.py compares the two.
 */
export type PostTemplate = 'HEALTH_TIP' | 'STORY' | 'CAMPUS_NEWS' | 'PRODUCT_UPDATE' | 'PRESS_RELEASE' | 'MOTIVATION' | 'SERIES_EPISODE'
  | 'EVENT' | 'CAMPUS_SPOTLIGHT' | 'EXPLAINER' | 'MYTH_FACT' | 'QUICK_CARD';
export type SectionPath = 'blog' | 'news';
export type BlockType = 'heading' | 'paragraph' | 'list' | 'quote' | 'callout' | 'image' | 'facts' | 'cta' | 'mythfact' | 'stat';

export interface TemplateSpec {
  section: SectionPath;
  hue: ServiceHue;
  /** The cover's art, from the kit's 3D tiles. */
  art: readonly SkIcon3dName[];
  icon: SkIconName;
  blocks: readonly BlockType[];
  /** A clinician must approve exactly what is published. */
  review: boolean;
  /** May carry health advice: needs a clinician when its category is clinical (the server decides). */
  advice: boolean;
  /** The composer's length guide: fewest and most words. A guide, not a rule. */
  words: readonly [number, number];
  /** An animated icon on the hero cover (decorative; still under reduced motion), where one fits. */
  anim?: SkAnimatedName;
  label: MessageKey;
  plural: MessageKey;
  about: MessageKey;
}

export const TEMPLATES: Readonly<Record<PostTemplate, TemplateSpec>> = {
  HEALTH_TIP: {
    section: 'blog', hue: 'green', icon: 'heart-pulse', review: true,
    advice: true, words: [150, 900],
    art: ['heart--p1', 'wellness-alt--p5', 'brain-alt--p3', 'thermo-alt--p1'],
    blocks: ['heading', 'paragraph', 'list', 'callout', 'image', 'facts', 'cta'],
    label: 'news.tpl.HEALTH_TIP', plural: 'news.tplPlural.HEALTH_TIP', about: 'news.tplAbout.HEALTH_TIP',
  },
  STORY: {
    section: 'blog', hue: 'violet', icon: 'mic', review: false,
    advice: false, words: [200, 1500],
    art: ['user--p4', 'chat-alt--p4', 'home-alt--p4'],
    blocks: ['heading', 'paragraph', 'quote', 'image', 'callout', 'cta'],
    label: 'news.tpl.STORY', plural: 'news.tplPlural.STORY', about: 'news.tplAbout.STORY',
  },
  CAMPUS_NEWS: {
    section: 'news', hue: 'amber', icon: 'graduation-cap', review: false,
    advice: false, words: [80, 800],
    art: ['calendar-alt--p4', 'home-alt--p4', 'idcard-alt--p4'],
    blocks: ['heading', 'paragraph', 'list', 'image', 'facts', 'quote', 'cta'],
    label: 'news.tpl.CAMPUS_NEWS', plural: 'news.tplPlural.CAMPUS_NEWS', about: 'news.tplAbout.CAMPUS_NEWS',
  },
  PRODUCT_UPDATE: {
    section: 'news', hue: 'indigo', icon: 'sparkles', review: false,
    advice: false, words: [60, 600],
    art: ['bell--p2', 'settings-alt--p4', 'vault-alt--p4'],
    blocks: ['heading', 'paragraph', 'list', 'image', 'callout', 'cta'],
    label: 'news.tpl.PRODUCT_UPDATE', plural: 'news.tplPlural.PRODUCT_UPDATE', about: 'news.tplAbout.PRODUCT_UPDATE',
  },
  PRESS_RELEASE: {
    section: 'news', hue: 'blue', icon: 'megaphone', review: false,
    advice: false, words: [150, 1000],
    art: ['doc--p4', 'chat-alt--p4'],
    blocks: ['heading', 'paragraph', 'quote', 'list', 'facts', 'image'],
    label: 'news.tpl.PRESS_RELEASE', plural: 'news.tplPlural.PRESS_RELEASE', about: 'news.tplAbout.PRESS_RELEASE',
  },
  MOTIVATION: {
    section: 'blog', hue: 'orange', icon: 'sun', review: false,
    advice: false, words: [10, 200],
    art: ['wellness-alt--p5', 'chat-alt--p4', 'user--p4'],
    blocks: ['quote', 'paragraph', 'callout', 'cta'],
    label: 'news.tpl.MOTIVATION', plural: 'news.tplPlural.MOTIVATION', about: 'news.tplAbout.MOTIVATION',
  },
  SERIES_EPISODE: {
    section: 'blog', hue: 'teal', icon: 'repeat', review: false,
    advice: true, words: [120, 700],
    art: ['brain-alt--p3', 'wellness-alt--p5', 'heart--p1', 'thermo-alt--p1', 'calendar-alt--p4'],
    blocks: ['heading', 'paragraph', 'list', 'callout', 'facts', 'quote', 'cta'],
    label: 'news.tpl.SERIES_EPISODE', plural: 'news.tplPlural.SERIES_EPISODE', about: 'news.tplAbout.SERIES_EPISODE',
  },
  EVENT: {
    section: 'news', hue: 'rose', icon: 'calendar', review: false, anim: 'anim-calendar',
    advice: false, words: [60, 500],
    art: ['calendar-alt--p4', 'home-alt--p4', 'bell--p2'],
    blocks: ['heading', 'paragraph', 'facts', 'list', 'image', 'callout', 'cta'],
    label: 'news.tpl.EVENT', plural: 'news.tplPlural.EVENT', about: 'news.tplAbout.EVENT',
  },
  CAMPUS_SPOTLIGHT: {
    section: 'news', hue: 'sky', icon: 'star', review: false,
    advice: false, words: [150, 900],
    art: ['home-alt--p4', 'idcard-alt--p4', 'user--p4'],
    blocks: ['heading', 'paragraph', 'quote', 'image', 'facts', 'cta'],
    label: 'news.tpl.CAMPUS_SPOTLIGHT', plural: 'news.tplPlural.CAMPUS_SPOTLIGHT', about: 'news.tplAbout.CAMPUS_SPOTLIGHT',
  },
  EXPLAINER: {
    section: 'blog', hue: 'blue', icon: 'book', review: false, anim: 'anim-book-open',
    advice: true, words: [250, 1200],
    art: ['search--p4', 'doc--p4', 'lab-alt--p5'],
    blocks: ['heading', 'paragraph', 'list', 'facts', 'callout', 'image', 'cta'],
    label: 'news.tpl.EXPLAINER', plural: 'news.tplPlural.EXPLAINER', about: 'news.tplAbout.EXPLAINER',
  },
  MYTH_FACT: {
    section: 'blog', hue: 'violet', icon: 'question-mark', review: false, anim: 'anim-message',
    advice: true, words: [80, 700],
    art: ['chat-alt--p4', 'shield--p5', 'search--p4'],
    blocks: ['heading', 'paragraph', 'mythfact', 'callout', 'cta'],
    label: 'news.tpl.MYTH_FACT', plural: 'news.tplPlural.MYTH_FACT', about: 'news.tplAbout.MYTH_FACT',
  },
  QUICK_CARD: {
    section: 'blog', hue: 'indigo', icon: 'grid', review: false,
    advice: true, words: [20, 250],
    art: ['chart-alt--p4', 'lab-alt--p5', 'bell--p2'],
    blocks: ['heading', 'stat', 'facts', 'paragraph', 'callout', 'cta'],
    label: 'news.tpl.QUICK_CARD', plural: 'news.tplPlural.QUICK_CARD', about: 'news.tplAbout.QUICK_CARD',
  },
};

export const TEMPLATE_ORDER: readonly PostTemplate[] = [
  'HEALTH_TIP', 'SERIES_EPISODE', 'EXPLAINER', 'MYTH_FACT', 'QUICK_CARD', 'MOTIVATION', 'STORY',
  'CAMPUS_NEWS', 'EVENT', 'CAMPUS_SPOTLIGHT', 'PRODUCT_UPDATE', 'PRESS_RELEASE',
];

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
  mythfact: 'news.block.mythfact', stat: 'news.block.stat',
};

export const BLOCK_ICON: Readonly<Record<BlockType, SkIconName>> = {
  heading: 'align-left', paragraph: 'align-left-2', list: 'rows-split', quote: 'message-square-text',
  callout: 'info', image: 'camera', facts: 'clipboard', cta: 'arrow-up-right',
  mythfact: 'help-circle', stat: 'bar-chart',
};

/** Every service-palette hue a category or a series cover may take (the server keeps the same list). */
export const HUES: readonly ServiceHue[] = ['indigo', 'violet', 'blue', 'sky', 'teal', 'green', 'amber', 'orange', 'rose'];
