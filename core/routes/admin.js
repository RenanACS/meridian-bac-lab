'use strict';

const express = require('express');
const { decodeLegacyToken } = require('../auth');

module.exports = function adminRoutes(store, auth) {
  // =====================================================================
  // /api/admin  — tenant administration
  // =====================================================================
  const admin = express.Router();
  admin.use(auth.authRequired);

  // Properly guarded: listing the team requires an admin role.
  admin.get('/team', auth.requireOrgAdmin, (req, res) => {
    const team = store.users
      .filter((u) => u.orgId === req.user.orgId)
      .map((u) => ({ id: u.id, name: u.name, email: u.email, orgRole: u.orgRole }));
    res.json(team);
  });

  // NOT guarded: the authorization check that protects GET /team was never
  // added to the destructive DELETE on the same resource.
  admin.delete('/team/:id', (req, res) => {
    const target = store.byId(req.params.id);
    if (!target) return res.status(404).json({ error: 'user not found' });
    target.suspended = true;
    res.json({ ok: true, suspended: target.email, flag: store.flags.C10 });
  });

  // NOT guarded: reads the admin audit log for any authenticated user.
  admin.get('/audit', (req, res) => {
    res.json({ logs: store.auditLogs });
  });

  // Access decision based purely on the Referer header.
  admin.post('/branding', (req, res) => {
    const referer = req.get('referer') || '';
    if (!referer.includes('/admin')) {
      return res.status(403).json({ error: 'admin context required' });
    }
    res.json({ ok: true, applied: req.body, flag: store.flags.C14 });
  });

  // Multi-step privileged workflow. Only step 1 is authorized.
  admin.post('/promote/start', auth.requireOrgAdmin, (req, res) => {
    res.json({ ok: true, step: 'start', next: 'POST /api/admin/promote/confirm' });
  });
  admin.post('/promote/confirm', (req, res) => {
    // No re-check that the caller ever passed (or was allowed to pass) step 1.
    const target = store.byId(req.body.targetUserId) || req.user;
    target.orgRole = req.body.role || 'admin';
    res.json({ ok: true, promoted: target.email, role: target.orgRole, flag: store.flags.C15 });
  });

  // =====================================================================
  // /api/staff — back-office, gated on the (unsigned) context cookie
  // =====================================================================
  const staff = express.Router();
  staff.use(auth.authRequired);
  staff.get('/overview', (req, res) => {
    if (!req.ctx || req.ctx.staff !== true) {
      return res.status(403).json({ error: 'staff access only' });
    }
    res.json({
      tenants: store.orgs.length,
      users: store.users.length,
      message: `Welcome to the staff back-office. ${store.flags.C11}`,
    });
  });

  // =====================================================================
  // /api/legacy — old service that still accepts unsigned (alg:none) tokens
  // =====================================================================
  const legacy = express.Router();
  legacy.get('/reports', (req, res) => {
    const payload = decodeLegacyToken(req.get('authorization'));
    if (!payload || payload.role !== 'auditor') {
      return res.status(401).json({ error: 'valid auditor token required' });
    }
    res.json({ report: 'cross-tenant revenue summary', flag: store.flags.C12 });
  });

  // =====================================================================
  // /internal — only reachable if the edge gateway block is bypassed
  // =====================================================================
  const internal = express.Router();
  internal.get('/admin/flag', (req, res) => {
    res.json({ message: 'internal admin endpoint', flag: store.flags.C13 });
  });

  return { admin, staff, legacy, internal };
};
