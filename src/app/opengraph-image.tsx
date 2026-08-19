// -----------------------------------------------------------------------------
// opengraph-image — the card every shared link renders as
// -----------------------------------------------------------------------------
// The site previously declared no Open Graph image and no social metadata at
// all, so a link pasted into LinkedIn, WhatsApp, Discord or a job application
// showed as a bare line of text. For a portfolio that link IS the first
// impression, and it's the one surface the owner never sees.
//
// Generated at build time by Satori (HTML/CSS → PNG), so it costs nothing at
// request time. Note Satori renders a subset of CSS: flexbox only, no grid, and
// no canvas or WebGL — which is why this is built around the logo mark rather
// than the site's 3D robot.
//
// CENTRE-SAFE BY REQUIREMENT. Platforms crop this very differently: LinkedIn, X
// and Discord show the full 1.91:1 frame, but WhatsApp center-crops to a SQUARE
// thumbnail. A left-aligned composition looked right in the wide frame and got
// sliced to "RIF / ASAN" in WhatsApp. So the identity — mark, name, role — is
// centred and kept inside the middle 630px square (x 285…915), and only the
// bloom and the outer ends of the bottom rail are allowed to fall outside it.
//
// Copy comes from content/hero in Firestore, the same source the landing page
// reads, so editing the name or the eyebrow in /admin/hero updates the share
// card on the next deploy instead of leaving it to drift.
// -----------------------------------------------------------------------------

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getHero } from "@/lib/content";

export const alt = "Arif Hasan — Full-Stack Developer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Site palette. Not pure #000: a hair of blue keeps it from reading as a dead
// rectangle beside the white card chrome every social platform frames it with.
const INK = "#050507";
const ACCENT = "#3b82f6";

export default async function Image() {
  const [hero, relidux, logo] = await Promise.all([
    getHero(),
    readFile(join(process.cwd(), "src/app/fonts/Relidux.otf")),
    readFile(join(process.cwd(), "public/arif-logo.png")),
  ]);

  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      // The accent bloom is painted as the FRAME'S OWN BACKGROUND rather than as
      // an absolutely-positioned child. An oversized absolute div was only ever
      // rendering as a 72px band across the top: Satori's handling of a large
      // negatively-offset absolute box doesn't match the browser's, and a clean
      // rebuild proved the output byte-identical no matter how that child was
      // repositioned. A background gradient is unambiguous and needs no extra
      // element.
      //
      // The stops are OPAQUE colours ending at the ink, not fades to
      // transparent. A radial alpha fade over near-black banded hard here —
      // adjacent rows stepping 27/765, plainly a visible edge — while solid
      // stops interpolate cleanly.
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: `radial-gradient(circle at 50% -6%, #16253c 0%, #0b1424 28%, ${INK} 62%)`,
        }}
      >
        {/* Identity stack, centred so it survives a square crop intact. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flexGrow: 1,
            justifyContent: "center",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="" width={92} height={92} />

          {/* Each name word on its own line: stacked, both words clear the
              630px square with room to spare, and it echoes the site's hero
              where the name breaks the same way. */}
          {hero.name.split(/\s+/).map((word) => (
            <div
              key={word}
              style={{
                display: "flex",
                fontFamily: "Relidux",
                fontSize: 118,
                lineHeight: 1.02,
                letterSpacing: "0.02em",
                textTransform: "uppercase",
                color: "#ffffff",
                marginTop: word === hero.name.split(/\s+/)[0] ? 30 : 0,
              }}
            >
              {word}
            </div>
          ))}

          <div
            style={{
              display: "flex",
              marginTop: 26,
              fontSize: 25,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: ACCENT,
            }}
          >
            {hero.eyebrow.replace(/^\/\s*/, "")}
          </div>
        </div>

        {/* Bottom rail. Centred as one run so the square crop keeps it readable
            rather than showing two orphaned fragments. */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              height: 1,
              background: "rgba(255,255,255,0.12)",
              marginBottom: 24,
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 20,
              fontSize: 22,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#8b8b95",
            }}
          >
            <div style={{ display: "flex" }}>{hero.hud.locationLabel}</div>
            <div style={{ display: "flex", color: ACCENT }}>·</div>
            <div style={{ display: "flex" }}>{hero.tagline.primary}</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Relidux", data: relidux, style: "normal", weight: 400 }],
    },
  );
}
