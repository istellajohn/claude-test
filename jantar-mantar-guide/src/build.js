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
const CONTACT_ICON = { '112': 'siren', '102': 'medic', dslsa: 'scale', hrln: 'shield', apcr: 'scale', sflc: 'wifioff', dmrc: 'metro', eci: 'vote' };
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

const CARRY_ICON = ['water', 'food', 'ors', 'pills', 'battery', 'shoe', 'weather', 'id', 'cash', 'note', 'care'];
const USEFUL_ICON = ['search', 'metro', 'note', 'phone', 'doc', 'scale', 'clock'];

// ------------------------------------------------------------------ the twelve slides
function slide(id, lang) {
  const L = LANGS[lang], s = L.slides[id], hi = lang === 'hi', n = `${id.slice(1)} ${L.ui.of} 12`;
  switch (id) {
    case 's01': return page({ lang, inner: `
      ${top(s.kicker, s.date)}
      <div class="disp" style="margin-top:56px;font-size:${hi ? 96 : 124}px;line-height:${hi ? 1.15 : .92}">${s.headline}</div>
      <div class="disp" style="margin-top:22px;font-size:${hi ? 54 : 62}px;line-height:${hi ? 1.28 : 1.02}"><em>${s.headline2}</em></div>
      <div class="row" style="margin-top:30px;justify-content:space-between;align-items:flex-end">
        <div class="body" style="max-width:600px;font-size:${hi ? 29 : 28}px">${s.deck}</div>
        <div class="label" style="text-align:right">${s.byline}</div>
      </div>
      <div class="allow" style="position:absolute;left:var(--M);right:var(--M);bottom:112px">${I.samratYantra(904, 560, 'day', { highlight: 1 })}</div>
      ${foot(lang, { left: t(DATA.meta.independence, lang) })}` });

    case 's02': return page({ lang, inner: `
      ${top(s.kicker, n)}
      <div class="disp h1" style="margin-top:32px;font-size:${hi ? 62 : 72}px">${s.headline}</div>
      <div style="margin-top:24px">${statusRows(lang, { det: hi ? 22 : 21, val: 29, pad: 13 })}</div>
      <div class="strong" style="margin-top:16px;font-size:${hi ? 24 : 23}px;line-height:1.36">${s.foot}</div>
      ${foot(lang, { left: (hi ? 'स्रोत' : 'Sources') + ': ThePrint, Indian Express, Bar & Bench, New Indian Express (9 Oct)' })}` });

    case 's03': return page({ lang, cls: 'dark', inner: `
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

    case 's04': return page({ lang, inner: `
      ${top(s.kicker, n)}
      <div class="disp h1">${s.headline}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;column-gap:36px;margin-top:34px">
        ${s.items.map(([a, b], i) => `<div style="display:grid;grid-template-columns:58px 1fr;gap:14px;align-items:center;padding:${hi ? 11 : 12}px 0;border-top:1px solid var(--rule)">
          <div style="width:58px;height:58px;border-radius:50%;background:${i === 3 || i === 10 ? P.wine : P.paper2};display:flex;align-items:center;justify-content:center">${I.icon(CARRY_ICON[i], 34, i === 3 || i === 10 ? P.paper : P.carbon, 2.6)}</div>
          <div><div class="strong" style="font-size:${hi ? 26 : 25}px;line-height:1.15">${a}</div><div class="small" style="font-size:${hi ? 21 : 20}px;margin-top:2px">${b}</div></div></div>`).join('')}
      </div>
      <div class="note strong" style="margin-top:28px;font-size:26px;line-height:1.36;max-width:880px">${s.note}</div>
      ${foot(lang, { checked: false, right: n })}` });

    case 's05': return page({ lang, inner: `
      ${top(s.kicker, n)}
      <div class="disp h1" style="font-size:${hi ? 66 : 78}px">${s.headline}</div>
      <div style="margin-top:26px;display:grid;gap:14px">${s.body.map(p => `<p class="body" style="font-size:${hi ? 27 : 26}px">${p}</p>`).join('')}</div>
      <div style="margin-top:24px;background:var(--paper2);padding:20px 24px">
        <div class="strong" style="font-size:${hi ? 26 : 25}px">${s.boundary_label}</div>
        <div class="body" style="margin-top:4px;font-size:${hi ? 23 : 22}px">${s.boundary}</div>
      </div>
      <div class="allow" style="position:absolute;left:var(--M);bottom:204px">${I.crowd(904, 200)}</div>
      <div class="disp" style="position:absolute;left:var(--M);right:var(--M);bottom:104px;font-size:${hi ? 30 : 36}px;line-height:1.15"><em>${s.close}</em></div>
      ${foot(lang, { checked: false, right: n })}` });

    case 's06': return page({ lang, inner: `
      ${top(s.kicker, n)}
      <div class="disp h1" style="margin-top:32px;font-size:${hi ? 60 : 70}px">${s.headline}</div>
      <div style="margin-top:6px">${s.groups.map(g => `<div class="label" style="margin-top:20px;margin-bottom:4px">${g.label}</div>${g.ids.map(id => contactRow(id, lang, { num: 70, pad: 15 })).join('')}`).join('')}<div class="hair"></div></div>
      <div class="note small strong" style="margin-top:20px;color:var(--carbon)">${s.medical}</div>
      ${foot(lang, { left: L.ui.not_endorsed })}` });

    case 's07': return page({ lang, inner: `
      ${top(s.kicker, n)}
      <div style="display:grid;grid-template-columns:1fr 96px;gap:20px;align-items:end;margin-top:34px">
        <div class="disp" style="font-size:${hi ? 60 : 72}px">${s.headline}</div>${I.icon('scale', 92, P.wine, 2.2)}
      </div>
      <div style="margin-top:22px">${s.rows.map(([a, b]) => { const m = b.match(/^(.*?)(\s(?:BNSS|Constitution|संविधान).*)$/); const txt = m ? m[1] : b, cite = m ? m[2].trim() : '';
        return `<div style="display:grid;grid-template-columns:240px 1fr;gap:24px;padding:${hi ? 11 : 12}px 0;border-top:1px solid var(--rule)">
          <div class="disp" style="font-size:${hi ? 28 : 30}px;line-height:1.1;text-wrap:balance">${a}</div>
          <div><div style="font-size:24px;line-height:1.34">${txt}</div>${cite ? `<div style="margin-top:3px;font-family:var(--mono);font-size:15px;letter-spacing:.06em;color:var(--wine);text-transform:uppercase">${cite}</div>` : ''}</div></div>`; }).join('')}<div class="hair"></div></div>
      <div style="margin-top:18px;display:grid;grid-template-columns:1fr auto;gap:28px;align-items:center;background:var(--carbon);color:var(--paper);padding:18px 24px">
        <div style="font-size:${hi ? 23 : 22}px;line-height:1.36">${s.conduct}</div>
        <div style="text-align:right"><div class="label" style="color:#E7C9CD;font-size:14px">${s.help.split(':')[0]}</div><div class="num" style="font-size:58px">${s.help.split(':')[1].trim()}</div></div>
      </div>
      ${foot(lang, { left: s.disclaimer + '<br>' + L.ui.sources + ': ' + srcShort('L16, L08') })}` });

    case 's08': return page({ lang, inner: `
      ${top(s.kicker, n)}
      <div style="display:grid;grid-template-columns:1fr 110px;gap:20px;align-items:end;margin-top:34px">
        <div class="disp" style="font-size:${hi ? 66 : 78}px">${s.headline}</div>${I.icon('hand', 104, P.wine, 2.2)}
      </div>
      <div style="margin-top:26px">${s.ids.map(id => contactRow(id, lang, { num: 46, col: 300, name: 26, small: 22, pad: 16 })).join('')}</div>
      <div style="border-top:1.5px solid var(--carbon);margin-top:4px;padding-top:18px">
        <div class="disp" style="font-size:${hi ? 26 : 28}px;line-height:1.28;text-wrap:pretty"><em>${s.honest}</em></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px">
          ${[1, 2].map(() => `<div style="border:1.5px dashed var(--grey);padding:14px 16px"><div class="label" style="font-size:15px">${s.template_label}</div><div class="small" style="margin-top:4px;font-size:21px">${s.template_empty}</div></div>`).join('')}
        </div>
        <div class="small" style="margin-top:12px;color:var(--carbon);font-size:22px">${s.template_note}</div>
      </div>
      ${foot(lang)}` });

    case 's09': return page({ lang, cls: 'dark', inner: `
      ${top(s.kicker, n)}
      <div class="disp h1" style="margin-top:32px;font-size:${hi ? 58 : 68}px">${s.headline}</div>
      <div style="display:grid;grid-template-columns:1fr 330px;gap:34px;margin-top:22px">
        <div>${s.cols.map(c => `<div class="label" style="margin-top:12px">${c.label}</div>${c.items.map(x => `<div style="display:grid;grid-template-columns:20px 1fr;font-size:23px;line-height:1.3;padding:4px 0"><span style="color:#E7C9CD">·</span><span>${x}</span></div>`).join('')}`).join('')}</div>
        <div style="padding-top:14px">
          ${I.recording(lang, 330, 211)}
          <div style="background:var(--paper);color:var(--carbon);padding:16px 18px 6px;margin-top:16px">
            <div style="font-family:var(--mono);font-size:14px;letter-spacing:.12em;text-transform:uppercase;border-bottom:1.5px solid var(--carbon);padding-bottom:8px">${hi ? 'घटना का रिकॉर्ड' : 'Incident log'}</div>
            ${s.form.map(f => `<div style="padding:9px 0 16px;border-bottom:1px solid var(--rule);font-family:var(--mono);font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink2)">${f}</div>`).join('')}
          </div>
        </div>
      </div>
      <div class="note small" style="margin-top:16px;color:var(--paper);font-size:${hi ? 22 : 21}px">${s.impersonation}</div>
      <div class="disp" style="margin-top:14px;font-size:${hi ? 28 : 32}px;line-height:1.15"><em>${s.close}</em></div>
      ${foot(lang, { checked: false, right: n })}` });

    case 's10': return page({ lang, inner: `
      ${top(s.kicker, n)}
      <div class="disp h1">${s.headline}</div>
      <div style="display:grid;grid-template-columns:1fr 300px;gap:24px;margin-top:30px">
        <div style="position:relative">
          <div style="position:absolute;left:23px;top:24px;bottom:40px;width:2px;background:var(--grey)"></div>
          ${s.steps.map(([a, b], i) => `<div style="position:relative;display:grid;grid-template-columns:66px 1fr;padding:0 0 ${hi ? 16 : 18}px">
            <div class="num" style="width:48px;height:48px;border-radius:50%;background:${i > 2 ? 'var(--wine)' : 'var(--carbon)'};color:var(--paper);display:flex;align-items:center;justify-content:center;font-size:24px">${i + 1}</div>
            <div><div class="strong" style="font-size:28px;line-height:1.15;padding-top:6px">${a}</div><div class="small" style="margin-top:4px;font-size:${hi ? 23 : 22}px">${b}</div></div></div>`).join('')}
        </div>
        <div style="padding-top:30px">${I.unreachable(lang, 300, 345)}</div>
      </div>
      <div style="margin-top:8px;border:1.5px solid var(--wine);padding:16px 20px"><div class="small" style="color:var(--carbon);font-size:${hi ? 23 : 22}px"><b style="color:var(--wine)">${hi ? 'न करें:' : 'Don’t:'}</b> ${s.dont.replace(/^Don’t /, '')}</div></div>
      <div class="small" style="margin-top:12px;font-size:21px">${s.note112}</div>
      ${foot(lang)}` });

    case 's11': return page({ lang, inner: `
      ${top(s.kicker, n)}
      <div class="disp h1">${s.headline}</div>
      <div style="margin-top:30px">${s.items.map((x, i) => `<div style="display:grid;grid-template-columns:64px 1fr;gap:6px;align-items:center;padding:${hi ? 11 : 12}px 0;border-top:1px solid var(--rule)">${I.icon(USEFUL_ICON[i], 40, i === 2 ? P.wine : P.carbon, 2.4)}<span style="font-size:28px;line-height:1.28">${x}</span></div>`).join('')}<div class="hair"></div></div>
      <div style="margin-top:26px;background:var(--carbon);color:var(--paper);padding:22px 26px;display:grid;grid-template-columns:64px 1fr;gap:12px;align-items:center">
        ${I.icon('vote', 52, '#E7C9CD', 2.4)}
        <div><div class="label" style="color:#E7C9CD">${s.civic_label}</div><div style="margin-top:6px;font-size:23px;line-height:1.38">${s.civic}</div></div>
      </div>
      ${foot(lang, { src: srcShort('L15') })}` });

    case 's12': return page({ lang, cls: 'wine', inner: `
      ${top('', n)}
      <div class="disp" style="margin-top:60px;font-size:${hi ? 84 : 110}px;line-height:${hi ? 1.18 : .94};max-width:900px">${s.headline}</div>
      <div style="margin-top:30px;font-size:27px;line-height:${hi ? 1.55 : 1.45};max-width:860px;color:#F3E9E6">${s.body}</div>
      <div class="allow" style="position:absolute;left:var(--M);right:var(--M);bottom:118px">${I.samratYantra(904, 360, 'dusk', { people: [[90, 1, .7], [140, 1, .62], [210, 1, .66], [770, 1, .68], [820, -1, .64]], highlight: 2 })}</div>
      <div style="margin-top:28px">
        <div style="font-family:var(--hand);font-size:${hi ? 48 : 66}px;line-height:1;color:var(--paper)">${s.sign}</div>
        <div style="margin-top:8px;font-family:var(--mono);font-size:15px;letter-spacing:.1em;text-transform:uppercase;color:#E7C9CD">${s.credit}</div>
      </div>
      ${foot(lang, { left: t(DATA.meta.independence, lang) })}` });
  }
}

// ------------------------------------------------------------------ standalone cards
const CARD_ICON = { a: 'wifioff', b: 'phone', c: 'hand', d: 'scale', e: 'camera', f: 'metro' };
function card(key) {
  const lang = 'en', L = LANGS.en, c = L.cards[key], S = L.slides;
  const head = `<div class="bleed" style="margin:-80px calc(-1 * var(--M)) 0;padding:56px var(--M) 32px;background:var(--carbon);color:var(--paper);position:relative">
      <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:18px;letter-spacing:.12em;text-transform:uppercase;color:var(--grey)"><span>Jantar Mantar 2.0 · Sat 10 Oct 2026</span><span>Card ${key.toUpperCase()} / F</span></div>
      <div style="display:grid;grid-template-columns:1fr 110px;gap:20px;align-items:end;margin-top:24px">
        <div><div class="disp" style="font-size:80px;line-height:.98">${c.title}</div><div style="margin-top:12px;font-size:25px;color:#DCD8CE">${c.sub}</div></div>
        ${I.icon(CARD_ICON[key], 104, '#E7C9CD', 2.2)}
      </div></div>`;
  let body = '', src = '';
  if (key === 'a') {
    body = `<div style="display:grid;grid-template-columns:1fr 300px;gap:30px;margin-top:28px">
      <div>${S.s03.steps.map((x, i) => `<div style="display:grid;grid-template-columns:54px 1fr;padding:17px 0;border-top:1px solid var(--rule)"><span class="num" style="font-size:30px;color:var(--wine)">${pad(i + 1)}</span><span style="font-size:29px;line-height:1.26">${x}</span></div>`).join('')}<div class="hair"></div></div>
      <div style="padding-top:8px">${I.paperSlip('en', 300, 275)}</div></div>
      <div class="small" style="margin-top:20px;color:var(--carbon);font-size:22px"><b>${S.s03.confirmed_label}:</b> ${S.s03.confirmed} <b>${S.s03.unverified_label}:</b> ${S.s03.unverified}</div>`;
    src = srcShort('L05, L06');
  }
  if (key === 'b') { body = `<div style="margin-top:20px">${c.ids.map(id => contactRow(id, lang, { num: 84, col: 330, name: 30, small: 23, pad: 16 })).join('')}<div class="hair"></div></div><div class="note small strong" style="margin-top:18px;color:var(--carbon)">${S.s06.medical}</div><div class="small" style="margin-top:10px;font-size:21px">${L.ui.not_endorsed}</div>`; src = srcShort('L11, L08, L14'); }
  if (key === 'c') { body = `<div style="margin-top:20px">${c.ids.map(id => contactRow(id, lang, { num: 46, col: 300, name: 26, small: 22, pad: 16 })).join('')}<div class="hair"></div></div><div class="disp" style="margin-top:16px;font-size:26px;line-height:1.28"><em>${S.s08.honest}</em></div><div class="small" style="margin-top:10px;font-size:21px">${L.ui.not_endorsed}</div>`; src = srcShort('L09, L10, L13, L08'); }
  if (key === 'd') {
    body = `<div style="margin-top:22px">${S.s07.rows.map(([a, b]) => `<div style="display:grid;grid-template-columns:230px 1fr;gap:22px;padding:13px 0;border-top:1px solid var(--rule)"><div class="disp" style="font-size:28px;line-height:1.1">${a}</div><div style="font-size:24px;line-height:1.34">${b}</div></div>`).join('')}<div class="hair"></div></div>
      <div style="margin-top:18px;display:flex;justify-content:space-between;align-items:center;background:var(--paper2);padding:16px 22px"><div style="font-size:23px;max-width:560px">${S.s07.conduct}</div><div class="num" style="font-size:60px">15100</div></div>`;
    src = srcShort('L16, L08');
  }
  if (key === 'e') {
    body = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:34px;margin-top:22px">${[S.s09.cols[0], { label: S.s09.cols[1].label + ' · ' + S.s09.cols[2].label, items: [...S.s09.cols[1].items, ...S.s09.cols[2].items] }].map(col => `<div><div class="label">${col.label}</div>${col.items.map(x => `<div style="font-size:26px;line-height:1.3;padding:15px 0;border-top:1px solid var(--rule)">${x}</div>`).join('')}</div>`).join('')}</div>
      <div class="note small" style="margin-top:18px;color:var(--carbon);font-size:22px">${S.s09.impersonation}</div>
      <div class="disp" style="margin-top:14px;font-size:32px"><em>${S.s09.close}</em></div>`;
  }
  if (key === 'f') { body = `<div style="margin-top:8px">${statusRows(lang, { pad: 13, det: 21, val: 28 })}</div><div class="small strong" style="margin-top:12px;color:var(--carbon);font-size:22px">${L.ui.recheck} Delhi Metro helpline 155370.</div>`; src = srcShort('L01, L02, L04, L05'); }
  const timeSensitive = ['a', 'b', 'c', 'f'].includes(key);
  return page({ lang, inner: `${head}${body}${foot(lang, { src, checked: timeSensitive ? undefined : false, right: timeSensitive ? undefined : 'Stella John' })}` });
}

// ------------------------------------------------------------------ Instagram stories 1080×1920
// Safe zone: nothing vital above 250 px or below 1600 px.
function story(key) {
  const lang = 'en', L = LANGS.en, st = L.stories[key];
  const extra = `.page{padding:250px 88px 0}.foot{bottom:290px}`;
  let body = '', cls = '';
  if (key === '1') body = `
    <div class="disp" style="font-size:118px;line-height:.93;margin-top:44px">${st.headline}</div>
    <div class="body" style="margin-top:34px;font-size:33px;line-height:1.42">${st.body}</div>
    <div class="allow" style="margin-top:34px">${I.samratYantra(904, 420, 'day', { highlight: 1 })}</div>
    <div class="row" style="gap:18px;align-items:center;margin-top:24px"><div style="width:60px;height:3px;background:var(--wine)"></div><div class="label" style="font-size:22px">${st.cta}</div></div>`;
  if (key === '2') { cls = 'dark'; body = `
    <div class="row" style="justify-content:space-between;align-items:flex-end;margin-top:44px"><div class="disp" style="font-size:130px;line-height:.92">${st.headline}</div>${I.phoneNoData('en', 150, 248, true)}</div>
    <div style="margin-top:44px">${st.items.map((x, i) => `<div style="display:grid;grid-template-columns:84px 1fr;padding:34px 0;border-top:1px solid rgba(240,238,232,.22)"><span class="num" style="font-size:42px;color:#E7C9CD">${pad(i + 1)}</span><span style="font-size:44px;line-height:1.22">${x}</span></div>`).join('')}</div>`; }
  if (key === '3') body = `
    <div class="disp" style="font-size:112px;line-height:.95;margin-top:44px">${st.headline}</div>
    <div style="margin-top:36px">${st.ids.map(id => contactRow(id, lang, { num: 104, col: 380, name: 34, small: 27, tag: 19, pad: 32, noNote: true })).join('')}<div class="hair"></div></div>
    <div class="small" style="margin-top:20px;font-size:26px">112: I found it unreliable at 1.0. Keep other routes ready.</div>`;
  if (key === '4') body = `
    <div class="disp" style="font-size:104px;line-height:.96;margin-top:44px">${st.headline}</div>
    <div class="body" style="margin-top:30px;font-size:31px">${st.body}</div>
    <div class="allow" style="margin-top:30px">${I.crowd(904, 200)}</div>
    <div style="margin-top:14px">${st.ids.map(id => contactRow(id, lang, { num: 44, col: 300, name: 27, small: 22, pad: 15 })).join('')}</div>`;
  if (key === '5') body = `
    <div class="disp" style="font-size:104px;line-height:.96;margin-top:44px">${st.headline}</div>
    <div style="margin-top:26px">${statusRows(lang, { iconW: 70, val: 34, det: 24, pad: 16, tagF: 16 })}</div>
    <div class="strong" style="margin-top:16px;font-size:27px">${L.ui.recheck}</div>`;
  return page({ lang, W: 1080, H: 1920, cls, extraCss: extra, inner: `${top(st.kicker, key + ' / 5')}${body}${foot(lang, { left: 'Stella John · Independent citizen’s guide' + (key === '5' ? '<br>Sources: ' + srcShort('L01, L02, L04, L05') : '') })}` });
}

// ------------------------------------------------------------------ WhatsApp edition (JPEG, large type)
const WA_ICON = { '1': 'gate', '2': 'phone', '3': 'wifioff', '4': 'pin' };
function whatsapp(key) {
  const lang = 'en', L = LANGS.en, w = L.whatsapp[key], S = L.slides;
  const extra = `.page{padding:64px 72px 0;--M:72px}.foot{font-size:20px}.foot .r{font-size:17px}`;
  let body = '';
  if (key === '1') body = DATA.status.map(s => `<div style="display:grid;grid-template-columns:76px 1fr;gap:18px;align-items:center;padding:30px 0;border-top:2px solid var(--carbon)">${I.icon(STATUS_ICON[s.id], 70, s.id === 'metro' || s.id === 'internet' ? P.wine : P.carbon, 2.4)}<div><div style="font-family:var(--mono);font-size:19px;letter-spacing:.1em;text-transform:uppercase;color:var(--wine)">${s.label.en} · ${s.tag.en}</div><div class="strong" style="font-size:46px;line-height:1.1;margin-top:6px">${s.value.en}</div></div></div>`).join('') + `<div class="strong" style="font-size:28px;margin-top:16px;border-top:2px solid var(--carbon);padding-top:16px">No police permission. ${L.ui.recheck}</div>`;
  if (key === '2') body = w.ids.map(id => { const c = C(id); return `<div style="display:grid;grid-template-columns:450px 1fr;gap:18px;align-items:center;padding:24px 0;border-top:2px solid var(--carbon)"><div class="num" style="font-size:${c.display.length > 8 ? 66 : 92}px;white-space:nowrap">${c.display}</div><div><div class="strong" style="font-size:29px;line-height:1.12">${c.name.en}</div><div style="font-size:22px;color:${c.status === 'official' ? 'var(--ink2)' : 'var(--wine)'};margin-top:3px">${c.status === 'official' ? 'Official service' : 'Office line · 10 Oct not confirmed'}</div></div></div>`; }).join('') + `<div style="font-size:22px;margin-top:12px;color:var(--ink2);border-top:2px solid var(--carbon);padding-top:12px">No number is guaranteed to connect. None of these groups endorses this guide.</div>`;
  if (key === '3') body = `<div style="display:grid;grid-template-columns:1fr 250px;gap:24px"><div>${S.s03.steps.map((x, i) => `<div style="display:grid;grid-template-columns:66px 1fr;padding:24px 0;border-top:2px solid var(--carbon)"><span class="num" style="font-size:40px;color:var(--wine)">${pad(i + 1)}</span><span class="strong" style="font-size:36px;line-height:1.2">${x}</span></div>`).join('')}</div><div style="padding-top:30px">${I.paperSlip('en', 250, 230)}</div></div>`;
  if (key === '4') body = `<div style="display:grid;grid-template-columns:1fr 260px;gap:24px"><div>${S.s10.steps.map(([a, b], i) => `<div style="padding:24px 0;border-top:2px solid var(--carbon)"><div class="strong" style="font-size:37px;line-height:1.15"><span class="num" style="color:var(--wine)">${i + 1}.</span> ${a}</div><div style="font-size:27px;line-height:1.3;color:var(--ink2);margin-top:6px">${b}</div></div>`).join('')}</div><div style="padding-top:30px">${I.unreachable('en', 260, 300)}</div></div><div class="strong" style="font-size:26px;margin-top:12px;color:var(--wine)">Don’t post unverified ‘missing’ claims.</div>`;
  return page({ lang, extraCss: extra, inner: `
    <div class="row" style="justify-content:space-between;align-items:center"><div style="font-family:var(--mono);font-size:20px;letter-spacing:.1em;text-transform:uppercase;color:var(--wine)">Jantar Mantar 2.0 · Sat 10 Oct 2026</div>${I.icon(WA_ICON[key], 52, P.wine, 2.4)}</div>
    <div class="disp" style="font-size:${key === '1' ? 76 : 88}px;margin:14px 0 26px">${w.title}</div>${body}
    ${foot(lang, { left: 'Stella John · Independent citizen’s guide' })}` });
}

// ------------------------------------------------------------------ jobs
const jobs = [];
for (const lang of ['en', 'hi']) for (let i = 1; i <= 12; i++) {
  const id = 's' + pad(i);
  jobs.push({ key: `${lang}-${id}`, html: () => slide(id, lang), out: `exports/instagram-carousel-${lang}/${lang}-${pad(i)}.png`, W: 1080, H: 1350 });
}
const CARDS = { a: 'no-internet-start-here', b: 'save-these-contacts', c: 'independent-help-directory', d: 'if-you-need-legal-help', e: 'record-preserve-report', f: 'check-before-you-travel' };
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
