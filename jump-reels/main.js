// «Бүт адамзат бир убакта секирсе эмне болот?» — 60 s vertical Reel, Data Storytelling. Pure function of t.
import * as E from './engine.js';
import { clamp, lerp } from '/core/lib.js';
const cv = document.getElementById('c'), g = cv.getContext('2d');
const { P } = E;
window.DUR = 60;
await Promise.all(['400 40px Literata', '600 40px Literata', '500 40px Caveat', '700 40px Caveat', '400 20px "IBM Plex Mono"', '500 20px "IBM Plex Mono"'].map(f => document.fonts.load(f, 'өүңЭa0≈')));

const seg = (t, a, b) => clamp((t - a) / (b - a));
const ss = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const eio = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const eo = x => 1 - Math.pow(1 - clamp(x), 3);
function track(keys) { return t => { if (t <= keys[0][0]) return keys[0][1]; for (let i = 0; i < keys.length - 1; i++) { const [a, va] = keys[i], [b, vb] = keys[i + 1]; if (t <= b) return lerp(va, vb, eio((t - a) / (b - a))); } return keys[keys.length - 1][1]; }; }
let TX = [];
const reg = (id, text, x0, y0, x1, y1) => TX.push({ id, text, x0, y0, x1, y1 });
const BLUE = P.blue, RED = P.red, EARTH = '#8FB3C9', LAKE = '#6FA3C8';

// ---------- timeline ----------
const T = { vo1: .4, vo2: 52.4, dots: [4.2, 12.0], merge: [14.0, 15.2], earth: [15.0, 16.4], s3: 22.6, jump: [23.6, 26.6], zoom: [27.8, 29.2], s4: 34.8, s5: 43.4 };
const Y3 = 2300, Y4 = 4600, Y5 = 6900;
// camera: one sheet, scrolled down scene by scene
const cy = track([[0, 0], [13.6, 0], [15.4, 300], [21.8, 300], [T.s3, Y3], [34.0, Y3], [T.s4, Y4], [42.6, Y4], [T.s5, Y5]]);
const cz = track([[0, 1.04], [13.6, 1.04], [15.4, .92], [21.8, .92], [T.s3, 1.0], [27.6, 1.0], [29.2, 1.1], [34.0, 1.1], [T.s4, 1.0], [42.6, 1.0], [T.s5, 1.0], [60, 1.03]]);
const cam = t => ({ x: 0, y: cy(t), zoom: cz(t), roll: 0 });

// ---------- notes ----------
function note(t, k, id, [t0, t1], text, x, y, o = {}) {
  const a = ss(seg(t, t0, t0 + .2)) * (1 - ss(seg(t, t1, t1 + .3))); if (a <= 0) return;
  const { size = 44, color = BLUE, align = 'left', weight = 600, leaderTo = null } = o;
  const p = seg(t, t0 + .15, t0 + .15 + Math.max(.5, text.length * .03));
  g.save(); g.globalAlpha = a;
  if (leaderTo) { const w = E.measureHand(g, text, size, weight), lx = align === 'center' ? x : align === 'right' ? x - w * .5 : x + w * .5; E.pencilStroke(g, E.quadPath([lx, y + 14], [lerp(lx, leaderTo[0], .5) + 30, lerp(y, leaderTo[1], .5)], leaderTo, 18), { color, width: 2.2, progress: seg(t, t0, t0 + .45), seed: id.length * 7 }); }
  const r = E.handText(g, text, x, y, { size, color, progress: p, align, weight, zoom: k.zoom });
  g.restore();
  if (p >= 1 && a > .99) { const [X0, Y0] = E.w2s(k, r.left, y - size * .8), [X1, Y1] = E.w2s(k, r.left + r.w, y + size * .25); reg(id, text, X0, Y0, X1, Y1); }
}
function typeLine(t, k, id, [t0, t1], text, x, y, o = {}) {
  const a = ss(seg(t, t0, t0 + .2)) * (1 - ss(seg(t, t1, t1 + .3))); if (a <= 0) return;
  const { size = 60, color = P.ink, align = 'center', font = 'Literata', weight = 600, track: tr = 0 } = o;
  const p = seg(t, t0, t0 + Math.max(.4, text.length * .025));
  const w = E.setType(g, text, x, y, { size, font, weight, color, align, progress: p, alpha: a, track: tr });
  if (p >= 1 && a > .99) { const x0 = align === 'center' ? x - w / 2 : x, [X0, Y0] = E.w2s(k, x0, y - size * .85), [X1, Y1] = E.w2s(k, x0 + w, y + size * .25); reg(id, text, X0, Y0, X1, Y1); }
}
function vcap(t, t0, dur, text) {
  const ba = ss(seg(t, t0 - .3, t0)) * (1 - ss(seg(t, t0 + dur + 1.4, t0 + dur + 1.7))); if (ba <= 0) return;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = ba * .94; g.fillStyle = P.paper; g.fillRect(0, 1470, 1080, 220); g.restore();
  const words = text.split(' '), n = words.length;
  E.caption(g, words.map((w, i) => ({ w, t: t0 + dur * i / n })), t, { t0: t0 - .1, t1: t0 + dur + 1.4, x: 90, y: 1600, size: 50, maxW: 900, kicker: 'ҮН · ELEVENLABS' });
}

// ---------- scene 1–2: the people ----------
const N = 82, COLS = 10, GAP = 76, GX0 = -(COLS - 1) * GAP / 2, GY0 = -230;
const dotT = i => T.dots[0] + (T.dots[1] - T.dots[0]) * Math.sqrt(i / (N - 1));          // gaps shrink: the count accelerates
const dotXY = i => [GX0 + (i % COLS) * GAP, GY0 + Math.floor(i / COLS) * GAP];
const ONE = [0, 405];                                                                     // humanity as one dot, on the Earth
function scenePeople(t, k) {
  if (t > 22.6) return;
  const m = eio(seg(t, ...T.merge));
  for (let i = 0; i < N; i++) {
    const t0 = dotT(i); if (t < t0) continue;
    const [x, y] = dotXY(i), d = m > 0 ? Math.hypot(x - ONE[0], y - ONE[1]) : 0;
    const mx = lerp(x, ONE[0], ss(m * 1.15 - d / 3000)), my = lerp(y, ONE[1], ss(m * 1.15 - d / 3000));
    E.dataDot(g, mx, my, lerp(24, 9, m), BLUE, { fresh: t - t0, ripple: t - t0 < .15 ? 1 : 0, alpha: m < 1 ? 1 : 0 });
  }
  if (m >= 1) E.dataDot(g, ...ONE, 10, BLUE, { fresh: t - T.merge[1] });
  // the counter under the grid while dots land
  const n = Math.min(N, Math.max(0, Math.floor(N * Math.min(1, ((t - T.dots[0]) / (T.dots[1] - T.dots[0])) ** 2) + (t >= T.dots[1] ? N : 0))));
  if (t > T.dots[0] && t < 14.2) { g.save(); g.globalAlpha = 1 - ss(seg(t, 13.8, 14.2)); E.setType(g, (n / 10).toFixed(1).replace('.', ',') + ' млрд', 0, 520, { size: 72, font: 'IBM Plex Mono', weight: 500, color: P.ink, align: 'center' }); g.restore(); }
  // the Earth: a huge arc (not to scale)
  const ep = seg(t, ...T.earth);
  if (ep > 0) {
    const R = 3800, C = [0, 420 + R], pts = [];
    for (let a = -Math.PI / 2 - .5; a <= -Math.PI / 2 + .5; a += .01) pts.push([C[0] + Math.cos(a) * R, C[1] + Math.sin(a) * R]);
    pts.push([1400, 2000], [-1400, 2000]);
    g.save(); g.globalAlpha = 1 - ss(seg(t, 22.0, 22.6)); E.inkShape(g, pts, { fill: EARTH, hatch: .35, progress: ep, seed: 41 }); g.restore();
  }
}

// ---------- scene 3: the jump ----------
const JT = .57, JH = 40, J0 = .1, PX = 760;                          // airtime s, height cm, jump start s, plot width px
const jx = s => -380 + s * PX, jy = cm => Y3 - cm * 10;
const hPeople = s => (s < J0 || s > J0 + JT) ? 0 : 4 * JH * ((s - J0) / JT) * (1 - (s - J0) / JT);
const EARTH_K = 4.1e11 / 5.972e24 * 1e13;                            // Earth's dip relative to people's height, at ×10¹³
function sceneJump(t, k) {
  if (t < 21.8 || t > 34.6) return;
  const a = ss(seg(t, 21.8, 22.6)) * (1 - ss(seg(t, 34.0, 34.6)));
  g.save(); g.globalAlpha = a;
  E.pencilStroke(g, [[-380, jy(-32)], [-380, jy(52)]], { color: P.ink, width: 2, progress: seg(t, 22.4, 23.2), seed: 51 });
  E.pencilStroke(g, [[-380, Y3], [380, Y3]], { color: P.ink, width: 2, progress: seg(t, 22.6, 23.4), seed: 52 });
  for (let cm = -30; cm <= 50; cm += 10) { g.save(); g.globalAlpha = a * ss(seg(t, 22.6, 23.2)); g.strokeStyle = P.rule; g.lineWidth = 1; if (cm) { g.beginPath(); g.moveTo(-380, jy(cm)); g.lineTo(380, jy(cm)); g.stroke(); } E.setType(g, cm + ' см', -394, jy(cm) + 7, { size: 20, align: 'right', color: P.inkSoft }); g.restore(); }
  for (let s = 0; s <= 1.0001; s += .2) E.setType(g, s.toFixed(1).replace('.', ',') + ' с', jx(s), Y3 + 40, { size: 20, align: 'center', color: P.inkSoft, alpha: a * ss(seg(t, 22.8, 23.4)) });
  E.setType(g, 'убакыт, секунд →', 380, Y3 + 80, { size: 20, align: 'right', color: P.inkSoft, alpha: a * ss(seg(t, 23, 23.6)) });
  // the curves are drawn as the clock runs; then the Earth's line is magnified ×10¹³
  const jp = seg(t, ...T.jump), amp = eio(seg(t, ...T.zoom)), n = Math.round(jp * 100), pp = [], ep = [];
  for (let i = 0; i <= n; i++) { const s = i / 100; pp.push([jx(s), jy(hPeople(s))]); ep.push([jx(s), jy(-hPeople(s) * EARTH_K * amp)]); }
  if (n > 1) { E.inkLine(g, ep, { color: RED, width: 4 }); E.inkLine(g, pp, { color: BLUE, width: 4 }); }
  if (n > 0 && jp < 1) { const s = n / 100; E.dataDot(g, jx(s), jy(hPeople(s)), 13, BLUE, { ripple: 0 }); E.dataDot(g, jx(s), jy(-hPeople(s) * EARTH_K * amp), 10, RED, { ripple: 0 }); }
  if (amp > 0) { g.save(); g.globalAlpha = a * ss(seg(t, T.zoom[0], T.zoom[0] + .3)) * (1 - ss(seg(t, 33.8, 34.2))); E.setType(g, 'ЖЕР ×10 000 000 000 000', 380, jy(-38), { size: 24, font: 'IBM Plex Mono', weight: 500, color: RED, align: 'right' }); g.restore(); }
  g.restore();
  typeLine(t, k, 'h3', [22.6, 34.0], 'Баары 40 см секирсе', 0, Y3 - 720, { size: 58 });
  note(t, k, 'p1', [24.2, 34.0], 'адамдар: абада 0,57 секунд', -360, Y3 - 600, { size: 44 });
  note(t, k, 'e1', [26.0, 34.0], 'Жер: сызык түп-түз...', -380, Y3 + 470, { size: 44, color: RED });
  note(t, k, 'e2', [29.3, 34.0], 'чоңойтсок: Жер 0,00000000000003 м', -380, Y3 + 540, { size: 40, color: RED });
  note(t, k, 'e3', [29.45, 34.0], 'ылдый жылат — атомдон 3 600 эсе аз', -380, Y3 + 592, { size: 40, color: RED });
}

// ---------- scene 4: where would we stand ----------
function sceneArea(t, k) {
  if (t < 34.0 || t > 43.6) return;
  const a = ss(seg(t, 34.0, 34.8)) * (1 - ss(seg(t, 42.8, 43.6)));
  const S = 7, sp = Math.sqrt(8200) * S, sl = Math.sqrt(6236) * S, x0 = -sp / 2, yb = Y4 + 330;
  g.save(); g.globalAlpha = a;
  E.inkShape(g, [[x0, yb], [x0, yb - sp], [x0 + sp, yb - sp], [x0 + sp, yb]], { fill: '#E9C4BC', hatch: .35, progress: seg(t, 36.4, 37.4), seed: 61 });
  E.inkShape(g, [[x0, yb], [x0, yb - sl], [x0 + sl, yb - sl], [x0 + sl, yb]], { fill: LAKE, hatch: .3, progress: seg(t, 35.2, 36.2), seed: 62 });
  g.restore();
  typeLine(t, k, 'h4', [34.8, 42.8], 'Баарыбыз кайда турабыз?', 0, Y4 - 720, { size: 58 });
  note(t, k, 'a1', [35.6, 42.8], 'Ысык-Көл · 6 236 км²', x0 + 20, yb - sl / 2, { size: 44, color: '#1F3F5C' });
  note(t, k, 'a2', [36.8, 42.8], 'ар бирибизге 1 м²', x0 + 20, yb - sp - 80, { size: 44, color: RED });
  note(t, k, 'a3', [37.4, 42.8], '= 8 200 км²', x0 + 20, yb - sp - 24, { size: 44, color: RED });
  note(t, k, 'a4', [38.6, 42.8], 'Ысык-Көлдөн 1,3 эсе гана чоң', -360, yb + 110, { size: 46, color: P.ink });
}

// ---------- scene 5: going home ----------
function sceneHome(t, k) {
  if (t < 42.6) return;
  const S = 76, x0 = -380, y1 = Y5 - 160, y2 = Y5 + 60;
  const b1 = eo(seg(t, 44.4, 45.4)), b2 = eo(seg(t, 46.0, 47.2));
  E.inkShape(g, [[x0, y1], [x0, y1 - 90], [x0 + 5 * S * b1 + 1, y1 - 90], [x0 + 5 * S * b1 + 1, y1]], { fill: '#B9C4CC', hatch: .4, progress: b1 > 0 ? 1 : 0, seed: 71 });
  E.inkShape(g, [[x0, y2], [x0, y2 - 90], [x0 + 8.2 * S * b2 + 1, y2 - 90], [x0 + 8.2 * S * b2 + 1, y2]], { fill: '#C24A3A', hatch: .4, progress: b2 > 0 ? 1 : 0, seed: 72 });
  typeLine(t, k, 'h5', [43.4, 60], 'Эң чоң көйгөй — үйгө кайтуу', 0, Y5 - 720, { size: 54 });
  note(t, k, 'b1', [44.4, 60], 'учактар 1 жылда: ~5 млрд жүргүнчү', x0, y1 - 120, { size: 40, color: P.ink });
  note(t, k, 'b2', [46.0, 60], 'кайтаруу керек: 8,2 млрд адам', x0, y2 - 120, { size: 40, color: RED });
  note(t, k, 'b3', [47.8, 60], '≈ 1,6 жыл бардык учактар менен', x0, y2 + 90, { size: 46, color: RED });
  typeLine(t, k, 'fin', [49.6, 60], 'Секирүү — 0,57 сек. Үйгө кайтуу — 1,6 жыл.', 0, Y5 + 300, { size: 38, weight: 600 });
  typeLine(t, k, 'cta', [55.2, 60], 'ДОСУҢУЗГА ЖӨНӨТҮҢҮЗ', 0, Y5 + 380, { size: 26, font: 'IBM Plex Mono', weight: 500, color: P.inkSoft, track: 3 });
}

// ---------- the pencil: follows what is being drawn ----------
function penTip(t, k) {
  const W = (x, y) => E.w2s(k, x, y);
  if (t >= T.dots[0] - .2 && t < T.dots[1] + .2) { const i = Math.min(N - 1, Math.max(0, Math.round((N - 1) * ((t - T.dots[0]) / (T.dots[1] - T.dots[0])) ** 2))); return { tip: W(...dotXY(i)), lift: .15 + .1 * Math.sin(t * 9) }; }
  if (t >= T.earth[0] && t < T.earth[1]) return { tip: W(lerp(-1000, 1000, seg(t, ...T.earth)), 520), lift: .05 };
  if (t >= T.jump[0] && t < T.jump[1]) { const s = Math.round(seg(t, ...T.jump) * 100) / 100; return { tip: W(jx(s), jy(hPeople(s))), lift: .05 }; }
  if (t >= 35.2 && t < 37.4) { const S = 7, sp = Math.sqrt(8200) * S, sl = Math.sqrt(6236) * S, x0 = -sp / 2, yb = Y4 + 330, side = t < 36.2 ? sl : sp, p = seg(t, t < 36.2 ? 35.2 : 36.4, t < 36.2 ? 36.2 : 37.4); return { tip: W(x0 + side * p, yb - side), lift: .05, flip: 1 }; }
  if (t >= 44.4 && t < 47.2) { const two = t >= 46.0, p = eo(seg(t, two ? 46.0 : 44.4, two ? 47.2 : 45.4)); return { tip: W(-380 + (two ? 8.2 : 5) * 76 * p, two ? Y5 + 15 : Y5 - 205), lift: .05, flip: two ? 1 : 0 }; }
  if (t < 52) return { tip: [900, 1380], lift: 1.1 };
  return null;
}

function render(t) {
  TX = [];
  const k = cam(t);
  E.drawPaper(g, k, { dots: .8 }); E.applyCam(g, k);
  // hook (scene 1)
  if (t < 14.4) {
    note(t, k, 'q1', [.6, 13.8], 'Бүт адамзат', -330, -660, { size: 72, color: RED, weight: 700 });
    note(t, k, 'q2', [1.0, 13.8], 'бир убакта секирсе?', -330, -580, { size: 72, color: RED, weight: 700 });
    note(t, k, 'n1', [5.0, 13.8], '1 чекит = 100 млн адам', -330, -400, { size: 48 });
  }
  scenePeople(t, k);
  if (t > 15 && t < 22.6) {
    note(t, k, 'm1', [16.0, 21.8], 'бул — бүт адамзат:', -330, 120, { size: 46 });
    note(t, k, 'm2', [16.8, 21.8], '≈ 0,41 млрд тонна', -330, 180, { size: 46, leaderTo: [ONE[0] - 16, ONE[1] - 16] });
    note(t, k, 'm3', [17.4, 21.8], 'Жер андан 15 триллион эсе оор', -360, -60, { size: 46, color: RED });
    if (t > 15.6) E.setType(g, 'МАСШТАБ САКТАЛГАН ЭМЕС', 0, 760, { size: 20, color: '#2B4A63', align: 'center', track: 3, alpha: ss(seg(t, 15.6, 16.2)) * (1 - ss(seg(t, 21.8, 22.4))) });
  }
  sceneJump(t, k); sceneArea(t, k); sceneHome(t, k);
  g.setTransform(1, 0, 0, 1, 0, 0);
  const pen = penTip(t, k); if (pen) E.drawPencil(g, { tip: pen.tip, s: .8, lift: pen.lift, flip: pen.flip || 0 });
  vcap(t, T.vo1 + .1, 2.6, 'Бүт адамзат бир убакта секирсе эмне болот?');
  vcap(t, T.vo2 + .1, 1.7, 'Жер муну байкабай да калат.');
}
window.render = render;
window.TEXTS = t => { render(t); return TX; };
const EV = [
  { t: T.vo1, type: 'vo', id: 'v1' }, { t: T.vo2, type: 'vo', id: 'v2' },
  { t: .6, type: 'scratch', d: 1.0 }, { t: 1.0, type: 'scratch', d: 1.2 }, { t: 5.0, type: 'scratch', d: 1.0 },
  ...Array.from({ length: N }, (_, i) => ({ t: dotT(i), type: 'plonk', h: 3000 + (i % 10) * 600, soft: i > 30 })),
  { t: T.merge[0], type: 'sweep', d: 1.2 }, { t: T.earth[0], type: 'ruler', d: 1.4 }, { t: 17.4, type: 'scratch', d: 1.2 },
  { t: 22.4, type: 'ruler', d: 1.0 }, { t: T.jump[0], type: 'boing' }, { t: T.jump[0] + 2, type: "thud" },
  { t: 26.0, type: 'scratch', d: 1.0 }, { t: T.zoom[0], type: 'ratchet', d: 1.4 }, { t: 29.3, type: 'scratch', d: 1.8 },
  { t: 35.2, type: 'ruler', d: 1.0 }, { t: 36.4, type: 'ruler', d: 1.0 }, { t: 38.6, type: 'scratch', d: 1.2 },
  { t: 44.4, type: 'ruler', d: 1.0 }, { t: 46.0, type: 'ruler', d: 1.2 }, { t: 47.8, type: 'scratch', d: 1.2 },
  { t: 55.2, type: 'tap' },
];
window.EV = EV;
window.READY = true;
