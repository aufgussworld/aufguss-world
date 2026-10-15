// Kreator „Nowy turniej” — supervisor zakłada turniej od podstaw krok po kroku.

import { html, useState } from './lib.js';
import { TYPES, DISCIPLINES, disciplinesOf, fullName, uid, fmt, fmtRange, cardMax, prettyCode, addDays } from './model.js';
import { defaultCard } from './templates.js';
import { createTournament } from './store.js';
import { Icon, DiscBadge, toast } from './ui.js';
import { ContestantsEditor, JudgesEditor, CardEditor, QualifierImport, ensureOrder } from './editors.js';

const STEPS = ['Rodzaj i termin', 'Zawodnicy', 'Kolejność i godziny', 'Sędziowie', 'Karta oceny', 'Podsumowanie'];

const TYPE_INFO = {
  relax: 'Turniej eliminacyjny. Każdy sędzia wypełnia jedną kartę Relax dla każdego zawodnika.',
  hot: 'Turniej eliminacyjny. Jedna karta HOT na zawodnika — najwyższa pula punktów (50).',
  banya: 'Turniej eliminacyjny. Jedna karta Banya na zawodnika.',
  final: 'Piątek Relax, sobota HOT, niedziela Banya. Trzy osobne karty na zawodnika, a w porównaniu sędzia wybiera konkurencję.',
};

function nextFriday() {
  const d = new Date();
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const suggestName = (type, date) => {
  const y = (date || '').slice(0, 4) || new Date().getFullYear();
  return type === 'final' ? `Finał Turnieju Trzech Saun ${y}` : `${DISCIPLINES[type].cup} ${y}`;
};

function blankDraft() {
  const from = nextFriday();
  return {
    id: uid('t'), name: '', type: null, status: 'draft',
    dateFrom: from, dateTo: addDays(from, 1), place: 'Sommer Residence Spa & Wellness, Kuniów',
    panelSize: 4, decimalMode: 'both', audienceSize: 12,
    contestants: [], judges: [], order: {}, cards: {},
    scores: {}, history: [], excluded: {}, dq: {}, audience: {},
  };
}

export function Wizard({ go }) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState(blankDraft);
  const [openNow, setOpenNow] = useState(true);
  const [tried, setTried] = useState(false);
  const update = (fn) => setD((prev) => {
    const n = JSON.parse(JSON.stringify(prev));
    fn(n);
    return n;
  });

  const named = (list) => list.filter((x) => (x.first || '').trim() || (x.last || '').trim());
  const problems = [
    !d.type ? 'Wybierz rodzaj turnieju.' : !d.name.trim() ? 'Podaj nazwę turnieju.' : !d.dateFrom ? 'Podaj datę rozpoczęcia.' : null,
    named(d.contestants).length < 2 ? 'Dodaj co najmniej dwóch zawodników z imieniem i nazwiskiem.' : null,
    null,
    named(d.judges).length < 1 ? 'Dodaj co najmniej jednego sędziego.' : null,
    d.type && disciplinesOf(d).some((x) => !d.cards[x]?.categories.length) ? 'Karta oceny musi mieć co najmniej jedną kategorię.' : null,
    null,
  ];
  const canGo = (i) => problems.slice(0, i).every((p) => !p);

  const chooseType = (type) => update((x) => {
    const auto = !x.name || (x.type && x.name === suggestName(x.type, x.dateFrom));
    x.type = type;
    x.cards = {};
    disciplinesOf(x).forEach((dd) => (x.cards[dd] = defaultCard(dd)));
    if (auto) x.name = suggestName(type, x.dateFrom);
    x.dateTo = addDays(x.dateFrom, type === 'final' ? 2 : 1);
    ensureOrder(x);
  });

  const next = () => {
    setTried(true);
    if (problems[step]) return;
    setTried(false);
    if (step === 1) update((x) => { x.contestants = named(x.contestants); ensureOrder(x); });
    if (step === 3) update((x) => { x.judges = named(x.judges); });
    setStep(step + 1);
    window.scrollTo({ top: 0 });
  };

  const create = () => {
    const t = JSON.parse(JSON.stringify(d));
    t.contestants = named(t.contestants);
    t.judges = named(t.judges);
    ensureOrder(t);
    t.status = openNow ? 'live' : 'draft';
    t.createdAt = Date.now();
    createTournament(t);
    toast('Turniej utworzony');
    go(`#/s/t/${t.id}/wyniki`);
  };

  const cancel = () => {
    if ((d.type || d.contestants.length) && !confirm('Porzucić tworzenie turnieju? Wprowadzone dane nie zostaną zapisane.')) return;
    go('#/s');
  };

  return html`<div class="page wizard">
    <div class="page-head row">
      <div><h1>Nowy turniej</h1><p class="muted">Krok ${step + 1} z ${STEPS.length}: ${STEPS[step]}</p></div>
      <button class="btn ghost" onClick=${cancel}><${Icon} name="x" />Anuluj</button>
    </div>

    <ol class="steps">
      ${STEPS.map((s, i) => html`<li key=${i} class=${i === step ? 'on' : i < step ? 'done' : ''}>
        <button disabled=${!(i < step || (i > step && canGo(i)))} onClick=${() => setStep(i)} aria-current=${i === step ? 'step' : undefined}>
          <span class="n">${i < step ? html`<${Icon} name="check" size=${14} />` : i + 1}</span><span class="l">${s}</span></button></li>`)}
    </ol>

    <section class="wizard-body">
      ${step === 0 ? html`
        <h2 class="section-title">Rodzaj turnieju</h2>
        <div class="type-cards" role="radiogroup" aria-label="Rodzaj turnieju">
          ${['relax', 'hot', 'banya', 'final'].map((k) => html`<button type="button" role="radio" aria-checked=${d.type === k} key=${k}
            class=${`type-card d-${k} ${d.type === k ? 'on' : ''}`} onClick=${() => chooseType(k)}>
            <span class="tc-icon"><${Icon} name=${TYPES[k].icon} size=${26} /></span>
            <b>${k === 'final' ? 'Finał' : DISCIPLINES[k].cup}</b>
            <span class="muted small">${TYPE_INFO[k]}</span>
            ${k === 'final' ? html`<span class="tc-days">${['relax', 'hot', 'banya'].map((x) => html`<${DiscBadge} disc=${x} small />`)}</span>` : null}
          </button>`)}
        </div>
        ${d.type ? html`<div class="panel form">
          <div class="form-grid">
            <label class="span2">Nazwa turnieju<input type="text" value=${d.name} onInput=${(e) => update((x) => (x.name = e.currentTarget.value))} /></label>
            <label>Pierwszy dzień<input type="date" value=${d.dateFrom} onInput=${(e) => update((x) => {
              const v = e.currentTarget.value;
              if (x.name === suggestName(x.type, x.dateFrom)) x.name = suggestName(x.type, v);
              if (x.dateTo === addDays(x.dateFrom, x.type === 'final' ? 2 : 1)) x.dateTo = addDays(v, x.type === 'final' ? 2 : 1);
              x.dateFrom = v;
            })} /></label>
            <label>Ostatni dzień<input type="date" value=${d.dateTo} onInput=${(e) => update((x) => (x.dateTo = e.currentTarget.value))} /></label>
            <label class="span2">Miejsce<input type="text" value=${d.place} onInput=${(e) => update((x) => (x.place = e.currentTarget.value))} /></label>
            <label>Sędziów oceniających jedną ceremonię<input type="number" min="1" max="15" value=${d.panelSize}
              onInput=${(e) => { const n = parseInt(e.currentTarget.value, 10); if (n > 0) update((x) => (x.panelSize = n)); }} />
              <small class="muted">Regulamin: komisja 5–7 osób, ceremonię ocenia 4.</small></label>
          </div>
        </div>` : null}` : null}

      ${step === 1 ? html`
        <h2 class="section-title">Zawodnicy</h2>
        <p class="muted">Podaj liczbę zawodników, a następnie ich imiona i nazwiska. Zdjęcie jest opcjonalne, ale pomaga sędziom szybko skojarzyć występ.</p>
        ${d.type === 'final' ? html`<${QualifierImport} t=${d} update=${update} />` : null}
        <${ContestantsEditor} t=${d} update=${update} mode="names" countStepper />` : null}

      ${step === 2 ? html`
        <h2 class="section-title">Kolejność startowa i godziny</h2>
        <p class="muted">Wylosuj kolejność albo ustaw ją strzałkami, potem rozpisz godziny — możesz je też poprawić ręcznie. ${d.type === 'final' ? 'W finale każda konkurencja ma własną kolejność i dzień.' : ''}</p>
        <${ContestantsEditor} t=${d} update=${update} mode="schedule" />` : null}

      ${step === 3 ? html`
        <h2 class="section-title">Sędziowie</h2>
        <p class="muted">Każdy sędzia dostaje własny kod logowania. Kody możesz wydrukować i rozdać przed turniejem.</p>
        <${JudgesEditor} t=${d} update=${update} countStepper />` : null}

      ${step === 4 ? html`
        <h2 class="section-title">Karta oceny</h2>
        <p class="muted">Karta wzorcowa według aktualnych kryteriów oceniania. Możesz zmienić kategorie, pozycje i zakresy na kolejne lata — zmiana dotyczy tylko tego turnieju.</p>
        <${CardEditor} t=${d} update=${update} />` : null}

      ${step === 5 ? html`
        <h2 class="section-title">Podsumowanie</h2>
        <div class="summary">
          <div class="panel">
            <h3>${d.name}</h3>
            <dl class="dl">
              <dt>Rodzaj</dt><dd><${DiscBadge} disc=${d.type} /> ${TYPES[d.type].long}</dd>
              <dt>Termin</dt><dd>${fmtRange(d.dateFrom, d.dateTo)}</dd>
              <dt>Miejsce</dt><dd>${d.place}</dd>
              <dt>Karty</dt><dd>${disciplinesOf(d).map((x) => `${DISCIPLINES[x].label}: maks. ${fmt(cardMax(d.cards[x]))} pkt`).join(' · ')}</dd>
              <dt>Panel</dt><dd>${d.panelSize} sędziów ocenia każdą ceremonię</dd>
            </dl>
          </div>
          <div class="panel">
            <h3>Zawodnicy (${named(d.contestants).length})</h3>
            <p class="muted small">${named(d.contestants).map(fullName).join(', ')}</p>
          </div>
          <div class="panel">
            <h3>Sędziowie (${named(d.judges).length})</h3>
            <ul class="codes">${named(d.judges).map((j) => html`<li key=${j.id}><span>${fullName(j)}</span><span class="code">${prettyCode(j.code)}</span></li>`)}</ul>
          </div>
        </div>
        <label class="check big"><input type="checkbox" checked=${openNow} onChange=${(e) => setOpenNow(e.currentTarget.checked)} />
          Otwórz turniej od razu — sędziowie mogą się zalogować i oceniać</label>` : null}

      ${tried && problems[step] ? html`<div class="alert err" role="alert"><${Icon} name="alert" />${problems[step]}</div>` : null}
    </section>

    <footer class="wizard-foot">
      <button class="btn ghost" disabled=${step === 0} onClick=${() => setStep(step - 1)}><${Icon} name="chevron-left" />Wstecz</button>
      ${step < STEPS.length - 1
        ? html`<button class="btn primary lg" onClick=${next}>Dalej: ${STEPS[step + 1]}<${Icon} name="chevron-right" /></button>`
        : html`<button class="btn primary lg" onClick=${create}><${Icon} name="check" />Utwórz turniej</button>`}
    </footer>
  </div>`;
}
