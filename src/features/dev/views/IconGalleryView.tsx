import React, { useMemo, useState } from 'react';
import { Glyph, Icon, Icon3d, Illustration } from '@/design-system/icons';
import { skGlyphs, skIcons, skIcons3d, skIllustrations } from '@/design-system/icons/generated/skIconData';
import manifest from '../../../../design/icons/icon-manifest.json';

/** Dev-only mirror of design/icons/gallery.html: every icon by name, searchable, filterable by screen. */
type ScreenNeeds = { icons: string[]; icons3d: string[]; glyphs: string[]; illustrations: string[] };
const screens: Record<string, ScreenNeeds> = manifest.screens;
const keys = <T extends string>(o: Record<T, unknown>) => Object.keys(o) as T[];

const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 'var(--sk-space-8)' };
const cell: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sk-space-8)', padding: 'var(--sk-space-12)',
  background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule)', borderRadius: 'var(--sk-radius-md)',
  color: 'var(--sk-color-text)', fontSize: 12, wordBreak: 'break-all', textAlign: 'center',
};
const field: React.CSSProperties = {
  minHeight: 44, padding: '0 var(--sk-space-12)', border: '1px solid var(--sk-color-rule-strong)', borderRadius: 'var(--sk-radius-sm)',
  background: 'var(--sk-color-surface)', color: 'var(--sk-color-text)',
};

function Section<T extends string>({ title, names, render }: { title: string; names: T[]; render: (name: T) => React.ReactNode }) {
  return (
    <section>
      <h2 style={{ fontSize: 16, margin: 'var(--sk-space-24) 0 var(--sk-space-12)' }}>{title} ({names.length})</h2>
      <div style={grid}>
        {names.map((n) => <div key={n} style={cell}>{render(n)}<code>{n}</code></div>)}
      </div>
    </section>
  );
}

export function IconGalleryView() {
  const [query, setQuery] = useState('');
  const [screen, setScreen] = useState('');
  const pick = useMemo(() => {
    const q = query.trim().toLowerCase();
    return <T extends string>(all: T[], only: string[] | undefined) =>
      all.filter((n) => (!q || n.toLowerCase().includes(q)) && (!only || only.includes(n)));
  }, [query]);
  const needs = screen ? screens[screen] : undefined;

  return (
    <main style={{ padding: 'var(--sk-space-24)', background: 'var(--sk-color-canvas)', color: 'var(--sk-color-text)', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 24, margin: 0 }}>Student Kare icons</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sk-space-12)', margin: 'var(--sk-space-16) 0' }}>
        <input style={field} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name" aria-label="Search icons" />
        <select style={field} value={screen} onChange={(e) => setScreen(e.target.value)} aria-label="Show icons for one screen">
          <option value="">All screens</option>
          {keys(screens).sort().map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <Section title="Line and solid icons · 24 px grid · currentColor" names={pick(keys(skIcons), needs?.icons)} render={(n) => <Icon name={n} size={32} />} />
      <Section title="3D icon tiles · 72 px" names={pick(keys(skIcons3d), needs?.icons3d)} render={(n) => <Icon3d name={n} />} />
      <Section title="Small glyphs and badges" names={pick(keys(skGlyphs), needs?.glyphs)} render={(n) => <Glyph name={n} size={40} />} />
      <Section title="Illustrations" names={pick(keys(skIllustrations), needs?.illustrations)} render={(n) => <Illustration name={n} size={96} />} />
    </main>
  );
}
