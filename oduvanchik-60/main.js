// «Одуванчик. Круг» — 60 s. One seed's year in one painted world. Pure function of t.
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
window.DUR = 60;
const LAND = 6200, DX = LAND - 840;              // landing site; plant B = plant A shifted by DX
const C = [880, 395];                            // plant A head (world)
let PAPER_IMG, GROUND, GROUND_AUT, HILLS, TUFTS, RIVER, TREES, PA, PB, HERO, HERO_MARK, FLAKES, LEAVES_FALL;

// ---------- timeline ----------
const T = {
  A: { ground: [.05, 1.6], bud: [.8, 2.2], leaves: [1.0, 3.4], stem: [.4, 2.6], grass: [1.6, 3.2], flower: [3.0, 4.9], close: [6.6, 7.6], recep: [6.8, 7.3], clock: [6.9, 8.4] },
  note1: [4.0, 8.8], note2: [9.3, 13.6], mark: 11.0, gust: 14.0, hero: 14.4, land: 33.2,
  note3: [19.5, 24.7], note4: [26.0, 31.6],
  autumn: [34.5, 36.5], winter: [38.8, 40.3], thaw: [43.2, 44.6],
  s1: [35.2, 38.6], s2: [39.4, 43.0], s3: [44.4, 48.2],
  B: { leaves: [44.6, 46.6], bud: [45.4, 46.6], stem: [45.6, 47.6], grass: [44.8, 46.2], flower: [47.6, 49.4], close: [50.4, 51.4], recep: [50.6, 51.1], clock: [50.7, 52.0] },
  gust2: 54.0, end0: 55.6,
};

// ---------- helpers ----------
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
const angLerp = (a, b, u) => { const d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * u; };
function halo(fn) { ctx.save(); ctx.shadowColor = rgba(PAPER, 1); ctx.shadowBlur = 14; fn(); ctx.restore(); fn(); }

// ---------- the plant (built once per seed base; drawn at an x offset) ----------
function makePlant(sb, nSeeds) {
  const P = {};
  const stemS = withSeed(sb + 1, () => mk(qctrl(840, 1010, 790, 690, C[0], C[1] + 30, 30), 10, '#8fa46a', { prof: 'even', nb: 3, a: .9 }));
  P.STEM = [stemS, withSeed(sb + 2, () => edgeOf(stemS, 1, 2.2, '#5d7444', .7))];
  P.BUD = withSeed(sb + 21, () => {
    const S = [], s = mk(qctrl(705, 1012, 720, 800, 655, 645, 20), 7, '#93a76c', { prof: 'even', nb: 3 });
    S.push(s, edgeOf(s, 1, 1.6, '#5d7444', .6));
    for (let i = 0; i < 6; i++) S.push(mk(qcurve(655 + rnd(-9, 9), 652, 652 + rnd(-6, 6), 590 + rnd(-6, 6), rnd(-6, 6), 8), rnd(10, 14), pick(['#6f8f4f', '#7f9a58']), { prof: 'leaf', nb: 2 }));
    S.push(mk(qcurve(652, 600, 651, 582, 0, 5), 7, '#e2b23a', { prof: 'leaf', nb: 0, a: .9 }));
    return S;
  });
  P.LEAVES = withSeed(sb + 31, () => {
    const S = [];
    for (const ad of [-172, -150, -128, -105, -72, -48, -24, -8]) {
      const a = ad * Math.PI / 180 + rnd(-.06, .06), len = rnd(170, 270) * (Math.abs(ad + 90) > 60 ? 1 : .8), x0 = 840, y0 = 1008;
      const pts = qcurve(x0, y0, x0 + Math.cos(a) * len, y0 + Math.sin(a) * len * .55, rnd(-30, 30), 14);
      const col = pick(['#6f8f4f', '#86a05c', '#5b7a45']), leaf = mk(pts, rnd(30, 40), col, { prof: 'leaf', nb: 6, a: .85 });
      S.push(leaf);
      for (let k = 0; k < 4; k++) for (const side of [-1, 1]) {
        const i = Math.floor((.28 + k * .16) * (pts.length - 1)), p = pts[i], w = leaf.ws[i] * .5;
        const ex = p[0] + leaf.nx[i] * w * side, ey = p[1] + leaf.ny[i] * w * side;
        S.push(mk(qcurve(ex - Math.cos(a) * 12, ey - Math.sin(a) * 6, ex + leaf.nx[i] * side * 16 - Math.cos(a) * 14, ey + leaf.ny[i] * side * 16 - Math.sin(a) * 8, 0, 4), 9, col, { prof: 'tip', nb: 0, a: .7 }));
      }
      S.push(mk(pts.slice(0, 12), 2.2, '#4e6a3a', { prof: 'tip', nb: 0, a: .6 }));
    }
    return S;
  });
  const blades = (x, y, n, h) => { const S = []; for (let i = 0; i < n; i++) { const bx = x + rnd(-60, 60); S.push(mk(qcurve(bx, y + rnd(0, 10), bx + rnd(-40, 40), y - rnd(.5, 1) * h, rnd(-14, 14), 8), rnd(4, 8), pick(['#7f9663', '#94a874', '#6a8452']), { prof: 'tip', nb: 2, a: .8 })); } return S; };
  P.GRASS = withSeed(sb + 41, () => [blades(800, 1030, 14, 120), blades(930, 1035, 10, 90)].flat());
  P.FLOWER = withSeed(sb + 51, () => {
    const S = [], [cx, cy] = C;
    for (let i = 0; i < 6; i++) S.push(mk(polar(cx + rnd(-20, 20), cy + 28, Math.PI / 2 + rnd(-1, 1), rnd(30, 44), rnd(-6, 6), 6), 10, '#6f8f4f', { prof: 'leaf', nb: 2 }));
    for (const [r0, r1, n, w, cols] of [[30, 98, 34, 14, ['#e9bd3c', '#f0c94e', '#ddaa2f']], [18, 70, 30, 12, ['#e6b034', '#d99a2a']], [4, 36, 22, 10, ['#c98420', '#d4912a']]]) {
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + rnd(-.1, .1), L = rnd(r1 * .8, r1);
        S.push(mk(qcurve(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * .86, cx + Math.cos(a) * L, cy + Math.sin(a) * L * .86, rnd(-5, 5), 6), w * rnd(.85, 1.15), pick(cols), { prof: 'leaf', nb: 3, a: .82 }));
      }
    }
    clump(S, cx, cy, 14, 16, ['#b56f1c', '#c98420'], { l0: 5, l1: 10, w0: 5, w1: 8 });
    return S;
  });
  P.FLOWER_SPR = sprite(P.FLOWER);
  P.RECEP = withSeed(sb + 61, () => { const S = []; clump(S, C[0], C[1], 12, 14, ['#9b8466', '#8a7358', '#b09a78'], { l0: 5, l1: 9, w0: 5, w1: 8 }); return S; });
  P.SEEDS = withSeed(sb + 71, () => {
    const A = [];
    for (let j = 0; j < nSeeds; j++) {
      const a = j / nSeeds * Math.PI * 2 * 7.618 % (Math.PI * 2) + rnd(-.05, .05), front = j % 4 === 0;
      const len = front ? rnd(60, 100) : rnd(122, 150), S = [];
      S.push(mk(qcurve(14, 0, 32, rnd(-1, 1), 0, 4), 4.5, pick(['#7a6450', '#8a7358']), { prof: 'leaf', nb: 0, a: .9 }));
      S.push(mk(qcurve(32, 0, len, rnd(-2, 2), rnd(-2, 2), 8), 1.3, '#8f989c', { prof: 'even', nb: 0, a: .75 }));
      for (let k = 0; k < 12; k++) S.push(mk(polar(len, 0, -1.3 + 2.6 * k / 11 + rnd(-.08, .08), rnd(20, 30), rnd(-3, 3), 5), 1.3, pick(['#9aa6ad', '#b8c0c4', '#7f8c95']), { prof: 'tip', nb: 0, a: .72 }));
      const wind = (1 - Math.cos(a + .4)) / 2;
      A.push({ j, a, len, S, front, spr: sprite(S), w: wind * 1.5 + rnd(0, .35) + (j % 9 === 0 ? 1.2 : 0), k: rnd(.4, 1.1), vy: rnd(-120, 5), ph: rnd(0, 6.28), sp: rnd(1.2, 2.3) });
    }
    return A;
  });
  return P;
}

// a seed at rest on the head or in free flight (plant-local frame: head at C)
function seedState(s, t, gust) {
  const tr = gust + .05 + s.w;
  const tip0 = [C[0] + Math.cos(s.a) * s.len, C[1] + Math.sin(s.a) * s.len];
  if (t < tr) return { x: tip0[0], y: tip0[1], ang: s.a, fly: false, d: 0 };
  const d = t - tr;
  return {
    x: tip0[0] + s.k * (210 * d + 46 * d * d) + 14 * Math.sin(s.sp * d + s.ph),
    y: tip0[1] + s.vy * d - 40 * eo(d / .5) * s.k + 22 * Math.sin(1.3 * s.sp * d + 2 * s.ph),
    ang: angLerp(s.a, -Math.PI / 2 + .35 * Math.sin(s.sp * d + s.ph), eio(d / 1.4)), fly: true, d,
  };
}
function drawSeed(s, st, p = 1, alpha = 1) {
  const m = ctx.getTransform();
  ctx.translate(st.x, st.y); ctx.rotate(st.ang); ctx.translate(-s.len, 0);
  ctx.globalAlpha = alpha;
  if (p >= 1) ctx.drawImage(s.spr.cv, s.spr.x0, s.spr.y0); else drawList(ctx, s.S, p);
  ctx.globalAlpha = 1; ctx.setTransform(m);
}

// ---------- the hero seed's journey (world coords of its pappus tip) ----------
let HX, HY;
function heroPos(t) {
  if (t <= T.hero) { const s = HERO; return [C[0] + Math.cos(s.a) * s.len, C[1] + Math.sin(s.a) * s.len]; }
  const tt = Math.min(t, T.land), fade = 1 - ss(seg(tt, 30, T.land));
  return [HX(tt) + 16 * Math.sin(1.7 * tt) * fade, HY(tt) + 22 * Math.sin(1.1 * tt + 1) * fade];
}
function heroAng(t) {
  if (t <= T.hero) return HERO.a;
  const tt = Math.min(t, T.land), up = -Math.PI / 2 + .3 * Math.sin(1.3 * tt) * (1 - ss(seg(tt, 30, T.land)));
  return angLerp(HERO.a, t >= T.land ? -Math.PI / 2 + .22 : up, eio(seg(t, T.hero, T.hero + 1.4)) * (t >= T.land - 1 ? 1 : 1));
}

// ---------- trees ----------
function tree(x, y, sc, sb) {
  return withSeed(sb, () => {
    const W = [], L = [], tops = [];
    const h = 430 * sc, tr = mk(qcurve(x, y, x + rnd(-20, 20), y - h * .62, rnd(-14, 14), 12), 26 * sc, '#6d5a48', { prof: 'trunk', nb: 6 });
    W.push(tr, edgeOf(tr, 1, 3 * sc, INK2, .6));
    const top = tr.pts[tr.pts.length - 1];
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + rnd(-1.1, 1.1), len = rnd(.25, .45) * h, bx = top[0], by = top[1] + rnd(0, h * .2);
      const b = mk(polar(bx, by, a, len, rnd(-20, 20), 8), 9 * sc, '#6d5a48', { prof: 'tip', nb: 3 });
      W.push(b); const e = b.pts[b.pts.length - 1]; tops.push(e);
    }
    for (const e of tops) clump(L, e[0], e[1], 70 * sc, 26, ['#6f8f4f', '#86a05c', '#5b7a45', '#9db06e'], { l0: 14 * sc, l1: 26 * sc, w0: 9 * sc, w1: 16 * sc });
    clump(L, top[0], top[1] - h * .12, 110 * sc, 40, ['#6f8f4f', '#86a05c', '#5b7a45'], { l0: 14 * sc, l1: 26 * sc, w0: 9 * sc, w1: 16 * sc });
    return { x, W, L, sprW: sprite(W), sprL: sprite(L), sprA: sprite(L.map(s => ({ ...s, col: pick(['#c98a3a', '#d9a446', '#b8652c', '#c9a868']) }))), tops };
  });
}

function build() {
  HILLS = withSeed(11, () => strip(-600, 8000, 600, 1400, c => {
    const pts = []; for (let x = -600; x <= 8000; x += 40) pts.push([x, 820 - 70 * fbm(x / 600 + 3) - 30 * fbm(x / 170)]);
    pts.push([8000, 1400], [-600, 1400]); washPoly(c, pts, '#c3c9ad', .42, 3, 6);
  }));
  const groundPts = () => { const pts = []; for (let x = -600; x <= 8000; x += 30) pts.push([x, 930 - 26 * fbm(x / 400 + 9)]); pts.push([8000, 1500], [-600, 1500]); return pts; };
  const groundStrip = (col, dots, sb) => withSeed(sb, () => strip(-600, 8000, 700, 1500, c => {
    washPoly(c, groundPts(), col, .5, 3, 5);
    const g = c.createLinearGradient(0, 1040, 0, 1300); g.addColorStop(0, 'rgba(241,233,218,0)'); g.addColorStop(1, 'rgba(241,233,218,1)');
    c.fillStyle = g; c.fillRect(-600, 1040, 8600, 460);
    for (let i = 0; i < 560; i++) { const x = rnd(-600, 8000), y = 940 + rnd(0, 90); drawS(c, mk(qcurve(x, y, x + rnd(-30, 30), y + rnd(-4, 4), rnd(-3, 3), 4), rnd(4, 9), pick(dots), { prof: 'even', a: .5, nb: 0 })); }
  }));
  GROUND = groundStrip('#a9b886', ['#94a874', '#b5bf8f', '#7f9663'], 12);
  GROUND_AUT = groundStrip('#c9ae74', ['#b8925a', '#d2b47c', '#a8834e'], 13);
  // a river crossing the meadow, wider in front
  RIVER = withSeed(14, () => {
    const spr = strip(2600, 3700, 780, 1300, c => {
      const pts = [[3050, 830], [3160, 830]]; for (let y = 830; y <= 1300; y += 40) pts.push([3160 + (y - 830) * .55 + 18 * Math.sin(y / 70), y]);
      for (let y = 1300; y >= 830; y -= 40) pts.push([3050 - (y - 830) * .5 + 18 * Math.sin(y / 60 + 2), y]);
      washPoly(c, pts, '#9fb4c4', .6, 3, 6);
    });
    const S = []; for (let i = 0; i < 26; i++) { const y = rnd(860, 1080), cx = 3105 + (y - 830) * .03, half = 40 + (y - 830) * .45; const x = cx + rnd(-half * .7, half * .5); S.push(mk(qcurve(x, y, x + rnd(30, 70), y + rnd(-2, 2), rnd(-2, 2), 5), rnd(3, 6), pick(['#d6dfe3', '#7d97aa']), { prof: 'even', nb: 0, a: .7 })); }
    return { spr, S, x: 3100 };
  });
  const blades = (x, y, n, h) => { const S = []; for (let i = 0; i < n; i++) { const bx = x + rnd(-60, 60); S.push(mk(qcurve(bx, y + rnd(0, 10), bx + rnd(-40, 40), y - rnd(.5, 1) * h, rnd(-14, 14), 8), rnd(4, 8), pick(['#7f9663', '#94a874', '#6a8452']), { prof: 'tip', nb: 2, a: .8 })); } return S; };
  TUFTS = withSeed(42, () => { const A = []; for (let x = 1120; x < 7800; x += rnd(140, 260)) { if (x > 2750 && x < 3500) continue; const S = blades(x, 960 + rnd(0, 60), 7, rnd(50, 110)); A.push({ x, S, spr: sprite(S), sprA: sprite(S, '#b8925a') }); } return A; });
  TREES = [tree(3750, 950, .8, 101), tree(4120, 975, 1.0, 102), tree(4560, 945, .7, 103), tree(5150, 960, .85, 104), tree(LAND + 560, 980, 1.15, 105)];
  PA = makePlant(0, 118); PB = makePlant(500, 110);
  // our hero: a rim seed pointing up-right
  let best = null; for (const s of PA.SEEDS) if (!s.front && (!best || Math.abs(angLerp(s.a, -.55, 1) - s.a) < Math.abs(angLerp(best.a, -.55, 1) - best.a))) best = s;
  HERO = best;
  HERO_MARK = withSeed(201, () => mk(qcurve(16, 0, 33, 0, 0, 5), 7, '#c8442a', { prof: 'leaf', nb: 0, a: .95 }));
  const [x0, y0] = heroPos(T.hero), landY = 948 - (HERO.len - 24);
  HX = monotone([[T.hero, x0], [16, x0 + 420], [20, 2300], [25, 3700], [29, 4950], [31.6, 5850], [T.land, LAND]]);
  HY = monotone([[T.hero, y0], [16, 330], [20, 360], [24, 330], [28, 320], [31, landY - 200], [T.land, landY]]);
  // snow and falling leaves (deterministic particles)
  FLAKES = withSeed(301, () => Array.from({ length: 220 }, () => ({ x: rnd(0, 1920), y: rnd(-1080, 1080), r: rnd(2, 5.5), v: rnd(50, 110), ph: rnd(0, 6.3) })));
  LEAVES_FALL = withSeed(302, () => Array.from({ length: 70 }, () => { const tr = pick(TREES.slice(3)); return { tr, ox: rnd(-150, 150) * 1, oy: rnd(-460, -260), t0: rnd(36.3, 39.0), v: rnd(130, 220), ph: rnd(0, 6.3), col: pick(['#c98a3a', '#d9a446', '#b8652c']), s: withSeed(Math.floor(rnd(1, 1e6)), () => mk(qcurve(0, 0, 14, 2, 3, 4), 9, '#c98a3a', { prof: 'leaf', nb: 0, a: .9 })) }; }));
}

// ---------- camera ----------
const camS = monotone([[0, 1], [9, 1.06], [12, 1.14], [14, 1.08], [17, 1.12], [31, 1.12], [34.5, 1.0], [45, 1.0], [53.5, 1.08], [60, .99]]);
const camY = monotone([[0, 560], [9, 500], [12, 440], [14.5, 470], [17, 500], [31, 520], [34.5, 540], [45, 540], [53.5, 500], [60, 520]]);
const camA = monotone([[0, 900], [9, 890], [12, 860], [14, 880]]);
const camB = monotone([[34, LAND + 220], [45, LAND + 220], [53.5, LAND + 120], [60, LAND + 260]]);
function cam(t) {
  const f = heroPos(Math.max(t, T.hero))[0] + 140;
  const x = lerp(lerp(camA(t), f, ss(seg(t, 14.6, 17))), camB(t), ss(seg(t, 31.5, 34.5)));
  return { x, y: camY(t), s: camS(t) };
}
const setCam = (k, par = 1) => { const s = 1 + (k.s - 1) * par; ctx.setTransform(s, 0, 0, s, 960 - k.x * par * s - (1 - par) * 900 * s, 540 - k.y * s); };
const toScr = (k, x, y) => [(x - k.x) * k.s + 960, (y - k.y) * k.s + 540];

// ---------- seasons ----------
const aut = t => ss(seg(t, ...T.autumn)) * (1 - ss(seg(t, 44.0, 46)));
const win = t => ss(seg(t, ...T.winter)) * (1 - ss(seg(t, ...T.thaw)));
const greenA = t => t < 40 ? 1 - ss(seg(t, 35, 37)) : 0;          // summer canopy
const autA = t => ss(seg(t, 35, 37)) * (1 - ss(seg(t, 37.2, 39.4)));
const springP = t => seg(t, 45, 47.5);

// ---------- one plant ----------
function drawPlant(P, t, tm, gust, dx, k, opts = {}) {
  const m0 = ctx.getTransform(); ctx.translate(dx, 0);
  const sway = (amp, ph) => amp * (Math.sin(1.15 * t + ph) + .4 * Math.sin(2.7 * t + 2 * ph)) + (t > gust ? amp * 3 * Math.sin(Math.PI * seg(t, gust, gust + 1.6)) : 0);
  drawList(ctx, P.BUD, seg(t, ...tm.bud));
  drawList(ctx, P.LEAVES, seg(t, ...tm.leaves));
  const m = ctx.getTransform(), sk = sway(.006, .7);
  ctx.translate(840, 1010); ctx.transform(1, 0, sk, 1, 0, 0); ctx.translate(-840, -1010);
  drawList(ctx, P.STEM, seg(t, ...tm.stem));
  const fp = seg(t, ...tm.flower), fa = 1 - ss(seg(t, ...tm.close));
  if (fa > 0 && fp > 0) {
    const sc = 1 - .3 * (1 - fa), mm = ctx.getTransform();
    ctx.translate(C[0], C[1]); ctx.scale(sc, sc); ctx.translate(-C[0], -C[1]); ctx.globalAlpha = fa;
    if (fp < 1) drawList(ctx, P.FLOWER, fp); else ctx.drawImage(P.FLOWER_SPR.cv, P.FLOWER_SPR.x0, P.FLOWER_SPR.y0);
    ctx.globalAlpha = 1; ctx.setTransform(mm);
  }
  drawList(ctx, P.RECEP, seg(t, ...tm.recep));
  const cp = seg(t, ...tm.clock), N = P.SEEDS.length, dd = .25;
  for (const s of P.SEEDS) {
    if (opts.hero === s) continue;
    const st = seedState(s, t, gust); if (st.fly) continue;
    const pj = clamp((cp - s.j / N * (1 - dd)) / dd); if (pj <= 0) continue;
    drawSeed(s, st, pj);
  }
  if (opts.hero && t < T.hero) {
    const s = opts.hero, pj = clamp((cp - s.j / N * (1 - dd)) / dd);
    if (pj > 0) { const st = seedState(s, t, -1e9); drawSeed(s, { ...st, x: C[0] + Math.cos(s.a) * s.len, y: C[1] + Math.sin(s.a) * s.len, ang: s.a }, pj); heroMark(t, { x: C[0] + Math.cos(s.a) * s.len, y: C[1] + Math.sin(s.a) * s.len, ang: s.a }); }
  }
  ctx.setTransform(m);
  for (const s of P.SEEDS) {
    if (opts.hero === s) continue;
    const st = seedState(s, t, gust); if (!st.fly) continue;
    const [sx, sy] = toScr(k, st.x + dx, st.y); if (sx < -200 || sx > 2120 || sy < -200 || sy > 1280) continue;
    st.x += sk * (1010 - st.y) * Math.max(0, 1 - st.d / .3);
    drawSeed(s, st);
  }
  drawList(ctx, P.GRASS, seg(t, ...tm.grass));
  ctx.setTransform(m0);
}
function heroMark(t, st) {
  const p = seg(t, T.mark, T.mark + .6); if (p <= 0) return;
  const m = ctx.getTransform(); ctx.translate(st.x, st.y); ctx.rotate(st.ang); ctx.translate(-HERO.len, 0);
  drawS(ctx, HERO_MARK, p); ctx.setTransform(m);
}
function drawHero(t) {
  if (t < T.hero) return;
  const [x, y] = heroPos(t), st = { x, y, ang: heroAng(t) };
  const fade = 1 - ss(seg(t, 36.4, 38.0));                       // the parachute comes apart
  if (fade > 0) drawSeed(HERO, st, 1, fade);
  // the seed itself sinks into the soil
  const sink = ss(seg(t, 37.0, 39.0)), m = ctx.getTransform();
  ctx.translate(x, y + 30 * sink); ctx.rotate(st.ang); ctx.translate(-HERO.len, 0);
  ctx.globalAlpha = 1 - ss(seg(t, 38.6, 40.0)); drawS(ctx, HERO.S[0]); ctx.globalAlpha = 1;
  drawS(ctx, HERO_MARK, 1, null, 1 - ss(seg(t, 38.6, 40.0))); ctx.setTransform(m);
  // the vortex ring above the parachute
  const vr = ss(seg(t, 19.0, 19.8)) * (1 - ss(seg(t, 24.6, 25.4)));
  if (vr > 0) {
    ctx.save(); ctx.translate(x, y - 46); ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.setLineDash([22, 14]); ctx.lineDashOffset = -t * 60 - i * 12;
      ctx.ellipse(0, -i * 3, 40 + i * 6, 12 + i * 2, 0, 0, Math.PI * 2);
      ctx.strokeStyle = rgba('#3f7fa8', vr * (.55 - i * .15)); ctx.lineWidth = 3 - i * .7; ctx.stroke();
    }
    ctx.restore();
  }
}

// ---------- notes and titles ----------
let TX = [];
function note(t, id, [t0, t1], x, y, lines, k, leaderTo, world = true) {
  const a = ss(seg(t, t0, t0 + .25)) * (1 - ss(seg(t, t1, t1 + .35)));
  if (a <= 0) return;
  const wp = eo(seg(t, t0 + .2, t0 + .75));
  ctx.globalAlpha = a;
  if (leaderTo) withSeed(81 + id.length, () => drawS(ctx, mk(qcurve(x - 12, y + 8, leaderTo[0], leaderTo[1], -14, 10), 2.4, INK2, { prof: 'tip', nb: 0, a: .8 }), seg(t, t0, t0 + .5)));
  let maxw = 0, yy = y;
  for (const L of lines) {
    ctx.font = L.font; ctx.fillStyle = rgba(L.mono ? INK2 : INK, L.mono ? .72 : .9);
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = L.mono ? '3px' : '0px';
    const w = ctx.measureText(L.text).width; maxw = Math.max(maxw, w);
    ctx.save(); ctx.beginPath(); ctx.rect(x - 10, yy - L.size - 10, (w + 20) * wp, L.size + 30); ctx.clip(); halo(() => ctx.fillText(L.text, x, yy)); ctx.restore();
    yy += L.gap;
  }
  if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '0px';
  ctx.globalAlpha = 1;
  if (a > .99 && wp >= 1) {
    let [x0, y0] = [x, y - lines[0].size], [x1, y1] = [x + maxw, yy];
    if (world) { [x0, y0] = toScr(k, x0, y0); [x1, y1] = toScr(k, x1, y1); }
    TX.push({ id, text: lines.map(l => l.text).join(' '), x0, y0, x1, y1 });
  }
}
const CAV = (text, gap = 56) => ({ text, font: '600 44px Caveat', size: 44, gap });
const MONO = text => ({ text, font: '400 15px "IBM Plex Mono"', size: 15, gap: 30, mono: true });
function season(t, id, [t0, t1], word) {
  const a = ss(seg(t, t0, t0 + .4)) * (1 - ss(seg(t, t1, t1 + .4))); if (a <= 0) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a;
  withSeed(400 + word.length, () => drawS(ctx, mk(qcurve(140, 128, 230, 126, 2, 8), 10, id === 's2' ? '#9fb4c4' : id === 's1' ? '#c98a3a' : '#86a05c', { prof: 'even', nb: 3, a: .8 }), seg(t, t0, t0 + .5)));
  ctx.font = 'italic 500 64px "Cormorant Garamond"'; ctx.fillStyle = rgba(INK, .88);
  const w = ctx.measureText(word).width, wp = eo(seg(t, t0 + .15, t0 + .6));
  ctx.save(); ctx.beginPath(); ctx.rect(120, 120, (w + 40) * wp, 110); ctx.clip(); halo(() => ctx.fillText(word, 140, 200)); ctx.restore();
  ctx.globalAlpha = 1;
  if (a > .99 && wp >= 1) TX.push({ id, text: word, x0: 140, y0: 140, x1: 140 + w, y1: 215 });
}
function endText(t) {
  const wp = eio(seg(t, T.end0, T.end0 + .75)); if (wp <= 0) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = 'italic 500 76px "Cormorant Garamond"'; ctx.fillStyle = rgba(INK, .86);
  const txt = 'до следующей весны', w = ctx.measureText(txt).width, x = 140, y = 300;
  ctx.save(); ctx.beginPath(); ctx.rect(x - 20, y - 90, (w + 40) * wp, 130); ctx.clip(); halo(() => ctx.fillText(txt, x, y)); ctx.restore();
  withSeed(91, () => drawS(ctx, mk(qcurve(x, y + 26, x + w * .55, y + 24, 2, 12), 4, '#c8442a', { prof: 'brush', nb: 2, a: .75 }), seg(t, T.end0 + .5, T.end0 + 1.1)));
  if (wp >= 1) TX.push({ id: 'end', text: txt, x0: x, y0: y - 70, x1: x + w, y1: y + 20 });
}

// ---------- the frame ----------
function render(t) {
  const k = cam(t); TX = [];
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.drawImage(PAPER_IMG, 0, 0);
  // winter sky cools a little
  const W = win(t); if (W > 0) { ctx.fillStyle = rgba('#c9d0d6', .16 * W); ctx.fillRect(0, 0, 1920, 1080); }
  const rev = -200 + 2600 * eio(seg(t, ...T.A.ground));
  ctx.save(); ctx.beginPath(); ctx.moveTo(-10, 0);
  for (let y = 0; y <= 1080; y += 30) ctx.lineTo(rev + 60 * Math.sin(y / 90 + 1) + 30 * Math.sin(y / 33), y);
  ctx.lineTo(-10, 1080); ctx.closePath(); ctx.clip();
  setCam(k, .5); ctx.drawImage(HILLS.cv, HILLS.x0, HILLS.y0);
  setCam(k); ctx.drawImage(GROUND.cv, GROUND.x0, GROUND.y0);
  const A = aut(t); if (A > 0) { ctx.globalAlpha = A; ctx.drawImage(GROUND_AUT.cv, GROUND_AUT.x0, GROUND_AUT.y0); ctx.globalAlpha = 1; }
  ctx.restore();
  setCam(k);
  // river: brush-edge wipe as it comes into view
  {
    const sx = (RIVER.x - k.x) * k.s + 960, p = seg(2100 - sx, 0, 600);
    if (p > 0 && sx > -900) {
      const r = RIVER.spr; ctx.save(); ctx.beginPath(); ctx.rect(r.x0, r.y0, r.cv.width * eio(p), r.cv.height); ctx.clip(); ctx.drawImage(r.cv, r.x0, r.y0); ctx.restore();
      drawList(ctx, RIVER.S, seg(p, .3, 1));
    }
  }
  // trees: paint in as they enter; seasons on the canopy
  for (const tr of TREES) {
    const sx = (tr.x - k.x) * k.s + 960; if (sx < -600 || sx > 2600) continue;
    const p = seg(1950 - sx, 0, 520);
    if (p <= 0) continue;
    if (p < 1) { drawList(ctx, tr.W, seg(p, 0, .5)); drawList(ctx, tr.L, seg(p, .4, 1)); continue; }
    ctx.drawImage(tr.sprW.cv, tr.sprW.x0, tr.sprW.y0);
    const g = greenA(t), aa = autA(t), sp = springP(t);
    if (g > 0) { ctx.globalAlpha = g; ctx.drawImage(tr.sprL.cv, tr.sprL.x0, tr.sprL.y0); }
    if (aa > 0) { ctx.globalAlpha = aa; ctx.drawImage(tr.sprA.cv, tr.sprA.x0, tr.sprA.y0); }
    ctx.globalAlpha = 1;
    if (t >= 44 && sp > 0) { if (sp < 1) drawList(ctx, tr.L, sp); else ctx.drawImage(tr.sprL.cv, tr.sprL.x0, tr.sprL.y0); }
  }
  for (const lf of LEAVES_FALL) {
    const d = t - lf.t0; if (d < 0 || d > 5) continue;
    const top = lf.tr.tops[0], x = lf.tr.x + lf.ox + 40 * Math.sin(1.6 * d + lf.ph) + 30 * d, y = 980 + lf.oy + lf.v * d;
    const yy = Math.min(y, 990 + (lf.ph * 7) % 30), m = ctx.getTransform();
    ctx.translate(x, yy); ctx.rotate(d < 4 && y < 990 ? 2 * Math.sin(2 * d + lf.ph) : lf.ph); ctx.globalAlpha = 1 - ss(seg(t, 42, 43.5));
    drawS(ctx, lf.s, 1, lf.col); ctx.globalAlpha = 1; ctx.setTransform(m);
  }
  // meadow tufts
  for (const tf of TUFTS) {
    const sx = (tf.x - k.x) * k.s + 960; if (sx < -300 || sx > 2200) continue;
    const p = Math.min(seg(t, .4, 1.6), seg(1900 - sx, 0, 380));
    if (p >= 1) { ctx.drawImage(tf.spr.cv, tf.spr.x0, tf.spr.y0); if (A > 0) { ctx.globalAlpha = A; ctx.drawImage(tf.sprA.cv, tf.sprA.x0, tf.sprA.y0); ctx.globalAlpha = 1; } }
    else drawList(ctx, tf.S, p);
  }
  drawPlant(PA, t, T.A, T.gust, 0, k, { hero: HERO });
  if (t > 44) drawPlant(PB, t, T.B, T.gust2, DX, k);
  setCam(k); drawHero(t);
  // snow: paper rises over the ground, flakes fall
  if (W > 0) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const top = lerp(1120, (930 - k.y) * k.s + 540 - 18, W);
    ctx.save(); ctx.beginPath(); ctx.moveTo(0, 1080);
    for (let x = 0; x <= 1920; x += 40) ctx.lineTo(x, top + 10 * Math.sin(x / 120 + 1) + 6 * Math.sin(x / 41));
    ctx.lineTo(1920, 1080); ctx.closePath(); ctx.clip(); ctx.globalAlpha = .93; ctx.drawImage(PAPER_IMG, 0, 0); ctx.restore(); ctx.globalAlpha = 1;
    const fa = ss(seg(t, 39.0, 40.0)) * (1 - ss(seg(t, 42.6, 43.6)));
    for (const f of FLAKES) {
      const y = ((f.y + f.v * t) % 2160 + 2160) % 2160 - 1080, x = f.x + 18 * Math.sin(.8 * t + f.ph);
      if (y < -10 || y > 1090) continue;
      ctx.beginPath(); ctx.arc(x, y, f.r, 0, Math.PI * 2); ctx.fillStyle = rgba('#fbf7ef', fa * .95); ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = rgba('#9aa9b6', fa * .5); ctx.stroke();
    }
  }
  // notes
  setCam(k);
  note(t, 'note1', T.note1, 1010, 262, [CAV('Taraxacum officinale', 30), MONO('ОДУВАНЧИК')], k, [935, 330]);
  note(t, 'note2', T.note2, 470, 300, [CAV('до 200 семян', 30), MONO('В ОДНОЙ ГОЛОВКЕ')], k, [760, 360]);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const hs = toScr(k, ...heroPos(t));
  note(t, 'note3', T.note3, 150, 170, [CAV('вихревое кольцо над пушинками', 52), CAV('держит семя в воздухе', 40)], k, null, false);
  note(t, 'note4', T.note4, 150, 170, [CAV('обычно — несколько метров,', 52), CAV('иногда — километры', 40)], k, null, false);
  season(t, 's1', T.s1, 'осень'); season(t, 's2', T.s2, 'зима'); season(t, 's3', T.s3, 'весна');
  endText(t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
window.render = render;
window.TEXTS = t => { render(t); return TX; };

window.EV = [];
(async () => {
  PAPER_IMG = new Image(); PAPER_IMG.src = 'paper.jpg'; await PAPER_IMG.decode();
  await Promise.all(['600 44px Caveat', 'italic 500 76px "Cormorant Garamond"', '400 15px "IBM Plex Mono"'].map(f => document.fonts.load(f, 'дТa')));
  build();
  const E = window.EV, br = (t, d, g, p0 = -.4, p1 = .4) => E.push({ t, type: 'brush', d, g, p0, p1 });
  br(.05, 1.6, .35, -.9, .9); br(.4, 2.2, .5, -.1, .1); br(.8, 1.4, .3, -.4, -.3); br(1.0, 2.4, .45, -.5, .4); br(1.6, 1.6, .25);
  br(3.0, 1.9, .55, -.3, .3); br(6.6, 1.8, .3, .1, -.1);
  E.push({ t: T.note1[0], type: 'pencil', d: 1.0, g: .4, p: .4 }, { t: T.note2[0], type: 'pencil', d: .9, g: .4, p: -.4 }, { t: T.mark, type: 'dab', g: .5 });
  E.push({ t: T.gust, type: 'gust', d: 5 });
  for (const s of PA.SEEDS) if (s !== HERO) E.push({ t: T.gust + .05 + s.w, type: 'seed', p: clamp(Math.cos(s.a), -1, 1) });
  E.push({ t: T.hero, type: 'seed', p: 0, g: 1.6 });
  E.push({ t: 16.5, type: 'wind', d: 17 }, { t: 21.0, type: 'river', d: 6.5 });
  E.push({ t: T.note3[0], type: 'pencil', d: 1.1, g: .35, p: -.6 }, { t: T.note4[0], type: 'pencil', d: 1.1, g: .35, p: -.6 });
  br(17, 1.4, .2, .6, .9); br(22, 1.4, .25, .6, .9); br(25.5, 1.8, .25, .6, .9); br(28.5, 1.6, .22, .6, .9);
  E.push({ t: T.land, type: 'land' });
  E.push({ t: 35.0, type: 'leaves', d: 5.5 }, { t: 38.8, type: 'snow', d: 5.2 });
  E.push({ t: T.s1[0], type: 'pencil', d: .7, g: .3, p: -.7 }, { t: T.s2[0], type: 'pencil', d: .7, g: .3, p: -.7 }, { t: T.s3[0], type: 'pencil', d: .7, g: .3, p: -.7 });
  br(44.6, 2.2, .45, -.3, .3); br(45, 2.5, .3, .5, .8); br(45.6, 2.0, .45, -.1, .1); br(47.6, 1.8, .55, -.3, .3); br(50.4, 1.8, .3, .1, -.1);
  E.push({ t: T.gust2, type: 'gust', d: 5 });
  for (const s of PB.SEEDS) E.push({ t: T.gust2 + .05 + s.w, type: 'seed', p: clamp(Math.cos(s.a), -1, 1) });
  E.push({ t: T.end0, type: 'pencil', d: .9, g: .3, p: .6 });
  window.READY = true;
})();
