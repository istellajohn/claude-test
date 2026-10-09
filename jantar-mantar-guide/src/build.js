// Jantar Mantar 2.0 · Independent citizen's guide · build script
// Usage: node src/build.js [--only=en-05,card-c,story,...] [--no-render]
// Reads /content (copy + shared data), writes HTML to /build and images to /exports.
//
// Layout rules (see documentation/design-system.md):
//  · Headlines carry their own line breaks ("|" in the copy). Each line is set nowrap and the
//    headline shrinks until every line fits, so the browser never chooses a break.
//  · Body content sits in .main, sized in em. It shrinks only until it clears the footer
//    by a fixed breathing space, and never below a readable minimum.
//  · Vertical rhythm uses one spacing scale: --s1 12, --s2 20, --s3 32, --s4 44.

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
const srcShort = ids => (ids || '').split(',').map(s => SRC[s.trim()]?.short).filter(Boolean).join(' · ');
const pad = n => String(n).padStart(2, '0');
const P = I.P;

const CONTACT_ICON = { '112': 'siren', '102': 'medic', hrln: 'shield', apcr: 'scale', sflc: 'wifioff', jagori: 'care', pucl: 'scale' };
const STATUS_ICON = { permission: 'gate', metro: 'metro', trains: 'train', internet: 'wifioff', roads: 'barrier' };

// ------------------------------------------------------------------ type system + base CSS
function css(lang, W, H) {
  const hi = lang === 'hi';
  return `
@import url('../assets/fonts/fonts.css');
:root{
  --paper:#F0EEE8; --paper2:#E6E3DA; --carbon:#1B1C1A; --wine:#712E36; --blush:#E7C9CD; --grey:#B9B6AE; --ink2:#4A4B45;
  --rule:rgba(27,28,26,.2); --M:88px; --s1:12px; --s2:20px; --s3:32px; --s4:44px;
  --display:${hi ? "'Rozha One', serif" : "'Fraunces', serif"};
  --sans:${hi ? "'Anek Devanagari', 'Bricolage Grotesque', sans-serif" : "'Bricolage Grotesque', sans-serif"};
  --num:'Bricolage Grotesque', sans-serif;
  --mono:'IBM Plex Mono', ${hi ? "'Anek Devanagari'," : ''} monospace;
  --hand:${hi ? "'Kalam'" : "'Caveat'"}, cursive;
}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{background:var(--paper);color:var(--carbon);font-family:var(--sans);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;font-kerning:normal}
.page{position:relative;width:${W}px;height:${H}px;padding:80px var(--M) 0;text-wrap:pretty}
.page.dark{background:var(--carbon);color:var(--paper)} .page.wine{background:var(--wine);color:var(--paper)}
.grain{position:absolute;inset:0;pointer-events:none;opacity:.4;mix-blend-mode:multiply;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .4 0 0 0 0 .37 0 0 0 0 .3 0 0 0 .2 0'/></filter><rect width='240' height='240' filter='url(%23n)'/></svg>")}
.dark .grain,.wine .grain{mix-blend-mode:screen;opacity:.12}

.top{display:flex;justify-content:space-between;align-items:baseline;font-family:var(--mono);font-size:19px;letter-spacing:.12em;text-transform:uppercase;padding-bottom:16px;border-bottom:1.5px solid currentColor}
.top .k{color:var(--wine);font-weight:500} .dark .top .k,.wine .top .k{color:var(--blush)}
.top .n{opacity:.7}
${hi ? ".top .k{font-family:var(--sans);font-weight:700;letter-spacing:.01em;font-size:22px}" : ''}

/* headlines: hand-set lines, auto-fitted */
.disp{font-family:var(--display);font-weight:${hi ? 400 : 640};font-variation-settings:${hi ? 'normal' : "'SOFT' 100, 'opsz' 144"};letter-spacing:${hi ? 0 : '-.02em'};line-height:${hi ? 1.32 : 1.08}}
.disp .ln{display:block;white-space:nowrap}
.disp.em{font-style:${hi ? 'normal' : 'italic'};font-weight:${hi ? 400 : 500};color:var(--wine);line-height:${hi ? 1.36 : 1.18}}
.sn{display:inline-block;max-width:100%;vertical-align:top} .sn:not(:has(.cl)){text-wrap:balance} .cl{display:inline-block;max-width:100%;text-wrap:balance;vertical-align:top} .bal{display:block;text-wrap:balance} .nw{white-space:nowrap}
.dark .disp.em,.wine .disp.em{color:var(--blush)}
.head{margin-top:var(--s4)}
.headrow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:var(--s3);align-items:center;margin-top:var(--s4)}
.headrow .head{margin-top:0;min-width:0}
.fit{width:100%;min-width:0}

/* body block, sized in em so it can be fitted as one unit */
.main{margin-top:var(--s3)}
.small{color:var(--ink2)} .dark .small,.wine .small{color:#CFCBC2}
.label{font-family:var(--mono);font-size:.78em;letter-spacing:.12em;text-transform:uppercase;color:var(--wine);font-weight:500;margin-bottom:var(--s1)}
${hi ? ".label{font-family:var(--sans);font-size:.92em;letter-spacing:.01em;font-weight:700}" : ''}
.dark .label,.wine .label{color:var(--blush)}
.num{font-family:var(--num);font-weight:800;font-stretch:75%;letter-spacing:-.01em;font-variant-numeric:tabular-nums;line-height:1}
.strong{font-weight:700}
.lede{font-size:1.06em;line-height:1.42;text-wrap:balance}
.small,.callout,.label{text-wrap:balance}
.note{border-left:5px solid var(--wine);padding:.15em 0 .15em .9em;font-weight:600;line-height:1.38;text-wrap:balance} .dark .note{border-color:var(--blush)}
.callout{background:var(--carbon);color:var(--paper);padding:.8em 1em;line-height:1.4}
.dark .callout{background:var(--paper);color:var(--carbon)}
.callout .label{color:var(--blush)} .dark .callout .label{color:var(--wine)}
.hair{border-top:1px solid var(--rule)} .dark .hair{border-color:rgba(240,238,232,.22)}
.row{display:flex;gap:20px;align-items:flex-start}
.gap1{margin-top:var(--s1)} .gap2{margin-top:calc(var(--s2) + var(--g,0px) / 2)} .gap3{margin-top:calc(var(--s3) + var(--g,0px))}

/* step rows */
.steps{display:grid;column-gap:1.6em}
.steps.c2{grid-template-columns:1fr 1fr}
.st{display:grid;grid-template-columns:2.3em 1fr;padding:calc(.66em + var(--x,0px)) 0;border-top:1px solid var(--rule)}
.dark .st{border-color:rgba(240,238,232,.2)}
.st .n{font-family:var(--num);font-weight:800;font-stretch:75%;font-size:1.25em;color:var(--wine);line-height:1.1}
.dark .st .n{color:var(--blush)}
.st .tt{font-weight:700;font-size:1.16em;line-height:1.2}
.st .bd{margin-top:.25em;line-height:1.4;color:var(--ink2);text-wrap:balance} .dark .st .bd{color:#CFCBC2}
.st .ct{margin-top:.3em;font-family:var(--mono);font-size:.66em;letter-spacing:.06em;text-transform:uppercase;color:var(--wine)}
.dark .st .ct{color:var(--blush)}

.foot{position:absolute;left:var(--M);right:var(--M);bottom:42px;display:flex;justify-content:space-between;align-items:flex-end;gap:24px;font-size:${hi ? 19 : 18}px;line-height:1.35;padding-top:14px;border-top:1px solid var(--rule);color:var(--ink2)}
.dark .foot,.wine .foot{color:#CFCBC2;border-color:rgba(240,238,232,.25)}
.foot .r{font-family:var(--mono);font-size:16px;text-align:right;white-space:nowrap}
`;
}

// Fitting + layout check run in the page before capture.
const FIT_SCRIPT = `
window.__fit=function(){
  document.querySelectorAll('.fit').forEach(el=>{
    let f=+el.dataset.max, min=+el.dataset.min||28; el.style.fontSize=f+'px';
    const over=()=>[...el.querySelectorAll('.ln')].some(l=>l.scrollWidth>el.clientWidth+1);
    while(f>min && over()){ f-=1; el.style.fontSize=f+'px'; }
  });
  const foot=document.querySelector('.foot'), main=document.querySelector('.main');
  if(main && foot){
    let f=+main.dataset.max||22, min=+main.dataset.min||19, breathe=+main.dataset.breathe||40;
    main.style.fontSize=f+'px';
    const limit=()=>foot.getBoundingClientRect().top-breathe;
    while(f>min && main.getBoundingClientRect().bottom>limit()){ f-=.25; main.style.fontSize=f+'px'; }
    // If everything fits at full size, let the text grow a little before spreading space.
    const grow=+main.dataset.grow||1.12, top=+main.dataset.max*grow;
    if(f>=+main.dataset.max){ while(f<top){ main.style.fontSize=(f+.25)+'px'; if(main.getBoundingClientRect().bottom>limit()){ main.style.fontSize=f+'px'; break; } f+=.25; } }
    main.dataset.final=f;
    // Share whatever space is left evenly: first between rows, then between blocks.
    let left=limit()-main.getBoundingClientRect().bottom;
    const rows=[...main.querySelectorAll('.rw')];
    const lines=new Set(rows.map(r=>Math.round(r.getBoundingClientRect().top))).size;
    if(left>2 && lines){ const per=Math.min(left/lines, 30); main.style.setProperty('--x', (per/2)+'px'); left=limit()-main.getBoundingClientRect().bottom; }
    const gaps=main.querySelectorAll('.gap3').length;
    if(left>2 && gaps){ main.style.setProperty('--g', Math.min(left/gaps, 72)+'px'); }
  }
};
window.__check=function(W,H){
  const issues=[]; const foot=document.querySelector('.foot'); const ft=foot?foot.getBoundingClientRect().top:H;
  document.querySelectorAll('.fit').forEach(el=>{ if([...el.querySelectorAll('.ln')].some(l=>l.scrollWidth>el.clientWidth+1)) issues.push('headline-overflow:"'+el.textContent.slice(0,30)+'"'); });
  document.querySelectorAll('.page *').forEach(el=>{
    if(el.closest('.foot')||el.classList.contains('grain')||el.closest('.bleed')||el.closest('.allow')) return;
    if(el.closest('svg') && el.tagName.toLowerCase()!=='svg') return;
    const r=el.getBoundingClientRect(); if(!r.width||!r.height) return;
    if(r.right>W-40||r.left<40) issues.push('x-edge:'+(el.className.baseVal??el.className)+':'+Math.round(r.left)+'-'+Math.round(r.right));
    if(r.bottom>ft-16) issues.push('tight-to-footer:'+Math.round(ft-r.bottom)+'px "'+(el.textContent||'').trim().slice(0,28)+'"');
  });
  const main=document.querySelector('.main'); if(main && main.dataset.final && +main.dataset.final<=+main.dataset.min) issues.push('body-at-minimum-size');
  return [...new Set(issues)].slice(0,8);
};`;

function page({ lang, W = 1080, H = 1350, cls = '', inner, extraCss = '' }) {
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>${css(lang, W, H)}${extraCss}</style></head>
<body><div class="page ${cls}"><div class="grain"></div>${inner}</div><script>${FIT_SCRIPT}</script></body></html>`;
}

// Headline with hand-set line breaks ("|"), auto-fitted between max and min px.
function Hd(text, max, min, o = {}) {
  const lines = String(text).split('|').map(l => `<span class="ln">${l}</span>`).join('');
  return `<div class="disp fit ${o.em ? 'em' : ''} ${o.cls || ''}" data-max="${max}" data-min="${min}" style="font-size:${max}px;${o.style || ''}">${lines}</div>`;
}

const top = (k, n) => `<div class="top"><span class="k">${k}</span><span class="n">${n || ''}</span></div>`;
function foot(lang, o = {}) {
  const L = LANGS[lang];
  const left = o.left ?? t(DATA.meta.credit, lang);
  const right = o.checked === false ? (o.right || '') : `${L.ui.checked} ${t(DATA.meta.checked, lang)}`;
  return `<div class="foot"><div>${left}${o.src ? `<br>${DOTS(`${L.ui.sources}: ${o.src}`)}` : ''}</div><div class="r">${right}</div></div>`;
}
// Devanagari in Anek sits smaller than Latin at the same size, so Hindi body text is scaled up.
let SCALE = 1;
const mainOpen = (max = 22, min = 19.5, breathe = 40, grow = 1.12) => { max = +(max * SCALE).toFixed(2); min = +(min * SCALE).toFixed(2); return `<div class="main" data-max="${max}" data-min="${min}" data-breathe="${breathe}" data-grow="${grow}" style="font-size:${max}px">`; };

// One sentence per line, so a new sentence never starts at the end of a line.
function S(text) {
  if (text == null || text === '') return '';
  return String(text).split(/(?<=[.!?।]["”’]?)\s+(?=[^\sa-z])/).map(p => `<span class="sn">${clauses(glue(p))}</span>`).join(' ');
}
// Keep short words with their neighbours so no line ends on "and", "a", "को" and the like.
const GLUE_NEXT = /(^|\s)(a|an|the|and|or|but|nor|to|of|in|on|at|by|for|if|is|it|its|so|no|not|with|your|their|you|we|as|from|into|than|any|all|our|my|और|या|ना|न|तो|कि|अगर|जो|हर|एक|पर|अपना|अपनी|अपने|बिना|वाली|वाले|वाला) (?=\S)/giu;
const GLUE_PREV = /\s(को|से|में|का|की|के|ने|पर|तक|भी|ही|है|हैं|था|थे|लिए)(?=[\s,।.!?]|$)/gu;
// Inside a sentence, lines may break only after a comma, unless a single clause is too long for one line.
function clauses(p) {
  const parts = p.split(/(?<=[,;:])\s+/);
  return parts.length < 2 ? p : parts.map(c => `<span class="cl">${c}</span>`).join(' ');
}
const NAMES = ['बिना निशान वाली गाड़ी', 'अकेला इंसान', 'अंदरूनी कोने', 'tear gas', 'out loud', 'private-looking car', 'Civil Rights', 'Civil Liberties', 'Lady Hardinge', 'Jantar Mantar', 'New Delhi', 'Hazrat Nizamuddin', 'Organic Maps', 'Google Maps', 'police station', 'name tag', 'woman officer', 'जंतर मंतर', 'नई दिल्ली', 'लेडी हार्डिंग'];
function glue(p) {
  let out = p;
  for (let prev = null; prev !== out;) { prev = out; out = out.replace(GLUE_NEXT, (m, a, w) => `${a}${w}\u00a0`); }
  out = out.replace(GLUE_PREV, '\u00a0$1');
  for (const n of NAMES) out = out.replace(new RegExp(n.replace(/ /g, '[ \u00a0]'), 'g'), m => `<span class="nw">${m}</span>`);
  return out;
}

// ------------------------------------------------------------------ components
// Short labels and titles: glued small words, optional hand breaks with "|", balanced lines.
const T = x => `<span class="bal">${glue(String(x)).split('|').join('<br>')}</span>`;
// "a · b · c" notes break only between parts.
const DOTS = x => String(x).split(' · ').map((p, i, a) => `<span class="cl">${glue(p)}${i < a.length - 1 ? ' ·' : ''}</span>`).join(' ');
const CITE = /^(.*?)(\s(?:BNSS|BNS)\s.*)$/;
function steps(list, o = {}) {
  return `<div class="steps ${o.cols === 2 ? 'c2' : ''}">${list.map(([a, b], i) => {
    const m = b.match(CITE); const txt = m ? m[1] : b, cite = m ? m[2].trim() : '';
    const mark = o.icons ? I.icon(o.icons[i], 34, o.dark ? P.paper : (i === 2 ? P.wine : P.carbon), 2.4) : pad(i + 1);
    return `<div class="st rw"><div class="n">${mark}</div><div><div class="tt">${T(a)}</div><div class="bd">${S(txt)}</div>${cite ? `<div class="ct">${cite}</div>` : ''}</div></div>`;
  }).join('')}</div><div class="hair"></div>`;
}

function contactTile(id, lang, o = {}) {
  const c = C(id), st = DATA.status_labels[c.status];
  const long = c.display.length > 8, email = c.display.includes('@');
  return `<div style="border-top:2px solid currentColor;padding:.6em 0 .3em">
    <div class="row" style="gap:.45em;align-items:center">${I.icon(CONTACT_ICON[id] || 'phone', 28, c.status === 'official' ? P.carbon : P.wine, 2.4)}<div class="num" style="font-size:${email ? 1.55 : long ? 1.8 : 2.3}em;white-space:nowrap">${c.display}</div></div>
    <div class="strong" style="font-size:1.05em;line-height:1.2;margin-top:.45em">${T(t(c.name, lang))}</div>
    <div class="small" style="font-size:.84em;margin-top:.15em;line-height:1.32">${DOTS(t(c.help, lang))}${c.alt && !o.noAlt ? ` · <span class="num" style="font-weight:700">${c.alt}</span>` : ''}</div>
    <div style="margin-top:.3em;font-family:var(--mono);font-size:.6em;${c.status === 'official' ? '' : 'color:var(--wine)'}">${st.mark} ${t(st, lang)}</div></div>`;
}

function statusRows(lang) {
  const tag = id => ({ permission: 'background:var(--carbon);color:var(--paper)', trains: 'background:var(--carbon);color:var(--paper)', metro: 'background:var(--wine);color:var(--paper)', internet: 'border:1.5px solid var(--wine);color:var(--wine)', roads: 'border:1.5px solid var(--wine);color:var(--wine)' }[id]);
  return DATA.status.map(s => `
  <div class="rw" style="display:grid;grid-template-columns:2.7em 1fr;gap:.8em;padding:calc(.7em + var(--x,0px)) 0;border-top:1px solid var(--rule)">
    <div style="padding-top:.1em">${I.icon(STATUS_ICON[s.id], 50, s.id === 'metro' || s.id === 'internet' ? P.wine : P.carbon, 2.4)}</div>
    <div>
      <div class="row" style="gap:.6em;align-items:center"><span class="label" style="color:var(--carbon);margin:0">${t(s.label, lang)}</span><span style="padding:.2em .45em .15em;font-family:var(--mono);font-size:.66em;letter-spacing:.1em;text-transform:uppercase;${tag(s.id)}">${t(s.tag, lang)}</span></div>
      <div class="strong" style="font-size:1.3em;line-height:1.18;margin-top:.25em">${t(s.value, lang)}</div>
      <div class="small" style="margin-top:.25em;line-height:1.38">${S(t(s.detail, lang))}</div>
    </div></div>`).join('') + `<div class="hair"></div>`;
}

function checklist(items, lang) {
  return `<div style="display:grid;grid-template-columns:1fr 1fr;column-gap:1.6em">${items.map(([a, b, ic], i) => `
    <div class="rw" style="display:grid;grid-template-columns:2.5em 1fr;gap:.65em;align-items:center;padding:calc(.5em + var(--x,0px)) 0;border-top:1px solid var(--rule)">
      <div style="width:2.5em;height:2.5em;border-radius:50%;background:var(--paper2);display:flex;align-items:center;justify-content:center">${I.icon(ic, 30, P.carbon, 2.6)}</div>
      <div><div class="strong" style="font-size:1.08em;line-height:1.18">${T(a)}</div><div class="small" style="font-size:.86em;margin-top:.12em;line-height:1.3">${S(b)}</div></div></div>`).join('')}</div><div class="hair"></div>`;
}

function art(name, lang, dark) {
  if (name === 'busNote') return I.busNote(lang, 340, 196);
  return I.spot(name, { dark, size: 170 });
}

// ------------------------------------------------------------------ slide templates
function renderSlide(s, lang, idx, total) {
  const L = LANGS[lang], hi = lang === 'hi', n = `${pad(idx)} ${L.ui.of} ${total}`;
  SCALE = hi ? 1.14 : 1;
  const kick = s.kicker ? `${pad(idx)} · ${s.kicker}` : '';
  const dark = !!s.dark;
  const disc = t({ en: 'General information, not legal or medical advice.', hi: 'सामान्य जानकारी, क़ानूनी या डॉक्टरी सलाह नहीं।' }, lang);
  const ft = o => foot(lang, Object.assign({ left: t(DATA.meta.credit, lang) + (s.src ? '<br>' + L.ui.sources + ': ' + srcShort(s.src) : '') + (s.disclaimer ? '<br>' + disc : ''), checked: false, right: n }, o || {}));
  const H2 = (max, min) => Hd(s.headline, max ?? (hi ? 66 : 78), min ?? (hi ? 40 : 46));

  switch (s.type) {
    case 'cover': return page({ lang, inner: `
      ${top(s.kicker, s.date)}
      ${Hd(s.headline, hi ? 96 : 122, 60, { style: 'margin-top:56px' })}
      ${Hd(s.headline2, hi ? 52 : 60, 34, { em: true, style: 'margin-top:22px' })}
      <div class="row" style="margin-top:var(--s3);justify-content:space-between;align-items:flex-end;gap:40px">
        <div style="font-size:${hi ? 28 : 26}px;line-height:1.42;max-width:660px">${S(s.deck)}</div>
        <div style="font-family:var(--mono);font-size:18px;letter-spacing:.12em;text-transform:uppercase;color:var(--wine);white-space:nowrap">${s.byline}</div>
      </div>
      <div class="allow" style="position:absolute;left:var(--M);right:var(--M);bottom:112px">${I.samratYantra(904, hi ? 470 : 480, 'day', { highlight: 1 })}</div>
      ${foot(lang, { left: S(t(DATA.meta.independence, lang)) })}` });

    case 'status': return page({ lang, inner: `
      ${top(kick, n)}
      <div class="head">${H2()}</div>
      ${mainOpen(26, 17.5, 56)}${statusRows(lang)}<div class="gap3 small" style="font-weight:600;color:var(--carbon)">${S(L.ui.recheck)}</div></div>
      ${foot(lang, { src: srcShort(s.src) })}` });

    case 'expect': return page({ lang, inner: `
      ${top(kick, n)}
      <div class="head">${H2(hi ? 60 : 70, 40)}</div>
      ${mainOpen(26, 19.5, 56)}
        <div style="display:grid;grid-template-columns:1fr 170px;gap:var(--s3);align-items:center"><div class="lede">${S(s.lede)}</div>${I.noNameTag(lang, 170, 150)}</div>
        <div class="gap3">${s.items.map(([a, b]) => `<div class="rw" style="display:grid;grid-template-columns:${hi ? 12 : 11}em 1fr;gap:1em;padding:calc(.6em + var(--x,0px)) 0;border-top:1px solid var(--rule)">
          <div class="disp" style="font-size:1.24em;line-height:1.14">${T(a)}</div><div style="line-height:1.4">${S(b)}</div></div>`).join('')}<div class="hair"></div></div>
      </div>
      ${ft()}` });

    case 'steps': {
      const hasArt = s.art && s.art !== 'busNote';
      const head = s.art === 'busNote'
        ? `<div class="headrow"><div class="head">${H2(hi ? 62 : 74, 42)}</div>${art('busNote', lang, dark)}</div>`
        : hasArt ? `<div class="headrow"><div class="head">${H2(hi ? 60 : 72, 40)}</div>${art(s.art, lang, dark)}</div>`
        : `<div class="head">${H2()}</div>`;
      return page({ lang, cls: dark ? 'dark' : '', inner: `
      ${top(kick, n)}
      ${head}
      ${s.sub ? Hd(s.sub, hi ? 32 : 38, 24, { em: true, style: 'margin-top:var(--s1)' }) : ''}
      ${mainOpen(s.cols === 2 ? 26 : 30, 19.5, 56)}
        ${s.lede ? `<div class="lede disp em" style="font-size:1.24em;margin-bottom:var(--s3)">${S(s.lede)}</div>` : ''}
        ${steps(s.steps, { cols: s.cols, icons: s.icons, dark })}
        ${s.note ? `<div class="note gap3">${S(s.note)}</div>` : ''}
        ${s.callout ? `<div class="callout gap2"><div class="label">${s.callout[0]}</div>${S(s.callout[1])}</div>` : ''}
      </div>
      ${ft()}` });
    }

    case 'checklist': return page({ lang, inner: `
      ${top(kick, n)}
      <div class="head">${H2()}</div>
      ${mainOpen(28, 19.5, 56)}
        ${checklist(s.items, lang)}
        ${s.leave ? `<div class="callout gap3"><div class="label">${L.ui.leave_label}</div>${S(s.leave)}</div>` : ''}
        ${s.note ? `<div class="note gap3">${S(s.note)}</div>` : ''}
      </div>
      ${ft()}` });

    case 'buddy': return page({ lang, inner: `
      ${top(kick, n)}
      <div class="head">${H2()}</div>
      ${mainOpen(28, 20, 56)}
        ${s.body.map((p, i) => `<div class="${i ? 'gap3' : ''}" style="line-height:1.42;${i === 1 ? 'font-weight:600' : ''}">${S(p)}</div>`).join('')}
        <div class="gap3" style="background:var(--paper2);padding:.8em 1em"><div class="strong" style="font-size:1.05em">${s.boundary_label}</div><div style="margin-top:.3em;line-height:1.4">${S(s.boundary)}</div></div>
        <div class="gap3 allow">${I.crowd(904, 150)}</div>
        <div class="disp em gap2" style="font-size:1.24em">${S(s.close)}</div>
      </div>
      ${ft()}` });

    case 'record': return page({ lang, cls: 'dark', inner: `
      ${top(kick, n)}
      <div class="head">${H2(hi ? 60 : 70, 40)}</div>
      ${mainOpen(26, 19.5, 56)}
        <div style="display:grid;grid-template-columns:1fr 300px;gap:var(--s3)">
          <div>${s.cols.map((c, i) => `<div class="label" style="${i ? 'margin-top:var(--s3)' : ''}">${c.label}</div>${c.items.map(x => `<div class="rw" style="display:grid;grid-template-columns:1em 1fr;line-height:1.36;padding:calc(.18em + var(--x,0px) / 2) 0"><span style="color:var(--blush)">·</span><span>${S(x)}</span></div>`).join('')}`).join('')}</div>
          <div>${I.recording(lang, 300, 192)}
            <div style="background:var(--paper);color:var(--carbon);padding:14px 16px 4px;margin-top:var(--s2)">
              <div style="font-family:var(--mono);font-size:13px;letter-spacing:.12em;text-transform:uppercase;border-bottom:1.5px solid var(--carbon);padding-bottom:8px">${hi ? 'घटना का रिकॉर्ड' : 'Incident log'}</div>
              ${s.form.map(f => `<div style="padding:7px 0 13px;border-bottom:1px solid var(--rule);font-family:var(--mono);font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:var(--ink2)">${f}</div>`).join('')}
            </div></div>
        </div>
        <div class="note gap3">${S(s.note)}</div>
      </div>
      ${ft()}` });

    case 'numbers': return page({ lang, inner: `
      ${top(kick, n)}
      <div class="head">${H2(hi ? 58 : 72, 40)}</div>
      ${mainOpen(26, 17.5, 56)}
        <div style="display:grid;grid-template-columns:1fr 1fr;column-gap:1.6em">
          ${s.groups.slice(0, 2).map(g => `<div><div class="label">${g.label}</div>${g.ids.map(id => contactTile(id, lang)).join('')}</div>`).join('')}
        </div>
        <div class="label gap3">${s.groups[2].label}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;column-gap:1.6em;row-gap:.6em">${s.groups[2].ids.map(id => contactTile(id, lang)).join('')}</div>
        <div class="label gap3">${s.mine_label}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;column-gap:1.6em">${s.mine.map(m => `<div style="border-top:2px solid var(--carbon);padding-top:.5em"><div class="small" style="font-size:.86em">${m}</div><div style="margin-top:2.2em;border-bottom:1.5px dashed var(--grey)"></div></div>`).join('')}</div>
        <div class="disp em gap3" style="font-size:1.02em;line-height:1.36">${S(s.honest)}</div>
      </div>
      ${foot(lang, { left: L.ui.not_endorsed })}` });

    case 'closing': return page({ lang, cls: 'wine', inner: `
      ${top('', n)}
      <div class="head">${Hd(s.headline, hi ? 82 : 104, 56)}</div>
      ${mainOpen(28, 21, 380)}
        <div style="line-height:${hi ? 1.5 : 1.42};color:#F3E9E6">${S(s.body)}</div>
        <div class="gap3" style="font-family:var(--hand);font-size:${hi ? 1.8 : 2.4}em;line-height:1">${s.sign}</div>
        <div class="gap1" style="font-family:var(--mono);font-size:.58em;letter-spacing:.1em;text-transform:uppercase;color:var(--blush)">${s.credit}</div>
      </div>
      <div class="allow" style="position:absolute;left:var(--M);right:var(--M);bottom:112px">${I.samratYantra(904, 290, 'dusk', { people: [[90, 1, .7], [140, 1, .62], [210, 1, .66], [770, 1, .68], [820, -1, .64]], highlight: 2 })}</div>
      ${foot(lang, { left: S(t(DATA.meta.independence, lang)) })}` });
  }
  throw new Error('unknown slide type ' + s.type);
}

// ------------------------------------------------------------------ standalone cards
const CARD_ICON = { a: 'wifioff', b: 'phone', c: 'voice', d: 'bus', e: 'eye', f: 'people', g: 'lock', h: 'file', i: 'metro' };
function card(cd, idx, total) {
  SCALE = 1;
  const lang = 'en', L = LANGS.en, slides = L.slides;
  const from = cd.from ? slides.find(x => x.id === cd.from) : null;
  const head = `<div class="bleed" style="margin:-80px calc(-1 * var(--M)) 0;padding:52px var(--M) 34px;background:${cd.wine ? 'var(--wine)' : 'var(--carbon)'};color:var(--paper)">
      <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:18px;letter-spacing:.12em;text-transform:uppercase;color:#CFCBC2"><span>Jantar Mantar 2.0 · Sat 10 Oct 2026</span><span>Card ${cd.key.toUpperCase()}</span></div>
      <div style="display:grid;grid-template-columns:1fr 104px;gap:var(--s3);align-items:end;margin-top:var(--s3)">
        <div>${Hd(cd.title, 76, 44)}<div style="margin-top:var(--s1);font-size:24px;color:#E6DED6">${cd.sub}</div></div>
        ${I.icon(CARD_ICON[cd.key], 96, '#E7C9CD', 2.2)}
      </div></div>`;
  let body = '', src = '', ts = false;
  if (from) {
    body = `${mainOpen(30, 18, 56)}${from.sub && !cd.noSub ? `<div class="disp em" style="font-size:1.3em;margin-bottom:var(--s2)">${from.sub}</div>` : ''}${steps(from.steps, { icons: from.icons, cols: from.cols })}${from.note ? `<div class="note gap3">${S(from.note)}</div>` : ''}${from.callout ? `<div class="callout gap2"><div class="label">${from.callout[0]}</div>${S(from.callout[1])}</div>` : ''}</div>`;
    src = srcShort(from.src);
  }
  if (cd.type === 'numbers') { ts = true; src = srcShort('L11, L26, L09, L10, L13');
    body = `${mainOpen(28, 20, 56)}<div style="display:grid;grid-template-columns:1fr 1fr;column-gap:1.6em;row-gap:.8em">${cd.ids.map(id => contactTile(id, lang)).join('')}</div><div class="small gap3">${S(L.ui.not_endorsed)}</div></div>`; }
  if (cd.type === 'status') { ts = true; src = srcShort('L01, L02, L04, L05');
    body = `${mainOpen(26, 19, 56)}${statusRows(lang)}<div class="gap3 strong">${S(L.ui.recheck)}</div></div>`; }
  return page({ lang, inner: `${head}${body}${foot(lang, { src, checked: ts ? undefined : false, right: ts ? undefined : `${idx} / ${total}` })}` });
}

// ------------------------------------------------------------------ Instagram stories 1080×1920
// Safe zone: nothing vital above 250 px or below 1600 px.
function story(key) {
  SCALE = 1;
  const lang = 'en', L = LANGS.en, st = L.stories[key];
  const extra = `.page{padding:250px 88px 0}.foot{bottom:290px}`;
  let body = '', cls = '';
  if (key === '1') body = `<div class="head">${Hd(st.headline, 112, 70)}</div>${mainOpen(38, 28, 56, 1.2)}<div style="line-height:1.42">${S(st.body)}</div><div class="gap3 allow">${I.samratYantra(904, 440, 'day', { highlight: 1 })}</div><div class="label gap3" style="font-size:.7em">${S(st.cta)}</div></div>`;
  if (key === '2') { cls = 'dark'; body = `<div class="headrow"><div class="head">${Hd(st.headline, 130, 80)}</div>${I.spot('lock', { dark: true, size: 200 })}</div>${mainOpen(46, 30, 56, 1.3)}${st.items.map((x, i) => `<div class="rw" style="display:grid;grid-template-columns:2em 1fr;padding:calc(.6em + var(--x,0px)) 0;border-top:1px solid rgba(240,238,232,.22)"><span class="num" style="color:var(--blush)">${pad(i + 1)}</span><span style="line-height:1.26">${S(x)}</span></div>`).join('')}</div>`; }
  if (key === '3') body = `<div class="head">${Hd(st.headline, 112, 70)}</div>${mainOpen(36, 25, 56, 1.3)}<div style="display:grid;grid-template-columns:1fr 1fr;column-gap:1.2em;row-gap:.6em">${st.ids.map(id => contactTile(id, lang, { noAlt: true })).join('')}</div><div class="label gap3">Write your own</div>${['Someone at home', 'Your person there'].map(m => `<div style="border-top:2px solid var(--carbon);padding-top:.4em;margin-top:.5em"><div class="small" style="font-size:.8em">${m}</div><div style="margin-top:2em;border-bottom:1.5px dashed var(--grey)"></div></div>`).join('')}<div class="small gap3" style="font-size:.7em">${S(L.ui.not_endorsed)}</div></div>`;
  if (key === '4') { const g = L.slides.find(x => x.id === 'grabbed'); body = `<div class="head">${Hd(st.headline, 100, 64)}</div>${Hd(g.sub, 46, 30, { em: true, style: 'margin-top:var(--s1)' })}${mainOpen(34, 25, 56)}${steps(g.steps)}</div>`; }
  if (key === '5') body = `<div class="head">${Hd(st.headline, 88, 60)}</div>${mainOpen(30, 23, 56)}${statusRows(lang)}<div class="gap3 strong">${S(L.ui.recheck)}</div></div>`;
  return page({ lang, W: 1080, H: 1920, cls, extraCss: extra, inner: `${top(st.kicker, key + ' / 5')}${body}${foot(lang, { left: 'Stella John · Independent citizen’s guide' + (key === '5' ? '<br>Sources: ' + srcShort('L01, L02, L04, L05') : '') })}` });
}

// ------------------------------------------------------------------ WhatsApp edition (JPEG, large type)
const WA_ICON = { '1': 'gate', '2': 'phone', '3': 'eye', '4': 'voice' };
function whatsapp(key) {
  SCALE = 1;
  const lang = 'en', L = LANGS.en, w = L.whatsapp[key];
  const extra = `.page{padding:64px 72px 0;--M:72px}.foot{font-size:20px}.foot .r{font-size:17px}`;
  let body = '';
  if (w.type === 'status') body = `${mainOpen(30, 22, 56)}${statusRows(lang)}</div>`;
  if (w.type === 'numbers') body = `${mainOpen(30, 24, 36)}<div style="display:grid;grid-template-columns:1fr 1fr;column-gap:1.4em;row-gap:.5em">${w.ids.map(id => contactTile(id, lang, { noAlt: true })).join('')}</div><div class="small gap3" style="font-size:.7em">${S(L.ui.not_endorsed)}</div></div>`;
  if (w.from) { const f = L.slides.find(x => x.id === w.from); body = `${mainOpen(34, 24, 56)}${steps(f.steps)}</div>`; }
  return page({ lang, extraCss: extra, inner: `
    <div class="row" style="justify-content:space-between;align-items:center"><div style="font-family:var(--mono);font-size:20px;letter-spacing:.1em;text-transform:uppercase;color:var(--wine)">Jantar Mantar 2.0 · Sat 10 Oct 2026</div>${I.icon(WA_ICON[key], 52, P.wine, 2.4)}</div>
    <div style="margin-top:var(--s2)">${Hd(w.title, 88, 52)}</div>${body}
    ${foot(lang, { left: 'Stella John · Independent citizen’s guide' })}` });
}

// ------------------------------------------------------------------ jobs
const jobs = [];
for (const lang of ['en', 'hi']) {
  const list = LANGS[lang].slides;
  list.forEach((s, i) => jobs.push({ key: `${lang}-${pad(i + 1)}`, html: () => renderSlide(s, lang, i + 1, list.length), out: `exports/instagram-carousel-${lang}/${lang}-${pad(i + 1)}-${s.id}.png`, W: 1080, H: 1350 }));
}
const CARDS = LANGS.en.cards;
CARDS.forEach((cd, i) => jobs.push({ key: `card-${cd.key}`, html: () => card(cd, i + 1, CARDS.length), out: `exports/standalone-cards/card-${cd.key}-${(cd.from || cd.type)}.png`, W: 1080, H: 1350 }));
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
    await p.evaluate(() => window.__fit());
    const issues = await p.evaluate(([W, H]) => window.__check(W, H), [j.W, j.H]);
    if (issues.length) report[j.key] = issues;
    fs.mkdirSync(path.dirname(path.join(ROOT, j.out)), { recursive: true });
    await p.screenshot({ path: path.join(ROOT, j.out), type: j.jpg ? 'jpeg' : 'png', ...(j.jpg ? { quality: 84 } : {}) });
    await p.close();
  }
  await browser.close();
  console.log('rendered', sel.length);
  console.log(Object.keys(report).length ? JSON.stringify(report, null, 1) : 'no layout issues detected');
})();
