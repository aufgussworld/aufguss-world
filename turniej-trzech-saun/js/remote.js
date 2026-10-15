// Tryb produkcyjny: baza Supabase.
// Stan aplikacji trzymamy w pamięci w tym samym kształcie co w wersji demo. Ten moduł:
//  * loguje urządzenie anonimowo i przypisuje mu rolę kodem (funkcje tts_login_* w bazie),
//  * zapisuje zmiany (oceny sędziów od razu, edycje supervisora z krótkim opóźnieniem),
//  * trzyma niewysłane oceny w kolejce w przeglądarce — przy braku internetu nic nie ginie,
//  * odbiera zmiany innych osób na żywo i co minutę dla pewności odświeża całość,
//  * zapisuje kopię stanu w przeglądarce, żeby po przeładowaniu bez internetu dało się dalej pracować.

import { store, CONFIG, getT, attachRemote } from './store.js';
import { splitTournament, assembleTournament, putEntry, historyFromRow } from './backup.js';

const SUPABASE_ESM = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm';
const OUTBOX_KEY = 'tts-live-outbox';
const CACHE_KEY = 'tts-live-cache';

let sb = null;
let session = null; // { role, tournamentId, judgeId, codeSetBy, codeChangedAt }
let channel = null;
let refreshTimer = null;
let flushTimer = null;
let flushing = false;
let channelDown = false;
const last = {}; // tid → odcisk ostatnio zsynchronizowanej wersji turnieju
const dirty = new Map(); // tid → timer zapisu turnieju
const inflight = new Map(); // tid → trwający zapis
let outbox = loadOutbox();
let lastError = null;

// ---------- pomocnicze ----------

function loadOutbox() {
  try {
    const o = JSON.parse(localStorage.getItem(OUTBOX_KEY));
    if (o && o.entries && Array.isArray(o.history)) return o;
  } catch (_) { /* pusta kolejka */ }
  return { entries: {}, history: [] };
}
function saveOutbox() {
  try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox)); } catch (_) { /* brak miejsca */ }
}

let cacheTimer = null;
function saveCache() {
  clearTimeout(cacheTimer);
  cacheTimer = setTimeout(() => {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ session, tournaments: store.get().tournaments, savedAt: Date.now() }));
    } catch (_) { /* brak miejsca — kopia w pamięci przeglądarki jest dodatkiem */ }
  }, 1500);
}
function readCache() {
  try { return JSON.parse(sessionStorage.getItem(CACHE_KEY)); } catch (_) { return null; }
}

function friendly(err) {
  const msg = (err && (err.message || err.error_description)) || String(err || '');
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return new Error('Brak połączenia z bazą danych. Sprawdź internet i spróbuj ponownie.');
  if (/anonymous.*disabled|Anonymous sign-ins are disabled/i.test(msg)) return new Error('Logowanie urządzeń jest wyłączone w ustawieniach bazy (Supabase → Authentication → Anonymous sign-ins).');
  if (/rate limit/i.test(msg)) return new Error('Zbyt wiele prób logowania z tej sieci. Odczekaj chwilę i spróbuj ponownie.');
  return new Error(msg);
}

function fingerprint(t) {
  const s = splitTournament(t);
  return {
    status: s.status,
    data: JSON.stringify(s.data),
    priv: JSON.stringify(s.priv),
    codes: s.codes,
    judges: (t.judges || []).map((j) => j.id),
    contestants: (t.contestants || []).map((c) => c.id),
  };
}

function pendingCount() {
  const mine = (r) => !session || session.role !== 'judge' || (r.judge_id === session.judgeId && r.tournament_id === session.tournamentId);
  return Object.values(outbox.entries).filter(mine).length + outbox.history.filter(mine).length + dirty.size + inflight.size;
}

function setSync(patch = {}) {
  const cur = store.get().sync || {};
  const next = { pending: pendingCount(), error: lastError, online: navigator.onLine, ...patch };
  if (cur.pending === next.pending && cur.error === next.error && cur.online === next.online) return;
  store.mutate((s) => { s.sync = next; });
}
function ok() {
  lastError = null;
  setSync({ lastOk: Date.now() });
}
function failed(err, permanent = false) {
  lastError = friendly(err).message;
  console.warn('Zapis do bazy nie powiódł się', err);
  setSync();
  if (permanent) window.dispatchEvent(new CustomEvent('tts-sync-error', { detail: lastError }));
}
const isPermanent = (err) => err && (err.code === 'P0001' || err.code === '42501' || err.code === '23505');

// Pobiera całą tabelę porcjami po 1000 wierszy (limit API), w stałej kolejności.
async function selectAll(table, orders) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    let q = sb.from(table).select('*');
    for (const col of orders) q = q.order(col);
    q = q.range(from, from + 999);
    const { data, error } = await q;
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

// ---------- start i logowanie ----------

export async function init() {
  if (!CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey) throw new Error('Brak konfiguracji bazy danych (config.js).');
  const { createClient } = await import(SUPABASE_ESM);
  sb = createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
    auth: { storage: window.sessionStorage, storageKey: 'tts-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  attachRemote({ queueTournament, queueEntry, queueHistory, deleteTournament });
  window.addEventListener('online', () => { setSync(); flushOutbox(); });
  window.addEventListener('offline', () => setSync());
  setInterval(() => { if (pendingCount()) flushOutbox(); }, 5000);
}

async function ensureDevice() {
  const { data } = await sb.auth.getSession();
  if (data.session) return;
  const { error } = await sb.auth.signInAnonymously();
  if (error) throw friendly(error);
}

export const getSessionInfo = () => session;

export async function loginJudge(code) {
  await ensureDevice();
  const { data, error } = await sb.rpc('tts_login_judge', { p_code: code });
  if (error) throw friendly(error);
  session = data;
  await loadAll();
  return session;
}

export async function loginSupervisor(code) {
  await ensureDevice();
  const { data, error } = await sb.rpc('tts_login_supervisor', { p_code: code });
  if (error) throw friendly(error);
  session = data;
  if (session.codeSetBy !== 'admin') await loadAll();
  return session;
}

export async function changeSupervisorCode(oldCode, newCode) {
  const { data, error } = await sb.rpc('tts_change_supervisor_code', { p_old: oldCode, p_new: newCode });
  if (error) throw friendly(error);
  session = data;
  if (!store.get().loaded) await loadAll();
  return session;
}

// Po przeładowaniu strony: sesja urządzenia zostaje w tej karcie przeglądarki.
export async function resume() {
  const { data } = await sb.auth.getSession();
  if (!data.session) return null;
  const { data: who, error } = await sb.rpc('tts_whoami');
  if (error) {
    const cache = readCache();
    if (cache && cache.session && /fetch|network/i.test(error.message || '')) {
      session = cache.session;
      store.replace({ version: 1, rev: 1, loaded: true, offline: true, tournaments: cache.tournaments || [], sync: { pending: pendingCount(), error: 'Brak połączenia — pracujesz na kopii z tej przeglądarki', online: false } });
      return session;
    }
    return null;
  }
  if (!who) return null; // sesja wygasła, np. po zmianie kodu
  session = who;
  if (session.role === 'supervisor' && session.codeSetBy === 'admin') return session;
  await loadAll();
  return session;
}

export async function logout() {
  try { await flushOutbox(); } catch (_) { /* spróbujemy przy następnym logowaniu */ }
  try { await sb.rpc('tts_logout'); } catch (_) { /* bez znaczenia */ }
  try { await sb.auth.signOut(); } catch (_) { /* bez znaczenia */ }
  teardown();
  session = null;
  try { sessionStorage.removeItem(CACHE_KEY); } catch (_) { /* brak */ }
  Object.keys(last).forEach((k) => delete last[k]);
  store.replace({ version: 1, tournaments: [], rev: 0, loaded: false, sync: { pending: pendingCount(), error: null, online: true } });
}

// ---------- wczytanie danych ----------

async function fetchAll() {
  if (session.role === 'supervisor') {
    const [ts, privs, codes, entries, history] = await Promise.all([
      selectAll('tts_tournaments', ['created_at', 'id']),
      selectAll('tts_tournament_private', ['tournament_id']),
      selectAll('tts_judge_codes', ['tournament_id', 'judge_id']),
      selectAll('tts_entries', ['tournament_id', 'disc', 'contestant_id', 'judge_id']),
      selectAll('tts_history', ['id']),
    ]);
    const privBy = Object.fromEntries(privs.map((p) => [p.tournament_id, p.data]));
    const codesBy = {};
    codes.forEach((c) => ((codesBy[c.tournament_id] ||= {})[c.judge_id] = c.code));
    const list = ts.map((r) => assembleTournament(r, privBy[r.id], codesBy[r.id] || {}));
    const byId = Object.fromEntries(list.map((t) => [t.id, t]));
    entries.forEach((e) => byId[e.tournament_id] && putEntry(byId[e.tournament_id], e));
    history.forEach((h) => byId[h.tournament_id] && byId[h.tournament_id].history.push(historyFromRow(h)));
    return list;
  }
  const [ts, entries] = await Promise.all([selectAll('tts_tournaments', ['id']), selectAll('tts_entries', ['tournament_id', 'disc', 'contestant_id', 'judge_id'])]);
  const list = ts.map((r) => assembleTournament(r));
  const byId = Object.fromEntries(list.map((t) => [t.id, t]));
  entries.forEach((e) => byId[e.tournament_id] && putEntry(byId[e.tournament_id], e));
  return list;
}

// Lokalne, jeszcze niewysłane zmiany mają pierwszeństwo przed tym, co przyszło z bazy.
function mergeLocal(list) {
  const cur = store.get().tournaments;
  const out = list.map((t) => {
    if (dirty.has(t.id) || inflight.has(t.id)) {
      const mine = cur.find((x) => x.id === t.id);
      if (mine) return { ...mine, scores: t.scores, history: t.history.length ? t.history : mine.history };
    }
    return t;
  });
  for (const t of cur) if ((dirty.has(t.id) || inflight.has(t.id)) && !out.find((x) => x.id === t.id)) out.push(t);
  for (const row of Object.values(outbox.entries)) {
    const t = out.find((x) => x.id === row.tournament_id);
    if (t) putEntry(t, { ...row, updated_at: new Date().toISOString() });
  }
  return out;
}

async function loadAll() {
  const list = mergeLocal(await fetchAll());
  list.forEach((t) => { if (!dirty.has(t.id) && !inflight.has(t.id)) last[t.id] = fingerprint(t); });
  store.replace({ ...store.get(), version: 1, rev: (store.get().rev || 0) + 1, loaded: true, offline: false, tournaments: list });
  ok();
  subscribe();
  saveCache();
  flushOutbox();
}

// Sesja zniknęła (zmiana kodu na innym urządzeniu, reset przez administratora, nowy kod sędziego).
function sessionLost() {
  teardown();
  window.dispatchEvent(new CustomEvent('tts-session-lost'));
}

export async function refresh() {
  if (!session || !sb) return;
  try {
    const { data: who, error: werr } = await sb.rpc('tts_whoami');
    if (werr) throw werr;
    if (!who || who.role !== session.role || (who.role === 'supervisor' && who.codeSetBy !== 'supervisor')) {
      sessionLost();
      return;
    }
    const list = mergeLocal(await fetchAll());
    list.forEach((t) => { if (!dirty.has(t.id) && !inflight.has(t.id)) last[t.id] = fingerprint(t); });
    store.mutate((s) => { s.tournaments = list; s.offline = false; });
    saveCache();
  } catch (e) {
    failed(e);
  }
}

// ---------- czas rzeczywisty ----------

function teardown() {
  if (channel) { try { sb.removeChannel(channel); } catch (_) { /* już zamknięty */ } }
  channel = null;
  clearInterval(refreshTimer);
  refreshTimer = null;
}

function subscribe() {
  teardown();
  const sup = session.role === 'supervisor';
  channel = sb.channel(`tts-${session.role}-${Math.random().toString(36).slice(2, 8)}`);
  const tables = sup ? ['tts_tournaments', 'tts_tournament_private', 'tts_judge_codes', 'tts_entries', 'tts_history'] : ['tts_tournaments'];
  for (const table of tables) {
    const opts = { event: '*', schema: 'public', table };
    if (!sup) opts.filter = `id=eq.${session.tournamentId}`;
    channel.on('postgres_changes', opts, (p) => onChange(table, p));
  }
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      if (channelDown) { channelDown = false; refresh(); }
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      channelDown = true;
    }
  });
  refreshTimer = setInterval(refresh, 60000);
}

const KEEP = new Set(['scores', 'history', 'excluded', 'dq', 'audience']);

function onChange(table, p) {
  const row = p.new && Object.keys(p.new).length ? p.new : null;
  const old = p.old || {};
  store.mutate((s) => {
    if (table === 'tts_tournaments') {
      if (p.eventType === 'DELETE') {
        s.tournaments = s.tournaments.filter((t) => t.id !== old.id);
        delete last[old.id];
        return;
      }
      if (dirty.has(row.id) || inflight.has(row.id)) return; // nasze zmiany są w drodze
      const t = s.tournaments.find((x) => x.id === row.id);
      if (!t) {
        const fresh = assembleTournament(row);
        s.tournaments.push(fresh);
        last[row.id] = fingerprint(fresh);
        return;
      }
      const codes = Object.fromEntries((t.judges || []).map((j) => [j.id, j.code]));
      for (const k of Object.keys(t)) if (!KEEP.has(k)) delete t[k];
      Object.assign(t, row.data || {});
      t.id = row.id;
      t.status = row.status;
      t.judges = ((row.data && row.data.judges) || []).map((j) => ({ ...j, code: codes[j.id] || '' }));
      last[row.id] = fingerprint(t);
    } else if (table === 'tts_tournament_private') {
      const tid = (row || old).tournament_id;
      const t = s.tournaments.find((x) => x.id === tid);
      if (!t || !row || dirty.has(tid) || inflight.has(tid)) return;
      t.excluded = row.data.excluded || {};
      t.dq = row.data.dq || {};
      t.audience = row.data.audience || {};
      last[tid] = fingerprint(t);
    } else if (table === 'tts_judge_codes') {
      const r = row || old;
      const t = s.tournaments.find((x) => x.id === r.tournament_id);
      if (!t || dirty.has(t.id) || inflight.has(t.id)) return;
      const j = t.judges.find((x) => x.id === r.judge_id);
      if (j) j.code = row ? row.code : '';
      if (last[t.id]) last[t.id] = fingerprint(t);
    } else if (table === 'tts_entries') {
      const r = row || old;
      const t = s.tournaments.find((x) => x.id === r.tournament_id);
      if (!t) return;
      if (p.eventType === 'DELETE') {
        const byJ = t.scores?.[r.disc]?.[r.contestant_id];
        if (byJ) delete byJ[r.judge_id];
      } else {
        putEntry(t, row);
      }
    } else if (table === 'tts_history' && row) {
      const t = s.tournaments.find((x) => x.id === row.tournament_id);
      if (t && !(t.history || []).some((h) => h.id === row.id)) (t.history ||= []).push(historyFromRow(row));
    }
  });
  saveCache();
}

// ---------- zapisy supervisora ----------

export function queueTournament(tid) {
  clearTimeout(dirty.get(tid));
  dirty.set(tid, setTimeout(() => flushTournament(tid), 600));
  setSync();
  saveCache();
}

async function flushTournament(tid) {
  if (inflight.has(tid)) {
    try { await inflight.get(tid); } catch (_) { /* poprzedni zapis zgłosił błąd */ }
  }
  const t = getT(tid);
  dirty.delete(tid);
  if (!t) { setSync(); return; }
  const job = (async () => {
    const prev = last[tid];
    const cur = splitTournament(t);
    const fp = fingerprint(t);
    if (!prev || prev.status !== fp.status || prev.data !== fp.data) {
      const { error } = await sb.from('tts_tournaments').upsert({ id: tid, status: cur.status, data: cur.data });
      if (error) throw error;
    }
    if (!prev || prev.priv !== fp.priv) {
      const { error } = await sb.from('tts_tournament_private').upsert({ tournament_id: tid, data: cur.priv });
      if (error) throw error;
    }
    const oldCodes = (prev && prev.codes) || {};
    const removed = Object.keys(oldCodes).filter((j) => !cur.codes[j]);
    if (removed.length) {
      const { error } = await sb.from('tts_judge_codes').delete().eq('tournament_id', tid).in('judge_id', removed);
      if (error) throw error;
    }
    const changed = Object.entries(cur.codes).filter(([j, c]) => oldCodes[j] !== c).map(([judge_id, code]) => ({ tournament_id: tid, judge_id, code }));
    if (changed.length) {
      const { error } = await sb.from('tts_judge_codes').upsert(changed, { onConflict: 'tournament_id,judge_id' });
      if (error) throw error;
    }
    const goneJ = ((prev && prev.judges) || []).filter((j) => !fp.judges.includes(j));
    const goneC = ((prev && prev.contestants) || []).filter((c) => !fp.contestants.includes(c));
    for (const [col, ids] of [['judge_id', goneJ], ['contestant_id', goneC]]) {
      if (!ids.length) continue;
      const r1 = await sb.from('tts_entries').delete().eq('tournament_id', tid).in(col, ids);
      if (r1.error) throw r1.error;
      const r2 = await sb.from('tts_history').delete().eq('tournament_id', tid).in(col, ids);
      if (r2.error) throw r2.error;
    }
    last[tid] = fp;
  })();
  inflight.set(tid, job);
  try {
    await job;
    ok();
  } catch (e) {
    failed(e, isPermanent(e));
    if (!isPermanent(e)) queueRetry(tid);
  } finally {
    inflight.delete(tid);
    setSync();
  }
}

function queueRetry(tid) {
  clearTimeout(dirty.get(tid));
  dirty.set(tid, setTimeout(() => flushTournament(tid), 5000));
}

export async function deleteTournament(tid) {
  clearTimeout(dirty.get(tid));
  dirty.delete(tid);
  if (inflight.has(tid)) {
    try { await inflight.get(tid); } catch (_) { /* zapis i tak zostanie nadpisany usunięciem */ }
  }
  delete last[tid];
  const { error } = await sb.from('tts_tournaments').delete().eq('id', tid);
  if (error) failed(error, true);
  else ok();
}

// ---------- zapisy sędziego (kolejka offline) ----------

export function queueEntry(tid, disc, cid, jid) {
  const e = getT(tid)?.scores?.[disc]?.[cid]?.[jid] || {};
  outbox.entries[[tid, disc, cid, jid].join('|')] = {
    tournament_id: tid, disc, contestant_id: cid, judge_id: jid,
    v: e.v || {}, n: e.n || {}, ni: e.ni || {}, fb: e.fb || null,
  };
  saveOutbox();
  scheduleFlush();
}

export function queueHistory(tid, rec) {
  outbox.history.push({
    tournament_id: tid, ts: new Date(rec.ts).toISOString(), judge_id: rec.j,
    contestant_id: rec.c, disc: rec.d, item_id: rec.i, f: rec.f ?? null, t: rec.t ?? null,
  });
  saveOutbox();
  scheduleFlush();
}

function scheduleFlush() {
  setSync();
  saveCache();
  clearTimeout(flushTimer);
  flushTimer = setTimeout(flushOutbox, 350);
}

export async function flushOutbox() {
  if (flushing || !sb || !session || session.role !== 'judge') return;
  // wysyłamy tylko oceny zalogowanego sędziego (na wspólnym laptopie mogą czekać zmiany innej osoby)
  const keys = Object.keys(outbox.entries).filter((k) => outbox.entries[k].judge_id === session.judgeId && outbox.entries[k].tournament_id === session.tournamentId);
  const own = outbox.history.filter((h) => h.judge_id === session.judgeId && h.tournament_id === session.tournamentId);
  if (own.length !== outbox.history.length) outbox.history = [...own, ...outbox.history.filter((h) => !own.includes(h))];
  if (!keys.length && !own.length) { setSync(); return; }
  flushing = true;
  try {
    if (keys.length) {
      const rows = keys.map((k) => outbox.entries[k]);
      const { error } = await sb.from('tts_entries').upsert(rows);
      if (error) {
        // turniej zakończony/nieotwarty — tych zmian baza już nie przyjmie; brak uprawnień — sprawdzamy sesję,
        // a oceny zostają w kolejce do ponownego zalogowania
        if (error.code === 'P0001') keys.forEach((k) => delete outbox.entries[k]);
        if (error.code === '42501') refresh();
        throw error;
      }
      keys.forEach((k, i) => { if (outbox.entries[k] === rows[i]) delete outbox.entries[k]; });
    }
    if (own.length) {
      const batch = outbox.history.slice(0, Math.min(500, own.length));
      const { error } = await sb.from('tts_history').insert(batch);
      if (error) {
        if (error.code === 'P0001') outbox.history.splice(0, batch.length);
        throw error;
      }
      outbox.history.splice(0, batch.length);
    }
    saveOutbox();
    ok();
  } catch (e) {
    saveOutbox();
    failed(e, isPermanent(e));
  } finally {
    flushing = false;
    setSync();
  }
}

// ---------- kopie zapasowe w bazie ----------

async function rpc(name, args) {
  const { data, error } = await sb.rpc(name, args);
  if (error) throw friendly(error);
  return data;
}

export const listBackups = () => rpc('tts_list_backups');
export const makeBackup = () => rpc('tts_make_backup');
export const getBackup = (id) => rpc('tts_get_backup', { p_id: id });

export async function restoreBackup(id) {
  const r = await rpc('tts_restore_backup', { p_id: id });
  await refresh();
  return r;
}

export async function restoreSnapshot(data) {
  const r = await rpc('tts_restore_snapshot', { p_data: data });
  await refresh();
  return r;
}
