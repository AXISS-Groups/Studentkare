import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnimatedIcon, AnimatedIllustration } from '../..';
import type { SkAnimatedName } from '../..';

const player = vi.hoisted(() => ({
  loadAnimation: vi.fn(),
  item: {
    totalFrames: 41, currentFrame: 0, loop: false, isPaused: true,
    goToAndStop: vi.fn(), goToAndPlay: vi.fn(), play: vi.fn(), pause: vi.fn(), destroy: vi.fn(), addEventListener: vi.fn(),
  },
}));
vi.mock('lottie-web/build/player/lottie_light', () => ({ default: { loadAnimation: player.loadAnimation } }));

let reduce = false;
function stubBrowser() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({ matches: query.includes('reduce') ? reduce : false, media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} }),
  });
  // Every animation is on screen at once.
  vi.stubGlobal('IntersectionObserver', class {
    constructor(private cb: (e: Array<{ isIntersecting: boolean }>) => void) {}
    observe() { this.cb([{ isIntersecting: true }]); }
    disconnect() {}
  });
}

beforeEach(() => {
  reduce = false;
  player.loadAnimation.mockReset().mockReturnValue(player.item);
  Object.values(player.item).forEach((v) => (typeof v === 'function' ? (v as ReturnType<typeof vi.fn>).mockReset() : undefined));
});
afterEach(() => vi.unstubAllGlobals());

describe('AnimatedIcon without an observer (old browsers, tests)', () => {
  it('is decorative by default and shows its poster', () => {
    const { container, getByTestId } = render(<AnimatedIcon name="anim-check" poster={<span data-testid="poster" />} />);
    expect(getByTestId('poster')).toBeInTheDocument();
    expect(container.querySelector('[data-anim-icon="anim-check"]')?.getAttribute('aria-hidden')).toBe('true');
    expect(player.loadAnimation).not.toHaveBeenCalled();
  });

  it('is an image with a name when labelled', () => {
    const { getByRole } = render(<AnimatedIcon name="anim-refresh" label="Loading" />);
    expect(getByRole('img', { name: 'Loading' })).toBeInTheDocument();
  });

  it('renders nothing for a name outside the manifest', () => {
    const { container } = render(<AnimatedIcon name={'anim-nope' as SkAnimatedName} />);
    expect(container.firstChild).toBeNull();
  });

  it('sizes from the anim tokens, the 3D tile at the Icon3d size', () => {
    const { container } = render(<><AnimatedIcon name="anim-home" size="mark" /><AnimatedIcon name="anim-package" variant="3d" /></>);
    const [flat, tile] = Array.from(container.querySelectorAll<HTMLElement>('[data-anim]'));
    expect(flat.style.width).toBe('48px');
    expect(Number.parseFloat(tile.style.width)).toBeLessThan(72);
  });
});

describe('AnimatedIcon on screen', () => {
  beforeEach(stubBrowser);

  it('loads lazily, recolours to the given ink and plays once', async () => {
    render(<AnimatedIcon name="anim-check" color="#FF0000" />);
    await waitFor(() => expect(player.loadAnimation).toHaveBeenCalledTimes(1));
    const data = JSON.stringify(player.loadAnimation.mock.calls[0][0].animationData);
    expect(data).toContain('"k":[1,0,0,1]');
    await waitFor(() => expect(player.item.goToAndPlay).toHaveBeenCalledWith(0, true));
    expect(player.loadAnimation.mock.calls[0][0].autoplay).toBe(false);
  });

  it('loops loaders', async () => {
    render(<AnimatedIcon name="anim-refresh" />);
    await waitFor(() => expect(player.item.play).toHaveBeenCalled());
  });

  it('rests on its still frame under reduced motion and never plays', async () => {
    reduce = true;
    render(<AnimatedIllustration name="scene-lab-workers" />);
    await waitFor(() => expect(player.loadAnimation).toHaveBeenCalled());
    await waitFor(() => expect(player.item.goToAndStop).toHaveBeenCalled());
    expect(player.item.play).not.toHaveBeenCalled();
    expect(player.item.goToAndPlay).not.toHaveBeenCalled();
  });

  it('honours the app setting to reduce motion too', async () => {
    document.documentElement.dataset.uiMotion = 'reduced';
    try {
      render(<AnimatedIcon name="anim-refresh" />);
      await waitFor(() => expect(player.loadAnimation).toHaveBeenCalled());
      expect(player.item.play).not.toHaveBeenCalled();
    } finally {
      delete document.documentElement.dataset.uiMotion;
    }
  });

  it('stops when unmounted', async () => {
    const { unmount } = render(<AnimatedIcon name="anim-refresh" />);
    await waitFor(() => expect(player.loadAnimation).toHaveBeenCalled());
    unmount();
    expect(player.item.destroy).toHaveBeenCalled();
  });
});
