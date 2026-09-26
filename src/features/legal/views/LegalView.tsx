import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useRoutePath } from '@/core/navigation';
import './legal.css';

type LegalTopic = 'privacy' | 'terms';

const TITLES: Record<LegalTopic, string> = {
  privacy: 'Privacy notice',
  terms: 'Terms of use',
};

/**
 * Privacy, terms and grievance (design page 3, `WebLegal`, Tier 1).
 *
 * `/privacy` and `/terms` were both routed to `LiveMarketplaceScreen`, so
 * someone following either link was served the shop. On a product that holds
 * student health records that is the worst of the mis-routings: these are the
 * two pages a person opens precisely when they want to know what is being done
 * with their data, and they are required rather than optional.
 *
 * This page does not contain a privacy notice or terms, and that is deliberate.
 * DESIGN.md section 5 puts `WebLegal` in Tier 1 — a named design reviewer *and*
 * legal sign-off, never authored without them — and the reason is exactly this
 * screen. A privacy notice is a binding statement of what an organisation does
 * with personal data and what it promises not to do; under the DPDP Act it also
 * has to name a real grievance officer who answers real complaints. Generating
 * that text would be inventing legal commitments on the company's behalf and
 * naming an officer who does not exist. Guardrail 6 rules out the softer
 * version too: no string may assert a compliance state that nothing computes.
 *
 * So the page states the gap. That is worse marketing than boilerplate and far
 * better than a notice nobody has agreed to honour — and unlike the shop, it
 * tells the reader something true.
 */
export function LegalView(): React.ReactElement {
  const route = useRoutePath();
  const topic: LegalTopic = route.includes('terms') ? 'terms' : 'privacy';

  return (
    <main className="sk-legal">
      <header className="sk-legal__head">
        <span className="sk-legal__eyebrow">STUDENTKARE</span>
        <h1 className="sk-legal__title">{TITLES[topic]}</h1>
      </header>

      <div className="sk-legal__notice" role="status">
        <span className="sk-legal__notice-icon">
          <AlertTriangle size={18} aria-hidden="true" />
        </span>
        <div>
          <p className="sk-legal__notice-title">
            {topic === 'privacy'
              ? 'Our privacy notice is not published yet.'
              : 'Our terms of use are not published yet.'}
          </p>
          <p className="sk-legal__notice-body">
            Rather than show you something that reads like a policy but binds nobody, this page says
            so plainly. Until it is published and reviewed, treat Studentkare as unfinished and do
            not put anything here you would mind losing.
          </p>
        </div>
      </div>

      <section className="sk-legal__section" aria-labelledby="sk-legal-required">
        <h2 className="sk-legal__heading" id="sk-legal-required">
          What has to exist before this page can be written
        </h2>
        <ul className="sk-legal__list">
          <li>
            <strong>A named grievance officer.</strong> The DPDP Act requires one, reachable, who
            answers complaints about your data. We are not going to print a name and an address that
            nobody is behind.
          </li>
          <li>
            <strong>A stated purpose for each kind of data.</strong> Consent is per purpose, so the
            notice has to list them individually rather than ask once for everything.
          </li>
          <li>
            <strong>A retention period, and what deletion actually does.</strong> Including which
            records survive a deletion request because a clinician or a pharmacy is required to keep
            them, and for how long.
          </li>
          <li>
            <strong>Legal review and sign-off.</strong> Not a draft generated from a template.
          </li>
        </ul>
      </section>

      <section className="sk-legal__section" aria-labelledby="sk-legal-meanwhile">
        <h2 className="sk-legal__heading" id="sk-legal-meanwhile">
          What we can tell you now
        </h2>
        <p className="sk-legal__body">
          These are things the code does today, not commitments — they can be checked, and they can
          change before anything is published.
        </p>
        <ul className="sk-legal__list">
          <li>
            A record in your vault is opened by a clinician only through a share you granted, for a
            number of days you chose, and every open is written to an audit trail.
          </li>
          <li>
            You can end a share yourself at any time, and you can leave a care programme without
            your campus being told.
          </li>
          <li>
            Notification consents default to off. Nothing is pre-ticked on your behalf.
          </li>
          <li>
            Studentkare is for adults aged 18 and over.
          </li>
        </ul>
      </section>

      <nav className="sk-legal__links" aria-label="Related pages">
        <a className="sk-legal__link" href={topic === 'privacy' ? '/terms' : '/privacy'}>
          {topic === 'privacy' ? 'Terms of use' : 'Privacy notice'}
          <ArrowRight size={15} aria-hidden="true" />
        </a>
        <a className="sk-legal__link" href="/">
          Back to Studentkare
          <ArrowRight size={15} aria-hidden="true" />
        </a>
      </nav>

      <p className="sk-legal__emergency">
        In an emergency, call <a href="tel:112">112</a>. You do not need an account and you do not
        need this page.
      </p>
    </main>
  );
}
