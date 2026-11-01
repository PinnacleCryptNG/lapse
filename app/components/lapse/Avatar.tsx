import { useState } from "react";

import { hueFor } from "./format";

const DOMAINS: Record<string, string> = {
  netflix: "netflix.com", spotify: "spotify.com", icloud: "icloud.com", apple: "apple.com", "apple music": "apple.com",
  youtube: "youtube.com", "youtube premium": "youtube.com", google: "google.com", "google one": "one.google.com",
  adobe: "adobe.com", "adobe creative cloud": "adobe.com", canva: "canva.com", "canva pro": "canva.com", notion: "notion.so",
  uber: "uber.com", "uber one": "uber.com", audible: "audible.com", hulu: "hulu.com", max: "max.com", hbo: "max.com",
  "amazon prime": "amazon.com", prime: "amazon.com", amazon: "amazon.com", "disney+": "disneyplus.com", "disney plus": "disneyplus.com",
  dropbox: "dropbox.com", chatgpt: "openai.com", openai: "openai.com", "chatgpt plus": "openai.com", dstv: "dstv.com",
  showmax: "showmax.com", microsoft: "microsoft.com", "microsoft 365": "microsoft.com", xbox: "xbox.com", playstation: "playstation.com",
  linkedin: "linkedin.com", figma: "figma.com", github: "github.com", slack: "slack.com", zoom: "zoom.us", duolingo: "duolingo.com",
  "new york times": "nytimes.com", medium: "medium.com", patreon: "patreon.com", twitch: "twitch.tv", paramount: "paramountplus.com",
  peacock: "peacocktv.com", crunchyroll: "crunchyroll.com", deezer: "deezer.com", tidal: "tidal.com", grammarly: "grammarly.com",
  "1password": "1password.com", nordvpn: "nordvpn.com", expressvpn: "expressvpn.com", headspace: "headspace.com", calm: "calm.com",
  strava: "strava.com", peloton: "onepeloton.com", "x premium": "x.com", boomplay: "boomplay.com", mtn: "mtn.com", claude: "claude.ai", anthropic: "claude.ai", audiomack: "audiomack.com",
  "hbo max": "max.com", coursera: "coursera.org", skillshare: "skillshare.com", midjourney: "midjourney.com", surfshark: "surfshark.com",
  starlink: "starlink.com", "kindle unlimited": "amazon.com", tinder: "tinder.com", "apple tv+": "tv.apple.com", "linkedin premium": "linkedin.com",
  "playstation plus": "playstation.com",
};

export function domainFor(name: string): string | null {
  const n = name.toLowerCase().replace(/[^a-z0-9+ ]/g, "").trim();
  if (DOMAINS[n]) return DOMAINS[n]!;
  const first = n.split(" ")[0] ?? "";
  if (DOMAINS[first]) return DOMAINS[first]!;
  for (const [k, v] of Object.entries(DOMAINS)) if (n.startsWith(k)) return v;
  return null;
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const domain = domainFor(name);
  const [failed, setFailed] = useState(false);
  const style = { "--h": hueFor(name), width: size, height: size, fontSize: size * 0.42 } as React.CSSProperties;
  if (domain && !failed) {
    return (
      <span className="lp-av lp-av--logo" style={style} aria-hidden>
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
          alt=""
          loading="lazy"
          width={size}
          height={size}
          onError={() => setFailed(true)}
          onLoad={(e) => {
            if (e.currentTarget.naturalWidth < 32) setFailed(true);
          }}
        />
      </span>
    );
  }
  return (
    <span className="lp-av" style={style} aria-hidden>
      {name.trim()[0]?.toUpperCase() ?? "?"}
    </span>
  );
}
