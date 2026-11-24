#!/bin/sh
# fallback mux for ffmpeg 6.x (the library's mux.sh needs 7+): single-pass loudnorm -14 LUFS, light grain
set -e; cd "$(dirname "$0")"
ffmpeg -y -loglevel error -i out/video.mp4 -i out/mix.wav -map 0:v -map 1:a \
  -vf "noise=alls=1:allf=t" -c:v libx264 -preset slow -crf 16 -g 120 -pix_fmt yuv420p \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000,apad" -c:a aac -b:a 256k -shortest -movflags +faststart oduvanchik-60.mp4
ffmpeg -y -loglevel error -ss 5.0 -i oduvanchik-60.mp4 -frames:v 1 -q:v 2 poster.jpg
