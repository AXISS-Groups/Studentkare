import React from 'react';
import { ArrowRight, FileLock2, FlaskConical, IndianRupee, PhoneCall, Stethoscope } from 'lucide-react';
import { useApiResource } from '@/hooks/useApiResource';
import './landing.css';

interface CatalogItem {
  id: string;
  name: string;
  brand: string;
  kind: string;
  pack: string;
  pricePaise: number;
  mrpPaise: number;
}

interface Catalog {
  items: CatalogItem[];
  total: number;
}

/**
 * Public landing page (design page 3, `Landing`, Tier 3).
 *
 * `/` redirected to `/shop`, so the product had no front door and `/welcome`
 * had no inbound link. This is that front door.
 *
 * The design is a long marketing page, and most of its claims are not true of
 * this codebase yet. Dropped rather than reworded, with what was checked:
 *
 * - "ABHA-linked" and "portable after you graduate". There is no ABDM
 *   integration and no export path. The only ABHA text in the repo is a string
 *   in a RAG document.
 * - "Every doctor is NMC-registered and every lab NABL-accredited before they
 *   can list." No registration number is stored and nothing is checked against
 *   any register; `NMC_DOCTOR` is a role an admin sets. Guardrail 6.
 * - "Your campus sees counts, never results." There is no campus analytics
 *   endpoint at all, so there is nothing that could leak and nothing that
 *   proves the boundary either.
 * - "Offline emergency card" and "live phlebotomist tracking". Neither exists;
 *   signing out touches no local storage.
 * - App Store and Google Play badges. Nothing is published to either.
 * - The newsletter signup. No subscribe endpoint exists, so the form would
 *   collect a phone number and drop it.
 * - "usually within 20 minutes, from ₹199", "51 published", "6.2°C", the
 *   article teasers and read times, and "ordered by what the campus pharmacy is
 *   dispensing most this week". Service levels, counts and an ordering rule
 *   that nothing implements.
 *
 * What is left is real: the published catalog with its real prices, read from
 * the same public endpoint the shop uses, and the four promises the code does
 * keep. It is a shorter page than the design. It is a page that does not lie.
 */
export function LandingView(): React.ReactElement {
  const catalog = useApiResource<Catalog>('/catalog?limit=6');
  const items = catalog.data?.items ?? [];

  return (
    <main className="sk-landing">
      <section className="sk-landing__hero">
        <span className="sk-landing__eyebrow">A HEALTH RECORD YOU OWN</span>
        <h1 className="sk-landing__title">A little more care for your everyday.</h1>
        <p className="sk-landing__lede">
          Keep your reports, prescriptions and documents in one place that belongs to you — and share
          them with a clinician only when you choose to.
        </p>
        <div className="sk-landing__actions">
          <a className="sk-landing__cta" href="/signup">
            Create your account
            <ArrowRight size={16} aria-hidden="true" />
          </a>
          <a className="sk-landing__cta sk-landing__cta--quiet" href="/shop">
            Browse care and medicines
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
        <p className="sk-landing__age">Studentkare is for adults aged 18 and over.</p>
      </section>

      {/* First, because it is the one thing on this page that works without an account. */}
      <aside className="sk-landing__emergency">
        <span className="sk-landing__emergency-icon">
          <PhoneCall size={20} aria-hidden="true" />
        </span>
        <div>
          <p className="sk-landing__emergency-title">In an emergency, call 112.</p>
          <p className="sk-landing__emergency-body">
            No account, no login, no waiting for this page. Ambulance on 108, and Tele-MANAS for
            mental health on 14416, 24×7.
          </p>
        </div>
        <a className="sk-landing__emergency-call" href="tel:112">
          Call 112
        </a>
      </aside>

      <section className="sk-landing__promises" aria-labelledby="sk-landing-promises">
        <h2 className="sk-landing__heading" id="sk-landing-promises">
          What we actually promise
        </h2>
        <ul className="sk-landing__promise-list">
          <Promise
            icon={<FileLock2 size={20} aria-hidden="true" />}
            title="Private by default"
            body="A clinician opens a record only through a share you granted, for a number of days you chose. You can end it whenever you like, and every open is written to an audit trail."
          />
          <Promise
            icon={<IndianRupee size={20} aria-hidden="true" />}
            title="Price before you book"
            body="Every price is on screen before you confirm. Nothing on this page is ordered or chosen using anything in your health records."
          />
          <Promise
            icon={<FlaskConical size={20} aria-hidden="true" />}
            title="Collection near you"
            body="Lab collection can be booked to your block, and consultations to a slot between classes."
          />
          <Promise
            icon={<Stethoscope size={20} aria-hidden="true" />}
            title="A clinician can review a report"
            body="Ask for a report to be reviewed and a clinician writes back in plain language. You choose to ask; it is not automatic."
          />
        </ul>
      </section>

      {/*
        Real rows from the same public /catalog the shop reads. An empty or
        failed load shows nothing rather than placeholder products — a price is
        not a thing to invent.
      */}
      {items.length > 0 ? (
        <section className="sk-landing__catalog" aria-labelledby="sk-landing-catalog">
          <div className="sk-landing__catalog-head">
            <h2 className="sk-landing__heading" id="sk-landing-catalog">
              Published right now
            </h2>
            <a className="sk-landing__more" href="/shop">
              See everything
              <ArrowRight size={15} aria-hidden="true" />
            </a>
          </div>
          <ul className="sk-landing__grid">
            {items.map((item) => (
              <li className="sk-landing__item" key={item.id}>
                <span className="sk-landing__item-kind">{kindLabel(item.kind)}</span>
                <p className="sk-landing__item-name">{item.name}</p>
                {item.brand || item.pack ? (
                  <p className="sk-landing__item-meta">
                    {[item.brand, item.pack].filter(Boolean).join(' · ')}
                  </p>
                ) : null}
                <p className="sk-landing__item-price">
                  {rupees(item.pricePaise)}
                  {item.mrpPaise > item.pricePaise ? (
                    <del>{rupees(item.mrpPaise)}</del>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="sk-landing__footer">
        <p className="sk-landing__footer-note">
          Studentkare is still being built. Some things described in our designs do not exist yet, and
          we would rather leave them off this page than imply otherwise.
        </p>
        <nav className="sk-landing__footer-links" aria-label="Studentkare">
          <a href="/campuses">For campuses</a>
          <a href="/clinicians">For clinicians</a>
          <a href="/lab-tests">Lab tests</a>
          <a href="/partnerships">Partnerships</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/login">Sign in</a>
        </nav>
      </footer>
    </main>
  );
}

function Promise({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}): React.ReactElement {
  return (
    <li className="sk-landing__promise">
      <span className="sk-landing__promise-icon">{icon}</span>
      <div>
        <p className="sk-landing__promise-title">{title}</p>
        <p className="sk-landing__promise-body">{body}</p>
      </div>
    </li>
  );
}

/** Paise to rupees. Integer paise in, no floating-point money arithmetic. */
export function rupees(paise: number): string {
  const whole = Math.trunc(paise / 100);
  const remainder = Math.abs(paise % 100);
  const grouped = whole.toLocaleString('en-IN');
  return remainder === 0 ? `₹${grouped}` : `₹${grouped}.${String(remainder).padStart(2, '0')}`;
}

export function kindLabel(kind: string): string {
  const labels: Record<string, string> = {
    product: 'Medicine',
    lab: 'Lab test',
    consultation: 'Consultation',
    vaccine: 'Vaccine',
  };
  return labels[kind] ?? kind;
}
