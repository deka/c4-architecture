// Command line entry point, meant to be driven by agents as well as humans.
// Exit codes: 0 success, 1 invalid model, 2 usage error.
import { writeFileSync } from "node:fs";
import { formatReport, inspectModel } from "./inspect.ts";
import { loadWorkspaceFile } from "./load.ts";
import type { Model, ValidationError } from "./model.ts";
import { renderHtml } from "./render-html.ts";

const usage = `usage: node src/cli.ts <command> [options]

commands:
  validate <model.json> [--json]     check the model (schema + semantic rules)
  inspect <model.json> [--json]      validate, then summarise each view and list modelling warnings
  render <model.json> [output.html]  validate, then write the HTML page (stdout without output file)

options:
  --json   machine-readable output on stdout
  --help   show this help

exit codes: 0 success, 1 invalid model, 2 usage error
errors are written to stderr as "<file>: <JSON Pointer>: <message>" (or as JSON with --json, on stdout)
`;

const args = process.argv.slice(2);
const json = args.includes("--json");
const positional = args.filter((a) => !a.startsWith("--"));
const unknownOptions = args.filter((a) => a.startsWith("--") && a !== "--json" && a !== "--help");
const [command, input, output] = positional;

if (args.includes("--help") || args.length === 0) {
  process.stdout.write(usage);
  process.exit(args.length === 0 ? 2 : 0);
}
if (unknownOptions.length > 0) fail(`unknown option: ${unknownOptions.join(", ")}`);
if (command !== "validate" && command !== "inspect" && command !== "render") fail(`unknown command: ${command}`);
if (input === undefined) fail(`missing model file for "${command}"`);
if (command !== "render" && output !== undefined) fail(`unexpected argument: ${output}`);
if (command === "render" && json) fail(`--json is not supported by "render"`);

const result = loadWorkspaceFile(input);
if (!result.ok) {
  reportErrors(input, result.errors);
  // exitCode rather than exit(): lets a piped stdout flush completely.
  process.exitCode = 1;
} else {
  await run(result.model);
}

async function run(model: Model): Promise<void> {
  switch (command) {
    case "validate":
      if (json) printJson({ ok: true, errors: [] });
      else process.stdout.write(`${input}: valid\n`);
      break;
    case "inspect": {
      const report = inspectModel(model);
      if (json) printJson({ ok: true, ...report });
      else process.stdout.write(formatReport(report));
      break;
    }
    case "render": {
      const html = await renderHtml(model);
      if (output === undefined) process.stdout.write(html);
      else writeFileSync(output, html);
      break;
    }
  }
}

function reportErrors(file: string, errors: readonly ValidationError[]): void {
  if (json) {
    printJson({ ok: false, errors: errors.map((e) => ({ file: e.file ?? file, path: e.path, message: e.message })) });
  } else {
    for (const e of errors) process.stderr.write(`${e.file ?? file}: ${e.path}: ${e.message}\n`);
  }
}

function printJson(value: unknown): void {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
}

function fail(message: string): never {
  process.stderr.write(`${message}\n\n${usage}`);
  process.exit(2);
}
