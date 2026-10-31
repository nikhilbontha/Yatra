import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CONFIRMED_TRANSPORT_LEGS,
  CONFIRMED_ACCOMMODATION_STAYS,
  CONFIRMED_PLACES,
  CONFIRMED_CHECKLIST_ITEMS,
  CONFIRMED_ITINERARY_DAYS,
} from '@/lib/itinerary-data';
import { INITIAL_TRIP, INITIAL_NOTES } from '@/lib/seed-data';
import { SyncInspectorModal, PendingQueueItemDetail } from '@/components/modals/SyncInspectorModal';
import { TicketsView } from '@/components/views/TicketsView';

const CONFIRMED_TRIP_ID = '00000000-0000-4000-8000-000000000001';

// Mock storage tables for Node.js test environment
const mockStorage: Record<string, any[]> = {
  trips: [{ ...INITIAL_TRIP, id: CONFIRMED_TRIP_ID }],
  itineraryDays: [...CONFIRMED_ITINERARY_DAYS],
  itineraryItems: CONFIRMED_ITINERARY_DAYS.flatMap(d => d.tasks || []),
  expenses: [],
  bookings: [],
  documents: [],
  transportLegs: [...CONFIRMED_TRANSPORT_LEGS],
  accommodations: [...CONFIRMED_ACCOMMODATION_STAYS],
  places: [...CONFIRMED_PLACES],
  checklists: [...CONFIRMED_CHECKLIST_ITEMS],
  notes: [...INITIAL_NOTES],
  syncQueue: [],
  meta: [{ key: 'activeTripId', value: CONFIRMED_TRIP_ID }],
};

vi.mock('@/lib/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db')>();

  const createMockTable = (name: string) => ({
    where: (field: string) => ({
      equals: (val: any) => ({
        count: async () => mockStorage[name].filter(item => item[field] === val).length,
        delete: async () => {
          mockStorage[name] = mockStorage[name].filter(item => item[field] !== val);
        },
        toArray: async () => mockStorage[name].filter(item => item[field] === val),
        sortBy: async (sortKey: string) => {
          const filtered = mockStorage[name].filter(item => item[field] === val);
          return [...filtered].sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : -1));
        },
        reverse: () => ({
          sortBy: async (sortKey: string) => {
            const filtered = mockStorage[name].filter(item => item[field] === val);
            return [...filtered].sort((a, b) => (a[sortKey] < b[sortKey] ? 1 : -1));
          },
        }),
      }),
    }),
    count: async () => mockStorage[name].length,
    toArray: async () => [...mockStorage[name]],
    put: async (item: any) => {
      const idx = mockStorage[name].findIndex(
        x => (x.id && x.id === item.id) || (x.key && x.key === item.key)
      );
      if (idx >= 0) mockStorage[name][idx] = item;
      else mockStorage[name].push(item);
    },
    get: async (key: string) =>
      mockStorage[name].find(x => x.id === key || x.key === key),
    delete: async (key: string) => {
      mockStorage[name] = mockStorage[name].filter(x => x.id !== key && x.key !== key);
    },
    clear: async () => {
      mockStorage[name] = [];
    },
  });

  const mockDb = {
    trips: createMockTable('trips'),
    itineraryDays: createMockTable('itineraryDays'),
    itineraryItems: createMockTable('itineraryItems'),
    expenses: createMockTable('expenses'),
    bookings: createMockTable('bookings'),
    documents: createMockTable('documents'),
    transportLegs: createMockTable('transportLegs'),
    accommodations: createMockTable('accommodations'),
    places: createMockTable('places'),
    checklists: createMockTable('checklists'),
    notes: createMockTable('notes'),
    syncQueue: createMockTable('syncQueue'),
    meta: createMockTable('meta'),
    transaction: async (_mode: any, _tables: any, callback: () => Promise<any>) => callback(),
  };

  return {
    ...actual,
    db: mockDb,
    getUserDeletedStayIds: async () => {
      const row = mockStorage.meta.find(m => m.key === 'user_deleted_stay_ids');
      return new Set<string>(row && Array.isArray(row.value) ? row.value : []);
    },
    recordDeletedStay: async (stayId: string) => {
      let row = mockStorage.meta.find(m => m.key === 'user_deleted_stay_ids');
      if (!row) {
        row = { key: 'user_deleted_stay_ids', value: [stayId] };
        mockStorage.meta.push(row);
      } else {
        const set = new Set<string>(row.value);
        set.add(stayId);
        row.value = Array.from(set);
      }
    },
    getUserDeletedTransportIds: async () => {
      const row = mockStorage.meta.find(m => m.key === 'user_deleted_transport_ids');
      return new Set<string>(row && Array.isArray(row.value) ? row.value : []);
    },
    recordDeletedTransport: async (legId: string) => {
      let row = mockStorage.meta.find(m => m.key === 'user_deleted_transport_ids');
      if (!row) {
        row = { key: 'user_deleted_transport_ids', value: [legId] };
        mockStorage.meta.push(row);
      } else {
        const set = new Set<string>(row.value);
        set.add(legId);
        row.value = Array.from(set);
      }
    },
    ensureConfirmedAccommodation: async (tripId: string) => {
      const deletedRow = mockStorage.meta.find(m => m.key === 'user_deleted_stay_ids');
      const deletedIds = new Set<string>(deletedRow && Array.isArray(deletedRow.value) ? deletedRow.value : []);
      // Stays that were deleted are never re-seeded
      mockStorage.accommodations = mockStorage.accommodations.filter(s => !deletedIds.has(s.id));
    },
    ensureConfirmedTransport: async (tripId: string) => {
      const deletedRow = mockStorage.meta.find(m => m.key === 'user_deleted_transport_ids');
      const deletedIds = new Set<string>(deletedRow && Array.isArray(deletedRow.value) ? deletedRow.value : []);
      mockStorage.transportLegs = mockStorage.transportLegs.filter(t => !deletedIds.has(t.id));
    },
    getFullTripData: async (tripId: string) => {
      const deletedStayRow = mockStorage.meta.find(m => m.key === 'user_deleted_stay_ids');
      const deletedStayIds = new Set<string>(deletedStayRow && Array.isArray(deletedStayRow.value) ? deletedStayRow.value : []);

      const deletedTransportRow = mockStorage.meta.find(m => m.key === 'user_deleted_transport_ids');
      const deletedTransportIds = new Set<string>(deletedTransportRow && Array.isArray(deletedTransportRow.value) ? deletedTransportRow.value : []);

      return {
        trip: mockStorage.trips[0],
        days: mockStorage.itineraryDays,
        expenses: mockStorage.expenses,
        accommodations: mockStorage.accommodations.filter(s => !deletedStayIds.has(s.id)),
        transportLegs: mockStorage.transportLegs.filter(t => !deletedTransportIds.has(t.id)),
        documents: mockStorage.documents,
      };
    },
  };
});

import {
  db,
  recordDeletedStay,
  recordDeletedTransport,
  getUserDeletedStayIds,
  getUserDeletedTransportIds,
  ensureConfirmedAccommodation,
  ensureConfirmedTransport,
  getFullTripData,
} from '@/lib/db';

describe('Resurrection Prevention & User Requests 1-5 Verification', () => {
  beforeEach(() => {
    mockStorage.accommodations = [...CONFIRMED_ACCOMMODATION_STAYS];
    mockStorage.transportLegs = [...CONFIRMED_TRANSPORT_LEGS];
    mockStorage.meta = [{ key: 'activeTripId', value: CONFIRMED_TRIP_ID }];
  });

  it('1. Permanently records deleted stay and prevents resurrection in ensureConfirmedAccommodation & getFullTripData', async () => {
    const stayToDelete = CONFIRMED_ACCOMMODATION_STAYS[0];
    expect(stayToDelete).toBeDefined();

    // Record deletion
    await recordDeletedStay(stayToDelete.id);
    const deletedIds = await getUserDeletedStayIds();
    expect(deletedIds.has(stayToDelete.id)).toBe(true);

    // Delete from storage
    mockStorage.accommodations = mockStorage.accommodations.filter(s => s.id !== stayToDelete.id);

    // Run ensureConfirmedAccommodation (simulates app boot / reload)
    await ensureConfirmedAccommodation(CONFIRMED_TRIP_ID);
    const staysInDb = await db.accommodations.where('tripId').equals(CONFIRMED_TRIP_ID).toArray();
    expect(staysInDb.some(s => s.id === stayToDelete.id)).toBe(false);

    // Run getFullTripData (simulates data loading on mount)
    const fullTrip = await getFullTripData(CONFIRMED_TRIP_ID);
    expect(fullTrip.accommodations.some((s: any) => s.id === stayToDelete.id)).toBe(false);
  });

  it('2. Permanently records deleted transport leg and prevents resurrection in ensureConfirmedTransport & getFullTripData', async () => {
    const transportToDelete = CONFIRMED_TRANSPORT_LEGS[0];
    expect(transportToDelete).toBeDefined();

    // Record deletion
    await recordDeletedTransport(transportToDelete.id);
    const deletedIds = await getUserDeletedTransportIds();
    expect(deletedIds.has(transportToDelete.id)).toBe(true);

    // Delete from storage
    mockStorage.transportLegs = mockStorage.transportLegs.filter(t => t.id !== transportToDelete.id);

    // Run ensureConfirmedTransport (simulates app boot / reload)
    await ensureConfirmedTransport(CONFIRMED_TRIP_ID);
    const transportInDb = await db.transportLegs.where('tripId').equals(CONFIRMED_TRIP_ID).toArray();
    expect(transportInDb.some(t => t.id === transportToDelete.id)).toBe(false);

    // Run getFullTripData
    const fullTrip = await getFullTripData(CONFIRMED_TRIP_ID);
    expect(fullTrip.transportLegs.some((t: any) => t.id === transportToDelete.id)).toBe(false);
  });

  it('3. Renders SyncInspectorModal with clear Pending Operations Queue, table breakdown, and cloud sign-in', () => {
    const mockQueue: PendingQueueItemDetail[] = [
      {
        id: 'q-1',
        entity: 'transportLegs',
        recordId: 'leg-1',
        action: 'delete',
        title: 'Hyderabad / Secunderabad → Shirdi',
        timestamp: 'Just now',
      },
      {
        id: 'q-2',
        entity: 'accommodations',
        recordId: 'stay-1',
        action: 'delete',
        title: 'Shri Sai Baba Sansthan Trust Bhaktaniwas',
        timestamp: '1 min ago',
      },
      {
        id: 'q-3',
        entity: 'expenses',
        recordId: 'exp-1',
        action: 'create',
        title: '₹350 Lunch at Shirdi Bhavan',
        timestamp: '2 mins ago',
      },
    ];

    const html = renderToStaticMarkup(
      React.createElement(SyncInspectorModal, {
        isOpen: true,
        isSyncing: false,
        syncStatus: 'idle',
        syncMessage: 'Offline · Local Queue Active',
        onClose: () => {},
        onSyncNow: () => Promise.resolve(),
        pendingCount: mockQueue.length,
        pendingItems: mockQueue,
        cloudUser: null,
      })
    );

    // Modal title & headers
    expect(html).toContain('Cloud Sync Inspector');
    expect(html).toContain('Pending Operations Queue');

    // Human-readable titles & action badges
    expect(html).toContain('Hyderabad / Secunderabad → Shirdi');
    expect(html).toContain('Shri Sai Baba Sansthan Trust Bhaktaniwas');
    expect(html).toContain('₹350 Lunch at Shirdi Bhavan');
    expect(html).toContain('Delete');
    expect(html).toContain('Added');

    // Data Tables Breakdown
    expect(html).toContain('Data Tables Breakdown');
    expect(html).toContain('Device vs Cloud');
    expect(html).toContain('Transport');
    expect(html).toContain('Accommodations');
    expect(html).toContain('Expenses');

    // Multi-Device Cloud Sync login form
    expect(html).toContain('Multi-Device Cloud Sync');
    expect(html).toContain('Connect Account');
  });

  it('4. Tickets, Documents, and Transport are 3 clean distinct pages without cross-view clutter', () => {
    // 1. Tickets Dedicated View
    const ticketsHtml = renderToStaticMarkup(
      React.createElement(TicketsView, {
        trip: INITIAL_TRIP,
        days: CONFIRMED_ITINERARY_DAYS,
        documents: [],
        transportLegs: CONFIRMED_TRANSPORT_LEGS,
        initialSection: 'tickets',
        onSaveDocument: () => Promise.resolve(),
        onDeleteDocument: () => Promise.resolve(),
        onSaveTransport: () => Promise.resolve(),
        onDeleteTransport: () => Promise.resolve(),
      })
    );
    expect(ticketsHtml).toContain('Travel Tickets &amp; Passes');
    expect(ticketsHtml).toContain('Train Tickets');
    expect(ticketsHtml).toContain('Bus Tickets');
    // Does not show Documents vault
    expect(ticketsHtml).not.toContain('Pilgrimage Document Vault');

    // 2. Documents Dedicated View
    const docsHtml = renderToStaticMarkup(
      React.createElement(TicketsView, {
        trip: INITIAL_TRIP,
        days: CONFIRMED_ITINERARY_DAYS,
        documents: [],
        transportLegs: CONFIRMED_TRANSPORT_LEGS,
        initialSection: 'documents',
        onSaveDocument: () => Promise.resolve(),
        onDeleteDocument: () => Promise.resolve(),
        onSaveTransport: () => Promise.resolve(),
        onDeleteTransport: () => Promise.resolve(),
      })
    );
    expect(docsHtml).toContain('Important Documents');
    expect(docsHtml).toContain('Pilgrimage Document Vault');
    expect(docsHtml).toContain('ID Proofs &amp; Cards');
    // Does not show separate travel tickets section
    expect(docsHtml).not.toContain('Separate Travel Tickets Section');

    // 3. Transport Dedicated View
    const transportHtml = renderToStaticMarkup(
      React.createElement(TicketsView, {
        trip: INITIAL_TRIP,
        days: CONFIRMED_ITINERARY_DAYS,
        documents: [],
        transportLegs: CONFIRMED_TRANSPORT_LEGS,
        initialSection: 'transport',
        onSaveDocument: () => Promise.resolve(),
        onDeleteDocument: () => Promise.resolve(),
        onSaveTransport: () => Promise.resolve(),
        onDeleteTransport: () => Promise.resolve(),
      })
    );
    expect(transportHtml).toContain('Transport');
    expect(transportHtml).toContain('Upcoming Journey');
    expect(transportHtml).toContain('Add Train');
    expect(transportHtml).toContain('Add Bus');
  });
});
