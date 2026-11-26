// Approval testing of the rendering: each drawing is compared to a reference SVG approved by a human,
// and every drawing of the run is gathered in a review page (output/review/index.html).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { attr, esc } from "../../src/render-svg.ts";
import { fontCss, fontStack } from "../../src/text.ts";
import { palette } from "../../src/theme.ts";

export const root = join(import.meta.dirname, "..", "..");
export const approvedDir = join(root, "features", "rendering", "approved");
export const reviewDir = join(root, "output", "review");
export const receivedDir = join(reviewDir, "received");
export const manifestFile = join(reviewDir, "manifest.json");

export type ApprovalStatus = "approved" | "new" | "changed";

export interface ReviewStep {
  readonly keyword: string;
  readonly text: string;
  readonly docString?: string;
}

export interface ReviewEntry {
  readonly key: string;
  readonly feature: string;
  readonly scenario: string;
  readonly steps: readonly ReviewStep[];
  /** What the reviewer must see on the drawing. */
  readonly checks: readonly string[];
  readonly status: ApprovalStatus;
  readonly received: string;
  readonly approved: string | undefined;
}

/** Reference keys are file paths: lowercase English words separated by dashes, folders by slashes. */
const keyPattern = /^[a-z0-9]+(-[a-z0-9]+)*(\/[a-z0-9]+(-[a-z0-9]+)*)*$/;

export const approvedPath = (key: string): string => join(approvedDir, `${key}.svg`);
export const receivedPath = (key: string): string => join(receivedDir, `${key}.svg`);

/** Writes the received drawing and compares it with the approved one. */
export function compareWithApproved(key: string, svg: string): { status: ApprovalStatus; approved: string | undefined } {
  if (!keyPattern.test(key)) throw new Error(`invalid reference key "${key}" (expected e.g. "colors/external-system")`);
  const received = receivedPath(key);
  mkdirSync(dirname(received), { recursive: true });
  writeFileSync(received, svg);
  const approvedFile = approvedPath(key);
  if (!existsSync(approvedFile)) return { status: "new", approved: undefined };
  const approved = readFileSync(approvedFile, "utf8");
  return { status: approved === svg ? "approved" : "changed", approved };
}

const statusLabels: Record<ApprovalStatus, string> = {
  approved: "Approved",
  new: "New — not approved yet",
  changed: "Changed — differs from the approved reference",
};

const pageCss = `
*{box-sizing:border-box}
body{margin:0;background:${palette.paper};color:${palette.ink};font-family:${fontStack};font-kerning:none;line-height:1.5}
header,main{max-width:1440px;margin:0 auto;padding:24px 32px}
header{border-bottom:1px solid ${palette.rule}}
h1{font-size:24px;font-weight:600;margin:0 0 4px}
h2{font-size:18px;font-weight:600;margin:0}
h3{font-size:13px;font-weight:600;margin:16px 0 4px;color:${palette.muted}}
p{margin:0;color:${palette.muted}}
code,pre{font-family:ui-monospace,monospace;font-size:12px}
pre{margin:4px 0 0;padding:8px;background:#fff;border:1px solid ${palette.rule};border-radius:4px;overflow-x:auto}
ul{margin:4px 0 0;padding-left:20px}
nav ul{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:4px 24px}
a{color:${palette.ink}}
article{margin:0 0 48px;padding:0 0 24px;border-bottom:1px solid ${palette.rule}}
.feature{font-size:13px;color:${palette.muted}}
.status{display:inline-block;margin:4px 0 0;padding:0 8px;border-radius:4px;font-size:12px;font-weight:600}
.status-approved{background:#dcebdc;color:#2f5d34}
.status-new{background:#e3eef9;color:#2f5684}
.status-changed{background:#f6e7c8;color:#6b4a12}
.checks li{margin:2px 0}
.drawings{display:flex;flex-wrap:wrap;gap:24px;margin-top:16px}
figure{margin:0;overflow-x:auto}
figcaption{font-size:12px;font-weight:600;color:${palette.muted};margin-bottom:4px}
svg{display:block;max-width:100%;height:auto}
`;

function renderStep(step: ReviewStep): string {
  const line = `<code>${esc(step.keyword.trim())} ${esc(step.text)}</code>`;
  return `<li>${line}${step.docString === undefined ? "" : `<pre>${esc(step.docString)}</pre>`}</li>`;
}

function renderEntry(entry: ReviewEntry): string {
  const figures =
    entry.status === "changed" && entry.approved !== undefined
      ? `<figure><figcaption>Approved reference</figcaption>${entry.approved}</figure>` +
        `<figure><figcaption>New drawing</figcaption>${entry.received}</figure>`
      : `<figure>${entry.received}</figure>`;
  return (
    `<article id="${attr(entry.key)}" data-status="${entry.status}">` +
    `<p class="feature">${esc(entry.feature)}</p>` +
    `<h2>${esc(entry.scenario)}</h2>` +
    `<p><code>${esc(entry.key)}</code> <span class="status status-${entry.status}">${statusLabels[entry.status]}</span></p>` +
    `<h3>To check on the drawing</h3><ul class="checks">${entry.checks.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>` +
    `<div class="drawings">${figures}</div>` +
    `<details><summary>Scenario steps</summary><ul>${entry.steps.map(renderStep).join("")}</ul></details>` +
    `</article>`
  );
}

/** Writes the review page and the manifest read by `npm run approve`. */
export function writeReview(entries: readonly ReviewEntry[]): void {
  if (entries.length === 0) return;
  mkdirSync(reviewDir, { recursive: true });
  const pending = entries.filter((e) => e.status !== "approved");
  const nav =
    pending.length === 0
      ? `<p>All ${entries.length} drawings match their approved reference.</p>`
      : `<p>${pending.length} of ${entries.length} drawings to review, then approve with <code>npm run approve</code>:</p>` +
        `<nav><ul>${pending.map((e) => `<li><a href="#${attr(e.key)}">${esc(e.key)}</a></li>`).join("")}</ul></nav>`;
  const ordered = [...pending, ...entries.filter((e) => e.status === "approved")];
  const html = [
    "<!DOCTYPE html>",
    '<html lang="fr">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:">`,
    "<title>Rendering review</title>",
    `<style>${fontCss()}\n${pageCss}</style>`,
    "</head>",
    "<body>",
    `<header><h1>Rendering review</h1>${nav}</header>`,
    `<main>${ordered.map(renderEntry).join("\n")}</main>`,
    "</body>",
    "</html>",
    "",
  ].join("\n");
  writeFileSync(join(reviewDir, "index.html"), html);
  const manifest = entries.map(({ key, status }) => ({
    key,
    status,
    received: relative(root, receivedPath(key)),
    approved: relative(root, approvedPath(key)),
  }));
  writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
}
