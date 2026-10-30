import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Text } from 'react-native';

vi.mock('@/design-system/motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/design-system/motion')>()),
  useReducedMotion: () => true,
}));

import { size } from '@/design-system/theme';
import {
  HeroCarousel, M2EmptyState, M2Grid, M2Header, M2SosProvider, M2ListRow, M2ProductCard, M2Responsive, NAVY_STOPS, ServiceRail, SoftTileGrid, layoutFor, useM2Layout,
} from '@/design-system/m2';
import type { HeroSlide, M2Layout, ServiceTile } from '@/design-system/m2';
import { axeViolations, describeViolations } from '@/test/axe';

afterEach(cleanup);

const at = (layout: M2Layout, ui: React.ReactElement) => render(<M2Responsive layout={layout}>{ui}</M2Responsive>);

function Probe() {
  return <Text testID="probe">{useM2Layout()}</Text>;
}

describe('useM2Layout (parity audit phase 1)', () => {
  it('splits widths at size.phoneFrameMax and size.desktopMin', () => {
    expect(size.desktopMin).toBe(880);
    expect(layoutFor(size.phoneFrameMax)).toBe('phone');
    expect(layoutFor(size.phoneFrameMax + 1)).toBe('tablet');
    expect(layoutFor(size.desktopMin - 1)).toBe('tablet');
    expect(layoutFor(size.desktopMin)).toBe('desktop');
  });

  it('is phone outside any M2Responsive, so a board that has not opted in never changes', () => {
    render(<Probe />);
    expect(screen.getByTestId('probe')).toHaveTextContent('phone');
  });

  it('follows the nearest M2Responsive', () => {
    at('desktop', <Probe />);
    expect(screen.getByTestId('probe')).toHaveTextContent('desktop');
  });
});

describe('M2Grid', () => {
  const cells = ['a', 'b', 'c', 'd'].map((k) => <Text key={k} testID={`cell-${k}`}>{k}</Text>);
  const rowsOf = (grid: HTMLElement) => Array.from(grid.children);

  it('stacks on a phone, then two and three columns wider', () => {
    at('phone', <M2Grid testID="grid">{cells}</M2Grid>);
    expect(rowsOf(screen.getByTestId('grid'))).toHaveLength(4);
    cleanup();
    at('tablet', <M2Grid testID="grid">{cells}</M2Grid>);
    expect(rowsOf(screen.getByTestId('grid'))).toHaveLength(2);
    cleanup();
    at('desktop', <M2Grid testID="grid">{cells}</M2Grid>);
    const rows = rowsOf(screen.getByTestId('grid'));
    expect(rows).toHaveLength(2);
    // A short last row keeps equal columns: one cell and two spacers.
    expect(rows[1].children).toHaveLength(3);
  });

  it('takes columns per layout', () => {
    at('desktop', <M2Grid testID="grid" columns={{ desktop: 4 }}>{cells}</M2Grid>);
    expect(rowsOf(screen.getByTestId('grid'))).toHaveLength(1);
  });
});

const tiles: ServiceTile[] = [
  { key: 'labs', label: 'Lab tests', icon: 'lab', hue: 'violet', onPress: vi.fn() },
  { key: 'campus', label: 'Campus', icon: 'home-2', hue: 'sky', anim: 'anim-home', onPress: vi.fn() },
];

describe('ServiceRail', () => {
  it('scrolls on a phone and shows every tile at once wider, with the same links', () => {
    at('phone', <ServiceRail label="Services" tiles={tiles} current="labs" testID="rail" />);
    expect(screen.queryByTestId('rail-wrap')).toBeNull();
    cleanup();
    at('desktop', <ServiceRail label="Services" tiles={tiles} current="labs" testID="rail" />);
    expect(screen.getByTestId('rail-wrap')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Services' });
    expect(within(nav).getByRole('link', { name: 'Lab tests' })).toHaveAttribute('aria-current', 'page');
  });

  it('plays a tile’s drawing from the animated set when it has one, with the still glyph as poster', () => {
    at('phone', <ServiceRail label="Services" tiles={tiles} current={null} testID="rail" />);
    expect(screen.getByTestId('rail-campus-anim')).toBeInTheDocument();
    expect(screen.queryByTestId('rail-labs-anim')).toBeNull();
  });
});

describe('SoftTileGrid', () => {
  const items = Array.from({ length: 8 }, (_, i) => ({ key: `k${i}`, label: `Tile ${i}`, icon: 'pill' as const, hue: 'teal' as const, onPress: vi.fn() }));
  const width = (id: string) => (screen.getByTestId(id) as HTMLElement).style.width;
  it('is four a row on a phone, eight on a desktop, or as asked', () => {
    at('phone', <SoftTileGrid items={items} testID="t" />);
    expect(width('t-k0')).toBe('25%');
    cleanup();
    at('desktop', <SoftTileGrid items={items} testID="t" />);
    expect(width('t-k0')).toBe('12.5%');
    cleanup();
    at('desktop', <SoftTileGrid items={items} columns={6} testID="t" />);
    expect(width('t-k0')).toMatch(/^16\.66/);
  });
});

describe('M2Header', () => {
  it('carries SOS by default, opening the shell’s SOS (founder decision, 23 Oct 2026); none where the shell has its own', () => {
    const shellSos = vi.fn();
    render(<M2SosProvider value={shellSos}><M2Header backLabel="Back" onBack={vi.fn()} title="Lab tests" /></M2SosProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'SOS, get help now' }));
    expect(shellSos).toHaveBeenCalled();
    cleanup();
    // The desktop shell provides none: its top bar carries SOS, so the board's header draws no second one.
    at('desktop', <M2Header backLabel="Back" onBack={vi.fn()} title="Lab tests" />);
    expect(screen.queryByRole('button', { name: 'SOS, get help now' })).toBeNull();
    cleanup();
    const own = vi.fn();
    at('phone', <M2Header backLabel="Back" onBack={vi.fn()} title="Orders" sos={{ label: 'SOS', spoken: 'SOS, get help now', onPress: own }} />);
    fireEvent.click(screen.getByRole('button', { name: 'SOS, get help now' }));
    expect(own).toHaveBeenCalled();
  });

  it('draws no back button on a navigation root', () => {
    at('desktop', <M2Header title="Home" />);
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument();
  });
});

const slides: HeroSlide[] = ['one', 'two', 'three'].map((key) => ({
  key, eyebrow: key, title: `Title ${key}`, body: 'Body', cta: 'Open', icon: 'lab', stops: NAVY_STOPS, chipFill: NAVY_STOPS[1], ink: NAVY_STOPS[1], onPress: vi.fn(),
}));

describe('HeroCarousel', () => {
  it('shows one card on a phone and two side by side on a desktop', () => {
    at('phone', <HeroCarousel label="Highlights" slides={slides} dotLabel={(n) => `Show ${n}`} testID="hc" />);
    expect(screen.queryByTestId('hc-slide-two')).toBeNull();
    cleanup();
    at('desktop', <HeroCarousel label="Highlights" slides={slides} dotLabel={(n) => `Show ${n}`} testID="hc" />);
    expect(screen.getByTestId('hc-slide-one')).toBeInTheDocument();
    expect(screen.getByTestId('hc-slide-two')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show 3' }));
    // Wraps round: the last and the first.
    expect(screen.getByTestId('hc-slide-three')).toBeInTheDocument();
    expect(screen.getByTestId('hc-slide-one')).toBeInTheDocument();
  });
});

describe('M2ListRow, M2EmptyState and M2ProductCard', () => {
  it('a row with an action is one link named by its words; without one, plain content', () => {
    const open = vi.fn();
    at('desktop', <M2ListRow icon="refresh" hue="indigo" title="Refills" meta="With your prescriptions" onPress={open} testID="row" />);
    fireEvent.click(screen.getByRole('link', { name: /Refills/ }));
    expect(open).toHaveBeenCalled();
    cleanup();
    at('phone', <M2ListRow icon="star" hue="amber" title="Kare points" meta="Points only" testID="row" />);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('an empty state carries the animated 3D tile, a heading and one next step', () => {
    const next = vi.fn();
    at('desktop', <M2EmptyState animation="anim-package" hue="indigo" title="No orders yet" body="Orders show here." action={{ label: 'Browse the shop', onPress: next }} />);
    expect(screen.getByTestId('m2-empty-art')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No orders yet' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Browse the shop' }));
    expect(next).toHaveBeenCalled();
  });

  it('a product card opens as one link; its action is its own button and can be off', async () => {
    const onOpen = vi.fn();
    const add = vi.fn();
    const { container } = at('tablet', (
      <M2ProductCard testID="p" art={{ icon: 'pill-alt', hue: 'teal' }} off="13% off" eyebrow="Maker" name="Paracetamol 650 mg" pack="Strip of 15"
        notes={[{ text: 'Prescription needed', tone: 'attention' }]} price="₹26" mrp="₹30" onOpen={onOpen} label="Paracetamol 650 mg, Strip of 15, ₹26"
        action={{ label: 'Add', spoken: 'Add, Paracetamol 650 mg', onPress: add, disabled: true }} />
    ));
    fireEvent.click(screen.getByTestId('p-open'));
    expect(onOpen).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Add, Paracetamol 650 mg' })).toHaveAttribute('aria-disabled', 'true');
    expect(describeViolations(await axeViolations(container))).toBe('');
  });
});
