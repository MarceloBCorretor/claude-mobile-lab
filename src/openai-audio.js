const TRANSCRIBE_URL = 'https://api.openai.com/v1/audio/transcriptions';

function dataUrlToParts(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
  if (!match) return null;
  return { mimeType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

async function transcribeAudio({ apiKey, model, audioDataUrl, prompt, filename }) {
  const parts = dataUrlToParts(audioDataUrl);
  if (!parts) {
    const err = new Error('Audio invalido ou nao anexado.');
    err.status = 400;
    throw err;
  }

  const form = new FormData();
  form.append('file', new Blob([parts.buffer], { type: parts.mimeType }), filename || 'audio.webm');
  form.append('model', model);
  form.append('language', 'pt');
  form.append('response_format', 'json');
  if (prompt) form.append('prompt', prompt);

  const res = await fetch(TRANSCRIBE_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form
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
  return { text: data.text || '' };
}

module.exports = { transcribeAudio };
