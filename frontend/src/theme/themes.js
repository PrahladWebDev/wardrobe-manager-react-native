// Central theme definitions. Each theme provides the same shape:
// { colors, radius, spacing, shadow, typography }
// so components can swap themes without changing structure.

const radius = {
  sm: 12,
  md: 18,
  lg: 28,
  pill: 999,
};

// Cards, buttons and badges all use a deliberate hairline-to-thick outline
// (see Card/Button/PillBadge) instead of relying on shadow for definition.
const border = {
  width: 2.5,
};

const spacing = (n) => n * 4;

function makeShadow(shadowColor) {
  return {
    card: {
      shadowColor,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.06,
      shadowRadius: 0,
      elevation: 2,
    },
    subtle: {
      shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 0,
      elevation: 1,
    },
  };
}

// Headlines use a bold display serif (Playfair Display); everything else
// stays on the system sans-serif for readability. Falls back to the
// platform serif automatically if the font hasn't finished loading yet.
function makeTypography(colors) {
  return {
    display: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 32, color: colors.text, letterSpacing: -0.2 },
    h1: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 28, color: colors.text, letterSpacing: -0.2 },
    h2: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 21, color: colors.text },
    h3: { fontSize: 17, fontWeight: '700', color: colors.text },
    body: { fontSize: 15, fontWeight: '400', color: colors.text },
    bodyMuted: { fontSize: 14, fontWeight: '400', color: colors.textMuted },
    label: { fontSize: 12, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.4 },
    button: { fontSize: 15, fontWeight: '700' },
  };
}

function build(id, name, mode, colors, extra = {}) {
  return {
    id,
    name,
    mode, // 'light' | 'dark' — drives StatusBar style
    colors,
    radius,
    border,
    spacing,
    shadow: makeShadow(mode === 'dark' ? '#000000' : colors.text),
    typography: makeTypography(colors),
    gradient: extra.gradient || [colors.accent, colors.accent],
  };
}

// 1. Warm Light (original, refined) — default
const warmLight = build('warmLight', 'Warm Sand', 'light', {
  bg: '#FBF7F0',
  surface: '#FFFFFF',
  surfaceAlt: '#F1ECE2',
  border: '#E7E0D2',
  text: '#20201D',
  textMuted: '#7A7468',
  textFaint: '#A8A192',
  accent: '#C1633B',
  accentSoft: '#F1D9CC',
  success: '#4C7A5C',
  successSoft: '#DEEBE1',
  danger: '#B84B4B',
  dangerSoft: '#F5DEDE',
  info: '#3E6E8C',
  infoSoft: '#DCE9F0',
  black: '#000000',
  onAccent: '#FFFFFF',
}, { gradient: ['#C1633B', '#D98A5F'] });

// 2. Midnight (premium dark, deep navy + gold accent)
const midnight = build('midnight', 'Midnight Gold', 'dark', {
  bg: '#0F1115',
  surface: '#1A1D24',
  surfaceAlt: '#22262F',
  border: '#2E323C',
  text: '#F3F1EA',
  textMuted: '#A6ABB8',
  textFaint: '#6C7280',
  accent: '#D4AF6A',
  accentSoft: '#3A331F',
  success: '#6FBF8B',
  successSoft: '#1D2E22',
  danger: '#E2726B',
  dangerSoft: '#3A2222',
  info: '#7FB3D5',
  infoSoft: '#1E2C36',
  black: '#000000',
  onAccent: '#1A1508',
}, { gradient: ['#D4AF6A', '#8A6E36'] });

// 3. Rose Quartz (premium light, blush + plum)
const roseQuartz = build('roseQuartz', 'Rose Quartz', 'light', {
  bg: '#FBF4F5',
  surface: '#FFFFFF',
  surfaceAlt: '#F6E9EC',
  border: '#EED9DE',
  text: '#2B1F24',
  textMuted: '#8A6E76',
  textFaint: '#BBA0A7',
  accent: '#A24E68',
  accentSoft: '#F1D6DE',
  success: '#5C8A6F',
  successSoft: '#E2EFE6',
  danger: '#B94A4A',
  dangerSoft: '#F6DEDE',
  info: '#5A7599',
  infoSoft: '#E1E9F1',
  black: '#000000',
  onAccent: '#FFFFFF',
}, { gradient: ['#A24E68', '#C97C93'] });

// 4. Emerald Noir (premium dark, forest green + brass)
const emeraldNoir = build('emeraldNoir', 'Emerald Noir', 'dark', {
  bg: '#0D1512',
  surface: '#16211C',
  surfaceAlt: '#1D2B24',
  border: '#28382F',
  text: '#EDF3EF',
  textMuted: '#9FB3A9',
  textFaint: '#647A6E',
  accent: '#4FA37B',
  accentSoft: '#1D3428',
  success: '#4FA37B',
  successSoft: '#1D3428',
  danger: '#DD7A6E',
  dangerSoft: '#3A2420',
  info: '#7AAFC2',
  infoSoft: '#1C2E35',
  black: '#000000',
  onAccent: '#08140E',
}, { gradient: ['#4FA37B', '#2E6B54'] });

// 5. Slate (cool, minimal neutral light)
const slate = build('slate', 'Slate Minimal', 'light', {
  bg: '#F5F6F8',
  surface: '#FFFFFF',
  surfaceAlt: '#ECEEF2',
  border: '#DEE1E7',
  text: '#1B1E24',
  textMuted: '#5F6673',
  textFaint: '#9AA1AD',
  accent: '#3A5AE0',
  accentSoft: '#DDE4FB',
  success: '#3E9B6B',
  successSoft: '#DFF1E7',
  danger: '#D14F4F',
  dangerSoft: '#FADEDE',
  info: '#3A5AE0',
  infoSoft: '#DDE4FB',
  black: '#000000',
  onAccent: '#FFFFFF',
}, { gradient: ['#3A5AE0', '#6C8AF0'] });

// 6. Cream Ink — matches the cream/near-black outlined reference design:
// warm paper background, bold near-black borders on every card, and a
// warm peach accent for highlights/badges.
const creamInk = build('creamInk', 'Cream Ink', 'light', {
  bg: '#F7F1E4',
  surface: '#FFFFFF',
  surfaceAlt: '#EFE6D3',
  border: '#14151A',
  text: '#14151A',
  textMuted: '#5B5A55',
  textFaint: '#8E8C82',
  accent: '#5B4FE0',
  accentSoft: '#F3DCC0',
  success: '#3E8A5C',
  successSoft: '#DCEFE1',
  danger: '#C33D6F',
  dangerSoft: '#F7D8E4',
  info: '#3A5AE0',
  infoSoft: '#DDE4FB',
  black: '#000000',
  onAccent: '#FFFFFF',
}, { gradient: ['#5B4FE0', '#8B7FF0'] });

export const themes = {
  creamInk,
  warmLight,
  midnight,
  roseQuartz,
  emeraldNoir,
  slate,
};

export const themeList = Object.values(themes).map((t) => ({ id: t.id, name: t.name, mode: t.mode, accent: t.colors.accent, bg: t.colors.bg, surface: t.colors.surface }));

export const DEFAULT_THEME_ID = 'creamInk';
