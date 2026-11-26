#!/bin/sh
# fallback mux for ffmpeg 6.x (the library's mux.sh needs 7+): two-pass loudnorm to -14 LUFS, no grain
set -e; cd "$(dirname "$0")"
M=$(ffmpeg -hide_banner -nostats -i out/mix.wav -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
v() { echo "$M" | grep "\"$1\"" | sed 's/.*: "\(.*\)".*/\1/'; }
ffmpeg -y -loglevel error -i out/video.mp4 -i out/mix.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 17 -g 60 -pix_fmt yuv420p \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(v input_i):measured_TP=$(v input_tp):measured_LRA=$(v input_lra):measured_thresh=$(v input_thresh):offset=$(v target_offset):linear=true,alimiter=limit=0.87:level=false,aresample=48000,apad" \
  -c:a aac -b:a 256k -shortest -movflags +faststart jump-reels.mp4
ffmpeg -y -loglevel error -ss 30 -i jump-reels.mp4 -frames:v 1 -q:v 2 poster.jpg
