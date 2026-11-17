import type { CSSProperties, ReactNode } from "react";
import { Audio } from "@remotion/media";
import { Img, interpolate, Sequence, useCurrentFrame } from "remotion";
import { C, clamp, easeOut, fade, img, mono, sans, typed } from "./brand";

// Mock surfaces drawn from the real UIs: extension popup (popup.css), on-page menu + approval banner (content.js),
// a coding agent's terminal. Every secret value on screen is a dummy.

export const Window: React.FC<{ title: string; width: number; height: number; children: ReactNode; style?: CSSProperties; bar?: ReactNode }> = ({
  title,
  width,
  height,
  children,
  style,
  bar,
}) => (
  <div
    style={{
      width,
      height,
      borderRadius: 18,
      background: C.panel,
      border: `1px solid ${C.line2}`,
      boxShadow: "0 50px 120px rgba(0,0,0,.65), 0 0 0 1px #000",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      flex: "none",
      ...style,
    }}
  >
    <div style={{ height: 52, display: "flex", alignItems: "center", gap: 10, padding: "0 20px", borderBottom: `1px solid ${C.line}`, background: "#0d0f12", flex: "none" }}>
      {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
        <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c, opacity: 0.85 }} />
      ))}
      {bar ?? <div style={{ marginLeft: 14, fontFamily: mono, fontSize: 19, color: C.mut }}>{title}</div>}
    </div>
    <div style={{ position: "relative", flex: 1 }}>{children}</div>
  </div>
);

export type Line = { t: number; text: string; color?: string; type?: boolean; bold?: boolean; indent?: number };
/** Terminal: lines appear at their frame; `type` lines are typed out. */
export const Terminal: React.FC<{ lines: Line[]; size?: number; style?: CSSProperties }> = ({ lines, size = 24, style }) => {
  const f = useCurrentFrame();
  const shown = lines.filter((l) => f >= l.t);
  const last = shown[shown.length - 1];
  return (
    <div style={{ padding: "22px 28px", fontFamily: mono, fontSize: size, lineHeight: 1.6, color: C.txt, whiteSpace: "pre-wrap", ...style }}>
      {shown.map((l, i) => (
        <div key={i} style={{ color: l.color ?? C.txt, fontWeight: l.bold ? 700 : 400, paddingLeft: (l.indent ?? 0) * size * 0.6, opacity: l.type ? 1 : fade(f, l.t, 6) }}>
          {l.type ? typed(l.text, f, l.t, 1.3) : hl(l.text)}
          {l === last && Math.floor(f / 15) % 2 === 0 && <span style={{ background: C.txt, marginLeft: 2 }}>&nbsp;</span>}
        </div>
      ))}
    </div>
  );
};

// concealer's redact() marker, shown as the red bar it stands for
const MARK = "***REDACTED***";
const hl = (s: string) =>
  s.split(MARK).flatMap((part, i) =>
    i === 0
      ? [part]
      : [
          <span key={i} style={{ background: C.acc, color: C.bg, borderRadius: 6, padding: "0 .3em", fontWeight: 700 }}>
            {MARK}
          </span>,
          part,
        ],
  );

type Key = { f: number; x: number; y: number; click?: boolean };
/** macOS arrow that glides between keyframes; clicks ripple and tick. */
export const Cursor: React.FC<{ path: Key[]; sound?: boolean }> = ({ path, sound = true }) => {
  const f = useCurrentFrame();
  const fs = path.map((k) => k.f);
  const x = interpolate(f, fs, path.map((k) => k.x), { ...clamp, easing: easeOut });
  const y = interpolate(f, fs, path.map((k) => k.y), { ...clamp, easing: easeOut });
  const clicks = path.filter((k) => k.click);
  const near = clicks.find((k) => f >= k.f && f < k.f + 14);
  const press = near ? interpolate(f - near.f, [0, 4, 10], [1, 0.82, 1], clamp) : 1;
  return (
    <>
      {clicks.map((k) => (
        <Sequence key={k.f} from={k.f} durationInFrames={16} layout="none">
          {sound && <Audio src={img("sfx/mouse-click.wav")} volume={0.35} />}
          <Ripple x={k.x} y={k.y} />
        </Sequence>
      ))}
      <svg width="34" height="42" viewBox="0 0 17 21" style={{ position: "absolute", left: x - 3, top: y - 2, scale: String(press), transformOrigin: "0 0", filter: "drop-shadow(0 3px 5px rgba(0,0,0,.5))", zIndex: 50 }}>
        <path d="M1 1 L1 16 L5 12.5 L8 19 L10.5 18 L7.6 11.6 L13 11.4 Z" fill="#fff" stroke="#000" strokeWidth="1.1" strokeLinejoin="round" />
      </svg>
    </>
  );
};
const Ripple: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const f = useCurrentFrame();
  const r = interpolate(f, [0, 16], [6, 46], { ...clamp, easing: easeOut });
  return <div style={{ position: "absolute", left: x - r, top: y - r, width: 2 * r, height: 2 * r, borderRadius: r, border: `3px solid ${C.acc}`, opacity: interpolate(f, [0, 16], [0.9, 0], clamp), zIndex: 49 }} />;
};

export const brandSpan = (size?: number) => (
  <span style={{ fontFamily: mono, fontWeight: 700, fontSize: size }}>
    conceal<span style={{ background: C.acc, color: C.bg, borderRadius: 4, padding: "0 .12em" }}>er</span>
  </span>
);

// ── browser + a fictional cloud sign-in page ──────────────────────────────────────────────────────────────
export const Browser: React.FC<{ url: string; width: number; height: number; children: ReactNode; style?: CSSProperties }> = ({ url, width, height, children, style }) => (
  <Window
    title=""
    width={width}
    height={height}
    style={style}
    bar={
      <div style={{ marginLeft: 18, flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, height: 34, borderRadius: 17, background: C.panel2, display: "flex", alignItems: "center", padding: "0 18px", fontFamily: sans, fontSize: 18, color: C.mut }}>
          <span style={{ marginRight: 10 }}>🔒</span>
          <span style={{ color: C.txt }}>{url}</span>
        </div>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: C.bg, border: `1px solid ${C.line2}`, display: "grid", placeItems: "center" }}>
          <ExtIcon size={22} />
        </div>
      </div>
    }
  >
    {children}
  </Window>
);
export const ExtIcon: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ width: size, display: "flex", flexDirection: "column", gap: size * 0.1 }}>
    <div style={{ height: size * 0.13, width: "60%", borderRadius: 9, background: "#59606c" }} />
    <div style={{ height: size * 0.18, width: "100%", borderRadius: 9, background: C.acc }} />
    <div style={{ height: size * 0.13, width: "48%", borderRadius: 9, background: "#59606c" }} />
  </div>
);

export type Fill = { at: number; value: string; secret?: boolean };
/** A login form; each field fills at its frame (password as dots), a "filled" tag follows. */
export const SignInPage: React.FC<{ fills: [Fill?, Fill?, Fill?]; focus?: number; focusAt?: number; done?: number }> = ({ fills, focus, focusAt = 0, done }) => {
  const f = useCurrentFrame();
  const labels = ["Account ID or alias", "Username", "Password"];
  return (
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#f6f7f9,#eceff3)", fontFamily: sans, color: "#1a1d23", display: "flex", justifyContent: "center", paddingTop: 60 }}>
      <div style={{ width: 560 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 26 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#3b6cf6,#7a4ff0)" }} />
          <div style={{ fontWeight: 800, fontSize: 30, letterSpacing: "-0.02em" }}>Northwind Cloud</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 16, padding: "30px 34px", boxShadow: "0 10px 40px rgba(20,30,50,.12)", border: "1px solid #e2e6eb" }}>
          <div style={{ fontWeight: 700, fontSize: 26, marginBottom: 22 }}>Sign in to the console</div>
          {labels.map((label, i) => {
            const fl = fills[i];
            const on = fl && f >= fl.at;
            const v = on ? (fl.secret ? "•".repeat(Math.min(14, Math.floor((f - fl.at) * 2) + 1)) : typed(fl.value, f, fl.at, 2)) : "";
            const focused = focus === i && f >= focusAt;
            return (
              <div key={label} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 17, fontWeight: 600, color: "#5b6472", marginBottom: 7 }}>{label}</div>
                <div
                  style={{
                    height: 52,
                    borderRadius: 10,
                    border: `2px solid ${focused ? "#3b6cf6" : on ? "#a7d8b1" : "#c8ced7"}`,
                    background: on ? "#f3fbf5" : "#fff",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 16px",
                    fontSize: 21,
                    fontFamily: fl?.secret ? mono : sans,
                    letterSpacing: fl?.secret ? "0.1em" : undefined,
                  }}
                >
                  {v}
                </div>
              </div>
            );
          })}
          <div style={{ marginTop: 10, height: 54, borderRadius: 10, background: "#3b6cf6", color: "#fff", fontWeight: 700, fontSize: 21, display: "grid", placeItems: "center" }}>Sign in</div>
          {done !== undefined && f >= done && (
            <div style={{ marginTop: 16, fontWeight: 700, fontSize: 19, color: "#1a7f37", opacity: fade(f, done) }}>✓ filled by {brandSpan()} — nothing was shown or typed</div>
          )}
        </div>
      </div>
    </div>
  );
};

/** The on-page approval banner an agent's request_web_login raises (content.js afShowBanner). */
export const ApprovalBanner: React.FC<{ agent: string; domain: string; secret: string; user: string; pressed?: number; style?: CSSProperties }> = ({
  agent,
  domain,
  secret,
  user,
  pressed,
  style,
}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [0, 12], [0, 1], { ...clamp, easing: easeOut });
  const btn = (label: string, primary: boolean, hit = false) => (
    <div
      style={{
        borderRadius: 10,
        padding: "10px 18px",
        fontWeight: 700,
        fontSize: 18,
        background: primary ? C.acc : "transparent",
        color: primary ? C.bg : C.bad,
        border: primary ? "none" : `1px solid ${C.bad}`,
        scale: hit && pressed !== undefined && f >= pressed && f < pressed + 8 ? "0.92" : "1",
      }}
    >
      {label}
    </div>
  );
  return (
    <div
      style={{
        position: "absolute",
        top: 22,
        left: "50%",
        width: 640,
        marginLeft: -320,
        background: C.panel,
        color: C.txt,
        border: `1.5px solid ${C.acc}`,
        borderRadius: 16,
        padding: "20px 24px",
        fontFamily: sans,
        fontSize: 20,
        lineHeight: 1.45,
        boxShadow: "0 24px 70px rgba(0,0,0,.5), 0 0 40px rgba(255,77,77,.25)",
        opacity: p,
        translate: `0 ${(1 - p) * -30}px`,
        zIndex: 20,
        ...style,
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 8 }}>🔐 {brandSpan()} — sign-in request</div>
      <div>
        <b>{agent}</b> wants to sign in to <b>{domain}</b>
      </div>
      <div style={{ color: C.mut, margin: "4px 0 16px" }}>
        Using {secret} ({user}) — the password is never shown to the agent.
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        {btn("Approve once", true, true)}
        {btn("This task", true)}
        {btn("Deny", false)}
      </div>
    </div>
  );
};

/** The on-page account menu under a login field (content.js sugShow), shadow-DOM isolated in the real thing. */
export const FillMenu: React.FC<{ rows: [string, string][]; hover?: number; hoverAt?: number; style?: CSSProperties }> = ({ rows, hover, hoverAt = 0, style }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [0, 10], [0, 1], { ...clamp, easing: easeOut });
  return (
    <div
      style={{
        position: "absolute",
        width: 470,
        background: C.panel,
        color: C.txt,
        border: `1.5px solid ${C.acc}`,
        borderRadius: 14,
        padding: 10,
        fontFamily: sans,
        fontSize: 19,
        boxShadow: "0 20px 50px rgba(0,0,0,.4)",
        opacity: p,
        translate: `0 ${(1 - p) * -12}px`,
        zIndex: 20,
        ...style,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px 10px", fontWeight: 700 }}>
        <span>
          🔐 conceal<span style={{ color: C.acc }}>er</span>
        </span>
        <span style={{ color: C.mut }}>×</span>
      </div>
      {rows.map(([top, sub], i) => (
        <div key={top} style={{ padding: "10px 12px", borderRadius: 10, background: hover === i && f >= hoverAt ? "#1d2128" : undefined }}>
          <div style={{ fontWeight: 700 }}>{top}</div>
          <div style={{ color: C.mut, fontSize: 17 }}>{sub}</div>
        </div>
      ))}
    </div>
  );
};

// ── extension popup (popup.css) ───────────────────────────────────────────────────────────────────────────
export const POPUP_ROWS: [string, string, boolean][] = [
  ["STRIPE_KEY", "shop/prod", false],
  ["DATABASE_URL", "api/prod", true],
  ["OPENAI_API_KEY", "agents/dev", false],
  ["GITHUB_PAT", "ci/prod", false],
  ["NW_PROD_LOGIN", "cloud/prod", true],
  ["CLOUDFLARE_API_TOKEN", "r2/prod", false],
];
export const Popup: React.FC<{ copied?: number; copyRow?: number; scale?: number; style?: CSSProperties }> = ({ copied, copyRow = 0, scale = 1, style }) => {
  const f = useCurrentFrame();
  const secs = 300 - Math.floor(f / 30);
  const clear = copied !== undefined && f >= copied ? Math.max(0, 20 - Math.floor((f - copied) / 30)) : null;
  return (
    <div
      style={{
        width: 560,
        borderRadius: 18,
        background: C.bg,
        border: `1px solid ${C.line2}`,
        boxShadow: "0 50px 120px rgba(0,0,0,.7)",
        overflow: "hidden",
        fontFamily: sans,
        color: C.txt,
        scale: String(scale),
        flex: "none",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", padding: "18px 22px", borderBottom: `1px solid ${C.line}` }}>
        {brandSpan(30)}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 17, color: C.mut, fontVariantNumeric: "tabular-nums" }}>
          🔒 auto-lock {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}
        </span>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ border: `1px solid ${C.line2}`, borderRadius: 10, padding: "12px 16px", fontSize: 18, color: C.mut, marginBottom: 12 }}>Search… (name / tag / project)</div>
        {POPUP_ROWS.map(([n, s, multi], i) => {
          const hit = copied !== undefined && i === copyRow && f >= copied - 6;
          return (
            <div
              key={n}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "14px 16px",
                marginBottom: 8,
                borderRadius: 10,
                border: `1px solid ${hit ? C.acc : C.line}`,
                background: hit ? "#1d2128" : C.panel,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 19 }}>{n}</span>
              <span style={{ flex: 1 }} />
              <span style={{ color: C.mut, fontSize: 16, marginRight: 12 }}>{s}</span>
              <span style={{ color: C.mut, fontSize: 18 }}>{multi ? "▸" : "⧉"}</span>
            </div>
          );
        })}
        <div style={{ height: 44, marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: C.ok, opacity: clear === null ? 0 : 1 }}>
          ✓ copied · clipboard clears in {clear ?? 20}s
        </div>
      </div>
    </div>
  );
};

/** A real app screenshot in a window, slowly pushing in. */
export const Shot: React.FC<{ src: string; width: number; ratio: number; title?: string; from?: number; to?: number; origin?: string; style?: CSSProperties }> = ({
  src,
  width,
  ratio,
  title = "concealer · 127.0.0.1:8787",
  from = 1,
  to = 1.06,
  origin = "50% 30%",
  style,
}) => {
  const f = useCurrentFrame();
  return (
    <Window title={title} width={width} height={width / ratio + 52} style={style}>
      <Img src={img(src)} style={{ width: "100%", display: "block", scale: String(interpolate(f, [0, 240], [from, to], clamp)), transformOrigin: origin }} />
    </Window>
  );
};
