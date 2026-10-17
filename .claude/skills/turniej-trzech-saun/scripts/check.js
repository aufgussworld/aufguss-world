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
// Demo nowych funkcji (demo-beta/js): podmienione moduły; ich importy './x.js' trafiają (mapą importów)
// do wspólnego js/, więc sprawdzamy je względem eksportów z js/.
const betaDir = path.join(repo, 'turniej-trzech-saun', 'demo-beta', 'js');
const betaFiles = fs.existsSync(betaDir) ? fs.readdirSync(betaDir).filter((f) => f.endsWith('.js')) : [];
let problems = 0;

// 1) składnia — kopia jako .mjs, żeby Node czytał plik jako moduł ES
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-check-'));
for (const [d, label, list] of [[dir, 'js', files], [betaDir, 'demo-beta/js', betaFiles]]) {
  for (const f of list) {
    const copy = path.join(tmp, label.replace(/\W/g, '_') + '_' + f.replace(/\.js$/, '.mjs'));
    fs.copyFileSync(path.join(d, f), copy);
    try {
      execFileSync(process.execPath, ['--check', copy], { stdio: 'pipe' });
    } catch (e) {
      problems++;
      console.error(`BŁĄD SKŁADNI w ${label}/${f}:\n${String(e.stderr || e.message).replace(new RegExp(copy.replace(/[\\.]/g, '\\$&'), 'g'), label + '/' + f)}`);
    }
  }
}
fs.rmSync(tmp, { recursive: true, force: true });

// 2) zgodność importów z eksportami
const src = Object.fromEntries(files.map((f) => [f, fs.readFileSync(path.join(dir, f), 'utf8')]));
const betaSrc = Object.fromEntries(betaFiles.map((f) => [f, fs.readFileSync(path.join(betaDir, f), 'utf8')]));
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
// targets — skąd brać eksporty modułu docelowego (w demo-beta: podmieniony moduł albo wspólny z js/)
const checkImports = (label, f, code, targets) => {
  for (const m of code.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]\.\/([\w-]+\.js)['"]/g)) {
    const target = m[2];
    if (target === 'lib.js') continue; // lib.js przekazuje eksporty Preact/htm z CDN
    if (!targets[target]) { problems++; console.error(`${label}/${f}: import z nieistniejącego pliku ./${target}`); continue; }
    const have = exportsOf(targets[target]);
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0];
      if (name && !have.has(name)) { problems++; console.error(`${label}/${f}: importuje „${name}” z ./${target}, ale ${target} tego nie eksportuje`); }
    }
  }
  for (const m of code.matchAll(/import\(\s*['"]\.\/([\w-]+\.js)['"]\s*\)/g)) {
    if (!targets[m[1]]) { problems++; console.error(`${label}/${f}: dynamiczny import nieistniejącego pliku ./${m[1]}`); }
  }
};
for (const [f, code] of Object.entries(src)) checkImports('js', f, code, src);
if (betaFiles.length) {
  const merged = { ...src, ...betaSrc }; // tak widzi moduły strona demo-beta
  for (const [f, code] of Object.entries(betaSrc)) checkImports('demo-beta/js', f, code, merged);
  for (const [f, code] of Object.entries(src)) if (!betaSrc[f]) checkImports('js (w demo-beta)', f, code, merged);
}

if (problems) {
  console.error(`\nZnaleziono problemów: ${problems}. NIE wdrażaj, dopóki ich nie poprawisz.`);
  process.exit(1);
}
console.log(`OK — ${files.length} modułów${betaFiles.length ? ` (+ demo-beta: ${betaFiles.join(', ')})` : ''}: składnia poprawna, importy zgodne z eksportami.`);
