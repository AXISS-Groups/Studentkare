import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guards the production build, which no other test could see.
 *
 * Every feature module registers its routes by side effect: `module.ts` calls
 * `registerModule(...)` at import time, and App.tsx imports it for that effect
 * alone with `import './features/landing/module';`.
 *
 * package.json declared `"sideEffects": ["./src/lib/sentry.ts"]`. That field is
 * an allowlist, not an addition — it told Rollup every *other* file is free of
 * side effects, so all four bare module imports were legal to drop. They were
 * dropped: the production bundle fell from 78 chunks to 6, and the route table
 * was empty apart from `/` and the catch-all.
 *
 * The live consequence was that studentkare.co/landing bounced to /shop. With no
 * module registered, `/` redirected to `/landing`, `/landing` matched nothing,
 * and the catch-all sent it to `/shop`.
 *
 * Nothing caught it. Tests, tsc and the dev server all resolve imports normally;
 * only a production build tree-shakes, so the defect existed solely in the
 * artifact that ships. These assertions are deliberately about build config
 * rather than behaviour, because that is where the bug lives.
 */

const root = process.cwd();
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8')) as {
  sideEffects?: string[] | boolean;
};
const appSource = readFileSync(join(root, 'src/App.tsx'), 'utf-8');

/** The bare `import './features/x/module';` lines App.tsx relies on. */
function sideEffectModuleImports(): string[] {
  return [...appSource.matchAll(/^import '\.\/(features\/[\w-]+\/module)';$/gm)].map(
    (match) => match[1],
  );
}

describe('feature modules survive tree-shaking', () => {
  it('App.tsx still registers modules by side-effect import', () => {
    // If this ever fails the mechanism changed, and the rest of this file is
    // guarding something that no longer exists — revisit rather than delete.
    expect(sideEffectModuleImports().length).toBeGreaterThanOrEqual(4);
  });

  it('sideEffects is not an allowlist that omits the modules', () => {
    const declared = pkg.sideEffects;
    if (declared === true || declared === undefined) return; // everything kept
    expect(declared).not.toBe(false);
    expect(Array.isArray(declared)).toBe(true);
    const patterns = declared as string[];
    expect(patterns.some((p) => p.includes('features') && p.includes('module'))).toBe(true);
  });

  it('covers every module App.tsx imports for effect', () => {
    const declared = pkg.sideEffects;
    if (declared === true || declared === undefined) return;
    const patterns = declared as string[];
    for (const mod of sideEffectModuleImports()) {
      const covered = patterns.some((pattern) => {
        const rx = new RegExp(
          '^' + pattern.replace(/^\.\//, '').replace(/\*\*/g, '.*').replace(/(?<!\.)\*/g, '[^/]*'),
        );
        return rx.test(`src/${mod}.ts`);
      });
      expect(covered, `${mod} is not covered by sideEffects`).toBe(true);
    }
  });

  it('keeps CSS side effects, so imported stylesheets are not dropped', () => {
    const declared = pkg.sideEffects;
    if (declared === true || declared === undefined) return;
    const patterns = declared as string[];
    expect(patterns.some((p) => p.endsWith('.css'))).toBe(true);
  });
});

describe('the root is a route, not a redirect', () => {
  const router = readFileSync(join(root, 'src/core/routing/Router.tsx'), 'utf-8');
  const landingModule = readFileSync(join(root, 'src/features/landing/module.ts'), 'utf-8');

  it('does not bounce / to another path', () => {
    // `/` used to Navigate to `/shop`, then to `/landing`. The second made the
    // canonical home /landing, and made the home page depend on another route
    // resolving — which is exactly what failed in production.
    expect(router).not.toMatch(/path="\/"\s+element=\{<Navigate/);
  });

  it('serves the landing page at / and keeps /landing working', () => {
    expect(landingModule).toMatch(/path: '\/'/);
    expect(landingModule).toMatch(/path: '\/landing'/);
  });
});

describe('the public pages are discoverable', () => {
  const sitemap = readFileSync(join(root, 'public/sitemap.xml'), 'utf-8');
  const prerender = readFileSync(join(root, 'scripts/prerender-public-routes.js'), 'utf-8');
  const seo = readFileSync(join(root, 'src/components/interface/SEOHead.tsx'), 'utf-8');
  const pages = ['/campuses', '/clinicians', '/partnerships', '/lab-tests'];

  it('lists each public page in the sitemap', () => {
    for (const page of pages) {
      expect(sitemap, page).toContain(`https://studentkare.co${page}`);
    }
  });

  it('prerenders a document for each, so a crawler gets its own metadata', () => {
    // Without an entry the SPA fallback serves the root document, so every new
    // page inherited the shop's title and description.
    for (const page of pages) {
      expect(prerender, page).toContain(`path: '${page}'`);
    }
  });

  it('gives each one per-route metadata in the app', () => {
    for (const page of pages) {
      expect(seo, page).toContain(`'${page}'`);
    }
  });

  it('no longer describes the home page as a shop', () => {
    expect(prerender).not.toMatch(/path: '\/',[\s\S]{0,200}Campus Health Store/);
    expect(seo).not.toMatch(/'\/': \{[\s\S]{0,120}Campus Health Store/);
  });

  it('claims no ABDM integration in the privacy metadata', () => {
    // The /privacy entry advertised "ABHA/ABDM data protection rules". There is
    // no ABDM integration, and the notice itself is not published yet.
    expect(seo).not.toMatch(/ABDM|ABHA/);
  });
});
