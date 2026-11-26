// «Эвересттен секирсе эмне болот?» — 60 s vertical Reel, Data Storytelling. Pure function of t.
import * as E from './engine.js';
import { clamp, lerp } from '/core/lib.js';
const cv = document.getElementById('c'), g = cv.getContext('2d');
const { P } = E;
window.DUR = 60;
await Promise.all(['400 40px Literata', '600 40px Literata', '500 40px Caveat', '700 40px Caveat', '400 20px "IBM Plex Mono"', '500 20px "IBM Plex Mono"'].map(f => document.fonts.load(f, 'өүңЭ')));
const FALL = (await (await fetch('fall.json')).json()).series;          // [t, h, v] every 0.1 s, from fall.py

// ---------- helpers ----------
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ss = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const eio = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const eo = x => 1 - Math.pow(1 - clamp(x), 3);
function track(keys) {                                                   // eased keyframes [[t, v], ...]
  return t => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) { const [a, va] = keys[i], [b, vb] = keys[i + 1]; if (t <= b) return lerp(va, vb, eio((t - a) / (b - a))); }
    return keys[keys.length - 1][1];
  };
}
const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
let TX = [];
const reg = (id, text, x0, y0, x1, y1, pass = false) => TX.push({ id, text, x0, y0, x1, y1, ...(pass ? { pass: true } : {}) });

// ---------- timeline ----------
const T = {
  vo1: 0.5, vo2: 51.5,
  bars: [5.0, 6.6, 8.2, 9.8], tall: [10.6, 14.9],
  cond: [[14.6, 20.6], [15.4, 20.6], [16.2, 20.6]],
  morph: [20.8, 22.4], fall: [22.8, 38.0],
  fact1: [25.0, 31.6], fact2: [32.0, 38.0], camp: [28.0, 51.0],
  slope: [38.4, 44.8], rozov: [45.2, 51.2], verdict: [51.3, 60], ask: [53.8, 60],
};
const KA = .115, KB = .27, XS = 15;                                     // bar scale px/m; fall chart px/m and px/s
const fallU = t => ss(seg(t, ...T.morph));                              // 0 = bar chart, 1 = fall chart
const yOf = (h, u) => -lerp(h * KA, (h - 5000) * KB, u);
const BARS = [
  { name: 'Бурж-Халифа', h: 828, x0: 40, x1: 150 },
  { name: 'Хан-Теңири', h: 7010, x0: 200, x1: 310 },
  { name: 'Жеңиш чокусу', h: 7439, x0: 360, x1: 470 },
  { name: 'Эверест', h: 8849, x0: 540, x1: 690, red: true },
];
// the fall, compressed: real 0..49.2 s → film T.fall
const FT = FALL[FALL.length - 1][0];
const fallAt = t => { const k = seg(t, ...T.fall) * FT, i = Math.min(FALL.length - 1, Math.round(k * 10)); return FALL[i]; };
const fallXY = p => [p[0] * XS, -(p[1] - 5000) * KB];

// ---------- camera ----------
const cx = track([[0, 250], [3.6, 250], [9.5, 340], [12.6, 340], [14.6, 520], [20.0, 520], [21.4, 370], [38.0, 370], [39.0, 370], [44.8, 370], [46, 300], [51, 300], [55, 370]]);
const cy = track([[0, -820], [3.6, -820], [9.5, -540], [12.6, -540], [14.6, -1100], [20.0, -1100], [21.4, -560], [38.0, -560], [44.8, -560], [46, -620], [51, -620], [55, -560]]);
const cz = track([[0, 1.55], [3.6, 1.55], [9.5, 1.1], [12.6, 1.1], [14.6, 1.45], [20.0, 1.45], [21.4, 1.08], [38.0, 1.08], [44.8, 1.08], [46, 1.25], [51, 1.25], [55, 1.02], [60, 1.04]]);
function cam(t) {
  let y = cy(t), z = cz(t);
  if (t > 22.2 && t < 39.0) {                                             // gently follow the falling dot
    const [, dy] = fallXY(fallAt(t)), w = ss(seg(t, 22.2, 24)) * (1 - ss(seg(t, 38.0, 39.0)));
    y = Math.min(lerp(y, dy + 120, .55 * w), -430); z = lerp(z, 1.2, w);
  }
  return { x: cx(t), y, zoom: z, roll: 0 };
}

// ---------- notes ----------
function note(t, id, [t0, t1], text, x, y, o = {}) {
  const a = ss(seg(t, t0, t0 + .2)) * (1 - ss(seg(t, t1, t1 + .3))); if (a <= 0) return null;
  const { size = 44, color = P.blue, leaderTo = null, align = 'left', weight = 600, k } = o;
  const p = seg(t, t0 + .15, t0 + .15 + Math.max(.5, text.length * .035));
  g.save(); g.globalAlpha = a;
  if (leaderTo) { const w = E.measureHand(g, text, size, weight), lx = align === 'right' ? x - w - 10 : x + w * .3; E.pencilStroke(g, E.quadPath([lx, y + 12], [lerp(lx, leaderTo[0], .5) + 30, lerp(y, leaderTo[1], .5) - 10], leaderTo, 18), { color, width: 2.2, progress: seg(t, t0, t0 + .45), seed: id.length * 7 }); E.pencilStroke(g, E.ringPath(leaderTo[0], leaderTo[1], 16, id.length), { color, width: 2, progress: seg(t, t0 + .3, t0 + .7) }); }
  const r = E.handText(g, text, x, y, { size, color, progress: p, align, weight, zoom: k ? k.zoom : 1 });
  g.restore();
  if (k && p >= 1 && a > .99) { const [X0, Y0] = E.w2s(k, r.left, y - size * .8), [X1, Y1] = E.w2s(k, r.left + r.w, y + size * .25); reg(id, text, X0, Y0, X1, Y1); }
  return r;
}
// screen-space caption for the two voiced lines (words revealed across the line)
function vcap(t, id, t0, dur, text) {
  const ba = ss(seg(t, t0 - .3, t0)) * (1 - ss(seg(t, t0 + dur + 1.4, t0 + dur + 1.7))); if (ba > 0) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = ba * .94; g.fillStyle = P.paper; g.fillRect(0, 1470, 1080, 220); g.restore(); }
  const words = text.split(' '), n = words.length;
  const ws = words.map((w, i) => ({ w, t: t0 + dur * i / n }));
  E.caption(g, ws, t, { t0: t0 - .1, t1: t0 + dur + 1.4, x: 90, y: 1600, size: 50, maxW: 900, kicker: 'ҮН · ELEVENLABS' });
}

// ---------- the frame ----------
function render(t) {
  TX = [];
  const k = cam(t), u = fallU(t);
  E.drawPaper(g, k, { dots: .8 }); E.applyCam(g, k);
  // headline (world space)
  const head = ss(seg(t, 3.8, 4.6)) * (1 - ss(seg(t, 13.0, 13.6)));
  if (head > 0) { g.save(); g.globalAlpha = head; E.setType(g, 'Эң бийик чокулар, метр', 0, -1160, { size: 40, font: 'Literata', weight: 600, color: P.ink, progress: seg(t, 3.8, 5.0) }); g.restore(); if (head > .99 && t > 5.1) reg('head', 'Эң бийик чокулар, метр', ...E.w2s(k, 0, -1200), ...E.w2s(k, 470, -1150)); }
  const head2 = ss(seg(t, 22.2, 23.0)) * (1 - ss(seg(t, 51.0, 51.8)));
  if (head2 > 0) { g.save(); g.globalAlpha = head2; E.setType(g, 'Чокудан кулоо: бийиктик жана убакыт', 0, -1160, { size: 34, font: 'Literata', weight: 600, color: P.ink, progress: seg(t, 22.2, 23.6) }); g.restore(); if (head2 > .99 && t > 23.7) reg('head2', 'Чокудан кулоо: бийиктик жана убакыт', ...E.w2s(k, 0, -1195), ...E.w2s(k, 700, -1150)); }
  // y axis + ticks (rescale during the morph: the lower half stretches out of the frame)
  E.pencilStroke(g, [[0, 10], [0, -1110]], { color: P.ink, width: 2.2, progress: seg(t, .2, 1.4), seed: 2 });
  g.save(); g.beginPath(); g.rect(-200, -1300, 1200, 1400); g.clip();
  for (let h = 0; h <= 9000; h += 1000) {
    const y = yOf(h, u); if (y > 15) continue;
    const a = ss(seg(t, .6 + h / 9000 * 1.2, .9 + h / 9000 * 1.2)) * (u > 0 && h < 5000 ? 1 - u : 1);
    if (a <= 0) continue;
    g.save(); g.globalAlpha = a; g.strokeStyle = P.rule; g.lineWidth = 1; g.beginPath(); g.moveTo(0, y); g.lineTo(760, y); g.stroke();
    E.setType(g, fmt(h), -14, y + 7, { size: 21, align: 'right', color: P.inkSoft }); g.restore();
  }
  // x axis: ground, then time
  E.pencilStroke(g, [[0, 0], [760, 0]], { color: P.ink, width: 2.2, progress: seg(t, 4.2, 5.0), seed: 3 });
  // bars
  BARS.forEach((b, i) => {
    const t0 = T.bars[i], p = eo(seg(t, t0, t0 + .7)); if (p <= 0) return;
    const fade = b.red ? 1 : 1 - u, morph = b.red ? u : 0;
    if (fade <= 0) return;
    const x0 = lerp(b.x0, -6, morph), x1 = lerp(b.x1, 6, morph), top = yOf(b.h, u) * p, bot = lerp(0, yOf(5000, 1), morph);
    g.save(); g.globalAlpha = fade * (b.red ? 1 - .75 * ss(seg(t, 21.8, 22.6)) : 1);
    E.inkShape(g, [[x0, bot], [x0, top], [x1, top], [x1, bot]], { fill: b.red ? '#C24A3A' : '#B9C4CC', hatch: .45, progress: 1, seed: 5 + i });
    if (u < .5) {
      E.handText(g, fmt(b.h), (b.x0 + b.x1) / 2, top - 18, { size: 40, color: b.red ? P.red : P.ink, align: 'center', weight: 700, progress: seg(t, t0 + .4, t0 + .9), zoom: k.zoom });
      E.handText(g, b.name, (b.x0 + b.x1) / 2, 46, { size: 30, color: P.ink, align: 'center', progress: seg(t, t0 + .2, t0 + .8), zoom: k.zoom });
    }
    g.restore();
  });
  g.restore();
  // hook: the question on the empty plot
  note(t, 'q', [0.9, 4.4], 'Эвересттен секирсе', 70, -900, { size: 58, color: P.red, weight: 700, k });
  if (t > 1.3) note(t, 'q2', [1.3, 4.4], 'эмне болот?', 70, -830, { size: 58, color: P.red, weight: 700, k });
  // how tall
  note(t, 'tall', T.tall, 'Бурж-Халифадан 10 эсе бийик', 185, -1090, { size: 40, k, leaderTo: [600, -1030] });
  // conditions at the top
  note(t, 'c1', T.cond[0], 'аба 2,5 эсе суюк', 250, -1290, { size: 42, k });
  note(t, 'c2', T.cond[1], 'суук: −20…−35 °C', 250, -1225, { size: 42, k });
  note(t, 'c3', T.cond[2], 'шамал 200 км/саатка чейин', 250, -1160, { size: 42, k, leaderTo: [615, -1075] });
  // the fall chart
  if (u > 0) {
    const ta = seg(t, 21.6, 22.6);
    E.pencilStroke(g, [[0, 0], [760, 0]], { color: P.ink, width: 2, progress: ta, seed: 9 });
    if (ta > 0) for (let s = 0; s <= 50; s += 10) { g.save(); g.globalAlpha = ss(seg(t, 21.8 + s / 50, 22.2 + s / 50)); E.setType(g, s + ' с', s * XS, 34, { size: 20, align: 'center', color: P.inkSoft }); g.restore(); }
    if (ta > .9 && t < T.ask[0] - .2) { g.save(); g.globalAlpha = ss(seg(t, 22.4, 23.0)); E.setType(g, 'убакыт, секунд →', 760, 74, { size: 20, align: 'right', color: P.inkSoft }); E.setType(g, 'бийиктик, м', 12, -1120, { size: 20, color: P.inkSoft }); g.restore(); }
    // base camp
    const by = -(5364 - 5000) * KB;
    if (t > T.camp[0]) { const a = 1 - ss(seg(t, T.camp[1], T.camp[1] + .4)); g.save(); g.globalAlpha = a; E.dashedCell(g, 0, by, 760, by, { progress: seg(t, T.camp[0], T.camp[0] + .8), color: P.inkSoft, dash: 10, gap: 8 }); g.restore(); note(t, 'camp', T.camp, 'базалык лагерь · 5 364 м', 300, by - 18, { size: 34, color: P.inkSoft, k }); }
    // the curve + the falling dot
    const fp = seg(t, ...T.fall), dim = 1 - .6 * ss(seg(t, 38.4, 39.4));
    if (fp > 0) {
      const n = Math.max(2, Math.round(fp * (FALL.length - 1))), pts = [];
      for (let i = 0; i <= n; i += 5) pts.push(fallXY(FALL[i])); pts.push(fallXY(FALL[n]));
      g.save(); g.globalAlpha = dim; E.inkLine(g, pts, { color: P.red, width: 4 }); g.restore();
      const cur = fallAt(t), [dx, dy] = fallXY(cur);
      const trail = []; for (let j = 8; j >= 1; j--) { const i = Math.max(0, n - j * 25); trail.push(fallXY(FALL[i])); }
      if (fp < 1) E.dotTrail(g, trail, { color: P.red, r0: 9, r1: 3 });
      E.dataDot(g, dx, dy, 15, P.red, { fresh: t - T.fall[0], alpha: dim });
      if (t < 38.8) {                                                   // live readouts beside the dot (counters: not for reading in full)
        const kmh = Math.round(cur[2] * 3.6), a = ss(seg(t, 23.0, 23.5)) * (1 - ss(seg(t, 38.2, 38.7)));
        g.save(); g.globalAlpha = a;
        E.setType(g, kmh + ' км/саат', dx + 34, dy - 8, { size: 34, font: 'IBM Plex Mono', weight: 500, color: P.red });
        E.setType(g, fmt(cur[1]) + ' м · ' + cur[0].toFixed(0) + ' с', dx + 34, dy + 26, { size: 22, color: P.inkSoft });
        g.restore();
        const [X0, Y0] = E.w2s(k, dx + 34, dy - 40), [X1, Y1] = E.w2s(k, dx + 300, dy + 30); reg('speed', 'live', X0, Y0, X1, Y1, true);
      }
    }
    note(t, 'f1', T.fact1, 'аба суюк: 15 секундда ~290 км/саат', 150, -1040, { size: 38, k, color: P.red });
    note(t, 'f2', T.fact2, 'базага чейин ~49 секунд', 40, -210, { size: 40, k, color: P.red });
    // the correction: the mountain is not a cliff
    const sp = seg(t, T.slope[0], T.slope[0] + 1.6);
    if (sp > 0 && t < T.slope[1] + .5) {
      const a = 1 - ss(seg(t, T.slope[1], T.slope[1] + .4)); g.save(); g.globalAlpha = a;
      const prof = [[40, -1039], [150, -900], [230, -860], [330, -650], [420, -560], [520, -380], [640, -210], [740, -98]];
      E.pencilStroke(g, prof, { color: P.ink, width: 3, progress: sp, seed: 21, passes: 3 });
      E.pencilStroke(g, prof.map(([x, y]) => [x, y - 10]), { color: P.red, width: 2, progress: seg(t, T.slope[0] + .8, T.slope[0] + 2.6), seed: 22, wobble: 3 });
      g.restore();
      note(t, 'sl1', [T.slope[0] + .6, T.slope[1]], 'бирок тоо — тик дубал эмес:', 290, -1030, { size: 40, color: P.red, k });
      note(t, 'sl2', [T.slope[0] + 1.6, T.slope[1]], 'адам капталдан тоголонуп кетет', 290, -970, { size: 40, color: P.red, k });
      if (a > 0) { g.save(); g.globalAlpha = a * ss(seg(t, T.slope[0] + 1, T.slope[0] + 1.5)); E.setType(g, 'СХЕМА', 560, -640, { size: 20, color: P.inkSoft, track: 3 }); g.restore(); }
    }
    // the one case that worked: Rozov 2013
    if (t > T.rozov[0]) {
      const ry = -(7220 - 5000) * KB, a = 1 - ss(seg(t, 54.0, 54.6));
      g.save(); g.globalAlpha = a;
      E.dataDot(g, 0, ry, 14, P.blue, { fresh: t - T.rozov[0] });
      const glide = E.quadPath([0, ry], [260, ry - 40], [560, ry + 230], 30);
      E.pencilStroke(g, glide, { color: P.blue, width: 3, progress: seg(t, T.rozov[0] + .3, T.rozov[0] + 2.2), seed: 31 });
      const pa = ss(seg(t, T.rozov[0] + 2.0, T.rozov[0] + 2.6));
      if (pa > 0) { g.globalAlpha = a * pa; E.pencilStroke(g, Array.from({ length: 21 }, (_, i) => { const q = Math.PI + Math.PI * i / 20; return [560 + Math.cos(q) * 44, ry + 170 + Math.sin(q) * 26]; }), { color: P.blue, width: 2.4, seed: 33 }); for (const sx of [-44, 0, 44]) E.pencilStroke(g, [[560 + sx, ry + 170], [560, ry + 222]], { color: P.blue, width: 1.4, seed: 34 + sx }); }
      g.restore();
      note(t, 'r1', [T.rozov[0] + .3, T.rozov[1]], 'Валерий Розов, 2013-ж.', 250, -1030, { size: 44, k });
      note(t, 'r2', [T.rozov[0] + 1.2, T.rozov[1]], '7 220 м · вингсьют + парашют', 250, -975, { size: 36, k });
      note(t, 'r3', [T.rozov[0] + 2.4, T.rozov[1]], 'аман-эсен конду', 200, ry + 330, { size: 40, k });
    }
  }
  // screen-space: the pencil, captions, the final question
  g.setTransform(1, 0, 0, 1, 0, 0);
  const pen = penTip(t, k);
  if (pen) E.drawPencil(g, { tip: pen.tip, s: .8, lift: pen.lift, flip: pen.flip });
  vcap(t, 'vo1', T.vo1 + .1, 2.2, 'Эвересттин чокусунан секирсеңиз эмне болот?');
  vcap(t, 'vo2', T.vo2 + .1, 2.1, 'Парашютсуз — эч ким тирүү калбайт.');
  const ak = ss(seg(t, T.ask[0], T.ask[0] + .4));
  if (ak > 0) {
    g.save(); g.globalAlpha = ak;
    E.setType(g, 'Сиз секирмек белеңиз?', 540, 330, { size: 64, font: 'Literata', weight: 600, color: P.ink, align: 'center', progress: seg(t, T.ask[0], T.ask[0] + .7) });
    E.setType(g, 'ЖООБУҢУЗДУ КОММЕНТАРИЙГЕ ЖАЗЫҢЫЗ', 540, 390, { size: 22, color: P.inkSoft, align: 'center', track: 2, progress: seg(t, T.ask[0] + .3, T.ask[0] + 1.0) });
    g.restore();
    if (t > T.ask[0] + 1.0) reg('ask', 'Сиз секирмек белеңиз? ЖООБУҢУЗДУ КОММЕНТАРИЙГЕ ЖАЗЫҢЫЗ', 120, 270, 960, 400);
  }
}

// the pencil follows whatever is being drawn
function penTip(t, k) {
  const W = (x, y) => E.w2s(k, x, y);
  let tgt = null, lift = .9, flip = 0;
  const on = (a, b) => t >= a && t <= b;
  if (on(.2, 1.4)) { tgt = W(0, lerp(10, -1110, seg(t, .2, 1.4))); lift = .05; }
  else if (on(1.4, 4.2)) { tgt = W(300 + 60 * Math.sin(t * 2), -780); lift = .5 + .2 * Math.sin(t * 3); flip = 1; }
  else if (on(4.2, 5.0)) { tgt = W(lerp(0, 760, seg(t, 4.2, 5.0)), 0); lift = .05; }
  else for (let i = 0; i < 4; i++) { const b = BARS[i], t0 = T.bars[i]; if (on(t0 - .3, t0 + 1.2)) { const p = eo(seg(t, t0, t0 + .7)); tgt = W(b.x1, -b.h * KA * p); lift = t < t0 ? .5 : .08; flip = b.red ? 1 : 0; } }
  if (!tgt && on(10.6, 12.0)) { tgt = W(lerp(120, 560, seg(t, 10.7, 11.9)), -1100); lift = .1; }
  if (!tgt && on(14.6, 18.4)) { const i = Math.min(2, Math.floor((t - 14.6) / .8)); tgt = W(250 + 360 * seg(t - 14.6 - i * .8, .15, 1.0), [-1290, -1225, -1160][i] - 12); lift = .1; }
  if (!tgt && on(22.8, 38.0)) { const [dx, dy] = fallXY(fallAt(t)); tgt = W(dx, dy); lift = .06; flip = 1; }
  if (!tgt && on(38.4, 41.4)) { tgt = W(lerp(40, 740, seg(t, 38.4, 40.0)), lerp(-1039, -98, seg(t, 38.4, 40.0))); lift = .08; flip = 1; }
  if (!tgt && on(45.2, 47.6)) { const q = seg(t, 45.5, 47.4), p = E.quadPath([0, -599], [260, -639], [560, -369], 30); tgt = W(...p[Math.round(q * 30)]); lift = .08; }
  if (!tgt) { if (t > 52) return null; tgt = [880, 1500]; lift = 1.1; }
  return { tip: tgt, lift, flip };
}

window.render = render;
window.TEXTS = t => { render(t); return TX; };
const EV = [
  { t: T.vo1, type: 'vo', id: 'v1' }, { t: T.vo2, type: 'vo', id: 'v2' },
  { t: .2, type: 'ruler', d: 1.2 }, { t: 4.2, type: 'ruler', d: .8 }, { t: 20.4, type: 'ruler', d: 1.0 },
  { t: .9, type: 'scratch', d: 1.2 }, { t: 1.3, type: 'scratch', d: .8 },
  ...BARS.map((b, i) => ({ t: T.bars[i] + .7, type: 'plonk', h: b.h })),
  ...BARS.map((b, i) => ({ t: T.bars[i], type: 'scratch', d: .7 })),
  { t: T.tall[0], type: 'scratch', d: 1.0 }, ...T.cond.map(c => ({ t: c[0], type: 'scratch', d: .8 })),
  { t: T.morph[0], type: 'ratchet', d: 1.4 },
  { t: T.fall[0], type: 'whoosh' }, { t: T.fall[0], type: 'fallwind', d: T.fall[1] - T.fall[0] },
  { t: T.camp[0], type: 'scratch', d: .8 }, { t: T.fact1[0], type: 'scratch', d: 1.2 }, { t: T.fact2[0], type: 'scratch', d: .9 },
  { t: T.fall[1], type: 'hit' },
  { t: T.slope[0], type: 'scratch', d: 2.6 }, { t: T.slope[0] + .6, type: 'scratch', d: 1.0 }, { t: T.slope[0] + 1.6, type: 'scratch', d: 1.0 },
  { t: T.rozov[0], type: 'plonk', h: 7220, blue: true }, { t: T.rozov[0] + .3, type: 'scratch', d: 2.0 }, { t: T.rozov[0] + 2.4, type: 'scratch', d: .7 },
  { t: T.ask[0], type: 'tap' },
];
for (let h = 8000; h >= 6000; h -= 1000) { const i = FALL.findIndex(p => p[1] <= h); EV.push({ t: T.fall[0] + FALL[i][0] / FT * (T.fall[1] - T.fall[0]), type: 'plonk', h, soft: true }); }
window.EV = EV;
window.READY = true;
