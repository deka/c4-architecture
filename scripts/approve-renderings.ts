// Approves the drawings of the last test run: copies each new or changed drawing over its reference.
// Usage: npm run approve [-- <key>...]   (no key: every drawing still to approve)
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { manifestFile, root, type ApprovalStatus } from "../features/steps/review.ts";

interface ManifestEntry {
  readonly key: string;
  readonly status: ApprovalStatus;
  readonly received: string;
  readonly approved: string;
}

if (!existsSync(manifestFile)) {
  process.stderr.write("no review found: run npm test first\n");
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestFile, "utf8")) as ManifestEntry[];
const requested = process.argv.slice(2);
const unknown = requested.filter((key) => !manifest.some((e) => e.key === key));
if (unknown.length > 0) {
  process.stderr.write(`unknown keys: ${unknown.join(", ")}\n`);
  process.exit(1);
}

const toApprove = manifest.filter(
  (e) => e.status !== "approved" && (requested.length === 0 || requested.includes(e.key)),
);
for (const entry of toApprove) {
  const target = join(root, entry.approved);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(root, entry.received), target);
  process.stdout.write(`approved ${entry.key} (${entry.status})\n`);
}
process.stdout.write(`${toApprove.length} drawing(s) approved\n`);
