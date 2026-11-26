// In-memory C4 model, built from one or more validated JSON files.

export type ElementKind = "person" | "softwareSystem" | "container" | "component";

/** Where something was declared: file (undefined for an in-memory workspace) and JSON Pointer. */
export interface Source {
  readonly file: string | undefined;
  readonly path: string;
}

export interface Property {
  readonly name: string;
  readonly value: string;
}

export interface Element {
  readonly kind: ElementKind;
  readonly id: string;
  readonly name: string;
  readonly description: string | undefined;
  /** Always false for containers and components. */
  readonly external: boolean;
  /** Containers and components only. */
  readonly technology: string | undefined;
  readonly group: string | undefined;
  /** Implicit tags (Element, Person…) followed by declared tags. */
  readonly tags: readonly string[];
  readonly url: string | undefined;
  readonly properties: readonly Property[];
  /** Software system id (for a container) or container id (for a component). */
  readonly parent: string | undefined;
  readonly source: Source;
}

export interface Relationship {
  readonly id: string | undefined;
  readonly from: string;
  readonly to: string;
  readonly description: string | undefined;
  readonly technology: string | undefined;
  readonly tags: readonly string[];
  readonly url: string | undefined;
  readonly properties: readonly Property[];
  /** True when derived from a relationship between child elements. */
  readonly implied: boolean;
}

export type ViewType = "systemLandscape" | "systemContext" | "container" | "component" | "dynamic";

export type Selector = string | { readonly tag: string } | { readonly relationship: string };

export interface Layout {
  readonly direction: "TB" | "BT" | "LR" | "RL";
  readonly rankSeparation: number | undefined;
  readonly nodeSeparation: number | undefined;
}

/** One interaction of a dynamic view: an instance of the relationship from `from` to `to`. */
export interface DynamicStep {
  readonly from: string;
  readonly to: string;
  /** Overrides the description of the relationship. */
  readonly description: string | undefined;
  readonly source: Source;
}

export interface ViewDefinition {
  readonly type: ViewType;
  readonly key: string;
  readonly scope: string | undefined;
  readonly title: string | undefined;
  readonly description: string | undefined;
  readonly include: readonly Selector[];
  readonly exclude: readonly Selector[];
  readonly layout: Layout;
  /** Dynamic views only (empty otherwise), numbered from 1 in this order. */
  readonly steps: readonly DynamicStep[];
  readonly source: Source;
}

export type Shape =
  | "box" | "roundedBox" | "person" | "cylinder" | "pipe" | "component"
  | "webBrowser" | "mobileDevicePortrait" | "folder";

export type LineStyle = "solid" | "dashed" | "dotted";

/** Style declared for a tag; every property is optional (unset = inherited). */
export interface ElementStyle {
  readonly tag: string;
  readonly shape?: Shape;
  readonly icon?: string;
  readonly width?: number;
  readonly height?: number;
  readonly background?: string;
  readonly color?: string;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly border?: LineStyle;
  readonly opacity?: number;
  readonly fontSize?: number;
  readonly metadata?: boolean;
  readonly description?: boolean;
}

export interface RelationshipStyle {
  readonly tag: string;
  readonly color?: string;
  readonly thickness?: number;
  readonly style?: LineStyle;
  readonly routing?: "direct" | "orthogonal" | "curved";
  readonly fontSize?: number;
  readonly width?: number;
  readonly position?: number;
  readonly opacity?: number;
}

/** Styles of every file, included files first: on conflict, the last declaration wins. */
export interface Styles {
  readonly elements: readonly ElementStyle[];
  readonly relationships: readonly RelationshipStyle[];
}

export interface Model {
  readonly name: string | undefined;
  readonly description: string | undefined;
  /** Every element by id, in declaration order. */
  readonly elements: ReadonlyMap<string, Element>;
  /** Declared relationships followed by implied ones. */
  readonly relationships: readonly Relationship[];
  readonly views: readonly ViewDefinition[];
  readonly styles: Styles;
}

/** Error located by a JSON Pointer ("/" for the root). */
export interface ValidationError {
  readonly file: string | undefined;
  readonly path: string;
  readonly message: string;
}

export type LoadResult =
  | { readonly ok: true; readonly model: Model }
  | { readonly ok: false; readonly errors: readonly ValidationError[] };

/** Ancestors of an element, from its direct parent up to its software system. */
export function ancestors(elements: ReadonlyMap<string, Element>, id: string): string[] {
  const result: string[] = [];
  let current = elements.get(id)?.parent;
  while (current !== undefined) {
    result.push(current);
    current = elements.get(current)?.parent;
  }
  return result;
}

/**
 * Relationship a dynamic step stands for, as in Structurizr: among the relationships from `from` to `to`
 * (declared first, then implied), the one with the same description, otherwise the first one.
 */
export function stepRelationship(
  relationships: readonly Relationship[],
  step: Pick<DynamicStep, "from" | "to" | "description">,
): Relationship | undefined {
  const candidates = relationships.filter((r) => r.from === step.from && r.to === step.to);
  return candidates.find((r) => step.description !== undefined && r.description === step.description) ?? candidates[0];
}

export function formatSource(source: Source): string {
  return source.file === undefined ? source.path : `${source.file} (${source.path})`;
}
