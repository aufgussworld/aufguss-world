// Edytory wspólne dla kreatora „Nowy turniej” i ustawień istniejącego turnieju.
// Każdy dostaje obiekt turnieju `t` oraz `update(fn)`, które modyfikuje szkic albo zapisany turniej.

import { html, useState } from './lib.js';
import {
  DISCIPLINES, FINAL_ORDER, disciplinesOf, fullName, uid, genCode, prettyCode, fmt, fmtDate,
  addDays, addMinutes, cardMax, categoryMax, disciplineResults, plural,
} from './model.js';
import { defaultCard } from './templates.js';
import { store } from './store.js';
import { Icon, Avatar, Segmented, DiscBadge, readPhoto, toast } from './ui.js';

const shuffle = (a) => {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
};

export function ensureOrder(t) {
  t.order ||= {};
  for (const d of disciplinesOf(t)) {
    const ids = t.contestants.map((c) => c.id);
    const cur = (t.order[d] || []).filter((id) => ids.includes(id));
    ids.forEach((id) => !cur.includes(id) && cur.push(id));
    t.order[d] = cur;
  }
}

export const newContestant = () => ({ id: uid('c'), first: '', last: '', photo: null, start: {} });

export function hasScores(t, cid) {
  return Object.values(t.scores || {}).some((byC) => byC[cid] && Object.keys(byC[cid]).length);
}

function Stepper({ label, value, min = 0, max = 60, onChange, id }) {
  return html`<div class="stepper">
    <label for=${id}>${label}</label>
    <div class="stepper-ctl">
      <button type="button" class="btn icon" aria-label="Mniej" disabled=${value <= min} onClick=${() => onChange(value - 1)}><${Icon} name="minus" /></button>
      <input id=${id} type="text" inputmode="numeric" value=${value}
        onChange=${(e) => { const n = parseInt(e.currentTarget.value, 10); if (!isNaN(n)) onChange(Math.max(min, Math.min(max, n))); }} />
      <button type="button" class="btn icon" aria-label="Więcej" disabled=${value >= max} onClick=${() => onChange(value + 1)}><${Icon} name="plus" /></button>
    </div>
  </div>`;
}

// ---------- zawodnicy i harmonogram ----------

function SchedulePanel({ t, disc, update, onClose }) {
  const n = t.contestants.length;
  const [d1, setD1] = useState(t.type === 'final' ? addDays(t.dateFrom, FINAL_ORDER.indexOf(disc)) : t.dateFrom);
  const [t1, setT1] = useState(t.type === 'final' ? '10:00' : '15:00');
  const [c1, setC1] = useState(t.type === 'final' || !t.dateTo || t.dateTo === t.dateFrom ? n : Math.ceil(n / 2));
  const [d2, setD2] = useState(t.dateTo || t.dateFrom);
  const [t2, setT2] = useState('11:00');
  const [step, setStep] = useState(t.type === 'final' ? 45 : 60);
  const apply = () => {
    update((x) => {
      ensureOrder(x);
      x.order[disc].forEach((cid, i) => {
        const c = x.contestants.find((y) => y.id === cid);
        c.start ||= {};
        c.start[disc] = i < c1 ? { date: d1, time: addMinutes(t1, i * step) } : { date: d2, time: addMinutes(t2, (i - c1) * step) };
      });
    });
    toast('Godziny startów rozpisane według kolejności');
    onClose();
  };
  return html`<div class="panel schedule-panel">
    <h3><${Icon} name="clock" size=${16} />Rozpisz godziny według kolejności startowej</h3>
    <div class="form-grid">
      <label>Pierwszy dzień<input type="date" value=${d1} onInput=${(e) => setD1(e.currentTarget.value)} /></label>
      <label>Pierwszy start<input type="time" value=${t1} onInput=${(e) => setT1(e.currentTarget.value)} /></label>
      <label>Startów tego dnia<input type="number" min="0" max=${n} value=${c1} onInput=${(e) => setC1(Math.max(0, Math.min(n, parseInt(e.currentTarget.value || '0', 10))))} /></label>
      <label>Odstęp między startami (min)<input type="number" min="5" step="5" value=${step} onInput=${(e) => setStep(parseInt(e.currentTarget.value || '60', 10))} /></label>
      ${c1 < n ? html`
        <label>Drugi dzień<input type="date" value=${d2} onInput=${(e) => setD2(e.currentTarget.value)} /></label>
        <label>Pierwszy start drugiego dnia<input type="time" value=${t2} onInput=${(e) => setT2(e.currentTarget.value)} /></label>` : null}
    </div>
    <div class="row-actions">
      <button class="btn ghost" onClick=${onClose}>Anuluj</button>
      <button class="btn primary" onClick=${apply}><${Icon} name="check" />Rozpisz ${n} startów</button>
    </div>
  </div>`;
}

export function ContestantsEditor({ t, update, mode = 'full', countStepper = false }) {
  const discs = disciplinesOf(t);
  const [disc, setDisc] = useState(discs[0]);
  const [panel, setPanel] = useState(false);
  const showNames = mode !== 'schedule';
  const showSchedule = mode !== 'names';
  const order = (t.order && t.order[disc]) || t.contestants.map((c) => c.id);
  const rows = showSchedule
    ? order.map((id) => t.contestants.find((c) => c.id === id)).filter(Boolean)
    : t.contestants;

  const setCount = (n) => update((x) => {
    while (x.contestants.length < n) x.contestants.push(newContestant());
    while (x.contestants.length > n) {
      const last = x.contestants[x.contestants.length - 1];
      if ((last.first || last.last) && !confirm(`Usunąć zawodnika ${fullName(last)}?`)) break;
      x.contestants.pop();
    }
    ensureOrder(x);
  });
  const add = () => update((x) => { x.contestants.push(newContestant()); ensureOrder(x); });
  const remove = (c) => {
    if (hasScores(t, c.id) && !confirm(`${fullName(c)} ma już oceny. Usunąć razem z ocenami?`)) return;
    if (!hasScores(t, c.id) && (c.first || c.last) && !confirm(`Usunąć zawodnika ${fullName(c)}?`)) return;
    update((x) => {
      x.contestants = x.contestants.filter((y) => y.id !== c.id);
      ensureOrder(x);
    });
  };
  const setField = (cid, field, value) => update((x) => { x.contestants.find((y) => y.id === cid)[field] = value; });
  const setStart = (cid, field, value) => update((x) => {
    const c = x.contestants.find((y) => y.id === cid);
    c.start ||= {};
    c.start[disc] = { ...(c.start[disc] || {}), [field]: value };
  });
  const move = (cid, dir) => update((x) => {
    ensureOrder(x);
    const o = x.order[disc];
    const i = o.indexOf(cid);
    const j = i + dir;
    if (j < 0 || j >= o.length) return;
    [o[i], o[j]] = [o[j], o[i]];
  });
  const draw = () => {
    if (!confirm('Wylosować nową kolejność startową? Obecna kolejność zostanie zastąpiona.')) return;
    update((x) => {
      ensureOrder(x);
      x.order[disc] = shuffle(x.order[disc]);
    });
    toast('Kolejność wylosowana. Teraz rozpisz godziny startów.');
    setPanel(true);
  };
  const onPhoto = async (cid, file) => {
    if (!file) return;
    try {
      const data = await readPhoto(file);
      setField(cid, 'photo', data);
    } catch (_) {
      toast('Nie udało się wczytać zdjęcia', 'err');
    }
  };

  return html`<div class="editor contestants-editor">
    <div class="toolbar">
      ${countStepper && showNames ? html`<${Stepper} id="cnt-c" label="Liczba zawodników" value=${t.contestants.length} min=${0} max=${40} onChange=${setCount} />` : null}
      ${showSchedule && discs.length > 1 ? html`<${Segmented} label="Konkurencja" value=${disc} onChange=${(d) => { setDisc(d); setPanel(false); }}
        options=${discs.map((d) => ({ value: d, label: DISCIPLINES[d].label, icon: DISCIPLINES[d].icon, disc: d }))} />` : null}
      <span class="grow"></span>
      ${showSchedule ? html`
        <button class="btn" onClick=${draw} disabled=${t.contestants.length < 2}><${Icon} name="shuffle" />Losuj kolejność</button>
        <button class="btn" onClick=${() => setPanel(!panel)} disabled=${!t.contestants.length}><${Icon} name="clock" />Rozpisz godziny</button>` : null}
      ${!countStepper && showNames ? html`<button class="btn primary" onClick=${add}><${Icon} name="plus" />Dodaj zawodnika</button>` : null}
    </div>
    ${panel && showSchedule ? html`<${SchedulePanel} t=${t} disc=${disc} update=${update} onClose=${() => setPanel(false)} />` : null}
    ${!rows.length ? html`<p class="empty-line">Brak zawodników. ${countStepper ? 'Ustaw liczbę zawodników powyżej.' : 'Dodaj pierwszego zawodnika.'}</p>` : html`
    <div class="table-wrap"><table class="edit-table">
      <thead><tr>
        ${showSchedule ? html`<th class="w-nr">Nr</th>` : html`<th class="w-nr">Lp.</th>`}
        <th class="w-photo">Zdjęcie</th>
        <th>Imię</th><th>Nazwisko</th>
        ${showSchedule ? html`<th class="w-date">Dzień startu</th><th class="w-time">Godzina</th>` : null}
        <th class="w-act"><span class="sr">Akcje</span></th>
      </tr></thead>
      <tbody>
        ${rows.map((c, i) => html`<tr key=${c.id}>
          <td class="w-nr num">${i + 1}</td>
          <td class="w-photo">
            <label class="photo-btn" title="Wgraj zdjęcie">
              <${Avatar} c=${c} size=${40} />
              <span class="photo-ov"><${Icon} name="camera" size=${15} /></span>
              <input type="file" accept="image/*" class="sr" onChange=${(e) => onPhoto(c.id, e.currentTarget.files[0])} aria-label=${'Zdjęcie: ' + fullName(c)} />
            </label>
            ${c.photo ? html`<button class="link-btn xs" onClick=${() => setField(c.id, 'photo', null)}>usuń</button>` : null}
          </td>
          <td>${showNames ? html`<input type="text" value=${c.first} placeholder="Imię" aria-label="Imię" onInput=${(e) => setField(c.id, 'first', e.currentTarget.value)} />` : c.first}</td>
          <td>${showNames ? html`<input type="text" value=${c.last} placeholder="Nazwisko" aria-label="Nazwisko" onInput=${(e) => setField(c.id, 'last', e.currentTarget.value)} />` : c.last}</td>
          ${showSchedule ? html`
            <td class="w-date"><input type="date" value=${c.start?.[disc]?.date || ''} aria-label="Dzień startu" onInput=${(e) => setStart(c.id, 'date', e.currentTarget.value)} /></td>
            <td class="w-time"><input type="time" value=${c.start?.[disc]?.time || ''} aria-label="Godzina startu" onInput=${(e) => setStart(c.id, 'time', e.currentTarget.value)} /></td>` : null}
          <td class="w-act">
            ${showSchedule ? html`
              <button class="btn icon ghost sm" aria-label="Wyżej" disabled=${i === 0} onClick=${() => move(c.id, -1)}><${Icon} name="arrow-up" size=${16} /></button>
              <button class="btn icon ghost sm" aria-label="Niżej" disabled=${i === rows.length - 1} onClick=${() => move(c.id, 1)}><${Icon} name="arrow-down" size=${16} /></button>` : null}
            ${showNames ? html`<button class="btn icon ghost sm danger" aria-label=${'Usuń ' + fullName(c)} onClick=${() => remove(c)}><${Icon} name="trash" size=${16} /></button>` : null}
          </td>
        </tr>`)}
      </tbody>
    </table></div>`}
    ${countStepper && showNames && t.contestants.length ? html`<button class="btn ghost add-row" onClick=${add}><${Icon} name="plus" />Dodaj kolejnego zawodnika</button>` : null}
  </div>`;
}

// Finał: import czołówki z turniejów eliminacyjnych zapisanych w aplikacji.
export function QualifierImport({ t, update }) {
  const quals = store.get().tournaments.filter((x) => x.type !== 'final').sort((a, b) => (b.dateFrom || '').localeCompare(a.dateFrom || ''));
  const existing = new Set(t.contestants.map((c) => fullName(c).toLowerCase()));
  const [picked, setPicked] = useState(() => {
    const s = new Set();
    quals.slice(0, 3).forEach((q) => disciplineResults(q, q.type).filter((r) => r.rank && r.rank <= 5).forEach((r) => s.add(`${q.id}|${r.c.id}`)));
    return s;
  });
  if (!quals.length) return null;
  const toggle = (k) => {
    const s = new Set(picked);
    s.has(k) ? s.delete(k) : s.add(k);
    setPicked(s);
  };
  const doImport = () => {
    let added = 0;
    update((x) => {
      const names = new Set(x.contestants.map((c) => fullName(c).toLowerCase()));
      x.contestants = x.contestants.filter((c) => c.first || c.last);
      for (const q of quals) {
        for (const c of q.contestants) {
          if (!picked.has(`${q.id}|${c.id}`)) continue;
          const key = fullName(c).toLowerCase();
          if (names.has(key)) continue;
          names.add(key);
          x.contestants.push({ id: uid('c'), first: c.first, last: c.last, photo: c.photo || null, start: {} });
          added++;
        }
      }
      ensureOrder(x);
    });
    toast(added ? `Dodano ${added} zawodników z eliminacji` : 'Zaznaczeni zawodnicy są już na liście');
  };
  return html`<details class="panel import-panel" open=${t.contestants.filter((c) => c.first || c.last).length === 0}>
    <summary><${Icon} name="trophy" size=${16} />Importuj czołówkę turniejów eliminacyjnych</summary>
    <p class="muted">Zaznaczono miejsca 1–5 (z remisami na 5. miejscu). Możesz dodać też dalsze miejsca — decyzja należy do organizatora. Osoby z dwóch turniejów dodadzą się raz.</p>
    <div class="import-grid">
      ${quals.map((q) => html`<div class="import-col" key=${q.id}>
        <h4><${DiscBadge} disc=${q.type} small />${q.name}</h4>
        <ul>
          ${disciplineResults(q, q.type).filter((r) => r.rank && r.rank <= 8).map((r) => {
            const k = `${q.id}|${r.c.id}`;
            const dup = existing.has(r.name.toLowerCase());
            return html`<li key=${k}><label class=${'check ' + (dup ? 'dim' : '')}>
              <input type="checkbox" checked=${picked.has(k)} disabled=${dup} onChange=${() => toggle(k)} />
              <span class="pos">${r.rank}.</span>${r.name}<span class="muted">${fmt(r.total, true)}</span>${dup ? html`<small>na liście</small>` : null}
            </label></li>`;
          })}
        </ul>
      </div>`)}
    </div>
    <div class="row-actions"><button class="btn primary" onClick=${doImport}><${Icon} name="download" />Dodaj zaznaczonych</button></div>
  </details>`;
}

// ---------- sędziowie ----------

export function allCodes(except) {
  const s = new Set();
  store.get().tournaments.forEach((t) => t.judges.forEach((j) => j !== except && s.add(j.code)));
  return s;
}

export function printCodes(t) {
  const w = window.open('', '_blank');
  if (!w) return toast('Przeglądarka zablokowała okno wydruku', 'err');
  const url = location.href.split('#')[0];
  const rows = t.judges.map((j) => `<div class="c"><p class="n">${fullName(j)}</p><p class="k">${prettyCode(j.code)}</p><p class="u">${t.name}<br>Zaloguj się: ${url}</p></div>`).join('');
  w.document.write(`<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>Kody sędziów — ${t.name}</title>
    <style>body{font-family:system-ui,sans-serif;margin:24px}.g{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .c{border:1.5px dashed #999;border-radius:10px;padding:18px 20px;break-inside:avoid}.n{font-size:18px;font-weight:600;margin:0 0 8px}
    .k{font:600 34px/1.1 ui-monospace,monospace;letter-spacing:.12em;margin:0 0 10px}.u{font-size:12px;color:#555;margin:0}</style></head>
    <body><h1 style="font-size:20px">Kody logowania sędziów — ${t.name}</h1><div class="g">${rows}</div>
    <script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
}

export function JudgesEditor({ t, update, countStepper = false }) {
  const newJudge = (x) => {
    const taken = allCodes();
    x.judges.forEach((j) => taken.add(j.code));
    return { id: uid('j'), first: '', last: '', code: genCode(taken) };
  };
  const setCount = (n) => update((x) => {
    while (x.judges.length < n) x.judges.push(newJudge(x));
    while (x.judges.length > n) {
      const last = x.judges[x.judges.length - 1];
      if ((last.first || last.last) && !confirm(`Usunąć sędziego ${fullName(last)}?`)) break;
      x.judges.pop();
    }
  });
  const judgeHasScores = (jid) => Object.values(t.scores || {}).some((byC) => Object.values(byC).some((byJ) => byJ[jid]));
  const remove = (j) => {
    const msg = judgeHasScores(j.id) ? `${fullName(j)} ma już wystawione oceny. Usunąć sędziego razem z jego kartami?` : `Usunąć sędziego ${fullName(j)}?`;
    if ((j.first || j.last || judgeHasScores(j.id)) && !confirm(msg)) return;
    update((x) => { x.judges = x.judges.filter((y) => y.id !== j.id); });
  };
  const setField = (jid, f, v) => update((x) => { x.judges.find((y) => y.id === jid)[f] = v; });
  const regen = (j) => {
    if (!confirm(`Wygenerować nowy kod dla: ${fullName(j)}? Stary kod przestanie działać.`)) return;
    const taken = allCodes();
    t.judges.forEach((y) => taken.add(y.code));
    setField(j.id, 'code', genCode(taken));
  };
  const copy = async (j) => {
    try {
      await navigator.clipboard.writeText(j.code);
      toast(`Skopiowano kod: ${prettyCode(j.code)}`);
    } catch (_) {
      toast('Nie udało się skopiować', 'err');
    }
  };
  return html`<div class="editor judges-editor">
    <div class="toolbar">
      ${countStepper ? html`<${Stepper} id="cnt-j" label="Liczba sędziów" value=${t.judges.length} min=${0} max=${15} onChange=${setCount} />` : null}
      <span class="grow"></span>
      ${t.judges.length ? html`<button class="btn" onClick=${() => printCodes(t)}><${Icon} name="printer" />Drukuj kody</button>` : null}
      ${!countStepper ? html`<button class="btn primary" onClick=${() => update((x) => x.judges.push(newJudge(x)))}><${Icon} name="plus" />Dodaj sędziego</button>` : null}
    </div>
    ${!t.judges.length ? html`<p class="empty-line">Brak sędziów.</p>` : html`
    <div class="table-wrap"><table class="edit-table">
      <thead><tr><th class="w-nr">Lp.</th><th>Imię</th><th>Nazwisko</th><th>Kod logowania</th><th class="w-act"><span class="sr">Akcje</span></th></tr></thead>
      <tbody>
        ${t.judges.map((j, i) => html`<tr key=${j.id}>
          <td class="w-nr num">${i + 1}</td>
          <td><input type="text" value=${j.first} placeholder="Imię" aria-label="Imię sędziego" onInput=${(e) => setField(j.id, 'first', e.currentTarget.value)} /></td>
          <td><input type="text" value=${j.last} placeholder="Nazwisko" aria-label="Nazwisko sędziego" onInput=${(e) => setField(j.id, 'last', e.currentTarget.value)} /></td>
          <td><span class="code">${prettyCode(j.code)}</span>
            <button class="btn icon ghost sm" aria-label="Kopiuj kod" onClick=${() => copy(j)}><${Icon} name="copy" size=${15} /></button>
            <button class="btn icon ghost sm" aria-label="Nowy kod" onClick=${() => regen(j)}><${Icon} name="refresh" size=${15} /></button></td>
          <td class="w-act"><button class="btn icon ghost sm danger" aria-label=${'Usuń ' + fullName(j)} onClick=${() => remove(j)}><${Icon} name="trash" size=${16} /></button></td>
        </tr>`)}
      </tbody>
    </table></div>`}
    ${countStepper && t.judges.length ? html`<button class="btn ghost add-row" onClick=${() => update((x) => x.judges.push(newJudge(x)))}><${Icon} name="plus" />Dodaj kolejnego sędziego</button>` : null}
    <p class="muted small"><${Icon} name="key" size=${13} /> Kod działa tylko w tym turnieju. Sędzia wpisuje go na ekranie logowania — bez hasła i zakładania konta.</p>
  </div>`;
}

// ---------- karta oceny ----------

const KIND_LABEL = { plus: 'Punkty dodatnie', minus: 'Punkty karne (odejmowane)', bin: 'Tak / Nie (0 albo max)' };

function parseMax(s) {
  const m = String(s).replace(',', '.').trim();
  const n = Number(m);
  if (!m || isNaN(n) || n <= 0 || Math.round(n * 10) !== n * 10) return null;
  return n;
}

function MaxInput({ value, onSet }) {
  const [txt, setTxt] = useState(fmt(Math.round(value * 10)));
  const [bad, setBad] = useState(false);
  return html`<input type="text" inputmode="decimal" class=${'max-in ' + (bad ? 'invalid' : '')} value=${txt} aria-label="Maksymalna liczba punktów"
    onInput=${(e) => { const v = e.currentTarget.value; setTxt(v); const n = parseMax(v); setBad(n == null); if (n != null) onSet(n); }}
    onBlur=${() => { setTxt(fmt(Math.round(value * 10))); setBad(false); }} />`;
}

export function CardEditor({ t, update }) {
  const discs = disciplinesOf(t);
  const [disc, setDisc] = useState(discs[0]);
  const card = t.cards[disc];
  const scored = Object.keys(t.scores?.[disc] || {}).length > 0;
  const nItems = card.categories.reduce((a, c) => a + c.items.length, 0);
  const upd = (fn) => update((x) => fn(x.cards[disc]));
  const moveIn = (arr, i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  };
  const resetCard = () => {
    if (!confirm(`Przywrócić kartę wzorcową ${DISCIPLINES[disc].label}? Twoje zmiany w tej karcie zostaną utracone.`)) return;
    update((x) => { x.cards[disc] = defaultCard(disc); });
  };

  return html`<div class="editor card-editor">
    <div class="toolbar">
      ${discs.length > 1 ? html`<${Segmented} label="Karta konkurencji" value=${disc} onChange=${setDisc}
        options=${discs.map((d) => ({ value: d, label: DISCIPLINES[d].label, icon: DISCIPLINES[d].icon, disc: d }))} />` : html`<${DiscBadge} disc=${disc} />`}
      <span class="muted">Maks. <b>${fmt(cardMax(card))} pkt</b> · ${card.categories.length} ${plural(card.categories.length, 'kategoria', 'kategorie', 'kategorii')} · ${nItems} ${plural(nItems, 'pozycja', 'pozycje', 'pozycji')}</span>
      <span class="grow"></span>
      <label class="inline-field">Czas ceremonii<input type="text" value=${card.duration || ''} onInput=${(e) => upd((c) => (c.duration = e.currentTarget.value))} style="width:7.5em" /></label>
      <button class="btn ghost" onClick=${resetCard}><${Icon} name="undo" />Karta wzorcowa</button>
    </div>
    ${scored ? html`<div class="alert warn"><${Icon} name="alert" />Sędziowie wystawili już oceny na tej karcie. Zmiana zakresu lub usunięcie pozycji wpłynie na wyniki — zmieniaj ostrożnie.</div>` : null}
    ${card.categories.map((cat, ci) => html`<section class="ce-cat" key=${cat.id}>
      <header class="ce-cat-head">
        <span class="num">${ci + 1}</span>
        <input type="text" class="ce-cat-name" value=${cat.name} aria-label="Nazwa kategorii" onInput=${(e) => upd((c) => (c.categories[ci].name = e.currentTarget.value))} />
        <span class="muted small">maks. ${fmt(categoryMax(cat))} pkt</span>
        <span class="grow"></span>
        <button class="btn icon ghost sm" aria-label="Kategoria wyżej" disabled=${ci === 0} onClick=${() => upd((c) => moveIn(c.categories, ci, -1))}><${Icon} name="arrow-up" size=${16} /></button>
        <button class="btn icon ghost sm" aria-label="Kategoria niżej" disabled=${ci === card.categories.length - 1} onClick=${() => upd((c) => moveIn(c.categories, ci, 1))}><${Icon} name="arrow-down" size=${16} /></button>
        <button class="btn icon ghost sm danger" aria-label="Usuń kategorię" onClick=${() => confirm(`Usunąć kategorię „${cat.name}” ze wszystkimi pozycjami?`) && upd((c) => c.categories.splice(ci, 1))}><${Icon} name="trash" size=${16} /></button>
      </header>
      <div class="table-wrap"><table class="edit-table ce-items">
        <thead><tr><th class="w-nr">Lp.</th><th>Pozycja</th><th class="w-kind">Rodzaj punktów</th><th class="w-max">Maks.</th><th>Podpowiedź dla sędziego</th><th class="w-act"><span class="sr">Akcje</span></th></tr></thead>
        <tbody>
          ${cat.items.map((it, ii) => html`<tr key=${it.id} class=${'k-' + it.kind}>
            <td class="w-nr num">${ii + 1}</td>
            <td><input type="text" value=${it.label} aria-label="Nazwa pozycji" onInput=${(e) => upd((c) => (c.categories[ci].items[ii].label = e.currentTarget.value))} /></td>
            <td class="w-kind"><select value=${it.kind} aria-label="Rodzaj punktów" onChange=${(e) => upd((c) => (c.categories[ci].items[ii].kind = e.currentTarget.value))}>
              ${Object.entries(KIND_LABEL).map(([k, l]) => html`<option value=${k}>${l}</option>`)}
            </select></td>
            <td class="w-max"><div class=${'max-wrap ' + (it.kind === 'minus' ? 'neg' : '')}>${it.kind === 'minus' ? html`<span>−</span>` : null}
              <${MaxInput} key=${it.id + it.max} value=${it.max} onSet=${(n) => upd((c) => (c.categories[ci].items[ii].max = n))} /></div></td>
            <td><input type="text" value=${it.hint || ''} placeholder="opcjonalnie" aria-label="Podpowiedź" onInput=${(e) => upd((c) => (c.categories[ci].items[ii].hint = e.currentTarget.value))} /></td>
            <td class="w-act">
              <button class="btn icon ghost sm" aria-label="Wyżej" disabled=${ii === 0} onClick=${() => upd((c) => moveIn(c.categories[ci].items, ii, -1))}><${Icon} name="arrow-up" size=${16} /></button>
              <button class="btn icon ghost sm" aria-label="Niżej" disabled=${ii === cat.items.length - 1} onClick=${() => upd((c) => moveIn(c.categories[ci].items, ii, 1))}><${Icon} name="arrow-down" size=${16} /></button>
              <button class="btn icon ghost sm danger" aria-label="Usuń pozycję" onClick=${() => upd((c) => c.categories[ci].items.splice(ii, 1))}><${Icon} name="trash" size=${16} /></button>
            </td>
          </tr>`)}
        </tbody>
      </table></div>
      <div class="ce-add">
        <button class="btn ghost sm" onClick=${() => upd((c) => c.categories[ci].items.push({ id: uid('i'), label: 'Nowa pozycja', kind: 'plus', max: 2 }))}><${Icon} name="plus" size=${15} />Punkty dodatnie</button>
        <button class="btn ghost sm neg" onClick=${() => upd((c) => c.categories[ci].items.push({ id: uid('i'), label: 'Nowa kara', kind: 'minus', max: 1 }))}><${Icon} name="minus" size=${15} />Punkty karne</button>
      </div>
    </section>`)}
    <button class="btn add-row" onClick=${() => upd((c) => c.categories.push({ id: uid('k'), name: 'Nowa kategoria', items: [{ id: uid('i'), label: 'Nowa pozycja', kind: 'plus', max: 2 }] }))}>
      <${Icon} name="plus" />Dodaj kategorię</button>
  </div>`;
}
