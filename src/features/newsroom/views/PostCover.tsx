import React from 'react';
import { useT } from '@/i18n';
import { AnimatedIcon, BrandLogo, Icon, Icon3d } from '@/design-system/icons';
import type { ServiceHue } from '@/design-system/m2';
import type { SkIcon3dName } from '@/design-system/icons';
import { TEMPLATES } from '../model/templates';
import type { PostTemplate } from '../model/templates';
import './newsroom.css';

export interface PostCoverProps {
  template: PostTemplate;
  /** The kit art the author chose from the template's set (decorative). */
  art: string | null;
  /** What the cover shows, for screen readers (the author's cover alt text). */
  alt: string;
  /** `hero`: the post page's banner, with the title inside. `card`: list and related cards. `mini`: small thumbnails. */
  size: 'hero' | 'card' | 'mini';
  /** The post's own heading: drawn inside the hero cover (as the page's h1). */
  children?: React.ReactNode;
  /** A series' own cover style, in place of the template's hue. */
  hue?: ServiceHue | null;
}

function isArt(template: PostTemplate, art: string | null): art is SkIcon3dName {
  return art !== null && (TEMPLATES[template].art as readonly string[]).includes(art);
}

/**
 * An SK template's cover: the template's service-palette gradient (deep to shade,
 * so white text is AA across all of it), two soft rings, the SK shield, the
 * template's label and, if the author chose one, the kit's 3D art. Colours,
 * type and radius are tokens only (newsroom.css); nothing here is the author's.
 * The share image (backend services/newsroom_cover.py) draws the same cover.
 */
export function PostCover({ template, art, alt, size, children, hue }: PostCoverProps): React.ReactElement {
  const t = useT();
  const spec = TEMPLATES[template];
  const tone = hue ?? spec.hue;
  return (
    <div className={`sk-news-cover sk-news-cover--${size}`} data-hue={tone} data-template={template}>
      <span className="sk-news-cover__ring" aria-hidden="true" />
      <span className="sk-news-cover__ring sk-news-cover__ring--small" aria-hidden="true" />
      {size !== 'hero' ? <span className="sk-news-cover__alt" role="img" aria-label={alt} /> : null}
      <div className="sk-news-cover__top">
        <span className="sk-news-cover__shield"><BrandLogo size={size === 'mini' ? 16 : 22} label="" /></span>
        <span className="sk-news-cover__label">
          <Icon name={spec.icon} size={size === 'mini' ? 12 : 15} strokeWidth={2.2} />
          {t(spec.label)}
        </span>
      </div>
      {size === 'hero' && spec.anim ? (
        <span className="sk-news-cover__anim" aria-hidden="true">
          <AnimatedIcon name={spec.anim} variant="3d" hue={tone} size="tile" />
        </span>
      ) : null}
      {isArt(template, art) ? (
        <span className="sk-news-cover__art" aria-hidden="true">
          <Icon3d name={art} size={size === 'hero' ? 120 : size === 'card' ? 84 : 40} />
        </span>
      ) : null}
      {children ? <div className="sk-news-cover__body">{children}</div> : null}
      {size === 'hero' ? <span className="sk-news-cover__alt" role="img" aria-label={alt} /> : null}
    </div>
  );
}
