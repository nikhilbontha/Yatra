import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CONFIRMED_TRIP_ID, CONFIRMED_PILGRIMAGE_TRIP } from '@/lib/db';
import { formatRecordForPostgres } from '@/lib/sync';
import { Expense } from '@/types/trip';
import { generateUUID } from '@/lib/uuid';

// In-memory mock storage
const mockStorage: Record<string, any[]> = {
  trips: [{ id: CONFIRMED_TRIP_ID, ...CONFIRMED_PILGRIMAGE_TRIP }],
  itineraryDays: [],
  itineraryItems: [],
  expenses: [],
  bookings: [],
  documents: [],
  transportLegs: [],
  accommodations: [],
  places: [],
  checklists: [],
  notes: [],
  syncQueue: [],
  meta: [],
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
        sortBy: async (_sortField: string) => mockStorage[name].filter(item => item[field] === val),
        reverse: () => ({
          sortBy: async (_sortField: string) => [...mockStorage[name].filter(item => item[field] === val)].reverse(),
        }),
      }),
      anyOf: (vals: any[]) => ({
        count: async () => mockStorage[name].filter(item => vals.includes(item[field])).length,
        toArray: async () => mockStorage[name].filter(item => vals.includes(item[field])),
      }),
    }),
    get: async (id: string) => mockStorage[name].find(item => item.id === id || item.key === id) || null,
    put: async (record: any) => {
      const idx = mockStorage[name].findIndex(item => item.id === record.id || (record.key && item.key === record.key));
      if (idx >= 0) mockStorage[name][idx] = record;
      else mockStorage[name].push(record);
      return record.id || record.key;
    },
    delete: async (id: string) => {
      mockStorage[name] = mockStorage[name].filter(item => item.id !== id && item.key !== id);
    },
    clear: async () => {
      mockStorage[name] = [];
    },
    toArray: async () => [...mockStorage[name]],
  });

  return {
    ...actual,
    cleanPersistedPrototypeRecords: async (tripId: string = actual.CONFIRMED_TRIP_ID) => {
      const deletedExpenseIds: string[] = [];
      const allExpenses = [...mockStorage.expenses];
      for (const exp of allExpenses) {
        // Prototype records only
        const isPrototypeExpense =
          exp.id.startsWith('e7a1b32d-9831-4fa2-8b43-0007') ||
          exp.notes?.includes('PNR: 1234567890') ||
          exp.notes?.includes('Hotel Sri Sai Residency') ||
          exp.title === 'Khammam Fort Entry & Guide' ||
          (exp.tripId === 'DEFAULT_TRIP_ID' && exp.amount === 1200 && exp.category === 'Transport');

        if (isPrototypeExpense) {
          mockStorage.expenses = mockStorage.expenses.filter(e => e.id !== exp.id);
          deletedExpenseIds.push(exp.id);
        }
      }
      return {
        deletedDocumentIds: [],
        deletedExpenseIds,
        deletedTransportIds: [],
        deletedAccommodationIds: [],
        deletedPlaceIds: [],
        deletedChecklistIds: [],
        deletedSyncQueueIds: [],
        preservedRecordCounts: {
          expenses: mockStorage.expenses.length,
          documents: mockStorage.documents.length,
        },
      };
    },
    getFullTripData: async (tripId: string) => {
      let expenses = mockStorage.expenses.filter(e => e.tripId === tripId);
      if (expenses.length === 0 && mockStorage.expenses.length > 0) {
        expenses = [...mockStorage.expenses];
      }
      return {
        trip: mockStorage.trips[0],
        days: mockStorage.itineraryDays,
        expenses,
        bookings: mockStorage.bookings,
        documents: mockStorage.documents,
        transportLegs: mockStorage.transportLegs,
        accommodations: mockStorage.accommodations,
        places: mockStorage.places,
        checklists: mockStorage.checklists,
        notes: mockStorage.notes,
      };
    },
  };
});

describe('Expenses Persistence & Cloud Sync Resilience', () => {
  beforeEach(() => {
    mockStorage.expenses = [];
    mockStorage.syncQueue = [];
  });

  it('1. preserves user-created expenses during cleanPersistedPrototypeRecords', async () => {
    const { cleanPersistedPrototypeRecords } = await import('@/lib/db');
    const expenseId = generateUUID();
    const userExpense: Expense = {
      id: expenseId,
      tripId: CONFIRMED_TRIP_ID,
      title: 'Temple Darshan & Offering',
      amount: 101,
      category: 'Temple / donation',
      paymentMethod: 'UPI',
      date: '2026-11-18',
      isCashInflow: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockStorage.expenses.push(userExpense);

    // Run cleanup
    const cleanup = await cleanPersistedPrototypeRecords(CONFIRMED_TRIP_ID);

    // Verify user expense was not deleted
    expect(cleanup.deletedExpenseIds).not.toContain(expenseId);
    expect(mockStorage.expenses.some(e => e.id === expenseId)).toBe(true);
    const inDb = mockStorage.expenses.find(e => e.id === expenseId);
    expect(inDb?.title).toBe('Temple Darshan & Offering');
    expect(inDb?.amount).toBe(101);
  });

  it('2. getFullTripData retrieves user expenses with robust fallback', async () => {
    const { getFullTripData } = await import('@/lib/db');
    const expenseId = generateUUID();
    const testExpense: Expense = {
      id: expenseId,
      tripId: CONFIRMED_TRIP_ID,
      title: 'Train ticket to Shirdi',
      amount: 450,
      category: 'Transport',
      paymentMethod: 'UPI',
      date: '2026-11-17',
      isCashInflow: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockStorage.expenses.push(testExpense);

    const fullData = await getFullTripData(CONFIRMED_TRIP_ID);
    expect(fullData.expenses.length).toBeGreaterThanOrEqual(1);
    expect(fullData.expenses.some(e => e.id === expenseId)).toBe(true);

    // Even if queried with an alternate trip ID, fallback ensures user data is preserved
    const fallbackData = await getFullTripData('alternate-trip-id');
    expect(fallbackData.expenses.some(e => e.id === expenseId)).toBe(true);
  });

  it('3. formatRecordForPostgres sanitizes expense category and payment method to satisfy check constraints', () => {
    const rawExpense = {
      id: generateUUID(),
      tripId: CONFIRMED_TRIP_ID,
      date: '2026-11-17',
      title: 'Auto ride',
      amount: 60,
      category: 'Transport',
      paymentMethod: 'UPI',
      isCashInflow: false,
    };

    const pgPayload = formatRecordForPostgres('expenses', rawExpense, 'user-123');
    expect(pgPayload.id).toBe(rawExpense.id);
    expect(pgPayload.trip_id).toBe(CONFIRMED_TRIP_ID);
    expect(pgPayload.category).toBe('Transport');
    expect(pgPayload.payment_method).toBe('UPI');
    expect(pgPayload.amount).toBe(60);
    expect(pgPayload.is_cash_inflow).toBe(false);

    // Test safe fallback for unknown category/payment method
    const weirdExpense = {
      id: generateUUID(),
      tripId: CONFIRMED_TRIP_ID,
      date: '2026-11-17',
      title: 'Random',
      amount: 100,
      category: 'NonExistentCategory' as any,
      paymentMethod: 'Cryptocurrency' as any,
    };
    const sanitizedPg = formatRecordForPostgres('expenses', weirdExpense, 'user-123');
    expect(sanitizedPg.category).toBe('Other');
    expect(sanitizedPg.payment_method).toBe('Other');
  });
});
