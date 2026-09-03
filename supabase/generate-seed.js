/* Generator pliku seed.sql — przelewa dane prototypu (data/*.js) do bazy.
   Uruchomienie:  node supabase/generate-seed.js
   Wynik:         supabase/seed.sql
   Skrypt jest idempotentny: seed.sql można wykonać wielokrotnie (on conflict do nothing). */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const window = {};
['objects-data.js', 'events-data.js', 'tournaments-data.js', 'posts-data.js']
  .forEach(f => eval(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8')));

const OBJECTS = window.AUFGUSS_OBJECTS || [];
const EVENTS = window.AUFGUSS_EVENTS || [];
const TOURN = window.AUFGUSS_TOURNAMENTS || [];
const POSTS = window.AUFGUSS_POSTS || {};
const AUTHORS = window.AUFGUSS_POST_AUTHORS || {};

// ── narzędzia ───────────────────────────────────────────────────────────────
const q = v => v === null || v === undefined || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`;
const n = v => v === null || v === undefined || v === '' ? 'null' : Number(v);
const b = v => v ? 'true' : 'false';
const slug = s => String(s).toLowerCase()
  .replace(/ą/g,'a').replace(/ć/g,'c').replace(/ę/g,'e').replace(/ł/g,'l').replace(/ń/g,'n')
  .replace(/ó/g,'o').replace(/ś/g,'s').replace(/[żź]/g,'z')
  .replace(/[áàâä]/g,'a').replace(/[éèêë]/g,'e').replace(/[íìîï]/g,'i').replace(/[óòôö]/g,'o')
  .replace(/[úùûü]/g,'u').replace(/[čć]/g,'c').replace(/[šś]/g,'s').replace(/[žź]/g,'z')
  .replace(/ř/g,'r').replace(/ď/g,'d').replace(/ť/g,'t').replace(/ň/g,'n').replace(/ě/g,'e')
  .replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60);

const out = [];
const S = (...l) => out.push(...l);

S('-- ═══════════════════════════════════════════════════════════════════════',
  '-- aufguss.world — dane startowe (WYGENEROWANE: node supabase/generate-seed.js)',
  '-- Nie edytować ręcznie: zmiany nanosić w data/*.js i wygenerować ponownie.',
  '-- ═══════════════════════════════════════════════════════════════════════',
  'begin;', '');

// ── OBIEKTY ─────────────────────────────────────────────────────────────────
const venueSlug = {}, seen = new Set();
OBJECTS.forEach(o => {
  let s = slug(o.name) || `obiekt-${o.id}`;
  while (seen.has(s)) s = `${s}-${o.id}`;
  seen.add(s); venueSlug[o.id] = s;
});
S(`-- Obiekty (${OBJECTS.length})`);
S('insert into public.venues (id, slug, name, country, country_code, city, lat, lng, website) values');
S(OBJECTS.map(o =>
  `  (${o.id}, ${q(venueSlug[o.id])}, ${q(o.name)}, ${q(o.country)}, ${q(o.flag)}, ${q(o.city)}, ${o.lat}, ${o.lng}, ${q(o.website)})`
).join(',\n') + '\non conflict (id) do nothing;');
S('@@EXTRA_VENUES@@');   // uzupełniane na końcu — obiekty wykrywane dopiero przy mapowaniu
S(`select setval(pg_get_serial_sequence('public.venues','id'), (select max(id) from public.venues));`, '');

// nazwa obiektu → id (wydarzenia i turnieje odwołują się nazwą, nie identyfikatorem)
const byName = {};
OBJECTS.forEach(o => { byName[o.name.toLowerCase()] = o.id; });
// Znane rozjazdy nazw między zbiorami danych (nazwa polska vs oryginalna).
const ALIAS = { 'therme erding': 'termy erding' };
// Obiekty występujące w wydarzeniach/turniejach, których NIE MA na mapie użytkownika.
// Trafiają do bazy jako robocze (status 'draft'), żeby klucze obce działały,
// ale nie pokazują się publicznie, dopóki nie zostaną zweryfikowane.
const extra = new Map();
let nextId = Math.max(...OBJECTS.map(o => o.id)) + 1;
const findVenue = (name, meta) => {
  if (!name) return null;
  const k = ALIAS[name.toLowerCase()] || name.toLowerCase();
  if (byName[k]) return byName[k];
  let hit = OBJECTS.find(o => o.name.toLowerCase() === k);
  // Dopasowanie po prefiksie slugu: „Satama Sauna Resort" → „SATAMA SAUNA RESORT & SPA".
  // Wymagany wspólny początek ≥ 8 znaków, żeby nie skleić przypadkowych nazw.
  if (!hit) {
    const ks = slug(k);
    if (ks.length >= 8) hit = OBJECTS.find(o => {
      const os = venueSlug[o.id];
      return os.startsWith(ks) || ks.startsWith(os);
    });
  }
  if (hit) return hit.id;
  if (!extra.has(name)) {
    let s = slug(name); while (seen.has(s)) s = `${s}-x`; seen.add(s);
    extra.set(name, { id: nextId++, slug: s, name,
      city: (meta && meta.city) || null, country: (meta && meta.country) || null,
      flag: (meta && meta.flag) || null });
  }
  return extra.get(name).id;
};

// ── SAUNAMISTRZOWIE ─────────────────────────────────────────────────────────
// Prototyp trzymał ich wyłącznie jako napisy w wydarzeniach — tu powstaje byt.
const RANKS = {
  'Maciej Piczura': ['Pro Master','pl','Polska',true,false],
  'Robert Zídek':   ['Pro Master','cz','Czechy',false,true],
  'Arek Dan':       ['Steam Expert','pl','Polska',true,false],
  'Jeremi Dygas':   ['Steam Expert','pl','Polska',false,false],
  'Lukas Weber':    ['Pro Master','de','Niemcy',true,false],
  'Sanne de Vries': ['Advanced','nl','Holandia',false,true],
  'Petra Nováková': ['Advanced','cz','Czechy',false,false],
  'Tomasz Kowal':   ['Advanced','pl','Polska',false,true],
  'David Zatočil':  ['Steam Expert','cz','Czechy',false,false],
};
const masters = {};   // nazwa → {id, venues:Map(venueId→role), count:Map}
let mid = 1;
const addMaster = name => {
  if (!masters[name]) masters[name] = { id: mid++, venues: new Map(), counts: new Map() };
  return masters[name];
};
Object.keys(RANKS).forEach(addMaster);
EVENTS.forEach(e => (e.masters || []).forEach(m => {
  const M = addMaster(m.name), v = findVenue(e.venue && e.venue.name, e.venue);
  if (v) {
    M.counts.set(v, (M.counts.get(v) || 0) + 1);
    if (!M.venues.has(v) || m.role === 'rezydent') M.venues.set(v, m.role);
  }
}));
S(`-- Saunamistrzowie (${Object.keys(masters).length}) — byt, którego prototyp nie miał`);
S('insert into public.saunamasters (id, slug, name, country, country_code, rank, is_trainer, is_judge) values');
S(Object.entries(masters).map(([name, M]) => {
  const [rank, cc, country, trainer, judge] = RANKS[name] || [null, null, null, false, false];
  return `  (${M.id}, ${q(slug(name))}, ${q(name)}, ${q(country)}, ${q(cc)}, ${q(rank)}, ${b(trainer)}, ${b(judge)})`;
}).join(',\n') + '\non conflict (id) do nothing;');
S(`select setval(pg_get_serial_sequence('public.saunamasters','id'), (select max(id) from public.saunamasters));`, '');

// obiekt macierzysty = ten, w którym mistrz wystąpił najczęściej (rezydentura ma pierwszeństwo)
const links = [];
Object.entries(masters).forEach(([name, M]) => {
  let home = null, best = -1;
  M.venues.forEach((role, v) => {
    const score = (M.counts.get(v) || 0) + (role === 'rezydent' ? 100 : 0);
    if (score > best) { best = score; home = v; }
  });
  M.venues.forEach((role, v) => links.push(`  (${M.id}, ${v}, ${b(v === home)}, ${q(role)})`));
});
if (links.length) {
  S('-- Saunamistrz ↔ obiekty (wiele obiektów, dokładnie jeden macierzysty)');
  S('insert into public.saunamaster_venues (saunamaster_id, venue_id, is_home, role) values');
  S(links.join(',\n') + '\non conflict do nothing;', '');
}

// ── WYDARZENIA ──────────────────────────────────────────────────────────────
const TYPE = { turniej:'turniej', szkolenie:'szkolenie', ceremonia:'ceremonia', 'noc-aufguss':'noc-aufguss' };
S(`-- Wydarzenia (${EVENTS.length})`);
S('insert into public.events (id, slug, title, type, scope, starts_on, ends_on, venue_id, ranking_points) values');
S(EVENTS.map(e => `  (${e.id}, ${q(slug(e.title) + '-' + e.id)}, ${q(e.title)}, ${q(TYPE[e.type] || 'ceremonia')}, ${q(e.scope)}, ${q(e.start)}, ${q(e.end)}, ${n(findVenue(e.venue && e.venue.name, e.venue))}, ${n(e.rankingPoints) || 0})`
).join(',\n') + '\non conflict (id) do nothing;');
S(`select setval(pg_get_serial_sequence('public.events','id'), (select max(id) from public.events));`, '');

const em = [];
EVENTS.forEach(e => (e.masters || []).forEach(m => {
  const M = masters[m.name]; if (M) em.push(`  (${e.id}, ${M.id}, ${q(m.role)})`);
}));
if (em.length) {
  S('-- Obsada wydarzeń');
  S('insert into public.event_masters (event_id, saunamaster_id, role) values');
  S(em.join(',\n') + '\non conflict do nothing;', '');
}

// ── TURNIEJE ────────────────────────────────────────────────────────────────
S(`-- Turnieje (${TOURN.length})`);
const tid = {};
TOURN.forEach((t, i) => tid[t.id] = i + 1);
S('insert into public.tournaments (id, slug, name, scope, organizer, season, tagline, host_venue_id) values');
S(TOURN.map(t => `  (${tid[t.id]}, ${q(t.id)}, ${q(t.name)}, ${q(t.scope)}, ${q(t.org)}, ${q(t.season)}, ${q(t.tagline)}, ${n(findVenue(t.host && t.host.venue, t.host))})`
).join(',\n') + '\non conflict (id) do nothing;');
S(`select setval(pg_get_serial_sequence('public.tournaments','id'), (select max(id) from public.tournaments));`, '');

const stages = [], entries = [], results = [];
TOURN.forEach(t => {
  (t.stages || []).forEach((s, si) => {
    stages.push({ t: tid[t.id], pos: si, label: s.label, desc: s.desc, entries: s.entries || [] });
  });
  (t.archive || []).forEach(a => (a.podium || []).forEach(p => {
    const M = masters[p.name];
    results.push(`  (${tid[t.id]}, ${a.year}, ${q(a.city)}, ${p.place}, ${M ? M.id : 'null'}, ${q(p.name)}, ${q(p.country)}, ${q(p.flag)}, ${n(p.points)})`);
  }));
});
if (stages.length) {
  // jawne identyfikatory — prostsze i pewniejsze niż CTE z „returning"
  stages.forEach((s, i) => s.id = i + 1);
  S('-- Etapy turniejów');
  S('insert into public.tournament_stages (id, tournament_id, position, label, description) values');
  S(stages.map(s => `  (${s.id}, ${s.t}, ${s.pos}, ${q(s.label)}, ${q(s.desc)})`).join(',\n') + '\non conflict (id) do nothing;');
  S(`select setval(pg_get_serial_sequence('public.tournament_stages','id'), (select max(id) from public.tournament_stages));`, '');

  const rows = [];
  stages.forEach(s => s.entries.forEach(e => rows.push(
    `  (${s.id}, ${n(findVenue(e.venue, e))}, ${q(e.venue)}, ${q(e.city)}, ${q(e.country)}, ${q(e.flag)}, ${q(e.date)}, ${q(e.dateEnd)}, ${b(e.highlight)})`
  )));
  if (rows.length) {
    S('-- Zgłoszenia w etapach');
    S('insert into public.tournament_entries (stage_id, venue_id, venue_name, city, country, country_code, starts_on, ends_on, highlight) values');
    S(rows.join(',\n') + ';', '');
  }
}
if (results.length) {
  S('-- Archiwum wyników (podium)');
  S('insert into public.tournament_results (tournament_id, year, city, place, saunamaster_id, name, country, country_code, points) values');
  S(results.join(',\n') + '\non conflict do nothing;', '');
}

// ── WPISY ───────────────────────────────────────────────────────────────────
// body zapisujemy jako dokument ProseMirror — zgodny ze schematem edytora TipTap.
const toDoc = p => JSON.stringify({
  type: 'doc',
  content: (p.body || []).map(t => ({ type: 'paragraph', content: [{ type: 'text', text: t }] }))
});
const CAT = { Recenzja:'Recenzja', Wydarzenie:'Wydarzenie', Obiekt:'Obiekt', Ceremonie:'Ceremonie',
  Turnieje:'Turnieje', Felieton:'Felieton', Społeczność:'Społeczność' };
const postRows = Object.entries(POSTS).map(([id, p]) => {
  const venue = p.objId || findVenue(p.obj, p);
  const cat = CAT[p.cat] || 'Aktualność';
  // ograniczenie bazy: recenzja wymaga obiektu i oceny
  const okReview = cat !== 'Recenzja' || (venue && p.score);
  return { id, p, venue, cat: okReview ? cat : 'Felieton' };
});
S(`-- Wpisy (${postRows.length}) — body jako dokument ProseMirror`);
S('insert into public.posts (slug, category, cover, title, lead, body, score, venue_id, status, published_at) values');
S(postRows.map(({ id, p, venue, cat }) =>
  `  (${q(id)}, ${q(cat)}, ${q(p.cover || 'pc1')}, ${q(p.title)}, ${q(p.lead)}, ${q(toDoc(p))}::jsonb, ` +
  `${p.score ? Number(String(p.score).replace(',', '.')) : 'null'}, ${n(venue)}, 'published', now())`
).join(',\n') + '\non conflict (slug) do nothing;', '');

S('commit;', '',
  '-- Podsumowanie: obiekty ' + OBJECTS.length + ', saunamistrzowie ' + Object.keys(masters).length +
  ', wydarzenia ' + EVENTS.length + ', turnieje ' + TOURN.length + ', wpisy ' + postRows.length);

// ── OBIEKTY ROBOCZE ─────────────────────────────────────────────────────────
// Wykryte w wydarzeniach i turniejach, nieobecne na mapie użytkownika.
// Wchodzą jako 'draft': klucze obce działają, ale portal ich nie pokazuje.
const extraSql = extra.size ? [
  `-- Obiekty robocze (${extra.size}) — obecne w wydarzeniach/turniejach, ale nie na mapie.`,
  `-- DO WERYFIKACJI: po sprawdzeniu ustawić status='published' i uzupełnić współrzędne.`,
  'insert into public.venues (id, slug, name, country, country_code, city, status) values',
  [...extra.values()].map(v =>
    `  (${v.id}, ${q(v.slug)}, ${q(v.name)}, ${q(v.country)}, ${q(v.flag)}, ${q(v.city)}, 'draft')`
  ).join(',\n') + '\non conflict (id) do nothing;'
].join('\n') : '-- (brak obiektów roboczych)';
const idx = out.indexOf('@@EXTRA_VENUES@@');
if (idx >= 0) out[idx] = extraSql;

fs.writeFileSync(path.join(__dirname, 'seed.sql'), out.join('\n'), 'utf8');
console.log('Zapisano supabase/seed.sql');
if (extra.size) {
  console.log(`  UWAGA — obiekty robocze do weryfikacji: ${extra.size}`);
  [...extra.values()].forEach(v => console.log(`     · ${v.name} (${v.city || '?'}, ${v.country || '?'})`));
}
console.log(`  obiekty:        ${OBJECTS.length}`);
console.log(`  saunamistrzowie:${String(Object.keys(masters).length).padStart(4)}  (+ ${links.length} powiązań z obiektami)`);
console.log(`  wydarzenia:     ${EVENTS.length}  (+ ${em.length} przypisań obsady)`);
console.log(`  turnieje:       ${TOURN.length}  (${stages.length} etapów, ${results.length} miejsc na podium)`);
console.log(`  wpisy:          ${postRows.length}`);
