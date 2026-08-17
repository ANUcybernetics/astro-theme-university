/**
 * Shared type definitions for the astro-theme-university theme.
 *
 * Consumers can import these types (and the `defineSiteConfig` helper) from
 * the package root: `import type { SiteConfig } from "astro-theme-university"`.
 */

import type { ImageMetadata } from "astro";

/**
 * An image served from elsewhere — a CDN or object-store bucket — already
 * encoded by whoever put it there. Accepted by `Card` and `Hero` alongside
 * `ImageMetadata`; a remote source bypasses the build-time image pipeline
 * entirely and renders as a plain `<img>`.
 */
export interface RemoteImage {
  /** Absolute URL of the image (the `src` fallback when `srcset` is set). */
  src: string;
  /** Intrinsic width in px. Emitted as the `width` attribute when present. */
  width?: number;
  /** Intrinsic height in px. Emitted as the `height` attribute when present. */
  height?: number;
  /** Pre-computed `srcset`, derived by the caller from its encoded variants. */
  srcset?: string;
  /** `sizes` for the srcset. Overrides the component's own default when set. */
  sizes?: string;
}

export interface NavLink {
  /** Display text for the link. */
  text: string;
  /** URL the link points to. */
  href: string;
}

export interface SocialLink {
  /** Social media platform. */
  platform: "facebook" | "instagram" | "youtube" | "linkedin";
  /** URL to the social media profile. */
  url: string;
}

export interface ContactInfo {
  /** Short description of the organisational unit. */
  description?: string;
  /** Mailing address. */
  address?: string;
  /** Contact email address. */
  email?: string;
  /** Contact phone number. */
  phone?: string;
}

export interface LegalLink {
  /** Display text for the link. */
  text: string;
  /** URL the link points to. */
  href: string;
}

export interface PartnershipLink {
  /** Accessible name for the partnership link. */
  text: string;
  /** URL the link points to. */
  href: string;
  /** Resolved src of the partnership logo image. */
  logo: string;
}

export interface AcknowledgementInfo {
  /** Heading above the acknowledgement text. */
  title?: string;
  /** The acknowledgement text (e.g. an Acknowledgement of Country). */
  text: string;
  /** Institutional logo shown in the footer's dark band. */
  logo?: ImageMetadata;
  /** Alt text for the band logo. */
  logoAlt?: string;
}

/**
 * Shape of the `siteConfig` object that consumers export from `src/site-config.ts`.
 * The fields here map onto `BaseLayout` props — including the branding
 * fields, so a branding preset object can be spread into the config:
 *
 * ```ts
 * export const siteConfig = defineSiteConfig({
 *   ...myBranding,
 *   name: "My Site",
 * });
 * ```
 */
export interface SiteConfig {
  /** Site or organisational unit name. Used in nav, footer, and page titles. */
  name: string;
  /** Navigation links displayed in the top bar. */
  links?: NavLink[];
  /** Contact details displayed in the footer. */
  contact?: ContactInfo;
  /** Social media links displayed as icons in the footer. */
  socials?: SocialLink[];
  /** SPDX licence identifier for the site content (e.g. "CC-BY-4.0"). */
  licence?: string;
  /** Force a specific colour scheme. 'auto' (default) lets users toggle. */
  colorScheme?: "auto" | "light" | "dark";

  /* Branding fields (all optional; typically supplied by a branding
     preset object). */

  /** Logo image (light mode). When omitted, the nav renders the site
   *  name as a text wordmark. */
  logo?: ImageMetadata;
  /** Logo image (dark mode). Only used when `logo` is also provided. */
  logoDark?: ImageMetadata;
  /** Compact logo (e.g. a crest or monogram) swapped into the nav below the
   *  mobile breakpoint, where a wide horizontal lockup would wrap. Only used
   *  when `logo` is also provided. */
  logoCompact?: ImageMetadata;
  /** Compact logo (dark mode). Only used when `logoCompact` is provided. */
  logoCompactDark?: ImageMetadata;
  /** Favicon. When omitted, no favicon link is emitted. */
  favicon?: ImageMetadata;
  /** Default card image for link previews (Open Graph / Twitter), used by
   *  every page that doesn't set its own `socialImage`. A local image is
   *  encoded to a JPEG card at build time, because card scrapers largely
   *  don't decode AVIF or WebP. Omit it and pages emit no `og:image`. */
  socialImage?: string | ImageMetadata | RemoteImage;
  /** Alt text paired with `socialImage`. */
  socialImageAlt?: string;
  /** Footer legal links. */
  legalLinks?: LegalLink[];
  /** Footer partnership logo links, shown in the dark band. */
  partnerships?: PartnershipLink[];
  /** Footer regulatory metadata lines (rendered via `set:html`). */
  meta?: string[];
  /** Institutional acknowledgement for the footer. */
  acknowledgement?: AcknowledgementInfo;
}

/**
 * Identity-typed helper for defining a site config with full autocomplete and
 * type checking. Use instead of a plain object literal in `src/site-config.ts`:
 *
 * ```ts
 * import { defineSiteConfig } from "astro-theme-university";
 *
 * export const siteConfig = defineSiteConfig({
 *   name: "My Site",
 *   contact: { email: "hello@example.com" },
 *   // ...
 * });
 * ```
 */
export function defineSiteConfig(config: SiteConfig): SiteConfig {
  return config;
}

export interface SidebarItem {
  /** Display text for the link. */
  label: string;
  /** URL the link points to. Set `currentPath` on the Sidebar to auto-highlight. */
  href: string;
}

export interface SidebarSection {
  /** Section heading displayed above the item list. */
  title: string;
  /** Items belonging to this section. */
  items: SidebarItem[];
}
