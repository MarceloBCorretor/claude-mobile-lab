const path = require('path');
const express = require('express');
const store = require('./src/config-store');
const session = require('./src/session');
const conversationStore = require('./src/conversation-store');
const { streamChatCompletion } = require('./src/openrouter');
const gemini = require('./src/gemini');
const openaiImages = require('./src/openai-images');
const openaiAudio = require('./src/openai-audio');

const app = express();

app.use(express.json({ limit: '25mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Public API ---------------------------------------------------------

app.get('/api/models', (_req, res) => {
  res.json({ models: store.getEnabledModels('chat').map(({ id, label }) => ({ id, label })) });
});

app.get('/api/models/media', (_req, res) => {
  res.json({
    models: [
      ...store.getEnabledModels('image').map(({ id, label, provider }) => ({ id, label, kind: 'image', provider: provider || 'gemini' })),
      ...store.getEnabledModels('video').map(({ id, label, provider }) => ({ id, label, kind: 'video', provider: provider || 'gemini' })),
      ...store.getEnabledModels('audio').map(({ id, label, provider }) => ({ id, label, kind: 'audio', provider: provider || 'openai' }))
    ]
  });
});

app.post('/api/chat', session.requireAdmin, async (req, res) => {
  const { modelId, messages } = req.body || {};
  if (!modelId || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'modelId e messages sao obrigatorios' });
  }

  const config = store.getConfig();
  const model = store.getEnabledModels('chat').find((m) => m.id === modelId);
  if (!model) {
    return res.status(400).json({ error: 'Modelo nao habilitado' });
  }
  if (!config.openrouterApiKey) {
    return res.status(503).json({
      error: 'Chave da OpenRouter nao configurada. Peca ao administrador para configura-la em /admin.'
    });
  }

  try {
    await streamChatCompletion(
      { apiKey: config.openrouterApiKey, model: modelId, messages },
      res
    );
  } catch (err) {
    if (!res.headersSent) {
      res.status(err.status || 502).json({ error: 'Falha ao falar com a OpenRouter', details: err.message });
    } else {
      res.end();
    }
  }
});

// --- Image/video generation (direto na API do Gemini/Google AI Studio) ---

app.post('/api/generate/image', session.requireAdmin, async (req, res) => {
  const { modelId, prompt, aspectRatio, referenceImages } = req.body || {};
  if (!modelId || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'modelId e prompt sao obrigatorios' });
  }
  const config = store.getConfig();
  const model = store.getEnabledModels('image').find((m) => m.id === modelId);
  if (!model) return res.status(400).json({ error: 'Modelo de imagem nao habilitado' });

  const provider = model.provider || 'gemini';
  try {
    let result;
    if (provider === 'openai') {
      if (!config.openaiApiKey) {
        return res.status(503).json({ error: 'Chave da OpenAI nao configurada. Peca ao administrador para configura-la em /admin.' });
      }
      result = await openaiImages.generateImage({ apiKey: config.openaiApiKey, model: modelId, prompt, aspectRatio });
    } else {
      if (!config.geminiApiKey) {
        return res.status(503).json({ error: 'Chave do Gemini (Google AI Studio) nao configurada. Peca ao administrador para configura-la em /admin.' });
      }
      result = await gemini.generateImage({ apiKey: config.geminiApiKey, model: modelId, prompt, aspectRatio, referenceImages });
    }
    res.json(result);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || 'Falha ao gerar imagem' });
  }
});

app.post('/api/generate/video', session.requireAdmin, async (req, res) => {
  const { modelId, prompt, aspectRatio, resolution, referenceImage } = req.body || {};
  if (!modelId || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'modelId e prompt sao obrigatorios' });
  }
  const config = store.getConfig();
  const model = store.getEnabledModels('video').find((m) => m.id === modelId);
  if (!model) return res.status(400).json({ error: 'Modelo de video nao habilitado' });
  if (!config.geminiApiKey) {
    return res.status(503).json({ error: 'Chave do Gemini (Google AI Studio) nao configurada. Peca ao administrador para configura-la em /admin.' });
  }
  try {
    // Omni Flash usa a Interactions API (endpoint/formato diferente do Veo) -
    // detectado pelo prefixo do id do modelo, nao por um campo "provider"
    // separado (a chave usada e a mesma, GEMINI_API_KEY).
    const job = modelId.startsWith('gemini-omni')
      ? await gemini.createOmniVideoJob({ apiKey: config.geminiApiKey, model: modelId, prompt, aspectRatio, resolution, referenceImage })
      : await gemini.createVideoJob({ apiKey: config.geminiApiKey, model: modelId, prompt, aspectRatio, resolution, referenceImage });
    res.json(job);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || 'Falha ao iniciar geracao de video' });
  }
});

app.get('/api/generate/video/:jobId(.*)', session.requireAdmin, async (req, res) => {
  const config = store.getConfig();
  if (!config.geminiApiKey) {
    return res.status(503).json({ error: 'Chave do Gemini (Google AI Studio) nao configurada.' });
  }
  try {
    const status = req.params.jobId.startsWith('omni:')
      ? await gemini.pollOmniVideoJob({ apiKey: config.geminiApiKey, jobId: req.params.jobId.slice('omni:'.length) })
      : await gemini.pollVideoJob({ apiKey: config.geminiApiKey, jobId: req.params.jobId });
    res.json(status);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || 'Falha ao consultar status do video' });
  }
});

// Baixar o video gerado atraves do proprio servidor (mesma origem) em vez de
// linkar direto pra generativelanguage.googleapis.com - o atributo `download`
// do navegador e ignorado em URLs de outra origem, entao clicar em "Baixar"
// so abria/tocava o video em vez de salvar. Repassando com Content-Disposition
// forcamos o download de verdade em qualquer navegador.
app.get('/api/download-video', session.requireAdmin, async (req, res) => {
  const { url } = req.query;
  if (typeof url !== 'string' || !/^https:\/\/generativelanguage\.googleapis\.com\//.test(url)) {
    return res.status(400).json({ error: 'URL de video invalida' });
  }
  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Erro ${upstream.status} ao baixar o video` });
    }
    res.setHeader('Content-Disposition', 'attachment; filename="multiia-video.mp4"');
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'video/mp4');
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.send(buffer);
  } catch (err) {
    res.status(502).json({ error: 'Falha ao baixar o video' });
  }
});

// --- Transcricao de audio (OpenAI) -----------------------------------------

app.post('/api/generate/audio', session.requireAdmin, async (req, res) => {
  const { modelId, audioDataUrl, prompt, filename } = req.body || {};
  if (!modelId || typeof audioDataUrl !== 'string' || !audioDataUrl) {
    return res.status(400).json({ error: 'modelId e audioDataUrl sao obrigatorios' });
  }
  const config = store.getConfig();
  const model = store.getEnabledModels('audio').find((m) => m.id === modelId);
  if (!model) return res.status(400).json({ error: 'Modelo de audio nao habilitado' });
  if (!config.openaiApiKey) {
    return res.status(503).json({ error: 'Chave da OpenAI nao configurada. Peca ao administrador para configura-la em /admin.' });
  }
  try {
    const result = await openaiAudio.transcribeAudio({ apiKey: config.openaiApiKey, model: modelId, audioDataUrl, prompt, filename });
    res.json(result);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || 'Falha ao transcrever audio' });
  }
});

// --- Admin API -----------------------------------------------------------

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (!store.verifyAdminPassword(password)) {
    return res.status(401).json({ error: 'Senha incorreta' });
  }
  session.setSessionCookie(res);
  res.json({ ok: true });
});

app.post('/api/admin/logout', (_req, res) => {
  session.clearSessionCookie(res);
  res.json({ ok: true });
});

// --- Conversation memory (cross-device) ---------------------------------

app.get('/api/conversations', session.requireAdmin, async (_req, res) => {
  try {
    const conversations = await conversationStore.getConversations();
    res.json({ conversations, persistent: conversationStore.usePostgres || store.isPersistent() });
  } catch (err) {
    res.status(500).json({ error: 'Falha ao carregar conversas', details: err.message });
  }
});

app.put('/api/conversations', session.requireAdmin, async (req, res) => {
  try {
    await conversationStore.saveConversations(req.body.conversations || []);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Falha ao salvar conversas', details: err.message });
  }
});

app.get('/api/admin/config', session.requireAdmin, (_req, res) => {
  const config = store.getConfig();
  res.json({
    platform: store.getPlatform(),
    persistent: store.isPersistent(),
    apiKeyConfigured: Boolean(config.openrouterApiKey),
    apiKeySource: config.apiKeySource,
    geminiApiKeyConfigured: Boolean(config.geminiApiKey),
    geminiApiKeySource: config.geminiApiKeySource,
    openaiApiKeyConfigured: Boolean(config.openaiApiKey),
    openaiApiKeySource: config.openaiApiKeySource,
    models: config.models
  });
});

app.post('/api/admin/config', session.requireAdmin, (req, res) => {
  const { apiKey, geminiApiKey, openaiApiKey, models } = req.body || {};
  const patch = {};

  if (typeof apiKey === 'string' && apiKey.trim()) {
    patch.openrouterApiKey = apiKey.trim();
  }
  if (typeof geminiApiKey === 'string' && geminiApiKey.trim()) {
    patch.geminiApiKey = geminiApiKey.trim();
  }
  if (typeof openaiApiKey === 'string' && openaiApiKey.trim()) {
    patch.openaiApiKey = openaiApiKey.trim();
  }
  if (Array.isArray(models)) {
    const cleaned = models
      .filter((m) => m && typeof m.id === 'string' && m.id.trim())
      .map((m) => ({
        id: m.id.trim(),
        label: (typeof m.label === 'string' && m.label.trim()) || m.id.trim(),
        enabled: Boolean(m.enabled),
        kind: ['chat', 'image', 'video', 'audio'].includes(m.kind) ? m.kind : 'chat',
        provider: ['gemini', 'openai'].includes(m.provider) ? m.provider : 'gemini'
      }));
    if (cleaned.length) patch.models = cleaned;
  }

  const persisted = store.saveConfig(patch);
  const config = store.getConfig();
  res.json({
    ok: true,
    persisted,
    platform: store.getPlatform(),
    apiKeyConfigured: Boolean(config.openrouterApiKey),
    geminiApiKeyConfigured: Boolean(config.geminiApiKey),
    openaiApiKeyConfigured: Boolean(config.openaiApiKey),
    models: config.models
  });
});

app.post('/api/admin/password', session.requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!store.verifyAdminPassword(currentPassword)) {
    return res.status(401).json({ error: 'Senha atual incorreta' });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ error: 'Nova senha deve ter ao menos 6 caracteres' });
  }
  const persisted = store.setAdminPassword(newPassword);
  res.json({ ok: true, persisted });
});

module.exports = app;

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`MultiIA rodando em http://localhost:${port}`);
  });
}
