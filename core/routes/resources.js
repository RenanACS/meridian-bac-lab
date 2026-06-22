'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');

const LABFS = path.resolve(__dirname, '..', '..', 'lab-fs');
const UPLOADS = path.join(LABFS, 'srv', 'meridian', 'uploads');

// Public view of a record (what the UI renders).
const recordView = (r) => ({
  no: r.no, status: r.status, kind: r.kind, counterparty: r.counterparty,
  amount: r.amount, currency: r.currency, memo: r.memo, notes: r.notes,
  fileName: r.fileName, orgId: r.orgId,
});

module.exports = function resourceRoutes(store, auth) {
  const router = express.Router();
  router.use(auth.authRequired);

  // --- Your own account --------------------------------------------------
  router.get('/account', (req, res) => {
    const u = req.user;
    res.json({
      id: u.id, accountNo: u.accountNo, name: u.name, email: u.email,
      orgId: u.orgId, orgRole: u.orgRole, profile: u.profile,
    });
  });

  // Profile update. The settings UI only sends { name, theme } — but the
  // handler copies every field it receives onto the user record.
  router.patch('/account', (req, res) => {
    const u = req.user;
    const allowedFromUi = ['name', 'theme'];
    const ALL = ['name', 'theme', 'orgRole']; // server "trusts" the client
    for (const k of ALL) {
      if (req.body[k] !== undefined) u[k] = req.body[k];
    }
    res.json({
      ok: true,
      uiFields: allowedFromUi,
      account: { name: u.name, orgRole: u.orgRole },
    });
  });

  // Owner-only billing settings.
  router.get('/account/billing', (req, res) => {
    if (req.user.orgRole !== 'owner') {
      return res.status(403).json({ error: 'owner role required' });
    }
    res.json({
      plan: 'enterprise',
      seats: 25,
      message: `Billing unlocked for owners. ${store.flags.C08}`,
    });
  });

  // --- Records -----------------------------------------------------------
  // List is scoped to your tenant (this part is fine).
  router.get('/records', (req, res) => {
    const mine = store.records.filter((r) => r.orgId === req.user.orgId);
    res.json(mine.map(recordView));
  });

  // Fetch a single record by its reference. No ownership check.
  router.get('/records/:no', (req, res) => {
    const r = store.recordByNo(req.params.no);
    if (!r) return res.status(404).json({ error: 'record not found' });
    res.json(recordView(r));
  });

  // Update a record. No ownership check — you can write across tenants.
  router.patch('/records/:no', (req, res) => {
    const r = store.recordByNo(req.params.no);
    if (!r) return res.status(404).json({ error: 'record not found' });
    if (req.body.status !== undefined) r.status = req.body.status;
    if (req.body.notes !== undefined) r.notes = req.body.notes;

    const out = { ok: true, record: recordView(r) };
    if (r.orgId !== req.user.orgId) {
      out.meta = { warning: 'modified a record outside your tenant', flag: store.flags.C06 };
    }
    res.json(out);
  });

  // --- Users -------------------------------------------------------------
  // Dereference any user id. Returns the full private profile, no authz.
  router.get('/users/:id', (req, res) => {
    const u = store.byId(req.params.id);
    if (!u) return res.status(404).json({ error: 'user not found' });
    res.json({
      id: u.id, accountNo: u.accountNo, name: u.name, email: u.email,
      orgId: u.orgId, orgRole: u.orgRole, profile: u.profile,
    });
  });

  // --- Activity feed (scoped to your tenant; includes collaborators) -----
  router.get('/activity', (req, res) => {
    res.json(store.activity);
  });

  // --- Documents ---------------------------------------------------------
  router.get('/documents', (req, res) => {
    const mine = store.documents.filter((d) => d.orgId === req.user.orgId);
    res.json(mine.map((d) => ({ token: d.token, title: d.title })));
  });

  // Fetch a document by its token. The token looks opaque but is not checked
  // against the caller's tenant.
  router.get('/documents/:token', (req, res) => {
    const d = store.docByToken(req.params.token);
    if (!d) return res.status(404).json({ error: 'document not found' });
    res.json({ token: d.token, title: d.title, body: d.body });
  });

  // --- File download -----------------------------------------------------
  // Serves attachments by name from the uploads directory. The name is used
  // to build a path with no normalisation.
  router.get('/files', (req, res) => {
    const name = req.query.path || '';
    if (!name) return res.status(400).json({ error: 'path query param required' });
    const resolved = path.resolve(UPLOADS, name);
    // Safety clamp: never escape the lab sandbox (but the uploads dir itself
    // is escapable — that is the lesson).
    if (!resolved.startsWith(LABFS)) {
      return res.status(403).json({ error: 'outside sandbox' });
    }
    fs.readFile(resolved, 'utf8', (err, data) => {
      if (err) return res.status(404).json({ error: 'file not found' });
      res.type('text/plain').send(data);
    });
  });

  // --- Data exports (second-order IDOR) ----------------------------------
  // Step 1: queue an export for some account number. No check that the
  // account belongs to you — the value is simply stored on the job.
  router.post('/exports', (req, res) => {
    const accountNo = req.body.accountNo;
    if (!accountNo) return res.status(400).json({ error: 'accountNo required' });
    const job = {
      id: require('crypto').randomUUID(),
      accountNo,
      requestedBy: req.user.id,
      status: 'completed',
    };
    store.exports.push(job);
    res.status(201).json({ jobId: job.id, status: job.status });
  });

  // Step 2: fetch the result. Trusts the accountNo captured at submit time.
  router.get('/exports/:jobId', (req, res) => {
    const job = store.exports.find((j) => j.id === req.params.jobId);
    if (!job) return res.status(404).json({ error: 'export not found' });
    const target = store.byAccountNo(job.accountNo);
    if (!target) return res.status(404).json({ error: 'account not found' });
    const out = {
      jobId: job.id,
      account: { accountNo: target.accountNo, name: target.name, email: target.email, profile: target.profile },
    };
    if (target.id !== req.user.id) {
      out.meta = { warning: 'exported an account that is not yours', flag: store.flags.C07 };
    }
    res.json(out);
  });

  return router;
};
