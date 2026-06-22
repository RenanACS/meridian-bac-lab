'use strict';

// Minimal SPA. It only ever calls the "intended" endpoints — the access-control
// flaws live server-side. Use a proxy (Burp) to manipulate the requests.

const api = async (method, url, body) => {
  const opt = { method, headers: {} };
  if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  const res = await fetch(url, opt);
  let data = null;
  try { data = await res.json(); } catch { /* non-json */ }
  return { status: res.status, ok: res.ok, data };
};
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const el = (id) => document.getElementById(id);
let META = null, ME = null;

async function boot() {
  META = (await api('GET', '/api/meta')).data;
  el('brand').firstChild.textContent = META.brand;
  el('brandSub').textContent = META.tagline;
  document.title = META.brand;
  // re-label nav items using domain terms
  document.querySelectorAll('#nav a[data-term]').forEach((a) => {
    const t = META.terms[a.dataset.term];
    if (t) a.textContent = (a.textContent.startsWith('★') ? '★ ' : '') + t;
  });

  const me = await api('GET', '/api/auth/me');
  if (!me.ok) { location.href = '/login.html'; return; }
  ME = me.data;
  el('whoName').textContent = ME.name;
  el('whoRole').textContent = ME.orgRole;
  el('logout').onclick = async (e) => { e.preventDefault(); await api('POST', '/api/auth/logout'); location.href = '/login.html'; };
  window.addEventListener('hashchange', route);
  route();
}

function setActive(hash) {
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === hash));
}

function route() {
  const hash = location.hash || '#dashboard';
  setActive(hash);
  el('crumb').textContent = hash.replace('#', '').replace(/^\w/, (c) => c.toUpperCase());
  const name = hash.slice(1).split('?')[0];
  ({ dashboard, records, documents, team, settings, missions }[name] || dashboard)();
}

// ---- Views -----------------------------------------------------------------
async function dashboard() {
  const acct = (await api('GET', '/api/account')).data;
  const recs = (await api('GET', '/api/records')).data || [];
  const docs = (await api('GET', '/api/documents')).data || [];
  const T = META.terms;
  el('view').innerHTML = `
    <h2 class="page">Welcome, ${esc(ME.name.split(' ')[0])}</h2>
    <p class="sub">${esc(META.brand)} · your tenant: <span class="tag-pill">${esc(ME.orgId)}</span></p>
    <div class="grid">
      <div class="stat"><div class="n">${recs.length}</div><div class="l">${esc(T.recordPlural)}</div></div>
      <div class="stat"><div class="n">${docs.length}</div><div class="l">${esc(T.document)}s</div></div>
      <div class="stat"><div class="n">${esc(acct.orgRole)}</div><div class="l">your role</div></div>
      <div class="stat"><div class="n">${esc(acct.accountNo)}</div><div class="l">account no.</div></div>
    </div>
    <div class="card">
      <div class="kv">
        <div class="k">Name</div><div>${esc(acct.name)}</div>
        <div class="k">Email</div><div>${esc(acct.email)}</div>
        <div class="k">${esc(T.account)} title</div><div>${esc(acct.profile.title || '')}</div>
      </div>
    </div>`;
}

async function records() {
  const T = META.terms;
  const list = (await api('GET', '/api/records')).data || [];
  el('view').innerHTML = `
    <h2 class="page">${esc(T.recordPlural)}</h2>
    <p class="sub">Records in your tenant. Open one to view details.</p>
    <div class="card">
      <div class="row">
        <div><label>Look up a ${esc(T.record.toLowerCase())} by reference</label>
          <input id="lookup" placeholder="${esc(T.recordPrefix)}-2026-0005" /></div>
        <button id="lookupBtn">Open</button>
      </div>
    </div>
    <div class="card"><table><thead><tr><th>Reference</th><th>Counterparty</th><th>Amount</th><th>Status</th></tr></thead>
      <tbody>${list.map((r) => `<tr class="click" data-no="${esc(r.no)}"><td>${esc(r.no)}</td><td>${esc(r.counterparty)}</td><td>${esc(r.amount)} ${esc(r.currency)}</td><td><span class="tag-pill">${esc(r.status)}</span></td></tr>`).join('')}</tbody></table></div>
    <div id="detail"></div>`;
  const open = async (no) => {
    const r = await api('GET', '/api/records/' + encodeURIComponent(no));
    el('detail').innerHTML = `<div class="card"><h3>${esc(no)}</h3><pre class="out">${esc(JSON.stringify(r.data, null, 2))}</pre></div>`;
  };
  document.querySelectorAll('tr.click').forEach((tr) => tr.onclick = () => open(tr.dataset.no));
  el('lookupBtn').onclick = () => open(el('lookup').value.trim());
}

async function documents() {
  const T = META.terms;
  const list = (await api('GET', '/api/documents')).data || [];
  el('view').innerHTML = `
    <h2 class="page">${esc(T.document)}s</h2>
    <p class="sub">Open a document by its share token.</p>
    <div class="card">
      <div class="row"><div><label>Document token</label><input id="tok" placeholder="paste a token" /></div><button id="openTok">Open</button></div>
    </div>
    <div class="card"><table><thead><tr><th>Title</th><th>Token</th></tr></thead><tbody>
      ${list.map((d) => `<tr class="click" data-tok="${esc(d.token)}"><td>${esc(d.title)}</td><td><code>${esc(d.token)}</code></td></tr>`).join('')}
    </tbody></table></div><div id="docout"></div>`;
  const open = async (tok) => {
    const d = await api('GET', '/api/documents/' + encodeURIComponent(tok));
    el('docout').innerHTML = `<div class="card"><pre class="out">${esc(JSON.stringify(d.data, null, 2))}</pre></div>`;
  };
  document.querySelectorAll('tr.click').forEach((tr) => tr.onclick = () => open(tr.dataset.tok));
  el('openTok').onclick = () => open(el('tok').value.trim());
}

async function team() {
  const T = META.terms;
  const t = await api('GET', '/api/admin/team');
  const act = (await api('GET', '/api/activity')).data || [];
  const teamHtml = t.ok
    ? `<table><thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead><tbody>${t.data.map((u) => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.orgRole)}</td></tr>`).join('')}</tbody></table>`
    : `<p class="sub">Only admins can view the ${esc(T.team.toLowerCase())} roster (HTTP ${t.status}).</p>`;
  el('view').innerHTML = `
    <h2 class="page">${esc(T.team)}</h2>
    <div class="card">${teamHtml}</div>
    <div class="card"><h3>Recent activity</h3>
      ${act.map((a) => `<div style="padding:8px 0;border-bottom:1px solid var(--line);font-size:14px"><b>${esc(a.actorName)}</b> ${esc(a.text)} <span class="diff">· ${esc(a.ts)}</span></div>`).join('')}
    </div>`;
}

async function settings() {
  const acct = (await api('GET', '/api/account')).data;
  el('view').innerHTML = `
    <h2 class="page">Settings</h2>
    <p class="sub">Update your profile. Your current role is <b>${esc(acct.orgRole)}</b>.</p>
    <div class="card">
      <label>Display name</label><input id="name" value="${esc(acct.name)}" />
      <label>Theme</label><select id="theme"><option>light</option><option>dark</option></select>
      <button class="full" id="save">Save changes</button>
      <div id="saveout"></div>
    </div>`;
  el('save').onclick = async () => {
    // The UI only submits name + theme.
    const r = await api('PATCH', '/api/account', { name: el('name').value, theme: el('theme').value });
    el('saveout').innerHTML = `<pre class="out">${esc(JSON.stringify(r.data, null, 2))}</pre>`;
  };
}

async function missions() {
  const sb = (await api('GET', '/api/scoreboard')).data;
  const items = sb.challenges.map((c) => `
    <div class="mission ${c.solved ? 'solved' : ''}">
      <h4>${esc(c.title)} ${c.solved ? '<span class="badge-ok">✔ solved</span>' : ''}</h4>
      <div class="cat">${esc(c.category)}</div>
      <div class="hint">Hint: ${esc(c.hint)}</div>
      <div class="diff">Difficulty: ${'●'.repeat(c.difficulty)}${'○'.repeat(3 - c.difficulty)}</div>
    </div>`).join('');
  el('view').innerHTML = `
    <h2 class="page">Missions</h2>
    <p class="sub progress">${sb.solvedCount} / ${sb.total} solved · domain: <b>${esc(sb.domain)}</b>. Exploit a flaw, capture its <code>MW{...}</code> flag, submit it below.</p>
    <div class="card">
      <div class="row"><div><label>Submit a captured flag</label><input id="flag" placeholder="MW{...}" /></div><button id="submitFlag">Submit</button></div>
      <div id="flagout"></div>
    </div>
    ${items}`;
  el('submitFlag').onclick = async () => {
    const r = await api('POST', '/api/scoreboard/submit', { flag: el('flag').value.trim() });
    if (r.data && r.data.ok) { el('flagout').innerHTML = `<p class="badge-ok">✔ ${esc(r.data.challenge.title)} — solved!</p>`; setTimeout(missions, 700); }
    else { el('flagout').innerHTML = `<p class="err">Not a valid flag.</p>`; }
  };
}

boot();
