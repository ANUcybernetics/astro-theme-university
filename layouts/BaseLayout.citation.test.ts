import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { expect, test, vi } from "vitest";

// Override the null stub from vitest.config.ts with a site that has a
// CITATION.cff, as the integration would supply it.
vi.mock("virtual:astro-theme-university/llms", () => ({
  llmsTxtHref: null,
  citation: {
    title: "Example Course",
    authors: [
      {
        givenNames: "Ada",
        familyNames: "Lovelace",
        affiliation: "School of Engines",
        orcid: "https://orcid.org/0000-0000-0000-0000",
      },
    ],
    institution: "School of Computing",
    medium: "Course materials",
    year: 2026,
    doi: "10.5281/zenodo.1",
    licence: "CC-BY-4.0",
  },
}));

test("emits schema.org JSON-LD and a cite-as link for the site's citation", async () => {
  const { default: BaseLayout } = await import("./BaseLayout.astro");
  const container = await AstroContainer.create();
  const html = await container.renderToString(BaseLayout, { props: { title: "Week 1" } });

  expect(html).toContain('<link rel="cite-as" href="https://doi.org/10.5281/zenodo.1">');
  const json = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)?.[1];
  const ld = JSON.parse(json!);
  expect(ld).toMatchObject({
    "@type": "WebPage",
    name: "Week 1",
    license: "https://creativecommons.org/licenses/by/4.0/",
    isPartOf: {
      "@type": "CreativeWork",
      identifier: "https://doi.org/10.5281/zenodo.1",
      author: [
        {
          "@type": "Person",
          name: "Ada Lovelace",
          "@id": "https://orcid.org/0000-0000-0000-0000",
          affiliation: { name: "School of Engines" },
        },
      ],
      provider: { name: "School of Computing" },
    },
  });
});
