// Tiny color helpers so screens can derive tints from theme tokens instead of
// hardcoding hex literals that only look right on one theme.

const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

// mix('#fff', '#000', 0.5) -> '#808080'
export function mix(a, b, t = 0.5) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const c = (x, y) => clamp(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
}

// rgba string from a hex + alpha, for overlays on top of photos.
export function alpha(hex, a = 0.5) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
