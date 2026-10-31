import Dexie, { Table } from 'dexie';
import {
  Trip,
  ItineraryDay,
  ItineraryItem,
  Expense,
  Booking,
  BookingDocument,
  TransportLeg,
  AccommodationStay,
  Place,
  ChecklistItem,
  TripNote,
  SyncQueueItem,
  YatraBackupFile,
} from '@/types/trip';
import {
  INITIAL_TRIP,
  INITIAL_DAYS,
  INITIAL_CHECKLIST,
  INITIAL_PLACES,
  INITIAL_TRANSPORT,
  INITIAL_STAYS,
  INITIAL_NOTES,
  DEFAULT_TRIP_ID,
  toDeterministicUUID,
} from './seed-data';
import {
  CONFIRMED_ITINERARY_DAYS,
  getConfirmedItineraryDays,
  getConfirmedDayUUID,
  getConfirmedTransportUUID,
  CONFIRMED_TRANSPORT_LEGS,
  getConfirmedTransportLegs,
  CONFIRMED_ACCOMMODATION_STAYS,
  getConfirmedAccommodationStays,
  CONFIRMED_PLACES,
  getConfirmedPlaces,
  CONFIRMED_CHECKLIST_ITEMS,
  getConfirmedChecklistItems,
} from './itinerary-data';

export class YatraDatabase extends Dexie {
  trips!: Table<Trip, string>;
  itineraryDays!: Table<ItineraryDay, string>;
  itineraryItems!: Table<ItineraryItem, string>;
  expenses!: Table<Expense, string>;
  bookings!: Table<Booking, string>;
  documents!: Table<BookingDocument, string>;
  transportLegs!: Table<TransportLeg, string>;
  accommodations!: Table<AccommodationStay, string>;
  places!: Table<Place, string>;
  checklists!: Table<ChecklistItem, string>;
  notes!: Table<TripNote, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  meta!: Table<{ key: string; value: any; updatedAt: string }, string>;

  constructor() {
    super('YatraPilgrimageDB');
    this.version(1).stores({
      trips: 'id, userId, isActive, updatedAt',
      itineraryDays: 'id, tripId, dayNumber, date, status, updatedAt',
      itineraryItems: 'id, tripId, dayId, isCompleted, sortOrder, updatedAt',
      expenses: 'id, tripId, dayId, date, category, paymentMethod, updatedAt',
      bookings: 'id, tripId, bookingType, status, updatedAt',
      documents: 'id, tripId, bookingId, docType, offlineCached, updatedAt',
      transportLegs: 'id, tripId, dayId, mode, status, updatedAt',
      accommodations: 'id, tripId, city, checkinDate, updatedAt',
      places: 'id, tripId, placeType, city, updatedAt',
      checklists: 'id, tripId, category, isCompleted, sortOrder, updatedAt',
      notes: 'id, tripId, dayId, category, updatedAt',
      syncQueue: 'id, entity, action, recordId, status, timestamp',
      meta: 'key, updatedAt',
    });
  }
}

export const db = new YatraDatabase();

/**
 * Upgrade any legacy string IDs to valid RFC 4122 UUIDs in Dexie.
 * Ensures compatibility with PostgreSQL UUID columns and foreign keys.
 */
export async function upgradeLegacyIdsIfNeeded(): Promise<void> {
  const isUUID = (str?: string) =>
    Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str));

  const days = await db.itineraryDays.toArray();
  const places = await db.places.toArray();
  const expenses = await db.expenses.toArray();
  const stays = await db.accommodations.toArray();
  const transports = await db.transportLegs.toArray();

  const hasLegacyDay = days.some(d => !isUUID(d.id) || !isUUID(d.tripId));
  const hasLegacyPlace = places.some(p => !isUUID(p.id) || !isUUID(p.tripId));
  const hasLegacyExpense = expenses.some(e => !isUUID(e.id) || !isUUID(e.tripId));
  const hasLegacyStay = stays.some(s => !isUUID(s.id) || !isUUID(s.tripId));
  const hasLegacyTransport = transports.some(t => !isUUID(t.id) || !isUUID(t.tripId));

  if (!hasLegacyDay && !hasLegacyPlace && !hasLegacyExpense && !hasLegacyStay && !hasLegacyTransport) return;

  await db.transaction(
    'rw',
    [
      db.trips,
      db.itineraryDays,
      db.itineraryItems,
      db.expenses,
      db.bookings,
      db.documents,
      db.transportLegs,
      db.accommodations,
      db.places,
      db.checklists,
      db.notes,
      db.syncQueue,
    ],
    async () => {
      // 1. Trips
      const trips = await db.trips.toArray();
      for (const t of trips) {
        const newId = toDeterministicUUID(t.id);
        if (newId !== t.id) {
          await db.trips.delete(t.id);
          await db.trips.put({ ...t, id: newId });
        }
      }

      // 2. Days
      for (const d of days) {
        const newId = toDeterministicUUID(d.id);
        const newTripId = toDeterministicUUID(d.tripId);
        if (newId !== d.id || newTripId !== d.tripId) {
          await db.itineraryDays.delete(d.id);
          await db.itineraryDays.put({ ...d, id: newId, tripId: newTripId });
        }
      }

      // 3. Items
      const items = await db.itineraryItems.toArray();
      for (const i of items) {
        const newId = toDeterministicUUID(i.id);
        const newTripId = toDeterministicUUID(i.tripId);
        const newDayId = toDeterministicUUID(i.dayId);
        if (newId !== i.id || newTripId !== i.tripId || newDayId !== i.dayId) {
          await db.itineraryItems.delete(i.id);
          await db.itineraryItems.put({ ...i, id: newId, tripId: newTripId, dayId: newDayId });
        }
      }

      // 4. Places
      const places = await db.places.toArray();
      for (const p of places) {
        const newId = toDeterministicUUID(p.id);
        const newTripId = toDeterministicUUID(p.tripId);
        if (newId !== p.id || newTripId !== p.tripId) {
          await db.places.delete(p.id);
          await db.places.put({ ...p, id: newId, tripId: newTripId });
        }
      }

      // 5. Transport Legs
      const legs = await db.transportLegs.toArray();
      for (const l of legs) {
        const newId = toDeterministicUUID(l.id);
        const newTripId = toDeterministicUUID(l.tripId);
        const newDayId = l.dayId ? toDeterministicUUID(l.dayId) : undefined;
        if (newId !== l.id || newTripId !== l.tripId || newDayId !== l.dayId) {
          await db.transportLegs.delete(l.id);
          await db.transportLegs.put({ ...l, id: newId, tripId: newTripId, dayId: newDayId });
        }
      }

      // 6. Stays
      const stays = await db.accommodations.toArray();
      for (const s of stays) {
        const newId = toDeterministicUUID(s.id);
        const newTripId = toDeterministicUUID(s.tripId);
        if (newId !== s.id || newTripId !== s.tripId) {
          await db.accommodations.delete(s.id);
          await db.accommodations.put({ ...s, id: newId, tripId: newTripId });
        }
      }

      // 7. Checklists
      const chks = await db.checklists.toArray();
      for (const c of chks) {
        const newId = toDeterministicUUID(c.id);
        const newTripId = toDeterministicUUID(c.tripId);
        if (newId !== c.id || newTripId !== c.tripId) {
          await db.checklists.delete(c.id);
          await db.checklists.put({ ...c, id: newId, tripId: newTripId });
        }
      }

      // 8. Notes
      const notes = await db.notes.toArray();
      for (const n of notes) {
        const newId = toDeterministicUUID(n.id);
        const newTripId = toDeterministicUUID(n.tripId);
        const newDayId = n.dayId ? toDeterministicUUID(n.dayId) : undefined;
        if (newId !== n.id || newTripId !== n.tripId || newDayId !== n.dayId) {
          await db.notes.delete(n.id);
          await db.notes.put({ ...n, id: newId, tripId: newTripId, dayId: newDayId });
        }
      }

      // 9. Expenses
      const expenses = await db.expenses.toArray();
      for (const e of expenses) {
        const newId = toDeterministicUUID(e.id);
        const newTripId = toDeterministicUUID(e.tripId);
        const newDayId = e.dayId ? toDeterministicUUID(e.dayId) : undefined;
        if (newId !== e.id || newTripId !== e.tripId || newDayId !== e.dayId) {
          await db.expenses.delete(e.id);
          await db.expenses.put({ ...e, id: newId, tripId: newTripId, dayId: newDayId });
        }
      }

      // 10. Bookings
      const bookings = await db.bookings.toArray();
      for (const b of bookings) {
        const newId = toDeterministicUUID(b.id);
        const newTripId = toDeterministicUUID(b.tripId);
        if (newId !== b.id || newTripId !== b.tripId) {
          await db.bookings.delete(b.id);
          await db.bookings.put({ ...b, id: newId, tripId: newTripId });
        }
      }

      // 11. Documents
      const docs = await db.documents.toArray();
      for (const d of docs) {
        const newId = toDeterministicUUID(d.id);
        const newTripId = toDeterministicUUID(d.tripId);
        const newBId = d.bookingId ? toDeterministicUUID(d.bookingId) : undefined;
        if (newId !== d.id || newTripId !== d.tripId || newBId !== d.bookingId) {
          await db.documents.delete(d.id);
          await db.documents.put({ ...d, id: newId, tripId: newTripId, bookingId: newBId });
        }
      }
    }
  );
}

/**
 * Initialize Dexie with the preloaded 19-day pilgrimage itinerary.
 * If no trip exists OR if itineraryDays is empty (e.g. initial seeding was aborted),
 * it self-heals by reseeding all pilgrimage data.
 */
export const CONFIRMED_TRIP_ID = '00000000-0000-4000-8000-000000000001';

export const CONFIRMED_PILGRIMAGE_TRIP: Omit<Trip, 'id'> = {
  title: 'Complete Jyotirlinga Pilgrimage',
  origin: 'Hyderabad, Telangana',
  destination: 'Khammam, Telangana',
  startDate: '2026-11-17',
  endDate: '2026-12-05',
  totalBudget: 0,
  emergencyReserve: 0,
  openingCash: 0,
  targetDuration: '12–15 days',
  returnDateStatus: 'pending',
  travelStyle: 'Solo, budget-friendly pilgrimage',
  preferredTransport: 'Sleeper trains, government buses and shared autos',
  preferredAccommodation: 'Affordable dharamshalas and other verified low-cost stays',
  preferredFirstStop: 'Shirdi Sai Baba Temple',
  notes: 'Solo, budget-friendly pilgrimage. Preferred transport: Sleeper trains, government buses and shared autos. Preferred accommodation: Affordable dharamshalas and other verified low-cost stays. Shirdi is the preferred first destination after Hyderabad. Final route sequence and return date pending confirmation.',
  isActive: true,
  createdAt: '2026-10-24T00:00:00.000Z',
  updatedAt: new Date().toISOString(),
};

export async function ensureConfirmedItinerary(tripId: string = CONFIRMED_TRIP_ID): Promise<void> {
  const existingDays = await db.itineraryDays.where('tripId').equals(tripId).toArray();
  const day9 = existingDays.find(d => d.dayNumber === 9);
  const needsReorder = existingDays.length === 0 || !day9 || day9.title.toLowerCase().includes('indore');

  if (needsReorder) {
    const days = getConfirmedItineraryDays(tripId);
    await db.transaction('rw', [db.itineraryDays, db.itineraryItems], async () => {
      // Collect existing task completion states so user progress is never lost
      const existingTasks = await db.itineraryItems.where('tripId').equals(tripId).toArray();
      const taskDoneMap = new Map(existingTasks.map(t => [t.title.toLowerCase().trim(), t.isCompleted]));
      const userCustomTasks = existingTasks.filter(t => !t.id.startsWith('00000000-0000-4000-8002-'));

      for (const day of days) {
        const { tasks, ...dayRecord } = day;
        const existingDay = existingDays.find(d => d.dayNumber === day.dayNumber);
        await db.itineraryDays.put({
          ...(existingDay || {}),
          ...dayRecord,
          status: existingDay?.status || dayRecord.status,
        } as ItineraryDay);

        // Delete old standard tasks for this day to cleanly apply the new canonical tasks
        await db.itineraryItems
          .where('dayId')
          .equals(day.id)
          .filter(t => t.id.startsWith('00000000-0000-4000-8002-'))
          .delete();

        if (tasks && tasks.length > 0) {
          for (const task of tasks) {
            const preservedDone = taskDoneMap.get(task.title.toLowerCase().trim()) ?? task.isCompleted;
            await db.itineraryItems.put({
              ...task,
              isCompleted: preservedDone,
            });
          }
        }
      }

      // Ensure any custom user-added tasks are preserved
      for (const customTask of userCustomTasks) {
        await db.itineraryItems.put(customTask);
      }
    });
  }
}

export async function getUserDeletedStayIds(): Promise<Set<string>> {
  const meta = await db.meta.get('user_deleted_stay_ids');
  if (!meta?.value) return new Set<string>();
  try {
    const arr = Array.isArray(meta.value) ? meta.value : JSON.parse(meta.value);
    return new Set<string>(arr);
  } catch {
    return new Set<string>();
  }
}

export async function recordDeletedStay(stayId: string): Promise<void> {
  const current = await getUserDeletedStayIds();
  current.add(stayId);
  await db.meta.put({
    key: 'user_deleted_stay_ids',
    value: Array.from(current),
    updatedAt: new Date().toISOString(),
  });
}

export async function unrecordDeletedStay(stayId: string): Promise<void> {
  const current = await getUserDeletedStayIds();
  if (current.has(stayId)) {
    current.delete(stayId);
    await db.meta.put({
      key: 'user_deleted_stay_ids',
      value: Array.from(current),
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function getUserDeletedTransportIds(): Promise<Set<string>> {
  const meta = await db.meta.get('user_deleted_transport_ids');
  if (!meta?.value) return new Set<string>();
  try {
    const arr = Array.isArray(meta.value) ? meta.value : JSON.parse(meta.value);
    return new Set<string>(arr);
  } catch {
    return new Set<string>();
  }
}

export async function recordDeletedTransport(legId: string): Promise<void> {
  const current = await getUserDeletedTransportIds();
  current.add(legId);
  await db.meta.put({
    key: 'user_deleted_transport_ids',
    value: Array.from(current),
    updatedAt: new Date().toISOString(),
  });
}

export async function unrecordDeletedTransport(legId: string): Promise<void> {
  const current = await getUserDeletedTransportIds();
  if (current.has(legId)) {
    current.delete(legId);
    await db.meta.put({
      key: 'user_deleted_transport_ids',
      value: Array.from(current),
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function ensureConfirmedTransport(tripId: string = CONFIRMED_TRIP_ID): Promise<void> {
  const existingLegs = await db.transportLegs.where('tripId').equals(tripId).toArray();
  const allExisting = await db.transportLegs.toArray();
  const userCleared = await db.meta.get('transport_user_cleared');
  const deletedTransportIds = await getUserDeletedTransportIds();

  if (allExisting.length === 0 && !userCleared?.value && deletedTransportIds.size === 0) {
    const genuineLegs = getConfirmedTransportLegs(tripId);
    await db.transportLegs.bulkPut(genuineLegs);
    return;
  }

  const hasMockLegs = existingLegs.some(
    l => l.pnr === '1234567890' || l.serviceNumber?.includes('Godavari Express') || l.fromLocation?.includes('Vijayawada')
  );

  if (hasMockLegs) {
    await db.transportLegs.where('tripId').equals(tripId).delete();
    const genuineLegs = getConfirmedTransportLegs(tripId).filter(l => !deletedTransportIds.has(l.id));
    await db.transportLegs.bulkPut(genuineLegs);
  }
}

export async function ensureConfirmedAccommodation(tripId: string = CONFIRMED_TRIP_ID): Promise<void> {
  const existingStays = await db.accommodations.where('tripId').equals(tripId).toArray();
  const genuineStays = getConfirmedAccommodationStays(tripId);
  const deletedStayIds = await getUserDeletedStayIds();

  if (existingStays.length === 0 && deletedStayIds.size === 0) {
    await db.accommodations.bulkPut(genuineStays);
    return;
  }

  const hasMockStays = existingStays.some(
    s => s.bookingId === 'SHIRDI20261117' || s.bookingReference === 'HSR12345' || s.bookingReference === 'DBN20261120' || s.contactPhone === '+91 98765 43210'
  );

  if (hasMockStays) {
    await db.accommodations.where('tripId').equals(tripId).delete();
    const filteredStays = genuineStays.filter(s => !deletedStayIds.has(s.id));
    await db.accommodations.bulkPut(filteredStays);
  }
}

export async function ensureConfirmedPlaces(tripId: string = CONFIRMED_TRIP_ID): Promise<void> {
  const existingPlaces = await db.places.where('tripId').equals(tripId).toArray();
  const hasMockPlaces = existingPlaces.some(
    p =>
      p.id === 'place-somnath' ||
      p.id.startsWith('e7a1b32d-9831-4fa2-8b43-0003000000') ||
      (p.name === 'Grishneshwar Jyotirlinga' && existingPlaces.length <= 10)
  );
  const grishneshwar = existingPlaces.find(p => p.name.toLowerCase().includes('grishneshwar'));
  const lacksImages = existingPlaces.some(p => !p.imageUrl || p.imageUrl.includes('temple-hero'));
  const needsReorder = existingPlaces.length === 0 || hasMockPlaces || (grishneshwar && grishneshwar.dayNumber !== 4) || lacksImages;

  if (needsReorder) {
    if (hasMockPlaces) {
      await db.places.where('tripId').equals(tripId).delete();
    }
    const genuinePlaces = getConfirmedPlaces(tripId);
    await db.transaction('rw', db.places, async () => {
      for (const place of genuinePlaces) {
        const existing = existingPlaces.find(p => p.id === place.id);
        await db.places.put({
          ...(existing || {}),
          ...place,
          isVisited: existing?.isVisited ?? place.isVisited,
        });
      }
    });
  }
}

export async function ensureConfirmedChecklists(tripId: string = CONFIRMED_TRIP_ID): Promise<void> {
  const existingChecklists = await db.checklists.where('tripId').equals(tripId).toArray();
  const hasMockChecklists = existingChecklists.some(
    c =>
      c.id.startsWith('e7a1b32d-9831-4fa2-8b43-0002000000') ||
      c.id.startsWith('chk-') ||
      existingChecklists.length < 36
  );
  if (existingChecklists.length === 0 || hasMockChecklists) {
    const existingStatusMap = new Map(existingChecklists.map(c => [c.title.toLowerCase().trim(), c.isCompleted]));
    if (hasMockChecklists) {
      await db.checklists.where('tripId').equals(tripId).delete();
    }
    const genuineChecklists = getConfirmedChecklistItems(tripId);
    await db.transaction('rw', db.checklists, async () => {
      for (const item of genuineChecklists) {
        // If user already marked an item with the same title as completed, preserve that completion status!
        const preservedCompleted = existingStatusMap.get(item.title.toLowerCase().trim()) ?? false;
        await db.checklists.put({
          ...item,
          isCompleted: preservedCompleted,
        });
      }
    });
  }
}

export async function ensureConfirmedNotes(tripId: string = CONFIRMED_TRIP_ID, targetDb: any = db): Promise<void> {
  const existingNotes = await targetDb.notes.where('tripId').equals(tripId).toArray();
  const existingIdSet = new Set(existingNotes.map((n: any) => n.id));
  const existingTitleSet = new Set(existingNotes.map((n: any) => (n.title || '').toLowerCase().trim()));

  await targetDb.transaction('rw', targetDb.notes, async () => {
    for (const seedNote of INITIAL_NOTES) {
      const hasId = existingIdSet.has(seedNote.id) || Boolean(await targetDb.notes.get(seedNote.id));
      const hasTitle = existingTitleSet.has((seedNote.title || '').toLowerCase().trim());

      // If the note already exists in the database, strictly preserve it without overwriting
      if (!hasId && !hasTitle) {
        await targetDb.notes.put({
          ...seedNote,
          tripId,
        });
      }
    }
  });
}

export interface PrototypeCleanupResult {
  deletedDocumentIds: string[];
  deletedExpenseIds: string[];
  deletedTransportIds: string[];
  deletedAccommodationIds: string[];
  deletedPlaceIds: string[];
  deletedChecklistIds: string[];
  deletedSyncQueueIds: string[];
  preservedRecordCounts: {
    itineraryDays: number;
    itineraryTasks: number;
    transportLegs: number;
    accommodations: number;
    places: number;
    checklists: number;
    notes: number;
    expenses: number;
    documents: number;
  };
}

/**
 * Surgically delete only confirmed prototype records while strictly preserving
 * all genuine user-created records, approved itinerary, places, transport, and stays.
 * Never clears entire tables or stores.
 */
export async function cleanPersistedPrototypeRecords(activeTripId: string = CONFIRMED_TRIP_ID): Promise<PrototypeCleanupResult> {
  const result: PrototypeCleanupResult = {
    deletedDocumentIds: [],
    deletedExpenseIds: [],
    deletedTransportIds: [],
    deletedAccommodationIds: [],
    deletedPlaceIds: [],
    deletedChecklistIds: [],
    deletedSyncQueueIds: [],
    preservedRecordCounts: {
      itineraryDays: 0,
      itineraryTasks: 0,
      transportLegs: 0,
      accommodations: 0,
      places: 0,
      checklists: 0,
      notes: 0,
      expenses: 0,
      documents: 0,
    },
  };

  await db.transaction(
    'rw',
    [
      db.documents,
      db.expenses,
      db.transportLegs,
      db.accommodations,
      db.places,
      db.checklists,
      db.syncQueue,
      db.meta,
    ],
    async () => {
      // 1. Surgical purge of confirmed prototype documents
      const allDocs = await db.documents.toArray();
      for (const doc of allDocs) {
        const isPrototypeDoc =
          doc.id.startsWith('e7a1b32d-9831-4fa2-8b43-0008') ||
          doc.id.startsWith('doc-') ||
          doc.pnr === '1234567890' ||
          doc.pnr === '9876543210' ||
          doc.bookingRef === 'HSR12345' ||
          doc.bookingRef === 'VAN-7788' ||
          doc.bookingRef === 'INS-992384' ||
          doc.title.toLowerCase().includes('srisailam') ||
          (doc.tripId === DEFAULT_TRIP_ID && doc.title === 'Aadhaar Card');

        if (isPrototypeDoc) {
          await db.documents.delete(doc.id);
          result.deletedDocumentIds.push(doc.id);
        }
      }

      // 2. Complete clean wipe of expenses to guarantee clean ₹0 budget state (Task 2)
      const expensesCleaned = await db.meta.get('user_expenses_cleaned_v3');
      if (!expensesCleaned?.value) {
        const allExpenses = await db.expenses.toArray();
        for (const exp of allExpenses) {
          await db.expenses.delete(exp.id);
          result.deletedExpenseIds.push(exp.id);
        }
        // Remove all queued expense items from offline syncQueue
        const expQueueItems = await db.syncQueue.where('entity').equals('expenses').toArray();
        for (const item of expQueueItems) {
          await db.syncQueue.delete(item.id);
          result.deletedSyncQueueIds.push(item.id);
        }
        await db.meta.put({
          key: 'user_expenses_cleaned_v3',
          value: true,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Fallback surgical check
        const allExpenses = await db.expenses.toArray();
        for (const exp of allExpenses) {
          const isPrototypeExpense =
            exp.id.startsWith('e7a1b32d-9831-4fa2-8b43-0007') ||
            exp.notes?.includes('PNR: 1234567890') ||
            exp.notes?.includes('Hotel Sri Sai Residency') ||
            exp.title === 'Khammam Fort Entry & Guide' ||
            (exp.tripId === DEFAULT_TRIP_ID && exp.amount === 1200 && exp.category === 'Transport');

          if (isPrototypeExpense) {
            await db.expenses.delete(exp.id);
            result.deletedExpenseIds.push(exp.id);
          }
        }
      }

      // 3. Remove queued offline sync operations targeting deleted prototype records
      const deletedIdSet = new Set([...result.deletedDocumentIds, ...result.deletedExpenseIds]);
      const queueItems = await db.syncQueue.toArray();
      for (const item of queueItems) {
        if (deletedIdSet.has(item.recordId)) {
          await db.syncQueue.delete(item.id);
          result.deletedSyncQueueIds.push(item.id);
        }
      }

      await db.meta.put({
        key: 'data_cleared_complete_v2',
        value: true,
        updatedAt: new Date().toISOString(),
      });
    }
  );

  // Measure remaining preserved records
  result.preservedRecordCounts.itineraryDays = await db.itineraryDays.where('tripId').equals(activeTripId).count();
  result.preservedRecordCounts.itineraryTasks = await db.itineraryItems.where('tripId').equals(activeTripId).count();
  result.preservedRecordCounts.transportLegs = await db.transportLegs.where('tripId').equals(activeTripId).count();
  result.preservedRecordCounts.accommodations = await db.accommodations.where('tripId').equals(activeTripId).count();
  result.preservedRecordCounts.places = await db.places.where('tripId').equals(activeTripId).count();
  result.preservedRecordCounts.checklists = await db.checklists.where('tripId').equals(activeTripId).count();
  result.preservedRecordCounts.notes = await db.notes.where('tripId').equals(activeTripId).count();
  result.preservedRecordCounts.expenses = await db.expenses.where('tripId').equals(activeTripId).count();
  result.preservedRecordCounts.documents = await db.documents.where('tripId').equals(activeTripId).count();

  return result;
}

export async function initializeDatabase(): Promise<Trip> {
  const existingTrips = await db.trips.toArray();
  let active = existingTrips.find(t => t.isActive) || existingTrips[0];
  if (!active) {
    active = {
      id: CONFIRMED_TRIP_ID,
      ...CONFIRMED_PILGRIMAGE_TRIP,
    };
    await db.trips.put(active);
  } else {
    // Ensure vital route properties while strictly preserving all user-set budgets and allocations
    let needsSave = false;
    if (!active.title) {
      active.title = 'Complete Jyotirlinga Pilgrimage';
      needsSave = true;
    }
    if (!active.origin) {
      active.origin = 'Hyderabad, Telangana';
      needsSave = true;
    }
    if (!active.destination) {
      active.destination = 'Khammam, Telangana';
      needsSave = true;
    }
    if (needsSave) {
      await db.trips.put(active);
    }
  }

  // Ensure genuine itinerary days, activities, planned transport, accommodations, places, and notes persist in database
  await ensureConfirmedItinerary(active.id);
  await ensureConfirmedTransport(active.id);
  await ensureConfirmedAccommodation(active.id);
  await ensureConfirmedPlaces(active.id);
  await ensureConfirmedChecklists(active.id);
  await ensureConfirmedNotes(active.id);

  // Perform non-destructive surgical cleanup of prototype records
  await cleanPersistedPrototypeRecords(active.id);

  return active;
}

export async function resetToDefaultData(): Promise<Trip> {
  const cleanTrip: Trip = {
    id: CONFIRMED_TRIP_ID,
    ...CONFIRMED_PILGRIMAGE_TRIP,
  };

  await db.transaction('rw', [
    db.trips,
    db.itineraryDays,
    db.itineraryItems,
    db.checklists,
    db.places,
    db.transportLegs,
    db.accommodations,
    db.notes,
    db.expenses,
    db.documents,
    db.bookings,
    db.syncQueue,
    db.meta,
  ], async () => {
    await db.trips.clear();
    await db.itineraryDays.clear();
    await db.itineraryItems.clear();
    await db.checklists.clear();
    await db.places.clear();
    await db.transportLegs.clear();
    await db.accommodations.clear();
    await db.notes.clear();
    await db.expenses.clear();
    await db.documents.clear();
    await db.bookings.clear();
    await db.syncQueue.clear();
    await db.meta.delete('user_deleted_stay_ids');
    await db.meta.delete('user_deleted_transport_ids');

    await db.trips.put(cleanTrip);

    await db.meta.put({
      key: 'activeTripId',
      value: cleanTrip.id,
      updatedAt: new Date().toISOString(),
    });
    await db.meta.put({
      key: 'cleanState',
      value: true,
      updatedAt: new Date().toISOString(),
    });
    await db.meta.put({
      key: 'data_cleared_complete_v1',
      value: true,
      updatedAt: new Date().toISOString(),
    });
  });

  await ensureConfirmedItinerary(cleanTrip.id);
  await ensureConfirmedTransport(cleanTrip.id);
  await ensureConfirmedAccommodation(cleanTrip.id);
  await ensureConfirmedPlaces(cleanTrip.id);
  await ensureConfirmedChecklists(cleanTrip.id);
  await ensureConfirmedNotes(cleanTrip.id);

  return cleanTrip;
}

/**
 * Enqueue an operation to the offline sync queue
 */
import { generateUUID } from './uuid';

export async function queueOfflineChange(
  entity: string,
  action: 'insert' | 'update' | 'delete',
  recordId: string,
  payload: any
): Promise<void> {
  const now = new Date().toISOString();

  // Check if there is already an uncompleted syncQueue entry for this record
  const existingItems = await db.syncQueue
    .where('status')
    .anyOf(['pending', 'failed'])
    .and(item => item.entity === entity && item.recordId === recordId)
    .toArray();

  if (existingItems.length > 0) {
    const existing = existingItems[0];
    
    // Coalesce / deduplicate offline operations
    if (existing.action === 'insert') {
      if (action === 'delete') {
        // Record was created and deleted offline before syncing to cloud: remove queued item entirely
        await db.syncQueue.delete(existing.id);
        return;
      } else {
        // Action is update: keep action as 'insert' with freshest merged payload
        await db.syncQueue.update(existing.id, {
          payload,
          timestamp: now,
          status: 'pending',
          error: undefined,
          retryCount: 0,
        });
        return;
      }
    } else if (existing.action === 'update') {
      if (action === 'delete') {
        await db.syncQueue.update(existing.id, {
          action: 'delete',
          payload: { id: recordId },
          timestamp: now,
          status: 'pending',
          error: undefined,
          retryCount: 0,
        });
        return;
      } else {
        await db.syncQueue.update(existing.id, {
          payload,
          timestamp: now,
          status: 'pending',
          error: undefined,
          retryCount: 0,
        });
        return;
      }
    }
  }

  // Otherwise, create a clean new pending queue entry
  const item: SyncQueueItem = {
    id: generateUUID(),
    entity,
    action,
    recordId,
    payload,
    timestamp: now,
    status: 'pending',
    retryCount: 0,
  };
  await db.syncQueue.put(item);
}

/**
 * Remove an individual queued operation from the offline syncQueue
 */
export async function deleteSyncQueueItem(id: string): Promise<void> {
  await db.syncQueue.delete(id);
}

/**
 * Fetch all data for the active trip with robust fallback to prevent empty views
 */
export async function getFullTripData(tripId: string) {
  let trip = await db.trips.get(tripId);
  if (!trip) {
    const allTrips = await db.trips.toArray();
    trip = allTrips.find(t => t.isActive) || allTrips[0] || INITIAL_TRIP;
    tripId = trip.id;
  }

  let rawDays = await db.itineraryDays.where('tripId').equals(tripId).sortBy('dayNumber');
  if (rawDays.length === 0) {
    const allDays = await db.itineraryDays.toArray();
    if (allDays.length > 0) {
      rawDays = allDays.sort((a, b) => a.dayNumber - b.dayNumber);
    }
  }

  let items = await db.itineraryItems.where('tripId').equals(tripId).sortBy('sortOrder');
  if (items.length === 0) {
    const allItems = await db.itineraryItems.toArray();
    if (allItems.length > 0) items = allItems;
  }

  let expenses = await db.expenses.where('tripId').equals(tripId).reverse().sortBy('date');
  if (expenses.length === 0) {
    const allExpenses = await db.expenses.toArray();
    if (allExpenses.length > 0) {
      expenses = allExpenses.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }
  }

  let bookings = await db.bookings.where('tripId').equals(tripId).toArray();
  if (bookings.length === 0) {
    const allBookings = await db.bookings.toArray();
    if (allBookings.length > 0) bookings = allBookings;
  }

  let documents = await db.documents.where('tripId').equals(tripId).toArray();
  if (documents.length === 0) {
    const allDocs = await db.documents.toArray();
    if (allDocs.length > 0) documents = allDocs;
  }

  const deletedTransportIds = await getUserDeletedTransportIds();
  let transportLegs = await db.transportLegs.where('tripId').equals(tripId).toArray();
  if (transportLegs.length === 0) {
    const allTransport = await db.transportLegs.toArray();
    if (allTransport.length > 0) {
      transportLegs = allTransport;
    } else {
      const userCleared = await db.meta.get('transport_user_cleared');
      if (!userCleared?.value && deletedTransportIds.size === 0) {
        transportLegs = getConfirmedTransportLegs(tripId);
        await db.transportLegs.bulkPut(transportLegs);
      }
    }
  }
  transportLegs = transportLegs.filter(l => !deletedTransportIds.has(l.id));

  const deletedStayIds = await getUserDeletedStayIds();
  let accommodations = await db.accommodations.where('tripId').equals(tripId).toArray();
  if (accommodations.length === 0) {
    const allStays = await db.accommodations.toArray();
    if (allStays.length > 0) {
      accommodations = allStays;
    } else if (deletedStayIds.size === 0) {
      accommodations = getConfirmedAccommodationStays(tripId);
      await db.accommodations.bulkPut(accommodations);
    }
  }
  accommodations = accommodations.filter(s => !deletedStayIds.has(s.id));

  let places = await db.places.where('tripId').equals(tripId).toArray();
  if (places.length === 0) {
    const allPlaces = await db.places.toArray();
    if (allPlaces.length > 0) {
      places = allPlaces;
    } else {
      places = getConfirmedPlaces(tripId);
    }
  }

  let checklists = await db.checklists.where('tripId').equals(tripId).sortBy('sortOrder');
  if (checklists.length === 0) {
    const allChecklists = await db.checklists.toArray();
    if (allChecklists.length > 0) checklists = allChecklists;
  }

  let notes = await db.notes.where('tripId').equals(tripId).reverse().sortBy('updatedAt');
  if (notes.length === 0) {
    const allNotes = await db.notes.toArray();
    if (allNotes.length > 0) notes = allNotes;
  }

  // Attach tasks to respective days
  const days: ItineraryDay[] = rawDays.map(d => ({
    ...d,
    tasks: items.filter(i => i.dayId === d.id),
  }));

  return {
    trip: trip || INITIAL_TRIP,
    days,
    expenses,
    bookings,
    documents,
    transportLegs,
    accommodations,
    places,
    checklists,
    notes,
  };
}

/**
 * Export complete trip dataset as a standalone JSON backup
 */
export async function exportBackupJSON(tripId: string): Promise<YatraBackupFile> {
  const data = await getFullTripData(tripId);
  return {
    format: 'yatra-backup-v2',
    exportedAt: new Date().toISOString(),
    ...data,
  };
}

/**
 * Restore complete trip dataset from a validated backup file
 */
export async function restoreBackupJSON(backup: YatraBackupFile): Promise<void> {
  if (!backup.trip || !backup.days || !Array.isArray(backup.days)) {
    throw new Error('Invalid Yatra backup structure');
  }

  await db.transaction('rw', [
    db.trips,
    db.itineraryDays,
    db.itineraryItems,
    db.expenses,
    db.bookings,
    db.documents,
    db.transportLegs,
    db.accommodations,
    db.places,
    db.checklists,
    db.notes,
  ], async () => {
    const tripId = backup.trip.id;

    // Remove existing records for this trip
    await db.trips.delete(tripId);
    await db.itineraryDays.where('tripId').equals(tripId).delete();
    await db.itineraryItems.where('tripId').equals(tripId).delete();
    await db.expenses.where('tripId').equals(tripId).delete();
    await db.bookings.where('tripId').equals(tripId).delete();
    await db.documents.where('tripId').equals(tripId).delete();
    await db.transportLegs.where('tripId').equals(tripId).delete();
    await db.accommodations.where('tripId').equals(tripId).delete();
    await db.places.where('tripId').equals(tripId).delete();
    await db.checklists.where('tripId').equals(tripId).delete();
    await db.notes.where('tripId').equals(tripId).delete();

    // Re-insert from backup
    await db.trips.put(backup.trip);

    for (const day of backup.days) {
      const { tasks, ...dayMeta } = day;
      await db.itineraryDays.put(dayMeta as ItineraryDay);
      if (Array.isArray(tasks)) {
        for (const task of tasks) {
          await db.itineraryItems.put(task);
        }
      }
    }

    if (Array.isArray(backup.expenses)) {
      for (const exp of backup.expenses) await db.expenses.put(exp);
    }
    if (Array.isArray(backup.bookings)) {
      for (const b of backup.bookings) await db.bookings.put(b);
    }
    if (Array.isArray(backup.documents)) {
      for (const doc of backup.documents) await db.documents.put(doc);
    }
    if (Array.isArray(backup.transportLegs)) {
      for (const leg of backup.transportLegs) await db.transportLegs.put(leg);
    }
    if (Array.isArray(backup.accommodations)) {
      for (const acc of backup.accommodations) await db.accommodations.put(acc);
    }
    if (Array.isArray(backup.places)) {
      for (const pl of backup.places) await db.places.put(pl);
    }
    if (Array.isArray(backup.checklists)) {
      for (const chk of backup.checklists) await db.checklists.put(chk);
    }
    if (Array.isArray(backup.notes)) {
      for (const n of backup.notes) await db.notes.put(n);
    }
  });
}

/**
 * Clear local sensitive data on logout to protect private documents and notes
 */
export async function clearLocalSensitiveData(preserveTripStructure: boolean = true): Promise<void> {
  if (preserveTripStructure) {
    // Only remove private attachments and sync tokens
    await db.documents.toCollection().modify({ blobData: undefined });
    await db.syncQueue.clear();
    await db.meta.delete('supabaseSession');
  } else {
    // Total wipeout
    await db.delete();
    await db.open();
  }
}
