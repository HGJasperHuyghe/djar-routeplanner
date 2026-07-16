import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { OptimizeResponse, Stop } from '../types';
import { formatDistanceKm, formatDuration } from './format';

export interface OrderedStopRow {
  order: number;
  stop: Stop;
  legDistanceMeters: number | null;
  legDurationSeconds: number | null;
}

/** Build the ordered-stop-with-leg-info rows shared by all export formats. */
export function buildOrderedRows(stops: Stop[], route: OptimizeResponse | null): OrderedStopRow[] {
  const byId = new Map(stops.map((s) => [s.id, s]));
  const order = route?.order ?? stops.map((s) => s.id);
  const legByFrom = new Map((route?.legs ?? []).map((leg) => [leg.fromId, leg]));

  return order
    .map((id, idx) => byId.get(id) && { id, idx })
    .filter((x): x is { id: string; idx: number } => Boolean(x))
    .map(({ id, idx }) => {
      const stop = byId.get(id)!;
      const leg = legByFrom.get(id);
      return {
        order: idx + 1,
        stop,
        legDistanceMeters: leg ? leg.distanceMeters : null,
        legDurationSeconds: leg ? leg.durationSeconds : null,
      };
    });
}

/** Client-side CSV export: order,label,lat,lon,legDistanceMeters,legDurationSeconds */
export function exportCsv(stops: Stop[], route: OptimizeResponse | null, filename = 'route.csv') {
  const rows = buildOrderedRows(stops, route);
  const header = 'order,label,lat,lon,legDistanceMeters,legDurationSeconds';
  const lines = rows.map((r) => {
    const label = `"${r.stop.label.replace(/"/g, '""')}"`;
    return [r.order, label, r.stop.lat, r.stop.lon, r.legDistanceMeters ?? '', r.legDurationSeconds ?? ''].join(',');
  });
  const csv = [header, ...lines].join('\n');
  downloadBlob(csv, filename, 'text/csv;charset=utf-8;');
}

/** Google Maps deep link: first stop = origin, last = destination, rest = waypoints (pipe-separated). */
export function buildGoogleMapsUrl(stops: Stop[], route: OptimizeResponse | null): string {
  const rows = buildOrderedRows(stops, route);
  if (rows.length < 2) return '';
  const coords = rows.map((r) => `${r.stop.lat},${r.stop.lon}`);
  const origin = coords[0];
  const destination = coords[coords.length - 1];
  const waypoints = coords.slice(1, -1);
  const params = new URLSearchParams({
    api: '1',
    origin,
    destination,
    travelmode: 'driving',
  });
  let url = `https://www.google.com/maps/dir/?${params.toString()}`;
  if (waypoints.length > 0) {
    url += `&waypoints=${waypoints.map(encodeURIComponent).join('%7C')}`;
  }
  return url;
}

/** PDF route sheet: stop order, per-leg distance/time, totals. Optionally snapshots a map DOM node. */
export async function exportPdf(
  stops: Stop[],
  route: OptimizeResponse | null,
  mapNode: HTMLElement | null,
  filename = 'route-sheet.pdf',
) {
  const rows = buildOrderedRows(stops, route);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 40;
  let y = 50;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('DJAR Route Sheet', marginX, y);
  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(new Date().toLocaleString(), marginX, y);
  y += 24;

  if (route) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Total distance: ${formatDistanceKm(route.totalDistanceMeters)}   Total time: ${formatDuration(route.totalDurationSeconds)}`,
      marginX,
      y,
    );
    y += 20;
  }

  if (mapNode) {
    try {
      const canvas = await html2canvas(mapNode, { useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pageWidth = doc.internal.pageSize.getWidth() - marginX * 2;
      const imgHeight = (canvas.height / canvas.width) * pageWidth;
      doc.addImage(imgData, 'PNG', marginX, y, pageWidth, imgHeight);
      y += imgHeight + 24;
    } catch {
      // Non-fatal: continue without the map snapshot if the canvas capture fails (e.g. tile CORS).
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Stops', marginX, y);
  y += 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const pageHeight = doc.internal.pageSize.getHeight();

  rows.forEach((r) => {
    if (y > pageHeight - 60) {
      doc.addPage();
      y = 50;
    }
    const legText =
      r.legDistanceMeters != null && r.legDurationSeconds != null
        ? `  ->  ${formatDistanceKm(r.legDistanceMeters)}, ${formatDuration(r.legDurationSeconds)} to next`
        : '';
    doc.text(`${r.order}. ${r.stop.label}${legText}`, marginX, y);
    y += 16;
  });

  doc.save(filename);
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
