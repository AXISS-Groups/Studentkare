import type { MessageKey } from '@/i18n';
import type { PostBlock, PostInput } from '../data/NewsroomRepository';

/**
 * The composer's help: a word count against the template's guide and the
 * accessibility checks the editor shows while writing. Guides, not gates: the
 * server's own rules (blocks, lengths, cover alt text) still decide.
 */

const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
/** Link labels that say nothing out of context (WCAG 2.4.4). A definition list, compared case-insensitively. */
export const VAGUE_LINK_LABELS: readonly string[] = ['click here', 'here', 'read more', 'more', 'link', 'this'];
const ALT_MIN = 3;

function blockText(block: PostBlock): string {
  switch (block.type) {
    case 'list':
    case 'facts':
      return block.items.join(' ');
    case 'mythfact':
      return `${block.myth} ${block.fact}`;
    case 'stat':
      return `${block.value} ${block.label}`;
    case 'image':
      return block.caption;
    case 'cta':
      return block.label;
    default:
      return block.text;
  }
}

export function wordCount(draft: Pick<PostInput, 'title' | 'summary' | 'body'>): number {
  const text = [draft.title, draft.summary, ...draft.body.map(blockText)].join(' ');
  return text.match(WORD)?.length ?? 0;
}

export interface A11yCheck { id: string; ok: boolean; label: MessageKey }

export function a11yChecks(draft: Pick<PostInput, 'coverAlt' | 'summary' | 'body'>): A11yCheck[] {
  const images = draft.body.filter((b): b is Extract<PostBlock, { type: 'image' }> => b.type === 'image');
  const headings = draft.body.filter((b): b is Extract<PostBlock, { type: 'heading' }> => b.type === 'heading');
  const ctas = draft.body.filter((b): b is Extract<PostBlock, { type: 'cta' }> => b.type === 'cta');
  const stacked = draft.body.some((b, i) => b.type === 'heading' && draft.body[i + 1]?.type === 'heading');
  const lastIsHeading = draft.body[draft.body.length - 1]?.type === 'heading';
  return [
    { id: 'cover-alt', ok: draft.coverAlt.trim().length >= ALT_MIN, label: 'cms.check.coverAlt' },
    { id: 'image-alt', ok: images.every((b) => b.alt.trim().length >= ALT_MIN), label: 'cms.check.imageAlt' },
    { id: 'headings', ok: headings.every((b) => b.text.trim().length > 0) && !stacked && !lastIsHeading, label: 'cms.check.headings' },
    { id: 'links', ok: ctas.every((b) => b.label.trim() !== '' && !VAGUE_LINK_LABELS.includes(b.label.trim().toLowerCase())), label: 'cms.check.links' },
    { id: 'summary', ok: draft.summary.trim().length > 0, label: 'cms.check.summary' },
  ];
}
