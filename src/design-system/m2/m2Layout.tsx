import React, { createContext, useContext, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import type { LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';
import { size, space } from '../theme';

/**
 * Mobile 2.0 at every width (docs/ux/web-mobile-parity-2026-10-23.md, phase 1).
 * The M2 pieces are phone-first; inside an `<M2Responsive>` they lay out for
 * the width that region really has:
 * - `phone`: up to `size.phoneFrameMax` (430 px), exactly as the boards draw;
 * - `tablet`: wider than that, below `size.desktopMin`;
 * - `desktop`: `size.desktopMin` (880 px) and wider.
 * The width is the region's own (measured), not the window's, so a board shown
 * in a narrow column of a wide screen stays a phone board. Outside any
 * `<M2Responsive>` every piece is `phone`: nothing changes for a board that has
 * not opted in.
 */
export type M2Layout = 'phone' | 'tablet' | 'desktop';

const LayoutContext = createContext<M2Layout>('phone');

/** The layout of the nearest `<M2Responsive>`, or `phone` outside one. */
export function useM2Layout(): M2Layout {
  return useContext(LayoutContext);
}

/** Whether the layout is wider than a phone. */
export const isWide = (layout: M2Layout): boolean => layout !== 'phone';

/** The layout for a width in px. */
export function layoutFor(width: number): M2Layout {
  if (width <= size.phoneFrameMax) return 'phone';
  return width < size.desktopMin ? 'tablet' : 'desktop';
}

/** Horizontal page padding for a layout: the phone gutter, the web gutter wider. */
export function m2Gutter(layout: M2Layout): number {
  return layout === 'phone' ? space.gutterPhone : space.gutterWeb;
}

/**
 * Lays its children out for the width it is given. It starts from the window
 * width (so the first frame is close) and then follows its own measured width.
 * `layout` pins one (stories, tests).
 */
export function M2Responsive({ children, layout, style, testID }: { children: React.ReactNode; layout?: M2Layout; style?: StyleProp<ViewStyle>; testID?: string }) {
  const window = useWindowDimensions();
  const [measured, setMeasured] = useState<number | null>(null);
  const value = layout ?? layoutFor(measured ?? window.width);
  const onLayout = (event: LayoutChangeEvent) => setMeasured(event.nativeEvent.layout.width);
  return (
    <LayoutContext.Provider value={value}>
      <View style={style} onLayout={layout ? undefined : onLayout} testID={testID}>{children}</View>
    </LayoutContext.Provider>
  );
}

export interface M2GridProps {
  children: React.ReactNode;
  /** Columns per layout. Default: 1 on a phone, 2 on a tablet, 3 on a desktop. */
  columns?: Partial<Record<M2Layout, number>>;
  /** Gap between cells. Default `space.s12` on a phone, `space.s16` wider. */
  gap?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const DEFAULT_COLUMNS: Record<M2Layout, number> = { phone: 1, tablet: 2, desktop: 3 };

/**
 * Equal columns that follow the layout. Each child is a cell; a cell grows to
 * its row's tallest. One column is a plain stack, as on the phone boards.
 */
export function M2Grid({ children, columns, gap, style, testID }: M2GridProps) {
  const layout = useM2Layout();
  const count = Math.max(1, columns?.[layout] ?? DEFAULT_COLUMNS[layout]);
  const between = gap ?? (layout === 'phone' ? space.s12 : space.s16);
  const cells = React.Children.toArray(children).filter(Boolean);
  if (count === 1) return <View style={[{ gap: between }, style]} testID={testID}>{cells}</View>;
  const rows: React.ReactNode[][] = [];
  cells.forEach((cell, i) => {
    const row = Math.floor(i / count);
    (rows[row] ??= []).push(cell);
  });
  return (
    <View style={[{ gap: between }, style]} testID={testID}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', alignItems: 'stretch', gap: between }}>
          {row.map((cell, c) => <View key={c} style={{ flex: 1, minWidth: 0 }}>{cell}</View>)}
          {/* Short last row: empty cells keep the columns the same width. */}
          {Array.from({ length: count - row.length }, (_, k) => <View key={`pad-${k}`} style={{ flex: 1 }} />)}
        </View>
      ))}
    </View>
  );
}

/**
 * A Mobile 2.0 board laid out wide in the desktop web shell's page column
 * (parity phase 2): no own scroll (the page scrolls), no own gutter (the shell
 * gives it), as wide as web content goes, and every piece inside laid out for
 * the width it really has (`<M2Responsive>`).
 */
export function M2WideColumn({ children, testID }: { children: React.ReactNode; testID?: string }) {
  return (
    <View style={{ width: '100%' }} testID={testID}>
      <M2Responsive style={{ width: '100%', maxWidth: size.webContentMax, alignSelf: 'center', gap: space.s24 }}>{children}</M2Responsive>
    </View>
  );
}
