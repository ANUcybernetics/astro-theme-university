/**
 * Shared type definitions for the astro-theme-university theme.
 *
 * Consumers can import these types (and the `defineSiteConfig` helper) from
 * the package root: `import type { SiteConfig } from "astro-theme-university"`.
 */

import type { ImageMetadata } from "astro";

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
  /** Favicon. When omitted, no favicon link is emitted. */
  favicon?: ImageMetadata;
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
