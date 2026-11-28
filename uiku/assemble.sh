#!/usr/bin/env bash
# Assemble: rendered chunks + captions + Jusup Kyrgyz VO + music + SFX -> 60s 1080x1920 MP4
set -euo pipefail
cd "$(dirname "$0")"
B=build
MUSIC=../video_kun/music/music.mp3
WHOOSH=../video_kun/music/whoosh.mp3
python3 make_ass.py
ffmpeg -v error -y -f concat -safe 0 -i $B/concat.txt -c copy $B/visual.mp4

read -r -a ST < <(python3 -c "import json;t=json.load(open('$B/timeline.json'));print(' '.join(str(int((s+t['lead'])*1000)) for s in t['starts']))")
read -r -a SC < <(python3 -c "import json;t=json.load(open('$B/timeline.json'));print(' '.join(str(int(s*1000)-150) for s in t['starts'][1:]))")

IN=""; FC=""; MIX=""
for i in 1 2 3 4 5 6 7; do
  IN="$IN -i vo/vo$i.mp3"
  FC="$FC[$((i-1))]aresample=48000,aformat=channel_layouts=stereo,adelay=${ST[$((i-1))]}:all=1[v$i];"
  MIX="$MIX[v$i]"
done
ffmpeg -v error -y $IN -filter_complex "${FC}${MIX}amix=inputs=7:normalize=0,highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,apad=whole_dur=60,atrim=0:60[o]" -map "[o]" -c:a pcm_s16le $B/vo.wav

PING=$(( ${SC[5]} + 150 + 1800 ))
ffmpeg -v error -y -i $B/vo.wav -i $B/vo.wav -i $MUSIC -i $WHOOSH -i $B/sfx_heart.mp3 -i $B/sfx_chime.mp3 -filter_complex "
  [0]anull[vo];[1]anull[key];
  [2]aresample=48000,aformat=channel_layouts=stereo,afade=t=out:st=58.3:d=1.7[m0];
  [m0][key]sidechaincompress=threshold=0.03:ratio=5:attack=20:release=400,volume=0.5[mus];
  [3]aresample=48000,aformat=channel_layouts=stereo,asplit=6[w1][w2][w3][w4][w5][w6];
  [w1]adelay=${SC[0]}:all=1,volume=0.35[s1];[w2]adelay=${SC[1]}:all=1,volume=0.35[s2];
  [w3]adelay=${SC[2]}:all=1,volume=0.35[s3];[w4]adelay=${SC[3]}:all=1,volume=0.35[s4];
  [w5]adelay=${SC[4]}:all=1,volume=0.35[s5];[w6]adelay=${SC[5]}:all=1,volume=0.35[s6];
  [4]aresample=48000,aformat=channel_layouts=stereo,adelay=300:all=1,volume=0.8[off];
  [5]aresample=48000,aformat=channel_layouts=stereo,adelay=${PING}:all=1,volume=0.6[ping];
  [vo][mus][s1][s2][s3][s4][s5][s6][off][ping]amix=inputs=10:normalize=0:duration=longest,
    apad,atrim=0:60,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[out]" -map "[out]" -c:a pcm_s16le $B/mix.wav

ffmpeg -v error -y -i $B/visual.mp4 -i $B/mix.wav \
  -vf "ass=$B/subs.ass:fontsdir=/usr/share/fonts/opentype/inter" -map 0:v -map 1:a -t 60 \
  -c:v libx264 -preset slow -b:v 9000k -maxrate 12M -bufsize 20M -pix_fmt yuv420p \
  -c:a aac -b:a 192k -movflags +faststart $B/nocover.mp4

# cover as the first 0.5 s (Instagram shows it as the thumbnail), then fades into the hook
ffmpeg -v error -y -i $B/nocover.mp4 -loop 1 -t 0.8 -i COVER_uiku_1080x1920.jpg -filter_complex "
  [1]format=rgba,scale=1080:1920,fade=t=out:st=0.45:d=0.3:alpha=1,setpts=PTS-STARTPTS[c];
  [0][c]overlay=0:0:eof_action=pass[v]" -map "[v]" -map 0:a -c:v libx264 -preset slow -b:v 9000k -maxrate 12M \
  -bufsize 20M -pix_fmt yuv420p -c:a copy -movflags +faststart UIKU_7_KUN_60s_1080x1920.mp4
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height -of compact UIKU_7_KUN_60s_1080x1920.mp4
