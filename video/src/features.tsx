import { Audio } from "@remotion/media";
import type { ReactNode } from "react";
import { Img, interpolate, Sequence, useCurrentFrame } from "remotion";
import { Bg, C, clamp, easeOut, fade, Headline, Hot, img, Kicker, Mark, mono, sans, springy, typed, Wordmark } from "./brand";
import * as S from "./scenes";
import { Browser, brandSpan, Cursor, Line, Shot, Terminal, Window } from "./ui";

// One short film per interface (extension, CLI, web UI, TUI, MCP, mobile): a title card, the 3–4 things
// that interface does best (real screenshots / real command output where possible), an install card.
type Scene = { C: React.FC; len: number };
const whoosh = <Audio src={img("sfx/whoosh.wav")} volume={0.25} />;

const Points: React.FC<{ items: ReactNode[]; delay?: number; size?: number }> = ({ items, delay = 24, size = 28 }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 40 }}>
      {items.map((it, i) => {
        const p = fade(f, delay + i * 12);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, fontSize: size, fontWeight: 600, opacity: p, translate: `${(1 - p) * -20}px 0` }}>
            <span style={{ width: 26, height: 10, borderRadius: 5, background: C.acc, flex: "none" }} />
            {it}
          </div>
        );
      })}
    </div>
  );
};

const title = (name: string, line: ReactNode, chips: string[]): Scene => ({
  len: 120,
  C: () => {
    const f = useCurrentFrame();
    return (
      <Bg glow={1.4} style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <Sequence from={0} layout="none">{whoosh}</Sequence>
        <div style={{ display: "flex", alignItems: "center", gap: 34, scale: String(interpolate(f, [0, 16], [0.85, 1], { ...clamp, easing: springy })), opacity: fade(f, 0, 8) }}>
          <Mark size={120} />
          <Wordmark size={110} delay={6} />
        </div>
        <div style={{ marginTop: 34, fontFamily: mono, fontSize: 40, fontWeight: 800, color: C.bg, background: C.acc, borderRadius: 12, padding: "8px 26px", opacity: fade(f, 18) }}>{name}</div>
        <div style={{ fontSize: 50, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 36, opacity: fade(f, 34) }}>{line}</div>
        <div style={{ display: "flex", gap: 14, marginTop: 34 }}>
          {chips.map((c, i) => (
            <div key={c} style={{ fontFamily: mono, fontSize: 24, padding: "10px 20px", borderRadius: 999, border: `1px solid ${C.line2}`, background: C.panel, opacity: fade(f, 50 + i * 6) }}>
              {c}
            </div>
          ))}
        </div>
      </Bg>
    );
  },
});

/** text left, real screenshot right */
const shot = (kicker: string, head: ReactNode, points: ReactNode[], src: string, ratio: number, opts: { len?: number; title?: string; width?: number; top?: number; from?: number; to?: number; origin?: string } = {}): Scene => ({
  len: opts.len ?? 210,
  C: () => (
    <Bg style={{ padding: "110px 0 0 120px" }}>
      <div style={{ width: 640 }}>
        <Kicker>{kicker}</Kicker>
        <Headline size={64} style={{ marginTop: 18 }}>{head}</Headline>
        <Points items={points} size={26} />
      </div>
      <Shot src={src} width={opts.width ?? 1120} ratio={ratio} title={opts.title} style={{ position: "absolute", left: 800, top: opts.top ?? 200 }} origin={opts.origin ?? "0 0"} from={opts.from ?? 1} to={opts.to ?? 1.1} />
    </Bg>
  ),
});

/** headline over a terminal running real commands */
const term = (kicker: string, head: ReactNode, lines: Line[], len = 220, size = 26): Scene => ({
  len,
  C: () => (
    <Bg style={{ padding: "100px 150px" }}>
      <Kicker>{kicker}</Kicker>
      <Headline size={70} style={{ marginTop: 16 }}>{head}</Headline>
      <Window title="zsh — ~/projects/shop" width={1620} height={600} style={{ marginTop: 50 }}>
        <Terminal lines={lines} size={size} />
      </Window>
    </Bg>
  ),
});

const end = (cta: string, line: ReactNode): Scene => ({
  len: 150,
  C: () => {
    const f = useCurrentFrame();
    return (
      <Bg glow={1.5} style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <Mark size={140} />
          <Wordmark size={120} delay={4} />
        </div>
        <div style={{ fontSize: 46, fontWeight: 700, marginTop: 40, opacity: fade(f, 26) }}>{line}</div>
        <div style={{ marginTop: 50, padding: "20px 44px", borderRadius: 16, background: C.acc, color: C.bg, fontFamily: mono, fontSize: 36, fontWeight: 800, opacity: fade(f, 40), scale: String(interpolate(f, [40, 56], [0.85, 1], { ...clamp, easing: springy })) }}>
          {cta}
        </div>
        <div style={{ fontFamily: mono, fontSize: 26, color: C.mut, marginTop: 34, opacity: fade(f, 52) }}>concealer.fxerkan.com · github.com/fxerkan/concealer</div>
      </Bg>
    );
  },
});

// ── Chrome extension ───────────────────────────────────────────────────────────────────────────────────
const SaveScene = () => {
  const f = useCurrentFrame();
  const pop = interpolate(f, [40, 56], [0, 1], { ...clamp, easing: easeOut });
  return (
    <Bg style={{ padding: "70px 0 0 90px" }}>
      <Kicker>New · save sign-ins</Kicker>
      <Headline size={62} style={{ marginTop: 14 }}>
        Sign in once. <Hot>concealer offers to keep it.</Hot>
      </Headline>
      <Browser url="console.northwind.cloud" width={1140} height={640} style={{ position: "absolute", left: 90, top: 260 }}>
        <Img src={img("shots/ext-save-page.png")} style={{ width: "100%", display: "block" }} />
      </Browser>
      <Img src={img("shots/ext-save-prompt.png")} style={{ position: "absolute", left: 980, top: 300, width: 420, borderRadius: 16, boxShadow: "0 40px 100px rgba(0,0,0,.6)", opacity: pop, scale: String(0.9 + 0.1 * pop) }} />
      <div style={{ position: "absolute", left: 1440, top: 290, width: 420 }}>
        <Points delay={70} size={25} items={["asks after a successful sign-in", "password changed? it offers an update", "extra fields come along: account ID, region…", "vault locked? saved anyway — merged at the next unlock"]} />
      </div>
    </Bg>
  );
};
const EXT = [
  title("Chrome extension", <>Your vault, <Hot>right where you sign in.</Hot></>, ["AutoFill", "Save sign-ins", "Touch ID unlock", "One-click copy"]),
  S.HUMAN_FILL,
  { C: SaveScene, len: 250 },
  shot("New · passkey unlock", <>Unlock with <Hot>Touch ID.</Hot></>, ["passkeys: Touch ID, Windows Hello, a security key", "👆 in the popup opens the vault", "the master password keeps working"], "shots/web-passkey-unlock.png", 1512 / 810, { title: "concealer · localhost", from: 1.7, to: 1.85, origin: "50% 52%" }),
  S.TOOLBAR,
  end("Add to Chrome — free", <>AutoFill, save and copy — <Hot>nothing leaves your machine.</Hot></>),
];

// ── CLI (real output from a throwaway vault) ───────────────────────────────────────────────────────────
const CLI = [
  title("CLI", <>Every secret, <Hot>one command away.</Hot></>, ["set", "get", "run", "scan", "deploy", "sync"]),
  term("Typed & scoped", <>Same name, many environments. <Hot>Never ambiguous.</Hot></>, [
    { t: 6, text: "$ cer set --name STRIPE_KEY --project shop --env prod sk_live_…", type: true, bold: true },
    { t: 56, text: "create: STRIPE_KEY @ */shop/prod/*", color: C.ok },
    { t: 66, text: "$ cer set --name DATABASE_URL --type database --project api --env prod host=db.internal …", type: true, bold: true },
    { t: 130, text: "create: DATABASE_URL @ */api/prod/*", color: C.ok },
    { t: 140, text: "$ cer list", type: true, bold: true },
    { t: 156, text: "name            type      project   env     tags", color: C.mut },
    { t: 160, text: "DATABASE_URL    database  api       prod" },
    { t: 164, text: "STRIPE_KEY      api_key   shop      dev" },
    { t: 168, text: "STRIPE_KEY      api_key   shop      prod" },
  ]),
  term("cer run", <>Inject into the command. <Hot>Never into your shell.</Hot></>, [
    { t: 6, text: "$ cer run --project shop --env prod -- ./charge.sh", type: true, bold: true },
    { t: 60, text: "[concealer] */shop/prod/shop", color: C.mut },
    { t: 74, text: "STRIPE_KEY injected (26 chars) · charge ok ✓", color: C.ok },
    { t: 100, text: "$ cer rotate --name STRIPE_KEY --project shop --env prod", type: true, bold: true },
    { t: 160, text: "rotate: STRIPE_KEY -> sKQF…Gg", color: C.ok },
  ], 200),
  term("Find what leaked", <>Plaintext keys in your folders, <Hot>imported in one go.</Hot></>, [
    { t: 6, text: "$ cer scan . --import --project demoapp --env dev", type: true, bold: true },
    { t: 60, text: "1 candidates:", color: C.mut },
    { t: 66, text: "  OPENAI_API_KEY               sk-p…j0        <- .env", color: C.warn },
    { t: 80, text: "imported: 1, skipped (existing): 0  @ */demoapp/dev/*", color: C.ok },
    { t: 100, text: "$ cer gitscan ~/repos/api      # secrets in git history, tracked files, .gitignore gaps", type: true, bold: true },
    { t: 170, text: "$ cer audit verify", type: true, bold: true },
    { t: 196, text: "{'ok': True, 'count': 10, 'broken_at': None}", color: C.ok },
  ], 240),
  term("Ship it", <>dotenv, Docker, k8s, AWS, GitHub — <Hot>rendered on demand.</Hot></>, [
    { t: 6, text: "$ cer deploy --target dotenv --project shop --env prod > .env.prod", type: true, bold: true },
    { t: 70, text: "$ cer deploy --target k8s --project api --env prod | kubectl apply -f -", type: true, bold: true },
    { t: 140, text: "$ cer sync laptop      # encrypted two-way sync over SSH", type: true, bold: true },
  ], 200),
  end("brew install fxerkan/tap/concealer", <>One script. <Hot>No cloud, no account.</Hot></>),
];

// ── Web UI ─────────────────────────────────────────────────────────────────────────────────────────────
const WEB = [
  title("Web UI", <>The whole vault, <Hot>in your browser — local only.</Hot></>, ["127.0.0.1:8787", "search", "audit", "risks", "settings"]),
  shot("Secrets", <>Typed. Scoped. <Hot>Sortable.</Hot></>, ["sort by updated or created", "filters, columns, collections", "values masked until you reveal"], "shots/web-secrets.png", 1512 / 810, { title: "concealer · localhost:8787" }),
  shot("New · Settings", <>Every setting, <Hot>one page.</Hot></>, ["auto-lock presets", "passkeys, agents, extension, sync", "backup & portability"], "shots/web-settings.png", 1512 / 810, { title: "concealer · Settings" }),
  shot("New · passkey", <>Unlock with <Hot>Touch ID.</Hot></>, ["fingerprint, Windows Hello, security key", "one more key slot — crypto unchanged", "the master password keeps working"], "shots/web-passkey-unlock.png", 1512 / 810, { title: "concealer · localhost", from: 1.7, to: 1.85, origin: "50% 52%" }),
  shot("Audit log", <>Every access, <Hot>tamper-evident.</Hot></>, ["who: agent, CLI, web, extension", "HMAC-chained, numbered", "delete a line → the chain breaks"], "shots/app-audit-logs.png", 3346 / 2156),
  shot("Risks", <>Finds secrets <Hot>you forgot about.</Hot></>, ["plaintext keys on disk", "tokens in shell history", "reused values, known breaches"], "shots/app-risks.png", 3124 / 1730, { top: 240 }),
  end("cer web", <>Your vault, <Hot>never on someone else's server.</Hot></>),
];

// ── TUI ────────────────────────────────────────────────────────────────────────────────────────────────
const TUI = [
  title("TUI", <>The vault, <Hot>from the keyboard.</Hot></>, ["cer tui", "search", "reveal", "copy", "edit"]),
  shot("cer tui", <>Opens in <Hot>any terminal.</Hot></>, ["SSH into a server — still works", "no browser, no mouse", "macOS · Linux · Windows"], "shots/tui-splash-screen.png", 2770 / 1920, { title: "zsh — cer tui", width: 1060, top: 170 }),
  shot("Browse", <>Arrow keys, / to search, <Hot>enter to reveal.</Hot></>, ["scope & type at a glance", "copy without printing", "auto-lock like the web UI"], "shots/tui-secrets.png", 2546 / 1650, { title: "zsh — cer tui", width: 1060, top: 170 }),
  shot("Edit", <>Typed fields, <Hot>in place.</Hot></>, ["add, edit, delete records", "secret fields stay masked", "same vault as CLI, web, MCP"], "shots/tui-edit.png", 784 / 650, { title: "zsh — cer tui", width: 760, top: 160 }),
  end("cer tui", <>Keyboard-first. <Hot>Local-only.</Hot></>),
];

// ── MCP ────────────────────────────────────────────────────────────────────────────────────────────────
const MCP = [
  title("MCP server", <>Agents <Hot>use</Hot> secrets. They never <Hot>see</Hot> them.</>, ["run_with_secrets", "set_secret", "request_web_login", "audit"]),
  S.INSTALL,
  S.AGENT_RUN,
  term("set_secret", <>Agents can <Hot>store</Hot> keys — <Hot>write-only.</Hot></>, [
    { t: 6, text: "> Create a Resend API key for staging and save it", type: true, bold: true },
    { t: 70, text: "⏺ concealer · set_secret", color: C.acc, bold: true },
    { t: 78, text: "  name: RESEND_API_KEY  project: mail  environment: staging", color: C.mut },
    { t: 100, text: "  ⎿ saved · value never echoed back", color: C.ok },
    { t: 130, text: "⏺ Stored in concealer. Use run_with_secrets to call the API." },
  ], 190, 25),
  S.GUARD,
  S.AGENT_LOGIN,
  end("cer agent install", <>Claude Code · Cursor · Codex · Gemini CLI · Windsurf</>),
];

// ── Mobile ─────────────────────────────────────────────────────────────────────────────────────────────
const Phone: React.FC<{ children: ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ width: 400, height: 868, borderRadius: 64, background: "#000", padding: 14, boxShadow: "0 50px 120px rgba(0,0,0,.7), 0 0 0 2px #2a2f38", position: "absolute", ...style }}>
    <div style={{ width: "100%", height: "100%", borderRadius: 52, overflow: "hidden", position: "relative", background: C.bg }}>{children}</div>
  </div>
);
const FaceId = () => {
  const f = useCurrentFrame();
  const shots = ["m-settings", "m-faceid-prompt", "m-unlock"];
  return (
    <Bg style={{ padding: "110px 0 0 120px" }}>
      <div style={{ width: 640 }}>
        <Kicker>New · iOS & Android</Kicker>
        <Headline size={66} style={{ marginTop: 18 }}>
          Face ID & fingerprint <Hot>unlock.</Hot>
        </Headline>
        <Points delay={30} size={26} items={["password kept in the secure hardware", "released only after a match", "new face or finger enrolled → turned off", "the master password always works"]} />
      </div>
      {shots.map((s, i) => {
        const p = interpolate(f, [10 + i * 18, 30 + i * 18], [0, 1], { ...clamp, easing: easeOut });
        return (
          <Phone key={s} style={{ left: 730 + i * 370, top: 130 + (i % 2) * 40, opacity: p, translate: `0 ${(1 - p) * 60}px`, scale: "0.86" }}>
            <Img src={img(`shots/${s}.png`)} style={{ width: "100%", display: "block" }} />
          </Phone>
        );
      })}
    </Bg>
  );
};

// Android autofill: drawn from the real flow (locked "Fill with concealer" dataset → app picker → filled)
const AndroidFill = () => {
  const f = useCurrentFrame();
  const phase = f < 90 ? 0 : f < 170 ? 1 : 2;
  const field = (label: string, val: string, secret = false) => (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 17, color: "#5b6472", fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ height: 52, borderRadius: 10, border: `2px solid ${val ? "#a7d8b1" : "#c8ced7"}`, background: val ? "#f3fbf5" : "#fff", display: "flex", alignItems: "center", padding: "0 14px", fontSize: 20, fontFamily: secret ? mono : sans }}>{val}</div>
    </div>
  );
  return (
    <Bg style={{ padding: "110px 0 0 120px" }}>
      <div style={{ width: 640 }}>
        <Kicker>New · Android</Kicker>
        <Headline size={66} style={{ marginTop: 18 }}>
          Your phone's <Hot>password autofill.</Hot>
        </Headline>
        <Points delay={30} size={26} items={["every app and browser offers “Fill with concealer”", "unlock with your fingerprint, pick the sign-in", "the site's or app's own come first", "new sign-ins? Android offers to save them"]} />
      </div>
      <Phone style={{ left: 1100, top: 110 }}>
        {phase !== 1 ? (
          <div style={{ position: "absolute", inset: 0, background: "#f6f7f9", color: "#1a1d23", fontFamily: sans, padding: "90px 26px 0" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", fontWeight: 800, fontSize: 26, marginBottom: 30 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#3b6cf6,#7a4ff0)" }} />
              Northwind
            </div>
            {field("Username", phase === 2 ? typed("deploy-bot", f, 172, 2) : "")}
            {field("Password", phase === 2 && f > 178 ? "••••••••••••" : "", true)}
            <div style={{ height: 52, borderRadius: 10, background: "#3b6cf6", color: "#fff", fontWeight: 700, fontSize: 20, display: "grid", placeItems: "center" }}>Sign in</div>
            {phase === 0 && f > 34 && (
              <div style={{ position: "absolute", left: 26, right: 26, top: 238, background: "#fff", borderRadius: 12, boxShadow: "0 12px 30px rgba(0,0,0,.25)", padding: "14px 16px", display: "flex", gap: 14, alignItems: "center", fontSize: 20, opacity: fade(f, 34) }}>
                <Img src={img("shots/logo-512.png")} style={{ width: 34, height: 34, borderRadius: 8 }} />
                Fill with concealer
              </div>
            )}
            {phase === 2 && f > 190 && <div style={{ marginTop: 20, fontWeight: 700, fontSize: 18, color: "#1a7f37", opacity: fade(f, 190) }}>✓ filled by {brandSpan()}</div>}
          </div>
        ) : (
          <div style={{ position: "absolute", inset: 0, background: C.bg, padding: "80px 20px 0", fontFamily: sans }}>
            <div style={{ fontSize: 22, marginBottom: 18 }}>{brandSpan(24)}</div>
            {[["Northwind (prod)", "deploy-bot", true], ["Northwind (staging)", "ops-admin", true], ["GitHub", "octo-dev", false]].map(([n, u, m], i) => (
              <div key={String(n)} style={{ background: i === 0 && f > 140 ? C.panel2 : C.panel, border: `1px solid ${i === 0 && f > 140 ? C.acc : C.line2}`, borderRadius: 14, padding: "14px 16px", marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 19 }}>
                  {n}
                  {m && <span style={{ fontSize: 13, fontFamily: mono, color: C.ok, background: "#12301f", borderRadius: 6, padding: "2px 8px" }}>match</span>}
                </div>
                <div style={{ color: C.mut, fontSize: 15, marginTop: 4 }}>{u}</div>
              </div>
            ))}
            <div style={{ position: "absolute", bottom: 26, left: 0, right: 0, textAlign: "center", color: C.mut, fontSize: 15 }}>Tap a sign-in to fill it into Northwind</div>
          </div>
        )}
        <Cursor path={[{ f: 0, x: 250, y: 600 }, { f: 26, x: 200, y: 200 }, { f: 30, x: 200, y: 200, click: true }, { f: 60, x: 180, y: 260 }, { f: 66, x: 180, y: 260, click: true }, { f: 120, x: 180, y: 150 }, { f: 140, x: 180, y: 150, click: true }, { f: 220, x: 300, y: 600 }]} />
      </Phone>
    </Bg>
  );
};
const MOBILE = [
  title("Mobile", <>Your vault, <Hot>offline in your pocket.</Hot></>, ["iOS", "Android", "Face ID", "Autofill", "sync"]),
  { C: FaceId, len: 220 },
  { C: AndroidFill, len: 250 },
  S.EVERYWHERE,
  end("App Store · Google Play", <>Encrypted with your master password. <Hot>Always.</Hot></>),
];

const T = 12;
const total = (xs: Scene[]) => xs.reduce((a, s) => a + s.len, 0) - T * (xs.length - 1);
export const FEATURE_FILMS = { Extension: EXT, CLI, WebUI: WEB, TUI, MCP, Mobile: MOBILE };
export const featureFrames = (k: keyof typeof FEATURE_FILMS) => total(FEATURE_FILMS[k]);
