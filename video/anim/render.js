// Usage: node render.js [stills|video]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

(async () => {
  const mode = process.argv[2] || 'video';
  const out = process.argv[3] || path.join(__dirname, '..', 'kelin_kainene_2d.mp4');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.join(__dirname, 'scene.html'));
  await page.evaluate(() => document.fonts.ready);
  const canvas = await page.$('canvas');

  if (mode === 'stills') {
    fs.mkdirSync(out, { recursive: true });
    for (const t of [0.8, 2.5, 4.3, 6.0, 7.0, 8.5]) {
      await page.evaluate(t => draw(t), t);
      await canvas.screenshot({ path: path.join(out, `t${t}.png`) });
    }
  } else {
    const fps = 30, frames = 10 * fps;
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
      { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = 0; i < frames; i++) {
      await page.evaluate(t => draw(t), i / fps);
      const buf = await canvas.screenshot({ type: 'jpeg', quality: 95 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
  }
  await browser.close();
})();
