// Panel supervisora: wyniki na żywo, karty wszystkich sędziów, porównania „oczami sędziego”,
// historia zmian, głosy publiczności oraz przygotowanie turnieju.

import { html, useEffect, useRef, useState } from './lib.js';
import {
  DISCIPLINES, TYPES, STATUS, FINAL_ORDER, disciplinesOf, fullName, fmt, fmtDate, fmtRange, fmtStamp,
  entryStats, getEntry, contestantDisc, disciplineResults, finalResults, audienceStats, orderedContestants,
  startOf, findItem, parseScore, cardMax, excludedKey, dqKey, toCSV, download, prettyCode,
} from './model.js';
import { store, updateT, deleteTournament, LIVE } from './store.js';
import { Icon, Avatar, DiscBadge, StatusIcon, Segmented, Modal, Empty, LiveDot, toast } from './ui.js';
import { ScoreCard, CompareView } from './judge.js';
import { resultsPDF } from './pdf.js';
import { ContestantsEditor, JudgesEditor, CardEditor, QualifierImport } from './editors.js';
import {
  toSnapshot, fromSnapshot, downloadJSON, backupWorkbook, stamp, autoBackupEnabled, setAutoBackup, lastAutoBackup,
} from './backup.js';

const discOptions = (t, withAll) => [
  ...disciplinesOf(t).map((d) => ({ value: d, label: DISCIPLINES[d].label, icon: DISCIPLINES[d].icon, disc: d })),
  ...(withAll ? [{ value: 'all', label: 'Klasyfikacja łączna', icon: 'trophy' }] : []),
];

function StatusBadge({ status }) {
  return html`<span class=${'badge st-' + status}>${status === 'live' ? html`<i class="dot"></i>` : status === 'closed' ? html`<${Icon} name="lock" size=${12} />` : null}${STATUS[status].label}</span>`;
}

function progressOf(t) {
  let done = 0, expected = 0;
  for (const d of disciplinesOf(t)) {
    for (const c of t.contestants) {
      expected += t.panelSize;
      done += Math.min(t.panelSize, contestantDisc(t, d, c.id).complete);
    }
  }
  return { done, expected };
}

// ---------- lista turniejów ----------

export function SupervisorHome({ go }) {
  const s = store.get();
  const groups = [
    ['live', 'W trakcie'],
    ['draft', 'Szkice'],
    ['closed', 'Zakończone'],
  ];
  return html`<div class="page">
    <div class="page-head row">
      <div><h1>Turnieje</h1><p class="muted">Sommer Hot, Sommer Relax, Sommer Banya i Finał Turnieju Trzech Saun.</p></div>
      <div class="actions">
        <button class="btn lg" onClick=${() => go('#/s/system')}><${Icon} name="key" />Kod dostępu i kopie</button>
        <button class="btn primary lg" onClick=${() => go('#/s/new')}><${Icon} name="plus" />Nowy turniej</button>
      </div>
    </div>
    ${!s.tournaments.length ? html`<div class="panel empty-start">
      <${Icon} name="trophy" size=${30} />
      <h2>Brak turniejów</h2>
      <p class="muted">Załóż pierwszy turniej: wybierz rodzaj (Relax, HOT, Banya albo Finał), dodaj zawodników, rozpisz starty, dodaj sędziów i wydrukuj im kody logowania.</p>
      <button class="btn primary lg" onClick=${() => go('#/s/new')}><${Icon} name="plus" />Nowy turniej</button>
    </div>` : null}
    ${groups.map(([st, label]) => {
      const list = s.tournaments.filter((t) => t.status === st).sort((a, b) => (b.dateFrom || '').localeCompare(a.dateFrom || ''));
      if (!list.length) return null;
      return html`<section class="t-group" key=${st}>
        <h2 class="section-title">${label}</h2>
        <div class="t-grid">
          ${list.map((t) => {
            const p = progressOf(t);
            return html`<button class=${'t-card type-' + t.type} key=${t.id} onClick=${() => go(`#/s/t/${t.id}/wyniki`)}>
              <span class="t-stripe" aria-hidden="true">${disciplinesOf(t).map((d) => html`<i class=${'d-' + d}></i>`)}</span>
              <span class="t-top"><${DiscBadge} disc=${t.type} small /><${StatusBadge} status=${t.status} /></span>
              <span class="t-name">${t.name}</span>
              <span class="t-meta"><${Icon} name="calendar" size=${14} />${fmtRange(t.dateFrom, t.dateTo)}</span>
              <span class="t-stats">
                <span><b>${t.contestants.length}</b> zawodników</span>
                <span><b>${t.judges.length}</b> sędziów</span>
                <span><b>${p.done}</b>/${p.expected} kart</span>
              </span>
              <span class="bar"><i style=${{ width: (p.expected ? (p.done / p.expected) * 100 : 0) + '%' }}></i></span>
            </button>`;
          })}
        </div>
      </section>`;
    })}
  </div>`;
}

// ---------- widok turnieju ----------

const NAV = [
  ['wyniki', 'Wyniki na żywo', 'trophy'],
  ['karty', 'Karty sędziów', 'grid'],
  ['porownanie', 'Porównanie', 'columns'],
  ['historia', 'Historia zmian', 'history'],
  ['publicznosc', 'Głosy publiczności', 'megaphone'],
  null,
  ['zawodnicy', 'Zawodnicy i starty', 'users'],
  ['sedziowie', 'Sędziowie i kody', 'gavel'],
  ['karta', 'Karta oceny', 'clipboard'],
  ['ustawienia', 'Ustawienia', 'sliders'],
];

export function TournamentView({ t, tab = 'wyniki', go }) {
  const update = (fn) => updateT(t.id, fn);
  const warnings = disciplinesOf(t).reduce((a, d) => a + t.contestants.filter((c) => contestantDisc(t, d, c.id).warnings.some((w) => w.type === 'over')).length, 0);
  return html`<div class="sup-layout">
    <nav class="sidenav" aria-label="Sekcje turnieju">
      <button class="back-link" onClick=${() => go('#/s')}><${Icon} name="chevron-left" size=${16} />Wszystkie turnieje</button>
      <div class="sn-head">
        <span class="t-stripe" aria-hidden="true">${disciplinesOf(t).map((d) => html`<i class=${'d-' + d}></i>`)}</span>
        <h1>${t.name}</h1>
        <p class="muted small">${fmtRange(t.dateFrom, t.dateTo)}</p>
        <div class="sn-badges"><${DiscBadge} disc=${t.type} small /><${StatusBadge} status=${t.status} /></div>
      </div>
      <ul>
        ${NAV.map((n, i) => n
          ? html`<li key=${n[0]}><a href=${`#/s/t/${t.id}/${n[0]}`} class=${tab === n[0] ? 'on' : ''} aria-current=${tab === n[0] ? 'page' : undefined}>
              <${Icon} name=${n[2]} size=${17} />${n[1]}${n[0] === 'wyniki' && warnings ? html`<span class="count warn">${warnings}</span>` : null}</a></li>`
          : html`<li class="sn-sep" key=${'sep' + i}>Przygotowanie</li>`)}
        <li class="sn-sep">System</li>
        <li><a href="#/s/system"><${Icon} name="key" size=${17} />Kod dostępu i kopie</a></li>
      </ul>
    </nav>
    <main class="sup-main" id="main">
      ${tab === 'wyniki' ? html`<${ResultsTab} t=${t} />` : null}
      ${tab === 'karty' ? html`<${MatrixTab} t=${t} />` : null}
      ${tab === 'porownanie' ? html`<${CompareTab} t=${t} />` : null}
      ${tab === 'historia' ? html`<${HistoryTab} t=${t} />` : null}
      ${tab === 'publicznosc' ? html`<${AudienceTab} t=${t} />` : null}
      ${tab === 'zawodnicy' ? html`<div class="page"><div class="page-head"><h1>Zawodnicy i starty</h1>
          <p class="muted">Po losowaniu ustal kolejność oraz dzień i godzinę startu — sędziowie zobaczą zawodników w tej kolejności, ze zdjęciem i godziną.</p></div>
          ${t.type === 'final' ? html`<${QualifierImport} t=${t} update=${update} />` : null}
          <${ContestantsEditor} t=${t} update=${update} mode="full" /></div>` : null}
      ${tab === 'sedziowie' ? html`<div class="page"><div class="page-head"><h1>Sędziowie i kody logowania</h1>
          <p class="muted">Każdy sędzia loguje się własnym kodem i widzi wyłącznie swoje karty.</p></div>
          <${JudgesEditor} t=${t} update=${update} /></div>` : null}
      ${tab === 'karta' ? html`<div class="page"><div class="page-head"><h1>Karta oceny</h1>
          <p class="muted">Kategorie, pozycje i zakresy punktów. Punkty karne sędzia wpisuje bez minusa — system je odejmuje.</p></div>
          <${CardEditor} t=${t} update=${update} /></div>` : null}
      ${tab === 'ustawienia' ? html`<${SettingsTab} t=${t} go=${go} />` : null}
    </main>
  </div>`;
}

// ---------- wyniki ----------

function Kpi({ label, value, sub, tone }) {
  return html`<div class=${'kpi ' + (tone || '')}><span class="kpi-l">${label}</span><span class="kpi-v">${value}</span>${sub ? html`<span class="kpi-s">${sub}</span>` : null}</div>`;
}

function rankCell(r, isFinal, isQual) {
  if (r.dq) return html`<span class="rank dq" title=${r.dq}>DSQ</span>`;
  if (!r.rank) return html`<span class="rank none">—</span>`;
  return html`<span class=${`rank ${isFinal && r.rank <= 3 ? 'podium p' + r.rank : ''}`}>${r.rank}${r.tie ? html`<small>ex aequo</small>` : null}</span>`;
}

function resultsCSV(t, disc) {
  const rows = [];
  if (disc === 'all') {
    rows.push(['Miejsce', 'Zawodnik', ...FINAL_ORDER.map((d) => DISCIPLINES[d].label), 'Suma', 'Uwagi']);
    finalResults(t).forEach((r) => rows.push([r.rank ?? (r.dq ? 'DSQ' : ''), r.name, ...FINAL_ORDER.map((d) => fmt(r.per[d].total, true)), fmt(r.total, true), r.dq || '']));
  } else {
    const card = t.cards[disc];
    rows.push(['Miejsce', 'Zawodnik', 'Start', ...card.categories.map((c) => c.name), 'Suma', 'Liczone karty', 'Uwagi']);
    disciplineResults(t, disc).forEach((r) => {
      const st = startOf(r.c, disc);
      rows.push([r.rank ?? (r.dq ? 'DSQ' : ''), r.name, `${st.date || ''} ${st.time || ''}`.trim(), ...r.cats.map((c) => fmt(c.sum, true)), fmt(r.total, true), r.counted.length, r.dq || '']);
    });
  }
  download(`wyniki-${t.id}-${disc}.csv`, toCSV(rows));
}

function ResultsTab({ t }) {
  const isFinal = t.type === 'final';
  const [disc, setDisc] = useState(isFinal ? 'all' : t.type);
  const [open, setOpen] = useState(null);
  const discs = disc === 'all' ? FINAL_ORDER : [disc];
  const rows = disc === 'all' ? finalResults(t) : disciplineResults(t, disc);
  let done = 0, expected = 0, scoredFully = 0, over = [];
  for (const d of discs) {
    for (const c of t.contestants) {
      const r = contestantDisc(t, d, c.id);
      expected += t.panelSize;
      done += Math.min(t.panelSize, r.complete);
      if (r.complete >= t.panelSize) scoredFully++;
      r.warnings.filter((w) => w.type === 'over').forEach((w) => over.push({ c, d, w }));
    }
  }
  const last = (t.history || []).length ? t.history[t.history.length - 1] : null;
  const lastJ = last && t.judges.find((j) => j.id === last.j);
  const card = disc !== 'all' ? t.cards[disc] : null;
  const isQual = !isFinal;

  return html`<div class="page">
    <div class="page-head row">
      <div><h1>Wyniki ${t.status === 'live' ? html`<${LiveDot} />` : null}</h1>
        <p class="muted">${t.status === 'live' ? 'Tabela aktualizuje się sama, gdy sędziowie wpisują oceny — bez przeładowania strony.' : STATUS[t.status].hint}</p></div>
      <div class="actions">
        <button class="btn" onClick=${() => resultsCSV(t, disc)}><${Icon} name="download" />Eksport CSV</button>
        <button class="btn" onClick=${() => resultsPDF(t, disc).catch(() => toast('Nie udało się przygotować pliku PDF — sprawdź połączenie z internetem', 'err'))}>
          <${Icon} name="file-text" />Wyniki PDF</button>
      </div>
    </div>
    ${isFinal ? html`<div class="toolbar"><${Segmented} label="Konkurencja" value=${disc} onChange=${setDisc} options=${discOptions(t, true)} /></div>` : null}

    <div class="kpis">
      <${Kpi} label="Kompletne karty (liczone)" value=${`${done} / ${expected}`} sub=${`${t.panelSize} sędziów na ceremonię`} />
      <${Kpi} label="Zawodnicy w pełni ocenieni" value=${`${scoredFully} / ${t.contestants.length * discs.length}`} sub=${disc === 'all' ? 'występy w trzech konkurencjach' : 'występy'} />
      <${Kpi} label="Do rozstrzygnięcia" value=${over.length} sub=${over.length ? 'więcej kart niż sędziów w panelu' : 'brak konfliktów'} tone=${over.length ? 'warn' : ''} />
      <${Kpi} label="Ostatni wpis" value=${last ? fmtStamp(last.ts, false).split(' ')[1] : '—'} sub=${last ? `${fmtStamp(last.ts, false).split(' ')[0]} · ${lastJ ? fullName(lastJ) : ''}` : 'brak wpisów'} />
    </div>

    ${over.length ? html`<div class="alert warn stack" role="status">
      <${Icon} name="alert" />
      <div><b>Więcej ocen niż przewiduje regulamin</b>
        <ul>${over.map(({ c, d, w }) => html`<li key=${c.id + d}>${fullName(c)}${isFinal ? ` (${DISCIPLINES[d].label})` : ''}: ${w.text}
          <button class="link-btn" onClick=${() => setOpen({ cid: c.id, disc: d })}>Rozstrzygnij</button></li>`)}</ul></div>
    </div>` : null}

    <div class="table-wrap">
      <table class=${'results ' + (disc !== 'all' ? 'd-' + disc : '')}>
        <thead><tr>
          <th class="w-rank">Miejsce</th><th>Zawodnik</th>
          ${disc === 'all'
            ? FINAL_ORDER.map((d) => html`<th class="num" key=${d}><${DiscBadge} disc=${d} small /></th>`)
            : card.categories.map((c) => html`<th class="num" key=${c.id}>${c.name}</th>`)}
          <th class="num total-col">Suma</th>
          <th class="w-cards">Karty</th>
        </tr></thead>
        <tbody>
          ${rows.map((r) => {
            const st = disc !== 'all' ? startOf(r.c, disc) : null;
            const qualifies = isQual && r.rank && r.rank <= 5;
            return html`<tr key=${r.c.id} class=${`${r.dq ? 'is-dq' : ''} ${!r.scored ? 'is-pending' : ''} ${qualifies ? 'qual' : ''}`}
              onClick=${() => setOpen({ cid: r.c.id, disc })} tabindex="0" onKeyDown=${(e) => e.key === 'Enter' && setOpen({ cid: r.c.id, disc })}>
              <td class="w-rank">${rankCell(r, isFinal, isQual)}</td>
              <td><div class="who"><${Avatar} c=${r.c} size=${36} /><span><b>${r.name}</b>
                <small>${r.dq ? html`<span class="neg-text">Dyskwalifikacja: ${r.dq}</span>` : st && st.date ? `${fmtDate(st.date)}, ${st.time || ''}${!r.scored ? ' · czeka na start' : disc !== 'all' && r.complete < t.panelSize && t.status === 'live' ? ' · oceny w toku' : ''}` : ''}</small></span>
                ${qualifies ? html`<span class="badge qual-b" title="Miejsca 1–5 kwalifikują do finału">Finał</span>` : null}</div></td>
              ${disc === 'all'
                ? FINAL_ORDER.map((d) => html`<td class="num" key=${d}>${r.per[d].counted.length ? fmt(r.per[d].total, true) : '—'}</td>`)
                : r.cats.map((c) => html`<td class="num" key=${c.id}>${r.scored ? fmt(c.sum, true) : '—'}</td>`)}
              <td class="num total-col"><b>${r.scored ? fmt(r.total, true) : '—'}</b></td>
              <td class="w-cards">${disc === 'all'
                ? html`<span class="cards-n">${r.complete}/${t.panelSize * 3}</span>`
                : html`<span class=${'cards-n ' + (r.counted.length > t.panelSize ? 'warn-text' : '')}>${r.complete}/${t.panelSize}</span>`}
                ${r.warnings.some((w) => w.type === 'over') ? html`<${Icon} name="alert" size=${15} cls="warn-text" label="Do rozstrzygnięcia" />` : null}</td>
            </tr>`;
          })}
        </tbody>
      </table>
    </div>
    ${isQual ? html`<p class="muted small legend"><span class="badge qual-b">Finał</span> miejsca 1–5 (z remisami) — automatyczna kwalifikacja do finału. Kliknij wiersz, aby zobaczyć oceny poszczególnych sędziów.</p>` : null}
    ${open ? html`<${ContestantModal} t=${t} cid=${open.cid} disc=${open.disc} onClose=${() => setOpen(null)} />` : null}
  </div>`;
}

// Szczegóły zawodnika: oceny każdego sędziego, decyzja „liczy się / nie liczy się”, dyskwalifikacja.
function ContestantModal({ t, cid, disc, onClose }) {
  const c = t.contestants.find((x) => x.id === cid);
  const [card, setCard] = useState(null);
  const discs = disc === 'all' ? FINAL_ORDER : [disc];
  if (!c) return null;
  return html`<${Modal} title=${fullName(c)} onClose=${onClose} wide>
    <div class="cm-head"><${Avatar} c=${c} size=${64} /><div><h3>${fullName(c)}</h3>
      <p class="muted">${discs.map((d) => { const s = startOf(c, d); return s.date ? `${DISCIPLINES[d].label}: ${fmtDate(s.date)}, ${s.time || ''}` : ''; }).filter(Boolean).join(' · ')}</p></div></div>
    ${discs.map((d) => html`<${JudgeBreakdown} key=${d} t=${t} c=${c} disc=${d} showTitle=${discs.length > 1} onOpenCard=${(jid) => setCard({ d, jid })} />`)}
    ${card ? html`<${CardModal} t=${t} disc=${card.d} cid=${cid} jid=${card.jid} onClose=${() => setCard(null)} />` : null}
  </${Modal}>`;
}

function JudgeBreakdown({ t, c, disc, showTitle, onOpenCard }) {
  const r = contestantDisc(t, disc, c.id);
  const card = t.cards[disc];
  const dq = t.dq?.[dqKey(disc, c.id)];
  const [dqOpen, setDqOpen] = useState(!!dq);
  const toggleEx = (jid) => updateT(t.id, (x) => {
    const k = excludedKey(disc, c.id, jid);
    x.excluded ||= {};
    if (x.excluded[k]) delete x.excluded[k];
    else x.excluded[k] = true;
  });
  const setDq = (reason) => updateT(t.id, (x) => {
    x.dq ||= {};
    if (reason == null) delete x.dq[dqKey(disc, c.id)];
    else x.dq[dqKey(disc, c.id)] = reason;
  });
  const aud = audienceStats(t.audience?.[disc]?.[c.id]);
  const all = t.judges.map((j) => r.judges.find((x) => x.judge.id === j.id) || { judge: j, stats: entryStats(card, null), excluded: false, counted: false });
  return html`<section class=${'breakdown d-' + disc}>
    ${showTitle ? html`<h4><${DiscBadge} disc=${disc} /></h4>` : null}
    ${r.warnings.filter((w) => w.type === 'over').map((w) => html`<div class="alert warn"><${Icon} name="alert" />${w.text} Odznacz „Liczy się” przy sędziach, których głosy mają zostać pominięte.</div>`)}
    <div class="table-wrap"><table class="results compact">
      <thead><tr><th>Sędzia</th>${card.categories.map((k) => html`<th class="num" key=${k.id}>${k.name}</th>`)}<th class="num total-col">Suma</th><th>Karta</th><th>Liczy się</th></tr></thead>
      <tbody>
        ${all.map((x) => html`<tr key=${x.judge.id} class=${!x.stats.started ? 'is-pending' : x.excluded ? 'is-excluded' : ''}>
          <td><b>${fullName(x.judge)}</b></td>
          ${x.stats.cats.map((cs) => html`<td class="num" key=${cs.id}>${x.stats.started ? fmt(cs.sum, true) : '—'}</td>`)}
          <td class="num total-col"><b>${x.stats.started ? fmt(x.stats.total, true) : '—'}</b></td>
          <td>${x.stats.started
            ? html`<button class="link-btn" onClick=${() => onOpenCard(x.judge.id)}><${StatusIcon} status=${x.stats.status} size=${15} />Otwórz</button>`
            : html`<span class="muted small">brak karty</span>`}</td>
          <td>${x.stats.started ? html`<label class="switch"><input type="checkbox" checked=${!x.excluded} onChange=${() => toggleEx(x.judge.id)} /><span></span><em class="sr">Liczy się</em></label>` : null}</td>
        </tr>`)}
      </tbody>
      <tfoot><tr class="total-row"><th>Wynik (liczone karty: ${r.counted.length})</th>
        ${r.cats.map((k) => html`<td class="num" key=${k.id}>${fmt(k.sum, true)}</td>`)}
        <td class="num total-col"><b>${fmt(r.total, true)}</b></td><td colspan="2"></td></tr></tfoot>
    </table></div>
    <div class="bd-foot">
      <span class="muted small"><${Icon} name="megaphone" size=${14} /> Publiczność: ${aud.sum != null ? html`<b>${fmt(aud.sum)}</b> pkt (${aud.count} głosów, bez skrajnych)` : 'brak głosów'}</span>
      <span class="grow"></span>
      <label class="check"><input type="checkbox" checked=${!!dq || dqOpen} onChange=${(e) => { if (e.currentTarget.checked) { setDqOpen(true); setDq('Decyzja sędziego technicznego'); } else { setDqOpen(false); setDq(null); } }} />Dyskwalifikacja</label>
      ${dq != null ? html`<input type="text" class="dq-reason" value=${dq} aria-label="Powód dyskwalifikacji" onInput=${(e) => setDq(e.currentTarget.value)} />` : null}
    </div>
  </section>`;
}

function CardModal({ t, disc, cid, jid, onClose }) {
  const j = t.judges.find((x) => x.id === jid);
  const card = t.cards[disc];
  const hist = (t.history || []).filter((h) => h.c === cid && h.j === jid && h.d === disc).slice().reverse();
  const excluded = !!t.excluded?.[excludedKey(disc, cid, jid)];
  return html`<${Modal} title=${`Karta: ${fullName(j)}`} onClose=${onClose} wide>
    <div class="card-modal">
      <div class="cm-card">
        ${excluded ? html`<div class="alert warn"><${Icon} name="ban" />Ta karta nie jest wliczana do wyniku (decyzja supervisora).</div>` : null}
        <${ScoreCard} t=${t} disc=${disc} cid=${cid} jid=${jid} readOnly judgeName=${fullName(j)} />
      </div>
      <aside class="cm-hist">
        <h4><${Icon} name="history" size=${16} />Historia tej karty</h4>
        ${!hist.length ? html`<p class="muted small">Brak wpisów.</p>` : html`<ol class="hist-mini">
          ${hist.map((h, i) => {
            const fi = findItem(card, h.i);
            return html`<li key=${i} class=${h.f != null ? 'corr' : ''}>
              <time>${fmtStamp(h.ts)}</time>
              <span>${fi ? fi.item.label : 'usunięta pozycja'}</span>
              <span class="chg">${h.f != null ? html`<s>${fmt(h.f)}</s> → ` : null}<b>${h.t == null ? 'wyczyszczono' : fmt(h.t)}</b></span>
            </li>`;
          })}
        </ol>`}
      </aside>
    </div>
  </${Modal}>`;
}

// ---------- karty sędziów (macierz) ----------

function MatrixTab({ t }) {
  const discs = disciplinesOf(t);
  const [disc, setDisc] = useState(discs[0]);
  const [open, setOpen] = useState(null);
  const card = t.cards[disc];
  const list = orderedContestants(t, disc);
  const perJudge = t.judges.map((j) => list.filter((c) => entryStats(card, getEntry(t, disc, c.id, j.id)).complete).length);
  return html`<div class="page">
    <div class="page-head"><h1>Karty sędziów</h1>
      <p class="muted">Każda komórka to karta jednego sędziego dla jednego zawodnika. Kliknij, aby zobaczyć ją tak, jak widzi ją sędzia, razem z historią zmian.</p></div>
    ${discs.length > 1 ? html`<div class="toolbar"><${Segmented} label="Konkurencja" value=${disc} onChange=${setDisc} options=${discOptions(t)} /></div>` : null}
    <div class="table-wrap">
      <table class=${'matrix d-' + disc}>
        <thead><tr><th>Zawodnik</th>
          ${t.judges.map((j, i) => html`<th key=${j.id} class="mx-j"><span>${fullName(j)}</span><small>${perJudge[i]}/${list.length} kompletnych</small></th>`)}
          <th class="num total-col">Wynik</th></tr></thead>
        <tbody>
          ${list.map((c) => {
            const r = contestantDisc(t, disc, c.id);
            const st = startOf(c, disc);
            return html`<tr key=${c.id}>
              <th scope="row"><div class="who"><${Avatar} c=${c} size=${30} /><span><b>${fullName(c)}</b><small>${st.date ? `${fmtDate(st.date)}, ${st.time || ''}` : ''}</small></span></div></th>
              ${t.judges.map((j) => {
                const e = getEntry(t, disc, c.id, j.id);
                const s = entryStats(card, e);
                const ex = !!t.excluded?.[excludedKey(disc, c.id, j.id)];
                return html`<td key=${j.id} class="mx-cell">
                  ${s.started
                    ? html`<button class=${`mx-btn s-${s.status} ${ex ? 'ex' : ''}`} onClick=${() => setOpen({ cid: c.id, jid: j.id })}
                        aria-label=${`${fullName(j)} — ${fullName(c)}: ${fmt(s.total, true)} pkt${ex ? ', nie liczy się' : ''}${e?.fb ? ', feedback gotowy' : ''}`}>
                        <${StatusIcon} status=${s.status} size=${15} /><span>${fmt(s.total, true)}</span>
                        ${e?.fb ? html`<${Icon} name="file-text" size=${14} cls="mx-fb" />` : null}</button>`
                    : html`<span class="mx-empty" aria-label="brak karty">·</span>`}
                </td>`;
              })}
              <td class="num total-col"><b>${r.counted.length ? fmt(r.total, true) : '—'}</b>
                ${r.warnings.some((w) => w.type === 'over') ? html`<${Icon} name="alert" size=${14} cls="warn-text" label="Do rozstrzygnięcia" />` : null}</td>
            </tr>`;
          })}
        </tbody>
      </table>
    </div>
    <p class="legend muted small">
      <${StatusIcon} status="complete" size=${14} withLabel /> <${StatusIcon} status="partial" size=${14} withLabel />
      <span class="lg-ex">12,5</span> nie liczy się do wyniku
      <span class="lg-fb"><${Icon} name="file-text" size=${14} /> sędzia przygotował feedback</span>
    </p>
    ${open ? html`<${CardModal} t=${t} disc=${disc} cid=${open.cid} jid=${open.jid} onClose=${() => setOpen(null)} />` : null}
  </div>`;
}

// ---------- porównanie oczami sędziego ----------

function CompareTab({ t }) {
  const [jid, setJid] = useState(t.judges[0]?.id || '__sum');
  const discs = disciplinesOf(t);
  const [disc, setDisc] = useState(discs[0]);
  const j = t.judges.find((x) => x.id === jid);
  return html`<div class="page">
    <div class="page-head"><h1>Porównanie</h1>
      <p class="muted">Wybierz sędziego, aby zobaczyć porównanie dokładnie tak, jak widzi je on. Opcja „Suma liczonych kart” zestawia łączne noty.</p></div>
    <div class="toolbar">
      <label class="inline-field"><${Icon} name="eye" size=${16} />Oczami:
        <select value=${jid} onChange=${(e) => setJid(e.currentTarget.value)}>
          ${t.judges.map((x) => html`<option value=${x.id} key=${x.id}>${fullName(x)}</option>`)}
          <option value="__sum">Suma liczonych kart (wszyscy sędziowie)</option>
        </select></label>
      ${j ? html`<span class="badge">Widok sędziego: ${fullName(j)}</span>` : null}
    </div>
    <${CompareView} key=${jid} t=${t} jid=${jid} disc=${disc} isFinal=${t.type === 'final'} onDisc=${setDisc} />
  </div>`;
}

// ---------- historia zmian ----------

function HistoryTab({ t }) {
  const [fj, setFj] = useState('');
  const [fc, setFc] = useState('');
  const [fd, setFd] = useState('');
  const [kind, setKind] = useState('all');
  const [limit, setLimit] = useState(150);
  const hist = t.history || [];
  const name = (list, id) => { const x = list.find((y) => y.id === id); return x ? fullName(x) : '—'; };
  const filtered = hist.filter((h) => (!fj || h.j === fj) && (!fc || h.c === fc) && (!fd || h.d === fd) &&
    (kind === 'all' || (kind === 'corr' ? h.f != null : h.f == null))).slice().reverse();
  const summary = t.judges.map((j) => {
    const mine = hist.filter((h) => h.j === j.id);
    return { j, entries: mine.filter((h) => h.f == null).length, corr: mine.filter((h) => h.f != null).length, last: mine.length ? mine[mine.length - 1].ts : null };
  });
  const maxCorr = Math.max(1, ...summary.map((s) => s.corr));
  const exportCSV = () => {
    const rows = [['Czas', 'Sędzia', 'Zawodnik', 'Konkurencja', 'Kategoria', 'Pozycja', 'Było', 'Jest', 'Rodzaj']];
    hist.forEach((h) => {
      const fi = findItem(t.cards[h.d], h.i);
      rows.push([fmtStamp(h.ts), name(t.judges, h.j), name(t.contestants, h.c), DISCIPLINES[h.d].label, fi?.cat.name || '', fi?.item.label || '', h.f == null ? '' : fmt(h.f), h.t == null ? '' : fmt(h.t), h.f == null ? 'wpis' : 'korekta']);
    });
    download(`historia-${t.id}.csv`, toCSV(rows));
  };
  return html`<div class="page">
    <div class="page-head row"><div><h1>Historia zmian</h1>
      <p class="muted">Każdy wpis i każda poprawka sędziego z dokładnym czasem — materiał do analizy po turnieju.</p></div>
      <div class="actions"><button class="btn" onClick=${exportCSV}><${Icon} name="download" />Eksport CSV</button></div></div>

    <div class="judge-sum">
      ${summary.map((s) => html`<button key=${s.j.id} class=${'js-card ' + (fj === s.j.id ? 'on' : '')} onClick=${() => setFj(fj === s.j.id ? '' : s.j.id)} aria-pressed=${fj === s.j.id}>
        <b>${fullName(s.j)}</b>
        <span><em>${s.entries}</em> wpisów · <em class=${s.corr ? 'warn-text' : ''}>${s.corr}</em> korekt</span>
        <span class="bar warn"><i style=${{ width: (s.corr / maxCorr) * 100 + '%' }}></i></span>
        <small class="muted">${s.last ? 'ostatnio ' + fmtStamp(s.last, false) : 'brak aktywności'}</small>
      </button>`)}
    </div>

    <div class="toolbar filters">
      <label class="inline-field">Sędzia<select value=${fj} onChange=${(e) => setFj(e.currentTarget.value)}>
        <option value="">wszyscy</option>${t.judges.map((j) => html`<option value=${j.id}>${fullName(j)}</option>`)}</select></label>
      <label class="inline-field">Zawodnik<select value=${fc} onChange=${(e) => setFc(e.currentTarget.value)}>
        <option value="">wszyscy</option>${t.contestants.map((c) => html`<option value=${c.id}>${fullName(c)}</option>`)}</select></label>
      ${t.type === 'final' ? html`<label class="inline-field">Konkurencja<select value=${fd} onChange=${(e) => setFd(e.currentTarget.value)}>
        <option value="">wszystkie</option>${FINAL_ORDER.map((d) => html`<option value=${d}>${DISCIPLINES[d].label}</option>`)}</select></label>` : null}
      <${Segmented} label="Rodzaj" value=${kind} onChange=${setKind} options=${[{ value: 'all', label: 'Wszystko' }, { value: 'corr', label: 'Tylko korekty' }, { value: 'first', label: 'Pierwsze wpisy' }]} />
      <span class="muted small">${filtered.length} pozycji</span>
    </div>

    ${!filtered.length ? html`<${Empty} icon="history" title="Brak wpisów dla wybranych filtrów" />` : html`
    <div class="table-wrap"><table class="history">
      <thead><tr><th>Czas</th><th>Sędzia</th><th>Zawodnik</th>${t.type === 'final' ? html`<th>Konk.</th>` : null}<th>Pozycja karty</th><th class="num">Zmiana</th><th>Rodzaj</th></tr></thead>
      <tbody>
        ${filtered.slice(0, limit).map((h, i) => {
          const fi = findItem(t.cards[h.d], h.i);
          const neg = fi?.item.kind === 'minus';
          const show = (x) => (x == null ? '∅' : neg && x ? '−' + fmt(x) : fmt(x));
          return html`<tr key=${i} class=${h.f != null ? 'corr' : ''}>
            <td class="mono">${fmtStamp(h.ts)}</td>
            <td>${name(t.judges, h.j)}</td>
            <td>${name(t.contestants, h.c)}</td>
            ${t.type === 'final' ? html`<td><${DiscBadge} disc=${h.d} small /></td>` : null}
            <td><span class="muted small">${fi?.cat.name || ''} › </span>${fi?.item.label || 'usunięta pozycja'}</td>
            <td class="num chg">${h.f != null ? html`<s>${show(h.f)}</s> → ` : null}<b>${show(h.t)}</b></td>
            <td>${h.f != null ? html`<span class="badge warn">Korekta</span>` : html`<span class="muted small">wpis</span>`}</td>
          </tr>`;
        })}
      </tbody>
    </table></div>
    ${filtered.length > limit ? html`<button class="btn ghost add-row" onClick=${() => setLimit(limit + 300)}>Pokaż kolejne (${filtered.length - limit})</button>` : null}`}
  </div>`;
}

// ---------- głosy publiczności ----------

const VOTE_ITEM = { kind: 'plus', max: 10 };

function VoteCell({ value, onSet, label, mode }) {
  const [txt, setTxt] = useState(value == null ? '' : fmt(value));
  const [err, setErr] = useState(null);
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setTxt(value == null ? '' : fmt(value)); }, [value]);
  return html`<input type="text" inputmode="decimal" class=${'vote ' + (err ? 'invalid' : '')} value=${txt} aria-label=${label}
    title=${err || ''} aria-invalid=${err ? 'true' : 'false'}
    onFocus=${(e) => { focused.current = true; e.currentTarget.select(); }}
    onBlur=${() => { focused.current = false; const r = parseScore(txt, VOTE_ITEM, mode); if (!r.ok) setErr(r.error); else setTxt(r.value == null ? '' : fmt(r.value)); }}
    onKeyDown=${(e) => { if (e.key === 'Enter') { e.preventDefault(); const all = [...document.querySelectorAll('input.vote')]; all[all.indexOf(e.currentTarget) + 1]?.focus(); } }}
    onInput=${(e) => {
      const v = e.currentTarget.value;
      setTxt(v);
      const r = parseScore(v, VOTE_ITEM, mode);
      if (r.ok) { setErr(null); if (r.value !== value) onSet(r.value); }
      else if (r.immediate || err) setErr(r.error.replace('Wpisz liczbę bez minusa — punkty karne system odejmie sam.', 'Ocena nie może być ujemna.'));
    }} />`;
}

function AudienceTab({ t }) {
  const discs = disciplinesOf(t);
  const [disc, setDisc] = useState(discs[0]);
  const n = t.audienceSize || 12;
  const list = orderedContestants(t, disc);
  const votes = (cid) => t.audience?.[disc]?.[cid] || [];
  const setVote = (cid, i, v) => updateT(t.id, (x) => {
    x.audience ||= {};
    x.audience[disc] ||= {};
    const arr = (x.audience[disc][cid] ||= Array(n).fill(null));
    arr[i] = v;
  });
  const ranked = list.map((c) => ({ c, s: audienceStats(votes(c.id)) })).filter((x) => x.s.sum != null)
    .sort((a, b) => b.s.sum - a.s.sum);
  return html`<div class="page">
    <div class="page-head"><h1>Głosy publiczności</h1>
      <p class="muted">Głosuje ${n} wylosowanych osób, skala 0–10. Odrzucamy jedną najwyższą i jedną najniższą ocenę. Punkty publiczności nie liczą się do wyniku turnieju — wyłaniają laureata Nagrody Publiczności.</p></div>
    ${discs.length > 1 ? html`<div class="toolbar"><${Segmented} label="Konkurencja" value=${disc} onChange=${setDisc} options=${discOptions(t)} /></div>` : null}
    <div class="aud-layout">
      <aside class="panel aud-side">
        <h3><${Icon} name="trophy" size=${16} />Nagroda Publiczności</h3>
        ${!ranked.length ? html`<p class="muted small">Brak głosów.</p>` : html`<ol class="aud-rank">
          ${ranked.slice(0, 5).map((x, i) => html`<li key=${x.c.id} class=${i === 0 ? 'lead' : ''}><span class="pos">${i + 1}.</span><${Avatar} c=${x.c} size=${30} /><span class="nm">${fullName(x.c)}</span><b>${fmt(x.s.sum)}</b></li>`)}
        </ol>`}
      </aside>
      <div class="table-wrap"><table class="audience">
        <thead><tr><th>Zawodnik</th>${Array.from({ length: n }, (_, i) => html`<th class="num" key=${i}>${i + 1}</th>`)}<th class="num">Odrzucone</th><th class="num total-col">Suma</th></tr></thead>
        <tbody>
          ${list.map((c) => {
            const v = votes(c.id);
            const s = audienceStats(v);
            return html`<tr key=${c.id}>
              <th scope="row"><div class="who"><${Avatar} c=${c} size=${28} /><b>${fullName(c)}</b></div></th>
              ${Array.from({ length: n }, (_, i) => html`<td key=${i}><${VoteCell} value=${v[i] ?? null} mode=${t.decimalMode}
                label=${`${fullName(c)}, głos ${i + 1}`} onSet=${(x) => setVote(c.id, i, x)} /></td>`)}
              <td class="num muted small">${s.sum != null ? `${fmt(s.low)} / ${fmt(s.high)}` : ''}</td>
              <td class="num total-col"><b>${s.sum != null ? fmt(s.sum) : '—'}</b>${s.count && s.count < n ? html`<small class="warn-text">${s.count}/${n}</small>` : null}</td>
            </tr>`;
          })}
        </tbody>
      </table></div>

    </div>
  </div>`;
}

// ---------- ustawienia ----------

function SettingsTab({ t, go }) {
  const update = (fn) => updateT(t.id, fn);
  const field = (k) => (e) => update((x) => (x[k] = e.currentTarget.value));
  const del = () => {
    if (!confirm(`Usunąć turniej „${t.name}” razem ze wszystkimi ocenami? Tej operacji nie można cofnąć (chyba że z kopii zapasowej).`)) return;
    deleteTournament(t.id);
    go('#/s');
    toast('Turniej usunięty');
  };
  return html`<div class="page narrow">
    <div class="page-head"><h1>Ustawienia turnieju</h1></div>

    <section class="panel form">
      <h3>Dane podstawowe</h3>
      <div class="form-grid">
        <label class="span2">Nazwa turnieju<input type="text" value=${t.name} onInput=${field('name')} /></label>
        <label>Rodzaj<input type="text" value=${TYPES[t.type].long} disabled /></label>
        <label>Miejsce<input type="text" value=${t.place || ''} onInput=${field('place')} /></label>
        <label>Od<input type="date" value=${t.dateFrom || ''} onInput=${field('dateFrom')} /></label>
        <label>Do<input type="date" value=${t.dateTo || ''} onInput=${field('dateTo')} /></label>
      </div>
    </section>

    <section class="panel form">
      <h3>Status turnieju</h3>
      <div class="radio-cards">
        ${Object.entries(STATUS).map(([k, s]) => html`<label class=${'radio-card ' + (t.status === k ? 'on' : '')} key=${k}>
          <input type="radio" name="status" checked=${t.status === k} onChange=${() => update((x) => (x.status = k))} />
          <b><${StatusBadge} status=${k} /></b><span class="muted small">${s.hint}</span></label>`)}
      </div>
    </section>

    <section class="panel form">
      <h3>Zasady oceniania</h3>
      <div class="form-grid">
        <label>Sędziów oceniających jedną ceremonię<input type="number" min="1" max="15" value=${t.panelSize}
          onInput=${(e) => { const n = parseInt(e.currentTarget.value, 10); if (n > 0) update((x) => (x.panelSize = n)); }} />
          <small class="muted">Jeśli kart jest więcej, wyniki pokażą ostrzeżenie do rozstrzygnięcia.</small></label>
        <label>Liczba głosujących z publiczności<input type="number" min="3" max="30" value=${t.audienceSize || 12}
          onInput=${(e) => { const n = parseInt(e.currentTarget.value, 10); if (n >= 3) update((x) => (x.audienceSize = n)); }} /></label>
      </div>
      <fieldset class="radio-cards">
        <legend>Separator dziesiętny w kartach sędziów</legend>
        <label class=${'radio-card ' + (t.decimalMode !== 'comma' ? 'on' : '')}><input type="radio" name="dec" checked=${t.decimalMode !== 'comma'} onChange=${() => update((x) => (x.decimalMode = 'both'))} />
          <b>Przecinek i kropka (zalecane)</b><span class="muted small">„1,3” i „1.3” to zawsze 1,3 pkt — sędzia nie musi niczego poprawiać.</span></label>
        <label class=${'radio-card ' + (t.decimalMode === 'comma' ? 'on' : '')}><input type="radio" name="dec" checked=${t.decimalMode === 'comma'} onChange=${() => update((x) => (x.decimalMode = 'comma'))} />
          <b>Tylko przecinek</b><span class="muted small">Wpis z kropką zostanie odrzucony z prośbą o poprawkę.</span></label>
      </fieldset>
    </section>

    <section class="panel form">
      <h3>Eksport i kopie</h3>
      <div class="row-actions left">
        <button class="btn" onClick=${() => resultsCSV(t, t.type === 'final' ? 'all' : t.type)}><${Icon} name="download" />Wyniki (CSV)</button>
        <button class="btn" onClick=${() => backupWorkbook([t], `${t.name}_${stamp()}.xlsx`).catch(() => toast('Nie udało się przygotować pliku Excel', 'err'))}><${Icon} name="download" />Turniej w Excelu</button>
        <button class="btn" onClick=${() => go('#/s/system')}><${Icon} name="key" />Kopie zapasowe i przywracanie</button>
      </div>
    </section>

    <section class="panel form danger-zone">
      <h3>Usunięcie turnieju</h3>
      <p class="muted small">Usuwa turniej, zawodników, kody sędziów, wszystkie karty i historię.</p>
      <div class="row-actions left"><button class="btn danger" onClick=${del}><${Icon} name="trash" />Usuń turniej</button></div>
    </section>
  </div>`;
}

// ---------- kod dostępu i kopie zapasowe ----------

const KIND_LABEL = { auto: 'automatyczna', manual: 'ręczna', 'before-restore': 'sprzed przywrócenia' };
const sizeLabel = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} kB`);
function nextHalfHour() {
  const d = new Date();
  if (d.getMinutes() >= 30) d.setHours(d.getHours() + 1);
  return `${String(d.getHours()).padStart(2, '0')}:30`;
}

function HandoverForm({ remote }) {
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [rep, setRep] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  if (!open) {
    return html`<div class="row-actions left"><button class="btn" onClick=${() => setOpen(true)}><${Icon} name="key" size=${16} />Przekaż dostęp…</button></div>`;
  }
  const submit = async (e) => {
    e.preventDefault();
    if (next.length < 8) return setErr('Kod do przekazania musi mieć co najmniej 8 znaków.');
    if (next !== rep) return setErr('Powtórzony kod nie jest taki sam.');
    if (next === cur) return setErr('Kod do przekazania musi być inny niż Twój obecny kod.');
    if (!confirm('Przekazać dostęp? Zostaniesz wylogowany, a Twój obecny kod przestanie działać. Do panelu wejdzie tylko osoba, która dostanie kod do przekazania.')) return;
    setBusy(true);
    try {
      await remote.handoverCode(cur, next);
      window.dispatchEvent(new CustomEvent('tts-handover-done'));
    } catch (x) {
      setErr(x.message);
      setBusy(false);
    }
  };
  const field = (setter) => (e) => { setter(e.currentTarget.value); setErr(null); };
  return html`<form class="code-form" onSubmit=${submit}>
    <label>Twój obecny kod<input type="password" autocomplete="current-password" value=${cur} onInput=${field(setCur)} /></label>
    <label>Kod dla następcy (min. 8 znaków)<input type="password" autocomplete="new-password" value=${next} onInput=${field(setNext)} /></label>
    <label>Powtórz kod dla następcy<input type="password" autocomplete="new-password" value=${rep} onInput=${field(setRep)} /></label>
    ${err ? html`<p class="err" role="alert"><${Icon} name="alert" size=${14} />${err}</p>` : null}
    <div class="row-actions left">
      <button class="btn primary" type="submit" disabled=${busy}><${Icon} name="key" size=${16} />${busy ? 'Przekazuję…' : 'Przekaż dostęp i wyloguj'}</button>
      <button class="btn ghost" type="button" onClick=${() => setOpen(false)} disabled=${busy}>Anuluj</button>
    </div>
  </form>`;
}

export function SystemPage({ go, remote, ChangeCodeForm }) {
  const [backups, setBackups] = useState(null);
  const [auto, setAuto] = useState(autoBackupEnabled());
  const [codeOpen, setCodeOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const who = LIVE && remote ? remote.getSessionInfo() : null;
  const live = store.get().tournaments.some((t) => t.status === 'live');

  const loadBackups = async () => {
    if (!LIVE || !remote) return;
    try {
      setBackups(await remote.listBackups());
    } catch (e) {
      toast(e.message, 'err');
      setBackups([]);
    }
  };
  useEffect(() => { loadBackups(); }, []);

  const run = async (key, fn) => {
    setBusy(key);
    try { await fn(); } catch (e) { console.error(e); toast(e.message || 'Operacja nie powiodła się', 'err'); } finally { setBusy(null); }
  };
  const nowXLSX = () => run('xlsx', () => backupWorkbook(store.get().tournaments));
  const nowJSON = () => downloadJSON(toSnapshot(store.get().tournaments));
  const make = () => run('make', async () => {
    const id = await remote.makeBackup();
    toast(id ? 'Kopia zapisana w bazie danych' : 'Brak turniejów do zapisania');
    await loadBackups();
  });
  const fetchBackup = (b, kind) => run(`${kind}${b.id}`, async () => {
    const d = await remote.getBackup(b.id);
    const name = `turniej-trzech-saun_kopia_${stamp(new Date(b.created_at))}`;
    if (kind === 'json') downloadJSON(d, `${name}.json`);
    else await backupWorkbook(fromSnapshot(d), `${name}.xlsx`);
  });
  const restore = (b) => {
    const when = new Date(b.created_at).toLocaleString('pl-PL');
    const msg = `Przywrócić stan systemu z ${when}? Wszystkie obecne turnieje i karty zostaną zastąpione zawartością kopii. Przed przywróceniem system sam zapisze kopię bieżącego stanu.`;
    if (!confirm(msg)) return;
    run(`r${b.id}`, async () => {
      await remote.restoreBackup(b.id);
      toast('Przywrócono stan z kopii');
      await loadBackups();
    });
  };
  const restoreFile = (file) => {
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => run('file', async () => {
      let data;
      try { data = JSON.parse(fr.result); } catch (_) { throw new Error('Plik nie jest kopią zapasową systemu (JSON).'); }
      const list = fromSnapshot(data);
      if (!confirm(`Wczytać kopię z pliku (turnieje: ${list.length})? Obecne dane zostaną zastąpione.`)) return;
      if (LIVE) {
        await remote.restoreSnapshot(data.format === 'tts-backup-1' ? data : toSnapshot(list));
        await loadBackups();
      } else {
        store.replace({ ...store.get(), tournaments: list });
      }
      toast('Dane wczytane z pliku');
      go('#/s');
    });
    fr.readAsText(file);
  };
  const toggleAuto = (on) => { setAutoBackup(on); setAuto(on); };
  const last = lastAutoBackup();

  return html`<div class="page narrow">
    <div class="page-head row"><div><h1>Kod dostępu i kopie zapasowe</h1>
      <p class="muted">Zabezpieczenia na wypadek awarii internetu, przeglądarki albo bazy danych.</p></div>
      <button class="btn ghost" onClick=${() => go('#/s')}><${Icon} name="chevron-left" />Turnieje</button></div>

    <section class="panel form">
      <h3><${Icon} name="key" size=${17} />Kod dostępu supervisora</h3>
      ${LIVE ? html`
        <p>Kod ustawiony przez supervisora${who && who.codeChangedAt ? ` — ${new Date(who.codeChangedAt).toLocaleString('pl-PL', { dateStyle: 'long', timeStyle: 'short' })}` : ''}.
          Administrator systemu go nie zna i nie ma wglądu w dane turnieju.</p>
        <p class="muted small">Zmiana kodu wyloguje wszystkie inne urządzenia zalogowane jako supervisor.</p>
        ${codeOpen
          ? html`<${ChangeCodeForm} onDone=${() => setCodeOpen(false)} onCancel=${() => setCodeOpen(false)} />`
          : html`<div class="row-actions left"><button class="btn" onClick=${() => setCodeOpen(true)}><${Icon} name="pencil" size=${16} />Zmień kod</button></div>`}`
        : html`<p class="muted small">W wersji demonstracyjnej PIN supervisora to 2026. W wersji produkcyjnej administrator nadaje pierwszy kod, a supervisor przy pierwszym logowaniu ustawia własny — od tej chwili administrator nie ma dostępu do panelu.</p>`}
    </section>

    <section class="panel form handover">
      <h3><${Icon} name="users" size=${17} />Przekaż dostęp kolejnemu supervisorowi</h3>
      <p>Po turnieju ustaw kod dla następcy i przekaż go organizatorowi. Kolejny supervisor przy pierwszym logowaniu będzie musiał ustawić własny kod —
        dopóki tego nie zrobi, z kodem przekazanym nie widać żadnych danych.</p>
      <ol class="steps-list small">
        <li>System zapisze kopię zapasową całego stanu.</li>
        <li>Twój dotychczasowy kod przestanie działać, a wszystkie urządzenia supervisora zostaną wylogowane — także to.</li>
        <li>Kod do przekazania działa tylko do chwili, gdy następca ustawi własny.</li>
      </ol>
      ${LIVE ? html`<${HandoverForm} remote=${remote} />`
        : html`<p class="muted small">W wersji demonstracyjnej przekazanie dostępu jest wyłączone — działa w wersji produkcyjnej.</p>`}
    </section>

    <section class="panel form">
      <h3><${Icon} name="download" size=${17} />Kopia na tym komputerze</h3>
      <label class="check big"><span class="switch"><input type="checkbox" checked=${auto} onChange=${(e) => toggleAuto(e.currentTarget.checked)} /><span></span></span>
        Zapisuj kopię automatycznie co godzinę o :30 (11:30, 12:30, 13:30…)</label>
      <p class="muted small">Działa, gdy trwa turniej i panel supervisora jest otwarty. Przeglądarka zapisze w folderze „Pobrane” dwa pliki:
        Excel (wyniki, wszystkie karty i historia zmian — do czytania) oraz JSON (do przywrócenia systemu). Przy pierwszej kopii przeglądarka może zapytać o zgodę na pobieranie wielu plików — zezwól.</p>
      <p class="small">${auto ? (live ? html`Następna kopia: <b>${nextHalfHour()}</b>` : 'Żaden turniej nie trwa — kopie ruszą po otwarciu turnieju.') : 'Automatyczne kopie są wyłączone.'}
        ${last ? ` · ostatnia: ${last.replace('_', ' ').replace(/-(\d\d)$/, ':$1')}` : ''}</p>
      <div class="row-actions left">
        <button class="btn" onClick=${nowXLSX} disabled=${busy === 'xlsx'}><${Icon} name="download" />Pobierz teraz — Excel</button>
        <button class="btn" onClick=${nowJSON}><${Icon} name="file-json" />Pobierz teraz — JSON</button>
      </div>
    </section>

    ${LIVE ? html`<section class="panel form">
      <h3><${Icon} name="history" size=${17} />Kopie w bazie danych</h3>
      <p class="muted small">Baza zapisuje kopię całego systemu co godzinę o :30, jeśli od poprzedniej coś się zmieniło. Kopie automatyczne są przechowywane przez tydzień, ręczne — na stałe.</p>
      <div class="row-actions left">
        <button class="btn primary" onClick=${make} disabled=${busy === 'make'}><${Icon} name="check" />${busy === 'make' ? 'Zapisuję…' : 'Zrób kopię teraz'}</button>
        <button class="btn ghost" onClick=${loadBackups}><${Icon} name="refresh" size=${16} />Odśwież listę</button>
      </div>
      ${backups == null ? html`<p class="muted small">Wczytywanie listy…</p>` : !backups.length ? html`<p class="empty-line">Brak kopii — pierwsza powstanie automatycznie o najbliższej :30 albo po kliknięciu „Zrób kopię teraz”.</p>` : html`
      <div class="table-wrap"><table class="history backups">
        <thead><tr><th>Data i godzina</th><th>Rodzaj</th><th class="num">Turnieje</th><th class="num">Karty</th><th class="num">Rozmiar</th><th class="w-act"><span class="sr">Akcje</span></th></tr></thead>
        <tbody>${backups.map((b) => html`<tr key=${b.id}>
          <td class="mono">${new Date(b.created_at).toLocaleString('pl-PL')}</td>
          <td>${KIND_LABEL[b.kind] || b.kind}</td>
          <td class="num">${b.tournaments}</td><td class="num">${b.entries}</td><td class="num">${sizeLabel(b.size_bytes || 0)}</td>
          <td class="w-act">
            <button class="btn sm" onClick=${() => fetchBackup(b, 'xlsx')} disabled=${!!busy}>Excel</button>
            <button class="btn sm" onClick=${() => fetchBackup(b, 'json')} disabled=${!!busy}>JSON</button>
            <button class="btn sm danger" onClick=${() => restore(b)} disabled=${!!busy}>Przywróć</button>
          </td></tr>`)}</tbody>
      </table></div>`}
    </section>` : null}

    <section class="panel form">
      <h3><${Icon} name="upload" size=${17} />Przywróć z pliku</h3>
      <p class="muted small">Wczytaj plik JSON z kopii (np. zapisanej automatycznie na tym komputerze). Obecne dane zostaną zastąpione${LIVE ? ', a system wcześniej sam zapisze kopię bieżącego stanu' : ''}.</p>
      <div class="row-actions left">
        <label class="btn"><${Icon} name="upload" />Wybierz plik kopii (.json)<input type="file" accept="application/json,.json" class="sr" onChange=${(e) => restoreFile(e.currentTarget.files[0])} /></label>
      </div>
    </section>

    <section class="panel safety">
      <h3><${Icon} name="info" size=${17} />Co się dzieje przy awarii</h3>
      <ul>
        <li><b>Brak internetu u sędziego:</b> oceny zapisują się w jego przeglądarce i wysyłają same, gdy połączenie wróci. Pasek u góry pokazuje, ile zmian czeka.</li>
        <li><b>Po każdym seansie</b> sędzia może pobrać swoją kartę do PDF (z miejscem na podpis) albo do Excela.</li>
        <li><b>Co godzinę o :30</b> baza zapisuje kopię całego systemu, a komputer supervisora — pliki Excel i JSON.</li>
        <li><b>Awaria bazy:</b> po jej przywróceniu wczytaj ostatnią kopię (z bazy albo z pliku) — oceny, które nie zdążyły się wysłać, dośle przeglądarka sędziego.</li>
      </ul>
    </section>
  </div>`;
}
