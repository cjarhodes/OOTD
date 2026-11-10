import { usualColour } from "./starter";
import type { ColorName } from "./palette";
import { parseChunks, readHeading, type TypedPiece } from "./typed";
import type { Kind } from "./types";

/**
 * What Type a list shows and does with the lines parsed from the box: which
 * rows are ready to add, what the button says, and what text is left in the
 * box once they're added. Kept apart from the component so it can be tested.
 */

/** A correction a person made to one row. */
export interface Fix {
  kind?: Kind;
  color?: ColorName;
}

/** Corrections by row key. */
export type Fixes = Record<string, Fix>;

/** A parsed piece with the correction applied, and where it came from. */
export interface Row extends TypedPiece {
  /** Which line (split on new lines and semicolons) it came from, counting from 0. */
  chunk: number;
  /** Line, place within the line and name together, so two identical lines don't share a correction. */
  key: string;
}

/** A piece with a person's correction applied. A hand-picked type re-derives a guessed colour. */
export function applyFix(p: TypedPiece, fix?: Fix): TypedPiece {
  if (!fix) return p;
  const kind = fix.kind ?? p.kind;
  const pickedColour = fix.color !== undefined;
  const color = fix.color ?? (fix.kind && p.colorGuessed ? usualColour(fix.kind) : p.color);
  return { ...p, kind, color, colorGuessed: p.colorGuessed && !pickedColour, colorMissing: p.colorMissing && !pickedColour };
}

function chunksOf(text: string): string[] {
  return text.split(/\n|;/);
}

/** Every piece in the text, one row each, with corrections applied. */
export function rowsOf(text: string, fixes: Fixes): Row[] {
  return parseChunks(text).flatMap((pieces, i) =>
    pieces.map((p, n) => {
      const key = `${i}:${n}:${p.name}`;
      return { ...applyFix(p, fixes[key]), chunk: i, key };
    }),
  );
}

/** Has a type and a colour, so it can be added. */
export function isReady(r: TypedPiece): boolean {
  return r.kind !== null && !r.colorMissing && !r.unsupported;
}

/** Something OOTD would plan but the person still has to settle: no type, or no colour. */
export function isStuck(r: TypedPiece): boolean {
  return !isReady(r) && !r.unsupported;
}

export function readyRows(rows: Row[]): Row[] {
  return rows.filter(isReady);
}

export function addLabel(rows: Row[]): string {
  const n = readyRows(rows).length;
  return n === 0 ? "Add pieces" : `Add ${n} ${n === 1 ? "piece" : "pieces"}`;
}

/** The note above the box once some pieces have been added and others are still waiting. */
export function leftNote(rows: Row[]): string | null {
  const n = rows.filter(isStuck).length;
  if (n === 0) return null;
  return `${n} ${n === 1 ? "line" : "lines"} left. Pick a type for each, or delete ${n === 1 ? "it" : "them"}.`;
}

/**
 * The text with only the rows `keep` accepts, and the corrections moved to
 * where those rows now sit. A line whose rows are all kept is left as typed;
 * a line with some dropped is rewritten from the names of the rest, which
 * read back as the same pieces; a line with none left goes.
 */
function keepRows(text: string, fixes: Fixes, keep: (r: Row) => boolean): { text: string; fixes: Fixes } {
  const byChunk = new Map<number, Row[]>();
  for (const r of rowsOf(text, fixes)) byChunk.set(r.chunk, [...(byChunk.get(r.chunk) ?? []), r]);
  const lines: string[] = [];
  const next: Fixes = {};
  // A heading stays only while some line under it does, and a blank line is kept only to end a heading's lines.
  let pending: string | null = null;
  let active = false;
  chunksOf(text).forEach((chunk, i) => {
    const mine = byChunk.get(i) ?? [];
    if (mine.length === 0 && !chunk.trim()) {
      pending = null;
      if (active) lines.push("");
      active = false;
      return;
    }
    if (mine.length === 0 && readHeading(chunk)) {
      pending = chunk;
      return;
    }
    const kept = mine.filter(keep);
    let line: string;
    if (mine.length > 0 && kept.length === 0) return;
    if (kept.length === mine.length) line = chunk;
    else line = kept.map((r) => r.name).join(", ");
    if (pending !== null) {
      lines.push(pending);
      pending = null;
      active = true;
    }
    const c = lines.push(line) - 1;
    kept.forEach((r, n) => {
      const f = fixes[r.key];
      if (f) next[`${c}:${n}:${r.name}`] = f;
    });
  });
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return { text: lines.join("\n"), fixes: next };
}

/** What is left in the box after the ready pieces are added: the lines still needing a type or colour. Unsupported ones go. */
export function afterAdding(text: string, fixes: Fixes): { text: string; fixes: Fixes } {
  return keepRows(text, fixes, isStuck);
}

/** The text without one row (its whole line, unless the line made several pieces). */
export function withoutRow(text: string, fixes: Fixes, key: string): { text: string; fixes: Fixes } {
  return keepRows(text, fixes, (r) => r.key !== key);
}
