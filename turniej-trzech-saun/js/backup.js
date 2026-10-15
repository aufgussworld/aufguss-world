// Kopie zapasowe i eksport do Excela.
// Format kopii (JSON, „tts-backup-1”) jest ten sam w bazie i w plikach — każdą kopię można przywrócić.

import {
  DISCIPLINES, TYPES, STATUS, FINAL_ORDER, disciplinesOf, fullName, fmtRange, startOf, entryStats,
  disciplineResults, finalResults, findItem, download,
} from './model.js';

const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
const PRIVATE_KEYS = ['excluded', 'dq', 'audience'];

// ---------- turniej w aplikacji ⇄ wiersze bazy ----------

export function splitTournament(t) {
  const { scores, history, excluded, dq, audience, status, id, ...rest } = t;
  return {
    id,
    status: status || 'draft',
    data: { ...rest, judges: (t.judges || []).map(({ code, ...j }) => j) },
    priv: { excluded: excluded || {}, dq: dq || {}, audience: audience || {} },
    codes: Object.fromEntries((t.judges || []).filter((j) => j.code).map((j) => [j.id, j.code])),
  };
}

export function assembleTournament(row, priv = {}, codes = {}) {
  const d = row.data || {};
  const t = { ...d, id: row.id, status: row.status || 'draft', scores: {}, history: [] };
  for (const k of PRIVATE_KEYS) t[k] = (priv && priv[k]) || {};
  t.contestants ||= [];
  t.order ||= {};
  t.cards ||= {};
  t.judges = (d.judges || []).map((j) => ({ ...j, code: codes[j.id] || j.code || '' }));
  return t;
}

export function entryFromRow(e) {
  const out = { v: e.v || {}, n: e.n || {}, ni: e.ni || {}, u: e.updated_at ? Date.parse(e.updated_at) : Date.now() };
  if (e.fb) out.fb = e.fb;
  return out;
}

export function putEntry(t, e) {
  t.scores ||= {};
  t.scores[e.disc] ||= {};
  t.scores[e.disc][e.contestant_id] ||= {};
  t.scores[e.disc][e.contestant_id][e.judge_id] = entryFromRow(e);
}

export const historyFromRow = (h) => ({ id: h.id, ts: Date.parse(h.ts), j: h.judge_id, c: h.contestant_id, d: h.disc, i: h.item_id, f: h.f, t: h.t });

// ---------- kopia z bieżącego stanu ----------

export function toSnapshot(tournaments) {
  const entries = [];
  const history = [];
  const out = tournaments.map((t) => {
    for (const [disc, byC] of Object.entries(t.scores || {})) {
      for (const [cid, byJ] of Object.entries(byC || {})) {
        for (const [jid, e] of Object.entries(byJ || {})) {
          entries.push({
            tournament_id: t.id, disc, contestant_id: cid, judge_id: jid,
            v: e.v || {}, n: e.n || {}, ni: e.ni || {}, fb: e.fb || null,
            updated_at: new Date(e.u || Date.now()).toISOString(),
          });
        }
      }
    }
    (t.history || []).forEach((h, i) => history.push({
      id: h.id || null, tournament_id: t.id, ts: new Date(h.ts).toISOString(),
      judge_id: h.j, contestant_id: h.c, disc: h.d, item_id: h.i, f: h.f ?? null, t: h.t ?? null,
    }));
    const s = splitTournament(t);
    return { id: s.id, status: s.status, data: s.data, private: s.priv, codes: s.codes };
  });
  let nextId = 1;
  history.sort((a, b) => a.ts.localeCompare(b.ts)).forEach((h) => (h.id = nextId++));
  return { format: 'tts-backup-1', createdAt: new Date().toISOString(), tournaments: out, entries, history };
}

// Kopia (lub stary plik z wersji demo) → turnieje w kształcie aplikacji.
export function fromSnapshot(d) {
  if (d && Array.isArray(d.tournaments) && d.format !== 'tts-backup-1') return d.tournaments; // stary format demo
  if (!d || d.format !== 'tts-backup-1') throw new Error('To nie jest kopia zapasowa systemu sędziowskiego');
  const list = d.tournaments.map((r) => assembleTournament(r, r.private, r.codes));
  const byId = Object.fromEntries(list.map((t) => [t.id, t]));
  (d.entries || []).forEach((e) => byId[e.tournament_id] && putEntry(byId[e.tournament_id], e));
  (d.history || []).forEach((h) => byId[h.tournament_id] && byId[h.tournament_id].history.push(historyFromRow(h)));
  return list;
}

export const stamp = (date = new Date()) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}_${p(date.getHours())}-${p(date.getMinutes())}`;
};

export function downloadJSON(snapshot, name) {
  download(name || `turniej-trzech-saun_kopia_${stamp()}.json`, JSON.stringify(snapshot), 'application/json');
}

// ---------- Excel ----------

let xlsxLib = null;
export function loadXLSX() {
  if (!xlsxLib) {
    xlsxLib = new Promise((resolve, reject) => {
      if (window.XLSX) return resolve(window.XLSX);
      const s = document.createElement('script');
      s.src = XLSX_URL;
      s.onload = () => resolve(window.XLSX);
      s.onerror = () => reject(new Error('Nie udało się wczytać biblioteki Excel'));
      document.head.appendChild(s);
    });
    xlsxLib.catch(() => (xlsxLib = null));
  }
  return xlsxLib;
}

const num = (tenths) => (tenths == null ? null : tenths / 10);
const sheetName = (s, used) => {
  let base = s.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31).trim();
  let name = base;
  for (let i = 2; used.has(name); i++) name = `${base.slice(0, 28)} ${i}`;
  used.add(name);
  return name;
};
function addSheet(XLSX, wb, used, title, rows, widths) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  if (widths) ws['!cols'] = widths.map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, sheetName(title, used));
}

function resultRows(t, disc) {
  if (disc === 'all') {
    const head = ['Miejsce', 'Zawodnik', ...FINAL_ORDER.map((d) => DISCIPLINES[d].label), 'Suma', 'Uwagi'];
    return [head, ...finalResults(t).map((r) => [r.rank ?? (r.dq ? 'DSQ' : ''), r.name, ...FINAL_ORDER.map((d) => (r.per[d].counted.length ? num(r.per[d].total) : null)), r.scored ? num(r.total) : null, r.dq || ''])];
  }
  const card = t.cards[disc];
  const head = ['Miejsce', 'Zawodnik', 'Dzień startu', 'Godzina', ...card.categories.map((c) => c.name), 'Suma', 'Liczone karty', 'Uwagi'];
  return [head, ...disciplineResults(t, disc).map((r) => {
    const st = startOf(r.c, disc);
    return [r.rank ?? (r.dq ? 'DSQ' : ''), r.name, st.date || '', st.time || '', ...r.cats.map((c) => (r.scored ? num(c.sum) : null)), r.scored ? num(r.total) : null, r.counted.length, r.dq ? `Dyskwalifikacja: ${r.dq}` : ''];
  })];
}

function cardRows(t, disc, onlyJudge) {
  const card = t.cards[disc];
  const rows = [['Sędzia', 'Zawodnik', 'Kategoria', 'Pozycja', 'Rodzaj', 'Maks.', 'Ocena', 'Uwaga do pozycji', 'Dodatkowe uwagi (kategoria)', 'Suma karty']];
  const judges = onlyJudge ? t.judges.filter((j) => j.id === onlyJudge) : t.judges;
  for (const c of t.contestants) {
    for (const j of judges) {
      const e = t.scores?.[disc]?.[c.id]?.[j.id];
      if (!e) continue;
      const st = entryStats(card, e);
      card.categories.forEach((cat) => cat.items.forEach((it, i) => {
        const v = e.v?.[it.id];
        rows.push([
          fullName(j), fullName(c), cat.name, it.label,
          it.kind === 'minus' ? 'kara' : it.kind === 'bin' ? 'tak/nie' : 'punkty',
          it.max, v == null ? null : it.kind === 'minus' ? -num(v) : num(v),
          e.ni?.[it.id] || '', i === 0 ? e.n?.[cat.id] || '' : '', null,
        ]);
      }));
      rows.push([fullName(j), fullName(c), 'RAZEM', '', '', '', null, '', '', num(st.total)]);
    }
  }
  return rows;
}

// Pełna kopia czytelna w Excelu: lista turniejów, wyniki, wszystkie karty i historia zmian.
export async function backupWorkbook(tournaments, fileName) {
  const XLSX = await loadXLSX();
  const wb = XLSX.utils.book_new();
  const used = new Set();
  addSheet(XLSX, wb, used, 'Turnieje', [
    ['Oznaczenie', 'Nazwa', 'Rodzaj', 'Status', 'Termin', 'Zawodnicy', 'Sędziowie'],
    ...tournaments.map((t, i) => [`T${i + 1}`, t.name, TYPES[t.type]?.long || t.type, STATUS[t.status]?.label || t.status, fmtRange(t.dateFrom, t.dateTo), t.contestants.length, t.judges.length]),
  ], [10, 36, 28, 12, 22, 10, 10]);
  tournaments.forEach((t, i) => {
    const tag = `T${i + 1}`;
    const discs = disciplinesOf(t);
    if (t.type === 'final') addSheet(XLSX, wb, used, `${tag} klasyfikacja łączna`, resultRows(t, 'all'), [9, 28, 10, 10, 10, 10, 30]);
    discs.forEach((d) => {
      addSheet(XLSX, wb, used, `${tag} ${DISCIPLINES[d].label} wyniki`, resultRows(t, d), [9, 28, 12, 9, 14, 10, 14, 14, 10, 12, 30]);
      addSheet(XLSX, wb, used, `${tag} ${DISCIPLINES[d].label} karty`, cardRows(t, d), [22, 24, 18, 46, 9, 7, 8, 40, 40, 10]);
    });
    const hist = [['Czas', 'Sędzia', 'Zawodnik', 'Konkurencja', 'Pozycja', 'Było', 'Jest']];
    const name = (list, id) => fullName(list.find((x) => x.id === id) || {});
    (t.history || []).forEach((h) => {
      const fi = t.cards[h.d] ? findItem(t.cards[h.d], h.i) : null;
      hist.push([new Date(h.ts).toLocaleString('pl-PL'), name(t.judges, h.j), name(t.contestants, h.c), DISCIPLINES[h.d]?.label || h.d, fi?.item.label || h.i, num(h.f), num(h.t)]);
    });
    if (hist.length > 1) addSheet(XLSX, wb, used, `${tag} historia zmian`, hist, [20, 22, 24, 12, 46, 8, 8]);
  });
  XLSX.writeFile(wb, fileName || `turniej-trzech-saun_kopia_${stamp()}.xlsx`);
}

// Karta jednego sędziego dla jednego zawodnika — zabezpieczenie „na papierze” po każdym seansie.
export async function cardWorkbook(t, disc, cid, jid, fileName) {
  const XLSX = await loadXLSX();
  const c = t.contestants.find((x) => x.id === cid);
  const j = t.judges.find((x) => x.id === jid);
  const card = t.cards[disc];
  const e = t.scores?.[disc]?.[cid]?.[jid] || {};
  const st = entryStats(card, e);
  const s = startOf(c, disc);
  const rows = [
    ['Turniej Trzech Saun — karta sędziego'],
    ['Turniej', t.name],
    ['Konkurencja', DISCIPLINES[disc].label],
    ['Zawodnik', fullName(c)],
    ['Start', `${s.date || ''} ${s.time || ''}`.trim()],
    ['Sędzia', fullName(j)],
    ['Wygenerowano', new Date().toLocaleString('pl-PL')],
    [],
    ['Kategoria', 'Pozycja', 'Rodzaj', 'Maks.', 'Ocena', 'Uwaga do pozycji'],
  ];
  card.categories.forEach((cat, ci) => {
    cat.items.forEach((it) => {
      const v = e.v?.[it.id];
      rows.push([cat.name, it.label, it.kind === 'minus' ? 'kara' : it.kind === 'bin' ? 'tak/nie' : 'punkty', it.max, v == null ? null : it.kind === 'minus' ? -num(v) : num(v), e.ni?.[it.id] || '']);
    });
    rows.push([`${cat.name} — suma`, '', '', num(st.cats[ci].max), num(st.cats[ci].sum), e.n?.[cat.id] ? `Dodatkowe uwagi: ${e.n[cat.id]}` : '']);
  });
  rows.push([], ['WYNIK CAŁKOWITY', '', '', null, num(st.total)]);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 26 }, { wch: 52 }, { wch: 9 }, { wch: 7 }, { wch: 8 }, { wch: 46 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Karta');
  XLSX.writeFile(wb, fileName);
}

// ---------- automatyczna kopia na komputerze supervisora (co godzinę o :30) ----------

const AUTO_KEY = 'tts-autobackup';
const LAST_KEY = 'tts-autobackup-last';
export const autoBackupEnabled = () => {
  try { return localStorage.getItem(AUTO_KEY) !== 'off'; } catch (_) { return true; }
};
export const setAutoBackup = (on) => {
  try { localStorage.setItem(AUTO_KEY, on ? 'on' : 'off'); } catch (_) { /* brak pamięci */ }
};
export const lastAutoBackup = () => {
  try { return localStorage.getItem(LAST_KEY); } catch (_) { return null; }
};

// Wywoływane co kilkanaście sekund; zapisuje JSON (do przywracania) i Excel (do czytania).
export async function autoBackupTick(getTournaments, notify) {
  if (!autoBackupEnabled()) return;
  const now = new Date();
  if (now.getMinutes() !== 30) return;
  const key = stamp(now).slice(0, 13); // rrrr-mm-dd_gg
  if (lastAutoBackup()?.startsWith(key)) return;
  const list = getTournaments();
  if (!list.some((t) => t.status === 'live')) return;
  try { localStorage.setItem(LAST_KEY, stamp(now)); } catch (_) { /* brak pamięci */ }
  downloadJSON(toSnapshot(list), `turniej-trzech-saun_kopia_${stamp(now)}.json`);
  try {
    await backupWorkbook(list, `turniej-trzech-saun_kopia_${stamp(now)}.xlsx`);
  } catch (e) {
    console.warn('Kopia Excel nie powstała', e);
  }
  notify && notify(`Kopia zapasowa zapisana na tym komputerze (${String(now.getHours()).padStart(2, '0')}:30)`);
}
