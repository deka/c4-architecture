// Textual summary of a model: what each view shows, plus modelling warnings.
// Lets an agent "read" its diagrams without looking at the SVG.
import { formatSource, type Element, type Model, type Relationship } from "./model.ts";
import { computeViewFromDefinition } from "./views.ts";

/** Above this many elements, a view is hard to read. */
export const crowdedViewThreshold = 20;

export type WarningCode =
  | "no-views"
  | "missing-description"
  | "missing-technology"
  | "missing-relationship-description"
  | "missing-relationship-technology"
  | "not-in-any-view"
  | "crowded-view";

export interface Warning {
  readonly code: WarningCode;
  /** Element id, view key or `from->to` for a relationship. */
  readonly target: string;
  /** File and JSON Pointer of the declaration, when known. */
  readonly location: string | undefined;
  readonly message: string;
}

export interface ViewSummary {
  readonly key: string;
  readonly type: string;
  readonly scope: string | undefined;
  readonly title: string | undefined;
  readonly elements: readonly string[];
  /** `from->to`, implied relationships included. */
  readonly relationships: readonly string[];
  /** Dynamic views only: the steps in order. */
  readonly steps?: readonly StepSummary[];
}

export interface StepSummary {
  readonly order: number;
  readonly from: string;
  readonly to: string;
  readonly description: string | undefined;
}

export interface InspectReport {
  readonly name: string | undefined;
  readonly counts: {
    readonly people: number;
    readonly softwareSystems: number;
    readonly containers: number;
    readonly components: number;
    readonly relationships: number;
    readonly views: number;
  };
  readonly views: readonly ViewSummary[];
  readonly warnings: readonly Warning[];
}

export function inspectModel(model: Model): InspectReport {
  const elements = [...model.elements.values()];
  const declared = model.relationships.filter((r) => !r.implied);
  const count = (kind: Element["kind"]): number => elements.filter((e) => e.kind === kind).length;

  const shown = new Set<string>();
  const views: ViewSummary[] = model.views.map((definition) => {
    const view = computeViewFromDefinition(model, definition);
    for (const e of view.elements) shown.add(e.id);
    for (const b of view.boundaries) shown.add(b.id);
    return {
      key: definition.key,
      type: definition.type,
      scope: definition.scope,
      title: definition.title,
      elements: view.elements.map((e) => e.id),
      relationships: view.relationships.map(pair),
      ...(definition.type === "dynamic"
        ? {
            steps: view.relationships.map((r, i) => ({
              order: r.order ?? i + 1,
              from: r.from,
              to: r.to,
              description: r.description,
            })),
          }
        : {}),
    };
  });

  const warnings: Warning[] = [];
  const warnElement = (code: WarningCode, e: Element, message: string): void => {
    warnings.push({ code, target: e.id, location: formatSource(e.source), message });
  };

  if (model.views.length === 0) {
    warnings.push({ code: "no-views", target: "/views", location: undefined, message: "no view is declared: nothing will be drawn" });
  }
  for (const e of elements) {
    if (e.description === undefined) warnElement("missing-description", e, `${e.kind} "${e.id}" has no description`);
    if ((e.kind === "container" || e.kind === "component") && e.technology === undefined) {
      warnElement("missing-technology", e, `${e.kind} "${e.id}" has no technology`);
    }
    if (model.views.length > 0 && !shown.has(e.id)) {
      warnElement("not-in-any-view", e, `${e.kind} "${e.id}" appears in no view`);
    }
  }
  for (const r of declared) {
    if (r.description === undefined) {
      warnings.push({ code: "missing-relationship-description", target: pair(r), location: undefined, message: `relationship ${pair(r)} has no description` });
    }
    if (r.technology === undefined && crossesProcess(model, r)) {
      warnings.push({ code: "missing-relationship-technology", target: pair(r), location: undefined, message: `relationship ${pair(r)} crosses a process boundary but has no technology` });
    }
  }
  for (const v of views) {
    if (v.elements.length > crowdedViewThreshold) {
      const definition = model.views.find((d) => d.key === v.key)!;
      warnings.push({
        code: "crowded-view",
        target: v.key,
        location: formatSource(definition.source),
        message: `view "${v.key}" shows ${v.elements.length} elements (more than ${crowdedViewThreshold}): split it or exclude elements`,
      });
    }
  }

  return {
    name: model.name,
    counts: {
      people: count("person"),
      softwareSystems: count("softwareSystem"),
      containers: count("container"),
      components: count("component"),
      relationships: declared.length,
      views: model.views.length,
    },
    views,
    warnings,
  };
}

function pair(r: Relationship): string {
  return `${r.from}->${r.to}`;
}

/**
 * Between containers or components of different containers, a relationship crosses a process
 * boundary and should say how they talk (protocol, format). Inside one container, it is a call.
 */
function crossesProcess(model: Model, r: Relationship): boolean {
  const from = model.elements.get(r.from);
  const to = model.elements.get(r.to);
  if (from === undefined || to === undefined) return false;
  const technical = (e: Element): boolean => e.kind === "container" || e.kind === "component";
  if (!technical(from) || !technical(to)) return false;
  return !(from.kind === "component" && to.kind === "component" && from.parent === to.parent);
}

/** Human- and agent-readable rendering of a report. */
export function formatReport(report: InspectReport): string {
  const c = report.counts;
  const lines = [
    `Workspace: ${report.name ?? "(unnamed)"}`,
    `Elements: ${c.people} people, ${c.softwareSystems} software systems, ${c.containers} containers, ${c.components} components; ${c.relationships} relationships; ${c.views} views`,
  ];
  for (const v of report.views) {
    lines.push("", `View "${v.key}" (${v.type}${v.scope === undefined ? "" : `, scope ${v.scope}`})${v.title === undefined ? "" : `: ${v.title}`}`);
    lines.push(`  elements (${v.elements.length}): ${v.elements.join(", ") || "none"}`);
    if (v.steps === undefined) {
      lines.push(`  relationships (${v.relationships.length}): ${v.relationships.join(", ") || "none"}`);
    } else {
      lines.push(`  steps (${v.steps.length}):`);
      for (const s of v.steps) {
        lines.push(`    ${s.order}. ${s.from} -> ${s.to}${s.description === undefined ? "" : `: ${s.description}`}`);
      }
    }
  }
  lines.push("", report.warnings.length === 0 ? "No warnings." : `Warnings (${report.warnings.length}):`);
  for (const w of report.warnings) {
    lines.push(`  [${w.code}] ${w.message}${w.location === undefined ? "" : ` at ${w.location}`}`);
  }
  return lines.join("\n") + "\n";
}
