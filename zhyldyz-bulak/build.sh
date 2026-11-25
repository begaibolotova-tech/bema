#!/bin/sh
# Rebuild «Жылдыз булак» from source: sh build.sh   (needs the Lemo-Opuscar library: core + voice tiers; Node 20+, ffmpeg 7+)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-/home/user/lemomo-ai/lemo-opuscar}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the Lemo-Opuscar library folder"; exit 1; }
mkdir -p "$HERE/out"
cd "$LIB"
node core/render/events.mjs "$HERE"                                                   # timeline → events.json
"$LIB/.venv/bin/python" "$HERE/mix.py"                                                # score + foley + ambience → out/mix.wav
"$LIB/.venv/bin/python" "$HERE/subs.py" && "$LIB/.venv/bin/python" core/render/srt.py "$HERE/out/subs.json" "$HERE/subtitles_ky.srt"
node core/render/video.mjs "$HERE" --fps 24 --workers 4 --out "$HERE/out/video.mp4"   # every frame, crayon on paper
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/zhyldyz-bulak.mp4" 24 0
