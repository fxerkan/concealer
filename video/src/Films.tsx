import { Audio } from "@remotion/media";
import { fade as fadeT } from "@remotion/transitions/fade";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { Fragment } from "react";
import { interpolate } from "remotion";
import { clamp, img } from "./brand";
import * as S from "./scenes";
import { SHORTS } from "./Shorts";

// Two cuts from one scene library: a short Chrome Web Store film (agents first, AutoFill second)
// and a longer YouTube tour. Scenes cross-fade over a single music bed.
const T = 12;
const total = (xs: { len: number }[]) => xs.reduce((a, s) => a + s.len, 0) - T * (xs.length - 1);

const Film: React.FC<{ scenes: { C: React.FC; len: number }[] }> = ({ scenes }) => {
  const n = total(scenes);
  return (
    <>
      <TransitionSeries>
        {scenes.map((s, i) => (
          <Fragment key={i}>
            {i > 0 && <TransitionSeries.Transition presentation={fadeT()} timing={linearTiming({ durationInFrames: T })} />}
            <TransitionSeries.Sequence durationInFrames={s.len}>
              <s.C />
            </TransitionSeries.Sequence>
          </Fragment>
        ))}
      </TransitionSeries>
      {/* one original track (scripts/music.mjs), 125 s: longer than every cut, so it never loops or doubles up */}
      <Audio src={img("music/concealer-bed.mp3")} volume={(f) => interpolate(f, [0, 20, n - 45, n], [0, 0.6, 0.6, 0], clamp)} />
    </>
  );
};

const STORE = [S.HOOK, S.INTRO_STORE, S.AGENT_RUN, S.AGENT_LOGIN, S.HUMAN_FILL, S.TOOLBAR, S.END_STORE];
const YT = [
  S.COLD, S.PROBLEM, S.INTRO_YT, S.PILLARS, S.INTERFACES, S.SECRETS,
  S.INSTALL, S.AGENT_RUN, S.GUARD, S.AUDIT, S.AGENT_LOGIN, S.HUMAN_FILL, S.TOOLBAR,
  S.SECURITY, S.RISKS, S.EVERYWHERE, S.GETIT, S.END_YT,
];
export const SHORTS_FRAMES = total(SHORTS);
export const STORE_FRAMES = total(STORE);
export const YT_FRAMES = total(YT);
export const StoreFilm = () => <Film scenes={STORE} />;
export const YouTubeFilm = () => <Film scenes={YT} />;
export const ShortsFilm = () => <Film scenes={SHORTS} />;
