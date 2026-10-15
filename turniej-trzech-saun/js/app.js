// Start aplikacji: logowanie (sędzia kodem, supervisor kodem dostępu), nawigacja po adresach #/…, szkielet ekranu.
// W wersji produkcyjnej (config.js: mode 'live') logowanie i dane obsługuje baza Supabase (js/remote.js).

import { html, render, useEffect, useRef, useState } from './lib.js';
import { fullName, normCode, prettyCode, fmtRange, STATUS } from './model.js';
import { store, useStore, getSession, setSession, LIVE } from './store.js';
import { Icon, SRLogo, DiscBadge, ToastHost, TipHost, toast } from './ui.js';
import { JudgeApp } from './judge.js';
import { SupervisorHome, TournamentView, SystemPage } from './supervisor.js';
import { Wizard } from './wizard.js';
import { autoBackupTick } from './backup.js';

const HERO = new URL('../assets/login-hero.jpg', import.meta.url).href;
let remote = null; // js/remote.js — ładowany tylko w wersji produkcyjnej

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

const sessionFromRemote = (who) => (who.role === 'supervisor'
  ? { role: 'sup', mustChange: who.codeSetBy !== 'supervisor', codeChangedAt: who.codeChangedAt }
  : { role: 'judge', tid: who.tournamentId, jid: who.judgeId });

// ---------- logowanie ----------

function Login({ onLogin, notice }) {
  const s = useStore();
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState(null);
  const [pinErr, setPinErr] = useState(null);
  const [busy, setBusy] = useState(null);
  const live = LIVE ? [] : s.tournaments.filter((t) => t.status === 'live');

  const submit = async (kind, value, setError) => {
    setBusy(kind);
    try {
      await onLogin(kind, value);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(null);
    }
  };

  return html`<div class="login">
    <section class="login-brand">
      <img src=${HERO} width="1046" height="896"
        alt="Sommer Residence — Turniej Trzech Saun. Trzy żywioły, jedna pasja. Sommer HOT 29–31 maja 2026, Relax Cup 8–9 sierpnia 2026, Banya Cup 17–18 października 2026, Finał Turnieju Trzech Saun 11–13 grudnia 2026." />
    </section>

    <section class="login-forms">
      <h1 class="login-title"><span>System sędziowski</span>Turniej Trzech Saun</h1>
      ${notice ? html`<div class="alert info"><${Icon} name="info" />${notice}</div>` : null}
      <form class="panel login-card" onSubmit=${(e) => { e.preventDefault(); submit('judge', code, setErr); }}>
        <h2><${Icon} name="gavel" />Sędzia</h2>
        <label for="code">Kod logowania</label>
        <input id="code" class="code-input" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false"
          maxlength="9" placeholder="ABC 123" value=${code} aria-invalid=${err ? 'true' : 'false'} aria-describedby=${err ? 'code-err' : undefined}
          onInput=${(e) => { setCode(e.currentTarget.value.toUpperCase()); setErr(null); }} />
        ${err ? html`<p class="err" id="code-err" role="alert"><${Icon} name="alert" size=${14} />${err}</p>` : null}
        <button class="btn primary lg block" type="submit" disabled=${!!busy}>${busy === 'judge' ? 'Logowanie…' : 'Zaloguj się'}<${Icon} name="arrow-right" /></button>
      </form>

      <form class="panel login-card" onSubmit=${(e) => { e.preventDefault(); submit('sup', pin, setPinErr); }}>
        <h2><${Icon} name="monitor" />Supervisor</h2>
        <label for="pin">${LIVE ? 'Kod dostępu supervisora' : 'PIN supervisora'}</label>
        <input id="pin" type="password" autocomplete="current-password" value=${pin} aria-invalid=${pinErr ? 'true' : 'false'}
          onInput=${(e) => { setPin(e.currentTarget.value); setPinErr(null); }} />
        ${pinErr ? html`<p class="err" role="alert"><${Icon} name="alert" size=${14} />${pinErr}</p>` : null}
        <button class="btn lg block" type="submit" disabled=${!!busy}>${busy === 'sup' ? 'Logowanie…' : 'Otwórz panel supervisora'}<${Icon} name="arrow-right" /></button>
      </form>

      ${LIVE ? html`<p class="muted small login-foot">
          <a href="demo/">Wersja demonstracyjna</a> z przykładowymi danymi — do nauki obsługi, bez wpływu na prawdziwy turniej.</p>`
        : html`<aside class="demo-box">
        <h3><span class="demo-pill">Demo</span>Szybkie logowanie</h3>
        <p class="muted small">Dane są fikcyjne. PIN supervisora: <b class="mono">${s.supervisorPin}</b></p>
        <button class="btn block" onClick=${() => onLogin('demo', { role: 'sup' })}><${Icon} name="monitor" />Wejdź jako supervisor</button>
        ${live.map((t) => html`<div class="demo-t" key=${t.id}>
          <p class="small"><${DiscBadge} disc=${t.type} small /> <b>${t.name}</b> <span class="muted">· ${fmtRange(t.dateFrom, t.dateTo)} · ${STATUS[t.status].label.toLowerCase()}</span></p>
          <ul class="demo-judges">
            ${t.judges.map((j) => html`<li key=${j.id}><button class="demo-j" onClick=${() => onLogin('demo', { role: 'judge', tid: t.id, jid: j.id })}>
              <span>${fullName(j)}</span><span class="code">${prettyCode(j.code)}</span></button></li>`)}
          </ul>
        </div>`)}
        <p class="muted small tip"><${Icon} name="info" size=${14} />Otwórz panel supervisora i kartę sędziego w dwóch kartach przeglądarki obok siebie — oceny pojawią się u supervisora na żywo.</p>
        <button class="link-btn small" onClick=${() => { if (confirm('Przywrócić dane przykładowe? Wszystkie zmiany w tej przeglądarce zostaną usunięte.')) { store.reset(); toast('Przywrócono dane demo'); } }}>
          <${Icon} name="refresh" size=${14} />Przywróć dane demo</button>
      </aside>`}
    </section>
  </div>`;
}

// Zmiana kodu supervisora — wymuszona, dopóki obowiązuje kod nadany przez administratora.
export function ChangeCodeForm({ initialOld = '', onDone, onCancel, forced = false }) {
  const [oldC, setOld] = useState(initialOld);
  const [newC, setNew] = useState('');
  const [rep, setRep] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (newC.length < 8) return setErr('Nowy kod musi mieć co najmniej 8 znaków.');
    if (newC !== rep) return setErr('Powtórzony kod nie jest taki sam.');
    if (newC === oldC) return setErr('Nowy kod musi być inny niż obecny.');
    setBusy(true);
    try {
      await remote.changeSupervisorCode(oldC, newC);
      toast('Kod supervisora zmieniony. Inne urządzenia zostały wylogowane.');
      onDone && onDone();
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };
  return html`<form class="code-form" onSubmit=${submit}>
    ${!initialOld || !forced ? html`<label>Obecny kod<input type="password" autocomplete="current-password" value=${oldC} onInput=${(e) => { setOld(e.currentTarget.value); setErr(null); }} /></label>` : null}
    <label>Nowy kod (min. 8 znaków)<input type="password" autocomplete="new-password" value=${newC} onInput=${(e) => { setNew(e.currentTarget.value); setErr(null); }} /></label>
    <label>Powtórz nowy kod<input type="password" autocomplete="new-password" value=${rep} onInput=${(e) => { setRep(e.currentTarget.value); setErr(null); }} /></label>
    ${err ? html`<p class="err" role="alert"><${Icon} name="alert" size=${14} />${err}</p>` : null}
    <div class="row-actions left">
      <button class="btn primary" type="submit" disabled=${busy}><${Icon} name="key" size=${16} />${busy ? 'Zapisuję…' : 'Ustaw nowy kod'}</button>
      ${onCancel ? html`<button class="btn ghost" type="button" onClick=${onCancel}>${forced ? 'Wyloguj' : 'Anuluj'}</button>` : null}
    </div>
  </form>`;
}

function ForcedCodeChange({ session, initialOld, onDone, onLogout }) {
  const when = session.codeChangedAt ? new Date(session.codeChangedAt).toLocaleString('pl-PL', { dateStyle: 'long', timeStyle: 'short' }) : null;
  return html`<div class="gate">
    <div class="panel gate-card">
      <${SRLogo} height=${54} onLight />
      <h1>Ustaw własny kod supervisora</h1>
      <p>Obecny kod nadał lub zresetował administrator systemu${when ? ` (${when})` : ''}. Ustaw kod znany tylko Tobie.
        Od tej chwili administrator nie zaloguje się do panelu, a z jego kodem nie da się zobaczyć żadnych danych turnieju.</p>
      <p class="muted small">Jeśli kiedykolwiek zobaczysz ten ekran ponownie, choć nie zmieniałeś kodu, oznacza to, że administrator go zresetował.</p>
      <${ChangeCodeForm} initialOld=${initialOld} forced onDone=${onDone} onCancel=${onLogout} />
    </div>
  </div>`;
}

function Gate({ icon = 'info', title, children, action }) {
  return html`<div class="gate"><div class="panel gate-card">
    <${SRLogo} height=${54} onLight />
    <h1>${title}</h1>
    ${children}
    ${action || null}
  </div></div>`;
}

// ---------- szkielet ----------

function SyncBadge({ sync, offline }) {
  if (!LIVE) return html`<span class="demo-pill" title="Wersja demonstracyjna — dane zapisują się w tej przeglądarce">Demo</span>`;
  const s = sync || {};
  if (offline || !s.online || s.error) {
    return html`<span class="sync warn" title=${s.error || 'Brak połączenia z bazą'} role="status">
      <${Icon} name="alert" size=${15} /><span>${s.pending ? `Brak połączenia · ${s.pending} czeka` : 'Brak połączenia'}</span></span>`;
  }
  if (s.pending) return html`<span class="sync busy" role="status"><${Icon} name="refresh" size=${15} /><span>Zapisywanie…</span></span>`;
  return html`<span class="sync ok" role="status" title="Wszystkie zmiany są zapisane w bazie"><${Icon} name="check" size=${15} /><span>Zapisano</span></span>`;
}

function TopBar({ session, t, judge, hash, onLogout, sync, offline }) {
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
    <${SyncBadge} sync=${sync} offline=${offline} />
    <div class="tb-user">
      <span class="tb-av"><${Icon} name=${session.role === 'sup' ? 'monitor' : 'user'} size=${16} /></span>
      <span><b>${session.role === 'sup' ? 'Supervisor' : fullName(judge || {})}</b><small>${session.role === 'sup' ? 'sędzia techniczny' : 'sędzia'}</small></span>
    </div>
    <button class="btn ghost sm" onClick=${onLogout}><${Icon} name="logout" size=${16} /><span class="hide-sm">Wyloguj</span></button>
  </header>`;
}

function App() {
  const s = useStore();
  const hash = useHash();
  const [boot, setBoot] = useState(LIVE ? 'loading' : 'ready');
  const [bootError, setBootError] = useState(null);
  const [session, setSess] = useState(LIVE ? null : getSession);
  const [notice, setNotice] = useState(null);
  const typedCode = useRef('');

  useEffect(() => {
    if (!LIVE) return;
    (async () => {
      try {
        remote = await import('./remote.js');
        await remote.init();
        const who = await remote.resume();
        if (who) setSess(sessionFromRemote(who));
      } catch (e) {
        setBootError(e.message || String(e));
      }
      setBoot('ready');
    })();
    const onErr = (e) => toast(e.detail, 'err');
    const onLost = () => logout('Zostałeś wylogowany — kod dostępu mógł zostać zmieniony na innym urządzeniu. Zaloguj się ponownie.');
    window.addEventListener('tts-sync-error', onErr);
    window.addEventListener('tts-session-lost', onLost);
    return () => {
      window.removeEventListener('tts-sync-error', onErr);
      window.removeEventListener('tts-session-lost', onLost);
    };
  }, []);

  // kopia zapasowa na komputerze supervisora co godzinę o :30
  useEffect(() => {
    if (!session || session.role !== 'sup' || session.mustChange) return;
    const id = setInterval(() => autoBackupTick(() => store.get().tournaments, (m) => toast(m)), 15000);
    return () => clearInterval(id);
  }, [session && session.role, session && session.mustChange]);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [hash.split('/').slice(0, 3).join('/')]);

  const login = async (kind, value) => {
    let next;
    if (!LIVE) {
      if (kind === 'demo') next = value;
      else if (kind === 'sup') {
        if (String(value).trim() !== store.get().supervisorPin) throw new Error('Nieprawidłowy PIN.');
        next = { role: 'sup' };
      } else {
        const c = normCode(value);
        if (c.length < 6) throw new Error('Kod ma 6 znaków, np. K7M 4QX.');
        const t = store.get().tournaments.find((x) => x.judges.some((j) => j.code === c));
        if (!t) throw new Error('Nie znaleziono sędziego z takim kodem. Sprawdź kod na kartce od supervisora.');
        if (t.status === 'draft') throw new Error('Ten turniej nie został jeszcze otwarty przez supervisora.');
        next = { role: 'judge', tid: t.id, jid: t.judges.find((j) => j.code === c).id };
      }
      setSession(next);
    } else {
      if (kind === 'judge') {
        if (normCode(value).length < 6) throw new Error('Kod ma 6 znaków, np. K7M 4QX.');
        next = sessionFromRemote(await remote.loginJudge(value));
      } else {
        if (!String(value).trim()) throw new Error('Wpisz kod dostępu supervisora.');
        typedCode.current = value;
        next = sessionFromRemote(await remote.loginSupervisor(value));
      }
    }
    setNotice(null);
    setSess(next);
    go(next.role === 'sup' ? '#/s' : '#/j/ocena');
  };

  const logout = async (message) => {
    if (LIVE && remote) await remote.logout();
    else setSession(null);
    typedCode.current = '';
    setSess(null);
    setNotice(typeof message === 'string' ? message : null);
    go('#/');
  };

  let body;
  let t = null, judge = null;
  if (boot === 'loading') {
    body = html`<div class="boot-screen"><${SRLogo} height=${56} onLight /><p>Łączenie z systemem sędziowskim…</p></div>`;
  } else if (bootError) {
    body = html`<${Gate} title="System nie jest jeszcze gotowy">
      <p>${bootError}</p>
      <p class="muted small">Jeśli jesteś administratorem — uzupełnij plik config.js adresem i kluczem publicznym bazy Supabase. Do tego czasu możesz korzystać z <a href="demo/">wersji demonstracyjnej</a>.</p>
    </${Gate}>`;
  } else if (!session) {
    body = html`<${Login} onLogin=${login} notice=${notice} />`;
  } else if (session.role === 'sup' && session.mustChange) {
    body = html`<${ForcedCodeChange} session=${session} initialOld=${typedCode.current} onLogout=${() => logout()}
      onDone=${() => setSess({ role: 'sup', mustChange: false })} />`;
  } else if (LIVE && !s.loaded) {
    body = html`<div class="boot-screen"><${SRLogo} height=${56} onLight /><p>Wczytywanie danych turnieju…</p></div>`;
  } else if (session.role === 'judge') {
    t = s.tournaments.find((x) => x.id === session.tid);
    judge = t && t.judges.find((j) => j.id === session.jid);
    if (!t || !judge) {
      body = html`<${Gate} title="Brak dostępu do turnieju">
        <p>Twoje logowanie wygasło albo supervisor zmienił ustawienia turnieju (np. nadał nowy kod lub cofnął turniej do szkicu).</p>
        <p class="muted small">Zaloguj się ponownie kodem od supervisora.</p>
        <button class="btn primary lg" onClick=${() => logout()}><${Icon} name="logout" />Wróć do logowania</button>
      </${Gate}>`;
    } else {
      if (!hash.startsWith('#/j')) setTimeout(() => go('#/j/ocena'));
      body = html`<${JudgeApp} t=${t} judge=${judge} route=${hash.slice(2).split('/')} go=${go} />`;
    }
  } else {
    const parts = hash.slice(2).split('/');
    if (parts[0] !== 's') setTimeout(() => go('#/s'));
    if (parts[1] === 'new') body = html`<${Wizard} go=${go} />`;
    else if (parts[1] === 'system') body = html`<${SystemPage} go=${go} remote=${remote} ChangeCodeForm=${ChangeCodeForm} />`;
    else if (parts[1] === 't') {
      const tt = s.tournaments.find((x) => x.id === parts[2]);
      body = tt ? html`<${TournamentView} t=${tt} tab=${parts[3] || 'wyniki'} go=${go} />` : html`<${SupervisorHome} go=${go} />`;
    } else body = html`<${SupervisorHome} go=${go} />`;
  }

  const showTop = session && boot === 'ready' && !bootError && !(session.role === 'sup' && session.mustChange);
  return html`<div class=${'app ' + (session ? 'role-' + session.role : 'role-none')}>
    <a class="skip" href="#main">Przejdź do treści</a>
    ${showTop ? html`<${TopBar} session=${session} t=${t} judge=${judge} hash=${hash} onLogout=${() => logout()} sync=${s.sync} offline=${s.offline} />` : null}
    ${LIVE && s.offline ? html`<div class="alert warn banner"><${Icon} name="alert" />Brak połączenia z bazą — pracujesz na kopii zapisanej w tej przeglądarce. Oceny wyślą się same, gdy wróci internet.</div>` : null}
    ${store.saveError() ? html`<div class="alert err banner"><${Icon} name="alert" />Nie udało się zapisać danych w przeglądarce (brak miejsca). Usuń część zdjęć lub zrób kopię zapasową.</div>` : null}
    <div class="app-body" id=${session && session.role === 'judge' ? 'main' : undefined}>${body}</div>
    <${ToastHost} />
    <${TipHost} />
  </div>`;
}

const root = document.getElementById('app');
root.textContent = '';
render(html`<${App} />`, root);
