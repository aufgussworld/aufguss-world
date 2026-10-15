// Kontrola przed wdrożeniem systemu sędziowskiego (bez kroku budowania łatwo o literówkę,
// która wyłączy aplikację wszystkim sędziom naraz). Sprawdza:
//  1) składnię każdego modułu w turniej-trzech-saun/js,
//  2) czy każda nazwa importowana z lokalnego modułu ('./x.js') jest w nim eksportowana.
// Uruchom z katalogu głównego repozytorium:  node .claude/skills/turniej-trzech-saun/scripts/check.js

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const repo = path.resolve(__dirname, '../../../..');
const dir = path.join(repo, 'turniej-trzech-saun', 'js');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
let problems = 0;

// 1) składnia — kopia jako .mjs, żeby Node czytał plik jako moduł ES
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-check-'));
for (const f of files) {
  const copy = path.join(tmp, f.replace(/\.js$/, '.mjs'));
  fs.copyFileSync(path.join(dir, f), copy);
  try {
    execFileSync(process.execPath, ['--check', copy], { stdio: 'pipe' });
  } catch (e) {
    problems++;
    console.error(`BŁĄD SKŁADNI w js/${f}:\n${String(e.stderr || e.message).replace(new RegExp(copy.replace(/[\\.]/g, '\\$&'), 'g'), 'js/' + f)}`);
  }
}
fs.rmSync(tmp, { recursive: true, force: true });

// 2) zgodność importów z eksportami
const src = Object.fromEntries(files.map((f) => [f, fs.readFileSync(path.join(dir, f), 'utf8')]));
const exportsOf = (code) => {
  const names = new Set();
  for (const m of code.matchAll(/export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of code.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const n = part.trim().split(/\s+as\s+/).pop();
      if (n) names.add(n);
    }
  }
  return names;
};
for (const [f, code] of Object.entries(src)) {
  for (const m of code.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]\.\/([\w-]+\.js)['"]/g)) {
    const target = m[2];
    if (target === 'lib.js') continue; // lib.js przekazuje eksporty Preact/htm z CDN
    if (!src[target]) { problems++; console.error(`js/${f}: import z nieistniejącego pliku ./${target}`); continue; }
    const have = exportsOf(src[target]);
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0];
      if (name && !have.has(name)) { problems++; console.error(`js/${f}: importuje „${name}” z ./${target}, ale ${target} tego nie eksportuje`); }
    }
  }
  for (const m of code.matchAll(/import\(\s*['"]\.\/([\w-]+\.js)['"]\s*\)/g)) {
    if (!src[m[1]]) { problems++; console.error(`js/${f}: dynamiczny import nieistniejącego pliku ./${m[1]}`); }
  }
}

if (problems) {
  console.error(`\nZnaleziono problemów: ${problems}. NIE wdrażaj, dopóki ich nie poprawisz.`);
  process.exit(1);
}
console.log(`OK — ${files.length} modułów: składnia poprawna, importy zgodne z eksportami.`);
