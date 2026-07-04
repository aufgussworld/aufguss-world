// Turnieje aufguss — osobny byt od pojedynczych wydarzeń w kalendarzu.
// Jeden turniej rozpada się na etapy (eliminacje krajowe -> finały krajowe -> finał światowy),
// a każdy etap na wiele wpisów (kraj / obiekt / data) => kilkadziesiąt dat na jeden turniej.
// scope: miedzynarodowe | krajowe
window.AUFGUSS_TOURNAMENTS = [
  {
    id: 'battle-of-gladiators',
    name: 'The Battle of Gladiators',
    scope: 'miedzynarodowe',
    org: 'WCF · Mistrzostwa Świata Aufguss',
    season: '2026',
    host: { venue: 'Termy Rzymskie', city: 'Czeladź', country: 'Polska', flag: 'pl' },
    tagline: 'Najbardziej prestiżowy turniej aufguss na świecie — od eliminacji krajowych po wielki finał w Colosseum Sauna Arena w Czeladzi.',
    archive: [
      { year:2025, city:'Czeladź', podium:[
        {place:1, name:'Robert Zídek', country:'Czechy', flag:'cz', points:284},
        {place:2, name:'Maciej Piczura', country:'Polska', flag:'pl', points:279},
        {place:3, name:'Lukas Weber', country:'Niemcy', flag:'de', points:271} ] },
      { year:2024, city:'Czeladź', podium:[
        {place:1, name:'Maciej Piczura', country:'Polska', flag:'pl', points:288},
        {place:2, name:'Robert Zídek', country:'Czechy', flag:'cz', points:282},
        {place:3, name:'Arek Dan', country:'Polska', flag:'pl', points:270} ] },
      { year:2023, city:'Czeladź', podium:[
        {place:1, name:'Maciej Piczura', country:'Polska', flag:'pl', points:281},
        {place:2, name:'David Zatočil', country:'Czechy', flag:'cz', points:276},
        {place:3, name:'Jeremi Dygas', country:'Polska', flag:'pl', points:268} ] },
    ],
    stages: [
      { label: 'Eliminacje krajowe', desc: 'Siedem krajów wyłania reprezentantów w obiektach na swoim terenie.',
        entries: [
          { country:'Polska', flag:'pl', venue:'Suntago', city:'Wręcza', date:'2026-01-17' },
          { country:'Polska', flag:'pl', venue:'Termy Rzymskie', city:'Czeladź', date:'2026-01-24' },
          { country:'Niemcy', flag:'de', venue:'Satama Sauna Resort', city:'Wendisch-Rietz', date:'2026-01-31' },
          { country:'Czechy', flag:'cz', venue:'Saunia Praha', city:'Praga', date:'2026-02-07' },
          { country:'Włochy', flag:'it', venue:'QC Terme', city:'Mediolan', date:'2026-02-14' },
          { country:'Holandia', flag:'nl', venue:'Thermaalbad', city:'Eindhoven', date:'2026-02-21' },
          { country:'Austria', flag:'at', venue:'Therme Wien', city:'Wiedeń', date:'2026-02-24' },
          { country:'Szwajcaria', flag:'ch', venue:'Bernaqua', city:'Berno', date:'2026-02-27' },
        ] },
      { label: 'Finały krajowe', desc: 'Zwycięzcy eliminacji walczą o tytuł mistrza kraju i awans na Mistrzostwa Świata.',
        entries: [
          { country:'Polska', flag:'pl', venue:'Termy Rzymskie', city:'Czeladź', date:'2026-03-01' },
          { country:'Niemcy', flag:'de', venue:'Satama Sauna Resort', city:'Wendisch-Rietz', date:'2026-03-02' },
          { country:'Czechy', flag:'cz', venue:'Saunia Praha', city:'Praga', date:'2026-03-03' },
          { country:'Holandia', flag:'nl', venue:'Thermaalbad', city:'Eindhoven', date:'2026-03-04' },
        ] },
      { label: 'Mistrzostwa Świata', desc: 'Wielki finał — reprezentanci wszystkich krajów w Colosseum Sauna Arena.',
        entries: [
          { country:'Polska', flag:'pl', venue:'Termy Rzymskie', city:'Czeladź', date:'2026-03-06', dateEnd:'2026-03-09', highlight:true },
        ] },
    ],
  },
  {
    id: 'aufguss-wm',
    name: 'Aufguss WM',
    scope: 'miedzynarodowe',
    org: 'Aufguss WM · Mistrzostwa Świata',
    season: '2026',
    host: { venue: 'Thermen Bussloo', city: 'Voorst', country: 'Holandia', flag: 'nl' },
    tagline: 'Klasyczne mistrzostwa świata w konkurencjach Freestyle i Modern Classic.',
    stages: [
      { label: 'Eliminacje międzynarodowe', desc: 'Runda kwalifikacyjna w wybranych obiektach.',
        entries: [
          { country:'Niemcy', flag:'de', venue:'Satama Sauna Resort', city:'Wendisch-Rietz', date:'2026-03-28', dateEnd:'2026-03-29' },
          { country:'Holandia', flag:'nl', venue:'Thermaalbad', city:'Eindhoven', date:'2026-04-04' },
        ] },
      { label: 'Finał', desc: 'Wielki finał w Thermen Bussloo.',
        entries: [
          { country:'Holandia', flag:'nl', venue:'Thermen Bussloo', city:'Voorst', date:'2026-04-18', dateEnd:'2026-04-20', highlight:true },
        ] },
    ],
  },
  {
    id: 'mp-pts-classic',
    name: 'Mistrzostwa Polski PTS Classic',
    scope: 'krajowe',
    org: 'PTS · Mistrzostwa Polski',
    season: '2026',
    host: { venue: 'Centrum SPA', city: 'Słupsk', country: 'Polska', flag: 'pl' },
    tagline: 'Krajowe mistrzostwa saunamistrzów — droga na arenę międzynarodową.',
    archive: [
      { year:2025, city:'Słupsk', podium:[
        {place:1, name:'Arek Dan', country:'Polska', flag:'pl', points:262},
        {place:2, name:'Jeremi Dygas', country:'Polska', flag:'pl', points:258},
        {place:3, name:'Tomasz Kowal', country:'Polska', flag:'pl', points:249} ] },
      { year:2024, city:'Wręcza', podium:[
        {place:1, name:'Maciej Piczura', country:'Polska', flag:'pl', points:270},
        {place:2, name:'Arek Dan', country:'Polska', flag:'pl', points:264},
        {place:3, name:'Jeremi Dygas', country:'Polska', flag:'pl', points:255} ] },
    ],
    stages: [
      { label: 'Eliminacje regionalne', desc: 'Turnieje kwalifikacyjne w regionach.',
        entries: [
          { country:'Polska', flag:'pl', venue:'Suntago', city:'Wręcza', date:'2026-02-14' },
          { country:'Polska', flag:'pl', venue:'Termy Cieplickie', city:'Jelenia Góra', date:'2026-02-21' },
          { country:'Polska', flag:'pl', venue:'Chochołowskie Termy', city:'Chochołów', date:'2026-02-28' },
        ] },
      { label: 'Finał krajowy', desc: 'Wielki finał Mistrzostw Polski.',
        entries: [
          { country:'Polska', flag:'pl', venue:'Centrum SPA', city:'Słupsk', date:'2026-03-21', dateEnd:'2026-03-22', highlight:true },
        ] },
    ],
  },
  {
    id: 'deutsche-meisterschaft',
    name: 'Deutsche Aufguss Meisterschaft',
    scope: 'krajowe',
    org: 'Mistrzostwa Niemiec',
    season: '2026',
    host: { venue: 'Liquidrom', city: 'Berlin', country: 'Niemcy', flag: 'de' },
    tagline: 'Krajowe mistrzostwa Niemiec — najsilniejsza scena aufguss w Europie.',
    stages: [
      { label: 'Finał krajowy', desc: 'Mistrzostwa Niemiec.',
        entries: [ { country:'Niemcy', flag:'de', venue:'Liquidrom', city:'Berlin', date:'2026-03-13', dateEnd:'2026-03-14', highlight:true } ] },
    ],
  },
  {
    id: 'mistrzostwa-czech',
    name: 'Mistrzostwa Czech Aufguss',
    scope: 'krajowe',
    org: 'Mistrzostwa Czech',
    season: '2026',
    host: { venue: 'Saunia Praha', city: 'Praga', country: 'Czechy', flag: 'cz' },
    tagline: 'Krajowe mistrzostwa Czech.',
    stages: [
      { label: 'Finał krajowy', desc: 'Mistrzostwa Czech.',
        entries: [ { country:'Czechy', flag:'cz', venue:'Saunia Praha', city:'Praga', date:'2026-03-20', dateEnd:'2026-03-21', highlight:true } ] },
    ],
  },
  {
    id: 'puchar-polski-aufguss',
    name: 'Puchar Polski Aufguss',
    scope: 'krajowe',
    org: 'PTS · Puchar Polski',
    season: '2026',
    host: { venue: 'Suntago', city: 'Wręcza', country: 'Polska', flag: 'pl' },
    tagline: 'Cykl pucharowy z rundami w największych polskich obiektach.',
    stages: [
      { label: 'Rundy pucharowe', desc: 'Kolejne rundy w różnych obiektach.',
        entries: [
          { country:'Polska', flag:'pl', venue:'Suntago', city:'Wręcza', date:'2026-04-11' },
          { country:'Polska', flag:'pl', venue:'Termy Rzymskie', city:'Czeladź', date:'2026-04-25' },
          { country:'Polska', flag:'pl', venue:'Chochołowskie Termy', city:'Chochołów', date:'2026-05-09' },
        ] },
      { label: 'Finał', desc: 'Wielki finał Pucharu Polski.',
        entries: [ { country:'Polska', flag:'pl', venue:'Suntago', city:'Wręcza', date:'2026-05-23', highlight:true } ] },
    ],
  },
  {
    id: 'nocne-mistrzostwa-slaska',
    name: 'Nocne Mistrzostwa Śląska',
    scope: 'krajowe',
    org: 'Turniej regionalny',
    season: '2026',
    host: { venue: 'Termy Rzymskie', city: 'Czeladź', country: 'Polska', flag: 'pl' },
    tagline: 'Regionalny turniej nocnych ceremonii aufguss na Śląsku.',
    stages: [
      { label: 'Finał', desc: 'Nocny finał w Colosseum Sauna Arena.',
        entries: [ { country:'Polska', flag:'pl', venue:'Termy Rzymskie', city:'Czeladź', date:'2026-04-18', highlight:true } ] },
    ],
  },
  {
    id: 'aufguss-cup-sued',
    name: 'Aufguss Cup Süd',
    scope: 'krajowe',
    org: 'Turniej regionalny',
    season: '2026',
    host: { venue: 'Therme Erding', city: 'Erding', country: 'Niemcy', flag: 'de' },
    tagline: 'Południowoniemiecki turniej aufguss.',
    stages: [
      { label: 'Finał', desc: 'Finał regionu.',
        entries: [ { country:'Niemcy', flag:'de', venue:'Therme Erding', city:'Erding', date:'2026-03-28', highlight:true } ] },
    ],
  },
  {
    id: 'dutch-aufguss-open',
    name: 'Dutch Aufguss Open',
    scope: 'krajowe',
    org: 'Mistrzostwa Holandii',
    season: '2026',
    host: { venue: 'Thermaalbad', city: 'Eindhoven', country: 'Holandia', flag: 'nl' },
    tagline: 'Otwarte mistrzostwa Holandii.',
    stages: [
      { label: 'Finał krajowy', desc: 'Mistrzostwa Holandii.',
        entries: [ { country:'Holandia', flag:'nl', venue:'Thermaalbad', city:'Eindhoven', date:'2026-04-04', dateEnd:'2026-04-05', highlight:true } ] },
    ],
  },
];
