const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'conversations.json');
const POSTGRES_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
const usePostgres = Boolean(POSTGRES_URL);

let pool = null;
function getPool() {
  if (!pool) {
    const { Pool } = require('pg');
    pool = new Pool({ connectionString: POSTGRES_URL, ssl: { rejectUnauthorized: false } });
  }
  return pool;
}

let schemaReady = null;
function ensureSchema() {
  if (!usePostgres) return Promise.resolve();
  if (!schemaReady) {
    schemaReady = getPool().query(`
      CREATE TABLE IF NOT EXISTS multiia_conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        messages JSONB NOT NULL DEFAULT '[]',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }
  return schemaReady;
}

function readFileConversations() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFileConversations(conversations) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(conversations, null, 2), 'utf8');
}

async function getConversations() {
  if (usePostgres) {
    await ensureSchema();
    const { rows } = await getPool().query(
      'SELECT id, title, messages FROM multiia_conversations ORDER BY updated_at DESC'
    );
    return rows.map((r) => ({ id: r.id, title: r.title, messages: r.messages }));
  }
  return readFileConversations();
}

async function saveConversations(conversations) {
  if (!Array.isArray(conversations)) {
    throw new Error('conversations deve ser uma lista');
  }

  if (usePostgres) {
    await ensureSchema();
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM multiia_conversations');
      for (const conv of conversations) {
        if (!conv || typeof conv.id !== 'string') continue;
        await client.query(
          'INSERT INTO multiia_conversations (id, title, messages, updated_at) VALUES ($1, $2, $3, now())',
          [conv.id, conv.title || 'Novo Chat', JSON.stringify(conv.messages || [])]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    return;
  }

  writeFileConversations(conversations);
}

module.exports = { getConversations, saveConversations, usePostgres };
