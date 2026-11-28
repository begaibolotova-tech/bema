// «ЖИ менен 5 пайдалуу иш» — a 60-second vertical reel (1080×1920) in the Pictogram Motion style.
// A catalogue film: one card = one use of AI = one pictogram doing one verb + a huge Kyrgyz title + a line + a typed prompt.
// 120 BPM (beat 0.5 s, bar 2 s); every card starts on a beat. render(t) keeps no state between frames.
(function () {
  const { W, H, PAL, E, inv, clamp, lerp, CREAM } = G;
  const BEAT = 0.5;
  const ctx = document.getElementById('c').getContext('2d');

  // ───────── content ─────────
  const ITEMS = [
    { pk: 'coral',  title: 'КАТ ЖАЗ',  sub: 'Арыз, кат, куттуктоо — бир мүнөттө', prompt: 'Директорго 3 күн өргүү сурап арыз жаз', picto: 'letter' },
    { pk: 'teal',   title: 'ТҮШҮНДҮР', sub: 'Татаал теманы жөнөкөй тил менен',      prompt: 'Инфляцияны 10 жашар балага түшүндүр', picto: 'explain' },
    { pk: 'sky',    title: 'КОТОР',    sub: 'Кыргызча ⇄ англисче, орусча',          prompt: 'Бул текстти англисчеге которуп бер', picto: 'translate' },
    { pk: 'yellow', title: 'ИДЕЯ ТАП', sub: 'Пост, бизнес, белек үчүн',             prompt: 'Апама туулган күнгө 5 белек идея', picto: 'idea' },
    { pk: 'navy',   title: 'ПЛАН ТҮЗ', sub: 'Окуу, спорт, тамак — күнүмдүк план',   prompt: 'Англисче үйрөнүүгө 30 күндүк план түз', picto: 'plan' },
  ];
  const CARDS = [{ t0: 0, t1: 6, kind: 'hook', pk: 'ink' }];
  ITEMS.forEach((it, i) => CARDS.push({ t0: 6 + i * 8, t1: 14 + i * 8, kind: 'item', i, pk: it.pk, it }));
  CARDS.push({ t0: 46, t1: 49, kind: 'wall', pk: 'ink' });
  CARDS.push({ t0: 49, t1: 54, kind: 'check', pk: 'ink' });
  CARDS.push({ t0: 54, t1: 60, kind: 'end', pk: 'yellow' });
  const DUR = 60;
  const TRANS = ['rows', 'cols', 'rows', 'cols', 'rows', 'cols', 'rows', 'cols'];   // one per boundary, rotating
  const TW = 0.2;   // half-width of a grid transition around the cut

  // ───────── layout (IG safe area: keep text between y 230 and 1560, x 70–930) ─────────
  const X0 = 70, TXTW = 860, HUD_Y = 252, ST = { x: 540, y: 770, r: 330 };
  const TITLE_Y = 1300, SUB_Y = 1385, LABEL_Y = 1452, CHIP_Y = 1474;

  // ───────── colours per hue ─────────
  function colors(pk) {
    const P = PAL[pk], light = pk === 'yellow' || pk === 'sky';
    return {
      P, light, bg: P.t[2], disc: light ? P.t[4] : P.t[3], fg: P.fg, main: light ? P.fg : CREAM, ink: light ? P.fg : P.t[0],
      far: G.mix(light ? P.fg : CREAM, light ? P.t[4] : P.t[3], 0.6),
      acc: light ? PAL.coral.t[1] : PAL.yellow.t[2], acc2: light ? PAL.coral.t[0] : PAL.yellow.t[0],
      chip: light ? P.fg : P.t[0], chipText: light ? P.t[4] : CREAM,
    };
  }

  // ───────── text record for readcheck ─────────
  let TX = [], REC = true;
  function T(c, id, text, x, y, font, col, p, o = {}) {
    G.maskText(c, text, x, y, font, col, p, o);
    if (REC && p >= 1) {
      c.save(); c.font = font; const m = c.measureText(text); c.restore();
      const x0 = o.align === 'center' ? x - m.width / 2 : o.align === 'right' ? x - m.width : x;
      TX.push({ id, text, x0, y0: y - m.actualBoundingBoxAscent, x1: x0 + m.width, y1: y + m.actualBoundingBoxDescent });
    }
  }
  function fit(c, text, maxW, px, fontF) { c.save(); c.font = fontF(px); const w = c.measureText(text).width; c.restore(); return w > maxW ? Math.floor(px * maxW / w) : px; }
  const fTitle = (px) => G.F.en(900, px), fSub = (px) => G.F.en(700, px);

  // ───────── background: pattern with drifting rows, a quarter-cell jump on each beat of the first bar ─────────
  function background(c, pk, lt, seed, spread = 0.32, stop = null) {
    const P = PAL[pk];
    c.fillStyle = P.t[2]; c.fillRect(0, 0, W, H);
    const pat = G.pattern(pk, seed, { spread, density: 0.5, set: 'ai' });
    G.drawPattern(c, pat, (j) => {
      const dir = j % 2 ? 1 : -1;
      let tt = lt; if (stop) tt = Math.min(lt, stop(j));
      return dir * (tt * 16 + 45 * Math.floor(clamp(tt, 0, 1.99) / BEAT)) + j * 37;
    });
  }

  // ───────── HUD: mono corners + a 5-tick progress bar ─────────
  function hud(c, lt, idx, C, label) {
    const p = inv(0.1, 0.5, lt);
    c.save(); c.globalAlpha = clamp(p * 1.4);
    G.typeText(c, 'ЖИ САБАГЫ · KG', X0, HUD_Y - 22, G.F.mono(26, 700), C.fg, inv(0.1, 0.5, lt), { ls: '2px' });
    G.typeText(c, label, 1010, HUD_Y - 22, G.F.mono(26, 700), C.fg, inv(0.15, 0.55, lt), { align: 'right', ls: '2px' });
    const n = 5, gap = 12, w = (940 - gap * (n - 1)) / n;
    for (let k = 0; k < n; k++) {
      const cur = k === idx, done = k < idx;
      c.fillStyle = G.rgba(C.fg, cur ? 1 : done ? 0.55 : 0.2);
      const h = cur ? 12 : 5, ww = cur ? w * E.oExp(inv(0.2, 0.7, lt)) : w;
      c.fillRect(X0 + k * (w + gap), HUD_Y + 4 + (12 - h) / 2, ww, h);
    }
    c.restore();
  }

  // ───────── stage: a sun disc + the pictogram, assembled from horizontal bands sliding into register ─────────
  const stg = G.canvas(2 * ST.r + 120, 2 * ST.r + 120), sc = stg.getContext('2d');
  function stage(c, lt, C, draw, o = {}) {
    const S = stg.width, cx = S / 2, cy = S / 2, r = o.r || ST.r;
    sc.clearRect(0, 0, S, S);
    G.disc(sc, cx, cy, r, C.disc);
    // one faint light sweep across the disc
    sc.save(); sc.beginPath(); sc.arc(cx, cy, r, 0, Math.PI * 2); sc.clip();
    const sx = lerp(-r * 1.6, r * 1.6, ((lt * 0.12) % 1 + 1) % 1);
    const g = sc.createLinearGradient(cx + sx - 160, 0, cx + sx + 160, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.10)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    sc.fillStyle = g; sc.fillRect(0, 0, S, S); sc.restore();
    draw(sc, cx, cy, lt);
    const N = 7, bh = S / N, x = (o.x ?? ST.x) - S / 2, y = (o.y ?? ST.y) - S / 2;
    for (let k = 0; k < N; k++) {
      const p = E.oExp(inv(k * 0.035, 0.42 + k * 0.035, lt)), dx = (k % 2 ? 1 : -1) * (1 - p) * 1100;
      if (p <= 0) continue;
      c.drawImage(stg, 0, k * bh, S, bh + 1, x + dx, y + k * bh, S, bh + 1);
    }
  }

  // ───────── the typed prompt chip ─────────
  function wrap(c, text, font, maxW) {
    c.save(); c.font = font; const words = text.split(' '), lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
    lines.push(cur); c.restore(); return lines;
  }
  const CPS = 32;
  function chip(c, lt, id, label, text, C, tLabel, tType) {
    const font = G.F.mono(34, 500), lines = wrap(c, '«' + text + '»', font, TXTW - 70), lh = 48;
    const h = 40 + lines.length * lh, open = E.oExp(inv(tLabel + 0.1, tLabel + 0.5, lt));
    if (open <= 0) return;
    G.maskText(c, label, X0, LABEL_Y, G.F.mono(24, 700), C.fg, inv(tLabel, tLabel + 0.35, lt), { ls: '3px' });
    G.rrect(c, X0, CHIP_Y, TXTW * open, h, 22, C.chip);
    const total = lines.join(' ').length, n = Math.floor((lt - tType) * CPS);
    let left = clamp(n, 0, total), y = CHIP_Y + 20 + 36;
    c.save(); c.font = font; c.fillStyle = C.chipText; let cx = X0 + 34, cy = y;
    for (const L of lines) {
      const s = L.slice(0, clamp(left, 0, L.length)); c.fillText(s, X0 + 34, y);
      if (left > 0) { cx = X0 + 34 + c.measureText(s).width; cy = y; }
      left -= L.length + 1; y += lh;
    }
    if (lt > tType - 0.3 && (n < total || Math.floor(lt / BEAT) % 2 === 0)) { c.fillStyle = C.acc; c.fillRect(cx + 4, cy - 30, 16, 38); }   // caret
    c.restore();
    if (REC && lt >= tType && open >= 1) TX.push({ id, text, x0: X0, y0: CHIP_Y, x1: X0 + TXTW, y1: CHIP_Y + h });
  }

  // ───────── title block ─────────
  function titleBlock(c, lt, id, title, sub, C, t0 = 0.5) {
    const px = fit(c, title, TXTW, 190, fTitle);
    T(c, id + 't', title, X0 - 6, TITLE_Y, fTitle(px), C.fg, inv(t0, t0 + 0.45, lt), { ls: '-2px' });
    const spx = fit(c, sub, TXTW, 50, fSub);
    T(c, id + 's', sub, X0, SUB_Y, fSub(spx), C.fg, inv(t0 + 0.08, t0 + 0.53, lt));
  }

  // ───────── pictograms (drawn into the stage canvas, centre cx, cy; unit s) ─────────
  const s = 200;
  function letter(c, x, y, lt, C) {
    const up = E.oExp(inv(0.5, 1.0, lt)) - E.i3(inv(4.0, 4.5, lt)), flap = E.io3(inv(4.5, 5.0, lt));
    const hop = Math.sin(Math.PI * inv(5.0, 5.4, lt)) * 30 + Math.abs(Math.sin(Math.PI * ((lt - 5.5) / BEAT))) * (lt > 5.5 ? 8 : 0);
    const ew = 1.9 * s, eh = 1.2 * s, ex = x - ew / 2, ey = y + 0.15 * s - hop;
    G.rrect(c, ex, ey, ew, eh, 18, C.acc2);                                  // envelope back
    // letter sheet rising out of the envelope, lines written one per beat
    const shW = 1.5 * s, shH = 1.55 * s, shY = ey + eh * 0.55 - up * 1.25 * s - shH * 0.5;
    c.save(); c.beginPath(); c.rect(ex - 50, 0, ew + 100, ey + eh * 0.6); c.clip();
    G.rrect(c, x - shW / 2, shY, shW, shH, 14, CREAM);
    let pen = null;
    for (let k = 0; k < 5; k++) {
      const p = inv(1.0 + k * 0.5, 1.42 + k * 0.5, lt); if (p <= 0) continue;
      const lw = (k === 4 ? 0.55 : 1.05) * s, lx = x - shW / 2 + 0.22 * s, ly = shY + 0.3 * s + k * 0.24 * s;
      G.seg(c, [lx, ly], [lx + lw * p, ly], 0.075 * s, C.P.t[0]);
      if (p < 1 || k === 4) pen = [lx + lw * p, ly];
    }
    c.restore();
    G.poly(c, [[ex, ey + eh * 0.25], [x, ey + eh * 0.72], [ex + ew, ey + eh * 0.25], [ex + ew, ey + eh], [ex, ey + eh]], C.acc);   // pocket
    G.seg(c, [ex + 20, ey + eh - 16], [x, ey + eh * 0.62], 8, C.acc2); G.seg(c, [ex + ew - 20, ey + eh - 16], [x, ey + eh * 0.62], 8, C.acc2);
    // flap: points up while open, folds down to close
    const fy = lerp(-0.62, 0.62, flap) * eh;
    G.poly(c, [[ex, ey + 2], [x, ey + fy], [ex + ew, ey + 2]], flap < 0.5 ? C.acc2 : C.acc);
    if (lt > 5.0) { const p = E.oBack(inv(5.0, 5.35, lt)); G.disc(c, x, ey + eh * 0.45, 0.2 * s * p, C.P.t[0]); G.spark(c, x, ey + eh * 0.45, 0.13 * s * p, CREAM); }
    if (pen && lt < 4.0) {                                                  // the pen: a capsule tilted, tip on the line
      c.save(); c.translate(pen[0], pen[1]); c.rotate(-0.7);
      G.rrect(c, -0.09 * s, -0.95 * s, 0.18 * s, 0.8 * s, 0.09 * s, C.P.t[0]);
      G.poly(c, [[-0.09 * s, -0.17 * s], [0.09 * s, -0.17 * s], [0, 0]], C.P.t[0]); G.disc(c, 0, -0.06 * s, 0.03 * s, C.acc); c.restore();
    }
  }
  function explain(c, x, y, lt, C) {
    const bw = 2.2 * s, bh = 1.55 * s, by = y - 0.12 * s;
    const pop = 1 + 0.06 * Math.sin(Math.PI * inv(4.0, 4.3, lt));
    c.save(); c.translate(x, by); c.scale(pop, pop); c.translate(-x, -by);
    G.bubble(c, x, by, bw, bh, C.main);
    if (lt < 2.0) for (let i = -1; i <= 1; i++) {                           // typing dots
      const a = Math.max(0, Math.sin(Math.PI * 2 * (lt * 2 - i * 0.25)));
      G.disc(c, x + i * 0.36 * s, by - a * 18, 0.13 * s, G.mix(C.ink, C.main, 0.35 - a * 0.35));
    } else if (lt < 4.0) {                                                   // a question mark
      const p = E.oBack(inv(2.0, 2.3, lt)), q = 0.5 * s * p;
      c.save(); c.translate(x, by - 0.12 * s); c.strokeStyle = C.ink; c.lineWidth = 0.16 * s * p; c.lineCap = 'round';
      c.beginPath(); c.arc(0, -0.2 * s * p, q * 0.75, Math.PI * 1.05, Math.PI * 2.35); c.lineTo(0, 0.18 * s * p); c.stroke();
      G.disc(c, 0, 0.48 * s * p, 0.1 * s * p, C.ink); c.restore();
    } else {                                                                 // becomes an exclamation mark
      const p = E.oBack(inv(4.0, 4.3, lt));
      G.seg(c, [x, by - 0.5 * s * p], [x, by + 0.12 * s * p], 0.2 * s * p, C.acc);
      G.disc(c, x, by + 0.46 * s * p, 0.12 * s * p, C.acc);
    }
    c.restore();
    if (lt > 4.5) for (let k = 0; k < 6; k++) {                              // rays of understanding, pulsing on the beat
      const a = -Math.PI * 0.92 + k * Math.PI * 0.17, pul = 1 + 0.08 * Math.max(0, Math.cos(Math.PI * 2 * (lt - 4.5) / BEAT * 0.5));
      const p = E.oExp(inv(4.5 + k * 0.06, 4.9 + k * 0.06, lt)), r0 = 1.32 * s * pul, r1 = r0 + 0.3 * s * p;
      G.seg(c, [x + Math.cos(a) * r0, by + Math.sin(a) * r0 * 0.85], [x + Math.cos(a) * r1, by + Math.sin(a) * r1 * 0.85], 0.1 * s, C.acc);
    }
  }
  function translate(c, x, y, lt, C) {
    const A = { x: x - 0.5 * s, y: y - 0.55 * s }, B = { x: x + 0.5 * s, y: y + 0.6 * s };
    const SW = [3, 5, 7], word = ['En', 'Ру', 'En', 'Ру'][SW.filter((k) => lt >= k).length];
    const near = SW.reduce((m, k) => (Math.abs(lt - k) < Math.abs(lt - m) ? k : m), -9), flip = Math.abs(lt - near) < 0.15 ? Math.abs(lt - near) / 0.15 : 1;
    G.bubble(c, A.x, A.y, 1.35 * s, 0.95 * s, C.main, 1);
    G.bubble(c, B.x, B.y, 1.35 * s, 0.95 * s, C.acc, -1);
    c.save(); c.font = `${0.55 * s}px "Inter Display Black"`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = C.disc; c.fillText('Кы', A.x, A.y + 4);
    c.translate(B.x, B.y); c.scale(1, flip); c.fillStyle = CREAM; c.fillText(word, 0, 4); c.restore();
    // two arrows between them, turning half a circle at each swap
    const rot = Math.PI * SW.reduce((m, k) => m + E.ioExp(inv(k - 0.2, k + 0.25, lt)), 0);
    c.save(); c.translate(x, y + 0.02 * s); c.rotate(rot);
    c.strokeStyle = C.ink; c.lineWidth = 0.1 * s; c.lineCap = 'round';
    for (const d of [0, Math.PI]) {
      c.beginPath(); c.arc(0, 0, 0.3 * s, d + 0.35, d + 2.4); c.stroke();
      const ax = Math.cos(d + 2.4) * 0.3 * s, ay = Math.sin(d + 2.4) * 0.3 * s;
      c.save(); c.translate(ax, ay); c.rotate(d + 2.4 + Math.PI / 2);
      G.poly(c, [[0.1 * s, 0], [-0.07 * s, -0.1 * s], [-0.07 * s, 0.1 * s]], C.ink); c.restore();
    }
    c.restore();
  }
  function idea(c, x, y, lt, C) {
    const on = lt > 1.0 && !(lt > 1.2 && lt < 1.45);                       // flicker on, off, on
    const by = y - 0.3 * s;
    if (on && lt > 1.45) for (let k = 0; k < 9; k++) {
      const a = -Math.PI + k * Math.PI / 8 - 0.0, p = E.oExp(inv(1.45 + k * 0.03, 1.8 + k * 0.03, lt));
      const pul = 1 + 0.06 * Math.max(0, Math.cos(Math.PI * 2 * lt));
      G.seg(c, [x + Math.cos(a) * 0.95 * s * pul, by + Math.sin(a) * 0.95 * s * pul], [x + Math.cos(a) * (0.95 + 0.28 * p) * s * pul, by + Math.sin(a) * (0.95 + 0.28 * p) * s * pul], 0.09 * s, C.acc);
    }
    G.disc(c, x, by, 0.72 * s, on ? CREAM : C.far);                         // the glass
    G.poly(c, [[x - 0.42 * s, by + 0.45 * s], [x + 0.42 * s, by + 0.45 * s], [x + 0.3 * s, by + 0.95 * s], [x - 0.3 * s, by + 0.95 * s]], on ? CREAM : C.far);
    for (let k = 0; k < 3; k++) G.seg(c, [x - 0.26 * s, by + (1.02 + k * 0.17) * s], [x + 0.26 * s, by + (1.02 + k * 0.17) * s], 0.12 * s, C.ink);
    G.disc(c, x, by + 1.5 * s, 0.1 * s, C.ink);
    // filament: two wires and one loop
    c.save(); c.strokeStyle = on ? C.acc : C.ink; c.lineWidth = 0.07 * s; c.lineCap = 'round'; c.beginPath();
    c.moveTo(x - 0.16 * s, by + 0.45 * s); c.lineTo(x - 0.16 * s, by + 0.05 * s); c.arc(x, by + 0.05 * s, 0.16 * s, Math.PI, 0); c.lineTo(x + 0.16 * s, by + 0.45 * s); c.stroke(); c.restore();
    // five ideas pop out, one per beat
    for (let k = 0; k < 5; k++) {
      const t0 = 2.5 + k * BEAT, p = E.oBack(inv(t0, t0 + 0.3, lt)); if (p <= 0) continue;
      const a = Math.PI * (0.62 + k * 0.19), R = 1.38 * s, px = x - Math.cos(a) * R * 1.05, py = by + 0.35 * s + Math.sin(a) * R * 0.0 - Math.abs(Math.sin(a)) * 0 ;
      const pos = [[x - 1.25 * s, by + 0.55 * s], [x - 1.12 * s, by - 0.55 * s], [x, by - 1.3 * s], [x + 1.12 * s, by - 0.55 * s], [x + 1.25 * s, by + 0.55 * s]][k];
      G.disc(c, pos[0], pos[1], 0.24 * s * p, C.ink);
      c.save(); c.font = G.F.mono(Math.round(0.26 * s * p), 700); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = C.disc; c.fillText(String(k + 1), pos[0], pos[1] + 2); c.restore();
      void px; void py;
    }
  }
  function plan(c, x, y, lt, C) {
    const cw = 2.1 * s, ch = 1.85 * s, cx = x - cw / 2, cy = y - ch / 2 + 0.05 * s;
    G.rrect(c, cx, cy, cw, ch, 22, C.main);
    c.save(); c.beginPath(); c.roundRect(cx, cy, cw, ch, 22); c.clip(); c.fillStyle = C.acc; c.fillRect(cx, cy, cw, 0.42 * s); c.restore();
    for (const dx of [-0.55, 0.55]) G.seg(c, [x + dx * s, cy - 0.12 * s], [x + dx * s, cy + 0.12 * s], 0.11 * s, C.P.t[0]);
    c.save(); c.font = G.F.mono(Math.round(0.2 * s), 700); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = C.P.t[0];
    const days = Math.min(30, Math.max(0, Math.floor((lt - 1.0) / 0.125) + 1));
    c.fillText(`${String(Math.max(days, 0)).padStart(2, '0')} / 30 КҮН`, x, cy + 0.23 * s); c.restore();
    const n = 30, cols = 6, rows = 5, gw = cw - 0.36 * s, gh = ch - 0.66 * s, cs = Math.min(gw / cols, gh / rows);
    const gx = x - cs * cols / 2, gy = cy + 0.54 * s;
    for (let k = 0; k < n; k++) {
      const i = k % cols, j = Math.floor(k / cols), px = gx + i * cs + cs / 2, py = gy + j * cs + cs / 2;
      const p = E.oBack(inv(1.0 + k * 0.125, 1.25 + k * 0.125, lt));
      G.rrect(c, px - cs * 0.38, py - cs * 0.38, cs * 0.76, cs * 0.76, 8, C.far);
      if (p > 0) {
        const q = cs * 0.38 * p; G.rrect(c, px - q, py - q, 2 * q, 2 * q, 8, C.P.t[1]);
        c.save(); c.strokeStyle = C.acc; c.lineWidth = cs * 0.12; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath();
        c.moveTo(px - cs * 0.17 * p, py); c.lineTo(px - cs * 0.04 * p, py + cs * 0.14 * p); c.lineTo(px + cs * 0.2 * p, py - cs * 0.14 * p); c.stroke(); c.restore();
      }
    }
  }
  function hookPicto(c, x, y, lt, C) {
    const p = E.oBack(inv(0.0, 0.5, lt)), tw = 1 + 0.08 * Math.max(0, Math.cos(Math.PI * 2 * lt));
    G.bubble(c, x - 0.15 * s, y + 0.1 * s, 2.0 * s * p, 1.4 * s * p, CREAM);
    for (let i = -1; i <= 1; i++) { const a = Math.max(0, Math.sin(Math.PI * 2 * (lt * 2 - i * 0.25))); G.disc(c, x - 0.15 * s + i * 0.4 * s, y + 0.1 * s - a * 14 * p, 0.13 * s * p, PAL.ink.t[2]); }
    G.spark(c, x + 0.85 * s, y - 0.78 * s, 0.55 * s * p * tw, PAL.yellow.t[2]);
    G.spark(c, x + 1.28 * s, y - 0.2 * s, 0.2 * s * p, PAL.yellow.t[3]);
    G.spark(c, x + 0.38 * s, y - 1.18 * s, 0.16 * s * p, PAL.yellow.t[3]);
  }
  function checkPicto(c, x, y, lt, C) {
    const dw = 1.55 * s, dh = 1.95 * s, dx = x - dw / 2 - 0.25 * s, dy = y - dh / 2;
    G.rrect(c, dx, dy, dw, dh, 16, CREAM);
    for (let k = 0; k < 6; k++) { const ly = dy + 0.3 * s + k * 0.26 * s, wrong = k === 3; G.seg(c, [dx + 0.22 * s, ly], [dx + (k === 5 ? 0.8 : 1.3) * s, ly], 0.08 * s, wrong && lt > 2.2 ? PAL.coral.t[1] : PAL.ink.t[3]); }
    // magnifier sweeps down the lines and stops on the wrong one
    const p = E.io3(inv(0.6, 2.2, lt)), my = lerp(dy + 0.2 * s, dy + 0.3 * s + 3 * 0.26 * s, p) + Math.sin(p * Math.PI * 3) * 0.12 * s;
    const mx = dx + dw * 0.55 + Math.sin(p * Math.PI * 2) * 0.25 * s;
    G.seg(c, [mx + 0.32 * s, my + 0.32 * s], [mx + 0.75 * s, my + 0.75 * s], 0.17 * s, PAL.yellow.t[0]);
    c.save(); c.globalAlpha = 0.25; G.disc(c, mx, my, 0.42 * s, CREAM); c.restore();
    G.ring(c, mx, my, 0.42 * s, 0.13 * s, PAL.yellow.t[2]);
    if (lt > 2.2) { const q = E.oBack(inv(2.2, 2.5, lt)); G.disc(c, dx + dw + 0.05 * s, dy + 0.3 * s, 0.3 * s * q, PAL.coral.t[1]);
      G.seg(c, [dx + dw + 0.05 * s, dy + 0.18 * s], [dx + dw + 0.05 * s, dy + 0.32 * s], 0.08 * s * q, CREAM); G.disc(c, dx + dw + 0.05 * s, dy + 0.45 * s, 0.045 * s * q, CREAM); }
  }
  function endPicto(c, x, y, lt, C) {
    const drop = E.oBack(inv(0.2, 0.7, lt)), fill = inv(1.4, 1.5, lt) > 0;
    const bw = 1.2 * s, bh = 1.7 * s, bx = x - bw / 2 - 0.35 * s, by = y - bh / 2 - (1 - drop) * 400;
    const path = () => { c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + bw, by); c.lineTo(bx + bw, by + bh); c.lineTo(bx + bw / 2, by + bh - 0.42 * s); c.lineTo(bx, by + bh); c.closePath(); };
    path(); c.fillStyle = fill ? C.ink : C.far; c.fill();
    if (fill) G.spark(c, bx + bw / 2, by + 0.55 * s, 0.3 * s * E.oBack(inv(1.5, 1.8, lt)), PAL.yellow.t[2]);
    // a paper plane: send it to a friend
    const pp = E.io3(inv(2.0, 3.0, lt)), px = lerp(x + 0.75 * s, x + 1.0 * s, pp), py = lerp(y + 0.5 * s, y - 0.55 * s, pp);
    if (lt > 1.9) { c.save(); c.translate(px, py); c.rotate(-0.5); const q = 0.62 * s * E.oBack(inv(1.9, 2.2, lt));
      G.poly(c, [[q, 0], [-q, -q * 0.55], [-q * 0.45, 0]], C.ink); G.poly(c, [[q, 0], [-q * 0.45, 0], [-q * 0.7, q * 0.55]], PAL.coral.t[1]); c.restore(); }
  }
  const PICTO = { letter, explain, translate, idea, plan };
  const WORD = { letter: 'ЖАЗУУ', explain: 'ТҮШҮНҮҮ', translate: 'КОТОРМО', idea: 'ИДЕЯ', plan: 'ПЛАН' };

  // ───────── scenes ─────────
  function hook(c, lt) {
    const C = colors('ink'); C.disc = PAL.ink.t[3];
    // a single cell opens into the whole grid
    c.fillStyle = PAL.ink.t[2]; c.fillRect(0, 0, W, H);
    const g = E.ioExp(inv(0.0, 0.9, lt)), half = lerp(90, 1100, g);
    c.save(); c.beginPath(); c.rect(540 - half, 760 - half, half * 2, half * 2); c.clip();
    background(c, 'ink', lt, 3, 0.55); c.restore();
    stage(c, lt - 0.15, C, (cc, x, y, l) => hookPicto(cc, x, y, l, C), { r: 300 });
    hud(c, lt, -1, C, 'КИРИШ');
    T(c, 'h1', 'ЖИ МЕНЕН', X0 - 4, 1170, fTitle(118), CREAM, inv(0.5, 0.95, lt), { ls: '-1px' });
    // the count slams in: a roll 1 → 5 landing on the downbeat 2.0
    const roll = lt < 2.0 ? 1 + Math.floor(clamp((lt - 1.0) / 0.25, 0, 3.99)) : 5;
    const fp = inv(1.0, 1.4, lt);
    c.save(); c.beginPath(); c.rect(X0 - 20, 1180, 330, 420); c.clip();
    c.font = fTitle(440); c.fillStyle = PAL.yellow.t[2]; c.fillText(String(roll), X0 - 14, 1560 + (1 - E.oExp(fp)) * 420); c.restore();
    if (lt >= 2.0) { c.save(); c.font = fTitle(440); const m = c.measureText('5'); c.restore(); if (REC) TX.push({ id: 'h5', text: '5', x0: X0, y0: 1560 - m.actualBoundingBoxAscent, x1: X0 + m.width, y1: 1560 }); }
    const px = fit(c, 'ПАЙДАЛУУ', 610, 120, fTitle);
    T(c, 'h2', 'ПАЙДАЛУУ', 350, 1350, fTitle(px), CREAM, inv(1.0, 1.45, lt), { ls: '-1px' });
    T(c, 'h3', 'ИШ', 346, 1545, fTitle(210), CREAM, inv(1.1, 1.55, lt), { ls: '-2px' });
    T(c, 'h4', 'бүгүн эле колдонуп көр →', X0, 1625, G.F.mono(34, 700), PAL.yellow.t[3], inv(2.0, 2.4, lt));
  }
  function item(c, lt, card) {
    const it = card.it, C = colors(it.pk);
    background(c, it.pk, lt, 11 + card.i * 7);
    stage(c, lt, C, (cc, x, y, l) => PICTO[it.picto](cc, x, y, l, C));
    hud(c, lt, card.i, C, `${String(card.i + 1).padStart(2, '0')} / 05`);
    // the big index number behind the stage edge
    G.maskText(c, String(card.i + 1).padStart(2, '0'), 1010, 520, G.F.mono(120, 700), G.rgba(C.fg, 0.9), inv(0.25, 0.65, lt), { align: 'right' });
    titleBlock(c, lt, 'i' + card.i, it.title, it.sub, C);
    chip(c, lt, 'p' + card.i, 'ПРОМПТ ›', it.prompt, C, 1.5, 2.0);
    void WORD;
  }
  function wall(c, lt) {
    background(c, 'ink', lt, 29, 0.3);
    const C = colors('ink');
    T(c, 'w1', '5 ИШ — 1 ЖАРДАМЧЫ', 540, 420, fTitle(fit(c, '5 ИШ — 1 ЖАРДАМЧЫ', 940, 110, fTitle)), CREAM, inv(0.0, 0.3, lt), { align: 'center', ls: '-1px' });
    const tile = 360, gap = 40, pos = [[-1, 0], [1, 0], [-1, 1], [1, 1], [0, 2]];
    const sweepT = 1.6;
    ITEMS.forEach((it, k) => {
      const [i, j] = pos[k], cx = 540 + i * (tile + gap) / 2, cy = 700 + j * (tile + gap);
      const p = E.oExp(inv(0.1 + k * 0.125, 0.5 + k * 0.125, lt)); if (p <= 0) return;
      const yel = E.io(inv(sweepT + j * 0.125, sweepT + 0.25 + j * 0.125, lt));
      const Ck = colors(it.pk), Cy = colors('yellow');
      const bg = G.mix(PAL[it.pk].t[2], PAL.yellow.t[2], yel);
      const Cm = yel < 0.5 ? Ck : Cy;
      c.save(); c.translate(cx, cy + (1 - p) * 900); c.fillStyle = bg; c.beginPath(); c.roundRect(-tile / 2, -tile / 2, tile, tile, 36); c.fill();
      c.beginPath(); c.roundRect(-tile / 2, -tile / 2, tile, tile, 36); c.clip();
      c.scale(0.62, 0.62); G.disc(c, 0, 0, 260, G.mix(Ck.disc, Cy.disc, yel)); PICTO[it.picto](c, 0, 0, 9, Cm); c.restore();
    });
  }
  function check(c, lt) {
    const C = colors('ink'); C.disc = PAL.ink.t[4];
    background(c, 'ink', lt, 41, 0.3);
    stage(c, lt, C, (cc, x, y, l) => checkPicto(cc, x, y, l, C));
    hud(c, lt, 5, C, 'ЭСТЕ');
    T(c, 'c1', 'ТЕКШЕР!', X0 - 6, TITLE_Y, fTitle(fit(c, 'ТЕКШЕР!', TXTW, 190, fTitle)), PAL.yellow.t[2], inv(0.5, 0.95, lt), { ls: '-2px' });
    T(c, 'c2', 'ЖИ да жаңылышы мүмкүн', X0, SUB_Y, fSub(50), CREAM, inv(0.58, 1.03, lt));
    chip(c, lt, 'c3', 'КЕҢЕШ ›', 'Фактыны башка булактан текшер', C, 0.9, 1.25);
  }
  function end(c, lt) {
    const C = colors('yellow');
    background(c, 'yellow', lt, 53, 0.4, (j) => 4.0 + j * 0.125);   // rows stop one by one
    stage(c, lt, C, (cc, x, y, l) => endPicto(cc, x, y, l, C));
    T(c, 'e1', 'САКТАП КОЙ', X0 - 6, TITLE_Y, fTitle(fit(c, 'САКТАП КОЙ', TXTW, 190, fTitle)), C.fg, inv(0.5, 0.95, lt), { ls: '-2px' });
    T(c, 'e2', 'Досуңа жөнөт — ал да үйрөнсүн', X0, SUB_Y, fSub(fit(c, 'Досуңа жөнөт — ал да үйрөнсүн', TXTW, 50, fSub)), C.fg, inv(0.58, 1.03, lt));
    chip(c, lt, 'e3', 'КИЙИНКИ САБАК ›', 'Жакшы промпт кантип жазылат?', C, 1.0, 1.4);
  }
  const KIND = { hook: (c, lt) => hook(c, lt), item, wall: (c, lt) => wall(c, lt), check: (c, lt) => check(c, lt), end: (c, lt) => end(c, lt) };
  const scene = (c, i, t) => { const cd = CARDS[i]; KIND[cd.kind](c, t - cd.t0, cd); };

  // ───────── grid transitions ─────────
  const bufA = G.canvas(W, H), bufB = G.canvas(W, H), ca = bufA.getContext('2d'), cb = bufB.getContext('2d');
  function transition(c, i, t) {          // between card i-1 and card i, cut at CARDS[i].t0
    const cut = CARDS[i].t0, kind = TRANS[(i - 1) % TRANS.length];
    REC = false; scene(ca, i - 1, t); scene(cb, i, t); REC = true;
    c.drawImage(bufA, 0, 0);
    if (kind === 'rows') {
      const rh = 160;
      for (let j = 0; j < H / rh; j++) {
        const p = E.ioExp(inv(cut - TW + j * 0.012, cut + TW * 0.6 + j * 0.012, t)), dir = j % 2 ? 1 : -1; if (p <= 0) continue;
        c.drawImage(bufB, 0, j * rh, W, rh, dir * (1 - p) * W, j * rh, W, rh);
      }
    } else {
      const cw = 180;
      for (let k = 0; k < W / cw; k++) {
        const p = E.ioExp(inv(cut - TW + k * 0.02, cut + TW * 0.6 + k * 0.02, t)); if (p <= 0) continue;
        c.drawImage(bufB, k * cw, 0, cw, H, k * cw, -(1 - p) * H, cw, H);
      }
    }
  }
  function frame(t) {
    TX = [];
    let i = CARDS.findIndex((cd) => t >= cd.t0 && t < cd.t1); if (i < 0) i = CARDS.length - 1;
    if (i > 0 && t - CARDS[i].t0 < TW * 0.6 + 0.2) return transition(ctx, i, t);
    if (i < CARDS.length - 1 && CARDS[i].t1 - t < TW) return transition(ctx, i + 1, t);
    scene(ctx, i, t);
  }

  // ───────── sound events (film seconds) ─────────
  const EV = [];
  CARDS.forEach((cd, i) => {
    if (i > 0) EV.push({ t: cd.t0 - 0.12, type: 'whoosh' });
    EV.push({ t: cd.t0, type: 'cut', kind: cd.kind, pk: cd.pk });
  });
  EV.push({ t: 0.0, type: 'open' }, { t: 0.5, type: 'slam' }, { t: 1.0, type: 'slam' });
  for (let k = 0; k < 4; k++) EV.push({ t: 1.0 + k * 0.25, type: 'tick' });
  EV.push({ t: 2.0, type: 'boom' });
  const typeEv = (t0, n) => { for (let k = 0; k < n; k += 2) EV.push({ t: t0 + k / CPS, type: 'key', k }); EV.push({ t: t0 + n / CPS + 0.05, type: 'enter' }); };
  ITEMS.forEach((it, i) => {
    const t0 = 6 + i * 8;
    EV.push({ t: t0 + 0.5, type: 'slam' });
    typeEv(t0 + 2.0, it.prompt.length + 2);
    if (it.picto === 'letter') { for (let k = 0; k < 5; k++) EV.push({ t: t0 + 1.0 + k * 0.5, type: 'scribble' }); EV.push({ t: t0 + 4.5, type: 'flap' }, { t: t0 + 5.0, type: 'pop' }); }
    if (it.picto === 'explain') { EV.push({ t: t0 + 2.0, type: 'pop' }, { t: t0 + 4.0, type: 'ding' }); }
    if (it.picto === 'translate') { EV.push({ t: t0 + 3.0, type: 'flip' }, { t: t0 + 5.0, type: 'flip' }, { t: t0 + 7.0, type: 'flip' }); }
    if (it.picto === 'idea') { EV.push({ t: t0 + 1.0, type: 'zap' }, { t: t0 + 1.45, type: 'ding' }); for (let k = 0; k < 5; k++) EV.push({ t: t0 + 2.5 + k * 0.5, type: 'pop', k }); }
    if (it.picto === 'plan') { for (let k = 0; k < 30; k++) EV.push({ t: t0 + 1.0 + k * 0.125, type: 'tick', k }); EV.push({ t: t0 + 4.75, type: 'ding' }); }
  });
  for (let k = 0; k < 5; k++) EV.push({ t: 46.1 + k * 0.125, type: 'pop', k });
  EV.push({ t: 46.25, type: 'slam' }, { t: 47.6, type: 'sweep' });
  EV.push({ t: 49.5, type: 'slam' }, { t: 51.2, type: 'alert' });
  typeEv(50.25, 'Фактыны башка булактан текшер'.length + 2);
  EV.push({ t: 54.5, type: 'slam' }, { t: 54.6, type: 'pop' }, { t: 55.5, type: 'stamp' }, { t: 56.0, type: 'whoosh' });
  typeEv(55.4, 'Жакшы промпт кантип жазылат?'.length + 2);
  EV.push({ t: 45.75, type: 'silence', d: 0.25 }, { t: 53.75, type: 'silence', d: 0.25 }, { t: 59.0, type: 'last' });
  EV.sort((a, b) => a.t - b.t);

  window.DUR = DUR; window.EV = EV; window.CARDS = CARDS.map((c) => ({ t0: c.t0, t1: c.t1, kind: c.kind, pk: c.pk }));
  window.render = (t) => frame(clamp(t, 0, DUR - 1e-4));
  window.TEXTS = () => TX;
})();
