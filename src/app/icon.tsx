// -----------------------------------------------------------------------------
// icon — the browser-tab favicon
// -----------------------------------------------------------------------------
// The tab was still showing create-next-app's leftover favicon.ico, i.e. the
// Vercel triangle, on a site that has its own mark.
//
// TRANSPARENT background, per Arif's call. Worth being explicit about the
// trade-off rather than burying it: the mark is white, so it reads well on a
// dark browser theme (and on Chrome/Edge's dark tab strip) but will be faint
// against a light one. That's the accepted cost of no tile.
//
// Still generated rather than pointing the icon convention at the SVG or PNG
// directly, because both carry transparent padding around the mark — its ink
// measures only ~0.79 of the box width. Used as-is at 32px the mark would sit
// small and lost inside its own empty margin. Rendering it here lets it be
// scaled past the tile edge so the ink itself fills the favicon.
// -----------------------------------------------------------------------------

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const logo = await readFile(join(process.cwd(), "public/arif-logo.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // No background at all — the PNG keeps its alpha channel.
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} alt="" width={34} height={34} />
      </div>
    ),
    { ...size },
  );
}
