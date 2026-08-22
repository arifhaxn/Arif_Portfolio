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
          alignItems: "center",
          justifyContent: "center",
          padding: "64px 80px",
          background: `radial-gradient(circle at 50% -6%, #16253c 0%, #0b1424 28%, ${INK} 62%)`,
        }}
      >
        {/* Lockup: mark on the left, name stacked beside it, details beneath.
            The whole group is centred as one block and sized to stay inside the
            middle 630px square, so WhatsApp's square crop still gets the mark
            AND both name lines rather than slicing one off. */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 24,
            // The mark's transparent padding sits only on its left within the
            // row, so the VISIBLE lockup centred 8px right of the frame and ate
            // into the right-hand crop margin (30 left vs 15 right). Nudging the
            // row evens the two, which is what matters for the square crop.
            marginRight: 16,
          }}
        >
          {/* 254px BOX, not 254px of visible mark: the logo PNG carries
              transparent padding and its ink measures 0.613 of the box height,
              so a box the same height as the name rendered a mark barely half
              its size. 245 x 0.613 = 150px of ink, matching the name block's
              150px at this size. Both numbers came off the rendered PNG.
              The gap is small because that same padding already contributes
              ~26px of visual space to the right of the mark. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="" width={245} height={245} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            {hero.name.split(/\s+/).map((word) => (
              <div
                key={word}
                style={{
                  display: "flex",
                  fontFamily: "Relidux",
                  fontSize: 83,
                  lineHeight: 1.04,
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                  color: "#ffffff",
                }}
              >
                {word}
              </div>
            ))}
          </div>
        </div>

        {/* Role, hairline, standing detail — a narrower block under the lockup,
            so the rule reads as part of it instead of spanning the whole frame. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: 590,
            marginTop: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 25,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: ACCENT,
            }}
          >
            {hero.eyebrow.replace(/^\/\s*/, "")}
          </div>
          <div
            style={{
              display: "flex",
              width: "100%",
              height: 1,
              background: "rgba(255,255,255,0.14)",
              marginTop: 24,
              marginBottom: 22,
            }}
          />
          <div
            style={{
              display: "flex",
              gap: 18,
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
