#!/bin/sh
# Rebuild «ЖИ менен 5 пайдалуу иш» (vertical reel 1080×1920, 60 s): sh build.sh   (needs the Lemo-Opuscar library; numba for the plucks)
set -e
HERE=$(cd "$(dirname "$0")" && pwd); LIB=${LIB:-/home/user/lemomo-ai/lemo-opuscar}; export LIB
cd "$LIB"
node core/render/events.mjs "$HERE" --size 1080x1920
"$LIB/.venv/bin/python" "$HERE/mix.py"                       # + out/voice.wav if present (narration ducks the music)
node core/render/video.mjs "$HERE" --size 1080x1920 --fps 24 --workers 4 --out "$HERE/out/video.mp4"
node core/render/readcheck.mjs "$HERE" --size 1080x1920 --step 0.05 | grep -v '^OK' || true
cd "$HERE/out"
J=$(ffmpeg -hide_banner -i mix.wav -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g(){ echo "$J" | grep "\"$1\"" | sed 's/.*: "\(.*\)".*/\1/'; }
ffmpeg -hide_banner -loglevel error -y -i video.mp4 -i mix.wav -map 0:v -map 1:a -vf "noise=alls=3:allf=t" -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,aresample=48000" \
  -c:a aac -b:a 192k -shortest -movflags +faststart "$HERE/ai-5-ish-reel.mp4"
echo "done: $HERE/ai-5-ish-reel.mp4"
