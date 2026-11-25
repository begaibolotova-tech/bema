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
const W = 1080;
const H = 1920;
const FONT = "'Inter', 'DejaVu Sans', sans-serif";
const EMOJI = "'Noto Color Emoji'";
const ACCENT = "#ffd166";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ramp = (f: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(f, [a, b], [from, to], { ...clamp, easing: Easing.inOut(Easing.cubic) });

/* ---------------- shared visuals ---------------- */

const Stars: React.FC<{ dim?: number }> = ({ dim = 1 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      {Array.from({ length: 160 }).map((_, i) => {
        const r = 1 + random(`r${i}`) * 2.6;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(frame / (20 + random(`t${i}`) * 40) + i));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: random(`x${i}`) * W,
              top: random(`y${i}`) * H,
              width: r,
              height: r,
              borderRadius: "50%",
              background: "#fff",
              opacity: tw * dim,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const Moon: React.FC<{ size: number; x: number; y: number; opacity?: number; glow?: number }> = ({
  size,
  x,
  y,
  opacity = 1,
  glow = 1,
}) => {
  const craters = [
    [0.3, 0.35, 0.14],
    [0.62, 0.28, 0.09],
    [0.55, 0.62, 0.16],
    [0.25, 0.7, 0.08],
    [0.74, 0.55, 0.06],
    [0.42, 0.18, 0.05],
  ];
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        opacity,
        background: "radial-gradient(circle at 35% 30%, #f4f1ea 0%, #c9c4b8 55%, #8d877c 100%)",
        boxShadow: `0 0 ${size * 0.35 * glow}px ${size * 0.06 * glow}px rgba(255,248,225,0.45)`,
        overflow: "hidden",
      }}
    >
      {craters.map(([cx, cy, cr], i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: (cx - cr) * size,
            top: (cy - cr) * size,
            width: cr * 2 * size,
            height: cr * 2 * size,
            borderRadius: "50%",
            background: "radial-gradient(circle at 60% 60%, #b5afa3 0%, #9b9588 70%, #a8a296 100%)",
            boxShadow: "inset 4px 4px 8px rgba(0,0,0,0.18)",
          }}
        />
      ))}
    </div>
  );
};

const Earth: React.FC<{ size: number; x: number; y: number; spin?: number; tilt?: number; axis?: boolean }> = ({
  size,
  x,
  y,
  spin = 0,
  tilt = 0,
  axis,
}) => {
  const lands = [
    [0.2, 0.3, 0.22, 0.16],
    [0.55, 0.22, 0.18, 0.12],
    [0.45, 0.55, 0.14, 0.22],
    [0.75, 0.6, 0.16, 0.1],
    [0.1, 0.65, 0.12, 0.12],
  ];
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        transform: `rotate(${tilt}deg)`,
      }}
    >
      {axis ? (
        <div
          style={{
            position: "absolute",
            left: size / 2 - 4,
            top: -size * 0.25,
            width: 8,
            height: size * 1.5,
            background: ACCENT,
            borderRadius: 4,
            boxShadow: `0 0 20px ${ACCENT}`,
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          overflow: "hidden",
          background: "radial-gradient(circle at 35% 30%, #5fb6ff 0%, #1d6fd1 50%, #0b2f6b 100%)",
          boxShadow: `0 0 ${size * 0.2}px rgba(90,170,255,0.5)`,
        }}
      >
        {[0, 1].map((k) =>
          lands.map(([lx, ly, lw, lh], i) => {
            const off = ((lx + spin + k) % 2) - 0.5;
            return (
              <div
                key={`${k}-${i}`}
                style={{
                  position: "absolute",
                  left: off * size,
                  top: ly * size,
                  width: lw * size * 1.6,
                  height: lh * size * 1.6,
                  borderRadius: "45% 55% 50% 40%",
                  background: "#3fae5a",
                  opacity: 0.9,
                }}
              />
            );
          }),
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: "radial-gradient(circle at 75% 70%, transparent 40%, rgba(0,0,20,0.65) 100%)",
          }}
        />
      </div>
    </div>
  );
};

/* ---------------- text block ---------------- */

const Caption: React.FC<{ step?: string; title: string; body?: string; top?: number }> = ({
  step,
  title,
  body,
  top = 250,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s1 = spring({ frame, fps, config: { damping: 14 } });
  const s2 = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const s3 = spring({ frame: frame - 22, fps, config: { damping: 16 } });
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 90,
        right: 90,
        textAlign: "center",
        fontFamily: FONT,
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 28,
      }}
    >
      {step ? (
        <div
          style={{
            opacity: s1,
            transform: `scale(${0.7 + 0.3 * s1})`,
            background: ACCENT,
            color: "#141018",
            fontWeight: 800,
            fontSize: 44,
            padding: "10px 30px",
            borderRadius: 40,
          }}
        >
          {step}
        </div>
      ) : null}
      <div
        style={{
          opacity: s2,
          transform: `translateY(${(1 - s2) * 50}px)`,
          fontWeight: 900,
          fontSize: 92,
          lineHeight: 1.08,
          textShadow: "0 6px 30px rgba(0,0,0,0.8)",
        }}
      >
        {title}
      </div>
      {body ? (
        <div
          style={{
            opacity: s3,
            transform: `translateY(${(1 - s3) * 40}px)`,
            fontWeight: 500,
            fontSize: 50,
            lineHeight: 1.3,
            color: "#e6e4f0",
            textShadow: "0 4px 20px rgba(0,0,0,0.9)",
          }}
        >
          {body}
        </div>
      ) : null}
    </div>
  );
};

const Fade: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const frame = useCurrentFrame();
  const o = Math.min(ramp(frame, 0, 8), ramp(frame, dur - 8, dur, 1, 0));
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

const Space: React.FC<{ children: React.ReactNode; dim?: number }> = ({ children, dim }) => (
  <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 60%, #1a1838 0%, #05040d 80%)" }}>
    <Stars dim={dim} />
    {children}
  </AbsoluteFill>
);

/* ---------------- scenes ---------------- */

const S1Hook: React.FC = () => {
  const f = useCurrentFrame();
  const vanish = ramp(f, 95, 115);
  const flash = interpolate(f, [95, 102, 120], [0, 0.9, 0], clamp);
  return (
    <Space>
      <Moon size={640 * (1 - vanish * 0.3)} x={W / 2} y={1200} opacity={1 - vanish} glow={1 + flash * 2} />
      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
      <Caption title="Что будет, если ЛУНА исчезнет прямо сейчас?" top={260} />
    </Space>
  );
};

const S2Light: React.FC = () => {
  const f = useCurrentFrame();
  const t = ramp(f, 30, 30 + 1.3 * FPS * 2.5); // slowed for visibility
  const seconds = (t * 1.3).toFixed(1).replace(".", ",");
  const moonGone = f > 30;
  const beamY = interpolate(t, [0, 1], [1080, 1640]);
  return (
    <Space>
      <Moon size={220} x={W / 2} y={1040} opacity={moonGone ? 0.12 : 1} />
      <div
        style={{
          position: "absolute",
          left: W / 2 - 6,
          top: 1150,
          width: 12,
          height: Math.max(0, beamY - 1150),
          background: `linear-gradient(${ACCENT}00, ${ACCENT})`,
          borderRadius: 6,
          opacity: t < 1 ? 1 : 0.3,
        }}
      />
      <Earth size={360} x={W / 2} y={1760} spin={f / 300} />
      <div
        style={{
          position: "absolute",
          top: 1330,
          right: 110,
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 80,
          color: ACCENT,
        }}
      >
        {seconds} с
      </div>
      <Caption step="0 секунд" title="1,3 секунды — ничего" body="Столько свет летит от Луны до Земли. Только потом ты заметишь пропажу." />
    </Space>
  );
};

const S3Night: React.FC = () => {
  const f = useCurrentFrame();
  const dark = ramp(f, 40, 130);
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(#${dark > 0.5 ? "03030a" : "1b2a52"} 0%, #05050c 100%)`,
      }}
    >
      <AbsoluteFill style={{ background: "linear-gradient(#2c4180 0%, #0e1530 70%)", opacity: 1 - dark }} />
      <Stars dim={0.4 + dark * 0.6} />
      <Moon size={200} x={820} y={980} opacity={1 - dark} />
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <path
          d={`M0 1500 Q200 1380 380 1460 T760 1420 T1080 1470 L1080 ${H} L0 ${H} Z`}
          fill={`rgb(${40 - dark * 35},${60 - dark * 52},${90 - dark * 80})`}
        />
        <path
          d={`M0 1650 Q260 1560 520 1640 T1080 1600 L1080 ${H} L0 ${H} Z`}
          fill={`rgb(${22 - dark * 20},${34 - dark * 30},${50 - dark * 45})`}
        />
      </svg>
      <div style={{ position: "absolute", top: 1560, left: 300, fontSize: 90, fontFamily: EMOJI, opacity: 1 - dark * 0.85 }}>
        🌲🏡🌲
      </div>
      <Caption step="1 секунда" title="Ночи станут в сотни раз темнее" body="Полнолуние светит в сотни раз ярче всех звёзд вместе." />
    </AbsoluteFill>
  );
};

const S4Tides: React.FC = () => {
  const f = useCurrentFrame();
  const k = ramp(f, 40, 150);
  const level = interpolate(k, [0, 1], [1180, 1420]);
  const amp = interpolate(k, [0, 1], [70, 22]);
  const pts = Array.from({ length: 28 }).map((_, i) => {
    const x = (i / 27) * W;
    const y = level + Math.sin(i / 2.2 + f / 8) * amp;
    return `${x},${y}`;
  });
  return (
    <Space dim={0.6}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <polygon points={`0,${H} ${pts.join(" ")} ${W},${H}`} fill="url(#sea)" />
        <defs>
          <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3aa0ff" />
            <stop offset="1" stopColor="#062a5a" />
          </linearGradient>
        </defs>
        <line x1={60} x2={W - 60} y1={1180} y2={1180} stroke={ACCENT} strokeWidth={4} strokeDasharray="16 14" />
      </svg>
      <div style={{ position: "absolute", top: 1110, left: 70, fontFamily: FONT, fontSize: 40, color: ACCENT, fontWeight: 700 }}>
        прилив с Луной
      </div>
      <Caption step="Через несколько часов" title="Приливы — примерно в 3 раза слабее" body="Останутся только слабые солнечные приливы." />
    </Space>
  );
};

const S5Animals: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const icons = ["🐢", "🪸", "🐟", "🦀"];
  return (
    <Space dim={0.5}>
      <div style={{ position: "absolute", top: 1100, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 40 }}>
        {icons.map((ic, i) => {
          const s = spring({ frame: f - 30 - i * 8, fps, config: { damping: 9 } });
          const wobble = f > 90 ? Math.sin(f / 4 + i * 2) * 14 : 0;
          return (
            <div key={i} style={{ fontFamily: EMOJI, fontSize: 150, transform: `scale(${s}) rotate(${wobble}deg)` }}>
              {ic}
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 1400, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 26 }}>
        {["🌑", "🌒", "🌓", "🌔", "🌕"].map((m, i) => (
          <div
            key={i}
            style={{
              fontFamily: EMOJI,
              fontSize: 90,
              opacity: interpolate(f, [100, 140], [1, 0.15], clamp),
              transform: `translateY(${interpolate(f, [100, 160], [0, 60 + i * 25], clamp)}px)`,
            }}
          >
            {m}
          </div>
        ))}
      </div>
      <Caption step="Через несколько недель" title="Животные собьются с ритма" body="Кораллы, черепахи и многие рыбы размножаются по лунному календарю." />
    </Space>
  );
};

const S6Day: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Space>
      <Earth size={520} x={W / 2} y={1330} spin={f / 90} />
      <div
        style={{
          position: "absolute",
          top: 1650,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 56,
          color: ACCENT,
        }}
      >
        +2 мс за 100 лет → ≈ 0
      </div>
      <Caption step="Тысячи лет" title="Сутки перестанут удлиняться" body="Луна тормозит вращение Земли. Без неё торможение почти прекратится." />
    </Space>
  );
};

const S7Axis: React.FC = () => {
  const f = useCurrentFrame();
  const grow = ramp(f, 40, 220);
  const tilt = 23.4 + Math.sin(f / 10) * (3 + grow * 17);
  return (
    <Space>
      <Earth size={480} x={W / 2} y={1320} spin={f / 120} tilt={tilt} axis />
      <div
        style={{
          position: "absolute",
          top: 1690,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 70,
          color: ACCENT,
        }}
      >
        {tilt.toFixed(1).replace(".", ",")}°
      </div>
      <Caption step="Миллионы лет" title="Но самое страшное — ось Земли" body="Луна держит наклон оси около 23,4°. Без неё ось и климат начнут сильно качаться." />
    </Space>
  );
};

const S8Final: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const back = spring({ frame: f - 10, fps, config: { damping: 12 } });
  const sub = spring({ frame: f - 120, fps, config: { damping: 10 } });
  const pulse = 1 + Math.sin(f / 6) * 0.04;
  return (
    <Space>
      <Moon size={420 * back} x={W / 2} y={1180} opacity={back} />
      <Caption title="Луна — стабилизатор нашей планеты" body="Не просто украшение неба." top={300} />
      <div
        style={{
          position: "absolute",
          top: 1560,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: sub,
          transform: `scale(${sub * pulse})`,
        }}
      >
        <div
          style={{
            background: "#e62117",
            color: "#fff",
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 60,
            padding: "26px 60px",
            borderRadius: 24,
            textAlign: "center",
            lineHeight: 1.2,
          }}
        >
          ПОДПИШИСЬ
          <div style={{ fontSize: 40, fontWeight: 600 }}>Что исчезнет следующим?</div>
        </div>
      </div>
    </Space>
  );
};

const SCENES: [React.FC, number][] = [
  [S1Hook, 150],
  [S2Light, 210],
  [S3Night, 210],
  [S4Tides, 210],
  [S5Animals, 210],
  [S6Day, 210],
  [S7Axis, 240],
  [S8Final, 270],
];
const TOTAL = SCENES.reduce((a, [, d]) => a + d, 0);

export const LunaVideo: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: "#05040d" }}>
      {SCENES.map(([C, d], i) => {
        const el = (
          <Sequence key={i} from={from} durationInFrames={d}>
            <Fade dur={d}>
              <C />
            </Fade>
          </Sequence>
        );
        from += d;
        return el;
      })}
    </AbsoluteFill>
  );
};

export const MyComposition = () => (
  <Composition id="Luna" component={LunaVideo} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
);
