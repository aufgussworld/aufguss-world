# Instrukcja dla sędziów — utrzymanie

- Strona: `turniej-trzech-saun/instrukcja/index.html` (statyczny HTML, własny CSS w pliku, te same czcionki
  i kolory co aplikacja) + zrzuty w `turniej-trzech-saun/instrukcja/img/`.
- Adres: https://aufgussworld.github.io/aufguss-world/turniej-trzech-saun/instrukcja/
- Wejścia: przycisk **„Instrukcja”** w górnym pasku sędziego (`TopBar` w `js/app.js`, klasa `tb-help`,
  ikona `book`) oraz odnośnik pod formularzem logowania sędziego (`manual-link`). Adres liczony z
  `const MANUAL = new URL('../instrukcja/', import.meta.url)` — działa w produkcji i w demo. Otwiera się w nowej karcie.
- Przy szerokości ≤ 1440 px w pasku sędziego chowa się napis obok logo (`.role-judge .brand > span`),
  żeby zakładki i „Instrukcja” mieściły się w jednej linii.
- Strona ma wersję do druku (`@media print`, przycisk „Drukuj / zapisz PDF”) — supervisor może ją wydrukować
  albo wysłać sędziom link przed turniejem.

## Kiedy aktualizować

Każda zmiana widoczna dla sędziego (ekran logowania, karta oceny, komunikaty walidacji, uwagi, feedback,
porównanie, ranking, zapis/offline, wylogowanie) → popraw tekst instrukcji, a gdy zmienił się wygląd —
podmień zrzut. Treść musi zgadzać się z kodem (komunikaty cytowane w instrukcji pochodzą z `model.js`,
`judge.js`, `feedback.js`, `remote.js`, `app.js`).

## Zrzuty ekranu — jak je zrobić (z dowolnego komputera)

Zrzuty pochodzą z wersji demo (zawodnicy fikcyjni), turniej `bny26`, sędzia z listy szybkiego logowania.
Robi się je w przeglądarce biblioteką **html-to-image** (renderuje DOM przez SVG foreignObject — wierne kolory,
czcionki, ikony), a pliki odbiera lokalny serwer.

1. Podgląd: `node .claude/skills/turniej-trzech-saun/scripts/serve.js` (albo konfiguracja `tts`).
2. Czcionki do osadzenia: `node .claude/skills/turniej-trzech-saun/scripts/build-font-css.js`
   → `_tmp-fonts.css` w katalogu głównym repo (jest w `.gitignore`; usuń po pracy).
3. Odbiornik plików: `node .claude/skills/turniej-trzech-saun/scripts/receive-files.js turniej-trzech-saun/instrukcja/img`
4. W przeglądarce (narzędzie podglądu Claude, okno 1280×800): demo → zaloguj sędziego → w konsoli strony:
   ```js
   await new Promise((ok, err) => { const s = document.createElement('script');
     s.src = 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js'; s.onload = ok; s.onerror = err; document.head.append(s); });
   const fontEmbedCSS = await (await fetch('/_tmp-fonts.css')).text();
   // bez pasków przewijania i animacji (inaczej okna modalne wychodzą puste)
   const st = document.createElement('style');
   st.textContent = '*{scrollbar-width:none!important}*::-webkit-scrollbar{display:none!important}*,*::before,*::after{animation:none!important;transition:none!important}';
   document.head.append(st);
   // w demo pasek pokazuje „Demo” — na zrzucie podmieniamy na znacznik jak w produkcji
   document.querySelector('.topbar .demo-pill')?.insertAdjacentHTML('afterend', '<span class="sync ok"><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 6 9 17l-5-5"/></svg><span>Zapisano</span></span>');
   document.querySelector('.topbar .demo-pill')?.remove();
   const shot = async (el, name, o = {}) => {
     const blob = await htmlToImage.toBlob(el, { pixelRatio: o.ratio || 1.5, backgroundColor: o.bg || '#f4f1eb', fontEmbedCSS, ...(o.w ? { width: o.w, height: o.h } : {}) });
     return (await fetch('http://localhost:8124/' + name, { method: 'POST', body: blob })).text();
   };
   await shot(document.querySelector('.app'), '02-ekran-oceny.png', { w: 1280, h: 800 });
   ```
   Wycinki: `.login-card`, `.topbar`, `.sc-cat` (tło `#ffffff`), `.modal` (zostaw `bg` domyślne),
   `.app-body .page` (porównanie, ranking), `.peer-pop` (okienko ocen innych zawodników). Długie okna przycinaj
   opcjami `w` / `h`. Elementy z `position: fixed` (np. `.peer-pop`) wychodzą puste — wołaj `htmlToImage.toBlob`
   bezpośrednio z opcją `style: { position: 'static', left: 'auto', top: 'auto', boxShadow: 'none' }`.
   Wartości na karcie do zrzutów najprościej ustawić z konsoli: `const s = await import('/turniej-trzech-saun/js/store.js');
   s.setScore('bny26', 'banya', '<id zawodnika>', 'bny26-j1', '<id pozycji>', 15)` (dziesiąte części); dane demo resetuje
   `s.store.reset()` (bez okna potwierdzenia).
   Zrzuty z 2026-10-18: `02-ekran-oceny.png` (Bartłomiej Kos, karta w trakcie), `04-wpisywanie.png` (błąd „−1”),
   `06-kary-uwagi.png`, `11-porownanie.png` (otwarte pole poprawki), `13-oceny-innych.png`.
5. Numerowane znaczniki na zrzutach (`<span class="pin" style="left:…%;top:…%">`) liczy się z
   `getBoundingClientRect()` elementów w oknie 1280×800 (procent szerokości / wysokości kadru).
   Po zmianie układu ekranu sprawdź, czy znaczniki dalej wskazują właściwe miejsca.
6. Popraw `width` / `height` w `<img>` (rzeczywiste wymiary pliku), usuń `_tmp-fonts.css`, zatrzymaj odbiornik.
7. Dane demo zmienione przy robieniu zrzutów zostają tylko w tej przeglądarce (localStorage) —
   „Przywróć dane demo” na ekranie logowania demo je resetuje.
