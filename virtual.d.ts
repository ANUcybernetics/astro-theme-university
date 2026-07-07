declare module "virtual:astro-theme-university/fonts" {
  export const fontVariables: string[];
}

declare module "virtual:astro-theme-university/llms" {
  /** Href of the generated llms.txt, or null when llmsTxt generation is off. */
  export const llmsTxtHref: string | null;
}
