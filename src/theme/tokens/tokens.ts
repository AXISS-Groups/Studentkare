// Runtime theme tokens.
//
// These are a MAPPING onto the generated design tokens, not a second palette.
// The single source of truth is design/tokens/studentkare.tokens.json; edit it
// and run `npm run tokens:build`. The names below are kept because 93 files
// import them — only their values now come from the design system (DESIGN.md D1).
//
// Where a legacy name has no counterpart in the new palette (the old "Impilo"
// turquoise, cyan and reward violet), it is mapped to the nearest sanctioned
// role rather than left off-palette. Some names therefore resolve to the same
// colour; that is deliberate and honest.
import { skTokens } from './generated/skTokens';

// Widened to `string`: skTokens is `as const`, so without this every value keeps
// its literal type and darkTokens stops being assignable to ThemeTokens.
type Palette = Record<keyof typeof skTokens.color.light, string>;
const L: Palette = skTokens.color.light;
const D: Palette = skTokens.color.dark;

export const lightTokens = {
  // Legacy Impilo scale — mapped onto design-system roles.
  blue01: L.brandNavy,
  blue02: L.brandNavy,        // Navy card / dark indigo
  blue03: L.action,
  blue04: L.action,           // Primary brand
  blue05: L.actionHover,
  blue06: L.focus,
  blue07: L.rule,
  lavender01: L.action,       // Primary button fill (components/Button.tsx)
  lavender02: L.actionHover,
  lavender03: L.focus,
  lavender04: L.rule,
  lavender05: L.surface3,
  lavender06: L.surface2,
  silver01: L.text3,          // Muted text
  silver02: L.rule,           // Soft border / rule
  silver03: L.surface2,
  silver04: L.canvas,
  silver05: L.surface,        // Pure white
  brightTurquoise: L.focus,
  brightBlue: L.focus,
  brightGreen: L.positiveFill,

  // Canonical Design Doc v1.0 Palette Tokens
  ink900: L.text,             // Deep ink — headings, spine, emphasis
  ink700: L.action,           // Primary actions, active nav
  ink500: L.action,           // Links, secondary actions
  paper: L.canvas,
  paperAlt: L.surface2,
  inRange: L.positive,        // Within the lab's own range

  // Semantic UI Mapping
  canvas: L.canvas,
  surface: L.surface,
  surface2: L.surface2,       // Recessed surface
  surface3: L.surface3,       // Icon tiles, selected rows, pill backgrounds
  rule: L.rule,
  ruleSoft: L.ruleSoft,
  veil: L.actionSoft,         // Dashed borders, disabled elements

  ink: L.text,                // Primary headings
  ink2: L.brandNavy,          // Deeper block fill
  text: L.text,               // Primary text
  text2: L.text2,             // Secondary text
  text3: L.text3,             // Muted/meta text, timestamps

  action: L.action,           // Primary action
  actionHover: L.actionHover,
  onAction: L.onAction,
  data: L.action,             // Values, links, charts
  data2: L.actionHover,
  art: L.actionSoft,          // Line art
  artSoft: L.surface3,        // Decorative fills
  cyan: L.focus,              // Clinical accent strokes

  positive: L.positive,
  positiveFill: L.positiveFill,
  positiveBg: L.positiveBg,
  attention: L.attention,     // Amber — outside range. NEVER red (Rule E5).
  attentionFill: L.attention,
  attentionBg: L.attentionBg,
  emergency: L.danger,        // Emergency SOS (emergency surfaces ONLY)
  emergencyFill: L.dangerFill,
  emergencyBg: L.dangerBg,
  reward: L.action,           // Points & offers — commerce only (Rule L)
  rewardBg: L.surface3,

  glow: 'rgba(53, 37, 205, 0.18)',
  glowStrong: 'rgba(53, 37, 205, 0.35)',
};

export const darkTokens = {
  // Legacy Impilo scale — mapped onto design-system roles.
  blue01: D.brandNavy,
  blue02: D.brandNavy,
  blue03: D.action,
  blue04: D.action,
  blue05: D.actionHover,
  blue06: D.focus,
  blue07: D.rule,
  lavender01: D.action,
  lavender02: D.actionHover,
  lavender03: D.focus,
  lavender04: D.rule,
  lavender05: D.surface3,
  lavender06: D.surface2,
  silver01: D.text3,
  silver02: D.rule,
  silver03: D.surface2,
  silver04: D.canvas,
  silver05: D.surface,
  brightTurquoise: D.focus,
  brightBlue: D.focus,
  brightGreen: D.positiveFill,

  // Canonical Design Doc v1.0 Palette Tokens
  ink900: D.text,
  ink700: D.action,
  ink500: D.action,
  paper: D.canvas,
  paperAlt: D.surface2,
  inRange: D.positive,

  // Semantic UI Mapping
  canvas: D.canvas,
  surface: D.surface,
  surface2: D.surface2,
  surface3: D.surface3,
  rule: D.rule,
  ruleSoft: D.ruleSoft,
  veil: D.actionSoft,

  ink: D.text,
  ink2: D.brandNavy,
  text: D.text,
  text2: D.text2,
  text3: D.text3,

  action: D.action,
  actionHover: D.actionHover,
  onAction: D.onAction,
  data: D.action,
  data2: D.actionHover,
  art: D.actionSoft,
  artSoft: D.surface3,
  cyan: D.focus,

  positive: D.positive,
  positiveFill: D.positiveFill,
  positiveBg: D.positiveBg,
  attention: D.attention,
  attentionFill: D.attention,
  attentionBg: D.attentionBg,
  emergency: D.danger,
  emergencyFill: D.dangerFill,
  emergencyBg: D.dangerBg,
  reward: D.action,
  rewardBg: D.surface3,

  glow: 'rgba(165, 180, 252, 0.45)',
  glowStrong: 'rgba(165, 180, 252, 0.70)',
};

export const typography = {
  // DESIGN.md D2: Plus Jakarta Sans everywhere, Manrope as fallback only.
  // Noto faces carry తెలుగు and हिंदी without falling back to a system font.
  fontFamily: '"Plus Jakarta Sans", Manrope, "Noto Sans Telugu", "Noto Sans Devanagari", system-ui, -apple-system, sans-serif',
  fontMono: '"IBM Plex Mono", monospace, monospace',

  caption: {
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.24,
    fontWeight: '500' as const,
  },
  bodySm: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.28,
    fontWeight: '500' as const,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.1,
    fontWeight: '500' as const,
  },
  subheading: {
    fontSize: 18,
    lineHeight: 26,
    letterSpacing: -0.54,
    fontWeight: '600' as const,
  },
  headingSm: {
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.72,
    fontWeight: '700' as const,
  },
  heading: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -1.2,
    fontWeight: '700' as const,
  },
  headingLg: {
    fontSize: 46,
    lineHeight: 48,
    letterSpacing: -1.84,
    fontWeight: '800' as const,
  },
  display: {
    fontSize: 64,
    lineHeight: 64,
    letterSpacing: -3.5,
    fontWeight: '800' as const,
  },
  mono: {
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: 12,
    letterSpacing: 0.3,
  },
};

export const spacing = {
  s4: 4,
  s8: 8,
  s12: 12,
  s16: 16,
  s20: 20,
  s24: 24,
  s32: 32,
  s36: 36,
  s40: 40,
  s48: 48,
  s64: 64,
  s80: 80,
  s116: 116,
};

export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  r2xl: 20,
  r3xl: 28,
  r3xl2: 32,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#13192E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#13192E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 4,
  },
  lg: {
    shadowColor: '#13192E',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 30,
    elevation: 8,
  },
  glow: {
    shadowColor: '#3525CD',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 6,
  },
};

export type ThemeTokens = typeof lightTokens;
