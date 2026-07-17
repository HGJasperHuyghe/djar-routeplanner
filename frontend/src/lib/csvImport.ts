import Papa from 'papaparse';

export interface ParsedCsvRow {
  address: string;
  timeWindowStart?: string;
  timeWindowEnd?: string;
}

const ADDRESS_HEADERS = ['adres', 'address', 'straat', 'street', 'straatnaam'];
const HOUSE_NUMBER_HEADERS = ['huisnummer', 'huisnr', 'nr', 'nummer', 'number', 'housenumber'];
const POSTCODE_HEADERS = ['postcode', 'zip', 'zipcode', 'postalcode'];
const CITY_HEADERS = ['plaats', 'stad', 'city', 'gemeente', 'woonplaats'];
const COUNTRY_HEADERS = ['land', 'country'];
const WINDOW_START_HEADERS = ['van', 'vanaf', 'start', 'from', 'opening', 'begin'];
const WINDOW_END_HEADERS = ['tot', 'einde', 'end', 'until', 'sluiting'];
const WINDOW_RANGE_HEADERS = ['tijdvak', 'tijdslot', 'venster', 'window', 'uren', 'openingstijden'];

function normalizeHeader(cell: string): string {
  return cell
    .replace(/^﻿/, '') // strip a UTF-8 BOM some exports (Excel) leave on the first cell
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

/** True if `header` contains `candidate` as a whole word, e.g. "Volledige adres" matches "adres". */
function matchesAny(header: string, candidates: string[]): boolean {
  return candidates.some((c) => new RegExp(`\\b${c}\\b`).test(header));
}

/**
 * Cleans a single CSV cell that may itself contain a multi-line address block
 * (common in CRM "full address" exports: company name, then street, then a
 * blank line, then postcode/city/country all inside one quoted cell). Blank
 * lines are dropped; if some lines contain a digit (street number, postcode)
 * and others don't (company/country name noise), only the digit-bearing
 * lines are kept, since those are what a geocoder actually needs.
 */
function cleanAddressCell(cell: string): string {
  const rawLines = cell
    .split(/\r?\n/)
    // Belgian/Dutch exports often prefix the postcode with a country letter
    // code glued on with a hyphen (e.g. "B-9810 Eke"); Nominatim can't parse
    // "B-9810" as a token but resolves the plain postcode fine.
    .map((l) => l.trim().replace(/\b[A-Z]{1,3}-(\d{3,6})\b/g, '$1'))
    .filter((l) => l.length > 0);

  // A "Bus 2" / "Bte 4" / "Box 1" mailbox/unit suffix doesn't help a geocoder
  // find the building (only the street + house number does, and Nominatim
  // reliably fails to match once one is present) — drop it entirely.
  const lines = rawLines.filter((l) => !/^(bus|bte|box)\s*\d+$/i.test(l));
  if (lines.length === 0) return '';

  const withDigits = lines.filter((l) => /\d/.test(l));
  const kept = withDigits.length > 0 ? withDigits : lines;

  // Some exports repeat "postcode city" as its own line even though it's
  // already part of an earlier line — drop consecutive duplicate segments.
  const segments = kept.join(', ').split(', ');
  const deduped = segments.filter((s, i) => i === 0 || s.toLowerCase() !== segments[i - 1].toLowerCase());
  let address = deduped.join(', ');

  // Legacy addresses sometimes append an old district number after the city
  // (e.g. "1000 Brussel 1"); once a real postcode is present, that trailing
  // number is redundant and breaks the geocoder, so drop it.
  if (/\b\d{4}\b/.test(address)) {
    address = address.replace(/\s+\d{1,2}$/, '');
  }

  return address;
}

/** Splits a "09:00-12:00" / "09:00 tot 12:00" style cell into [start, end]. */
function splitTimeRange(cell: string): { start?: string; end?: string } {
  const match = /(\d{1,2}[:.]\d{2}).{1,6}?(\d{1,2}[:.]\d{2})/.exec(cell);
  if (!match) return {};
  return { start: match[1].replace('.', ':'), end: match[2].replace('.', ':') };
}

interface ColumnRoles {
  address: number[];
  windowStart: number | null;
  windowEnd: number | null;
  windowRange: number | null;
}

function detectHeaderRoles(headerRow: string[]): ColumnRoles | null {
  const normalized = headerRow.map(normalizeHeader);

  const addressCols: number[] = [];
  let windowStart: number | null = null;
  let windowEnd: number | null = null;
  let windowRange: number | null = null;
  let recognizedAny = false;

  normalized.forEach((header, idx) => {
    if (!header) return;
    if (matchesAny(header, ADDRESS_HEADERS)) {
      addressCols.unshift(idx); // a dedicated "address" column takes priority
      recognizedAny = true;
    } else if (
      matchesAny(header, HOUSE_NUMBER_HEADERS) ||
      matchesAny(header, POSTCODE_HEADERS) ||
      matchesAny(header, CITY_HEADERS) ||
      matchesAny(header, COUNTRY_HEADERS)
    ) {
      addressCols.push(idx);
      recognizedAny = true;
    } else if (matchesAny(header, WINDOW_START_HEADERS)) {
      windowStart = idx;
      recognizedAny = true;
    } else if (matchesAny(header, WINDOW_END_HEADERS)) {
      windowEnd = idx;
      recognizedAny = true;
    } else if (matchesAny(header, WINDOW_RANGE_HEADERS)) {
      windowRange = idx;
      recognizedAny = true;
    }
  });

  if (!recognizedAny) return null;
  return { address: addressCols, windowStart, windowEnd, windowRange };
}

/**
 * Parse a CSV file client-side into address + optional time-window rows.
 *
 * If the first row looks like a header (contains recognizable column names
 * such as "adres"/"postcode"/"plaats" or "van"/"tot"), the relevant columns
 * are combined into a single address string and any time-window columns are
 * picked up. Otherwise every non-empty cell in the row is joined (rather than
 * only the first column), since many address exports split street/postcode/
 * city across separate columns without a header.
 */
export function parseAddressesFromCsv(file: File): Promise<ParsedCsvRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data.filter((row) => Array.isArray(row) && row.length > 0);
        if (data.length === 0) {
          resolve([]);
          return;
        }

        const roles = detectHeaderRoles(data[0].map((c) => (c ?? '').toString()));
        const dataRows = roles ? data.slice(1) : data;

        const rows: ParsedCsvRow[] = dataRows
          .map((row) => {
            const cells = row.map((c) => (c ?? '').toString().trim());

            let address: string;
            let timeWindowStart: string | undefined;
            let timeWindowEnd: string | undefined;

            if (roles && roles.address.length > 0) {
              address = roles.address
                .map((i) => cleanAddressCell(cells[i] ?? ''))
                .filter((v) => v.length > 0)
                .join(', ');
            } else {
              address = cells
                .map((v) => cleanAddressCell(v))
                .filter((v) => v.length > 0)
                .join(', ');
            }

            if (roles?.windowRange != null) {
              const { start, end } = splitTimeRange(cells[roles.windowRange] ?? '');
              timeWindowStart = start;
              timeWindowEnd = end;
            }
            if (roles?.windowStart != null && cells[roles.windowStart]) {
              timeWindowStart = cells[roles.windowStart];
            }
            if (roles?.windowEnd != null && cells[roles.windowEnd]) {
              timeWindowEnd = cells[roles.windowEnd];
            }

            return { address, timeWindowStart, timeWindowEnd };
          })
          .filter((r) => r.address.length > 0);

        resolve(rows);
      },
      error: (err: Error) => reject(err),
    });
  });
}
