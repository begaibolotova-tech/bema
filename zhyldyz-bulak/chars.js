// Characters: Aizada, Nurbek, Zhyldyzcha (the star creature), Grandma. Front-facing picture-book drawings,
// parametric by pose (arm/leg key points) and expression. Local coords: feet at (0,0), up = negative y.
import { line, fill, dab, ellipse, handCircle, xf, smooth } from './crayon.js';
import { part, tube, curve } from './rig.js';
import { PAL } from './pal.js';
import { lerp } from '/core/lib.js';
const K = PAL.crayon;
const LW = 7;
const lo = (seed, x = {}) => ({ w: LW, seed, ...x });
function T0(o) { const k = o.flip ? -1 : 1; return pts => xf(pts, { x: o.x || 0, y: o.y || 0, s: o.s || 1, r: o.r || 0, sx: k }); }

// default limbs
const ARMS = {
  down: { L: [[-34, -190], [-50, -150], [-56, -112]], R: [[34, -190], [50, -150], [56, -112]] },
  up: { L: [[-34, -190], [-70, -230], [-86, -280]], R: [[34, -190], [70, -230], [86, -280]] },
  hold: { L: [[-34, -190], [-44, -150], [-14, -140]], R: [[34, -190], [44, -150], [14, -140]] },   // hands together in front
  reach: { L: [[-34, -190], [-50, -150], [-56, -112]], R: [[34, -190], [80, -180], [122, -176]] },
  hug: { L: [[-34, -190], [-70, -170], [-110, -176]], R: [[34, -190], [70, -170], [110, -176]] },
};
const LEGS = {
  stand: { L: [[-18, -108], [-20, -54], [-22, -6]], R: [[18, -108], [20, -54], [22, -6]] },
  walkA: { L: [[-18, -108], [-30, -56], [-44, -8]], R: [[18, -108], [24, -56], [34, -6]] },
  walkB: { L: [[-18, -108], [-22, -56], [-28, -6]], R: [[18, -108], [32, -58], [46, -12]] },
  kneel: { L: [[-18, -108], [-30, -60], [-60, -40]], R: [[18, -108], [30, -60], [60, -40]] },
  sit: { L: [[-18, -108], [-50, -96], [-60, -40]], R: [[18, -108], [50, -96], [60, -40]] },
};
export function armsOf(k) { return ARMS[k] || ARMS.down; }

// ——— face ———
function face(C, P, o, sd, R = 60) {
  const ex = o.expr || 'calm';
  const eyeY = -2, ex2 = 22;
  const eyes = [[-ex2, eyeY], [ex2, eyeY]];
  // eyes
  eyes.forEach(([x, y], i) => {
    if (ex === 'happy' || ex === 'sing2') { line(C.l, P([[x - 10, y + 5], [x - 4, y - 4], [x + 4, y - 4], [x + 10, y + 5]]), lo(sd + i, { w: 5, taper: 0.3 })); return; }
    if (ex === 'closed' || ex === 'sing') { line(C.l, P([[x - 10, y - 2], [x - 4, y + 5], [x + 4, y + 5], [x + 10, y - 2]]), lo(sd + i, { w: 5, taper: 0.3 })); return; }
    const r = ex === 'surprised' ? 9.5 : 7.5;
    part(C, P(ellipse(x, y, r * 0.82, r * 1.05, 16)), { col: K.ink, p: 1, gap: 3.2, w: 5, over: 0.5, seed: sd + i, ang: 1.3 }, lo(sd + 5 + i, { w: 4 }), { occ: false });
    const [hx, hy] = P([[x + 2.5, y - 3.5]])[0]; dab(C.l, hx, hy, 2.5 * (o.s || 1), { col: K.white, p: 1, seed: sd + 9 + i, gap: 2, w: 3 });
  });
  // brows
  if (ex === 'sad' || ex === 'cry' || ex === 'worried') eyes.forEach(([x], i) => line(C.l, P([[x - 11, -24 + (i ? -5 : 5)], [x + 11, -24 + (i ? 5 : -5)]]), lo(sd + 20 + i, { w: 4.5 })));
  if (ex === 'surprised') eyes.forEach(([x], i) => line(C.l, P([[x - 10, -28], [x + 10, -30]]), lo(sd + 20 + i, { w: 4.5 })));
  if (ex === 'brave') eyes.forEach(([x], i) => line(C.l, P([[x - 11, -24 + (i ? 4 : -4)], [x + 11, -24 + (i ? -4 : 4)]]), lo(sd + 20 + i, { w: 4.5 })));
  // cheeks
  [[-36, 20], [36, 20]].forEach(([x, y], i) => { const q = P([[x, y]])[0]; dab(C.f, q[0], q[1], 10 * (o.s || 1), { col: K.rose, p: 0.75, seed: sd + 30 + i, sq: 0.75 }); });
  // mouth
  const my = 28;
  if (ex === 'sing' || ex === 'surprised' || ex === 'cry') part(C, P(ellipse(0, my, ex === 'cry' ? 9 : 7, ex === 'cry' ? 7 : 9, 18)), { col: K.red, p: 0.85, gap: 3, w: 4, over: 0.5, seed: sd + 40 }, lo(sd + 41, { w: 4.5 }), { occ: false });
  else if (ex === 'happy' || ex === 'smile' || ex === 'sing2') part(C, P([[-13, my - 4], [-6, my + 7], [6, my + 7], [13, my - 4]]), { col: K.red, p: 0.8, gap: 3, w: 4, over: 0.5, seed: sd + 40 }, lo(sd + 41, { w: 4.5 }), { occ: false });
  else if (ex === 'sad' || ex === 'worried') line(C.l, P([[-8, my + 4], [0, my - 1], [8, my + 4]]), lo(sd + 40, { w: 4.5 }));
  else line(C.l, P([[-8, my - 1], [0, my + 4], [8, my - 1]]), lo(sd + 40, { w: 4.5 }));
  // tears
  if (ex === 'cry' || o.tears) [[-ex2, 10], [ex2, 10]].forEach(([x, y], i) => {
    const d = (o.tearT ?? 0.5); line(C.l, P([[x + (i ? 4 : -4), y], [x + (i ? 6 : -6), y + 14 + 26 * d]]), lo(sd + 50 + i, { w: 6, col: K.sky, p: 0.95 }));
  });
}

// ——— the children ———
// o: x, y, s, who: 'a' | 'n', expr, arms ({L,R} or name), legs (name or {L,R}), flip, r, seed, hatOff
export function kid(C, o) {
  const T = T0(o), P = pts => T(pts), who = o.who || 'a', sd = o.seed || (who === 'a' ? 300 : 500);
  const A = typeof o.arms === 'string' ? ARMS[o.arms] : (o.arms || ARMS.down);
  const Lg = typeof o.legs === 'string' ? LEGS[o.legs] : (o.legs || LEGS.stand);
  const skinF = { col: K.peach, p: 0.5, gap: 10, w: 11, ang: 0.6, seed: sd + 2, over: 3 };
  const hairF = { col: K.ink, p: 0.62, gap: 8, w: 10, ang: 1.1, seed: sd + 3, over: 2.5 };
  const limb = (pts, w, f, s) => part(C, P(tube(curve(pts, 5), w)), f, lo(s));
  const bootF = { col: K.brown, p: 0.85, gap: 6, w: 8, ang: 1.2, seed: sd + 6, over: 1.5 };
  const trouF = { col: K.brown, p: 0.75, gap: 8, w: 10, ang: 1.3, seed: sd + 7, over: 2 };
  // braids behind (Aizada)
  if (who === 'a') {
    [-1, 1].forEach((k, i) => {
      const br = [[k * 50, -250], [k * 66, -205], [k * 70, -160], [k * 66, -128]];
      limb(br, 22, hairF, sd + 60 + i);
      for (let j = 1; j < 4; j++) { const y = -240 + j * 28; line(C.l, P([[k * 56 + k * j * 4 - 9, y - 6], [k * 56 + k * j * 4 + 9, y + 6]]), lo(sd + 64 + j + i * 5, { w: 3.5, p: 0.7 })); }
      dab(C.f, ...P([[k * 66, -124]])[0], 9 * (o.s || 1), { col: K.red, p: 0.9, seed: sd + 70 + i });
    });
  }
  // legs
  [Lg.L, Lg.R].forEach((pts, i) => {
    if (who === 'n') limb(pts, 26, trouF, sd + 80 + i);
    else limb(pts, 18, skinF, sd + 80 + i);
    const b = pts[pts.length - 1], a = pts[pts.length - 2];
    if (who === 'a') part(C, P(tube([[lerp(a[0], b[0], 0.45), lerp(a[1], b[1], 0.45)], b], 24)), bootF, lo(sd + 84 + i));
    part(C, P(ellipse(b[0] + (i ? 8 : -8), b[1] + 2, 17, 9, 18)), who === 'a' ? bootF : { ...bootF, col: K.ink, p: 0.6 }, lo(sd + 86 + i));
  });
  // body
  if (who === 'a') {
    const dress = smooth([[-34, -196], [34, -196], [44, -150], [62, -96], [0, -88], [-62, -96], [-44, -150]], 4);
    part(C, P(dress), { col: K.red, p: 0.72, gap: 10, w: 12, ang: 0.4, seed: sd + 10 }, lo(sd + 11));
    // ornament hem (mustard ram's horns) + vest
    const orn = []; for (let k = 0; k <= 10; k++) { const x = -54 + k * 10.8; orn.push([x, -104 + (k % 2 ? -10 : 0)]); }
    line(C.l, P(orn), lo(sd + 12, { w: 5, col: K.mustard, p: 1 }));
    [-1, 1].forEach((k, i) => part(C, P([[k * 34, -196], [k * 12, -192], [k * 14, -140], [k * 40, -140]]), { col: K.ink, p: 0.55, gap: 7, w: 9, ang: 1.0, seed: sd + 14 + i }, lo(sd + 16 + i, { w: 5 })));
  } else {
    part(C, P([[-36, -198], [36, -198], [40, -106], [-40, -106]]), null, lo(sd + 10));     // white shirt = paper
    [-1, 1].forEach((k, i) => part(C, P([[k * 36, -198], [k * 10, -194], [k * 12, -110], [k * 40, -108]]), { col: K.blue, p: 0.8, gap: 8, w: 10, ang: 0.9, seed: sd + 14 + i }, lo(sd + 16 + i, { w: 5 })));
    line(C.l, P([[-30, -150], [-22, -160], [-14, -150]]), lo(sd + 18, { w: 3.5, col: K.white, p: 1 }));
    line(C.l, P([[14, -150], [22, -160], [30, -150]]), lo(sd + 19, { w: 3.5, col: K.white, p: 1 }));
  }
  // arms (sleeves = dress red / shirt white) + mitten hands
  [A.L, A.R].forEach((pts, i) => {
    if (who === 'a') limb(pts, 20, { col: K.red, p: 0.7, gap: 9, w: 11, ang: 0.4, seed: sd + 90 + i }, sd + 92 + i);
    else limb(pts, 22, null, sd + 92 + i);
    const h = pts[pts.length - 1];
    part(C, P(handCircle(h[0], h[1], 11, sd + 95 + i, 0, 18)), skinF, lo(sd + 96 + i, { w: 5.5 }));
  });
  // head
  const hc = [0, -262];
  const H = pts => P(pts.map(([x, y]) => [x + hc[0], y + hc[1]]));
  if (who === 'n' && !o.hatOff) {
    // short hair under the kalpak
    part(C, H(smooth([[-62, 4], [-64, -30], [-40, -52], [40, -52], [64, -30], [62, 4]], 4)), hairF, null);
  }
  const fc = ellipse(0, 0, 62, 58, 44);
  part(C, H(fc), skinF, null);
  line(C.l, H(ellipse(0, 0, 62, 58, 36, -0.15, Math.PI + 0.15)), lo(sd + 20));
  if (who === 'a') {
    const top = smooth([[-64, 6], [-66, -28], [-44, -58], [0, -66], [44, -58], [66, -28], [64, 6], [52, -18], [24, -36], [2, -44], [-24, -36], [-52, -18]], 4);
    part(C, H(top), hairF, lo(sd + 21, { w: 6 }));
    line(C.l, H([[2, -64], [2, -42]]), lo(sd + 22, { w: 3.5, p: 0.7 }));
  } else if (!o.hatOff) {
    // ak-kalpak: white felt (paper), indigo outline, dark upturned brim, a little ornament
    const cap = smooth([[-62, -30], [-54, -92], [-24, -124], [0, -130], [24, -124], [54, -92], [62, -30]], 5);
    part(C, H([...cap, [62, -30], [-62, -30]]), null, lo(sd + 23));
    part(C, H([[-70, -40], [-30, -46], [30, -46], [70, -40], [66, -22], [30, -28], [-30, -28], [-66, -22]]), { col: K.ink, p: 0.8, gap: 5, w: 8, ang: 0.1, seed: sd + 24 }, lo(sd + 25, { w: 5 }));
    line(C.l, H([[0, -128], [0, -48]]), lo(sd + 26, { w: 3.5, p: 0.7 }));
    line(C.l, H([[-14, -88], [-8, -100], [0, -92], [8, -100], [14, -88]]), lo(sd + 27, { w: 4, p: 0.8 }));
    // bangs
    line(C.l, H([[-40, -26], [-30, -16], [-20, -26], [-10, -16], [0, -26], [10, -16], [20, -26], [30, -16], [40, -26]]), lo(sd + 28, { w: 6, p: 0.8 }));
  }
  face(C, H, { ...o }, sd + 100);
}

// ——— Zhyldyzcha: a palm-sized star creature ———
// o: x, y (centre of body), s, glow 0..1 (tail-tip light), expr, tailK (curl), flip, seed, dim (fur greyer when tired)
export function zhyl(C, o, FXL) {
  const T = T0(o), P = pts => T(pts), sd = o.seed || 900, s = o.s || 1;
  const fur = { col: K.sky, p: o.dim ? 0.45 : 0.75, gap: 6, w: 8, ang: 0.8, seed: sd + 1, over: 2, cross: true, crossP: 0.5 };
  // tail: a curl rising behind the body, ringed sky / white
  const tk = o.tailK ?? 1, sw = o.sway ?? 0;
  const tail = curve([[30, 18], [70, 12], [92, -20], [88 + 6 * sw, -62], [66 + 10 * sw, -86 * tk], [44 + 12 * sw, -78 * tk]], 6);
  part(C, P(tube(tail, 16, 11)), { ...fur, cross: false, p: 0.8 }, lo(sd + 2, { w: 5 }));
  for (let k = 1; k < 6; k++) { const i = Math.floor(k / 6 * (tail.length - 1)); const a = tail[Math.max(0, i - 1)], b = tail[Math.min(tail.length - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; const nx = -dy / d * 9, ny = dx / d * 9; const c = tail[i]; line(C.l, P([[c[0] - nx, c[1] - ny], [c[0] + nx, c[1] + ny]]), lo(sd + 10 + k, { w: 6, col: k % 2 ? K.white : K.blue, p: 0.95 })); }
  const tip = tail[tail.length - 1];
  // ears
  [-1, 1].forEach((k, i) => { part(C, P(handCircle(k * 26, -36, 13, sd + 20 + i, 0, 20)), fur, lo(sd + 22 + i, { w: 5 })); dab(C.f, ...P([[k * 26, -36]])[0], 5 * s, { col: K.rose, p: 0.8, seed: sd + 24 + i }); });
  // body
  const body = smooth([[0, -46], [30, -38], [42, -6], [36, 24], [0, 34], [-36, 24], [-42, -6], [-30, -38]], 5);
  part(C, P(body), fur, lo(sd + 3, { w: 6 }));
  // belly (paper white)
  part(C, P(ellipse(0, 16, 20, 14, 20)), null, lo(sd + 4, { w: 3, p: 0.5 }), { occ: true });
  // eyes: big gold
  const ex = o.expr || 'open';
  [-1, 1].forEach((k, i) => {
    const ec = [k * 15, -12];
    if (ex === 'closed' || ex === 'happy') { line(C.l, P(ex === 'happy' ? [[ec[0] - 9, ec[1] + 4], [ec[0], ec[1] - 5], [ec[0] + 9, ec[1] + 4]] : [[ec[0] - 9, ec[1] - 2], [ec[0], ec[1] + 5], [ec[0] + 9, ec[1] - 2]]), lo(sd + 30 + i, { w: 4.5 })); return; }
    part(C, P(ellipse(ec[0], ec[1], 12, 13, 20)), { col: K.mustard, p: 0.95, gap: 3, w: 5, over: 0.5, seed: sd + 30 + i }, lo(sd + 32 + i, { w: 4 }), { occ: false });
    part(C, P(ellipse(ec[0] + (o.look ?? 0) * 3, ec[1] + 1, 6, 7.5, 14)), { col: K.ink, p: 1, gap: 2.5, w: 4, over: 0.3, seed: sd + 34 + i }, null, { occ: false });
    dab(C.l, ...P([[ec[0] + 3, ec[1] - 4]])[0], 3 * s, { col: K.white, p: 1, seed: sd + 36 + i, gap: 2, w: 3 });
    if (ex === 'sad') line(C.l, P([[ec[0] - 9, ec[1] - 18 + k * 3], [ec[0] + 9, ec[1] - 18 - k * 3]]), lo(sd + 38 + i, { w: 3.5 }));
    if (o.tear && i === 0) line(C.l, P([[ec[0] - 2, ec[1] + 10], [ec[0] - 4, ec[1] + 26]]), lo(sd + 39, { w: 5, col: K.blue, p: 0.9 }));
  });
  dab(C.f, ...P([[0, 4]])[0], 4.5 * s, { col: K.rose, p: 0.9, seed: sd + 40 });
  if (ex === 'happy' || ex === 'smile' || ex === 'open') line(C.l, P([[-6, 10], [0, 14], [6, 10]]), lo(sd + 41, { w: 3.5 }));
  if (ex === 'talk') part(C, P(ellipse(0, 12, 5, 4, 12)), { col: K.red, p: 0.85, gap: 2.5, w: 3, seed: sd + 42 }, lo(sd + 43, { w: 3 }), { occ: false });
  // paws
  [-1, 1].forEach((k, i) => part(C, P(handCircle(k * 20, 32, 8, sd + 44 + i, 0, 14)), fur, lo(sd + 46 + i, { w: 4 })));
  // the glowing tail tip
  const g = o.glow ?? 1;
  const tipW = P([tip])[0];
  star5(C, tipW, (9 + 6 * g) * s, sd + 50, o.r || 0, g > 0.15 ? K.lemon : K.white, 0.4 + 0.6 * g);
  if (FXL && g > 0.05) glow(FXL, tipW, g * s, sd + 60);
  return tipW;
}
// crayon rays around a light (drawn on an FX layer after the wash)
export function glow(L, c, g, seed, col = K.lemon) {
  const n = 8, r0 = 18 * g + 6, r1 = 18 * g + 6 + 26 * g;
  for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + seed; line(L, [[c[0] + Math.cos(a) * r0, c[1] + Math.sin(a) * r0], [c[0] + Math.cos(a) * r1, c[1] + Math.sin(a) * r1]].map(([x, y]) => [x, y]), { w: 4, col, p: 0.85 * Math.min(1, g * 1.5), seed: seed + k, wob: 0.3, screen: true }); }
}
export function star5(C, c, r, seed, rot = 0, col = K.lemon, p = 1) {
  const pts = []; for (let k = 0; k <= 10; k++) { const a = -Math.PI / 2 + rot + k * Math.PI / 5; const rr = k % 2 ? r * 0.48 : r; pts.push([c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr]); }
  part(C, pts, { col, p: 0.95 * p, gap: 3.5, w: 5, over: 1, seed }, { w: 4, seed: seed + 1, col: K.mustard, p: 0.8 * p }, { occ: false });
}

// ——— Grandma ———
export function granny(C, o) {
  const T = T0(o), P = pts => T(pts), sd = o.seed || 700;
  const A = typeof o.arms === 'string' ? ARMS[o.arms] : (o.arms || ARMS.down);
  const skinF = { col: K.peach, p: 0.5, gap: 10, w: 11, ang: 0.6, seed: sd + 2, over: 3 };
  // long dress (violet) to the floor + shoes
  [[-24, 0], [24, 0]].forEach(([x], i) => part(C, P(ellipse(x, 2, 20, 10, 18)), { col: K.brown, p: 0.85, gap: 6, w: 8, seed: sd + 4 + i }, lo(sd + 6 + i)));
  const dress = smooth([[-40, -206], [40, -206], [52, -140], [70, -6], [0, 4], [-70, -6], [-52, -140]], 4);
  part(C, P(dress), { col: K.violet, p: 0.7, gap: 10, w: 12, ang: 0.5, seed: sd + 10 }, lo(sd + 11));
  part(C, P([[-40, -206], [-14, -200], [-16, -120], [-50, -124]]), { col: K.red, p: 0.6, gap: 8, w: 10, ang: 1.0, seed: sd + 12 }, lo(sd + 13, { w: 5 }));
  part(C, P([[40, -206], [14, -200], [16, -120], [50, -124]]), { col: K.red, p: 0.6, gap: 8, w: 10, ang: 1.0, seed: sd + 14 }, lo(sd + 15, { w: 5 }));
  [A.L, A.R].forEach((pts, i) => {
    part(C, P(tube(curve(pts, 5), 22)), { col: K.violet, p: 0.7, gap: 9, w: 11, ang: 0.5, seed: sd + 20 + i }, lo(sd + 22 + i));
    const h = pts[pts.length - 1]; part(C, P(handCircle(h[0], h[1], 11, sd + 24 + i, 0, 18)), skinF, lo(sd + 26 + i, { w: 5.5 }));
  });
  const hc = [0, -268];
  const H = pts => P(pts.map(([x, y]) => [x + hc[0], y + hc[1]]));
  // white headscarf (paper) behind and around the face
  part(C, H(smooth([[-76, 40], [-80, -20], [-56, -70], [0, -84], [56, -70], [80, -20], [76, 40], [40, 60], [-40, 60]], 5)), null, lo(sd + 30));
  part(C, H(ellipse(0, 4, 54, 54, 40)), skinF, lo(sd + 31, { w: 5 }));
  line(C.l, H([[-52, -24], [-30, -46], [0, -52], [30, -46], [52, -24]]), lo(sd + 32, { w: 5 }));
  // face (smiling grandma: arc eyes, wrinkles)
  face(C, pts => H(pts.map(([x, y]) => [x * 0.9, y * 0.9 + 6])), { ...o, expr: o.expr || 'happy' }, sd + 100);
  line(C.l, H([[-46, 0], [-40, 4]]), lo(sd + 40, { w: 3, p: 0.6 })); line(C.l, H([[46, 0], [40, 4]]), lo(sd + 41, { w: 3, p: 0.6 }));
}
