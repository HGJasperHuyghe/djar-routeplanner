import { useRef } from 'react';
import { useAppState } from './hooks/useAppState';
import { AddressForm } from './components/AddressForm';
import { CsvImportDialog } from './components/CsvImportDialog';
import { StopList } from './components/StopList';
import { MapPanel } from './components/MapPanel';
import { RouteSummary } from './components/RouteSummary';
import { ExportBar } from './components/ExportBar';
import { ErrorBanner } from './components/ErrorBanner';

export default function App() {
  const {
    stops,
    depotId,
    route,
    roundTrip,
    optimizing,
    optimizeError,
    setOptimizeError,
    addStop,
    addStops,
    removeStop,
    updateStop,
    setDepot,
    setRoundTrip,
    reorderAndReoptimize,
    runOptimize,
  } = useAppState();

  const mapContainerRef = useRef<HTMLDivElement>(null);

  const geocodedStopCount = stops.filter((s) => !s.geocodeFailed).length;
  const canOptimize = geocodedStopCount >= 2;

  return (
    <div className="min-h-screen bg-soft-shell pb-16">
      <header className="border-b border-outline-variant/60 bg-pure-white/85 backdrop-blur-overlay">
        <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-margin-mobile py-4 sm:px-margin-desktop">
          <div className="flex items-center gap-3">
            <img
              src="/favicon.svg"
              alt="DJAR"
              className="h-11 w-11 shrink-0 rounded-2xl border border-outline-variant/40 bg-pure-white p-2 shadow-card"
            />
            <div>
              <h1 className="text-headline-lg-mobile sm:text-headline-lg text-deep-teal">DJAR Route Planner</h1>
              <p className="text-body-md text-on-surface-variant">Plan, optimize, and export delivery routes</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-content flex-col gap-6 px-margin-mobile pt-6 sm:px-margin-desktop">
        <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <div className="flex-1">
            <AddressForm onAdd={addStop} />
          </div>
          <div className="djar-card flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="djar-label mb-1">Bulk import</p>
              <p className="text-body-md text-on-surface-variant">Upload a CSV to add multiple stops at once.</p>
            </div>
            <CsvImportDialog onImport={addStops} />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(320px,420px)_1fr]">
          <div className="flex flex-col gap-4">
            <div className="djar-card flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-headline-md">Stops ({stops.length})</h2>
                <label className="flex items-center gap-2 text-label-sm text-on-surface-variant">
                  <input
                    type="checkbox"
                    checked={roundTrip}
                    onChange={(e) => setRoundTrip(e.target.checked)}
                    className="h-4 w-4 accent-deep-teal"
                  />
                  Round trip
                </label>
              </div>

              {!depotId && stops.length > 0 && (
                <p className="text-label-sm text-on-surface-variant">
                  No depot set — the first stop will be used as the default start. Click "Set depot" on any stop to
                  pin it.
                </p>
              )}

              <button
                type="button"
                className="djar-btn-primary w-full"
                disabled={!canOptimize || optimizing}
                onClick={() => runOptimize({ lockOrder: false })}
              >
                {optimizing ? 'Optimizing…' : 'Optimize route'}
              </button>

              <ErrorBanner message={optimizeError} onDismiss={() => setOptimizeError(null)} />
            </div>

            <StopList
              stops={stops}
              depotId={depotId}
              route={route}
              onRemove={removeStop}
              onSetDepot={setDepot}
              onUpdate={updateStop}
              onReorder={reorderAndReoptimize}
            />
          </div>

          <div className="flex flex-col gap-4">
            <MapPanel stops={stops} route={route} depotId={depotId} mapContainerRef={mapContainerRef} />
            <RouteSummary route={route} stops={stops} />
            <ExportBar stops={stops} route={route} depotId={depotId} mapContainerRef={mapContainerRef} />
          </div>
        </section>
      </main>
    </div>
  );
}
