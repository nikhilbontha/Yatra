import {
  db,
  recordDeletedStay,
  recordDeletedTransport,
  getUserDeletedStayIds,
  getUserDeletedTransportIds,
  getFullTripData,
} from './db';

export interface LocalSyncPullResult {
  updated: boolean;
  serverTime?: string;
  lastUpdated?: string;
}

/**
 * Push an individual mutation to the local server immediately
 */
export async function pushLocalChangeToServer(
  tripId: string,
  entity: 'accommodations' | 'transportLegs' | 'expenses' | 'documents' | 'notes' | 'checklists' | 'places' | 'trip',
  action: 'create' | 'update' | 'delete',
  itemOrId: any
): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const payload = {
      tripId,
      delta: {
        entity,
        action,
        item: action !== 'delete' ? itemOrId : undefined,
        id: action === 'delete' ? (typeof itemOrId === 'string' ? itemOrId : itemOrId?.id) : undefined,
      },
    };

    await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Non-blocking, fails quietly if offline
    console.debug('[LocalSync] Could not push change to local server:', err);
  }
}

/**
 * Bulk upload full local trip state to the local server
 */
export async function pushFullLocalStateToServer(tripId: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const full = await getFullTripData(tripId);
    const deletedStays = await getUserDeletedStayIds();
    const deletedTransports = await getUserDeletedTransportIds();

    const payload = {
      tripId,
      fullData: {
        trip: full.trip,
        expenses: full.expenses,
        accommodations: full.accommodations,
        transportLegs: full.transportLegs,
        documents: full.documents,
        places: full.places,
        checklists: full.checklists,
        notes: full.notes,
        deletedStayIds: Array.from(deletedStays),
        deletedTransportIds: Array.from(deletedTransports),
      },
    };

    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const json = await res.json();
      return json.serverTime || json.lastUpdated || new Date().toISOString();
    }
  } catch (err) {
    console.debug('[LocalSync] Could not push full state to local server:', err);
  }
  return null;
}

/**
 * Pull updates from the local server and apply them to local Dexie IndexedDB
 */
export async function pullLocalServerUpdates(
  tripId: string,
  sinceTimestamp?: string | null
): Promise<LocalSyncPullResult> {
  if (typeof window === 'undefined') return { updated: false };
  try {
    let url = `/api/sync?tripId=${encodeURIComponent(tripId)}`;
    if (sinceTimestamp) {
      url += `&since=${encodeURIComponent(sinceTimestamp)}`;
    }

    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return { updated: false };

    const json = await res.json();
    if (!json.updated || !json.data) {
      return { updated: false, serverTime: json.serverTime, lastUpdated: json.lastUpdated };
    }

    const data = json.data;

    // 1. Merge Trip Settings & Budget Ceilings
    if (data.trip && typeof data.trip === 'object') {
      const existingTrip = await db.trips.get(data.trip.id || tripId);
      const serverUpdated = data.trip.updatedAt ? new Date(data.trip.updatedAt).getTime() : 0;
      const localUpdated = existingTrip?.updatedAt ? new Date(existingTrip.updatedAt).getTime() : 0;

      // Only merge server trip if server has strictly newer timestamp, or local has no trip yet
      if (!existingTrip || serverUpdated > localUpdated) {
        const totalBudget = (data.trip.totalBudget !== undefined && Number(data.trip.totalBudget) > 0)
          ? Number(data.trip.totalBudget)
          : (existingTrip?.totalBudget || 0);

        const mergedTrip = {
          ...(existingTrip || {}),
          ...data.trip,
          totalBudget,
          totalUpiAmount: data.trip.totalUpiAmount !== undefined ? data.trip.totalUpiAmount : existingTrip?.totalUpiAmount,
          emergencyReserve: data.trip.emergencyReserve !== undefined ? data.trip.emergencyReserve : existingTrip?.emergencyReserve,
          openingCash: data.trip.openingCash !== undefined ? data.trip.openingCash : existingTrip?.openingCash,
        };
        await db.trips.put(mergedTrip);
        try {
          localStorage.setItem('yatra_persisted_trip', JSON.stringify(mergedTrip));
        } catch {}
      }
    }

    // 2. Apply tombstone deletions
    if (Array.isArray(data.deletedStayIds)) {
      for (const stayId of data.deletedStayIds) {
        await recordDeletedStay(stayId);
        await db.accommodations.delete(stayId);
      }
    }

    if (Array.isArray(data.deletedTransportIds)) {
      for (const legId of data.deletedTransportIds) {
        await recordDeletedTransport(legId);
        await db.transportLegs.delete(legId);
      }
    }

    if (Array.isArray(data.deletedExpenseIds)) {
      for (const expId of data.deletedExpenseIds) {
        await db.expenses.delete(expId);
      }
    }

    // 3. Merge entity collections
    if (Array.isArray(data.accommodations)) {
      const deletedStays = await getUserDeletedStayIds();
      for (const stay of data.accommodations) {
        if (!deletedStays.has(stay.id)) {
          await db.accommodations.put(stay);
        }
      }
    }

    if (Array.isArray(data.transportLegs)) {
      const deletedTransports = await getUserDeletedTransportIds();
      for (const leg of data.transportLegs) {
        if (!deletedTransports.has(leg.id)) {
          await db.transportLegs.put(leg);
        }
      }
    }

    if (Array.isArray(data.expenses)) {
      for (const exp of data.expenses) {
        await db.expenses.put(exp);
      }
    }

    if (Array.isArray(data.documents)) {
      for (const doc of data.documents) {
        await db.documents.put(doc);
      }
    }

    if (Array.isArray(data.notes)) {
      for (const note of data.notes) {
        await db.notes.put(note);
      }
    }

    if (Array.isArray(data.checklists)) {
      for (const item of data.checklists) {
        await db.checklists.put(item);
      }
    }

    if (Array.isArray(data.places)) {
      for (const place of data.places) {
        await db.places.put(place);
      }
    }

    return {
      updated: true,
      serverTime: json.serverTime,
      lastUpdated: json.lastUpdated,
    };
  } catch (err) {
    console.debug('[LocalSync] Could not pull from local server:', err);
    return { updated: false };
  }
}

/**
 * 2-way Instant Local Server Sync (pushes latest local state, then pulls latest updates)
 */
export async function triggerTwoWayLocalSync(tripId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    await pushFullLocalStateToServer(tripId);
    const pullRes = await pullLocalServerUpdates(tripId, null);
    return true;
  } catch (err) {
    console.warn('[LocalSync] Two-way sync error:', err);
    return false;
  }
}
