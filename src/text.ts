// Text measurement and wrapping with the embedded font, so that layout does not need a browser.
// Measurements match the rendering only if kerning and ligatures are disabled: see `fontCss`.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type FontWeight = 400 | 600;

export interface Font {
  readonly size: number;
  readonly weight: FontWeight;
}

interface Metrics {
  readonly family: string;
  readonly unitsPerEm: number;
  readonly ascender: number;
  readonly descender: number;
  readonly lineGap: number;
  readonly weights: Record<string, Record<string, number>>;
}

const fontsDir = join(import.meta.dirname, "..", "assets", "fonts");
const metrics: Metrics = JSON.parse(readFileSync(join(fontsDir, "inter-metrics.json"), "utf8"));
const fontFiles: Record<FontWeight, string> = {
  400: "inter-latin-400-normal.woff2",
  600: "inter-latin-600-normal.woff2",
};

export const fontFamily = metrics.family;
/** CSS font stack: the embedded font first, system fonts for characters outside its subset. */
export const fontStack = `${metrics.family}, system-ui, sans-serif`;

/**
 * Width given to characters missing from the embedded subset (drawn with a fallback font).
 * Deliberately wide: overestimating only costs space, underestimating makes text overflow.
 */
const fallbackAdvance = 1.0;

/** Recommended distance between two baselines, as a multiple of the font size. */
export const lineHeightRatio = 1.3;

export function measureText(text: string, font: Font): number {
  const advances = metrics.weights[String(font.weight)];
  if (!advances) throw new Error(`no metrics for weight ${font.weight}`);
  let units = 0;
  for (const char of text) {
    const advance = advances[String(char.codePointAt(0))];
    units += advance ?? fallbackAdvance * metrics.unitsPerEm;
  }
  return (units * font.size) / metrics.unitsPerEm;
}

export function lineHeight(font: Font): number {
  return font.size * lineHeightRatio;
}

/** Distance from the top of a line box to its baseline, for a line box of `lineHeight(font)`. */
export function baselineOffset(font: Font): number {
  const { ascender, descender, unitsPerEm } = metrics;
  const contentHeight = ((ascender - descender) * font.size) / unitsPerEm;
  return (lineHeight(font) - contentHeight) / 2 + (ascender * font.size) / unitsPerEm;
}

/**
 * Splits text into lines no wider than `maxWidth`, breaking on whitespace.
 * A word wider than `maxWidth` is cut between characters. Explicit line breaks are kept.
 */
export function wrapText(text: string, maxWidth: number, font: Font): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter((w) => w !== "")) {
      const candidate = line === "" ? word : `${line} ${word}`;
      if (measureText(candidate, font) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line !== "") lines.push(line);
      line = "";
      for (const piece of splitWord(word, maxWidth, font)) {
        if (line !== "") lines.push(line);
        line = piece;
      }
    }
    lines.push(line);
  }
  return lines;
}

function splitWord(word: string, maxWidth: number, font: Font): string[] {
  const pieces: string[] = [];
  let piece = "";
  for (const char of word) {
    if (piece !== "" && measureText(piece + char, font) > maxWidth) {
      pieces.push(piece);
      piece = "";
    }
    piece += char;
  }
  pieces.push(piece);
  return pieces;
}

/** @font-face rules embedding the fonts as data URIs, plus the settings measurements rely on. */
export function fontCss(): string {
  const faces = (Object.entries(fontFiles) as [string, string][]).map(([weight, file]) => {
    const data = readFileSync(join(fontsDir, file)).toString("base64");
    return (
      `@font-face{font-family:${metrics.family};font-style:normal;font-weight:${weight};` +
      `src:url(data:font/woff2;base64,${data}) format("woff2");}`
    );
  });
  const settings =
    "svg text{font-family:" +
    fontStack +
    ";font-kerning:none;font-variant-ligatures:none;font-feature-settings:\"kern\" 0,\"liga\" 0,\"calt\" 0;}";
  return [...faces, settings].join("\n");
}
