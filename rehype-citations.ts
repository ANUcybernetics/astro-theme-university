import type { RehypePlugin } from "@astrojs/markdown-remark";

/** Options for the theme's `citations` setting. */
export interface CitationOptions {
  /** Bibliography to cite against: a BibTeX, CSL-JSON or BibJSON file,
   *  resolved against `path`. */
  bibliography: string;
  /** CSL style — a built-in name ("apa", "vancouver", "harvard1", "chicago",
   *  "mla") or a path to a `.csl` file, resolved against `path`.
   *  (default: "apa") */
  csl?: string;
  /** Directory that `bibliography` and `csl` resolve against.
   *  (default: `process.cwd()`, which is the project root during a build) */
  path?: string;
  /** Link each in-text citation to its bibliography entry. Off by default:
   *  rehype-citation nests its anchors incorrectly across a multi-work
   *  citation, producing `(a; b<a></a>)` rather than two separate links. */
  linkCitations?: boolean;
}

/** Minimal structural types — the theme does not depend on hast or vfile. */
interface Tree {
  type: string;
  children?: unknown[];
}
interface AstroVFile {
  data?: { astro?: { frontmatter?: Record<string, unknown> } };
}
type Transformer = (tree: Tree, file: AstroVFile) => void | Promise<void>;
/** The shape of rehype-citation's default export. */
export type CitationAttacher = (options: unknown) => Transformer;

/**
 * rehype-citation, plus the one piece of pandoc's citation syntax it does not
 * implement: a per-page `nocite` frontmatter key.
 *
 * Pandoc's `nocite: '@*'` puts entries in a page's reference list without
 * citing them in the prose, which is how you render a whole bibliography on a
 * single "Bibliography" page. rehype-citation takes `noCite` only as a
 * plugin-wide option, and setting it globally would append every entry to
 * every page, so it is read per file instead.
 *
 * Frontmatter reaches rehype plugins at `file.data.astro.frontmatter`, not
 * `file.data.frontmatter`.
 */
export function createCitationPlugin(
  rehypeCitation: CitationAttacher,
  options: CitationOptions,
): RehypePlugin {
  const base = {
    bibliography: options.bibliography,
    csl: options.csl ?? "apa",
    path: options.path ?? process.cwd(),
    linkCitations: options.linkCitations ?? false,
  };

  // One shared transformer for the common case; a page with `nocite` gets its
  // own, which costs a re-read of the bibliography for that page only.
  const shared = rehypeCitation(base);
  const perNoCite = new Map<string, Transformer>();

  return function citations() {
    return async (tree: Tree, file: AstroVFile) => {
      const nocite = file.data?.astro?.frontmatter?.nocite;
      if (nocite == null) return shared(tree, file);

      const noCite = (Array.isArray(nocite) ? nocite : [nocite]).map(String);
      const key = noCite.join("\u0000");
      let transformer = perNoCite.get(key);
      if (!transformer) {
        transformer = rehypeCitation({ ...base, noCite });
        perNoCite.set(key, transformer);
      }
      return transformer(tree, file);
    };
  } as RehypePlugin;
}
