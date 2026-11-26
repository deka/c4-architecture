// Steps for the inspection report and the command line.
// Step phrases are in French to match the feature files.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Then, When, type DataTable } from "@cucumber/cucumber";
import { inspectModel, type InspectReport } from "../../src/inspect.ts";
import { quoted, show, type C4World } from "./world.ts";

const cli = join(import.meta.dirname, "..", "..", "src", "cli.ts");

// --- Inspection --------------------------------------------------------------

When("j'inspecte le workspace", function (this: C4World) {
  this.report = inspectModel(this.model());
});

function report(world: C4World): InspectReport {
  assert.ok(world.report, "no inspection was run");
  return world.report;
}

Then("l'inspection signale {string} sur {string}", function (this: C4World, code: string, target: string) {
  const warnings = report(this).warnings;
  assert.ok(warnings.some((w) => w.code === code && w.target === target), `warnings: ${show(warnings)}`);
});

Then("l'inspection ne signale pas {string}", function (this: C4World, code: string) {
  const found = report(this).warnings.filter((w) => w.code === code);
  assert.deepEqual(found, [], `unexpected ${code} warnings`);
});

Then("l'inspection ne signale aucun avertissement", function (this: C4World) {
  assert.deepEqual(report(this).warnings, []);
});

Then("le résumé de la vue {string} liste les éléments {}", function (this: C4World, key: string, list: string) {
  const view = report(this).views.find((v) => v.key === key);
  assert.ok(view, `view "${key}" missing from the report`);
  assert.deepEqual([...view.elements].sort(), quoted(list).sort());
});

Then("le résumé de la vue {string} liste les étapes :", function (this: C4World, key: string, table: DataTable) {
  const view = report(this).views.find((v) => v.key === key);
  assert.ok(view, `view "${key}" missing from the report`);
  assert.deepEqual(
    view.steps?.map((s) => ({ ordre: String(s.order), de: s.from, vers: s.to, description: s.description ?? "" })),
    table.hashes(),
  );
});

// --- Command line ------------------------------------------------------------

function runCli(world: C4World, args: readonly string[]): void {
  const result = spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
  world.run = { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

/** Writes the docstring workspace to a temporary file, as an agent would. */
function workspaceFile(world: C4World): string {
  const file = join(mkdtempSync(join(tmpdir(), "c4-cli-")), "workspace.json");
  writeFileSync(file, JSON.stringify(world.input));
  return file;
}

const splitArgs = (args: string): string[] => args.split(" ").filter((a) => a !== "");

When("je lance {string} sur le workspace", function (this: C4World, args: string) {
  const [command, ...options] = splitArgs(args);
  runCli(this, [command!, workspaceFile(this), ...options]);
});

When("je lance {string} sur le fichier {string}", function (this: C4World, args: string, file: string) {
  const [command, ...options] = splitArgs(args);
  runCli(this, [command!, file, ...options]);
});

When("je lance {string}", function (this: C4World, args: string) {
  runCli(this, splitArgs(args));
});

function lastRun(world: C4World): NonNullable<C4World["run"]> {
  assert.ok(world.run, "no command was run");
  return world.run;
}

Then("la commande se termine avec le code {int}", function (this: C4World, code: number) {
  const run = lastRun(this);
  assert.equal(run.status, code, `stdout: ${run.stdout}\nstderr: ${run.stderr}`);
});

Then("la sortie standard contient {string}", function (this: C4World, text: string) {
  assert.ok(lastRun(this).stdout.includes(text), `stdout: ${lastRun(this).stdout}`);
});

Then("la sortie d'erreur contient {string}", function (this: C4World, text: string) {
  assert.ok(lastRun(this).stderr.includes(text), `stderr: ${lastRun(this).stderr}`);
});

Then("la sortie d'erreur est vide", function (this: C4World) {
  assert.equal(lastRun(this).stderr, "");
});

function jsonOutput(world: C4World): { ok: boolean; errors?: { path: string }[]; warnings?: { code: string }[] } {
  const { stdout } = lastRun(world);
  try {
    return JSON.parse(stdout);
  } catch {
    assert.fail(`stdout is not JSON: ${stdout}`);
  }
}

Then("la sortie JSON indique un modèle valide", function (this: C4World) {
  assert.equal(jsonOutput(this).ok, true);
});

Then("la sortie JSON indique une erreur sur {string}", function (this: C4World, path: string) {
  const output = jsonOutput(this);
  assert.equal(output.ok, false);
  assert.ok(output.errors?.some((e) => e.path === path), `errors: ${show(output.errors)}`);
});

Then("la sortie JSON signale {string}", function (this: C4World, code: string) {
  const output = jsonOutput(this);
  assert.ok(output.warnings?.some((w) => w.code === code), `warnings: ${show(output.warnings)}`);
});
