# Missions — Meridian Lab

15 objectives across the Broken Access Control / IDOR taxonomy. Each one yields a
flag `MW{...}` you submit on the **★ Missions** page.

These are written **domain-neutral**: "record" = Statement / Encounter / Order
depending on which domain you launched (see README). You start as **Alice**, a
`member` of the first tenant; the cross-tenant victim data lives in the *Globex*
tenant and in another user's profile.

**No walkthroughs here** — only the objective, the bug class, and a one-line
nudge. Full answers are in the sealed `SOLUTIONS.md`.

---

## Horizontal access control (IDOR — reach other users'/tenants' objects)

- **C01 · Read another tenant's billing record** — *predictable sequential id*
  Difficulty ●○○
  Nudge: your own records' reference numbers reveal the scheme.

- **C02 · Pull a foreign user's private profile (PII)** — *chained: leak an opaque id, then dereference it*
  Difficulty ●●○
  Nudge: a UUID is only unguessable until the app hands it to you somewhere.

- **C03 · Open a document you were never shared** — *opaque-looking but reversible token*
  Difficulty ●●○
  Nudge: decode your own document's token before assuming it's random.

- **C04 · Read a file outside the upload area** — *path traversal*
  Difficulty ●●○
  Nudge: the download endpoint trusts the name it's given.

- **C05 · Exfiltrate PII through the data API** — *missing object authz on GraphQL (BOLA)*
  Difficulty ●●○
  Nudge: the REST UI isn't the only door to the same objects.

- **C06 · Modify a record that isn't yours** — *state-changing (write) IDOR*
  Difficulty ●●○
  Nudge: reading isn't the only verb the object endpoints accept.

- **C07 · Retrieve someone else's data export** — *second-order IDOR*
  Difficulty ●●●
  Nudge: the id you submit early is trusted later, unchecked.

## Vertical access control / function-level (become/act privileged)

- **C08 · Promote your own account** — *mass assignment / over-posting*
  Difficulty ●●○
  Nudge: the settings form sends fewer fields than the endpoint accepts.

- **C09 · Read the admin audit log as a normal user** — *missing function-level authz (BFLA)*
  Difficulty ●○○
  Nudge: some admin endpoints forgot they were admin endpoints.

- **C10 · Perform an admin action the UI hides** — *authz enforced on one HTTP method but not another*
  Difficulty ●●●
  Nudge: listing the resource is guarded; is everything else on it?

- **C11 · Reach the staff back-office** — *trusting an unsigned client cookie*
  Difficulty ●●○
  Nudge: not every cookie the server set is signed — look at what you can edit.

- **C12 · Forge a privileged token for the legacy API** — *JWT alg:none signature bypass*
  Difficulty ●●●
  Nudge: a token is only as trustworthy as the algorithm the server accepts.

## Platform / logic flaws

- **C13 · Reach a path the gateway blocks** — *front-end path filter bypassed via header*
  Difficulty ●●●
  Nudge: the block is at the edge; the back-end is more trusting about which URL it's serving.

- **C14 · Trip an admin setting without being admin** — *Referer-based access decision*
  Difficulty ●●○
  Nudge: one privileged action checks where you say you came from.

- **C15 · Finish a privileged workflow you can't start** — *multi-step process only authorizes step 1*
  Difficulty ●●●
  Nudge: the guard is on the door, not on the room behind it.

---

### Suggested order
Warm up with **C01, C09** (easy), then the IDOR chain **C02 → C05 → C07**, then
the vertical set **C08, C11, C12**, and finish on the logic/header tricks
**C10, C13, C14, C15**.

### Tooling
Browser + **Burp** (Proxy/Repeater) is enough. You'll also want quick base64 /
base64url encode-decode and a way to craft a JWT header — Burp's Inspector,
`jwt_tool`, or a one-line `node -e`/`python3` all work.
