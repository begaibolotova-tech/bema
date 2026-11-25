import React from "react";
import {
  AbsoluteFill,
  Composition,
  Easing,
  interpolate,
  random,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const FPS = 30;
const SCENE = 120; // 4 s per scene
const FINAL = 165; // 5.5 s final scene

type SceneData = {
  lines: string[];
  accent: string;
  bgFrom: string;
  bgTo: string;
};

const SCENES: SceneData[] = [
  {
    lines: ["Келин —", "үйдүн куту"],
    accent: "#f2b632",
    bgFrom: "#7a1f24",
    bgTo: "#2e0b10",
  },
  {
    lines: ["Кайнене —", "үйдүн түркүгү"],
    accent: "#ffd27a",
    bgFrom: "#1f3d6b",
    bgTo: "#0b1630",
  },
  {
    lines: ["Бири-бирин сыйлаган үйгө", "бакыт консо"],
    accent: "#ff8fa3",
    bgFrom: "#5a2a6e",
    bgTo: "#1e0d29",
  },
];

const FINAL_SCENE: SceneData = {
  lines: ["Ынтымак —", "бакыттын ачкычы!"],
  accent: "#f2b632",
  bgFrom: "#b3262e",
  bgTo: "#3a0a0e",
};

const FONT = "'DejaVu Serif', 'Liberation Serif', serif";

/* ---------- Tunduk (yurt crown) ---------- */
const Tunduk: React.FC<{ size: number; color: string; rotate: number; opacity: number }> = ({
  size,
  color,
  rotate,
  opacity,
}) => {
  const r = 100;
  return (
    <svg
      width={size}
      height={size}
      viewBox="-110 -110 220 220"
      style={{ transform: `rotate(${rotate}deg)`, opacity }}
    >
      <circle r={r} fill="none" stroke={color} strokeWidth={6} />
      <circle r={r - 14} fill="none" stroke={color} strokeWidth={2} strokeDasharray="4 8" />
      {[-1, 0, 1].map((k) => (
        <g key={k}>
          <line x1={-r} y1={k * 30} x2={r} y2={k * 30} stroke={color} strokeWidth={5} />
          <line x1={k * 30} y1={-r} x2={k * 30} y2={r} stroke={color} strokeWidth={5} />
        </g>
      ))}
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={Math.cos(a) * r}
            y1={Math.sin(a) * r}
            x2={Math.cos(a) * (r + 8)}
            y2={Math.sin(a) * (r + 8)}
            stroke={color}
            strokeWidth={3}
          />
        );
      })}
    </svg>
  );
};

/* ---------- Horn ornament (kochkor muiz) ---------- */
const Horn: React.FC<{ color: string; draw: number; flip?: boolean; width: number }> = ({
  color,
  draw,
  flip,
  width,
}) => {
  const d =
    "M0 40 L0 0 C0 -40 52 -48 52 -12 C52 8 26 10 25 -6 M0 0 C0 -40 -52 -48 -52 -12 C-52 8 -26 10 -25 -6";
  return (
    <svg
      width={width}
      height={width * 0.7}
      viewBox="-60 -50 120 95"
      style={{ transform: flip ? "scaleY(-1)" : undefined }}
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - draw}
      />
    </svg>
  );
};

/* ---------- Ornament border band ---------- */
const Band: React.FC<{ color: string; top: boolean; progress: number }> = ({ color, top, progress }) => {
  const count = 14;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        [top ? "top" : "bottom"]: 24,
        display: "flex",
        justifyContent: "space-between",
        padding: "0 40px",
      }}
    >
      {Array.from({ length: count }).map((_, i) => {
        const local = interpolate(progress * (count + 4) - i, [0, 4], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return <Horn key={i} color={color} draw={local} flip={!top} width={110} />;
      })}
    </div>
  );
};

/* ---------- Floating sparkles ---------- */
const Sparkles: React.FC<{ color: string; seed: string }> = ({ color, seed }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <>
      {Array.from({ length: 40 }).map((_, i) => {
        const x = random(`${seed}x${i}`) * width;
        const speed = 0.6 + random(`${seed}s${i}`) * 1.4;
        const y = (random(`${seed}y${i}`) * height - frame * speed + height * 2) % height;
        const r = 2 + random(`${seed}r${i}`) * 5;
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(frame / 12 + i));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: r * 2,
              height: r * 2,
              borderRadius: "50%",
              background: color,
              opacity: tw * 0.7,
              boxShadow: `0 0 ${r * 4}px ${color}`,
            }}
          />
        );
      })}
    </>
  );
};

/* ---------- One scene ---------- */
const Scene: React.FC<{ data: SceneData; duration: number; seed: string; big?: boolean }> = ({
  data,
  duration,
  seed,
  big,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [duration - 14, duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = Math.min(fadeIn, big ? 1 : fadeOut);

  const bandProgress = interpolate(frame, [0, 45], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const zoom = interpolate(frame, [0, duration], [1.0, 1.06]);
  const tundukIn = spring({ frame, fps, config: { damping: 14 } });

  const words = data.lines.map((l) => l.split(" "));
  let wordIndex = 0;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 45%, ${data.bgFrom} 0%, ${data.bgTo} 75%)`,
        opacity,
        overflow: "hidden",
      }}
    >
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <Tunduk
            size={820}
            color={data.accent}
            rotate={frame * 0.25}
            opacity={0.13 * tundukIn}
          />
        </AbsoluteFill>
        <Sparkles color={data.accent} seed={seed} />
      </AbsoluteFill>

      <Band color={data.accent} top progress={bandProgress} />
      <Band color={data.accent} top={false} progress={bandProgress} />

      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          padding: "0 160px",
          gap: 20,
        }}
      >
        {words.map((lineWords, li) => (
          <div
            key={li}
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "0 0.28em",
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: li === 0 ? (big ? 150 : 130) : big ? 120 : 104,
              color: li === 0 ? "#fff6e6" : data.accent,
              textShadow: "0 6px 30px rgba(0,0,0,0.55)",
              textAlign: "center",
              lineHeight: 1.15,
            }}
          >
            {lineWords.map((w) => {
              const delay = 12 + wordIndex++ * 7;
              const s = spring({ frame: frame - delay, fps, config: { damping: 12, mass: 0.8 } });
              return (
                <span
                  key={w + wordIndex}
                  style={{
                    display: "inline-block",
                    opacity: s,
                    transform: `translateY(${(1 - s) * 60}px) scale(${0.85 + 0.15 * s})`,
                  }}
                >
                  {w}
                </span>
              );
            })}
          </div>
        ))}
        {big ? <FinalFlourish accent={data.accent} /> : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const FinalFlourish: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - 40, fps, config: { damping: 10 } });
  const pulse = 1 + 0.04 * Math.sin(frame / 6);
  return (
    <div style={{ marginTop: 30, transform: `scale(${s * pulse})`, opacity: s }}>
      <svg width={160} height={140} viewBox="-60 -55 120 105">
        <path
          d="M0 40 C-60 0 -45 -45 0 -18 C45 -45 60 0 0 40 Z"
          fill={accent}
          style={{ filter: `drop-shadow(0 0 18px ${accent})` }}
        />
      </svg>
    </div>
  );
};

export const KelinKainene: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {SCENES.map((s, i) => (
        <Sequence key={i} from={i * SCENE} durationInFrames={SCENE}>
          <Scene data={s} duration={SCENE} seed={`s${i}`} />
        </Sequence>
      ))}
      <Sequence from={SCENES.length * SCENE} durationInFrames={FINAL}>
        <Scene data={FINAL_SCENE} duration={FINAL} seed="final" big />
      </Sequence>
    </AbsoluteFill>
  );
};

export const MyComposition = () => {
  return (
    <Composition
      id="KelinKainene"
      component={KelinKainene}
      durationInFrames={SCENES.length * SCENE + FINAL}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
