// «Жылдыз булак» — a picture book in crayon. Timeline, pages, camera, printed words, page turns.
import { layer, clear, line, fill, dab, text, handCircle, ellipse, smooth, CAM, BOIL, W, H, sx, sy } from './crayon.js';
import { group, clearGroup, part } from './rig.js';
import { kid, zhyl, granny, glow, star5 } from './chars.js';
import { mountains, hill, walnut, poplar, house, sun, skyHatch, bird, stone, river, fog, shyrdak, whiteStars, noteGlyph, pr } from './world.js';
import { blocksOf, blockTimes } from './text.js';
import { PAL } from './pal.js';
import { clamp, lerp, hash, track, ss, eio, eo } from '/core/lib.js';
const K = PAL.crayon;
const BPM = 84, BAR = 3 * 60 / BPM;

// ——— layers ———
const BGf = layer(), BGl = layer(), WAX = layer(), WASH = layer(), FX = layer(), SUBK = layer(), SUBT = layer();
const CH = group(), CH2 = group();
const X = { f: BGf, l: BGl, wax: WAX, wash: WASH, fx: FX, ch: CH, ch2: CH2 };

// ——— events for the mix ———
export const EV = [];
const ev = (t, type, o = {}) => EV.push({ t: +t.toFixed(3), type, ...o });

// ——— page definitions (draw functions further below) ———
const PAGES = [
  { id: 0, pre: 0, post: 0, fixed: 9.5, draw: pTitle, cam: () => [960, 540, 1], tooth: [0, 0] },
  { id: 1, pre: 4.0, post: 1.2, draw: p1, tooth: [400, 0] },
  { id: 2, pre: 3.4, post: 1.0, draw: p2, tooth: [800, 0] },
  { id: 3, pre: 2.2, post: 1.0, draw: p3, tooth: [1200, 0] },
  { id: 4, pre: 2.8, post: 1.0, draw: p4, tooth: [1600, 0] },
  { id: 5, pre: 2.8, post: 0.8, draw: null, mt: 3, tooth: [2000, 0] },
  { id: 6, pre: 1.8, post: 3.0, draw: null, mt: 2, tooth: [2000, 0] },
  { id: 7, pre: 1.6, post: 1.0, draw: null, mt: 1, tooth: [2000, 0] },
  { id: 8, pre: 2.4, post: 2.2, draw: null, mt: 0, tooth: [2000, 0] },
  { id: 9, pre: 6.4, post: 1.6, draw: p9, tooth: [2400, 0] },
  { id: 10, pre: 2.0, post: 1.2, draw: p10, tooth: [2800, 0] },
  { id: 11, pre: 3.4, post: 1.2, draw: p11, tooth: [3200, 0] },
  { id: 12, pre: 5.0, post: 13.0, draw: p12, tooth: [3600, 0] },
];
const TURN = 1.4, PAN = 2.8;
// timeline: each page holds its blocks; between pages a page turn (or a camera climb on the mountain)
let T = 0; const SEG = []; export const SUBS = [];
PAGES.forEach((P, i) => {
  P.blocks = blocksOf(P.id); P.bt = []; let tl = P.pre;
  P.blocks.forEach((b, j) => { const bt = blockTimes(b); P.bt.push({ t0: tl, w: bt.write, t1: tl + bt.write + bt.hold, lines: b }); tl += bt.dur; });
  P.dur = P.fixed ?? (tl + P.post);
  P.t0 = T; SEG.push({ type: 'page', P, t0: T, t1: T + P.dur }); T += P.dur;
  P.bt.forEach(b => { SUBS.push({ t0: P.t0 + b.t0, t1: P.t0 + b.t1, text: b.lines.join(' ') }); ev(P.t0 + b.t0, 'write', { dur: b.w }); ev(P.t0 + b.t0, 'sub', { t1: +(P.t0 + b.t1).toFixed(3), text: b.lines.join('\n') }); });
  const nx = PAGES[i + 1];
  if (nx) {
    const pan = P.mt !== undefined && nx.mt !== undefined;
    SEG.push({ type: pan ? 'pan' : 'turn', A: P, B: nx, t0: T, t1: T + (pan ? PAN : TURN) });
    ev(T, pan ? 'climb' : 'page', { dur: pan ? PAN : TURN }); T += pan ? PAN : TURN;
  }
});
export const DUR = +T.toFixed(2);
const MT = PAGES.filter(P => P.mt !== undefined);   // the mountain sections share one tall page
const mtStart = MT[0].t0;

// ——— printed words ———
const WRAP = 1640;
function subTo(t, P, tl) {
  const B = P.bt.find(b => tl >= b.t0 && tl < b.t1); if (!B) return null;
  const rv = clamp((tl - B.t0) / B.w);
  const g = SUBK.g; g.save(); g.font = '400 56px "Caveat"';
  const ws = B.lines.map(s => g.measureText(s).width); g.restore();
  const n = B.lines.length, lh = 66, cy = 1080 - 30 - n * lh / 2 - 22, hw = Math.min(WRAP, Math.max(...ws)) / 2 + 50, hh = n * lh / 2 + 20;
  g.save(); g.fillStyle = '#000'; g.beginPath();
  for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2; const px = Math.cos(a), py = Math.sin(a); const sq = Math.pow(Math.abs(px), 0.25) * Math.sign(px); const sqy = Math.pow(Math.abs(py), 0.5) * Math.sign(py); const k = 1 + 0.05 * Math.sin(a * 7 + B.t0) + 0.025 * Math.sin(a * 17); i ? g.lineTo(960 + sq * hw * k, cy + sqy * hh * k) : g.moveTo(960 + sq * hw * k, cy + sqy * hh * k); }
  g.closePath(); g.fill(); g.restore();
  const tot = B.lines.reduce((a, s) => a + s.length, 0); let acc = 0;
  const cam = [CAM.x, CAM.y, CAM.s]; CAM.x = 960; CAM.y = 540; CAM.s = 1;
  B.lines.forEach((s, i) => {
    const r = clamp((rv * tot - acc) / s.length); acc += s.length;
    text(SUBT, s, 960, cy - (n - 1) * lh / 2 + i * lh + 20, { size: 56, col: K.ink, reveal: r, seed: 11 + B.t0 * 3 + i * 17, p: 1, stroke: 1.2 });
  });
  [CAM.x, CAM.y, CAM.s] = cam;
  return { id: `p${P.id}b${P.bt.indexOf(B)}`, text: B.lines.join(' '), x0: 960 - hw, y0: cy - hh, x1: 960 + hw, y1: cy + hh };
}
export function TEXTS(t) {
  const S = segAt(t); if (S.type !== 'page') return [];
  const P = S.P, tl = t - S.t0, B = P.bt.find(b => tl >= b.t0 && tl < b.t1); if (!B) return [];
  return [{ id: `p${P.id}b${P.bt.indexOf(B)}`, text: B.lines.join(' '), x0: 200, y0: 860, x1: 1720, y1: 1060 }];
}
function segAt(t) { for (const S of SEG) if (t < S.t1) return S; return SEG[SEG.length - 1]; }

// ——— rendering a page ———
function clearAll() { [BGf, BGl, WAX, WASH, FX, SUBK, SUBT].forEach(clear); clearGroup(CH); clearGroup(CH2); }
function compose(comp, P, o) {
  comp.paperCam(CAM.x * 0.6 + P.tooth[0], CAM.y * 0.6 + P.tooth[1], CAM.s / 0.6);
  comp.begin();
  comp.crayon(BGf.c); comp.crayon(BGl.c);
  comp.crayon(WAX.c);
  const go = [hash(BOIL.step) * 300, hash(BOIL.step + 7) * 300];
  if (o.wash) comp.wash(WASH.c, { color: PAL.wash });
  comp.group(CH2, { goff: go });
  comp.group(CH, { goff: go });
  comp.crayon(FX.c, { goff: go });
  if (o.subs !== false) { comp.knock(SUBK.c); comp.crayon(SUBT.c); }
  comp.finish({ vig: o.vig ?? 0.3, lamp: o.lamp || [0.5, 0.5, 1, 0] });
}
function renderPage(comp, P, tl, o = {}) {
  clearAll();
  let r;
  if (P.mt !== undefined) r = mountainAt(P.t0 + tl, null);
  else { [CAM.x, CAM.y, CAM.s] = (P.cam ? P.cam(tl) : P.camF(tl)); r = P.draw(tl, P) || {}; }
  if (o.subs !== false) subTo(P.t0 + tl, P, tl);
  compose(comp, P, { ...r, ...o });
}

// ——— the whole film ———
const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return { c, g: c.getContext('2d') }; };
const snapA = mk(), snapB = mk(), OUT = mk();
const glc = () => document.getElementById('gl');
const snap = S => { S.g.setTransform(1, 0, 0, 1, 0, 0); S.g.clearRect(0, 0, W, H); S.g.drawImage(glc(), 0, 0); };
export function frame(comp, t) {
  const S = segAt(t);
  BOIL.amp = 1;
  if (S.type === 'page') {
    if (S.P.id === 12 && t - S.t0 > END_T0) return endPull(comp, t - S.t0, S.P);
    return renderPage(comp, S.P, t - S.t0);
  }
  if (S.type === 'pan') { clearAll(); const r = mountainAt(t, S); compose(comp, S.A, { ...r, subs: false }); return; }
  // page turn: the old page lifts from the right and folds over to the left, the new page is underneath
  const u = eio(pr(t, S.t0, S.t1));
  renderPage(comp, S.A, S.A.dur, { subs: false }); snap(snapA);
  renderPage(comp, S.B, 0, { subs: false }); snap(snapB);
  pageTurn(OUT.g, snapA.c, snapB.c, u);
  comp.paperCam(0, 0, 1); comp.begin(); comp.image(OUT.c); comp.finish({ vig: 0, emb: 0, lift: 0 });
}
function pageTurn(g, A, B, u) {
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
  g.drawImage(B, 0, 0);
  const f = W * (1 - u);                        // fold line, moving right → left
  const bw = Math.min(f, W - f) * 0.62;         // width of the page's back as it curls over
  // old page, left of the fold
  g.save(); g.beginPath(); g.rect(0, 0, Math.max(0, f - bw * 0.02), H); g.clip(); g.drawImage(A, 0, 0); g.restore();
  // shadow on the new page next to the fold
  const sg = g.createLinearGradient(f, 0, f + 140, 0); sg.addColorStop(0, 'rgba(40,30,20,0.28)'); sg.addColorStop(1, 'rgba(40,30,20,0)');
  g.fillStyle = sg; g.fillRect(f, 0, 140, H);
  // the back of the turning page: warm paper, a ghost of the picture through it, darker toward the fold
  if (bw > 2) {
    g.save(); g.beginPath(); g.rect(f - bw, 0, bw, H); g.clip();
    g.fillStyle = '#efe7d6'; g.fillRect(f - bw, 0, bw, H);
    g.globalAlpha = 0.07; g.translate(f * 2 - bw * 0.0, 0); g.scale(-1, 1); g.drawImage(A, 0, 0); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
    const bg = g.createLinearGradient(f - bw, 0, f, 0); bg.addColorStop(0, 'rgba(60,45,30,0.16)'); bg.addColorStop(0.7, 'rgba(60,45,30,0.02)'); bg.addColorStop(1, 'rgba(60,45,30,0.22)');
    g.fillStyle = bg; g.fillRect(f - bw, 0, bw, H);
    g.restore();
    g.strokeStyle = 'rgba(60,45,30,0.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(f - bw, 0); g.lineTo(f - bw, H); g.stroke();
  }
}

// ——————————————————————————————————————————— pages ———————————————————————————————————————————
const BT = (P, i) => (P.bt[i] ? P.bt[i].t0 : 1e9);

// Title: a blank page, mountains drawn under a hand-lettered title
function pTitle(t, P) {
  mountains(BGf, BGl, [[260, 640], [620, 520], [980, 600], [1360, 470], [1700, 590]], 860, pr(t, 0.2, 1.8), pr(t, 1.6, 3.2), 11);
  hill(BGf, BGl, [[-100, 860], [400, 820], [900, 850], [1400, 815], [2020, 850], [2020, 1100], [-100, 1100]], pr(t, 1.2, 2.2), pr(t, 2.6, 3.6), 21);
  for (let i = 0; i < 7; i++) walnut(BGf, BGl, 180 + i * 260 + (i % 2) * 40, 860 - (i % 2) * 14, 44 + 10 * (i % 3), pr(t, 2.0 + i * 0.1, 2.8 + i * 0.1), pr(t, 3.2 + i * 0.1, 4.0 + i * 0.1), 31 + i * 9);
  text(BGl, 'Жылдыз булак', sx(960), sy(330), { size: 190 * CAM.s, weight: 700, col: K.ink, reveal: pr(t, 3.4, 5.4), seed: 5, p: 0.95, stroke: 3 });
  text(BGl, 'кыз, бала жана сыйкырдуу Жылдызча жөнүндө жомок', sx(960), sy(430), { size: 58 * CAM.s, col: K.violet, reveal: pr(t, 5.8, 7.4), seed: 6, p: 0.9 });
  if (t > 4.8) star5({ k: CH.k, f: CH.f, l: CH.l }, [1530, 210], 26 * clamp((t - 4.8) / 0.4), 77, 0.2);
  return {};
}
PAGES[0].cam = t => [960, 540 + 10 * pr(t, 7, 9.5), 1 + 0.04 * ss(pr(t, 7, 9.5))];
ev(0, 'paper'); ev(0.2, 'scratch', { dur: 1.6, pan: -0.3 }); ev(1.6, 'scribble', { dur: 2.0, pan: 0.2 }); ev(2.0, 'scratch', { dur: 1.0, pan: 0.4 }); ev(3.4, 'write', { dur: 2.0, pan: 0 }); ev(5.8, 'write', { dur: 1.6, pan: 0.1 }); ev(4.8, 'glint', { pan: 0.5 });
ev(0, 'cue', { id: 'title' });

// Page 1: the village
function p1(t, P) {
  skyHatch(BGf, -200, 520, K.sky, pr(t, 2.2, 3.6) * 0.9, 101, 0.22);
  sun(BGf, BGl, 1660, 150, 62, pr(t, 0.4, 1.0), pr(t, 1.0, 1.6), 111);
  mountains(BGf, BGl, [[200, 300], [560, 210], [900, 320], [1250, 180], [1620, 300]], 520, pr(t, 0, 1.2), pr(t, 1.2, 2.4), 121);
  hill(BGf, BGl, [[-100, 560], [500, 500], [1100, 540], [1700, 490], [2020, 520], [2020, 1100], [-100, 1100]], pr(t, 0.6, 1.4), pr(t, 1.6, 3.0), 131, K.grass, 0.45);
  for (let i = 0; i < 9; i++) walnut(BGf, BGl, 100 + i * 220, 540 - (i % 2) * 18, 34 + 8 * (i % 3), pr(t, 1.0 + i * 0.06, 1.6 + i * 0.06), pr(t, 2.0 + i * 0.06, 2.6 + i * 0.06), 141 + i * 7, { col: i % 2 ? K.grass : '#4f8a3e' });
  house(BGf, BGl, 240, 790, 170, 130, pr(t, 1.6, 2.4), pr(t, 2.6, 3.4), 201);
  house(BGf, BGl, 640, 760, 140, 110, pr(t, 1.8, 2.6), pr(t, 2.8, 3.6), 211, { roof: K.blue });
  house(BGf, BGl, 1460, 800, 190, 140, pr(t, 2.0, 2.8), pr(t, 3.0, 3.8), 221);
  [120, 560, 1060, 1380, 1860].forEach((x, i) => poplar(BGf, BGl, x, 800 - (i % 2) * 20, 260, pr(t, 2.4 + i * 0.08, 3.0 + i * 0.08), pr(t, 3.2 + i * 0.08, 3.8 + i * 0.08), 231 + i * 5));
  [0, 1, 2].forEach(k => bird(BGl, 700 + k * 70 + 30 * Math.sin(t * 0.5), 200 + 20 * k, 1.2, 251 + k, Math.floor(t * 4 + k) % 2, pr(t, 3, 3.3)));
  // the children in front of grandma's house
  if (t > 3.4) {
    const hop = Math.floor((t - 3.4) * 2.4) % 2;   // Nurbek can't stand still: two drawings on the beat
    kid(CH, { x: 1060, y: 880, s: 0.78, who: 'a', expr: 'smile', arms: t > BT(P, 1) ? { L: [[-34, -190], [-50, -150], [-56, -112]], R: [[34, -190], [74, -236], [92, -290 + 14 * (Math.floor(t * 3) % 2)]] } : 'down', seed: 300 });
    kid(CH, { x: 1290, y: 880 - hop * 22, s: 0.7, who: 'n', expr: hop ? 'happy' : 'smile', arms: hop ? 'up' : 'down', legs: hop ? 'walkA' : 'stand', seed: 500 });
  }
  return {};
}
PAGES[1].camF = t => {
  const P = PAGES[1]; const b1 = BT(P, 1);
  return track([[0, [960, 540, 1]], [b1 - 0.6, [960, 540, 1]], [b1 + 1.4, [1170, 700, 1.55]], [P.dur, [1180, 690, 1.6]]])(t);
};

// Page 2: dusk at the edge of the walnut forest; something glows under a root
function p2(t, P) {
  skyHatch(BGf, -200, 300, K.violet, pr(t, 0.4, 1.6), 301, 0.28);
  skyHatch(BGf, 280, 560, K.rose, pr(t, 0.8, 2.0), 302, 0.3);
  sun(BGf, BGl, 1500, 560, 70, pr(t, 0.2, 0.6), pr(t, 0.6, 1.2), 311, K.red);
  hill(BGf, BGl, [[-100, 640], [700, 600], [1300, 650], [2020, 610], [2020, 1100], [-100, 1100]], pr(t, 0.3, 1.0), pr(t, 1.0, 2.2), 321, K.grass, 0.5);
  walnut(BGf, BGl, 620, 860, 260, pr(t, 0.4, 1.8), pr(t, 1.4, 3.0), 331, { roots: true });
  walnut(BGf, BGl, 140, 760, 140, pr(t, 0.6, 1.6), pr(t, 1.6, 2.8), 341);
  walnut(BGf, BGl, 1180, 700, 110, pr(t, 0.8, 1.8), pr(t, 1.8, 2.8), 351);
  // fireflies (lemon dots, on twos)
  if (t > 2) for (let k = 0; k < 9; k++) { const ph = (t * 0.6 + hash(k) * 4) % 4; if (ph > 1.2) continue; dab(FX, 200 + hash(k * 3) * 1500, 300 + hash(k * 5) * 400 - ph * 30, 4, { col: K.lemon, p: Math.sin(ph / 1.2 * Math.PI), seed: 360 + k }); }
  // the creature under the root: the light flickers
  const fl = 0.25 + 0.25 * (Math.floor(t * 6) % 3 === 0 ? 0 : 1) * (0.6 + 0.4 * Math.sin(t * 3));
  if (t > 1.6) zhyl(CH2, { x: 640, y: 830, s: 0.9, glow: fl, expr: t > BT(P, 1) + 1 ? 'sad' : 'closed', seed: 900, tailK: 0.9 }, FX);
  // the children tiptoe in from the right
  const w = pr(t, 2.2, BT(P, 1) + 2.0), step = Math.floor(t * 3) % 2;
  const ax = lerp(2080, 1250, eo(w)), nx = ax + 200;
  kid(CH, { x: ax, y: 880, s: 0.72, who: 'a', expr: t > BT(P, 1) + 1.6 ? 'surprised' : 'worried', legs: w < 1 ? (step ? 'walkA' : 'walkB') : 'stand', arms: w < 1 ? 'down' : 'hold', seed: 300, flip: true });
  kid(CH, { x: nx, y: 880, s: 0.66, who: 'n', expr: t > BT(P, 1) + 1.6 ? 'surprised' : 'worried', legs: w < 1 ? (step ? 'walkB' : 'walkA') : 'stand', arms: 'hold', seed: 500, flip: true });
  return {};
}
PAGES[2].camF = t => {
  const P = PAGES[2]; const b1 = BT(P, 1);
  return track([[0, [960, 540, 1]], [b1 - 0.6, [960, 540, 1]], [b1 + 2.2, [700, 720, 1.9]], [P.dur, [670, 745, 2.1]]])(t);
};

// Page 3: the creature speaks; a decision
function p3(t, P) {
  skyHatch(BGf, -200, 700, K.violet, pr(t, 0.2, 1.2), 401, 0.22);
  hill(BGf, BGl, [[-100, 760], [800, 730], [2020, 760], [2020, 1100], [-100, 1100]], pr(t, 0.2, 0.8), pr(t, 0.6, 1.4), 411, K.grass, 0.5);
  // a great root, the creature stands on it
  const root = smooth([[260, 780], [420, 700], [640, 690], [820, 730], [900, 790], [760, 760], [560, 750], [380, 790]], 5);
  fill(BGf, root, { col: K.brown, p: 0.75, gap: 9, w: 11, ang: 1.0, seed: 421, draw: pr(t, 0.6, 1.4), boil: 0 });
  line(BGl, root, { w: 6, seed: 422, draw: pr(t, 0.2, 0.8), boil: 0.6 });
  const trunk = [[-60, 720], [-40, -100], [300, -100], [330, 720]];
  fill(BGf, trunk, { col: K.brown, p: 0.6, gap: 12, w: 13, ang: 1.45, seed: 431, draw: pr(t, 0.4, 1.4), boil: 0 });
  line(BGl, [[330, 720], [300, -100]], { w: 7, seed: 432, draw: pr(t, 0.2, 0.8), boil: 0.6 });
  const talking = P.bt.slice(0, 2).some(b => t > b.t0 && t < b.t0 + b.w + 0.6);
  const mouth = talking && Math.floor(t * 8) % 2 ? 'talk' : 'open';
  const b2 = BT(P, 2);
  zhyl(CH2, { x: 620, y: 640, s: 2.3, glow: t > b2 ? 0.55 : 0.32 + 0.1 * Math.sin(t * 4), expr: t > BT(P, 1) && t < b2 ? (talking ? mouth : 'sad') : (t > b2 + 3 ? 'happy' : mouth), tear: t > BT(P, 1) + 1 && t < b2, seed: 900, look: 1, sway: Math.sin(t * 1.5) * 0.4 }, FX);
  // Nurbek asks (looks to his sister), Aizada nods (two drawings: head up / head down)
  const nod = t > b2 + 2.6 && t < b2 + 4.4 ? Math.floor(t * 5) % 2 : 0;
  kid(CH, { x: 1220, y: 930 + nod * 8, s: 1.0, who: 'a', expr: t > b2 + 2.6 ? 'brave' : 'worried', legs: 'kneel', arms: t > b2 + 2.6 ? 'hold' : 'down', seed: 300, flip: true });
  kid(CH, { x: 1560, y: 940, s: 0.92, who: 'n', expr: t > b2 ? (t > b2 + 3.6 ? 'happy' : 'worried') : 'surprised', legs: 'kneel', arms: t > b2 && t < b2 + 2.6 ? 'reach' : 'down', seed: 500, flip: t > b2 && t < b2 + 2.6 ? false : true });
  return {};
}
PAGES[3].camF = t => { const P = PAGES[3]; const b2 = BT(P, 2); return track([[0, [900, 560, 1.1]], [b2 - 0.5, [800, 560, 1.18]], [b2 + 1.5, [1120, 640, 1.15]], [P.dur, [1080, 620, 1.12]]])(t); };

// Page 4: grandma's room at night: bread, apricots, lantern, a blessing
function p4(t, P) {
  fill(BGf, [[-200, -200], [2120, -200], [2120, 700], [-200, 700]], { col: K.mustard, p: 0.35, gap: 14, w: 14, ang: 1.0, seed: 501, draw: pr(t, 0.6, 2.0), boil: 0 });
  line(BGl, [[-200, 700], [2120, 700]], { w: 6, seed: 502, draw: pr(t, 0, 0.6), boil: 0.6 });
  shyrdak(BGf, BGl, 120, 760, 1800, 900, pr(t, 0.3, 1.4), pr(t, 1.0, 2.4), 511);
  // window with the night and a crescent moon
  const win = [[1340, 140], [1700, 140], [1700, 460], [1340, 460]];
  fill(BGf, win, { col: K.blue, p: 0.85, gap: 8, w: 10, seed: 521, draw: pr(t, 1.0, 1.8), boil: 0 });
  line(BGl, [...win, win[0]], { w: 8, col: K.brown, seed: 522, draw: pr(t, 0.4, 1.0), boil: 0.6 });
  line(BGl, [[1520, 140], [1520, 460]], { w: 6, col: K.brown, seed: 523, draw: pr(t, 0.4, 1.0), boil: 0.6 });
  const moonC = []; for (let i = 0; i <= 20; i++) { const a = -1.9 + 3.8 * i / 20; moonC.push([1430 + Math.cos(a) * 40, 250 + Math.sin(a) * 40]); } for (let i = 0; i <= 20; i++) { const a = 1.7 - 3.4 * i / 20; moonC.push([1412 + Math.cos(a) * 34, 246 + Math.sin(a) * 34]); }
  fill(BGf, moonC, { col: K.lemon, p: 0.95, gap: 5, w: 7, seed: 524, draw: pr(t, 1.6, 2.0), boil: 0 });
  // low table with bread and apricots, a lantern
  const tab = [[180, 700], [620, 700], [600, 760], [200, 760]];
  fill(BGf, tab, { col: K.brown, p: 0.7, gap: 8, w: 10, seed: 531, draw: pr(t, 1.2, 2.0), boil: 0 });
  line(BGl, [...tab, tab[0]], { w: 6, seed: 532, draw: pr(t, 0.6, 1.2), boil: 0.6 });
  const bag = t > BT(P, 0) + 1.0;
  if (!bag) {
    const nan = handCircle(300, 676, 46, 533, 0.05, 30).map(([x, y]) => [x, 676 + (y - 676) * 0.45]);
    fill(BGf, nan, { col: K.mustard, p: 0.9, gap: 6, w: 8, seed: 534, draw: pr(t, 1.6, 2.2), boil: 0 }); line(BGl, nan, { w: 5, seed: 535, draw: pr(t, 1.0, 1.4) });
    for (let k = 0; k < 4; k++) dab(BGf, 420 + k * 26, 684 - (k % 2) * 10, 11, { col: K.lemon, p: 0.95, seed: 536 + k });
  }
  // lantern on the table (its glow)
  const lx = 540, ly = 640;
  part(CH2, [[lx - 22, ly + 50], [lx + 22, ly + 50], [lx + 18, ly - 10], [lx - 18, ly - 10]], { col: K.lemon, p: 0.9, gap: 4, w: 6, seed: 541 }, { w: 5, seed: 542 });
  line(CH2.l, [[lx - 14, ly - 10], [lx, ly - 34], [lx + 14, ly - 10]], { w: 5, seed: 543 });
  glow(FX, [lx, ly + 18], 0.8, 544);
  // grandma, the cloth bag, the children
  const bless = t > BT(P, 1) + 0.6;
  granny(CH, { x: 980, y: 920, s: 1.12, arms: bless ? { L: [[-40, -196], [-110, -224], [-170, -206]], R: [[40, -196], [110, -224], [170, -206]] } : (bag ? 'hold' : 'down'), seed: 700 });
  if (bag) { const bx = bless ? 1300 : 980, by = bless ? 820 : 760; part(CH, handCircle(bx, by, 40, 551, 0, 24), { col: K.sky, p: 0.75, gap: 7, w: 9, seed: 552 }, { w: 6, seed: 553 }); line(CH.l, [[bx - 20, by - 36], [bx, by - 60], [bx + 20, by - 36]], { w: 5, seed: 554 }); }
  kid(CH, { x: 760, y: 930, s: 0.82, who: 'a', expr: bless ? 'happy' : 'smile', seed: 300 });
  kid(CH, { x: 1200, y: 930, s: 0.76, who: 'n', expr: bless ? 'happy' : 'smile', arms: bless ? 'hold' : 'down', seed: 500 });
  zhyl(CH, { x: 712, y: 690, s: 0.55, glow: 0.5, expr: 'open', seed: 900 }, FX);
  return { lamp: [0.3, 0.38, 0.65, 0.75 * pr(t, 0.5, 2.5)] };
}
PAGES[4].camF = t => { const P = PAGES[4]; const b1 = BT(P, 1); return track([[0, [960, 540, 1]], [b1 - 0.3, [960, 560, 1.06]], [b1 + 2.0, [980, 600, 1.38]], [P.dur, [980, 610, 1.42]]])(t); };

// ——— The mountain: one tall page, four sections stacked (forest at the bottom, fog at the top) ———
// Section n lives in local coords 0..1920 × 0..1080 at world y = n × 1080. The camera climbs between them.
function camSection(P, tl) {
  const b = i => BT(P, i);
  if (P.id === 5) return track([[0, [960, 600, 1.0]], [b(1) - 0.3, [960, 560, 1.0]], [b(1) + 1.8, [900, 640, 1.3]], [P.dur, [940, 600, 1.15]]])(tl);
  if (P.id === 6) return track([[0, [960, 540, 1.0]], [b(1) + 4.6, [960, 580, 1.06]], [P.dur, [1300, 640, 1.2]]])(tl);
  if (P.id === 7) return track([[0, [960, 520, 1.0]], [b(1) - 0.3, [1000, 560, 1.05]], [b(1) + 1.8, [1060, 660, 1.6]], [P.dur, [1080, 660, 1.65]]])(tl);
  return track([[0, [960, 520, 1.0]], [b(1) - 0.5, [960, 540, 1.0]], [b(1) + 1.6, [960, 620, 1.35]], [b(2) + 0.5, [960, 600, 1.2]], [b(3), [960, 520, 0.96]], [P.dur, [960, 500, 0.94]]])(tl);
}
function mountainAt(tg, pan) {
  // camera in world coords (section y offsets added)
  let cam;
  const wy = P => P.mt * 1080;
  if (pan) {
    const a = camSection(pan.A, pan.A.dur), b = camSection(pan.B, 0), u = eio(pr(tg, pan.t0, pan.t1));
    cam = [lerp(a[0], b[0], u), lerp(a[1] + wy(pan.A), b[1] + wy(pan.B), u), lerp(a[2], b[2], u) * (1 - 0.18 * Math.sin(u * Math.PI))];
  } else { const P = MT.find(P => tg >= P.t0 && tg < P.t0 + P.dur + 1e-6) || MT[MT.length - 1]; const c = camSection(P, tg - P.t0); cam = [c[0], c[1] + wy(P), c[2]]; }
  // draw each section with the camera shifted into its local coords (only sections in view)
  let lamp = null;
  MT.forEach(P => {
    const y0 = wy(P); if (Math.abs(cam[1] - (y0 + 540)) > 1500) return;
    const tl = tg - P.t0; if (tl < -0.01 && !(pan && pan.B === P)) return;
    CAM.x = cam[0]; CAM.y = cam[1] - y0; CAM.s = cam[2];
    SECTION[P.id](Math.max(0, tl), P);
  });
  CAM.x = cam[0]; CAM.y = cam[1]; CAM.s = cam[2];
  return {};
}
const SECTION = {
  5(t, P) {   // morning walnut forest: play, tumbles, the light grows
    skyHatch(BGf, -60, 300, K.sky, pr(t, 0.2, 1.4), 601, 0.2);
    sun(BGf, BGl, 240, 140, 52, pr(t, 0.1, 0.5), pr(t, 0.5, 1.0), 611);
    hill(BGf, BGl, [[-200, 820], [600, 780], [1300, 810], [2120, 770], [2120, 1150], [-200, 1150]], pr(t, 0.2, 0.8), pr(t, 0.8, 1.8), 621, K.grass, 0.5);
    const trees = [[160, 800, 130], [560, 770, 170], [1020, 790, 150], [1460, 760, 180], [1840, 790, 120]];
    trees.forEach(([x, y, r], i) => walnut(BGf, BGl, x, y, r, pr(t, 0.3 + i * 0.12, 1.1 + i * 0.12), pr(t, 1.0 + i * 0.12, 2.0 + i * 0.12), 631 + i * 11, { col: i % 2 ? K.grass : '#4f8a3e' }));
    [0, 1, 2, 3].forEach(k => bird(BGl, 500 + k * 110 + 40 * Math.sin(t * 0.7 + k), 160 + 30 * (k % 2), 1.1, 681 + k, Math.floor(t * 4 + k) % 2, pr(t, BT(P, 0) + 0.5, BT(P, 0) + 0.8)));
    // Zhyldyzcha leaps from crown to crown, two beats per hop
    const hops = [[560, 470], [1020, 500], [1460, 430], [1020, 500], [560, 470]];
    const b1 = BT(P, 1), ph = Math.max(0, (t - b1) / (BAR * 1.0));
    const i = Math.min(hops.length - 2, Math.floor(ph)), u = ph - Math.floor(ph);
    const a = hops[i], b = hops[i + 1]; const done = ph >= hops.length - 1;
    const q = t < b1 ? [560, 470] : done ? hops[hops.length - 1] : [lerp(a[0], b[0], u), lerp(a[1], b[1], u) - 200 * Math.sin(u * Math.PI)];
    const g = 0.35 + 0.65 * pr(t, BT(P, 1) + 1, BT(P, 1) + 7);
    if (t > 1.2) zhyl(CH2, { x: q[0], y: q[1], s: 1.0, glow: g, expr: 'happy', seed: 900, r: t > b1 && !done ? (u - 0.5) * 0.6 : 0, sway: Math.sin(t * 3) }, FX);
    // the children: Aizada laughs, Nurbek runs, tumbles (two drawings), gets up laughing
    const tumble = t > b1 + 1.6 && t < b1 + 6.0 && Math.floor((t - b1) * 1.6) % 3 === 1;
    kid(CH, { x: 640, y: 880, s: 0.86, who: 'a', expr: t > b1 ? 'happy' : 'smile', arms: t > b1 ? 'up' : 'down', seed: 300 });
    const nx = t < b1 ? 1100 : lerp(1100, 900, (Math.sin((t - b1) * 0.9) + 1) / 2);
    if (tumble) kid(CH, { x: nx, y: 910, s: 0.8, who: 'n', expr: 'happy', legs: 'sit', arms: 'up', r: -0.35, seed: 500 });
    else kid(CH, { x: nx, y: 880, s: 0.8, who: 'n', expr: t > b1 ? 'happy' : 'smile', legs: Math.floor(t * 3) % 2 ? 'walkA' : 'walkB', arms: t > b1 ? 'reach' : 'down', seed: 500, flip: Math.cos((t - b1) * 0.9) < 0 });
  },
  6(t, P) {   // the river: courage, stones lit one by one
    skyHatch(BGf, -60, 260, K.sky, pr(t, 0.1, 0.8), 701, 0.18);
    hill(BGf, BGl, [[-200, 360], [700, 300], [1400, 340], [2120, 290], [2120, 600], [-200, 600]], pr(t, 0.1, 0.6), pr(t, 0.5, 1.2), 711, K.grass, 0.45);
    river(BGf, BGl, 560, 800, pr(t, 0.2, 0.9), pr(t, 0.6, 1.6), 721, t);
    hill(BGf, BGl, [[-200, 820], [700, 840], [2120, 820], [2120, 1150], [-200, 1150]], pr(t, 0.3, 0.8), pr(t, 0.8, 1.6), 731, K.grass, 0.45);
    const ST = [[520, 700], [760, 650], [1000, 700], [1240, 650], [1480, 700]];
    const b1 = BT(P, 1), b2 = b1 + 4.8;
    ST.forEach(([x, y], k) => { const lt = b1 + 3.2 + k * 0.7; stone(BGf, BGl, x, y, 70, 30, pr(t, 0.5 + k * 0.1, 1.0 + k * 0.1), pr(t, 0.9 + k * 0.1, 1.4 + k * 0.1), 741 + k * 5, t > lt ? 1 : 0); if (t > lt && t < lt + 0.8) glow(FX, [x, y - 6], 0.6 * (1 - pr(t, lt, lt + 0.8)) + 0.2, 760 + k); });
    // children: Nurbek steps back, Aizada holds his hand; then they cross stone to stone
    let ax = 320, nx = 180, ay = 880, ny = 880;
    if (t > b2) { const ph = (t - b2 - 0.4) / 0.9; const k = clamp(Math.floor(ph), -1, ST.length); const u = ph - Math.floor(ph);
      const at = j => j < 0 ? [320, 880] : j >= ST.length ? [1720, 880] : [ST[j][0], ST[j][1] + 8];
      const A0 = at(k), A1 = at(k + 1); const hopU = k >= ST.length ? 1 : eo(clamp(u * 1.6));
      ax = lerp(A0[0], A1[0], hopU); ay = lerp(A0[1], A1[1], hopU) - 60 * Math.sin(hopU * Math.PI);
      const N0 = at(k - 1), N1 = at(k); nx = lerp(N0[0], N1[0], hopU); ny = lerp(N0[1], N1[1], hopU) - 50 * Math.sin(hopU * Math.PI);
      if (k >= ST.length) { ax = 1740; ay = 880; nx = 1580; ny = 880; }
    }
    const scared = t > BT(P, 0) + 2.5 && t < b1 + 1.0;
    kid(CH, { x: ax, y: ay, s: 0.68, who: 'a', expr: t > b1 ? 'brave' : 'worried', arms: t > b1 ? { L: [[-34, -190], [-60, -150], [-96, -150]], R: [[34, -190], [60, -220], [70, -270]] } : 'down', seed: 300, flip: false });
    kid(CH, { x: nx - (scared ? 40 : 0), y: ny, s: 0.62, who: 'n', expr: scared ? 'cry' : t > b1 ? 'worried' : 'surprised', arms: t > b1 ? { L: [[-34, -190], [-50, -150], [-56, -112]], R: [[34, -190], [70, -160], [104, -156]] } : 'hold', seed: 500, tearT: 0.3 });
    zhyl(CH2, { x: ax + 30, y: ay - 300, s: 0.75, glow: 0.8, expr: 'open', seed: 900, sway: Math.sin(t * 2) }, FX);
  },
  7(t, P) {   // steep path: the light fades, the kalpak becomes a nest, bread is shared
    skyHatch(BGf, -60, 400, K.mustard, pr(t, 0.1, 0.9), 801, 0.22);
    mountains(BGf, BGl, [[300, 260], [800, 140], [1300, 230], [1750, 120]], 560, pr(t, 0.1, 0.8), pr(t, 0.6, 1.6), 811);
    hill(BGf, BGl, [[-200, 600], [800, 560], [2120, 600], [2120, 1150], [-200, 1150]], pr(t, 0.2, 0.7), pr(t, 0.7, 1.5), 821, K.brown, 0.35);
    // the path draws itself ahead of them (zigzag up the slope)
    const path = [[200, 1000], [700, 900], [400, 800], [900, 700], [700, 620]];
    line(BGl, path, { w: 9, col: K.brown, seed: 831, draw: pr(t, 0.2, BT(P, 1) + 2), boil: 0.6 });
    [[1500, 860], [1700, 760], [300, 700]].forEach(([x, y], k) => stone(BGf, BGl, x, y, 46, 24, pr(t, 0.4, 0.9), pr(t, 0.8, 1.4), 841 + k * 5));
    const b1 = BT(P, 1), sit = t > b1;
    const step = Math.floor(t * 2.5) % 2;
    const ax = sit ? 1000 : lerp(600, 980, pr(t, 0, b1)), nx = sit ? 1240 : ax + 180;
    kid(CH, { x: ax, y: 900, s: 0.86, who: 'a', expr: 'worried', legs: sit ? 'sit' : (step ? 'walkA' : 'walkB'), seed: 300 });
    const capped = t > BT(P, 0) + 2.6;
    kid(CH, { x: nx, y: 900, s: 0.8, who: 'n', expr: sit ? 'smile' : 'worried', legs: sit ? 'sit' : (step ? 'walkB' : 'walkA'), arms: capped ? 'hold' : 'down', hatOff: capped, seed: 500 });
    // the kalpak nest in Nurbek's hands with Zhyldyzcha inside
    const hx = nx, hy = 900 - 0.8 * 150;
    const zg = sit ? 0.15 + 0.25 * pr(t, b1 + 3, b1 + 6) : lerp(0.5, 0.12, pr(t, 0, BT(P, 0) + 4));
    if (capped) {
      zhyl(CH, { x: hx, y: hy - 40, s: 0.7, glow: zg, expr: sit && t > b1 + 3 ? 'happy' : 'closed', dim: !sit, seed: 900, tailK: 0.6 }, FX);
      const cap = smooth([[-62, -10], [-54, 30], [0, 44], [54, 30], [62, -10], [0, 2]], 4).map(([x, y]) => [hx + x * 0.9, hy + y * 0.9]);
      part(CH, cap, null, { w: 6, seed: 851 });
      part(CH, [[-70, -14], [70, -14], [66, 2], [-66, 2]].map(([x, y]) => [hx + x * 0.9, hy + y * 0.9]), { col: K.ink, p: 0.8, gap: 5, w: 8, ang: 0.1, seed: 852 }, { w: 5, seed: 853 });
      if (sit && t > b1 + 1.5) { const nan = handCircle(hx - 70, hy - 20, 18, 854, 0.05, 20); part(CH, nan, { col: K.mustard, p: 0.9, gap: 5, w: 7, seed: 855 }, { w: 4, seed: 856 }); }
    } else zhyl(CH2, { x: ax + 90, y: 900 - 150, s: 0.7, glow: zg, expr: 'sad', dim: true, seed: 900, tailK: 0.7 }, FX);
  },
  8(t, P) {   // fog, fear, a song; the light comes back and pushes the fog away
    skyHatch(BGf, -60, 1150, K.violet, pr(t, 0.1, 0.8), 901, 0.18);
    mountains(BGf, BGl, [[200, 320], [700, 220], [1200, 300], [1700, 200]], 700, pr(t, 0.1, 0.6), pr(t, 0.4, 1.2), 911, { p: 0.4 });
    hill(BGf, BGl, [[-200, 760], [900, 730], [2120, 760], [2120, 1150], [-200, 1150]], pr(t, 0.2, 0.6), pr(t, 0.5, 1.2), 921, K.brown, 0.35);
    const b1 = BT(P, 1), b2 = BT(P, 2), b3 = BT(P, 3);
    const singing = t > b2 + 0.4;
    const g = singing ? 0.2 + 1.1 * eo(pr(t, b2 + 2.6, b2 + 5.5)) : 0.12;
    const zx = 960, zy = 640;
    // kids: Nurbek cries, Aizada hugs; both sing
    const hugA = t > b1 + 2.4;
    kid(CH, { x: 860, y: 900, s: 0.9, who: 'a', expr: singing ? 'sing' : hugA ? 'worried' : 'worried', arms: hugA ? { L: [[-34, -190], [-50, -150], [-56, -112]], R: [[34, -190], [96, -190], [150, -170]] } : 'down', seed: 300 });
    kid(CH, { x: 1080, y: 900, s: 0.82, who: 'n', expr: singing ? 'sing' : t > b1 ? 'cry' : 'worried', tearT: pr(t, b1, b1 + 1.5), arms: 'hold', hatOff: true, seed: 500 });
    zhyl(CH2, { x: zx, y: zy, s: 0.9, glow: g, expr: g > 0.6 ? 'happy' : 'closed', seed: 900, tailK: 0.6 + 0.4 * pr(t, b2 + 2.6, b2 + 4), dim: g < 0.4 }, FX);
    if (g > 0.6) glow(FX, [zx + 50, zy - 80], (g - 0.4) * 2, 931);
    // music notes from the song
    if (singing && t < b3 + 6) for (let j = 0; j < 10; j++) { const t0 = b2 + 0.4 + BAR * 0.66 * j; const u = (t - t0) / 3.0; if (u < 0 || u > 1) continue; noteGlyph(FX, 960 + (j % 2 ? 1 : -1) * (60 + 220 * u) + 20 * Math.sin(u * 6 + j), 700 - 300 * u, j, 1 - pr(u, 0.6, 1), 0.9); }
    // the fog: thick, then pushed back in a growing circle by the light
    const dens = pr(t, 0.2, 2.6), hole = 120 + 1400 * eo(pr(t, b2 + 3.0, b3 + 5.0));
    fog(FX, zx, zy - 60, hole, dens, 941, t);
  },
};
// mountain events
(() => {
  const P5 = PAGES[5], P6 = PAGES[6], P7 = PAGES[7], P8 = PAGES[8];
  ev(P5.t0, 'cue', { id: 'forest' }); ev(P5.t0 + BT(P5, 0), 'birds', { dur: P5.dur - BT(P5, 0) });
  for (let k = 0; k < 4; k++) ev(P5.t0 + BT(P5, 1) + k * BAR, 'hop');
  [1.6 + 1 / 1.6, 1.6 + 4 / 1.6].forEach(d => ev(P5.t0 + BT(P5, 1) + d, 'tumble'));
  ev(P6.t0, 'cue', { id: 'river' }); ev(P6.t0 - 1.0, 'water', { dur: P6.dur + 1.6 });
  for (let k = 0; k < 5; k++) ev(P6.t0 + BT(P6, 1) + 3.2 + k * 0.7, 'plink', { i: k, pan: -0.6 + k * 0.3 });
  for (let k = 0; k < 6; k++) ev(P6.t0 + BT(P6, 1) + 4.8 + 0.4 + k * 0.9 + 0.3, 'step', { pan: -0.6 + k * 0.25 });
  ev(P7.t0, 'cue', { id: 'path' }); ev(P7.t0, 'wind', { dur: P7.dur, v: 0.5 });
  ev(P8.t0, 'cue', { id: 'fog' }); ev(P8.t0, 'wind', { dur: BT(P8, 2) + 1.0, v: 1.0 });
  ev(P8.t0 + BT(P8, 2) - 0.6, 'silence', { dur: 1.0 }); ev(P8.t0 + BT(P8, 2) + 0.4, 'cue', { id: 'song' });
  ev(P8.t0 + BT(P8, 2) + 2.6, 'relight');
})();

// Page 9: the Star Spring — a held wide while the ultramarine wash reveals white-wax stars, spring and reflections
const WASH_BANDS = [[0.4, 2.6, 0, 420, 1], [2.0, 4.2, 380, 780, -1], [3.6, 5.8, 740, 1140, 1]];
function drawWashBands(L, t, bands, full = false) {
  const g = L.g;
  let done = -1e9;
  bands.forEach(([a, b, y0, y1], k) => { if (full || t >= b) done = Math.max(done, y1 + 30); });
  if (done > -1e8) { g.save(); g.fillStyle = 'rgba(0,0,0,0.92)'; g.fillRect(sx(-300), sy(-300), sx(2220) - sx(-300), sy(done) - sy(-300)); g.restore(); }
  bands.forEach(([a, b, y0, y1, dir], k) => {
    const u = full ? 1 : eio(pr(t, a, b)); if (u <= 0 || u >= 1) return;
    const x1 = dir > 0 ? -200 + u * 2400 : 2120 - u * 2400;
    g.save(); g.fillStyle = 'rgba(0,0,0,0.92)'; g.beginPath();
    const ya = sy(Math.max(y0 - 30, done)), yb = sy(y1 + 30), xa = dir > 0 ? sx(-200) : sx(2120), xb = sx(x1);
    g.moveTo(xa, ya);
    for (let i = 0; i <= 12; i++) { const y = lerp(ya, yb, i / 12); g.lineTo(xb + 14 * Math.sin(i * 2.1 + k), y); }
    g.lineTo(xa, yb); g.closePath(); g.fill(); g.restore();
  });
}
function spring(Lw, cx, cy, d) {
  const sp = handCircle(0, 0, 1, 1001, 0, 50).map(([a, b]) => [cx + a * 330, cy + b * 80]);
  fill(Lw, sp, { col: K.white, p: 0.85, gap: 8, w: 10, ang: 0.1, seed: 1002, draw: d, boil: 0 });
  line(Lw, sp, { w: 6, col: K.sky, p: 0.6, seed: 1003, draw: d, boil: 0.5 });
}
function p9(t, P) {
  // white wax first (invisible on paper until the wash)
  whiteStars(WAX, 60, 1100, 0, 1920, 0, 520);
  spring(WAX, 960, 690, pr(t, 0.2, 1.2));
  whiteStars(WAX, 14, 1200, 680, 1240, 650, 730, 0.9);
  mountains(BGf, BGl, [[150, 360], [560, 260], [980, 340], [1400, 230], [1800, 340]], 600, pr(t, 0, 0.8), pr(t, 0.5, 1.4), 1011, { p: 0.6 });
  hill(BGf, BGl, [[-200, 620], [900, 590], [2120, 620], [2120, 1150], [-200, 1150]], pr(t, 0.1, 0.6), pr(t, 0.4, 1.2), 1021, K.grass, 0.45);
  drawWashBands(WASH, t, WASH_BANDS);
  // the creatures arrive around the spring after the wash, lights on, on the beat
  const b1 = BT(P, 1);
  const N = 34;
  for (let k = 0; k < N; k++) {
    const a = k / N * Math.PI * 2, rr = 1 + 0.25 * hash(k);
    const x = 960 + Math.cos(a) * 420 * rr, y = 690 + Math.sin(a) * 120 * rr - 10;
    const tk = b1 + 0.2 + k * 0.12;
    if (t > tk) zhyl(y < 690 ? CH2 : CH2, { x, y, s: 0.32 + 0.08 * hash(k + 3), glow: 0.9, expr: 'happy', seed: 1040 + k * 3, flip: Math.cos(a) > 0 }, FX);
  }
  kid(CH, { x: 1620, y: 960, s: 0.62, who: 'a', expr: t > 6 ? 'surprised' : 'smile', arms: t > b1 ? 'up' : 'hold', seed: 300, flip: true });
  kid(CH, { x: 1760, y: 960, s: 0.56, who: 'n', expr: t > 6 ? 'happy' : 'smile', arms: 'hold', hatOff: true, seed: 500, flip: true });
  zhyl(CH, { x: 1760, y: 790, s: 0.55, glow: 1, expr: 'happy', seed: 900 }, FX);
  return { wash: true };
}
PAGES[9].camF = t => { const P = PAGES[9]; const b1 = BT(P, 1); return track([[0, [960, 540, 1]], [6.0, [960, 540, 1]], [b1 - 0.4, [1000, 600, 1.1]], [b1 + 2.5, [960, 640, 1.25]], [P.dur, [960, 650, 1.28]]])(t); };

// Page 10: farewell, the golden walnut
function p10(t, P) {
  whiteStars(WAX, 50, 1300, 0, 1920, 0, 560);
  hill(BGf, BGl, [[-200, 700], [900, 670], [2120, 700], [2120, 1150], [-200, 1150]], pr(t, 0, 0.5), pr(t, 0.3, 1.0), 1311, K.grass, 0.45);
  spring(WAX, 400, 760, 1);
  drawWashBands(WASH, t, WASH_BANDS, true);
  const b1 = BT(P, 1), b2 = BT(P, 2);
  const back = t > b1 + 3;   // he comes back to the children
  const zx = back ? lerp(560, 1040, eo(pr(t, b1 + 3, b1 + 5))) : lerp(1040, 560, eo(pr(t, 0.3, 2.4)));
  zhyl(CH2, { x: 470, y: 740, s: 1.6, glow: 0.9, expr: 'happy', seed: 1350, flip: true }, FX);   // his mother
  zhyl(CH2, { x: zx, y: 780 - 30 * Math.abs(Math.sin(t * 5)) * (pr(t, 0.3, 2.4) < 1 || (back && pr(t, b1 + 3, b1 + 5) < 1) ? 1 : 0), s: 1.05, glow: 1, expr: 'happy', seed: 900, flip: !back }, FX);
  const nutT = b2 + 1.0;
  if (t > nutT) { const v = eio(pr(t, nutT + 0.8, nutT + 3.2)); const nx = lerp(zx + 30, 1410, v), ny = lerp(790, 790, v) - 90 * Math.sin(v * Math.PI); part(CH, handCircle(nx, ny, 24, 1361, 0, 24).map(([x, y]) => [x, ny + (y - ny) * 1.15]), { col: K.lemon, p: 0.95, gap: 4, w: 6, seed: 1362 }, { w: 5, col: K.mustard, seed: 1363 }); line(CH.l, [[nx, ny - 26], [nx, ny + 26]], { w: 3, col: K.mustard, seed: 1364 }); glow(FX, [nx, ny], 0.7 + 0.2 * Math.sin(t * 4), 1365); }
  const cry = t > b1 && t < b2 + 4;
  kid(CH, { x: 1320, y: 900, s: 0.92, who: 'a', expr: t > b2 + 4 ? 'happy' : 'smile', arms: t > BT(P, 1) + 4 ? { L: [[-34, -190], [-50, -150], [-56, -112]], R: [[34, -190], [100, -200], [160, -190]] } : 'down', seed: 300, flip: false });
  kid(CH, { x: 1520, y: 900, s: 0.84, who: 'n', expr: cry ? 'cry' : t > b2 + 4 ? 'happy' : 'smile', tearT: pr(t, b1, b1 + 2), arms: t > nutT ? 'reach' : 'hold', hatOff: false, seed: 500, flip: true });
  return { wash: true };
}
PAGES[10].camF = t => { const P = PAGES[10]; const b2 = BT(P, 2); return track([[0, [960, 560, 1]], [b2 - 0.5, [1050, 600, 1.12]], [b2 + 2.5, [1140, 640, 1.7]], [P.dur, [1140, 640, 1.72]]])(t); };

// Page 11: dawn, home: grandma at the gate; then planting the walnut in the courtyard
function p11(t, P) {
  skyHatch(BGf, -200, 420, K.rose, pr(t, 0.2, 1.6), 1401, 0.3);
  sun(BGf, BGl, 1820, 380, 60, pr(t, 0.2, 0.6), pr(t, 0.6, 1.2), 1411, K.lemon);
  mountains(BGf, BGl, [[100, 260], [500, 180], [900, 260], [1350, 160], [1800, 250]], 470, pr(t, 0, 0.8), pr(t, 0.6, 1.6), 1421, { p: 0.45 });
  hill(BGf, BGl, [[-200, 520], [900, 500], [2200, 520], [2200, 1150], [-200, 1150]], pr(t, 0.2, 0.7), pr(t, 0.6, 1.6), 1431, K.grass, 0.4);
  house(BGf, BGl, 120, 760, 180, 150, pr(t, 0.4, 1.2), pr(t, 1.0, 2.0), 1441, { lit: true });
  // painted wooden gate (blue) with posts
  const gx = 700, gy = 860;
  [[gx, gy, gx + 30, gy - 300], [gx + 360, gy, gx + 390, gy - 300]].forEach(([a, b, c, d], k) => { const R = [[a, b], [c, b], [c, d], [a, d]]; fill(BGf, R, { col: K.blue, p: 0.8, gap: 7, w: 9, seed: 1451 + k, draw: pr(t, 1.0, 1.8), boil: 0 }); line(BGl, [...R, R[0]], { w: 6, seed: 1453 + k, draw: pr(t, 0.6, 1.2), boil: 0.6 }); });
  line(BGl, [[gx, gy - 300], [gx + 195, gy - 360], [gx + 390, gy - 300]], { w: 8, col: K.blue, seed: 1455, draw: pr(t, 0.8, 1.4), boil: 0.6 });
  // the courtyard on the right: a patch of earth for the walnut
  const b1 = BT(P, 1);
  const soil = handCircle(1520, 900, 1, 1461, 0, 30).map(([a, b]) => [1520 + a * 150, 900 + b * 34]);
  fill(BGf, soil, { col: K.brown, p: 0.7, gap: 7, w: 9, seed: 1462, draw: pr(t, 1.2, 1.8), boil: 0 });
  // grandma at the gate; the children run in and are hugged
  const run = pr(t, BT(P, 0) + 0.5, BT(P, 0) + 4.5), step = Math.floor(t * 4) % 2;
  if (t < b1) {
    granny(CH, { x: gx + 195, y: 900, s: 1.0, arms: run > 0.8 ? 'hug' : 'down', expr: 'happy', seed: 700 });
    kid(CH, { x: lerp(-200, gx + 60, eo(run)), y: 920, s: 0.78, who: 'a', expr: 'happy', legs: run < 1 ? (step ? 'walkA' : 'walkB') : 'stand', arms: run < 1 ? 'down' : 'hug', seed: 300 });
    kid(CH, { x: lerp(-400, gx + 330, eo(run)), y: 920, s: 0.72, who: 'n', expr: 'happy', legs: run < 1 ? (step ? 'walkB' : 'walkA') : 'stand', arms: run < 1 ? 'down' : 'hug', seed: 500, flip: run >= 1 });
  } else {
    granny(CH, { x: 1840, y: 880, s: 0.9, arms: 'hold', expr: 'happy', seed: 700 });
    kid(CH, { x: 1380, y: 960, s: 0.8, who: 'a', expr: 'happy', legs: 'kneel', arms: { L: [[-34, -190], [-40, -130], [-10, -80]], R: [[34, -190], [60, -130], [120, -70]] }, seed: 300 });
    const pour = t > b1 + 2;
    kid(CH, { x: 1660, y: 960, s: 0.74, who: 'n', expr: 'happy', arms: { L: [[-34, -190], [-70, -160], [-110, -150]], R: [[34, -190], [10, -150], [-60, -150]] }, seed: 500 });
    // watering can (blue) with drops on twos
    const cx = 1560, cy = 840;
    part(CH, [[cx - 30, cy - 30], [cx + 30, cy - 30], [cx + 26, cy + 20], [cx - 26, cy + 20]], { col: K.blue, p: 0.8, gap: 5, w: 7, seed: 1471 }, { w: 5, seed: 1472 });
    line(CH.l, [[cx - 30, cy - 10], [cx - 80, cy - 34]], { w: 7, col: K.ink, seed: 1473 });
    if (pour) for (let k = 0; k < 6; k++) { const ph = ((t * 2 + k / 6) % 1); line(FX, [[cx - 84 - k * 3, cy - 30 + ph * 60], [cx - 88 - k * 3, cy - 14 + ph * 60]], { w: 4, col: K.sky, p: 1, seed: 1480 + k }); }
    if (t > b1 + 0.8) { star5(CH, [1520, 892], 10 + 4 * Math.sin(t * 5), 1490, 0, K.lemon); }
  }
  return {};
}
PAGES[11].camF = t => { const P = PAGES[11]; const b1 = BT(P, 1); return track([[0, [960, 540, 1]], [b1 - 1.4, [860, 600, 1.15]], [b1 + 0.8, [1500, 640, 1.35]], [P.dur, [1520, 650, 1.38]]])(t); };
(() => { const P = PAGES[11]; ev(P.t0, 'cue', { id: 'home' }); ev(P.t0, 'birds', { dur: P.dur }); ev(P.t0 + BT(P, 1) + 2, 'pour', { dur: 3 }); })();

// Page 12: years later — the big walnut tree, white-wax lights revealed by the night wash; pull out to the book
function p12(t, P) {
  whiteStars(WAX, 50, 1500, 0, 1920, 0, 360);
  // lights in the tree (white wax), drawn early: invisible until the wash
  for (let k = 0; k < 36; k++) { const a = hash(k * 1.7) * Math.PI * 2, r = Math.sqrt(hash(k * 2.9)); const x = 900 + Math.cos(a) * 380 * r, y = 300 + Math.sin(a) * 200 * r; dab(WAX, x, y, 9, { col: K.white, p: 1, seed: 1510 + k }); }
  hill(BGf, BGl, [[-200, 760], [900, 740], [2120, 760], [2120, 1150], [-200, 1150]], pr(t, 0, 0.5), pr(t, 0.3, 1.0), 1521, K.grass, 0.45);
  walnut(BGf, BGl, 900, 760, 300, pr(t, 0.2, 1.6), pr(t, 1.0, 2.6), 1531, { p: 0.55 });
  house(BGf, BGl, 1420, 780, 160, 130, pr(t, 0.6, 1.4), pr(t, 1.2, 2.0), 1541, { lit: true });
  drawWashBands(WASH, t, [[2.0, 3.8, 0, 420, 1], [3.0, 4.8, 380, 780, -1], [4.0, 5.6, 740, 1140, 1]]);
  // a bench and the grown-up children (a little taller), Zhyldyzcha on a branch, waving
  const bench = [[560, 800], [880, 800], [880, 820], [560, 820]];
  fill(BGf, bench, { col: K.brown, p: 0.8, gap: 6, w: 8, seed: 1551, draw: pr(t, 1.4, 2.0), boil: 0 }); line(BGl, [...bench, bench[0]], { w: 6, seed: 1552, draw: pr(t, 1.0, 1.4), boil: 0.6 });
  const b1 = BT(P, 1);
  if (t > 1.8) {
    kid(CH, { x: 640, y: 890, s: 0.95, who: 'a', expr: 'happy', legs: 'sit', arms: t > b1 + 2 ? 'up' : 'hold', seed: 300 });
    kid(CH, { x: 810, y: 890, s: 0.92, who: 'n', expr: 'happy', legs: 'sit', arms: 'hold', seed: 500 });
  }
  if (t > b1) { const wv = Math.floor(t * 3) % 2; zhyl(CH2, { x: 1060, y: 470, s: 0.9, glow: 1, expr: 'happy', seed: 900, r: wv ? 0.12 : -0.12 }, FX); }
  // twinkles on the revealed lights
  if (t > 6) for (let k = 0; k < 10; k++) { const ph = (t * 0.8 + hash(k) * 3) % 3; if (ph > 0.6) continue; const a = hash(k * 1.7 * 3) * Math.PI * 2, r = Math.sqrt(hash(k * 2.9 * 3)); const x = 900 + Math.cos(a) * 380 * r, y = 300 + Math.sin(a) * 200 * r; glow(FX, [x, y], 0.35 * Math.sin(ph / 0.6 * Math.PI), 1600 + k, K.white); }
  return { wash: true };
}
PAGES[12].camF = t => { const P = PAGES[12]; return track([[0, [960, 540, 1]], [BT(P, 1) - 0.5, [960, 540, 1]], [BT(P, 1) + 2, [900, 460, 1.2]], [BT(P, 2) + 1, [760, 760, 1.3]], [BT(P, 2) + 6, [960, 540, 1]], [P.dur, [960, 540, 1]]])(t); };
// the last seconds: «Аягы» is written, then the page pulls back: a book lying open on a felt carpet
let END_T0 = 0;
(() => { const P = PAGES[12]; END_T0 = P.bt[P.bt.length - 1].t1 + 0.5; })();
const PAGE = mk(), CARP = { f: layer(), l: layer() };
function endPull(comp, tl, P) {
  const u = eio(pr(tl, END_T0 + 3.2, END_T0 + 7.5));
  // the page itself, with «Аягы» written in
  clearAll(); [CAM.x, CAM.y, CAM.s] = P.camF(tl); const r = P.draw(tl, P);
  text(FX, 'Аягы', 960, 210, { size: 170, weight: 700, col: K.lemon, reveal: pr(tl, END_T0 + 0.4, END_T0 + 1.6), seed: 9, p: 1, stroke: 3 });
  compose(comp, P, { ...r, subs: false, vig: 0.3 * (1 - u) });
  if (u <= 0) return;
  snap(PAGE);
  // carpet under the book (crayon), then the page as a sheet of real paper with a soft shadow
  CAM.x = 960; CAM.y = 540; CAM.s = 1; clear(CARP.f); clear(CARP.l);
  shyrdak(CARP.f, CARP.l, -40, -40, 1960, 1120, 1, 1, 1701);
  const z = lerp(1, 0.6, u), w = W * z, h = H * z, x = 960 - w / 2 + 60 * u, y = 540 - h / 2 - 10 * u;
  OUT.g.setTransform(1, 0, 0, 1, 0, 0); OUT.g.clearRect(0, 0, W, H);
  OUT.g.save(); OUT.g.shadowColor = 'rgba(30,20,10,0.45)'; OUT.g.shadowBlur = 40 * u; OUT.g.shadowOffsetX = 14 * u; OUT.g.shadowOffsetY = 18 * u;
  OUT.g.fillStyle = '#efe7d6'; OUT.g.fillRect(x - w - 6, y + 4, w, h);   // the left page (blank back of the story)
  OUT.g.drawImage(PAGE.c, x, y, w, h); OUT.g.restore();
  const gs = OUT.g.createLinearGradient(x - 60, 0, x + 40, 0); gs.addColorStop(0, 'rgba(60,40,20,0)'); gs.addColorStop(0.6, 'rgba(60,40,20,0.25)'); gs.addColorStop(1, 'rgba(60,40,20,0)');
  OUT.g.fillStyle = gs; OUT.g.fillRect(x - 60, y, 100, h);
  comp.paperCam(4000, 0, 1); comp.begin(); comp.crayon(CARP.f.c); comp.crayon(CARP.l.c); comp.image(OUT.c);
  comp.finish({ vig: 0.32 * u, emb: 0.55 * u, lamp: [0.55, 0.45, 0.8, 0.6 * u] });
}
(() => { const P = PAGES[12]; ev(P.t0, 'cue', { id: 'end' }); ev(P.t0 + 2.0, 'brush', { dur: 3.6 }); ev(P.t0 + END_T0 + 0.4, 'write', { dur: 1.2 }); ev(P.t0 + END_T0 + 3.2, 'pull', { dur: 4.3 }); })();

// page 9/10 events, other pages' ambience
(() => {
  const P9 = PAGES[9]; ev(P9.t0, 'cue', { id: 'spring' }); ev(P9.t0 - 0.8, 'silence', { dur: 1.0 });
  WASH_BANDS.forEach(([a, b, y0, y1, dir]) => ev(P9.t0 + a, 'brush', { dur: b - a, dir }));
  for (let k = 0; k < 12; k++) ev(P9.t0 + 1.0 + k * 0.4, 'glint', { pan: -0.8 + (k % 5) * 0.4 });
  ev(P9.t0, 'crickets', { dur: P9.dur + PAGES[10].dur + TURN });
  ev(PAGES[10].t0, 'cue', { id: 'farewell' });
  ev(PAGES[10].t0 + BT(PAGES[10], 2) + 1.0, 'glint', { pan: 0.2 });
  ev(PAGES[1].t0, 'cue', { id: 'village' }); ev(PAGES[1].t0, 'birds', { dur: PAGES[1].dur });
  ev(PAGES[2].t0, 'cue', { id: 'dusk' }); ev(PAGES[2].t0, 'crickets', { dur: PAGES[2].dur + PAGES[3].dur + TURN });
  ev(PAGES[3].t0, 'cue', { id: 'decide' });
  ev(PAGES[4].t0, 'cue', { id: 'granny' }); ev(PAGES[4].t0, 'clock', { dur: PAGES[4].dur });
  ev(PAGES[12].t0, 'crickets', { dur: PAGES[12].dur });
  // drawing-on sounds at the start of every page
  PAGES.slice(1).forEach(P => { ev(P.t0 + 0.1, 'scratch', { dur: Math.min(2.0, P.pre * 0.5), pan: -0.3 }); ev(P.t0 + Math.min(1.2, P.pre * 0.4), 'scribble', { dur: Math.min(2.2, P.pre * 0.6), pan: 0.3 }); });
})();

// test views: ?test=page&p=3&t=5
export function test(comp, t, kind) {
  const Q = new URLSearchParams(location.search);
  const P = PAGES[+Q.get('p') || 0];
  renderPage(comp, P, +Q.get('lt') || t);
}
