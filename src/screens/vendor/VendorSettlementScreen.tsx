import React from 'react';
import { ConsolePageHeader } from '@/design-system/console/ConsoleTablePage';
import { SkButton } from '@/design-system/primitives';
import { Icon } from '@/design-system/icons';
import { useAuth } from '@/data/contexts/AuthContext';
import { useT } from '@/i18n';
import { partnerDisplayName } from './partnerAccess';
import { PartnerKpis, PartnerNote, PartnerPage } from '@/features/partner/PartnerPage';
import './vendor-settlement.css';

/**
 * VendorSettlement — earnings and settlement (design page 6, Tier 3).
 *
 * No settlement, commission or payout endpoint exists for partners (checked
 * 2026-10-21: the server has no settlement table and no commission rate; see
 * backend/services/workflow_api.py "Clinician earnings"). So every money
 * figure is "—" with "Not connected", the weekly chart is an honest blank, and
 * the statement download is unavailable. Nothing here is computed on the
 * client: money comes only from the server, and the server reports none yet.
 *
 * The board's loading / empty / error states belong to a data source; with
 * none connected, this page is in its not-connected state in every build.
 */

const TILES = ['gross', 'commission', 'net', 'held'] as const;
const CYCLE = ['orders', 'gross', 'commission', 'held', 'adjustments'] as const;
const SLAS = ['accepted', 'packed', 'delivered'] as const;

export interface VendorSettlementScreenProps {
  onNavigate?: (route: string) => void;
  onLogout?: () => void;
  /** Fixed "now" for tests; the month in the subtitle is the current one. */
  now?: Date;
}

export function VendorSettlementScreen({ now }: VendorSettlementScreenProps) {
  const t = useT();
  const { user } = useAuth();
  const month = (now ?? new Date()).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const name = user ? partnerDisplayName(user) : t('partner.vhome.home.accountFallback');

  return (
    <PartnerPage className="vs-page">
      <ConsolePageHeader
        title={t('pc.settle.title')}
        subtitle={t('pc.settle.sub', { name, month })}
        actions={<SkButton variant="secondary" disabled title={t('console.notAvailable')}><Icon name="share" size={17} />{t('pc.settle.download')}<span className="sk-visually-hidden"> · {t('console.notAvailable')}</span></SkButton>}
      />

      <PartnerKpis label={t('pc.settle.tilesLabel')} items={TILES.map((id) => ({ id, label: t(`pc.settle.tile.${id}`), value: null }))} />

      <div className="vs-layout">
        <section className="pc-panel vs-chart" aria-labelledby="vs-chart-title">
          <div className="vs-chart__head">
            <div>
              <h2 id="vs-chart-title" className="pc-panel__title">{t('pc.settle.chartTitle')}</h2>
              <p className="pc-panel__sub">{t('pc.settle.chartSub')}</p>
            </div>
            <span className="vs-legend" aria-hidden="true">
              <span className="vs-legend__item"><span className="vs-legend__swatch is-settled" />{t('pc.settle.settled')}</span>
              <span className="vs-legend__item"><span className="vs-legend__swatch is-pending" />{t('pc.settle.pending')}</span>
            </span>
          </div>
          <div className="vs-chart__blank" role="note">
            <p className="vs-chart__blank-title">{t('pc.settle.unconnectedTitle')}</p>
            <p className="pc-muted">{t('pc.settle.unconnectedBody')}</p>
          </div>
        </section>

        <div className="vs-side">
          <section className="pc-panel" aria-labelledby="vs-cycle-title">
            <h2 id="vs-cycle-title" className="pc-eyebrow">{t('pc.settle.cycle')}</h2>
            <dl className="pc-lines">
              {CYCLE.map((id) => (
                <div key={id} className="pc-line"><dt>{t(`pc.settle.line.${id}`)}</dt><dd className="is-unknown">—</dd></div>
              ))}
            </dl>
            <div className="vs-net">
              <span className="vs-net__label">{t('pc.settle.net')}</span>
              <span className="vs-net__value">—</span>
            </div>
            <p className="pc-muted">{t('pc.settle.payoutUnconnected')}</p>
          </section>

          <section className="pc-panel" aria-labelledby="vs-sla-title">
            <h2 id="vs-sla-title" className="pc-eyebrow">{t('pc.settle.sla')}</h2>
            <ul className="vs-slas">
              {SLAS.map((id) => (
                <li key={id} className="vs-sla">
                  <span className="vs-sla__row"><span>{t(`pc.settle.sla.${id}`)}</span><span className="vs-sla__value">—</span></span>
                  <span className="vs-sla__track" aria-hidden="true" />
                </li>
              ))}
            </ul>
            <PartnerNote tone="info">{t('pc.settle.slaNote')}</PartnerNote>
          </section>
        </div>
      </div>
    </PartnerPage>
  );
}
