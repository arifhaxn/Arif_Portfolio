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
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: INK,
          padding: "72px 80px",
          position: "relative",
        }}
      >
        {/* Soft accent bloom behind the mark, echoing the robot's glow on the
            landing page. A radial gradient is one of the few paint effects
            Satori handles reliably. */}
        <div
          style={{
            position: "absolute",
            top: -520,
            right: -420,
            width: 1500,
            height: 1500,
            // Deliberately much larger than the area it tints. A radial fade on
            // a near-black ground bands hard — the first attempt stepped 24/765
            // in one row, plainly visible. Spreading the same falloff across
            // roughly three times the distance drops each step below the
            // threshold where the eye reads it as an edge. Clipped to a circle
            // so the box itself can never show a corner.
            background: `radial-gradient(circle, rgba(59,130,246,0.20) 0%, rgba(59,130,246,0.07) 34%, rgba(59,130,246,0) 66%)`,
            borderRadius: "50%",
            display: "flex",
          }}
        />

        {/* Top rail: the mark, and the role opposite it. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="" width={96} height={96} />
          <div
            style={{
              display: "flex",
              fontSize: 22,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: ACCENT,
            }}
          >
            {hero.eyebrow.replace(/^\/\s*/, "")}
          </div>
        </div>

        {/* The name, in the site's own display face. */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontFamily: "Relidux",
              fontSize: 156,
              lineHeight: 1,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              color: "#ffffff",
            }}
          >
            {hero.name}
          </div>
        </div>

        {/* Bottom rail: hairline, then the standing detail line. */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              height: 1,
              background: "rgba(255,255,255,0.14)",
              marginBottom: 26,
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 24,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#8b8b95",
            }}
          >
            <div style={{ display: "flex" }}>{hero.hud.locationLabel}</div>
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
