// Local-time date helpers. `toISOString()` gives the UTC date, which is
// yesterday for anyone east of Greenwich after midnight, so everything that
// shows or sends a calendar date goes through these instead.

const pad = (n) => String(n).padStart(2, '0');

export const localDateStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const parseLocalDate = (str) => {
  const [y, m, d] = String(str).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const isISODate = (str) => /^\d{4}-\d{2}-\d{2}$/.test(str || '') && !Number.isNaN(parseLocalDate(str).getTime());

export const deviceTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch (_) {
    return 'UTC';
  }
};

export const formatLongDate = (d = new Date()) =>
  d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
