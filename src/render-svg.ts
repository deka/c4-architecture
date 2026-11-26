// Draws a view as an SVG string: shapes, text, orthogonal relationships, boundaries, groups and legend.
// Every drawn item is a <g> carrying data-c4-id / data-c4-kind (see features/README.md).
import { layoutView, type DiagramLayout, type Point, type Rect, type Size } from "./layout.ts";
import type { Element, Model, Relationship, Shape } from "./model.ts";
import { baselineOffset, lineHeight, measureText, wrapText, type Font } from "./text.ts";
import {
  boundaryStyle,
  dashArrays,
  palette,
  resolveElementStyle,
  resolveRelationshipStyle,
  type ResolvedElementStyle,
  type ResolvedRelationshipStyle,
} from "./theme.ts";
import type { View, ViewElement, ViewRelationship } from "./views.ts";

// ---------------------------------------------------------------------------------------------
// Text blocks

interface Line {
  readonly text: string;
  readonly font: Font;
  readonly color: string;
  /** Extra space above the line. */
  readonly gap: number;
}

function blockHeight(lines: readonly Line[]): number {
  return lines.reduce((sum, l) => sum + l.gap + lineHeight(l.font), 0);
}

/** Text lines centred on `cx`, starting at `top`. */
function drawLines(lines: readonly Line[], cx: number, top: number, anchor: "middle" | "start" = "middle"): string {
  let y = top;
  return lines
    .map((line) => {
      y += line.gap;
      const baseline = y + baselineOffset(line.font);
      y += lineHeight(line.font);
      return (
        `<text x="${num(cx)}" y="${num(baseline)}" font-size="${line.font.size}" font-weight="${line.font.weight}"` +
        ` fill="${attr(line.color)}" text-anchor="${anchor}">${esc(line.text)}</text>`
      );
    })
    .join("");
}

// ---------------------------------------------------------------------------------------------
// Elements

const kindLabels: Record<Element["kind"], string> = {
  person: "Person",
  softwareSystem: "Software System",
  container: "Container",
  component: "Component",
};

const textPadding = 16;
const iconSize = 32;

/** Space taken by the decoration of each shape, around the text area. */
function shapeInsets(shape: Shape): { top: number; right: number; bottom: number; left: number } {
  switch (shape) {
    case "person":
      return { top: 40, right: 0, bottom: 0, left: 0 };
    case "cylinder":
      return { top: 20, right: 0, bottom: 10, left: 0 };
    case "pipe":
      return { top: 0, right: 24, bottom: 0, left: 12 };
    case "component":
      return { top: 0, right: 0, bottom: 0, left: 8 };
    case "webBrowser":
      return { top: 24, right: 0, bottom: 0, left: 0 };
    case "mobileDevicePortrait":
      return { top: 20, right: 0, bottom: 20, left: 0 };
    case "folder":
      return { top: 12, right: 0, bottom: 0, left: 0 };
    default:
      return { top: 0, right: 0, bottom: 0, left: 0 };
  }
}

interface ElementBox {
  readonly element: Element;
  readonly role: ViewElement["role"];
  readonly style: ResolvedElementStyle;
  readonly lines: readonly Line[];
  readonly size: Size;
}

function metadataText(element: Element): string {
  const kind = kindLabels[element.kind];
  return element.technology === undefined ? `[${kind}]` : `[${kind}: ${element.technology}]`;
}

function elementBox(element: Element, role: ViewElement["role"], model: Model): ElementBox {
  const style = resolveElementStyle(element, model.styles);
  const insets = shapeInsets(style.shape);
  const textWidth = style.width - insets.left - insets.right - 2 * textPadding;
  const nameFont: Font = { size: style.fontSize, weight: 600 };
  const metaFont: Font = { size: Math.max(8, style.fontSize - 3), weight: 400 };
  const descFont: Font = { size: Math.max(8, style.fontSize - 2), weight: 400 };
  const metaColor = style.color === palette.ink ? palette.muted : style.color;

  const lines: Line[] = wrapText(element.name, textWidth, nameFont).map((text) => ({
    text,
    font: nameFont,
    color: style.color,
    gap: 0,
  }));
  if (style.metadata) {
    wrapText(metadataText(element), textWidth, metaFont).forEach((text, i) =>
      lines.push({ text, font: metaFont, color: metaColor, gap: i === 0 ? 4 : 0 }),
    );
  }
  if (style.description && element.description !== undefined) {
    wrapText(element.description, textWidth, descFont).forEach((text, i) =>
      lines.push({ text, font: descFont, color: style.color, gap: i === 0 ? 8 : 0 }),
    );
  }
  const content = blockHeight(lines) + (style.icon === undefined ? 0 : iconSize + 8);
  const height = Math.max(style.height, insets.top + insets.bottom + 2 * textPadding + content);
  return { element, role, style, lines, size: { width: style.width, height: Math.ceil(height / 4) * 4 } };
}

/**
 * Draws a shape filling `r`. `fill` and `stroke` are attribute strings: lines inside the shape only take `stroke`.
 * `k` scales the decorations (head, caps, tabs…), so that the legend can draw small swatches.
 */
function shapeMarkup(shape: Shape, r: Rect, fill: string, stroke: string, k = 1): string {
  const { x, y, width: w, height: h } = r;
  const cx = x + w / 2;
  const paint = fill + stroke;
  const line = ` fill="none"${stroke}`;
  switch (shape) {
    case "box":
      return `<rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}"${paint}/>`;
    case "roundedBox":
      return `<rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}" rx="${num(6 * k)}"${paint}/>`;
    case "person": {
      const head = 24 * k;
      const bodyTop = 40 * k;
      return (
        `<rect x="${num(x)}" y="${num(y + bodyTop)}" width="${num(w)}" height="${num(h - bodyTop)}" rx="${num(Math.min(24 * k, (h - bodyTop) / 2))}"${paint}/>` +
        `<circle cx="${num(cx)}" cy="${num(y + head)}" r="${num(head)}"${paint}/>`
      );
    }
    case "cylinder": {
      const ry = 10 * k;
      const rx = w / 2;
      return (
        `<path d="M${num(x)},${num(y + ry)} V${num(y + h - ry)} A${num(rx)},${num(ry)} 0 0 0 ${num(x + w)},${num(y + h - ry)}` +
        ` V${num(y + ry)} A${num(rx)},${num(ry)} 0 0 0 ${num(x)},${num(y + ry)} Z"${paint}/>` +
        `<ellipse cx="${num(cx)}" cy="${num(y + ry)}" rx="${num(rx)}" ry="${num(ry)}"${paint}/>`
      );
    }
    case "pipe": {
      const rx = 12 * k;
      const ry = h / 2;
      return (
        `<path d="M${num(x + rx)},${num(y)} H${num(x + w - rx)} A${num(rx)},${num(ry)} 0 0 1 ${num(x + w - rx)},${num(y + h)}` +
        ` H${num(x + rx)} A${num(rx)},${num(ry)} 0 0 1 ${num(x + rx)},${num(y)} Z"${paint}/>` +
        `<ellipse cx="${num(x + w - rx)}" cy="${num(y + ry)}" rx="${num(rx)}" ry="${num(ry)}"${paint}/>`
      );
    }
    case "component": {
      const stub = { width: 16 * k, height: 10 * k };
      return (
        `<rect x="${num(x + 8 * k)}" y="${num(y)}" width="${num(w - 8 * k)}" height="${num(h)}" rx="${num(4 * k)}"${paint}/>` +
        [0.25, 0.55]
          .map(
            (at) =>
              `<rect x="${num(x)}" y="${num(y + h * at)}" width="${num(stub.width)}" height="${num(stub.height)}" rx="${num(2 * k)}"${paint}/>`,
          )
          .join("")
      );
    }
    case "webBrowser":
      return (
        `<rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}" rx="${num(6 * k)}"${paint}/>` +
        `<path d="M${num(x)},${num(y + 24 * k)} H${num(x + w)}"${line}/>` +
        [12, 24, 36].map((dx) => `<circle cx="${num(x + dx * k)}" cy="${num(y + 12 * k)}" r="${num(3 * k)}"${paint}/>`).join("")
      );
    case "mobileDevicePortrait":
      return (
        `<rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}" rx="${num(16 * k)}"${paint}/>` +
        `<path d="M${num(cx - 12 * k)},${num(y + 10 * k)} H${num(cx + 12 * k)}"${line}/>` +
        `<circle cx="${num(cx)}" cy="${num(y + h - 10 * k)}" r="${num(4 * k)}"${paint}/>`
      );
    case "folder": {
      const tab = Math.min(80 * k, w * 0.35);
      return (
        `<path d="M${num(x)},${num(y)} H${num(x + tab)} L${num(x + tab + 8 * k)},${num(y + 12 * k)} H${num(x + w)}` +
        ` V${num(y + h)} H${num(x)} Z"${paint}/>`
      );
    }
  }
}

/**
 * Moves a relationship endpoint lying on the side of `r` onto the drawn outline of the shape, along the normal
 * of that side, so that arrows touch the shape rather than its bounding box.
 */
function onShapeOutline(shape: Shape, r: Rect, p: Point): Point {
  const e = 0.5;
  const cx = r.x + r.width / 2;
  const cy = r.y + r.height / 2;
  const top = Math.abs(p.y - r.y) < e;
  const bottom = Math.abs(p.y - r.y - r.height) < e;
  const left = Math.abs(p.x - r.x) < e;
  const right = Math.abs(p.x - r.x - r.width) < e;
  /** Depth of an elliptic arc of half-width `a` and depth `b`, at distance `d` from its centre. */
  const arc = (a: number, b: number, d: number): number => b - b * Math.sqrt(Math.max(0, 1 - (d / a) ** 2));
  switch (shape) {
    case "person": {
      if (!top) return p;
      const dx = Math.abs(p.x - cx);
      return { x: p.x, y: r.y + (dx < 24 ? 24 - Math.sqrt(24 ** 2 - dx ** 2) : 40) };
    }
    case "cylinder": {
      const depth = arc(r.width / 2, 10, p.x - cx);
      if (top) return { x: p.x, y: r.y + depth };
      if (bottom) return { x: p.x, y: r.y + r.height - depth };
      return p;
    }
    case "pipe": {
      const depth = arc(r.height / 2, 12, p.y - cy);
      if (left) return { x: r.x + depth, y: p.y };
      if (right) return { x: r.x + r.width - depth, y: p.y };
      return p;
    }
    case "component":
      return left ? { x: r.x + 8, y: p.y } : p;
    case "folder": {
      if (!top) return p;
      const tab = Math.min(80, r.width * 0.35);
      const dx = p.x - r.x - tab;
      return { x: p.x, y: r.y + Math.min(12, Math.max(0, dx * 1.5)) };
    }
    default:
      return p;
  }
}

function strokeDash(style: "solid" | "dashed" | "dotted", width: number): string {
  const pattern = dashArrays[style];
  if (pattern === undefined) return "";
  return ` stroke-dasharray="${pattern
    .split(" ")
    .map((n) => num(Number(n) * width))
    .join(" ")}"`;
}

function elementPaint(style: ResolvedElementStyle): { fill: string; stroke: string } {
  return {
    fill: ` fill="${attr(style.background)}"`,
    stroke:
      ` stroke="${attr(style.stroke)}" stroke-width="${num(style.strokeWidth)}"` +
      strokeDash(style.border, style.strokeWidth),
  };
}

function drawElement(box: ElementBox, rect: Rect, href: string | undefined): string {
  const { element, style } = box;
  const { fill, stroke } = elementPaint(style);
  const insets = shapeInsets(style.shape);
  const area = {
    x: rect.x + insets.left,
    y: rect.y + insets.top,
    width: rect.width - insets.left - insets.right,
    height: rect.height - insets.top - insets.bottom,
  };
  const content = blockHeight(box.lines) + (style.icon === undefined ? 0 : iconSize + 8);
  let top = area.y + (area.height - content) / 2;
  const cx = area.x + area.width / 2;
  let icon = "";
  if (style.icon !== undefined) {
    icon = `<image href="${attr(style.icon)}" x="${num(cx - iconSize / 2)}" y="${num(top)}" width="${iconSize}" height="${iconSize}"/>`;
    top += iconSize + 8;
  }
  const body =
    `<title>${esc(element.name)}</title>` + shapeMarkup(style.shape, rect, fill, stroke) + icon + drawLines(box.lines, cx, top);
  const opacity = style.opacity < 100 ? ` opacity="${num(style.opacity / 100)}"` : "";
  return (
    `<g data-c4-id="${attr(element.id)}" data-c4-kind="${element.kind}" data-c4-shape="${style.shape}"${opacity}>` +
    (href === undefined ? link(element.url, body) : internalLink(href, body)) +
    `</g>`
  );
}

// ---------------------------------------------------------------------------------------------
// Relationships

/** Arrowhead length, growing with the line so that it stays visible on thick lines. */
const arrowLength = (thickness: number): number => 6 + 2 * thickness;
const cornerRadius = 8;
/** Gap between a label and the line it masks. */
const labelPadding = 6;

function relationshipLines(relationship: ViewRelationship, style: ResolvedRelationshipStyle): Line[] {
  const font: Font = { size: style.fontSize, weight: 400 };
  const max = style.width - 2 * labelPadding;
  const lines: Line[] = [];
  // In a dynamic view, the step number starts the label, even without a description.
  const order = relationship.order === undefined ? undefined : `${relationship.order}.`;
  const description = [order, relationship.description].filter((t) => t !== undefined).join(" ");
  if (description !== "") {
    for (const text of wrapText(description, max, font)) lines.push({ text, font, color: style.color, gap: 0 });
  }
  if (relationship.technology !== undefined) {
    for (const text of wrapText(`[${relationship.technology}]`, max, font)) {
      lines.push({ text, font, color: style.color, gap: 0 });
    }
  }
  return lines;
}

function labelSize(lines: readonly Line[]): Size | undefined {
  if (lines.length === 0) return undefined;
  const width = Math.max(...lines.map((l) => measureText(l.text, l.font)));
  return { width: Math.ceil(width + 2 * labelPadding), height: Math.ceil(blockHeight(lines) + 2 * labelPadding) };
}

const distance = (a: Point, b: Point): number => Math.hypot(b.x - a.x, b.y - a.y);
const towards = (from: Point, to: Point, length: number): Point => {
  const d = distance(from, to);
  return d === 0 ? from : { x: from.x + ((to.x - from.x) * length) / d, y: from.y + ((to.y - from.y) * length) / d };
};

/** Path through the points, with each bend rounded by a quadratic curve of radius `maxRadius` at most. */
function roundedPath(points: readonly Point[], maxRadius: number): string {
  const [first, ...rest] = points;
  if (!first) return "";
  let d = `M${num(first.x)},${num(first.y)}`;
  for (let i = 0; i < rest.length; i++) {
    const corner = rest[i]!;
    const next = rest[i + 1];
    if (next === undefined) {
      d += ` L${num(corner.x)},${num(corner.y)}`;
      break;
    }
    const prev = points[i]!;
    const r = Math.min(maxRadius, distance(prev, corner) / 2, distance(corner, next) / 2);
    const a = towards(corner, prev, r);
    const b = towards(corner, next, r);
    d += ` L${num(a.x)},${num(a.y)} Q${num(corner.x)},${num(corner.y)} ${num(b.x)},${num(b.y)}`;
  }
  return d;
}

/** Point at `percent` of the length of a polyline. */
function pointAlong(points: readonly Point[], percent: number): Point {
  const total = points.slice(1).reduce((sum, p, i) => sum + distance(points[i]!, p), 0);
  let remaining = (total * percent) / 100;
  for (let i = 1; i < points.length; i++) {
    const segment = distance(points[i - 1]!, points[i]!);
    if (remaining <= segment) return towards(points[i - 1]!, points[i]!, remaining);
    remaining -= segment;
  }
  return points.at(-1) ?? { x: 0, y: 0 };
}

function arrowHead(tip: Point, base: Point, length: number): Point[] {
  const ux = (tip.x - base.x) / length;
  const uy = (tip.y - base.y) / length;
  const half = length / 2;
  return [
    tip,
    { x: base.x - uy * half, y: base.y + ux * half },
    { x: base.x + uy * half, y: base.y - ux * half },
  ];
}

/** Where the segment from the centre of `rect` towards `target` leaves the rectangle. */
function exitPoint(rect: Rect, target: Point): Point {
  const c = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  const dx = target.x - c.x;
  const dy = target.y - c.y;
  if (dx === 0 && dy === 0) return c;
  const scale = Math.min(
    dx === 0 ? Infinity : rect.width / 2 / Math.abs(dx),
    dy === 0 ? Infinity : rect.height / 2 / Math.abs(dy),
  );
  return { x: c.x + dx * scale, y: c.y + dy * scale };
}

function drawRelationship(
  key: string,
  relationship: ViewRelationship,
  routed: readonly Point[],
  elkLabel: Rect | undefined,
  rects: ReadonlyMap<string, Rect>,
  shapes: ReadonlyMap<string, Shape>,
  model: Model,
): string {
  const style = resolveRelationshipStyle(relationship, model.styles);
  let points = routed;
  if (style.routing === "direct") {
    const from = rects.get(relationship.from);
    const to = rects.get(relationship.to);
    if (from && to) {
      const centre = (r: Rect): Point => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
      points = [exitPoint(from, centre(to)), exitPoint(to, centre(from))];
    }
  }
  // Endpoints on the drawn outline rather than on the bounding box.
  const clip = (id: string, p: Point): Point => {
    const rect = rects.get(id);
    const shape = shapes.get(id);
    return rect && shape ? onShapeOutline(shape, rect, p) : p;
  };
  points = [clip(relationship.from, points[0]!), ...points.slice(1, -1), clip(relationship.to, points.at(-1)!)];

  const length = arrowLength(style.thickness);
  const tip = points.at(-1)!;
  const beforeTip = points.at(-2) ?? tip;
  const base = towards(tip, beforeTip, length);
  // Bends closer to the tip than the arrowhead would make the line overshoot it: drop them.
  const line = points.slice(0, -1);
  while (line.length > 1 && distance(line.at(-1)!, tip) <= length) line.pop();
  line.push(base);
  const radius = style.routing === "curved" ? Infinity : cornerRadius;
  const head = arrowHead(tip, base, length);

  let label = "";
  const lines = relationshipLines(relationship, style);
  const size = labelSize(lines);
  if (size !== undefined) {
    const useElk = elkLabel !== undefined && style.position === 50 && style.routing !== "direct";
    const centre = useElk
      ? { x: elkLabel.x + elkLabel.width / 2, y: elkLabel.y + elkLabel.height / 2 }
      : pointAlong(points, style.position);
    const box = { x: centre.x - size.width / 2, y: centre.y - size.height / 2, ...size };
    label =
      `<rect x="${num(box.x)}" y="${num(box.y)}" width="${num(box.width)}" height="${num(box.height)}" rx="2"` +
      ` fill="${palette.paper}"/>` +
      drawLines(lines, centre.x, box.y + labelPadding);
  }

  const color = attr(style.color);
  const body =
    `<path d="${roundedPath(line, radius)}" fill="none" stroke="${color}" stroke-width="${num(style.thickness)}"` +
    ` stroke-linejoin="round"${strokeDash(style.style, style.thickness)}/>` +
    `<polygon points="${head.map((p) => `${num(p.x)},${num(p.y)}`).join(" ")}" fill="${color}"/>` +
    label;
  const opacity = style.opacity < 100 ? ` opacity="${num(style.opacity / 100)}"` : "";
  return (
    `<g data-c4-id="${attr(key)}" data-c4-kind="relationship" data-c4-from="${attr(relationship.from)}"` +
    ` data-c4-to="${attr(relationship.to)}"` +
    (relationship.order === undefined ? "" : ` data-c4-order="${relationship.order}"`) +
    `${opacity}>` +
    link(relationship.url, body) +
    `</g>`
  );
}

// ---------------------------------------------------------------------------------------------
// Boundaries and groups

const boundaryTitleFont: Font = { size: boundaryStyle.fontSize, weight: 600 };
const boundaryMetaFont: Font = { size: boundaryStyle.fontSize - 2, weight: 400 };
const groupFont: Font = { size: 12, weight: 600 };

function boundaryLines(element: Element): Line[] {
  return [
    { text: element.name, font: boundaryTitleFont, color: boundaryStyle.color, gap: 0 },
    { text: `[${kindLabels[element.kind]}]`, font: boundaryMetaFont, color: palette.muted, gap: 2 },
  ];
}

function groupLines(name: string): Line[] {
  return [{ text: name, font: groupFont, color: palette.soft, gap: 0 }];
}

/** Space taken by the title of a frame, plus `gap` below it. */
function headerSize(lines: readonly Line[], gap: number): Size {
  return {
    width: Math.ceil(Math.max(...lines.map((l) => measureText(l.text, l.font)))),
    height: Math.ceil(blockHeight(lines) + gap),
  };
}

function drawFrame(rect: Rect, dash: string, stroke: string): string {
  return (
    `<rect x="${num(rect.x)}" y="${num(rect.y)}" width="${num(rect.width)}" height="${num(rect.height)}"` +
    ` rx="${boundaryStyle.radius}" fill="none" stroke="${stroke}" stroke-width="${boundaryStyle.strokeWidth}"` +
    ` stroke-dasharray="${dash}"/>`
  );
}

// ---------------------------------------------------------------------------------------------
// Legend

interface LegendEntry {
  readonly label: string;
  readonly element?: ResolvedElementStyle;
  readonly relationship?: ResolvedRelationshipStyle;
}

const legendFont: Font = { size: 11, weight: 400 };

function legendEntries(view: View, model: Model): LegendEntry[] {
  const kindTags = new Set(Object.values(kindLabels));
  const styledElementTags = new Set(model.styles.elements.map((s) => s.tag));
  const styledRelationshipTags = new Set(model.styles.relationships.map((s) => s.tag));
  const kinds = new Map<string, LegendEntry>();
  const others = new Map<string, LegendEntry>();
  let external: LegendEntry | undefined;

  for (const { id } of view.elements) {
    const element = model.elements.get(id);
    if (!element) continue;
    element.tags.forEach((tag, i) => {
      if (tag === "Element") return;
      const isKind = kindTags.has(tag);
      if (!isKind && !styledElementTags.has(tag)) return;
      const target = isKind ? kinds : others;
      if (target.has(tag)) return;
      const partial = { ...element, external: false, tags: element.tags.slice(0, i + 1) };
      target.set(tag, { label: tag, element: resolveElementStyle(partial, model.styles) });
    });
    if (element.external && external === undefined) {
      const partial = { ...element, tags: element.tags.slice(0, 2) };
      external = { label: "External", element: resolveElementStyle(partial, model.styles) };
    }
  }

  const relationshipEntries = new Map<string, LegendEntry>();
  for (const relationship of view.relationships) {
    relationship.tags.forEach((tag, i) => {
      if (relationshipEntries.has(tag)) return;
      if (tag !== "Relationship" && !styledRelationshipTags.has(tag)) return;
      const partial = { ...relationship, tags: relationship.tags.slice(0, i + 1) };
      relationshipEntries.set(tag, { label: tag, relationship: resolveRelationshipStyle(partial, model.styles) });
    });
  }

  const kindOrder = Object.values(kindLabels);
  const sortedKinds = [...kinds.values()].sort((a, b) => kindOrder.indexOf(a.label) - kindOrder.indexOf(b.label));
  return [...sortedKinds, ...others.values(), ...(external ? [external] : []), ...relationshipEntries.values()];
}

/** Legend laid out in rows under the diagram; returns the markup and its height. */
function drawLegend(entries: readonly LegendEntry[], top: number, width: number): { markup: string; height: number } {
  if (entries.length === 0) return { markup: "", height: 0 };
  const margin = 24;
  const swatch = { width: 40, height: 28 };
  const rowHeight = 36;
  let x = margin;
  let y = top;
  const parts: string[] = [];
  for (const entry of entries) {
    const entryWidth = swatch.width + 8 + measureText(entry.label, legendFont);
    if (x > margin && x + entryWidth > width - margin) {
      x = margin;
      y += rowHeight;
    }
    let mark = "";
    if (entry.element) {
      const { fill, stroke } = elementPaint(entry.element);
      mark = shapeMarkup(entry.element.shape, { x, y, ...swatch }, fill, stroke, 0.45);
    } else if (entry.relationship) {
      const s = entry.relationship;
      const cy = y + swatch.height / 2;
      const tip = { x: x + swatch.width, y: cy };
      const length = arrowLength(s.thickness);
      const base = { x: tip.x - length, y: cy };
      mark =
        `<path d="M${num(x)},${num(cy)} H${num(base.x)}" stroke="${attr(s.color)}"` +
        ` stroke-width="${num(s.thickness)}"${strokeDash(s.style, s.thickness)}/>` +
        `<polygon points="${arrowHead(tip, base, length).map((p) => `${num(p.x)},${num(p.y)}`).join(" ")}" fill="${attr(s.color)}"/>`;
    }
    const text = drawLines(
      [{ text: entry.label, font: legendFont, color: palette.ink, gap: 0 }],
      x + swatch.width + 8,
      y + (swatch.height - lineHeight(legendFont)) / 2,
      "start",
    );
    parts.push(`<g data-c4-legend="${attr(entry.label)}">${mark}${text}</g>`);
    x += entryWidth + 24;
  }
  return {
    markup: `<g data-c4-id="legend" data-c4-kind="legend">${parts.join("")}</g>`,
    height: y + rowHeight - top + 8,
  };
}

// ---------------------------------------------------------------------------------------------
// View

export interface RenderedSvg {
  readonly svg: string;
  readonly layout: DiagramLayout;
}

/** Links to other views of the same page, provided by the HTML page (a standalone SVG has none). */
export interface ViewLinks {
  /** Target of an element (`#key` of a more detailed view); it replaces the element's `url`. */
  readonly element?: (id: string) => string | undefined;
  /** Target of a boundary header (`#key` of the enclosing, less detailed view). */
  readonly boundary?: (id: string) => string | undefined;
}

export async function renderViewSvg(model: Model, view: View, links: ViewLinks = {}): Promise<RenderedSvg> {
  const boxes = new Map<string, ElementBox>();
  for (const { id, role } of view.elements) {
    const element = model.elements.get(id);
    if (!element) throw new Error(`element "${id}" not found`);
    boxes.set(id, elementBox(element, role, model));
  }
  const labelLines = new Map(view.relationships.map((r) => [r, relationshipLines(r, resolveRelationshipStyle(r, model.styles))]));

  const layout = await layoutView(view, {
    element: (id) => boxes.get(id)!.size,
    relationshipLabel: (r) => labelSize(labelLines.get(r) ?? []),
    boundaryHeader: (id) => {
      const element = model.elements.get(id);
      return element === undefined ? { width: 0, height: 0 } : headerSize(boundaryLines(element), 8);
    },
    groupHeader: (name) => headerSize(groupLines(name), 4),
  });

  const rects = new Map(layout.elements.map((e) => [e.id, e as Rect]));
  const shapes = new Map([...boxes].map(([id, box]) => [id, box.style.shape]));
  const parts: string[] = [`<rect width="100%" height="100%" fill="${palette.paper}"/>`];

  for (const boundary of layout.boundaries) {
    const element = model.elements.get(boundary.id);
    if (!element) continue;
    parts.push(
      `<g data-c4-id="${attr(boundary.id)}" data-c4-kind="boundary">` +
        drawFrame(boundary, boundaryStyle.dashArray, boundaryStyle.stroke) +
        boundaryHeader(drawLines(boundaryLines(element), boundary.x + 16, boundary.y + 12, "start"), links.boundary?.(boundary.id)) +
        `</g>`,
    );
  }
  for (const group of layout.groups) {
    parts.push(
      `<g data-c4-id="${attr(group.name)}" data-c4-kind="group"` +
        (group.boundary === undefined ? "" : ` data-c4-boundary="${attr(group.boundary)}"`) +
        `>` +
        drawFrame(group, "1 3", palette.soft) +
        drawLines(groupLines(group.name), group.x + 12, group.y + 8, "start") +
        `</g>`,
    );
  }
  for (const positioned of layout.elements) parts.push(drawElement(boxes.get(positioned.id)!, positioned, links.element?.(positioned.id)));
  for (const r of layout.relationships) {
    parts.push(drawRelationship(r.key, r.relationship, r.points, r.label, rects, shapes, model));
  }

  const width = Math.max(layout.width, 320);
  const legend = drawLegend(legendEntries(view, model), layout.height, width);
  const height = layout.height + legend.height;
  parts.push(legend.markup);

  const title = view.definition.title ?? view.definition.key;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${num(width)} ${num(height)}" width="${num(width)}"` +
    ` height="${num(height)}" role="img" aria-label="${attr(title)}" data-c4-view="${attr(view.definition.key)}">` +
    parts.join("") +
    `</svg>`;
  return { svg, layout };
}

// ---------------------------------------------------------------------------------------------
// Helpers

/** Only http(s) links are produced (the schema already restricts `url`; this guards other inputs). */
function link(url: string | undefined, body: string): string {
  if (url === undefined || !/^https?:\/\//i.test(url)) return body;
  return `<a href="${attr(url)}" target="_blank" rel="noopener noreferrer">${body}</a>`;
}

/** Link to an anchor of the page: same tab, no external resource. */
function internalLink(href: string, body: string): string {
  return `<a href="${attr(href)}">${body}</a>`;
}

function boundaryHeader(header: string, href: string | undefined): string {
  return href === undefined ? header : internalLink(href, header);
}

function num(n: number): string {
  return String(Math.round(n * 100) / 100);
}

export function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function attr(text: string): string {
  return esc(text).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
