import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BrandLogo, Glyph, Icon, Icon3d, Illustration, type SkGlyphName, type SkIcon3dName, type SkIconName, type SkIllustrationName } from '..';
import { skGlyphs, skIcons, skIcons3d, skIllustrations } from '../generated/skIconData';

const names = <T extends string>(o: Record<T, unknown>) => Object.keys(o) as T[];

describe('Icon', () => {
  it.each(names(skIcons))('draws %s on a 24×24 grid', (name: SkIconName) => {
    const { container } = render(<Icon name={name} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg?.childElementCount).toBeGreaterThan(0);
  });

  it('renders nothing for an unknown name', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    // An unknown name can only arrive from untyped data; the cast models that.
    const { container } = render(<Icon name={'not-an-icon' as SkIconName} />);
    expect(container.firstChild).toBeNull();
    err.mockRestore();
  });

  it('is an image with an accessible name when labelled', () => {
    const { container } = render(<Icon name="bell" label="Notifications" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toBe('Notifications');
    expect(svg?.hasAttribute('aria-hidden')).toBe(false);
  });

  it('is hidden from screen readers when unlabelled', () => {
    const { container } = render(<Icon name="bell" />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('artwork components', () => {
  it.each(names(skIcons3d))('Icon3d %s', (name: SkIcon3dName) => {
    const { container } = render(<Icon3d name={name} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });
  it.each(names(skGlyphs))('Glyph %s', (name: SkGlyphName) => {
    const { container } = render(<Glyph name={name} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });
  it.each(names(skIllustrations))('Illustration %s', (name: SkIllustrationName) => {
    const { container } = render(<Illustration name={name} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('drops the drawing\'s own lettering when asked, keeping the shapes', () => {
    const full = render(<Illustration name="illustration-care-circle-network" />).container;
    expect(full.querySelectorAll('text').length).toBeGreaterThan(0);
    const bare = render(<Illustration name="illustration-care-circle-network" withoutText />).container;
    expect(bare.querySelector('svg')).not.toBeNull();
    expect(bare.querySelectorAll('text')).toHaveLength(0);
    expect(bare.textContent?.trim()).toBe('');
    expect(bare.querySelectorAll('rect, path, circle').length).toBe(full.querySelectorAll('rect, path, circle').length);
  });

  it('draws non-square illustrations at the width and height given', () => {
    const { container } = render(<Illustration name="illustration-vitamin-jar" width={280} height={261} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('280');
    expect(svg?.getAttribute('height')).toBe('261');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 300 280');
  });

  it('unknown artwork renders nothing', () => {
    const { container } = render(<Glyph name={'nope' as SkGlyphName} />);
    expect(container.firstChild).toBeNull();
  });

  it('labelled artwork is an image; unlabelled is hidden', () => {
    const { container } = render(<><Icon3d name={names(skIcons3d)[0]} label="Alert" /><Icon3d name={names(skIcons3d)[0]} /></>);
    const [labelled, hidden] = Array.from(container.querySelectorAll('[data-icon]'));
    expect(labelled.getAttribute('role')).toBe('img');
    expect(labelled.getAttribute('aria-label')).toBe('Alert');
    expect(labelled.hasAttribute('aria-hidden')).toBe(false);
    expect(hidden.getAttribute('aria-hidden')).toBe('true');
  });

  it('BrandLogo is named Student Kare by default', () => {
    const { getByRole } = render(<BrandLogo />);
    expect(getByRole('img', { name: 'Student Kare' })).not.toBeNull();
  });
});
