'use strict';

// ---------------------------------------------------------------------------
// Challenge catalog.
//
// Each entry maps a FLAG (the string you obtain by exploiting the flaw) to a
// neutral description of the access-control weakness. Descriptions are written
// domain-agnostically: the concrete object name (order / statement / medical
// record) depends on the active domain — see domains/*.js for the mapping.
//
// `category` follows the OWASP A01:2021 (Broken Access Control) + PortSwigger
// "Access control" taxonomy. `hint` only names the *class* of bug, never the
// exploitation steps (full walkthrough lives in SOLUTIONS.md).
// ---------------------------------------------------------------------------

const CHALLENGES = [
  {
    id: 'C01',
    flag: 'MW{idor_invoice_sequence_predictable}',
    title: 'Read another tenant\'s billing record',
    category: 'IDOR / horizontal — predictable sequential identifier',
    difficulty: 1,
    hint: 'The reference numbers your own records use are not as random as they look.',
  },
  {
    id: 'C02',
    flag: 'MW{idor_chained_uuid_leak_profile}',
    title: 'Pull a foreign user\'s private profile (PII)',
    category: 'IDOR / horizontal — chained: leak an opaque id, then dereference it',
    difficulty: 2,
    hint: 'A random UUID is only "unguessable" until the app hands it to you somewhere else.',
  },
  {
    id: 'C03',
    flag: 'MW{idor_base64_document_token}',
    title: 'Open a document you were never shared',
    category: 'IDOR / horizontal — opaque-looking but reversible token',
    difficulty: 2,
    hint: 'Opaque is not the same as unpredictable. Decode before you assume.',
  },
  {
    id: 'C04',
    flag: 'MW{path_traversal_arbitrary_file_read}',
    title: 'Read a file outside the upload area',
    category: 'IDOR / path traversal — direct object reference to the filesystem',
    difficulty: 2,
    hint: 'The download endpoint trusts the name it is given.',
  },
  {
    id: 'C05',
    flag: 'MW{graphql_missing_object_authorization}',
    title: 'Exfiltrate PII through the data API',
    category: 'BOLA — missing object-level authz on a GraphQL resolver',
    difficulty: 2,
    hint: 'The REST UI is not the only door into the same objects.',
  },
  {
    id: 'C06',
    flag: 'MW{write_idor_cross_tenant_modify}',
    title: 'Modify a record that is not yours',
    category: 'IDOR / horizontal — state-changing (write) with no ownership check',
    difficulty: 2,
    hint: 'Reading is not the only thing the object endpoints let you do.',
  },
  {
    id: 'C07',
    flag: 'MW{second_order_idor_export_job}',
    title: 'Retrieve someone else\'s data export',
    category: 'IDOR / second-order — authz decided at submit, trusted at fetch',
    difficulty: 3,
    hint: 'The id you submit early is trusted later, without re-checking.',
  },
  {
    id: 'C08',
    flag: 'MW{mass_assignment_role_escalation}',
    title: 'Promote your own account',
    category: 'Vertical — mass assignment / over-posting on a profile update',
    difficulty: 2,
    hint: 'The settings form sends fewer fields than the endpoint will accept.',
  },
  {
    id: 'C09',
    flag: 'MW{bfla_missing_authz_audit_logs}',
    title: 'Read the admin audit log as a normal user',
    category: 'BFLA — missing function-level authorization',
    difficulty: 1,
    hint: 'Some admin endpoints forgot they were admin endpoints.',
  },
  {
    id: 'C10',
    flag: 'MW{bfla_http_method_bypass}',
    title: 'Perform an admin action the UI hides from you',
    category: 'BFLA — authorization enforced on one HTTP method but not another',
    difficulty: 3,
    hint: 'Listing the resource is guarded. Is everything else?',
  },
  {
    id: 'C11',
    flag: 'MW{trusting_unsigned_client_cookie}',
    title: 'Reach the staff back-office',
    category: 'Vertical — trusting an unsigned, client-controlled cookie',
    difficulty: 2,
    hint: 'Not every cookie the server sets is signed. Look at what you are allowed to edit.',
  },
  {
    id: 'C12',
    flag: 'MW{jwt_alg_none_signature_bypass}',
    title: 'Forge a privileged token for the legacy API',
    category: 'Vertical — JWT signature bypass (alg:none) on a legacy endpoint',
    difficulty: 3,
    hint: 'A token is only as trustworthy as the algorithm the server is willing to accept.',
  },
  {
    id: 'C13',
    flag: 'MW{header_xoriginalurl_gateway_bypass}',
    title: 'Reach a path the gateway blocks',
    category: 'Platform misconfig — front-end path filter bypassed via request header',
    difficulty: 3,
    hint: 'The block happens at the edge. The back-end is more trusting about which URL it is serving.',
  },
  {
    id: 'C14',
    flag: 'MW{referer_based_access_control}',
    title: 'Trip an admin setting without being admin',
    category: 'Broken logic — access decision based on the Referer header',
    difficulty: 2,
    hint: 'One privileged action checks where you say you came from.',
  },
  {
    id: 'C15',
    flag: 'MW{multistep_process_authz_bypass}',
    title: 'Finish a privileged workflow you can\'t start',
    category: 'Broken logic — multi-step process only authorizes the first step',
    difficulty: 3,
    hint: 'The guard is on the door, not on the room behind it.',
  },
];

const FLAG_TO_CHALLENGE = Object.fromEntries(CHALLENGES.map((c) => [c.flag, c]));

module.exports = { CHALLENGES, FLAG_TO_CHALLENGE };
