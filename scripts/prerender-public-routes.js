import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const templatePath = path.join(distDir, 'index.html');

if (!fs.existsSync(templatePath)) {
  console.log('[prerender] Skip: dist/index.html does not exist yet.');
  process.exit(0);
}

const template = fs.readFileSync(templatePath, 'utf-8');

const PUBLIC_ROUTES = [
  {
    path: '/',
    title: 'Studentkare — Campus Health Store & Verified Care Services',
    description: 'Browse campus health supplies, OTC care essentials, emergency kits, and verified provider services on Studentkare Shop.',
    canonical: 'https://studentkare.co/',
    fallbackHtml: `
      <header role="banner">
        <nav aria-label="Main Navigation">
          <a href="/">Studentkare</a>
          <a href="/shop">Shop Store</a>
          <a href="/care">Care Services</a>
          <a href="/pricing">Pricing</a>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
        </nav>
      </header>
      <main id="main-content">
        <h1>Studentkare — Campus Health Store & Personal Health Records</h1>
        <p>Studentkare is a campus health records platform and verified care marketplace designed for Indian universities and students.</p>
        <section>
          <h2>Campus Health Marketplace & Care Services</h2>
          <article>
            <h3>Verified OTC Medicines & First Aid Kits</h3>
            <p>Access campus-ready medical kits, prescription fulfillment, and OTC supplies with direct delivery to hostel dormitories.</p>
            <a href="/shop">Explore Shop Marketplace</a>
          </article>
          <article>
            <h3>Doctor OPD Consultations & Campus Clinics</h3>
            <p>Book verified doctor consultations, campus health camp checkups, and tele-consultations with NMC-licensed clinicians.</p>
            <a href="/care">Book Care Consultations</a>
          </article>
        </section>
      </main>
    `,
  },
  {
    path: '/shop',
    title: 'Studentkare Shop — Campus Health Store & Verified Products',
    description: 'Browse campus health supplies, OTC care essentials, emergency kits, and verified provider services on Studentkare Shop.',
    canonical: 'https://studentkare.co/shop',
    fallbackHtml: `
      <header role="banner">
        <nav aria-label="Main Navigation">
          <a href="/">Home</a>
          <a href="/shop">Shop</a>
          <a href="/care">Care Services</a>
          <a href="/pricing">Pricing</a>
          <a href="/privacy">Privacy</a>
        </nav>
      </header>
      <main id="main-content">
        <h1>Studentkare Health & Wellness Shop</h1>
        <p>Curated health products, first aid supplies, daily wellness essentials, and verified care packages for students.</p>
        <section>
          <h2>Featured Health Categories</h2>
          <ul>
            <li><strong>First Aid & Emergency Kits:</strong> Complete hostel first-aid boxes, antiseptic supplies, and burn care.</li>
            <li><strong>Daily Wellness & Hygiene:</strong> Personal hygiene products, sanitizers, and nutritional supplements.</li>
            <li><strong>OTC Healthcare Supplies:</strong> Thermometers, pulse oximeters, blood pressure monitors, and bandaging.</li>
            <li><strong>Prescription & Fulfillment Services:</strong> Verified pharmacy fulfillment connected to student health profiles.</li>
          </ul>
        </section>
      </main>
    `,
  },
  {
    path: '/care',
    title: 'Studentkare Care — Consultations & Health Provider Network',
    description: 'Request verified health care services, OPD consultations, lab tests, and campus medical support on Studentkare Care.',
    canonical: 'https://studentkare.co/care',
    fallbackHtml: `
      <header role="banner">
        <nav aria-label="Main Navigation">
          <a href="/">Home</a>
          <a href="/shop">Shop</a>
          <a href="/care">Care</a>
          <a href="/pricing">Pricing</a>
        </nav>
      </header>
      <main id="main-content">
        <h1>Studentkare Care Services</h1>
        <p>Comprehensive healthcare network offering doctor appointments, health camp screenings, lab tests, and emergency assistance.</p>
        <section>
          <h2>Our Services</h2>
          <ul>
            <li><strong>Campus Health Camps:</strong> Periodic preventive screenings and health checkups on university campuses.</li>
            <li><strong>Verified OPD Booking:</strong> Direct appointment booking with nearby verified doctors and specialists.</li>
            <li><strong>Diagnostic Lab Tests:</strong> On-campus blood sample collection and digital diagnostic report delivery.</li>
            <li><strong>Agent Ayush AI Care Assistant:</strong> 24/7 symptom guidance and care navigation for university students.</li>
          </ul>
        </section>
      </main>
    `,
  },
  {
    path: '/pricing',
    title: 'Studentkare Pricing — Transparent Campus Healthcare Plans',
    description: 'Explore transparent pricing plans for student health records, campus clinic integrations, and provider care subscriptions.',
    canonical: 'https://studentkare.co/pricing',
    fallbackHtml: `
      <header role="banner">
        <nav aria-label="Main Navigation">
          <a href="/">Home</a>
          <a href="/shop">Shop</a>
          <a href="/care">Care</a>
          <a href="/pricing">Pricing</a>
        </nav>
      </header>
      <main id="main-content">
        <h1>Studentkare Pricing & Healthcare Subscriptions</h1>
        <p>Transparent pricing tailored for university students, campus clinics, and healthcare service providers.</p>
        <section>
          <h2>Subscription Tiers</h2>
          <article>
            <h3>Student Basic — Free</h3>
            <p>Digital health record vault, basic symptom checker, and emergency SOS card access.</p>
          </article>
          <article>
            <h3>Campus Care Plus — Subscription</h3>
            <p>Unlimited OPD consultations, priority pharmacy delivery, and automated health camp reports.</p>
          </article>
        </section>
      </main>
    `,
  },
  {
    path: '/privacy',
    title: 'Studentkare Privacy Policy — Health Data Protection & Rights',
    description: 'Read Studentkare\'s privacy policy, ABHA/ABDM data protection rules, consent architecture, and personal health record security.',
    canonical: 'https://studentkare.co/privacy',
    fallbackHtml: `
      <header role="banner">
        <nav aria-label="Main Navigation">
          <a href="/">Home</a>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
        </nav>
      </header>
      <main id="main-content">
        <h1>Studentkare Privacy Policy</h1>
        <p>Your health data privacy is sacred. We adhere strictly to Indian ABDM standards and privacy guardrails.</p>
        <section>
          <h2>Data Protection Principles</h2>
          <p>We do not share your health data with commercial advertisers. Clinical data is strictly compartmentalized under user consent.</p>
        </section>
      </main>
    `,
  },
  {
    path: '/terms',
    title: 'Studentkare Terms of Service — Campus Health Guidelines',
    description: 'Terms of service and campus healthcare platform guidelines for Studentkare users and verified care providers.',
    canonical: 'https://studentkare.co/terms',
    fallbackHtml: `
      <header role="banner">
        <nav aria-label="Main Navigation">
          <a href="/">Home</a>
          <a href="/terms">Terms of Service</a>
          <a href="/privacy">Privacy Policy</a>
        </nav>
      </header>
      <main id="main-content">
        <h1>Studentkare Terms of Service</h1>
        <p>Terms and conditions governing the use of the Studentkare health records platform and care services.</p>
      </main>
    `,
  },
  {
    path: '/lifeshare',
    title: 'Studentkare LifeShare — Emergency Blood & Medical SOS',
    description: 'Campus emergency blood donation exchange, urgent medical incident coordination, and rapid SOS response platform.',
    canonical: 'https://studentkare.co/lifeshare',
    fallbackHtml: `
      <header role="banner">
        <nav aria-label="Main Navigation">
          <a href="/">Home</a>
          <a href="/lifeshare">LifeShare SOS</a>
        </nav>
      </header>
      <main id="main-content">
        <h1>LifeShare Emergency Blood Exchange</h1>
        <p>Real-time emergency blood donor matching and medical incident alert network for campus communities.</p>
      </main>
    `,
  },
];

console.log('[prerender] Starting static HTML prerendering for public routes...');

for (const route of PUBLIC_ROUTES) {
  let html = template;

  // Replace Title
  html = html.replace(/<title>.*?<\/title>/s, `<title>${route.title}</title>`);

  // Replace Description
  html = html.replace(
    /<meta name="description" content=".*?" \/>/s,
    `<meta name="description" content="${route.description}" />`
  );

  // Replace Canonical Link
  html = html.replace(
    /<link rel="canonical" href=".*?" \/>/s,
    `<link rel="canonical" href="${route.canonical}" />`
  );

  // Replace OpenGraph Title, Description, and URL
  html = html.replace(
    /<meta property="og:title" content=".*?" \/>/s,
    `<meta property="og:title" content="${route.title}" />`
  );
  html = html.replace(
    /<meta property="og:description" content=".*?" \/>/s,
    `<meta property="og:description" content="${route.description}" />`
  );
  html = html.replace(
    /<meta property="og:url" content=".*?" \/>/s,
    `<meta property="og:url" content="${route.canonical}" />`
  );

  // Replace Twitter Title, Description, and URL
  html = html.replace(
    /<meta name="twitter:title" content=".*?" \/>/s,
    `<meta name="twitter:title" content="${route.title}" />`
  );
  html = html.replace(
    /<meta name="twitter:description" content=".*?" \/>/s,
    `<meta name="twitter:description" content="${route.description}" />`
  );

  // Inject fallback HTML inside #root
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root">${route.fallbackHtml.trim()}</div>`
  );

  if (route.path === '/') {
    fs.writeFileSync(templatePath, html, 'utf-8');
    console.log(`[prerender] Pre-rendered root (/) -> dist/index.html`);
  } else {
    const routeDir = path.join(distDir, route.path.replace(/^\//, ''));
    if (!fs.existsSync(routeDir)) {
      fs.mkdirSync(routeDir, { recursive: true });
    }
    const outputPath = path.join(routeDir, 'index.html');
    fs.writeFileSync(outputPath, html, 'utf-8');
    console.log(`[prerender] Pre-rendered ${route.path} -> dist/${route.path.replace(/^\//, '')}/index.html`);
  }
}

console.log('[prerender] Finished prerendering static HTML files successfully.');
