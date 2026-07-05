// Modern minimalist palette — warm off-white base with a deep charcoal
// and a single confident accent (terracotta) used sparingly.
export const colors = {
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
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
};

export const spacing = (n) => n * 4;

export const shadow = {
  card: {
    shadowColor: '#20201D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  subtle: {
    shadowColor: '#20201D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  h2: { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  h3: { fontSize: 17, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, fontWeight: '400', color: colors.text },
  bodyMuted: { fontSize: 14, fontWeight: '400', color: colors.textMuted },
  label: { fontSize: 12, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.4 },
  button: { fontSize: 15, fontWeight: '700' },
};
