// Renders every examples/*.json into output/<name>.html.
// Invalid models are reported and skipped; the exit code is 1 if any failed.
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { loadWorkspaceFile } from "../src/load.ts";
import { renderHtml } from "../src/render-html.ts";

const root = join(import.meta.dirname, "..");
const examplesDir = join(root, "examples");
const outputDir = join(root, "output");
mkdirSync(outputDir, { recursive: true });

const files = readdirSync(examplesDir)
  .filter((f) => f.endsWith(".json"))
  .sort();
let failed = 0;
for (const file of files) {
  const input = join(examplesDir, file);
  const result = loadWorkspaceFile(input);
  if (!result.ok) {
    failed++;
    for (const e of result.errors) process.stderr.write(`${e.file ?? input}: ${e.path}: ${e.message}\n`);
    continue;
  }
  const output = join(outputDir, `${basename(file, ".json")}.html`);
  writeFileSync(output, await renderHtml(result.model));
  process.stdout.write(`examples/${file} -> output/${basename(output)}\n`);
}
process.stdout.write(`${files.length - failed}/${files.length} rendered\n`);
if (failed > 0) process.exit(1);
