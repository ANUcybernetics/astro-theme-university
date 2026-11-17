// The default reads Astro's injected BASE_URL without requiring astro/client
// types, so this module stays in the pure-TS typecheck closure (index.ts
// imports it via rehype-base-links).
// (The textual `import.meta.env` must survive: Vite substitutes it at build.)
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- ImportMeta has no `env` without astro/client types, and `import.meta.env` must stay textual for Vite
const metaEnv: unknown = (import.meta as { env?: unknown }).env;
const metaBaseUrl: string | undefined =
  typeof metaEnv === "object" &&
  metaEnv !== null &&
  "BASE_URL" in metaEnv &&
  typeof metaEnv.BASE_URL === "string"
    ? metaEnv.BASE_URL
    : undefined;

export function withBase(href: string, base: string = metaBaseUrl ?? "/"): string {
  if (!href || !href.startsWith("/") || href.startsWith("//")) return href;
  const b = base.replace(/\/$/, "");
  if (!b) return href;
  if (href.startsWith(b + "/") || href === b) return href;
  return b + href;
}
