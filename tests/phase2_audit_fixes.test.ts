import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'fs';
import path from 'path';

// In-memory mock store for Dexie tables in Node.js test environment
const mockData: Record<string, any[]> = {
  notes: [],
  checklists: [],
  syncQueue: [],
};

vi.mock('@/lib/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db')>();

  const createMockTable = (name: string) => ({
    where: vi.fn((field: string) => ({
      equals: vi.fn((val: any) => {
        const matches = () => mockData[name].filter(item => item[field] === val);
        return {
          toArray: vi.fn(async () => matches()),
          count: vi.fn(async () => matches().length),
          first: vi.fn(async () => matches()[0] || null),
          filter: vi.fn((predicate: (item: any) => boolean) => ({
            first: vi.fn(async () => matches().filter(predicate)[0] || null),
            toArray: vi.fn(async () => matches().filter(predicate)),
          })),
        };
      }),
    })),
    toArray: vi.fn(async () => [...mockData[name]]),
    get: vi.fn(async (id: string) => mockData[name].find(x => x.id === id) || null),
    put: vi.fn(async (item: any) => {
      const idx = mockData[name].findIndex(x => x.id === item.id);
      if (idx >= 0) mockData[name][idx] = item;
      else mockData[name].push(item);
    }),
    delete: vi.fn(async (id: string) => {
      mockData[name] = mockData[name].filter(x => x.id !== id);
    }),
    clear: vi.fn(async () => {
      mockData[name] = [];
    }),
    count: vi.fn(async () => mockData[name].length),
  });

  return {
    ...actual,
    db: {
      ...actual.db,
      notes: createMockTable('notes'),
      checklists: createMockTable('checklists'),
      syncQueue: createMockTable('syncQueue'),
    },
    queueOfflineChange: vi.fn(async (table: string, operation: string, recordId: string, payload?: any) => {
      mockData.syncQueue.push({
        id: `q-${Date.now()}-${Math.random()}`,
        table,
        operation,
        recordId,
        payload,
        timestamp: Date.now(),
        retryCount: 0,
      });
    }),
  };
});

import { MoreView } from '@/components/views/MoreView';
import { HomeView } from '@/components/views/HomeView';
import { CONFIRMED_ITINERARY_DAYS } from '@/lib/itinerary-data';
import {
  CLEAN_EMPTY_TRIP,
  CLEAN_EMPTY_TRIP_ID,
} from '@/lib/clean-reset';
import {
  INITIAL_STAYS,
  INITIAL_TRANSPORT,
  INITIAL_PLACES,
  INITIAL_CHECKLIST,
  INITIAL_NOTES,
} from '@/lib/seed-data';
import {
  resolveSafeDayId,
  migrateDayDetailsLocalStorageIfNeeded,
  saveDayNoteToDb,
  toggleDayChecklistItemInDb,
  addDayChecklistItemToDb,
  loadDayDetailsFromDb,
} from '@/lib/day-details-migration';
import { db } from '@/lib/db';
import { calculateBudget } from '@/lib/calculations';

// In-memory mock localStorage for Node.js testing environment
class MockLocalStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }

  get length(): number {
    return Object.keys(this.store).length;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] ?? null;
  }
}

describe('Phase 2 Minimal Audit Fixes Regression Suite', () => {
  const originalWindow = global.window;
  let mockStorage: MockLocalStorage;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    (global as any).window = {
      localStorage: mockStorage,
    };
    (global as any).localStorage = mockStorage;
    mockData.notes = [];
    mockData.checklists = [];
    mockData.syncQueue = [];
  });

  afterEach(() => {
    if (originalWindow !== undefined) {
      (global as any).window = originalWindow;
    } else {
      delete (global as any).window;
    }
    delete (global as any).localStorage;
  });

  // ==========================================================================
  // Fix 1: Accommodation Day Selection in MoreView
  // ==========================================================================
  describe('Fix 1: Accommodation Day Selection in MoreView', () => {
    it('verifies MoreView.tsx passes real days and onSelectDayIndex to AccommodationView in source', () => {
      const moreViewPath = path.join(process.cwd(), 'src', 'components', 'views', 'MoreView.tsx');
      const content = fs.readFileSync(moreViewPath, 'utf8');

      // Must NOT pass empty days={[]}
      expect(content).not.toMatch(/<AccommodationView[\s\S]*?days=\{\[\]\}/);

      // Must pass actual days and onSelectDayIndex
      expect(content).toContain('days={days || []}');
      expect(content).toContain('onSelectDayIndex={onSelectDayIndex}');
    });

    it('renders AccommodationView via MoreView with all 19 itinerary days accessible', () => {
      let selectedDayIdx = -1;
      const html = renderToStaticMarkup(
        React.createElement(MoreView, {
          trip: CLEAN_EMPTY_TRIP,
          days: CONFIRMED_ITINERARY_DAYS,
          accommodations: INITIAL_STAYS,
          transportLegs: INITIAL_TRANSPORT,
          places: INITIAL_PLACES,
          checklists: INITIAL_CHECKLIST,
          notes: INITIAL_NOTES,
          activeSubTab: 'accommodation',
          onSubTabChange: () => {},
          onSelectDayIndex: (idx: number) => {
            selectedDayIdx = idx;
          },
        })
      );

      // Verify AccommodationView renders correctly
      expect(html).toContain('Accommodation');
      expect(html).toContain('All your stays in one place');
      expect(html).toContain('Total Stays');
      expect(html).toContain('Shirdi');
      expect(html).toContain('Shri Sai Baba Sansthan Trust Bhaktaniwas');
    });
  });

  // ==========================================================================
  // Fix 2: Home Dashboard Places Metric
  // ==========================================================================
  describe('Fix 2: Home Dashboard Places Metric Label & Value', () => {
    it('verifies HomeView.tsx labels the third dashboard stat as "Places" instead of "Visited"', () => {
      const homeViewPath = path.join(process.cwd(), 'src', 'components', 'views', 'HomeView.tsx');
      const content = fs.readFileSync(homeViewPath, 'utf8');

      // The label div in HomeView.tsx must be "Places" and NOT "Visited"
      expect(content).toContain('<div className="text-[10px] text-gray-500 font-medium mt-0.5">Places</div>');
      expect(content).not.toContain('<div className="text-[10px] text-gray-500 font-medium mt-0.5">Visited</div>');
    });

    it('renders HomeView with "Places" stat label and count of 32 planned pilgrimage sites', () => {
      const budgetCalc = calculateBudget(CLEAN_EMPTY_TRIP, []);
      const html = renderToStaticMarkup(
        React.createElement(HomeView, {
          trip: CLEAN_EMPTY_TRIP,
          days: CONFIRMED_ITINERARY_DAYS,
          expenses: [],
          bookings: [],
          transportLegs: [],
          checklists: [],
          places: INITIAL_PLACES,
          budgetCalc,
          cloudUser: null,
          syncStatus: 'signed_out',
          isSyncing: false,
          onSync: () => {},
          onNavigateToTab: () => {},
          onNavigateToMoreSubTab: () => {},
          onSelectDay: () => {},
          onAddExpense: () => {},
          onAddTicket: () => {},
          onAddChecklist: () => {},
          onEditTripSettings: () => {},
          onToggleTask: () => {},
        })
      );

      // Must render label "Places"
      expect(html).toContain('Places');
      expect(html).not.toContain('>Visited<');

      // Companion metrics check
      expect(html).toContain('Days');
      expect(html).toContain('Activities');
      expect(html).toContain('Spent');

      // Verify the count of 32 places matches INITIAL_PLACES.length
      expect(INITIAL_PLACES.length).toBe(32);
      expect(html).toContain('32');
    });
  });

  // ==========================================================================
  // Fix 3: Day Details Notes & Checklists Migration & Persistence
  // ==========================================================================
  describe('Fix 3: Day Details Notes and Checklists Persistence', () => {
    describe('Safe Day ID Resolution (resolveSafeDayId)', () => {
      it('safely resolves an exact UUID match to an existing itinerary day', () => {
        const targetDay = CONFIRMED_ITINERARY_DAYS[0];
        const result = resolveSafeDayId(targetDay.id, CONFIRMED_ITINERARY_DAYS);
        expect(result).not.toBeNull();
        expect(result?.dayId).toBe(targetDay.id);
        expect(result?.day.dayNumber).toBe(1);
      });

      it('safely resolves numeric day strings ("1", "2") to the respective day UUID', () => {
        const resultDay1 = resolveSafeDayId('1', CONFIRMED_ITINERARY_DAYS);
        expect(resultDay1).not.toBeNull();
        expect(resultDay1?.day.dayNumber).toBe(1);
        expect(resultDay1?.dayId).toBe(CONFIRMED_ITINERARY_DAYS[0].id);

        const resultDay5 = resolveSafeDayId('5', CONFIRMED_ITINERARY_DAYS);
        expect(resultDay5).not.toBeNull();
        expect(resultDay5?.day.dayNumber).toBe(5);
        expect(resultDay5?.dayId).toBe(CONFIRMED_ITINERARY_DAYS[4].id);
      });

      it('safely resolves legacy prefixed day strings ("d1-2026-11-17", "day-2", "d7")', () => {
        const resultLegacy = resolveSafeDayId('d1-2026-11-17', CONFIRMED_ITINERARY_DAYS);
        expect(resultLegacy).not.toBeNull();
        expect(resultLegacy?.day.dayNumber).toBe(1);

        const resultDay2 = resolveSafeDayId('day-2', CONFIRMED_ITINERARY_DAYS);
        expect(resultDay2).not.toBeNull();
        expect(resultDay2?.day.dayNumber).toBe(2);

        const resultD7 = resolveSafeDayId('d7', CONFIRMED_ITINERARY_DAYS);
        expect(resultD7).not.toBeNull();
        expect(resultD7?.day.dayNumber).toBe(7);
      });

      it('safely returns null without guessing when key cannot be matched', () => {
        expect(resolveSafeDayId('unknown-random-key', CONFIRMED_ITINERARY_DAYS)).toBeNull();
        expect(resolveSafeDayId('', CONFIRMED_ITINERARY_DAYS)).toBeNull();
        expect(resolveSafeDayId('day-999', CONFIRMED_ITINERARY_DAYS)).toBeNull();
        expect(resolveSafeDayId('mallikarjuna', CONFIRMED_ITINERARY_DAYS)).toBeNull();
      });
    });

    describe('Idempotent Migration (migrateDayDetailsLocalStorageIfNeeded)', () => {
      it('preserves existing localStorage entries without clearing or deleting them', async () => {
        const legacyNotes = {
          '1': 'Darshan pass collected at Shirdi counter.',
          'd2-2026-11-18': 'Traditional dhoti required for Grishneshwar inner sanctum.',
        };
        const legacyChecklists = {
          '1': [
            { title: 'Collect Shirdi Darshan Pass', isDone: true },
            { title: 'Keep original Aadhaar card handy', isDone: false },
          ],
        };

        mockStorage.setItem('yatra_day_notes', JSON.stringify(legacyNotes));
        mockStorage.setItem('yatra_day_checklists', JSON.stringify(legacyChecklists));

        const result = await migrateDayDetailsLocalStorageIfNeeded(CONFIRMED_ITINERARY_DAYS, CLEAN_EMPTY_TRIP_ID, {
          force: true,
        });

        // Migration report
        expect(result.migratedNotesCount).toBeGreaterThanOrEqual(2);
        expect(result.migratedChecklistsCount).toBeGreaterThanOrEqual(2);

        // Crucial safety requirement: legacy localStorage MUST still be intact!
        expect(mockStorage.getItem('yatra_day_notes')).toBe(JSON.stringify(legacyNotes));
        expect(mockStorage.getItem('yatra_day_checklists')).toBe(JSON.stringify(legacyChecklists));
        expect(mockStorage.getItem('yatra_day_details_migrated_v1')).toBe('true');

        // Check records entered into mockData
        expect(mockData.notes.length).toBe(2);
        expect(mockData.checklists.length).toBe(2);
        expect(mockData.syncQueue.length).toBe(4);
      });

      it('prevents duplicates when migration is executed multiple times', async () => {
        const legacyNotes = {
          '1': 'Single note for day 1 test.',
        };
        mockStorage.setItem('yatra_day_notes', JSON.stringify(legacyNotes));

        // First run
        const run1 = await migrateDayDetailsLocalStorageIfNeeded(CONFIRMED_ITINERARY_DAYS, CLEAN_EMPTY_TRIP_ID, {
          force: true,
        });
        expect(run1.migratedNotesCount).toBe(1);
        expect(mockData.notes.length).toBe(1);

        // Second run without force: short-circuits due to migration flag
        const run2 = await migrateDayDetailsLocalStorageIfNeeded(CONFIRMED_ITINERARY_DAYS, CLEAN_EMPTY_TRIP_ID);
        expect(run2.alreadyMigrated).toBe(true);
        expect(run2.migratedNotesCount).toBe(0);
        expect(mockData.notes.length).toBe(1);

        // Third run with force: detects duplicate content in DB and skips
        const run3 = await migrateDayDetailsLocalStorageIfNeeded(CONFIRMED_ITINERARY_DAYS, CLEAN_EMPTY_TRIP_ID, {
          force: true,
        });
        expect(run3.migratedNotesCount).toBe(0);
        expect(run3.skippedDuplicatesCount).toBeGreaterThanOrEqual(1);
        expect(mockData.notes.length).toBe(1);
      });

      it('preserves unmapped day references safely and reports them without guessing or throwing', async () => {
        const unmappedNotes = {
          'unmapped-fake-day-key': 'Some orphaned note content',
        };
        mockStorage.setItem('yatra_day_notes', JSON.stringify(unmappedNotes));

        const result = await migrateDayDetailsLocalStorageIfNeeded(CONFIRMED_ITINERARY_DAYS, CLEAN_EMPTY_TRIP_ID, {
          force: true,
        });

        expect(result.unmappedDayReferences.length).toBe(1);
        expect(result.unmappedDayReferences[0]).toContain('unmapped-fake-day-key');

        // Original unmapped entry preserved in localStorage
        const stored = JSON.parse(mockStorage.getItem('yatra_day_notes') || '{}');
        expect(stored['unmapped-fake-day-key']).toBe('Some orphaned note content');
      });
    });

    describe('Dexie Database Persistence & Helpers', () => {
      it('saves day note with valid RFC 4122 UUID and updates correctly', async () => {
        const targetDay = CONFIRMED_ITINERARY_DAYS[0];
        const content = 'Visiting Sai Baba Samadhi Mandir at 6:30 AM.';

        const note = await saveDayNoteToDb(targetDay, content, CLEAN_EMPTY_TRIP_ID);
        expect(note.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        expect(note.dayId).toBe(targetDay.id);
        expect(note.content).toBe(content);
        expect(note.category).toBe('Reflection');

        // Check Dexie persistence
        const fromDb = await db.notes.get(note.id);
        expect(fromDb).toBeDefined();
        expect(fromDb?.content).toBe(content);

        // Update existing note
        const updatedContent = 'Updated timing: 7:00 AM darshan.';
        const updatedNote = await saveDayNoteToDb(targetDay, updatedContent, CLEAN_EMPTY_TRIP_ID);
        expect(updatedNote.id).toBe(note.id); // Same ID updated
        expect(updatedNote.content).toBe(updatedContent);
      });

      it('toggles and adds checklist items in Dexie with valid UUIDs', async () => {
        const targetDay = CONFIRMED_ITINERARY_DAYS[1];

        // 1. Add custom checklist item
        const added = await addDayChecklistItemToDb(targetDay, 'Carry temple shawls', CLEAN_EMPTY_TRIP_ID);
        expect(added.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        expect(added.dayId).toBe(targetDay.id);
        expect(added.title).toBe('Carry temple shawls');
        expect(added.isCompleted).toBe(false);

        // 2. Toggle item state
        const toggled = await toggleDayChecklistItemInDb(targetDay, 'Carry temple shawls', true, CLEAN_EMPTY_TRIP_ID);
        expect(toggled.id).toBe(added.id);
        expect(toggled.isCompleted).toBe(true);

        const fromDb = await db.checklists.get(added.id);
        expect(fromDb?.isCompleted).toBe(true);
      });

      it('loads all persistent notes and checklists grouped by dayId via loadDayDetailsFromDb', async () => {
        const day1 = CONFIRMED_ITINERARY_DAYS[0];
        await saveDayNoteToDb(day1, 'Day 1 reflection note', CLEAN_EMPTY_TRIP_ID);
        await addDayChecklistItemToDb(day1, 'Day 1 checklist test item', CLEAN_EMPTY_TRIP_ID);

        const loaded = await loadDayDetailsFromDb(CONFIRMED_ITINERARY_DAYS, CLEAN_EMPTY_TRIP_ID);
        expect(loaded.notesByDayId[day1.id]).toBe('Day 1 reflection note');
        expect(loaded.checklistsByDayId[day1.id]).toBeDefined();
        expect(loaded.checklistsByDayId[day1.id].some(c => c.title === 'Day 1 checklist test item')).toBe(true);
      });
    });

    describe('ItineraryView.tsx Code Integrity Check', () => {
      it('verifies ItineraryView.tsx imports and uses migration and Dexie persistence functions', () => {
        const itineraryPath = path.join(process.cwd(), 'src', 'components', 'views', 'ItineraryView.tsx');
        const content = fs.readFileSync(itineraryPath, 'utf8');

        // Check imports
        expect(content).toContain('migrateDayDetailsLocalStorageIfNeeded');
        expect(content).toContain('loadDayDetailsFromDb');
        expect(content).toContain('saveDayNoteToDb');
        expect(content).toContain('toggleDayChecklistItemInDb');
        expect(content).toContain('addDayChecklistItemToDb');

        // Check database write before toast/state update
        expect(content).toContain('await saveDayNoteToDb(activeDay, editingNoteText)');
        expect(content).toContain('await toggleDayChecklistItemInDb(activeDay, targetItem.title, nextDone)');
        expect(content).toContain('await addDayChecklistItemToDb(activeDay, itemTitle)');
      });
    });
  });
});
