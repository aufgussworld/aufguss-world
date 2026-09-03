# Backend aufguss.world — uruchomienie krok po kroku

Ten katalog zawiera **kompletną warstwę danych** gotową do wgrania. Nie trzeba nic
programować — wystarczy założyć projekt i wykonać trzy pliki SQL po kolei.

| Plik | Co robi |
|---|---|
| `migrations/0001_schema.sql` | tabele, typy, indeksy, wyzwalacze |
| `migrations/0002_rls.sql` | polityki dostępu (kto co widzi i może zmieniać) |
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

## Do decyzji: 8 obiektów roboczych

Migracja wykryła obiekty obecne w wydarzeniach i turniejach, **których nie ma na Twojej mapie**:

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

Trafiły do bazy jako **robocze** (`status='draft'`): klucze obce działają, ale portal ich nie
pokazuje. Po weryfikacji uzupełnij współrzędne i opublikuj:

```sql
update public.venues
set lat = 52.1234, lng = 5.1234, status = 'published'
where slug = 'thermaalbad';
```

Alternatywnie: jeśli któryś obiekt jest niepotrzebny, usuń go — powiązane wydarzenia
zachowają się (klucz obcy jest `on delete set null`).

## Znane luki w danych

- **Miasto** jest puste dla wszystkich 107 obiektów z mapy (KML zawierał tylko nazwy i współrzędne).
  Do uzupełnienia — najprościej odwrotnym geokodowaniem ze współrzędnych.
- **Tagi obiektów** nie istnieją; do zaprojektowania przy wyszukiwarce.
- **Saunamistrzowie** mają wyliczony obiekt macierzysty (najczęstsze miejsce występów,
  rezydentura ma pierwszeństwo) — warto, żeby każdy potwierdził go sam w panelu.
