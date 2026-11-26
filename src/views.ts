// Computes the logical content of a view: which elements, relationships and boundaries it shows.
import { allowedKinds } from "./build.ts";
import {
  stepRelationship,
  type Element,
  type ElementKind,
  type Model,
  type Relationship,
  type Selector,
  type ViewDefinition,
  type ViewType,
} from "./model.ts";

/** "scope": the central system of a context view; "internal": a child of the view scope. */
export type ViewRole = "scope" | "internal" | "neighbour" | "element";

export interface ViewElement {
  readonly id: string;
  readonly kind: ElementKind;
  readonly role: ViewRole;
}

export interface Boundary {
  /** Software system id (container view) or container id (component view). */
  readonly id: string;
  readonly contains: readonly string[];
}

/** Elements sharing a `group` value, inside the same boundary (or outside any boundary). */
export interface Group {
  readonly name: string;
  /** Id of the enclosing boundary, undefined at the top level. */
  readonly boundary: string | undefined;
  readonly contains: readonly string[];
}

/** A relationship as drawn in a view; in a dynamic view, one per step. */
export interface ViewRelationship extends Relationship {
  /** Step number (from 1) in a dynamic view, undefined in the other views. */
  readonly order?: number;
}

export interface View {
  readonly definition: ViewDefinition;
  readonly elements: readonly ViewElement[];
  readonly relationships: readonly ViewRelationship[];
  readonly boundaries: readonly Boundary[];
  readonly groups: readonly Group[];
}

export function computeView(model: Model, key: string): View {
  const definition = model.views.find((v) => v.key === key);
  if (!definition) throw new Error(`view "${key}" not found`);
  return computeViewFromDefinition(model, definition);
}

export function computeViewFromDefinition(model: Model, definition: ViewDefinition): View {
  if (definition.type === "dynamic") return computeDynamicView(model, definition);
  const { type, scope } = definition;
  const allowed = allowedKinds[type];
  // In container and component views, the scope is drawn as a boundary, not as a box.
  const boundaryId = type === "container" || type === "component" ? scope : undefined;
  const isDisplayable = (e: Element): boolean => allowed.includes(e.kind) && e.id !== boundaryId;

  const selected = new Set<string>();
  for (const selector of definition.include) {
    for (const id of resolveInclude(model, definition, selector)) {
      const element = model.elements.get(id);
      if (element && isDisplayable(element)) selected.add(id);
    }
  }

  const excludedRelationships = new Set<Relationship>();
  for (const selector of definition.exclude) {
    if (typeof selector === "string") {
      selected.delete(selector);
    } else if ("tag" in selector) {
      for (const id of [...selected]) {
        if (model.elements.get(id)?.tags.includes(selector.tag)) selected.delete(id);
      }
      for (const r of model.relationships) if (r.tags.includes(selector.tag)) excludedRelationships.add(r);
    } else {
      for (const r of model.relationships) if (r.id === selector.relationship) excludedRelationships.add(r);
    }
  }

  const elements: ViewElement[] = [...model.elements.values()]
    .filter((e) => selected.has(e.id))
    .map((e) => ({ id: e.id, kind: e.kind, role: roleOf(definition, e) }));

  const relationships = model.relationships.filter(
    (r) => selected.has(r.from) && selected.has(r.to) && !excludedRelationships.has(r),
  );

  const boundaries: Boundary[] =
    boundaryId === undefined
      ? []
      : [
          {
            id: boundaryId,
            contains: elements.filter((e) => model.elements.get(e.id)?.parent === boundaryId).map((e) => e.id),
          },
        ];

  return { definition, elements, relationships, boundaries, groups: groupsOf(model, elements, boundaries) };
}

/**
 * Dynamic view: the elements cited by the steps, in order of first appearance, and one numbered
 * relationship per step. The scope, if any, is drawn as a boundary around its children.
 */
function computeDynamicView(model: Model, definition: ViewDefinition): View {
  const { scope } = definition;
  const relationships: ViewRelationship[] = definition.steps.map((step, i) => {
    const relationship = stepRelationship(model.relationships, step);
    if (!relationship) throw new Error(`no relationship from "${step.from}" to "${step.to}"`);
    return { ...relationship, description: step.description ?? relationship.description, order: i + 1 };
  });

  const ids = [...new Set(definition.steps.flatMap((s) => [s.from, s.to]))];
  const elements: ViewElement[] = ids.map((id) => {
    const element = model.elements.get(id);
    if (!element) throw new Error(`element "${id}" not found`);
    const role: ViewRole = scope === undefined ? "element" : element.parent === scope ? "internal" : "neighbour";
    return { id, kind: element.kind, role };
  });

  const internal = elements.filter((e) => e.role === "internal").map((e) => e.id);
  const boundaries: Boundary[] = scope === undefined || internal.length === 0 ? [] : [{ id: scope, contains: internal }];
  return { definition, elements, relationships, boundaries, groups: groupsOf(model, elements, boundaries) };
}

/** Groups of the displayed elements, per boundary. */
function groupsOf(model: Model, elements: readonly ViewElement[], boundaries: readonly Boundary[]): Group[] {
  const inBoundary = new Map(boundaries.flatMap((b) => b.contains.map((id) => [id, b.id] as const)));
  const groups = new Map<string, Group & { contains: string[] }>();
  for (const e of elements) {
    const name = model.elements.get(e.id)?.group;
    if (name === undefined) continue;
    const boundary = inBoundary.get(e.id);
    const key = `${boundary ?? ""}\u0000${name}`;
    const group = groups.get(key) ?? { name, boundary, contains: [] };
    group.contains.push(e.id);
    groups.set(key, group);
  }
  return [...groups.values()];
}

function roleOf(definition: ViewDefinition, element: Element): ViewRole {
  switch (definition.type) {
    case "systemLandscape":
      return "element";
    case "systemContext":
      return element.id === definition.scope ? "scope" : "neighbour";
    default:
      return element.parent === definition.scope ? "internal" : "neighbour";
  }
}

/** Ids targeted by an include selector (the caller filters by element kind). */
function resolveInclude(model: Model, definition: ViewDefinition, selector: Selector): string[] {
  if (selector === "*") return defaultSelection(model, definition);
  if (typeof selector === "string") return [selector];
  if ("tag" in selector) {
    return [...model.elements.values()].filter((e) => e.tags.includes(selector.tag)).map((e) => e.id);
  }
  return model.relationships.filter((r) => r.id === selector.relationship).flatMap((r) => [r.from, r.to]);
}

/** Neighbour kinds added by `"*"` (containers of another system are not expanded in a container view). */
const neighbourKinds: Record<ViewType, readonly ElementKind[]> = {
  systemLandscape: [],
  systemContext: ["person", "softwareSystem"],
  container: ["person", "softwareSystem"],
  component: ["person", "softwareSystem", "container"],
  dynamic: [],
};

/**
 * Selection for `"*"`, as in Structurizr:
 * - landscape: every person and software system;
 * - context: the system and whatever is directly connected to it;
 * - container / component: the children of the scope and whatever is directly connected to them.
 */
function defaultSelection(model: Model, definition: ViewDefinition): string[] {
  const all = [...model.elements.values()];
  const { type, scope } = definition;
  if (type === "systemLandscape") return all.map((e) => e.id);
  const core = type === "systemContext" ? [scope!] : all.filter((e) => e.parent === scope).map((e) => e.id);
  const coreSet = new Set(core);
  const kinds = neighbourKinds[type];
  const neighbours = model.relationships
    .flatMap((r) => (coreSet.has(r.from) ? [r.to] : coreSet.has(r.to) ? [r.from] : []))
    .filter((id) => {
      const kind = model.elements.get(id)?.kind;
      return kind !== undefined && kinds.includes(kind);
    });
  return [...core, ...neighbours];
}
