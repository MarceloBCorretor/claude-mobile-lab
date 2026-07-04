const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'runtime-config.json');

// Vercel's filesystem is read-only outside /tmp and not persisted between
// invocations/deployments, so we can't rely on writing runtime-config.json
// there. Detect it and fall back to environment variables only.
const IS_VERCEL = Boolean(process.env.VERCEL);

const DEFAULT_MODELS = [
  { id: 'z-ai/glm-5.2', label: 'GLM-5.2', enabled: true, kind: 'chat' },
  { id: 'moonshotai/kimi-k2.6', label: 'Kimi K2.6', enabled: true, kind: 'chat' },
  { id: 'deepseek/deepseek-v4-pro', label: 'DeepSeek V4-Pro', enabled: true, kind: 'chat' },
  { id: 'qwen/qwen3', label: 'Qwen3', enabled: true, kind: 'chat' },
  { id: 'minimax/minimax-m2.7', label: 'MiniMax M2.7', enabled: true, kind: 'chat' },
  { id: 'google/gemini-3.1-flash-image-preview', label: 'Nano Banana 2 (Gemini)', enabled: true, kind: 'image' },
  { id: 'minimax/hailuo-2.3', label: 'MiniMax Video', enabled: true, kind: 'video' }
];

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function readFileConfig() {
  if (IS_VERCEL) return null;
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function writeFileConfig(config) {
  if (IS_VERCEL) return false;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (err) {
    return false;
  }
}

function defaultAdminPassword() {
  const password = process.env.ADMIN_PASSWORD || 'admin';
  const salt = crypto.randomBytes(16).toString('hex');
  return { adminPasswordSalt: salt, adminPasswordHash: hashPassword(password, salt) };
}

function loadConfig() {
  const fileConfig = readFileConfig() || {};
  const models = Array.isArray(fileConfig.models) && fileConfig.models.length
    ? fileConfig.models.map((m) => ({ kind: 'chat', ...m }))
    : DEFAULT_MODELS;

  let adminPasswordHash = fileConfig.adminPasswordHash;
  let adminPasswordSalt = fileConfig.adminPasswordSalt;
  if (!adminPasswordHash || !adminPasswordSalt) {
    const generated = defaultAdminPassword();
    adminPasswordHash = generated.adminPasswordHash;
    adminPasswordSalt = generated.adminPasswordSalt;
  }

  return {
    openrouterApiKey: fileConfig.openrouterApiKey || process.env.OPENROUTER_API_KEY || '',
    apiKeySource: fileConfig.openrouterApiKey ? 'file' : (process.env.OPENROUTER_API_KEY ? 'env' : 'none'),
    models,
    adminPasswordHash,
    adminPasswordSalt
  };
}

let cache = loadConfig();

function getConfig() {
  return cache;
}

function isPersistent() {
  return !IS_VERCEL;
}

function getPlatform() {
  return IS_VERCEL ? 'vercel' : 'node';
}

function saveConfig(partial) {
  const next = { ...cache, ...partial };
  const persisted = writeFileConfig({
    openrouterApiKey: next.openrouterApiKey,
    models: next.models,
    adminPasswordHash: next.adminPasswordHash,
    adminPasswordSalt: next.adminPasswordSalt
  });
  cache = { ...next, apiKeySource: next.openrouterApiKey ? (persisted ? 'file' : 'memory') : (process.env.OPENROUTER_API_KEY ? 'env' : 'none') };
  return persisted;
}

function verifyAdminPassword(password) {
  const { adminPasswordHash, adminPasswordSalt } = cache;
  if (!adminPasswordHash || !adminPasswordSalt) return false;
  const computed = hashPassword(password || '', adminPasswordSalt);
  return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(adminPasswordHash, 'hex'));
}

function setAdminPassword(newPassword) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(newPassword, salt);
  return saveConfig({ adminPasswordSalt: salt, adminPasswordHash: hash });
}

function getEnabledModels(kind = 'chat') {
  return cache.models.filter((m) => m.enabled && (m.kind || 'chat') === kind);
}

module.exports = {
  getConfig,
  saveConfig,
  verifyAdminPassword,
  setAdminPassword,
  getEnabledModels,
  isPersistent,
  getPlatform,
  DEFAULT_MODELS
};
