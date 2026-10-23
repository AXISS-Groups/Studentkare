/**
 * Run-time recolouring of the animated set (web and native share it).
 *
 * scripts/icons/build-lottie.mjs writes, next to every fill, stroke and
 * gradient colour in a Lottie file, the design-token role it stands for
 * (`"sk": "illustrationIndigo"`, or `@ink` / `@bg` for single-ink icons). Here
 * those roles are swapped for the current scheme's values, so one file serves
 * light and dark and an icon takes the colour the caller passes, like <Icon>.
 */

export type Rgb = readonly [number, number, number];
/** A role from the file (`@ink`, `@bg` or a colour token key) → its colour now, or null to leave it as built. */
export type RoleResolver = (role: string) => Rgb | null;

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_FN = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i;
const CHANNEL_MAX = 255;

/** `#RGB`, `#RRGGBB`, `#RRGGBBAA` or `rgb(…)`/`rgba(…)` → 0–1 channels (alpha is the caller's opacity, not ours). */
export function parseColour(value: string): Rgb | null {
  const v = value.trim();
  const hex = HEX.exec(v);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split('').map((c) => c + c).join('') : hex[1].slice(0, 6);
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / CHANNEL_MAX) as unknown as Rgb;
  }
  const fn = RGB_FN.exec(v);
  if (fn) return [Number(fn[1]) / CHANNEL_MAX, Number(fn[2]) / CHANNEL_MAX, Number(fn[3]) / CHANNEL_MAX];
  return null;
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
const isObject = (v: Json): v is { [key: string]: Json } => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNumbers = (v: Json): v is number[] => Array.isArray(v) && v.every((n) => typeof n === 'number');

function setRgb(target: Json, rgb: Rgb | null): void {
  if (!rgb || !isNumbers(target) || target.length < 3) return;
  target[0] = rgb[0];
  target[1] = rgb[1];
  target[2] = rgb[2];
}

function paint(node: Json, resolve: RoleResolver): void {
  if (Array.isArray(node)) {
    for (const child of node) paint(child, resolve);
    return;
  }
  if (!isObject(node)) return;
  const roles = node.sk;
  if ((node.ty === 'fl' || node.ty === 'st') && isObject(node.c)) {
    const k = node.c.k;
    if (typeof roles === 'string') setRgb(k, resolve(roles));
    else if (Array.isArray(roles) && Array.isArray(k)) {
      k.forEach((kf, i) => {
        const role = roles[i];
        if (!isObject(kf) || typeof role !== 'string') return;
        const rgb = resolve(role);
        setRgb(kf.s, rgb);
        setRgb(kf.e, rgb);
      });
    }
  }
  if ((node.ty === 'gf' || node.ty === 'gs') && isObject(node.g) && isObject(node.g.k) && Array.isArray(roles)) {
    const stops = node.g.k.k;
    if (isNumbers(stops)) {
      roles.forEach((role, i) => {
        const rgb = typeof role === 'string' ? resolve(role) : null;
        if (!rgb) return;
        stops[i * 4 + 1] = rgb[0];
        stops[i * 4 + 2] = rgb[1];
        stops[i * 4 + 3] = rgb[2];
      });
    }
  }
  for (const [key, value] of Object.entries(node)) if (key !== 'sk') paint(value, resolve);
}

/** A recoloured copy of a built Lottie file. The input is never changed (players mutate what they are given). */
export function applyPalette<T>(data: T, resolve: RoleResolver): T {
  const copy = JSON.parse(JSON.stringify(data)) as Json;
  paint(copy, resolve);
  return copy as unknown as T;
}

/** The roles a built file uses (`sk.roles`), so a caller resolves each once. */
export function rolesOf(data: unknown): readonly string[] {
  if (typeof data !== 'object' || data === null || !('sk' in data)) return [];
  const sk = (data as { sk: unknown }).sk;
  if (typeof sk !== 'object' || sk === null || !('roles' in sk)) return [];
  const roles = (sk as { roles: unknown }).roles;
  return Array.isArray(roles) ? roles.filter((r): r is string => typeof r === 'string') : [];
}
