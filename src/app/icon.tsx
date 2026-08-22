// -----------------------------------------------------------------------------
// icon — the browser-tab favicon
// -----------------------------------------------------------------------------
// The tab was still showing create-next-app's leftover favicon.ico, i.e. the
// Vercel triangle, on a site that has its own mark.
//
// Generated rather than dropped in as a flat file because the logo asset is a
// WHITE mark on transparency: used directly it would vanish against a light
// browser theme, and a favicon has to survive both. Compositing it onto the
// site's dark ground here guarantees the mark reads either way, and keeps the
// tab consistent with the share card.
//
// The mark is also inset. Its PNG carries transparent padding (its ink measures
// ~0.79 of the box width), which at 32px would leave it looking like a speck in
// a dark square, so it's scaled up to fill the tile properly.
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
          background: "#0b1424",
          borderRadius: 7,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} alt="" width={34} height={34} />
      </div>
    ),
    { ...size },
  );
}
