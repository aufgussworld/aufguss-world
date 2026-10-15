# Praca na nowym komputerze

System powstał na komputerze stacjonarnym (kopia robocza: `OneDrive\Desktop\Code\aufguss-world-gh`).
Wszystko, czego potrzeba do zmian, jest w repozytorium GitHub `aufgussworld/aufguss-world` — łącznie
z tym skillem i pełnym schematem bazy. Pamięć Claude z komputera stacjonarnego NIE przechodzi na inny
komputer, dlatego ten skill jest samowystarczalny.

## 1. Programy (jednorazowo, ok. 10 minut)

W PowerShellu (albo ręcznie ze stron producentów):

```bash
winget install --id Git.Git -e
winget install --id GitHub.cli -e
winget install --id OpenJS.NodeJS.LTS -e
```

Po instalacji zamknij i otwórz ponownie terminal / Claude Code, żeby nowe programy były widoczne.
Sprawdzenie: `git --version`, `gh --version`, `node --version`.

## 2. Dostęp do GitHuba (robi użytkownik — Claude nie wpisuje haseł)

```bash
gh auth login
```

Wybierz: GitHub.com → HTTPS → „Login with a web browser”, zaloguj się na konto **aufgussworld**
(właściciel repozytorium). Potem:

```bash
gh auth setup-git
```

## 3. Kopia robocza

Najlepiej POZA folderem OneDrive (dwa komputery pracujące na jednym zsynchronizowanym folderze `.git`
potrafią go uszkodzić):

```bash
gh repo clone aufgussworld/aufguss-world C:/Users/$USERNAME/Code/aufguss-world
cd C:/Users/$USERNAME/Code/aufguss-world
node .claude/skills/turniej-trzech-saun/scripts/check.js
```

Ostatnie polecenie powinno wypisać „OK — 15 modułów…”.

> Jeśli laptop ma ten sam OneDrive, może się na nim pojawić także `Desktop\Code\aufguss-world-gh`
> z komputera stacjonarnego. Nie pracuj w nim z laptopa — używaj świeżej kopii z kroku 3.
> Po powrocie do domu na komputerze stacjonarnym wykonaj `git pull` w `aufguss-world-gh`.

## 4. Claude Code

- **Aplikacja desktop (zakładka Code):** wybierz folder `C:\Users\<użytkownik>\Code\aufguss-world`.
  Skill `turniej-trzech-saun` wczyta się automatycznie (jest w `.claude/skills/` repozytorium).
  Wystarczy napisać np. „Użyj skilla turniej-trzech-saun i zmień …”.
- **Terminal:** `cd C:/Users/$USERNAME/Code/aufguss-world && claude`, potem `/turniej-trzech-saun`.
- **Podgląd w przeglądarce:** w aplikacji desktop konfiguracja `tts` z `.claude/launch.json`
  (Claude uruchamia ją narzędziem podglądu); w terminalu:
  `node .claude/skills/turniej-trzech-saun/scripts/serve.js` →
  http://localhost:8123/turniej-trzech-saun/demo/ (PIN `2026`).
  Adres bez `/demo/` łączy się z PRAWDZIWĄ bazą turnieju — tam nie zakładaj turniejów testowych
  w trakcie zawodów.

## 5. Supabase (panel bazy)

https://supabase.com/dashboard/project/wripvwhwginexvcmwdsq — użytkownik loguje się swoim kontem
Supabase (organizacja aufguss.world). Potrzebne tylko do operacji administracyjnych (kod supervisora,
zmiany funkcji w bazie, podgląd kopii) — opis w [baza-danych.md](baza-danych.md).

## 6. Bez laptopa: Claude Code w przeglądarce (claude.ai/code)

1. Wejdź na https://claude.ai/code (to samo konto Claude), połącz GitHuba i daj dostęp do
   repozytorium `aufgussworld/aufguss-world`.
2. Rozpocznij sesję na tym repozytorium i napisz: „Użyj skilla turniej-trzech-saun …”.
   Sesja w chmurze klonuje repo razem z tym skillem.
3. Zmiany trafiają zwykle na osobną gałąź → utwórz z niej pull request i scal go na github.com
   (działa też z telefonu). GitHub Pages publikuje dopiero po scaleniu do `main`.
4. W chmurze nie ma podglądu w Twojej przeglądarce — tym bardziej uruchom `check.js` przed scaleniem,
   a po wdrożeniu sprawdź stronę demo na telefonie lub laptopie.

## 7. Awaryjnie bez Claude: edycja na github.com

Drobna zmiana tekstu: github.com → repo `aufguss-world` → plik w `turniej-trzech-saun/` → ikona
ołówka → zmiana → „Commit changes” (bezpośrednio do `main`). Po ok. minucie zmiana jest na stronie
(u użytkowników po Ctrl+F5). Nie edytuj tak logiki — brak kontroli składni może wyłączyć aplikację.
