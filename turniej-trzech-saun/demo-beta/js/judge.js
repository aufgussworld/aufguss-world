// Widok sędziego: karta oceny z walidacją, porównanie zawodników, własny ranking.
// Sędzia widzi wyłącznie własne oceny — nigdy kart innych sędziów ani wyników łącznych.

import { html, useEffect, useLayoutEffect, useRef, useState } from './lib.js';
import {
  DISCIPLINES, FINAL_ORDER, fmt, fmtAvg, fmtInput, fmtDate, fullName, parseScore, entryStats, getEntry,
  orderedContestants, startOf, startNumber, cardMax, categoryMax, disciplinesOf, assignRanks,
} from './model.js';
import { setScore, logChange, setNote, setItemNote, getT } from './store.js';
import { Icon, Avatar, DiscBadge, StatusIcon, Segmented, Empty, Modal, NoteTip, tipProps, toast } from './ui.js';
import { FeedbackModal } from './feedback.js';
import { cardPDF, slug } from './pdf.js';
import { cardWorkbook } from './backup.js';

// Eksport karty po seansie — zabezpieczenie na wypadek awarii systemu albo internetu.
async function exportCard(kind, t, disc, cid, jid) {
  try {
    if (kind === 'pdf') await cardPDF(t, disc, cid, jid);
    else {
      const c = t.contestants.find((x) => x.id === cid);
      const j = t.judges.find((x) => x.id === jid);
      await cardWorkbook(t, disc, cid, jid, `karta-${slug(DISCIPLINES[disc].label)}-${slug(fullName(c))}-${slug(fullName(j))}.xlsx`);
    }
  } catch (e) {
    console.error(e);
    toast('Nie udało się przygotować pliku — sprawdź połączenie z internetem', 'err');
  }
}

// ---------- pola punktów ----------

function moveFocus(from, dir) {
  const all = [...document.querySelectorAll('[data-score]')];
  const i = all.indexOf(from);
  const next = all[i + dir];
  if (next) {
    next.focus();
    next.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function ScoreInput({ id, item, value, mode, onLive, onDone, onError, errId }) {
  const [text, setText] = useState(fmtInput(value));
  const [err, setErr] = useState(null);
  const focused = useRef(false);
  const start = useRef(value);
  const latest = useRef(value);
  const keepText = useRef(false); // po odrzuceniu wpisu zostawiamy w polu tekst do poprawy
  if (!focused.current) latest.current = value;

  useEffect(() => {
    if (keepText.current) { keepText.current = false; return; }
    if (!focused.current) {
      setText(fmtInput(value));
      if (err) show(null); // ocena zmieniona z zewnątrz (suwak, inne urządzenie) — stary błąd już nie dotyczy pola
    }
  }, [value]);

  const show = (m) => {
    setErr(m);
    onError(item.id, m);
  };

  const onInput = (e) => {
    const s = e.currentTarget.value;
    setText(s);
    const r = parseScore(s, item, mode);
    if (r.ok) {
      if (err) show(null);
      if (r.value !== latest.current) {
        latest.current = r.value;
        onLive(r.value);
      }
    } else if (r.immediate || err) {
      show(r.error);
    }
  };
  const onFocus = (e) => {
    focused.current = true;
    start.current = latest.current;
    e.currentTarget.select();
  };
  const onBlur = () => {
    focused.current = false;
    const r = parseScore(text, item, mode);
    if (!r.ok) {
      // błędny wpis nie zostaje w karcie — wracamy do oceny sprzed edycji
      if (latest.current !== start.current) {
        latest.current = start.current;
        keepText.current = true;
        onLive(start.current);
      }
      show(r.error);
    } else {
      setText(fmtInput(r.value));
      if (err) show(null);
    }
    if (latest.current !== start.current) onDone(start.current, latest.current);
    start.current = latest.current;
  };
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      moveFocus(e.currentTarget, e.shiftKey && e.key === 'Enter' ? -1 : 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveFocus(e.currentTarget, -1);
    } else if (e.key === 'Escape') {
      latest.current = start.current;
      onLive(start.current);
      setText(fmtInput(start.current));
      show(null);
    }
  };

  return html`<div class=${`score-field k-${item.kind} ${err ? 'invalid' : ''} ${value != null ? 'filled' : ''}`}>
    ${item.kind === 'minus' ? html`<span class="prefix" aria-hidden="true">−</span>` : null}
    <input id=${id} data-score type="text" inputmode="decimal" autocomplete="off" spellcheck="false"
      value=${text} placeholder=${item.kind === 'minus' ? '0' : ''}
      aria-invalid=${err ? 'true' : 'false'} aria-describedby=${err ? errId : undefined}
      onInput=${onInput} onFocus=${onFocus} onBlur=${onBlur} onKeyDown=${onKey} />
  </div>`;
}

// Pozycja 0/1 — dwa przyciski; klawiatura: 0, 1, spacja, Enter (dalej), Delete (wyczyść).
function BinInput({ id, item, value, onSet }) {
  const max = Math.round(item.max * 10);
  const set = (v) => onSet(v === value ? null : v);
  const onKey = (e) => {
    if (e.key === '0') set(0);
    else if (e.key === '1') set(max);
    else if (e.key === ' ') { e.preventDefault(); onSet(value === max ? 0 : max); }
    else if (e.key === 'Delete' || e.key === 'Backspace') onSet(null);
    else if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); moveFocus(e.currentTarget, 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveFocus(e.currentTarget, -1); }
  };
  return html`<div id=${id} class="bin" data-score tabindex="0" role="radiogroup" aria-label=${item.label} onKeyDown=${onKey}>
    <button type="button" tabindex="-1" role="radio" aria-checked=${value === 0} class=${value === 0 ? 'on' : ''} onClick=${() => set(0)}>Nie · 0</button>
    <button type="button" tabindex="-1" role="radio" aria-checked=${value === max} class=${value === max ? 'on' : ''} onClick=${() => set(max)}>Tak · ${fmt(max)}</button>
  </div>`;
}

function ReadValue({ item, value }) {
  if (value == null) return html`<span class="score-ro empty">—</span>`;
  if (item.kind === 'minus') return html`<span class=${'score-ro k-minus ' + (value ? 'neg' : '')}>${value ? '−' + fmt(value) : '0'}</span>`;
  return html`<span class="score-ro">${fmt(value)}</span>`;
}

function rangeText(it) {
  if (it.kind === 'minus') return `0 do −${fmt(Math.round(it.max * 10))}`;
  if (it.kind === 'bin') return `0 / ${fmt(Math.round(it.max * 10))}`;
  return `0–${fmt(Math.round(it.max * 10))}`;
}

// Suwak 0–maks. co 0,1 pkt — szybsze wypełnianie karty myszką albo palcem. Ocena zmienia się na żywo
// (ten sam zapis co z pola), a historia zmian dostaje jeden wpis po puszczeniu suwaka.
// Dotyk: ruch w pionie przewija stronę (touch-action: pan-y) i niczego nie zmienia; ocena zmienia się
// dopiero po ruchu w bok albo po stuknięciu w suwak. Przerwane przeciąganie przywraca ocenę sprzed niego.
// Klawiatura: strzałki ±0,1, PageUp/PageDown ±1, Home/End 0/maks.
function ScoreSlider({ item, value, current, onLive, onDone }) {
  const max = Math.round(item.max * 10);
  const track = useRef();
  const drag = useRef(null);
  const keys = useRef(null); // { from, timer } — seria zmian z klawiatury trafia do historii po chwili przerwy
  const latest = useRef(value);
  if (!drag.current && !keys.current) latest.current = value;

  const apply = (x) => {
    x = Math.min(max, Math.max(0, x));
    if (x !== latest.current) {
      latest.current = x;
      onLive(x);
    }
  };
  const at = (clientX) => {
    const r = track.current.getBoundingClientRect();
    return Math.round(((clientX - r.left) / r.width) * max);
  };
  const flushKeys = () => {
    const k = keys.current;
    if (!k) return;
    keys.current = null;
    clearTimeout(k.timer);
    if (latest.current !== k.from) onDone(k.from, latest.current);
  };
  useEffect(() => flushKeys, []);

  const onPointerDown = (e) => {
    if (e.button !== 0 || drag.current) return;
    const mouse = e.pointerType === 'mouse';
    e.currentTarget.focus({ preventScroll: true }); // zatwierdza ewentualny wpis z pola obok
    flushKeys();
    drag.current = { id: e.pointerId, from: current(), x: e.clientX, y: e.clientY, active: mouse };
    latest.current = drag.current.from;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) { /* bez przechwycenia też działa, póki palec jest nad suwakiem */ }
    if (mouse) {
      e.preventDefault();
      apply(at(e.clientX));
    }
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    if (!d.active) {
      const dx = Math.abs(e.clientX - d.x), dy = Math.abs(e.clientY - d.y);
      if (dx < 6 || dx < dy) return;
      d.active = true;
    }
    apply(at(e.clientX));
  };
  const onPointerUp = (e) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    if (!d.active) apply(at(e.clientX)); // stuknięcie w suwak
    drag.current = null;
    if (latest.current !== d.from) onDone(d.from, latest.current);
  };
  const onPointerCancel = (e) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    if (latest.current !== d.from) {
      latest.current = d.from;
      onLive(d.from);
    }
  };
  const onKeyDown = (e) => {
    const cur = latest.current ?? 0;
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 }[e.key];
    let x;
    if (step) x = cur + step;
    else if (e.key === 'Home') x = 0;
    else if (e.key === 'End') x = max;
    else return;
    e.preventDefault();
    if (!keys.current) keys.current = { from: current() };
    clearTimeout(keys.current.timer);
    apply(x);
    keys.current.timer = setTimeout(flushKeys, 800);
  };

  const neg = item.kind === 'minus';
  const pct = value == null ? 0 : (value / max) * 100;
  const ticks = [];
  for (let p = 10; p < max; p += 10) ticks.push(html`<i class="sl-tick" key=${p} style=${{ left: (p / max) * 100 + '%' }}></i>`);
  return html`<div class=${`sl-wrap k-${item.kind} ${value == null ? 'unset' : ''}`}>
    <span class="sl-end" aria-hidden="true">0</span>
    <div class="sl" role="slider" tabindex="0" aria-label=${'Suwak: ' + item.label}
      aria-valuemin="0" aria-valuemax=${item.max} aria-valuenow=${value == null ? undefined : value / 10}
      aria-valuetext=${value == null ? 'brak oceny' : (neg && value ? '−' : '') + fmt(value) + ' pkt'}
      onPointerDown=${onPointerDown} onPointerMove=${onPointerMove} onPointerUp=${onPointerUp}
      onPointerCancel=${onPointerCancel} onKeyDown=${onKeyDown} onBlur=${flushKeys}>
      <span class="sl-track" ref=${track}>
        ${ticks}
        <i class="sl-fill" style=${{ width: pct + '%' }}></i>
        <span class="sl-thumb" style=${{ left: pct + '%' }}></span>
      </span>
    </div>
    <span class="sl-end" aria-hidden="true">${neg ? '−' : ''}${fmt(max)}</span>
  </div>`;
}

// ---------- oceny tej pozycji u innych zawodników ----------

// Oceny tego sędziego w jednej pozycji: zawodnicy już ocenieni w tej pozycji + bieżący zawodnik.
// Sędzia widzi wyłącznie własne oceny (jid = właściciel karty).
function peerRows(t, disc, cid, jid, item) {
  return orderedContestants(t, disc).map((c, i) => {
    const e = getEntry(t, disc, c.id, jid);
    return { c, nr: startNumber(t, disc, c.id) || i + 1, v: e?.v?.[item.id] ?? null, note: e?.ni?.[item.id], self: c.id === cid };
  }).filter((r) => r.self || r.v != null);
}

const peerLabel = (judgeName) => (judgeName ? `Oceny sędziego ${judgeName} u innych zawodników: ` : 'Twoje oceny innych zawodników: ');

// Okienko z ocenami: obok przycisku po prawej; gdy brak miejsca (prawa kolumna karty, telefon) — pod wierszem
// albo nad nim. Zamyka się: X, Esc, kliknięcie poza okienkiem i poza wierszem tej pozycji (suwak i pole
// tej pozycji można zmieniać przy otwartym okienku — ocena bieżącego zawodnika aktualizuje się na żywo).
function PeerPopover({ anchor, item, rows, judgeName, onClose }) {
  const ref = useRef();
  const [sort, setSort] = useState('order');
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const place = () => {
    const el = ref.current, btn = anchor.current;
    if (!el || !btn) return;
    const a = btn.getBoundingClientRect();
    const row = (btn.closest('.item') || btn).getBoundingClientRect();
    // widoczna część strony (na telefonie bywa mniejsza i przesunięta względem obszaru, do którego liczy się position: fixed)
    const vv = window.visualViewport;
    const x0 = vv ? vv.offsetLeft : 0, y0 = vv ? vv.offsetTop : 0;
    const x1 = x0 + (vv ? vv.width : document.documentElement.clientWidth), y1 = y0 + (vv ? vv.height : window.innerHeight);
    const m = 8;
    if (a.bottom < y0 || a.top > y1) { closeRef.current(); return; } // wiersz zniknął z ekranu
    const w = el.offsetWidth, h = el.offsetHeight;
    let left, top;
    if (a.right + m + w <= x1 - m) {
      left = a.right + m;
      top = Math.min(Math.max(a.top + a.height / 2 - h / 2, y0 + m), y1 - h - m);
    } else {
      left = Math.min(Math.max(a.right - w, x0 + m), x1 - w - m);
      top = row.bottom + 4 + h <= y1 - m ? row.bottom + 4 : Math.max(y0 + m, row.top - 4 - h);
    }
    el.style.left = Math.round(left) + 'px';
    el.style.top = Math.round(top) + 'px';
  };
  useLayoutEffect(place);
  useEffect(() => {
    const onDown = (e) => {
      const row = anchor.current?.closest('.item');
      if (ref.current?.contains(e.target) || row?.contains(e.target)) return;
      closeRef.current();
    };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      const top = [...document.querySelectorAll('.modal')].pop();
      if (top && !top.contains(ref.current)) return; // Esc należy do okna otwartego nad kartą (np. uwaga do pozycji)
      e.stopPropagation(); // Esc zamyka tylko to okienko, a nie kartę sędziego otwartą u supervisora
      closeRef.current();
      anchor.current?.focus();
    };
    const vv = window.visualViewport;
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    vv?.addEventListener('resize', place);
    vv?.addEventListener('scroll', place);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      vv?.removeEventListener('resize', place);
      vv?.removeEventListener('scroll', place);
    };
  }, []);

  const max = Math.round(item.max * 10);
  const neg = item.kind === 'minus';
  const shown = (x) => (x == null ? '—' : neg ? (x ? '−' + fmt(x) : '0') : fmt(x));
  const list = sort === 'score' ? [...rows].sort((a, b) => (b.v ?? -1) - (a.v ?? -1)) : rows;
  const others = rows.filter((r) => !r.self && r.v != null);
  const avg = others.length ? Math.round((others.reduce((s, r) => s + r.v, 0) * 10) / others.length) : null;
  return html`<div class="peer-pop" ref=${ref} role="dialog" aria-label=${peerLabel(judgeName) + item.label}>
    <header class="pp-head">
      <div class="pp-title">
        <span class="pp-eyebrow">${judgeName ? `Oceny sędziego: ${judgeName}` : 'Twoje oceny w tej pozycji'} · ${rangeText(item)}</span>
        <b>${item.label}</b>
      </div>
      <button type="button" class="btn icon ghost xs" aria-label="Zamknij" onClick=${() => { onClose(); anchor.current?.focus(); }}><${Icon} name="x" size=${15} /></button>
    </header>
    <div class="pp-sort" role="group" aria-label="Kolejność">
      <button type="button" class=${sort === 'order' ? 'on' : ''} aria-pressed=${sort === 'order'} onClick=${() => setSort('order')}>Kolejność startowa</button>
      <button type="button" class=${sort === 'score' ? 'on' : ''} aria-pressed=${sort === 'score'} onClick=${() => setSort('score')}>${neg ? 'Najwyższa kara' : 'Najwyższa ocena'}</button>
    </div>
    <ol class="pp-list">
      ${list.map((r) => html`<li key=${r.c.id} class=${'pp-row ' + (r.self ? 'self' : '')}>
        <span class="pp-nr">${r.nr}</span>
        <${Avatar} c=${r.c} size=${24} />
        <span class="pp-name">${fullName(r.c)}${r.self ? html`<small>${judgeName ? 'ta karta' : 'oceniasz teraz'}</small>` : null}</span>
        <span class=${'pp-bar ' + (neg ? 'neg' : '')} aria-hidden="true"><i style=${{ width: (r.v == null ? 0 : (r.v / max) * 100) + '%' }}></i></span>
        <span class=${'pp-val ' + (neg && r.v ? 'neg' : '')}>${shown(r.v)}</span>
        <span class="pp-note">${r.note ? html`<${NoteTip} text=${r.note} size=${13} />` : null}</span>
      </li>`)}
    </ol>
    <footer class="pp-foot">${others.length === 1 ? '1 oceniony zawodnik' : `Ocenionych zawodników: ${others.length}`}${avg != null ? html` · średnia <b>${neg && avg ? '−' : ''}${fmtAvg(avg)}</b>` : null}</footer>
  </div>`;
}

// judgeName — karta sędziego oglądana przez supervisora (teksty „Oceny sędziego…” zamiast „Twoje oceny”)
function PeerButton({ t, disc, cid, jid, item, judgeName }) {
  const [open, setOpen] = useState(false);
  const btn = useRef();
  const rows = peerRows(t, disc, cid, jid, item);
  const others = rows.filter((r) => !r.self).length;
  useEffect(() => { if (!others) setOpen(false); }, [others]);
  return html`<span class="peer-cell">
    <button type="button" ref=${btn} class=${'peer-btn ' + (open ? 'on' : '')} disabled=${!others}
      aria-expanded=${open} aria-label=${peerLabel(judgeName) + item.label}
      title=${others ? 'Pokaż oceny już ocenionych zawodników w tej pozycji' : 'Nie ma jeszcze innych zawodników z oceną w tej pozycji'}
      onClick=${() => setOpen(!open)}>
      <${Icon} name="ranking" size=${16} /></button>
    ${open ? html`<${PeerPopover} anchor=${btn} item=${item} rows=${rows} judgeName=${judgeName} onClose=${() => setOpen(false)} />` : null}
  </span>`;
}

// Uwaga do jednej pozycji: ikonka notatnika otwiera okienko, a zapisana uwaga pokazuje się po najechaniu.
function NoteEditor({ item, note, onClose, onSave }) {
  const [txt, setTxt] = useState(note || '');
  return html`<${Modal} title="Uwaga do pozycji" onClose=${onClose} footer=${html`
      ${note ? html`<button class="btn ghost danger" onClick=${() => onSave('')}><${Icon} name="trash" size=${16} />Usuń uwagę</button>` : null}
      <span class="grow"></span>
      <button class="btn ghost" onClick=${onClose}>Anuluj</button>
      <button class="btn primary" onClick=${() => onSave(txt.trim())}><${Icon} name="check" size=${16} />Zapisz uwagę</button>`}>
    <p class="note-for"><${Icon} name="note-text" size=${16} /><b>${item.label}</b>${item.kind === 'minus' ? html`<span class="tag-neg">kara</span>` : null}</p>
    <textarea data-autofocus rows="5" value=${txt}
      placeholder="Co zwróciło Twoją uwagę w tym elemencie? Notatka przyda się przy porównywaniu zawodników i przy pisaniu feedbacku."
      onInput=${(e) => setTxt(e.currentTarget.value)}
      onKeyDown=${(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onSave(txt.trim()); } }}></textarea>
    <p class="muted small note-help">Uwagę widzisz Ty i supervisor. <kbd>Ctrl</kbd> + <kbd>Enter</kbd> zapisuje.</p>
  </${Modal}>`;
}

function ItemNote({ item, note, locked, onSave }) {
  const [open, setOpen] = useState(false);
  if (locked) return html`<span class="note-cell">${note ? html`<${NoteTip} text=${note} />` : null}</span>`;
  return html`<span class="note-cell">
    <button type="button" class=${'note-btn ' + (note ? 'has' : '')} aria-label=${(note ? 'Edytuj uwagę: ' : 'Dodaj uwagę: ') + item.label}
      ...${tipProps(note)} onClick=${() => setOpen(true)}>
      <${Icon} name=${note ? 'note-text' : 'note'} size=${16} /></button>
    ${open ? html`<${NoteEditor} item=${item} note=${note} onClose=${() => setOpen(false)} onSave=${(txt) => { onSave(txt); setOpen(false); }} />` : null}
  </span>`;
}

function CatNotes({ value, locked, onSave }) {
  const [open, setOpen] = useState(!!value);
  const [txt, setTxt] = useState(value || '');
  const timer = useRef();
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setTxt(value || '');
    if (value) setOpen(true);
  }, [value]);
  if (locked) return value ? html`<p class="note-ro"><b>Dodatkowe uwagi:</b> ${value}</p>` : null;
  if (!open) {
    return html`<button type="button" class="link-btn note-add" onClick=${() => setOpen(true)}>
      <${Icon} name="plus" size=${14} />Dodatkowe uwagi</button>`;
  }
  return html`<label class="notes"><span>Dodatkowe uwagi</span>
    <textarea rows="2" value=${txt} placeholder="Ogólne uwagi do całej kategorii — widzisz je Ty i supervisor"
      onFocus=${() => (focused.current = true)}
      onBlur=${() => { focused.current = false; clearTimeout(timer.current); onSave(txt.trim()); }}
      onInput=${(e) => {
        const v = e.currentTarget.value;
        setTxt(v);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => onSave(v.trim()), 600);
      }}></textarea></label>`;
}

// ---------- karta oceny ----------

function fieldsToFix(n) {
  if (n === 1) return 'Jedno pole wymaga poprawy';
  const few = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14);
  return few ? `${n} pola wymagają poprawy` : `${n} pól wymaga poprawy`;
}

export function ScoreCard({ t, disc, cid, jid, readOnly = false, judgeName, onPrev, onNext }) {
  const card = t.cards[disc];
  const c = t.contestants.find((x) => x.id === cid);
  const entry = getEntry(t, disc, cid, jid);
  const stats = entryStats(card, entry);
  const [errors, setErrors] = useState({});
  const [fbOpen, setFbOpen] = useState(false);
  useEffect(() => setErrors({}), [cid, disc]);
  if (!c) return html`<${Empty} title="Wybierz zawodnika z listy" />`;
  const fb = entry?.fb;

  const locked = readOnly || t.status !== 'live';
  const st = startOf(c, disc);
  const nr = startNumber(t, disc, cid);
  const max = cardMax(card);
  const v = (entry && entry.v) || {};
  const errCount = Object.values(errors).filter(Boolean).length;
  const onError = (itemId, msg) => setErrors((e) => (e[itemId] === msg ? e : { ...e, [itemId]: msg }));
  const live = (itemId, value) => setScore(t.id, disc, cid, jid, itemId, value);
  const done = (itemId, from, to) => {
    if ((from ?? null) !== (to ?? null)) logChange(t.id, { j: jid, c: cid, d: disc, i: itemId, f: from ?? null, t: to ?? null });
  };
  const pct = stats.required ? Math.round((stats.filled / stats.required) * 100) : 0;
  const saved = entry?.u ? new Date(entry.u).toLocaleTimeString('pl-PL') : null;
  const meta = [nr ? `Nr startowy ${nr}` : null, st.date ? `${fmtDate(st.date)}${st.time ? ', godz. ' + st.time : ''}` : null, card.duration ? `czas ceremonii ${card.duration}` : null].filter(Boolean);

  return html`<article class=${'scorecard d-' + disc} aria-label=${'Karta oceny: ' + fullName(c)}>
    <header class="sc-head">
      <${Avatar} c=${c} size=${76} />
      <div class="sc-who">
        <p class="eyebrow">${meta.join(' · ')}</p>
        <h2>${fullName(c)}</h2>
        <div class="sc-tags"><${DiscBadge} disc=${disc} />
          ${judgeName ? html`<span class="muted">Karta sędziego: <b>${judgeName}</b></span>` : null}
          ${t.dq?.[`${disc}|${cid}`] && readOnly ? html`<span class="badge neg"><${Icon} name="ban" size=${13} />Dyskwalifikacja</span>` : null}
        </div>
      </div>
      <div class="sc-total" aria-live="polite">
        <span class="label">${readOnly ? 'Ocena sędziego' : 'Twoja ocena'}</span>
        <span class="big">${stats.started ? fmt(stats.total, true) : '—'}</span>
        <span class="of">z ${fmt(max)} pkt możliwych</span>
        <div class="bar" role="progressbar" aria-valuenow=${pct} aria-valuemin="0" aria-valuemax="100" aria-label="Wypełnienie karty"><i style=${{ width: pct + '%' }}></i></div>
        <span class="small">${stats.filled} z ${stats.required} ocen${saved && !readOnly ? html` · <${Icon} name="check" size=${12} /> zapisano ${saved}` : ''}</span>
      </div>
    </header>

    ${errCount ? html`<div class="alert err" role="alert"><${Icon} name="alert" />
      ${fieldsToFix(errCount)} — błędnej wartości nie zapisano, w karcie pozostaje poprzednia ocena.</div>` : null}
    ${locked && !readOnly ? html`<div class="alert info"><${Icon} name="lock" />Turniej jest zakończony — karta jest tylko do odczytu. Feedback dla zawodnika możesz nadal przygotować.</div>` : null}
    <div class="sc-toolbar">
      ${!locked ? html`<p class="hint-line"><${Icon} name="info" size=${14} /> Wpisuj liczby z dokładnością do 0,1 (przecinek lub kropka) albo przesuń suwak. Punkty karne wpisuj bez minusa. <kbd>Enter</kbd> przenosi dalej, <kbd>Esc</kbd> cofa zmianę, <${Icon} name="note" size=${14} /> dodaje uwagę do pozycji, <${Icon} name="ranking" size=${14} /> pokazuje Twoje oceny tej pozycji u innych zawodników.</p>` : html`<span></span>`}
      <div class="sc-actions">
        ${stats.started ? html`
          <button class="btn sm" onClick=${() => exportCard('pdf', t, disc, cid, jid)} title="Pobierz kartę jako PDF (do wydruku i podpisu)">
            <${Icon} name="download" size=${15} />Karta PDF</button>
          <button class="btn sm" onClick=${() => exportCard('xlsx', t, disc, cid, jid)} title="Pobierz kartę jako arkusz Excel">
            <${Icon} name="download" size=${15} />Excel</button>` : null}
        ${!readOnly || fb ? html`<button class=${'btn sm ' + (!fb ? 'fb-cta' : fb.approved ? 'fb-ok' : 'fb-draft')} onClick=${() => setFbOpen(true)} disabled=${!stats.started && !fb}
            title=${!stats.started && !fb ? 'Najpierw wypełnij kartę' : ''}>
            <${Icon} name=${!fb ? 'sparkles' : fb.approved ? 'check' : 'pencil'} size=${15} />${!fb ? 'Feedback dla zawodnika' : fb.approved ? (readOnly ? 'Feedback sędziego · zatwierdzony' : 'Feedback zatwierdzony') : (readOnly ? 'Feedback sędziego · szkic' : 'Feedback — szkic')}</button>` : null}
      </div>
    </div>
    ${fbOpen ? html`<${FeedbackModal} t=${t} disc=${disc} cid=${cid} jid=${jid} readOnly=${readOnly} onClose=${() => setFbOpen(false)} />` : null}

    <div class="sc-grid">
      ${card.categories.map((cat, ci) => {
        const cs = stats.cats[ci];
        return html`<section class="sc-cat" key=${cat.id}>
          <header class="cat-head">
            <h3>${cat.name}</h3>
            <span class="cat-sum"><b>${fmt(cs.sum, true)}</b> <small>/ ${fmt(categoryMax(cat))}</small></span>
          </header>
          <ol class="items">
            ${cat.items.map((it, ii) => {
              const id = `f-${disc}-${cat.id}-${it.id}`;
              const err = errors[it.id];
              const slider = !locked && it.kind !== 'bin';
              return html`<li class=${`item k-${it.kind} ${err ? 'has-err' : ''}`} key=${it.id}>
                <span class="num">${ii + 1}</span>
                <label class="lbl" for=${id}>
                  <span>${it.label}</span>
                  ${it.kind === 'minus' ? html`<span class="tag-neg">kara</span>` : null}
                  ${it.hint ? html`<small>${it.hint}</small>` : null}
                </label>
                <${ItemNote} item=${it} note=${entry?.ni?.[it.id]} locked=${locked}
                  onSave=${(txt) => txt !== (entry?.ni?.[it.id] || '') && setItemNote(t.id, disc, cid, jid, it.id, txt)} />
                ${slider
                  ? html`<${ScoreSlider} item=${it} value=${v[it.id] ?? null}
                      current=${() => getEntry(getT(t.id), disc, cid, jid)?.v?.[it.id] ?? null}
                      onLive=${(x) => live(it.id, x)} onDone=${(f, to) => done(it.id, f, to)} />`
                  : html`<span class="range">${rangeText(it)}</span>`}
                <${PeerButton} t=${t} disc=${disc} cid=${cid} jid=${jid} item=${it} judgeName=${readOnly ? judgeName : null} />
                <span class="val">
                  ${locked
                    ? html`<${ReadValue} item=${it} value=${v[it.id]} />`
                    : it.kind === 'bin'
                      ? html`<${BinInput} id=${id} item=${it} value=${v[it.id]} onSet=${(x) => { const f = v[it.id]; live(it.id, x); done(it.id, f, x); }} />`
                      : html`<${ScoreInput} id=${id} item=${it} value=${v[it.id]} mode=${t.decimalMode} errId=${id + '-err'}
                          onLive=${(x) => live(it.id, x)} onDone=${(f, to) => done(it.id, f, to)} onError=${onError} />`}
                </span>
                ${err ? html`<p class="err" id=${id + '-err'}><${Icon} name="alert" size=${14} />${err}</p>` : null}
              </li>`;
            })}
          </ol>
          <${CatNotes} value=${entry?.n?.[cat.id]} locked=${locked}
            onSave=${(txt) => (txt || entry?.n?.[cat.id]) && txt !== (entry?.n?.[cat.id] || '') && setNote(t.id, disc, cid, jid, cat.id, txt)} />
        </section>`;
      })}
    </div>

    ${onPrev || onNext ? html`<footer class="sc-foot">
      <button class="btn ghost" disabled=${!onPrev} onClick=${onPrev}><${Icon} name="chevron-left" />Poprzedni zawodnik</button>
      <button class="btn" disabled=${!onNext} onClick=${onNext}>Następny zawodnik<${Icon} name="chevron-right" /></button>
    </footer>` : null}
  </article>`;
}

// ---------- lista zawodników ----------

function groupByDay(list, disc) {
  const groups = [];
  for (const row of list) {
    const d = startOf(row.c, disc).date || '';
    let g = groups.find((x) => x.date === d);
    if (!g) groups.push((g = { date: d, rows: [] }));
    g.rows.push(row);
  }
  return groups;
}

function Rail({ t, disc, jid, selected, onSelect }) {
  const card = t.cards[disc];
  const rows = orderedContestants(t, disc).map((c) => ({ c, st: entryStats(card, getEntry(t, disc, c.id, jid)) }));
  const done = rows.filter((r) => r.st.complete).length;
  return html`<aside class="rail" aria-label="Lista zawodników">
    <header class="rail-head">
      <h2>Zawodnicy</h2>
      <span class="muted">${done} z ${rows.length} kart kompletnych</span>
      <div class="bar"><i style=${{ width: (rows.length ? (done / rows.length) * 100 : 0) + '%' }}></i></div>
    </header>
    <div class="rail-list">
      ${groupByDay(rows, disc).map((g) => html`<div class="rail-group" key=${g.date}>
        <h3 class="rail-day">${g.date ? fmtDate(g.date, true) : 'Bez terminu'}</h3>
        <ul>
          ${g.rows.map(({ c, st }) => html`<li key=${c.id}>
            <button class=${'rail-item ' + (selected === c.id ? 'on' : '')} aria-current=${selected === c.id ? 'true' : undefined} onClick=${() => onSelect(c.id)}>
              <span class="ri-time">${startOf(c, disc).time || '—'}</span>
              <${Avatar} c=${c} size=${34} />
              <span class="ri-name">${fullName(c)}</span>
              <span class="ri-score">${st.started ? fmt(st.total, true) : ''}</span>
              <${StatusIcon} status=${st.status} size=${17} />
            </button>
          </li>`)}
        </ul>
      </div>`)}
    </div>
  </aside>`;
}

// ---------- porównanie ----------

// Wartości do porównania: karta konkretnego sędziego albo suma liczonych kart (tylko supervisor).
export function compareValues(t, disc, cid, jid) {
  if (jid !== '__sum') return (getEntry(t, disc, cid, jid) || {}).v || {};
  const v = {};
  for (const j of t.judges) {
    if (t.excluded?.[`${disc}|${cid}|${j.id}`]) continue;
    const e = getEntry(t, disc, cid, j.id);
    if (!e) continue;
    for (const [k, x] of Object.entries(e.v || {})) if (x != null) v[k] = (v[k] || 0) + x;
  }
  return v;
}

// Uwagi do porównania: { items: {pozycja: tekst}, cats: {kategoria: tekst} }.
// W trybie sumy łączymy uwagi wszystkich liczonych sędziów, z nazwiskiem przed każdą.
export function compareNotes(t, disc, cid, jid) {
  const items = {}, cats = {};
  const sum = jid === '__sum';
  const judges = sum ? t.judges.filter((j) => !t.excluded?.[`${disc}|${cid}|${j.id}`]) : t.judges.filter((j) => j.id === jid);
  const add = (bag, k, txt, who) => {
    if (!txt) return;
    const line = who ? `${who}: ${txt}` : txt;
    bag[k] = bag[k] ? `${bag[k]}\n${line}` : line;
  };
  for (const j of judges) {
    const e = getEntry(t, disc, cid, j.id);
    if (!e) continue;
    const who = sum ? fullName(j) : null;
    for (const [k, x] of Object.entries(e.ni || {})) add(items, k, x, who);
    for (const [k, x] of Object.entries(e.n || {})) add(cats, k, x, who);
  }
  return { items, cats };
}

export function ContestantPicker({ t, disc, selected, onChange, max = 6 }) {
  const list = orderedContestants(t, disc);
  const toggle = (id) => {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else if (selected.length < max) onChange([...selected, id]);
  };
  return html`<div class="picker" role="group" aria-label="Wybierz zawodników do porównania">
    ${list.map((c) => {
      const on = selected.includes(c.id);
      return html`<button type="button" key=${c.id} class=${'pick ' + (on ? 'on' : '')} aria-pressed=${on}
        disabled=${!on && selected.length >= max} onClick=${() => toggle(c.id)}>
        <${Avatar} c=${c} size=${26} /><span>${fullName(c)}</span>${on ? html`<${Icon} name="check" size=${14} />` : null}
      </button>`;
    })}
  </div>`;
}

// Komórka pozycji w porównaniu: ocena + dymek z uwagą. U sędziego (editable) kliknięcie otwiera pole do poprawy
// oceny — zapis tą samą drogą co w karcie (setScore + wpis w historii), więc karta zawodnika zmienia się od razu.
// Enter zapisuje, Esc anuluje, wyjście z pola zapisuje poprawną wartość (błędną odrzuca z komunikatem).
function CompareCell({ t, disc, cid, jid, item, value, note, editable }) {
  const [edit, setEdit] = useState(false);
  const [text, setText] = useState('');
  const [err, setErr] = useState(null);
  const input = useRef();
  const btn = useRef();
  const closing = useRef(false); // po Enter / Esc pole znika — blur z tego zamknięcia nie zapisuje drugi raz
  const refocus = useRef(false);
  // od razu po zmianie DOM (nie po klatce) — szybko wpisana cyfra nie może trafić obok pola
  useLayoutEffect(() => {
    if (edit) { closing.current = false; input.current?.focus(); input.current?.select(); }
    else if (refocus.current) { refocus.current = false; btn.current?.focus(); }
  }, [edit]);

  const neg = item.kind === 'minus';
  const shown = value == null ? '—' : neg ? (value ? '−' + fmt(value) : '0') : fmt(value);
  if (!editable) return html`<span class="cv">${shown}<${NoteTip} text=${note} size=${14} /></span>`;

  const close = (back) => { closing.current = true; refocus.current = back; setErr(null); setEdit(false); };
  const commit = (fromBlur) => {
    const r = parseScore(text, item, t.decimalMode);
    if (!r.ok) {
      if (fromBlur) { toast(`${item.label}: ${r.error} Ocena bez zmian.`, 'err'); close(false); }
      else setErr(r.error);
      return;
    }
    const cur = getEntry(getT(t.id), disc, cid, jid)?.v?.[item.id] ?? null;
    if (r.value !== cur) {
      setScore(t.id, disc, cid, jid, item.id, r.value);
      logChange(t.id, { j: jid, c: cid, d: disc, i: item.id, f: cur, t: r.value });
    }
    close(!fromBlur);
  };
  if (edit) {
    return html`<span class=${`cv-edit k-${item.kind} ${err ? 'invalid' : ''}`}>
      ${neg ? html`<span class="prefix" aria-hidden="true">−</span>` : null}
      <input ref=${input} type="text" inputmode="decimal" autocomplete="off" spellcheck="false" value=${text}
        aria-label=${item.label + ' — popraw ocenę'} aria-invalid=${err ? 'true' : 'false'}
        onInput=${(e) => { setText(e.currentTarget.value); if (err) setErr(null); }}
        onKeyDown=${(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(false); }
          else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
        }}
        onBlur=${() => { if (!closing.current) commit(true); }} />
      ${err ? html`<span class="cv-err" role="alert">${err}</span>` : null}
    </span>`;
  }
  return html`<span class="cv">
    <button type="button" ref=${btn} class="cv-btn" title="Kliknij, aby poprawić ocenę"
      aria-label=${`${item.label}: ${shown} — popraw ocenę`}
      onClick=${() => { setText(fmtInput(value)); setErr(null); setEdit(true); }}>
      ${shown}<${Icon} name="pencil" size=${12} /></button>
    <${NoteTip} text=${note} size=${14} /></span>`;
}

function bestIndex(vals, higherIsBetter = true) {
  const present = vals.map((x, i) => [x, i]).filter(([x]) => x != null);
  if (present.length < 2) return new Set();
  const target = higherIsBetter ? Math.max(...present.map(([x]) => x)) : Math.min(...present.map(([x]) => x));
  if (present.every(([x]) => x === target)) return new Set();
  return new Set(present.filter(([x]) => x === target).map(([, i]) => i));
}

// editable — sędzia poprawia własne oceny w tabeli (supervisor i suma kart: tylko podgląd)
export function Comparison({ t, disc, jid, cids, onRemove, editable = false }) {
  const card = t.cards[disc];
  const cols = cids.map((cid) => {
    const c = t.contestants.find((x) => x.id === cid);
    const v = compareValues(t, disc, cid, jid);
    return { c, v, st: entryStats(card, { v }), notes: compareNotes(t, disc, cid, jid) };
  }).filter((x) => x.c);
  if (cols.length < 2) {
    return html`<${Empty} icon="columns" title="Wybierz co najmniej dwóch zawodników">Zaznacz zawodników powyżej — pojawią się obok siebie, pozycja po pozycji.</${Empty}>`;
  }
  const two = cols.length === 2;
  const diff = (a, b) => (a == null || b == null ? null : a - b);
  const diffCell = (d, neg = false) => html`<td class=${'diff ' + (d > 0 ? 'pos' : d < 0 ? 'negd' : '')}>${d == null ? '' : d === 0 ? '=' : (d > 0 ? '+' : '−') + fmt(Math.abs(d))}</td>`;
  return html`<div class="table-wrap">
    <table class=${'compare d-' + disc}>
      <thead><tr>
        <th class="c-label" scope="col">Kryterium</th>
        ${cols.map(({ c }) => html`<th scope="col" key=${c.id} class="c-col">
          <div class="cc-head"><${Avatar} c=${c} size=${40} /><span>${fullName(c)}</span>
            <small>${startOf(c, disc).time ? fmtDate(startOf(c, disc).date) + ', ' + startOf(c, disc).time : ''}</small>
            ${onRemove ? html`<button class="btn icon ghost xs" aria-label=${'Usuń z porównania: ' + fullName(c)} onClick=${() => onRemove(c.id)}><${Icon} name="x" size=${14} /></button>` : null}
          </div></th>`)}
        ${two ? html`<th scope="col" class="c-diff">Różnica<small>1. − 2.</small></th>` : null}
      </tr></thead>
      ${card.categories.map((cat, ci) => {
        const sums = cols.map((x) => (x.st.started ? x.st.cats[ci].sum : null));
        const best = bestIndex(sums);
        return html`<tbody key=${cat.id}>
          <tr class="cat-row"><th scope="row">${cat.name}<small>maks. ${fmt(categoryMax(cat))}</small></th>
            ${sums.map((s, i) => html`<td class=${best.has(i) ? 'best' : ''}><span class="cv">${fmt(s, true)}<${NoteTip} text=${cols[i].notes.cats[cat.id]} label="Dodatkowe uwagi" size=${14} /></span></td>`)}
            ${two ? diffCell(diff(sums[0], sums[1])) : null}</tr>
          ${cat.items.map((it) => {
            const vals = cols.map((x) => x.v[it.id] ?? null);
            const b = it.kind === 'minus' ? new Set() : bestIndex(vals);
            const dv = it.kind === 'minus' ? diff(vals[1], vals[0]) : diff(vals[0], vals[1]);
            return html`<tr class=${'k-' + it.kind} key=${it.id}>
              <th scope="row"><span>${it.label}</span>${it.kind === 'minus' ? html`<span class="tag-neg">kara</span>` : null}<small>${rangeText(it)}</small></th>
              ${vals.map((x, i) => html`<td key=${cols[i].c.id} class=${`${b.has(i) ? 'best' : ''} ${it.kind === 'minus' && x ? 'neg' : ''}`}>
                <${CompareCell} t=${t} disc=${disc} cid=${cols[i].c.id} jid=${jid} item=${it} value=${x}
                  note=${cols[i].notes.items[it.id]} editable=${editable} /></td>`)}
              ${two ? diffCell(dv) : null}
            </tr>`;
          })}
        </tbody>`;
      })}
      <tfoot>
        <tr class="total-row"><th scope="row">Wynik całkowity<small>maks. ${fmt(cardMax(card))}</small></th>
          ${(() => {
            const tot = cols.map((x) => (x.st.started ? x.st.total : null));
            const b = bestIndex(tot);
            return tot.map((s, i) => html`<td class=${b.has(i) ? 'best' : ''}>${fmt(s, true)}</td>`);
          })()}
          ${two ? diffCell(diff(cols[0].st.started ? cols[0].st.total : null, cols[1].st.started ? cols[1].st.total : null)) : null}
        </tr>
      </tfoot>
    </table>
  </div>`;
}

// Finał: zestawienie sum z trzech dni.
export function ComparisonFinal({ t, jid, cids }) {
  const cols = cids.map((cid) => t.contestants.find((x) => x.id === cid)).filter(Boolean);
  if (cols.length < 2) return html`<${Empty} icon="columns" title="Wybierz co najmniej dwóch zawodników" />`;
  const per = cols.map((c) => FINAL_ORDER.map((d) => {
    const st = entryStats(t.cards[d], { v: compareValues(t, d, c.id, jid) });
    return st.started ? st.total : null;
  }));
  const totals = per.map((p) => (p.every((x) => x == null) ? null : p.reduce((a, x) => a + (x || 0), 0)));
  return html`<div class="table-wrap"><table class="compare">
    <thead><tr><th class="c-label">Konkurencja</th>${cols.map((c) => html`<th class="c-col" key=${c.id}><div class="cc-head"><${Avatar} c=${c} size=${40} /><span>${fullName(c)}</span></div></th>`)}</tr></thead>
    <tbody>
      ${FINAL_ORDER.map((d, di) => {
        const vals = per.map((p) => p[di]);
        const b = bestIndex(vals);
        return html`<tr class="cat-row" key=${d}><th scope="row"><${DiscBadge} disc=${d} small /><small>maks. ${fmt(cardMax(t.cards[d]))}</small></th>
          ${vals.map((x, i) => html`<td class=${b.has(i) ? 'best' : ''}>${fmt(x, true)}</td>`)}</tr>`;
      })}
    </tbody>
    <tfoot><tr class="total-row"><th scope="row">Suma trzech dni</th>
      ${(() => { const b = bestIndex(totals); return totals.map((x, i) => html`<td class=${b.has(i) ? 'best' : ''}>${fmt(x, true)}</td>`); })()}
    </tr></tfoot>
  </table></div>`;
}

function defaultPicks(t, disc, jid) {
  const list = orderedContestants(t, disc).filter((c) => {
    const d = disc === 'all' ? FINAL_ORDER : [disc];
    return d.some((x) => Object.keys(compareValues(t, x, c.id, jid)).length);
  });
  return list.slice(-3).map((c) => c.id);
}

// editable — tylko u sędziego w turnieju „W trakcie”: oceny pozycji można poprawiać w tabeli
export function CompareView({ t, jid, disc, onDisc, isFinal, editable = false }) {
  const pd = disc === 'all' ? 'relax' : disc;
  const canEdit = editable && disc !== 'all';
  const [sel, setSel] = useState(() => defaultPicks(t, disc, jid));
  const keyRef = useRef(jid);
  useEffect(() => {
    if (keyRef.current !== jid) { keyRef.current = jid; setSel(defaultPicks(t, disc, jid)); }
  }, [jid]);
  return html`<div class="compare-view">
    <div class="toolbar">
      ${isFinal ? html`<${Segmented} label="Konkurencja" value=${disc} onChange=${onDisc}
        options=${[...FINAL_ORDER.map((d) => ({ value: d, label: DISCIPLINES[d].label, icon: DISCIPLINES[d].icon, disc: d })), { value: 'all', label: 'Suma 3 dni', icon: 'trophy' }]} />` : null}
      <span class="muted">${sel.length} z maks. 6 zaznaczonych</span>
      ${sel.length ? html`<button class="link-btn" onClick=${() => setSel([])}>Wyczyść wybór</button>` : null}
      ${canEdit && sel.length >= 2 ? html`<span class="muted small cmp-edit-hint"><${Icon} name="pencil" size=${14} />
        Kliknij ocenę pozycji, aby ją poprawić — zmiana od razu trafia do karty zawodnika.</span>` : null}
    </div>
    <${ContestantPicker} t=${t} disc=${pd} selected=${sel} onChange=${setSel} />
    ${disc === 'all'
      ? html`<${ComparisonFinal} t=${t} jid=${jid} cids=${sel} />`
      : html`<${Comparison} t=${t} disc=${disc} jid=${jid} cids=${sel} editable=${canEdit} onRemove=${(id) => setSel(sel.filter((x) => x !== id))} />`}
  </div>`;
}

// ---------- mój ranking ----------

export function MyRanking({ t, jid, disc, onDisc, isFinal, onOpen }) {
  const discs = disc === 'all' ? FINAL_ORDER : [disc];
  const rows = assignRanks(t.contestants.map((c) => {
    const per = discs.map((d) => entryStats(t.cards[d], getEntry(t, d, c.id, jid)));
    return {
      c, name: fullName(c), per,
      total: per.reduce((a, s) => a + (s.started ? s.total : 0), 0),
      scored: per.some((s) => s.started),
      complete: per.every((s) => s.complete),
    };
  })).filter((r) => r.scored);
  const top = Math.max(1, ...rows.map((r) => r.total));
  return html`<div class="ranking-view">
    <div class="toolbar">
      ${isFinal ? html`<${Segmented} label="Konkurencja" value=${disc} onChange=${onDisc}
        options=${[...FINAL_ORDER.map((d) => ({ value: d, label: DISCIPLINES[d].label, icon: DISCIPLINES[d].icon, disc: d })), { value: 'all', label: 'Suma 3 dni', icon: 'trophy' }]} />` : null}
      <span class="muted"><${Icon} name="eye" size=${14} /> Ranking według Twoich ocen — inni sędziowie go nie widzą.</span>
    </div>
    ${!rows.length ? html`<${Empty} icon="ranking" title="Brak ocen">Ranking pojawi się po wypełnieniu pierwszej karty.</${Empty}>` : html`
    <ol class="myrank">
      ${rows.map((r) => html`<li key=${r.c.id}>
        <button class="mr-row" onClick=${() => onOpen && disc !== 'all' && onOpen(r.c.id)} disabled=${!onOpen || disc === 'all'}>
          <span class="mr-pos">${r.rank}${r.tie ? html`<small>ex aequo</small>` : null}</span>
          <${Avatar} c=${r.c} size=${38} />
          <span class="mr-name">${r.name}${!r.complete ? html`<small class="warn-text">karta niekompletna</small>` : null}</span>
          <span class="mr-bars" aria-hidden="true">
            ${disc === 'all'
              ? r.per.map((s, i) => html`<span class=${'mr-bar d-' + FINAL_ORDER[i]} title=${DISCIPLINES[FINAL_ORDER[i]].label}><i style=${{ width: (s.started ? (s.total / cardMax(t.cards[FINAL_ORDER[i]])) * 100 : 0) + '%' }}></i></span>`)
              : r.per[0].cats.map((cs) => html`<span class="mr-bar" title=${cs.name}><i style=${{ width: Math.max(0, (cs.sum / cs.max) * 100) + '%' }}></i><em>${cs.name.split(' ')[0]}</em></span>`)}
          </span>
          <span class="mr-total">${fmt(r.total, true)}</span>
          <span class="mr-line"><i style=${{ width: (r.total / top) * 100 + '%' }}></i></span>
        </button>
      </li>`)}
    </ol>`}
  </div>`;
}

// ---------- aplikacja sędziego ----------

export function JudgeApp({ t, judge, route, go }) {
  const discs = disciplinesOf(t);
  const isFinal = t.type === 'final';
  const view = route[1] || 'ocena';
  const disc = discs.includes(route[2]) || route[2] === 'all' ? route[2] : discs[0];
  const scoringDisc = disc === 'all' ? discs[0] : disc;
  const ordered = orderedContestants(t, scoringDisc);
  let cid = route[3];
  if (view === 'ocena' && !ordered.find((c) => c.id === cid)) {
    const firstOpen = ordered.find((c) => !entryStats(t.cards[scoringDisc], getEntry(t, scoringDisc, c.id, judge.id)).complete);
    cid = (firstOpen || ordered[0])?.id;
  }
  const idx = ordered.findIndex((c) => c.id === cid);
  const goCard = (id, d = scoringDisc) => go(`#/j/ocena/${d}/${id}`);

  useEffect(() => {
    if (view === 'ocena') document.querySelector('.card-pane')?.scrollTo({ top: 0 });
  }, [cid, view]);

  return html`<div class=${'judge-shell d-' + scoringDisc}>
    ${isFinal && view === 'ocena' ? html`<div class="discbar">
      <span class="muted">Konkurencja:</span>
      <${Segmented} label="Konkurencja" value=${scoringDisc} onChange=${(d) => go(`#/j/${view}/${d}`)}
        options=${discs.map((d) => {
          const anyDate = orderedContestants(t, d)[0];
          const date = anyDate && startOf(anyDate, d).date;
          return { value: d, label: DISCIPLINES[d].label, icon: DISCIPLINES[d].icon, disc: d, sub: date ? fmtDate(date) : '' };
        })} />
      <span class="muted small">W finale każdego zawodnika oceniasz na trzech osobnych kartach.</span>
    </div>` : null}
    ${view === 'ocena' ? html`<div class="split">
      <${Rail} t=${t} disc=${scoringDisc} jid=${judge.id} selected=${cid} onSelect=${(id) => goCard(id)} />
      <div class="card-pane">
        <${ScoreCard} key=${scoringDisc + cid} t=${t} disc=${scoringDisc} cid=${cid} jid=${judge.id}
          onPrev=${idx > 0 ? () => goCard(ordered[idx - 1].id) : null}
          onNext=${idx >= 0 && idx < ordered.length - 1 ? () => goCard(ordered[idx + 1].id) : null} />
      </div>
    </div>` : null}
    ${view === 'porownanie' ? html`<div class="page"><div class="page-head"><h1>Porównanie zawodników</h1>
        <p class="muted">Twoje oceny obok siebie, pozycja po pozycji. Pogrubienie oznacza najwyższą notę w wierszu.</p></div>
      <${CompareView} t=${t} jid=${judge.id} disc=${disc} isFinal=${isFinal} editable=${t.status === 'live'} onDisc=${(d) => go(`#/j/porownanie/${d}`)} /></div>` : null}
    ${view === 'ranking' ? html`<div class="page"><div class="page-head"><h1>Mój ranking</h1></div>
      <${MyRanking} t=${t} jid=${judge.id} disc=${disc} isFinal=${isFinal} onDisc=${(d) => go(`#/j/ranking/${d}`)}
        onOpen=${(id) => goCard(id, scoringDisc)} /></div>` : null}
  </div>`;
}
