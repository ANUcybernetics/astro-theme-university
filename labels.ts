// The words the theme's own chrome puts on every page. A site in another
// language passes its translations as BaseLayout's `labels`; any it leaves
// out stay English.

export interface ThemeLabels {
  /** The visually hidden link to `#main`. */
  skipToContent: string;
  /** `aria-label` of the top navigation. */
  mainNav: string;
  /** The mobile menu button. */
  menu: string;
  /** The search dialog and its input. */
  search: string;
  /** The nav's search button, which also names the shortcut. */
  searchButton: string;
  searchPlaceholder: string;
  searchResults: string;
  searching: string;
  searchUnavailable: string;
  /** Shown when a search finds nothing; `{query}` is replaced by the query. */
  noResults: string;
  contactUs: string;
  mailingAddress: string;
  email: string;
  phone: string;
  socialLinks: string;
  /** `aria-label` of the footer's legal links. */
  legal: string;
  /** Heading of the acknowledgement when it gives no `title`. */
  acknowledgement: string;
  /** The footer licence line; `{licence}` is replaced by the linked licence name. */
  licence: string;
  switchToDark: string;
  switchToLight: string;
}

export const defaultLabels: ThemeLabels = {
  skipToContent: "Skip to main content",
  mainNav: "Main",
  menu: "Menu",
  search: "Search",
  searchButton: "Search (Cmd+K)",
  searchPlaceholder: "Search...",
  searchResults: "Search results",
  searching: "Searching…",
  searchUnavailable: "Search index not available.",
  noResults: "No results for “{query}”",
  contactUs: "Contact us",
  mailingAddress: "Mailing address",
  email: "Email",
  phone: "Phone",
  socialLinks: "Social links",
  legal: "Legal",
  acknowledgement: "Acknowledgement",
  licence: "Unless otherwise indicated, this site is licensed under a {licence} licence.",
  switchToDark: "Switch to dark theme",
  switchToLight: "Switch to light theme",
};

export const resolveLabels = (labels: Partial<ThemeLabels> = {}): ThemeLabels => ({
  ...defaultLabels,
  ...labels,
});
