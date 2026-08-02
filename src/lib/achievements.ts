// -----------------------------------------------------------------------------
// Achievements data
// -----------------------------------------------------------------------------
// Single source of truth for the /achievements certificate grid. Same pattern as
// lib/projects.ts: `image` is optional, so when a real certificate scan exists
// later, drop its path + real `title`/`issuer` in here and AchievementCard
// renders the real thing instead of the placeholder shell — no component change.
//
// ⚠ PLACEHOLDERS — every entry below is an intentional placeholder. The titles
// and issuers are generic slot labels, NOT invented real credentials. Replace
// each with a genuine certificate (and add its `image`) as the site owner
// supplies them.
// -----------------------------------------------------------------------------

export type Achievement = {
  /** Stable id (also the display index source). */
  id: string;
  /** Certificate title. ⚠ placeholder until a real one is provided. */
  title: string;
  /** Issuing body / platform. ⚠ placeholder until provided. */
  issuer: string;
  /** Optional real certificate image path (public/...) — swaps in when set. */
  image?: string;
};

// ~12 placeholder slots. Kept deliberately generic so nothing reads as a real,
// invented credential.
export const ACHIEVEMENTS: Achievement[] = [
  { id: "01", title: "Certificate Title 01", issuer: "Issuer / Platform" },
  { id: "02", title: "Certificate Title 02", issuer: "Issuer / Platform" },
  { id: "03", title: "Certificate Title 03", issuer: "Issuer / Platform" },
  { id: "04", title: "Certificate Title 04", issuer: "Issuer / Platform" },
  { id: "05", title: "Certificate Title 05", issuer: "Issuer / Platform" },
  { id: "06", title: "Certificate Title 06", issuer: "Issuer / Platform" },
  { id: "07", title: "Certificate Title 07", issuer: "Issuer / Platform" },
  { id: "08", title: "Certificate Title 08", issuer: "Issuer / Platform" },
  { id: "09", title: "Certificate Title 09", issuer: "Issuer / Platform" },
  { id: "10", title: "Certificate Title 10", issuer: "Issuer / Platform" },
  { id: "11", title: "Certificate Title 11", issuer: "Issuer / Platform" },
  { id: "12", title: "Certificate Title 12", issuer: "Issuer / Platform" },
];
