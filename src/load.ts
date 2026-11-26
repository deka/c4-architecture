import { readFileSync } from "node:fs";
import { join, posix } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { buildModel, type Fragment } from "./build.ts";
import type { LoadResult, ValidationError } from "./model.ts";

// ajv-formats is published as CommonJS: the plugin function is exposed as `.default`.
const addFormats = addFormatsModule.default;

const schemaPath = join(import.meta.dirname, "..", "schema", "c4.schema.json");
const schema: object = JSON.parse(readFileSync(schemaPath, "utf8"));

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

/** Reads a file; returns undefined when it does not exist. */
export type ReadFile = (path: string) => string | undefined;

const readFromDisk: ReadFile = (path) => {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
};

export interface LoadOptions {
  /** File `input` comes from: used to resolve includes and to locate errors. */
  readonly file?: string;
  readonly readFile?: ReadFile;
}

/** Validates an already parsed workspace (and its includes), then builds the model. */
export function loadWorkspace(input: unknown, options: LoadOptions = {}): LoadResult {
  const file = options.file === undefined ? undefined : posix.normalize(options.file);
  const loader = new FragmentLoader(options.readFile ?? readFromDisk);
  loader.add(file, input, file === undefined ? [] : [file]);
  if (loader.errors.length > 0) return { ok: false, errors: loader.errors };
  return buildModel(loader.fragments);
}

/** Reads, validates and builds a workspace from a file. */
export function loadWorkspaceFile(file: string, readFile: ReadFile = readFromDisk): LoadResult {
  const text = readFile(file);
  if (text === undefined) {
    return { ok: false, errors: [{ file, path: "/", message: `file not found: ${file}` }] };
  }
  const parsed = parseJson(file, text);
  if (!parsed.ok) return { ok: false, errors: [parsed.error] };
  return loadWorkspace(parsed.value, { file, readFile });
}

function parseJson(
  file: string | undefined,
  text: string,
): { ok: true; value: unknown } | { ok: false; error: ValidationError } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: { file, path: "/", message: `invalid JSON: ${(e as Error).message}` } };
  }
}

/** Loads a document and, recursively, its includes (included files first, then the document). */
class FragmentLoader {
  readonly fragments: Fragment[] = [];
  readonly errors: ValidationError[] = [];
  private readonly loaded = new Set<string>();
  private readonly readFile: ReadFile;

  constructor(readFile: ReadFile) {
    this.readFile = readFile;
  }

  add(file: string | undefined, input: unknown, chain: readonly string[]): void {
    if (file !== undefined) this.loaded.add(file);
    if (!validateSchema(input)) {
      for (const e of validateSchema.errors ?? []) {
        this.errors.push({ file, path: e.instancePath === "" ? "/" : e.instancePath, message: e.message ?? "invalid" });
      }
      return;
    }
    const doc = input as Fragment["doc"];
    const baseDir = file === undefined ? "." : posix.dirname(file);
    (doc.include ?? []).forEach((relative, i) => {
      const target = posix.normalize(posix.join(baseDir, relative));
      const path = `/include/${i}`;
      if (chain.includes(target)) {
        this.errors.push({ file, path, message: `circular include: ${[...chain, target].join(" → ")}` });
        return;
      }
      if (this.loaded.has(target)) return; // already included through another path
      const text = this.readFile(target);
      if (text === undefined) {
        this.errors.push({ file, path, message: `included file not found: ${target}` });
        return;
      }
      const parsed = parseJson(target, text);
      if (!parsed.ok) {
        this.errors.push(parsed.error);
        return;
      }
      this.add(target, parsed.value, [...chain, target]);
    });
    this.fragments.push({ file, doc });
  }
}
