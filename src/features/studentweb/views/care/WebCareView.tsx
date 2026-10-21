import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon } from '@/design-system/icons';
import { CrisisLinks, useOnline } from '@/design-system';
import { ServiceRail } from '@/design-system/m2';
import type { ServiceHue, ServiceTile } from '@/design-system/m2';
import { apiRequest } from '@/data/services/http';
import { getSetting } from '@/data/services/config';
import { useLiveCart } from '@/data/contexts/LiveCartContext';
import { money } from '@/data/types/workflowTypes';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import { navigate } from '@/lib/utils/workflowRouting';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { clockLabel, dayLabel, isToday } from '@/features/phoneboards/format';
import { initials } from '@/features/m2store/views/M2HomeView';
import { ConsultsViewModel } from '@/features/m2store/viewmodel/ConsultsViewModel';
import type { ConsultOption } from '@/features/m2store/viewmodel/ConsultsViewModel';
import { BookAppointmentDialog } from '@/screens/workspace/AppointmentsPanel';
import { EmptyPanel, ErrorPanel, LoadingRows, OfflinePanel, UrgentNote } from '../parts';
import { hueStyle, rise, SoftIcon } from '../shop/m2WebParts';
import { useAddToCart } from '../shop/shopShared';
import { CartBar, CartRail, showCartRail } from '../shop/ShopCartRail';
import './m2webcare.css';

/**
 * /care above phone width in the Mobile 2.0 language (canvas page 9
 * M2Consults at desktop and tablet widths; plan
 * docs/plans/m2-web-care-2026-10-21.md). One page for the signed-in student
 * (inside the student web shell) and for a visitor or another role (inside the
 * public site's header and footer, at every width).
 *
 * Same view model and flows as the phone board: the consultations in the
 * catalogue with each one's next open slot, "Book" opening the existing
 * booking dialog (slot reserved by POST /appointments), and the old
 * marketplace's other path kept: a consultation can go in the cart and be paid
 * for at /checkout (PayStepView). Signed out, nothing that needs a session is
 * requested: no slots, and booking or checking out asks to sign in first.
 *
 * Tier 1 part, unchanged from the phone board: Stress or anxiety, Sleep
 * trouble and Low mood show the counsellor note with the reviewed crisis
 * lines (CrisisLinks: 112 and Tele-MANAS). Honest gaps as on the phone:
 * "Free follow-up" is not available yet; registration numbers, years and
 * languages are not in the catalogue and are left out; a concern chip never
 * reaches the server. Nothing here reads the health record (Rule L).
 */
export interface WebCareViewProps {
  signedIn?: boolean;
  /** Where Student Plus opens: the student's billing, or the public plans. */
  plus?: RoutePath;
}

const CHIPS: readonly { key: string; label: MessageKey; mind?: boolean }[] = [
  { key: 'fever', label: 'm2.doc.chip.fever' },
  { key: 'cold', label: 'm2.doc.chip.cold' },
  { key: 'stomach', label: 'm2.doc.chip.stomach' },
  { key: 'headache', label: 'm2.doc.chip.headache' },
  { key: 'skin', label: 'm2.doc.chip.skin' },
  { key: 'hair', label: 'm2.doc.chip.hair' },
  { key: 'period', label: 'm2.doc.chip.period' },
  { key: 'sexual', label: 'm2.doc.chip.sexual' },
  { key: 'sports', label: 'm2.doc.chip.sports' },
  { key: 'stress', label: 'm2.doc.chip.stress', mind: true },
  { key: 'sleep', label: 'm2.doc.chip.sleep', mind: true },
  { key: 'mood', label: 'm2.doc.chip.mood', mind: true },
];

const FAQ: readonly { key: string; q: MessageKey; a: MessageKey }[] = [
  { key: 'soon', q: 'm2.doc.faq1q', a: 'm2.doc.faq1a' },
  { key: 'private', q: 'm2.doc.faq2q', a: 'm2.doc.faq2a' },
  { key: 'next', q: 'm2.doc.faq3q', a: 'm2.doc.faq3a' },
  { key: 'unhappy', q: 'm2.doc.faq4q', a: 'm2.doc.faq4a' },
];

const AVATAR_HUES: readonly ServiceHue[] = ['blue', 'rose', 'green', 'violet', 'amber', 'teal'];

const who = (service: LiveCatalogItem): string => service.brand || service.name;

function Avatar({ service, index, size = 'md' }: { service: LiveCatalogItem; index: number; size?: 'md' | 'lg' }) {
  return (
    <span className={`sk-m2wc-avatar sk-m2wc-avatar--${size}`} style={hueStyle(AVATAR_HUES[index % AVATAR_HUES.length] ?? 'blue')} aria-hidden="true">
      {initials(who(service).replace(/^dr\.?\s+/i, ''))}
    </span>
  );
}

function useNextLine(signedIn: boolean) {
  const t = useT();
  return (option: ConsultOption): string => {
    if (!signedIn) return t('m2wc.signInTimes');
    if (option.next === undefined) return t('m2.doc.slotChecking');
    if (option.next === null) return t('m2.doc.noSlot');
    const at = option.next.slotStart;
    return isToday(at) ? t('m2.doc.freeAt', { time: clockLabel(at) }) : t('m2.doc.freeOn', { day: dayLabel(at, t), time: clockLabel(at) });
  };
}

function DoctorCard({ option, index, picked, line, onPick, onBook }: {
  option: ConsultOption; index: number; picked: boolean; line: string; onPick: () => void; onBook: () => void;
}) {
  const t = useT();
  const { service } = option;
  return (
    <li className={`sk-m2wc-doc sk-m2w-lift sk-m2w-rise${picked ? ' is-picked' : ''}`} style={rise(index)} data-testid={`m2wc-doc-${service.id}`}>
      <div className="sk-m2wc-doc__top">
        <Avatar service={service} index={index} />
        <span className="sk-m2wc-doc__who">
          <h3 className="sk-m2w-h3">{who(service)}</h3>
          <span className="sk-m2w-meta">{service.name}</span>
        </span>
      </div>
      {service.pricePaise > 0 ? <span className="sk-m2w-tag">{t('m2.doc.from', { price: money(service.pricePaise) })}</span> : null}
      <span className={option.next ? 'sk-m2wc-free' : 'sk-m2wc-free is-none'}>{line}</span>
      <div className="sk-m2wc-doc__foot">
        <button type="button" className="sk-m2w-btn sk-m2w-btn--ghost sk-m2w-btn--sm" aria-pressed={picked}
          aria-label={t('m2wc.detailsSpoken', { name: who(service), service: service.name })} onClick={onPick}>
          {t('m2wc.details')}
        </button>
        <button type="button" className="sk-m2w-btn sk-m2w-btn--primary sk-m2w-btn--sm"
          aria-label={t('m2wc.bookSpoken', { name: who(service), service: service.name })} onClick={onBook}>
          {t('m2.doc.book')}
        </button>
      </div>
    </li>
  );
}

/** The picked consultation beside the grid (sticky on desktop): price before booking, next free time, Book, or pay ahead. */
function ConsultSummary({ option, index, line, signedIn, inCart, onBook, onPayAhead }: {
  option: ConsultOption | null; index: number; line: string; signedIn: boolean; inCart: boolean; onBook: () => void; onPayAhead: () => void;
}) {
  const t = useT();
  return (
    <section className="sk-m2w-panel sk-m2wc-summary" aria-labelledby="sk-m2wc-summary-title" data-testid="m2wc-summary">
      <h2 id="sk-m2wc-summary-title" className="sk-m2w-h3">{t('m2wc.summary.title')}</h2>
      {option ? (
        <>
          <div className="sk-m2wc-doc__top">
            <Avatar service={option.service} index={index} size="lg" />
            <span className="sk-m2wc-doc__who">
              <strong className="sk-m2wc-summary__name">{who(option.service)}</strong>
              <span className="sk-m2w-meta">{option.service.name}</span>
              {option.service.pack ? <span className="sk-m2w-meta">{option.service.pack}</span> : null}
            </span>
          </div>
          <dl className="sk-m2w-totals">
            <div className="is-total"><dt>{t('m2wc.summary.price')}</dt><dd>{money(option.service.pricePaise)}</dd></div>
            <div><dt>{t('m2wc.summary.next')}</dt><dd className={option.next ? 'sk-m2wc-free' : 'sk-m2wc-free is-none'}>{line}</dd></div>
          </dl>
          {option.service.description ? <p className="sk-m2w-desc">{option.service.description}</p> : null}
          {option.service.preparation ? (
            <div className="sk-m2w-note"><strong>{t('m2wc.summary.prep')}</strong> {option.service.preparation}</div>
          ) : null}
          <button type="button" className="sk-m2w-btn sk-m2w-btn--primary sk-m2w-btn--block" data-testid="m2wc-summary-book" onClick={onBook}>
            <Icon name="video-2" size={18} />{signedIn ? t('m2wc.book') : t('m2wc.signInBook')}
          </button>
          <p className="sk-m2w-fine sk-m2w-fine--icon"><Icon name="shield" size={14} color="var(--sk-color-text-3)" />{t('care.appts.bookingNote')}</p>
          {inCart ? (
            <p className="sk-m2w-tag sk-m2w-tag--ok"><Icon name="cart" size={14} />{t('m2wc.inCart')}</p>
          ) : (
            <button type="button" className="sk-m2w-btn sk-m2w-btn--outline sk-m2w-btn--block" data-testid="m2wc-pay-ahead" onClick={onPayAhead}>
              <Icon name="cart" size={16} />{t('m2wc.payAhead')}
            </button>
          )}
          <p className="sk-m2w-fine">{t('m2wc.payAheadNote')}</p>
        </>
      ) : (
        <p className="sk-m2wc-summary__empty"><Icon name="user-5" size={20} color="var(--sk-color-text-3)" /><span className="sk-m2w-meta">{t('m2wc.summary.pick')}</span></p>
      )}
    </section>
  );
}

export const WebCareView = observer(function WebCareView({ signedIn = true, plus = 'billing' }: WebCareViewProps) {
  const t = useT();
  const online = useOnline();
  const cart = useLiveCart();
  const [vm] = useState(() => new ConsultsViewModel(apiRequest, { slots: signedIn }));
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  const [chip, setChip] = useState<string | null>(null);
  const [faq, setFaq] = useState(0);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [booking, setBooking] = useState<string | null>(null);
  // Consultations are never labs; the cart's own rules decide what goes in.
  const { add, inCart, toast } = useAddToCart(() => undefined, signedIn ? undefined : showCartRail);
  const nextLine = useNextLine(signedIn);

  const book = (service: LiveCatalogItem) => { if (signedIn) setBooking(service.id); else navigate('login', 'care'); };
  const mind = CHIPS.find((c) => c.key === chip)?.mind === true;
  const soonest = vm.soonest;
  const from = vm.fromPaise;
  const picked = vm.options.find((o) => o.service.id === pickedId) ?? soonest;
  const pickedIndex = picked ? vm.options.indexOf(picked) : 0;
  const plusPrice = getSetting('billing.student_plus.monthly_inr');
  const nowLabel = from !== null ? t('m2.doc.nowFrom', { price: money(from) }) : t('m2.doc.now');

  const rail: ServiceTile[] = [
    { key: 'consultation', label: t('m2.svc.consults'), icon: 'stetho', hue: 'blue', onPress: () => undefined },
    { key: 'product', label: t('m2.svc.medicines'), icon: 'pill-3', hue: 'teal', onPress: () => navigate('shop') },
    { key: 'lab', label: t('m2.svc.labs'), icon: 'lab', hue: 'violet', onPress: () => navigate('lab-tests') },
    { key: 'rx', label: t('m2w.rail.rx'), icon: 'doc-upload', hue: 'green', onPress: () => navigate('prescriptions') },
  ];

  let doctors: React.ReactNode = null;
  if (!online && (vm.phase === 'error' || vm.phase === 'loading')) doctors = <OfflinePanel onRetry={() => void vm.load()} />;
  else if (vm.phase === 'loading') doctors = <LoadingRows label={t('m2.doc.loading')} rows={3} />;
  else if (vm.phase === 'error') doctors = <ErrorPanel title={t('m2.doc.failedTitle')} body={t('m2.doc.failedBody')} onRetry={() => void vm.load()} />;
  else if (!vm.options.length) doctors = <div data-testid="m2wc-empty"><EmptyPanel title={t('m2.doc.empty')} body={t('m2wc.emptyBody')} /></div>;
  else {
    doctors = (
      <ul className="sk-m2wc-docgrid" aria-label={t('m2wc.doctorsList')}>
        {vm.options.map((option, index) => (
          <DoctorCard key={option.service.id} option={option} index={index} picked={picked?.service.id === option.service.id} line={nextLine(option)}
            onPick={() => setPickedId(option.service.id)} onBook={() => book(option.service)} />
        ))}
      </ul>
    );
  }

  return (
    <div className="sk-sw-page sk-m2w sk-m2wc" data-testid="m2w-care">
      <div className="sk-m2w-railwrap sk-m2w-rise">
        <ServiceRail label={t('m2wc.railLabel')} tiles={rail} current="consultation" testID="m2wc-rail" />
      </div>

      <div className="sk-m2w-cq">
        <div className="sk-m2wc-top">
          <section className="sk-m2wc-hero sk-m2w-rise" aria-labelledby="sk-m2wc-title">
            <span className="sk-m2wc-hero__ring" aria-hidden="true" />
            <span className="sk-m2wc-wave" aria-hidden="true"><span /><span /><span /><span /></span>
            <div className="sk-m2wc-hero__head">
              <span className="sk-m2wc-hero__eyebrow">{t('m2.doc.eyebrow')}</span>
              {vm.openToday > 0 ? (
                <span className="sk-m2wc-live" data-testid="m2wc-open-today"><span className="sk-m2wc-live__dot" aria-hidden="true" />{t(vm.openToday === 1 ? 'm2.doc.openTodayOne' : 'm2.doc.openToday', { count: vm.openToday })}</span>
              ) : null}
            </div>
            <h1 id="sk-m2wc-title" className="sk-m2wc-hero__title">{t('m2.doc.title')}</h1>
            <p className="sk-m2wc-hero__body">{t('m2.doc.body')}</p>
            {soonest ? (
              <button type="button" className="sk-m2w-btn sk-m2w-btn--light sk-m2wc-now" data-testid="m2wc-now" onClick={() => book(soonest.service)}>
                {nowLabel}<Icon name="arrow-right" size={16} strokeWidth={2.6} />
              </button>
            ) : null}
          </section>
          <div className="sk-m2wc-feats" role="group" aria-label={t('m2wc.features')}>
            <div className="sk-m2w-qcard sk-m2w-qcard--info sk-m2w-rise" style={rise(1)} data-testid="m2wc-video">
              <SoftIcon icon="video-2" hue="blue" size="sm" />
              <strong>{t('m2.doc.video')}</strong>
            </div>
            <div className="sk-m2w-qcard sk-m2w-qcard--muted sk-m2w-rise" style={rise(2)} role="group" aria-label={`${t('m2.doc.followUp')}, ${t('m2.notYet')}`} data-testid="m2wc-follow-up">
              <Icon name="refresh" size={22} color="var(--sk-color-text-2)" />
              <strong>{t('m2.doc.followUp')}</strong>
              <small>{t('m2.notYet')}</small>
            </div>
            <div className="sk-m2w-qcard sk-m2w-qcard--info sk-m2w-rise" style={rise(3)} data-testid="m2wc-erx">
              <SoftIcon icon="file-check" hue="amber" size="sm" />
              <strong>{t('m2.doc.erx')}</strong>
            </div>
            <button type="button" className="sk-m2w-linkcard sk-m2wc-plus sk-m2w-lift sk-m2w-rise" style={rise(4)} data-testid="m2wc-plus" onClick={() => navigate(plus)}>
              <span className="sk-m2wc-plus__icon" aria-hidden="true"><Icon name="shield" size={20} /></span>
              <span><strong>{t('m2.doc.plus')}</strong><small>{t('m2.doc.plusBody', { price: plusPrice })}</small></span>
              <Icon name="chevron-right" size={16} color="var(--sk-color-action)" />
            </button>
          </div>
        </div>
      </div>

      <div className="sk-m2w-cq">
        <div className="sk-m2wc-layout">
          <div className="sk-m2wc-main">
            <section className="sk-m2w-panel sk-m2wc-concerns sk-m2w-rise" style={rise(2)} aria-labelledby="sk-m2wc-concerns">
              <h2 id="sk-m2wc-concerns" className="sk-m2w-h2">{t('m2.doc.concerns')}</h2>
              <p className="sk-m2w-meta">{t('m2.doc.concernsSub')}</p>
              <div className="sk-m2wc-chips">
                {CHIPS.map((c) => {
                  const on = chip === c.key;
                  return (
                    <button key={c.key} type="button" className="sk-m2wc-chip" aria-pressed={on} data-testid={`m2wc-chip-${c.key}`} onClick={() => setChip(on ? null : c.key)}>
                      {t(c.label)}
                    </button>
                  );
                })}
              </div>
              {mind ? (
                <div className="sk-m2wc-mind" data-testid="m2wc-mind">
                  <p className="sk-m2wc-mind__row"><Icon name="heart-3" size={20} color="var(--sk-color-positive)" strokeWidth={2.1} /><span>{t('m2.doc.mindNote')}</span></p>
                  <CrisisLinks titleKey="m2.doc.mindLines" testID="m2wc-crisis" />
                </div>
              ) : null}
            </section>

            <section className="sk-m2wc-doctors" aria-labelledby="sk-m2wc-doctors">
              <h2 id="sk-m2wc-doctors" className="sk-m2w-h2">{t('m2.doc.doctors')}</h2>
              {doctors}
            </section>

            <section className="sk-m2w-panel sk-m2wc-faq" aria-labelledby="sk-m2wc-faq" data-testid="m2wc-faq">
              <h2 id="sk-m2wc-faq" className="sk-m2w-h3">{t('m2.doc.faq')}</h2>
              <ul>
                {FAQ.map((f, i) => {
                  const open = faq === i;
                  return (
                    <li key={f.key}>
                      <button type="button" className="sk-m2wc-faq__q" aria-expanded={open} aria-controls={`sk-m2wc-faq-${f.key}`} onClick={() => setFaq(open ? -1 : i)}>
                        <span>{t(f.q)}</span>
                        <Icon name="chevron-down" size={16} className={open ? 'is-open' : undefined} />
                      </button>
                      {open ? <p id={`sk-m2wc-faq-${f.key}`} className="sk-m2w-desc sk-m2wc-faq__a">{t(f.a)}</p> : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          <div className="sk-m2wc-side">
            <ConsultSummary
              option={vm.phase === 'ready' ? picked : null}
              index={pickedIndex}
              line={picked ? nextLine(picked) : ''}
              signedIn={signedIn}
              inCart={picked ? inCart(picked.service) : false}
              onBook={() => { if (picked) book(picked.service); }}
              onPayAhead={() => { if (picked) add(picked.service); }}
            />
            {cart.lines.length ? <CartRail signedIn={signedIn} /> : null}
            <UrgentNote />
          </div>
        </div>
      </div>

      <CartBar signedIn={signedIn} />
      {toast}
      {booking ? (
        <BookAppointmentDialog initialItemId={booking} onClose={() => setBooking(null)} onDone={() => { setBooking(null); navigate('appointments'); }} />
      ) : null}
    </div>
  );
});
