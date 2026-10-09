// Jantar Mantar 2.0 · Independent citizen's guide · build script
// Usage: node src/build.js [--only=en-s03,card-b,story,...] [--no-render]
// Reads /content (copy + shared data), writes HTML to /build and images to /exports.

const fs = require('fs');
const path = require('path');
const I = require('./illustrations');

const ROOT = path.resolve(__dirname, '..');
const rd = f => JSON.parse(fs.readFileSync(path.join(ROOT, 'content', f), 'utf8'));
const DATA = rd('data.json');
const SRC = rd('sources.json');
const LANGS = { en: rd('en.json'), hi: rd('hi.json') };

const args = process.argv.slice(2);
const ONLY = (args.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const NO_RENDER = args.includes('--no-render');

const t = (o, lang) => (o && typeof o === 'object' && !Array.isArray(o)) ? (o[lang] ?? o.en) : o;
const C = id => DATA.contacts[id];
const srcShort = ids => ids.split(',').map(s => SRC[s.trim()]?.short).filter(Boolean).join(' · ');
const pad = n => String(n).padStart(2, '0');
const P = I.P;

// Which icon belongs to each contact and status row (one place to change it).
const CONTACT_ICON = { '112': 'siren', '102': 'medic', dslsa: 'scale', hrln: 'shield', apcr: 'scale', sflc: 'wifioff', dmrc: 'metro', eci: 'vote', dcw: 'phone', ncw: 'shield', pca: 'file' };
const STATUS_ICON = { permission: 'gate', metro: 'metro', trains: 'train', internet: 'wifioff', roads: 'barrier' };

// ------------------------------------------------------------------ type system + base CSS
function css(lang, W, H) {
  const hi = lang === 'hi';
  return `
@import url('../assets/fonts/fonts.css');
:root{
  --paper:#F0EEE8; --paper2:#E6E3DA; --carbon:#1B1C1A; --wine:#712E36; --grey:#B9B6AE; --olive:#5E6655; --ink2:#4A4B45;
  --rule:rgba(27,28,26,.2); --M:88px;
  --display:${hi ? "'Rozha One', serif" : "'Fraunces', serif"};
  --sans:${hi ? "'Anek Devanagari', 'Bricolage Grotesque', sans-serif" : "'Bricolage Grotesque', sans-serif"};
  --num:'Bricolage Grotesque', sans-serif;
  --mono:'IBM Plex Mono', ${hi ? "'Anek Devanagari'," : ''} monospace;
  --hand:${hi ? "'Kalam'" : "'Caveat'"}, cursive;
}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{background:var(--paper);color:var(--carbon);font-family:var(--sans);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;font-kerning:normal}
.page{position:relative;width:${W}px;height:${H}px;padding:80px var(--M) 0}
.page.dark{background:var(--carbon);color:var(--paper)} .page.wine{background:var(--wine);color:var(--paper)}
.grain{position:absolute;inset:0;pointer-events:none;opacity:.4;mix-blend-mode:multiply;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .4 0 0 0 0 .37 0 0 0 0 .3 0 0 0 .2 0'/></filter><rect width='240' height='240' filter='url(%23n)'/></svg>")}
.dark .grain,.wine .grain{mix-blend-mode:screen;opacity:.12}

.top{display:flex;justify-content:space-between;align-items:baseline;font-family:var(--mono);font-size:19px;letter-spacing:.12em;text-transform:uppercase;padding-bottom:16px;border-bottom:1.5px solid currentColor}
.top .k{color:var(--wine);font-weight:500} .dark .top .k,.wine .top .k{color:#E7C9CD}
.top .n{opacity:.7}
${hi ? ".top .k{font-family:var(--sans);font-weight:700;letter-spacing:.01em;font-size:22px}" : ''}

.disp{font-family:var(--display);font-weight:${hi ? 400 : 640};font-variation-settings:${hi ? 'normal' : "'SOFT' 100, 'opsz' 144"};letter-spacing:${hi ? 0 : '-.022em'};line-height:${hi ? 1.2 : .98};text-wrap:balance}
.disp em{font-style:${hi ? 'normal' : 'italic'};font-weight:${hi ? 400 : 500};color:var(--wine)}
.dark .disp em,.wine .disp em{color:#E7C9CD}
.h1{margin-top:38px;font-size:${hi ? 70 : 82}px}
.body{font-size:${hi ? 30 : 29}px;line-height:${hi ? 1.45 : 1.36}}
.small{font-size:${hi ? 25 : 24}px;line-height:1.38;color:var(--ink2)} .dark .small,.wine .small{color:#CFCBC2}
.label{font-family:var(--mono);font-size:18px;letter-spacing:.12em;text-transform:uppercase;color:var(--wine);font-weight:500}
${hi ? ".label{font-family:var(--sans);font-size:22px;letter-spacing:.01em;font-weight:700}" : ''}
.dark .label{color:#E7C9CD}
.num{font-family:var(--num);font-weight:800;font-stretch:75%;letter-spacing:-.01em;font-variant-numeric:tabular-nums;line-height:1}
.strong{font-weight:700}
.note{border-left:5px solid var(--wine);padding:2px 0 2px 22px} .dark .note{border-color:#E7C9CD}
.hair{border-top:1px solid var(--rule)} .dark .hair{border-color:rgba(240,238,232,.22)}
.row{display:flex;gap:20px;align-items:flex-start}

.foot{position:absolute;left:var(--M);right:var(--M);bottom:42px;display:flex;justify-content:space-between;align-items:flex-end;gap:24px;font-size:${hi ? 19 : 18}px;line-height:1.35;padding-top:14px;border-top:1px solid var(--rule);color:var(--ink2)}
.dark .foot,.wine .foot{color:#CFCBC2;border-color:rgba(240,238,232,.25)}
.foot .r{font-family:var(--mono);font-size:16px;text-align:right;white-space:nowrap}
`;
}

function page({ lang, W = 1080, H = 1350, cls = '', inner, extraCss = '' }) {
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>${css(lang, W, H)}${extraCss}</style></head>
<body><div class="page ${cls}"><div class="grain"></div>${inner}</div>
<script>
window.__check=function(){
  const W=${W},H=${H},issues=[];
  const foot=document.querySelector('.foot'); const ft=foot?foot.getBoundingClientRect().top:H;
  document.querySelectorAll('.page *').forEach(el=>{
    if(el.closest('.foot')||el.classList.contains('grain')||el.closest('.bleed')||el.closest('.allow')) return;
    if(el.closest('svg') && el.tagName.toLowerCase()!=='svg') return;
    const r=el.getBoundingClientRect(); if(!r.width||!r.height) return;
    const cn=(el.className&&el.className.baseVal!==undefined)?el.className.baseVal:el.className;
    if(r.right>W-40||r.left<40) issues.push('x-edge:'+cn+':'+Math.round(r.left)+'-'+Math.round(r.right));
    if(r.bottom>ft-6) issues.push('hits-footer:'+(cn||el.tagName)+':'+Math.round(r.bottom)+'>'+Math.round(ft)+' "'+(el.textContent||'').trim().slice(0,28)+'"');
  });
  return [...new Set(issues)].slice(0,10);
};
</script></body></html>`;
}

const top = (k, n) => `<div class="top"><span class="k">${k}</span><span class="n">${n || ''}</span></div>`;
function foot(lang, o = {}) {
  const L = LANGS[lang];
  const left = o.left ?? t(DATA.meta.credit, lang);
  const right = o.checked === false ? (o.right || '') : `${L.ui.checked} ${t(DATA.meta.checked, lang)}`;
  return `<div class="foot"><div>${left}${o.src ? `<br>${L.ui.sources}: ${o.src}` : ''}</div><div class="r">${right}</div></div>`;
}

// ------------------------------------------------------------------ components
function contactRow(id, lang, o = {}) {
  const c = C(id), st = DATA.status_labels[c.status];
  const numPx = o.num || 66, colW = o.col || 300, nameF = o.name || 28, dark = o.dark;
  return `<div style="display:grid;grid-template-columns:${colW}px 1fr;gap:24px;align-items:start;padding:${o.pad ?? 18}px 0;border-top:1px solid ${dark ? 'rgba(240,238,232,.22)' : 'var(--rule)'}">
    <div class="num" style="font-size:${numPx}px;white-space:nowrap;padding-top:2px">${c.display}</div>
    <div>
      <div class="row" style="gap:12px;align-items:center">${I.icon(CONTACT_ICON[id], Math.round(nameF * 1.15), dark ? P.paper : P.wine, 2.6)}<span class="strong" style="font-size:${nameF}px;line-height:1.15">${t(c.name, lang)}</span></div>
      <div class="small" style="margin-top:6px;font-size:${o.small || 23}px">${t(c.help, lang)}${c.alt && !o.noAlt ? ` · <span class="num" style="font-size:1.05em;font-weight:700">${c.alt}</span>` : ''}</div>
      <div style="margin-top:7px;font-family:var(--mono);font-size:${o.tag || 16}px;letter-spacing:.02em;${c.status === 'official' ? '' : `color:${dark ? '#E7C9CD' : 'var(--wine)'}`}">${st.mark} ${t(st, lang)}</div>
      ${c.note && !o.noNote ? `<div class="small" style="margin-top:6px;font-size:${o.small || 23}px;font-style:${lang === 'hi' ? 'normal' : 'italic'}">${t(c.note, lang)}</div>` : ''}
    </div></div>`;
}

function statusRows(lang, o = {}) {
  const tag = id => ({ permission: 'background:var(--carbon);color:var(--paper)', trains: 'background:var(--carbon);color:var(--paper)', metro: 'background:var(--wine);color:var(--paper)', internet: 'border:1.5px solid var(--wine);color:var(--wine)', roads: 'border:1.5px solid var(--wine);color:var(--wine)' }[id]);
  return DATA.status.map(s => `
  <div style="display:grid;grid-template-columns:${o.iconW || 64}px 1fr;gap:20px;padding:${o.pad ?? 15}px 0;border-top:1px solid var(--rule)">
    <div style="padding-top:2px">${I.icon(STATUS_ICON[s.id], o.iconW ? o.iconW - 10 : 54, s.id === 'metro' || s.id === 'internet' ? P.wine : P.carbon, 2.4)}</div>
    <div>
      <div class="row" style="gap:12px;align-items:center"><span class="label" style="color:var(--carbon)">${t(s.label, lang)}</span><span style="padding:4px 9px 3px;font-family:var(--mono);font-size:${o.tagF || 15}px;letter-spacing:.1em;text-transform:uppercase;${tag(s.id)}">${t(s.tag, lang)}</span></div>
      <div class="strong" style="font-size:${o.val || 30}px;line-height:1.15;margin-top:6px">${t(s.value, lang)}</div>
      ${o.short ? '' : `<div class="small" style="margin-top:5px;font-size:${o.det || 22}px">${t(s.detail, lang)}</div>`}
    </div>
  </div>`).join('') + `<div style="border-top:1px solid var(--rule)"></div>`;
}


// ------------------------------------------------------------------ shared step list
// Steps are [title, body]. A trailing legal citation (BNSS / BNS / धारा) is split onto its own line.
const CITE = /^(.*?)(\s(?:BNSS|BNS|Constitution|संविधान)\s.*)$/;
function stepRows(list, lang, o = {}) {
  const hi = lang === 'hi', dark = o.dark;
  return list.map(([a, b], i) => { const m = b.match(CITE); const txt = m ? m[1] : b, cite = m ? m[2].trim() : '';
    return `<div style="display:grid;grid-template-columns:${o.numW || 56}px 1fr;gap:4px;padding:${o.pad ?? 12}px 0;border-top:1px solid ${dark ? 'rgba(240,238,232,.2)' : 'var(--rule)'}">
      <div class="num" style="font-size:${o.numF || 30}px;color:${o.numC || (dark ? '#E7C9CD' : 'var(--wine)')}">${o.icons ? I.icon(o.icons[i], 38, dark ? P.paper : (i === (o.hl ?? -1) ? P.wine : P.carbon), 2.4) : pad(i + 1)}</div>
      <div><div class="strong" style="font-size:${o.t || (hi ? 27 : 27)}px;line-height:1.16">${a}</div>
      <div style="margin-top:4px;font-size:${o.d || (hi ? 23 : 22)}px;line-height:1.36;color:${dark ? '#CFCBC2' : 'var(--ink2)'}">${txt}</div>
      ${cite ? `<div style="margin-top:4px;font-family:var(--mono);font-size:${o.c || 15}px;letter-spacing:.06em;text-transform:uppercase;color:${dark ? '#E7C9CD' : 'var(--wine)'}">${cite}</div>` : ''}</div></div>`; }).join('') + `<div class="hair"></div>`;
}

const CARRY_ICON = ['water', 'food', 'pills', 'battery', 'lock', 'pen', 'cash', 'id', 'shoe', 'glasses', 'care'];
const AFTER_ICON = ['file', 'hospital', 'doc', 'scale', 'people', 'phone'];

function contactTile(id, lang, o = {}) {
  const c = C(id), st = DATA.status_labels[c.status];
  return `<div style="border-top:2px solid var(--carbon);padding:12px 0 6px">
    <div class="row" style="gap:10px;align-items:center">${I.icon(CONTACT_ICON[id] || 'phone', 30, c.status === 'official' ? P.carbon : P.wine, 2.4)}<div class="num" style="font-size:${c.display.length > 8 ? (o.long || 40) : (o.short || 52)}px;white-space:nowrap">${c.display}</div></div>
    <div class="strong" style="font-size:${o.name || 22}px;line-height:1.18;margin-top:8px">${t(c.name, lang)}</div>
    <div class="small" style="font-size:${o.help || 18}px;margin-top:2px;line-height:1.3">${t(c.help, lang)}</div>
    <div style="margin-top:5px;font-family:var(--mono);font-size:13px;${c.status === 'official' ? '' : 'color:var(--wine)'}">${st.mark} ${t(st, lang)}</div></div>`;
}

// ------------------------------------------------------------------ the twelve slides
function slide(id, lang) {
  const L = LANGS[lang], s = L.slides[id], hi = lang === 'hi', n = `${id.slice(1)} ${L.ui.of} 12`;
  switch (id) {
    case 's01': return page({ lang, inner: `
      ${top(s.kicker, s.date)}
      <div class="disp" style="margin-top:52px;font-size:${hi ? 96 : 124}px;line-height:${hi ? 1.15 : .92}">${s.headline}</div>
      <div class="disp" style="margin-top:20px;font-size:${hi ? 54 : 62}px;line-height:${hi ? 1.28 : 1.02}"><em>${s.headline2}</em></div>
      <div class="row" style="margin-top:26px;justify-content:space-between;align-items:flex-end">
        <div class="body" style="max-width:660px;font-size:${hi ? 27 : 26}px">${s.deck}</div>
        <div class="label" style="text-align:right;white-space:nowrap">${s.byline}</div>
      </div>
      <div class="allow" style="position:absolute;left:var(--M);right:var(--M);bottom:112px">${I.samratYantra(904, 500, 'day', { highlight: 1 })}</div>
      ${foot(lang, { left: t(DATA.meta.independence, lang) })}` });

    case 's02': return page({ lang, inner: `
      ${top(s.kicker, n)}
      <div class="disp h1" style="margin-top:32px;font-size:${hi ? 62 : 72}px">${s.headline}</div>
      <div style="margin-top:24px">${statusRows(lang, { det: hi ? 22 : 21, val: 29, pad: 13 })}</div>
      <div class="strong" style="margin-top:16px;font-size:${hi ? 24 : 23}px;line-height:1.36">${s.foot}</div>
      ${foot(lang, { left: (hi ? 'स्रोत' : 'Sources') + ': ThePrint, Indian Express, Bar & Bench, New Indian Express (9 Oct)' })}` });

    case 's03': return page({ lang, inner: `
      ${top(s.kicker, n)}
      <div style="display:grid;grid-template-columns:1fr 220px;gap:24px;align-items:end;margin-top:30px">
        <div class="disp" style="font-size:${hi ? 56 : 66}px">${s.headline}</div>
        <div>${I.noNameTag(lang, 220, 195)}</div>
      </div>
      <div class="small" style="margin-top:16px;font-size:${hi ? 23 : 22}px;color:var(--carbon)">${s.lede}</div>
      <div style="margin-top:14px">${s.items.map(([a, b, src]) => `<div style="display:grid;grid-template-columns:${hi ? 290 : 280}px 1fr;gap:22px;padding:${hi ? 11 : 12}px 0;border-top:1px solid var(--rule)">
        <div class="disp" style="font-size:${hi ? 25 : 27}px;line-height:1.12">${a}</div>
        <div><div style="font-size:${hi ? 21 : 21}px;line-height:1.36">${b}</div><div style="margin-top:3px;font-family:var(--mono);font-size:14px;letter-spacing:.04em;color:var(--wine)">${src}</div></div></div>`).join('')}<div class="hair"></div></div>
      ${foot(lang, { left: hi ? 'आरोप अदालत में साबित नहीं हुए हैं। दिल्ली पुलिस ने जाँच का वादा किया है।' : 'Allegations have not been tested in court. Delhi Police has promised an inquiry.' })}` });

    case 's04': return page({ lang, cls: 'dark', inner: `
      ${top(s.kicker, n)}
      <div style="display:grid;grid-template-columns:1fr 150px;gap:34px;align-items:start;margin-top:34px">
        <div class="disp" style="font-size:${hi ? 60 : 72}px">${s.headline}</div>
        <div style="padding-top:8px">${I.phoneNoData(lang, 150, 248, true)}</div>
      </div>
      <div class="disp" style="margin-top:22px;font-size:${hi ? 30 : 34}px;line-height:1.28;text-wrap:pretty"><em>${s.testimony}</em></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px">
        <div style="border:1.5px solid var(--paper);padding:16px 18px"><div class="label" style="color:var(--paper)">${s.confirmed_label}</div><div style="margin-top:6px;font-size:${hi ? 22 : 21}px;line-height:1.38">${s.confirmed}</div></div>
        <div style="border:1.5px dashed var(--grey);padding:16px 18px"><div class="label">${s.unverified_label}</div><div style="margin-top:6px;font-size:${hi ? 22 : 21}px;line-height:1.38;color:#CFCBC2">${s.unverified}</div></div>
      </div>
      <div style="margin-top:16px">${s.steps.map((x, i) => `<div style="display:grid;grid-template-columns:52px 1fr;padding:${hi ? 8 : 9}px 0;border-top:1px solid rgba(240,238,232,.18)"><span class="num" style="font-size:24px;color:#E7C9CD;padding-top:3px">${pad(i + 1)}</span><span style="font-size:25px;line-height:1.3">${x}</span></div>`).join('')}</div>
      ${foot(lang, { src: srcShort('L05, L06') })}` });

    case 's05': return page({ lang, inner: `
      ${top(s.kicker, n)}
      <div class="disp h1">${s.headline}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;column-gap:36px;margin-top:34px">
        ${s.items.map(([a, b], i) => `<div style="display:grid;grid-template-columns:58px 1fr;gap:14px;align-items:center;padding:${hi ? 11 : 12}px 0;border-top:1px solid var(--rule)">
          <div style="width:58px;height:58px;border-radius:50%;background:${[2, 4, 5].includes(i) ? P.wine : P.paper2};display:flex;align-items:center;justify-content:center">${I.icon(CARRY_ICON[i], 34, [2, 4, 5].includes(i) ? P.paper : P.carbon, 2.6)}</div>
          <div><div class="strong" style="font-size:${hi ? 26 : 25}px;line-height:1.15">${a}</div><div class="small" style="font-size:${hi ? 21 : 20}px;margin-top:2px">${b}</div></div></div>`).join('')}
      </div>
      <div class="note strong" style="margin-top:28px;font-size:26px;line-height:1.36;max-width:880px">${s.note}</div>
      ${foot(lang, { checked: false, right: n })}` });

    case 's06': return page({ lang, inner: `
      ${top(s.kicker, n)}
      <div class="disp h1" style="margin-top:32px;font-size:${hi ? 62 : 74}px">${s.headline}</div>
      <div style="margin-top:22px;display:grid;gap:12px">${s.body.map((p, i) => `<p class="body" style="font-size:${hi ? 25 : 25}px;${i === 1 ? 'font-weight:600' : ''}">${p}</p>`).join('')}</div>
      <div style="margin-top:20px;background:var(--paper2);padding:16px 22px">
        <div class="strong" style="font-size:${hi ? 24 : 23}px">${s.boundary_label}</div>
        <div class="body" style="margin-top:2px;font-size:${hi ? 22 : 21}px">${s.boundary}</div>
      </div>
      <div class="allow" style="position:absolute;left:var(--M);bottom:196px">${I.crowd(904, 180)}</div>
      <div class="disp" style="position:absolute;left:var(--M);right:var(--M);bottom:100px;font-size:${hi ? 26 : 30}px;line-height:1.15"><em>${s.close}</em></div>
      ${foot(lang, { checked: false, right: n })}` });

    case 's07': return page({ lang, inner: `
      ${top(s.kicker, n)}
      <div style="display:grid;grid-template-columns:1fr 100px;gap:20px;align-items:end;margin-top:30px">
        <div><div class="disp" style="font-size:${hi ? 56 : 68}px">${s.headline}</div>
        <div class="disp" style="margin-top:10px;font-size:${hi ? 32 : 38}px"><em>${s.sub}</em></div></div>
        ${I.icon('voice', 96, P.wine, 2.2)}
      </div>
      <div style="margin-top:22px">${stepRows(s.steps, lang, { pad: 15, t: hi ? 29 : 29, d: hi ? 24 : 23 })}</div>
      <div class="note strong" style="margin-top:18px;font-size:${hi ? 24 : 23}px;line-height:1.36">${s.after}</div>
      ${foot(lang, { left: s.disclaimer + ' ' + L.ui.sources + ': ' + srcShort('L24'), checked: false, right: n })}` });

    case 's08': return page({ lang, inner: `
      ${top(s.kicker, n)}
      <div style="display:grid;grid-template-columns:1fr 380px;gap:20px;align-items:end;margin-top:28px">
        <div class="disp" style="font-size:${hi ? 64 : 76}px">${s.headline}</div>${I.busNote(lang, 380, 219)}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;column-gap:30px;margin-top:20px">${s.steps.map(([a, b], i) => `<div style="padding:12px 0;border-top:1px solid var(--rule)">
        <div class="row" style="gap:10px;align-items:baseline"><span class="num" style="font-size:26px;color:var(--wine)">${i + 1}</span><span class="strong" style="font-size:${hi ? 26 : 26}px;line-height:1.16">${a}</span></div>
        <div style="margin-top:5px;font-size:${hi ? 22 : 22}px;line-height:1.34;color:var(--ink2)">${b}</div></div>`).join('')}</div>
      <div class="small" style="margin-top:14px;font-size:${hi ? 21 : 20}px;color:var(--carbon)">${s.expect}</div>
      <div style="margin-top:14px;background:var(--carbon);color:var(--paper);padding:16px 22px">
        <div class="label" style="color:#E7C9CD">${s.outside_label}</div>
        <div style="margin-top:4px;font-size:${hi ? 21 : 21}px;line-height:1.38">${s.outside}</div>
      </div>
      ${foot(lang, { left: L.ui.sources + ': ' + srcShort('L18, L25, L13') })}` });

    case 's09': return page({ lang, cls: 'dark', inner: `
      ${top(s.kicker, n)}
      <div class="disp h1" style="margin-top:32px;font-size:${hi ? 58 : 68}px">${s.headline}</div>
      <div style="display:grid;grid-template-columns:1fr 330px;gap:34px;margin-top:22px">
        <div>${s.cols.map(c => `<div class="label" style="margin-top:12px">${c.label}</div>${c.items.map(x => `<div style="display:grid;grid-template-columns:20px 1fr;font-size:23px;line-height:1.3;padding:4px 0"><span style="color:#E7C9CD">·</span><span>${x}</span></div>`).join('')}`).join('')}</div>
        <div style="padding-top:14px">
          ${I.recording(lang, 330, 211)}
          <div style="background:var(--paper);color:var(--carbon);padding:14px 18px 4px;margin-top:14px">
            <div style="font-family:var(--mono);font-size:14px;letter-spacing:.12em;text-transform:uppercase;border-bottom:1.5px solid var(--carbon);padding-bottom:8px">${hi ? 'घटना का रिकॉर्ड' : 'Incident log'}</div>
            ${s.form.map(f => `<div style="padding:8px 0 14px;border-bottom:1px solid var(--rule);font-family:var(--mono);font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:var(--ink2)">${f}</div>`).join('')}
          </div>
        </div>
      </div>
      <div class="note" style="margin-top:16px;font-size:${hi ? 23 : 22}px;line-height:1.36;font-weight:600">${s.impersonation}</div>
      <div class="disp" style="margin-top:16px;font-size:${hi ? 28 : 32}px;line-height:1.15"><em>${s.close}</em></div>
      ${foot(lang, { left: L.ui.sources + ': ' + srcShort('L18'), checked: false, right: n })}` });

    case 's10': return page({ lang, inner: `
      ${top(s.kicker, n)}
      <div class="disp h1" style="margin-top:32px;font-size:${hi ? 58 : 68}px">${s.headline}</div>
      <div style="margin-top:20px">${stepRows(s.steps, lang, { icons: AFTER_ICON, hl: 2, pad: 14, t: hi ? 27 : 27, d: hi ? 22 : 22 })}</div>
      <div class="note" style="margin-top:14px;font-size:${hi ? 21 : 20}px;line-height:1.36;font-weight:600">${s.note}</div>
      ${foot(lang, { left: s.disclaimer + '<br>' + L.ui.sources + ': ' + srcShort('L24, L22, L23') })}` });

    case 's11': return page({ lang, inner: `
      ${top(s.kicker, n)}
      <div class="disp h1" style="margin-top:32px;font-size:${hi ? 62 : 72}px">${s.headline}</div>
      ${s.groups.map(g => `<div class="label" style="margin-top:20px">${g.label}</div><div style="display:grid;grid-template-columns:1fr 1fr;column-gap:32px;margin-top:6px">${g.ids.map(id => contactTile(id, lang)).join('')}</div>`).join('')}
      <div class="disp" style="margin-top:20px;font-size:${hi ? 22 : 23}px;line-height:1.3;text-wrap:pretty"><em>${s.honest}</em></div>
      ${foot(lang, { left: L.ui.not_endorsed })}` });

    case 's12': return page({ lang, cls: 'wine', inner: `
      ${top('', n)}
      <div class="disp" style="margin-top:50px;font-size:${hi ? 80 : 104}px;line-height:${hi ? 1.18 : .94};max-width:900px">${s.headline}</div>
      <div style="margin-top:26px;font-size:${hi ? 25 : 26}px;line-height:${hi ? 1.55 : 1.44};max-width:880px;color:#F3E9E6">${s.body}</div>
      <div style="margin-top:22px">
        <div style="font-family:var(--hand);font-size:${hi ? 46 : 62}px;line-height:1;color:var(--paper)">${s.sign}</div>
        <div style="margin-top:6px;font-family:var(--mono);font-size:15px;letter-spacing:.1em;text-transform:uppercase;color:#E7C9CD">${s.credit}</div>
      </div>
      <div class="allow" style="position:absolute;left:var(--M);right:var(--M);bottom:112px">${I.samratYantra(904, 330, 'dusk', { people: [[90, 1, .7], [140, 1, .62], [210, 1, .66], [770, 1, .68], [820, -1, .64]], highlight: 2 })}</div>
      ${foot(lang, { left: t(DATA.meta.independence, lang) })}` });
  }
}

// ------------------------------------------------------------------ standalone cards
const CARD_ICON = { a: 'wifioff', b: 'phone', c: 'voice', d: 'bus', e: 'camera', f: 'file', g: 'metro' };
function card(key) {
  const lang = 'en', L = LANGS.en, c = L.cards[key], S = L.slides;
  const head = `<div class="bleed" style="margin:-80px calc(-1 * var(--M)) 0;padding:52px var(--M) 30px;background:${key === 'c' ? 'var(--wine)' : 'var(--carbon)'};color:var(--paper);position:relative">
      <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:18px;letter-spacing:.12em;text-transform:uppercase;color:#CFCBC2"><span>Jantar Mantar 2.0 · Sat 10 Oct 2026</span><span>Card ${key.toUpperCase()} / G</span></div>
      <div style="display:grid;grid-template-columns:1fr 110px;gap:20px;align-items:end;margin-top:22px">
        <div><div class="disp" style="font-size:${c.title.length > 26 ? 66 : 78}px;line-height:.98">${c.title}</div><div style="margin-top:10px;font-size:24px;color:#E6DED6">${c.sub}</div></div>
        ${I.icon(CARD_ICON[key], 100, '#E7C9CD', 2.2)}
      </div></div>`;
  let body = '', src = '', ts = false;
  if (key === 'a') { ts = true; src = srcShort('L05, L06');
    body = `<div style="display:grid;grid-template-columns:1fr 290px;gap:26px;margin-top:22px">
      <div>${S.s04.steps.map((x, i) => `<div style="display:grid;grid-template-columns:50px 1fr;padding:14px 0;border-top:1px solid var(--rule)"><span class="num" style="font-size:28px;color:var(--wine)">${pad(i + 1)}</span><span style="font-size:26px;line-height:1.26">${x}</span></div>`).join('')}<div class="hair"></div></div>
      <div style="padding-top:8px">${I.paperSlip('en', 290, 266)}</div></div>
      <div class="small" style="margin-top:16px;color:var(--carbon);font-size:21px"><b>${S.s04.confirmed_label}:</b> ${S.s04.confirmed} <b>${S.s04.unverified_label}:</b> ${S.s04.unverified}</div>`; }
  if (key === 'b') { ts = true; src = srcShort('L11, L21, L22, L08');
    body = `<div style="margin-top:16px">${c.ids.map(id => contactRow(id, lang, { num: 76, col: 300, name: 28, small: 22, pad: 14 })).join('')}<div class="hair"></div></div><div class="small" style="margin-top:12px;font-size:20px">${L.ui.not_endorsed}</div>`; }
  if (key === 'c') { src = srcShort('L24');
    body = `<div class="disp" style="margin-top:20px;font-size:34px"><em>${S.s07.sub}</em></div><div style="margin-top:12px">${stepRows(S.s07.steps, lang, { pad: 19, t: 30, d: 24, c: 16 })}</div><div class="note strong" style="margin-top:16px;font-size:23px">${S.s07.after.replace(', and turn to slide 10 for what to do next', '')}</div>`; }
  if (key === 'd') { src = srcShort('L18, L25');
    body = `<div style="margin-top:12px">${stepRows(S.s08.steps, lang, { pad: 13, t: 27, d: 22 })}</div><div style="margin-top:14px;background:var(--paper2);padding:14px 20px"><div class="label">${S.s08.outside_label}</div><div style="margin-top:4px;font-size:21px;line-height:1.36">${S.s08.outside}</div></div>`; }
  if (key === 'e') { src = srcShort('L18');
    body = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:20px">${[S.s09.cols[0], { label: S.s09.cols[1].label + ' · ' + S.s09.cols[2].label, items: [...S.s09.cols[1].items, ...S.s09.cols[2].items] }].map(col => `<div><div class="label">${col.label}</div>${col.items.map(x => `<div style="font-size:27px;line-height:1.3;padding:18px 0;border-top:1px solid var(--rule)">${x}</div>`).join('')}</div>`).join('')}</div>
      <div class="note strong" style="margin-top:18px;font-size:23px">${S.s09.impersonation}</div>`; }
  if (key === 'f') { src = srcShort('L24, L22, L23');
    body = `<div style="margin-top:12px">${stepRows(S.s10.steps, lang, { icons: AFTER_ICON, hl: 2, pad: 17, t: 28, d: 23, c: 16 })}</div><div class="small" style="margin-top:10px;font-size:20px">${S.s10.disclaimer}</div>`; }
  if (key === 'g') { ts = true; src = srcShort('L01, L02, L04, L05');
    body = `<div style="margin-top:6px">${statusRows(lang, { pad: 13, det: 21, val: 28 })}</div><div class="small strong" style="margin-top:12px;color:var(--carbon);font-size:22px">${L.ui.recheck} Delhi Metro helpline 155370.</div>`; }
  return page({ lang, inner: `${head}${body}${foot(lang, { src, checked: ts ? undefined : false, right: ts ? undefined : 'Stella John' })}` });
}

// ------------------------------------------------------------------ Instagram stories 1080×1920
// Safe zone: nothing vital above 250 px or below 1600 px.
function story(key) {
  const lang = 'en', L = LANGS.en, st = L.stories[key], S = L.slides;
  const extra = `.page{padding:250px 88px 0}.foot{bottom:290px}`;
  let body = '', cls = '';
  if (key === '1') body = `
    <div class="disp" style="font-size:118px;line-height:.93;margin-top:44px">${st.headline}</div>
    <div class="body" style="margin-top:30px;font-size:32px;line-height:1.42">${st.body}</div>
    <div class="allow" style="margin-top:30px">${I.samratYantra(904, 400, 'day', { highlight: 1 })}</div>
    <div class="row" style="gap:18px;align-items:center;margin-top:22px"><div style="width:60px;height:3px;background:var(--wine)"></div><div class="label" style="font-size:22px">${st.cta}</div></div>`;
  if (key === '2') { cls = 'dark'; body = `
    <div class="row" style="justify-content:space-between;align-items:flex-end;margin-top:44px"><div class="disp" style="font-size:130px;line-height:.92">${st.headline}</div>${I.phoneNoData('en', 150, 248, true)}</div>
    <div style="margin-top:40px">${st.items.map((x, i) => `<div style="display:grid;grid-template-columns:84px 1fr;padding:32px 0;border-top:1px solid rgba(240,238,232,.22)"><span class="num" style="font-size:42px;color:#E7C9CD">${pad(i + 1)}</span><span style="font-size:42px;line-height:1.22">${x}</span></div>`).join('')}</div>`; }
  if (key === '3') body = `
    <div class="disp" style="font-size:112px;line-height:.95;margin-top:44px">${st.headline}</div>
    <div style="margin-top:36px">${st.ids.map(id => contactRow(id, lang, { num: 104, col: 380, name: 34, small: 27, tag: 19, pad: 30, noNote: true })).join('')}<div class="hair"></div></div>
    <div class="small" style="margin-top:20px;font-size:26px">112: I found it unreliable at 1.0. Keep other routes ready.</div>`;
  if (key === '4') body = `
    <div class="disp" style="font-size:96px;line-height:.98;margin-top:40px">${st.headline}</div>
    <div class="disp" style="margin-top:14px;font-size:50px"><em>${S.s07.sub}</em></div>
    <div style="margin-top:26px">${stepRows(S.s07.steps, lang, { pad: 18, t: 34, d: 27, c: 17, numF: 38 })}</div>`;
  if (key === '5') body = `
    <div class="disp" style="font-size:104px;line-height:.96;margin-top:44px">${st.headline}</div>
    <div style="margin-top:26px">${statusRows(lang, { iconW: 70, val: 34, det: 24, pad: 16, tagF: 16 })}</div>
    <div class="strong" style="margin-top:16px;font-size:27px">${L.ui.recheck}</div>`;
  return page({ lang, W: 1080, H: 1920, cls, extraCss: extra, inner: `${top(st.kicker, key + ' / 5')}${body}${foot(lang, { left: 'Stella John · Independent citizen’s guide' + (key === '5' ? '<br>Sources: ' + srcShort('L01, L02, L04, L05') : '') })}` });
}

// ------------------------------------------------------------------ WhatsApp edition (JPEG, large type)
const WA_ICON = { '1': 'gate', '2': 'phone', '3': 'voice', '4': 'bus' };
function whatsapp(key) {
  const lang = 'en', L = LANGS.en, w = L.whatsapp[key], S = L.slides;
  const extra = `.page{padding:64px 72px 0;--M:72px}.foot{font-size:20px}.foot .r{font-size:17px}`;
  let body = '';
  if (key === '1') body = DATA.status.map(s => `<div style="display:grid;grid-template-columns:76px 1fr;gap:18px;align-items:center;padding:30px 0;border-top:2px solid var(--carbon)">${I.icon(STATUS_ICON[s.id], 70, s.id === 'metro' || s.id === 'internet' ? P.wine : P.carbon, 2.4)}<div><div style="font-family:var(--mono);font-size:19px;letter-spacing:.1em;text-transform:uppercase;color:var(--wine)">${s.label.en} · ${s.tag.en}</div><div class="strong" style="font-size:46px;line-height:1.1;margin-top:6px">${s.value.en}</div></div></div>`).join('') + `<div class="strong" style="font-size:28px;margin-top:16px;border-top:2px solid var(--carbon);padding-top:16px">No police permission. ${L.ui.recheck}</div>`;
  if (key === '2') body = w.ids.map(id => { const c = C(id); return `<div style="display:grid;grid-template-columns:430px 1fr;gap:18px;align-items:center;padding:22px 0;border-top:2px solid var(--carbon)"><div class="num" style="font-size:${c.display.length > 8 ? 66 : 92}px;white-space:nowrap">${c.display}</div><div><div class="strong" style="font-size:29px;line-height:1.12">${c.name.en}</div><div style="font-size:22px;color:${c.status === 'official' ? 'var(--ink2)' : 'var(--wine)'};margin-top:3px">${c.status === 'official' ? t(c.help, 'en') : 'Office line · 10 Oct not confirmed'}</div></div></div>`; }).join('') + `<div style="font-size:22px;margin-top:12px;color:var(--ink2);border-top:2px solid var(--carbon);padding-top:12px">No number is guaranteed to connect. None of these groups endorses this guide.</div>`;
  if (key === '3') body = stepRows(S.s07.steps, 'en', { pad: 22, t: 37, d: 27, numF: 38, c: 17, numW: 64 });
  if (key === '4') body = stepRows(S.s08.steps.map(([x, y]) => [x, y.replace(' SFLC.in has a guide on device seizure.', '')]), 'en', { pad: 15, t: 33, d: 24, numF: 36, numW: 60 }) + `<div class="strong" style="font-size:26px;margin-top:14px;color:var(--wine)">Outside? Call legal aid 15100 and their family. Go to the police station.</div>`;
  return page({ lang, extraCss: extra, inner: `
    <div class="row" style="justify-content:space-between;align-items:center"><div style="font-family:var(--mono);font-size:20px;letter-spacing:.1em;text-transform:uppercase;color:var(--wine)">Jantar Mantar 2.0 · Sat 10 Oct 2026</div>${I.icon(WA_ICON[key], 52, P.wine, 2.4)}</div>
    <div class="disp" style="font-size:${key === '1' ? 76 : 84}px;margin:14px 0 24px">${w.title}</div>${body}
    ${foot(lang, { left: 'Stella John · Independent citizen’s guide' })}` });
}

// ------------------------------------------------------------------ jobs
const jobs = [];
for (const lang of ['en', 'hi']) for (let i = 1; i <= 12; i++) {
  const id = 's' + pad(i);
  jobs.push({ key: `${lang}-${id}`, html: () => slide(id, lang), out: `exports/instagram-carousel-${lang}/${lang}-${pad(i)}.png`, W: 1080, H: 1350 });
}
const CARDS = { a: 'no-internet-start-here', b: 'save-these-numbers', c: 'if-someone-puts-their-hands-on-you', d: 'if-they-put-you-in-a-bus', e: 'record-preserve-hand-it-on', f: 'make-them-answer-for-it', g: 'check-before-you-travel' };
for (const k in CARDS) jobs.push({ key: `card-${k}`, html: () => card(k), out: `exports/standalone-cards/card-${k}-${CARDS[k]}.png`, W: 1080, H: 1350 });
for (const k of ['1', '2', '3', '4', '5']) jobs.push({ key: `story-${k}`, html: () => story(k), out: `exports/stories/story-${k}.png`, W: 1080, H: 1920 });
for (const k of ['1', '2', '3', '4']) jobs.push({ key: `wa-${k}`, html: () => whatsapp(k), out: `exports/whatsapp/whatsapp-${k}.jpg`, W: 1080, H: 1350, jpg: true });

(async () => {
  const sel = ONLY.length ? jobs.filter(j => ONLY.some(o => j.key.startsWith(o))) : jobs;
  fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
  for (const j of sel) fs.writeFileSync(path.join(ROOT, 'build', j.key + '.html'), j.html());
  if (NO_RENDER) return console.log('wrote', sel.length, 'html files');
  let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
  const browser = await pw.chromium.launch();
  const report = {};
  for (const j of sel) {
    const p = await browser.newPage({ viewport: { width: j.W, height: j.H }, deviceScaleFactor: 1 });
    await p.goto('file://' + path.join(ROOT, 'build', j.key + '.html'));
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(120);
    const issues = await p.evaluate(() => window.__check());
    if (issues.length) report[j.key] = issues;
    fs.mkdirSync(path.dirname(path.join(ROOT, j.out)), { recursive: true });
    await p.screenshot({ path: path.join(ROOT, j.out), type: j.jpg ? 'jpeg' : 'png', ...(j.jpg ? { quality: 84 } : {}) });
    await p.close();
  }
  await browser.close();
  console.log('rendered', sel.length);
  console.log(Object.keys(report).length ? JSON.stringify(report, null, 1) : 'no layout issues detected');
})();
