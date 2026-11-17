import type { ReactNode } from "react";
import { interpolate, Sequence, useCurrentFrame } from "remotion";
import { Bg, C, clamp, fade, Headline, Hot, Kicker, Mark, mono, Redact, SITE, springy, Wordmark } from "./brand";
import { AGENT_LINES, FillBrowser, LOGIN_LINES, LoginBrowser } from "./scenes";
import { Cursor, Popup, Terminal, Window } from "./ui";

// 9:16 cut (1080×1920) for YouTube Shorts / Reels / TikTok: the same story as the store film, restacked vertically.
// The 16:9 mock surfaces are reused as-is and scaled; their cursors live inside them, so the clicks still land.
type Scene = { C: React.FC; len: number };

const Top: React.FC<{ kicker?: string; children: ReactNode; size?: number }> = ({ kicker, children, size = 84 }) => (
  <div style={{ position: "absolute", left: 70, right: 70, top: 170 }}>
    {kicker && <Kicker style={{ marginBottom: 20 }}>{kicker}</Kicker>}
    <Headline size={size}>{children}</Headline>
  </div>
);
const Scaled: React.FC<{ s: number; top: number; w: number; children: ReactNode }> = ({ s, top, w, children }) => (
  <div style={{ position: "absolute", top, left: (1080 - w * s) / 2, scale: String(s), transformOrigin: "0 0" }}>{children}</div>
);
const Points: React.FC<{ items: string[]; delay: number; top: number }> = ({ items, delay, top }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 80, right: 80, top, display: "flex", flexDirection: "column", gap: 20 }}>
      {items.map((t, i) => (
        <div key={t} style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 38, fontWeight: 700, opacity: fade(f, delay + i * 14) }}>
          <span style={{ width: 30, height: 12, borderRadius: 6, background: C.acc, flex: "none" }} />
          {t}
        </div>
      ))}
    </div>
  );
};

const Hook = () => (
  <Bg style={{ justifyContent: "center", padding: "0 80px" }}>
    <Headline size={112}>Your AI agent needs your API keys.</Headline>
    <Sequence from={48} layout="none">
      <Headline size={112} style={{ marginTop: 40 }}>
        It should never <Redact text="see" at={36} dots="•••" /> them.
      </Headline>
    </Sequence>
  </Bg>
);

const Intro = () => {
  const f = useCurrentFrame();
  return (
    <Bg glow={1.4} style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <Mark size={230} style={{ scale: String(interpolate(f, [0, 16], [0.7, 1], { ...clamp, easing: springy })), opacity: fade(f, 0, 8) }} />
      <Wordmark size={140} delay={10} style={{ marginTop: 60 }} />
      <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2, marginTop: 50, padding: "0 70px", opacity: fade(f, 40) }}>
        The <Hot>AI Agent</Hot> Secret Manager
        <br />— now in Chrome.
      </div>
    </Bg>
  );
};

const AgentRun = () => (
  <Bg>
    <Top kicker="run_with_secrets">
      Agents <Hot>use</Hot> secrets.
      <br />
      They never <Hot>see</Hot> them.
    </Top>
    <Window title="claude — ~/repo/api" width={960} height={760} style={{ position: "absolute", left: 60, top: 560 }}>
      <Terminal lines={AGENT_LINES} size={25} />
    </Window>
    <Points top={1400} delay={150} items={["injected into the command's env", "redacted from what the agent reads"]} />
  </Bg>
);

const AgentLogin = () => (
  <Bg>
    <Top size={78}>
      Agents sign in.
      <br />
      <Hot>You approve.</Hot>
    </Top>
    <Window title="claude — ~/ops" width={960} height={330} style={{ position: "absolute", left: 60, top: 480 }}>
      <Terminal lines={LOGIN_LINES} size={22} />
    </Window>
    <Scaled s={0.92} top={860} w={1060}>
      <LoginBrowser />
    </Scaled>
  </Bg>
);

const HumanFill = () => (
  <Bg>
    <Top kicker="New · AutoFill" size={80}>
      Click a field.
      <br />
      <Hot>Pick an account.</Hot>
    </Top>
    <Scaled s={0.86} top={560} w={1180}>
      <FillBrowser />
    </Scaled>
    <Points top={1300} delay={140} items={["password fetched only after your click", "never shown — straight into the form", "right-click any input → Autofill"]} />
  </Bg>
);

const Toolbar = () => (
  <Bg>
    <Top kicker="Toolbar popup">
      Every secret,
      <br />
      <Hot>one click</Hot> away.
    </Top>
    <Scaled s={1.5} top={600} w={560}>
      <div style={{ position: "relative" }}>
        <Popup copied={70} copyRow={0} />
        <Cursor path={[{ f: 0, x: 500, y: 700 }, { f: 50, x: 200, y: 168 }, { f: 64, x: 200, y: 168, click: true }, { f: 150, x: 260, y: 260 }]} />
      </div>
    </Scaled>
  </Bg>
);

const End = () => {
  const f = useCurrentFrame();
  return (
    <Bg glow={1.5} style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <Mark size={200} />
      <Wordmark size={130} delay={4} style={{ marginTop: 50 }} />
      <div style={{ fontSize: 54, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2, marginTop: 50, padding: "0 70px", opacity: fade(f, 30) }}>
        Agents <Hot>use</Hot> your secrets.
        <br />
        They never <Hot>see</Hot> them.
      </div>
      <div
        style={{
          marginTop: 70,
          padding: "26px 50px",
          borderRadius: 18,
          background: C.acc,
          color: C.bg,
          fontSize: 46,
          fontWeight: 800,
          opacity: fade(f, 42),
          scale: String(interpolate(f, [42, 58], [0.85, 1], { ...clamp, easing: springy })),
          boxShadow: "0 20px 60px rgba(255,77,77,.4)",
        }}
      >
        Add to Chrome — free
      </div>
      <div style={{ fontFamily: mono, fontSize: 32, color: C.mut, marginTop: 40, opacity: fade(f, 54) }}>{SITE}</div>
    </Bg>
  );
};

export const SHORTS: Scene[] = [
  { C: Hook, len: 140 },
  { C: Intro, len: 110 },
  { C: AgentRun, len: 260 },
  { C: AgentLogin, len: 290 },
  { C: HumanFill, len: 280 },
  { C: Toolbar, len: 170 },
  { C: End, len: 150 },
];
