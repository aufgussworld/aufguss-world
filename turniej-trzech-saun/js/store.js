// Magazyn danych wersji demonstracyjnej: localStorage tej przeglądarki.
// Zmiany z innych kart tej samej przeglądarki docierają przez zdarzenie 'storage',
// więc supervisor w jednej karcie widzi na żywo oceny wpisywane przez sędziego w drugiej.
// Docelowo ten moduł zostanie podmieniony na Supabase (te same funkcje, inne źródło danych).

import { useEffect, useReducer } from './lib.js';
import { seedState, SEED_VERSION, SEED_IDS, LEGACY_SEED_IDS } from './seed.js';

const KEY = 'tts-demo-v1';
const SESSION_KEY = 'tts-session';

let saveError = null;
const subs = new Set();
let state = load();

function load() {
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
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    saveError = null;
  } catch (e) {
    saveError = e;
    console.error('Zapis nie powiódł się', e);
  }
}

const notify = () => subs.forEach((fn) => fn(state));

export const store = {
  get: () => state,
  saveError: () => saveError,
  subscribe(fn) {
    subs.add(fn);
    return () => subs.delete(fn);
  },
  mutate(fn) {
    fn(state);
    state = { ...state, rev: (state.rev || 0) + 1 };
    persist(state);
    notify();
  },
  replace(next) {
    state = next;
    persist(state);
    notify();
  },
  reset() {
    state = seedState();
    persist(state);
    notify();
  },
};

window.addEventListener('storage', (e) => {
  if (e.key !== KEY || !e.newValue) return;
  try {
    state = JSON.parse(e.newValue);
    notify();
  } catch (_) { /* częściowy zapis z innej karty — następne zdarzenie go poprawi */ }
});

export function useStore() {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => store.subscribe(() => force()), []);
  return store.get();
}

export const getT = (tid) => store.get().tournaments.find((t) => t.id === tid);

export function updateT(tid, fn) {
  store.mutate((s) => {
    const t = s.tournaments.find((x) => x.id === tid);
    if (t) fn(t);
  });
}

// ---------- akcje sędziego ----------

export function setScore(tid, disc, cid, jid, itemId, value) {
  updateT(tid, (t) => {
    t.scores ||= {};
    t.scores[disc] ||= {};
    t.scores[disc][cid] ||= {};
    const e = (t.scores[disc][cid][jid] ||= { v: {}, n: {} });
    if (value == null) delete e.v[itemId];
    else e.v[itemId] = value;
    e.u = Date.now();
  });
}

export function logChange(tid, rec) {
  updateT(tid, (t) => {
    (t.history ||= []).push({ ts: Date.now(), ...rec });
  });
}

export function setNote(tid, disc, cid, jid, catId, text) {
  updateT(tid, (t) => {
    t.scores ||= {};
    t.scores[disc] ||= {};
    t.scores[disc][cid] ||= {};
    const e = (t.scores[disc][cid][jid] ||= { v: {}, n: {} });
    e.n ||= {};
    if (text) e.n[catId] = text;
    else delete e.n[catId];
  });
}

function entryFor(t, disc, cid, jid) {
  t.scores ||= {};
  t.scores[disc] ||= {};
  t.scores[disc][cid] ||= {};
  return (t.scores[disc][cid][jid] ||= { v: {}, n: {} });
}

// Uwaga sędziego do jednej pozycji karty (ikonka notatnika przy ocenie).
export function setItemNote(tid, disc, cid, jid, itemId, text) {
  updateT(tid, (t) => {
    const e = entryFor(t, disc, cid, jid);
    e.ni ||= {};
    if (text) e.ni[itemId] = text;
    else delete e.ni[itemId];
  });
}

// Feedback dla zawodnika: { sections: [{ id, title, text }], updatedAt, source }
export function setFeedback(tid, disc, cid, jid, fb) {
  updateT(tid, (t) => {
    const e = entryFor(t, disc, cid, jid);
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
