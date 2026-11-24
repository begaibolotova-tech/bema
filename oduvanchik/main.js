// «Одуванчик» — a dandelion paints itself in, goes to seed, the wind takes the seeds. Pure function of t.
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
window.DUR = 10;
let PAPER_IMG, GROUND, HILLS, FLOWER, STEM, BUD, LEAVES, GRASS, TUFTS, RECEP, SEEDS, FLOWER_SPR;
const C = [880, 395];                       // flower head centre (world)
const T = { gust: 5.6, note0: 1.9, note1: 6.05, end0: 6.6 };

// camera: screen = (world - c) * s + (960, 540)
const camX = monotone([[0, 900], [4.6, 890], [5.6, 885], [6.3, 960], [10, 1720]]);
const camY = monotone([[0, 560], [4.6, 500], [5.6, 455], [10, 470]]);
const camS = monotone([[0, 1.0], [4.6, 1.06], [5.6, 1.13], [6.4, 1.09], [10, .98]]);
const cam = t => ({ x: camX(t), y: camY(t), s: camS(t) });
const setCam = (k, par = 1) => { const s = 1 + (k.s - 1) * par; ctx.setTransform(s, 0, 0, s, 960 - k.x * par * s - (1 - par) * 900 * s, 540 - k.y * s); };
const toScr = (k, x, y) => [(x - k.x) * k.s + 960, (y - k.y) * k.s + 540];

// a wash: same polygon in 3 jittered passes (pooled edges)
function washPoly(c, pts, fill, a, passes = 3, jit = 5) {
  for (let p = 0; p < passes; p++) {
    c.beginPath(); pts.forEach(([x, y], i) => { const X = x + rnd(-jit, jit), Y = y + rnd(-jit, jit); i ? c.lineTo(X, Y) : c.moveTo(X, Y); });
    c.closePath(); c.fillStyle = rgba(fill, a / passes * 1.6); c.fill();
  }
}
function strip(x0, x1, yTop, yBot, build) {
  const cv2 = document.createElement('canvas'); cv2.width = x1 - x0; cv2.height = yBot - yTop;
  const c = cv2.getContext('2d'); c.translate(-x0, -yTop); build(c); return { cv: cv2, x0, y0: yTop };
}

function build() {
  // far hills (parallax .5) and the meadow ground
  HILLS = withSeed(11, () => strip(-600, 3600, 600, 1400, c => {
    const pts = []; for (let x = -600; x <= 3600; x += 40) pts.push([x, 820 - 70 * fbm(x / 600 + 3) - 30 * fbm(x / 170)]);
    pts.push([3600, 1400], [-600, 1400]); washPoly(c, pts, '#c3c9ad', .42, 3, 6);
  }));
  GROUND = withSeed(12, () => strip(-600, 3600, 700, 1500, c => {
    const pts = []; for (let x = -600; x <= 3600; x += 30) pts.push([x, 930 - 26 * fbm(x / 400 + 9)]);
    pts.push([3600, 1500], [-600, 1500]); washPoly(c, pts, '#a9b886', .5, 3, 5);
    const g = c.createLinearGradient(0, 1040, 0, 1300); g.addColorStop(0, 'rgba(241,233,218,0)'); g.addColorStop(1, 'rgba(241,233,218,1)');
    c.fillStyle = g; c.fillRect(-600, 1040, 4200, 460);
    for (let i = 0; i < 260; i++) { const x = rnd(-600, 3600), y = 940 + rnd(0, 90); drawS(c, mk(qcurve(x, y, x + rnd(-30, 30), y + rnd(-4, 4), rnd(-3, 3), 4), rnd(4, 9), pick(['#94a874', '#b5bf8f', '#7f9663']), { prof: 'even', a: .5, nb: 0 })); }
  }));
  // main stem
  const stemS = mk(qctrl(840, 1010, 790, 690, C[0], C[1] + 30, 30), 10, '#8fa46a', { prof: 'even', nb: 3, a: .9 });
  STEM = [stemS, edgeOf(stemS, 1, 2.2, '#5d7444', .7)];
  // bud on a shorter stem
  BUD = withSeed(21, () => {
    const S = [], s = mk(qctrl(705, 1012, 720, 800, 655, 645, 20), 7, '#93a76c', { prof: 'even', nb: 3 });
    S.push(s, edgeOf(s, 1, 1.6, '#5d7444', .6));
    for (let i = 0; i < 6; i++) S.push(mk(qcurve(655 + rnd(-9, 9), 652, 652 + rnd(-6, 6), 590 + rnd(-6, 6), rnd(-6, 6), 8), rnd(10, 14), pick(['#6f8f4f', '#7f9a58']), { prof: 'leaf', nb: 2 }));
    S.push(mk(qcurve(652, 600, 651, 582, 0, 5), 7, '#e2b23a', { prof: 'leaf', nb: 0, a: .9 }));
    return S;
  });
  // rosette of toothed leaves
  LEAVES = withSeed(31, () => {
    const S = [];
    const angs = [-172, -150, -128, -105, -72, -48, -24, -8];
    for (const ad of angs) {
      const a = ad * Math.PI / 180 + rnd(-.06, .06), len = rnd(170, 270) * (Math.abs(ad + 90) > 60 ? 1 : .8), x0 = 840, y0 = 1008;
      const bend = rnd(-30, 30), pts = qcurve(x0, y0, x0 + Math.cos(a) * len, y0 + Math.sin(a) * len * .55, bend, 14);
      const col = pick(['#6f8f4f', '#86a05c', '#5b7a45']);
      const leaf = mk(pts, rnd(30, 40), col, { prof: 'leaf', nb: 6, a: .85 });
      S.push(leaf);
      for (let k = 0; k < 4; k++) for (const side of [-1, 1]) {           // backward-pointing teeth
        const i = Math.floor((.28 + k * .16) * (pts.length - 1)), p = pts[i], w = leaf.ws[i] * .5;
        const ex = p[0] + leaf.nx[i] * w * side, ey = p[1] + leaf.ny[i] * w * side;
        const tx = ex + leaf.nx[i] * side * 16 - Math.cos(a) * 14, ty = ey + leaf.ny[i] * side * 16 - Math.sin(a) * 8;
        S.push(mk(qcurve(ex - Math.cos(a) * 12, ey - Math.sin(a) * 6, tx, ty, 0, 4), 9, col, { prof: 'tip', nb: 0, a: .7 }));
      }
      S.push(mk(pts.slice(0, 12), 2.2, '#4e6a3a', { prof: 'tip', nb: 0, a: .6 }));
    }
    return S;
  });
  // grass at the base and tufts along the meadow
  const blades = (x, y, n, h) => { const S = []; for (let i = 0; i < n; i++) { const bx = x + rnd(-60, 60); S.push(mk(qcurve(bx, y + rnd(0, 10), bx + rnd(-40, 40), y - rnd(.5, 1) * h, rnd(-14, 14), 8), rnd(4, 8), pick(['#7f9663', '#94a874', '#6a8452']), { prof: 'tip', nb: 2, a: .8 })); } return S; };
  GRASS = withSeed(41, () => [blades(800, 1030, 14, 120), blades(930, 1035, 10, 90)].flat());
  TUFTS = withSeed(42, () => { const A = []; for (let x = 1120; x < 3500; x += rnd(140, 260)) { const S = blades(x, 960 + rnd(0, 60), 7, rnd(50, 110)); A.push({ x, S, spr: sprite(S) }); } return A; });
  // flower head: petals radiating, squashed a little
  FLOWER = withSeed(51, () => {
    const S = [], [cx, cy] = C;
    for (let i = 0; i < 6; i++) { const a = Math.PI / 2 + rnd(-1, 1); S.push(mk(polar(cx + rnd(-20, 20), cy + 28, a, rnd(30, 44), rnd(-6, 6), 6), 10, '#6f8f4f', { prof: 'leaf', nb: 2 })); }
    for (const [r0, r1, n, w, cols] of [[30, 98, 34, 14, ['#e9bd3c', '#f0c94e', '#ddaa2f']], [18, 70, 30, 12, ['#e6b034', '#d99a2a']], [4, 36, 22, 10, ['#c98420', '#d4912a']]]) {
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + rnd(-.1, .1), L = rnd(r1 * .8, r1), sx = cx + Math.cos(a) * r0, sy = cy + Math.sin(a) * r0 * .86;
        S.push(mk(qcurve(sx, sy, cx + Math.cos(a) * L, cy + Math.sin(a) * L * .86, rnd(-5, 5), 6), w * rnd(.85, 1.15), pick(cols), { prof: 'leaf', nb: 3, a: .82 }));
      }
    }
    clump(S, cx, cy, 14, 16, ['#b56f1c', '#c98420'], { l0: 5, l1: 10, w0: 5, w1: 8 });
    return S;
  });
  FLOWER_SPR = sprite(FLOWER);
  RECEP = withSeed(61, () => { const S = []; clump(S, C[0], C[1], 12, 14, ['#9b8466', '#8a7358', '#b09a78'], { l0: 5, l1: 9, w0: 5, w1: 8 }); return S; });
  // seeds: local coords, receptacle at 0, pointing +x; tip (pappus centre) at (len, 0)
  SEEDS = withSeed(71, () => {
    const A = [], N = 118;
    for (let j = 0; j < N; j++) {
      const a = j / N * Math.PI * 2 * 7.618 % (Math.PI * 2) + rnd(-.05, .05), front = j % 4 === 0;
      const len = front ? rnd(60, 100) : rnd(122, 150), S = [];
      S.push(mk(qcurve(14, 0, 32, rnd(-1, 1), 0, 4), 4.5, pick(['#7a6450', '#8a7358']), { prof: 'leaf', nb: 0, a: .9 }));
      S.push(mk(qcurve(32, 0, len, rnd(-2, 2), rnd(-2, 2), 8), 1.3, '#8f989c', { prof: 'even', nb: 0, a: .75 }));
      for (let k = 0; k < 12; k++) { const fa = -1.3 + 2.6 * k / 11 + rnd(-.08, .08); S.push(mk(polar(len, 0, fa, rnd(20, 30), rnd(-3, 3), 5), 1.3, pick(['#9aa6ad', '#b8c0c4', '#7f8c95']), { prof: 'tip', nb: 0, a: .72 })); }
      // release: right/upper side first (the wind comes from the left)
      const wind = (1 - Math.cos(a - (-.4))) / 2;
      const tr = T.gust + .05 + wind * 1.5 + rnd(0, .35) + (j % 9 === 0 ? 1.2 : 0);
      A.push({ a, len, S, spr: sprite(S), tr, k: rnd(.4, 1.1), vy: rnd(-120, 5), ph: rnd(0, 6.28), sp: rnd(1.2, 2.3) });
    }
    return A;
  });
}

// angle path: from a to b the short way
const angLerp = (a, b, u) => { let d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * u; };
function seedState(s, t) {
  const tip0 = [C[0] + Math.cos(s.a) * s.len, C[1] + Math.sin(s.a) * s.len];
  if (t < s.tr) return { x: tip0[0], y: tip0[1], ang: s.a, off: 0 };
  const d = t - s.tr;
  const x = tip0[0] + s.k * (210 * d + 46 * d * d) + 14 * Math.sin(s.sp * d + s.ph);
  const y = tip0[1] + s.vy * d - 40 * eo(d / .5) * s.k + 22 * Math.sin(1.3 * s.sp * d + 2 * s.ph);
  const ang = angLerp(s.a, -Math.PI / 2 + .35 * Math.sin(s.sp * d + s.ph), eio(d / 1.4));
  return { x, y, ang, off: 1 };
}
function drawSeed(s, st, p = 1) {
  const m = ctx.getTransform();
  ctx.translate(st.x, st.y); ctx.rotate(st.ang); ctx.translate(-s.len, 0);
  if (p >= 1) ctx.drawImage(s.spr.cv, s.spr.x0, s.spr.y0); else drawList(ctx, s.S, p);
  ctx.setTransform(m);
}

function halo(fn) { ctx.save(); ctx.shadowColor = rgba(PAPER, 1); ctx.shadowBlur = 14; fn(); ctx.restore(); fn(); }
function noteText(t, k) {
  const a = ss(seg(t, T.note0, T.note0 + .25)) * (1 - ss(seg(t, T.note1, T.note1 + .35)));
  if (a <= 0) return null;
  const tx = 1010, ty = 262, lp = seg(t, T.note0, T.note0 + .5), wp = eo(seg(t, T.note0 + .2, T.note0 + .75));
  ctx.globalAlpha = a;
  withSeed(81, () => drawS(ctx, mk(qcurve(1000, 270, 935, 330, -14, 10), 2.4, INK2, { prof: 'tip', nb: 0, a: .8 }), lp));
  ctx.font = '600 44px Caveat'; ctx.fillStyle = rgba(INK, .9); ctx.textBaseline = 'alphabetic';
  const txt = 'Taraxacum officinale', w = ctx.measureText(txt).width;
  ctx.save(); ctx.beginPath(); ctx.rect(tx - 10, ty - 60, (w + 20) * wp, 90); ctx.clip(); halo(() => ctx.fillText(txt, tx, ty)); ctx.restore();
  ctx.font = '400 15px "IBM Plex Mono"'; ctx.fillStyle = rgba(INK2, .7); if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '3px';
  ctx.save(); ctx.beginPath(); ctx.rect(tx - 10, ty, (w + 20) * wp, 40); ctx.clip(); halo(() => ctx.fillText('ОДУВАНЧИК', tx + 2, ty + 30)); ctx.restore();
  if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '0px';
  ctx.globalAlpha = 1;
  const [x0, y0] = toScr(k, tx, ty - 44), [x1, y1] = toScr(k, tx + w, ty + 34);
  return a > .99 && wp >= 1 ? [{ id: 'note', text: txt + ' ОДУВАНЧИК', x0, y0, x1, y1 }] : null;
}
function endText(t) {
  const wp = eio(seg(t, T.end0, T.end0 + .75)); if (wp <= 0) return null;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = 'italic 500 76px "Cormorant Garamond"'; ctx.fillStyle = rgba(INK, .86); ctx.textAlign = 'left';
  const txt = 'до следующей весны', w = ctx.measureText(txt).width, x = 1820 - w, y = 930;
  ctx.save(); ctx.beginPath(); ctx.rect(x - 20, y - 90, (w + 40) * wp, 130); ctx.clip(); halo(() => ctx.fillText(txt, x, y)); ctx.restore();
  withSeed(91, () => drawS(ctx, mk(qcurve(x, y + 26, x + w * .55, y + 24, 2, 12), 4, '#c8442a', { prof: 'brush', nb: 2, a: .75 }), seg(t, T.end0 + .5, T.end0 + 1.1)));
  return wp >= 1 ? [{ id: 'end', text: txt, x0: x, y0: y - 70, x1: x + w, y1: y + 20 }] : null;
}

let LAST_TEXTS = [];
function render(t) {
  const k = cam(t), texts = [];
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.drawImage(PAPER_IMG, 0, 0);
  // hills (parallax) and ground, revealed by a wavy brush-edge wipe from the left
  const rev = -200 + 2600 * eio(seg(t, .05, 1.3));
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.beginPath(); ctx.moveTo(-10, 0);
  for (let y = 0; y <= 1080; y += 30) ctx.lineTo(rev + 60 * Math.sin(y / 90 + 1) + 30 * Math.sin(y / 33), y);
  ctx.lineTo(-10, 1080); ctx.closePath(); ctx.clip();
  setCam(k, .5); ctx.drawImage(HILLS.cv, HILLS.x0, HILLS.y0);
  setCam(k); ctx.drawImage(GROUND.cv, GROUND.x0, GROUND.y0);
  ctx.restore();
  setCam(k);
  // tufts along the meadow paint in as they come into view
  for (const tf of TUFTS) {
    const sx = (tf.x - k.x) * k.s + 960; if (sx < -300 || sx > 2200) continue;
    const p = Math.min(seg(t, .4, 1.6), seg(1900 - sx, 0, 380));
    if (p >= 1) ctx.drawImage(tf.spr.cv, tf.spr.x0, tf.spr.y0); else drawList(ctx, tf.S, p);
  }
  const sway = (amp, ph) => amp * (Math.sin(1.15 * t + ph) + .4 * Math.sin(2.7 * t + 2 * ph)) + (t > T.gust ? amp * 3 * Math.sin(Math.PI * seg(t, T.gust, T.gust + 1.6)) : 0);
  drawList(ctx, BUD, seg(t, .5, 1.5));
  drawList(ctx, LEAVES, seg(t, .6, 2.2));
  // stem + head sway together about the root
  const m = ctx.getTransform(); const sk = sway(.006, .7);
  ctx.translate(840, 1010); ctx.transform(1, 0, sk, 1, 0, 0); ctx.translate(-840, -1010);
  drawList(ctx, STEM, seg(t, .15, 1.5));
  // flower: paints in, then closes and fades as the seed clock paints in
  const fp = seg(t, 1.65, 2.9), fa = 1 - ss(seg(t, 3.3, 4.05));
  if (fa > 0 && fp > 0) {
    const sc = 1 - .3 * ss(seg(t, 3.3, 4.05)), mm = ctx.getTransform();
    ctx.translate(C[0], C[1]); ctx.scale(sc, sc); ctx.translate(-C[0], -C[1]); ctx.globalAlpha = fa;
    if (fp < 1) drawList(ctx, FLOWER, fp); else ctx.drawImage(FLOWER_SPR.cv, FLOWER_SPR.x0, FLOWER_SPR.y0);
    ctx.globalAlpha = 1; ctx.setTransform(mm);
  }
  drawList(ctx, RECEP, seg(t, 3.4, 3.8));
  const cp = seg(t, 3.55, 4.75), N = SEEDS.length, dd = .25;
  for (let j = 0; j < N; j++) {
    const s = SEEDS[j]; if (t >= s.tr) continue;
    const pj = clamp((cp - j / N * (1 - dd)) / dd); if (pj <= 0) continue;
    drawSeed(s, seedState(s, t), pj);
  }
  ctx.setTransform(m);
  // seeds in flight (in world coords, no stem sway)
  for (const s of SEEDS) if (t >= s.tr) {
    const st = seedState(s, t); const sx = (st.x - k.x) * k.s + 960, sy = (st.y - k.y) * k.s + 540;
    if (sx < -200 || sx > 2120 || sy < -200 || sy > 1280) continue;
    st.x += sk * (1010 - st.y) * Math.max(0, 1 - (t - s.tr) / .3);
    drawSeed(s, st);
  }
  drawList(ctx, GRASS, seg(t, .8, 2.0));
  const n = noteText(t, k); if (n) texts.push(...n);
  const e = endText(t); if (e) texts.push(...e);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  LAST_TEXTS = texts;
}
window.render = render;
window.TEXTS = t => { render(t); return LAST_TEXTS; };

// sound events for the mix
window.EV = [
  { t: .05, type: 'brush', d: 1.25, g: .35, p0: -.9, p1: .9 },
  { t: .15, type: 'brush', d: 1.35, g: .5, p0: -.1, p1: .1 },
  { t: .5, type: 'brush', d: 1.0, g: .3, p0: -.4, p1: -.3 },
  { t: .6, type: 'brush', d: 1.6, g: .45, p0: -.5, p1: .4 },
  { t: .8, type: 'brush', d: 1.2, g: .25, p0: -.2, p1: .3 },
  { t: 1.65, type: 'brush', d: 1.25, g: .55, p0: -.3, p1: .3 },
  { t: T.note0, type: 'pencil', d: .9, g: .4, p: .4 },
  { t: 3.3, type: 'brush', d: 1.5, g: .3, p0: .1, p1: -.1 },
  { t: T.gust, type: 'gust', d: 4.4 },
  { t: T.end0, type: 'pencil', d: .9, g: .3, p: .6 },
];

(async () => {
  PAPER_IMG = new Image(); PAPER_IMG.src = 'paper.jpg'; await PAPER_IMG.decode();
  await Promise.all(['600 44px Caveat', 'italic 500 76px "Cormorant Garamond"', '400 15px "IBM Plex Mono"'].map(f => document.fonts.load(f, 'дТa')));
  build();
  for (const s of SEEDS) window.EV.push({ t: s.tr, type: 'seed', p: clamp((C[0] + Math.cos(s.a) * s.len - 880) / 200, -1, 1) });
  window.READY = true;
})();
