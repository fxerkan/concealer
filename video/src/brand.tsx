import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, staticFile, useCurrentFrame } from "remotion";

// The concealer design system (webui.html / extension popup.css dark theme): near-black, one red accent,
// monospace wordmark with the "er" on a red badge, and the logo's red redaction bar as the motion motif.
export const sans = loadInter("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin"] }).fontFamily;
export const mono = loadMono("normal", { weights: ["400", "500", "700", "800"], subsets: ["latin"] }).fontFamily;

export const C = {
  bg: "#0a0b0d",
  panel: "#101216",
  panel2: "#161a20",
  line: "#1c1f26",
  line2: "#2a2f38",
  txt: "#e8e8e6",
  mut: "#8a909b",
  acc: "#ff4d4d",
  acc2: "#ff7a7a",
  ok: "#7ee787",
  warn: "#e3b341",
  bad: "#ff6b6b",
  blue: "#79c0ff",
  bar: "#272c35",
};
// type chips, as in the web UI / mobile app
export const CHIP: Record<string, [string, string]> = {
  api_key: ["#79c0ff", "rgba(56,139,253,.15)"],
  database: ["#7ee787", "rgba(46,160,67,.15)"],
  token: ["#79c0ff", "rgba(56,139,253,.15)"],
  login: ["#e3b341", "rgba(187,128,9,.18)"],
  website: ["#d2a8ff", "rgba(163,113,247,.15)"],
};
export const SITE = "fxerkan.github.io/concealer";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const springy = Easing.bezier(0.3, 1.45, 0.55, 1);
export const img = (p: string) => staticFile(p);
export const fade = (f: number, d = 0, len = 12) => interpolate(f, [d, d + len], [0, 1], { ...clamp, easing: easeOut });
/** typewriter: how much of `s` is visible at frame f, starting at d, `cps` chars per frame */
export const typed = (s: string, f: number, d = 0, cps = 1.2) => s.slice(0, Math.max(0, Math.floor((f - d) * cps)));

/** Dot grid + a slow red glow, like the store creatives. */
export const Bg: React.FC<{ children?: ReactNode; style?: CSSProperties; glow?: number }> = ({ children, style, glow = 1 }) => {
  const f = useCurrentFrame();
  const dx = Math.sin(f / 80) * 5;
  return (
    <AbsoluteFill style={{ background: C.bg, color: C.txt, fontFamily: sans, overflow: "hidden", ...style }}>
      <AbsoluteFill style={{ background: `radial-gradient(42% 55% at ${50 + dx}% 55%, rgba(255,77,77,${0.2 * glow}), transparent 70%)` }} />
      <AbsoluteFill
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,.07) 1.4px, transparent 1.6px)",
          backgroundSize: "34px 34px",
          backgroundPosition: `${f * 0.15}px ${f * 0.1}px`,
          maskImage: "radial-gradient(70% 70% at 50% 50%, #000 30%, transparent 100%)",
        }}
      />
      {children}
    </AbsoluteFill>
  );
};

/** The logo: two dim lines and the red redaction bar that grows across. */
export const Mark: React.FC<{ size: number; delay?: number; style?: CSSProperties }> = ({ size, delay = 0, style }) => {
  const f = useCurrentFrame() - delay;
  const u = size / 512;
  const grow = (d: number) => interpolate(f, [d, d + 14], [0, 1], { ...clamp, easing: easeOut });
  const bar = (y: number, w: number, h: number, c: string, d: number, glow = false) => (
    <div
      style={{
        position: "absolute",
        left: 128 * u,
        top: y * u,
        height: h * u,
        width: w * u * grow(d),
        borderRadius: h * u,
        background: c,
        boxShadow: glow ? `0 ${6 * u}px ${30 * u}px rgba(255,77,77,.45)` : undefined,
      }}
    />
  );
  return (
    <div style={{ position: "relative", width: size, height: size, borderRadius: 116 * u, background: C.bg, boxShadow: `inset 0 0 0 ${2 * u}px #20242c, 0 30px 80px rgba(0,0,0,.6)`, flex: "none", ...style }}>
      {bar(176, 176, 38, C.bar, 0)}
      {bar(232, 256, 52, C.acc, 6, true)}
      {bar(302, 136, 38, C.bar, 3)}
    </div>
  );
};

/** "conceal" typed in mono, then the red "er" badge pops in (house branding rule). */
export const Wordmark: React.FC<{ size: number; delay?: number; style?: CSSProperties }> = ({ size, delay = 0, style }) => {
  const f = useCurrentFrame() - delay;
  const n = Math.min(7, Math.max(0, Math.floor(f / 2.2)));
  const pop = interpolate(f, [17, 29], [0, 1], { ...clamp, easing: springy });
  return (
    <div style={{ fontFamily: mono, fontWeight: 700, fontSize: size, letterSpacing: "-0.02em", lineHeight: 1, display: "flex", alignItems: "center", ...style }}>
      <span style={{ whiteSpace: "pre" }}>{"conceal".slice(0, n).padEnd(7, " ")}</span>
      <span
        style={{
          display: "inline-block",
          background: C.acc,
          color: C.bg,
          borderRadius: size * 0.1,
          padding: "0.04em 0.1em 0.08em",
          scale: String(pop),
          opacity: pop > 0 ? 1 : 0,
          boxShadow: `0 ${size * 0.08}px ${size * 0.3}px rgba(255,77,77,.35)`,
        }}
      >
        er
      </span>
    </div>
  );
};

/** A word that is struck by the red redaction bar and comes out as dots. */
export const Redact: React.FC<{ text: string; at: number; dots?: string; style?: CSSProperties }> = ({ text, at, dots, style }) => {
  const f = useCurrentFrame();
  const cover = interpolate(f, [at, at + 9], [0, 1], { ...clamp, easing: easeOut });
  const leave = interpolate(f, [at + 14, at + 24], [0, 1], { ...clamp, easing: easeOut });
  const swapped = f >= at + 11;
  return (
    <span style={{ position: "relative", display: "inline-block", ...style }}>
      <span style={{ color: swapped ? C.acc : undefined, letterSpacing: swapped ? "0.08em" : undefined }}>{swapped ? (dots ?? "•".repeat(Math.max(4, text.length))) : text}</span>
      <span
        style={{
          position: "absolute",
          left: `${leave * 100}%`,
          right: `${(1 - cover) * 100}%`,
          top: "12%",
          bottom: "8%",
          borderRadius: 999,
          background: C.acc,
          boxShadow: "0 6px 30px rgba(255,77,77,.5)",
        }}
      />
    </span>
  );
};

/** A headline that rises in; `hot` words go accent red. */
export const Headline: React.FC<{ children: ReactNode; size?: number; delay?: number; style?: CSSProperties }> = ({ children, size = 76, delay = 0, style }) => {
  const f = useCurrentFrame() - delay;
  const p = interpolate(f, [0, 16], [0, 1], { ...clamp, easing: easeOut });
  return (
    <div
      style={{
        fontFamily: sans,
        fontWeight: 800,
        fontSize: size,
        letterSpacing: "-0.035em",
        lineHeight: 1.08,
        opacity: p,
        translate: `0 ${(1 - p) * 40}px`,
        filter: `blur(${(1 - p) * 8}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
export const Hot: React.FC<{ children: ReactNode }> = ({ children }) => <span style={{ color: C.acc }}>{children}</span>;

export const Kicker: React.FC<{ children: ReactNode; delay?: number; style?: CSSProperties }> = ({ children, delay = 0, style }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ fontFamily: mono, fontSize: 22, letterSpacing: "0.28em", textTransform: "uppercase", color: C.acc, opacity: fade(f, delay), ...style }}>{children}</div>
  );
};

export const Chip: React.FC<{ type: string; style?: CSSProperties }> = ({ type, style }) => {
  const [fg, bg] = CHIP[type] ?? [C.mut, C.panel2];
  return <span style={{ fontFamily: mono, fontWeight: 700, color: fg, background: bg, borderRadius: 8, padding: "4px 12px", fontSize: "0.8em", ...style }}>{type}</span>;
};
