// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/**
 * Architecture guardrail (standardisation plan, phase 0).
 *
 * Builds the import graph of every production source file under src/ and holds
 * it to the target layering:
 *
 *   base      core, types, theme, generated, assets, data/types
 *   services  data (the rest), lib, i18n, ai, hooks
 *   ui        design-system, components
 *   feature   features, screens, store
 *   app       App.tsx, main.tsx, app/, native/
 *
 * A file may import its own layer or a lower one, never a higher one, and
 * nothing outside screens/ may import screens/ (it is being retired into
 * features). Runtime import cycles between files are not allowed.
 *
 * Every violation that exists today is listed, with its reason, in
 * config/architecture-legacy.json. The list is shrink-only
 * (scripts/check-legacy-lists.mjs): a new violation fails here, and an entry
 * whose violation is gone must be deleted.
 *
 * Imports are classified as `runtime` (static value import or side-effect
 * import), `lazy` (dynamic `import()`, as React.lazy uses) or `type` (erased at
 * compile time). All three count for layering; only `runtime` counts for cycles,
 * because a lazy or type-only edge cannot change module initialisation order.
 */

const root = process.cwd();
const src = resolve(root, 'src');
const legacyPath = resolve(root, 'config/architecture-legacy.json');

type Layer = 'base' | 'services' | 'ui' | 'feature' | 'app';
type ImportKind = 'runtime' | 'lazy' | 'type';

const LAYER_RANK: Record<Layer, number> = { base: 0, services: 1, ui: 2, feature: 3, app: 4 };
const KIND_STRENGTH: Record<ImportKind, number> = { type: 0, lazy: 1, runtime: 2 };

/** Top-level folders (or root files) of src/ and their layer. A new folder must be added here. */
const TOP_LEVEL_LAYERS: Record<string, Layer> = {
  core: 'base',
  types: 'base',
  theme: 'base',
  generated: 'base',
  assets: 'base',
  data: 'services',
  lib: 'services',
  i18n: 'services',
  ai: 'services',
  hooks: 'services',
  'design-system': 'ui',
  components: 'ui',
  features: 'feature',
  // Live feature slices (M04 emergency, M16 checkout) that their READMEs plan to move into features/.
  modules: 'feature',
  screens: 'feature',
  store: 'feature',
  app: 'app',
  native: 'app',
  // A one-line re-export of App.tsx with no importers. Classified here, not deleted.
  navigation: 'app',
  'App.tsx': 'app',
  'main.tsx': 'app',
};

/** Paths (relative to src/) whose layer differs from their top-level folder. */
const PATH_LAYERS: { prefix: string; layer: Layer }[] = [{ prefix: 'data/types/', layer: 'base' }];

const RETIRING_FOLDER = 'screens/';

interface ImportRef {
  specifier: string;
  kind: ImportKind;
}

interface Edge {
  from: string;
  to: string;
  kind: ImportKind;
}

const toPosix = (path: string): string => path.split(sep).join('/');

function layerOf(file: string): Layer {
  const special = PATH_LAYERS.find(({ prefix }) => file.startsWith(prefix));
  if (special) return special.layer;
  const top = file.split('/')[0] ?? '';
  const layer = TOP_LEVEL_LAYERS[top];
  if (!layer) throw new Error(`src/${file}: its top-level folder "${top}" has no layer; add it to TOP_LEVEL_LAYERS`);
  return layer;
}

/** Tests, fixtures, stories and declarations are not production code. */
function isProductionSource(file: string): boolean {
  if (!/\.(ts|tsx)$/.test(file) || file.endsWith('.d.ts')) return false;
  if (/(^|\/)(__tests__|__fixtures__)\//.test(file) || file.startsWith('test/')) return false;
  return !/\.(test|spec|stories)\.tsx?$/.test(file);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, out);
    else out.push(toPosix(relative(src, path)));
  }
  return out;
}

function namedBindingsAreTypeOnly(bindings: ts.NamedImportBindings | ts.NamedExportBindings | undefined): boolean {
  if (!bindings || !(ts.isNamedImports(bindings) || ts.isNamedExports(bindings))) return false;
  return bindings.elements.length > 0 && bindings.elements.every((element) => element.isTypeOnly);
}

/** Every module specifier a file references, with how it is used. */
function importsOf(fileName: string, text: string): ImportRef[] {
  const kind = fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, kind);
  const refs: ImportRef[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause;
      const typeOnly = clause !== undefined && (clause.isTypeOnly || (!clause.name && namedBindingsAreTypeOnly(clause.namedBindings)));
      refs.push({ specifier: node.moduleSpecifier.text, kind: typeOnly ? 'type' : 'runtime' });
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const typeOnly = node.isTypeOnly || namedBindingsAreTypeOnly(node.exportClause);
      refs.push({ specifier: node.moduleSpecifier.text, kind: typeOnly ? 'type' : 'runtime' });
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
      refs.push({ specifier: node.argument.literal.text, kind: 'type' });
    } else if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const [first] = node.arguments;
      if (first && ts.isStringLiteralLike(first)) {
        if (node.expression.kind === ts.SyntaxKind.ImportKeyword) refs.push({ specifier: first.text, kind: 'lazy' });
        else if (ts.isIdentifier(node.expression) && node.expression.text === 'require') refs.push({ specifier: first.text, kind: 'runtime' });
      }
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && ts.isStringLiteral(node.moduleReference.expression)) {
      refs.push({ specifier: node.moduleReference.expression.text, kind: 'runtime' });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return refs;
}

// Same order as the extensions Vite resolves (vite.config.ts), then the
// platform variants a module may only exist as.
const CANDIDATE_SUFFIXES = ['', '.ts', '.tsx', '/index.ts', '/index.tsx', '.web.ts', '.web.tsx', '.native.ts', '.native.tsx'];

/** The file a project import points at, relative to src/; `outside` for repo files outside src/; null when it does not resolve. */
function resolveSpecifier(fromFile: string, specifier: string): string | 'outside' | null {
  const bare = specifier.split('?')[0] ?? specifier;
  const base = bare.startsWith('@/') ? join(src, bare.slice(2)) : resolve(src, dirname(fromFile), bare);
  for (const suffix of CANDIDATE_SUFFIXES) {
    const candidate = base + suffix;
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      const rel = toPosix(relative(src, candidate));
      return rel.startsWith('../') ? 'outside' : rel;
    }
  }
  return null;
}

const isProjectSpecifier = (specifier: string): boolean => specifier.startsWith('@/') || specifier.startsWith('./') || specifier.startsWith('../');

interface Graph {
  files: string[];
  edges: Edge[];
  unresolved: string[];
}

function buildGraph(): Graph {
  const files = walk(src).filter(isProductionSource).sort();
  const strongest = new Map<string, Edge>();
  const unresolved: string[] = [];
  for (const from of files) {
    for (const ref of importsOf(from, readFileSync(join(src, from), 'utf8'))) {
      if (!isProjectSpecifier(ref.specifier)) continue;
      const to = resolveSpecifier(from, ref.specifier);
      if (to === null) {
        unresolved.push(`src/${from}: "${ref.specifier}"`);
        continue;
      }
      if (to === 'outside' || to === from) continue;
      const key = `${from}\n${to}`;
      const current = strongest.get(key);
      if (!current || KIND_STRENGTH[ref.kind] > KIND_STRENGTH[current.kind]) strongest.set(key, { from, to, kind: ref.kind });
    }
  }
  return { files, edges: [...strongest.values()], unresolved };
}

/** One message per forbidden edge, keyed exactly as config/architecture-legacy.json keys it. */
function boundaryViolations(edges: Edge[]): Map<string, string> {
  const found = new Map<string, string>();
  for (const { from, to, kind } of edges) {
    const fromLayer = layerOf(from);
    const toLayer = layerOf(to);
    if (LAYER_RANK[toLayer] > LAYER_RANK[fromLayer]) {
      found.set(`layer:${kind} src/${from} -> src/${to}`, `${fromLayer} may not import ${toLayer}`);
    }
    if (to.startsWith(RETIRING_FOLDER) && !from.startsWith(RETIRING_FOLDER)) {
      found.set(`screens:${kind} src/${from} -> src/${to}`, 'only screens/ may import screens/ (it is being retired into features/)');
    }
  }
  return found;
}

/** Strongly connected groups of files joined by runtime imports (Tarjan). */
function runtimeCycles(files: string[], edges: Edge[]): string[][] {
  const next = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.kind !== 'runtime') continue;
    const list = next.get(edge.from) ?? [];
    list.push(edge.to);
    next.set(edge.from, list);
  }
  let counter = 0;
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const groups: string[][] = [];
  const connect = (node: string): void => {
    index.set(node, counter);
    low.set(node, counter);
    counter += 1;
    stack.push(node);
    onStack.add(node);
    for (const target of next.get(node) ?? []) {
      if (!index.has(target)) {
        connect(target);
        low.set(node, Math.min(low.get(node) ?? 0, low.get(target) ?? 0));
      } else if (onStack.has(target)) {
        low.set(node, Math.min(low.get(node) ?? 0, index.get(target) ?? 0));
      }
    }
    if (low.get(node) === index.get(node)) {
      const group: string[] = [];
      let member: string | undefined;
      do {
        member = stack.pop();
        if (member === undefined) break;
        onStack.delete(member);
        group.push(member);
      } while (member !== node);
      if (group.length > 1) groups.push(group.sort());
    }
  };
  for (const file of files) if (!index.has(file)) connect(file);
  return groups;
}

const cycleKey = (group: string[]): string => `cycle:runtime ${group.map((file) => `src/${file}`).join(' | ')}`;

/**
 * Inside a feature, MVVM runs one way: views/ may import viewmodel/ and model/,
 * viewmodel/ may import model/, and model/ imports neither. No feature has an
 * exception, so this is enforced outright rather than through the legacy list.
 */
type Slice = 'model' | 'viewmodel' | 'view' | 'screen';

const FEATURE_SLICE = /^features\/[^/]+\/(model|viewmodels?|views?|screens)\//;

function sliceOf(file: string): Slice | null {
  const folder = FEATURE_SLICE.exec(file)?.[1];
  if (!folder) return null;
  if (folder === 'model') return 'model';
  if (folder.startsWith('viewmodel')) return 'viewmodel';
  return folder.startsWith('view') ? 'view' : 'screen';
}

/** Features whose model/ also stays free of UI types (design-system, components). */
const UI_FREE_MODEL_FEATURES = ['clinician'];

/** The only folders a fully layered feature may have. */
const LAYERED_FEATURES: Record<string, readonly string[]> = { clinician: ['model', 'viewmodel', 'views'] };

function featureLayerViolations(edges: Edge[]): string[] {
  const found: string[] = [];
  for (const { from, to, kind } of edges) {
    const fromSlice = sliceOf(from);
    const toSlice = sliceOf(to);
    const above = fromSlice === 'model' ? ['viewmodel', 'view', 'screen'] : fromSlice === 'viewmodel' ? ['view', 'screen'] : [];
    if (toSlice && above.includes(toSlice)) found.push(`${kind} src/${from} -> src/${to}  (${fromSlice} may not import ${toSlice})`);
    const uiFree = fromSlice === 'model' && UI_FREE_MODEL_FEATURES.some((feature) => from.startsWith(`features/${feature}/`));
    if (uiFree && layerOf(to) === 'ui') found.push(`${kind} src/${from} -> src/${to}  (this feature's model may not import UI)`);
  }
  return found;
}

const legacy: Record<string, string> = JSON.parse(readFileSync(legacyPath, 'utf8'));
const graph = buildGraph();
const violations = boundaryViolations(graph.edges);
const cycles = runtimeCycles(graph.files, graph.edges);
const current = new Map<string, string>([...violations, ...cycles.map((group): [string, string] => [cycleKey(group), 'runtime import cycle'])]);

describe('import classification', () => {
  const kinds = (code: string, file = 'probe.ts') => importsOf(file, code).map(({ specifier, kind }) => `${specifier}:${kind}`);

  it('treats erased imports and exports as type-only', () => {
    expect(kinds("import type { A } from './a';")).toEqual(['./a:type']);
    expect(kinds("import { type A, type B } from './a';")).toEqual(['./a:type']);
    expect(kinds("export type { A } from './a';")).toEqual(['./a:type']);
    expect(kinds("export { type A } from './a';")).toEqual(['./a:type']);
    expect(kinds("let a: import('./a').A;")).toEqual(['./a:type']);
  });

  it('treats value, mixed and side-effect imports as runtime', () => {
    expect(kinds("import { type A, b } from './a';")).toEqual(['./a:runtime']);
    expect(kinds("import a from './a';")).toEqual(['./a:runtime']);
    expect(kinds("import * as a from './a';")).toEqual(['./a:runtime']);
    expect(kinds("import './a.css';")).toEqual(['./a.css:runtime']);
    expect(kinds("export * from './a';")).toEqual(['./a:runtime']);
    expect(kinds("export { b } from './a';")).toEqual(['./a:runtime']);
    expect(kinds("const a = require('./a');")).toEqual(['./a:runtime']);
  });

  it('treats dynamic import() as lazy', () => {
    expect(kinds("const Page = lazy(() => import('./Page'));", 'probe.tsx')).toEqual(['./Page:lazy']);
  });
});

describe('architecture boundaries', () => {
  it('scans a meaningful share of the source tree', () => {
    expect(graph.files.length).toBeGreaterThan(800);
    expect(graph.edges.length).toBeGreaterThan(4000);
  });

  it('assigns every production file to a layer', () => {
    const unassigned = graph.files.filter((file) => {
      try {
        layerOf(file);
        return false;
      } catch {
        return true;
      }
    });
    expect(unassigned).toEqual([]);
  });

  it('resolves every relative and @/ import', () => {
    expect(graph.unresolved).toEqual([]);
  });

  it('adds no dependency that breaks the layering or reaches into screens/', () => {
    const added = [...violations]
      .filter(([key]) => !(key in legacy))
      .map(([key, why]) => `${key}  (${why})`);
    expect(added).toEqual([]);
  });

  it('adds no runtime import cycle', () => {
    const added = cycles.map(cycleKey).filter((key) => !(key in legacy));
    expect(added).toEqual([]);
  });
});

describe('feature layering (model <- viewmodel <- views)', () => {
  it('classifies feature folders', () => {
    expect(sliceOf('features/clinician/model/queueModel.ts')).toBe('model');
    expect(sliceOf('features/admin/viewmodels/AdminViewModel.ts')).toBe('viewmodel');
    expect(sliceOf('features/orders/viewmodel/OrdersViewModel.ts')).toBe('viewmodel');
    expect(sliceOf('features/orders/views/OrdersView.tsx')).toBe('view');
    expect(sliceOf('features/care/screens/CareScreen.tsx')).toBe('screen');
    expect(sliceOf('features/orders/data/ordersApi.ts')).toBeNull();
    expect(sliceOf('screens/clinician/DoctorTodayScreen.tsx')).toBeNull();
  });

  it('flags an upward import, and UI types only in a UI-free model', () => {
    const edge = (from: string, to: string): Edge => ({ from, to, kind: 'type' });
    expect(featureLayerViolations([
      edge('features/orders/model/order.ts', 'features/orders/views/OrderView.tsx'),
      edge('features/orders/model/order.ts', 'features/orders/viewmodel/OrderViewModel.ts'),
      edge('features/orders/viewmodel/OrderViewModel.ts', 'features/orders/views/OrderView.tsx'),
      edge('features/clinician/model/queueModel.ts', 'design-system/index.ts'),
    ])).toHaveLength(4);
    expect(featureLayerViolations([
      edge('features/orders/views/OrderView.tsx', 'features/orders/viewmodel/OrderViewModel.ts'),
      edge('features/orders/viewmodel/OrderViewModel.ts', 'features/orders/model/order.ts'),
      edge('features/newsroom/model/templates.ts', 'design-system/icons/index.ts'),
    ])).toEqual([]);
  });

  it('keeps model/ and viewmodel/ from importing the layers above them', () => {
    expect(featureLayerViolations(graph.edges)).toEqual([]);
  });

  it.each(Object.entries(LAYERED_FEATURES))('keeps features/%s to its layer folders', (feature, allowed) => {
    const folders = readdirSync(join(src, 'features', feature), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== '__tests__' && !entry.name.startsWith('.'))
      .map((entry) => entry.name);
    expect(folders.filter((name) => !allowed.includes(name))).toEqual([]);
  });
});

describe('config/architecture-legacy.json', () => {
  it('lists only violations that still exist (delete an entry once it is fixed)', () => {
    const stale = Object.keys(legacy).filter((key) => !current.has(key));
    expect(stale).toEqual([]);
  });

  it('gives every entry a reason', () => {
    const missing = Object.entries(legacy).filter(([, reason]) => reason.trim().length < 20).map(([key]) => key);
    expect(missing).toEqual([]);
  });

  it('keeps its entries sorted and well formed', () => {
    const keys = Object.keys(legacy);
    expect([...keys].sort()).toEqual(keys);
    const malformed = keys.filter((key) => !/^(layer|screens):(runtime|lazy|type) src\/\S+ -> src\/\S+$|^cycle:runtime src\/\S+( \| src\/\S+)+$/.test(key));
    expect(malformed).toEqual([]);
  });
});
