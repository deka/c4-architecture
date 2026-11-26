// Builds the model from schema-validated fragments and checks the semantic rules.
import {
  ancestors,
  formatSource,
  type Element,
  type ElementKind,
  type ElementStyle,
  type LoadResult,
  type Property,
  type Relationship,
  type RelationshipStyle,
  type Selector,
  stepRelationship,
  type Source,
  type ValidationError,
  type ViewDefinition,
  type ViewType,
} from "./model.ts";

// JSON shapes guaranteed by the schema.
interface RawElement {
  id: string;
  name: string;
  description?: string;
  external?: boolean;
  technology?: string;
  group?: string;
  tags?: string[];
  url?: string;
  properties?: Property[];
  containers?: RawElement[];
  components?: RawElement[];
}
interface RawRelationship {
  id?: string;
  from: string;
  to: string;
  description?: string;
  technology?: string;
  tags?: string[];
  url?: string;
  properties?: Property[];
}
interface RawView {
  type: ViewType;
  key: string;
  scope?: string;
  title?: string;
  description?: string;
  include?: Selector[];
  exclude?: Selector[];
  layout?: { direction?: "TB" | "BT" | "LR" | "RL"; rankSeparation?: number; nodeSeparation?: number };
  steps?: { from: string; to: string; description?: string }[];
}
export interface Fragment {
  readonly file: string | undefined;
  readonly doc: {
    name?: string;
    description?: string;
    include?: string[];
    model?: {
      impliedRelationships?: boolean;
      people?: RawElement[];
      softwareSystems?: RawElement[];
      relationships?: RawRelationship[];
    };
    views?: RawView[];
    styles?: { elements?: ElementStyle[]; relationships?: RelationshipStyle[] };
  };
}

const defaultTags: Record<ElementKind, readonly string[]> = {
  person: ["Element", "Person"],
  softwareSystem: ["Element", "Software System"],
  container: ["Element", "Container"],
  component: ["Element", "Component"],
};

/** Element kinds a view can display. */
export const allowedKinds: Record<ViewType, readonly ElementKind[]> = {
  systemLandscape: ["person", "softwareSystem"],
  systemContext: ["person", "softwareSystem"],
  container: ["person", "softwareSystem", "container"],
  component: ["person", "softwareSystem", "container", "component"],
  // Narrowed by the scope: see `dynamicElementError`.
  dynamic: ["person", "softwareSystem", "container", "component"],
};

/** Expected kind of each view's `scope`. */
const scopeKind: Record<ViewType, ElementKind | undefined> = {
  systemLandscape: undefined,
  systemContext: "softwareSystem",
  container: "softwareSystem",
  component: "container",
  // A software system or a container, or no scope at all: checked by `checkDynamicView`.
  dynamic: undefined,
};

export function buildModel(fragments: readonly Fragment[]): LoadResult {
  const errors: ValidationError[] = [];
  const elements = new Map<string, Element>();
  /** Where every id was declared (elements and relationships share one namespace). */
  const ids = new Map<string, Source>();
  const declared: { rel: Relationship; source: Source }[] = [];
  const views: ViewDefinition[] = [];
  const viewKeys = new Map<string, Source>();

  const claimId = (id: string, source: Source): boolean => {
    const previous = ids.get(id);
    if (previous) {
      errors.push({
        file: source.file,
        path: `${source.path}/id`,
        message: `identifier "${id}" at ${formatSource(source)} is already defined at ${formatSource(previous)}`,
      });
      return false;
    }
    ids.set(id, source);
    return true;
  };

  const addElement = (kind: ElementKind, raw: RawElement, source: Source, parent: string | undefined): void => {
    if (!claimId(raw.id, source)) return;
    elements.set(raw.id, {
      kind,
      id: raw.id,
      name: raw.name,
      description: raw.description,
      external: raw.external ?? false,
      technology: raw.technology,
      group: raw.group,
      tags: [...defaultTags[kind], ...(raw.tags ?? [])],
      url: raw.url,
      properties: raw.properties ?? [],
      parent,
      source,
    });
  };

  for (const { file, doc } of fragments) {
    const model = doc.model ?? {};
    (model.people ?? []).forEach((p, i) => addElement("person", p, { file, path: `/model/people/${i}` }, undefined));
    (model.softwareSystems ?? []).forEach((s, i) => {
      const sPath = `/model/softwareSystems/${i}`;
      addElement("softwareSystem", s, { file, path: sPath }, undefined);
      (s.containers ?? []).forEach((c, j) => {
        const cPath = `${sPath}/containers/${j}`;
        addElement("container", c, { file, path: cPath }, s.id);
        (c.components ?? []).forEach((k, l) =>
          addElement("component", k, { file, path: `${cPath}/components/${l}` }, c.id),
        );
      });
    });
    (model.relationships ?? []).forEach((r, i) => {
      const source = { file, path: `/model/relationships/${i}` };
      if (r.id !== undefined) claimId(r.id, source);
      declared.push({
        source,
        rel: {
          id: r.id,
          from: r.from,
          to: r.to,
          description: r.description,
          technology: r.technology,
          tags: ["Relationship", ...(r.tags ?? [])],
          url: r.url,
          properties: r.properties ?? [],
          implied: false,
        },
      });
    });
    (doc.views ?? []).forEach((v, i) => {
      const source = { file, path: `/views/${i}` };
      const previous = viewKeys.get(v.key);
      if (previous) {
        errors.push({
          file,
          path: `${source.path}/key`,
          message: `view key "${v.key}" is already used at ${formatSource(previous)}`,
        });
      } else {
        viewKeys.set(v.key, source);
      }
      views.push({
        type: v.type,
        key: v.key,
        scope: v.scope,
        title: v.title,
        description: v.description,
        include: v.include ?? ["*"],
        exclude: v.exclude ?? [],
        layout: {
          direction: v.layout?.direction ?? "TB",
          rankSeparation: v.layout?.rankSeparation,
          nodeSeparation: v.layout?.nodeSeparation,
        },
        steps: (v.steps ?? []).map((step, j) => ({
          from: step.from,
          to: step.to,
          description: step.description,
          source: { file, path: `${source.path}/steps/${j}` },
        })),
        source,
      });
    });
  }

  // References are checked last: a file may reference an element declared in another file.
  for (const { rel, source } of declared) {
    for (const end of ["from", "to"] as const) {
      if (!elements.has(rel[end])) {
        errors.push({ file: source.file, path: `${source.path}/${end}`, message: `element "${rel[end]}" not found` });
      }
    }
  }
  const relationshipIds = new Set(declared.flatMap(({ rel }) => (rel.id === undefined ? [] : [rel.id])));
  for (const view of views) checkView(view, elements, relationshipIds, errors);

  if (errors.length > 0) return { ok: false, errors };

  const relationships = declared.map(({ rel }) => rel);
  const root = fragments.at(-1)?.doc;
  if (root?.model?.impliedRelationships ?? true) relationships.push(...impliedRelationships(relationships, elements));

  // Steps are checked against the final relationships, implied ones included.
  for (const view of views) {
    for (const step of view.steps) {
      if (stepRelationship(relationships, step) === undefined) {
        errors.push({
          file: step.source.file,
          path: step.source.path,
          message: `no relationship from "${step.from}" to "${step.to}" in the model: declare it before using it in a dynamic view`,
        });
      }
    }
  }
  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    model: {
      name: root?.name,
      description: root?.description,
      elements,
      relationships,
      views,
      styles: {
        elements: fragments.flatMap(({ doc }) => doc.styles?.elements ?? []),
        relationships: fragments.flatMap(({ doc }) => doc.styles?.relationships ?? []),
      },
    },
  };
}

function checkView(
  view: ViewDefinition,
  elements: ReadonlyMap<string, Element>,
  relationshipIds: ReadonlySet<string>,
  errors: ValidationError[],
): void {
  if (view.type === "dynamic") {
    checkDynamicView(view, elements, errors);
    return;
  }
  const { file, path } = view.source;
  const expected = scopeKind[view.type];
  if (expected !== undefined && view.scope !== undefined) {
    const scope = elements.get(view.scope);
    if (!scope) {
      errors.push({ file, path: `${path}/scope`, message: `element "${view.scope}" not found` });
    } else if (scope.kind !== expected) {
      errors.push({
        file,
        path: `${path}/scope`,
        message: `a ${view.type} view expects a ${expected} scope, "${view.scope}" is a ${scope.kind}`,
      });
    }
  }
  const checkSelectors = (list: "include" | "exclude"): void => {
    view[list].forEach((selector, i) => {
      const at = `${path}/${list}/${i}`;
      if (selector === "*") return;
      if (typeof selector === "string") {
        const element = elements.get(selector);
        if (!element) {
          errors.push({ file, path: at, message: `element "${selector}" not found` });
        } else if (list === "include" && !allowedKinds[view.type].includes(element.kind)) {
          errors.push({
            file,
            path: at,
            message: `a ${view.type} view cannot display "${selector}" (${element.kind})`,
          });
        }
      } else if ("relationship" in selector && !relationshipIds.has(selector.relationship)) {
        errors.push({ file, path: at, message: `relationship "${selector.relationship}" not found` });
      }
    });
  };
  checkSelectors("include");
  checkSelectors("exclude");
}

/** Scope and step elements of a dynamic view (the relationships are checked once the model is built). */
function checkDynamicView(view: ViewDefinition, elements: ReadonlyMap<string, Element>, errors: ValidationError[]): void {
  const { file, path } = view.source;
  let scope: Element | undefined;
  if (view.scope !== undefined) {
    scope = elements.get(view.scope);
    if (!scope) {
      errors.push({ file, path: `${path}/scope`, message: `element "${view.scope}" not found` });
      return;
    }
    if (scope.kind !== "softwareSystem" && scope.kind !== "container") {
      errors.push({
        file,
        path: `${path}/scope`,
        message: `a dynamic view expects a softwareSystem or container scope, "${view.scope}" is a ${scope.kind}`,
      });
      return;
    }
  }
  for (const step of view.steps) {
    for (const end of ["from", "to"] as const) {
      const at = `${step.source.path}/${end}`;
      const element = elements.get(step[end]);
      const message = element ? dynamicElementError(element, scope) : `element "${step[end]}" not found`;
      if (message !== undefined) errors.push({ file: step.source.file, path: at, message });
    }
  }
}

/**
 * Elements a dynamic view can show, as in Structurizr:
 * - no scope: people and software systems;
 * - software system scope: people, other software systems and containers;
 * - container scope: people, other software systems, other containers and components.
 */
function dynamicElementError(element: Element, scope: Element | undefined): string | undefined {
  if (scope !== undefined && (element.id === scope.id || element.id === scope.parent)) {
    return `"${element.id}" is the scope of this dynamic view (or contains it) and cannot be one of its steps`;
  }
  const allowed: readonly ElementKind[] =
    scope === undefined
      ? ["person", "softwareSystem"]
      : scope.kind === "softwareSystem"
        ? ["person", "softwareSystem", "container"]
        : ["person", "softwareSystem", "container", "component"];
  if (allowed.includes(element.kind)) return undefined;
  const where = scope === undefined ? "without a scope" : `scoped to a ${scope.kind}`;
  return `a dynamic view ${where} cannot show "${element.id}" (${element.kind})`;
}

/**
 * For each relationship A → B, creates A' → B' for every ancestor-or-self A' of A and B' of B,
 * unless A' and B' are in a parent/child line or a relationship A' → B' already exists.
 */
function impliedRelationships(
  declared: readonly Relationship[],
  elements: ReadonlyMap<string, Element>,
): Relationship[] {
  const existing = new Set(declared.map((r) => `${r.from}→${r.to}`));
  const implied: Relationship[] = [];
  for (const rel of declared) {
    const sources = [rel.from, ...ancestors(elements, rel.from)];
    const targets = [rel.to, ...ancestors(elements, rel.to)];
    for (const from of sources) {
      for (const to of targets) {
        if (from === to) continue;
        if (ancestors(elements, from).includes(to) || ancestors(elements, to).includes(from)) continue;
        const key = `${from}→${to}`;
        if (existing.has(key)) continue;
        existing.add(key);
        implied.push({ ...rel, id: undefined, from, to, implied: true });
      }
    }
  }
  return implied;
}
