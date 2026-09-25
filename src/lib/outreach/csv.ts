/** Small CSV parser for prospect imports. No third-party parser. */

export interface OutreachCsvColumn {
  key:
    | "name"
    | "email"
    | "instagram"
    | "business"
    | "category"
    | "website"
    | "notes"
    | "area";
  label: string;
}

export const OUTREACH_CSV_COLUMNS: OutreachCsvColumn[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "instagram", label: "Instagram" },
  { key: "business", label: "Business" },
  { key: "category", label: "Category" },
  { key: "website", label: "Website" },
  { key: "notes", label: "Notes" },
  { key: "area", label: "Area" },
];

export type OutreachCsvMapping = Record<OutreachCsvColumn["key"], string>;

export interface ParsedOutreachCsv {
  headers: string[];
  rows: string[][];
}

export function emptyOutreachCsvMapping(): OutreachCsvMapping {
  return {
    name: "",
    email: "",
    instagram: "",
    business: "",
    category: "",
    website: "",
    notes: "",
    area: "",
  };
}

function guessHeader(header: string): OutreachCsvColumn["key"] | null {
  const value = header.trim().toLowerCase().replace(/[_-]+/g, " ");
  if (!value) return null;
  if (/(^| )e-?mail($| )/.test(value) || value === "email address") return "email";
  if (/instagram|\big\b|handle/.test(value)) return "instagram";
  if (/business|company|gym|studio/.test(value)) return "business";
  if (/categor|type|niche/.test(value)) return "category";
  if (/website|url|site/.test(value)) return "website";
  if (/note|comment/.test(value)) return "notes";
  if (/^area$|neighborhood|city|location/.test(value)) return "area";
  if (/name|trainer|contact/.test(value) && !/user/.test(value)) return "name";
  return null;
}

export function guessOutreachCsvMapping(headers: string[]): OutreachCsvMapping {
  const mapping = emptyOutreachCsvMapping();
  const used = new Set<OutreachCsvColumn["key"]>();
  for (const header of headers) {
    const key = guessHeader(header);
    if (!key || used.has(key)) continue;
    mapping[key] = header;
    used.add(key);
  }
  return mapping;
}

/** RFC-style enough for spreadsheet exports: quotes, commas, and newlines. */
export function parseOutreachCsv(text: string): ParsedOutreachCsv | { error: string } {
  const source = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!source.trim()) return { error: "That file is empty." };

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if (char === "\n") {
      row.push(cell.trim());
      cell = "";
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      continue;
    }
    cell += char;
  }
  row.push(cell.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);

  if (rows.length < 2) {
    return { error: "Add a header row and at least one prospect." };
  }

  const headers = rows[0].map((header, index) => header || `Column ${index + 1}`);
  return { headers, rows: rows.slice(1) };
}

export interface MappedProspectRow {
  name: string;
  email: string;
  instagram: string;
  business: string;
  category: string;
  website: string;
  notes: string;
  area: string;
}

export function mapOutreachCsvRows(
  parsed: ParsedOutreachCsv,
  mapping: OutreachCsvMapping
): MappedProspectRow[] {
  const indexOf = (header: string) =>
    header ? parsed.headers.indexOf(header) : -1;
  const indexes = {
    name: indexOf(mapping.name),
    email: indexOf(mapping.email),
    instagram: indexOf(mapping.instagram),
    business: indexOf(mapping.business),
    category: indexOf(mapping.category),
    website: indexOf(mapping.website),
    notes: indexOf(mapping.notes),
    area: indexOf(mapping.area),
  };

  return parsed.rows.map((row) => ({
    name: indexes.name >= 0 ? row[indexes.name] ?? "" : "",
    email: indexes.email >= 0 ? row[indexes.email] ?? "" : "",
    instagram: indexes.instagram >= 0 ? row[indexes.instagram] ?? "" : "",
    business: indexes.business >= 0 ? row[indexes.business] ?? "" : "",
    category: indexes.category >= 0 ? row[indexes.category] ?? "" : "",
    website: indexes.website >= 0 ? row[indexes.website] ?? "" : "",
    notes: indexes.notes >= 0 ? row[indexes.notes] ?? "" : "",
    area: indexes.area >= 0 ? row[indexes.area] ?? "" : "",
  }));
}
