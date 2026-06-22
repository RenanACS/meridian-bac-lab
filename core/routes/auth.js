'use strict';

const express = require('express');
const { issueSession, clearSession } = require('../auth');

module.exports = function authRoutes(store, auth) {
  const router = express.Router();

  router.post('/login', (req, res) => {
    const { email, password } = req.body || {};
    const user = store.users.find((u) => u.email === email);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'invalid credentials' });
    }
    issueSession(res, user);
    res.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, orgRole: user.orgRole } });
  });

  router.post('/logout', (req, res) => {
    clearSession(res);
    res.json({ ok: true });
  });

  router.get('/me', auth.authRequired, (req, res) => {
    const u = req.user;
    res.json({ id: u.id, name: u.name, email: u.email, orgId: u.orgId, orgRole: u.orgRole, accountNo: u.accountNo });
  });

  return router;
};
