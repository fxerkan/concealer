import { Composition, Folder } from "remotion";
import { STORE_FRAMES, StoreFilm, YT_FRAMES, YouTubeFilm } from "./Films";

export const RemotionRoot: React.FC = () => (
  <Folder name="concealer">
    {/* Chrome Web Store promo (YouTube link in the listing): AI agents first, then AutoFill */}
    <Composition id="Store-Promo" component={StoreFilm} durationInFrames={STORE_FRAMES} fps={30} width={1920} height={1080} />
    {/* YouTube marketing tour */}
    <Composition id="YouTube-Tour" component={YouTubeFilm} durationInFrames={YT_FRAMES} fps={30} width={1920} height={1080} />
  </Folder>
);
