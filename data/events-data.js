// Wspólny zbiór wydarzeń aufguss.world.
// Trzy kalendarze (portal / saunamistrz / obiekt) to filtry tego samego zbioru:
//   portal      = filtrowanie po zasięgu (scope) -> kraj -> obiekt
//   saunamistrz = where masters[].name == X
//   obiekt      = where venue.name == Y
// scope -> kolor:  miedzynarodowe | krajowe | lokalne
// type:  ceremonia | noc-aufguss | szkolenie | turniej
window.AUFGUSS_EVENTS = [
  // ── MIĘDZYNARODOWE ─────────────────────────────────────────────
  {
    id: 1, title: "The Battle of Gladiators — Mistrzostwa Świata", type: "turniej",
    scope: "miedzynarodowe", start: "2026-03-06", end: "2026-03-09",
    venue: { name: "Termy Rzymskie", city: "Czeladź", country: "Polska", flag: "pl" },
    masters: [
      { name: "Maciej Piczura", role: "zawodnik" },
      { name: "Robert Zídek", role: "zawodnik" },
      { name: "Arek Dan", role: "zawodnik" },
      { name: "Jeremi Dygas", role: "zawodnik" },
    ], rankingPoints: 100,
  },
  {
    id: 2, title: "Mistrzostwa Świata Aufguss — Eindhoven", type: "turniej",
    scope: "miedzynarodowe", start: "2026-03-15", end: "2026-03-17",
    venue: { name: "Thermaalbad", city: "Eindhoven", country: "Holandia", flag: "nl" },
    masters: [
      { name: "Lukas Weber", role: "zawodnik" },
      { name: "Sanne de Vries", role: "sędzia" },
      { name: "Jeremi Dygas", role: "zawodnik" },
    ], rankingPoints: 120,
  },
  {
    id: 3, title: "Aufguss-WM Open — runda kwalifikacyjna", type: "turniej",
    scope: "miedzynarodowe", start: "2026-03-28", end: "2026-03-29",
    venue: { name: "Satama Sauna Resort", city: "Wendisch-Rietz", country: "Niemcy", flag: "de" },
    masters: [
      { name: "Robert Zídek", role: "zawodnik" },
      { name: "Petra Nováková", role: "zawodniczka" },
    ], rankingPoints: 90,
  },

  // ── KRAJOWE ────────────────────────────────────────────────────
  {
    id: 4, title: "Mistrzostwa Polski PTS Classic", type: "turniej",
    scope: "krajowe", start: "2026-03-21", end: "2026-03-22",
    venue: { name: "Centrum SPA", city: "Słupsk", country: "Polska", flag: "pl" },
    masters: [
      { name: "Arek Dan", role: "zawodnik" },
      { name: "Jeremi Dygas", role: "zawodnik" },
      { name: "Tomasz Kowal", role: "sędzia" },
    ], rankingPoints: 60,
  },
  {
    id: 5, title: "Szkolenie Aufguss — poziom podstawowy", type: "szkolenie",
    scope: "krajowe", start: "2026-03-24", end: "2026-03-26",
    venue: { name: "Termy Cieplickie", city: "Jelenia Góra", country: "Polska", flag: "pl" },
    masters: [{ name: "Arek Dan", role: "prowadzący" }], rankingPoints: 0,
  },
  {
    id: 6, title: "Deutsche Aufguss Meisterschaft", type: "turniej",
    scope: "krajowe", start: "2026-03-13", end: "2026-03-14",
    venue: { name: "Liquidrom", city: "Berlin", country: "Niemcy", flag: "de" },
    masters: [{ name: "Lukas Weber", role: "zawodnik" }], rankingPoints: 55,
  },
  {
    id: 7, title: "Mistrzostwa Czech Aufguss", type: "turniej",
    scope: "krajowe", start: "2026-03-20", end: "2026-03-21",
    venue: { name: "Saunia Praha", city: "Praga", country: "Czechy", flag: "cz" },
    masters: [{ name: "Petra Nováková", role: "zawodniczka" }, { name: "Robert Zídek", role: "sędzia" }], rankingPoints: 55,
  },

  // ── LOKALNE: Satama Sauna Resort (Niemcy) ──────────────────────
  { id: 8,  title: "Ceremonie aufguss — dzień powszedni", type: "ceremonia", scope: "lokalne", start: "2026-03-03", end: "2026-03-03",
    venue: { name: "Satama Sauna Resort", city: "Wendisch-Rietz", country: "Niemcy", flag: "de" }, masters: [{ name: "Arek Dan", role: "rezydent" }], rankingPoints: 0 },
  { id: 9,  title: "Noc aufguss z gośćmi specjalnymi", type: "noc-aufguss", scope: "lokalne", start: "2026-03-14", end: "2026-03-14",
    venue: { name: "Satama Sauna Resort", city: "Wendisch-Rietz", country: "Niemcy", flag: "de" }, masters: [{ name: "Robert Zídek", role: "gość" }, { name: "David Zatočil", role: "gość" }], rankingPoints: 0 },
  { id: 10, title: "Ceremonie aufguss — weekend", type: "ceremonia", scope: "lokalne", start: "2026-03-21", end: "2026-03-21",
    venue: { name: "Satama Sauna Resort", city: "Wendisch-Rietz", country: "Niemcy", flag: "de" }, masters: [{ name: "Arek Dan", role: "rezydent" }], rankingPoints: 0 },

  // ── LOKALNE: Liquidrom (Niemcy) ────────────────────────────────
  { id: 11, title: "Ceremonia aufguss — poranek saunowy", type: "ceremonia", scope: "lokalne", start: "2026-03-11", end: "2026-03-11",
    venue: { name: "Liquidrom", city: "Berlin", country: "Niemcy", flag: "de" }, masters: [{ name: "Lukas Weber", role: "rezydent" }], rankingPoints: 0 },
  { id: 12, title: "Nocna ceremonia Aufguss", type: "noc-aufguss", scope: "lokalne", start: "2026-03-29", end: "2026-03-29",
    venue: { name: "Liquidrom", city: "Berlin", country: "Niemcy", flag: "de" }, masters: [{ name: "Lukas Weber", role: "rezydent" }], rankingPoints: 0 },

  // ── LOKALNE: Centrum SPA Słupsk (Polska) ───────────────────────
  { id: 13, title: "Dyżur saunamistrza — ceremonie dzienne", type: "ceremonia", scope: "lokalne", start: "2026-03-05", end: "2026-03-05",
    venue: { name: "Centrum SPA", city: "Słupsk", country: "Polska", flag: "pl" }, masters: [{ name: "Jeremi Dygas", role: "rezydent" }], rankingPoints: 0 },
  { id: 14, title: "Noc aufguss — edycja wiosenna", type: "noc-aufguss", scope: "lokalne", start: "2026-03-19", end: "2026-03-19",
    venue: { name: "Centrum SPA", city: "Słupsk", country: "Polska", flag: "pl" }, masters: [{ name: "Jeremi Dygas", role: "rezydent" }, { name: "Tomasz Kowal", role: "gość" }], rankingPoints: 0 },

  // ── LOKALNE: Suntago (Polska) ──────────────────────────────────
  { id: 15, title: "Ceremonie aufguss — dzień tematyczny", type: "ceremonia", scope: "lokalne", start: "2026-03-07", end: "2026-03-07",
    venue: { name: "Suntago", city: "Wręcza", country: "Polska", flag: "pl" }, masters: [{ name: "Tomasz Kowal", role: "rezydent" }], rankingPoints: 0 },
  { id: 16, title: "Noc aufguss XXL", type: "noc-aufguss", scope: "lokalne", start: "2026-03-28", end: "2026-03-28",
    venue: { name: "Suntago", city: "Wręcza", country: "Polska", flag: "pl" }, masters: [{ name: "Tomasz Kowal", role: "rezydent" }, { name: "Arek Dan", role: "gość" }], rankingPoints: 0 },

  // ── LOKALNE: Saunia Praha (Czechy) ─────────────────────────────
  { id: 17, title: "Ceremonie aufguss — wieczór", type: "ceremonia", scope: "lokalne", start: "2026-03-12", end: "2026-03-12",
    venue: { name: "Saunia Praha", city: "Praga", country: "Czechy", flag: "cz" }, masters: [{ name: "Petra Nováková", role: "rezydentka" }], rankingPoints: 0 },

  // ── LOKALNE / KRAJOWE: Chochołowskie Termy (obiekt macierzysty Macieja Piczury) ──
  { id: 18, title: "Dyżur saunamistrza — ceremonie autorskie", type: "ceremonia", scope: "lokalne", start: "2026-03-10", end: "2026-03-10",
    venue: { name: "Chochołowskie Termy", city: "Chochołów", country: "Polska", flag: "pl" }, masters: [{ name: "Maciej Piczura", role: "rezydent" }], rankingPoints: 0 },
  { id: 19, title: "Noc aufguss — Show pod Tatrami", type: "noc-aufguss", scope: "lokalne", start: "2026-03-18", end: "2026-03-18",
    venue: { name: "Chochołowskie Termy", city: "Chochołów", country: "Polska", flag: "pl" }, masters: [{ name: "Maciej Piczura", role: "rezydent" }], rankingPoints: 0 },
  { id: 20, title: "Szkolenie Aufguss — warsztaty z Mistrzem Świata", type: "szkolenie", scope: "krajowe", start: "2026-03-31", end: "2026-04-02",
    venue: { name: "Chochołowskie Termy", city: "Chochołów", country: "Polska", flag: "pl" }, masters: [{ name: "Maciej Piczura", role: "prowadzący" }], rankingPoints: 0 },

  // ── 21 marca: zatłoczony dzień (demo nakładających się wydarzeń lokalnych) ──
  { id: 21, title: "Sobotnie ceremonie aufguss", type: "ceremonia", scope: "lokalne", start: "2026-03-21", end: "2026-03-21",
    venue: { name: "Liquidrom", city: "Berlin", country: "Niemcy", flag: "de" }, masters: [{ name: "Lukas Weber", role: "rezydent" }], rankingPoints: 0 },
  { id: 22, title: "Wieczór saun parowych", type: "ceremonia", scope: "lokalne", start: "2026-03-21", end: "2026-03-21",
    venue: { name: "Centrum SPA", city: "Słupsk", country: "Polska", flag: "pl" }, masters: [{ name: "Jeremi Dygas", role: "rezydent" }], rankingPoints: 0 },
  { id: 23, title: "Noc aufguss — edycja DJ", type: "noc-aufguss", scope: "lokalne", start: "2026-03-21", end: "2026-03-21",
    venue: { name: "Suntago", city: "Wręcza", country: "Polska", flag: "pl" }, masters: [{ name: "Tomasz Kowal", role: "rezydent" }, { name: "Arek Dan", role: "gość" }], rankingPoints: 0 },
  { id: 24, title: "Aufguss wieczorny — aromaty lasu", type: "ceremonia", scope: "lokalne", start: "2026-03-21", end: "2026-03-21",
    venue: { name: "Saunia Praha", city: "Praga", country: "Czechy", flag: "cz" }, masters: [{ name: "Petra Nováková", role: "rezydentka" }], rankingPoints: 0 },
  { id: 25, title: "Show pod Tatrami — sobota", type: "noc-aufguss", scope: "lokalne", start: "2026-03-21", end: "2026-03-21",
    venue: { name: "Chochołowskie Termy", city: "Chochołów", country: "Polska", flag: "pl" }, masters: [{ name: "Maciej Piczura", role: "rezydent" }], rankingPoints: 0 },
];
