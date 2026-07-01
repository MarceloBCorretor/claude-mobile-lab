const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function streamChatCompletion({ apiKey, model, messages, siteUrl, siteName }, res) {
  const upstream = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': siteUrl || 'https://criativopublicitario.com.br',
      'X-Title': siteName || 'MultiIA'
    },
    body: JSON.stringify({ model, messages, stream: true })
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '');
    const err = new Error(text || `OpenRouter respondeu ${upstream.status}`);
    err.status = upstream.status;
    throw err;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(decoder.decode(value, { stream: true }));
  }
  res.end();
}

module.exports = { streamChatCompletion };
