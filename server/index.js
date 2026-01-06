import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'session_token';
const COOKIE_SECURE = process.env.NODE_ENV === 'production';
const COOKIE_SAMESITE = process.env.SESSION_COOKIE_SAMESITE || 'lax';
const COOKIE_MAX_AGE_SECONDS = parseInt(process.env.SESSION_MAX_AGE_SECONDS || `${30 * 24 * 60 * 60}`, 10);
const PORT = parseInt(process.env.PORT || '3000', 10);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:4173';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));

function effectiveSameSite() {
  try {
    const client = new URL(CLIENT_ORIGIN);
    const sameOrigin = client.hostname === 'localhost' && String(client.port || (client.protocol === 'https:' ? 443 : 80)) === String(PORT);
    return sameOrigin ? COOKIE_SAMESITE : 'none';
  } catch {
    return COOKIE_SAMESITE;
  }
}

const supabaseClient = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;
if (!supabaseAdmin) {
  console.warn('[auth-server] SUPABASE_SERVICE_ROLE_KEY not set. Using in-memory session store; database persistence disabled.');
}
if (!supabaseClient) {
  console.warn('[auth-server] SUPABASE_URL/ANON key not set. Login verification disabled.');
}

const memStore = new Map();

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function createSession(userId, expiresAt) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const now = new Date().toISOString();
  if (supabaseAdmin) {
    const { error } = await supabaseAdmin.from('auth_sessions').insert({
      user_id: userId,
      token_hash: tokenHash,
      created_at: now,
      last_seen_at: now,
      expires_at: new Date(expiresAt).toISOString(),
      revoked: false,
    });
    if (error) {
      console.error('[auth-server] Failed to insert auth_session:', error);
      throw error;
    }
  } else if (supabaseClient) {
    const { error } = await supabaseClient.rpc('add_auth_session', {
      p_user_id: userId,
      p_token_hash: tokenHash,
      p_expires_at: new Date(expiresAt).toISOString(),
    });
    if (error) {
      console.error('[auth-server] RPC add_auth_session failed:', error);
      throw error;
    }
  } else {
    memStore.set(tokenHash, {
      userId,
      createdAt: now,
      lastSeenAt: now,
      expiresAt,
      revoked: false,
    });
  }
  return token;
}

async function getSessionByToken(token) {
  const tokenHash = hashToken(token);
  if (supabaseAdmin) {
    const { data } = await supabaseAdmin.from('auth_sessions').select('*').eq('token_hash', tokenHash).maybeSingle();
    return data || null;
  }
  if (supabaseClient) {
    const { data } = await supabaseClient.rpc('get_session_by_token', { p_token_hash: tokenHash });
    return data?.[0] || null;
  }
  const rec = memStore.get(tokenHash);
  if (!rec) return null;
  return {
    user_id: rec.userId,
    created_at: rec.createdAt,
    last_seen_at: rec.lastSeenAt,
    expires_at: new Date(rec.expiresAt).toISOString(),
    revoked: rec.revoked,
    token_hash: tokenHash,
  };
}

async function revokeSessionByToken(token) {
  const tokenHash = hashToken(token);
  if (supabaseAdmin) {
    await supabaseAdmin.from('auth_sessions').update({ revoked: true }).eq('token_hash', tokenHash);
  } else if (supabaseClient) {
    const { error } = await supabaseClient.rpc('revoke_auth_session', { p_token_hash: tokenHash });
    if (error) console.error('[auth-server] RPC revoke_auth_session failed:', error);
  } else {
    const rec = memStore.get(tokenHash);
    if (rec) {
      rec.revoked = true;
      memStore.set(tokenHash, rec);
    }
  }
}

async function rotateSession(token) {
  const sess = await getSessionByToken(token);
  if (!sess) return null;
  const now = Date.now();
  const exp = new Date(sess.expires_at).getTime();
  if (sess.revoked || now > exp) return null;
  const tokenHash = hashToken(token);
  const newToken = crypto.randomBytes(32).toString('hex');
  const newHash = hashToken(newToken);
  const newExpiry = now + COOKIE_MAX_AGE_SECONDS * 1000;
  const nowIso = new Date().toISOString();
  if (supabaseAdmin) {
    await supabaseAdmin.from('auth_sessions').update({ revoked: true }).eq('token_hash', tokenHash);
    await supabaseAdmin.from('auth_sessions').insert({
      user_id: sess.user_id,
      token_hash: newHash,
      created_at: nowIso,
      last_seen_at: nowIso,
      expires_at: new Date(newExpiry).toISOString(),
      revoked: false,
    });
  } else if (supabaseClient) {
    const { error } = await supabaseClient.rpc('rotate_auth_session', {
      p_old_token_hash: tokenHash,
      p_user_id: sess.user_id,
      p_new_token_hash: newHash,
      p_expires_at: new Date(newExpiry).toISOString(),
    });
    if (error) {
      console.error('[auth-server] RPC rotate_auth_session failed:', error);
      return null;
    }
  } else {
    const prev = memStore.get(tokenHash);
    if (prev) {
      prev.revoked = true;
      memStore.set(tokenHash, prev);
    }
    memStore.set(newHash, {
      userId: sess.user_id,
      createdAt: nowIso,
      lastSeenAt: nowIso,
      expiresAt: newExpiry,
      revoked: false,
    });
  }
  return { newToken, expiresAt: newExpiry };
}

async function revokeAllForUser(userId) {
  if (supabaseAdmin) {
    await supabaseAdmin.from('auth_sessions').update({ revoked: true }).eq('user_id', userId);
  } else if (supabaseClient) {
    const { error } = await supabaseClient.rpc('revoke_all_sessions_for_user', { p_user_id: userId });
    if (error) console.error('[auth-server] RPC revoke_all_sessions_for_user failed:', error);
  } else {
    for (const [k, v] of memStore.entries()) {
      if (v.userId === userId) {
        v.revoked = true;
        memStore.set(k, v);
      }
    }
  }
}

app.post('/api/login', async (req, res) => {
  try {
    const { email, password, rememberMe, accessToken } = req.body || {};
    let userId = null;
    if (accessToken) {
      if (!supabaseClient) return res.status(500).json({ error: 'server_not_configured' });
      const { data, error } = await supabaseClient.auth.getUser(accessToken);
      if (error || !data?.user) return res.status(401).json({ error: 'invalid_token' });
      userId = data.user.id;
    } else {
      if (!email || !password) return res.status(400).json({ error: 'invalid_request' });
      if (!supabaseClient) return res.status(500).json({ error: 'server_not_configured' });
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error || !data || !data.user) return res.status(401).json({ error: 'invalid_credentials' });
      userId = data.user.id;
    }
    if (!rememberMe) return res.status(200).json({ ok: true });
    const expiresAt = Date.now() + COOKIE_MAX_AGE_SECONDS * 1000;
    const token = await createSession(userId, expiresAt);
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: effectiveSameSite(),
      maxAge: COOKIE_MAX_AGE_SECONDS * 1000,
      path: '/',
    });
    console.log('[auth-server] Created session for user', userId, 'expires in seconds', COOKIE_MAX_AGE_SECONDS);
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'server_error' });
  }
});

app.get('/api/session/refresh', async (req, res) => {
  try {
    const token = req.cookies[COOKIE_NAME];
    if (!token) return res.status(401).json({ error: 'no_session' });
    const rotated = await rotateSession(token);
    if (!rotated) {
      res.clearCookie(COOKIE_NAME, { path: '/' });
      return res.status(401).json({ error: 'invalid_session' });
    }
    res.cookie(COOKIE_NAME, rotated.newToken, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: effectiveSameSite(),
      maxAge: COOKIE_MAX_AGE_SECONDS * 1000,
      path: '/',
    });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'server_error' });
  }
});

app.get('/api/session/me', async (req, res) => {
  try {
    const token = req.cookies[COOKIE_NAME];
    if (!token) return res.status(401).json({ error: 'no_session' });
    const sess = await getSessionByToken(token);
    if (!sess) return res.status(401).json({ error: 'invalid_session' });
    const now = Date.now();
    const exp = new Date(sess.expires_at).getTime();
    if (sess.revoked || now > exp) return res.status(401).json({ error: 'expired' });
    return res.status(200).json({ userId: sess.user_id });
  } catch {
    return res.status(500).json({ error: 'server_error' });
  }
});

app.post('/api/logout', async (req, res) => {
  try {
    const token = req.cookies[COOKIE_NAME];
    if (token) await revokeSessionByToken(token);
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'server_error' });
  }
});

app.post('/api/revoke-all', async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'invalid_request' });
    await revokeAllForUser(userId);
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'server_error' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    clientConfigured: !!supabaseClient,
    adminConfigured: !!supabaseAdmin,
    cookie: {
      name: COOKIE_NAME,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAMESITE,
      maxAgeSeconds: COOKIE_MAX_AGE_SECONDS,
    },
    corsOrigin: CLIENT_ORIGIN,
  });
});

// serve built frontend to ensure same-origin for cookies
app.use(express.static('dist'));
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`auth server listening on http://localhost:${PORT}`);
});

