// Assembles every view of a model into one self-contained HTML page: no script, no external resource.
// The page behaves as a viewer: a sidebar lists the views per software system, one view is shown at a time
// (the one targeted by the URL fragment, the first declared view by default), and navigation stays inside
// the model: elements zoom into their detailed view, breadcrumbs and boundary headers zoom back out.
import type { Model, ViewDefinition, ViewType } from "./model.ts";
import { attr, esc, renderViewSvg, type ViewLinks } from "./render-svg.ts";
import { fontCss, fontStack } from "./text.ts";
import { palette } from "./theme.ts";
import { computeViewFromDefinition } from "./views.ts";

const accent = "#dfeaf8";

const pageCss = `
*{box-sizing:border-box}
body{margin:0;background:${palette.paper};color:${palette.ink};font-family:${fontStack};font-kerning:none;line-height:1.5;
  display:grid;grid-template-columns:280px minmax(0,1fr);min-height:100vh}
a{color:inherit}
aside{position:sticky;top:0;height:100vh;overflow-y:auto;padding:24px 16px 32px;border-right:1px solid ${palette.rule};background:${palette.surface}}
aside header{padding:0 8px 16px;margin:0 0 8px;border-bottom:1px solid ${palette.rule}}
h1{font-size:18px;font-weight:600;margin:0}
aside header p{margin:4px 0 0;font-size:13px;color:${palette.muted}}
nav h2{font-size:11px;font-weight:600;margin:16px 8px 4px;color:${palette.muted};text-transform:uppercase;letter-spacing:.06em}
nav ul{list-style:none;margin:0;padding:0}
nav a{display:block;padding:3px 8px;border-radius:6px;text-decoration:none;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
nav a:hover{background:${palette.paper}}
nav .system>a{font-weight:600}
nav .system>ul{display:none;margin:0 0 6px 10px;padding-left:6px;border-left:1px solid ${palette.rule}}
nav .system>ul a{color:${palette.muted}}
nav .kind{display:block;margin:6px 8px 0;font-size:11px;color:${palette.soft}}
main{padding:24px 40px 48px;min-width:0}
section{display:none;scroll-margin-top:24px}
section:target,main:not(:has(section:target))>section:first-child{display:block}
.breadcrumb{display:flex;flex-wrap:wrap;gap:0 6px;margin:0 0 8px;padding:0;list-style:none;font-size:13px;color:${palette.muted}}
.breadcrumb li+li::before{content:"›";margin-right:6px}
.breadcrumb a{text-decoration:none}
.breadcrumb a:hover{text-decoration:underline}
.level{font-size:11px;font-weight:600;color:${palette.soft};text-transform:uppercase;letter-spacing:.06em;margin:0}
section h2{font-size:22px;font-weight:600;margin:0 0 4px}
section>p{margin:0;color:${palette.muted}}
figure{margin:20px 0 0;overflow-x:auto}
svg{display:block;max-width:100%;height:auto}
svg a{cursor:pointer}
svg a:hover{opacity:.8}
@media (max-width:900px){
  body{display:block}
  aside{position:static;height:auto;border-right:0;border-bottom:1px solid ${palette.rule}}
  main{padding:24px 16px}
}
@media print{
  body{display:block}
  aside{display:none}
  section{display:block!important;break-before:page}
}
`;

const levelLabels: Record<ViewType, string> = {
  systemLandscape: "System landscape",
  systemContext: "System context",
  container: "Container view",
  component: "Component view",
  dynamic: "Dynamic view",
};

export async function renderHtml(model: Model): Promise<string> {
  const title = model.name ?? "C4 model";
  const sections: string[] = [];
  for (const definition of model.views) {
    const view = computeViewFromDefinition(model, definition);
    const { svg } = await renderViewSvg(model, view, viewLinks(model, definition));
    sections.push(
      `<section id="${attr(definition.key)}" data-c4-view="${attr(definition.key)}">` +
        breadcrumb(model, definition) +
        `<p class="level">${levelLabels[definition.type]}</p>` +
        `<h2>${esc(heading(definition))}</h2>` +
        (definition.description === undefined ? "" : `<p>${esc(definition.description)}</p>`) +
        `<figure>${svg}</figure>` +
        `</section>`,
    );
  }
  const navigation = navigationTree(model);
  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:">`,
    `<title>${esc(title)}</title>`,
    `<style>${fontCss()}\n${pageCss}\n${navigation.css}</style>`,
    "</head>",
    "<body>",
    "<aside>",
    "<header>",
    `<h1>${esc(title)}</h1>`,
    model.description === undefined ? "" : `<p>${esc(model.description)}</p>`,
    "</header>",
    navigation.html,
    "</aside>",
    `<main>${sections.join("\n")}</main>`,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

function heading(definition: ViewDefinition): string {
  return definition.title ?? definition.key;
}

// ---------------------------------------------------------------------------------------------
// Sidebar

/** Software system a view belongs to in the sidebar; undefined for the overview (landscape, unscoped dynamic). */
function systemOf(model: Model, definition: ViewDefinition): string | undefined {
  const { type, scope } = definition;
  if (scope === undefined || type === "systemLandscape") return undefined;
  const element = model.elements.get(scope);
  if (element === undefined) return undefined;
  return element.kind === "softwareSystem" ? element.id : element.parent;
}

const staticOrder: readonly ViewType[] = ["systemContext", "container", "component"];

/**
 * Sidebar label of a view: the level (context, containers) or the container name (components), short
 * because the system is already the enclosing entry; the title when several views share the same scope and type.
 */
function shortLabel(model: Model, definition: ViewDefinition): string {
  const twins = model.views.filter((v) => v.type === definition.type && v.scope === definition.scope);
  if (twins.length > 1 || definition.type === "dynamic") return heading(definition);
  if (definition.type === "systemContext") return "Context";
  if (definition.type === "container") return "Containers";
  return model.elements.get(definition.scope!)?.name ?? heading(definition);
}

function navLink(definition: ViewDefinition, label: string): string {
  return `<li><a href="#${attr(definition.key)}" data-nav="${attr(definition.key)}" title="${attr(heading(definition))}">${esc(label)}</a></li>`;
}

/**
 * Sidebar tree: an overview (landscape and unscoped dynamic views), then one entry per software system,
 * in model order. A system's views are listed only while one of them is shown; this, and the highlight
 * of the current view, is done in CSS with `:has(:target)`, since the page has no script.
 */
function navigationTree(model: Model): { html: string; css: string } {
  const css: string[] = [];
  const parts: string[] = [];
  const first = model.views[0];
  const mark = (definition: ViewDefinition, system: string | undefined): void => {
    const states = [`body:has([id="${definition.key}"]:target)`];
    if (definition === first) states.push("body:not(:has(section:target))");
    for (const state of states) {
      css.push(`${state} [data-nav="${definition.key}"]{background:${accent};color:${palette.ink};font-weight:600}`);
      if (system !== undefined) css.push(`${state} [data-system="${system}"]>ul{display:block}`);
    }
  };

  const overview = model.views.filter((v) => systemOf(model, v) === undefined);
  if (overview.length > 0) {
    parts.push(`<h2>Overview</h2><ul>${overview.map((v) => navLink(v, heading(v))).join("")}</ul>`);
    for (const v of overview) mark(v, undefined);
  }

  const systems = [...model.elements.values()].filter((e) => e.kind === "softwareSystem");
  const entries: string[] = [];
  for (const system of systems) {
    const views = model.views.filter((v) => systemOf(model, v) === system.id);
    if (views.length === 0) continue;
    const statics = staticOrder.flatMap((type) => views.filter((v) => v.type === type));
    const dynamics = views.filter((v) => v.type === "dynamic");
    const main = statics[0] ?? dynamics[0]!;
    entries.push(
      `<li class="system" data-system="${attr(system.id)}">` +
        `<a href="#${attr(main.key)}">${esc(system.name)}</a>` +
        `<ul>` +
        statics.map((v) => navLink(v, shortLabel(model, v))).join("") +
        (dynamics.length === 0 ? "" : `<li class="kind">Dynamic</li>` + dynamics.map((v) => navLink(v, heading(v))).join("")) +
        `</ul>` +
        `</li>`,
    );
    for (const v of views) mark(v, system.id);
  }
  if (entries.length > 0) parts.push(`<h2>Software systems</h2><ul>${entries.join("")}</ul>`);

  return { html: parts.length === 0 ? "" : `<nav aria-label="Views">${parts.join("")}</nav>`, css: css.join("\n") };
}

// ---------------------------------------------------------------------------------------------
// Zooming in and out

/** Breadcrumb from the widest view down to `definition`: each step is the parent view of the next one. */
function breadcrumb(model: Model, definition: ViewDefinition): string {
  const chain: ViewDefinition[] = [];
  for (let v = parentView(model, definition); v !== undefined && !chain.includes(v); v = parentView(model, v)) {
    chain.unshift(v);
  }
  if (chain.length === 0) return "";
  const items = chain.map((v) => `<li><a href="#${attr(v.key)}">${esc(heading(v))}</a></li>`);
  items.push(`<li aria-current="page">${esc(heading(definition))}</li>`);
  return `<ol class="breadcrumb" aria-label="Breadcrumb">${items.join("")}</ol>`;
}

/** First declared view of one of the given types, in order of preference, scoped on `scope`. */
function findView(
  model: Model,
  types: readonly ViewType[],
  scope: string | undefined,
  except: ViewDefinition,
): ViewDefinition | undefined {
  for (const type of types) {
    const found = model.views.find((v) => v.type === type && v !== except && (scope === undefined || v.scope === scope));
    if (found) return found;
  }
  return undefined;
}

/** Zooming in: a software system opens its container view (or context view), a container its component view. */
function detailView(model: Model, id: string, current: ViewDefinition): ViewDefinition | undefined {
  switch (model.elements.get(id)?.kind) {
    case "softwareSystem":
      return findView(model, ["container", "systemContext"], id, current);
    case "container":
      return findView(model, ["component"], id, current);
    default:
      return undefined;
  }
}

/** Zooming out: the view one level wider than `definition`, if the model declares one. */
function parentView(model: Model, definition: ViewDefinition): ViewDefinition | undefined {
  const { type, scope } = definition;
  const landscape = (): ViewDefinition | undefined => findView(model, ["systemLandscape"], undefined, definition);
  const scopeKind = scope === undefined ? undefined : model.elements.get(scope)?.kind;
  if (type === "systemContext") return landscape();
  if (type === "container" || (type === "dynamic" && scopeKind === "softwareSystem")) {
    return findView(model, ["systemContext"], scope, definition) ?? landscape();
  }
  if (type === "component" || (type === "dynamic" && scopeKind === "container")) {
    const system = model.elements.get(scope!)?.parent;
    return findView(model, ["container"], system, definition) ?? findView(model, ["systemContext"], system, definition) ?? landscape();
  }
  if (type === "dynamic") return landscape();
  return undefined;
}

function viewLinks(model: Model, definition: ViewDefinition): ViewLinks {
  const anchor = (v: ViewDefinition | undefined): string | undefined => (v === undefined ? undefined : `#${v.key}`);
  return {
    element: (id) => anchor(detailView(model, id, definition)),
    // A boundary header leads to the view where the bounded element is a box, one level up.
    boundary: (id) => {
      const kind = model.elements.get(id)?.kind;
      if (kind === "softwareSystem") return anchor(findView(model, ["systemContext"], id, definition) ?? parentView(model, definition));
      return anchor(parentView(model, definition));
    },
  };
}
