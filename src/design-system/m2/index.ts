/**
 * Mobile 2.0 (canvas page 9, approved 2026-10-21): the pieces every M2 board
 * shares, built once here so later packages reuse them. See
 * design/screens/mobile-2-supersedes.md for the colour to token map.
 */
export { Gradient, gradientCss } from './Gradient';
export type { GradientProps } from './Gradient';
export { M2_NAV_CLEARANCE, PillNav, PILL_NAV, PILL_NAV_HEIGHT } from './PillNav';
export type { PillNavKey, PillNavDestination, PillNavProps } from './PillNav';
export { ServiceRail } from './ServiceRail';
export type { ServiceTile } from './ServiceRail';
export { HeroCarousel } from './HeroCarousel';
export type { HeroSlide, HeroCarouselProps } from './HeroCarousel';
export { GradientHeroCard } from './GradientHeroCard';
export type { GradientHeroCardProps } from './GradientHeroCard';
export {
  cardLabel, LiftCard, M2Card, M2Header, M2Heading, M2SearchField, M2SectionHead, M2_BOTTOM_SPACE, NotYetTile, RoundButton, SoftIcon, SoftTileGrid, SosButton,
  m2Text, useLift, webAttrs,
} from './M2Parts';
export type { M2SearchFieldProps, PressState, SoftTileItem } from './M2Parts';
export { SERVICE_HUES, NAVY_STOPS, ORB_STOPS, heroStops, tileStops } from './servicePalette';
export type { HueTokens, ServiceHue } from './servicePalette';
export { M2ActiveProvider, floatTransform, useAmbientMotion, useAutoAdvance, useLoop, useOnScreen, usePageVisible } from './m2Motion';
export type { AutoAdvance } from './m2Motion';
export { useOwnPhoneChrome } from '../navigation/BoardHeader';
export { ProgressRing, clampRing } from './ProgressRing';
export type { ProgressRingProps } from './ProgressRing';
