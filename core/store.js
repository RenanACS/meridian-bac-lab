'use strict';

const crypto = require('crypto');
const { CHALLENGES } = require('./challenges');
const { loadProgress } = require('./progress');

const flag = (id) => CHALLENGES.find((c) => c.id === id).flag;
const b64url = (s) => Buffer.from(s, 'utf8').toString('base64url');

// ---------------------------------------------------------------------------
// In-memory data store, generated once at boot from the active domain skin.
// Everything here is seed data for a *deliberately vulnerable* training app.
// Identifiers are intentionally realistic: UUIDs for users, sequential
// human-readable references for billing objects, reversible tokens for docs.
// ---------------------------------------------------------------------------
function buildStore(domain) {
  const YEAR = 2026;
  const prefix = domain.terms.recordPrefix;

  // --- Organizations (tenants) -------------------------------------------
  const orgs = domain.orgs.map((o) => ({
    id: `org_${o.slug}`,
    name: o.name,
    plan: o.plan,
  }));
  const [orgA, orgB, orgC] = orgs; // A = your tenant, B = cross-tenant victim

  // --- Users --------------------------------------------------------------
  // seq is a stable per-user number; uuid is random per boot (must be leaked,
  // never guessed). accountNo is a guessable customer/account reference.
  const userDefs = [
    { seq: 0, name: 'Meridian Root',  email: 'root@meridian.internal', org: null, role: 'owner',  staff: true },
    { seq: 1, name: 'Alice Carter',   email: 'alice@'  + orgA.id.slice(4) + '.test', org: orgA, role: 'member', staff: false, password: 'Sunshine2026!' },
    { seq: 2, name: 'Victor Reyes',   email: 'victor@' + orgA.id.slice(4) + '.test', org: orgA, role: 'owner',  staff: false },
    { seq: 3, name: 'Bob Mensah',     email: 'bob@'    + orgB.id.slice(4) + '.test', org: orgB, role: 'owner',  staff: false },
    { seq: 4, name: 'Carol Nguyen',   email: 'carol@'  + orgB.id.slice(4) + '.test', org: orgB, role: 'member', staff: false },
    { seq: 5, name: 'Dave Okoro',     email: 'dave@'   + orgC.id.slice(4) + '.test', org: orgC, role: 'owner',  staff: false },
  ];

  const users = userDefs.map((d) => {
    const u = {
      id: crypto.randomUUID(),
      seq: d.seq,
      accountNo: `AC-${1000 + d.seq}`,
      name: d.name,
      email: d.email,
      password: d.password || crypto.randomBytes(9).toString('hex'),
      orgId: d.org ? d.org.id : 'org_system',
      orgRole: d.role,
      staff: d.staff,
    };
    // Themed sensitive fields supplied by the domain skin.
    u.profile = domain.profile(u);
    return u;
  });

  const byId = (id) => users.find((u) => u.id === id);
  const byAccountNo = (no) => users.find((u) => u.accountNo === no);
  const alice = users.find((u) => u.seq === 1);
  const bob = users.find((u) => u.seq === 3); // primary cross-tenant victim

  // Plant flags on the victim profile (reachable via REST C02 and GraphQL C05).
  bob.profile.flag = flag('C02');
  bob.profile.ssn = `${flag('C05')}`; // exposed only through the GraphQL resolver

  // --- Billing records (sequential, cross-tenant numbering) ---------------
  const recordDefs = [
    { n: 1, org: orgB, owner: bob,   counterparty: 'Vandelay Industries', amount: 4820, notes: `Confidential retainer. ${flag('C01')}` },
    { n: 2, org: orgB, owner: bob,   counterparty: 'Soylent Corp',        amount: 1290, notes: 'Net-30. Pending approval.' },
    { n: 3, org: orgC, owner: users[5], counterparty: 'Stark Logistics',  amount: 760,  notes: 'Recurring.' },
    { n: 4, org: orgA, owner: users[2], counterparty: 'Wayne Enterprises', amount: 3300, notes: 'Approved.' },
    { n: 5, org: orgA, owner: alice, counterparty: 'Hooli',               amount: 980,  notes: 'Your draft.' },
    { n: 6, org: orgA, owner: alice, counterparty: 'Pied Piper',          amount: 1500, notes: 'Your draft.' },
    { n: 7, org: orgB, owner: bob,   counterparty: 'Umbrella LLC',        amount: 2100, notes: 'Has attachment.' },
    { n: 8, org: orgC, owner: users[5], counterparty: 'Massive Dynamic',  amount: 640,  notes: 'Recurring.' },
  ];
  const records = recordDefs.map((r) => {
    const no = `${prefix}-${YEAR}-${String(r.n).padStart(4, '0')}`;
    return {
      no,
      orgId: r.org.id,
      ownerId: r.owner.id,
      status: 'open',
      notes: r.notes,
      fileName: `${no}.pdf`,
      ...domain.record({ counterparty: r.counterparty, amount: r.amount }),
    };
  });
  const recordByNo = (no) => records.find((r) => r.no === no);

  // --- Documents (reversible opaque token: base64url("doc:<seq>")) --------
  const docDefs = [
    { seq: 1, org: orgB, owner: bob,   body: `Beneficiary & banking details for Globex.\n${flag('C03')}` },
    { seq: 2, org: orgA, owner: alice, body: 'Your onboarding checklist. (this is your own document)' },
    { seq: 3, org: orgC, owner: users[5], body: 'Initech internal memo.' },
  ];
  const documents = docDefs.map((d) => ({
    seq: d.seq,
    token: b64url(`doc:${d.seq}`),
    orgId: d.org.id,
    ownerId: d.owner.id,
    title: domain.documentTitle(d.seq),
    body: d.body,
  }));
  const docByToken = (t) => documents.find((d) => d.token === t);

  // --- Activity feed (your tenant's feed leaks a cross-tenant collaborator)
  const docTermPt = (domain.termsPt ? domain.termsPt.document : domain.terms.document).toLowerCase();
  const activity = [
    { ts: '2026-06-20T09:12:00Z', actorId: alice.id, actorName: alice.name, text: 'created a draft record', textPt: 'criou um registro em rascunho' },
    // This entry leaks Bob's UUID into your feed (cross-org collaboration):
    { ts: '2026-06-21T14:03:00Z', actorId: bob.id, actorName: bob.name, text: `shared a ${domain.terms.document.toLowerCase()} with your team`, textPt: `compartilhou um ${docTermPt} com a sua equipe` },
    { ts: '2026-06-21T16:40:00Z', actorId: users[2].id, actorName: users[2].name, text: 'approved a record', textPt: 'aprovou um registro' },
  ];

  // --- Admin audit log (C09: no authz guard on the endpoint that reads it) -
  const auditLogs = [
    { ts: '2026-06-19T08:00:00Z', actor: 'root@meridian.internal', action: 'rotated signing key' },
    { ts: '2026-06-20T11:22:00Z', actor: 'victor', action: 'invited alice as member' },
    { ts: '2026-06-21T19:05:00Z', actor: 'system', action: `audit export token issued ${flag('C09')}` },
  ];

  return {
    domain,
    orgs,
    users,
    records,
    documents,
    activity,
    auditLogs,
    exports: [],        // populated at runtime (C07)
    notifications: [],
    solved: loadProgress(),  // scoreboard progress, persisted across restarts
    flags: {
      C04: flag('C04'), C06: flag('C06'), C07: flag('C07'), C08: flag('C08'),
      C10: flag('C10'), C11: flag('C11'), C12: flag('C12'), C13: flag('C13'),
      C14: flag('C14'), C15: flag('C15'),
    },
    // lookups
    byId, byAccountNo, recordByNo, docByToken,
    orgA, orgB, orgC, alice, bob,
  };
}

module.exports = { buildStore };
