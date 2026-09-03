# Backend aufguss.world — uruchomienie krok po kroku

Ten katalog zawiera **kompletną warstwę danych** gotową do wgrania. Nie trzeba nic
programować — wystarczy założyć projekt i wykonać trzy pliki SQL po kolei.

| Plik | Co robi |
|---|---|
| `migrations/0001_schema.sql` | tabele, typy, indeksy, wyzwalacze |
| `migrations/0002_rls.sql` | polityki dostępu (kto co widzi i może zmieniać) |
| `migrations/0003_i18n.sql` | wielojęzyczność, słownik krajów, kolejka dla agentów AI, przejmowanie wizytówek |
| `seed.sql` | dane startowe: 107 obiektów, 9 saunamistrzów, 25 wydarzeń, 9 turniejów, 19 wpisów |
| `generate-seed.js` | generator `seed.sql` z plików `data/*.js` (`node supabase/generate-seed.js`) |

---

## Krok 1. Konto Supabase (baza + logowanie)

1. Wejdź na **supabase.com** i załóż konto (możesz zalogować się kontem GitHub — masz już
   `aufgussworld`).
2. Kliknij **New project**:
   - **Name**: `aufguss-world`
   - **Database Password**: wygeneruj silne hasło i **zapisz je w menedżerze haseł**.
     Będzie potrzebne przy połączeniu z bazą; Supabase nie pokaże go drugi raz.
   - **Region**: wybierz najbliższy — **Frankfurt (eu-central-1)**. Ma znaczenie dla szybkości
     i dla tego, że dane zostają w UE (RODO).
3. Projekt tworzy się 1–2 minuty.

> **Koszty.** Supabase ma darmowy plan wystarczający na prototyp i pierwsze miesiące
> (baza, logowanie, pliki). Główne ograniczenie: projekt bez ruchu jest **usypiany po ok. tygodniu**
> — wystarczy go obudzić w panelu. Płatny plan zaczyna się od ok. 25 USD/mies. i przyda się
> dopiero przy realnym ruchu. Zweryfikuj aktualne warunki na stronie cennika, bo się zmieniają.

## Krok 2. Wgranie schematu

W panelu Supabase otwórz **SQL Editor** (ikona po lewej) i wykonaj pliki **w tej kolejności**:

1. Wklej całą zawartość `migrations/0001_schema.sql` → **Run**.
2. Wklej całą zawartość `migrations/0002_rls.sql` → **Run**.
3. Wklej całą zawartość `seed.sql` → **Run**.
4. Wklej całą zawartość `migrations/0003_i18n.sql` → **Run**.
   (po seedzie, bo nakłada klucz obcy na kody krajów już wgranych obiektów)

Po każdym kroku powinno pojawić się `Success`. Gdy coś zgłosi błąd — zatrzymaj się i wyślij mi
treść komunikatu; poprawimy, zanim pójdziemy dalej.

**Weryfikacja** — wykonaj w SQL Editor:

```sql
select
  (select count(*) from public.venues)              as obiekty,
  (select count(*) from public.venues where status='draft') as obiekty_robocze,
  (select count(*) from public.saunamasters)        as saunamistrzowie,
  (select count(*) from public.saunamaster_venues)  as powiazania_mistrz_obiekt,
  (select count(*) from public.events)              as wydarzenia,
  (select count(*) from public.tournaments)         as turnieje,
  (select count(*) from public.posts)               as wpisy;
```

Oczekiwane: **115 obiektów** (107 z mapy + 8 roboczych), **9** saunamistrzów, **21** powiązań,
**25** wydarzeń, **9** turniejów, **19** wpisów.

## Krok 3. Twoje konto administratora

Role nadaje się wyłącznie w bazie — nikt nie nada ich sobie sam (pilnuje tego RLS).

1. W panelu: **Authentication → Users → Add user**, podaj swój e-mail i hasło.
   Wyzwalacz automatycznie utworzy profil i nada rolę `user`.
2. W SQL Editor podnieś się do administratora:

```sql
insert into public.user_roles (profile_id, role)
select id, 'admin' from public.profiles
where id = (select id from auth.users where email = 'TWOJ@EMAIL')
on conflict (profile_id, role) do nothing;
```

## Krok 4. Klucze do aplikacji

**Settings → API**. Potrzebne będą:

- **Project URL** — publiczny adres projektu,
- **anon public key** — klucz dla przeglądarki. Jest bezpieczny do umieszczenia w kodzie
  frontu, bo **dostęp i tak ogranicza RLS** z migracji 0002.
- **service_role key** — klucz omijający RLS. **Nigdy nie trafia do przeglądarki ani do repozytorium.**
  Wyłącznie po stronie serwera.

## Krok 5. Vercel (dopiero przy panelu w Next.js)

Potrzebny na etapie przepisywania panelu — portal działa dziś na GitHub Pages i może tam zostać.

1. **vercel.com** → załóż konto przez GitHub.
2. **Add New → Project** → wskaż repozytorium.
3. W **Environment Variables** dodaj `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   oraz (jako zmienną serwerową) `SUPABASE_SERVICE_ROLE_KEY`.

> Vercel ma darmowy plan **Hobby** dla projektów niekomercyjnych. Gdy portal zacznie zarabiać
> (sklep, reklamy), warunki licencji wymagają planu Pro — sprawdź aktualny cennik.

---

## Obiekty roboczych — to funkcja, nie usterka

Portal jest żywym organizmem: obiekty powstają i znikają, a na mapie są **realnie najlepsze**.
Dlatego obiekt spoza mapy nie jest błędem — jest **zaproszeniem dla właściciela**:

> „Ten obiekt nie ma jeszcze wizytówki w aufguss.world. Jesteś jego administratorem?
> Skontaktuj się z nami, a otrzymasz uprawnienia do stworzenia i prowadzenia karty."

Obsługuje to migracja 0003:
- widok **`claimable_venues`** — obiekty, którymi nikt jeszcze nie zarządza (brak wpisu w `venue_members`),
- rozszerzone **`role_requests`** — zgłoszenie „to mój obiekt" (przez `venue_id`) albo
  „mojego obiektu u was nie ma" (przez `proposed_name`, `proposed_city`, `proposed_country_code`).

Po akceptacji administrator dopisuje zgłaszającego do `venue_members` i obiekt zyskuje opiekuna.

Obiekty wykryte przy migracji, czekające na właściciela:

| Obiekt | Miasto | Kraj |
|---|---|---|
| Thermaalbad | Eindhoven | Holandia |
| Centrum SPA | Słupsk | Polska |
| Termy Cieplickie | Jelenia Góra | Polska |
| Liquidrom | Berlin | Niemcy |
| Saunia Praha | Praga | Czechy |
| QC Terme | Mediolan | Włochy |
| Therme Wien | Wiedeń | Austria |
| Bernaqua | Berno | Szwajcaria |

Są w bazie jako **robocze** (`status='draft'`): powiązania z wydarzeniami działają, ale na mapie
się nie pokazują (opublikowany obiekt musi mieć współrzędne — pilnuje tego ograniczenie bazy).
Publikacja po uzupełnieniu lokalizacji:

```sql
update public.venues
set lat = 52.1234, lng = 5.1234, status = 'published'
where slug = 'thermaalbad';
```

## Wielojęzyczność — jak to działa

Dwie ścieżki, świadomie różne:

| | Treść kuratorowana | Treść użytkowników |
|---|---|---|
| **Co** | obiekty, wydarzenia, turnieje, wpisy, szkolenia | komentarze, opinie |
| **Kiedy tłumaczone** | z góry, przed publikacją | na żądanie, przy kliknięciu |
| **Gdzie** | tabele `*_translations` | `ugc_translations` (pamięć podręczna) |
| **Dlaczego tak** | musi być poprawne, indeksowane przez Google | nieograniczona objętość, większości nikt nie przeczyta |

**Nazwy własne nie są tłumaczone** — „Termy Rzymskie" zostają wszędzie. Tłumaczymy opisy,
tytuły wydarzeń, treść wpisów oraz **miasta i kraje** (Warszawa / Warsaw / Warschau).

Kolejka pracy dla agentów AI:

```sql
select kind, id, locale, missing, stale from public.translation_queue limit 50;
```

Widok pokazuje, czego **brakuje** i co **straciło aktualność** — po zmianie oryginału skrót
`source_hash` przestaje pasować i tłumaczenie samo wraca do kolejki. Agent zapisuje wynik ze
statusem `machine`; redaktor może podnieść do `reviewed`.

Odczyt z łańcuchem zapasowym (czytelnik nigdy nie zobaczy pustego pola):

```sql
select * from public.venues_l10n('cs') limit 5;   -- czeski → angielski → oryginał
```

**17 języków** w bazie. Włączone na start: **pl, en, de, cs, nl, it**. Pozostałe — hu, fr, fi, no,
da, lt, lv, et oraz **sk, sl, ro** (Europa Środkowa) — są wgrane, ale nieaktywne. Włącza się je
pojedynczo, gdy tłumaczenia będą gotowe:

```sql
update public.locales set is_active = true where code = 'sk';
```

Słowacki ma zapasowy **czeski**, nie angielski — języki są wzajemnie zrozumiałe, więc czytelnik
dostanie lepszy tekst zanim powstanie tłumaczenie słowackie.

## Znane luki w danych

- **Miasto** jest puste dla wszystkich 107 obiektów z mapy (KML zawierał tylko nazwy i współrzędne).
  Do uzupełnienia — najprościej odwrotnym geokodowaniem ze współrzędnych.
- **Tagi obiektów** nie istnieją; do zaprojektowania przy wyszukiwarce.
- **Saunamistrzowie** mają wyliczony obiekt macierzysty (najczęstsze miejsce występów,
  rezydentura ma pierwszeństwo) — warto, żeby każdy potwierdził go sam w panelu.
