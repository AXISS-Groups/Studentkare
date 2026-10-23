import { useEffect } from 'react';
import { useLocation } from '@/core/navigation';
import { useT } from '@/i18n';

/** `seo` names the `shopweb.seo.<seo>.title` / `.description` copy; keywords stay English for crawlers. */
interface RouteMeta {
  seo: 'home' | 'campuses' | 'clinicians' | 'partnerships' | 'labTests' | 'shop' | 'care' | 'pricing' | 'privacy' | 'terms' | 'lifeshare' | 'blog' | 'news';
  keywords?: string;
  canonicalPath?: string;
}

/*
 * /shop, /care and /terms used to promise "verified" providers and care
 * services. Nothing checks a provider against any register (see the comment
 * on PricingScreen), so the copy now says "published" instead.
 */
const PUBLIC_SEO_CONFIG: Record<string, RouteMeta> = {
  '/': { seo: 'home', keywords: 'student health records, campus healthcare, personal health record, health vault' },
  '/landing': { seo: 'home', keywords: 'student health records, campus healthcare, personal health record, health vault', canonicalPath: '/' },
  '/campuses': { seo: 'campuses', keywords: 'campus health administration, student health camps, DPDP data fiduciary' },
  '/clinicians': { seo: 'clinicians', keywords: 'clinician portal, consent-based record access, campus clinic sessions' },
  '/partnerships': { seo: 'partnerships', keywords: 'healthcare partnerships, lab pharmacy clinic partners, no paid placement' },
  '/lab-tests': { seo: 'labTests', keywords: 'campus lab tests, student blood test, hostel sample collection' },
  '/shop': { seo: 'shop', keywords: 'student health store, campus healthcare, OTC medicine, studentkare shop' },
  '/care': { seo: 'care', keywords: 'campus doctor consultation, OPD booking, student health clinic, care navigator, ayush health' },
  '/pricing': { seo: 'pricing', keywords: 'student health pricing, campus care plans, health subscription' },
  '/privacy': { seo: 'privacy', keywords: 'health data privacy, consent, student health record privacy' },
  '/terms': { seo: 'terms', keywords: 'studentkare terms, campus health terms of service, healthcare platform agreement' },
  '/lifeshare': { seo: 'lifeshare', keywords: 'emergency helpline India, blood group compatibility, campus emergency' },
  '/blog': { seo: 'blog', keywords: 'student health tips, campus wellbeing, clinician reviewed health advice' },
  '/news': { seo: 'news', keywords: 'studentkare news, campus health news, studentkare product updates' },
};

const DEFAULT_BASE_URL = 'https://studentkare.co';
const POST_PAGE = /^\/(blog|news)\/[^/]+$/;

export function SEOHead() {
  const t = useT();
  const location = useLocation();
  const rawPath = location.pathname.replace(/\/$/, '') || '/';

  useEffect(() => {
    // A post page (/blog/:slug, /news/:slug) writes its own title, image and JSON-LD (features/newsroom).
    if (POST_PAGE.test(rawPath)) return;
    const meta = PUBLIC_SEO_CONFIG[rawPath];
    const seo = meta?.seo ?? 'default';
    const routeConfig = {
      title: t(`shopweb.seo.${seo}.title`),
      description: t(`shopweb.seo.${seo}.description`),
      keywords: meta?.keywords,
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
  }, [rawPath, t]);

  return null;
}
