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

// ---- i18n ------------------------------------------------------------------
// Static UI strings. Domain nouns (Statement/Extrato, Operators/Operadores…)
// come from the server's terms / termsPt; everything else lives here.
const I18N = {
  en: {
    'nav.console': 'Console', 'nav.range': 'Range',
    'nav.dashboard': 'Dashboard', 'nav.settings': 'Settings', 'nav.missions': 'Missions',
    railFoot: 'Access-Control Range · localhost',
    signedInAs: 'Signed in as', signOut: 'Sign out', credentials: 'Credentials',
    yourDemoLogin: 'Your demo login', email: 'Email', pass: 'Pass', copy: 'Copy', copied: 'Copied',
    welcome: 'Welcome, {name}', yourTenant: 'your tenant:',
    yourRole: 'your role', accountNo: 'account no.', name: 'Name', accountTitle: '{x} title',
    recordsSub: 'Records in your tenant. Open one to view details.',
    lookupBy: 'Look up a {x} by reference', open: 'Open',
    refHdr: 'Reference', counterparty: 'Counterparty', amount: 'Amount', status: 'Status',
    docsSub: 'Open a document by its share token.',
    docToken: '{x} token', pasteToken: 'paste a token', titleHdr: 'Title', token: 'Token', role: 'Role',
    teamDenied: 'Only admins can view the {x} roster (HTTP {s}).', recentActivity: 'Recent activity',
    settingsSub: 'Update your profile. Your current role is {role}.',
    displayName: 'Display name', theme: 'Theme', themeLight: 'light', themeDark: 'dark', save: 'Save changes',
    missionsSub: '{n} / {t} solved · domain: {d}. Exploit a flaw, capture its MW{...} flag, submit it below.',
    submitFlagLabel: 'Submit a captured flag', submit: 'Submit',
    hint: 'Hint', difficulty: 'Difficulty', solved: '✔ solved',
    flagOk: '✔ {title} — solved!', flagBad: 'Not a valid flag.',
  },
  pt: {
    'nav.console': 'Console', 'nav.range': 'Desafios',
    'nav.dashboard': 'Painel', 'nav.settings': 'Configurações', 'nav.missions': 'Missões',
    railFoot: 'Campo de Treino · localhost',
    signedInAs: 'Conectado como', signOut: 'Sair', credentials: 'Credenciais',
    yourDemoLogin: 'Seu login de demonstração', email: 'E-mail', pass: 'Senha', copy: 'Copiar', copied: 'Copiado',
    welcome: 'Bem-vindo(a), {name}', yourTenant: 'seu tenant:',
    yourRole: 'seu papel', accountNo: 'nº da conta', name: 'Nome', accountTitle: 'Cargo do {x}',
    recordsSub: 'Registros do seu tenant. Abra um para ver os detalhes.',
    lookupBy: 'Buscar {x} por referência', open: 'Abrir',
    refHdr: 'Referência', counterparty: 'Contraparte', amount: 'Valor', status: 'Status',
    docsSub: 'Abra um documento pelo token de compartilhamento.',
    docToken: 'Token do {x}', pasteToken: 'cole um token', titleHdr: 'Título', token: 'Token', role: 'Papel',
    teamDenied: 'Apenas admins podem ver a lista de {x} (HTTP {s}).', recentActivity: 'Atividade recente',
    settingsSub: 'Atualize seu perfil. Seu papel atual é {role}.',
    displayName: 'Nome de exibição', theme: 'Tema', themeLight: 'claro', themeDark: 'escuro', save: 'Salvar alterações',
    missionsSub: '{n} / {t} resolvidas · domínio: {d}. Explore uma falha, capture a flag MW{...} e envie abaixo.',
    submitFlagLabel: 'Enviar uma flag capturada', submit: 'Enviar',
    hint: 'Dica', difficulty: 'Dificuldade', solved: '✔ resolvida',
    flagOk: '✔ {title} — resolvida!', flagBad: 'Flag inválida.',
  },
};
const ROLES_PT = { owner: 'Proprietário', admin: 'Administrador', member: 'Membro', staff: 'Equipe' };

let LANG = (localStorage.getItem('meridian_lang') === 'pt') ? 'pt' : 'en';
const setLang = (l) => { LANG = l; localStorage.setItem('meridian_lang', l); };
function t(key, vars) {
  let s = (I18N[LANG] && I18N[LANG][key]) || I18N.en[key] || key;
  if (vars) for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
  return s;
}
const term = (k) => ((LANG === 'pt' && META.termsPt) ? META.termsPt : META.terms)[k];
const roleLabel = (r) => (LANG === 'pt' && ROLES_PT[r]) ? ROLES_PT[r] : r;

async function boot() {
  META = (await api('GET', '/api/meta')).data;
  document.body.dataset.domain = META.domain; // shifts the accent per domain skin
  el('brand').firstChild.textContent = META.brand;
  document.title = META.brand;

  const me = await api('GET', '/api/auth/me');
  if (!me.ok) { location.href = '/login.html'; return; }
  ME = me.data;
  el('whoName').textContent = ME.name;
  el('whoRole').textContent = roleLabel(ME.orgRole);
  el('logout').onclick = async (e) => { e.preventDefault(); await api('POST', '/api/auth/logout'); location.href = '/login.html'; };
  el('langBtn').onclick = () => { setLang(LANG === 'en' ? 'pt' : 'en'); applyChrome(); el('whoRole').textContent = roleLabel(ME.orgRole); route(); };
  setupCredentials();
  applyChrome();
  window.addEventListener('hashchange', route);
  route();
}

// Apply translations + domain terms to the static shell (nav, topbar, footer).
function applyChrome() {
  document.querySelectorAll('[data-i18n]').forEach((e) => { e.textContent = t(e.dataset.i18n); });
  const mi = document.querySelector('#nav a.nav-flag');
  if (mi) mi.textContent = '★ ' + t('nav.missions');
  el('credBtn').textContent = '🔑 ' + t('credentials');
  el('langBtn').textContent = '🌐 ' + LANG.toUpperCase();
  el('brandSub').textContent = (LANG === 'pt' && META.taglinePt) ? META.taglinePt : META.tagline;
  document.querySelectorAll('#nav a[data-term]').forEach((a) => { const tt = term(a.dataset.term); if (tt) a.textContent = tt; });
}

// Topbar credentials popover — lets the player view/copy their demo login.
function setupCredentials() {
  if (META.demo) { el('credEmail').textContent = META.demo.email; el('credPass').textContent = META.demo.password; }
  const pop = el('credPop');
  el('credBtn').onclick = (e) => { e.stopPropagation(); pop.hidden = !pop.hidden; };
  document.addEventListener('click', (e) => { if (!pop.hidden && !pop.contains(e.target) && e.target !== el('credBtn')) pop.hidden = true; });
  document.querySelectorAll('.cred-copy').forEach((b) => b.onclick = async (e) => {
    e.stopPropagation();
    const text = el(b.dataset.copy).textContent;
    try { await navigator.clipboard.writeText(text); } catch { /* clipboard may be blocked */ }
    b.textContent = t('copied'); setTimeout(() => b.textContent = t('copy'), 1200);
  });
}

function setActive(hash) {
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === hash));
}

function crumbFor(name) {
  if (name === 'records') return term('recordPlural');
  if (name === 'documents') return term('document') + 's';
  if (name === 'team') return term('team');
  if (name === 'settings') return t('nav.settings');
  if (name === 'missions') return t('nav.missions');
  return t('nav.dashboard');
}

function route() {
  const hash = location.hash || '#dashboard';
  setActive(hash);
  const name = hash.slice(1).split('?')[0];
  el('crumb').textContent = crumbFor(name);
  ({ dashboard, records, documents, team, settings, missions }[name] || dashboard)();
}

// ---- Views -----------------------------------------------------------------
async function dashboard() {
  const acct = (await api('GET', '/api/account')).data;
  const recs = (await api('GET', '/api/records')).data || [];
  const docs = (await api('GET', '/api/documents')).data || [];
  el('view').innerHTML = `
    <h2 class="page">${t('welcome', { name: esc(ME.name.split(' ')[0]) })}</h2>
    <p class="sub">${esc(META.brand)} · ${t('yourTenant')} <span class="tag-pill">${esc(ME.orgId)}</span></p>
    <div class="grid">
      <div class="stat"><div class="n">${recs.length}</div><div class="l">${esc(term('recordPlural'))}</div></div>
      <div class="stat"><div class="n">${docs.length}</div><div class="l">${esc(term('document'))}s</div></div>
      <div class="stat"><div class="n">${esc(roleLabel(acct.orgRole))}</div><div class="l">${t('yourRole')}</div></div>
      <div class="stat"><div class="n">${esc(acct.accountNo)}</div><div class="l">${t('accountNo')}</div></div>
    </div>
    <div class="card">
      <div class="kv">
        <div class="k">${t('name')}</div><div>${esc(acct.name)}</div>
        <div class="k">${t('email')}</div><div>${esc(acct.email)}</div>
        <div class="k">${t('accountTitle', { x: esc(term('account')) })}</div><div>${esc(acct.profile.title || '')}</div>
      </div>
    </div>`;
}

async function records() {
  const list = (await api('GET', '/api/records')).data || [];
  el('view').innerHTML = `
    <h2 class="page">${esc(term('recordPlural'))}</h2>
    <p class="sub">${t('recordsSub')}</p>
    <div class="card">
      <div class="row">
        <div><label>${t('lookupBy', { x: esc(term('record').toLowerCase()) })}</label>
          <input id="lookup" placeholder="${esc(term('recordPrefix'))}-2026-0005" /></div>
        <button id="lookupBtn">${t('open')}</button>
      </div>
    </div>
    <div class="card"><table><thead><tr><th>${t('refHdr')}</th><th>${t('counterparty')}</th><th>${t('amount')}</th><th>${t('status')}</th></tr></thead>
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
  const list = (await api('GET', '/api/documents')).data || [];
  el('view').innerHTML = `
    <h2 class="page">${esc(term('document'))}s</h2>
    <p class="sub">${t('docsSub')}</p>
    <div class="card">
      <div class="row"><div><label>${t('docToken', { x: esc(term('document')) })}</label><input id="tok" placeholder="${t('pasteToken')}" /></div><button id="openTok">${t('open')}</button></div>
    </div>
    <div class="card"><table><thead><tr><th>${t('titleHdr')}</th><th>${t('token')}</th></tr></thead><tbody>
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
  const tt = await api('GET', '/api/admin/team');
  const act = (await api('GET', '/api/activity')).data || [];
  const teamHtml = tt.ok
    ? `<table><thead><tr><th>${t('name')}</th><th>${t('email')}</th><th>${t('role')}</th></tr></thead><tbody>${tt.data.map((u) => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(roleLabel(u.orgRole))}</td></tr>`).join('')}</tbody></table>`
    : `<p class="sub">${t('teamDenied', { x: esc(term('team').toLowerCase()), s: tt.status })}</p>`;
  el('view').innerHTML = `
    <h2 class="page">${esc(term('team'))}</h2>
    <div class="card">${teamHtml}</div>
    <div class="card"><h3>${t('recentActivity')}</h3>
      ${act.map((a) => `<div style="padding:8px 0;border-bottom:1px solid var(--line);font-size:14px"><b>${esc(a.actorName)}</b> ${esc(a.text)} <span class="diff">· ${esc(a.ts)}</span></div>`).join('')}
    </div>`;
}

async function settings() {
  const acct = (await api('GET', '/api/account')).data;
  el('view').innerHTML = `
    <h2 class="page">${t('nav.settings')}</h2>
    <p class="sub">${t('settingsSub', { role: esc(roleLabel(acct.orgRole)) })}</p>
    <div class="card">
      <label>${t('displayName')}</label><input id="name" value="${esc(acct.name)}" />
      <label>${t('theme')}</label><select id="theme"><option value="light">${t('themeLight')}</option><option value="dark">${t('themeDark')}</option></select>
      <button class="full" id="save">${t('save')}</button>
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
      <h4>${esc(c.title)} ${c.solved ? `<span class="badge-ok">${t('solved')}</span>` : ''}</h4>
      <div class="cat">${esc(c.category)}</div>
      <div class="hint">${t('hint')}: ${esc(c.hint)}</div>
      <div class="diff">${t('difficulty')}: ${'●'.repeat(c.difficulty)}${'○'.repeat(3 - c.difficulty)}</div>
    </div>`).join('');
  el('view').innerHTML = `
    <h2 class="page">${t('nav.missions')}</h2>
    <p class="sub progress">${t('missionsSub', { n: sb.solvedCount, t: sb.total, d: esc(sb.domain) })}</p>
    <div class="card">
      <div class="row"><div><label>${t('submitFlagLabel')}</label><input id="flag" placeholder="MW{...}" /></div><button id="submitFlag">${t('submit')}</button></div>
      <div id="flagout"></div>
    </div>
    ${items}`;
  el('submitFlag').onclick = async () => {
    const r = await api('POST', '/api/scoreboard/submit', { flag: el('flag').value.trim() });
    if (r.data && r.data.ok) { el('flagout').innerHTML = `<p class="badge-ok">${t('flagOk', { title: esc(r.data.challenge.title) })}</p>`; setTimeout(missions, 700); }
    else { el('flagout').innerHTML = `<p class="err">${t('flagBad')}</p>`; }
  };
}

boot();
