import { color } from '../theme';

/**
 * The Mobile 2.0 service palette (design/tokens: `service-*`), by hue. Each hue
 * gives a glossy tile gradient (`light` to `deep`), a soft tile with its ink
 * (`soft` + `ink`, AA, lighter in dark), and for the heroes with white text a
 * `deep` to `end` gradient that is AA across its whole length.
 *
 * Board colour to token mapping: design/screens/mobile-2-supersedes.md §2.
 */
export type ServiceHue = 'indigo' | 'violet' | 'blue' | 'sky' | 'teal' | 'green' | 'amber' | 'orange' | 'rose';

export interface HueTokens {
  /** Light stop of a glossy tile (decorative; never under text). */
  light: string;
  /** Dark stop; white glyphs and text are AA on it. */
  deep: string;
  /** Far end of a hero with white text (`-shade`, or the navy for blue and indigo). */
  end: string;
  /** Soft tile fill. */
  soft: string;
  /** Icon / text on the soft fill. */
  ink: string;
}

export const SERVICE_HUES: Readonly<Record<ServiceHue, HueTokens>> = {
  indigo: { light: color.serviceIndigo, deep: color.brandNavy, end: color.brandNavy, soft: color.surface3, ink: color.action },
  violet: { light: color.serviceViolet, deep: color.serviceVioletDeep, end: color.serviceVioletShade, soft: color.serviceVioletSoft, ink: color.serviceVioletInk },
  blue: { light: color.serviceBlue, deep: color.serviceBlueDeep, end: color.brandNavy, soft: color.serviceBlueSoft, ink: color.serviceBlueInk },
  sky: { light: color.serviceSky, deep: color.serviceSkyDeep, end: color.serviceSkyDeep, soft: color.serviceSkySoft, ink: color.serviceSkyInk },
  teal: { light: color.serviceTeal, deep: color.serviceTealDeep, end: color.serviceTealDeep, soft: color.serviceTealSoft, ink: color.serviceTealInk },
  green: { light: color.serviceGreen, deep: color.serviceGreenDeep, end: color.serviceGreenShade, soft: color.serviceGreenSoft, ink: color.serviceGreenInk },
  amber: { light: color.serviceAmber, deep: color.serviceAmberDeep, end: color.serviceAmberShade, soft: color.serviceAmberSoft, ink: color.serviceAmberInk },
  orange: { light: color.serviceOrange, deep: color.serviceOrangeDeep, end: color.serviceOrangeShade, soft: color.serviceOrangeSoft, ink: color.serviceOrangeInk },
  rose: { light: color.serviceRose, deep: color.serviceRoseDeep, end: color.serviceRoseShade, soft: color.serviceRoseSoft, ink: color.serviceRoseInk },
};

/** A glossy tile: the light stop only in the corner, so the centred white glyph sits on the deep end (≥ 3:1). */
export function tileStops(hue: ServiceHue): readonly string[] {
  const h = SERVICE_HUES[hue];
  return [h.light, h.deep, h.deep];
}

/** A hero or card carrying white text: deep to end, AA all the way across. */
export function heroStops(hue: ServiceHue): readonly string[] {
  const h = SERVICE_HUES[hue];
  return [h.deep, h.end];
}

/** The navy gradient (primary buttons, the pill nav, the navy cards). */
export const NAVY_STOPS: readonly string[] = [color.brandNavyLight, color.brandNavy];

/** The Ayush orb (radial). */
export const ORB_STOPS: readonly string[] = [color.ayushOrbGlint, color.serviceIndigo, color.brandNavyLight];
