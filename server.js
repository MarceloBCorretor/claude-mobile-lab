const path = require('path');
const express = require('express');
const store = require('./src/config-store');
const session = require('./src/session');
const conversationStore = require('./src/conversation-store');
const { streamChatCompletion } = require('./src/openrouter');

const app = express();

app.use(express.json({ limit: '25mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Public API ---------------------------------------------------------

app.get('/api/models', (_req, res) => {
  res.json({ models: store.getEnabledModels().map(({ id, label }) => ({ id, label })) });
});

app.post('/api/chat', session.requireAdmin, async (req, res) => {
  const { modelId, messages } = req.body || {};
  if (!modelId || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'modelId e messages sao obrigatorios' });
  }

  const config = store.getConfig();
  const model = store.getEnabledModels().find((m) => m.id === modelId);
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
    models: config.models
  });
});

app.post('/api/admin/config', session.requireAdmin, (req, res) => {
  const { apiKey, models } = req.body || {};
  const patch = {};

  if (typeof apiKey === 'string' && apiKey.trim()) {
    patch.openrouterApiKey = apiKey.trim();
  }
  if (Array.isArray(models)) {
    const cleaned = models
      .filter((m) => m && typeof m.id === 'string' && m.id.trim())
      .map((m) => ({
        id: m.id.trim(),
        label: (typeof m.label === 'string' && m.label.trim()) || m.id.trim(),
        enabled: Boolean(m.enabled)
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
