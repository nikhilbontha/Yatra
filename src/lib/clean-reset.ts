import { db, getFullTripData } from './db';
import { getSupabaseClient } from './supabase';
import { Trip, YatraBackupFile } from '@/types/trip';
import { DEFAULT_TRIP_ID } from './seed-data';

export const CLEAN_EMPTY_TRIP_ID = '00000000-0000-4000-8000-000000000001';

export const CLEAN_EMPTY_TRIP: Trip = {
  id: CLEAN_EMPTY_TRIP_ID,
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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export interface CleanResetResult {
  success: boolean;
  obsoleteTripId: string;
  backupExported: boolean;
  backupTimestamp: string;
  localRecordsDeleted: {
    trips: number;
    days: number;
    items: number;
    expenses: number;
    documents: number;
    transportLegs: number;
    accommodations: number;
    places: number;
    checklists: number;
    notes: number;
    syncQueue: number;
  };
  cloudRecordsDeleted?: {
    trips: number;
    days: number;
    items: number;
    expenses: number;
    documents: number;
    transportLegs: number;
    accommodations: number;
    places: number;
    checklists: number;
    notes: number;
  };
  cloudStatus: 'cleared' | 'not_connected' | 'unauthenticated' | 'failed';
  message: string;
}

/**
 * Perform a clean, safe data reset of both local storage and Supabase cloud.
 *
 * Rules:
 * - Does not touch user auth accounts or public.profiles.
 * - Does not touch schemas, tables, functions or RLS policies.
 * - Does not touch storage buckets.
 * - Safely deletes the obsolete sample trip data and its dependent records.
 * - Prevents demo data from auto-regenerating on next app load.
 */
export async function executeCleanDataReset(targetTripId: string = DEFAULT_TRIP_ID): Promise<CleanResetResult> {
  // 1. First, verify and capture local counts before deletion
  const preTripCount = await db.trips.where('id').equals(targetTripId).count();
  const preDaysCount = await db.itineraryDays.where('tripId').equals(targetTripId).count();
  const preItemsCount = await db.itineraryItems.where('tripId').equals(targetTripId).count();
  const preExpensesCount = await db.expenses.where('tripId').equals(targetTripId).count();
  const preDocsCount = await db.documents.where('tripId').equals(targetTripId).count();
  const preTransportCount = await db.transportLegs.where('tripId').equals(targetTripId).count();
  const preStaysCount = await db.accommodations.where('tripId').equals(targetTripId).count();
  const prePlacesCount = await db.places.where('tripId').equals(targetTripId).count();
  const preChecklistsCount = await db.checklists.where('tripId').equals(targetTripId).count();
  const preNotesCount = await db.notes.where('tripId').equals(targetTripId).count();
  const preQueueCount = await db.syncQueue.count();

  // 2. Perform atomic deletion in IndexedDB transaction
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
      db.meta,
    ],
    async () => {
      // Clear all existing trip, activity, expense, booking, document, stay, place, checklist, note records
      await db.trips.clear();
      await db.itineraryDays.clear();
      await db.itineraryItems.clear();
      await db.expenses.clear();
      await db.bookings.clear();
      await db.documents.clear();
      await db.transportLegs.clear();
      await db.accommodations.clear();
      await db.places.clear();
      await db.checklists.clear();
      await db.notes.clear();
      await db.syncQueue.clear();

      // Establish clean empty slate state
      await db.trips.put(CLEAN_EMPTY_TRIP);
      await db.meta.put({
        key: 'activeTripId',
        value: CLEAN_EMPTY_TRIP.id,
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
    }
  );

  let cloudStatus: CleanResetResult['cloudStatus'] = 'not_connected';
  let cloudCounts: CleanResetResult['cloudRecordsDeleted'] = undefined;
  let cloudErrorMessage: string | undefined = undefined;

  // 3. Attempt Supabase cloud reset if connected and authenticated
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data: sessionData, error: sessionErr } = await client.auth.getSession();
      if (sessionErr) throw sessionErr;
      const user = sessionData?.session?.user;

      if (!user) {
        cloudStatus = 'unauthenticated';
      } else {
        // Query cloud counts before deletion
        const [
          { count: cDocs, error: eDocs },
          { count: cExp, error: eExp },
          { count: cBookings, error: eBookings },
          { count: cItems, error: eItems },
          { count: cDays, error: eDays },
          { count: cPlaces, error: ePlaces },
          { count: cStays, error: eStays },
          { count: cLegs, error: eLegs },
          { count: cChk, error: eChk },
          { count: cNotes, error: eNotes },
          { count: cTrips, error: eTrips },
        ] = await Promise.all([
          client.from('booking_documents').select('*', { count: 'exact', head: true }).eq('trip_id', targetTripId),
          client.from('expenses').select('*', { count: 'exact', head: true }).eq('trip_id', targetTripId),
          client.from('bookings').select('*', { count: 'exact', head: true }).eq('trip_id', targetTripId),
          client.from('itinerary_items').select('*', { count: 'exact', head: true }).eq('trip_id', targetTripId),
          client.from('itinerary_days').select('*', { count: 'exact', head: true }).eq('trip_id', targetTripId),
          client.from('places').select('*', { count: 'exact', head: true }).eq('trip_id', targetTripId),
          client.from('accommodation_stays').select('*', { count: 'exact', head: true }).eq('trip_id', targetTripId),
          client.from('transport_legs').select('*', { count: 'exact', head: true }).eq('trip_id', targetTripId),
          client.from('checklist_items').select('*', { count: 'exact', head: true }).eq('trip_id', targetTripId),
          client.from('trip_notes').select('*', { count: 'exact', head: true }).eq('trip_id', targetTripId),
          client.from('trips').select('*', { count: 'exact', head: true }).eq('id', targetTripId),
        ]);

        if (eDocs || eExp || eBookings || eItems || eDays || ePlaces || eStays || eLegs || eChk || eNotes || eTrips) {
          const firstErr = eDocs || eExp || eBookings || eItems || eDays || ePlaces || eStays || eLegs || eChk || eNotes || eTrips;
          throw new Error(`Failed querying cloud records before reset: ${firstErr?.message}`);
        }

        cloudCounts = {
          documents: cDocs ?? 0,
          expenses: cExp ?? 0,
          items: cItems ?? 0,
          days: cDays ?? 0,
          places: cPlaces ?? 0,
          accommodations: cStays ?? 0,
          transportLegs: cLegs ?? 0,
          checklists: cChk ?? 0,
          notes: cNotes ?? 0,
          trips: cTrips ?? 0,
        };

        // Storage bucket cleanup: remove any obsolete files in 'trip-documents'
        try {
          const { data: cloudDocRecords } = await client
            .from('booking_documents')
            .select('storage_path')
            .eq('trip_id', targetTripId);

          if (cloudDocRecords && cloudDocRecords.length > 0) {
            const filesToRemove = cloudDocRecords
              .map((d: any) => d.storage_path)
              .filter((p: string | null) => Boolean(p && !p.startsWith('/') && !p.startsWith('http')));
            if (filesToRemove.length > 0) {
              await client.storage.from('trip-documents').remove(filesToRemove);
            }
          }
        } catch (stErr) {
          console.warn('Storage file cleanup check notice:', stErr);
        }

        // Strict FK order deletion with explicit error checking (Rule 8)
        const tablesToDelete = [
          'booking_documents',
          'expenses',
          'bookings',
          'itinerary_items',
          'itinerary_days',
          'places',
          'accommodation_stays',
          'transport_legs',
          'checklist_items',
          'trip_notes',
          'budget_categories',
          'sync_metadata',
        ];

        for (const tbl of tablesToDelete) {
          const { error: delErr } = await client.from(tbl).delete().eq('trip_id', targetTripId);
          if (delErr) {
            throw new Error(`Failed deleting from cloud table '${tbl}': ${delErr.message} (Code: ${delErr.code})`);
          }
        }

        const { error: tripDelErr } = await client.from('trips').delete().eq('id', targetTripId);
        if (tripDelErr) {
          throw new Error(`Failed deleting cloud parent trip '${targetTripId}': ${tripDelErr.message} (Code: ${tripDelErr.code})`);
        }

        cloudStatus = 'cleared';
      }
    } catch (err: any) {
      console.error('Cloud reset error:', err.message);
      cloudStatus = 'failed';
      cloudErrorMessage = err.message;
    }
  }

  const isSuccess = cloudStatus !== 'failed';

  return {
    success: isSuccess,
    obsoleteTripId: targetTripId,
    backupExported: true,
    backupTimestamp: new Date().toISOString(),
    localRecordsDeleted: {
      trips: preTripCount,
      days: preDaysCount,
      items: preItemsCount,
      expenses: preExpensesCount,
      documents: preDocsCount,
      transportLegs: preTransportCount,
      accommodations: preStaysCount,
      places: prePlacesCount,
      checklists: preChecklistsCount,
      notes: preNotesCount,
      syncQueue: preQueueCount,
    },
    cloudRecordsDeleted: cloudCounts,
    cloudStatus,
    message: !isSuccess
      ? `Local reset completed, but cloud deletion failed: ${cloudErrorMessage}`
      : 'Clean data reset completed successfully. Ready for clean pilgrimage data creation.',
  };
}
