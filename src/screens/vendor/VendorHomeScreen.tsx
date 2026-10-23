import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/design-system/icons';
import { SkButton, StatusPill, Toast } from '@/design-system/primitives';
import type { SkTone } from '@/design-system/primitives';
import { ConsoleTopbar } from '@/design-system/console-shell/ConsoleShell';
import { TeamBadge } from '@/features/team-accounts/TeamBadge';
import toolsArt from '../../assets/image-6f6766.jpg';
import { useAuth } from '../../data/contexts/AuthContext';
import { money } from '../../data/types/workflowTypes';
import type { PartnerKind } from '../../data/types/workflowTypes';
import { navigate, RoutePath } from '../../lib/utils/workflowRouting';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { useEffectivePartnerKind } from './partnerPreview';
import { partnerInitials } from './partnerAccess';
import { countRequests, countRxReviews, loadRequests, updateRequest } from '@/features/partner/partnerApi';
import type { PartnerRequest, RequestStatus } from '@/features/partner/partnerApi';
import { PartnerError, PartnerEmpty, PartnerKpis, PartnerLoading, PartnerPage, shortRef, usePartnerLoad } from '@/features/partner/PartnerPage';
import './vendor-home.css';
import '@/design-system/design-system.css';

export type ProviderType = 'pharmacy' | 'lab' | 'clinic' | 'wellness';

/**
 * VendorHome — the partner's home (design page 6, Tier 3, SK-115).
 *
 * Wired to the partner's own order lines (`GET /work/requests`, scoped to this
 * partner by the server) and, for a pharmacy, the size of the Rx review queue
 * (only its totals). The newest request waiting for a decision is the banner;
 * Accept and Decline call `PATCH /work/requests/{id}`. Figures no endpoint
 * reports (accept rate, lab turnaround, rooms free…) show "—" with "Not
 * connected", never a sample number. No timer: the server sets no deadline.
 *
 * Student names never show here (only an order reference), and the provider
 * type is the one a super admin assigned: there is no switch.
 */

export interface HomeData {
  /** Newest lines first, at most five. */
  recent: PartnerRequest[];
  /** Every line for this partner, any state (server total). */
  total: number;
  /** Server totals per state. */
  counts: Record<'REQUESTED' | 'ACCEPTED' | 'DISPATCHED', number>;
  /** Newest line waiting for Accept / Decline. */
  newest: PartnerRequest | null;
  /** Prescriptions waiting for this pharmacy's pharmacist; null when not reported. */
  rxWaiting: number | null;
}

export type HomeSource = (kind: ProviderType, signal: AbortSignal) => Promise<HomeData>;

export const liveHomeSource: HomeSource = async (kind, signal) => {
  const [recent, waiting, accepted, dispatched, rxWaiting] = await Promise.all([
    loadRequests({ limit: 5 }, signal),
    loadRequests({ status: 'REQUESTED', limit: 1 }, signal),
    countRequests('ACCEPTED', signal),
    countRequests('DISPATCHED', signal),
    // A figure, not a gate: if the queue can't be read the tile says "—".
    kind === 'pharmacy' ? countRxReviews(signal).catch(() => null) : Promise.resolve(null),
  ]);
  return {
    recent: recent.items,
    total: recent.total,
    counts: { REQUESTED: waiting.total, ACCEPTED: accepted, DISPATCHED: dispatched },
    newest: waiting.items[0] ?? null,
    rxWaiting,
  };
};

type KpiId = 'new' | 'rxToReview' | 'outForDelivery' | 'acceptRate' | 'booked' | 'toCollect' | 'toRelease' | 'tat' | 'doctorsOn' | 'noShow' | 'waitlist' | 'attendance';

/** The four tiles per provider type, in the board's order. */
const KPIS: Record<ProviderType, KpiId[]> = {
  pharmacy: ['new', 'rxToReview', 'outForDelivery', 'acceptRate'],
  lab: ['new', 'toCollect', 'toRelease', 'tat'],
  clinic: ['new', 'booked', 'doctorsOn', 'noShow'],
  wellness: ['new', 'booked', 'waitlist', 'attendance'],
};

function kpiValue(id: KpiId, data: HomeData): number | null {
  switch (id) {
    case 'new': return data.counts.REQUESTED;
    case 'rxToReview': return data.rxWaiting;
    case 'outForDelivery': return data.counts.DISPATCHED;
    case 'booked': return data.counts.ACCEPTED;
    default: return null;
  }
}

/** A tool tile: label/meta keys are `partner.vhome.home.tool.<id>` / `…<id>Meta`; no route = not built yet. */
interface Tool { id: string; route?: RoutePath }

const TOOLS: Record<ProviderType, Tool[]> = {
  pharmacy: [
    { id: 'orders', route: 'orders' },
    { id: 'rxReview', route: 'rx-review' },
    { id: 'substitutions', route: 'substitutions' },
    { id: 'catalogue', route: 'catalogue' },
    { id: 'handover', route: 'handover' },
  ],
  lab: [
    { id: 'runSheet', route: 'run-sheet' },
    { id: 'sampleQueue', route: 'lab-queue' },
    { id: 'coldChain', route: 'cold-chain' },
    { id: 'labReports', route: 'lab-queue' },
    { id: 'campIntake', route: 'camp-intake' },
  ],
  clinic: [
    { id: 'bookings', route: 'orders' },
    { id: 'doctorsRooms' },
    { id: 'slots' },
    { id: 'settlement', route: 'settlement' },
    { id: 'staff', route: 'partner-staff' },
  ],
  wellness: [
    { id: 'checkIn', route: 'scan-verify' },
    { id: 'timetable' },
    { id: 'coaches', route: 'partner-staff' },
    { id: 'settlement', route: 'settlement' },
    { id: 'workshops' },
  ],
};

const PROVIDER_FOR_KIND: Record<PartnerKind, ProviderType> = { PHARMACY: 'pharmacy', LAB: 'lab', CLINIC: 'clinic', WELLNESS: 'wellness' };

const STATE: Record<RequestStatus, { key: MessageKey; tone: SkTone }> = {
  REQUESTED: { key: 'pc.state.new', tone: 'attention' },
  ACCEPTED: { key: 'pc.state.accepted', tone: 'action' },
  DISPATCHED: { key: 'pc.state.out', tone: 'positive' },
  COMPLETED: { key: 'pc.state.delivered', tone: 'neutral' },
  DECLINED: { key: 'pc.state.declined', tone: 'neutral' },
};
/** Placed but not paid: not "New" for the partner until the payment is confirmed. */
const AWAITING_PAYMENT_STATE = { key: 'pc.state.awaitingPayment', tone: 'neutral' } as const;
const stateOf = (line: PartnerRequest) => (line.awaitingPayment ? AWAITING_PAYMENT_STATE : STATE[line.status]);

export interface VendorHomeScreenProps {
  initialProviderType?: ProviderType;
  source?: HomeSource;
  onNavigate?: (route: RoutePath) => void;
  _onNavigate?: (route: string) => void;
  onLogout?: () => void;
  onSwitchRole?: (role: 'student' | 'admin' | 'vendor') => void;
}

export function VendorHomeScreen({ initialProviderType, source = liveHomeSource, onNavigate, _onNavigate, onLogout, onSwitchRole }: VendorHomeScreenProps) {
  const { user, logout } = useAuth();
  const t = useT();

  // The type a super admin assigned (or the dev-only preview); `initialProviderType` is for tests.
  const assignedKind = useEffectivePartnerKind(user);
  const providerType: ProviderType | null = initialProviderType ?? (assignedKind ? PROVIDER_FOR_KIND[assignedKind] : null);
  const accountName = user?.fullName?.trim() || t('partner.vhome.home.accountFallback');

  const load = useCallback((signal: AbortSignal) => source(providerType ?? 'pharmacy', signal), [source, providerType]);
  const home = usePartnerLoad<HomeData>(providerType ? load : null);
  const [toast, setToast] = useState<string | null>(null);
  const [deciding, setDeciding] = useState<'ACCEPTED' | 'DECLINED' | null>(null);

  const go = (target: RoutePath) => {
    if (_onNavigate) _onNavigate(target);
    if (onNavigate) onNavigate(target);
    else navigate(target);
  };

  const decide = async (line: PartnerRequest, status: 'ACCEPTED' | 'DECLINED') => {
    setDeciding(status);
    try {
      await updateRequest(line.id, status);
      setToast(t(status === 'ACCEPTED' ? 'pc.home.accepted' : 'pc.home.declined'));
      home.reload();
    } catch (error) {
      setToast(error instanceof Error && error.message ? error.message : t('pc.home.decideFailed'));
    } finally {
      setDeciding(null);
    }
  };

  const topbar = (
    <ConsoleTopbar
      className="vh-topbar"
      title={t('partner.vhome.home.header')}
      badge={<TeamBadge />}
      search={{ label: t('console.searchSoon') }}
      notifications={{ label: t('console.notifications'), onClick: () => setToast(t('partner.vhome.home.notificationsOff')) }}
      account={<AccountMenu name={accountName} email={user?.email} typeLabel={providerType ? t(`partner.vhome.home.type.${providerType}` as MessageKey) : ''} onSwitchRole={onSwitchRole} onSignOut={() => (onLogout ? onLogout() : logout())} />}
    />
  );

  // Fail closed: with no assigned type there is no dashboard and no tools.
  if (providerType === null) {
    return (
      <div className="vh-root">
        {topbar}
        <PartnerPage>
          <PartnerEmpty icon3d="cart-alt--p3" title={t('pc.home.unassignedTitle')} body={t('pc.home.unassignedBody')} />
        </PartnerPage>
      </div>
    );
  }

  const data = home.data;
  let body: React.ReactNode;
  if (home.status === 'loading' && !data) {
    body = <PartnerLoading label={t('console.loading', { title: accountName })} />;
  } else if (home.status === 'error' || !data) {
    body = <PartnerError title={t('pc.home.errorTitle', { name: accountName })} reference={t('pc.home.ref')} detail={home.error || undefined} onRetry={home.reload} onHelp={() => go('support')} />;
  } else if (data.total === 0 && !data.rxWaiting) {
    body = <PartnerEmpty icon3d="cart-alt--p3" title={t('pc.home.emptyTitle', { name: accountName })} body={t('pc.home.emptyBody')} action={{ label: t('partner.vhome.home.emptyCta'), onSelect: () => go('catalogue') }} />;
  } else {
    body = (
      <>
        <div className="pc-head">
          <div className="pc-head__titles">
            <h1 className="pc-title">{accountName}</h1>
            <p className="pc-sub">{t('pc.home.sub')}</p>
          </div>
          <span className="vh-type" aria-label={t('pc.home.typeLabel', { type: t(`partner.vhome.home.type.${providerType}` as MessageKey) })}>
            <span className="vh-type__on">{t(`partner.vhome.home.type.${providerType}` as MessageKey)}</span>
          </span>
        </div>

        {data.newest ? <NewWork line={data.newest} busy={deciding} onDecide={(status) => { if (data.newest) void decide(data.newest, status); }} /> : null}

        <PartnerKpis
          label={t('pc.home.kpisLabel')}
          items={KPIS[providerType].map((id) => {
            const value = kpiValue(id, data);
            return { id, label: t(`partner.vhome.home.kpi.${id}` as MessageKey), value: value === null ? null : value.toLocaleString('en-IN'), meta: t(`pc.home.kpiMeta.${id}` as MessageKey) };
          })}
        />

        <div className="vh-columns">
          <section className="pc-panel vh-queue" aria-labelledby="vh-queue-title">
            <div>
              <h2 id="vh-queue-title" className="pc-panel__title">{t('pc.home.queueTitle')}</h2>
              <p className="pc-panel__sub">{t('partner.vhome.home.queueSub.pharmacy')}</p>
            </div>
            {data.recent.length ? (
              <ul className="vh-rows">
                {data.recent.map((line) => (
                  <li key={line.id} className="vh-row">
                    <span className="vh-row__id">{shortRef(line.orderId)}</span>
                    <span className="vh-row__what">{t('pc.lineWhat', { name: line.name, qty: line.quantity })}</span>
                    <span className="vh-row__meta">{deliveryMeta(line, t)}</span>
                    <StatusPill tone={stateOf(line).tone} className="vh-row__state">{t(stateOf(line).key)}</StatusPill>
                  </li>
                ))}
              </ul>
            ) : <p className="pc-muted">{t('pc.home.queueEmpty')}</p>}
            {data.total > data.recent.length ? (
              <button type="button" className="pc-link-btn vh-more" onClick={() => go('performance')}>{t('pc.home.queueAll', { count: data.total })}</button>
            ) : null}
          </section>

          <section className="pc-panel vh-tools" aria-labelledby="vh-tools-title">
            <div>
              <h2 id="vh-tools-title" className="pc-panel__title">{t('partner.vhome.home.toolsTitle')}</h2>
              <p className="pc-panel__sub">{t('partner.vhome.home.toolsSub')}</p>
            </div>
            {/* The board's art for the tools panel (design/assets/image-6f6766.jpg); decorative. */}
            <img className="vh-tools__art" src={toolsArt} alt="" />
            <ul className="vh-tool-list">
              {TOOLS[providerType].map((tool) => (
                <li key={tool.id}>
                  <button
                    type="button"
                    className={`vh-tool${tool.route ? '' : ' is-unavailable'}`}
                    aria-disabled={tool.route ? undefined : true}
                    onClick={() => (tool.route ? go(tool.route) : setToast(t('console.notAvailable')))}
                  >
                    <span className="vh-tool__tile" aria-hidden="true" />
                    <span className="vh-tool__text">
                      <span className="vh-tool__name">{t(`partner.vhome.home.tool.${tool.id}` as MessageKey)}</span>
                      <span className="vh-tool__meta">{tool.route ? t(`partner.vhome.home.tool.${tool.id}Meta` as MessageKey) : t('console.notAvailable')}</span>
                    </span>
                    <Icon name="arrow-right" size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </>
    );
  }

  return (
    <div className="vh-root">
      {topbar}
      <PartnerPage>{body}</PartnerPage>
      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function deliveryMeta(line: PartnerRequest, t: ReturnType<typeof useT>): string {
  const parts: string[] = [];
  const delivery = line.delivery;
  if (delivery?.mode === 'pickup') parts.push(t('pc.delivery.pickup'));
  else if (delivery?.mode === 'delivery') parts.push(delivery.city ? t('pc.delivery.to', { city: delivery.city }) : t('pc.delivery.delivery'));
  if (line.requestedSlot) parts.push(line.requestedSlot);
  return parts.join(' · ');
}

/** The banner for the newest request waiting for a decision. */
function NewWork({ line, busy, onDecide }: { line: PartnerRequest; busy: 'ACCEPTED' | 'DECLINED' | null; onDecide: (status: 'ACCEPTED' | 'DECLINED') => void }): React.ReactElement {
  const t = useT();
  const meta = [deliveryMeta(line, t), money(line.pricePaise * line.quantity)].filter(Boolean).join(' · ');
  return (
    <section className="vh-alert" aria-labelledby="vh-alert-title">
      <span className="vh-alert__icon" aria-hidden="true"><Icon name="bell" size={22} /></span>
      <span className="vh-alert__text">
        <span id="vh-alert-title" className="vh-alert__title">{t('pc.home.newWork', { name: line.name, qty: line.quantity })}</span>
        <span className="vh-alert__meta">{meta}</span>
      </span>
      <span className="vh-alert__actions">
        <SkButton variant="secondary" className="vh-alert__decline" busy={busy === 'DECLINED'} disabled={busy !== null} onClick={() => onDecide('DECLINED')}>{t('pc.home.decline')}</SkButton>
        <SkButton variant="on-hero" className="vh-alert__accept" busy={busy === 'ACCEPTED'} disabled={busy !== null} onClick={() => onDecide('ACCEPTED')}>{busy === 'ACCEPTED' ? null : <Icon name="check-2" size={17} />}{t('pc.home.accept')}</SkButton>
      </span>
    </section>
  );
}

/** The account chip in the top bar and its menu. */
function AccountMenu({ name, email, typeLabel, onSwitchRole, onSignOut }: { name: string; email?: string; typeLabel: string; onSwitchRole?: (role: 'student' | 'admin' | 'vendor') => void; onSignOut: () => void }): React.ReactElement {
  const t = useT();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const outside = (event: MouseEvent) => { if (root.current && event.target instanceof Node && !root.current.contains(event.target)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  const pick = (action: () => void) => () => { setOpen(false); action(); };
  return (
    <div className="vh-account" ref={root}>
      <button type="button" className="vh-account__chip" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)}>
        <span className="vh-account__avatar" aria-hidden="true">{partnerInitials(name)}</span>
        {/* Named by its visible words where they show; on a phone they are hidden, so this names it there. */}
        <span className="sk-visually-hidden">{t('pc.home.accountMenu', { name })}</span>
        <span className="vh-account__words">
          <span className="vh-account__name">{name}</span>
          {typeLabel ? <span className="vh-account__sub">{typeLabel}</span> : null}
        </span>
      </button>
      {open ? (
        <div className="vh-account__menu" role="menu">
          <div className="vh-account__who"><strong>{name}</strong>{email ? <span>{email}</span> : null}</div>
          {onSwitchRole ? (
            <>
              <button type="button" role="menuitem" className="vh-account__item" onClick={pick(() => onSwitchRole('student'))}><Icon name="graduation-cap" size={15} />{t('partner.vhome.home.switchStudent')}</button>
              <button type="button" role="menuitem" className="vh-account__item" onClick={pick(() => onSwitchRole('admin'))}><Icon name="shield-2" size={15} />{t('partner.vhome.home.switchAdmin')}</button>
            </>
          ) : null}
          <button type="button" role="menuitem" className="vh-account__item is-danger" onClick={pick(onSignOut)}><Icon name="log-out" size={15} />{t('console.signOut')}</button>
        </div>
      ) : null}
    </div>
  );
}
