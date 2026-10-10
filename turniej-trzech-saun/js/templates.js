// Karty wzorcowe według dokumentów „Kryteria oceniania” (Sommer Hot / Relax / Banya Cup).
// kind: 'plus' — punkty dodatnie, 'minus' — punkty karne (wpisywane bez minusa, odejmowane),
//       'bin'  — pozycja 0 albo max (np. „więcej niż 3 zapachy”).

const professionalism = () => ({
  id: 'prof',
  name: 'Profesjonalizm',
  items: [
    { id: 'p1', label: 'Przygotowanie do seansu', kind: 'plus', max: 2 },
    { id: 'p2', label: 'Otwarcie i zakończenie ceremonii', kind: 'plus', max: 2 },
    { id: 'p3', label: 'Wykonanie seansu', kind: 'plus', max: 3 },
    { id: 'p4', label: 'Przestrzeganie czystości i higieny', kind: 'plus', max: 3 },
    { id: 'p5', label: 'Odstępstwo czasowe', kind: 'minus', max: 2, hint: '−1 pkt za każdą minutę poza limitem; powyżej 2 min dyskwalifikacja' },
    { id: 'p6', label: 'Nieprzestrzeganie czasu na przygotowanie sauny i jej posprzątanie', kind: 'minus', max: 2 },
    { id: 'p7', label: 'Niedostarczenie wykazu zapachów, tematu i historii przed ceremonią', kind: 'minus', max: 3 },
    { id: 'p8', label: 'Nieprzestrzeganie zasad bezpieczeństwa', kind: 'minus', max: 1 },
  ],
});

const CARDS = {
  relax: () => ({
    duration: '10–15 min',
    categories: [
      professionalism(),
      {
        id: 'show', name: 'Show', items: [
          { id: 's1', label: 'Dopasowanie muzyki i stroju do seansu', kind: 'plus', max: 2 },
          { id: 's2', label: 'Dodatkowe atrakcje przed i po ceremonii', kind: 'plus', max: 2 },
          { id: 's3', label: 'Wywołanie odczucia komfortu relaksu', kind: 'plus', max: 4 },
          { id: 's4', label: 'Techniki klasyczne machania', kind: 'plus', max: 4 },
          { id: 's5', label: 'Kreatywność', kind: 'plus', max: 3 },
          { id: 's6', label: 'Zbyt głośna praca saunamistrza', kind: 'minus', max: 2 },
          { id: 's7', label: 'Głośna reakcja publiczności', kind: 'minus', max: 1 },
        ],
      },
      {
        id: 'temp', name: 'Wzrost temperatury', items: [
          { id: 't1', label: 'Wzrost temperatury', kind: 'plus', max: 4 },
          { id: 't2', label: 'Dystrybucja ciepła', kind: 'plus', max: 4 },
          { id: 't3', label: 'Komfort cieplny i termiczny', kind: 'plus', max: 2 },
          { id: 't4', label: 'Zła reakcja publiczności (zbyt gorąco)', kind: 'minus', max: 2 },
        ],
      },
      {
        id: 'aroma', name: 'Zapachy', items: [
          { id: 'z1', label: 'Użycie minimum trzech relaksujących zapachów / kompozycji', kind: 'plus', max: 3 },
          { id: 'z2', label: 'Ciekawy sposób podania zapachów', kind: 'plus', max: 3 },
          { id: 'z3', label: 'Wyjątkowe dopasowanie zapachów do tematu seansu', kind: 'plus', max: 3 },
          { id: 'z4', label: 'Użycie więcej niż 3 zapachów / kompozycji', kind: 'bin', max: 1 },
          { id: 'z5', label: 'Słabo wyczuwalne lub przedawkowane zapachy', kind: 'minus', max: 3 },
        ],
      },
    ],
  }),

  hot: () => ({
    duration: '8–13 min',
    categories: [
      professionalism(),
      {
        id: 'show', name: 'Show', items: [
          { id: 's1', label: 'Dopasowanie muzyki i stroju do seansu', kind: 'plus', max: 3 },
          { id: 's2', label: 'Techniki show machania', kind: 'plus', max: 4 },
          { id: 's3', label: 'Techniki klasyczne machania', kind: 'plus', max: 4 },
          { id: 's4', label: 'Techniki specjalne machania', kind: 'plus', max: 2 },
          { id: 's5', label: 'Emocje show', kind: 'plus', max: 2 },
          { id: 's6', label: 'Nuda i monotonia', kind: 'minus', max: 1 },
        ],
      },
      {
        id: 'temp', name: 'Wzrost temperatury', items: [
          { id: 't1', label: 'Wzrost temperatury', kind: 'plus', max: 6 },
          { id: 't2', label: 'Dystrybucja ciepła', kind: 'plus', max: 6 },
          { id: 't3', label: 'Komfort cieplny i termiczny', kind: 'plus', max: 3 },
          { id: 't4', label: 'Zła reakcja publiczności (publiczność opuszczająca saunę)', kind: 'minus', max: 2 },
        ],
      },
      {
        id: 'aroma', name: 'Zapachy', items: [
          { id: 'z1', label: 'Użycie minimum trzech zapachów', kind: 'plus', max: 3 },
          { id: 'z2', label: 'Ciekawy sposób podania zapachów', kind: 'plus', max: 3 },
          { id: 'z3', label: 'Dopasowanie zapachów do tematu seansu', kind: 'plus', max: 3 },
          { id: 'z4', label: 'Użycie więcej niż 3 zapachów', kind: 'bin', max: 1 },
          { id: 'z5', label: 'Słabo wyczuwalne lub przedawkowane zapachy', kind: 'minus', max: 3 },
        ],
      },
    ],
  }),

  banya: () => ({
    duration: '10–15 min',
    categories: [
      professionalism(),
      {
        id: 'show', name: 'Show', items: [
          { id: 's1', label: 'Dopasowanie muzyki i stroju do seansu', kind: 'plus', max: 2 },
          { id: 's2', label: 'Dodatkowe atrakcje powiązane z banią', kind: 'plus', max: 2 },
          { id: 's3', label: 'Wywołanie emocji związanych z tematem i założeniem seansu', kind: 'plus', max: 2 },
          { id: 's4', label: 'Ocena technik machania', kind: 'plus', max: 3 },
          { id: 's5', label: 'Kreatywność', kind: 'plus', max: 6 },
          { id: 's6', label: 'Zastosowanie mniej niż trzech przedmiotów do rozprowadzania ciepła', kind: 'minus', max: 1 },
        ],
      },
      {
        id: 'temp', name: 'Wzrost temperatury', items: [
          { id: 't1', label: 'Wzrost temperatury', kind: 'plus', max: 4 },
          { id: 't2', label: 'Dystrybucja ciepła', kind: 'plus', max: 4 },
          { id: 't3', label: 'Komfort cieplny i termiczny', kind: 'plus', max: 2 },
          { id: 't4', label: 'Zła reakcja publiczności (zbyt gorąco)', kind: 'minus', max: 2 },
        ],
      },
      {
        id: 'aroma', name: 'Naturalne aromaty', items: [
          { id: 'z1', label: 'Użycie minimum trzech naturalnych zapachów / kompozycji, dobrze wyczuwalnych i rozpoznawalnych', kind: 'plus', max: 3 },
          { id: 'z2', label: 'Ciekawy sposób podania zapachów', kind: 'plus', max: 3 },
          { id: 'z3', label: 'Wyjątkowe dopasowanie zapachów do tematu seansu', kind: 'plus', max: 3 },
          { id: 'z4', label: 'Użycie więcej niż 3 zapachów / kompozycji', kind: 'bin', max: 1 },
          { id: 'z5', label: 'Słabo wyczuwalne lub przedawkowane zapachy', kind: 'minus', max: 3 },
        ],
      },
    ],
  }),
};

export function defaultCard(disc) {
  return CARDS[disc]();
}
