const fetch = require('node-fetch');
const FormData = require('form-data');

// Runs OCR.space's free-tier OCR API on a receipt photo buffer, then applies
// a couple of simple heuristics to guess an item name + price out of the raw
// text. Set OCR_API_KEY in .env to use your own key; without one this uses
// OCR.space's public demo key (heavily rate-limited but fine for trying it out),
// same graceful-fallback pattern as weather.js / removeBackground.js.
async function scanReceipt(buffer, filename = 'receipt.jpg') {
  const apiKey = process.env.OCR_API_KEY || 'helloworld'; // OCR.space's public demo key
  try {
    const form = new FormData();
    form.append('apikey', apiKey);
    form.append('language', 'eng');
    form.append('OCREngine', '2');
    form.append('file', buffer, filename);

    const resp = await fetch('https://api.ocr.space/parse/image', { method: 'POST', body: form });
    if (!resp.ok) return { success: false };
    const data = await resp.json();
    const rawText = data.ParsedResults?.[0]?.ParsedText || '';
    if (!rawText.trim()) return { success: false };

    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

    // Guess price: the largest currency-looking number on the receipt (usually the total).
    const priceMatches = rawText.match(/(?:₹|rs\.?|inr)?\s?(\d{2,6}(?:\.\d{2})?)/gi) || [];
    const numbers = priceMatches
      .map((m) => parseFloat(m.replace(/[^\d.]/g, '')))
      .filter((n) => !Number.isNaN(n) && n > 0);
    const guessedPrice = numbers.length ? Math.max(...numbers) : undefined;

    // Guess name: longest mostly-alphabetic line, skipping obvious header/footer noise.
    const noiseWords = /total|subtotal|tax|gst|cash|change|thank|receipt|invoice|date|qty|amount/i;
    const candidateLines = lines.filter((l) => /[a-zA-Z]{3,}/.test(l) && !noiseWords.test(l));
    const guessedName = candidateLines.sort((a, b) => b.length - a.length)[0] || '';

    return { success: true, rawText, guessedName, guessedPrice };
  } catch (err) {
    return { success: false };
  }
}

module.exports = { scanReceipt };
