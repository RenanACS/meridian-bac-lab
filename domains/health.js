'use strict';

// Health skin: a multi-clinic patient portal back-office.
// Sensitive objects: patients (PHI), encounter records, documents.
module.exports = {
  key: 'health',
  brand: 'MedPort Portal',
  tagline: 'Care coordination across partner clinics',
  terms: {
    org: 'Clinic',
    orgPlural: 'Clinics',
    record: 'Encounter',
    recordPlural: 'Encounters',
    recordPrefix: 'ENC',
    document: 'Report',
    account: 'Patient',
    team: 'Clinicians',
  },
  taglinePt: 'Coordenação de cuidados entre clínicas parceiras',
  termsPt: {
    org: 'Clínica', orgPlural: 'Clínicas',
    record: 'Atendimento', recordPlural: 'Atendimentos', recordPrefix: 'ENC',
    document: 'Laudo', account: 'Paciente', team: 'Profissionais',
  },
  orgs: [
    { name: 'Cedar Valley Clinic', slug: 'cedar', plan: 'enterprise' },
    { name: 'Globex Health Group', slug: 'globex', plan: 'growth' },
    { name: 'Initech Family Practice', slug: 'initech', plan: 'starter' },
  ],
  profile(u) {
    const blood = ['O+', 'A-', 'B+', 'AB+', 'O-', 'A+'][u.seq % 6];
    return {
      title: 'Attending Physician',
      phone: `+1-415-555-0${100 + u.seq}`,
      mrn: `MRN-${880000 + u.seq * 53}`,
      bloodType: blood,
      allergies: u.seq % 2 ? 'Penicillin, latex' : 'None recorded',
      primaryDiagnosis: ['Hypertension', 'Type 2 diabetes', 'Asthma', 'Migraine', 'Hypothyroidism', 'GERD'][u.seq % 6],
    };
  },
  record(r) {
    return {
      kind: 'encounter',
      counterparty: r.counterparty,
      amount: r.amount,
      currency: 'USD',
      memo: `Visit summary & billed services for ${r.counterparty}.`,
    };
  },
  documentTitle: (seq) => `Lab results & clinical notes #${seq}`,
};
