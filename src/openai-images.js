const IMAGES_URL = 'https://api.openai.com/v1/images/generations';

function sizeFromAspectRatio(aspectRatio) {
  if (!aspectRatio || !aspectRatio.includes(':')) return '1024x1024';
  const [w, h] = aspectRatio.split(':').map(Number);
  if (!w || !h || w === h) return '1024x1024';
  return w > h ? '1536x1024' : '1024x1536';
}

async function generateImage({ apiKey, model, prompt, aspectRatio }) {
  const res = await fetch(IMAGES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model, prompt, size: sizeFromAspectRatio(aspectRatio), n: 1 })
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(data.error?.message || data.error || `OpenAI respondeu ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const images = (data.data || [])
    .map((item) => (item.b64_json ? `data:image/png;base64,${item.b64_json}` : item.url))
    .filter(Boolean);
  return { images };
}

module.exports = { generateImage };
