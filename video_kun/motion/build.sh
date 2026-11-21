#!/usr/bin/env bash
# Motion-graphics version: render hand-made canvas animation + reuse the original VO/music/SFX mix.
set -euo pipefail
cd "$(dirname "$0")/.."
B=motion/build
mkdir -p $B
[ -n "${SKIP_RENDER:-}" ] || node motion/render.js video $B/visual.mp4

# 2) audio mix
ffmpeg -v error -y \
  -i vo/vo1.mp3 -i vo/vo2.mp3 -i vo/vo3.mp3 -i vo/vo4.mp3 -i vo/vo5.mp3 -i vo/vo6.mp3 -i vo/vo7.mp3 \
  -i music/music.mp3 -i music/boom.mp3 -i music/whoosh.mp3 -i music/ice.mp3 \
  -filter_complex "
  [0]aresample=48000,aformat=channel_layouts=stereo,adelay=500:all=1[v1];
  [1]aresample=48000,aformat=channel_layouts=stereo,adelay=7700:all=1[v2];
  [2]aresample=48000,aformat=channel_layouts=stereo,asplit[a3a][a3b];
  [a3a]atrim=0:2.6,asetpts=PTS-STARTPTS[a3x];[a3b]atrim=5.6,asetpts=PTS-STARTPTS[a3y];
  [a3x][a3y]concat=n=2:v=0:a=1,adelay=15400:all=1[v3];
  [3]aresample=48000,aformat=channel_layouts=stereo,adelay=23300:all=1[v4];
  [4]aresample=48000,aformat=channel_layouts=stereo,adelay=28300:all=1[v5];
  [5]aresample=48000,aformat=channel_layouts=stereo,asplit[a6a][a6b];
  [a6a]atrim=0:3.4,asetpts=PTS-STARTPTS[a6x];[a6b]atrim=5.3,asetpts=PTS-STARTPTS[a6y];
  [a6x][a6y]concat=n=2:v=0:a=1,adelay=36800:all=1[v6];
  [6]aresample=48000,aformat=channel_layouts=stereo,adelay=50000:all=1[v7];
  [v1][v2][v3][v4][v5][v6][v7]amix=inputs=7:normalize=0,volume=1.0,
     highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,
     apad=whole_dur=60,atrim=0:60[out]" -map "[out]" -c:a pcm_s16le $B/vo.wav

ffmpeg -v error -y -i $B/vo.wav -i $B/vo.wav -i $B/vo.wav -i $B/vo.wav -i $B/vo.wav -i $B/vo.wav -i $B/vo.wav \
  -i music/music.mp3 -i music/boom.mp3 -i music/whoosh.mp3 -i music/ice.mp3 \
  -filter_complex "
  [0]anull[vo];[1]anull[vokey];[2]anullsink;[3]anullsink;[4]anullsink;[5]anullsink;[6]anullsink;
  [7]aresample=48000,aformat=channel_layouts=stereo,
     volume='if(between(t,2.9,4.4),0.05,1)':eval=frame,afade=t=out:st=58.3:d=1.7[mus0];
  [mus0][vokey]sidechaincompress=threshold=0.03:ratio=5:attack=20:release=400,volume=0.55[mus];
  [8]aresample=48000,aformat=channel_layouts=stereo,asplit=3[b1][b2][b3];
  [b1]adelay=2600:all=1,volume=1.0[s1];
  [b2]adelay=14900:all=1,volume=0.55[s2];
  [b3]adelay=50100:all=1,volume=0.6[s3];
  [9]aresample=48000,aformat=channel_layouts=stereo,asplit=5[w1][w2][w3][w4][w5];
  [w1]adelay=7100:all=1,volume=0.5[s4];
  [w2]adelay=22700:all=1,volume=0.5[s5];
  [w3]adelay=27700:all=1,volume=0.4[s6];
  [w4]adelay=40500:all=1,volume=0.4[s7];
  [w5]adelay=47200:all=1,volume=0.5[s8];
  [10]aresample=48000,aformat=channel_layouts=stereo,asplit=2[i1][i2];
  [i1]adelay=32100:all=1,volume=0.55[s9];
  [i2]adelay=36500:all=1,volume=0.45[s10];
  [vo][mus][s1][s2][s3][s4][s5][s6][s7][s8][s9][s10]amix=inputs=12:normalize=0:duration=longest,
     apad,atrim=0:60,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[out]" \
  -map "[out]" -c:a pcm_s16le $B/mix.wav

# 3) mux
ffmpeg -v error -y -i $B/visual.mp4 -i $B/mix.wav -map 0:v -map 1:a -t 60 \
  -c:v libx264 -preset slow -crf 24 -tune grain -profile:v high -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart \
  KUN_OCHSO_60s_motion_1080x1920.mp4
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height -of compact KUN_OCHSO_60s_motion_1080x1920.mp4
