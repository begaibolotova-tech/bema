# printed words → subtitles_ky.srt (the words are burned into the picture; this file is for players and search)
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
E = json.load(open(os.path.join(HERE, 'events.json')))
cues = [{'t0': e['t'], 't1': e['t1'], 'text': e['text']} for e in E['ev'] if e['type'] == 'sub']
json.dump(cues, open(os.path.join(HERE, 'out', 'subs.json'), 'w'), ensure_ascii=False, indent=1)
print(len(cues), 'cues')
