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
      score:'8,8', objId:55, obj:'Satama Sauna Resort', objHref:'object.html',
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
      score:'7,9', obj:'Liquidrom', country:'Niemcy', flag:'de', objHref:'object.html',
      title:'Berliński minimalizm pod wodą',
      lead:'Kultowa architektura i podwodna muzyka, ale program aufguss bywa nierówny.',
      body:[
        'Liquidrom to instytucja — basen solankowy pod betonową kopułą z muzyką słyszalną pod wodą robi wrażenie za każdym razem. To miejsce, które w Berlinie stało się synonimem miejskiego relaksu.',
        'Aufguss? Wieczorami potrafi być znakomity, prowadzony z wyczuciem i pomysłem. W ciągu dnia poziom bywa jednak nierówny — czasem to raczej rutynowy seans niż ceremonia.',
        'To miejsce bardziej o atmosferze i wyciszeniu niż o ceremonialnym show. Jeśli szukasz spokoju w centrum miasta — trafisz idealnie. Jeśli wielkiego widowiska — bywa różnie.',
      ],
    },
    'termy-rzymskie-recenzja':{
      cat:'Recenzja', cover:'pc3', date:'2 lipca 2026', author:'wojciech-kadz',
      score:'9,2', objId:13, obj:'Termy Rzymskie', objHref:'object.html',
      title:'Arena, która podniosła poprzeczkę całej Europie',
      lead:'Najlepszy program ceremonii w Polsce i sceneria, która robi robotę nawet przy pustej widowni.',
      body:[
        'Są obiekty, które budują wrażenie scenografią, i takie, które budują je poziomem seansów. Termy Rzymskie należą do rzadkiej grupy, w której obie te rzeczy grają na jedną nutę. Rzymska stylistyka mogłaby łatwo osunąć się w kicz, a jednak trzyma proporcje i pracuje na atmosferę zamiast ją przykrywać.',
        'Najważniejsze dzieje się jednak w grafiku. Program ceremonii jest gęsty, prowadzony przez saunamistrzów z międzynarodowym doświadczeniem, a różnica między seansem porannym a wieczornym jest tu kwestią repertuaru, nie jakości. To rzadkość — w większości dużych obiektów popołudnie bywa najsłabszą częścią dnia.',
        'Osobny rozdział to wielkie wydarzenia. Obiekt potrafi obsłużyć turniejową publiczność bez rozsypania codziennego harmonogramu, co przy tej skali jest osiągnięciem organizacyjnym samym w sobie.',
        'Zastrzeżenie mam jedno, za to realne: w weekendy popularność potrafi przełożyć się na kolejki do najbardziej obleganych seansów. Warto planować wizytę w tygodniu — wtedy to po prostu najlepszy adres aufguss w kraju.',
      ],
    },
    'loyly-recenzja':{
      cat:'Recenzja', cover:'pc4', date:'19 czerwca 2026', author:'wojciech-kadz',
      score:'9,0', objId:105, obj:'Löyly Helsinki', objHref:'object.html',
      title:'Fińska szczerość, czyli sauna bez scenografii',
      lead:'Żadnych efektów specjalnych — drewno, ogień i Bałtyk kilka kroków dalej.',
      body:[
        'Löyly Helsinki jest przeciwieństwem wszystkiego, co zwykle chwalę w wielkich obiektach aufguss. Nie ma tu areny, choreografii ani muzyki budującej napięcie. Jest drewno, dym, gorąco i morze, do którego schodzi się po schodkach prosto z tarasu.',
        'I właśnie dlatego to miejsce trafia na tak wysokie miejsce. Fińska szkoła traktuje saunę jako codzienność, nie jako spektakl — a poziom rzemiosła, czyli jakość pary i praca z piecem, jest tu wzorcowy. Sauna dymna to doświadczenie, którego nie zastąpi żaden program ceremonii.',
        'Architektura zasługuje na osobne zdanie: drewniany, falujący budynek nad zatoką jest publicznie dostępny także dla osób, które przyszły tylko na kawę. To rzadki przykład obiektu wpisanego w miasto, a nie odgrodzonego od niego.',
        'Dla kogo to nie będzie? Dla szukających klasycznego aufguss z ręcznikiem i show. Tego tu po prostu nie ma i nie ma być.',
      ],
    },
    'chocholowskie-recenzja':{
      cat:'Recenzja', cover:'pc1', date:'5 czerwca 2026', author:'wojciech-kadz',
      score:'8,6', objId:14, obj:'Chochołowskie Termy', objHref:'object.html',
      title:'Tatry za oknem i seanse, które trzymają równy poziom',
      lead:'Przewidywalnie dobry program i widok, który sam w sobie jest połową wrażenia.',
      body:[
        'Chochołowskie Termy mają atut nie do skopiowania: panoramę Tatr z saun i stref wypoczynku. Brzmi jak dodatek marketingowy, ale realnie zmienia odbiór seansu — schłodzenie z takim widokiem zostaje w pamięci dłużej niż niejeden efektowny aufguss.',
        'Program ceremonii jest solidny i, co ważniejsze, powtarzalny. Nie trafiłem tu jeszcze na seans słaby, choć nie trafiłem też na taki, który by mnie całkowicie zaskoczył. To obiekt równy, dobrze prowadzony, z saunamistrzami rozumiejącymi, że publiczność górska bywa inna niż wielkomiejska.',
        'Strefa saun jest przemyślana, a rytuały autorskie coraz odważniejsze — widać, że obiekt inwestuje w ludzi, nie tylko w infrastrukturę.',
        'Minus? Sezonowość. W szczycie ferii i długich weekendów tłok potrafi zjeść sporo z tego spokoju, za który się tu przyjeżdża.',
      ],
    },
    'vabali-recenzja':{
      cat:'Recenzja', cover:'pc2', date:'22 maja 2026', author:'wojciech-kadz',
      score:'8,5', objId:61, obj:'Vabali', objHref:'object.html',
      title:'Balijska sceneria w środku Berlina',
      lead:'Ogromny wybór saun i konsekwentnie utrzymany klimat, choć aufguss bywa zachowawczy.',
      body:[
        'Vabali to popis budowania nastroju. Drewno, woda, zieleń i architektura inspirowana Bali sprawiają, że po kilkunastu minutach zapomina się, że za płotem jest wielkie miasto. Konsekwencja tej scenografii robi w Berlinie różnicę.',
        'Wybór saun jest imponujący i dobrze rozłożony — od łagodnych po naprawdę mocne, z sensownymi strefami ciszy pomiędzy. Obsługa pilnuje reguł, dzięki czemu spokój nie jest tu deklaracją, tylko stanem faktycznym.',
        'Aufguss stoi na przyzwoitym, wyrównanym poziomie, ale rzadko wychodzi poza sprawdzony schemat. To ceremonie poprawne i przyjemne, tylko niekoniecznie takie, o których opowiada się potem znajomym.',
        'Jeśli szukasz całodniowego wyciszenia w wysokim standardzie — trafiłeś idealnie. Jeśli mistrzowskiego show — celuj gdzie indziej.',
      ],
    },
    'bussloo-recenzja':{
      cat:'Recenzja', cover:'pc3', date:'8 maja 2026', author:'wojciech-kadz',
      score:'8,4', objId:76, obj:'Thermen Bussloo Wellness & Hotel', objHref:'object.html',
      title:'Holenderska szkoła ceremonii w kameralnym wydaniu',
      lead:'Świetna strefa zewnętrzna i aufguss prowadzony z wyczuciem, bez przesadnego rozmachu.',
      body:[
        'Holandia od lat gra w aufguss w pierwszej lidze i Thermen Bussloo dobrze tłumaczy dlaczego. Ceremonie prowadzone są tu z wyczuciem tempa i temperatury, a saunamistrzowie potrafią pracować z publicznością zamiast po prostu odrobić program.',
        'Duży plus za strefę zewnętrzną — sauny wtopione w zieleń i przestrzeń do schłodzenia, która nie sprowadza się do jednego zimnego prysznica. To właśnie tam obiekt jest najlepszy.',
        'Skala jest średnia i to działa na korzyść: kameralność sprzyja kontaktowi między prowadzącym a gośćmi, czego w wielkich arenach często brakuje.',
        'Cena za wstęp należy do wyższych w regionie, a dla gościa z zagranicy dochodzi bariera językowa przy części seansów tematycznych. Warto o tym wiedzieć przed wizytą.',
      ],
    },
    'suntago-recenzja':{
      cat:'Recenzja', cover:'pc4', date:'24 kwietnia 2026', author:'wojciech-kadz',
      score:'8,1', objId:20, obj:'Suntago', objHref:'object.html',
      title:'Skala, która wreszcie pracuje na jakość',
      lead:'Największy obiekt w regionie coraz poważniej traktuje sauny — i widać to w programie.',
      body:[
        'Suntago długo kojarzyło się przede wszystkim z częścią wodną i rodzinną rozrywką. Strefa saunowa przez ten cień się przebijała, ale ostatnie sezony wyraźnie zmieniły proporcje: program ceremonii jest dziś obszerny, a saunamistrzowie mają wyraźnie więcej do powiedzenia.',
        'Wielkość obiektu przestała być wadą. Sauny tematyczne trzymają poziom, strefa dla dorosłych jest realnie oddzielona, a rozmach pozwala na seanse dla dużej widowni bez ścisku w kabinie.',
        'To wciąż nie jest miejsce na kameralne wyciszenie — do Suntago przyjeżdża się po energię i różnorodność, nie po ciszę.',
        'Największe zastrzeżenie dotyczy godzin szczytu: w weekendy część atrakcji obsługiwana jest w tempie, które odbija się na spokoju seansu. W tygodniu obiekt wypada wyraźnie lepiej.',
      ],
    },
    'aquapalace-recenzja':{
      cat:'Recenzja', cover:'pc1', date:'11 kwietnia 2026', author:'wojciech-kadz',
      score:'8,0', objId:32, obj:'Aquapalace Praha', objHref:'object.html',
      title:'Czeska szkoła aufguss w solidnym wydaniu',
      lead:'Mocna kadra saunamistrzów i porządny warsztat, choć obiekt bywa przytłoczony ruchem.',
      body:[
        'Czechy mają jedną z najmocniejszych scen aufguss w Europie i Aquapalace Praha regularnie tę tezę potwierdza. Warsztat prowadzących jest tu wysoki: praca ręcznikiem czysta, dobór aromatów przemyślany, tempo seansu budowane świadomie.',
        'Strefa saunowa jest dobrze zaprojektowana, z sensownym rozkładem temperatur i miejscem na odpoczynek między ceremoniami. Widać szkołę, w której technika liczy się bardziej niż efekt.',
        'Obiekt pełni jednak podwójną rolę — dużego aquaparku i poważnego adresu saunowego jednocześnie. To bywa odczuwalne, zwłaszcza w weekendy, gdy ruch w części wodnej przenika do strefy ciszy.',
        'Mimo to dla kogoś, kto chce zobaczyć czeski aufguss bez wyprawy w mniejsze miasta, to najprostszy i bardzo dobry wybór.',
      ],
    },
    'aqua-dome-recenzja':{
      cat:'Recenzja', cover:'pc2', date:'27 marca 2026', author:'wojciech-kadz',
      score:'7,8', objId:92, obj:'Aqua Dome', objHref:'object.html',
      title:'Alpejska panorama, która zmienia sens schłodzenia',
      lead:'Widok i termy w najwyższej lidze, program ceremonii już niekoniecznie.',
      body:[
        'Aqua Dome sprzedaje przede wszystkim położenie i trudno mieć o to pretensję — alpejskie otoczenie sprawia, że wyjście z sauny na mróz staje się osobną atrakcją. Pod tym względem niewiele obiektów w Europie może się równać.',
        'Sama infrastruktura termalna jest znakomita: baseny, strefy relaksu i zaplecze utrzymane w standardzie, którego oczekuje się w tej cenie.',
        'Aufguss wypada jednak blado na tle otoczenia. Ceremonie są poprawne, ale rzadko wychodzą poza rutynę, a repertuar bywa powtarzalny. To obiekt termalny z saunami, nie obiekt saunowy z termami — i tę różnicę czuć w programie.',
        'Przyjeżdżaj dla gór i wody. Jeśli aufguss jest dla ciebie najważniejszy, potraktuj go tu jako miły dodatek, a nie powód wyjazdu.',
      ],
    },
    'thermae-2000-recenzja':{
      cat:'Recenzja', cover:'pc3', date:'14 marca 2026', author:'wojciech-kadz',
      score:'7,6', objId:75, obj:'Thermae 2000', objHref:'object.html',
      title:'Klasyk z Limburgii, który potrzebuje odświeżenia',
      lead:'Wciąż przyjemny i dobrze prowadzony, ale konkurencja przez ostatnie lata pojechała dalej.',
      body:[
        'Thermae 2000 przez lata było punktem odniesienia w Beneluksie i wciąż ma sporo z dawnej klasy: położenie na wzgórzu, panoramiczne widoki i spokojną, dojrzałą publiczność, która wie, po co przyszła.',
        'Ceremonie prowadzone są kompetentnie, bez fajerwerków, ale i bez wpadek. Strefa saun zachowuje przyjemny rytm dnia, a obsługa dba o reguły ciszy.',
        'Problem w tym, że obiekt zatrzymał się w miejscu, podczas gdy holenderska i niemiecka konkurencja wyraźnie przyspieszyła. Część infrastruktury nosi ślady lat, a program ceremonii nie ma dziś nic, czego nie znajdziesz bliżej i taniej.',
        'To nadal dobry adres na spokojny dzień — po prostu nie jest już tym, czym był dekadę temu.',
      ],
    },
    'termy-maltanskie-recenzja':{
      cat:'Recenzja', cover:'pc4', date:'28 lutego 2026', author:'wojciech-kadz',
      score:'7,2', objId:9, obj:'Termy Maltańskie', objHref:'object.html',
      title:'Miejski kompromis z ambitną strefą saun',
      lead:'Wygodny miejski adres, ale aufguss walczy tu o uwagę z aquaparkiem.',
      body:[
        'Termy Maltańskie mają zaletę, której nie kupi się żadną inwestycją: są w mieście, łatwo dostępne i można tu wpaść po pracy. Dla lokalnej społeczności saunowej to realna wartość.',
        'Strefa saun jest większa i ambitniejsza, niż sugerowałby profil obiektu. Program ceremonii istnieje, jest prowadzony regularnie, a część saunamistrzów naprawdę stara się wyjść poza standard.',
        'Charakter obiektu robi jednak swoje. To przede wszystkim duży kompleks basenowy, w którym sauny są jedną ze stref, a nie sercem miejsca. Odbija się to na atmosferze — o ciszę bywa trudno, zwłaszcza popołudniami.',
        'Traktuję to miejsce jako solidny wybór miejski, nie jako cel wyprawy. W tej roli sprawdza się dobrze i nie ma powodu, by od niego stronić.',
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
