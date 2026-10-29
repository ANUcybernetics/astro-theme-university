import { describe, expect, test } from "vitest";
import { parse as parseYaml } from "yaml";
import {
  citationFooter,
  citationLlmsBlock,
  formatCitation,
  licenceUrl,
  parseCitation,
} from "./citation.js";

const COURSE_CFF = `
cff-version: 1.2.0
title: "Example Course (course materials)"
authors:
  - family-names: Lovelace
    given-names: Ada
    affiliation: "School of Engines"
    orcid: "https://orcid.org/0000-0000-0000-0000"
identifiers:
  - type: doi
    value: 10.5281/zenodo.1
url: "https://example.edu/course/"
license: CC-BY-NC-SA-4.0
preferred-citation:
  type: generic
  title: "Example Course"
  medium: "Course materials"
  authors:
    - family-names: Lovelace
      given-names: Ada
  institution:
    name: "School of Computing"
  doi: 10.5281/zenodo.1
  year: 2026
`;

const course = () => parseCitation(parseYaml(COURSE_CFF))!;

describe("parseCitation", () => {
  test("preferred-citation fields win, the top level fills the gaps", () => {
    expect(course()).toMatchObject({
      title: "Example Course",
      medium: "Course materials",
      institution: "School of Computing",
      year: 2026,
      doi: "10.5281/zenodo.1",
      url: "https://example.edu/course/",
      licence: "CC-BY-NC-SA-4.0",
    });
  });

  test("reads the DOI from identifiers and the year from date-released", () => {
    const c = parseCitation({
      title: "Thing",
      authors: [{ name: "The Collective" }],
      identifiers: [
        { type: "url", value: "https://x" },
        { type: "doi", value: "10.1/abc" },
      ],
      "date-released": new Date("2025-03-01"),
    })!;
    expect(c.doi).toBe("10.1/abc");
    expect(c.year).toBe(2025);
  });

  test("returns null without a title or an author", () => {
    expect(parseCitation({ title: "No authors" })).toBeNull();
    expect(parseCitation({ authors: [{ "family-names": "X" }] })).toBeNull();
  });
});

describe("formatCitation", () => {
  test("formats an APA-style reference with the issuing institution", () => {
    expect(formatCitation(course(), (t) => `_${t}_`)).toBe(
      "Lovelace, A. (2026). _Example Course_ [Course materials]. School of Computing. https://doi.org/10.5281/zenodo.1",
    );
  });

  test("joins several authors and falls back to the url without a DOI", () => {
    const c = parseCitation({
      title: "Joint",
      authors: [
        { "family-names": "One", "given-names": "Ann Marie" },
        { "family-names": "Two", "given-names": "Bo" },
        { name: "Lab" },
      ],
      url: "https://joint.example",
    })!;
    expect(formatCitation(c)).toBe(
      "One, A. M., Two, B., & Lab (n.d.). Joint. https://joint.example",
    );
  });
});

test("licenceUrl maps CC licences to creativecommons.org and others to SPDX", () => {
  expect(licenceUrl("CC-BY-NC-SA-4.0")).toBe("https://creativecommons.org/licenses/by-nc-sa/4.0/");
  expect(licenceUrl("MIT")).toBe("https://spdx.org/licenses/MIT.html");
});

test("the llms block and page footer carry licence and citation", () => {
  expect(citationLlmsBlock(course())).toContain(
    "Licensed under [CC-BY-NC-SA-4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)",
  );
  expect(citationFooter(course(), "https://example.edu/course/topics/a/")).toBe(
    "Source: <https://example.edu/course/topics/a/>\\\n" +
      "Licence: [CC-BY-NC-SA-4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)\\\n" +
      "Cite as: Lovelace, A. (2026). _Example Course_ [Course materials]. School of Computing. https://doi.org/10.5281/zenodo.1\n",
  );
});
