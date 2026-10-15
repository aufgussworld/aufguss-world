// Start aplikacji: logowanie (sędzia kodem, supervisor PIN-em), nawigacja po adresach #/…, szkielet ekranu.

import { html, render, useEffect, useState } from './lib.js';
import { fullName, normCode, prettyCode, fmtRange, STATUS } from './model.js';
import { store, useStore, getSession, setSession } from './store.js';
import { Icon, SRLogo, DiscBadge, ToastHost, TipHost, toast } from './ui.js';
import { JudgeApp } from './judge.js';
import { SupervisorHome, TournamentView } from './supervisor.js';
import { Wizard } from './wizard.js';

const go = (hash) => {
  if (location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = hash;
};

function useHash() {
  const [h, setH] = useState(location.hash);
  useEffect(() => {
    const on = () => setH(location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return h;
}

// ---------- logowanie ----------

function Login({ onLogin }) {
  const s = useStore();
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState(null);
  const [pinErr, setPinErr] = useState(null);
  const live = s.tournaments.filter((t) => t.status === 'live');

  const loginJudge = (raw) => {
    const c = normCode(raw);
    if (c.length < 6) return setErr('Kod ma 6 znaków, np. K7M 4QX.');
    for (const t of s.tournaments) {
      const j = t.judges.find((x) => x.code === c);
      if (!j) continue;
      if (t.status === 'draft') return setErr('Ten turniej nie został jeszcze otwarty przez supervisora.');
      onLogin({ role: 'judge', tid: t.id, jid: j.id });
      return;
    }
    setErr('Nie znaleziono sędziego z takim kodem. Sprawdź kod na kartce od supervisora.');
  };
  const loginSup = () => {
    if (pin.trim() !== s.supervisorPin) return setPinErr('Nieprawidłowy PIN.');
    onLogin({ role: 'sup' });
  };

  return html`<div class="login">
    <section class="login-brand">
      <img src="assets/login-hero.jpg" width="1046" height="896"
        alt="Sommer Residence — Turniej Trzech Saun. Trzy żywioły, jedna pasja. Sommer HOT 29–31 maja 2026, Relax Cup 8–9 sierpnia 2026, Banya Cup 17–18 października 2026, Finał Turnieju Trzech Saun 11–13 grudnia 2026." />
    </section>

    <section class="login-forms">
      <h1 class="login-title"><span>System sędziowski</span>Turniej Trzech Saun</h1>
      <form class="panel login-card" onSubmit=${(e) => { e.preventDefault(); loginJudge(code); }}>
        <h2><${Icon} name="gavel" />Sędzia</h2>
        <label for="code">Kod logowania</label>
        <input id="code" class="code-input" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false"
          maxlength="9" placeholder="ABC 123" value=${code} aria-invalid=${err ? 'true' : 'false'} aria-describedby=${err ? 'code-err' : undefined}
          onInput=${(e) => { setCode(e.currentTarget.value.toUpperCase()); setErr(null); }} />
        ${err ? html`<p class="err" id="code-err" role="alert"><${Icon} name="alert" size=${14} />${err}</p>` : null}
        <button class="btn primary lg block" type="submit">Zaloguj się<${Icon} name="arrow-right" /></button>
      </form>

      <form class="panel login-card" onSubmit=${(e) => { e.preventDefault(); loginSup(); }}>
        <h2><${Icon} name="monitor" />Supervisor</h2>
        <label for="pin">PIN supervisora</label>
        <input id="pin" type="password" inputmode="numeric" autocomplete="off" value=${pin} aria-invalid=${pinErr ? 'true' : 'false'}
          onInput=${(e) => { setPin(e.currentTarget.value); setPinErr(null); }} />
        ${pinErr ? html`<p class="err" role="alert"><${Icon} name="alert" size=${14} />${pinErr}</p>` : null}
        <button class="btn lg block" type="submit">Otwórz panel supervisora<${Icon} name="arrow-right" /></button>
      </form>

      <aside class="demo-box">
        <h3><span class="demo-pill">Demo</span>Szybkie logowanie</h3>
        <p class="muted small">Dane są fikcyjne. PIN supervisora: <b class="mono">${s.supervisorPin}</b></p>
        <button class="btn block" onClick=${() => onLogin({ role: 'sup' })}><${Icon} name="monitor" />Wejdź jako supervisor</button>
        ${live.map((t) => html`<div class="demo-t" key=${t.id}>
          <p class="small"><${DiscBadge} disc=${t.type} small /> <b>${t.name}</b> <span class="muted">· ${fmtRange(t.dateFrom, t.dateTo)} · ${STATUS[t.status].label.toLowerCase()}</span></p>
          <ul class="demo-judges">
            ${t.judges.map((j) => html`<li key=${j.id}><button class="demo-j" onClick=${() => onLogin({ role: 'judge', tid: t.id, jid: j.id })}>
              <span>${fullName(j)}</span><span class="code">${prettyCode(j.code)}</span></button></li>`)}
          </ul>
        </div>`)}
        <p class="muted small tip"><${Icon} name="info" size=${14} />Otwórz panel supervisora i kartę sędziego w dwóch kartach przeglądarki obok siebie — oceny pojawią się u supervisora na żywo.</p>
        <button class="link-btn small" onClick=${() => { if (confirm('Przywrócić dane przykładowe? Wszystkie zmiany w tej przeglądarce zostaną usunięte.')) { store.reset(); toast('Przywrócono dane demo'); } }}>
          <${Icon} name="refresh" size=${14} />Przywróć dane demo</button>
      </aside>
    </section>
  </div>`;
}

// ---------- szkielet ----------

function TopBar({ session, t, judge, hash, onLogout }) {
  const parts = hash.slice(2).split('/');
  const jv = parts[1] || 'ocena';
  const jd = parts[2] && parts[2] !== 'all' ? parts[2] : '';
  return html`<header class="topbar">
    <a class="brand" href=${session.role === 'sup' ? '#/s' : '#/j/ocena'} aria-label="Turniej Trzech Saun — strona główna">
      <${SRLogo} height=${40} /><span><b>Turniej Trzech Saun</b><small>system sędziowski</small></span>
    </a>
    ${session.role === 'judge' && t ? html`
      <div class="tb-ctx"><span class="tb-t">${t.name}</span><${DiscBadge} disc=${t.type} small /></div>
      <nav class="tb-nav" aria-label="Widoki sędziego">
        ${[['ocena', 'Ocenianie', 'clipboard'], ['porownanie', 'Porównanie', 'columns'], ['ranking', 'Mój ranking', 'ranking']].map(([k, l, i]) =>
          html`<a key=${k} href=${`#/j/${k}${jd ? '/' + jd : ''}`} class=${jv === k ? 'on' : ''} aria-current=${jv === k ? 'page' : undefined} title=${l}><${Icon} name=${i} size=${17} /><span>${l}</span></a>`)}
      </nav>` : html`<div class="tb-ctx"><span class="tb-t">Panel supervisora</span></div><span class="grow"></span>`}
    <span class="demo-pill" title="Wersja demonstracyjna — dane zapisują się w tej przeglądarce">Demo</span>
    <div class="tb-user">
      <span class="tb-av"><${Icon} name=${session.role === 'sup' ? 'monitor' : 'user'} size=${16} /></span>
      <span><b>${session.role === 'sup' ? 'Supervisor' : fullName(judge)}</b><small>${session.role === 'sup' ? 'sędzia techniczny' : 'sędzia'}</small></span>
    </div>
    <button class="btn ghost sm" onClick=${onLogout}><${Icon} name="logout" size=${16} /><span class="hide-sm">Wyloguj</span></button>
  </header>`;
}

function App() {
  const s = useStore();
  const hash = useHash();
  const [session, setSess] = useState(getSession);
  const login = (x) => {
    setSession(x);
    setSess(x);
    go(x.role === 'sup' ? '#/s' : '#/j/ocena');
  };
  const logout = () => {
    setSession(null);
    setSess(null);
    go('#/');
  };

  useEffect(() => { window.scrollTo({ top: 0 }); }, [hash.split('/').slice(0, 3).join('/')]);

  let body;
  let t = null, judge = null;
  if (!session) {
    body = html`<${Login} onLogin=${login} />`;
  } else if (session.role === 'judge') {
    t = s.tournaments.find((x) => x.id === session.tid);
    judge = t && t.judges.find((j) => j.id === session.jid);
    if (!t || !judge) {
      setTimeout(logout);
      return null;
    }
    if (!hash.startsWith('#/j')) setTimeout(() => go('#/j/ocena'));
    body = html`<${JudgeApp} t=${t} judge=${judge} route=${hash.slice(2).split('/')} go=${go} />`;
  } else {
    const parts = hash.slice(2).split('/');
    if (parts[0] !== 's') setTimeout(() => go('#/s'));
    if (parts[1] === 'new') body = html`<${Wizard} go=${go} />`;
    else if (parts[1] === 't') {
      const tt = s.tournaments.find((x) => x.id === parts[2]);
      body = tt ? html`<${TournamentView} t=${tt} tab=${parts[3] || 'wyniki'} go=${go} />` : html`<${SupervisorHome} go=${go} />`;
    } else body = html`<${SupervisorHome} go=${go} />`;
  }

  return html`<div class=${'app ' + (session ? 'role-' + session.role : 'role-none')}>
    <a class="skip" href="#main">Przejdź do treści</a>
    ${session ? html`<${TopBar} session=${session} t=${t} judge=${judge} hash=${hash} onLogout=${logout} />` : null}
    ${store.saveError() ? html`<div class="alert err banner"><${Icon} name="alert" />Nie udało się zapisać danych w przeglądarce (brak miejsca). Usuń część zdjęć lub zrób kopię zapasową.</div>` : null}
    <div class="app-body" id=${session && session.role === 'judge' ? 'main' : undefined}>${body}</div>
    <${ToastHost} />
    <${TipHost} />
  </div>`;
}

const root = document.getElementById('app');
root.textContent = '';
render(html`<${App} />`, root);
