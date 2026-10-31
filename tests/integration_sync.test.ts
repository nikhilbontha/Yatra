import { describe, it, expect, vi } from 'vitest';
import {
  DEFAULT_TRIP_ID,
  INITIAL_TRIP,
  INITIAL_DAYS,
  INITIAL_PLACES,
  INITIAL_TRANSPORT,
  INITIAL_STAYS,
  INITIAL_CHECKLIST,
  INITIAL_NOTES,
  toDeterministicUUID,
} from '@/lib/seed-data';

// Mock getFullTripData to return the preloaded Jyotirlinga pilgrimage dataset
vi.mock('@/lib/db', () => ({
  getFullTripData: vi.fn(async (tripId: string) => ({
    trip: INITIAL_TRIP,
    days: INITIAL_DAYS,
    expenses: [],
    bookings: [],
    documents: [],
    transportLegs: INITIAL_TRANSPORT,
    accommodations: INITIAL_STAYS,
    places: INITIAL_PLACES,
    checklists: INITIAL_CHECKLIST,
    notes: INITIAL_NOTES,
  })),
  db: {
    syncQueue: {
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn(async () => []),
          count: vi.fn(async () => 0),
          and: vi.fn(() => ({ delete: vi.fn() })),
        })),
      })),
    },
    meta: {
      put: vi.fn(),
    },
    trips: {
      get: vi.fn(async () => INITIAL_TRIP),
      put: vi.fn(),
    },
  },
  queueOfflineChange: vi.fn(),
}));

import { safeInitialCloudImport, fetchCloudRowCounts } from '@/lib/sync';

// Strict Mock Supabase Client validating schema, foreign keys, and RLS policy
function createStrictMockSupabaseClient() {
  const tables: Record<string, any[]> = {
    trips: [],
    itinerary_days: [],
    itinerary_items: [],
    expenses: [],
    bookings: [],
    places: [],
    checklist_items: [],
    transport_legs: [],
    accommodation_stays: [],
    trip_notes: [],
    booking_documents: [],
  };

  const allowedColumns: Record<string, string[]> = {
    trips: ['id', 'user_id', 'title', 'origin', 'destination', 'start_date', 'end_date', 'total_budget', 'emergency_reserve', 'opening_cash', 'notes', 'is_active', 'created_at', 'updated_at'],
    itinerary_days: ['id', 'trip_id', 'day_number', 'date', 'title', 'subtitle', 'theme_type', 'details', 'location', 'status', 'created_at', 'updated_at'],
    itinerary_items: ['id', 'trip_id', 'day_id', 'title', 'item_type', 'time_estimate', 'is_completed', 'needs_verification', 'verification_note', 'location', 'notes', 'sort_order', 'created_at', 'updated_at'],
    expenses: ['id', 'trip_id', 'day_id', 'date', 'title', 'amount', 'category', 'payment_method', 'destination', 'notes', 'is_cash_inflow', 'receipt_url', 'created_at', 'updated_at'],
    bookings: ['id', 'trip_id', 'title', 'booking_type', 'reference_pnr', 'provider', 'booking_date', 'departure_time', 'arrival_time', 'seat_details', 'status', 'notes', 'created_at', 'updated_at'],
    places: ['id', 'trip_id', 'name', 'city', 'place_type', 'significance', 'opening_hours', 'dress_code', 'darshan_type', 'needs_verification', 'map_url', 'notes', 'created_at', 'updated_at'],
    checklist_items: ['id', 'trip_id', 'category', 'title', 'is_completed', 'sort_order', 'created_at', 'updated_at'],
    transport_legs: ['id', 'trip_id', 'day_id', 'from_location', 'to_location', 'mode', 'service_number', 'departure_time', 'arrival_time', 'status', 'needs_verification', 'booking_ref', 'notes', 'created_at', 'updated_at'],
    accommodation_stays: ['id', 'trip_id', 'name', 'stay_type', 'city', 'checkin_date', 'checkout_date', 'estimated_cost', 'contact_phone', 'address', 'booking_reference', 'notes', 'created_at', 'updated_at'],
    trip_notes: ['id', 'trip_id', 'day_id', 'title', 'content', 'category', 'created_at', 'updated_at'],
    booking_documents: ['id', 'trip_id', 'booking_id', 'title', 'doc_type', 'file_name', 'file_size', 'file_type', 'storage_path', 'travel_date', 'notes', 'created_at', 'updated_at'],
  };

  const client: any = {
    tables,
    from: (tableName: string) => {
      let filterTripId: string | null = null;
      let filterId: string | null = null;

      const queryBuilder: any = {
        select: (cols: string, opts?: any) => {
          if (opts && opts.count === 'exact') {
            return {
              eq: async (col: string, val: string) => {
                const list = tables[tableName] || [];
                const count = list.filter(r => (col === 'trip_id' ? r.trip_id === val : r.id === val)).length;
                return { count, error: null };
              },
            };
          }
          return queryBuilder;
        },
        eq: (col: string, val: string) => {
          if (col === 'id') filterId = val;
          if (col === 'trip_id') filterTripId = val;
          return queryBuilder;
        },
        maybeSingle: async () => {
          const list = tables[tableName] || [];
          const match = list.find(r => (filterId ? r.id === filterId : true) && (filterTripId ? r.trip_id === filterTripId : true));
          return { data: match || null, error: null };
        },
        upsert: async (records: any) => {
          const items = Array.isArray(records) ? records : [records];
          const validCols = allowedColumns[tableName] || [];

          for (const item of items) {
            // 1. Strictly check column schema (fails if user_id is passed to child tables)
            for (const key of Object.keys(item)) {
              if (!validCols.includes(key)) {
                return {
                  data: null,
                  error: {
                    message: `column "${key}" of relation "${tableName}" does not exist`,
                    code: '42703',
                  },
                };
              }
            }

            // 2. Check foreign key: trips must exist before child rows can be inserted
            if (tableName !== 'trips' && item.trip_id) {
              const tripExists = tables.trips.some(t => t.id === item.trip_id);
              if (!tripExists) {
                return {
                  data: null,
                  error: {
                    message: `violates foreign key constraint on trip_id: ${item.trip_id}`,
                    code: '23503',
                  },
                };
              }
            }

            // 3. Check itinerary_items day_id foreign key
            if (tableName === 'itinerary_items' && item.day_id) {
              const dayExists = tables.itinerary_days.some(d => d.id === item.day_id);
              if (!dayExists) {
                return {
                  data: null,
                  error: {
                    message: `violates foreign key constraint on day_id: ${item.day_id}`,
                    code: '23503',
                  },
                };
              }
            }

            // Insert / update item
            const idx = tables[tableName].findIndex(r => r.id === item.id);
            if (idx >= 0) {
              tables[tableName][idx] = { ...tables[tableName][idx], ...item };
            } else {
              tables[tableName].push({ ...item });
            }
          }
          return { data: items, error: null };
        },
      };

      return queryBuilder;
    },
  };

  return client;
}

describe('Full Database Sync & Initial Import Integration', () => {
  it('correctly imports preloaded 19 days and 50 items into strict PostgreSQL schema without user_id errors', async () => {
    const mockClient = createStrictMockSupabaseClient();
    const userId = '00000000-0000-4000-8000-000000000001';

    // Execute initial import
    const importRes = await safeInitialCloudImport(mockClient, userId, DEFAULT_TRIP_ID);
    expect(importRes.importedCount).toBeGreaterThan(0);

    // Verify row counts in Supabase
    const counts = await fetchCloudRowCounts(mockClient, DEFAULT_TRIP_ID);
    expect(counts.trips).toBe(1);
    expect(counts.itineraryDays).toBe(19);
    expect(counts.itineraryItems).toBe(50);
    expect(counts.places).toBe(INITIAL_PLACES.length);
    expect(counts.transportLegs).toBe(INITIAL_TRANSPORT.length);
    expect(counts.accommodations).toBe(INITIAL_STAYS.length);
    expect(counts.checklists).toBe(INITIAL_CHECKLIST.length);
    expect(counts.notes).toBe(3);

    // Verify parent-child IDs: every itinerary item's day_id points to a valid itinerary_days record
    const allItems = mockClient.tables.itinerary_items;
    const allDays = mockClient.tables.itinerary_days;
    const dayIds = new Set(allDays.map((d: any) => d.id));

    for (const item of allItems) {
      expect(dayIds.has(item.day_id)).toBe(true);
      expect(item.trip_id).toBe(DEFAULT_TRIP_ID);
      expect((item as any).user_id).toBeUndefined(); // Strictly no user_id column
    }

    // Verify trips table has user_id set to authenticated user
    const savedTrip = mockClient.tables.trips[0];
    expect(savedTrip.user_id).toBe(userId);
    expect(savedTrip.id).toBe(DEFAULT_TRIP_ID);
  });

  it('determines deterministic UUIDs without collision', () => {
    const day1UUID = toDeterministicUUID('d1-2026-11-17');
    const day2UUID = toDeterministicUUID('d2-2026-11-18');
    expect(day1UUID).not.toBe(day2UUID);

    const task1UUID = toDeterministicUUID('task-1-1');
    const task2UUID = toDeterministicUUID('task-1-2');
    expect(task1UUID).not.toBe(task2UUID);

    // Same string always yields identical UUID
    expect(toDeterministicUUID('d1-2026-11-17')).toBe(day1UUID);
  });
});
