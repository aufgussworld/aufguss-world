// Logika punktacji: walidacja wpisów, sumy kart, rankingi, głosy publiczności.
// Wszystkie punkty trzymamy jako liczby całkowite w dziesiątych częściach (1,3 pkt = 13),
// dzięki temu sumy są dokładne i remisy wykrywane bez błędów zaokrągleń.

export const DISCIPLINES = {
  relax: { key: 'relax', label: 'Relax', cup: 'Sommer Relax Cup', icon: 'waves' },
  hot: { key: 'hot', label: 'HOT', cup: 'Sommer Hot Cup', icon: 'flame' },
  banya: { key: 'banya', label: 'Banya', cup: 'Sommer Banya Cup', icon: 'leaf' },
};

export const TYPES = {
  relax: { label: 'Relax', long: 'Turniej eliminacyjny Relax', icon: 'waves' },
  hot: { label: 'HOT', long: 'Turniej eliminacyjny HOT', icon: 'flame' },
  banya: { label: 'Banya', long: 'Turniej eliminacyjny Banya', icon: 'leaf' },
  final: { label: 'Finał', long: 'Finał Turnieju Trzech Saun', icon: 'trophy' },
};

export const FINAL_ORDER = ['relax', 'hot', 'banya'];

export const STATUS = {
  draft: { label: 'Szkic', hint: 'Sędziowie nie mogą się jeszcze zalogować.' },
  live: { label: 'W trakcie', hint: 'Sędziowie oceniają, wyniki aktualizują się na żywo.' },
  closed: { label: 'Zakończony', hint: 'Karty zablokowane — sędziowie widzą je tylko do odczytu.' },
};

export const disciplinesOf = (t) => (t.type === 'final' ? FINAL_ORDER : [t.type]);

export const fullName = (c) => `${c.first || ''} ${c.last || ''}`.trim() || 'Bez nazwy';

export function uid(prefix = 'x') {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function genCode(taken = new Set()) {
  for (;;) {
    let s = '';
    for (let i = 0; i < 6; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    if (!taken.has(s)) return s;
  }
}
export const normCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const prettyCode = (s) => (s ? `${s.slice(0, 3)} ${s.slice(3)}` : '');

// ---------- formatowanie ----------

export function fmt(tenths, fixed = false) {
  if (tenths == null) return '—';
  const neg = tenths < 0;
  const a = Math.abs(tenths);
  const i = Math.floor(a / 10);
  const f = a % 10;
  const s = fixed || f ? `${i},${f}` : `${i}`;
  return (neg ? '−' : '') + s;
}
export const fmtInput = (tenths) => (tenths == null ? '' : fmt(tenths));

const DAY_SHORT = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'];
const DAY_LONG = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
const parseDate = (d) => {
  const [y, m, dd] = d.split('-').map(Number);
  return new Date(y, m - 1, dd);
};
export function fmtDate(d, long = false) {
  if (!d) return '';
  const dt = parseDate(d);
  const dm = `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}`;
  return long ? `${DAY_LONG[dt.getDay()]} ${dm}.${dt.getFullYear()}` : `${DAY_SHORT[dt.getDay()]} ${dm}`;
}
export function fmtRange(from, to) {
  if (!from) return '';
  const a = parseDate(from);
  const b = to ? parseDate(to) : a;
  const p = (n) => String(n).padStart(2, '0');
  if (!to || from === to) return `${p(a.getDate())}.${p(a.getMonth() + 1)}.${a.getFullYear()}`;
  if (a.getMonth() === b.getMonth()) return `${p(a.getDate())}–${p(b.getDate())}.${p(b.getMonth() + 1)}.${b.getFullYear()}`;
  return `${p(a.getDate())}.${p(a.getMonth() + 1)}–${p(b.getDate())}.${p(b.getMonth() + 1)}.${b.getFullYear()}`;
}
export function fmtStamp(ts, withSeconds = true) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}${withSeconds ? ':' + p(d.getSeconds()) : ''}`;
}
export const addDays = (d, n) => {
  const dt = parseDate(d);
  dt.setDate(dt.getDate() + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};
export const addMinutes = (time, n) => {
  const [h, m] = time.split(':').map(Number);
  const t = (h * 60 + m + n + 24 * 60) % (24 * 60);
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

export function plural(n, one, few, many) {
  if (n === 1) return one;
  const d = n % 10, h = n % 100;
  return d >= 2 && d <= 4 && (h < 12 || h > 14) ? few : many;
}

// ---------- walidacja wpisu sędziego ----------

// Zwraca { ok, value } albo { ok:false, error, immediate }.
// immediate = błąd pokazywany od razu w trakcie pisania (minus, kropka w trybie „tylko przecinek”).
export function parseScore(raw, item, mode = 'both') {
  const s = String(raw ?? '').replace(/\s+/g, '');
  if (s === '') return { ok: true, value: null };
  if (/^[-−–]/.test(s)) {
    return {
      ok: false,
      immediate: true,
      error: item.kind === 'minus'
        ? 'Wpisz liczbę bez minusa — punkty karne system odejmie sam.'
        : 'Ocena nie może być ujemna.',
    };
  }
  if (mode === 'comma' && s.includes('.')) {
    return { ok: false, immediate: true, error: 'Użyj przecinka jako separatora, np. 1,3.' };
  }
  if (!/^\d+([.,]\d+)?$/.test(s)) {
    return { ok: false, error: 'To nie jest liczba. Wpisz np. 2 albo 1,5.' };
  }
  const [ip, fp = ''] = s.split(/[.,]/);
  if (fp.length > 1) return { ok: false, error: 'Dokładność oceny to 0,1 pkt — np. 1,3 zamiast 1,35.' };
  const value = parseInt(ip, 10) * 10 + (fp ? parseInt(fp, 10) : 0);
  const maxT = Math.round(item.max * 10);
  if (item.kind === 'bin' && value !== 0 && value !== maxT) {
    return { ok: false, error: `W tej pozycji tylko 0 albo ${fmt(maxT)}.` };
  }
  if (value > maxT) return { ok: false, error: `Maksymalnie ${fmt(maxT)} pkt w tej pozycji.` };
  return { ok: true, value };
}

// ---------- karty ----------

export function cardMax(card) {
  let m = 0;
  for (const c of card.categories) for (const it of c.items) if (it.kind !== 'minus') m += Math.round(it.max * 10);
  return m;
}
export function categoryMax(cat) {
  return cat.items.reduce((a, it) => a + (it.kind !== 'minus' ? Math.round(it.max * 10) : 0), 0);
}

export function entryStats(card, entry) {
  const v = (entry && entry.v) || {};
  let total = 0, filled = 0, required = 0, any = false;
  const cats = card.categories.map((c) => {
    let plus = 0, minus = 0, f = 0, r = 0;
    for (const it of c.items) {
      const x = v[it.id];
      if (x != null) any = true;
      if (it.kind === 'minus') {
        if (x != null) minus += x;
      } else {
        r++;
        if (x != null) { plus += x; f++; }
      }
    }
    total += plus - minus;
    filled += f;
    required += r;
    return { id: c.id, name: c.name, plus, minus, sum: plus - minus, max: categoryMax(c), filled: f, required: r };
  });
  const status = !any ? 'empty' : filled === required ? 'complete' : 'partial';
  return { cats, total, filled, required, started: any, complete: status === 'complete', status };
}

export const excludedKey = (disc, cid, jid) => `${disc}|${cid}|${jid}`;
export const dqKey = (disc, cid) => `${disc}|${cid}`;
export const getEntry = (t, disc, cid, jid) => t.scores?.[disc]?.[cid]?.[jid];

// Wynik zawodnika w jednej konkurencji: suma kart sędziów, którzy oceniali i nie zostali wyłączeni.
export function contestantDisc(t, disc, cid) {
  const card = t.cards[disc];
  const judges = t.judges
    .map((j) => {
      const entry = getEntry(t, disc, cid, j.id);
      const stats = entryStats(card, entry);
      const excluded = !!t.excluded?.[excludedKey(disc, cid, j.id)];
      return { judge: j, entry, stats, excluded, counted: stats.started && !excluded };
    })
    .filter((x) => x.stats.started);
  const counted = judges.filter((x) => x.counted);
  const cats = card.categories.map((c, i) => ({
    id: c.id,
    name: c.name,
    sum: counted.reduce((a, x) => a + x.stats.cats[i].sum, 0),
  }));
  const total = counted.reduce((a, x) => a + x.stats.total, 0);
  const complete = counted.filter((x) => x.stats.complete).length;
  const warnings = [];
  if (counted.length > t.panelSize) {
    warnings.push({ type: 'over', text: `Ocenia ${counted.length} sędziów, a liczy się ${t.panelSize}. Zdecyduj, których głosów nie liczyć.` });
  }
  const partial = counted.filter((x) => !x.stats.complete).length;
  if (partial) warnings.push({ type: 'partial', text: `${partial} ${partial === 1 ? 'karta niekompletna' : 'karty niekompletne'}` });
  const dqv = t.dq?.[dqKey(disc, cid)];
  return { judges, counted, cats, total, complete, warnings, dq: dqv != null ? dqv || 'bez podanego powodu' : null };
}

// Ranking z miejscami ex aequo (1, 2, 2, 4). Zdyskwalifikowani na końcu, bez miejsca.
export function assignRanks(rows) {
  rows.sort((a, b) => (a.dq ? 1 : 0) - (b.dq ? 1 : 0) || b.total - a.total || a.name.localeCompare(b.name, 'pl'));
  let prev = null, rank = 0;
  rows.forEach((r, i) => {
    if (r.dq || !r.scored) { r.rank = null; return; }
    if (prev === null || r.total !== prev) rank = i + 1;
    r.rank = rank;
    prev = r.total;
  });
  rows.forEach((r) => {
    r.tie = r.rank != null && rows.filter((x) => x.rank === r.rank).length > 1;
  });
  return rows;
}

export function disciplineResults(t, disc) {
  const rows = t.contestants.map((c) => {
    const r = contestantDisc(t, disc, c.id);
    return { c, name: fullName(c), ...r, scored: r.counted.length > 0 };
  });
  return assignRanks(rows);
}

export function finalResults(t) {
  const rows = t.contestants.map((c) => {
    const per = {};
    let total = 0, dq = null, cards = 0, warnings = [], scored = false;
    for (const d of FINAL_ORDER) {
      const r = contestantDisc(t, d, c.id);
      per[d] = r;
      total += r.total;
      cards += r.complete;
      if (r.counted.length) scored = true;
      if (r.dq && !dq) dq = `${DISCIPLINES[d].label}: ${r.dq}`;
      warnings = warnings.concat(r.warnings.map((w) => ({ ...w, disc: d })));
    }
    return { c, name: fullName(c), per, total, dq, complete: cards, warnings, scored };
  });
  return assignRanks(rows);
}

// Głosy publiczności: odrzucamy jedną najwyższą i jedną najniższą ocenę.
export function audienceStats(votes = []) {
  const vals = votes.filter((x) => x != null);
  if (vals.length < 3) return { count: vals.length, sum: null, avg: null, low: null, high: null };
  const sorted = [...vals].sort((a, b) => a - b);
  const kept = sorted.slice(1, -1);
  const sum = kept.reduce((a, b) => a + b, 0);
  return { count: vals.length, sum, avg: Math.round(sum / kept.length), low: sorted[0], high: sorted[sorted.length - 1] };
}

// ---------- harmonogram ----------

export const startOf = (c, disc) => (c.start && c.start[disc]) || {};

export function orderedContestants(t, disc) {
  const order = (t.order && t.order[disc]) || [];
  const idx = (id) => {
    const i = order.indexOf(id);
    return i < 0 ? 9999 : i;
  };
  return [...t.contestants].sort((a, b) => {
    const sa = startOf(a, disc), sb = startOf(b, disc);
    const ka = `${sa.date || '9999'} ${sa.time || '99:99'}`;
    const kb = `${sb.date || '9999'} ${sb.time || '99:99'}`;
    return ka.localeCompare(kb) || idx(a.id) - idx(b.id);
  });
}

export const startNumber = (t, disc, cid) => {
  const order = (t.order && t.order[disc]) || [];
  const i = order.indexOf(cid);
  return i < 0 ? null : i + 1;
};

export function findItem(card, itemId) {
  for (const c of card.categories) {
    const it = c.items.find((x) => x.id === itemId);
    if (it) return { cat: c, item: it };
  }
  return null;
}

// ---------- eksport CSV (średnik + BOM, żeby polski Excel otworzył poprawnie) ----------

export function toCSV(rows) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map((r) => r.map(esc).join(';')).join('\r\n');
}
export function download(name, content, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
