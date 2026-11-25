import React from "react";
import {
  AbsoluteFill,
  Composition,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const FPS = 30;
const SCENE = 105; // 3.5 s per scene

const scenes: { lines: string[]; accent: string; bg: [string, string] }[] = [
  {
    lines: ["Ынтымак —", "бакыттын ачкычы!"],
    accent: "#ffd166",
    bg: ["#1d3557", "#457b9d"],
  },
  {
    lines: ["Келин —", "үйдүн куту"],
    accent: "#ff9fb2",
    bg: ["#6a1b4d", "#c0397b"],
  },
  {
    lines: ["Кайнене —", "үйдүн түркүгү"],
    accent: "#9be7c4",
    bg: ["#0b4f3c", "#2a9d8f"],
  },
  {
    lines: ["Бири-бирин сыйлаган үйгө", "бакыт консо"],
    accent: "#ffd166",
    bg: ["#7a2e0e", "#e76f51"],
  },
];

// Simple tunduk (yurt crown) ornament drawn in SVG
const Tunduk: React.FC<{ color: string; rotate: number; size: number }> = ({
  color,
  rotate,
  size,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="-100 -100 200 200"
    style={{ transform: `rotate(${rotate}deg)` }}
  >
    <circle r={92} fill="none" stroke={color} strokeWidth={6} />
    <circle r={70} fill="none" stroke={color} strokeWidth={3} opacity={0.6} />
    {[0, 1, 2].map((i) => (
      <g key={i} transform={`rotate(${i * 60})`}>
        <line x1={-92} y1={-10} x2={92} y2={-10} stroke={color} strokeWidth={5} />
        <line x1={-92} y1={10} x2={92} y2={10} stroke={color} strokeWidth={5} />
      </g>
    ))}
  </svg>
);

const Scene: React.FC<{
  lines: string[];
  accent: string;
  bg: [string, string];
  isLast: boolean;
}> = ({ lines, accent, bg, isLast }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeOut = isLast
    ? 1
    : interpolate(frame, [SCENE - 12, SCENE], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
  const fadeIn = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  const ornamentScale = spring({ frame, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${bg[0]}, ${bg[1]})`,
        opacity: Math.min(fadeIn, fadeOut),
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DejaVu Sans', 'Noto Sans', Arial, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 220,
          transform: `scale(${ornamentScale})`,
          opacity: 0.9,
        }}
      >
        <Tunduk color={accent} rotate={frame * 0.6} size={360} />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          marginTop: 260,
          padding: "0 80px",
        }}
      >
        {lines.map((line, i) => {
          const s = spring({
            frame: frame - 8 - i * 10,
            fps,
            config: { damping: 200 },
          });
          return (
            <div
              key={i}
              style={{
                color: i === 0 ? accent : "white",
                fontSize: i === 0 ? 104 : 88,
                fontWeight: 800,
                textAlign: "center",
                lineHeight: 1.15,
                opacity: s,
                transform: `translateY(${(1 - s) * 60}px)`,
                textShadow: "0 6px 24px rgba(0,0,0,0.35)",
              }}
            >
              {line}
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 200,
          height: 10,
          borderRadius: 5,
          background: accent,
          width: interpolate(frame, [15, 60], [0, 520], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />
    </AbsoluteFill>
  );
};

export const MyComponent: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#111" }}>
      {scenes.map((sc, i) => (
        <Sequence
          key={i}
          from={i * SCENE}
          durationInFrames={SCENE}
          name={sc.lines[0]}
        >
          <Scene {...sc} isLast={i === scenes.length - 1} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const MyComposition = () => {
  return (
    <Composition
      id="KelinKainene"
      component={MyComponent}
      durationInFrames={SCENE * scenes.length}
      fps={FPS}
      width={1080}
      height={1920}
    />
  );
};
