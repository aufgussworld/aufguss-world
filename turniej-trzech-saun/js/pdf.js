// Pliki PDF (feedback dla zawodnika, wyniki) z logo Sommer Residence.
// pdfmake ładujemy dopiero przy pierwszym eksporcie — wbudowana czcionka Roboto obsługuje polskie znaki.

import { DISCIPLINES, TYPES, fmt, fmtAvg, fmtDate, fmtRange, fullName, startOf, disciplineResults, finalResults, FINAL_ORDER, entryStats, cardMax, audienceRanking } from './model.js';

const PDFMAKE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.12/pdfmake.min.js';
const FONTS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.12/vfs_fonts.min.js';
export const BRAND = '#8D2732';
const DISC_COLOR = { hot: '#C2410C', relax: '#1D4ED8', banya: '#15803D', final: '#1B1A17' };
const PAGE_W = 595.28 - 2 * 46;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Nie udało się wczytać ' + src));
    document.head.appendChild(s);
  });
}

let lib = null;
export function loadPdfMake() {
  if (!lib) {
    lib = loadScript(PDFMAKE_URL).then(() => loadScript(FONTS_URL)).then(() => window.pdfMake);
    lib.catch(() => (lib = null));
  }
  return lib;
}

// Logo Sommer Residence jest białe (na ciemne tło) — do PDF i wydruków przebarwiamy je na bordo.
const logoCache = {};
export function logoDataURL(color = BRAND) {
  if (!logoCache[color]) {
    logoCache[color] = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement('canvas');
        cv.width = img.naturalWidth;
        cv.height = img.naturalHeight;
        const ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, cv.width, cv.height);
        resolve(cv.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = new URL('../assets/logo-sommer-residence.png', import.meta.url).href;
    });
  }
  return logoCache[color];
}

export const slug = (s) => String(s || '')
  .replace(/ł/g, 'l').replace(/Ł/g, 'L')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function base(t, logo, { title, right, rightColor }) {
  return {
    pageSize: 'A4',
    pageMargins: [46, 100, 46, 58],
    info: { title, author: 'Turniej Trzech Saun — Sommer Residence', creator: 'System sędziowski Turnieju Trzech Saun' },
    header: () => ({
      margin: [46, 24, 46, 0],
      stack: [
        {
          columns: [
            { image: logo, width: 60 },
            {
              width: '*',
              margin: [14, 13, 0, 0],
              stack: [
                { text: 'TURNIEJ TRZECH SAUN', style: 'brandName' },
                { text: `${t.name} · ${fmtRange(t.dateFrom, t.dateTo)}`, style: 'brandSub' },
              ],
            },
            right ? { width: 'auto', text: right, color: rightColor || BRAND, bold: true, fontSize: 10, margin: [0, 20, 0, 0] } : { width: 'auto', text: '' },
          ],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 10, x2: PAGE_W, y2: 10, lineWidth: 1.2, lineColor: BRAND }] },
      ],
    }),
    footer: (page, pages) => ({
      margin: [46, 22, 46, 0],
      columns: [
        { text: 'Sommer Residence Spa & Wellness · Kuniów 101a, 46-200 Kluczbork', style: 'foot' },
        { text: `${page} / ${pages}`, alignment: 'right', style: 'foot', width: 'auto' },
      ],
    }),
    defaultStyle: { font: 'Roboto', fontSize: 10.5, lineHeight: 1.32, color: '#1B1A17' },
    styles: {
      brandName: { fontSize: 11, bold: true, color: BRAND, characterSpacing: 1.4 },
      brandSub: { fontSize: 9, color: '#6B655C', margin: [0, 2, 0, 0] },
      eyebrow: { fontSize: 9, bold: true, characterSpacing: 1.6, margin: [0, 0, 0, 4] },
      h1: { fontSize: 22, bold: true, margin: [0, 0, 0, 2] },
      sub: { fontSize: 11.5, color: '#45413A', margin: [0, 0, 0, 14] },
      h2: { fontSize: 12.5, bold: true, color: BRAND, margin: [0, 14, 0, 5] },
      th: { fontSize: 9, bold: true, color: '#6B655C' },
      metaL: { fontSize: 8.5, color: '#6B655C', characterSpacing: 0.6 },
      metaV: { fontSize: 11, bold: true },
      foot: { fontSize: 8, color: '#8A8378' },
      muted: { color: '#6B655C' },
    },
  };
}

const tableLayout = {
  hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0 : i === 1 || i === node.table.body.length - 1 ? 0.9 : 0.4),
  vLineWidth: () => 0,
  hLineColor: (i, node) => (i === 1 || i === node.table.body.length - 1 ? '#1B1A17' : '#E7E1D7'),
  paddingTop: () => 5,
  paddingBottom: () => 5,
  paddingLeft: () => 4,
  paddingRight: () => 4,
};

const listLayout = {
  ...tableLayout,
  hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0 : i === 1 ? 0.9 : 0.4),
  hLineColor: (i) => (i === 1 ? '#1B1A17' : '#E7E1D7'),
};

// Tekst sekcji: linie zaczynające się od „• ” stają się listą punktowaną.
function richText(text) {
  const out = [];
  let list = null;
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    if (!line) { list = null; continue; }
    if (/^[•\-–]\s+/.test(line)) {
      if (!list) out.push((list = { ul: [], margin: [0, 0, 0, 6] }));
      list.ul.push({ text: line.replace(/^[•\-–]\s+/, ''), margin: [0, 0, 0, 2] });
    } else {
      list = null;
      out.push({ text: line, margin: [0, 0, 0, 6] });
    }
  }
  return out;
}

export async function feedbackPDF(t, disc, cid, jid, sections, stats) {
  const [pdfMake, logo] = await Promise.all([loadPdfMake(), logoDataURL()]);
  const c = t.contestants.find((x) => x.id === cid);
  const j = t.judges.find((x) => x.id === jid);
  const d = DISCIPLINES[disc];
  const st = startOf(c, disc);
  const title = `Ocena seansu zawodnika: ${fullName(c)}`;
  const doc = base(t, logo, { title, right: d.label.toUpperCase(), rightColor: DISC_COLOR[disc] });
  const meta = (label, value) => ({ stack: [{ text: label.toUpperCase(), style: 'metaL' }, { text: value, style: 'metaV' }] });
  doc.content = [
    { text: 'OCENA SEANSU ZAWODNIKA', style: 'eyebrow', color: DISC_COLOR[disc] },
    { text: fullName(c), style: 'h1' },
    { text: `punkt widzenia sędziego: ${fullName(j)}`, style: 'sub' },
    {
      columns: [
        meta('Konkurencja', `${d.label} · ${t.type === 'final' ? 'Finał' : d.cup}`),
        meta('Start', st.date ? `${fmtDate(st.date, true)}${st.time ? ', ' + st.time : ''}` : '—'),
        meta('Wynik', `${fmt(stats.total, true)} / ${fmt(stats.max)} pkt`),
      ],
      columnGap: 14,
      margin: [0, 0, 0, 14],
    },
    {
      table: {
        widths: ['*', 90],
        body: [
          [{ text: 'KATEGORIA', style: 'th' }, { text: 'PUNKTY', style: 'th', alignment: 'right' }],
          ...stats.cats.map((x) => [x.name, { text: `${fmt(x.sum, true)} / ${fmt(x.max)}`, alignment: 'right' }]),
          [{ text: 'Wynik całkowity', bold: true }, { text: `${fmt(stats.total, true)} / ${fmt(stats.max)}`, bold: true, alignment: 'right' }],
        ],
      },
      layout: tableLayout,
      margin: [0, 0, 0, 6],
    },
    ...sections.flatMap((s) => [{ text: s.title, style: 'h2' }, ...richText(s.text)]),
    {
      margin: [0, 22, 0, 0],
      unbreakable: true,
      stack: [
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 160, y2: 0, lineWidth: 0.6, lineColor: '#D5CCBE' }] },
        { text: fullName(j), bold: true, margin: [0, 6, 0, 0] },
        { text: `sędzia · ${t.name}`, style: 'muted', fontSize: 9.5 },
        { text: new Date().toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }), style: 'muted', fontSize: 9.5 },
      ],
    },
  ];
  pdfMake.createPdf(doc).download(`ocena-seansu-${slug(fullName(c))}-${slug(fullName(j))}.pdf`);
}

// Karta jednego sędziego dla jednego zawodnika — kopia „na papierze” z miejscem na podpis.
export async function cardPDF(t, disc, cid, jid) {
  const [pdfMake, logo] = await Promise.all([loadPdfMake(), logoDataURL()]);
  const c = t.contestants.find((x) => x.id === cid);
  const j = t.judges.find((x) => x.id === jid);
  const card = t.cards[disc];
  const e = t.scores?.[disc]?.[cid]?.[jid] || {};
  const st = entryStats(card, e);
  const d = DISCIPLINES[disc];
  const s = startOf(c, disc);
  const range = (it) => (it.kind === 'minus' ? `0 do −${fmt(Math.round(it.max * 10))}` : it.kind === 'bin' ? `0 / ${fmt(Math.round(it.max * 10))}` : `0–${fmt(Math.round(it.max * 10))}`);
  const value = (it) => {
    const v = e.v?.[it.id];
    if (v == null) return '—';
    return it.kind === 'minus' ? (v ? '−' + fmt(v) : '0') : fmt(v);
  };
  const doc = base(t, logo, { title: `Karta sędziego: ${fullName(c)}`, right: d.label.toUpperCase(), rightColor: DISC_COLOR[disc] });
  const meta = (label, val) => ({ stack: [{ text: label.toUpperCase(), style: 'metaL' }, { text: val, style: 'metaV' }] });
  doc.content = [
    { text: 'KARTA SĘDZIEGO', style: 'eyebrow', color: DISC_COLOR[disc] },
    { text: fullName(c), style: 'h1' },
    { text: `sędzia: ${fullName(j)}`, style: 'sub' },
    {
      columns: [
        meta('Konkurencja', `${d.label}${card.duration ? ` · ${card.duration}` : ''}`),
        meta('Start', s.date ? `${fmtDate(s.date, true)}${s.time ? ', ' + s.time : ''}` : '—'),
        meta('Wynik', `${fmt(st.total, true)} / ${fmt(cardMax(card))} pkt`),
      ],
      columnGap: 14,
      margin: [0, 0, 0, 12],
    },
    ...card.categories.flatMap((cat, ci) => [
      {
        table: {
          headerRows: 1,
          dontBreakRows: true,
          widths: ['*', 58, 48],
          body: [
            [{ text: cat.name.toUpperCase(), bold: true, color: BRAND, fontSize: 9.5 }, { text: 'ZAKRES', style: 'th', alignment: 'right' }, { text: 'OCENA', style: 'th', alignment: 'right' }],
            ...cat.items.map((it) => [
              {
                stack: [
                  { text: [{ text: it.label }, it.kind === 'minus' ? { text: '  KARA', color: '#B42318', fontSize: 7.5, bold: true } : ''] },
                  e.ni?.[it.id] ? { text: `Uwaga: ${e.ni[it.id]}`, italics: true, color: '#6B655C', fontSize: 9 } : null,
                ].filter(Boolean),
              },
              { text: range(it), alignment: 'right', color: it.kind === 'minus' ? '#B42318' : '#6B655C', fontSize: 9 },
              { text: value(it), alignment: 'right', bold: true, color: it.kind === 'minus' && e.v?.[it.id] ? '#B42318' : '#1B1A17' },
            ]),
            [{ text: 'Suma kategorii', bold: true }, { text: `maks. ${fmt(st.cats[ci].max)}`, alignment: 'right', fontSize: 9, color: '#6B655C' }, { text: fmt(st.cats[ci].sum, true), alignment: 'right', bold: true }],
          ],
        },
        layout: tableLayout,
        unbreakable: true,
        fontSize: 9.8,
        margin: [0, 0, 0, e.n?.[cat.id] ? 3 : 10],
      },
      e.n?.[cat.id] ? { text: [{ text: 'Dodatkowe uwagi: ', bold: true }, e.n[cat.id]], fontSize: 9.5, margin: [0, 0, 0, 10] } : null,
    ].filter(Boolean)),
    {
      unbreakable: true,
      margin: [0, 8, 0, 0],
      columns: [
        { stack: [{ text: 'WYNIK CAŁKOWITY', style: 'metaL' }, { text: `${fmt(st.total, true)} / ${fmt(cardMax(card))} pkt`, fontSize: 16, bold: true }] },
        {
          width: 220,
          stack: [
            { text: ' ', margin: [0, 14, 0, 0] },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 0.7, lineColor: '#8A8378' }] },
            { text: `podpis sędziego (${fullName(j)})`, style: 'muted', fontSize: 8.5, margin: [0, 3, 0, 0] },
          ],
        },
      ],
    },
    { text: `Wygenerowano z systemu sędziowskiego: ${new Date().toLocaleString('pl-PL')} · ${st.filled} z ${st.required} ocen`, style: 'muted', fontSize: 8, margin: [0, 16, 0, 0] },
  ];
  pdfMake.createPdf(doc).download(`karta-${slug(d.label)}-${slug(fullName(c))}-${slug(fullName(j))}.pdf`);
}

// Ranking Nagrody Publiczności — z wszystkimi głosami; odrzucone (skrajne) w nawiasach.
export async function audiencePDF(t, disc) {
  const [pdfMake, logo] = await Promise.all([loadPdfMake(), logoDataURL()]);
  const d = DISCIPLINES[disc];
  const { byRank, voted, size } = audienceRanking(t, disc);
  const doc = base(t, logo, { title: `Nagroda Publiczności — ${t.name}`, right: d.label.toUpperCase(), rightColor: DISC_COLOR[disc] });
  const votesText = (r) => r.votes.map((v, i) => (v == null ? null : r.dropped.includes(i) ? `(${fmt(v)})` : fmt(v))).filter(Boolean).join('  ');
  const leader = byRank.filter((r) => r.rank === 1);
  const body = [
    ['MIEJSCE', 'ZAWODNIK', 'GŁOSY (odrzucone w nawiasach)', 'ŚREDNIA', 'WYNIK'].map((h, i) => ({ text: h, style: 'th', alignment: i > 2 ? 'right' : 'left' })),
    ...byRank.map((r) => [
      { text: r.rank ? `${r.rank}${r.tie ? ' ex aequo' : ''}` : '—', bold: true },
      { stack: [{ text: r.name, bold: true }, { text: startOf(r.c, disc).time ? `${fmtDate(startOf(r.c, disc).date)}, ${startOf(r.c, disc).time}` : '', fontSize: 8.5, color: '#6B655C' }] },
      { text: r.s.count ? `${votesText(r)}${r.s.count < size ? `  · ${r.s.count} z ${size} głosów` : ''}` : 'brak głosów', fontSize: 9, color: r.s.count ? '#1B1A17' : '#8A8378' },
      { text: r.s.avg != null ? fmtAvg(r.s.avg) : '—', alignment: 'right' },
      { text: r.s.score != null ? fmt(r.s.score) : '—', alignment: 'right', bold: true },
    ]),
  ];
  doc.content = [
    { text: `NAGRODA PUBLICZNOŚCI · ${d.label.toUpperCase()}`, style: 'eyebrow', color: BRAND },
    { text: 'Ranking głosów publiczności', style: 'h1' },
    { text: `Głosuje ${size} osób, skala 0–10; odrzucamy jedną najwyższą i jedną najniższą ocenę, a wynik to średnia pozostałych głosów × 10. Ocenionych zawodników: ${voted} z ${byRank.length}. Punkty publiczności nie liczą się do wyniku turnieju. Stan na ${new Date().toLocaleString('pl-PL', { dateStyle: 'long', timeStyle: 'short' })}.`, style: 'sub' },
    leader.length ? {
      margin: [0, 0, 0, 10],
      table: { widths: ['*'], body: [[{
        text: [
          { text: `${leader.length > 1 ? 'PROWADZĄ EX AEQUO' : 'PROWADZI'}   `, style: 'metaL' },
          { text: leader.map((r) => r.name).join(', '), fontSize: 13, bold: true },
          { text: `   ${fmt(leader[0].s.score)} pkt · średnia ${fmtAvg(leader[0].s.avg)}`, style: 'muted' },
        ],
        fillColor: '#F8EDEE', margin: [10, 6, 10, 6],
      }]] },
      layout: 'noBorders',
    } : null,
    { table: { headerRows: 1, widths: ['auto', 130, '*', 'auto', 'auto'], body }, layout: listLayout, fontSize: 9.8 },
  ].filter(Boolean);
  pdfMake.createPdf(doc).download(`nagroda-publicznosci-${slug(t.name)}-${slug(d.label)}.pdf`);
}

export async function resultsPDF(t, disc) {
  const [pdfMake, logo] = await Promise.all([loadPdfMake(), logoDataURL()]);
  const all = disc === 'all';
  const label = all ? 'Klasyfikacja łączna' : DISCIPLINES[disc].label;
  const doc = base(t, logo, { title: `Wyniki — ${t.name}`, right: label.toUpperCase(), rightColor: DISC_COLOR[all ? 'final' : disc] });
  const rows = all ? finalResults(t) : disciplineResults(t, disc);
  const card = all ? null : t.cards[disc];
  const head = ['MIEJSCE', 'ZAWODNIK', ...(all ? FINAL_ORDER.map((d) => DISCIPLINES[d].label.toUpperCase()) : card.categories.map((c) => c.name.toUpperCase())), 'SUMA'];
  const body = [
    head.map((h, i) => ({ text: h, style: 'th', alignment: i > 1 ? 'right' : 'left' })),
    ...rows.map((r) => [
      { text: r.dq ? 'DSQ' : r.rank ? `${r.rank}${r.tie ? ' ex aequo' : ''}` : '—', bold: true, color: r.dq ? '#B42318' : '#1B1A17' },
      { stack: [{ text: r.name, bold: true }, r.dq ? { text: `Dyskwalifikacja: ${r.dq}`, fontSize: 8.5, color: '#B42318' } : null].filter(Boolean) },
      ...(all
        ? FINAL_ORDER.map((d) => ({ text: r.per[d].counted.length ? fmt(r.per[d].total, true) : '—', alignment: 'right' }))
        : r.cats.map((x) => ({ text: r.scored ? fmt(x.sum, true) : '—', alignment: 'right' }))),
      { text: r.scored ? fmt(r.total, true) : '—', alignment: 'right', bold: true },
    ]),
  ];
  doc.content = [
    { text: TYPES[t.type].long.toUpperCase(), style: 'eyebrow', color: BRAND },
    { text: `Wyniki — ${label}`, style: 'h1' },
    { text: `${t.place || 'Sommer Residence'} · stan na ${new Date().toLocaleString('pl-PL', { dateStyle: 'long', timeStyle: 'short' })}`, style: 'sub' },
    { table: { headerRows: 1, widths: ['auto', '*', ...head.slice(2).map(() => 'auto')], body }, layout: listLayout, fontSize: 9.5 },
    t.type !== 'final' ? { text: 'Miejsca 1–5 (z remisami) — automatyczna kwalifikacja do finału.', style: 'muted', fontSize: 9, margin: [0, 10, 0, 0] } : null,
  ].filter(Boolean);
  pdfMake.createPdf(doc).download(`wyniki-${slug(t.name)}-${slug(label)}.pdf`);
}
