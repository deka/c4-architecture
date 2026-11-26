// Default look (sober layout rules from cathrynlavery/diagram-design, pastel take on the C4 colours) and
// style resolution by tag.
import type {
  Element,
  ElementKind,
  ElementStyle,
  LineStyle,
  Relationship,
  RelationshipStyle,
  Shape,
  Styles,
} from "./model.ts";

export const palette = {
  /** Page and diagram background. */
  paper: "#f5f5f5",
  /** Fill of the boxes. */
  surface: "#ffffff",
  ink: "#2d3142",
  muted: "#4f5d75",
  soft: "#5a6580",
  rule: "#bfc0c0",
} as const;

export interface ElementColours {
  readonly background: string;
  readonly stroke: string;
}

/**
 * Pastel take on the C4 colours: blue for what belongs to the modelled systems, a little lighter at
 * each level down (person, system, container, component), grey for what is marked `external`.
 * As in Structurizr, the colour belongs to the element, not to the view: it is the same in every view.
 */
export const internalColours: Record<ElementKind, ElementColours> = {
  person: { background: "#c4d8ee", stroke: "#3c6a9b" },
  softwareSystem: { background: "#d2e2f4", stroke: "#4776a8" },
  container: { background: "#dfeaf8", stroke: "#5784b5" },
  component: { background: "#ebf2fb", stroke: "#6c94c0" },
};

export const externalColours: ElementColours = { background: "#e4e5e8", stroke: "#8a8f98" };

export interface ResolvedElementStyle {
  readonly shape: Shape;
  readonly icon: string | undefined;
  readonly width: number;
  /** Minimum height; the box grows when its text needs more room. */
  readonly height: number;
  readonly background: string;
  /** Text colour. */
  readonly color: string;
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly border: LineStyle;
  /** 0 to 100. */
  readonly opacity: number;
  /** Size of the name; the other lines are derived from it. */
  readonly fontSize: number;
  readonly metadata: boolean;
  readonly description: boolean;
}

export interface ResolvedRelationshipStyle {
  readonly color: string;
  readonly thickness: number;
  readonly style: LineStyle;
  readonly routing: "direct" | "orthogonal" | "curved";
  readonly fontSize: number;
  /** Maximum label width. */
  readonly width: number;
  /** Label position along the line, in %. */
  readonly position: number;
  readonly opacity: number;
}

export const boundaryStyle = {
  stroke: palette.soft,
  strokeWidth: 1,
  dashArray: "4 3",
  radius: 8,
  color: palette.ink,
  fontSize: 13,
} as const;

/** Dash patterns, scaled by the stroke width when drawn. */
export const dashArrays: Record<LineStyle, string | undefined> = {
  solid: undefined,
  dashed: "4 3",
  dotted: "1 3",
};

const baseElement: ResolvedElementStyle = {
  shape: "roundedBox",
  icon: undefined,
  width: 240,
  height: 120,
  background: palette.surface,
  color: palette.ink,
  stroke: palette.ink,
  strokeWidth: 1,
  border: "solid",
  opacity: 100,
  fontSize: 14,
  metadata: true,
  description: true,
};

const baseRelationship: ResolvedRelationshipStyle = {
  color: palette.muted,
  thickness: 1.2,
  style: "solid",
  routing: "orthogonal",
  fontSize: 11,
  width: 160,
  position: 50,
  opacity: 100,
};

/** Defaults for the element, then the styles of its tags in tag order (later tags win, property by property). */
export function resolveElementStyle(element: Element, styles: Styles): ResolvedElementStyle {
  let style: ResolvedElementStyle = {
    ...baseElement,
    ...(element.kind === "person" ? { shape: "person" } : {}),
    ...(element.external ? externalColours : internalColours[element.kind]),
  };
  for (const tag of element.tags) {
    for (const declared of styles.elements) if (declared.tag === tag) style = { ...style, ...defined(declared) };
  }
  return style;
}

export function resolveRelationshipStyle(relationship: Relationship, styles: Styles): ResolvedRelationshipStyle {
  let style = baseRelationship;
  for (const tag of relationship.tags) {
    for (const declared of styles.relationships) if (declared.tag === tag) style = { ...style, ...defined(declared) };
  }
  return style;
}

/** Declared properties without `tag`, so that spreading them only overrides what is set. */
function defined<T extends ElementStyle | RelationshipStyle>(declared: T): Omit<Partial<T>, "tag"> {
  const { tag: _tag, ...rest } = declared;
  return Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)) as Omit<Partial<T>, "tag">;
}
