import { Audio } from "@remotion/media";
import type { ReactNode } from "react";
import { Img, interpolate, Sequence, useCurrentFrame } from "remotion";
import { Bg, C, Chip, clamp, easeOut, fade, Headline, Hot, img, Kicker, Mark, mono, Redact, SITE, springy, typed, Wordmark } from "./brand";
import { ApprovalBanner, Browser, Cursor, FillMenu, Line, Popup, Shot, SignInPage, Terminal, Window } from "./ui";

// Every scene is a 1920×1080 stage with a fixed length (frames @30fps), so both films can reuse them.
type Scene = { C: React.FC; len: number };
const whoosh = <Audio src={img("sfx/whoosh.wav")} volume={0.25} />;

const Bullets: React.FC<{ items: ReactNode[]; delay: number; gap?: number; size?: number }> = ({ items, delay, gap = 14, size = 30 }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 40 }}>
      {items.map((it, i) => {
        const p = fade(f, delay + i * gap);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, fontSize: size, fontWeight: 600, color: C.txt, opacity: p, translate: `${(1 - p) * -20}px 0` }}>
            <span style={{ width: 26, height: 10, borderRadius: 5, background: C.acc, flex: "none" }} />
            {it}
          </div>
        );
      })}
    </div>
  );
};

// ── hooks ────────────────────────────────────────────────────────────────────────────────────────────────────
const Hook = () => (
  <Bg style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
    <Headline size={104}>Your AI agent needs your API keys.</Headline>
    <Sequence from={48} layout="none">
      <Headline size={104} style={{ marginTop: 18 }}>
        It should never <Redact text="see" at={36} dots="•••" /> them.
      </Headline>
    </Sequence>
  </Bg>
);
export const HOOK: Scene = { C: Hook, len: 140 };

const ColdOpen = () => {
  const f = useCurrentFrame();
  const msg = "Here's my Stripe key, can you fix the webhook?";
  const key = "sk_live_DUMMY_51HxQe7Lz0aR9vKp2";
  return (
    <Bg style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: 1100 }}>
        <div style={{ fontFamily: mono, fontSize: 22, color: C.mut, marginBottom: 16, opacity: fade(f, 0) }}>you → AI assistant</div>
        <div style={{ background: C.panel2, border: `1px solid ${C.line2}`, borderRadius: 24, padding: "30px 36px", fontSize: 40, fontWeight: 600, lineHeight: 1.4, opacity: fade(f, 0) }}>
          {typed(msg, f, 6, 1.6)}
          <br />
          <span style={{ fontFamily: mono, fontSize: 36, color: C.warn }}>{f < 44 ? "" : <Redact text={typed(key, f, 44, 1.6)} at={120} />}</span>
        </div>
        <Sequence from={80} layout="none">
          <Headline size={72} style={{ marginTop: 60, textAlign: "center" }}>
            We've all done this <Hot>at least once.</Hot>
          </Headline>
        </Sequence>
      </div>
    </Bg>
  );
};
export const COLD: Scene = { C: ColdOpen, len: 180 };

const Problem = () => {
  const f = useCurrentFrame();
  const cards: [string, string, string][] = [
    [".env", "Read by your agent,", "sent to a model provider."],
    ["logs", "Captured in logs", "and tool telemetry."],
    ["git", "Committed by accident,", "pushed for good."],
  ];
  return (
    <Bg style={{ padding: "150px 160px" }}>
      <Headline size={84}>
        Your agent reads your files.
        <br />
        <Hot>Including the secrets.</Hot>
      </Headline>
      <div style={{ display: "flex", gap: 36, marginTop: 90 }}>
        {cards.map(([k, a, b], i) => {
          const p = interpolate(f, [30 + i * 14, 48 + i * 14], [0, 1], { ...clamp, easing: easeOut });
          return (
            <div key={k} style={{ flex: 1, background: C.panel, border: `1px solid ${C.line2}`, borderRadius: 22, padding: 36, opacity: p, translate: `0 ${(1 - p) * 40}px` }}>
              <div style={{ fontFamily: mono, fontSize: 44, fontWeight: 700, color: C.acc, marginBottom: 18 }}>{k}</div>
              <div style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.35 }}>
                {a}
                <br />
                <span style={{ color: C.mut }}>{b}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Bg>
  );
};
export const PROBLEM: Scene = { C: Problem, len: 210 };

// ── brand ────────────────────────────────────────────────────────────────────────────────────────────────────
const introOf = (line: ReactNode, chips: string[]) => () => {
  const f = useCurrentFrame();
  return (
    <Bg glow={1.4} style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <Sequence from={0} layout="none">{whoosh}</Sequence>
      <Mark size={190} style={{ scale: String(interpolate(f, [0, 16], [0.7, 1], { ...clamp, easing: springy })), opacity: fade(f, 0, 8) }} />
      <Wordmark size={150} delay={10} style={{ marginTop: 44 }} />
      <div style={{ fontSize: 46, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 34, opacity: fade(f, 40) }}>{line}</div>
      <div style={{ display: "flex", gap: 14, marginTop: 34 }}>
        {chips.map((c, i) => (
          <div key={c} style={{ fontFamily: mono, fontSize: 24, padding: "10px 20px", borderRadius: 999, border: `1px solid ${C.line2}`, background: C.panel, color: C.txt, opacity: fade(f, 56 + i * 6) }}>
            {c}
          </div>
        ))}
      </div>
    </Bg>
  );
};
export const INTRO_STORE: Scene = {
  C: introOf(
    <>
      The <Hot>AI Agent</Hot> Secret Manager — now in Chrome.
    </>,
    ["MCP for AI agents", "Agentic sign-in", "AutoFill", "One-click copy"],
  ),
  len: 120,
};
export const INTRO_YT: Scene = {
  C: introOf(
    <>
      The local-only <Hot>AI Secret Manager</Hot> for the AI-coding era.
    </>,
    ["CLI", "Web UI", "MCP", "TUI", "Chrome", "Mobile"],
  ),
  len: 140,
};

const Pillars = () => {
  const f = useCurrentFrame();
  const words = ["Local-only.", "No cloud.", "No account.", "No telemetry."];
  return (
    <Bg style={{ justifyContent: "center", padding: "0 180px" }}>
      {words.map((w, i) => {
        const p = interpolate(f, [i * 16, i * 16 + 14], [0, 1], { ...clamp, easing: springy });
        return (
          <div key={w} style={{ fontSize: 124, fontWeight: 800, letterSpacing: "-0.045em", lineHeight: 1.06, opacity: Math.min(1, p), translate: `0 ${(1 - p) * 60}px`, color: i === 0 ? C.acc : C.txt }}>
            {w}
          </div>
        );
      })}
      <div style={{ fontFamily: mono, fontSize: 28, color: C.mut, marginTop: 34, opacity: fade(f, 80) }}>your vault is an encrypted file on your disk — firewall it, nothing phones home.</div>
    </Bg>
  );
};
export const PILLARS: Scene = { C: Pillars, len: 160 };

const Interfaces = () => {
  const f = useCurrentFrame();
  const items: [string, string][] = [
    ["CLI", "cer get --name STRIPE_KEY"],
    ["Web UI", "cer web → 127.0.0.1:8787"],
    ["MCP", "for Claude Code, Cursor, Codex…"],
    ["TUI", "cer tui"],
    ["Chrome", "copy · AutoFill · agent sign-in"],
    ["Mobile", "iOS & Android companion"],
  ];
  return (
    <Bg style={{ padding: "130px 160px" }}>
      <Headline size={84}>
        One vault. <Hot>Every interface.</Hot>
      </Headline>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28, marginTop: 70 }}>
        {items.map(([n, d], i) => {
          const p = interpolate(f, [20 + i * 7, 36 + i * 7], [0, 1], { ...clamp, easing: easeOut });
          return (
            <div key={n} style={{ background: C.panel, border: `1px solid ${C.line2}`, borderRadius: 22, padding: "34px 36px", opacity: p, scale: String(0.94 + 0.06 * p) }}>
              <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-0.03em" }}>{n}</div>
              <div style={{ fontFamily: mono, fontSize: 23, color: C.mut, marginTop: 10 }}>{d}</div>
            </div>
          );
        })}
      </div>
    </Bg>
  );
};
export const INTERFACES: Scene = { C: Interfaces, len: 180 };

const Secrets = () => {
  const f = useCurrentFrame();
  return (
    <Bg style={{ padding: "110px 0 0 130px" }}>
      <div style={{ width: 640 }}>
        <Kicker>Web UI</Kicker>
        <Headline size={76} style={{ marginTop: 18 }}>
          Typed. Scoped. <Hot>Searchable.</Hot>
        </Headline>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 28, marginTop: 40, opacity: fade(f, 24) }}>
          {["api_key", "database", "token", "login", "website"].map((t) => (
            <Chip key={t} type={t} />
          ))}
        </div>
        <Bullets
          delay={40}
          size={28}
          items={["tenant / project / environment / repo", "same name, many repos — never ambiguous", "fields masked unless you say otherwise"]}
        />
      </div>
      <Shot src="shots/app-secrets.png" width={1180} ratio={3570 / 2380} style={{ position: "absolute", left: 830, top: 170 }} origin="0 0" to={1.12} />
    </Bg>
  );
};
export const SECRETS: Scene = { C: Secrets, len: 240 };

// ── AI agents ────────────────────────────────────────────────────────────────────────────────────────────────
const Install = () => {
  const lines: Line[] = [
    { t: 6, text: "$ cer agent install", type: true, bold: true },
    { t: 40, text: "detected: Claude Code · Cursor · Codex · Gemini CLI · Windsurf · Claude Desktop", color: C.mut },
    { t: 62, text: "✓ claude-code     token registered · MCP config written", color: C.ok },
    { t: 72, text: "✓ cursor          token registered · MCP config written", color: C.ok },
    { t: 82, text: "✓ codex           token registered · MCP config written", color: C.ok },
    { t: 92, text: "✓ gemini-cli      token registered · MCP config written", color: C.ok },
    { t: 120, text: "tools: list_secrets · search_secrets · run_with_secrets · set_secret · request_web_login", color: C.acc },
  ];
  return (
    <Bg style={{ padding: "120px 160px" }}>
      <Kicker>MCP server</Kicker>
      <Headline size={80} style={{ marginTop: 18 }}>
        Wire up every agent in <Hot>one command.</Hot>
      </Headline>
      <Window title="zsh — ~/projects" width={1600} height={520} style={{ marginTop: 60 }}>
        <Terminal lines={lines} size={27} />
      </Window>
    </Bg>
  );
};
export const INSTALL: Scene = { C: Install, len: 200 };

const AGENT_LINES: Line[] = [
  { t: 8, text: "> Run the migration on prod and check the Stripe webhooks", type: true, bold: true },
  { t: 74, text: "⏺ concealer · run_with_secrets", color: C.acc, bold: true },
  { t: 82, text: "  names:   [DATABASE_URL, STRIPE_KEY]", color: C.mut },
  { t: 88, text: "  command: ./migrate.sh && stripe webhooks list", color: C.mut },
  { t: 118, text: "  ⎿ postgres://app:***REDACTED***@db.internal/prod" },
  { t: 132, text: "  ⎿ 14 migrations applied ✓", color: C.ok },
  { t: 146, text: "  ⎿ STRIPE_KEY=***REDACTED*** · 3 webhooks active" },
  { t: 186, text: "⏺ Done. Migration applied, all 3 webhooks healthy." },
];
const AgentRun = () => (
  <Bg style={{ padding: "110px 0 0 120px" }}>
    <div style={{ width: 620 }}>
      <Kicker>run_with_secrets</Kicker>
      <Headline size={66} style={{ marginTop: 18 }}>
        Agents <Hot>use</Hot> secrets.
        <br />
        They never <Hot>see</Hot> them.
      </Headline>
      <Bullets delay={110} items={["injected into the command's env", "redacted from everything it reads", "least-privilege: only the names it asks for"]} size={27} />
    </div>
    <Window title="claude — ~/repo/api" width={1090} height={720} style={{ position: "absolute", left: 760, top: 190 }}>
      <Terminal lines={AGENT_LINES} size={24} />
    </Window>
  </Bg>
);
export const AGENT_RUN: Scene = { C: AgentRun, len: 270 };

const Guard = () => {
  const f = useCurrentFrame();
  const n = Math.min(25, Math.max(0, Math.floor((f - 30) / 3)));
  const blocked = f >= 30 + 26 * 3;
  return (
    <Bg style={{ padding: "130px 160px" }}>
      <Kicker>Anti-exfiltration</Kicker>
      <Headline size={80} style={{ marginTop: 18 }}>
        A prompt-injected agent <Hot>can't dump your vault.</Hot>
      </Headline>
      <div style={{ display: "flex", gap: 60, marginTop: 80, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: mono, fontSize: 26, color: C.mut, marginBottom: 18 }}>names revealed this hour · {n}/25</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(25, 1fr)", gap: 6 }}>
            {Array.from({ length: 25 }, (_, i) => (
              <div key={i} style={{ height: 70, borderRadius: 6, background: i < n ? (blocked ? C.acc : C.warn) : C.panel2, border: `1px solid ${C.line2}` }} />
            ))}
          </div>
          <div style={{ marginTop: 34, fontSize: 40, fontWeight: 800, color: C.acc, opacity: blocked ? fade(f, 30 + 26 * 3) : 0 }}>⛔ quota reached — blocked & audited</div>
        </div>
        <div style={{ width: 560 }}>
          <Bullets delay={20} size={27} items={["registered agents only — anything else is denied", "10 rows per call · 25 names per hour", "limits per agent, in Settings", "revoke any agent's token instantly"]} />
        </div>
      </div>
    </Bg>
  );
};
export const GUARD: Scene = { C: Guard, len: 200 };

const Audit = () => (
  <Bg style={{ padding: "110px 0 0 130px" }}>
    <div style={{ width: 620 }}>
      <Kicker>Audit log</Kicker>
      <Headline size={74} style={{ marginTop: 18 }}>
        Every access, in a <Hot>tamper-evident</Hot> chain.
      </Headline>
      <Bullets delay={30} size={27} items={["who: agent, CLI, web, extension", "HMAC-signed, sequence-numbered", "deleting a line breaks the chain"]} />
    </div>
    <Shot src="shots/app-audit-logs.png" width={1150} ratio={3346 / 2156} style={{ position: "absolute", left: 840, top: 180 }} origin="0 0" to={1.14} />
  </Bg>
);
export const AUDIT: Scene = { C: Audit, len: 180 };

// ── browser: agent sign-in (request_web_login) ────────────────────────────────────────────────────────────────
const LOGIN_LINES: Line[] = [
  { t: 6, text: "> Log in to the Northwind console and check last night's deploy", type: true, bold: true },
  { t: 70, text: "⏺ concealer · request_web_login", color: C.acc, bold: true },
  { t: 76, text: "  target_url: console.northwind.cloud", color: C.mut },
  { t: 84, text: "  ⎿ waiting for your approval…", color: C.mut },
  { t: 196, text: "  ⎿ filled", color: C.ok, bold: true },
  { t: 214, text: "⏺ Signed in. Reading the deploy log…" },
];
const AgentLogin = () => (
  <Bg style={{ padding: "70px 0 0 90px" }}>
    <Headline size={60}>
      Agents sign in. <Hot>You approve.</Hot> The password stays hidden.
    </Headline>
    <Window title="claude — ~/ops" width={700} height={620} style={{ position: "absolute", left: 90, top: 230 }}>
      <Terminal lines={LOGIN_LINES} size={21} />
    </Window>
    <Browser url="console.northwind.cloud/signin" width={1060} height={820} style={{ position: "absolute", left: 820, top: 190 }}>
      <SignInPage fills={[{ at: 166, value: "nw-prod" }, { at: 172, value: "deploy-bot" }, { at: 180, value: "x", secret: true }]} done={196} />
      <Sequence from={96} durationInFrames={62} layout="none">
        <Audio src={img("sfx/ding.wav")} volume={0.25} />
        <ApprovalBanner agent="claude-code" domain="northwind.cloud" secret="NW_PROD_LOGIN" user="deploy-bot" pressed={50} />
      </Sequence>
      <Cursor path={[{ f: 0, x: 900, y: 700 }, { f: 110, x: 900, y: 700 }, { f: 140, x: 512, y: 194 }, { f: 146, x: 512, y: 194, click: true }, { f: 200, x: 640, y: 300 }]} />
    </Browser>
  </Bg>
);
export const AGENT_LOGIN: Scene = { C: AgentLogin, len: 290 };

// ── browser: the human AutoFill menu ─────────────────────────────────────────────────────────────────────────
const HumanFill = () => {
  const f = useCurrentFrame();
  return (
    <Bg style={{ padding: "70px 0 0 90px" }}>
      <Kicker>New in 1.2</Kicker>
      <Headline size={64} style={{ marginTop: 14 }}>
        <Hot>AutoFill.</Hot> Click a field, pick an account.
      </Headline>
      <Browser url="console.northwind.cloud/signin" width={1180} height={800} style={{ position: "absolute", left: 90, top: 250 }}>
        <SignInPage fills={[{ at: 104, value: "nw-staging" }, { at: 110, value: "ops-admin" }, { at: 118, value: "x", secret: true }]} focus={1} focusAt={40} done={134} />
        <Sequence from={46} durationInFrames={54} layout="none">
          <FillMenu
            rows={[
              ["NW_STAGING_LOGIN", "account nw-staging · ops-admin"],
              ["NW_PROD_LOGIN", "account nw-prod · deploy-bot"],
            ]}
            hover={0}
            hoverAt={30}
            style={{ left: 344, top: 404 }}
          />
        </Sequence>
        <Cursor path={[{ f: 0, x: 900, y: 650 }, { f: 30, x: 600, y: 376 }, { f: 40, x: 600, y: 376, click: true }, { f: 80, x: 560, y: 490 }, { f: 96, x: 560, y: 490, click: true }, { f: 150, x: 860, y: 640 }]} />
      </Browser>
      <div style={{ position: "absolute", left: 1330, top: 290, width: 520 }}>
        <Bullets
          delay={140}
          gap={16}
          size={27}
          items={[
            "password fetched only after your click",
            "goes straight into the form — never shown",
            "right-click any input → Autofill with concealer",
            "multi-step sign-ins: the password follows to the next page",
            "several accounts? the one on the page comes first",
          ]}
        />
        <div style={{ marginTop: 30, fontFamily: mono, fontSize: 22, color: C.mut, opacity: fade(f, 230) }}>locked vault? the menu offers to unlock it.</div>
      </div>
    </Bg>
  );
};
export const HUMAN_FILL: Scene = { C: HumanFill, len: 290 };

const Toolbar = () => (
  <Bg style={{ padding: "150px 0 0 150px" }}>
    <div style={{ width: 760 }}>
      <Kicker>Toolbar popup</Kicker>
      <Headline size={80} style={{ marginTop: 18 }}>
        Every secret, <Hot>one click</Hot> away.
      </Headline>
      <Bullets delay={30} items={["clipboard clears itself", "popup auto-locks on its own timer", "talks only to 127.0.0.1 — nothing leaves your machine", "type cer ⇥ in the address bar for the full web UI"]} size={29} />
    </div>
    <div style={{ position: "absolute", left: 1150, top: 140 }}>
      <Popup copied={70} copyRow={0} />
      <Cursor path={[{ f: 0, x: 500, y: 700 }, { f: 50, x: 200, y: 168 }, { f: 64, x: 200, y: 168, click: true }, { f: 150, x: 260, y: 260 }]} />
    </div>
  </Bg>
);
export const TOOLBAR: Scene = { C: Toolbar, len: 190 };

// ── trust ────────────────────────────────────────────────────────────────────────────────────────────────────
const Security = () => {
  const f = useCurrentFrame();
  const items: [string, string][] = [
    ["AES-256-GCM per value", "battle-tested open-source encryption — no home-grown crypto"],
    ["Key never on disk in the clear", "unlocked into memory by password or a revocable token"],
    ["Recovery codes", "and a 2nd factor before the master password can change"],
    ["Idle auto-lock", "web, popup and server sessions all expire"],
    ["Plain, inspectable file", "commit the encrypted vault, decrypt it on any machine"],
    ["Open source, MIT", "one readable script you can audit yourself"],
  ];
  return (
    <Bg style={{ padding: "120px 160px" }}>
      <Kicker>Security</Kicker>
      <Headline size={80} style={{ marginTop: 18 }}>
        Boring crypto. <Hot>On purpose.</Hot>
      </Headline>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 60 }}>
        {items.map(([a, b], i) => {
          const p = interpolate(f, [20 + i * 8, 36 + i * 8], [0, 1], { ...clamp, easing: easeOut });
          return (
            <div key={a} style={{ display: "flex", gap: 22, alignItems: "flex-start", background: C.panel, border: `1px solid ${C.line2}`, borderRadius: 18, padding: "24px 28px", opacity: p, translate: `0 ${(1 - p) * 24}px` }}>
              <div style={{ width: 12, height: 52, borderRadius: 6, background: C.acc, flex: "none" }} />
              <div>
                <div style={{ fontSize: 31, fontWeight: 800 }}>{a}</div>
                <div style={{ fontSize: 23, color: C.mut, marginTop: 4 }}>{b}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Bg>
  );
};
export const SECURITY: Scene = { C: Security, len: 230 };

const Risks = () => (
  <Bg style={{ padding: "110px 0 0 130px" }}>
    <div style={{ width: 620 }}>
      <Kicker>Risks</Kicker>
      <Headline size={74} style={{ marginTop: 18 }}>
        Finds the secrets <Hot>you forgot about.</Hot>
      </Headline>
      <Bullets delay={30} size={27} items={["plaintext keys in your folders", "tokens in shell history", "one value reused everywhere", "secrets in git history — import them in one go"]} />
    </div>
    <Shot src="shots/app-risks.png" width={1150} ratio={3124 / 1730} style={{ position: "absolute", left: 840, top: 230 }} origin="0 0" to={1.12} />
  </Bg>
);
export const RISKS: Scene = { C: Risks, len: 190 };

const Everywhere = () => {
  const f = useCurrentFrame();
  return (
    <Bg style={{ padding: "100px 130px" }}>
      <Headline size={76}>
        Your machines, in sync. <Hot>Your phone, too.</Hot>
      </Headline>
      <div style={{ fontSize: 30, color: C.mut, marginTop: 20, opacity: fade(f, 20) }}>Encrypted machine-to-machine sync over SSH · macOS · Linux · Windows · iOS · Android</div>
      <div style={{ marginTop: 50, borderRadius: 24, overflow: "hidden", border: `1px solid ${C.line2}`, boxShadow: "0 40px 100px rgba(0,0,0,.6)", opacity: fade(f, 10) }}>
        <Img src={img("shots/mobile-creative.png")} style={{ width: "100%", display: "block", scale: String(interpolate(f, [0, 200], [1.02, 1.08], clamp)) }} />
      </div>
    </Bg>
  );
};
export const EVERYWHERE: Scene = { C: Everywhere, len: 200 };

const GetIt = () => {
  const lines: Line[] = [
    { t: 6, text: "# macOS / Linux", color: C.mut },
    { t: 10, text: "$ brew install fxerkan/tap/concealer", type: true, bold: true },
    { t: 50, text: "# Windows", color: C.mut },
    { t: 54, text: "$ scoop install fxerkan/concealer", type: true, bold: true },
    { t: 90, text: "# anywhere with Python", color: C.mut },
    { t: 94, text: "$ pipx install concealer", type: true, bold: true },
    { t: 130, text: "$ cer init && cer agent install", type: true, bold: true, color: C.acc },
  ];
  return (
    <Bg style={{ padding: "130px 160px" }}>
      <Headline size={84}>
        Free. Open source. <Hot>Ten seconds</Hot> to install.
      </Headline>
      <Window title="zsh" width={1600} height={560} style={{ marginTop: 60 }}>
        <Terminal lines={lines} size={30} />
      </Window>
    </Bg>
  );
};
export const GETIT: Scene = { C: GetIt, len: 200 };

const endOf = (cta: string) => () => {
  const f = useCurrentFrame();
  return (
    <Bg glow={1.5} style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
        <Mark size={150} />
        <Wordmark size={130} delay={4} />
      </div>
      <div style={{ fontSize: 46, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 40, opacity: fade(f, 30) }}>
        Agents <Hot>use</Hot> your secrets. They never <Hot>see</Hot> them.
      </div>
      <div
        style={{
          marginTop: 54,
          padding: "20px 44px",
          borderRadius: 16,
          background: C.acc,
          color: C.bg,
          fontSize: 38,
          fontWeight: 800,
          opacity: fade(f, 42),
          scale: String(interpolate(f, [42, 58], [0.85, 1], { ...clamp, easing: springy })),
          boxShadow: "0 20px 60px rgba(255,77,77,.4)",
        }}
      >
        {cta}
      </div>
      <div style={{ fontFamily: mono, fontSize: 28, color: C.mut, marginTop: 34, opacity: fade(f, 54), letterSpacing: "0.04em" }}>{SITE} · github.com/fxerkan/concealer</div>
    </Bg>
  );
};
export const END_STORE: Scene = { C: endOf("Add to Chrome — free"), len: 150 };
export const END_YT: Scene = { C: endOf("brew install fxerkan/tap/concealer"), len: 180 };
