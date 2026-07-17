import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import type { OptimizeResponse, Stop } from '../types';
import { StopListItem } from './StopListItem';

interface StopListProps {
  stops: Stop[];
  depotId: string | null;
  route: OptimizeResponse | null;
  onRemove: (id: string) => void;
  onSetDepot: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Stop>) => void;
  onReorder: (orderedNonDepotIds: string[]) => void;
}

export function StopList({ stops, depotId, route, onRemove, onSetDepot, onUpdate, onReorder }: StopListProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const depot = stops.find((s) => s.id === depotId) ?? null;
  const others = stops.filter((s) => s.id !== depotId);
  const otherIds = others.map((s) => s.id);

  const visitOrder = new Map<string, number>();
  const legFrom = new Map<string, { distanceMeters: number; durationSeconds: number }>();
  const arrivalAt = new Map<string, { arrivalTime?: string; lateSeconds?: number }>();
  if (route) {
    route.order.forEach((id, idx) => visitOrder.set(id, idx + 1));
    route.legs.forEach((leg) => {
      legFrom.set(leg.fromId, { distanceMeters: leg.distanceMeters, durationSeconds: leg.durationSeconds });
      arrivalAt.set(leg.toId, { arrivalTime: leg.arrivalTime, lateSeconds: leg.lateSeconds });
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = otherIds.indexOf(String(active.id));
    const newIndex = otherIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(otherIds, oldIndex, newIndex);
    onReorder(newOrder);
  }

  if (stops.length === 0) {
    return (
      <div className="djar-card p-6 text-center text-body-md text-on-surface-variant">
        No stops yet — add one above or import a CSV.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {depot && (
        <ul>
          <StopListItem
            stop={depot}
            visitOrder={visitOrder.get(depot.id) ?? null}
            isDepot
            draggable={false}
            legDistanceMeters={legFrom.get(depot.id)?.distanceMeters}
            legDurationSeconds={legFrom.get(depot.id)?.durationSeconds}
            arrivalTime={arrivalAt.get(depot.id)?.arrivalTime}
            lateSeconds={arrivalAt.get(depot.id)?.lateSeconds}
            onRemove={onRemove}
            onSetDepot={onSetDepot}
            onUpdate={onUpdate}
          />
        </ul>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={otherIds} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-2">
            {others.map((stop) => (
              <StopListItem
                key={stop.id}
                stop={stop}
                visitOrder={visitOrder.get(stop.id) ?? null}
                isDepot={false}
                draggable
                legDistanceMeters={legFrom.get(stop.id)?.distanceMeters}
                legDurationSeconds={legFrom.get(stop.id)?.durationSeconds}
                arrivalTime={arrivalAt.get(stop.id)?.arrivalTime}
                lateSeconds={arrivalAt.get(stop.id)?.lateSeconds}
                onRemove={onRemove}
                onSetDepot={onSetDepot}
                onUpdate={onUpdate}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}
