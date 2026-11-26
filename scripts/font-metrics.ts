// Extracts horizontal metrics from the embedded WOFF fonts into assets/fonts/inter-metrics.json.
// Run once when a font file changes: node scripts/font-metrics.ts
// Only WOFF 1.0 is parsed (zlib, available in Node); the WOFF2 files are the ones embedded in the HTML.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";

const fontsDir = join(import.meta.dirname, "..", "assets", "fonts");
const weights = { "400": "inter-latin-400-normal.woff", "600": "inter-latin-600-normal.woff" } as const;

function readTables(woff: Buffer): Map<string, Buffer> {
  if (woff.toString("latin1", 0, 4) !== "wOFF") throw new Error("not a WOFF 1.0 file");
  const numTables = woff.readUInt16BE(12);
  const tables = new Map<string, Buffer>();
  for (let i = 0; i < numTables; i++) {
    const entry = 44 + i * 20;
    const tag = woff.toString("latin1", entry, entry + 4);
    const offset = woff.readUInt32BE(entry + 4);
    const compLength = woff.readUInt32BE(entry + 8);
    const origLength = woff.readUInt32BE(entry + 12);
    const data = woff.subarray(offset, offset + compLength);
    tables.set(tag, compLength < origLength ? inflateSync(data) : Buffer.from(data));
  }
  return tables;
}

function table(tables: Map<string, Buffer>, tag: string): Buffer {
  const data = tables.get(tag);
  if (!data) throw new Error(`missing table "${tag}"`);
  return data;
}

/** Unicode code point → glyph id, from the first Unicode subtable in format 4 or 12. */
function readCmap(cmap: Buffer): Map<number, number> {
  const count = cmap.readUInt16BE(2);
  const candidates: number[] = [];
  for (let i = 0; i < count; i++) {
    const platform = cmap.readUInt16BE(4 + i * 8);
    const encoding = cmap.readUInt16BE(6 + i * 8);
    const offset = cmap.readUInt32BE(8 + i * 8);
    if (platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10))) candidates.push(offset);
  }
  const result = new Map<number, number>();
  // Format 12 first: it covers code points outside the BMP.
  const ordered = [...candidates].sort((a, b) => cmap.readUInt16BE(b) - cmap.readUInt16BE(a));
  for (const offset of ordered) {
    const format = cmap.readUInt16BE(offset);
    if (format === 12) {
      const groups = cmap.readUInt32BE(offset + 12);
      for (let g = 0; g < groups; g++) {
        const at = offset + 16 + g * 12;
        const start = cmap.readUInt32BE(at);
        const end = cmap.readUInt32BE(at + 4);
        const glyph = cmap.readUInt32BE(at + 8);
        for (let c = start; c <= end; c++) result.set(c, glyph + c - start);
      }
      return result;
    }
    if (format === 4) {
      const segments = cmap.readUInt16BE(offset + 6) / 2;
      const ends = offset + 14;
      const starts = ends + segments * 2 + 2;
      const deltas = starts + segments * 2;
      const rangeOffsets = deltas + segments * 2;
      for (let s = 0; s < segments; s++) {
        const end = cmap.readUInt16BE(ends + s * 2);
        const start = cmap.readUInt16BE(starts + s * 2);
        const delta = cmap.readInt16BE(deltas + s * 2);
        const rangeOffset = cmap.readUInt16BE(rangeOffsets + s * 2);
        for (let c = start; c <= end && c !== 0xffff; c++) {
          let glyph: number;
          if (rangeOffset === 0) {
            glyph = (c + delta) & 0xffff;
          } else {
            const at = rangeOffsets + s * 2 + rangeOffset + (c - start) * 2;
            glyph = cmap.readUInt16BE(at);
            if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
          }
          if (glyph !== 0) result.set(c, glyph);
        }
      }
      return result;
    }
  }
  throw new Error("no supported Unicode cmap subtable");
}

function readFont(file: string) {
  const tables = readTables(readFileSync(join(fontsDir, file)));
  const head = table(tables, "head");
  const hhea = table(tables, "hhea");
  const hmtx = table(tables, "hmtx");
  const numberOfHMetrics = hhea.readUInt16BE(34);
  const advanceOf = (glyph: number): number => hmtx.readUInt16BE(4 * Math.min(glyph, numberOfHMetrics - 1));
  const advances: Record<string, number> = {};
  for (const [codePoint, glyph] of [...readCmap(table(tables, "cmap"))].sort((a, b) => a[0] - b[0])) {
    advances[String(codePoint)] = advanceOf(glyph);
  }
  return {
    unitsPerEm: head.readUInt16BE(18),
    ascender: hhea.readInt16BE(4),
    descender: hhea.readInt16BE(6),
    lineGap: hhea.readInt16BE(8),
    advances,
  };
}

const fonts = Object.entries(weights).map(([weight, file]) => [weight, readFont(file)] as const);
const [first] = fonts;
if (!first) throw new Error("no font");
for (const [, font] of fonts) {
  if (font.unitsPerEm !== first[1].unitsPerEm) throw new Error("fonts must share unitsPerEm");
}

const metrics = {
  family: "Inter",
  source: "@fontsource/inter 5.3.0, latin subset (SIL Open Font License 1.1, see OFL.txt)",
  unitsPerEm: first[1].unitsPerEm,
  ascender: first[1].ascender,
  descender: first[1].descender,
  lineGap: first[1].lineGap,
  weights: Object.fromEntries(fonts.map(([weight, font]) => [weight, font.advances])),
};
const out = join(fontsDir, "inter-metrics.json");
writeFileSync(out, `${JSON.stringify(metrics)}\n`);
console.log(`${out}: ${fonts.map(([w, f]) => `${w}: ${Object.keys(f.advances).length} code points`).join(", ")}`);
