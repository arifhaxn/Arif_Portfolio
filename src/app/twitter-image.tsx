// X/Twitter reads `twitter:image` and only falls back to `og:image` on some
// clients, so the same card is published under both names rather than relying on
// that fallback. Re-exported, not duplicated, so there is one card to maintain.
export { default, alt, size, contentType } from "./opengraph-image";
