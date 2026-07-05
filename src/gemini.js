const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

async function geminiFetch(path, { apiKey, method = 'GET', body }) {
  const url = path.startsWith('http') ? path : `${BASE_URL}/${path.replace(/^\/+/, '')}`;
  const res = await fetch(url, {
    method,
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json'
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
    const err = new Error(data.error?.message || data.error || `Gemini respondeu ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function dataUrlToInlinePart(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
  if (!match) return null;
  return { inline_data: { mime_type: match[1], data: match[2] } };
}

async function generateImage({ apiKey, model, prompt, aspectRatio, referenceImages }) {
  const parts = [];
  (referenceImages || []).forEach((dataUrl) => {
    const part = dataUrlToInlinePart(dataUrl);
    if (part) parts.push(part);
  });
  parts.push({ text: prompt });

  const generationConfig = { responseModalities: ['IMAGE', 'TEXT'] };
  if (aspectRatio) generationConfig.imageConfig = { aspectRatio };

  const data = await geminiFetch(`models/${model}:generateContent`, {
    apiKey,
    method: 'POST',
    body: { contents: [{ parts }], generationConfig }
  });

  // Campo documentado do Gemini pra prompt bloqueado por seguranca (distinto
  // do raiMediaFilteredCount do Veo, que so existe pra video).
  if (data.promptFeedback?.blockReason) {
    const err = new Error(
      `O Gemini bloqueou o prompt por politica de conteudo (${data.promptFeedback.blockReason}) `
      + '- comum ao citar nomes de personagens protegidos por direitos autorais. Ajuste o prompt e tente novamente.'
    );
    err.status = 422;
    throw err;
  }

  const candidate = data.candidates?.[0];
  const candidateParts = candidate?.content?.parts || [];
  const images = candidateParts
    .map((part) => {
      const inline = part.inlineData || part.inline_data;
      if (!inline) return null;
      const mime = inline.mimeType || inline.mime_type || 'image/png';
      const bytes = inline.data;
      return bytes ? `data:${mime};base64,${bytes}` : null;
    })
    .filter(Boolean);

  // finishReason diferente de STOP (ex.: IMAGE_SAFETY, PROHIBITED_CONTENT) as
  // vezes vem acompanhado de uma imagem generica sem relacao com o prompt em
  // vez de um erro/campo vazio - avisa o usuario mesmo quando uma imagem foi
  // retornada, pra nao passar batido como se tivesse dado certo.
  if (images.length && candidate?.finishReason && candidate.finishReason !== 'STOP') {
    const err = new Error(
      `O Gemini pode ter alterado o resultado por politica de conteudo (${candidate.finishReason}) - `
      + 'se a imagem gerada nao corresponde ao prompt, isso e provavelmente o motivo (comum ao citar '
      + 'nomes de personagens protegidos por direitos autorais). Ajuste o prompt e tente novamente.'
    );
    err.status = 422;
    throw err;
  }

  return { images };
}

async function createVideoJob({ apiKey, model, prompt, aspectRatio, resolution, referenceImage }) {
  const instance = { prompt };
  const refPart = referenceImage ? dataUrlToInlinePart(referenceImage) : null;
  if (refPart) {
    instance.image = { bytesBase64Encoded: refPart.inline_data.data, mimeType: refPart.inline_data.mime_type };
  }
  const parameters = {};
  if (aspectRatio) parameters.aspectRatio = aspectRatio;
  if (resolution) parameters.resolution = resolution;

  const data = await geminiFetch(`models/${model}:predictLongRunning`, {
    apiKey,
    method: 'POST',
    body: { instances: [instance], parameters }
  });

  return { id: data.name, status: data.done ? 'completed' : 'pending' };
}

async function pollVideoJob({ apiKey, jobId }) {
  const data = await geminiFetch(jobId, { apiKey });
  if (!data.done) {
    return { id: jobId, status: 'processing', unsignedUrls: [] };
  }
  if (data.error) {
    const err = new Error(data.error.message || 'Falha na geracao de video');
    err.status = data.error.code;
    throw err;
  }
  const response = data.response || {};
  const samples = response.generateVideoResponse?.generatedSamples
    || response.generatedVideos
    || response.videos
    || [];
  const urls = samples
    .map((sample) => {
      const video = sample.video || sample;
      const uri = video?.uri || video?.name;
      if (!uri) return null;
      const base = uri.startsWith('http') ? uri : `${BASE_URL}/${uri.replace(/^\/+/, '')}`;
      const sep = base.includes('?') ? '&' : '?';
      return `${base}${sep}key=${apiKey}`;
    })
    .filter(Boolean);

  if (!urls.length) {
    // Google's video models can finish "successfully" (done:true, no error) but
    // produce zero output when their content-safety filter blocks the result -
    // typical when the reference photo/prompt involves recognizable copyrighted
    // characters or people. Surface that distinctly instead of a generic failure.
    const filteredCount = response.raiMediaFilteredCount ?? response.generateVideoResponse?.raiMediaFilteredCount;
    const filteredReasons = response.raiMediaFilteredReasons || response.generateVideoResponse?.raiMediaFilteredReasons;
    if (filteredCount) {
      const err = new Error(
        `O Gemini bloqueou a geracao por politica de conteudo${filteredReasons ? `: ${filteredReasons.join('; ')}` : ''
        } (comum ao usar fotos de referencia com personagens/pessoas reconheciveis). Tente outra imagem ou ajuste o prompt.`
      );
      err.status = 422;
      throw err;
    }
  }

  return { id: jobId, status: urls.length ? 'completed' : 'failed', unsignedUrls: urls };
}

module.exports = { generateImage, createVideoJob, pollVideoJob };
