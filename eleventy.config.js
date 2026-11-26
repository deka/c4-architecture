// Documentation site (GitHub Pages). Diagrams are rendered by the runtime itself at build time,
// and the schema reference is generated from schema/c4.schema.json, so neither can drift from the code.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { HtmlBasePlugin, IdAttributePlugin } from "@11ty/eleventy";
import { loadWorkspaceFile } from "./src/load.ts";
import { renderHtml } from "./src/render-html.ts";
import { esc, renderViewSvg } from "./src/render-svg.ts";
import { computeViewFromDefinition } from "./src/views.ts";
import { schemaReference } from "./site/_lib/schema-reference.js";

const root = import.meta.dirname;

/** Models shown in the documentation: the repository examples and the site's own models. */
const modelFiles = [
  ...readdirSync(join(root, "examples")).map((f) => join(root, "examples", f)),
  ...readdirSync(join(root, "site/models")).map((f) => join(root, "site/models", f)),
].filter((f) => f.endsWith(".json"));

/** name -> { file, source, model, views: key -> svg }. Fails the build on an invalid model. */
async function renderModels() {
  const models = new Map();
  for (const file of modelFiles) {
    const name = basename(file, ".json");
    if (models.has(name)) throw new Error(`two documentation models are named "${name}"`);
    const result = loadWorkspaceFile(file);
    if (!result.ok) {
      const errors = result.errors.map((e) => `  ${e.file ?? file}: ${e.path}: ${e.message}`).join("\n");
      throw new Error(`invalid documentation model ${relative(root, file)}:\n${errors}`);
    }
    const views = new Map();
    for (const definition of result.model.views) {
      const { svg } = await renderViewSvg(result.model, computeViewFromDefinition(result.model, definition));
      views.set(definition.key, svg);
    }
    models.set(name, { file: relative(root, file), source: readFileSync(file, "utf8"), model: result.model, views });
  }
  return models;
}

/** Minimal JSON highlighting: keys, strings, numbers and literals. Input is HTML-escaped (quotes kept). */
function highlightJson(escaped) {
  return escaped.replace(
    /("(?:[^"\\]|\\.)*")(\s*:)?|\b(true|false|null)\b|(-?\b\d+(?:\.\d+)?\b)/g,
    (match, string, colon, literal, number) => {
      if (string !== undefined) return colon ? `<span class="k">${string}</span>${colon}` : `<span class="s">${string}</span>`;
      if (literal !== undefined) return `<span class="l">${literal}</span>`;
      return `<span class="n">${number}</span>`;
    },
  );
}

export default async function (config) {
  // Re-rendered before every build, watch rebuilds included.
  let models = new Map();
  config.on("eleventy.before", async () => {
    models = await renderModels();
  });
  const model = (name) => {
    const found = models.get(name);
    if (!found) throw new Error(`unknown documentation model "${name}"`);
    return found;
  };

  // Every repository example is also published as the page the runtime renders (examples/<name>.html):
  // a self-contained file, outside the site layout.
  config.on("eleventy.after", async ({ directories }) => {
    const outputDir = join(directories.output, "examples");
    mkdirSync(outputDir, { recursive: true });
    for (const [name, { file, model }] of models) {
      if (file.startsWith("examples/")) writeFileSync(join(outputDir, `${name}.html`), await renderHtml(model));
    }
  });

  // Eleventy's dependency scan (acorn) cannot parse TypeScript: watch the inputs explicitly.
  // A change in src/ still needs a restart of `npm run docs:serve`, as ES modules are cached.
  config.setWatchJavaScriptDependencies(false);
  for (const dir of ["examples/", "site/models/", "schema/"]) config.addWatchTarget(dir);

  config.addPlugin(HtmlBasePlugin);
  config.addPlugin(IdAttributePlugin);
  config.addPassthroughCopy({ "site/assets": "assets" });
  config.addPassthroughCopy({ "assets/fonts/*.woff2": "assets/fonts" });
  config.addPassthroughCopy({ "schema/c4.schema.json": "c4.schema.json" });
  config.addGlobalData("schema", schemaReference(JSON.parse(readFileSync(join(root, "schema/c4.schema.json"), "utf8"))));

  // Output stays on one line: markdown-it would otherwise wrap or re-parse the SVG.
  config.addShortcode("diagram", (name, key, caption) => {
    const svg = model(name).views.get(key);
    if (svg === undefined) throw new Error(`model "${name}" has no view "${key}"`);
    const figcaption = caption ? `<figcaption>${esc(caption)}</figcaption>` : "";
    return `<figure class="diagram">${svg.replaceAll("\n", " ")}${figcaption}</figure>`;
  });

  // JSON source of a model, highlighted. With `collapsed`, wrapped in a <details> element.
  config.addShortcode("source", (name, collapsed) => {
    const { file, source } = model(name);
    const code = `<pre class="json"><code>${highlightJson(esc(source.trimEnd())).replaceAll("\n", "&#10;")}</code></pre>`;
    const label = `<span class="file">${esc(file)}</span>`;
    return collapsed
      ? `<details class="source"><summary>JSON source: ${label}</summary>${code}</details>`
      : `<div class="source">${label}${code}</div>`;
  });

  config.addFilter("githubUrl", (path) => `https://github.com/deka/c4-architecture/blob/main/${path}`);

  return {
    dir: { input: "site", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["md", "njk"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    pathPrefix: process.env.PATH_PREFIX ?? "/c4-architecture/",
  };
}
