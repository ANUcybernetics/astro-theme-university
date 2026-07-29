declare module "virtual:astro-theme-university/fonts" {
  /** cssVariables of every registered font (theme fonts + site-registered). */
  export const fontVariables: string[];
  /** The subset of fontVariables that BaseLayout preloads (preloadFonts option). */
  export const preloadFontVariables: string[];
}

declare module "virtual:astro-theme-university/images" {
  /** Output format the theme's own <Image> call sites use unless a component
   *  is given an explicit `imageFormat` prop (imageFormat option). */
  export const imageFormat: import("astro").ImageOutputFormat;
}

declare module "virtual:astro-theme-university/llms" {
  /** Href of the generated llms.txt, or null when llmsTxt generation is off. */
  export const llmsTxtHref: string | null;
}
