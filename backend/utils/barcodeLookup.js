const fetch = require('node-fetch');

// Looks up a scanned barcode against UPCItemDB's free "trial" endpoint.
// Works out of the box without any key (rate-limited); set UPC_API_KEY +
// UPC_API_USER_KEY in .env to use a paid plan instead. Always resolves —
// never throws — so a miss/timeout just means "fill it in yourself".
async function lookupBarcode(code) {
  if (!code) return { found: false };
  try {
    const useKey = process.env.UPC_API_KEY && process.env.UPC_API_USER_KEY;
    const url = useKey
      ? `https://api.upcitemdb.com/prod/v1/lookup?upc=${encodeURIComponent(code)}`
      : `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`;
    const headers = useKey
      ? {
          user_key: process.env.UPC_API_USER_KEY,
          key_type: '3scale',
        }
      : {};

    const resp = await fetch(url, { headers, timeout: 6000 });
    if (!resp.ok) return { found: false };
    const data = await resp.json();
    const item = data.items?.[0];
    if (!item) return { found: false };

    return {
      found: true,
      name: item.title || '',
      brand: item.brand || '',
      price: Array.isArray(item.offers) && item.offers.length ? item.offers[0].price : undefined,
      imageUrl: Array.isArray(item.images) ? item.images[0] : undefined,
    };
  } catch (err) {
    return { found: false };
  }
}

module.exports = { lookupBarcode };
