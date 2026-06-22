'use strict';

const express = require('express');

// A deliberately tiny GraphQL-ish endpoint. It requires a valid session (so it
// is "authenticated"), but the resolvers perform NO object-level authorization:
// any id you ask for is returned. This mirrors the most common real-world
// GraphQL access-control failure (BOLA / missing authz in resolvers).
module.exports = function graphqlRoute(store, auth) {
  const router = express.Router();
  router.use(auth.authRequired);

  function userPayload(u) {
    return {
      id: u.id, accountNo: u.accountNo, name: u.name, email: u.email,
      orgId: u.orgId, orgRole: u.orgRole,
      ssn: u.profile.ssn || null,    // exposed only here
      profile: u.profile,
    };
  }

  router.post('/', (req, res) => {
    const query = (req.body && req.body.query) || '';
    const vars = (req.body && req.body.variables) || {};
    const data = {};
    const errors = [];

    // user(id: "...") { ... }
    if (/\buser\s*\(/.test(query) || /\buser\b/.test(query)) {
      const m = query.match(/id\s*:\s*"([^"]+)"/);
      const id = (m && m[1]) || vars.id;
      if (id) {
        const u = store.byId(id) || store.byAccountNo(id);
        if (u) data.user = userPayload(u);
        else errors.push({ message: `no user for id ${id}` });
      }
    }

    // record(no: "...") { ... }
    if (/\brecord\s*\(/.test(query)) {
      const m = query.match(/no\s*:\s*"([^"]+)"/);
      const no = (m && m[1]) || vars.no;
      if (no) {
        const r = store.recordByNo(no);
        if (r) data.record = { no: r.no, counterparty: r.counterparty, amount: r.amount, notes: r.notes };
        else errors.push({ message: `no record for no ${no}` });
      }
    }

    const out = { data };
    if (errors.length) out.errors = errors;
    res.json(out);
  });

  return router;
};
