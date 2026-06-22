'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// The primary session is a properly signed HS256 JWT. The secret is random per
// boot and never leaves the process — forging this token is NOT a lab path.
// (The intended token bugs live elsewhere: an unsigned context cookie, and a
// legacy endpoint that accepts alg:none — see routes/admin.js.)
const SESSION_SECRET = crypto.randomBytes(32).toString('hex');
const SESSION_COOKIE = 'mw_session';
const CTX_COOKIE = 'mw_ctx';

function issueSession(res, user) {
  const token = jwt.sign({ sub: user.id, org: user.orgId }, SESSION_SECRET, {
    algorithm: 'HS256',
    expiresIn: '12h',
  });
  res.cookie(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax' });

  // Non-sensitive UI context. NOTE: this cookie is *not* signed — it is plain
  // base64 JSON that the client can read (and edit).
  const ctx = Buffer.from(JSON.stringify({ theme: 'light', lang: 'en' })).toString('base64');
  res.cookie(CTX_COOKIE, ctx, { httpOnly: false, sameSite: 'lax' });
}

function clearSession(res) {
  res.clearCookie(SESSION_COOKIE);
  res.clearCookie(CTX_COOKIE);
}

// Parse the unsigned context cookie. Whatever the client sends is trusted as-is.
function readCtx(req) {
  const raw = req.cookies && req.cookies[CTX_COOKIE];
  if (!raw) return {};
  try {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  } catch {
    return {};
  }
}

// Build the authentication middleware bound to a specific store.
function makeAuth(store) {
  function authRequired(req, res, next) {
    const token = req.cookies && req.cookies[SESSION_COOKIE];
    if (!token) return res.status(401).json({ error: 'authentication required' });
    try {
      const claims = jwt.verify(token, SESSION_SECRET, { algorithms: ['HS256'] });
      const user = store.byId(claims.sub);
      if (!user) return res.status(401).json({ error: 'unknown session' });
      req.user = user;
      req.ctx = readCtx(req);
      next();
    } catch {
      return res.status(401).json({ error: 'invalid session' });
    }
  }

  function requireOrgAdmin(req, res, next) {
    if (req.user && ['owner', 'admin'].includes(req.user.orgRole)) return next();
    return res.status(403).json({ error: 'admin role required' });
  }

  return { authRequired, requireOrgAdmin };
}

// Decode a legacy bearer token. This intentionally honours the "none" algorithm:
// if the header says alg:none, the payload is trusted with no signature check.
function decodeLegacyToken(authHeader) {
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (header.alg && String(header.alg).toLowerCase() === 'none') {
      return payload; // signature not verified — the vulnerability
    }
    // Any other alg would require the legacy HMAC key (not available here).
    return null;
  } catch {
    return null;
  }
}

module.exports = {
  SESSION_SECRET,
  issueSession,
  clearSession,
  readCtx,
  makeAuth,
  decodeLegacyToken,
};
