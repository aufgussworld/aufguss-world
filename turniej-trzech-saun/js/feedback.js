// Generator feedbacku: „Ocena seansu zawodnika X — punkt widzenia sędziego Y”.
// Szkic powstaje z ocen, uwag do pozycji i dodatkowych uwag sędziego, a sędzia poprawia go przed zapisem.
// Wersja demonstracyjna używa wbudowanego generatora tekstu. Po podłączeniu serwera ustawienie
// window.TTS_CONFIG.feedbackEndpoint przekieruje te same dane do modelu AI (klucz API zostaje na serwerze).

import { html, useState } from './lib.js';
import { DISCIPLINES, fmt, fullName, entryStats, getEntry, cardMax, startOf, fmtDate } from './model.js';
import { setFeedback } from './store.js';
import { Icon, Modal, DiscBadge, Avatar, toast } from './ui.js';
import { feedbackPDF } from './pdf.js';

// ---------- dane wejściowe ----------

export function feedbackContext(t, disc, cid, jid) {
  const card = t.cards[disc];
  const c = t.contestants.find((x) => x.id === cid);
  const j = t.judges.find((x) => x.id === jid);
  const e = getEntry(t, disc, cid, jid) || {};
  const st = entryStats(card, e);
  return {
    tournament: t.name,
    final: t.type === 'final',
    discipline: DISCIPLINES[disc].label,
    contestant: fullName(c),
    judge: fullName(j),
    start: startOf(c, disc),
    total: st.total,
    max: cardMax(card),
    complete: st.complete,
    categories: card.categories.map((cat, i) => ({
      id: cat.id,
      name: cat.name,
      sum: st.cats[i].sum,
      max: st.cats[i].max,
      note: e.n?.[cat.id] || '',
      items: cat.items.map((it) => ({
        id: it.id, label: it.label, kind: it.kind,
        max: Math.round(it.max * 10), value: e.v?.[it.id] ?? null, note: e.ni?.[it.id] || '',
      })),
    })),
  };
}

// ---------- wbudowany generator ----------

const lc = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const pct = (a, b) => (b > 0 ? a / b : 0);
const listPl = (arr) => (arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} i ${arr[arr.length - 1]}`);
const seedOf = (s) => [...s].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0, 3);
const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];

// Wskazówki dopasowywane po słowach w nazwie pozycji (kolejność ma znaczenie).
const HINTS = [
  ['czas', 'Pilnuj ram czasowych — zarówno samej ceremonii, jak i przygotowania oraz sprzątania sauny.'],
  ['wykazu', 'Pamiętaj o dostarczeniu wykazu zapachów, tematu i historii najpóźniej 15 minut przed ceremonią.'],
  ['bezpiecz', 'Bezpieczeństwo jest zawsze na pierwszym miejscu — warto przeanalizować, co można zrobić inaczej.'],
  ['głośna reakcja', 'Prowadź publiczność tak, by zachowała spokój i ciszę przez cały seans.'],
  ['głośn', 'Pracuj ciszej i spokojniej — w Relaksie każdy dźwięk ma znaczenie.'],
  ['nuda', 'Urozmaicaj tempo i dynamikę, żeby uniknąć monotonii.'],
  ['przedmiot', 'Wykorzystaj co najmniej trzy różne przedmioty do rozprowadzania ciepła.'],
  ['reakcja publiczności', 'Obserwuj sygnały publiczności i reaguj, zanim zrobi się za gorąco.'],
  ['przedawkowan', 'Dawkuj zapachy tak, by były wyraźne, ale nie przytłaczały.'],
  ['relaksu', 'Postaw na spokojne tempo, ciszę i płynne przejścia — w Relaksie liczy się poczucie odprężenia.'],
  ['przygotow', 'Przygotuj saunę i akcesoria z wyprzedzeniem — dobra organizacja przekłada się na płynność seansu.'],
  ['otwarci', 'Dopracuj wejście i zamknięcie ceremonii — to pierwsze i ostatnie wrażenie publiczności.'],
  ['wykonanie', 'Przećwicz przejścia między rundami, żeby ceremonia płynęła bez przestojów.'],
  ['czystoś', 'Zadbaj o porządek i higienę przed seansem, w jego trakcie i po nim.'],
  ['muzyk', 'Zadbaj, by muzyka, strój i historia tworzyły jedną, spójną opowieść.'],
  ['atrakcj', 'Dodatkowe atrakcje powiązane z tematem potrafią wyraźnie podnieść odbiór seansu.'],
  ['emocj', 'Zbuduj wyraźną kulminację — publiczność chce poczuć narastanie emocji.'],
  ['specjaln', 'Wplataj techniki specjalne tam, gdzie wzmacniają historię, a nie tylko efekt.'],
  ['machani', 'Popracuj nad płynnością, precyzją i różnorodnością technik machania.'],
  ['kreatyw', 'Poszukaj własnego, zaskakującego elementu, który wyróżni ceremonię na tle innych.'],
  ['wzrost temperatury', 'Buduj ciepło stopniowo, z wyraźnym przyrostem w kolejnych rundach.'],
  ['dystrybuc', 'Zadbaj o równomierne rozprowadzenie ciepła w całej saunie — także na niższych ławkach.'],
  ['komfort', 'Obserwuj publiczność i dopasuj intensywność do jej komfortu.'],
  ['minimum', 'Dobierz co najmniej trzy wyraźnie wyczuwalne, rozpoznawalne zapachy.'],
  ['sposób podania', 'Spróbuj ciekawszego sposobu podania zapachów — forma też buduje wrażenie.'],
  ['dopasowanie zapachów', 'Dobieraj zapachy tak, by opowiadały tę samą historię co muzyka i strój.'],
  ['więcej niż', 'Rozważ wykorzystanie więcej niż trzech zapachów lub kompozycji.'],
];
const hintFor = (label) => {
  const l = label.toLowerCase();
  const h = HINTS.find(([k]) => l.includes(k));
  return h ? h[1] : 'Warto przyjrzeć się temu elementowi przy przygotowaniach do kolejnego startu.';
};

const TIERS = [
  [0.85, (x) => `To był seans na najwyższym poziomie — ${x} Całość tworzyła spójną, przemyślaną ceremonię, którą zapamiętuje się na długo.`],
  [0.72, (x) => `Bardzo dobry, dojrzały seans — ${x} Widać doświadczenie i pomysł na ceremonię, a do pełni brakowało niewiele.`],
  [0.6, (x) => `Dobry seans z wyraźnymi atutami — ${x} Fundament jest solidny, kilka elementów warto jeszcze dopracować.`],
  [0.45, (x) => `Seans poprawny, z momentami, które się bronią — ${x} Jest kilka obszarów, w których łatwo zyskać punkty.`],
  [-1, (x) => `${x.charAt(0).toUpperCase() + x.slice(1)} Ten seans pokazał przede wszystkim, nad czym warto popracować przed kolejnym startem — poniżej konkretne wskazówki.`],
];

const CAT_LEVEL = [
  [0.85, ['To jedna z najmocniejszych stron tego seansu.', 'Tutaj ceremonia naprawdę błyszczała.']],
  [0.7, ['Wysoki poziom, z niewielkim zapasem do maksimum.', 'Bardzo solidnie — do pełni brakowało niewiele.']],
  [0.55, ['Solidna podstawa, choć jest tu jeszcze sporo do zyskania.', 'Poprawnie, z wyraźnym potencjałem na więcej.']],
  [-1, ['Ta część wymaga jeszcze sporo pracy.', 'Tu kryje się duża rezerwa punktów.']],
];

const CLOSING = [
  [0.72, 'Dziękuję za seans, który był prawdziwą przyjemnością do oceniania. Trzymam kciuki za kolejne starty — z takim poziomem walka o najwyższe miejsca jest jak najbardziej realna.'],
  [0.5, 'Dziękuję za udział w Turnieju Trzech Saun i za seans, który pozwolił mi przyjrzeć się Twojej pracy z bliska. Mam nadzieję, że te uwagi pomogą w przygotowaniach do kolejnych startów.'],
  [-1, 'Dziękuję za odwagę i zaangażowanie. Każdy start to doświadczenie, które procentuje — wierzę, że te wskazówki pomogą zrobić duży krok naprzód.'],
];

export function draftFeedback(ctx) {
  const seed = seedOf(ctx.contestant + ctx.judge);
  const ratio = pct(ctx.total, ctx.max);
  const items = ctx.categories.flatMap((cat) => cat.items.map((it) => ({ ...it, cat: cat.name })));
  const scored = items.filter((it) => it.kind !== 'minus' && it.value != null && it.max > 0)
    .map((it) => ({ ...it, r: pct(it.value, it.max) }));
  const penalties = items.filter((it) => it.kind === 'minus' && it.value > 0);
  const penaltySum = penalties.reduce((a, it) => a + it.value, 0);

  // Podsumowanie
  const head = `${fmt(ctx.total, true)} z ${fmt(ctx.max)} pkt (${Math.round(ratio * 100)}%) w konkurencji ${ctx.discipline}${ctx.final ? ' podczas finału' : ''}.`;
  const summary = [TIERS.find(([min]) => ratio >= min)[1](head)];
  const cats = ctx.categories.filter((c) => c.max > 0).map((c) => ({ ...c, r: pct(c.sum, c.max) }));
  if (cats.length > 1) {
    const best = [...cats].sort((a, b) => b.r - a.r)[0];
    const worst = [...cats].sort((a, b) => a.r - b.r)[0];
    if (best.id !== worst.id && best.r - worst.r > 0.05) {
      summary.push(`Najmocniejszą częścią była kategoria „${best.name}” (${fmt(best.sum, true)} z ${fmt(best.max)}), a najwięcej do zyskania jest w kategorii „${worst.name}” (${fmt(worst.sum, true)} z ${fmt(worst.max)}).`);
    } else {
      summary.push('Wszystkie kategorie stały na podobnym poziomie — to dobra baza do dalszego rozwoju.');
    }
  }
  if (penaltySum > 0) summary.push(`Punkty karne obniżyły wynik o ${fmt(penaltySum)} pkt.`);

  const sections = [{ id: 'summary', title: 'Podsumowanie', text: summary.join(' ') }];

  // Kategorie
  ctx.categories.forEach((cat, i) => {
    const r = pct(cat.sum, cat.max);
    const lines = [pick(CAT_LEVEL.find(([min]) => r >= min)[1], seed + i)];
    const own = scored.filter((it) => it.cat === cat.name);
    const strong = own.filter((it) => it.r >= 0.8 && it.kind === 'plus').sort((a, b) => b.r - a.r).slice(0, 3);
    const weak = own.filter((it) => it.r <= 0.5 && it.kind === 'plus').sort((a, b) => a.r - b.r).slice(0, 3);
    if (strong.length) lines.push(`Szczególnie dobrze wypadły: ${listPl(strong.map((it) => lc(it.label)))}.`);
    if (weak.length) lines.push(`Najwięcej do poprawy: ${listPl(weak.map((it) => `${lc(it.label)} (${fmt(it.value)} z ${fmt(it.max)})`))}.`);
    if (!strong.length && !weak.length && own.length) lines.push('Wszystkie elementy na równym, przyzwoitym poziomie.');
    const pen = penalties.filter((it) => it.cat === cat.name);
    if (pen.length) lines.push(`Punkty karne: ${listPl(pen.map((it) => `${lc(it.label)} (−${fmt(it.value)})`))}.`);
    let text = lines.join(' ');
    const notes = cat.items.filter((it) => it.note);
    if (notes.length) text += '\nMoje notatki:\n' + notes.map((it) => `• ${it.label}: ${it.note}`).join('\n');
    if (cat.note) text += `\nDodatkowo: ${cat.note}`;
    sections.push({ id: 'cat-' + cat.id, title: cat.name, text });
  });

  // Mocne strony i obszary do pracy
  const best = scored.filter((it) => it.kind === 'plus' && it.r >= 0.7).sort((a, b) => b.r - a.r).slice(0, 3);
  sections.push({
    id: 'strengths',
    title: 'Mocne strony',
    text: best.length
      ? best.map((it) => `• ${it.label} — ${fmt(it.value)} z ${fmt(it.max)} pkt${it.note ? `. ${it.note}` : ''}`).join('\n')
      : '• Zaangażowanie i odwaga — start w turnieju to zawsze cenne doświadczenie, na którym można budować.',
  });
  const worst = [...scored].sort((a, b) => a.r - b.r).filter((it) => it.r < 0.7).slice(0, 4);
  const improve = [
    ...worst.map((it) => `• ${it.label} (${fmt(it.value)} z ${fmt(it.max)}) — ${hintFor(it.label)}`),
    ...penalties.map((it) => `• ${it.label} (−${fmt(it.value)} pkt) — ${hintFor(it.label)}`),
  ];
  sections.push({
    id: 'improve',
    title: 'Na co zwrócić uwagę przed kolejnym startem',
    text: improve.length ? improve.join('\n') : '• Utrzymaj obecny poziom i szukaj detali, które zrobią różnicę w walce o najwyższe miejsca.',
  });
  sections.push({ id: 'closing', title: 'Na zakończenie', text: CLOSING.find(([min]) => ratio >= min)[1] });
  return sections;
}

export async function generateFeedback(ctx) {
  const endpoint = window.TTS_CONFIG && window.TTS_CONFIG.feedbackEndpoint;
  if (endpoint) {
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ctx) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.sections) && data.sections.length) return { sections: data.sections, source: 'ai' };
      }
    } catch (e) {
      console.warn('Generator AI niedostępny — używam wbudowanego', e);
    }
  }
  return { sections: draftFeedback(ctx), source: 'local' };
}

// ---------- okno feedbacku ----------

const rowsFor = (text) => Math.min(16, Math.max(3, String(text || '').split('\n').reduce((a, l) => a + Math.ceil((l.length || 1) / 92), 0) + 1));
const clone = (x) => JSON.parse(JSON.stringify(x));

export function FeedbackModal({ t, disc, cid, jid, readOnly = false, onClose }) {
  const c = t.contestants.find((x) => x.id === cid);
  const j = t.judges.find((x) => x.id === jid);
  const card = t.cards[disc];
  const entry = getEntry(t, disc, cid, jid);
  const stats = entryStats(card, entry);
  const saved = entry?.fb;
  const [secs, setSecs] = useState(() => (saved?.sections ? clone(saved.sections) : null));
  const [source, setSource] = useState(saved?.source || null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const st = startOf(c, disc);
  const pdfStats = { total: stats.total, max: cardMax(card), cats: stats.cats };

  const generate = async () => {
    if (secs && !confirm('Przygotować szkic od nowa? Twoje poprawki w obecnym tekście zostaną zastąpione.')) return;
    setBusy(true);
    try {
      const r = await generateFeedback(feedbackContext(t, disc, cid, jid));
      setSecs(r.sections);
      setSource(r.source);
      setDirty(true);
    } finally {
      setBusy(false);
    }
  };
  const save = () => {
    setFeedback(t.id, disc, cid, jid, { sections: secs, source });
    setDirty(false);
    toast('Feedback zapisany');
  };
  const pdf = async () => {
    if (!readOnly && dirty) save();
    setBusy(true);
    try {
      await feedbackPDF(t, disc, cid, jid, secs, pdfStats);
    } catch (e) {
      console.error(e);
      toast('Nie udało się przygotować pliku PDF — sprawdź połączenie z internetem', 'err');
    } finally {
      setBusy(false);
    }
  };
  const close = () => {
    if (dirty && !confirm('Masz niezapisane zmiany w feedbacku. Zamknąć bez zapisywania?')) return;
    onClose();
  };
  const edit = (i, field, value) => {
    setSecs((s) => s.map((x, k) => (k === i ? { ...x, [field]: value } : x)));
    setDirty(true);
  };

  const footer = secs ? html`
    ${!readOnly ? html`<button class="btn ghost" onClick=${generate} disabled=${busy}><${Icon} name="sparkles" size=${16} />Przygotuj szkic od nowa</button>` : null}
    <span class="grow"></span>
    <span class="muted small fb-state">${dirty ? 'Niezapisane zmiany' : saved?.updatedAt ? `Zapisano ${new Date(saved.updatedAt).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })}` : ''}</span>
    ${!readOnly ? html`<button class="btn" onClick=${save} disabled=${!dirty || busy}><${Icon} name="check" size=${16} />Zapisz</button>` : null}
    <button class="btn primary" onClick=${pdf} disabled=${busy}><${Icon} name="download" size=${16} />${busy ? 'Przygotowuję…' : 'Pobierz PDF'}</button>` : null;

  return html`<${Modal} title="Feedback dla zawodnika" onClose=${close} wide footer=${footer}>
    <div class=${'fb d-' + disc}>
      <header class="fb-head">
        <${Avatar} c=${c} size=${56} />
        <div>
          <p class="eyebrow">Ocena seansu zawodnika</p>
          <h3>${fullName(c)}</h3>
          <p class="muted">punkt widzenia sędziego: <b>${fullName(j)}</b></p>
        </div>
        <div class="fb-score">
          <${DiscBadge} disc=${disc} />
          <span class="big">${fmt(stats.total, true)}<small> / ${fmt(cardMax(card))}</small></span>
          <span class="muted small">${st.date ? `${fmtDate(st.date)}${st.time ? ', ' + st.time : ''}` : ''}</span>
        </div>
      </header>

      ${!secs ? html`<div class="fb-empty">
        ${readOnly
          ? html`<p class="muted">Sędzia nie przygotował jeszcze feedbacku dla tego zawodnika.</p>`
          : html`
            <${Icon} name="sparkles" size=${30} />
            <h4>Szkic na podstawie Twojej karty</h4>
            <p class="muted">Generator przygotuje wstępną treść z Twoich ocen, uwag przy pozycjach i dodatkowych uwag w kategoriach. Potem możesz wszystko poprawić, zapisać i pobrać jako PDF z logo Sommer Residence.</p>
            ${!stats.complete ? html`<div class="alert warn"><${Icon} name="alert" />Karta nie jest jeszcze kompletna (${stats.filled} z ${stats.required} ocen) — szkic może pominąć część elementów.</div>` : null}
            <button class="btn primary lg" onClick=${generate} disabled=${busy}><${Icon} name="sparkles" />${busy ? 'Przygotowuję szkic…' : 'Przygotuj szkic feedbacku'}</button>`}
      </div>` : html`
        ${!readOnly && source === 'local' ? html`<p class="hint-line"><${Icon} name="info" size=${14} />Szkic przygotowany automatycznie z Twoich ocen i notatek — przeczytaj go i popraw przed zapisaniem. W wersji demonstracyjnej działa wbudowany generator tekstu; w wersji produkcyjnej szkic napisze model AI.</p>` : null}
        <div class="fb-sections">
          ${secs.map((s, i) => html`<section class="fb-sec" key=${s.id || i}>
            ${readOnly
              ? html`<h4>${s.title}</h4><p class="fb-ro">${s.text}</p>`
              : html`
                <input type="text" class="fb-title" value=${s.title} aria-label="Tytuł sekcji" onInput=${(e) => edit(i, 'title', e.currentTarget.value)} />
                <textarea class="fb-text" rows=${rowsFor(s.text)} value=${s.text} aria-label=${'Treść: ' + s.title}
                  onInput=${(e) => edit(i, 'text', e.currentTarget.value)}></textarea>`}
          </section>`)}
        </div>
        ${!readOnly ? html`<p class="muted small">Linie zaczynające się od „• ” w pliku PDF zamienią się w listę punktowaną.</p>` : null}`}
    </div>
  </${Modal}>`;
}
