import React from 'react';
import { useT } from '@/i18n';
import { Icon } from '@/design-system/icons';
import { mediaUrl } from '../data/NewsroomRepository';
import type { PostBlock } from '../data/NewsroomRepository';
import { TEMPLATES } from '../model/templates';
import type { PostTemplate } from '../model/templates';
import './newsroom.css';

/**
 * A post's body, in its template's layout. Text is drawn as text (never HTML),
 * a button opens one of the app's own pages, and an image always carries the
 * author's alt text. A block the template does not allow is not drawn (the
 * server refuses it too). A callout is information or amber "needs attention":
 * red stays for safety and clinical alerts (DESIGN.md §3).
 */
export function PostBody({ template, blocks, onOpen }: { template: PostTemplate; blocks: readonly PostBlock[]; onOpen?: (route: string) => void }): React.ReactElement {
  const t = useT();
  const allowed = TEMPLATES[template].blocks;
  return (
    <div className="sk-news-body" data-template={template}>
      {blocks.filter((b) => allowed.includes(b.type)).map((block, index) => {
        const key = `${block.type}-${index}`;
        switch (block.type) {
          case 'heading':
            return <h2 key={key} className="sk-news-body__heading">{block.text}</h2>;
          case 'paragraph':
            return <p key={key} className="sk-news-body__para">{block.text}</p>;
          case 'list': {
            const items = block.items.map((item, i) => <li key={`${key}-${i}`}>{item}</li>);
            return block.ordered ? <ol key={key} className="sk-news-body__list">{items}</ol> : <ul key={key} className="sk-news-body__list">{items}</ul>;
          }
          case 'quote':
            return (
              <figure key={key} className="sk-news-body__quote">
                <Icon name="message-square-text" size={22} className="sk-news-body__quote-mark" />
                <blockquote>{block.text}</blockquote>
                {block.cite ? <figcaption>{block.cite}</figcaption> : null}
              </figure>
            );
          case 'callout':
            return (
              <aside key={key} className="sk-news-body__callout" data-tone={block.tone} aria-label={t(block.tone === 'attention' ? 'news.callout.attention' : 'news.callout.info')}>
                <Icon name={block.tone === 'attention' ? 'alert-triangle' : 'info'} size={20} />
                <p>{block.text}</p>
              </aside>
            );
          case 'image':
            return (
              <figure key={key} className="sk-news-body__figure">
                {block.src ? <img src={mediaUrl(block.src)} alt={block.alt} loading="lazy" decoding="async" /> : <span className="sk-news-body__missing"><Icon name="image-off" size={24} label={block.alt} /></span>}
                {block.caption ? <figcaption>{block.caption}</figcaption> : null}
              </figure>
            );
          case 'facts':
            return (
              <section key={key} className="sk-news-body__facts" aria-label={block.title || t('news.factsDefault')}>
                <p className="sk-news-body__facts-title"><Icon name="clipboard" size={18} />{block.title || t('news.factsDefault')}</p>
                <ul>{block.items.map((item, i) => <li key={`${key}-${i}`}><Icon name="check" size={16} />{item}</li>)}</ul>
              </section>
            );
          case 'cta':
            return (
              <p key={key} className="sk-news-body__cta-row">
                <a className="sk-news-body__cta" href={block.route} onClick={onOpen ? (e) => { e.preventDefault(); onOpen(block.route); } : undefined}>
                  {block.label}
                  <Icon name="arrow-right" size={18} />
                </a>
              </p>
            );
          case 'mythfact':
            return (
              <section key={key} className="sk-news-body__mythfact" aria-label={t('cms.block.mythfactAria')}>
                <p className="sk-news-body__myth"><Icon name="x-square" size={20} /><span><strong>{t('cms.block.myth')}</strong> {block.myth}</span></p>
                <p className="sk-news-body__fact"><Icon name="check-circle" size={20} /><span><strong>{t('cms.block.fact')}</strong> {block.fact}</span></p>
              </section>
            );
          case 'stat':
            return (
              <p key={key} className="sk-news-body__stat">
                <span className="sk-news-body__stat-value">{block.value}</span>
                <span className="sk-news-body__stat-label">{block.label}</span>
              </p>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
