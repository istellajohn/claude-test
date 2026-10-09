// Original vector illustrations and icons for the guide.
// Palette is passed in so every drawing follows the design tokens.
// All drawings are original; no third-party artwork.

const P = { paper: '#F0EEE8', paper2: '#E6E3DA', carbon: '#1B1C1A', wine: '#712E36', wineDeep: '#561F27', terracotta: '#A5554A', blush: '#E7C9CD', grey: '#B9B6AE', olive: '#5E6655', sun: '#E9C9A6' };

// ---------------------------------------------------------------- icons
// 48×48 grid, 2.6 stroke, round caps. Each returns inner SVG.
const ICON = {
  water: `<path d="M19 6h10v5l3 4v25a3 3 0 0 1-3 3H19a3 3 0 0 1-3-3V15l3-4z"/><path d="M16 22h16M16 32h16"/>`,
  food: `<path d="M8 26h32a16 16 0 0 1-32 0z"/><path d="M14 20c2-4 6-6 10-6s8 2 10 6"/><path d="M24 8v4"/>`,
  ors: `<path d="M12 6h24v36H12z"/><path d="M12 12l4-2 4 2 4-2 4 2 4-2 4 2"/><path d="M24 22v12M18 28h12"/>`,
  pills: `<rect x="6" y="14" width="36" height="20" rx="10" transform="rotate(-30 24 24)"/><path d="M18 14l12 20"/>`,
  battery: `<rect x="10" y="8" width="28" height="34" rx="4"/><path d="M20 4h8"/><path d="M26 16l-6 9h8l-6 9"/>`,
  shoe: `<path d="M6 32V18l8 2 6 6 12 3c4 1 10 3 10 7v2H6z"/><path d="M6 36h36"/><path d="M15 23l3-3M19 27l3-3"/>`,
  weather: `<circle cx="18" cy="18" r="7"/><path d="M18 4v4M4 18h4M8 8l3 3M28 8l-3 3"/><path d="M22 38h16a6 6 0 0 0 0-12 9 9 0 0 0-17 3 5 5 0 0 0 1 9z"/>`,
  id: `<rect x="6" y="11" width="36" height="26" rx="3"/><circle cx="17" cy="22" r="4"/><path d="M11 32c1-4 11-4 12 0M27 20h9M27 26h9"/>`,
  cash: `<rect x="5" y="13" width="38" height="22" rx="2"/><circle cx="24" cy="24" r="5"/><path d="M11 18v12M37 18v12"/>`,
  note: `<path d="M10 6h22l6 6v30H10z"/><path d="M32 6v6h6"/><path d="M16 20h16M16 27h16M16 34h10"/>`,
  care: `<path d="M24 40S8 30 8 19a8 8 0 0 1 16-3 8 8 0 0 1 16 3c0 11-16 21-16 21z"/><path d="M24 20v10M19 25h10"/>`,
  nophone: `<rect x="13" y="4" width="22" height="40" rx="4"/><path d="M21 9h6"/><path d="M8 40L40 8"/>`,
  metro: `<rect x="11" y="5" width="26" height="30" rx="6"/><path d="M11 22h26"/><circle cx="18" cy="28" r="2"/><circle cx="30" cy="28" r="2"/><path d="M16 35l-5 8M32 35l5 8"/>`,
  train: `<path d="M12 8h24l4 26H8z"/><path d="M10 22h28"/><path d="M8 34h32M14 34l-4 8M34 34l4 8"/>`,
  signal: `<path d="M8 38h4v-6H8zM16 38h4V26h-4zM24 38h4V20h-4zM32 38h4V12h-4z"/><path d="M6 8l36 34"/>`,
  barrier: `<path d="M6 16h36v10H6z"/><path d="M14 16l-6 10M24 16l-6 10M34 16l-6 10M42 18l-4 8"/><path d="M12 26v16M36 26v16"/>`,
  gate: `<path d="M8 42V12l16-6 16 6v30"/><path d="M8 42h32"/><path d="M16 18v24M24 16v26M32 18v24"/>`,
  siren: `<path d="M12 36V24a12 12 0 0 1 24 0v12"/><path d="M8 36h32v6H8z"/><path d="M24 4v4M8 12l3 3M40 12l-3 3"/>`,
  phone: `<path d="M14 6l6 1 3 9-4 3a24 24 0 0 0 10 10l3-4 9 3 1 6c0 3-3 6-6 6C21 40 8 27 8 12c0-3 3-6 6-6z"/>`,
  scale: `<path d="M24 6v34M14 42h20M10 12h28"/><path d="M10 12l-6 14h12zM38 12l-6 14h12z"/>`,
  camera: `<rect x="5" y="13" width="30" height="22" rx="3"/><path d="M35 20l8-5v18l-8-5"/><circle cx="12" cy="20" r="2.2" fill="currentColor"/>`,
  clock: `<circle cx="24" cy="24" r="18"/><path d="M24 13v12l8 5"/>`,
  pin: `<path d="M24 43s14-14 14-25a14 14 0 0 0-28 0c0 11 14 25 14 25z"/><circle cx="24" cy="18" r="5"/>`,
  people: `<circle cx="16" cy="15" r="6"/><circle cx="33" cy="17" r="5"/><path d="M5 40c0-8 5-13 11-13s11 5 11 13M27 40c0-6 3-10 7-10s8 4 8 10"/>`,
  home: `<path d="M6 22L24 7l18 15"/><path d="M11 18v22h26V18"/><path d="M20 40V28h8v12"/>`,
  search: `<circle cx="20" cy="20" r="13"/><path d="M30 30l12 12"/><path d="M14 20h12"/>`,
  doc: `<path d="M10 6h20l8 8v28H10z"/><path d="M16 26l5 5 10-10"/>`,
  hand: `<path d="M14 42V20a3 3 0 0 1 6 0v10V12a3 3 0 0 1 6 0v18V14a3 3 0 0 1 6 0v18V20a3 3 0 0 1 6 0v12c0 6-5 10-11 10z"/>`,
  medic: `<rect x="6" y="12" width="36" height="28" rx="3"/><path d="M18 12V7h12v5"/><path d="M24 19v14M17 26h14"/>`,
  shield: `<path d="M24 5l16 6v12c0 10-7 17-16 20C15 40 8 33 8 23V11z"/><path d="M17 24l5 5 9-10"/>`,
  wifioff: `<path d="M6 18a26 26 0 0 1 36 0M12 25a17 17 0 0 1 24 0M18 32a8 8 0 0 1 12 0"/><circle cx="24" cy="38" r="2" fill="currentColor"/><path d="M8 6l32 36"/>`,
  glasses: `<circle cx="13" cy="27" r="8"/><circle cx="35" cy="27" r="8"/><path d="M21 27h6M5 25l-1-8M43 25l1-8"/>`,
  pen: `<path d="M30 8l10 10L18 40H8V30z"/><path d="M26 12l10 10"/><path d="M8 40l6-6"/>`,
  lock: `<rect x="10" y="22" width="28" height="20" rx="3"/><path d="M16 22v-6a8 8 0 0 1 16 0v6"/><circle cx="24" cy="32" r="2.5" fill="currentColor"/>`,
  voice: `<path d="M8 20h6l12-9v26l-12-9H8z"/><path d="M32 18a8 8 0 0 1 0 12M36 13a14 14 0 0 1 0 22"/>`,
  eye: `<path d="M4 24s7-12 20-12 20 12 20 12-7 12-20 12S4 24 4 24z"/><circle cx="24" cy="24" r="6"/>`,
  bus: `<rect x="6" y="8" width="36" height="28" rx="4"/><path d="M6 22h36"/><path d="M12 14h8v6h-8zM28 14h8v6h-8z"/><circle cx="14" cy="38" r="3"/><circle cx="34" cy="38" r="3"/>`,
  hospital: `<rect x="8" y="10" width="32" height="32" rx="2"/><path d="M24 16v14M17 23h14"/><path d="M8 42h32"/>`,
  file: `<path d="M12 6h18l8 8v28H12z"/><path d="M30 6v8h8"/><path d="M18 24h14M18 30h14M18 36h8"/>`,
  vote: `<path d="M8 22h32v20H8z"/><path d="M14 22l10-14 10 4-7 10"/><path d="M18 30h12"/>`,
};
function icon(name, size = 44, color = P.carbon, sw = 2.6) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" style="color:${color};flex:none;display:block">${ICON[name] || ''}</svg>`;
}

// ---------------------------------------------------------------- people
// Simple editorial figures: head + body silhouette. o: {c, dupatta, bun, arm, bag}
function figure(x, y, s, o = {}) {
  const c = o.c || P.carbon;
  let g = `<g transform="translate(${x} ${y}) scale(${s})" fill="${c}">`;
  g += `<path d="M-17 0 C-17 -34 -13 -46 0 -48 C13 -46 17 -34 17 0Z"/>`;
  g += `<ellipse cx="0" cy="-60" rx="8" ry="9.5"/>`;
  if (o.bun) g += `<circle cx="${o.f > 0 ? -7 : 7}" cy="-66" r="5"/>`;
  if (o.dupatta) g += `<path d="M-11 -58 C-12 -76 12 -76 11 -58 L16 -36 L-16 -36Z"/>`;
  if (o.arm) g += `<g transform="translate(${o.f > 0 ? 11 : -11} -40) rotate(${o.arm})"><rect x="-3.4" y="-36" width="6.8" height="38" rx="3.4"/></g>`;
  if (o.bag) g += `<path d="M-6 -44 L14 -20" stroke="${o.bagc || P.paper}" stroke-width="2.4" fill="none"/>`;
  g += `</g>`;
  return g;
}

// A band of people. Two highlighted figures share a bottle.
function crowd(w = 904, h = 230, opts = {}) {
  const base = h - 4;
  let g = '';
  const back = [], front = [];
  for (let i = 0; i < 15; i++) back.push([24 + i * 62 + (i % 2) * 10, base - 46, .82, { c: '#9C9890', bun: i % 3 === 0, dupatta: i % 4 === 1, f: i % 2 ? 1 : -1 }]);
  const fr = [[40, 'bun'], [128, 'dup'], [214, ''], [470, 'bun'], [560, 'dup'], [648, ''], [736, 'bun'], [826, 'dup']];
  fr.forEach(([x, k], i) => front.push([x, base, 1.18, { c: P.carbon, bun: k === 'bun', dupatta: k === 'dup', f: i % 2 ? 1 : -1, arm: i === 4 ? -24 : undefined }]));
  back.forEach(a => g += figure(...a));
  front.forEach(a => g += figure(...a));
  // the two who connect
  g += figure(318, base, 1.24, { c: P.wine, dupatta: true, f: 1, arm: 38 });
  g += figure(398, base, 1.24, { c: P.wine, bun: true, f: -1, arm: -38 });
  // bottle passing between them
  g += `<g transform="translate(358 ${base - 104}) rotate(-6)"><rect x="-7" y="-20" width="14" height="30" rx="3" fill="${P.paper}" stroke="${P.wine}" stroke-width="2.4"/><rect x="-4" y="-26" width="8" height="6" fill="${P.wine}"/></g>`;
  // ground
  g += `<rect x="0" y="${base}" width="${w}" height="4" fill="${P.carbon}"/>`;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${g}</svg>`;
}

// ---------------------------------------------------------------- Jantar Mantar: Samrat Yantra
// Side elevation of the great equinoctial sundial, built from simple planes.
// mode: 'day' (paper bg) or 'dusk' (on wine bg)
function samratYantra(w = 904, h = 560, mode = 'day', opts = {}) {
  const day = mode === 'day';
  const body = day ? P.terracotta : '#8E3A44';
  const shade = day ? '#7E3B35' : '#4E1A22';
  const trim = day ? P.paper : P.blush;
  const sky = day ? P.sun : '#C78A6E';
  const ink = day ? P.carbon : P.paper;
  const gx = w * .52, gy = h - 40;           // ground at gnomon foot
  const baseW = w * .78, topH = h * .78;     // gnomon size
  const x0 = gx - baseW * .55, x1 = x0 + baseW;
  let g = '';
  // sun
  g += `<circle cx="${w * .76}" cy="${h * .30}" r="${h * .24}" fill="${sky}"/>`;
  if (!day) for (let i = 0; i < 6; i++) g += `<rect x="${w * .76 - h * .24}" y="${h * .30 + 18 + i * 13}" width="${h * .48}" height="${2 + i * 1.3}" fill="${'#712E36'}"/>`;
  // quadrant wall (arc band) behind the gnomon
  const qr = baseW * .30, qcx = x0 + baseW * .58, qcy = gy;
  g += `<path d="M${qcx - qr - 34} ${qcy} A${qr + 34} ${qr + 34} 0 0 1 ${qcx + qr + 34} ${qcy} L${qcx + qr} ${qcy} A${qr} ${qr} 0 0 0 ${qcx - qr} ${qcy}Z" fill="${shade}"/>`;
  for (let i = 1; i < 12; i++) { const a = Math.PI * i / 12; g += `<line x1="${qcx - Math.cos(a) * qr}" y1="${qcy - Math.sin(a) * qr}" x2="${qcx - Math.cos(a) * (qr + 34)}" y2="${qcy - Math.sin(a) * (qr + 34)}" stroke="${trim}" stroke-width="1.6" opacity=".55"/>`; }
  // gnomon body with the staircase cut into its top edge
  const steps = 26;
  let st = `M${x0} ${gy}`;
  for (let i = 0; i < steps; i++) { const ax = x0 + baseW * (i / steps); const by = gy - topH * ((i + 1) / steps); const bx = x0 + baseW * ((i + 1) / steps); st += ` L${ax} ${by} L${bx} ${by}`; }
  g += `<path d="${st} L${x1} ${gy} Z" fill="${body}"/>`;
  // shaded side band
  g += `<path d="M${x1 - 26} ${gy} L${x1} ${gy} L${x1} ${gy - topH} L${x1 - 26} ${gy - topH + 26 * topH / baseW} Z" fill="${shade}"/>`;
  // step edges in trim colour
  g += `<path d="${st}" fill="none" stroke="${trim}" stroke-width="2.2" stroke-linejoin="miter"/>`;
  // a lower parapet line parallel to the stairs
  g += `<path d="M${x0 + 40} ${gy} L${x1} ${gy - topH + 40 * topH / baseW}" stroke="${trim}" stroke-width="1.6" opacity=".5"/>`;
  g += `<line x1="${x1}" y1="${gy - topH}" x2="${x1}" y2="${gy}" stroke="${trim}" stroke-width="3.2"/>`;
  [0.42, 0.58, 0.74].forEach(f => { const ax = x0 + baseW * f, aw = baseW * .08, ah = Math.min(topH * f * .55, 120); g += `<path d="M${ax} ${gy} V${gy - ah + aw / 2} A${aw / 2} ${aw / 2} 0 0 1 ${ax + aw} ${gy - ah + aw / 2} V${gy}Z" fill="${shade}" stroke="${trim}" stroke-width="2"/>`; });
  // small chhatri at top
  g += `<rect x="${x1 - 30}" y="${gy - topH - 30}" width="30" height="30" fill="${body}" stroke="${trim}" stroke-width="2.4"/><path d="M${x1 - 36} ${gy - topH - 30} Q${x1 - 15} ${gy - topH - 58} ${x1 + 6} ${gy - topH - 30}Z" fill="${shade}" stroke="${trim}" stroke-width="2.2"/>`;
  // ground
  g += `<rect x="0" y="${gy}" width="${w}" height="3.2" fill="${ink}"/>`;
  // people for scale
  const ppl = opts.people || [[x0 - 60, 1, .7], [x0 - 18, -1, .64], [x1 + 46, 1, .7], [x1 + 92, -1, .66]];
  ppl.forEach(([px, f, sc], i) => g += figure(px, gy, sc, { c: i === (opts.highlight ?? -1) ? (day ? P.wine : P.blush) : ink, bun: i % 2 === 0, dupatta: i === 1, f }));
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block">${g}</svg>`;
}

// ---------------------------------------------------------------- scenes
// A torn paper slip with handwritten numbers, next to a phone with no data.
function paperSlip(lang = 'en', w = 330, h = 300) {
  const hi = lang === 'hi';
  const font = hi ? 'Kalam' : 'Caveat';
  const lines = hi ? [['घर', '__________'], ['क़ानूनी सहायता', '15100'], ['एम्बुलेंस', '102'], ['मिलने की जगह', '______']]
                   : [['Home', '__________'], ['Legal aid', '15100'], ['Ambulance', '102'], ['Meet at', '__________']];
  let g = `<g transform="rotate(-4 ${w / 2} ${h / 2})">`;
  let edge = `M14 30`; for (let x = 14; x <= w - 14; x += 12) edge += ` L${x + 6} ${26 + (x % 24 ? 6 : 0)}`;
  g += `<path d="${edge} L${w - 14} ${h - 20} L14 ${h - 20} Z" fill="${P.paper}" stroke="${P.grey}" stroke-width="1.2"/>`;
  for (let i = 0; i < 5; i++) g += `<line x1="28" y1="${82 + i * 46}" x2="${w - 28}" y2="${82 + i * 46}" stroke="#BFCBD6" stroke-width="1.2"/>`;
  lines.forEach(([a, b], i) => g += `<text x="34" y="${76 + i * 46}" font-family="${font}" font-size="${hi ? 25 : 32}" fill="${P.carbon}">${a}  <tspan fill="${P.wine}" font-weight="700">${b}</tspan></text>`);
  g += `</g>`;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;overflow:visible">${g}</svg>`;
}

function phoneNoData(lang = 'en', w = 200, h = 330, dark = true) {
  const ink = dark ? P.paper : P.carbon, bg = dark ? '#2A2B28' : P.paper2;
  const label = lang === 'hi' ? 'कोई डेटा नहीं' : 'No data';
  return `<svg width="${w}" height="${h}" viewBox="0 0 200 330" style="display:block">
  <rect x="10" y="6" width="180" height="318" rx="26" fill="${bg}" stroke="${ink}" stroke-width="4"/>
  <rect x="78" y="20" width="44" height="8" rx="4" fill="${ink}"/>
  <g transform="translate(46 110)">${[0, 1, 2, 3].map(i => `<rect x="${i * 28}" y="${60 - i * 18}" width="18" height="${20 + i * 18}" rx="2" fill="${i ? 'none' : P.blush}" stroke="${i ? ink : P.blush}" stroke-width="3" stroke-dasharray="${i ? '4 5' : '0'}"/>`).join('')}
  <line x1="-10" y1="96" x2="118" y2="-14" stroke="${P.blush}" stroke-width="6" stroke-linecap="round"/></g>
  <text x="100" y="270" text-anchor="middle" font-family="Bricolage Grotesque" font-weight="700" font-size="${lang === 'hi' ? 22 : 24}" fill="${ink}" letter-spacing="1">${label}</text></svg>`;
}

// Two phones that cannot reach each other, and a meeting point that still works.
function unreachable(lang = 'en', w = 330, h = 380) {
  const meet = lang === 'hi' ? 'तय जगह' : 'Meeting point';
  const time = lang === 'hi' ? 'तय समय' : 'Check-in time';
  const ph = (x, y, r) => `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-34" y="-58" width="68" height="116" rx="12" fill="${P.paper}" stroke="${P.carbon}" stroke-width="3.4"/><rect x="-12" y="-50" width="24" height="4" rx="2" fill="${P.carbon}"/><text x="0" y="12" text-anchor="middle" font-family="Bricolage Grotesque" font-weight="800" font-size="34" fill="${P.wine}">?</text></g>`;
  return `<svg width="${w}" height="${h}" viewBox="0 0 330 380" style="display:block">
    ${ph(64, 92, -8)}${ph(266, 92, 8)}
    <path d="M104 92 C150 60 180 60 226 92" fill="none" stroke="${P.grey}" stroke-width="3" stroke-dasharray="7 9"/>
    <path d="M156 66 l18 18 M174 66 l-18 18" stroke="${P.wine}" stroke-width="4" stroke-linecap="round"/>
    <path d="M64 156 C70 230 130 250 165 270 M266 156 C260 230 200 250 165 270" fill="none" stroke="${P.carbon}" stroke-width="3"/>
    <g transform="translate(141 230) scale(1)"><svg width="48" height="48" viewBox="0 0 48 48"><path d="M24 43s14-14 14-25a14 14 0 0 0-28 0c0 11 14 25 14 25z" fill="${P.wine}"/><circle cx="24" cy="18" r="5" fill="${P.paper}"/></svg></g>
    <text x="165" y="310" text-anchor="middle" font-family="Bricolage Grotesque" font-weight="700" font-size="21" fill="${P.carbon}">${meet}</text>
    <text x="165" y="338" text-anchor="middle" font-family="Bricolage Grotesque" font-size="19" fill="#4A4B45">+ ${time}</text></svg>`;
}

// A phone held in landscape, recording.
function recording(lang = 'en', w = 360, h = 230) {
  const rec = 'REC';
  return `<svg width="${w}" height="${h}" viewBox="0 0 360 230" style="display:block">
  <rect x="6" y="20" width="348" height="196" rx="26" fill="#2A2B28" stroke="${P.paper}" stroke-width="3.4"/>
  <rect x="30" y="40" width="300" height="156" rx="6" fill="#3A3B37"/>
  ${[[42, 52, 1, 1], [318, 52, -1, 1], [42, 184, 1, -1], [318, 184, -1, -1]].map(([x, y, a, b]) => `<path d="M${x} ${y + 18 * b} V${y} H${x + 18 * a}" stroke="${P.paper}" stroke-width="3" fill="none"/>`).join('')}
  <circle cx="64" cy="70" r="8" fill="#E2463A"/><text x="80" y="77" font-family="IBM Plex Mono" font-size="18" fill="${P.paper}">${rec}</text>
  <text x="300" y="77" text-anchor="end" font-family="IBM Plex Mono" font-size="16" fill="${P.grey}">00:04:12</text>
  ${figure(150, 186, .9, { c: '#7D7A73', bun: true, f: 1 })}${figure(205, 186, .95, { c: '#7D7A73', f: -1 })}
  <text x="180" y="176" text-anchor="middle" font-family="IBM Plex Mono" font-size="13" fill="${P.grey}">${lang === 'hi' ? 'तारीख़ · समय · जगह' : 'DATE · TIME · PLACE'}</text></svg>`;
}

// Hands passing a slip of paper: help from people, not uniforms.
function helpingHands(w = 300, h = 200) {
  return `<svg width="${w}" height="${h}" viewBox="0 0 300 200" style="display:block">
  <path d="M0 150 C40 140 70 128 104 122 L150 116 C162 114 166 128 154 132 L120 140" fill="none" stroke="${P.carbon}" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M0 170 L60 168 C90 166 112 160 130 150" fill="none" stroke="${P.carbon}" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M300 60 C260 70 230 82 196 90 L150 98 C138 100 136 86 148 82 L180 74" fill="none" stroke="${P.wine}" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M300 40 L240 44 C210 48 190 54 170 64" fill="none" stroke="${P.wine}" stroke-width="3.2" stroke-linecap="round"/>
  <g transform="translate(150 106) rotate(-14)"><rect x="-26" y="-18" width="52" height="36" fill="${P.paper}" stroke="${P.carbon}" stroke-width="2.6"/><path d="M-16 -6h32M-16 4h22" stroke="${P.wine}" stroke-width="2.6"/></g></svg>`;
}


// A detention bus with sealed windows; a hand presses a handwritten note to the glass.
function busNote(lang = 'en', w = 420, h = 250) {
  const hi = lang === 'hi';
  const l1 = hi ? 'मुझे ले जा रहे हैं' : 'TAKING ME', l2 = hi ? 'घर: 98______' : 'Home: 98______';
  let g = `<rect x="6" y="40" width="404" height="170" rx="18" fill="${P.carbon}"/>`;
  g += `<rect x="6" y="40" width="404" height="16" rx="8" fill="#2E2F2B"/>`;
  [24, 112, 200, 288].forEach((x, i) => { g += `<rect x="${x}" y="70" width="${i === 3 ? 104 : 76}" height="66" rx="5" fill="#3B3C37"/>`; });
  g += `<rect x="6" y="150" width="404" height="6" fill="${P.wine}"/>`;
  g += `<text x="208" y="186" text-anchor="middle" font-family="Big Shoulders Stencil Display, IBM Plex Mono, monospace" font-weight="700" font-size="20" letter-spacing="5" fill="#6C6A64">POLICE</text>`;
  [70, 330].forEach(cx => { g += `<circle cx="${cx}" cy="212" r="24" fill="${P.carbon}"/><circle cx="${cx}" cy="212" r="10" fill="${P.grey}"/>`; });
  // the note pressed to the window
  g += `<g transform="translate(118 52) rotate(-5)"><rect x="0" y="0" width="150" height="92" fill="${P.paper}" stroke="${P.grey}" stroke-width="1"/>`;
  g += `<text x="12" y="36" font-family="${hi ? 'Kalam' : 'Caveat'}" font-weight="700" font-size="${hi ? 21 : 28}" fill="${P.wine}">${l1}</text>`;
  g += `<text x="12" y="72" font-family="${hi ? 'Kalam' : 'Caveat'}" font-size="${hi ? 20 : 25}" fill="${P.carbon}">${l2}</text></g>`;
  // fingers holding it
  g += `<g fill="#C9A389">${[0, 1, 2, 3].map(i => `<rect x="${140 + i * 16}" y="138" width="12" height="22" rx="6"/>`).join('')}</g>`;
  return `<svg width="${w}" height="${h}" viewBox="0 0 416 240" style="display:block">${g}</svg>`;
}

// A uniform chest where the name plate should be.
function noNameTag(lang = 'en', w = 260, h = 230) {
  const q = lang === 'hi' ? 'नाम?' : 'NAME?';
  return `<svg width="${w}" height="${h}" viewBox="0 0 260 230" style="display:block">
  <path d="M20 230 C20 120 50 70 92 56 L130 80 L168 56 C210 70 240 120 240 230Z" fill="#8C7A5B"/>
  <path d="M92 56 L130 80 L168 56 L156 48 L130 66 L104 48Z" fill="#6E5F45"/>
  <path d="M130 80 V230" stroke="#6E5F45" stroke-width="3"/>
  ${[110, 150, 190].map(y => `<circle cx="130" cy="${y}" r="5" fill="#C9B98F"/>`).join('')}
  <rect x="44" y="104" width="62" height="10" fill="${P.wine}"/><rect x="44" y="114" width="62" height="6" fill="#2F5E8A"/>
  <rect x="152" y="104" width="76" height="26" rx="2" fill="none" stroke="${P.paper}" stroke-width="2.6" stroke-dasharray="6 5"/>
  <text x="190" y="122" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-weight="600" font-size="14" fill="${P.paper}">${q}</text>
  <path d="M60 150 h36 v40 l-18 10 l-18 -10z" fill="none" stroke="#C9B98F" stroke-width="2"/></svg>`;
}

module.exports = { busNote, noNameTag, P, ICON, icon, figure, crowd, samratYantra, paperSlip, phoneNoData, unreachable, recording, helpingHands };
