const IMAGES_URL = 'https://openrouter.ai/api/v1/images';
const VIDEOS_URL = 'https://openrouter.ai/api/v1/videos';

async function openrouterFetch(url, { apiKey, method = 'GET', body }) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://criativopublicitario.com.br',
      'X-Title': 'MultiIA'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(data.error?.message || data.error || `OpenRouter respondeu ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function generateImage({ apiKey, model, prompt, aspectRatio }) {
  const body = { model, prompt };
  if (aspectRatio) body.aspect_ratio = aspectRatio;
  const data = await openrouterFetch(IMAGES_URL, { apiKey, method: 'POST', body });
  const images = (data.data || []).map((item) => {
    if (item.b64_json) {
      const mime = item.media_type || 'image/png';
      return `data:${mime};base64,${item.b64_json}`;
    }
    return item.url;
  }).filter(Boolean);
  return { images, usage: data.usage };
}

async function createVideoJob({ apiKey, model, prompt, aspectRatio, duration, resolution }) {
  const body = { model, prompt };
  if (aspectRatio) body.aspect_ratio = aspectRatio;
  if (duration) body.duration = duration;
  if (resolution) body.resolution = resolution;
  const data = await openrouterFetch(VIDEOS_URL, { apiKey, method: 'POST', body });
  return { id: data.id, status: data.status || 'pending' };
}

async function pollVideoJob({ apiKey, jobId }) {
  const data = await openrouterFetch(`${VIDEOS_URL}/${jobId}`, { apiKey });
  return {
    id: data.id,
    status: data.status,
    unsignedUrls: data.unsigned_urls || [],
    usage: data.usage
  };
}

module.exports = { generateImage, createVideoJob, pollVideoJob };
