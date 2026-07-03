import { Project, SyntaxKind, Node, type PropertySignature, type SourceFile } from "ts-morph";
import { readFileSync } from "node:fs";

export interface SharedInterface {
  name: string;
  props: PropInfo[];
}

export type SharedInterfacePool = Map<string, PropInfo[]>;

export interface PropInfo {
  name: string;
  type: string;
  required: boolean;
  default?: string;
  description?: string;
}

export interface ComponentProps {
  props: PropInfo[];
  supportingTypes?: Record<string, PropInfo[]>;
}

export function extractAstroFrontmatter(filePath: string): string {
  const content = readFileSync(filePath, "utf-8");
  const open = "---\n";
  if (!content.startsWith(open)) return "";
  const closeIdx = content.indexOf("\n---", open.length);
  if (closeIdx === -1) return "";
  return content.slice(open.length, closeIdx);
}

export function extractSvelteScript(filePath: string): string {
  const content = readFileSync(filePath, "utf-8");
  const openTag = '<script lang="ts">';
  const startIdx = content.indexOf(openTag);
  if (startIdx === -1) return "";
  const bodyStart = startIdx + openTag.length;
  const closeIdx = content.indexOf("</script>", bodyStart);
  if (closeIdx === -1) return "";
  return content.slice(bodyStart, closeIdx);
}

export function extractDefaultsFromAST(
  sourceFile: SourceFile,
  propsCall: "Astro.props" | "$props()",
): Record<string, string> {
  const defaults: Record<string, string> = {};

  for (const varDecl of sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration)) {
    const initializer = varDecl.getInitializer();
    if (!initializer) continue;

    const initText = initializer.getText();
    if (propsCall === "Astro.props" ? initText !== "Astro.props" : initText !== "$props()")
      continue;

    const nameNode = varDecl.getNameNode();
    if (!Node.isObjectBindingPattern(nameNode)) continue;

    for (const element of nameNode.getElements()) {
      const elementInit = element.getInitializer();
      if (elementInit) {
        defaults[element.getName()] = elementInit.getText();
      }
    }
    break;
  }

  return defaults;
}

function getJsDocDescription(prop: PropertySignature): string | undefined {
  const jsDocs = prop.getJsDocs();
  if (jsDocs.length === 0) return undefined;
  return jsDocs[0].getDescription().trim() || undefined;
}

function serializeType(prop: PropertySignature): string {
  const typeNode = prop.getTypeNode();
  if (typeNode) return typeNode.getText();
  const type = prop.getType();
  return type.getText(prop);
}

function extractPropsFromInterface(
  intf: ReturnType<ReturnType<typeof Project.prototype.createSourceFile>["getInterface"]>,
  defaults: Record<string, string>,
): PropInfo[] {
  if (!intf) return [];
  return intf.getProperties().map((prop) => {
    const name = prop.getName();
    const info: PropInfo = {
      name,
      type: serializeType(prop),
      required: !prop.hasQuestionToken(),
    };
    if (defaults[name] !== undefined) {
      info.default = defaults[name];
    }
    const desc = getJsDocDescription(prop);
    if (desc) info.description = desc;
    return info;
  });
}

function findPropsInterface(sourceFile: SourceFile, project: Project) {
  const explicit = sourceFile.getInterface("Props");
  if (explicit) return explicit;

  for (const varDecl of sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration)) {
    const init = varDecl.getInitializer();
    if (!init || init.getText() !== "$props()") continue;

    const typeNode = varDecl.getTypeNode();
    if (!typeNode) continue;

    if (Node.isTypeReference(typeNode)) {
      const typeName = typeNode.getText();
      return sourceFile.getInterface(typeName);
    }

    if (Node.isTypeLiteral(typeNode)) {
      const syntheticSource = project.createSourceFile(
        "synthetic.ts",
        `interface Props ${typeNode.getText()}`,
      );
      return syntheticSource.getInterface("Props");
    }
    break;
  }

  return undefined;
}

function resolveAstroPropsInterface(sourceFile: SourceFile) {
  // 1. Direct `interface Props { ... }`
  const direct = sourceFile.getInterface("Props");
  if (direct) return { intf: direct, name: "Props" };

  // 2. `type Props = XxxProps` aliasing an exported interface
  const alias = sourceFile.getTypeAlias("Props");
  if (alias) {
    const typeNode = alias.getTypeNode();
    if (typeNode && Node.isTypeReference(typeNode)) {
      const aliasedName = typeNode.getText();
      const aliased = sourceFile.getInterface(aliasedName);
      if (aliased) return { intf: aliased, name: aliasedName };
    }
  }

  return undefined;
}

function collectSharedImports(
  sourceFile: SourceFile,
  sharedTypes: SharedInterfacePool | undefined,
): Record<string, PropInfo[]> {
  const found: Record<string, PropInfo[]> = {};
  if (!sharedTypes) return found;

  for (const imp of sourceFile.getImportDeclarations()) {
    const spec = imp.getModuleSpecifierValue();
    if (!/\btypes(\.js)?$/.test(spec)) continue;
    for (const named of imp.getNamedImports()) {
      const name = named.getName();
      const props = sharedTypes.get(name);
      if (props) found[name] = props;
    }
  }

  return found;
}

export function loadSharedTypes(filePath: string): SharedInterfacePool {
  const content = readFileSync(filePath, "utf-8");
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile("shared.ts", content);
  const pool: SharedInterfacePool = new Map();
  for (const intf of sourceFile.getInterfaces()) {
    pool.set(intf.getName(), extractPropsFromInterface(intf, {}));
  }
  return pool;
}

export function processAstroFile(
  filePath: string,
  sharedTypes?: SharedInterfacePool,
): ComponentProps | null {
  const frontmatter = extractAstroFrontmatter(filePath);
  if (!/Props\b/.test(frontmatter)) return null;

  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile("component.ts", frontmatter);

  const resolved = resolveAstroPropsInterface(sourceFile);
  if (!resolved) return null;

  const defaults = extractDefaultsFromAST(sourceFile, "Astro.props");
  const props = extractPropsFromInterface(resolved.intf, defaults);

  const supportingTypes: Record<string, PropInfo[]> = {
    ...collectSharedImports(sourceFile, sharedTypes),
  };
  for (const intf of sourceFile.getInterfaces()) {
    const name = intf.getName();
    if (name === resolved.name) continue;
    supportingTypes[name] = extractPropsFromInterface(intf, {});
  }

  const result: ComponentProps = { props };
  if (Object.keys(supportingTypes).length > 0) {
    result.supportingTypes = supportingTypes;
  }
  return result;
}

export function processSvelteFile(filePath: string): ComponentProps | null {
  const script = extractSvelteScript(filePath);
  if (!script.includes("$props()")) return null;

  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile("component.ts", script);

  const propsInterface = findPropsInterface(sourceFile, project);
  if (!propsInterface) return null;

  const defaults = extractDefaultsFromAST(sourceFile, "$props()");
  const props = extractPropsFromInterface(propsInterface, defaults);

  return { props };
}

export function processTypeScriptFile(
  filePath: string,
  interfaceName: string,
): ComponentProps | null {
  const project = new Project({ useInMemoryFileSystem: true });
  const content = readFileSync(filePath, "utf-8");
  const sourceFile = project.createSourceFile("module.ts", content);

  const intf = sourceFile.getInterface(interfaceName);
  if (!intf) return null;

  const props = extractPropsFromInterface(intf, {});
  return { props };
}
