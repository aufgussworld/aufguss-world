/* Buduje assets/map-style.json: otwarty styl Positron (OpenFreeMap / OpenMapTiles)
   przebarwiony pod paletę aufguss.world. Źródło: https://tiles.openfreemap.org/styles/positron
   Uruchomienie: node data/build-map-style.js  (pobiera aktualny Positron i nakłada paletę) */
const fs = require('fs'), path = require('path'), https = require('https');

const P = {                       // paleta mapy — pochodna palety portalu (krem #fbf5ea, stone #8a7960, ink)
  land: '#f6efe2', residential: '#f1e8d8', park: '#e3e7d0', wood: '#dde3cb',
  water: '#c5d9e3', waterway: '#bcd2de', waterLabel: '#4f6f86',
  building: '#ebe1cd', buildingLine: '#dcd0b8',
  roadCasing: '#dbd0bc', roadInner: '#fffdf8', roadMinor: '#eae1cf', roadPath: '#e4dac6', roadSubtle: 'rgba(219,208,188,0.7)',
  rail: '#d8cdb9', railDash: '#fbf5ea',
  boundary: '#b7a88f',
  labelInk: '#33261b', labelSoft: '#5d4c3c', labelMuted: '#8a7960', halo: 'rgba(251,245,234,0.85)',
  roadName: '#7a6a52', roadHalo: '#f6efe2',
};

function recolor(style) {
  for (const l of style.layers) {
    const p = l.paint = l.paint || {};
    const id = l.id;
    const set = (k, v) => { if (k in p || l.type !== 'symbol') p[k] = v; };
    if (l.type === 'raster') { p['raster-opacity'] = 0.18; p['raster-saturation'] = -1; p['raster-contrast'] = -0.2; continue; }
    if (id === 'background') { set('background-color', P.land); continue; }
    if (id === 'park') set('fill-color', P.park);
    else if (id === 'landcover_wood') set('fill-color', P.wood);
    else if (id === 'landuse_residential') set('fill-color', P.residential);
    else if (id.startsWith('landcover_')) set('fill-color', '#f8f4ec');
    else if (id === 'water') set('fill-color', P.water);
    else if (id === 'waterway') set('line-color', P.waterway);
    else if (id === 'building') { set('fill-color', P.building); set('fill-outline-color', P.buildingLine); }
    else if (id.startsWith('aeroway')) { if (l.type === 'fill') set('fill-color', '#f3ede0'); else set('line-color', '#e6ddca'); }
    else if (id === 'road_area_pier' || id === 'road_pier') { if (l.type === 'fill') set('fill-color', P.land); else set('line-color', P.land); }
    else if (id === 'highway_path') set('line-color', P.roadPath);
    else if (id === 'highway_minor') set('line-color', P.roadMinor);
    else if (/casing$/.test(id)) set('line-color', P.roadCasing);
    else if (/inner$/.test(id)) set('line-color', P.roadInner);
    else if (/subtle$/.test(id)) set('line-color', P.roadSubtle);
    else if (/^railway.*dashline$/.test(id)) set('line-color', P.railDash);
    else if (/^railway/.test(id)) set('line-color', P.rail);
    else if (id.startsWith('boundary')) set('line-color', P.boundary);
    else if (l.type === 'symbol') {
      if (id.startsWith('water_name')) { p['text-color'] = P.waterLabel; p['text-halo-color'] = P.halo; }
      else if (id === 'waterway_line_label') { p['text-color'] = P.waterLabel; p['text-halo-color'] = P.halo; }
      else if (id.startsWith('highway-name')) { p['text-color'] = P.roadName; p['text-halo-color'] = P.roadHalo; }
      else if (id === 'airport') { p['text-color'] = P.labelMuted; p['text-halo-color'] = P.halo; }
      else if (id.startsWith('label_country')) { p['text-color'] = P.labelSoft; p['text-halo-color'] = P.halo; }
      else if (id === 'label_state' || id === 'label_other') { p['text-color'] = P.labelMuted; p['text-halo-color'] = P.halo; }
      else if (id.startsWith('label_')) { p['text-color'] = P.labelInk; p['text-halo-color'] = P.halo; }
    }
  }
  style.name = 'aufguss.world (Positron, paleta portalu)';
  style.metadata = { ...(style.metadata || {}), 'aufguss:source': 'https://tiles.openfreemap.org/styles/positron', 'aufguss:built': new Date().toISOString().slice(0, 10) };
  return style;
}

https.get('https://tiles.openfreemap.org/styles/positron', res => {
  let d = ''; res.on('data', c => d += c); res.on('end', () => {
    const out = path.join(__dirname, '..', 'assets', 'map-style.json');
    fs.writeFileSync(out, JSON.stringify(recolor(JSON.parse(d)), null, 1), 'utf8');
    console.log('zapisano', out);
  });
}).on('error', e => { console.error('pobranie stylu nie powiodło się:', e.message); process.exit(1); });
