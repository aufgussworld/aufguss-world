// Magazyn danych aplikacji. Dwa tryby z tym samym interfejsem:
//  * demo — dane przykładowe w localStorage tej przeglądarki; inne karty tej samej przeglądarki
//    dostają zmiany przez zdarzenie 'storage' (supervisor i sędzia obok siebie);
//  * live — baza Supabase (js/remote.js): stan w pamięci, zapisy do bazy z kolejką offline,
//    zmiany innych osób na żywo. Tryb wybiera window.TTS_CONFIG.mode (config.js).

import { useEffect, useReducer } from './lib.js';
import { seedState, SEED_VERSION, SEED_IDS, LEGACY_SEED_IDS } from './seed.js';

export const CONFIG = window.TTS_CONFIG || {};
export const LIVE = CONFIG.mode === 'live';

const KEY = 'tts-demo-v1';
const SESSION_KEY = LIVE ? 'tts-live-session' : 'tts-session';

let saveError = null;
const subs = new Set();
let remote = null; // moduł remote.js (tylko tryb live)
let state = LIVE ? emptyState() : loadDemo();

function emptyState() {
  return { version: 1, tournaments: [], rev: 0, loaded: false, sync: { pending: 0, error: null, online: true } };
}

function loadDemo() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch (e) {
    console.warn('Nie udało się odczytać danych demo', e);
  }
  const s = seedState();
  persist(s);
  return s;
}

// Nowa wersja danych przykładowych podmienia tylko turnieje demo — turnieje założone przez użytkownika zostają.
function migrate(s) {
  if (s.seedVersion === SEED_VERSION) return s;
  const fresh = seedState();
  const drop = new Set([...LEGACY_SEED_IDS, ...SEED_IDS]);
  s.tournaments = [...fresh.tournaments, ...s.tournaments.filter((t) => !drop.has(t.id))];
  s.seedVersion = SEED_VERSION;
  persist(s);
  return s;
}

function persist(s) {
  if (LIVE) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    saveError = null;
  } catch (e) {
    saveError = e;
    console.error('Zapis nie powiódł się', e);
  }
}

const notify = () => subs.forEach((fn) => fn(state));
function bump() {
  state = { ...state, rev: (state.rev || 0) + 1 };
  persist(state);
  notify();
}

export const store = {
  get: () => state,
  saveError: () => saveError,
  subscribe(fn) {
    subs.add(fn);
    return () => subs.delete(fn);
  },
  // zmiana stanu bez wysyłania do bazy (dane przychodzące z bazy, operacje demo)
  mutate(fn) {
    fn(state);
    bump();
  },
  replace(next) {
    state = next;
    persist(state);
    notify();
  },
  reset() {
    if (LIVE) return;
    state = seedState();
    persist(state);
    notify();
  },
};

export function attachRemote(r) {
  remote = r;
}

if (!LIVE) {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try {
      state = JSON.parse(e.newValue);
      notify();
    } catch (_) { /* częściowy zapis z innej karty — następne zdarzenie go poprawi */ }
  });
}

export function useStore() {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => store.subscribe(() => force()), []);
  return store.get();
}

export const getT = (tid) => state.tournaments.find((t) => t.id === tid);

function localUpdate(tid, fn) {
  const t = getT(tid);
  if (!t) return;
  fn(t);
  bump();
}

// ---------- akcje supervisora ----------

export function updateT(tid, fn) {
  localUpdate(tid, fn);
  if (LIVE) remote?.queueTournament(tid);
}

export function createTournament(t) {
  state.tournaments.push(t);
  bump();
  if (LIVE) remote?.queueTournament(t.id);
}

export function deleteTournament(tid) {
  state.tournaments = state.tournaments.filter((x) => x.id !== tid);
  bump();
  if (LIVE) remote?.deleteTournament(tid);
}

// ---------- akcje sędziego ----------

function entryFor(t, disc, cid, jid) {
  t.scores ||= {};
  t.scores[disc] ||= {};
  t.scores[disc][cid] ||= {};
  return (t.scores[disc][cid][jid] ||= { v: {}, n: {} });
}

function entryUpdate(tid, disc, cid, jid, fn) {
  localUpdate(tid, (t) => {
    const e = entryFor(t, disc, cid, jid);
    fn(e);
    e.u = Date.now();
  });
  if (LIVE) remote?.queueEntry(tid, disc, cid, jid);
}

export function setScore(tid, disc, cid, jid, itemId, value) {
  entryUpdate(tid, disc, cid, jid, (e) => {
    if (value == null) delete e.v[itemId];
    else e.v[itemId] = value;
  });
}

export function logChange(tid, rec) {
  const full = { ts: Date.now(), ...rec };
  localUpdate(tid, (t) => (t.history ||= []).push(full));
  if (LIVE) remote?.queueHistory(tid, full);
}

export function setNote(tid, disc, cid, jid, catId, text) {
  entryUpdate(tid, disc, cid, jid, (e) => {
    e.n ||= {};
    if (text) e.n[catId] = text;
    else delete e.n[catId];
  });
}

// Uwaga sędziego do jednej pozycji karty (ikonka notatnika przy ocenie).
export function setItemNote(tid, disc, cid, jid, itemId, text) {
  entryUpdate(tid, disc, cid, jid, (e) => {
    e.ni ||= {};
    if (text) e.ni[itemId] = text;
    else delete e.ni[itemId];
  });
}

// Feedback dla zawodnika: { sections: [{ id, title, text }], updatedAt, source }
export function setFeedback(tid, disc, cid, jid, fb) {
  entryUpdate(tid, disc, cid, jid, (e) => {
    if (fb) e.fb = { ...fb, updatedAt: Date.now() };
    else delete e.fb;
  });
}

// ---------- sesja (osobna dla każdej karty przeglądarki) ----------

export function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || null;
  } catch (_) {
    return null;
  }
}
export function setSession(s) {
  if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else sessionStorage.removeItem(SESSION_KEY);
}
