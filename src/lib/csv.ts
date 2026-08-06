/**
 * CSV export.
 *
 * Landlords need this data outside the app more than they need it inside it —
 * at tax time, for an accountant, or as a backup that does not depend on this
 * project still existing. Everything here runs in the browser against data the
 * page already has, so it needs no new backend and no external service.
 */

/**
 * Quotes a single field.
 *
 * A value is wrapped when it contains a comma, quote, newline or carriage
 * return, and embedded quotes are doubled, per RFC 4180. Addresses and note
 * fields routinely contain commas, so skipping this corrupts the columns of
 * every row that has one.
 *
 * A leading =, +, - or @ is prefixed with a tab. Spreadsheet software treats
 * those as the start of a formula, which turns a tenant note into executable
 * content when the file is opened — the CSV injection problem.
 */
export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";

  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `\t${text}`;

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => unknown;
}

/** Renders rows to an RFC 4180 CSV string, header first. */
export function toCsv<T>(rows: T[], columns: Array<CsvColumn<T>>): string {
  const lines = [columns.map((c) => escapeCsvField(c.header)).join(",")];
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCsvField(c.value(row))).join(","));
  }
  // CRLF is what RFC 4180 specifies and what Excel expects.
  return lines.join("\r\n");
}

/**
 * Prompts a download of `content` as `filename`.
 *
 * The BOM makes Excel read the file as UTF-8; without it, any non-ASCII
 * character in a tenant name or address is mangled.
 */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([`﻿${content}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** `manageport-bills-2026-08-06.csv` */
export function timestampedFilename(name: string): string {
  const today = new Date();
  const day = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  return `manageport-${name}-${day}.csv`;
}

/** Serializes and downloads in one step. */
export function exportCsv<T>(
  name: string,
  rows: T[],
  columns: Array<CsvColumn<T>>
): void {
  downloadCsv(timestampedFilename(name), toCsv(rows, columns));
}
