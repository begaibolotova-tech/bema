import React from "react";
import {
  AbsoluteFill,
  Audio,
  Composition,
  Easing,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import data from "./captions.json";

const FPS = 30;
const W = 1080;
const H = 1920;
const FONT = "Inter, 'DejaVu Sans', sans-serif";
const SEG = data.segments; // start time (s) of each script paragraph
const END = data.duration;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const MyComposition = () => (
  <Composition
    id="Everest"
    component={Everest}
    durationInFrames={Math.ceil(END * FPS)}
    fps={FPS}
    width={W}
    height={H}
  />
);

// ---------- helpers ----------
const segIndex = (t: number) => {
  let i = 0;
  for (let k = 0; k < SEG.length; k++) if (t >= SEG[k]) i = k;
  return i;
};

const Pop: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  at,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - at * fps, fps, config: { damping: 12, mass: 0.6 } });
  return (
    <div style={{ transform: `scale(${s})`, opacity: Math.min(1, s * 1.5), ...style }}>{children}</div>
  );
};

// ---------- background mountain ----------
const MOUNTAIN =
  "M -200 3000 L -200 1350 L 120 1080 L 260 1150 L 420 820 L 540 640 L 600 700 L 700 760 L 860 1000 L 960 960 L 1300 1300 L 1300 3000 L -200 3000 Z";
const SNOW =
  "M 420 820 L 540 640 L 600 700 L 700 760 L 760 850 L 700 830 L 650 900 L 600 820 L 540 880 L 480 830 L 450 880 Z";
const RIDGE_BACK =
  "M -200 3000 L -200 1250 L 60 1100 L 200 1180 L 330 1050 L 480 1200 L 640 1060 L 800 1180 L 1000 1050 L 1300 1150 L 1300 3000 L -200 3000 Z";
// fall path along the steep face
const FALL: [number, number][] = [
  [545, 645],
  [600, 760],
  [690, 950],
  [760, 1150],
  [820, 1380],
];
const fallPoint = (p: number) => {
  const n = FALL.length - 1;
  const x = Math.min(n - 0.0001, Math.max(0, p * n));
  const i = Math.floor(x);
  const f = x - i;
  return [FALL[i][0] + (FALL[i + 1][0] - FALL[i][0]) * f, FALL[i][1] + (FALL[i + 1][1] - FALL[i][1]) * f];
};

const Sky: React.FC<{ t: number }> = ({ t }) => {
  const danger = t >= SEG[3] && t < SEG[4];
  const dusk = t >= SEG[4];
  const top = danger ? "#3a0a12" : dusk ? "#1b1446" : "#0b1d3a";
  const mid = danger ? "#7a1a22" : dusk ? "#e0723c" : "#3d6fa8";
  return (
    <AbsoluteFill
      style={{ background: `linear-gradient(180deg, ${top} 0%, ${mid} 70%, #c9dcef 100%)` }}
    />
  );
};

const Stars: React.FC<{ t: number }> = ({ t }) => (
  <svg width={W} height={H} style={{ position: "absolute" }}>
    {new Array(60).fill(0).map((_, i) => (
      <circle
        key={i}
        cx={random(`x${i}`) * W}
        cy={random(`y${i}`) * 700}
        r={random(`r${i}`) * 2.5 + 0.5}
        fill="white"
        opacity={0.3 + 0.5 * Math.abs(Math.sin(t * 2 + i))}
      />
    ))}
  </svg>
);

// Wind streaks during the fall
const Wind: React.FC<{ t: number; strength: number }> = ({ t, strength }) => (
  <svg width={W} height={H} style={{ position: "absolute" }}>
    {new Array(40).fill(0).map((_, i) => {
      const x = random(`wx${i}`) * W;
      const speed = 1500 + random(`ws${i}`) * 1500;
      const y = ((random(`wy${i}`) * (H + 400) - t * speed) % (H + 400) + H + 400) % (H + 400) - 200;
      return (
        <line
          key={i}
          x1={x}
          y1={y}
          x2={x}
          y2={y + 120 + random(`wl${i}`) * 200}
          stroke="white"
          strokeWidth={3}
          strokeLinecap="round"
          opacity={0.35 * strength}
        />
      );
    })}
  </svg>
);

const Jumper: React.FC<{ x: number; y: number; rot: number; wingsuit?: boolean; scale?: number }> = ({
  x,
  y,
  rot,
  wingsuit,
  scale = 1,
}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
    {wingsuit ? (
      <>
        <path d="M 0 -34 L -46 18 L 0 40 L 46 18 Z" fill="#ff5a1f" stroke="#fff" strokeWidth={3} />
        <circle cx={0} cy={-42} r={11} fill="#ffd166" stroke="#fff" strokeWidth={3} />
      </>
    ) : (
      <>
        <circle cx={0} cy={-30} r={11} fill="#ffd166" stroke="#fff" strokeWidth={3} />
        <rect x={-10} y={-18} width={20} height={34} rx={8} fill="#ff5a1f" stroke="#fff" strokeWidth={3} />
        <line x1={-8} y1={-10} x2={-30} y2={-30} stroke="#fff" strokeWidth={7} strokeLinecap="round" />
        <line x1={8} y1={-10} x2={30} y2={-30} stroke="#fff" strokeWidth={7} strokeLinecap="round" />
        <line x1={-6} y1={14} x2={-22} y2={42} stroke="#fff" strokeWidth={7} strokeLinecap="round" />
        <line x1={6} y1={14} x2={22} y2={42} stroke="#fff" strokeWidth={7} strokeLinecap="round" />
      </>
    )}
  </g>
);

const World: React.FC<{ t: number }> = ({ t }) => {
  // camera: zoom on summit, follow fall, pull back for wingsuit
  const cam = interpolate(
    t,
    [0, SEG[1], SEG[2], SEG[2] + 3, SEG[3], SEG[4], SEG[4] + 2, SEG[5], END],
    [1.6, 1.15, 1.0, 1.5, 1.7, 1.0, 0.9, 0.9, 1.05],
    { ...clamp, easing: Easing.inOut(Easing.cubic) },
  );
  const fallP = interpolate(t, [SEG[2] + 2.5, SEG[3] + 1.5], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const [jx, jy] = fallPoint(fallP);
  const focusX = t < SEG[2] ? 540 : t < SEG[4] ? jx : 540;
  const focusY = t < SEG[2] ? interpolate(t, [0, SEG[1]], [700, 900], clamp) : t < SEG[4] ? jy : 1050;
  const shake = t >= SEG[3] && t < SEG[3] + 2.5 ? Math.sin(t * 70) * 14 * (1 - (t - SEG[3]) / 2.5) : 0;

  // wingsuit glide across the sky
  const g = interpolate(t, [SEG[4] + 1, SEG[5] - 0.5], [0, 1], clamp);
  const gx = interpolate(g, [0, 1], [600, 960]);
  const gy = 760 + g * 560 + Math.sin(g * 9) * 20;

  return (
    <AbsoluteFill
      style={{
        transform: `translate(${W / 2 - focusX * cam + shake}px, ${H / 2 - focusY * cam}px) scale(${cam})`,
        transformOrigin: "0 0",
      }}
    >
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="rock" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5d6b80" />
            <stop offset="1" stopColor="#1f2633" />
          </linearGradient>
        </defs>
        <path d={RIDGE_BACK} fill="#2c3a52" opacity={0.7} />
        <path d={MOUNTAIN} fill="url(#rock)" />
        <path d={SNOW} fill="#f4f8ff" />
        {/* summit flag */}
        <line x1={540} y1={640} x2={540} y2={585} stroke="#fff" strokeWidth={4} />
        <path d={`M 540 585 L ${580 + Math.sin(t * 8) * 6} 597 L 540 610 Z`} fill="#e63946" />
        {/* fall trail */}
        {t >= SEG[2] && t < SEG[4] && (
          <polyline
            points={new Array(30)
              .fill(0)
              .map((_, i) => fallPoint((fallP * i) / 29).join(","))
              .join(" ")}
            fill="none"
            stroke="#ffd166"
            strokeWidth={5}
            strokeDasharray="14 12"
            opacity={0.8}
          />
        )}
        {t >= SEG[2] - 0.5 && t < SEG[4] && <Jumper x={jx} y={jy - 40} rot={fallP * 540} />}
        {t >= SEG[4] && (
          <>
            <path
              d={`M 560 660 L ${gx} ${gy}`}
              fill="none"
              stroke="#ffd166"
              strokeWidth={4}
              strokeDasharray="10 10"
              opacity={0.7}
            />
            <Jumper x={gx} y={gy} rot={25} wingsuit scale={1.3} />
          </>
        )}
      </svg>
    </AbsoluteFill>
  );
};

// ---------- overlay cards ----------
const Card: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = "#ffd166" }) => (
  <div
    style={{
      background: "rgba(5,12,28,0.72)",
      border: `4px solid ${color}`,
      borderRadius: 32,
      padding: "22px 40px",
      color: "white",
      fontFamily: FONT,
      fontWeight: 800,
      textAlign: "center",
      boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
    }}
  >
    {children}
  </div>
);

const Overlay: React.FC<{ t: number }> = ({ t }) => {
  const i = segIndex(t);
  const big = { fontSize: 96, lineHeight: 1.05 } as const;
  const small = { fontSize: 44, fontWeight: 600, opacity: 0.9 } as const;
  const wrap: React.CSSProperties = {
    position: "absolute",
    top: 210,
    left: 60,
    right: 60,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 28,
  };

  if (i === 0)
    return (
      <div style={wrap}>
        <Pop at={0.1}>
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 120,
              lineHeight: 1,
              color: "white",
              textAlign: "center",
              textShadow: "0 8px 30px rgba(0,0,0,0.6)",
            }}
          >
            ЭВЕРЕСТТЕН
            <br />
            <span style={{ color: "#ffd166" }}>СЕКИРСЕҢ</span>
            <br />
            ЭМНЕ БОЛОТ?
          </div>
        </Pop>
      </div>
    );

  if (i === 1) {
    const h = Math.round(interpolate(t, [SEG[1] + 1, SEG[1] + 4], [0, 8849], clamp));
    return (
      <div style={wrap}>
        <Pop at={SEG[1] + 0.8}>
          <Card>
            <div style={small}>бийиктиги</div>
            <div style={big}>{h.toLocaleString("ru-RU")} м</div>
          </Card>
        </Pop>
        <div style={{ display: "flex", gap: 28 }}>
          <Pop at={SEG[1] + 5.5}>
            <Card color="#7cc6ff">
              <div style={small}>аба</div>
              <div style={{ fontSize: 80 }}>×⅓</div>
            </Card>
          </Pop>
          <Pop at={SEG[1] + 7.5}>
            <Card color="#7cc6ff">
              <div style={small}>суук</div>
              <div style={{ fontSize: 80 }}>−40°C</div>
            </Card>
          </Pop>
        </div>
        <Pop at={SEG[1] + 10}>
          <Card color="#ff6b6b">
            <div style={{ fontSize: 52 }}>O₂ жетишпейт</div>
          </Card>
        </Pop>
      </div>
    );
  }

  if (i === 2) {
    const fallP = interpolate(t, [SEG[2] + 2.5, SEG[3] + 1.5], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
    const alt = Math.round(8849 - fallP * 2300);
    const speed = Math.round(interpolate(t, [SEG[2] + 2.5, SEG[2] + 9], [0, 290], clamp));
    return (
      <div style={wrap}>
        <Pop at={SEG[2] + 0.2}>
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 110, color: "#ffd166", textShadow: "0 8px 30px #000" }}>
            СЕКИРДИҢ!
          </div>
        </Pop>
        <div style={{ display: "flex", gap: 28 }}>
          <Pop at={SEG[2] + 2.5}>
            <Card>
              <div style={small}>бийиктик</div>
              <div style={{ fontSize: 76 }}>{alt.toLocaleString("ru-RU")} м</div>
            </Card>
          </Pop>
          <Pop at={SEG[2] + 6}>
            <Card color="#ff6b6b">
              <div style={small}>ылдамдык</div>
              <div style={{ fontSize: 76 }}>{speed} км/с</div>
            </Card>
          </Pop>
        </div>
      </div>
    );
  }

  if (i === 3)
    return (
      <div style={wrap}>
        <Pop at={SEG[3] + 0.6}>
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 112,
              color: "#ff4d4d",
              textAlign: "center",
              lineHeight: 1.05,
              textShadow: "0 8px 30px #000",
            }}
          >
            ⚠ ЗООКАЛАР
            <br />
            МУЗ • КАР
          </div>
        </Pop>
        <Pop at={SEG[3] + 4.5}>
          <Card color="#ff4d4d">
            <div style={{ fontSize: 60 }}>Парашютсуз — 0% шанс</div>
          </Card>
        </Pop>
      </div>
    );

  if (i === 4)
    return (
      <div style={wrap}>
        <Pop at={SEG[4] + 0.5}>
          <Card color="#ff8c42">
            <div style={small}>вингсьют • канаттуу костюм</div>
            <div style={{ fontSize: 88 }}>2013-жыл</div>
          </Card>
        </Pop>
        <Pop at={SEG[4] + 3.5}>
          <Card color="#ff8c42">
            <div style={{ fontSize: 64 }}>Валерий Розов</div>
            <div style={small}>түндүк каптал • 7 220 м</div>
          </Card>
        </Pop>
        <Pop at={SEG[4] + 9}>
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 84, color: "#7CFC9A", textShadow: "0 8px 30px #000" }}>
            ✔ АМАН КОНДУ
          </div>
        </Pop>
      </div>
    );

  return (
    <div style={{ ...wrap, top: 260 }}>
      <Pop at={SEG[5] + 1.5}>
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 120,
            textAlign: "center",
            lineHeight: 1.05,
            color: "white",
            textShadow: "0 8px 30px #000",
          }}
        >
          <span style={{ color: "#ff4d4d" }}>ӨЛҮМ</span>
          <br />
          же
          <br />
          <span style={{ color: "#ffd166" }}>ТАРЫХ?</span>
        </div>
      </Pop>
      <Pop at={SEG[5] + 5}>
        <Card>
          <div style={{ fontSize: 58 }}>Сиз секирет белеңиз?</div>
        </Card>
      </Pop>
    </div>
  );
};

// ---------- captions with active-word highlight ----------
type Word = { w: string; s: number; e: number };
const LINES: Word[][] = (() => {
  const out: Word[][] = [];
  let cur: Word[] = [];
  for (const w of data.words as Word[]) {
    cur.push(w);
    const len = cur.map((x) => x.w).join(" ").length;
    if (len > 22 || /[.?!,—:]$/.test(w.w)) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out;
})();

const Captions: React.FC<{ t: number }> = ({ t }) => {
  const line = LINES.find((l, k) => t >= l[0].s - 0.05 && t < (LINES[k + 1]?.[0].s ?? END) - 0.05);
  if (!line) return null;
  return (
    <div
      style={{
        position: "absolute",
        bottom: 330,
        left: 50,
        right: 50,
        textAlign: "center",
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: 74,
        lineHeight: 1.15,
        textTransform: "uppercase",
      }}
    >
      {line.map((w, k) => {
        const cur = line.filter((x) => x.s <= t).pop();
        const active = w === cur && t < w.e + 0.4;
        return (
          <span
            key={k}
            style={{
              color: active ? "#ffd166" : "white",
              display: "inline-block",
              margin: "0 16px",
              transform: `scale(${active ? 1.08 : 1})`,
              WebkitTextStroke: "3px #000",
              paintOrder: "stroke fill",
              textShadow: "0 6px 18px rgba(0,0,0,0.8)",
            }}
          >
            {w.w}
          </span>
        );
      })}
    </div>
  );
};

export const Everest: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const windStrength =
    t >= SEG[2] + 2.5 && t < SEG[3] + 1.5 ? 1 : t >= SEG[4] && t < SEG[5] ? 0.5 : 0;
  const flash = interpolate(t, [SEG[3] + 1.2, SEG[3] + 1.4, SEG[3] + 2.2], [0, 0.7, 0], clamp);
  const fadeOut = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill style={{ opacity: fadeOut }}>
        <Sky t={t} />
        {t < SEG[2] && <Stars t={t} />}
        <World t={t} />
        <Wind t={t} strength={windStrength} />
        <AbsoluteFill style={{ background: "#ff2020", opacity: flash }} />
        <AbsoluteFill
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, transparent 30%, transparent 65%, rgba(0,0,0,0.6) 100%)" }}
        />
        <Overlay t={t} />
        <Captions t={t} />
        {/* progress bar */}
        <div style={{ position: "absolute", top: 0, left: 0, height: 12, width: (W * frame) / durationInFrames, background: "#ffd166" }} />
      </AbsoluteFill>
      <Audio src={staticFile("voice.mp3")} />
    </AbsoluteFill>
  );
};
