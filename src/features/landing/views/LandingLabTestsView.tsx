import React from 'react';
import { AlertTriangle, ArrowRight, FileLock2, FlaskConical } from 'lucide-react';
import { useApiResource } from '@/hooks/useApiResource';
import { DataState } from '@/components/interface/WorkflowUI';
import { kindLabel, rupees } from './LandingView';
import './landing.css';

interface CatalogItem {
  id: string;
  name: string;
  brand: string;
  kind: string;
  pack: string;
  description: string;
  pricePaise: number;
  mrpPaise: number;
}

interface Catalog {
  items: CatalogItem[];
  total: number;
}

/**
 * Lab tests (design page 3, `WebLabTests`, Tier 2 — the pack calls it a landing
 * page and it is the fourth public entry point).
 *
 * Real tests at real prices, read from the public /catalog filtered to `lab`.
 * An empty or failed load says so rather than showing sample packages: a price
 * and a panel of tests are exactly the things not to invent.
 *
 * Claims dropped, each checked:
 *
 * - "NABL labs". No accreditation is recorded or verified anywhere. Guardrail 6.
 * - "Results in 24 h". No turnaround is tracked, so this is a service level
 *   nobody has committed to.
 * - "Clinician-signed", and the footer's "reports the moment a clinician signs".
 *   Reports are not signed before a student sees them. What exists is the
 *   opposite order and it is opt-in: the report lands in the vault, and the
 *   student may then ask a clinician to review it. Stating it the design's way
 *   would have someone wait for a signature that is not coming.
 * - "A sample is not a parcel. Time and temperature between your block and the
 *   lab are clinical facts, so both are tracked and shown to you." Neither is
 *   tracked. The only temperature in the repo is a patient vital sign. This is
 *   the claim a student would most reasonably rely on to trust a result, so it
 *   is called out on the page rather than quietly dropped.
 */
export function LandingLabTestsView(): React.ReactElement {
  const catalog = useApiResource<Catalog>('/catalog?kind=lab&limit=12');
  const items = catalog.data?.items ?? [];

  return (
    <main className="sk-landing">
      <section className="sk-landing__hero">
        <span className="sk-landing__eyebrow">LAB TESTS</span>
        <h1 className="sk-landing__title">Science you can read.</h1>
        <p className="sk-landing__lede">
          Book a lab test and have a sample collected near you. The report lands in your vault, and
          you decide whether a clinician sees it.
        </p>
        <div className="sk-landing__actions">
          <a className="sk-landing__cta" href="/shop">
            Browse everything
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </section>

      <section className="sk-landing__section" aria-labelledby="sk-lab-results">
        <h2 className="sk-landing__heading" id="sk-lab-results">
          The result is yours before it is anyone else's
        </h2>
        <ul className="sk-landing__promise-list">
          <li className="sk-landing__promise">
            <span className="sk-landing__promise-icon">
              <FileLock2 size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="sk-landing__promise-title">It arrives in your vault first</p>
              <p className="sk-landing__promise-body">
                Not to your campus, and not to a clinician. A clinician sees a report only through a
                share you granted, for a number of days you chose.
              </p>
            </div>
          </li>
          <li className="sk-landing__promise">
            <span className="sk-landing__promise-icon">
              <FlaskConical size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="sk-landing__promise-title">You can ask for it to be explained</p>
              <p className="sk-landing__promise-body">
                Request a review and a clinician writes back in plain language. You choose to ask —
                nothing is reviewed automatically, and nothing waits on a signature.
              </p>
            </div>
          </li>
        </ul>
      </section>

      <div className="sk-landing__gap" role="note">
        <span className="sk-landing__gap-icon">
          <AlertTriangle size={18} aria-hidden="true" />
        </span>
        <div>
          <p className="sk-landing__gap-title">What we do not track yet.</p>
          <p className="sk-landing__gap-body">
            Our designs promise that the time and temperature between your block and the lab are
            recorded and shown to you. Neither is tracked today, and we are not going to imply a cold
            chain we cannot evidence. We also do not verify lab accreditation or publish a turnaround
            time. Ask the lab directly if a result matters to a decision you are making now.
          </p>
        </div>
      </div>

      <section className="sk-landing__catalog" aria-labelledby="sk-lab-published">
        <div className="sk-landing__catalog-head">
          <h2 className="sk-landing__heading" id="sk-lab-published">
            Published lab tests
          </h2>
          <a className="sk-landing__more" href="/shop">
            See everything
            <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>
        <DataState {...catalog} retry={catalog.reload}>
          {items.length > 0 ? (
            <ul className="sk-landing__grid">
              {items.map((item) => (
                <li className="sk-landing__item" key={item.id}>
                  <span className="sk-landing__item-kind">{kindLabel(item.kind)}</span>
                  <p className="sk-landing__item-name">{item.name}</p>
                  {item.pack || item.brand ? (
                    <p className="sk-landing__item-meta">
                      {[item.brand, item.pack].filter(Boolean).join(' · ')}
                    </p>
                  ) : null}
                  <p className="sk-landing__item-price">
                    {rupees(item.pricePaise)}
                    {item.mrpPaise > item.pricePaise ? <del>{rupees(item.mrpPaise)}</del> : null}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="sk-landing__footer-note">
              No lab tests are published yet. When a lab lists one it appears here with its price, and
              we will not fill this space with examples in the meantime.
            </p>
          )}
        </DataState>
      </section>

      <footer className="sk-landing__footer">
        <p className="sk-landing__footer-note">
          Studentkare is still being built, and this page lists what is missing on purpose.
        </p>
        <nav className="sk-landing__footer-links" aria-label="Studentkare">
          <a href="/">For students</a>
          <a href="/campuses">For campuses</a>
          <a href="/clinicians">For clinicians</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </nav>
      </footer>
    </main>
  );
}
