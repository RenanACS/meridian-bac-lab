'use strict';

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const { buildStore } = require('./core/store');
const { makeAuth } = require('./core/auth');

const authRoutes = require('./core/routes/auth');
const resourceRoutes = require('./core/routes/resources');
const adminRoutes = require('./core/routes/admin');
const scoreboardRoutes = require('./core/routes/scoreboard');
const graphqlRoute = require('./core/routes/graphql');

// --- Select the domain skin --------------------------------------------------
const DOMAIN_KEY = (process.env.MERIDIAN_DOMAIN || 'fintech').toLowerCase();
let domain;
try {
  domain = require(`./domains/${DOMAIN_KEY}`);
} catch {
  console.error(`Unknown domain "${DOMAIN_KEY}". Use: fintech | health | ecommerce`);
  process.exit(1);
}

const store = buildStore(domain);
const auth = makeAuth(store);
const PORT = process.env.PORT || 4000;

const app = express();
app.disable('x-powered-by');
app.use(cookieParser());
app.use(express.json());

// --- Edge gateway simulation -------------------------------------------------
// The front-end gateway refuses any direct request to /internal/*.
app.use((req, res, next) => {
  if (req.path.toLowerCase().startsWith('/internal/')) {
    return res.status(403).json({ error: 'blocked by gateway' });
  }
  next();
});
// ...but the back-end honours an X-Original-URL override (legacy proxy contract),
// which runs AFTER the gateway check — so the block can be sidestepped.
app.use((req, res, next) => {
  const override = req.get('x-original-url');
  if (override) req.url = override;
  next();
});

// --- Public metadata (lets the UI theme itself before login) -----------------
app.get('/api/meta', (req, res) => {
  // demo login is surfaced to the UI so the player can copy it (localhost lab only)
  res.json({
    domain: domain.key, brand: domain.brand,
    tagline: domain.tagline, taglinePt: domain.taglinePt,
    terms: domain.terms, termsPt: domain.termsPt,
    demo: { email: store.alice.email, password: store.alice.password },
  });
});

// --- API routes (specific mounts first, generic resource mount last) ---------
const adminR = adminRoutes(store, auth);
app.use('/api/auth', authRoutes(store, auth));
app.use('/api/admin', adminR.admin);
app.use('/api/staff', adminR.staff);
app.use('/api/legacy', adminR.legacy);
app.use('/api/scoreboard', scoreboardRoutes(store));
app.use('/graphql', graphqlRoute(store, auth));
app.use('/internal', adminR.internal);
app.use('/api', resourceRoutes(store, auth));

// --- Static front-end --------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  const alice = store.alice;
  console.log('============================================================');
  console.log(`  ${domain.brand}  —  Broken Access Control / IDOR lab`);
  console.log(`  domain : ${domain.key}   (MERIDIAN_DOMAIN=fintech|health|ecommerce)`);
  console.log(`  url    : http://localhost:${PORT}`);
  console.log(`  login  : ${alice.email}  /  ${alice.password}`);
  console.log(`  WARNING: intentionally vulnerable. Localhost / lab use only.`);
  console.log('============================================================');
});
