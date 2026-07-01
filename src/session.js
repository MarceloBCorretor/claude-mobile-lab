const crypto = require('crypto');

const SECRET = process.env.SESSION_SECRET || 'dev-insecure-secret-change-me';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h
const COOKIE_NAME = 'admin_session';

function sign(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('hex');
}

function createToken() {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `admin.${expires}`;
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token) {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [scope, expiresStr, signature] = parts;
  const payload = `${scope}.${expiresStr}`;
  const expected = sign(payload);
  const validSignature = expected.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  if (!validSignature) return false;
  const expires = Number(expiresStr);
  return scope === 'admin' && Number.isFinite(expires) && Date.now() < expires;
}

function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  cookieHeader.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  });
  return out;
}

function requireAdmin(req, res, next) {
  const cookies = parseCookies(req.headers.cookie);
  if (verifyToken(cookies[COOKIE_NAME])) return next();
  return res.status(401).json({ error: 'Nao autenticado' });
}

function setSessionCookie(res) {
  const token = createToken();
  const isProd = process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie', [
    `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${SESSION_TTL_MS / 1000}; SameSite=Lax${isProd ? '; Secure' : ''}`
  ]);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', [`${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`]);
}

module.exports = { requireAdmin, setSessionCookie, clearSessionCookie, parseCookies, COOKIE_NAME };
