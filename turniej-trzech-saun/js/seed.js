// Dane przykładowe do prezentacji. Wszystkie osoby są fikcyjne.
// Generator jest deterministyczny — po „Przywróć dane demo” kody sędziów i wyniki są zawsze te same.

import { defaultCard } from './templates.js';
import { FINAL_ORDER, addMinutes } from './model.js';

function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s) => [...s].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0, 7);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

const PEOPLE = [
  ['Anna', 'Wierzbicka'], ['Tomasz', 'Grabowiecki'], ['Magdalena', 'Sowińska'], ['Michał', 'Kurek'],
  ['Natalia', 'Bielecka'], ['Paweł', 'Ostrowiecki'], ['Karolina', 'Mróz'], ['Jonas', 'Becker'],
  ['Agata', 'Nowicka'], ['Rafał', 'Zawada'], ['Ewa', 'Lisowska'], ['Damian', 'Kruk'],
  ['Zuzanna', 'Wilk'], ['Krzysztof', 'Pająk'], ['Petra', 'Horáková'], ['Szymon', 'Bednarek'],
  ['Weronika', 'Tkacz'], ['Adam', 'Sobczak'], ['Monika', 'Leśniak'], ['Mateusz', 'Cieślak'],
  ['Paulina', 'Kowal'], ['Hubert', 'Rogalski'], ['Aleksandra', 'Jasińska'], ['Igor', 'Wrona'],
  ['Marta', 'Kalisz'], ['Sebastian', 'Gil'], ['Julia', 'Szczepańska'], ['Dawid', 'Laskowski'],
  ['Katrin', 'Vogel'], ['Wojciech', 'Brzeziński'], ['Kinga', 'Dudek'], ['Patryk', 'Malec'],
  ['Lena', 'Ziółkowska'], ['Bartłomiej', 'Kos'], ['Oliwia', 'Sadowska'], ['Marek', 'Pawłowicz'],
  ['Emilia', 'Rybarczyk'], ['Filip', 'Domański'], ['Nina', 'Kowalewska'], ['Ondřej', 'Svoboda'],
];

const JUDGE_POOL = [
  ['Barbara', 'Szulc'], ['Andrzej', 'Borowiec'], ['Teresa', 'Kamieniecka'], ['Robert', 'Siwiec'],
  ['Elżbieta', 'Gaweł'], ['Marcin', 'Rybak'], ['Iwona', 'Kubiak'], ['Stefan', 'Hoffmann'],
  ['Dorota', 'Fijałkowska'], ['Leszek', 'Urban'],
];

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PLACE = 'Sommer Residence Spa & Wellness, Kuniów';

function code(r, taken) {
  for (;;) {
    let s = '';
    for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(r() * ALPHABET.length)];
    if (!taken.has(s)) { taken.add(s); return s; }
  }
}

const skill = (p) => 0.5 + (((hash(p[0] + p[1]) >>> 0) % 1000) / 1000) * 0.42; // 0,50–0,92

function shuffle(arr, r) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function baseTournament(o) {
  const discs = o.type === 'final' ? FINAL_ORDER : [o.type];
  const cards = {};
  discs.forEach((d) => (cards[d] = defaultCard(d)));
  return {
    id: o.id, name: o.name, type: o.type, status: o.status,
    dateFrom: o.dateFrom, dateTo: o.dateTo, place: PLACE,
    panelSize: 4, decimalMode: 'both', audienceSize: 12,
    contestants: [], judges: [], order: {}, cards,
    scores: {}, history: [], excluded: {}, dq: {}, audience: {},
    createdAt: new Date(o.dateFrom + 'T09:00:00').getTime() - 20 * 864e5,
  };
}

function addPeople(t, idx, r) {
  t.contestants = idx.map((i, k) => ({ id: `${t.id}-c${k + 1}`, first: PEOPLE[i][0], last: PEOPLE[i][1], photo: null, start: {}, skill: skill(PEOPLE[i]) }));
}
function addJudges(t, idx, r, taken) {
  t.judges = idx.map((i, k) => ({ id: `${t.id}-j${k + 1}`, first: JUDGE_POOL[i][0], last: JUDGE_POOL[i][1], code: code(r, taken) }));
}

// days: [{ date, first, step, count }]
function schedule(t, disc, days, r) {
  const order = shuffle(t.contestants.map((c) => c.id), r);
  t.order[disc] = order;
  let k = 0;
  for (const d of days) {
    for (let i = 0; i < d.count && k < order.length; i++, k++) {
      const c = t.contestants.find((x) => x.id === order[k]);
      c.start[disc] = { date: d.date, time: addMinutes(d.first, i * d.step) };
    }
  }
}

const ts = (date, time) => new Date(`${date}T${time}:00`).getTime();

// Wypełnia kartę jednego sędziego. fraction < 1 = karta w trakcie wypełniania.
function fillCard(t, disc, c, j, r, { bias = 0, start, fraction = 1 }) {
  const card = t.cards[disc];
  const v = {};
  const items = card.categories.flatMap((cat) => cat.items);
  const take = Math.round(items.length * fraction);
  let clock = start;
  items.slice(0, take).forEach((it) => {
    const max = Math.round(it.max * 10);
    let val;
    if (it.kind === 'plus') {
      const q = clamp(c.skill + bias + (r() - 0.5) * 0.3, 0.12, 1);
      const step = r() < 0.65 ? 5 : 1;
      val = clamp(Math.round((max * q) / step) * step, 0, max);
    } else if (it.kind === 'bin') {
      val = r() < c.skill ? max : 0;
    } else {
      const x = r();
      if (x < 0.08) val = Math.min(max, r() < 0.5 ? 5 : 10);
      else if (x < 0.6) val = 0;
      else return; // pusta kara = 0
    }
    v[it.id] = val;
    clock += 8000 + Math.floor(r() * 25000);
    t.history.push({ ts: clock, j: j.id, c: c.id, d: disc, i: it.id, f: null, t: val });
  });
  t.scores[disc] ||= {};
  t.scores[disc][c.id] ||= {};
  t.scores[disc][c.id][j.id] = { v, n: {}, u: clock };
  return clock;
}

// Korekta wcześniej wystawionej oceny (np. po obejrzeniu kolejnych zawodników).
function correct(t, disc, c, j, r, when) {
  const e = t.scores[disc]?.[c.id]?.[j.id];
  if (!e) return;
  const card = t.cards[disc];
  const plus = card.categories.flatMap((x) => x.items).filter((it) => it.kind === 'plus' && e.v[it.id] != null);
  if (!plus.length) return;
  const it = plus[Math.floor(r() * plus.length)];
  const max = Math.round(it.max * 10);
  const from = e.v[it.id];
  let to = clamp(from + (r() < 0.5 ? -5 : 5), 0, max);
  if (to === from) to = clamp(from - 5, 0, max);
  if (to === from) return;
  e.v[it.id] = to;
  e.u = when;
  t.history.push({ ts: when, j: j.id, c: c.id, d: disc, i: it.id, f: from, t: to });
}

const NOTES = {
  show: ['Bardzo dobra narracja, spójny strój.', 'Machanie poprawne, mało elementów show.', 'Świetny kontakt z publicznością.'],
  aroma: ['Zapachy dobrze dobrane do historii.', 'Trzeci zapach słabo wyczuwalny.', 'Ciekawe podanie — lód z olejkiem.'],
  temp: ['Równa dystrybucja ciepła.', 'Za szybki wzrost w drugiej rundzie.'],
};

// Ocenianie całej konkurencji: każdego zawodnika ocenia 4 z 5 sędziów (rotacja).
function judgeDiscipline(t, disc, r, opts = {}) {
  const order = t.order[disc];
  const corrProne = t.judges[1]?.id; // jeden sędzia częściej poprawia oceny — widać to w historii
  const until = opts.until ?? order.length;
  order.slice(0, until).forEach((cid, k) => {
    const c = t.contestants.find((x) => x.id === cid);
    const st = c.start[disc];
    const end = ts(st.date, st.time) + 22 * 60000;
    const panel = opts.allFive === k ? t.judges : t.judges.filter((_, i) => i !== k % t.judges.length);
    panel.forEach((j, ji) => {
      const bias = ((hash(j.id) >>> 0) % 100) / 1000 - 0.05;
      fillCard(t, disc, c, j, r, { bias, start: end + ji * 40000 });
      if (r() < 0.35) {
        const cat = ['show', 'aroma', 'temp'][Math.floor(r() * 3)];
        t.scores[disc][c.id][j.id].n[cat] = NOTES[cat][Math.floor(r() * NOTES[cat].length)];
      }
    });
    if (opts.resolveFive === k) {
      t.excluded[`${disc}|${cid}|${t.judges[k % t.judges.length].id}`] = true;
    }
  });
  // korekty po kolejnych występach
  order.slice(0, until).forEach((cid, k) => {
    const c = t.contestants.find((x) => x.id === cid);
    const laterIdx = Math.min(until - 1, k + 1 + Math.floor(r() * 3));
    const later = t.contestants.find((x) => x.id === order[laterIdx]);
    const when = ts(later.start[disc].date, later.start[disc].time) + 30 * 60000;
    t.judges.forEach((j) => {
      const p = j.id === corrProne ? 0.5 : 0.07;
      if (r() < p && when > ts(c.start[disc].date, c.start[disc].time)) correct(t, disc, c, j, r, when);
    });
  });
}

function audience(t, disc, r, cids, partialLast = false) {
  t.audience[disc] ||= {};
  cids.forEach((cid, k) => {
    const c = t.contestants.find((x) => x.id === cid);
    const n = partialLast && k === cids.length - 1 ? 7 : t.audienceSize;
    t.audience[disc][cid] = Array.from({ length: t.audienceSize }, (_, i) =>
      i < n ? clamp(Math.round(c.skill * 10 + (r() - 0.5) * 4), 2, 10) * 10 : null,
    );
  });
}

export function seedState() {
  const r = rng(20261016);
  const taken = new Set();
  const tournaments = [];

  // Finał 2026 (sezon 2025) — zakończony, trzy dni.
  {
    const t = baseTournament({ id: 'fin26', name: 'Finał Turnieju Trzech Saun 2026', type: 'final', status: 'closed', dateFrom: '2026-02-20', dateTo: '2026-02-22' });
    addPeople(t, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], r);
    addJudges(t, [0, 1, 2, 3, 4], r, taken);
    schedule(t, 'relax', [{ date: '2026-02-20', first: '10:00', step: 45, count: 15 }], r);
    schedule(t, 'hot', [{ date: '2026-02-21', first: '10:00', step: 45, count: 15 }], r);
    schedule(t, 'banya', [{ date: '2026-02-22', first: '10:00', step: 45, count: 15 }], r);
    FINAL_ORDER.forEach((d) => {
      judgeDiscipline(t, d, r);
      audience(t, d, r, t.order[d]);
    });
    tournaments.push(t);
  }

  // Sommer Hot Cup 2026 — zakończony.
  {
    const t = baseTournament({ id: 'hot26', name: 'Sommer Hot Cup 2026', type: 'hot', status: 'closed', dateFrom: '2026-04-17', dateTo: '2026-04-18' });
    addPeople(t, [0, 1, 2, 15, 16, 17, 18, 19, 20, 3, 21, 22], r);
    addJudges(t, [0, 1, 2, 5, 6], r, taken);
    schedule(t, 'hot', [{ date: '2026-04-17', first: '15:00', step: 60, count: 6 }, { date: '2026-04-18', first: '11:00', step: 60, count: 6 }], r);
    judgeDiscipline(t, 'hot', r, { allFive: 4, resolveFive: 4 });
    audience(t, 'hot', r, t.order.hot);
    t.dq[`hot|${t.order.hot[8]}`] = 'Przekroczenie czasu ceremonii o ponad 2 min';
    tournaments.push(t);
  }

  // Sommer Relax Cup 2026 — zakończony.
  {
    const t = baseTournament({ id: 'rlx26', name: 'Sommer Relax Cup 2026', type: 'relax', status: 'closed', dateFrom: '2026-06-12', dateTo: '2026-06-13' });
    addPeople(t, [4, 5, 23, 24, 25, 26, 27, 1, 28, 29, 6, 30], r);
    addJudges(t, [1, 3, 4, 7, 8], r, taken);
    schedule(t, 'relax', [{ date: '2026-06-12', first: '15:00', step: 60, count: 6 }, { date: '2026-06-13', first: '11:00', step: 60, count: 6 }], r);
    judgeDiscipline(t, 'relax', r);
    audience(t, 'relax', r, t.order.relax);
    tournaments.push(t);
  }

  // Sommer Banya Cup 2026 — w trakcie (symulacja wieczoru pierwszego dnia).
  {
    const t = baseTournament({ id: 'bny26', name: 'Sommer Banya Cup 2026', type: 'banya', status: 'live', dateFrom: '2026-10-16', dateTo: '2026-10-17' });
    addPeople(t, [7, 8, 31, 32, 33, 34, 35, 2, 9, 36, 37, 38], r);
    addJudges(t, [0, 2, 5, 8, 9], r, taken);
    schedule(t, 'banya', [{ date: '2026-10-16', first: '15:00', step: 60, count: 6 }, { date: '2026-10-17', first: '11:00', step: 60, count: 6 }], r);
    judgeDiscipline(t, 'banya', r, { until: 5, allFive: 2 });
    // szósty występ (20:00) — sędziowie właśnie wypełniają karty
    const c6 = t.contestants.find((x) => x.id === t.order.banya[5]);
    const start6 = ts('2026-10-16', '20:22');
    fillCard(t, 'banya', c6, t.judges[1], r, { start: start6 });
    fillCard(t, 'banya', c6, t.judges[2], r, { start: start6, fraction: 0.55 });
    fillCard(t, 'banya', c6, t.judges[3], r, { start: start6, fraction: 0.25 });
    audience(t, 'banya', r, t.order.banya.slice(0, 6), true);
    tournaments.push(t);
  }

  tournaments.forEach((t) => t.history.sort((a, b) => a.ts - b.ts));
  return { version: 1, supervisorPin: '2026', rev: 0, tournaments };
}
