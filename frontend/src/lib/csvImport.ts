import Papa from 'papaparse';

/**
 * Parse a CSV file client-side and return the first column of every non-empty row
 * as a candidate address string. Per the spec: simplest case is a single column of
 * addresses; if a header row is present it will simply fail to geocode and get
 * flagged for manual fixing rather than being specially detected/skipped.
 */
export function parseAddressesFromCsv(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete: (results) => {
        const addresses = results.data
          .map((row) => (Array.isArray(row) ? row[0] : String(row)))
          .map((cell) => (cell ?? '').toString().trim())
          .filter((cell) => cell.length > 0);
        resolve(addresses);
      },
      error: (err: Error) => reject(err),
    });
  });
}
