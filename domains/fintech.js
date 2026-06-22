'use strict';

// Fintech skin: a digital-banking back-office.
// Sensitive objects: account holders (PII), statements, documents.
module.exports = {
  key: 'fintech',
  brand: 'NeoBank Console',
  tagline: 'Operations console for digital banking partners',
  terms: {
    org: 'Institution',
    orgPlural: 'Institutions',
    record: 'Statement',
    recordPlural: 'Statements',
    recordPrefix: 'STM',
    document: 'Document',
    account: 'Account holder',
    team: 'Operators',
  },
  orgs: [
    { name: 'Northwind Bank', slug: 'northwind', plan: 'enterprise' },
    { name: 'Globex Capital', slug: 'globex', plan: 'growth' },
    { name: 'Initech Credit Union', slug: 'initech', plan: 'starter' },
  ],
  // Themed private fields attached to each user profile.
  profile(u) {
    return {
      title: 'Relationship Manager',
      phone: `+1-202-555-0${100 + u.seq}`,
      iban: `GB29 NWBK 6016 1331 92${String(1000 + u.seq).slice(-4)}`,
      taxId: `TIN-${740000000 + u.seq * 137}`,
      monthlyVolume: `$${(120 + u.seq * 17) % 900},${(u.seq * 311) % 1000}00`,
    };
  },
  // Themed billing/statement record.
  record(r) {
    return {
      kind: 'statement',
      counterparty: r.counterparty,
      amount: r.amount,
      currency: 'USD',
      memo: `Monthly settlement statement for ${r.counterparty}.`,
    };
  },
  documentTitle: (seq) => `Wire instructions & beneficiary details #${seq}`,
};
