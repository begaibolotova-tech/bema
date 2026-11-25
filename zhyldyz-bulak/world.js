// Scenery in crayon: mountains, walnut trees, poplars, houses (child perspective), river, stones, path, fog, carpet.
// Every helper takes a progress object so the page can draw itself while we watch: d = line progress, f = colouring progress.
import { line, fill, dab, ellipse, handCircle, smooth } from './crayon.js';
import { PAL } from './pal.js';
import { clamp, hash } from '/core/lib.js';
const K = PAL.crayon;
export const pr = (t, a, b) => clamp((t - a) / (b - a));
const LO = (seed, x = {}) => ({ w: 6, seed, ...x });

export function mountains(Lf, Ll, peaks, base, d, f, seed, o = {}) {
  // peaks: [[x, y], ...] left→right; a ridge line with a snow cap on the tall ones
  const pts = [[peaks[0][0] - 200, base]];
  peaks.forEach(([x, y], i) => { const nx = peaks[i + 1]; pts.push([x, y]); if (nx) pts.push([(x + nx[0]) / 2, Math.max(y, nx[1]) + 70 + 40 * hash(seed + i)]); });
  pts.push([peaks[peaks.length - 1][0] + 200, base]);
  fill(Lf, [...pts, [pts[pts.length - 1][0], base + 40], [pts[0][0], base + 40]], { col: o.col || K.violet, p: o.p ?? 0.55, gap: 12, w: 13, ang: 0.9, seed, draw: f, boil: 0 });
  line(Ll, pts, LO(seed + 1, { w: 6, draw: d, boil: 0.6 }));
  peaks.forEach(([x, y], i) => {
    if (o.snow === false || y > base - 180) return;
    const cap = [[x - 70, y + 70], [x - 40, y + 52], [x - 18, y + 78], [x + 8, y + 50], [x + 34, y + 74], [x + 66, y + 62]];
    line(Ll, cap, LO(seed + 10 + i, { w: 5, draw: d, boil: 0.6 }));
    fill(Lf, [[x, y], [x + 66, y + 62], ...cap.slice().reverse()].map(p => p), { col: K.white, p: 1, gap: 6, w: 8, seed: seed + 20 + i, draw: f, boil: 0 });
  });
}
export function hill(Lf, Ll, pts, d, f, seed, col = K.grass, p = 0.55) {
  fill(Lf, pts, { col, p, gap: 12, w: 13, ang: 0.3, seed, draw: f, boil: 0 });
  line(Ll, pts.slice(0, -2), LO(seed + 1, { w: 6, draw: d, boil: 0.6 }));
}
export function walnut(Lf, Ll, x, y, r, d, f, seed, o = {}) {
  // trunk + a round crown of three bumps (a child's tree)
  const trunk = [[x - r * 0.16, y], [x - r * 0.12, y - r * 0.9], [x + r * 0.12, y - r * 0.9], [x + r * 0.16, y]];
  fill(Lf, trunk, { col: K.brown, p: 0.8, gap: 8, w: 10, ang: 1.4, seed, draw: f, boil: 0 });
  line(Ll, trunk, LO(seed + 1, { w: 6, draw: d, boil: 0.6 }));
  if (o.roots) { line(Ll, [[x - r * 0.16, y], [x - r * 0.5, y + 14], [x - r * 0.7, y + 10]], LO(seed + 2, { draw: d, boil: 0.6 })); line(Ll, [[x + r * 0.16, y], [x + r * 0.45, y + 16], [x + r * 0.66, y + 8]], LO(seed + 3, { draw: d, boil: 0.6 })); }
  const crown = smooth([[x - r, y - r * 1.05], [x - r * 0.75, y - r * 1.6], [x - r * 0.2, y - r * 1.95], [x + r * 0.45, y - r * 1.85], [x + r, y - r * 1.4], [x + r * 0.9, y - r * 0.95], [x + r * 0.3, y - r * 0.72], [x - r * 0.5, y - r * 0.74]], 6);
  fill(Lf, crown, { col: o.col || K.grass, p: o.p ?? 0.7, gap: 11, w: 12, ang: 0.7, seed: seed + 4, draw: f, boil: 0, cross: true, crossP: 0.45 });
  line(Ll, crown, LO(seed + 5, { w: 6, draw: d, boil: 0.6 }));
}
export function poplar(Lf, Ll, x, y, h, d, f, seed) {
  const c = smooth([[x, y - h], [x + h * 0.11, y - h * 0.6], [x + h * 0.08, y - h * 0.18], [x, y - h * 0.1], [x - h * 0.08, y - h * 0.18], [x - h * 0.11, y - h * 0.6]], 5);
  fill(Lf, c, { col: K.grass, p: 0.75, gap: 9, w: 10, ang: 1.3, seed, draw: f, boil: 0 });
  line(Ll, c, LO(seed + 1, { w: 5, draw: d, boil: 0.6 }));
  line(Ll, [[x, y - h * 0.12], [x, y]], LO(seed + 2, { w: 6, col: K.brown, draw: d, boil: 0.6 }));
}
export function house(Lf, Ll, x, y, w, h, d, f, seed, o = {}) {
  // gable front + slanted side wall (child perspective); white walls, red roof, blue window frames
  const front = [[x, y], [x, y - h], [x + w / 2, y - h - w * 0.45], [x + w, y - h], [x + w, y]];
  const side = [[x + w, y], [x + w, y - h], [x + w * 1.8, y - h - 30], [x + w * 1.8, y - 30]];
  const roof = [[x + w / 2, y - h - w * 0.45], [x + w * 1.3, y - h - w * 0.45 - 30], [x + w * 1.85, y - h - 34], [x + w, y - h]];
  fill(Lf, roof, { col: o.roof || K.red, p: 0.8, gap: 9, w: 11, ang: 0.4, seed, draw: f, boil: 0 });
  fill(Lf, side, { col: K.mustard, p: 0.35, gap: 12, w: 12, ang: 1.0, seed: seed + 1, draw: f, boil: 0 });
  [front, side, roof].forEach((q, i) => line(Ll, [...q, q[0]], LO(seed + 2 + i, { draw: d, boil: 0.6 })));
  const wx = x + w * 0.3, wy = y - h * 0.72, ww = w * 0.4, wh = h * 0.36;
  const win = [[wx, wy], [wx + ww, wy], [wx + ww, wy + wh], [wx, wy + wh]];
  fill(Lf, win, { col: o.lit ? K.lemon : K.sky, p: 0.8, gap: 6, w: 8, seed: seed + 6, draw: f, boil: 0 });
  line(Ll, [...win, win[0]], LO(seed + 7, { w: 7, col: K.blue, draw: d, boil: 0.6 }));
  line(Ll, [[wx + ww / 2, wy], [wx + ww / 2, wy + wh]], LO(seed + 8, { w: 4, col: K.blue, draw: d, boil: 0.6 }));
}
export function sun(Lf, Ll, x, y, r, d, f, seed, col = K.lemon) {
  const c = handCircle(x, y, r, seed, 0.1, 40);
  fill(Lf, c, { col, p: 0.85, gap: 7, w: 9, seed, draw: f, boil: 0 });
  line(Ll, c, LO(seed + 1, { col: K.mustard, w: 6, draw: d, boil: 0.6 }));
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + 0.2; line(Ll, [[x + Math.cos(a) * (r + 14), y + Math.sin(a) * (r + 14)], [x + Math.cos(a) * (r + 44), y + Math.sin(a) * (r + 44)]], LO(seed + 2 + k, { col: K.mustard, w: 5, draw: clamp(d * 1.5 - 0.5), boil: 0.6 })); }
}
export function skyHatch(Lf, y0, y1, col, f, seed, p = 0.3, x0 = -300, x1 = 2220) {
  fill(Lf, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], { col, p, gap: 15, w: 14, ang: 0.15, seed, draw: f, boil: 0 });
}
export function bird(Ll, x, y, s, seed, flap = 0, d = 1) {
  const k = flap ? -1 : 1;
  line(Ll, [[x - 18 * s, y - 6 * s * k], [x - 8 * s, y - 10 * s * k], [x, y]], LO(seed, { w: 4, draw: d }));
  line(Ll, [[x, y], [x + 8 * s, y - 10 * s * k], [x + 18 * s, y - 6 * s * k]], LO(seed + 1, { w: 4, draw: d }));
}
export function stone(Lf, Ll, x, y, rx, ry, d, f, seed, lit = 0) {
  const c = handCircle(0, 0, 1, seed, 0, 30).map(([a, b]) => [x + a * rx, y + b * ry]);
  fill(Lf, c, { col: lit > 0.5 ? K.lemon : K.brown, p: lit > 0.5 ? 0.85 : 0.55, gap: 7, w: 9, seed, draw: f, boil: 0 });
  line(Ll, c, LO(seed + 1, { w: 6, draw: d, boil: 0.6 }));
}
export function river(Lf, Ll, y0, y1, d, f, seed, t = 0) {
  const top = [], bot = [];
  for (let i = 0; i <= 24; i++) { const x = -200 + i * 97; top.push([x, y0 + 14 * Math.sin(i * 1.3 + seed)]); bot.push([x, y1 + 14 * Math.sin(i * 1.1 + seed + 2)]); }
  fill(Lf, [...top, ...bot.slice().reverse()], { col: K.sky, p: 0.75, gap: 10, w: 12, ang: 0.08, seed, draw: f, boil: 0, cross: true, crossP: 0.4 });
  fill(Lf, [...top.map(([x, y]) => [x, y + (y1 - y0) * 0.45]), ...bot.slice().reverse()], { col: K.blue, p: 0.5, gap: 13, w: 12, ang: 0.1, seed: seed + 5, draw: f, boil: 0 });
  line(Ll, top, LO(seed + 1, { draw: d, boil: 0.6 })); line(Ll, bot, LO(seed + 2, { draw: d, boil: 0.6 }));
  // foam: white wax curls that run with the water (stepped on twos)
  const ph = Math.floor(t * 12) / 12;
  for (let k = 0; k < 14; k++) {
    const x = ((k * 173 + ph * 260) % 2300) - 200, y = y0 + 24 + (k % 4) * (y1 - y0 - 40) / 4;
    line(Ll, [[x, y], [x + 24, y - 10], [x + 48, y], [x + 70, y - 8]], LO(seed + 30 + k, { w: 5, col: K.white, p: f, wob: 0.6 }));
  }
}
export function fog(Ll, cx, cy, hole, dens, seed, t) {
  // fog: grey-blue light scribble + heavy white wax, with a clear circle around the light
  const st = Math.floor(t * 12);
  for (let k = 0; k < 46; k++) {
    const x = -100 + hash(seed + k) * 2100 + Math.sin(st * 0.05 + k) * 30, y = 40 + hash(seed + k * 3.7) * 820;
    const dx = x - cx, dy = y - cy; if (Math.hypot(dx, dy) < hole) continue;
    const w = 180 + 140 * hash(seed + k * 1.3);
    const pts = []; for (let i = 0; i <= 10; i++) pts.push([x + w * i / 10, y + 18 * Math.sin(i * 1.2 + k)]);
    line(Ll, pts, { w: 26, col: K.white, p: 0.9 * dens, seed: seed + 40 + k, wob: 1.5 });
    line(Ll, pts.map(([a, b]) => [a + 10, b + 16]), { w: 14, col: K.sky, p: 0.35 * dens, seed: seed + 140 + k, wob: 1.5 });
  }
}
export function shyrdak(Lf, Ll, x0, y0, x1, y1, d, f, seed) {
  // felt carpet: red field, mustard ram's-horn curls in a row, indigo border
  const R = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  fill(Lf, R, { col: K.red, p: 0.7, gap: 11, w: 12, ang: 0.2, seed, draw: f, boil: 0 });
  line(Ll, [...R, R[0]], LO(seed + 1, { w: 7, draw: d, boil: 0.6 }));
  const n = Math.max(2, Math.floor((x1 - x0) / 150)), cy = (y0 + y1) / 2, r = Math.min(46, (y1 - y0) * 0.28);
  for (let i = 0; i < n; i++) {
    const cx = x0 + (i + 0.5) * (x1 - x0) / n;
    const horn = (k) => { const pts = []; for (let j = 0; j <= 14; j++) { const a = Math.PI * 1.6 * j / 14; const rr = r * (1 - 0.55 * j / 14); pts.push([cx + k * (r * 0.6 - Math.cos(a) * rr * 0.7), cy - Math.sin(a) * rr * 0.8 * (j < 2 ? 1 : 1)]); } return pts; };
    line(Ll, horn(1), LO(seed + 10 + i, { w: 7, col: K.mustard, p: 1, draw: d, boil: 0.6 }));
    line(Ll, horn(-1), LO(seed + 40 + i, { w: 7, col: K.mustard, p: 1, draw: d, boil: 0.6 }));
    line(Ll, [[cx, cy - r * 0.1], [cx, cy + r * 0.9]], LO(seed + 70 + i, { w: 7, col: K.mustard, p: 1, draw: d, boil: 0.6 }));
  }
}
export function whiteStars(L, n, seed, x0, x1, y0, y1, p = 1) {
  for (let k = 0; k < n; k++) {
    const x = x0 + hash(seed + k) * (x1 - x0), y = y0 + hash(seed + k * 7.7) * (y1 - y0), r = 5 + 9 * hash(seed + k * 3.3);
    line(L, [[x - r, y], [x + r, y]], { w: 4.5, col: K.white, p, seed: seed + 100 + k, wob: 0.2, boil: 0.4 });
    line(L, [[x, y - r], [x, y + r]], { w: 4.5, col: K.white, p, seed: seed + 200 + k, wob: 0.2, boil: 0.4 });
    if (r > 10) dab(L, x, y, 4, { col: K.white, p, seed: seed + 300 + k });
  }
}
export function noteGlyph(L, x, y, j, p, s = 1) {
  const c = K.ink;
  line(L, [[x, y], [x, y - 44 * s]], { w: 6, col: c, seed: 1000 + j, p });
  line(L, [[x, y - 44 * s], [x + 18 * s, y - 34 * s], [x + 20 * s, y - 22 * s]], { w: 6, col: c, seed: 1001 + j, p });
  fill(L, handCircle(x - 9 * s, y, 10 * s, j, 0, 16), { col: c, p: 0.95 * p, gap: 3.5, w: 5, seed: 1003 + j, over: 1 });
}
