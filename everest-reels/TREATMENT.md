# «Эвересттен секирсе эмне болот?» — 60 s Instagram Reel, Data Storytelling

Brief (the user had no preference beyond topic, infographics, ElevenLabs, Reels, 1 min): language Kyrgyz (the language
the user writes in); 1080×1920 vertical, 30 fps; voice: ElevenLabs, but the account has 162 credits left (≈ 160
characters), so two short voiced lines (hook + verdict) with eleven_v3, the rest is told by the chart's handwritten
notes + captions; −14 LUFS. No storyboard stop.

## Three candidate structures
1. **The question first, then one chart that falls (chosen).** Empty plot with the unit and a handwritten question;
   a ranked bar of peaks (Everest vs Kyrgyzstan's Jengish Chokusu and Khan Tengri, Burj Khalifa) → the Everest bar
   morphs into the altitude axis → the jumper is a dot that falls down an altitude-vs-time curve computed from
   physics → a correction: the mountain is not vertical → the one survivor case (Rozov's 2013 wingsuit jump) →
   verdict.
2. **Countdown of conditions** (oxygen, cold, wind, speed): a list of facts — an infographic, not a story.
3. **Before → after** (summit vs base camp slope chart): too thin for a minute.

## Logline and arc
Someone steps off the top of the world; the chart follows their fall second by second until the numbers say what
happens. Setup (the question, how high it is) → turn (the fall: speed climbs past 300 km/h; but you would hit the
mountain first) → ending (only a wingsuit and a parachute have done it — the verdict line).

## Benchmark
Rosling-style "one dot is a character"; NYT/Pudding scrollytelling of a single physical process.
Learn: one idea per screen, growing axes, pinned notes. Don't take: any layout, colours, typefaces.

## Data (all real or computed, see FACTS.md)
- Heights: Everest 8 849 m; Jengish Chokusu 7 439 m; Khan Tengri 7 010 m; Burj Khalifa 828 m.
- Summit air density ≈ 0.39 of sea level (ISA); oxygen per breath ≈ 1/3.
- Fall model (fall.py): 80 kg, belly-down, terminal 200 km/h at sea level; summit 8 849 m → base camp 5 364 m:
  ≈ 49 s, peak ≈ 300 km/h, ~265 km/h at the end.
- Rozov, 5 Oct 2013: wingsuit BASE jump from 7 220 m on Everest's north face.

## Beat sheet (vertical; plot in the upper 2/3, caption band at the bottom)
| t | beat | camera |
|---|---|---|
| 0–4 | VO1 hook «Эвересттин чокусунан секирсеңиз эмне болот?» — empty plot, unit, question in pencil | locked, slight push |
| 4–13 | bars land one by one (sonified): Burj Khalifa → Khan Tengri → Jengish → Everest (red); note «Бурж-Халифадан 10 эсе бийик» | pull back as the axis grows |
| 13–19 | conditions notes pinned to the Everest bar top: «аба 3 эсе суюк», «−30 °C», «шамал 200 км/саат чейин» | push to the bar top |
| 19–21 | silence; the Everest bar morphs into the altitude axis; time axis grows | locked |
| 21–37 | the fall: dot drops, curve drawn by the pencil, a speed readout; note at 12 s «≈ 300 км/саат»; base camp line 5 364 m | track the dot down |
| 37–43 | correction: the vertical line tilts into the real slope profile; note «тоо тик эмес — беттен тоголонот» (red) | pull back |
| 43–51 | the one case: blue dot from 7 220 m with a long glide, note «Валерий Розов, 2013 · вингсьют + парашют» | pan |
| 51–60 | VO2 verdict «Парашютсуз — эч ким тирүү калбайт.»; end card question «Сиз секирмек белеңиз?» | hold on one mark, pull back |

## Sound
Sonified marks (pitch = height), pencil taps/scratches, ruler hiss for axes, wind bed rising during the fall,
digital silence before the morph, music bed: soft pad + kick, ducked −11 dB under the voice.
