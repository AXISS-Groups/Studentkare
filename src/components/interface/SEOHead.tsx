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
    title: 'Studentkare Shop — Campus Health Store & Verified Care Services',
    description: 'Browse campus health supplies, OTC care essentials, emergency kits, and verified provider services on Studentkare Shop.',
    keywords: 'student health store, campus healthcare, OTC medicine, health records, studentkare shop',
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
    title: 'Studentkare Privacy Policy — Health Data Protection & Consent Framework',
    description: 'Read Studentkare\'s privacy policy, ABHA/ABDM data protection rules, consent architecture, and personal health record security.',
    keywords: 'health data privacy, ABDM compliance, PHI security, student health record privacy',
  },
  '/terms': {
    title: 'Studentkare Terms of Service — Campus Health Platform Guidelines',
    description: 'Terms of service and campus healthcare platform guidelines for Studentkare users and verified care providers.',
    keywords: 'studentkare terms, campus health terms of service, healthcare platform agreement',
  },
  '/lifeshare': {
    title: 'Studentkare LifeShare — Emergency Blood & Medical Incident SOS Network',
    description: 'Campus emergency blood donation exchange, urgent medical incident coordination, and rapid SOS response platform.',
    keywords: 'campus blood SOS, emergency medical assistance, student blood donation, life share exchange',
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
