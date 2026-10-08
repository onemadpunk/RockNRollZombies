// Story comic panels, the tour map and the merch stand. Plain HTML/SVG, no 3D.
import { SHOP } from './config.js';
import { TOUR } from './level.js';

// ---- Comic art: small SVG scenes in the game's palette -------------------------------
const PINK = '#ff2e88', TOXIC = '#a6ff4d', GOLD = '#ffc94a', INK = '#0c0a14', BONE = '#f3ece0', RED = '#e0201a';
const moon = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${BONE}" opacity=".9"/>`;
const person = (x, y, s = 1, col = INK, hair = PINK) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <rect x="-7" y="-46" width="14" height="14" rx="2" fill="${col}"/>
    <path d="M0 -48 l-3 -10 l3 4 l3 -6 l1 8 l3 -4 z" fill="${hair}"/>
    <rect x="-10" y="-32" width="20" height="22" fill="${col}"/>
    <rect x="-9" y="-10" width="7" height="22" fill="${col}"/><rect x="2" y="-10" width="7" height="22" fill="${col}"/>
    <rect x="-16" y="-30" width="6" height="18" fill="${col}"/><rect x="10" y="-30" width="6" height="18" fill="${col}"/>
  </g>`;
const guitar = (x, y, r = -30) => `<g transform="translate(${x} ${y}) rotate(${r})"><ellipse cx="0" cy="0" rx="10" ry="7" fill="${RED}"/><rect x="8" y="-2" width="26" height="4" fill="#3b2414"/></g>`;
const zhead = (x, y) => `<g transform="translate(${x} ${y})"><circle r="9" fill="#5f7f58"/><circle cx="-3" cy="-2" r="2" fill="${TOXIC}"/><circle cx="3" cy="-2" r="2" fill="${TOXIC}"/><rect x="-10" y="8" width="20" height="18" fill="#3a3a30"/></g>`;
const devil = (x, y, s = 1) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-40 60 Q-46 -10 -24 -36 L24 -36 Q46 -10 40 60 Z" fill="#5a0a0a"/>
    <circle cx="0" cy="-52" r="22" fill="#7a0e0e"/>
    <path d="M-18 -66 Q-34 -92 -14 -100 Q-24 -84 -10 -72 Z" fill="#2a0505"/>
    <path d="M18 -66 Q34 -92 14 -100 Q24 -84 10 -72 Z" fill="#2a0505"/>
    <path d="M-12 -56 l9 4 l-9 3 z" fill="${GOLD}"/><path d="M12 -56 l-9 4 l9 3 z" fill="${GOLD}"/>
    <path d="M-10 -40 Q0 -32 10 -40" stroke="${GOLD}" stroke-width="2" fill="none"/>
  </g>`;
const flames = (y) => Array.from({ length: 12 }, (_, i) => `<path d="M${i * 26 - 4} ${y} q13 -${30 + (i % 3) * 14} 26 0 z" fill="${i % 2 ? '#ff6a1a' : RED}" opacity=".9"/>`).join('');
const sky = (a = '#1b1233', b = '#3b2a58') => `<defs><linearGradient id="g${a.slice(1)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="300" height="200" fill="url(#g${a.slice(1)})"/>`;
const graves = () => [20, 70, 120, 190, 250].map((x, i) => `<path d="M${x} 200 v-${22 + (i % 2) * 8} a10 10 0 0 1 20 0 v${22 + (i % 2) * 8} z" fill="#4d5163"/>`).join('');

const ART = {
  stage: `${sky()}<rect x="0" y="130" width="300" height="70" fill="#141018"/>
    <polygon points="70,0 40,130 110,130" fill="${PINK}" opacity=".18"/><polygon points="230,0 190,130 260,130" fill="${TOXIC}" opacity=".15"/>
    ${person(100, 128, 1.1)}${guitar(104, 106)}${person(150, 128, 1.1, INK, '#2fa8ff')}<rect x="132" y="104" width="36" height="22" rx="10" fill="#333"/>${person(200, 128, 1.1, INK, '#111')}${guitar(204, 104, -20)}
    ${[20, 45, 75, 230, 260, 285].map((x) => `<circle cx="${x}" cy="${184 + (x % 7)}" r="12" fill="#2a2030"/>`).join('')}`,
  devil: `${sky('#2a0505', '#5a0a0a')}${flames(200)}${devil(150, 120, 1.15)}
    <rect x="200" y="96" width="60" height="44" fill="${BONE}" transform="rotate(8 230 118)"/><path d="M208 108 h44 M208 116 h40 M208 124 h30" stroke="#555" stroke-width="2" transform="rotate(8 230 118)"/>
    <path d="M214 132 q10 -8 20 2" stroke="${RED}" stroke-width="3" fill="none" transform="rotate(8 230 118)"/>`,
  taken: `${sky('#1a0505', '#3a0a0a')}${flames(200)}${devil(90, 130, 0.9)}
    ${person(170, 160, 0.9, '#222', '#2fa8ff')}${person(205, 165, 0.9, '#222', '#111')}${person(240, 160, 0.9, '#222', GOLD)}
    <path d="M118 70 Q150 90 165 115 M118 70 Q180 90 200 120 M118 70 Q210 80 236 115" stroke="${GOLD}" stroke-width="2" fill="none" stroke-dasharray="4 3"/>`,
  alone: `${sky()}${moon(230, 50, 26)}${graves()}<rect x="0" y="176" width="300" height="24" fill="#24341f"/>
    ${person(140, 176, 1.5)}${guitar(146, 140)}${zhead(40, 160)}${zhead(262, 162)}`,
  freed: `${sky('#1b1233', '#4a2a58')}${moon(60, 46, 22)}${graves()}<rect x="0" y="176" width="300" height="24" fill="#24341f"/>
    ${person(120, 176, 1.4)}${person(180, 176, 1.4, INK, '#2fa8ff')}<path d="M140 120 l10 -14 l10 14" stroke="${GOLD}" stroke-width="4" fill="none"/>
    <text x="150" y="98" text-anchor="middle" font-family="Bungee, Impact" font-size="16" fill="${GOLD}">HIGH FIVE!</text>`,
  van: `${sky('#0c0a20', '#2a1a40')}${moon(250, 40, 20)}<rect x="0" y="150" width="300" height="50" fill="#1a1a20"/>
    <path d="M0 175 h300" stroke="${GOLD}" stroke-width="3" stroke-dasharray="18 14"/>
    <g transform="translate(90 112)"><rect width="120" height="44" rx="6" fill="${PINK}"/><rect x="84" y="-14" width="36" height="20" rx="4" fill="${PINK}"/>
    <rect x="90" y="-10" width="24" height="12" fill="#5ad1ff"/><circle cx="24" cy="46" r="11" fill="${INK}"/><circle cx="96" cy="46" r="11" fill="${INK}"/>
    <text x="40" y="28" font-family="Bungee, Impact" font-size="12" fill="${INK}">RNRZ TOUR</text></g>`,
  cage: `${sky('#05060d', '#3a2550')}<rect x="0" y="150" width="300" height="50" fill="#26262e"/>
    <rect x="30" y="20" width="80" height="34" fill="none" stroke="${PINK}" stroke-width="3"/><text x="70" y="44" text-anchor="middle" font-family="Bungee, Impact" font-size="18" fill="${PINK}">BAR</text>
    ${person(200, 150, 1.3, INK, '#111')}${[176, 188, 200, 212, 224].map((x) => `<rect x="${x}" y="70" width="3" height="80" fill="#888"/>`).join('')}<rect x="172" y="66" width="56" height="5" fill="#888"/>
    <g transform="translate(250 60)"><path d="M-14 0 q14 -30 28 0 l-6 20 h-16 z" fill="#7d7f8c"/><circle cx="-4" cy="-4" r="2" fill="#ff8a20"/><circle cx="4" cy="-4" r="2" fill="#ff8a20"/></g>`,
  bassfree: `${sky('#05060d', '#3a2550')}<rect x="0" y="150" width="300" height="50" fill="#1d1d24"/>
    ${[20, 60, 240, 280].map((x, i) => `<rect x="${x - 15}" y="${60 + i * 8}" width="30" height="${90 - i * 8}" fill="#15142a"/>`).join('')}
    ${person(110, 150, 1.4)}${person(160, 150, 1.4, INK, '#2fa8ff')}${person(210, 150, 1.4, INK, '#111')}
    <text x="150" y="40" text-anchor="middle" font-family="Bungee, Impact" font-size="16" fill="${TOXIC}">THE BAND'S GETTING BACK TOGETHER</text>`,
  festival: `${sky('#0a0510', '#3a1a30')}${moon(60, 50, 18)}<rect x="0" y="160" width="300" height="40" fill="#2a1e14"/>
    <path d="M140 160 L190 60 L240 160 Z" fill="#5a1a3a"/><path d="M60 160 L95 90 L130 160 Z" fill="#3a1a5a"/><path d="M190 60 v-16" stroke="${GOLD}" stroke-width="2"/>
    <circle cx="250" cy="110" r="34" fill="none" stroke="#666" stroke-width="3"/>${[0, 60, 120, 180, 240, 300].map((a) => `<line x1="250" y1="110" x2="${250 + 34 * Math.cos(a * Math.PI / 180)}" y2="${110 + 34 * Math.sin(a * Math.PI / 180)}" stroke="#666" stroke-width="2"/>`).join('')}
    <path d="M120 40 q20 -20 40 0 q-10 30 -20 40 q-10 -10 -20 -40" fill="#c8d6ff" opacity=".7"/>`,
};

export const COMICS = {
  intro: [
    { art: 'stage', text: 'Friday night. The band is playing the Graveyard Gig. The crowd is going wild.' },
    { art: 'devil', text: 'Then HE turns up. The Devil, here to collect on a deal your manager signed in red ink.' },
    { art: 'taken', text: 'He drags the band down to Hell, and the crowd starts to turn...' },
    { art: 'alone', text: "It's just you, your guitar and a graveyard full of zombies. Time to get the band back." },
  ],
  after0: [
    { art: 'freed', text: 'The drummer is free! The beat is back.' },
    { art: 'cage', text: "But the Devil's goons have dragged the bassist off to a dive bar across town. Something big and made of stone is guarding the roof." },
    { art: 'van', text: 'Into the tour van. Next stop: the Back Alley Dive Bar.' },
  ],
  after1: [
    { art: 'bassfree', text: "The bassist is back! Three down. The band's getting back together." },
    { art: 'festival', text: 'Next stop: the Haunted Festival, where the Banshee Diva is holding the singer.' },
    { art: 'van', text: 'Pack the van. Wellies on.' },
  ],
  after2: [
    { art: 'bassfree', text: 'The singer is back, and the whole band is together again!' },
    { art: 'devil', text: "But the Devil isn't done. He's heading for the Highway to Hell. Coming soon..." },
  ],
};

export function renderComic(container, key) {
  container.innerHTML = COMICS[key].map((p, i) => `
    <figure class="panel" style="--d:${i * 0.25}s">
      <svg viewBox="0 0 300 200" role="img" aria-label="${p.text.replace(/"/g, '')}">${ART[p.art]}</svg>
      <figcaption>${p.text}</figcaption>
    </figure>`).join('');
}

// ---- Tour map ----------------------------------------------------------------------------
export function renderMap(container, next, unlocked) {
  const W = 640, H = 200;
  const pts = TOUR.map((_, i) => [60 + i * 130, 120 + Math.sin(i * 1.7) * 40]);
  const road = pts.map(([x, y], i) => (i ? `L${x} ${y}` : `M${x} ${y}`)).join(' ');
  const stops = TOUR.map((s, i) => {
    const [x, y] = pts[i];
    const done = i < next, here = i === next;
    const col = s.soon ? '#5c5370' : done ? '#a6ff4d' : here ? '#ff2e88' : '#a99fb8';
    return `<g><circle cx="${x}" cy="${y}" r="${here ? 13 : 10}" fill="${col}" stroke="#0c0a14" stroke-width="3"/>
      <text x="${x}" y="${y + 32}" text-anchor="middle" font-family="Bungee, Impact" font-size="12" fill="${col}">${s.name}</text>
      <text x="${x}" y="${y + 46}" text-anchor="middle" font-family="Rubik, sans-serif" font-size="10" fill="#a99fb8">${s.soon ? 'Coming soon' : done ? 'Rescued: ' + s.rescue : 'Boss: ' + s.boss}</text></g>`;
  }).join('');
  const [vx, vy] = pts[Math.min(next, pts.length - 1)];
  container.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="map" role="img" aria-label="Tour map">
    <path d="${road}" stroke="#2a2235" stroke-width="16" fill="none" stroke-linecap="round"/>
    <path d="${road}" stroke="#ffc94a" stroke-width="2" fill="none" stroke-dasharray="10 9"/>
    ${stops}
    <g transform="translate(${vx - 22} ${vy - 46})" class="van"><rect width="44" height="18" rx="3" fill="#ff2e88"/><rect x="30" y="-7" width="14" height="9" rx="2" fill="#ff2e88"/>
      <circle cx="9" cy="19" r="5" fill="#0c0a14"/><circle cx="35" cy="19" r="5" fill="#0c0a14"/></g>
  </svg>`;
}

// ---- Merch stand ----------------------------------------------------------------------------
export function renderShop(container, run, onBuy) {
  const owned = (id) => (id === 'spikes' && run.upgrades.spikes) || (id === 'amp' && run.upgrades.amp) || (id === 'flame' && run.upgrades.flame);
  container.innerHTML = `<div class="cash">Cash: <b>$${run.cash}</b></div>` + SHOP.map((it) => {
    const have = owned(it.id);
    const afford = run.cash >= it.price;
    return `<button class="shop-item" data-id="${it.id}" ${have || !afford ? 'disabled' : ''}>
      <span class="nm">${it.name}</span><span class="pr">${have ? 'OWNED' : '$' + it.price}</span><span class="bl">${it.blurb}</span></button>`;
  }).join('');
  for (const b of container.querySelectorAll('.shop-item')) b.addEventListener('click', () => onBuy(b.dataset.id));
}
