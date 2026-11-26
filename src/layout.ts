// Positions the content of a view with ELK (layered algorithm, orthogonal routing).
// The SVG renderer only depends on the types below, not on ELK.
import elkModule, { type ElkExtendedEdge, type ElkNode, type LayoutOptions } from "elkjs/lib/elk.bundled.js";
import type { ElementKind, Layout, Relationship } from "./model.ts";
import type { View, ViewRelationship } from "./views.ts";

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Rect extends Point, Size {}

export interface PositionedElement extends Rect {
  readonly id: string;
  readonly kind: ElementKind;
}

export interface PositionedBoundary extends Rect {
  /** Id of the element the boundary stands for. */
  readonly id: string;
  /** Ids of the elements drawn inside the boundary. */
  readonly contains: readonly string[];
}

export interface PositionedGroup extends Rect {
  readonly name: string;
  readonly boundary: string | undefined;
  readonly contains: readonly string[];
}

export interface PositionedRelationship {
  /** Unique within the view: the declared id, or "from->to" (suffixed "#2", "#3"… when repeated). */
  readonly key: string;
  readonly relationship: ViewRelationship;
  /** Orthogonal polyline from the source outline to the destination outline. */
  readonly points: readonly Point[];
  readonly label: Rect | undefined;
}

/** Placement of a view, in absolute coordinates with the origin at the top-left corner. */
export interface DiagramLayout extends Size {
  readonly elements: readonly PositionedElement[];
  readonly boundaries: readonly PositionedBoundary[];
  readonly groups: readonly PositionedGroup[];
  readonly relationships: readonly PositionedRelationship[];
}

export interface LayoutSizes {
  /** Size of the box of an element, once its text is wrapped. */
  readonly element: (id: string) => Size;
  /** Size of the label of a relationship; undefined when it has no label. */
  readonly relationshipLabel: (relationship: Relationship) => Size | undefined;
  /** Title of a boundary: its height is reserved above the content, its width is the minimum frame width. */
  readonly boundaryHeader: (id: string) => Size;
  /** Name of a group: same rules as `boundaryHeader`. */
  readonly groupHeader: (name: string) => Size;
}

// Spacing on a 4px grid.
const defaultNodeSeparation = 48;
const defaultRankSeparation = 64;
const boundaryPadding = 24;
const groupPadding = 16;
const diagramMargin = 24;

const elkDirection: Record<Layout["direction"], string> = { TB: "DOWN", BT: "UP", LR: "RIGHT", RL: "LEFT" };

// elkjs is published as CommonJS: the constructor is exposed as `.default`.
const elk = new elkModule.default();

export async function layoutView(view: View, sizes: LayoutSizes): Promise<DiagramLayout> {
  const { layout } = view.definition;
  const keys = relationshipKeys(view.relationships);

  const groupId = (index: number): string => `group:${index}`;
  const inBoundary = new Set(view.boundaries.flatMap((b) => b.contains));
  const inGroup = new Set(view.groups.flatMap((g) => g.contains));

  const node = (id: string): ElkNode => ({ id, ...sizes.element(id) });
  const groupNode = (index: number): ElkNode => {
    const group = view.groups[index]!;
    return {
      id: groupId(index),
      layoutOptions: frameOptions(sizes.groupHeader(group.name), groupPadding, layout.direction),
      children: group.contains.map(node),
    };
  };
  /** Elements and groups placed directly in a boundary (or at the top level when `boundary` is undefined). */
  const content = (boundary: string | undefined, members: readonly string[]): ElkNode[] => [
    ...members.filter((id) => !inGroup.has(id)).map(node),
    ...view.groups.flatMap((g, i) => (g.boundary === boundary ? [groupNode(i)] : [])),
  ];

  const graph: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": elkDirection[layout.direction],
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.spacing.nodeNode": String(layout.nodeSeparation ?? defaultNodeSeparation),
      "elk.layered.spacing.nodeNodeBetweenLayers": String(layout.rankSeparation ?? defaultRankSeparation),
      "elk.spacing.edgeEdge": "12",
      "elk.spacing.edgeNode": "24",
      "elk.spacing.edgeLabel": "8",
      "elk.padding": padding(diagramMargin, diagramMargin),
    } satisfies LayoutOptions,
    children: [
      ...content(
        undefined,
        view.elements.filter((e) => !inBoundary.has(e.id)).map((e) => e.id),
      ),
      ...view.boundaries.map((b) => ({
        id: b.id,
        layoutOptions: frameOptions(sizes.boundaryHeader(b.id), boundaryPadding, layout.direction),
        children: content(b.id, b.contains),
      })),
    ],
    edges: view.relationships.map((r, i): ElkExtendedEdge => {
      const label = sizes.relationshipLabel(r);
      return {
        id: keys[i]!,
        sources: [r.from],
        targets: [r.to],
        labels: label === undefined ? [] : [{ text: keys[i]!, ...label }],
      };
    }),
  };

  const result = await elk.layout(graph);

  // ELK gives child coordinates relative to their parent, and edge coordinates relative to `edge.container`.
  const rects = new Map<string, Rect>([["root", { x: 0, y: 0, width: result.width ?? 0, height: result.height ?? 0 }]]);
  const walk = (parent: ElkNode, origin: Point): void => {
    for (const child of parent.children ?? []) {
      const rect = {
        x: origin.x + (child.x ?? 0),
        y: origin.y + (child.y ?? 0),
        width: child.width ?? 0,
        height: child.height ?? 0,
      };
      rects.set(child.id, rect);
      walk(child, rect);
    }
  };
  walk(result, { x: 0, y: 0 });

  const rectOf = (id: string): Rect => {
    const rect = rects.get(id);
    if (!rect) throw new Error(`ELK returned no position for "${id}"`);
    return rect;
  };
  const shift = (p: Point, o: Point): Point => ({ x: p.x + o.x, y: p.y + o.y });

  const relationships = (result.edges ?? []).map((edge, i): PositionedRelationship => {
    const origin = rects.get(edge.container ?? "root") ?? { x: 0, y: 0 };
    const section = edge.sections?.[0];
    if (!section) throw new Error(`ELK returned no route for "${edge.id}"`);
    const label = edge.labels?.[0];
    return {
      key: edge.id,
      relationship: view.relationships[i]!,
      points: [section.startPoint, ...(section.bendPoints ?? []), section.endPoint].map((p) => shift(p, origin)),
      label:
        label === undefined
          ? undefined
          : { ...shift({ x: label.x ?? 0, y: label.y ?? 0 }, origin), width: label.width ?? 0, height: label.height ?? 0 },
    };
  });

  return {
    width: result.width ?? 0,
    height: result.height ?? 0,
    elements: view.elements.map((e) => ({ id: e.id, kind: e.kind, ...rectOf(e.id) })),
    boundaries: view.boundaries.map((b) => ({ id: b.id, contains: b.contains, ...rectOf(b.id) })),
    groups: view.groups.map((g, i) => ({ name: g.name, boundary: g.boundary, contains: g.contains, ...rectOf(groupId(i)) })),
    relationships,
  };
}

/** Padding of a boundary or group, with room for its title above the content and a frame at least as wide. */
function frameOptions(header: Size, sides: number, direction: Layout["direction"]): LayoutOptions {
  const width = Math.ceil(header.width + 2 * sides);
  const height = Math.ceil(header.height + 2 * sides);
  // With INCLUDE_CHILDREN, elkjs 0.12.1 applies the minimum size of nested nodes transposed when the layout is
  // vertical (observed: a minimum width ends up as a height in DOWN/UP). Swap it back for those directions.
  const vertical = direction === "TB" || direction === "BT";
  return {
    "elk.padding": padding(sides + header.height, sides),
    "elk.nodeSize.constraints": "[MINIMUM_SIZE]",
    "elk.nodeSize.minimum": vertical ? `(${height}, ${width})` : `(${width}, ${height})`,
  };
}

function padding(top: number, sides: number): string {
  return `[top=${top},left=${sides},bottom=${sides},right=${sides}]`;
}

function relationshipKeys(relationships: readonly Relationship[]): string[] {
  const seen = new Map<string, number>();
  return relationships.map((r) => {
    const base = r.id ?? `${r.from}->${r.to}`;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base}#${count}`;
  });
}
