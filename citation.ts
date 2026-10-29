/** A person credited in a CITATION.cff. */
export interface CitationAuthor {
  givenNames?: string;
  familyNames?: string;
  /** An entity author (`name:` in the cff), used when there are no name parts. */
  name?: string;
  affiliation?: string;
  /** Full ORCID URL. */
  orcid?: string;
}

/** What the theme takes from a site's CITATION.cff: the work as it should be
 *  cited. Fields come from `preferred-citation` where it has them, else from
 *  the top level of the file. */
export interface Citation {
  title: string;
  authors: CitationAuthor[];
  /** Issuing institution (`preferred-citation.institution.name`), e.g. the
   *  school that teaches a course, distinct from the authors' affiliations. */
  institution?: string;
  /** Bracketed description after the title, e.g. "Course materials". */
  medium?: string;
  year?: number;
  doi?: string;
  url?: string;
  /** SPDX licence identifier. */
  licence?: string;
}

type CffRecord = Record<string, unknown>;

const str = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;

const record = (value: unknown): CffRecord | undefined =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as CffRecord) : undefined;

function parseAuthors(value: unknown): CitationAuthor[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    const a = record(raw);
    if (!a) return [];
    const author: CitationAuthor = {
      givenNames: str(a["given-names"]),
      familyNames: str(a["family-names"]),
      name: str(a.name),
      affiliation: str(a.affiliation),
      orcid: str(a.orcid),
    };
    return author.familyNames || author.name ? [author] : [];
  });
}

function yearOf(cff: CffRecord): number | undefined {
  if (typeof cff.year === "number") return cff.year;
  const released = cff["date-released"];
  const date = released instanceof Date ? released.toISOString() : str(released);
  const year = date ? Number.parseInt(date.slice(0, 4), 10) : Number.NaN;
  return Number.isNaN(year) ? undefined : year;
}

function doiOf(cff: CffRecord): string | undefined {
  const direct = str(cff.doi);
  if (direct) return direct;
  if (!Array.isArray(cff.identifiers)) return undefined;
  for (const raw of cff.identifiers) {
    const id = record(raw);
    if (id?.type === "doi" && str(id.value)) return str(id.value);
  }
  return undefined;
}

/** Normalise a parsed CITATION.cff. Returns null when it lacks a title or an
 *  author, which is everything a citation needs. */
export function parseCitation(cff: CffRecord): Citation | null {
  const preferred = record(cff["preferred-citation"]) ?? {};
  const pick = <T>(get: (r: CffRecord) => T | undefined): T | undefined =>
    get(preferred) ?? get(cff);

  const title = pick((r) => str(r.title));
  const preferredAuthors = parseAuthors(preferred.authors);
  const authors = preferredAuthors.length > 0 ? preferredAuthors : parseAuthors(cff.authors);
  if (!title || authors.length === 0) return null;

  return {
    title,
    authors,
    institution: str(record(preferred.institution)?.name),
    medium: str(preferred.medium),
    year: pick(yearOf),
    doi: pick(doiOf),
    url: pick((r) => str(r.url)),
    licence: pick((r) => str(r.license)),
  };
}

function authorName(a: CitationAuthor): string {
  if (!a.familyNames) return a.name ?? "";
  const initials = (a.givenNames ?? "")
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => `${part[0]}.`)
    .join(" ");
  return initials ? `${a.familyNames}, ${initials}` : a.familyNames;
}

function authorList(authors: CitationAuthor[]): string {
  const names = authors.map(authorName);
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")}, & ${names.at(-1)}`;
}

/** The DOI as a resolver URL, else the work's URL. */
export function citationLink(c: Citation): string | undefined {
  return c.doi ? `https://doi.org/${c.doi}` : c.url;
}

/** An APA-style reference. `emphasis` wraps the title: markdown asterisks for
 *  the llms outputs, nothing for plain text. */
export function formatCitation(
  c: Citation,
  emphasis: (title: string) => string = (t) => t,
): string {
  const parts = [`${authorList(c.authors)} (${c.year ?? "n.d."}).`];
  // a title that already ends in punctuation takes no second full stop
  const end = c.medium ? ` [${c.medium}].` : /[.!?]$/.test(c.title) ? "" : ".";
  parts.push(`${emphasis(c.title)}${end}`);
  if (c.institution) parts.push(`${c.institution}.`);
  const link = citationLink(c);
  if (link) parts.push(link);
  return parts.join(" ");
}

const markdownCitation = (c: Citation) => formatCitation(c, (t) => `_${t}_`);

/** The licence's canonical URL: creativecommons.org for CC licences, the SPDX
 *  page for anything else. */
export function licenceUrl(spdx: string): string {
  const cc = spdx.match(/^CC-(BY(?:-[A-Z]{2})*)-(\d\.\d)$/);
  if (cc) return `https://creativecommons.org/licenses/${cc[1].toLowerCase()}/${cc[2]}/`;
  if (spdx === "CC0-1.0") return "https://creativecommons.org/publicdomain/zero/1.0/";
  return `https://spdx.org/licenses/${spdx}.html`;
}

/** The "Citing this site" block llms.txt carries after its preamble. */
export function citationLlmsBlock(c: Citation): string {
  const lines = ["## Citing this site", "", `> ${markdownCitation(c)}`, ""];
  if (c.licence) {
    lines.push(
      `Licensed under [${c.licence}](${licenceUrl(c.licence)}). When you quote, ` +
        `summarise or build on this material, credit it with the citation above ` +
        `and link the page you used.`,
      "",
    );
  }
  return lines.join("\n");
}

/** The source lines every markdown twin and llms-full.txt page ends with, so
 *  a chunk copied out of context still names where it came from. */
export function citationFooter(c: Citation, pageUrl: string): string {
  const fields = [`Source: <${pageUrl}>`];
  if (c.licence) fields.push(`Licence: [${c.licence}](${licenceUrl(c.licence)})`);
  fields.push(`Cite as: ${markdownCitation(c)}`);
  // trailing backslashes are markdown hard breaks: one field per line
  return `${fields.join("\\\n")}\n`;
}

/** schema.org JSON-LD for a page that belongs to the cited work. */
export function citationJsonLd(c: Citation, page: { url?: string; name: string }): object {
  const link = citationLink(c);
  const work = {
    "@type": "CreativeWork",
    name: c.title,
    ...(link && { "@id": link, url: c.url ?? link }),
    ...(c.doi && { identifier: link }),
    author: c.authors.map((a) => ({
      "@type": a.familyNames ? "Person" : "Organization",
      name: a.familyNames ? [a.givenNames, a.familyNames].filter(Boolean).join(" ") : a.name,
      ...(a.orcid && { "@id": a.orcid }),
      ...(a.affiliation && { affiliation: { "@type": "Organization", name: a.affiliation } }),
    })),
    ...(c.institution && { provider: { "@type": "Organization", name: c.institution } }),
    ...(c.year && { datePublished: String(c.year) }),
    ...(c.licence && { license: licenceUrl(c.licence) }),
  };
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.name,
    ...(page.url && { url: page.url }),
    ...(c.licence && { license: licenceUrl(c.licence) }),
    isPartOf: work,
  };
}
