import React, { useState } from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { getSetting } from '@/data/services/config';
import { ContentRepository } from '../data/ContentRepository';
import type { ShareChannel } from '../data/ContentRepository';
import type { PostTeaser } from '../data/NewsroomRepository';
import { SHARE_TARGETS, shareUrl, taggedUrl } from '../model/share';
import type { ShareTarget, UtmSettings } from '../model/share';
import { canShareNatively, sharePostNatively } from '../model/nativeShare';
import './newsroom.css';

/**
 * Share a post: copy link, the phone's share sheet (Web Share API / React Native
 * Share), LinkedIn, WhatsApp, X, Facebook, Telegram and email. Plain links that
 * open each service's own share page: no third-party script, pixel or SDK, and
 * nothing about the reader is sent. Each link carries the UTM tags from the
 * settings (utm_source is the network). A share is counted, as a number only.
 *
 * `full` (the post page) shows every button; `compact` (a card) is one Share
 * button that opens the same set below it.
 */
const TARGET: Readonly<Record<ShareTarget, { icon: SkIconName | null; label: MessageKey; name: MessageKey }>> = {
  linkedin: { icon: 'brand-linkedin', label: 'news.shareLinkedin', name: 'cms.share.name.linkedin' },
  whatsapp: { icon: 'message-circle-2', label: 'news.shareWhatsapp', name: 'cms.share.name.whatsapp' },
  x: { icon: 'x-2', label: 'news.shareX', name: 'cms.share.name.x' },
  // No Facebook or Telegram mark in the icon manifest: the button carries the network's name (never a look-alike icon).
  facebook: { icon: null, label: 'cms.share.facebook', name: 'cms.share.name.facebook' },
  telegram: { icon: null, label: 'cms.share.telegram', name: 'cms.share.name.telegram' },
  email: { icon: 'mail', label: 'cms.share.email', name: 'cms.share.name.email' },
};

export function utmSettings(): UtmSettings {
  return { enabled: getSetting('content.share_utm_enabled'), medium: getSetting('content.share_utm_medium'), campaign: getSetting('content.share_utm_campaign') };
}

function siteOrigin(): string {
  return typeof window !== 'undefined' ? window.location.origin : '';
}

export function countShare(post: Pick<PostTeaser, 'section' | 'slug' | 'sample'>, channel: ShareChannel, repo = new ContentRepository()): void {
  if (!getSetting('content.stats_enabled') || post.sample) return;
  repo.hit(post.section, post.slug, 'share', channel).catch(() => undefined);   // a count is never worth an error
}

export function ShareBar({ post, variant = 'full', onShared }: {
  post: Pick<PostTeaser, 'title' | 'summary' | 'path' | 'section' | 'slug' | 'series' | 'sample'>;
  variant?: 'full' | 'compact';
  /** Tests and previews: called instead of counting the share. */
  onShared?: (channel: ShareChannel) => void;
}): React.ReactElement {
  const t = useT();
  const [open, setOpen] = useState(variant === 'full');
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed' | 'shared'>('idle');
  const utm = utmSettings();
  const base = `${siteOrigin()}${post.path}`;
  const series = post.series?.slug ?? '';
  const url = (channel: ShareChannel) => taggedUrl(base, channel, utm, series);
  const shared = (channel: ShareChannel) => (onShared ? onShared(channel) : countShare(post, channel));
  const panelId = `sk-share-${post.section}-${post.slug}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url('copy'));
      setStatus('copied');
      shared('copy');
    } catch {
      setStatus('failed');
    }
  };
  const native = async () => {
    const outcome = await sharePostNatively({ title: post.title, text: post.summary, url: url('native') });
    if (outcome === 'shared') {
      setStatus('shared');
      shared('native');
    }
  };

  const buttons = (
    <div className="sk-news-share__row" id={panelId}>
      <button type="button" className="sk-news-share__btn" onClick={() => void copy()} data-testid="news-copy-link" aria-label={t('news.copyLink')}>
        <Icon name={status === 'copied' ? 'check' : 'copy'} size={18} />{variant === 'full' ? t('news.copyLink') : null}
      </button>
      {canShareNatively() ? (
        <button type="button" className="sk-news-share__btn" onClick={() => void native()} data-testid="news-share-native" aria-label={t('cms.share.native')}>
          <Icon name="share" size={18} />{variant === 'full' ? t('cms.share.nativeShort') : null}
        </button>
      ) : null}
      {SHARE_TARGETS.map((target) => {
        const spec = TARGET[target];
        return (
          <a key={target} className={`sk-news-share__btn${spec.icon ? '' : ' sk-news-share__btn--word'}`}
            href={shareUrl(target, url(target), post.title, post.summary)}
            target={target === 'email' ? undefined : '_blank'} rel="noopener noreferrer" aria-label={t(spec.label)}
            onClick={() => shared(target)} data-testid={`news-share-${target}`}>
            {spec.icon ? <Icon name={spec.icon} size={18} /> : <span aria-hidden="true">{t(spec.name)}</span>}
          </a>
        );
      })}
    </div>
  );

  const Wrapper = variant === 'full' ? 'section' : 'div';
  return (
    <Wrapper className={`sk-news-share sk-news-share--${variant}`} aria-label={variant === 'full' ? t('news.share') : t('cms.share.aria', { title: post.title })}
      role={variant === 'full' ? undefined : 'group'}>
      {variant === 'full' ? (
        <span className="sk-news-share__title"><Icon name="share" size={16} />{t('news.share')}</span>
      ) : (
        <button type="button" className="sk-news-share__toggle" aria-expanded={open} aria-controls={panelId}
          onClick={() => setOpen((v) => !v)} data-testid="news-share-toggle">
          <Icon name="share" size={16} />{t('news.share')}
        </button>
      )}
      {open ? buttons : null}
      <p className="sk-news-share__status" role="status">
        {status === 'copied' ? t('news.copied') : status === 'failed' ? t('news.copyFailed') : status === 'shared' ? t('cms.share.done') : ''}
      </p>
    </Wrapper>
  );
}
