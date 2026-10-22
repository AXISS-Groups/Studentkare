import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { AccessibilityInfo } from 'react-native';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { applyPublicConfig, resetPublicConfig } from '@/data/services/config';
import { NewsletterBand, PublicSiteFooter, PublicSiteHeader, newsletterAddress, publishedUrl } from '..';
import { CanvasImage, CanvasVideo } from '../../art';

vi.mock('@/data/services/http', () => ({ apiRequest: vi.fn(() => Promise.reject(new Error('offline'))) }));

/** Every route path the feature modules register (the app's real pages). */
function registeredRoutes(): Set<string> {
  const root = join(process.cwd(), 'src/features');
  const paths = new Set<string>();
  for (const dir of readdirSync(root)) {
    let code: string;
    try {
      code = readFileSync(join(root, dir, 'module.ts'), 'utf-8');
    } catch {
      continue;
    }
    for (const m of code.matchAll(/path: '(\/[^']*)'/g)) paths.add(m[1]);
    for (const m of code.matchAll(/\['(\/[^']*)', '\//g)) paths.add(m[1]);
  }
  return paths;
}

const iconsIn = (el: HTMLElement) => Array.from(el.querySelectorAll('[data-icon]')).map((n) => n.getAttribute('data-icon'));

afterEach(() => {
  resetPublicConfig();
});

describe('PublicSiteHeader', () => {
  it('marks only the current page in the eight-item nav', () => {
    render(<PublicSiteHeader current="labTests" />);
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual(['Discover', 'Wellness', 'Training', 'Lab tests', 'Find a doctor', 'Find care', 'Programmes', 'Plans']);
    expect(within(nav).getByRole('link', { name: 'Lab tests' })).toHaveAttribute('aria-current', 'page');
    expect(links.filter((l) => l.hasAttribute('aria-current'))).toHaveLength(1);
  });

  it('marks nothing when the page is outside the nav', () => {
    render(<PublicSiteHeader current={null} />);
    expect(document.querySelector('[aria-current]')).toBeNull();
  });

  it('names its icon-only and logo links', () => {
    render(<PublicSiteHeader current="discover" />);
    expect(screen.getByRole('link', { name: 'Cart' })).toHaveAttribute('href', '/checkout');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Student Kare home' })).toHaveAttribute('href', '/');
  });

  it('draws the canvas icons, and no text arrows', () => {
    const { container } = render(<PublicSiteHeader current="discover" />);
    expect(iconsIn(container)).toEqual(expect.arrayContaining(['map-pin', 'arrow-right', 'user-6', 'shopping-bag', 'search-2', 'cloud-upload', 'brand:studentkare-logo']));
    expect(container.textContent).not.toMatch(/[→✓]/);
  });

  it('states the age gate', () => {
    render(<PublicSiteHeader current="discover" />);
    expect(document.body.textContent).toMatch(/adults aged 18 and over/i);
  });
});

describe('PublicSiteFooter', () => {
  it('has the four link columns, each a named navigation landmark', () => {
    render(<PublicSiteFooter />);
    for (const name of ['Student Kare', 'For students', 'For partners', 'Policies']) {
      expect(screen.getByRole('navigation', { name })).toBeInTheDocument();
    }
  });

  it('shows no store badge and no social icon until a listing is published', () => {
    const { container } = render(<PublicSiteFooter />);
    expect(container.textContent).not.toMatch(/App Store|Google Play|GET THE APP/);
    expect(screen.queryByRole('link', { name: /Instagram|LinkedIn|YouTube/ })).toBeNull();
  });

  it('shows a store badge and a social icon only for a published https URL', async () => {
    applyPublicConfig({
      settings: {
        'public_site.app_store_url': 'https://apps.example/sk',
        'public_site.play_store_url': 'http://insecure.example/sk',
        'public_site.instagram_url': 'javascript:alert(1)',
        'public_site.linkedin_url': 'https://linkedin.example/sk',
      },
    });
    const { container } = render(<PublicSiteFooter />);
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole('link', { name: /App Store/ })).toHaveAttribute('href', 'https://apps.example/sk');
    expect(container.textContent).not.toMatch(/Google Play/);
    expect(screen.queryByRole('link', { name: 'Instagram' })).toBeNull();
    const linkedIn = screen.getByRole('link', { name: 'LinkedIn' });
    expect(linkedIn).toHaveAttribute('rel', 'noopener noreferrer');
    expect(iconsIn(container)).toEqual(expect.arrayContaining(['brand-apple', 'brand-linkedin']));
  });

  it('keeps the crisis line one tap away, with both helplines', () => {
    render(<PublicSiteFooter />);
    const crisis = screen.getByRole('link', { name: /Not an emergency service/ });
    expect(crisis).toHaveAttribute('href', '/crisis');
    expect(crisis.textContent).toMatch(/112/);
    expect(crisis.textContent).toMatch(/14416/);
  });

  it('draws no ABDM, ABHA, NMC-verified or NABL chip, and no portability claim', () => {
    const { container } = render(<PublicSiteFooter />);
    expect(container.textContent).not.toMatch(/ABDM|ABHA|NABL|NMC-verified|portable/i);
  });

  it('renders the band and note it is given', () => {
    render(<PublicSiteFooter band={<NewsletterBand />} note="Still being built." />);
    expect(screen.getByRole('region', { name: 'Campus health updates' })).toBeInTheDocument();
    expect(screen.getByText('Still being built.')).toBeInTheDocument();
  });
});

describe('public site links', () => {
  it('lead only to routes the app registers', () => {
    const routes = registeredRoutes();
    render(<><PublicSiteHeader current="discover" /><PublicSiteFooter /></>);
    const hrefs = Array.from(document.querySelectorAll('a[href]')).map((a) => a.getAttribute('href') ?? '');
    expect(hrefs.length).toBeGreaterThan(20);
    for (const href of hrefs) expect(routes.has(href), href).toBe(true);
  });

  it('give every link a 44 px target class', () => {
    const css = readFileSync(join(process.cwd(), 'src/design-system/public-site/public-site.css'), 'utf-8');
    for (const cls of ['sk-psite-nav__link', 'sk-psite-btn', 'sk-psite-iconbtn', 'sk-psite-cats__link', 'sk-psite-footer__link', 'sk-psite-footer__crisis', 'sk-psite-nl__tab', 'sk-psite-utility__link']) {
      const rule = css.match(new RegExp(`\\.${cls} \\{[^}]*\\}`))?.[0] ?? '';
      expect(rule, cls).toMatch(/var\(--sk-size-touch-target\)/);
    }
  });
});

describe('theme', () => {
  it('uses tokens only, so light and dark both come from the token file', () => {
    const css = readFileSync(join(process.cwd(), 'src/design-system/public-site/public-site.css'), 'utf-8');
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/);
    // The navy surfaces carry only the light-on-navy roles.
    const footer = css.match(/\.sk-psite-footer \{[^}]*\}/)?.[0] ?? '';
    expect(footer).toMatch(/--sk-color-brand-navy/);
    expect(footer).toMatch(/--sk-color-on-hero/);
  });
});

describe('NewsletterBand', () => {
  it('collects nothing when no service receives sign-ups', () => {
    const { container } = render(<NewsletterBand />);
    expect(container.querySelector('form, input')).toBeNull();
    expect(screen.queryByRole('button', { name: /subscribe/i })).toBeNull();
    expect(screen.getByText(/Sign-up is not open yet/)).toBeInTheDocument();
    expect(iconsIn(container)).toEqual(expect.arrayContaining(['message-circle-2', 'mail']));
  });

  it('offers WhatsApp or email, with WhatsApp first and nothing ticked as consent', () => {
    render(<NewsletterBand subscribe={vi.fn()} />);
    const group = screen.getByRole('radiogroup', { name: 'Subscribe by' });
    const [wa, em] = within(group).getAllByRole('radio');
    expect(wa).toBeChecked();
    expect(em).not.toBeChecked();
    expect(screen.queryByRole('checkbox')).toBeNull();
    fireEvent.click(em);
    expect(screen.getByRole('textbox', { name: 'Email address' })).toBeInTheDocument();
  });

  it('refuses a number that is not a mobile, without sending', async () => {
    const subscribe = vi.fn(() => Promise.resolve());
    render(<NewsletterBand subscribe={subscribe} />);
    const input = screen.getByLabelText('WhatsApp number');
    fireEvent.change(input, { target: { value: '12345' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Subscribe' })); });
    expect(subscribe).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/10-digit/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('sends the opt-in and confirms only after it is stored', async () => {
    let resolve: () => void = () => undefined;
    const subscribe = vi.fn(() => new Promise<void>((r) => { resolve = r; }));
    render(<NewsletterBand subscribe={subscribe} />);
    fireEvent.change(screen.getByLabelText('WhatsApp number'), { target: { value: '98765 43210' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Subscribe' })); });
    expect(subscribe).toHaveBeenCalledWith({ channel: 'whatsapp', address: '+919876543210' });
    expect(screen.getByRole('button', { name: 'Subscribing…' })).toBeDisabled();
    expect(screen.queryByRole('status')).toBeNull();
    await act(async () => { resolve(); });
    expect(screen.getByRole('status')).toHaveTextContent(/You are subscribed/);
  });

  it('says nothing was saved when the service fails', async () => {
    const subscribe = vi.fn(() => Promise.reject(new Error('down')));
    render(<NewsletterBand subscribe={subscribe} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Email' }));
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'a@college.edu.in' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Subscribe' })); });
    expect(screen.getByRole('alert')).toHaveTextContent(/Nothing was saved/);
    expect(document.body.textContent).not.toMatch(/You are subscribed/);
  });
});

describe('newsletterAddress', () => {
  it('accepts an Indian mobile or an email shape and nothing else', () => {
    expect(newsletterAddress('whatsapp', '9876543210')).toBe('+919876543210');
    expect(newsletterAddress('whatsapp', '1234567890')).toBeNull();
    expect(newsletterAddress('whatsapp', '98765')).toBeNull();
    expect(newsletterAddress('email', ' you@college.edu.in ')).toBe('you@college.edu.in');
    expect(newsletterAddress('email', 'you@college')).toBeNull();
  });
});

describe('publishedUrl', () => {
  it('treats anything but an https URL as not published', () => {
    expect(publishedUrl('')).toBeNull();
    expect(publishedUrl('http://a.example')).toBeNull();
    expect(publishedUrl('javascript:alert(1)')).toBeNull();
    expect(publishedUrl('https://')).toBeNull();
    expect(publishedUrl(' https://a.example/x ')).toBe('https://a.example/x');
  });
});

describe('canvas art', () => {
  it('hides decorative pictures and names described ones', () => {
    render(<><CanvasImage name="a-friendly-doctor-waving-hello-b859fc.png" /><CanvasImage name="a-doctor-on-a-video-consult-460112.png" alt="A doctor on a video consult" /></>);
    const [decor, described] = Array.from(document.querySelectorAll('img'));
    expect(decor).toHaveAttribute('alt', '');
    expect(decor).toHaveAttribute('aria-hidden', 'true');
    expect(described).toHaveAttribute('alt', 'A doctor on a video consult');
    expect(decor.getAttribute('src')).toMatch(/a-friendly-doctor-waving-hello-b859fc/);
  });

  it('keeps a video still when the visitor asks for reduced motion', async () => {
    const spy = vi.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    render(<CanvasVideo name="video-4486f2.mp4" />);
    await act(async () => { await Promise.resolve(); });
    const video = document.querySelector('video');
    expect(video).not.toBeNull();
    expect(video?.autoplay).toBe(false);
    expect(video?.loop).toBe(false);
    spy.mockRestore();
    expect(video?.muted).toBe(true);
    expect(video).toHaveAttribute('aria-hidden', 'true');
  });

  it('loops a muted video when motion is allowed', async () => {
    const spy = vi.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    render(<CanvasVideo name="video-fabac8.mp4" />);
    await act(async () => { await Promise.resolve(); });
    const video = document.querySelector('video');
    expect(video?.autoplay).toBe(true);
    expect(video?.loop).toBe(true);
    expect(video?.muted).toBe(true);
    spy.mockRestore();
  });
});
