// Canonical Dress Code taxonomy, shared across item tagging, outfit occasion,
// and the Surprise Me filter — so "Office" always means the same thing
// everywhere instead of each screen having its own free-text list.
export const DRESS_CODES = [
  { key: 'casual', label: 'Casual', icon: 'cafe-outline' },
  { key: 'office', label: 'Office', icon: 'briefcase-outline' },
  { key: 'formal', label: 'Formal', icon: 'diamond-outline' },
  { key: 'party', label: 'Party', icon: 'sparkles-outline' },
  { key: 'athleisure', label: 'Athleisure', icon: 'barbell-outline' },
  { key: 'loungewear', label: 'Loungewear', icon: 'home-outline' },
  { key: 'travel', label: 'Travel', icon: 'airplane-outline' },
  { key: 'outdoor', label: 'Outdoor', icon: 'leaf-outline' },
];

export const DRESS_CODE_KEYS = DRESS_CODES.map((d) => d.key);

export const labelForDressCode = (key) => DRESS_CODES.find((d) => d.key === key)?.label || key;
