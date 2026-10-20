import React, { useId, useState } from 'react';
import { ConsolePageHeader } from '@/design-system/console/ConsoleTablePage';
import { BrandLogo } from '@/design-system/icons';
import { SkButton } from '@/design-system/primitives';
import { useAuth } from '@/data/contexts/AuthContext';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { NotConnected, Unavailable } from './boardKit';
import './campus-boards.css';

/** The board's starting points; each fills the title and message (canvas copy). */
const TEMPLATES: ReadonlyArray<{ id: string; label: MessageKey; title: MessageKey; body: MessageKey }> = [
  { id: 'dengue', label: 'campusBoards.ann.tpl.dengue', title: 'campusBoards.ann.tpl.dengueTitle', body: 'campusBoards.ann.tpl.dengueBody' },
  { id: 'camp', label: 'campusBoards.ann.tpl.camp', title: 'campusBoards.ann.tpl.campTitle', body: 'campusBoards.ann.tpl.campBody' },
  { id: 'heat', label: 'campusBoards.ann.tpl.heat', title: 'campusBoards.ann.tpl.heatTitle', body: 'campusBoards.ann.tpl.heatBody' },
  { id: 'water', label: 'campusBoards.ann.tpl.water', title: 'campusBoards.ann.tpl.waterTitle', body: 'campusBoards.ann.tpl.waterBody' },
];

type Channel = 'whatsapp' | 'app' | 'email';
const CHANNELS: ReadonlyArray<{ id: Channel; label: MessageKey }> = [
  { id: 'whatsapp', label: 'campusBoards.ann.channel.whatsapp' },
  { id: 'app', label: 'campusBoards.ann.channel.app' },
  { id: 'email', label: 'campusBoards.ann.channel.email' },
];

/** The board's message limit: one WhatsApp template body. */
const MESSAGE_LIMIT = 320;

/**
 * Announcements (design page 4, CampusAnnouncements; Tier 3). Nothing can send
 * a campus announcement yet (no endpoint, no WhatsApp template approved), so the
 * composer works for drafting and previewing on this screen only, Send and
 * Schedule are disabled with the reason, and "Sent this term" is not
 * connected. No reach or read counts are shown: none exist.
 */
export function CampusAnnouncementsScreen(): React.ReactElement {
  const t = useT();
  const { user } = useAuth();
  const titleId = useId();
  const bodyId = useId();
  const countId = useId();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [channels, setChannels] = useState<Record<Channel, boolean>>({ whatsapp: true, app: true, email: false });
  const campus = user?.university.trim() ?? '';
  const over = body.length > MESSAGE_LIMIT;

  return (
    <div className="sk-ds cb-board">
      <ConsolePageHeader title={t('campusBoards.ann.title')} subtitle={t('campusBoards.ann.subtitle')} />
      <div className="cb-ann">
        <section className="sk-card cb-ann__compose" aria-labelledby="cb-ann-new">
          <span className="sk-card__titles">
            <h2 id="cb-ann-new" className="sk-card__title">{t('campusBoards.ann.new')}</h2>
            <p className="sk-card__subtitle">{t('campusBoards.ann.newSubtitle')}</p>
          </span>
          <div className="cb-chips" role="group" aria-label={t('campusBoards.ann.templates')}>
            {TEMPLATES.map((template) => (
              <button key={template.id} type="button" className="cb-chip cb-chip--dashed" onClick={() => { setTitle(t(template.title)); setBody(t(template.body)); }}>
                {t(template.label)}
              </button>
            ))}
          </div>
          <label className="cb-field" htmlFor={titleId}>
            <span className="cb-field__label">{t('campusBoards.ann.field.title')}</span>
            <input id={titleId} value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <div className="cb-field">
            <label className="cb-field__label" htmlFor={bodyId}>{t('campusBoards.ann.field.message')}</label>
            <textarea id={bodyId} value={body} rows={6} aria-describedby={countId} aria-invalid={over || undefined} onChange={(event) => setBody(event.target.value)} />
            <span id={countId} className={`cb-count sk-mono${over ? ' is-over' : ''}`}>{t('campusBoards.ann.count', { count: body.length, limit: MESSAGE_LIMIT })}</span>
          </div>
          <div className="cb-field">
            <span className="cb-field__label">{t('campusBoards.ann.field.audience')}</span>
            <div className="cb-chips">
              <span className="cb-chip is-on">{t('campusBoards.ann.audience.everyone')}</span>
            </div>
            <p className="cb-field__hint">{t('campusBoards.ann.audience.note')}</p>
          </div>
          <div className="cb-field">
            <span className="cb-field__label" id="cb-ann-channels">{t('campusBoards.ann.field.channels')}</span>
            <div className="cb-channels" role="group" aria-labelledby="cb-ann-channels">
              {CHANNELS.map((channel) => (
                <button
                  key={channel.id}
                  type="button"
                  className={`cb-channel${channels[channel.id] ? ' is-on' : ''}`}
                  aria-pressed={channels[channel.id]}
                  onClick={() => setChannels((value) => ({ ...value, [channel.id]: !value[channel.id] }))}
                >
                  {t(channel.label)}
                </button>
              ))}
            </div>
          </div>
          <div className="cb-ann__send">
            <SkButton variant="secondary" disabled>
              {t('campusBoards.ann.schedule')}
              <Unavailable reason="campusBoards.ann.sendUnavailable" />
            </SkButton>
            <SkButton disabled>
              {t('campusBoards.ann.send')}
              <Unavailable reason="campusBoards.ann.sendUnavailable" />
            </SkButton>
          </div>
          <p className="cb-field__hint">{t('campusBoards.ann.sendUnavailable')}</p>
        </section>

        <section className="cb-ann__preview" aria-labelledby="cb-ann-preview">
          <h2 id="cb-ann-preview" className="cb-eyebrow">{t('campusBoards.ann.preview')}</h2>
          <div className="cb-phone">
            <div className="cb-phone__bar">
              <BrandLogo size={30} />
              <span className="cb-phone__name">{t('campusBoards.ann.previewSender')}</span>
            </div>
            <div className="cb-phone__chat">
              {title || body ? (
                <div className="cb-bubble">
                  {title ? <strong>{title}</strong> : null}
                  {body ? <span>{body}</span> : null}
                  <small>{campus ? t('campusBoards.ann.previewFooter', { campus }) : t('campusBoards.ann.previewFooterNoCampus')}</small>
                </div>
              ) : (
                <p className="cb-phone__empty">{t('campusBoards.ann.previewEmpty')}</p>
              )}
            </div>
          </div>
        </section>

        <section className="sk-card cb-ann__sent" aria-labelledby="cb-ann-sent">
          <h2 id="cb-ann-sent" className="sk-card__title">{t('campusBoards.ann.sent')}</h2>
          <NotConnected icon="volume" tile="chart-alt--p4" titleKey="campusBoards.ann.sentOffTitle" bodyKey="campusBoards.ann.sentOffBody" />
        </section>
      </div>
    </div>
  );
}
