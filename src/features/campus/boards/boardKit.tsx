import React, { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/data/services/http';
import { InstitutionConsoleQueryGuard } from '@/components/InstitutionConsoleQueryGuard';
import { Icon, Icon3d } from '@/design-system/icons';
import type { SkIcon3dName, SkIconName } from '@/design-system/icons';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import type { RoutePath } from '@/lib/utils/workflowRouting';

/**
 * Shared pieces for the campus console boards (design page 4, WP-10).
 *
 * Minimum group size: no settings-registry key exists for it yet. The one
 * value in the code base is the console query guard's k-anonymity floor, so
 * every board reads that and nothing else. A count below it is withheld, never
 * shown, never rounded.
 */
export const CAMPUS_MIN_GROUP = InstitutionConsoleQueryGuard.K_ANONYMITY_FLOOR;

/** A count a campus may see: the number, or "withheld" when the group is too small. */
export type GroupFigure = { shown: true; value: number } | { shown: false };

export function groupFigure(count: number): GroupFigure {
  return count > 0 && count < CAMPUS_MIN_GROUP ? { shown: false } : { shown: true, value: count };
}

export type BoardLoad<T> =
  | { kind: 'loading' }
  | { kind: 'ready'; data: T }
  | { kind: 'failed'; status: number };

/** The server's "your account isn't assigned to a campus" answer (campus_scope). */
export const HTTP_FORBIDDEN = 403;

export function statusOf(reason: unknown): number {
  return reason instanceof ApiError ? reason.status : 0;
}

/**
 * Loads a board's data once, and again on `retry`. `load` must be stable (a
 * module-level source), or the board reloads on every render.
 */
export function useBoardLoad<T>(load: () => Promise<T>): { state: BoardLoad<T>; retry: () => void } {
  const [state, setState] = useState<BoardLoad<T>>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  useEffect(() => {
    let live = true;
    setState({ kind: 'loading' });
    load()
      .then((data) => { if (live) setState({ kind: 'ready', data }); })
      .catch((reason: unknown) => { if (live) setState({ kind: 'failed', status: statusOf(reason) }); });
    return () => { live = false; };
  }, [load, attempt]);
  return { state, retry };
}

/** "Ref ERR-503 · CampusWater"; NET when the request never reached the server. */
export function useBoardRef(): (status: number, board: string) => string {
  const t = useT();
  return useCallback((status: number, board: string) => t('campusBoards.ref', { code: status ? String(status) : 'NET', board }), [t]);
}

/** A plain click navigates in place; a modified click (new tab) is left to the browser. */
export function goTo(route: RoutePath) {
  return (event: React.MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(route);
  };
}

/** The account has no campus set: the server refuses every campus board (fail closed). */
export function NoCampusState(): React.ReactElement {
  const t = useT();
  return (
    <div className="sk-state">
      <div className="sk-state__body" role="status">
        <span className="cb-badge" aria-hidden="true"><Icon name="info" size={28} strokeWidth={1.9} /></span>
        <h1 className="sk-state__title">{t('campusOverview.noCampus.title')}</h1>
        <p className="sk-state__text">{t('campusOverview.noCampus.body')}</p>
      </div>
    </div>
  );
}

/**
 * The quiet "this part isn't connected yet" block inside a card. `tile` swaps
 * the line icon for the board's 3D tile where the part is the board's main
 * content (its empty state on the canvas draws that tile).
 */
export function NotConnected({ icon, tile, titleKey, bodyKey }: { icon: SkIconName; tile?: SkIcon3dName; titleKey: MessageKey; bodyKey: MessageKey }): React.ReactElement {
  const t = useT();
  return (
    <div className={`cb-unconnected${tile ? ' cb-unconnected--tile' : ''}`} role="note">
      {tile ? <Icon3d name={tile} size={64} /> : <span className="cb-unconnected__icon" aria-hidden="true"><Icon name={icon} size={20} strokeWidth={1.9} /></span>}
      <span className="cb-unconnected__text">
        <strong>{t(titleKey)}</strong>
        <span>{t(bodyKey)}</span>
      </span>
    </div>
  );
}

/** A visually hidden "not available yet" reason after a disabled control's label. */
export function Unavailable({ reason }: { reason: MessageKey }): React.ReactElement {
  const t = useT();
  return <span className="sk-visually-hidden">{t(reason)}</span>;
}
