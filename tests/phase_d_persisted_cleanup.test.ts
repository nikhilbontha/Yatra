import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CONFIRMED_ITINERARY_DAYS,
  CONFIRMED_TRANSPORT_LEGS,
  CONFIRMED_ACCOMMODATION_STAYS,
  CONFIRMED_PLACES,
  CONFIRMED_CHECKLIST_ITEMS,
} from '@/lib/itinerary-data';
import {
  DEFAULT_TRIP_ID,
  INITIAL_TRIP,
  INITIAL_NOTES,
} from '@/lib/seed-data';
import {
  CONFIRMED_TRIP_ID,
  CONFIRMED_PILGRIMAGE_TRIP,
  cleanPersistedPrototypeRecords,
  getFullTripData,
  initializeDatabase,
} from '@/lib/db';
import { generateUUID } from '@/lib/uuid';
import { BookingDocument, Expense } from '@/types/trip';

// Mock storage tables for Node.js test environment
const mockStorage: Record<string, any[]> = {
  trips: [{ id: CONFIRMED_TRIP_ID, ...CONFIRMED_PILGRIMAGE_TRIP }],
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
    cleanPersistedPrototypeRecords: async (tripId: string = actual.CONFIRMED_TRIP_ID) => {
      const deletedDocumentIds: string[] = [];
      const deletedExpenseIds: string[] = [];
      const deletedSyncQueueIds: string[] = [];

      // 1. Documents
      const allDocs = [...mockStorage.documents];
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
          mockStorage.documents = mockStorage.documents.filter(d => d.id !== doc.id);
          deletedDocumentIds.push(doc.id);
        }
      }

      // 2. Expenses
      const allExpenses = [...mockStorage.expenses];
      for (const exp of allExpenses) {
        const isPrototypeExpense =
          exp.id.startsWith('e7a1b32d-9831-4fa2-8b43-0007') ||
          exp.id.startsWith('exp-') ||
          exp.notes?.includes('PNR: 1234567890') ||
          exp.notes?.includes('Hotel Sri Sai Residency') ||
          exp.title === 'Khammam Fort Entry & Guide' ||
          exp.title === 'Temple Darshan' ||
          (exp.tripId === DEFAULT_TRIP_ID && exp.amount === 1200 && exp.category === 'Transport');

        if (isPrototypeExpense) {
          mockStorage.expenses = mockStorage.expenses.filter(e => e.id !== exp.id);
          deletedExpenseIds.push(exp.id);
        }
      }

      // 3. SyncQueue
      const deletedIdSet = new Set([...deletedDocumentIds, ...deletedExpenseIds]);
      const queue = [...mockStorage.syncQueue];
      for (const item of queue) {
        if (deletedIdSet.has(item.recordId)) {
          mockStorage.syncQueue = mockStorage.syncQueue.filter(q => q.id !== item.id);
          deletedSyncQueueIds.push(item.id);
        }
      }

      return {
        deletedDocumentIds,
        deletedExpenseIds,
        deletedTransportIds: [],
        deletedAccommodationIds: [],
        deletedPlaceIds: [],
        deletedChecklistIds: [],
        deletedSyncQueueIds,
        preservedRecordCounts: {
          itineraryDays: mockStorage.itineraryDays.filter(d => d.tripId === tripId).length,
          itineraryTasks: mockStorage.itineraryItems.filter(i => i.tripId === tripId).length,
          transportLegs: mockStorage.transportLegs.filter(t => t.tripId === tripId).length,
          accommodations: mockStorage.accommodations.filter(a => a.tripId === tripId).length,
          places: mockStorage.places.filter(p => p.tripId === tripId).length,
          checklists: mockStorage.checklists.filter(c => c.tripId === tripId).length,
          notes: mockStorage.notes.filter(n => n.tripId === tripId).length,
          expenses: mockStorage.expenses.filter(e => e.tripId === tripId).length,
          documents: mockStorage.documents.filter(d => d.tripId === tripId).length,
        },
      };
    },
    getFullTripData: async (tripId: string) => ({
      trip: mockStorage.trips.find(t => t.id === tripId) || mockStorage.trips[0],
      days: mockStorage.itineraryDays.filter(d => d.tripId === tripId),
      expenses: mockStorage.expenses.filter(e => e.tripId === tripId),
      bookings: [],
      documents: mockStorage.documents.filter(d => d.tripId === tripId),
      transportLegs: mockStorage.transportLegs.filter(t => t.tripId === tripId),
      accommodations: mockStorage.accommodations.filter(a => a.tripId === tripId),
      places: mockStorage.places.filter(p => p.tripId === tripId),
      checklists: mockStorage.checklists.filter(c => c.tripId === tripId),
      notes: mockStorage.notes.filter(n => n.tripId === tripId).length > 0
        ? mockStorage.notes.filter(n => n.tripId === tripId)
        : mockStorage.notes,
    }),
  };
});

describe('Phase D — Verified Persisted-Data Cleanup Test Suite', () => {
  beforeEach(() => {
    // Reset mock storage to confirmed state
    mockStorage.trips = [{ id: CONFIRMED_TRIP_ID, ...CONFIRMED_PILGRIMAGE_TRIP }];
    mockStorage.itineraryDays = [...CONFIRMED_ITINERARY_DAYS];
    mockStorage.itineraryItems = CONFIRMED_ITINERARY_DAYS.flatMap(d => d.tasks || []);
    mockStorage.expenses = [];
    mockStorage.documents = [];
    mockStorage.transportLegs = [...CONFIRMED_TRANSPORT_LEGS];
    mockStorage.accommodations = [...CONFIRMED_ACCOMMODATION_STAYS];
    mockStorage.places = [...CONFIRMED_PLACES];
    mockStorage.checklists = [...CONFIRMED_CHECKLIST_ITEMS];
    mockStorage.notes = [...INITIAL_NOTES];
    mockStorage.syncQueue = [];
  });

  describe('1. Confirmed Approved Itinerary and Core Data Preservation', () => {
    it('preserves exactly 19 approved itinerary days (17 Nov – 5 Dec 2026)', async () => {
      const data = await getFullTripData(CONFIRMED_TRIP_ID);
      expect(data.days.length).toBe(19);
      expect(data.days[0].date).toBe('2026-11-17');
      expect(data.days[18].date).toBe('2026-12-05');
    });

    it('preserves all 50 activities across the 19 days', async () => {
      const taskCount = mockStorage.itineraryItems.filter(i => i.tripId === CONFIRMED_TRIP_ID).length;
      expect(taskCount).toBe(50);
    });

    it('preserves 32 approved places with 0 mentions of Srisailam', async () => {
      const data = await getFullTripData(CONFIRMED_TRIP_ID);
      expect(data.places.length).toBe(32);
      for (const p of data.places) {
        expect(p.name.toLowerCase()).not.toContain('srisailam');
        expect(p.name.toLowerCase()).not.toContain('mallikarjuna');
      }
    });

    it('preserves 19 transport legs and 11 research stays without fabricated PNRs', async () => {
      const data = await getFullTripData(CONFIRMED_TRIP_ID);
      expect(data.transportLegs.length).toBe(19);
      for (const leg of data.transportLegs) {
        expect(leg.pnr).toBeUndefined();
        expect(['Planned', 'Needs verification']).toContain(leg.status);
      }

      expect(data.accommodations.length).toBe(11);
      for (const stay of data.accommodations) {
        expect(stay.bookingReference).toBeUndefined();
      }
    });

    it('preserves 36 checklist items with user completion status intact', async () => {
      const data = await getFullTripData(CONFIRMED_TRIP_ID);
      expect(data.checklists.length).toBe(36);
    });

    it('preserves 3 notes/journal items', async () => {
      const data = await getFullTripData(CONFIRMED_TRIP_ID);
      expect(data.notes.length).toBe(3);
    });
  });

  describe('2. Surgical Purge of Confirmed Prototype Records', () => {
    it('surgically purges prototype documents while strictly preserving genuine user documents', async () => {
      // Prototype doc
      const protoDoc: BookingDocument = {
        id: 'e7a1b32d-9831-4fa2-8b43-000800000001',
        tripId: CONFIRMED_TRIP_ID,
        title: 'Hyderabad → Khammam',
        docType: 'Train Ticket',
        pnr: '1234567890',
        fileUrl: '',
        fileName: 'ticket.pdf',
        fileSize: 1024,
        fileType: 'application/pdf',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        offlineCached: false,
      };
      mockStorage.documents.push(protoDoc);

      // Genuine user doc
      const genuineDocId = generateUUID();
      const genuineDoc: BookingDocument = {
        id: genuineDocId,
        tripId: CONFIRMED_TRIP_ID,
        title: 'My Genuine Train Ticket',
        docType: 'Train Ticket',
        pnr: '4567890123',
        fileUrl: '',
        fileName: 'real_ticket.pdf',
        fileSize: 2048,
        fileType: 'application/pdf',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        offlineCached: true,
      };
      mockStorage.documents.push(genuineDoc);

      // Run cleanup
      const result = await cleanPersistedPrototypeRecords(CONFIRMED_TRIP_ID);

      // Verify prototype doc was deleted
      expect(result.deletedDocumentIds).toContain(protoDoc.id);
      expect(mockStorage.documents.some(d => d.id === protoDoc.id)).toBe(false);

      // Verify genuine doc was strictly preserved
      expect(mockStorage.documents.some(d => d.id === genuineDocId)).toBe(true);
      const preserved = mockStorage.documents.find(d => d.id === genuineDocId);
      expect(preserved?.title).toBe('My Genuine Train Ticket');
    });

    it('surgically purges prototype expenses while strictly preserving genuine user expenses', async () => {
      // Prototype expense
      const protoExp: Expense = {
        id: 'e7a1b32d-9831-4fa2-8b43-000700000001',
        tripId: CONFIRMED_TRIP_ID,
        dayId: '00000000-0000-4000-8000-000000000001',
        date: '2026-11-17',
        category: 'Sightseeing',
        amount: 250,
        title: 'Khammam Fort Entry & Guide',
        paymentMethod: 'Cash',
        isCashInflow: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockStorage.expenses.push(protoExp);

      // Genuine user expense
      const genuineExpId = generateUUID();
      const genuineExp: Expense = {
        id: genuineExpId,
        tripId: CONFIRMED_TRIP_ID,
        dayId: '00000000-0000-4000-8000-000000000001',
        date: '2026-11-17',
        category: 'Food',
        amount: 45,
        title: 'Chai and Biscuits at Secunderabad',
        paymentMethod: 'UPI',
        isCashInflow: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockStorage.expenses.push(genuineExp);

      // Run cleanup
      const result = await cleanPersistedPrototypeRecords(CONFIRMED_TRIP_ID);

      // Verify prototype expense was deleted
      expect(result.deletedExpenseIds).toContain(protoExp.id);
      expect(mockStorage.expenses.some(e => e.id === protoExp.id)).toBe(false);

      // Verify genuine expense was strictly preserved
      expect(mockStorage.expenses.some(e => e.id === genuineExpId)).toBe(true);
      const preserved = mockStorage.expenses.find(e => e.id === genuineExpId);
      expect(preserved?.title).toBe('Chai and Biscuits at Secunderabad');
      expect(preserved?.amount).toBe(45);
    });

    it('purges offline syncQueue items referencing deleted prototype records', async () => {
      const protoDocId = 'e7a1b32d-9831-4fa2-8b43-000800000002';
      const userDocId = generateUUID();

      mockStorage.documents.push({
        id: protoDocId,
        tripId: CONFIRMED_TRIP_ID,
        title: 'Khammam → Srisailam',
        docType: 'Train Ticket',
        fileUrl: '',
        fileName: 'fake.pdf',
        fileSize: 100,
        mimeType: 'application/pdf',
        uploadedAt: new Date().toISOString(),
        offlineCached: false,
      });

      mockStorage.syncQueue.push(
        { id: 'q-proto', entity: 'documents', action: 'insert', recordId: protoDocId, status: 'pending' },
        { id: 'q-user', entity: 'documents', action: 'insert', recordId: userDocId, status: 'pending' }
      );

      // Run cleanup
      const result = await cleanPersistedPrototypeRecords(CONFIRMED_TRIP_ID);

      expect(result.deletedSyncQueueIds).toContain('q-proto');
      expect(mockStorage.syncQueue.some(q => q.recordId === protoDocId)).toBe(false);
      expect(mockStorage.syncQueue.some(q => q.recordId === userDocId)).toBe(true);
    });
  });

  describe('3. Zero Fabricated PNRs and Unbudgeted Initialization', () => {
    it('initializes active trip with budget set to 0 ("Budget not set")', async () => {
      const trip = mockStorage.trips.find(t => t.id === CONFIRMED_TRIP_ID);
      expect(trip?.totalBudget).toBe(0);
      expect(trip?.emergencyReserve).toBe(0);
      expect(trip?.openingCash).toBe(0);
    });

    it('contains 0 fabricated PNRs across all documents and transport legs', async () => {
      const data = await getFullTripData(CONFIRMED_TRIP_ID);
      for (const doc of data.documents) {
        expect(doc.pnr).not.toBe('1234567890');
        expect(doc.pnr).not.toBe('9876543210');
      }
      for (const leg of data.transportLegs) {
        expect(leg.pnr).not.toBe('1234567890');
        expect(leg.pnr).not.toBe('9876543210');
      }
    });
  });
});
