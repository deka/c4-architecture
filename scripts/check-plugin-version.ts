// Fails when a `version` field is declared for the Claude Code plugin.
//
// Without `version`, Claude Code uses the git commit SHA as the plugin version,
// so every pushed commit is detected as an update. A declared `version` pins
// users to their cached copy until someone remembers to bump it.
//
// By default the staged content (git index) is checked, i.e. what is about to
// be committed. Pass `--worktree` to check the files on disk instead.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const PLUGIN_MANIFEST = ".claude-plugin/plugin.json";
const MARKETPLACE_MANIFEST = ".claude-plugin/marketplace.json";

const fromWorktree = process.argv.includes("--worktree");

function read(path: string): string | undefined {
  try {
    if (fromWorktree) return readFileSync(path, "utf8");
    return execFileSync("git", ["show", `:${path}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return undefined; // file absent: nothing to check
  }
}

const errors: string[] = [];

const plugin = read(PLUGIN_MANIFEST);
if (plugin !== undefined && "version" in JSON.parse(plugin)) {
  errors.push(`${PLUGIN_MANIFEST} declares "version"`);
}

const marketplace = read(MARKETPLACE_MANIFEST);
if (marketplace !== undefined) {
  const entries: Array<Record<string, unknown>> = JSON.parse(marketplace).plugins ?? [];
  for (const entry of entries) {
    if ("version" in entry) {
      errors.push(`${MARKETPLACE_MANIFEST} declares "version" for plugin "${entry.name}"`);
    }
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`error: ${error}`);
  console.error(
    "The plugin version must never be set: Claude Code derives it from the git commit SHA, " +
      "so every commit is picked up as an update. Remove the field.",
  );
  process.exit(1);
}
