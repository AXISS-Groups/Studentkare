// Design Tokens based on Impilo Pearl & Deep Iris Design Tokens
export const lightTokens = {
  // Impilo Canonical Named Color Scale
  blue01: '#161658',        // Deep midnight navy
  blue02: '#232265',        // Navy card / dark indigo
  blue03: '#4846BF',        // Medium blue indigo
  blue04: '#524FD9',        // Primary brand vibrant purple-indigo
  blue05: '#3F3CCD',        // Deep vibrant royal indigo
  blue06: '#2F6BEE',        // Bright electric cobalt blue
  blue07: '#B1C3FC',        // Soft sky periwinkle
  lavender01: '#5250C5',
  lavender02: '#6563DA',
  lavender03: '#876EEC',    // Vibrant lilac purple
  lavender04: '#B1A6F6',    // Soft lilac lavender
  lavender05: '#E6E4FB',    // Very pale lavender tint
  lavender06: '#F1F1FD',    // Ultra light lavender surface
  silver01: '#9494A7',      // Muted silver text
  silver02: '#D8D8E3',      // Soft border / rule
  silver03: '#F4F4F6',      // Pearl background
  silver04: '#F4F4FB',      // Off-white lavender canvas
  silver05: '#FFFFFF',      // Pure cloud white
  brightTurquoise: '#72E6FF',
  brightBlue: '#3FAEFF',
  brightGreen: '#5CFFB1',

  // Canonical Design Doc v1.0 Palette Tokens
  ink900: '#0E2A45',        // Deep ink — headings, spine, emphasis
  ink700: '#17466F',        // Primary actions, active nav
  ink500: '#2E6FA8',        // Links, secondary actions
  paper: '#FBFCFD',         // Cool paper background
  paperAlt: '#F2F5F8',      // Recessed surfaces
  inRange: '#0E8C7F',       // Teal — within the lab's own range

  // Semantic UI Mapping (Pearl Dominant Light Theme)
  canvas: '#f6f7fc',        // Cool indigo-tinted canvas
  surface: '#ffffff',       // Cloud White
  surface2: '#eef0ff',      // Recessed indigo surface
  surface3: '#e0e0ff',      // Icon tiles, selected rows, pill backgrounds
  rule: '#dce1f0',
  ruleSoft: '#e9ecf5',
  veil: '#b9b6e8',          // Dashed borders, disabled elements

  ink: '#192347',           // Ink indigo — primary headings
  ink2: '#232269',          // Iris Shadow — deeper block fill
  text: '#192347',          // Primary text
  text2: '#515e7a',         // Secondary text
  text3: '#63708b',         // Muted/meta text, timestamps

  action: '#4f46e5',        // Indigo — primary action
  actionHover: '#4338ca',
  onAction: '#ffffff',
  data: '#4338ca',          // Values, links, charts
  data2: '#4f46e5',
  art: '#8f86d8',           // Line art on Pearl
  artSoft: '#b1a6f6',       // Lilac Mist — decorative fills
  cyan: '#00b1ff',          // Clinical Cyan — strokes, accents

  positive: '#007a55',      // Mint Vital darkened
  positiveFill: '#00ffaa',
  positiveBg: '#e6f7f1',
  attention: '#C97A10',     // Amber — outside range. NEVER red (Rule E5).
  attentionFill: '#ffb020',
  attentionBg: '#fef7e8',
  emergency: '#B32318',     // Emergency SOS Red (Emergency surfaces ONLY)
  emergencyFill: '#ff5647',
  emergencyBg: '#fdf2f1',
  reward: '#6A4FB6',        // Reward Violet — points & offers (off-palette)
  rewardBg: '#f3eefc',

  glow: 'rgba(83, 80, 204, 0.18)',
  glowStrong: 'rgba(83, 80, 204, 0.35)',
};

export const darkTokens = {
  // Impilo Canonical Named Color Scale
  blue01: '#161658',
  blue02: '#232265',
  blue03: '#4846BF',
  blue04: '#524FD9',
  blue05: '#3F3CCD',
  blue06: '#2F6BEE',
  blue07: '#B1C3FC',
  lavender01: '#5250C5',
  lavender02: '#6563DA',
  lavender03: '#876EEC',
  lavender04: '#B1A6F6',
  lavender05: '#E6E4FB',
  lavender06: '#F1F1FD',
  silver01: '#9494A7',
  silver02: '#D8D8E3',
  silver03: '#F4F4F6',
  silver04: '#F4F4FB',
  silver05: '#FFFFFF',
  brightTurquoise: '#72E6FF',
  brightBlue: '#3FAEFF',
  brightGreen: '#5CFFB1',

  // Canonical Design Doc v1.0 Palette Tokens
  ink900: '#eef2ff',
  ink700: '#a5b4fc',
  ink500: '#818cf8',
  paper: '#0e1428',
  paperAlt: '#171f38',
  inRange: '#2dd4bf',

  // Semantic UI Mapping (Deep Iris Dominant Dark Theme)
  canvas: '#0e1428',        // Midnight indigo canvas
  surface: '#171f38',
  surface2: '#202a48',
  surface3: '#2e3862',
  rule: '#354161',
  ruleSoft: '#283350',
  veil: '#524fe1',

  ink: '#eef2ff',
  ink2: '#10172e',
  text: '#eef2ff',
  text2: '#bcc7e2',
  text3: '#a5b1ce',

  action: '#6366f1',
  actionHover: '#4f46e5',
  onAction: '#ffffff',
  data: '#a5b4fc',
  data2: '#c7d2fe',
  art: '#b1a6f6',
  artSoft: '#8f86d8',
  cyan: '#00b1ff',

  positive: '#00ffaa',
  positiveFill: '#00ffaa',
  positiveBg: 'rgba(0, 255, 170, 0.12)',
  attention: '#ffb020',
  attentionFill: '#ffb020',
  attentionBg: 'rgba(255, 176, 32, 0.15)',
  emergency: '#ff5647',
  emergencyFill: '#ff5647',
  emergencyBg: 'rgba(255, 86, 71, 0.18)',
  reward: '#2ee9ff',
  rewardBg: 'rgba(46, 233, 255, 0.15)',

  glow: 'rgba(83, 80, 204, 0.45)',
  glowStrong: 'rgba(83, 80, 204, 0.70)',
};

export const typography = {
  fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
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
    shadowColor: '#16165c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#16165c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: '#16165c',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 30,
    elevation: 8,
  },
  glow: {
    shadowColor: '#5350cc',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 6,
  },
};

export type ThemeTokens = typeof lightTokens;
