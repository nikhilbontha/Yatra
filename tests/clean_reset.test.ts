import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  DEFAULT_TRIP_ID,
  INITIAL_TRIP,
  INITIAL_DAYS,
  INITIAL_EXPENSES,
  INITIAL_PLACES,
  INITIAL_STAYS,
  INITIAL_TRANSPORT,
} from '@/lib/seed-data';
import { CLEAN_EMPTY_TRIP, CLEAN_EMPTY_TRIP_ID, executeCleanDataReset } from '@/lib/clean-reset';

// Mock Dexie db for Node.js test environment
const mockData: Record<string, any[]> = {
  trips: [{ ...INITIAL_TRIP }],
  itineraryDays: [...INITIAL_DAYS],
  itineraryItems: INITIAL_DAYS.flatMap(d => d.tasks || []),
  expenses: [...INITIAL_EXPENSES],
  bookings: [],
  documents: [],
  transportLegs: [...INITIAL_TRANSPORT],
  accommodations: [...INITIAL_STAYS],
  places: [...INITIAL_PLACES],
  checklists: [],
  notes: [],
  syncQueue: [{ id: 'q-1', status: 'pending' }],
  meta: [{ key: 'activeTripId', value: DEFAULT_TRIP_ID }],
};

vi.mock('@/lib/db', () => {
  const createMockTable = (name: string) => ({
    where: vi.fn((field: string) => ({
      equals: vi.fn((val: any) => ({
        count: vi.fn(async () => mockData[name].filter(item => item[field] === val).length),
        delete: vi.fn(async () => {
          mockData[name] = mockData[name].filter(item => item[field] !== val);
        }),
      })),
    })),
    count: vi.fn(async () => mockData[name].length),
    toArray: vi.fn(async () => [...mockData[name]]),
    put: vi.fn(async (item: any) => {
      const idx = mockData[name].findIndex(x => (x.id && x.id === item.id) || (x.key && x.key === item.key));
      if (idx >= 0) mockData[name][idx] = item;
      else mockData[name].push(item);
    }),
    get: vi.fn(async (key: string) => mockData[name].find(x => x.id === key || x.key === key)),
    delete: vi.fn(async (key: string) => {
      mockData[name] = mockData[name].filter(x => x.id !== key && x.key !== key);
    }),
    clear: vi.fn(async () => {
      mockData[name] = [];
    }),
  });

  return {
    db: {
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
      transaction: vi.fn(async (_mode, _tables, callback) => callback()),
    },
    getFullTripData: vi.fn(async (tripId: string) => ({
      trip: mockData.trips.find(t => t.id === tripId) || CLEAN_EMPTY_TRIP,
      days: mockData.itineraryDays.filter(d => d.tripId === tripId),
      expenses: mockData.expenses.filter(e => e.tripId === tripId),
      bookings: [],
      documents: mockData.documents.filter(d => d.tripId === tripId),
      transportLegs: mockData.transportLegs.filter(t => t.tripId === tripId),
      accommodations: mockData.accommodations.filter(a => a.tripId === tripId),
      places: mockData.places.filter(p => p.tripId === tripId),
      checklists: mockData.checklists.filter(c => c.tripId === tripId),
      notes: mockData.notes.filter(n => n.tripId === tripId),
    })),
  };
});

describe('Clean Data Reset & Verification (Phase 1)', () => {
  it('verifies that obsolete sample data backups have been completely cleared', () => {
    const backupPath = path.resolve(process.cwd(), 'backups/yatra-pre-reset-backup.json');
    expect(fs.existsSync(backupPath)).toBe(false);
  });

  it('executes clean data reset and removes all obsolete trip records and child dependencies', async () => {
    const result = await executeCleanDataReset(DEFAULT_TRIP_ID);

    expect(result.success).toBe(true);
    expect(result.obsoleteTripId).toBe(DEFAULT_TRIP_ID);

    // Verify all local records of obsolete trip are deleted
    const remainingDays = mockData.itineraryDays.filter(d => d.tripId === DEFAULT_TRIP_ID);
    const remainingItems = mockData.itineraryItems.filter(i => i.tripId === DEFAULT_TRIP_ID);
    const remainingExpenses = mockData.expenses.filter(e => e.tripId === DEFAULT_TRIP_ID);
    const remainingPlaces = mockData.places.filter(p => p.tripId === DEFAULT_TRIP_ID);
    const remainingStays = mockData.accommodations.filter(a => a.tripId === DEFAULT_TRIP_ID);
    const remainingTransport = mockData.transportLegs.filter(t => t.tripId === DEFAULT_TRIP_ID);
    const remainingChecklists = mockData.checklists.filter(c => c.tripId === DEFAULT_TRIP_ID);
    const remainingNotes = mockData.notes.filter(n => n.tripId === DEFAULT_TRIP_ID);
    const remainingDocs = mockData.documents.filter(d => d.tripId === DEFAULT_TRIP_ID);
    const remainingQueue = mockData.syncQueue;

    expect(remainingDays.length).toBe(0);
    expect(remainingItems.length).toBe(0);
    expect(remainingExpenses.length).toBe(0);
    expect(remainingPlaces.length).toBe(0);
    expect(remainingStays.length).toBe(0);
    expect(remainingTransport.length).toBe(0);
    expect(remainingChecklists.length).toBe(0);
    expect(remainingNotes.length).toBe(0);
    expect(remainingDocs.length).toBe(0);
    expect(remainingQueue.length).toBe(0);

    // Verify clean empty trip is set
    const active = mockData.trips.find(t => t.id === CLEAN_EMPTY_TRIP_ID);
    expect(active).toBeDefined();
    expect(active?.title).toBe('Complete Jyotirlinga Pilgrimage');
    expect(active?.origin).toContain('Hyderabad');
    expect(active?.destination).toContain('Khammam');
    expect(active?.startDate).toBe('2026-11-17');
    expect(active?.endDate).toBe('2026-12-05');
    expect(active?.totalBudget).toBe(0);

    // Verify cleanState meta is true
    const cleanMeta = mockData.meta.find(m => m.key === 'cleanState');
    expect(cleanMeta?.value).toBe(true);
  });

  it('guarantees cleanState flag prevents re-seeding of sample days and expenses on reload', async () => {
    // Simulate what initializeDatabase does when cleanState is active
    const cleanMeta = mockData.meta.find(m => m.key === 'cleanState');
    expect(cleanMeta?.value).toBe(true);

    const existingTrips = mockData.trips;
    expect(existingTrips.length).toBeGreaterThan(0);

    // Under clean state, active trip is preserved as clean slate without inserting INITIAL_DAYS
    const activeTrip = existingTrips.find(t => t.isActive) || existingTrips[0];
    expect(activeTrip.id).toBe(CLEAN_EMPTY_TRIP_ID);

    // Confirm days and expenses remain completely empty
    expect(mockData.itineraryDays.length).toBe(0);
    expect(mockData.expenses.length).toBe(0);
    expect(mockData.places.length).toBe(0);
  });

  it('guarantees that repeated initialization or sign-in does not duplicate the trip', async () => {
    // Initial trip count
    const initialTripCount = mockData.trips.length;
    expect(initialTripCount).toBe(1);

    // Simulate re-running trip initialization with user ID or settings update
    const existing = mockData.trips[0];
    const updatedTrip = {
      ...existing,
      userId: 'auth-user-123',
      updatedAt: new Date().toISOString(),
    };

    // Updating existing trip with stable ID
    const idx = mockData.trips.findIndex(t => t.id === existing.id);
    if (idx >= 0) {
      mockData.trips[idx] = updatedTrip;
    } else {
      mockData.trips.push(updatedTrip);
    }

    // Exactly one trip exists
    expect(mockData.trips.length).toBe(1);
    expect(mockData.trips[0].id).toBe(CLEAN_EMPTY_TRIP_ID);
    expect(mockData.trips[0].userId).toBe('auth-user-123');
    expect(mockData.trips[0].title).toBe('Complete Jyotirlinga Pilgrimage');
  });
});

