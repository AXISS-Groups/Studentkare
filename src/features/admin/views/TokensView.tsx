import React from 'react';
import { ConsoleTablePage } from '@/design-system';
import type { DataTableRow, Stat } from '@/design-system';
import { skTokens } from '@/theme/tokens/generated/skTokens';
import { useT } from '@/i18n';
import { count } from '../model/format';
import { boardEmpty, boardError } from './AdminBoard';

/**
 * Design tokens (design: AdminTokens, sidebar "Token sync"): the colour roles that ship,
 * read from the generated token file, with their light and dark values. Whether that
 * file still matches the design source is checked by `npm run tokens:check` in CI, not
 * here, so "Out of sync" and "Unresolved" are "—"; the board's design-value column,
 * notes and artboard count have no source in the app and are not shown. What this
 * screen can check itself it does: a role with no dark value is flagged.
 */
const kebab = (role: string) => role.replace(/([a-z])([A-Z0-9])/g, '$1-$2').toLowerCase();
/** The CSS custom property a colour role ships as, e.g. surfaceTwo becomes --sk-color-surface-two. */
const cssVar = (role: string) => `--sk-color-${kebab(role)}`;

export function TokensView() {
  const t = useT();
  const light = skTokens.color.light as Record<string, string>;
  const dark = skTokens.color.dark as Record<string, string>;
  const roles = Object.keys(light);
  const missingDark = roles.filter(role => !(role in dark));
  const textSizes = Object.keys(skTokens.font.size).length;
  const stats: Stat[] = [
    { label: t('admin.tokens.statColour'), value: count(roles.length) },
    { label: t('admin.tokens.statDark'), value: count(Object.keys(dark).length), tone: missingDark.length ? 'attention' : 'positive' },
    { label: t('admin.tokens.statOutOfSync'), value: null },
    { label: t('admin.tokens.statUnresolved'), value: null },
  ];
  const rows: DataTableRow[] = roles.map(role => ({
    id: role,
    cells: [
      { node: <><span className="sk-board-swatch" style={{ background: `var(${cssVar(role)})` }} aria-hidden="true" /><strong className="sk-mono sk-board-token">{cssVar(role)}</strong></> },
      { text: light[role], mono: true },
      { text: dark[role] ?? '—', mono: true },
      { pill: role in dark ? { label: t('adminBoard.tokens.bothThemes'), tone: 'positive' } : { label: t('adminBoard.tokens.noDark'), tone: 'attention' } },
    ],
  }));
  return <div className="sk-admin-page">
    <ConsoleTablePage
      status="ready"
      header={{
        title: t('adminBoard.tokens.title'),
        subtitle: t('adminBoard.tokens.subtitle', { colours: count(roles.length), sizes: count(textSizes) }),
        badge: missingDark.length ? { label: t('adminBoard.tokens.badge', { count: count(missingDark.length) }), tone: 'attention' } : undefined,
      }}
      stats={stats}
      statsLabel={t('admin.tokens.summary')}
      table={{
        caption: t('admin.tokens.statColour'),
        columns: [{ label: t('admin.tokens.colToken'), width: '38%' }, { label: t('admin.tokens.colLight') }, { label: t('admin.tokens.colDark') }, { label: t('admin.col.state'), align: 'end' }],
        rows,
        footnote: `${t('admin.tokens.noteBefore')} npm run tokens:check ${t('admin.tokens.noteAfter')}`,
      }}
      empty={boardEmpty(t, t('adminBoard.tokens.empty'))}
      unconnected={{ title: t('adminBoard.tokens.title'), body: t('admin.tokens.description') }}
      error={boardError(t, t('adminBoard.tokens.what'), 'AdminTokens', () => undefined)}
      loadingLabel={t('adminBoard.tokens.loading')}
    />
  </div>;
}
