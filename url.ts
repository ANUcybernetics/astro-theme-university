// The default reads Astro's injected BASE_URL without requiring astro/client
// types, so this module stays in the pure-TS typecheck closure (index.ts
// imports it via rehype-base-links).
const metaEnv = (import.meta as unknown as { env?: { BASE_URL?: string } }).env;

export function withBase(href: string, base: string = metaEnv?.BASE_URL ?? "/"): string {
  if (!href || !href.startsWith("/") || href.startsWith("//")) return href;
  const b = base.replace(/\/$/, "");
  if (!b) return href;
  if (href.startsWith(b + "/") || href === b) return href;
  return b + href;
}
