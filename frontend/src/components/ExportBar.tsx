import { useState } from 'react';
import type { OptimizeResponse, Stop } from '../types';
import { buildGoogleMapsUrl, exportCsv, exportPdf } from '../lib/exportUtils';
import { buildShareUrl } from '../lib/share';
import type { SharedAppState } from '../types';

interface ExportBarProps {
  stops: Stop[];
  route: OptimizeResponse | null;
  depotId: string | null;
  mapContainerRef: React.RefObject<HTMLDivElement>;
}

export function ExportBar({ stops, route, depotId, mapContainerRef }: ExportBarProps) {
  const [copying, setCopying] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const hasStops = stops.length >= 2;
  const gmapsUrl = hasStops ? buildGoogleMapsUrl(stops, route) : '';

  async function handleShare() {
    const shared: SharedAppState = { v: 1, stops, depotId, route };
    const url = buildShareUrl(shared);
    setCopying(true);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy this link:', url);
    } finally {
      setTimeout(() => setCopying(false), 1500);
    }
  }

  async function handlePdf() {
    setPdfBusy(true);
    try {
      await exportPdf(stops, route, mapContainerRef.current);
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="djar-card flex flex-col gap-3 p-4">
      <h3 className="text-headline-md">Export &amp; share</h3>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="djar-btn-accent" disabled={!hasStops || pdfBusy} onClick={handlePdf}>
          {pdfBusy ? 'Generating…' : 'Export PDF'}
        </button>
        <button
          type="button"
          className="djar-btn-accent"
          disabled={!hasStops}
          onClick={() => exportCsv(stops, route)}
        >
          Export CSV
        </button>
        <a
          className={`djar-btn-accent ${!gmapsUrl ? 'pointer-events-none opacity-50' : ''}`}
          href={gmapsUrl || undefined}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in Google Maps
        </a>
        <button type="button" className="djar-btn-ghost" disabled={!hasStops} onClick={handleShare}>
          {copying ? 'Link copied!' : 'Copy share link'}
        </button>
      </div>
      <p className="text-label-sm text-on-surface-variant">
        Google Maps free deep links support roughly 10 waypoints — for longer routes, some stops may not carry over.
      </p>
    </div>
  );
}
