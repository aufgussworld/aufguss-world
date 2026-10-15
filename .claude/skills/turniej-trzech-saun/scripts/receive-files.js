// Lokalny odbiornik plików z przeglądarki (np. zrzutów ekranu do instrukcji): każdy POST na
// http://localhost:8124/<nazwa> zapisuje treść żądania jako plik <nazwa> w podanym folderze.
// Uruchom:  node .claude/skills/turniej-trzech-saun/scripts/receive-files.js <folder-docelowy>
// Zatrzymaj Ctrl+C, gdy skończysz — serwer służy tylko na czas robienia zrzutów.

const http = require('http');
const fs = require('fs');
const path = require('path');

const dir = path.resolve(process.argv[2] || '.');
fs.mkdirSync(dir, { recursive: true });

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.end(); return; }
  if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
  const name = path.basename(decodeURIComponent((req.url || '/plik.bin').slice(1))) || 'plik.bin';
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    fs.writeFileSync(path.join(dir, name), Buffer.concat(chunks));
    console.log('zapisano', name);
    res.end('ok ' + name);
  });
}).listen(8124, '127.0.0.1', () => console.log(`Odbiornik: http://localhost:8124/<nazwa> → ${dir}`));
