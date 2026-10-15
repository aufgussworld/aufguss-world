// Czcionki aplikacji (Google Fonts, zestawy latin i latin-ext) jako CSS z osadzonymi plikami woff2.
// Potrzebne przy zrzutach ekranu biblioteką html-to-image (opcja fontEmbedCSS) — bez tego
// zrzut może użyć czcionek zastępczych i inaczej łamać tekst.
// Uruchom z katalogu głównego repo:  node .claude/skills/turniej-trzech-saun/scripts/build-font-css.js
// Wynik: _tmp-fonts.css w katalogu głównym repo (NIE commituj — usuń po zrobieniu zrzutów).

const fs = require('fs');
const path = require('path');

const HREF = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const out = path.resolve(__dirname, '../../../..', '_tmp-fonts.css');

(async () => {
  const css = await (await fetch(HREF, { headers: { 'User-Agent': UA } })).text();
  let res = css.split(/(?=\/\* )/).filter((b) => /^\/\* (latin|latin-ext) \*\//.test(b)).join('\n');
  const urls = [...new Set([...res.matchAll(/url\((https:[^)]+)\)/g)].map((m) => m[1]))];
  for (const u of urls) {
    const b = Buffer.from(await (await fetch(u)).arrayBuffer());
    res = res.split(u).join('data:font/woff2;base64,' + b.toString('base64'));
  }
  fs.writeFileSync(out, res);
  console.log(`Zapisano ${out} (${urls.length} plików czcionek, ${Math.round(res.length / 1024)} kB)`);
})();
