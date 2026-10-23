import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { deepLinkState, pushLink, resolveDeepLink } from '../linking';

describe('a tapped push opens the right screen (paths from backend/core/push_copy.py)', () => {
  it('maps every push path to a signed-in screen, and to Sign in when signed out', () => {
    expect(resolveDeepLink('/notifications', 'signedIn')).toEqual({ name: 'Notifications' });
    expect(resolveDeepLink('/medications', 'signedIn')).toEqual({ name: 'MedicineReminders' });
    expect(resolveDeepLink('/health-camp', 'signedIn')).toEqual({ name: 'Camps' });
    expect(resolveDeepLink('/orders', 'signedIn')).toEqual({ name: 'Orders' });
    for (const path of ['/notifications', '/medications', '/health-camp', '/orders']) {
      expect(resolveDeepLink(path, 'signedOut')).toEqual({ name: 'SignIn' });
    }
  });

  it('builds an app-scheme link the linking config reads, with Home underneath for Back', () => {
    expect(pushLink('/notifications')).toBe('studentkare://notifications');
    expect(deepLinkState('notifications', 'signedIn')).toEqual({ index: 1, routes: [{ name: 'Home' }, { name: 'Notifications' }] });
  });

  it('every path the server sends is one the phone maps', () => {
    const source = readFileSync(resolve(process.cwd(), 'backend/core/push_copy.py'), 'utf8');
    const paths = [...source.matchAll(/path="([^"]+)"/g)].map((match) => match[1] ?? '');
    expect(paths.length).toBeGreaterThan(0);
    for (const path of [...paths, '/notifications']) expect(resolveDeepLink(path, 'signedIn')).not.toBeNull();
  });
});

describe('notification accent colour comes from tokens', () => {
  it('app.json carries no hex for expo-notifications; app.config.ts sets the brand navy token', async () => {
    const appJson = readFileSync(resolve(process.cwd(), 'app.json'), 'utf8');
    expect(appJson).not.toMatch(/"color":\s*"#/);
    const { withNotificationColour, NOTIFICATION_COLOUR } = await import('../../../app.config');
    const tokens = JSON.parse(readFileSync(resolve(process.cwd(), 'design/tokens/studentkare.tokens.json'), 'utf8')) as { color: { light: Record<string, { $value: string }> } };
    expect(NOTIFICATION_COLOUR).toBe(tokens.color.light['brand-navy']?.$value);
    expect(withNotificationColour(['expo-asset', 'expo-notifications'])).toEqual(['expo-asset', ['expo-notifications', { color: NOTIFICATION_COLOUR }]]);
  });
});

describe('the service worker opens only paths on this site', () => {
  it('falls back to the inbox for anything that is not a same-origin path', () => {
    const sw = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8');
    const body = sw.slice(sw.indexOf('function safePath'), sw.indexOf("self.addEventListener('push'"));
    const safePath = new Function(`${body}; return safePath;`)() as (value: unknown) => string;
    expect(safePath('/orders')).toBe('/orders');
    expect(safePath('//evil.example/x')).toBe('/notifications');
    expect(safePath('https://evil.example')).toBe('/notifications');
    expect(safePath(undefined)).toBe('/notifications');
  });
});
