import { useEffect } from 'react';
import { useLocation } from '@/core/navigation';

export interface RouteMetaData {
  title: string;
  description: string;
  keywords?: string;
  canonicalPath?: string;
}

const PUBLIC_SEO_CONFIG: Record<string, RouteMetaData> = {
  '/': {
    title: 'Studentkare — A health record you own, from campus onwards',
    description: 'Keep your reports, prescriptions and documents in one place that belongs to you, and share them with a clinician only when you choose to.',
    keywords: 'student health records, campus healthcare, personal health record, health vault',
  },
  '/landing': {
    title: 'Studentkare — A health record you own, from campus onwards',
    description: 'Keep your reports, prescriptions and documents in one place that belongs to you, and share them with a clinician only when you choose to.',
    keywords: 'student health records, campus healthcare, personal health record, health vault',
    canonicalPath: '/',
  },
  '/campuses': {
    title: 'Studentkare for campuses — the operational picture, not the records',
    description: 'Students hold their own records. A campus confirms enrolment and runs health camps, and cannot reach a student\'s results.',
    keywords: 'campus health administration, student health camps, DPDP data fiduciary',
  },
  '/clinicians': {
    title: 'Studentkare for clinicians — a queue sorted by severity',
    description: 'A share is the authorisation, not your role. A student shares specific documents for a period they choose, and every access is audited.',
    keywords: 'clinician portal, consent-based record access, campus clinic sessions',
  },
  '/partnerships': {
    title: 'Studentkare partnerships — no sponsored placement to sell',
    description: 'Provider search sorts by whether you serve the student\'s pincode, then by name. Never by what you pay.',
    keywords: 'healthcare partnerships, lab pharmacy clinic partners, no paid placement',
  },
  '/lab-tests': {
    title: 'Studentkare lab tests — the result reaches you first',
    description: 'Published lab tests with their prices. A report lands in your vault, and you decide whether a clinician sees it.',
    keywords: 'campus lab tests, student blood test, hostel sample collection',
  },
  '/shop': {
    title: 'Studentkare Shop — Campus Health Store & Verified Care Services',
    description: 'Browse campus health supplies, OTC care essentials, emergency kits, and verified provider services on Studentkare Shop.',
    keywords: 'student health store, campus healthcare, OTC medicine, health records, studentkare shop',
  },
  '/care': {
    title: 'Studentkare Care — Consultations & Health Provider Network',
    description: 'Request verified health care services, OPD consultations, lab tests, and campus medical support on Studentkare Care.',
    keywords: 'campus doctor consultation, OPD booking, student health clinic, care navigator, ayush health',
  },
  '/pricing': {
    title: 'Studentkare Pricing — Transparent Campus Healthcare Plans',
    description: 'Explore transparent pricing plans for student health records, campus clinic integrations, and provider care subscriptions.',
    keywords: 'student health pricing, campus care plans, health subscription, transparent medical cost',
  },
  '/privacy': {
    title: 'Studentkare privacy — what we can tell you so far',
    description: 'Our privacy notice is not published yet. This page says so, lists what has to exist before it can be written, and describes what the code does today.',
    keywords: 'health data privacy, consent, student health record privacy',
  },
  '/terms': {
    title: 'Studentkare Terms of Service — Campus Health Platform Guidelines',
    description: 'Terms of service and campus healthcare platform guidelines for Studentkare users and verified care providers.',
    keywords: 'studentkare terms, campus health terms of service, healthcare platform agreement',
  },
  '/lifeshare': {
    title: 'Studentkare LifeShare — emergency numbers and blood compatibility',
    description: 'Who to call in an emergency, and which blood groups can give to which. Studentkare cannot see what any hospital has in stock.',
    keywords: 'emergency helpline India, blood group compatibility, campus emergency',
  },
};

const DEFAULT_BASE_URL = 'https://studentkare.co';

export function SEOHead() {
  const location = useLocation();
  const rawPath = location.pathname.replace(/\/$/, '') || '/';

  useEffect(() => {
    const routeConfig = PUBLIC_SEO_CONFIG[rawPath] || {
      title: 'Studentkare — Personal Health & Care Workspace',
      description: 'Your authenticated personal health records, measurements, and campus care services in one secure workspace.',
    };

    // 1. Title
    document.title = routeConfig.title;

    // Helper to get or create tag
    const setMeta = (nameAttr: 'name' | 'property', attrValue: string, contentValue: string) => {
      let el = document.querySelector(`meta[${nameAttr}="${attrValue}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(nameAttr, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute('content', contentValue);
    };

    // 2. Meta description
    setMeta('name', 'description', routeConfig.description);
    if (routeConfig.keywords) {
      setMeta('name', 'keywords', routeConfig.keywords);
    }

    // 3. Canonical URL
    const canonicalUrl = `${DEFAULT_BASE_URL}${rawPath === '/' ? '/' : rawPath}`;
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);

    // 4. OpenGraph Tags
    setMeta('property', 'og:title', routeConfig.title);
    setMeta('property', 'og:description', routeConfig.description);
    setMeta('property', 'og:url', canonicalUrl);

    // 5. Twitter Tags
    setMeta('name', 'twitter:title', routeConfig.title);
    setMeta('name', 'twitter:description', routeConfig.description);
    setMeta('name', 'twitter:url', canonicalUrl);
  }, [rawPath]);

  return null;
}
