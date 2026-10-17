// Lokalny serwer do podglądu systemu sędziowskiego (serwuje katalog główny repozytorium).
// Uruchom z katalogu głównego repo:  node .claude/skills/turniej-trzech-saun/scripts/serve.js
// Demo:       http://localhost:8123/turniej-trzech-saun/demo/   (PIN supervisora 2026)
// Beta:       http://localhost:8123/turniej-trzech-saun/demo-beta/   (nowe funkcje do akceptacji)
// Produkcja:  http://localhost:8123/turniej-trzech-saun/        (UWAGA: prawdziwa baza turnieju)

const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../..');
const port = Number(process.env.PORT) || 8123;
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.pdf': 'application/pdf',
};

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const fp = path.join(root, p);
  if (!fp.startsWith(root)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(fp).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}).listen(port, () => console.log(`Podgląd: http://localhost:${port}/turniej-trzech-saun/demo/`));
