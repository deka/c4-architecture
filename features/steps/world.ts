// State shared by the steps of one scenario (a fresh world per scenario).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { World, setWorldConstructor } from "@cucumber/cucumber";
import { loadWorkspace, loadWorkspaceFile } from "../../src/load.ts";
import type { LoadResult, Model, ValidationError } from "../../src/model.ts";
import type { InspectReport } from "../../src/inspect.ts";
import type { View } from "../../src/views.ts";
import type { ReviewStep } from "./review.ts";

export class C4World extends World {
  /** In-memory workspace (from a docstring or an example file). */
  input: unknown;
  /** File `input` was read from, to resolve its includes. */
  inputFile: string | undefined;
  /** Virtual file system for the include scenarios. */
  readonly files = new Map<string, string>();
  result: LoadResult | undefined;
  view: View | undefined;
  /** Last drawn view. */
  svg: string | undefined;
  /** Drawings of this scenario that differ from their approved reference. */
  readonly unapproved: string[] = [];
  /** Last inspection report. */
  report: InspectReport | undefined;
  /** Last command line run. */
  run: { status: number | null; stdout: string; stderr: string } | undefined;
  /** Scenario being run, shown next to its drawing on the review page. */
  scenario: { feature: string; name: string; steps: readonly ReviewStep[] } | undefined;

  setInput(input: unknown, file?: string): void {
    this.input = input;
    this.inputFile = file;
    this.result = undefined;
  }

  loadInput(): void {
    this.result = loadWorkspace(this.input, this.inputFile === undefined ? {} : { file: this.inputFile });
  }

  loadFile(file: string): void {
    this.result = loadWorkspaceFile(file, (path) => this.files.get(path));
  }

  readExample(path: string): void {
    this.setInput(JSON.parse(readFileSync(path, "utf8")), path);
  }

  /** The loaded model; loads the input first if no validation ran yet. */
  model(): Model {
    if (this.result === undefined) this.loadInput();
    assert.ok(this.result);
    assert.ok(this.result.ok, `workspace rejected: ${JSON.stringify(this.result.ok ? [] : this.result.errors, null, 2)}`);
    return this.result.model;
  }

  errors(): readonly ValidationError[] {
    assert.ok(this.result, "no validation was run");
    assert.equal(this.result.ok, false, "the workspace was accepted");
    return this.result.ok ? [] : this.result.errors;
  }

  currentView(): View {
    assert.ok(this.view, "no view was computed");
    return this.view;
  }
}
setWorldConstructor(C4World);

/** Extracts the quoted strings of a sentence fragment: `"a", "b" et "c"`. */
export function quoted(text: string): string[] {
  return [...text.matchAll(/"([^"]*)"/g)].map((m) => m[1]!);
}

/** Formats a value for an assertion message. */
export function show(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
