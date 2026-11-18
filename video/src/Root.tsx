import { Composition, Folder } from "remotion";
import { FEATURE_FILMS, featureFrames } from "./features";
import { Film, SHORTS_FRAMES, ShortsFilm, STORE_FRAMES, StoreFilm, YT_FRAMES, YouTubeFilm } from "./Films";

export const RemotionRoot: React.FC = () => (
  <Folder name="concealer">
    {/* Chrome Web Store promo (YouTube link in the listing): AI agents first, then AutoFill */}
    <Composition id="Store-Promo" component={StoreFilm} durationInFrames={STORE_FRAMES} fps={30} width={1920} height={1080} />
    {/* YouTube marketing tour */}
    <Composition id="YouTube-Tour" component={YouTubeFilm} durationInFrames={YT_FRAMES} fps={30} width={1920} height={1080} />
    {/* 9:16 for YouTube Shorts / Reels / TikTok */}
    <Composition id="Shorts-9x16" component={ShortsFilm} durationInFrames={SHORTS_FRAMES} fps={30} width={1080} height={1920} />
    {/* one short film per interface, embedded on that interface's docs page */}
    {(Object.keys(FEATURE_FILMS) as (keyof typeof FEATURE_FILMS)[]).map((k) => (
      <Composition key={k} id={`Feature-${k}`} component={() => <Film scenes={FEATURE_FILMS[k]} />} durationInFrames={featureFrames(k)} fps={30} width={1920} height={1080} />
    ))}
  </Folder>
);
