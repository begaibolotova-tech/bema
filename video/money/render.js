// Колдонуу: node render.js [stills|video] [out] [voice.mp3]
// voice.mp3 берилсе, видеого үн кошулат (узундугу ошого жараша).
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

(async () => {
  const mode = process.argv[2] || 'video';
  const out = process.argv[3] || path.join(__dirname, '..', 'akcha_jok_bolso.mp4');
  const audio = process.argv[4];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.join(__dirname, 'scene.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => { for (let t = 0; t < 2; t += .5) draw(t); }); // emoji шрифтин жүктөө
  const canvas = await page.$('canvas');
  const dur = await page.evaluate(() => DURATION);

  if (mode === 'stills') {
    fs.mkdirSync(out, { recursive: true });
    const ts = await page.evaluate(() => SCENES.map(s => s.e - 0.6));
    for (const t of [3, ...ts]) {
      await page.evaluate(t => draw(t), t);
      await canvas.screenshot({ path: path.join(out, `t${t.toFixed(1)}.png`) });
    }
  } else {
    const fps = 30, frames = Math.round(dur * fps);
    const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-'];
    if (audio) args.push('-i', audio, '-c:a', 'aac', '-b:a', '192k', '-shortest');
    args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out);
    const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = 0; i < frames; i++) {
      await page.evaluate(t => draw(t), i / fps);
      const buf = await canvas.screenshot({ type: 'jpeg', quality: 92 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
  }
  await browser.close();
})();
