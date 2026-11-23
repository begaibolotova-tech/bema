#!/usr/bin/env bash
# Assemble the Issyk-Kul short. If vo/vo1.mp3..vo7.mp3 exist (ElevenLabs Kyrgyz voiceover),
# they are placed at the scene start times from vo_script.json and the music ducks under them.
set -euo pipefail
cd "$(dirname "$0")"
B=build
MUSIC=../video_kun/music/music.mp3
WHOOSH=../video_kun/music/whoosh.mp3
python3 make_ass.py
ffmpeg -v error -y -f concat -safe 0 -i $B/concat.txt -c copy $B/visual.mp4

# --- voiceover track (silence if not generated yet)
if ls vo/vo[1-7].mp3 >/dev/null 2>&1; then
  mapfile -t STARTS < <(python3 -c "import json;[print(int(x['start']*1000)) for x in json.load(open('vo_script.json'))]")
  IN=""; FC=""; MIX=""
  for i in 1 2 3 4 5 6 7; do
    IN="$IN -i vo/vo$i.mp3"
    FC="$FC[$((i-1))]aresample=48000,aformat=channel_layouts=stereo,adelay=${STARTS[$((i-1))]}:all=1[v$i];"
    MIX="$MIX[v$i]"
  done
  ffmpeg -v error -y $IN -filter_complex "${FC}${MIX}amix=inputs=7:normalize=0,highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,apad=whole_dur=60,atrim=0:60[o]" -map "[o]" -c:a pcm_s16le $B/vo.wav
  MUSVOL=0.55
else
  ffmpeg -v error -y -f lavfi -i anullsrc=r=48000:cl=stereo -t 60 -c:a pcm_s16le $B/vo.wav
  MUSVOL=0.9
fi

# --- music + whooshes at scene changes, ducked under the voice
ffmpeg -v error -y -i $B/vo.wav -i $B/vo.wav -i $MUSIC -i $WHOOSH -filter_complex "
  [0]anull[vo];[1]anull[key];
  [2]aresample=48000,aformat=channel_layouts=stereo,afade=t=out:st=58.3:d=1.7[m0];
  [m0][key]sidechaincompress=threshold=0.03:ratio=5:attack=20:release=400,volume=$MUSVOL[mus];
  [3]aresample=48000,aformat=channel_layouts=stereo,asplit=6[w1][w2][w3][w4][w5][w6];
  [w1]adelay=5800:all=1,volume=0.4[s1];[w2]adelay=14800:all=1,volume=0.4[s2];
  [w3]adelay=22800:all=1,volume=0.4[s3];[w4]adelay=32800:all=1,volume=0.4[s4];
  [w5]adelay=42800:all=1,volume=0.4[s5];[w6]adelay=51800:all=1,volume=0.4[s6];
  [vo][mus][s1][s2][s3][s4][s5][s6]amix=inputs=8:normalize=0:duration=longest,
    apad,atrim=0:60,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[out]" -map "[out]" -c:a pcm_s16le $B/mix.wav

ffmpeg -v error -y -i $B/visual.mp4 -i $B/mix.wav \
  -vf "ass=$B/subs.ass:fontsdir=/usr/share/fonts/opentype/inter" -map 0:v -map 1:a -t 60 \
  -c:v libx264 -preset slow -b:v 9000k -maxrate 12M -bufsize 20M -pix_fmt yuv420p \
  -c:a aac -b:a 192k -movflags +faststart ISSYK_KOL_60s_1080x1920.mp4
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height -of compact ISSYK_KOL_60s_1080x1920.mp4
