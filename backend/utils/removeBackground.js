const fs = require('fs');
const fetch = require('node-fetch');
const FormData = require('form-data');

// Uses remove.bg's API when REMOVEBG_API_KEY is set. If the key is missing, the
// original image is left untouched — this keeps the app fully functional out of
// the box (background removal becomes a "nice to have" you can turn on later)
// instead of crashing the upload flow.
// Get a free-tier key at https://www.remove.bg/api
async function removeBackgroundFromFile(filePath) {
  const apiKey = process.env.REMOVEBG_API_KEY;
  if (!apiKey) {
    return { success: false, reason: 'no_api_key' };
  }
  try {
    const form = new FormData();
    form.append('image_file', fs.createReadStream(filePath));
    form.append('size', 'auto');

    const resp = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: form,
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      console.warn('remove.bg request failed:', resp.status, errText);
      return { success: false, reason: 'api_error' };
    }

    const buffer = await resp.buffer();
    // remove.bg always returns a PNG with transparency
    const outputPath = filePath.replace(/\.\w+$/, '') + '-nobg.png';
    fs.writeFileSync(outputPath, buffer);
    return { success: true, outputPath };
  } catch (err) {
    console.warn('Background removal failed:', err.message);
    return { success: false, reason: 'exception' };
  }
}

module.exports = { removeBackgroundFromFile };
