import { defineSiteConfig } from "astro-theme-university/types";

export const siteConfig = defineSiteConfig({
  name: "Example University",

  // Nav bar links. Omit or leave empty to hide the nav entirely.
  links: [
    { text: "Home", href: "/" },
    { text: "About", href: "/about/" },
  ],

  // SPDX identifier for the licence footer badge. Supported:
  // "CC-BY-4.0", "CC-BY-SA-4.0", "CC-BY-NC-4.0", "CC-BY-NC-SA-4.0",
  // "CC-BY-ND-4.0", "CC-BY-NC-ND-4.0".
  // Remove this line to hide the licence.
  licence: "CC-BY-4.0",

  // All footer sections below are optional — delete any you don't need.

  // contact: {
  //   description: "School of Examples",
  //   address: "Canberra ACT 2601",
  //   email: "enquiries@example.edu",
  //   phone: "+61 2 6100 0000",
  // },

  // socials: [
  //   { platform: "linkedin", url: "https://www.linkedin.com/school/example" },
  //   { platform: "youtube", url: "https://www.youtube.com/@example" },
  // ],
});
