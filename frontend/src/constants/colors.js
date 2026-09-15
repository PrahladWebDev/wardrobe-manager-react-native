// Swatch hex values for the free-text `color` field on items, used by the
// Stats "By color" breakdown. Kept out of the screen so it's reusable.
export const COLOR_SWATCHES = {
  black: '#1a1a1a', white: '#f5f5f5', grey: '#9a9a9a', gray: '#9a9a9a',
  navy: '#1f2b4d', blue: '#3a5aE0', 'light blue': '#a9c6f5', denim: '#3f5a7d',
  red: '#c0392b', maroon: '#6e2430', pink: '#e58fb0', 'hot pink': '#ff3d8b',
  orange: '#e07b39', peach: '#f6c199', yellow: '#e8c93a', mustard: '#c9a227',
  green: '#3e8a5c', olive: '#6b6f2f', 'olive green': '#6b6f2f', teal: '#2f8f8a', mint: '#a6e3c4',
  purple: '#7a4fd6', lavender: '#c6b6f0', beige: '#d9c9a8', tan: '#c9a877',
  brown: '#6b4a33', khaki: '#c3b091', cream: '#f2e8d5', gold: '#c9a227', silver: '#c7c9cc',
  unspecified: '#b8b2a4',
};

export const swatchFor = (name) => COLOR_SWATCHES[String(name || '').toLowerCase()] || '#b8b2a4';
