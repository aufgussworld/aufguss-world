/* Wspólny rejestr wpisów blogowych / newsów aufguss.world.
   Konsumowany przez post.html (pełny widok wpisu). Karty na stronie głównej,
   w kartach obiektu i na blogu linkują tu przez ?id=<slug>.
   Docelowo z backendu (CMS). */
(function(){
  const AUTHORS = {
    'wojciech-kadz':{ name:'Wojciech Kadź', type:'Bloger',  href:'blog.html?blog=wojciech-kadz', init:'WK' },
    'pts':          { name:'Polskie Towarzystwo Saunowe (PTS)', type:'Partner', href:'blog.html?blog=pts', init:'PTS' },
    'satama':       { name:'Satama Sauna Resort', type:'Obiekt', href:'blog.html?blog=satama', init:'SAT' },
    'redakcja':     { name:'Redakcja aufguss.world', type:'Redakcja', href:null, init:'AW' },
  };

  const POSTS = {
    'satama-recenzja':{
      cat:'Recenzja', cover:'pc1', date:'12 czerwca 2026', author:'wojciech-kadz',
      score:'8,8', obj:'Satama Sauna Resort', objHref:'object.html',
      title:'Rzymski przepych, który działa nie tylko na Instagramie',
      lead:'Colosseum Sauna Arena robi wrażenie skalą, ale prawdziwą wartością są ceremonie i obsługa.',
      body:[
        'Satama to obiekt, który łatwo sprowadzić do efektownych zdjęć — antyczne kolumny, ogromna arena, para unosząca się pod sklepieniem. Byłoby jednak krzywdzące zatrzymać się na warstwie wizualnej.',
        'Program ceremonii jest gęsty i różnorodny, a saunamistrzowie prowadzą seans jak spektakl — z narracją, muzyką i wyczuciem temperatury. Strefa banii i rytuał z wenikiem to mocne punkty. Widać, że obiekt traktuje aufguss jako sztukę, nie dodatek do basenu.',
        'Kontekst też robi swoje: jezioro Scharmützelsee tuż obok sprawia, że schłodzenie po saunie staje się osobnym przeżyciem. Latem to jeden z najlepszych powodów, by tu przyjechać.',
        'Minusy? W szczycie weekendu bywa tłoczno, a część seansów wymaga wcześniejszej rezerwacji. Mimo to — jeden z najlepszych obiektów aufguss w Europie, do którego chce się wracać.',
      ],
    },
    'liquidrom-recenzja':{
      cat:'Recenzja', cover:'pc2', date:'28 maja 2026', author:'wojciech-kadz',
      score:'7,9', obj:'Liquidrom', objHref:'object.html',
      title:'Berliński minimalizm pod wodą',
      lead:'Kultowa architektura i podwodna muzyka, ale program aufguss bywa nierówny.',
      body:[
        'Liquidrom to instytucja — basen solankowy pod betonową kopułą z muzyką słyszalną pod wodą robi wrażenie za każdym razem. To miejsce, które w Berlinie stało się synonimem miejskiego relaksu.',
        'Aufguss? Wieczorami potrafi być znakomity, prowadzony z wyczuciem i pomysłem. W ciągu dnia poziom bywa jednak nierówny — czasem to raczej rutynowy seans niż ceremonia.',
        'To miejsce bardziej o atmosferze i wyciszeniu niż o ceremonialnym show. Jeśli szukasz spokoju w centrum miasta — trafisz idealnie. Jeśli wielkiego widowiska — bywa różnie.',
      ],
    },
    'polska-potega':{
      cat:'Felieton', cover:'pc4', date:'15 kwietnia 2026', author:'wojciech-kadz',
      title:'Dlaczego Polska stała się saunową potęgą Europy',
      lead:'W pięć lat przeszliśmy drogę, którą inne kraje pokonywały dekadę.',
      body:[
        'Jeszcze niedawno aufguss w Polsce był niszą dla wtajemniczonych. Dziś mamy własne mistrzostwa, obiekty inwestujące w saunamistrzów i publiczność, która rozumie ceremonię i potrafi ją docenić.',
        'Zadecydowało kilka rzeczy naraz: fala nowych, ambitnych obiektów termalnych, pokolenie saunamistrzów z międzynarodowymi sukcesami oraz społeczność, która zamieniła saunowanie w styl życia.',
        'Co może nas zatrzymać? Przede wszystkim ryzyko, że komercja wyprzedzi rzemiosło. Dopóki jednak w centrum pozostaje jakość ceremonii, kierunek jest znakomity.',
      ],
    },
    'pts-classic-zapisy':{
      cat:'Turnieje', cover:'pc2', date:'20 czerwca 2026', author:'pts',
      title:'Ruszają zapisy na Mistrzostwa Polski PTS Classic 2026',
      lead:'Rejestracja zawodników otwarta do końca lipca. Wielki finał w Słupsku.',
      body:[
        'Zapraszamy saunamistrzów do rejestracji na tegoroczne Mistrzostwa Polski PTS Classic. Eliminacje regionalne ruszają jesienią, a wielki finał odbędzie się w Słupsku.',
        'W tym roku spodziewamy się rekordowej frekwencji — zarówno wśród doświadczonych zawodników, jak i debiutantów. Regulamin oraz formularz zgłoszeniowy dostępne są w panelu zawodnika.',
        'To najważniejszy krajowy turniej w kalendarzu, a dla wielu saunamistrzów przepustka na areny międzynarodowe.',
      ],
    },
    'pts-nowy-ranking':{
      cat:'Społeczność', cover:'pc3', date:'12 czerwca 2026', author:'pts',
      title:'Rusza 10-stopniowy system rang saunamistrzów',
      lead:'Wspólnie z aufguss.world wdrażamy skalę rang liczoną z punktów za turnieje.',
      body:[
        'Od teraz osiągnięcia z turniejów przekładają się na rangę widoczną na profilu zawodnika — od Rookie aż po Pro Master. Punkty naliczane są automatycznie na podstawie wyników.',
        'System ma uporządkować scenę i dać obiektom oraz publiczności czytelny sygnał o poziomie saunamistrza.',
        'To ważny krok w profesjonalizacji polskiej i europejskiej sceny aufguss.',
      ],
    },
    'satama-noc-aufguss':{
      cat:'Wydarzenie', cover:'pc2', date:'28 czerwca 2026', author:'satama',
      title:'Noc aufguss z Robertem Zídkiem i Davidem Zatočilem',
      lead:'Wyjątkowy wieczór z dwoma mistrzami świata — bilety w sprzedaży od piątku.',
      body:[
        'Zapraszamy na wyjątkową noc aufguss z udziałem dwóch mistrzów świata. Wieczór wypełnią autorskie ceremonie, muzyka na żywo i specjalne rytuały przygotowane wyłącznie na tę okazję.',
        'Liczba miejsc jest ograniczona, a bilety trafią do sprzedaży w piątek. Rekomendujemy wcześniejszą rezerwację — poprzednie edycje wyprzedały się w kilka godzin.',
      ],
    },
    'satama-nowa-sauna':{
      cat:'Obiekt', cover:'pc3', date:'20 czerwca 2026', author:'satama',
      title:'Nowa sauna zewnętrzna nad Scharmützelsee',
      lead:'Oddajemy do użytku panoramiczną saunę z widokiem na jezioro.',
      body:[
        'Nowa sauna zewnętrzna z tarasem widokowym jest już otwarta dla gości. Schłodzenie w jeziorze Scharmützelsee macie teraz na wyciągnięcie ręki.',
        'To kolejny etap rozbudowy resortu — stawiamy na połączenie natury z najwyższą jakością ceremonii aufguss.',
      ],
    },
    'satama-letni-program':{
      cat:'Ceremonie', cover:'pc1', date:'11 czerwca 2026', author:'satama',
      title:'Letni program ceremonii — nowe aromaty',
      lead:'Cedr, mięta i cytrusy w odświeżonym planie ceremonii na lato.',
      body:[
        'Wraz z latem odświeżamy plan ceremonii. Do stałego repertuaru dołączają nowe kompozycje zapachowe: cedr syberyjski, mięta pieprzowa oraz orzeźwiające cytrusy z imbirem.',
        'Nowy grafik ceremonii znajdziecie w kalendarzu obiektu. Zapraszamy na saunowe lato.',
      ],
    },
    'zidek-mistrz-swiata':{
      cat:'Turnieje', cover:'pc4', date:'28 czerwca 2026', author:'redakcja',
      title:'Robert Zídek po raz trzeci Mistrzem Świata Aufguss',
      lead:'Czeski saunamistrz obronił tytuł podczas The Battle of Gladiators w Termach Rzymskich w Czeladzi.',
      body:[
        'Robert Zídek po raz trzeci sięgnął po tytuł Mistrza Świata Aufguss. Finał The Battle of Gladiators rozegrano w Termach Rzymskich w Czeladzi, na słynnej Colosseum Arenie.',
        'Czeski saunamistrz pokonał silną, międzynarodową stawkę, prezentując dopracowany autorski program łączący choreografię, muzykę i perfekcyjną pracę parą.',
        'To kolejny dowód na to, że czeska i polska scena aufguss należą dziś do ścisłej światowej czołówki.',
      ],
    },
  };

  window.AUFGUSS_POST_AUTHORS = AUTHORS;
  window.AUFGUSS_POSTS = POSTS;
})();
