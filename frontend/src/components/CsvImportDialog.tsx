import { useRef, useState } from 'react';
import { parseAddressesFromCsv } from '../lib/csvImport';
import type { ParsedCsvRow } from '../lib/csvImport';
import { geocodeAddress } from '../lib/api';
import { ApiError } from '../types';
import type { Stop } from '../types';
import { generateId } from '../lib/format';
import { ErrorBanner } from './ErrorBanner';

interface CsvImportDialogProps {
  onImport: (stops: Stop[]) => void;
}

interface RowResult {
  address: string;
  status: 'pending' | 'ok' | 'failed';
}

export function CsvImportDialog({ onImport }: CsvImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<RowResult[]>([]);
  const [processed, setProcessed] = useState(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importedStopsRef = useRef<Stop[]>([]);

  async function handleFile(file: File) {
    setError(null);
    setRows([]);
    setProcessed(0);
    importedStopsRef.current = [];

    if (/\.xlsx?$/i.test(file.name)) {
      setError('Only CSV files are supported, not Excel (.xlsx/.xls). Save the file as CSV and try again.');
      return;
    }

    let parsed: ParsedCsvRow[];
    try {
      parsed = await parseAddressesFromCsv(file);
    } catch {
      setError('Could not read this CSV file. Make sure it is a plain text CSV.');
      return;
    }
    if (parsed.length === 0) {
      setError('No addresses found in this file.');
      return;
    }

    const initialRows: RowResult[] = parsed.map((r) => ({ address: r.address, status: 'pending' }));
    setRows(initialRows);
    setRunning(true);

    const collected: Stop[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const { address, timeWindowStart, timeWindowEnd } = parsed[i];
      try {
        const res = await geocodeAddress(address);
        if (res.matches.length > 0) {
          const top = res.matches[0];
          collected.push({
            id: generateId(),
            label: top.label,
            lat: top.lat,
            lon: top.lon,
            timeWindowStart,
            timeWindowEnd,
          });
          setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: 'ok' } : r)));
        } else {
          collected.push({
            id: generateId(),
            label: address,
            lat: NaN,
            lon: NaN,
            geocodeFailed: true,
            timeWindowStart,
            timeWindowEnd,
          });
          setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: 'failed' } : r)));
        }
      } catch {
        collected.push({
          id: generateId(),
          label: address,
          lat: NaN,
          lon: NaN,
          geocodeFailed: true,
          timeWindowStart,
          timeWindowEnd,
        });
        setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: 'failed' } : r)));
      }
      setProcessed(i + 1);
    }

    importedStopsRef.current = collected;
    setRunning(false);
  }

  function handleAddAll() {
    onImport(importedStopsRef.current);
    setOpen(false);
    setRows([]);
    setProcessed(0);
    importedStopsRef.current = [];
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const total = rows.length;
  const failedCount = rows.filter((r) => r.status === 'failed').length;

  return (
    <>
      <button type="button" className="djar-btn-ghost" onClick={() => setOpen(true)}>
        Import CSV
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/50 p-4">
          <div className="djar-card max-h-[85vh] w-full max-w-lg overflow-y-auto p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-headline-md">Import stops from CSV</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-label-md font-heading uppercase text-on-surface-variant hover:text-on-surface"
              >
                Close
              </button>
            </div>

            <p className="mb-3 text-body-md text-on-surface-variant">
              One address per row. Address parts split across columns (street, postcode, city, …) are combined
              automatically, as are optional pickup-window columns (e.g. "van"/"tot" or "09:00-12:00"). CSV only —
              not Excel (.xlsx).
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="djar-input mb-3"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />

            <ErrorBanner message={error} onDismiss={() => setError(null)} />

            {total > 0 && (
              <div className="mt-2">
                <div className="mb-1 flex items-center justify-between text-label-sm text-on-surface-variant">
                  <span>
                    {processed}/{total} geocoded
                  </span>
                  {failedCount > 0 && <span className="text-error">{failedCount} failed</span>}
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-soft-shell">
                  <div
                    className="h-full rounded-full bg-kinetic-orange transition-all"
                    style={{ width: `${total ? (processed / total) * 100 : 0}%` }}
                  />
                </div>

                <ul className="mt-3 flex max-h-64 flex-col gap-1 overflow-y-auto">
                  {rows.map((r, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 rounded px-2 py-1 text-body-md">
                      <span className="truncate">{r.address}</span>
                      {r.status === 'pending' && <span className="djar-chip shrink-0">…</span>}
                      {r.status === 'ok' && <span className="djar-chip shrink-0">Geocoded</span>}
                      {r.status === 'failed' && <span className="djar-chip-error shrink-0">Needs fixing</span>}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  className="djar-btn-primary mt-4 w-full"
                  disabled={running}
                  onClick={handleAddAll}
                >
                  {running ? 'Geocoding…' : `Add ${total} stop${total === 1 ? '' : 's'} to route`}
                </button>
                {failedCount > 0 && !running && (
                  <p className="mt-2 text-label-sm text-on-surface-variant">
                    Rows marked "Needs fixing" will be added with no coordinates — edit their address manually in the
                    stop list afterwards.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
