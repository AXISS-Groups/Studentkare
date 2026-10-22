import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { deepLinkState, resolveDeepLink } from '../linking';
import { legalPageUrl } from '@/features/auth/views/LegalLinksNative';

vi.mock('@sentry/react-native', () => ({ init: vi.fn() }));

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('deep links (studentkare:// and https://studentkare.co)', () => {
  it('opens sign in for a signed-out invite or sign-in link, and drops the invite token', () => {
    expect(resolveDeepLink('/claim#token=secret', 'signedOut')).toEqual({ name: 'SignIn' });
    expect(resolveDeepLink('login', 'signedOut')).toEqual({ name: 'SignIn' });
    expect(resolveDeepLink('/claim', 'signedIn')).toEqual({ name: 'Home' });
    expect(JSON.stringify(deepLinkState('/claim#token=secret', 'signedOut'))).not.toMatch(/secret/);
  });

  it('opens an order only when signed in', () => {
    expect(resolveDeepLink('/orders/ord_42', 'signedIn')).toEqual({ name: 'Orders', params: { orderId: 'ord_42' } });
    expect(resolveDeepLink('/orders', 'signedIn')).toEqual({ name: 'Orders' });
    expect(resolveDeepLink('/orders/ord_42', 'signedOut')).toEqual({ name: 'SignIn' });
  });

  it('opens consults, medicine info and find care with the web query parameters', () => {
    expect(resolveDeepLink('/consult', 'signedIn')).toEqual({ name: 'Consults' });
    expect(resolveDeepLink('/consult', 'signedOut')).toEqual({ name: 'Consult' });
    expect(resolveDeepLink('/medicine-info?medicine=m1', 'signedOut')).toEqual({ name: 'MedicineInfo', params: { medicineId: 'm1' } });
    expect(resolveDeepLink('/medicine-info?q=para', 'signedIn')).toEqual({ name: 'MedicineInfo', params: { query: 'para' } });
    expect(resolveDeepLink('/find-care?segment=pharmacies&place=p9', 'signedOut')).toEqual({ name: 'FindCare', params: { segment: 'pharmacies', placeId: 'p9' } });
    expect(resolveDeepLink('/find-care?segment=spa', 'signedOut')).toEqual({ name: 'FindCare' });
  });

  it('ignores unknown paths and links that arrive before the session is known', () => {
    expect(resolveDeepLink('/blog/some-post', 'signedIn')).toBeNull();
    expect(resolveDeepLink('/orders/1', 'checking')).toBeNull();
    expect(resolveDeepLink('/orders/1', 'twoFactorSetup')).toBeNull();
  });

  it('puts the start screen under the target so Back works', () => {
    expect(deepLinkState('/orders/7', 'signedIn')).toEqual({ index: 1, routes: [{ name: 'Home' }, { name: 'Orders', params: { orderId: '7' } }] });
    expect(deepLinkState('/claim', 'signedIn')).toEqual({ index: 0, routes: [{ name: 'Home' }] });
  });

  it('the app config, the linking code and the app-link templates list the same web paths', () => {
    const config = read('app.config.ts');
    const aasa = JSON.parse(read('deploy/well-known/apple-app-site-association.template')) as {
      applinks: { details: { components: { '/': string; exclude?: boolean }[] }[] };
    };
    const included = aasa.applinks.details[0]?.components.filter((c) => !c.exclude).map((c) => c['/'].replace('*', '')) ?? [];
    for (const path of included) expect(config).toContain(`'${path}'`);
    expect(config).not.toContain(`'/claim'`);
    expect(read('src/native/App.tsx')).toMatch(/createLinking\(/);
  });
});

describe('crash reporting never sends PII', () => {
  it('is off without a DSN', async () => {
    const { startCrashReporting } = await import('../crashReporting');
    const sentry = await import('@sentry/react-native');
    expect(startCrashReporting()).toBe(false);
    expect(sentry.init).not.toHaveBeenCalled();
  });

  it('removes the user, request data, frame variables and breadcrumb payloads', async () => {
    const { scrubEvent, scrubBreadcrumb, scrubText } = await import('../crashReporting');
    const event = scrubEvent({
      type: undefined,
      user: { id: 'u1', email: 'a@b.co' },
      extra: { note: 'x' },
      request: { url: 'https://api.studentkare.co/api/orders/9?phone=9876543210', data: 'body', headers: { Authorization: 'Bearer t' } },
      message: 'failed for 98765 43210 and a@b.co',
      exception: { values: [{ value: 'boom', stacktrace: { frames: [{ filename: 'x.js', vars: { token: 't' } }] } }] },
      breadcrumbs: [{ category: 'navigation', data: { to: 'MedicineInfo?query=x' }, message: 'm' }, { category: 'console', message: 'log' }],
    });
    expect(event).not.toBeNull();
    const json = JSON.stringify(event);
    expect(json).not.toMatch(/u1|a@b\.co|9876543210|98765 43210|Bearer|body|phone=|MedicineInfo|"vars"/);
    expect(event?.request).toEqual({ url: 'https://api.studentkare.co/api/orders/9' });
    expect(event?.breadcrumbs).toEqual([{ category: 'navigation' }]);
    expect(scrubBreadcrumb({ category: 'console', message: 'x' })).toBeNull();
    expect(scrubText('ABHA 12-3456-7890-1234')).toBe('[REDACTED: PHI]');
  });

  it('drops an event that still names PHI', async () => {
    const { scrubEvent } = await import('../crashReporting');
    expect(scrubEvent({ type: undefined, contexts: { app: { screen: 'prescription' } }, tags: { k: 'diagnosis' }, fingerprint: ['patient'] })).toBeNull();
  });
});

describe('Terms and Privacy Policy links', () => {
  it('open the public pages of the configured site, and nothing without one', () => {
    expect(legalPageUrl('privacy', 'https://studentkare.co/')).toBe('https://studentkare.co/privacy');
    expect(legalPageUrl('terms', 'https://studentkare.co')).toBe('https://studentkare.co/terms');
    expect(legalPageUrl('terms', '/')).toBeNull();
  });

  it('are on sign in, create account and More', () => {
    expect(read('src/features/auth/views/SignInNativeView.tsx')).toMatch(/<LegalLinksNative \/>/);
    expect(read('src/features/auth/views/CreateAccountNativeView.tsx')).toMatch(/<LegalLinksNative \/>/);
    expect(read('src/native/App.tsx')).toMatch(/<LegalLinksNative \/>/);
  });
});

describe('release config', () => {
  it('derives the store build numbers from package.json version', async () => {
    const { nativeBuildNumber } = await import('../../../app.config');
    expect(nativeBuildNumber('0.5.0')).toBe(500);
    expect(nativeBuildNumber('1.2.3')).toBe(10203);
    expect(() => nativeBuildNumber('1.2')).toThrow();
    expect(() => nativeBuildNumber('1.100.0')).toThrow();
    expect(read('app.json')).not.toMatch(/"version"|buildNumber|versionCode/);
  });

  it('eas.json has a development client and commits no secret', () => {
    const eas = JSON.parse(read('eas.json')) as { build: Record<string, { developmentClient?: boolean; env?: Record<string, string> }> };
    expect(eas.build.development?.developmentClient).toBe(true);
    expect(Object.keys(eas.build)).toEqual(expect.arrayContaining(['development', 'preview', 'production']));
    expect(read('eas.json')).not.toMatch(/DSN|TOKEN|SECRET|projectId/i);
  });
});
