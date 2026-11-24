// Usage: node render.js [stills OUTDIR | video OUT.mp4]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
(async () => {
  const mode = process.argv[2] || 'video';
  const out = process.argv[3] || path.join(__dirname, 'metro_silent.mp4');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.join(__dirname, 'scene.html'));
  await page.evaluate(async () => { await document.fonts.ready; await window.ready; });
  const canvas = await page.$('canvas');
  if (mode === 'stills') {
    fs.mkdirSync(out, { recursive: true });
    const ts = (process.argv[4] || '3,8,11,17,20,27,32,37,44,47,51,54,58').split(',').map(Number);
    for (const t of ts) { await page.evaluate(t => draw(t), t); await canvas.screenshot({ path: path.join(out, `t${t}.png`) }); }
  } else {
    const fps = 30, frames = 60 * fps;
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = 0; i < frames; i++) {
      await page.evaluate(t => draw(t), i / fps);
      const buf = await canvas.screenshot({ type: 'jpeg', quality: 92 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await browser.close();
})();
