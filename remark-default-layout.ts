import type { Root } from "mdast";
import type { Plugin } from "unified";
import { dirname, relative, sep } from "node:path";

export interface RemarkDefaultLayoutOptions {
  layoutPath: string;
}

interface AstroFileData {
  astro?: {
    frontmatter?: Record<string, unknown> & { layout?: string };
  };
}

const remarkDefaultLayout: Plugin<[RemarkDefaultLayoutOptions], Root> = ({ layoutPath }) => {
  return (_tree, file) => {
    const fm = (file.data as AstroFileData).astro?.frontmatter;
    if (!fm || fm.layout) return;
    const filePath = file.history[0];
    if (!filePath) return;
    if (!filePath.includes(`${sep}pages${sep}`)) return;
    const rel = relative(dirname(filePath), layoutPath);
    fm.layout = rel.startsWith(".") ? rel : `./${rel}`;
  };
};

export default remarkDefaultLayout;
