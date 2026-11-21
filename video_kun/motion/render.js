// Render scene.html to frames.
//   node render.js stills <dir> [t1,t2,...]   -> PNG stills
//   node render.js video  <out.mp4>           -> 60 s, 30 fps, silent H.264 (4 parallel workers)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const FPS = 30, DUR = 60, WORKERS = 4;

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.join(__dirname, 'scene.html'));
  await page.evaluate(async () => {
    await Promise.all(['128px InterBlack', '54px InterXB', '30px InterB'].map(f => document.fonts.load(f, 'КҮН')));
  });
  return page;
}
const grab = (page, t) => page.evaluate(t => { draw(t); return document.getElementById('c').toDataURL('image/jpeg', 0.94); }, t)
  .then(u => Buffer.from(u.slice(u.indexOf(',') + 1), 'base64'));

(async () => {
  const mode = process.argv[2] || 'video';
  const browser = await chromium.launch();
  if (mode === 'stills') {
    const dir = process.argv[3]; fs.mkdirSync(dir, { recursive: true });
    const ts = (process.argv[4] || '1,5,9,13,17,20,25,27,30,34,39,43,46,49,52,58').split(',').map(Number);
    const page = await openPage(browser);
    for (const t of ts) fs.writeFileSync(path.join(dir, `t${String(t).padStart(5, '0')}.jpg`), await grab(page, t));
  } else {
    const out = process.argv[3] || path.join(__dirname, 'build', 'visual.mp4');
    const tmp = path.join(path.dirname(out), 'parts'); fs.mkdirSync(tmp, { recursive: true });
    const total = FPS * DUR, per = Math.ceil(total / WORKERS);
    await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
      const page = await openPage(browser);
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', path.join(tmp, `p${w}.mp4`)],
        { stdio: ['pipe', 'inherit', 'inherit'] });
      for (let i = w * per; i < Math.min(total, (w + 1) * per); i++) {
        const buf = await grab(page, i / FPS);
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
        if (i % 150 === 0) console.log(`worker ${w}: frame ${i}`);
      }
      ff.stdin.end(); await new Promise(r => ff.on('close', r));
    }));
    fs.writeFileSync(path.join(tmp, 'list.txt'), Array.from({ length: WORKERS }, (_, w) => `file 'p${w}.mp4'`).join('\n'));
    await new Promise(r => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'), '-c', 'copy', out], { stdio: 'inherit' }).on('close', r));
  }
  await browser.close();
})();
