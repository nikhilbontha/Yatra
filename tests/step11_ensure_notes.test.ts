import { describe, it, expect, beforeEach } from 'vitest';
import {
  CONFIRMED_TRIP_ID,
  ensureConfirmedNotes,
} from '@/lib/db';
import { INITIAL_NOTES, getNoteUUID } from '@/lib/seed-data';
import { TripNote } from '@/types/trip';

// In-memory test storage for testing ensureConfirmedNotes in total isolation
const testStorage: Record<string, any[]> = {
  notes: [],
  itineraryDays: [{ id: 'day-1', tripId: CONFIRMED_TRIP_ID, dayNumber: 1, title: 'Day 1' }],
  expenses: [],
  documents: [],
};

const createMockTable = (name: string) => ({
  where: (field: string) => ({
    equals: (val: any) => ({
      count: async () => testStorage[name].filter(item => item[field] === val).length,
      toArray: async () => testStorage[name].filter(item => item[field] === val),
    }),
  }),
  toArray: async () => [...testStorage[name]],
  get: async (id: string) => testStorage[name].find(x => x.id === id),
  put: async (item: any) => {
    const idx = testStorage[name].findIndex(x => x.id === item.id);
    if (idx >= 0) {
      testStorage[name][idx] = item;
    } else {
      testStorage[name].push(item);
    }
  },
  delete: async (id: string) => {
    testStorage[name] = testStorage[name].filter(x => x.id !== id);
  },
  count: async () => testStorage[name].length,
});

const mockDb = {
  notes: createMockTable('notes'),
  itineraryDays: createMockTable('itineraryDays'),
  expenses: createMockTable('expenses'),
  documents: createMockTable('documents'),
  transaction: async (_mode: any, _tables: any, callback: () => Promise<any>) => callback(),
};

describe('Phase I-5: ensureConfirmedNotes Verification', () => {
  beforeEach(() => {
    testStorage.notes = [];
    testStorage.itineraryDays = [{ id: 'day-1', tripId: CONFIRMED_TRIP_ID, dayNumber: 1, title: 'Day 1' }];
    testStorage.expenses = [];
    testStorage.documents = [];
  });

  describe('1. The Three Approved Notes Availability', () => {
    it('populates exactly the three approved notes on clean initialization', async () => {
      await ensureConfirmedNotes(CONFIRMED_TRIP_ID, mockDb);

      expect(testStorage.notes.length).toBe(3);

      const titles = testStorage.notes.map(n => n.title);
      expect(titles).toContain('Emergency Contacts & Helplines');
      expect(titles).toContain('Pilgrim Darshan Tips & Codes');
      expect(titles).toContain('Solo Travel Safety on Night Trains');

      // Verify all notes have the active tripId and valid deterministic UUIDs
      for (const note of testStorage.notes) {
        expect(note.tripId).toBe(CONFIRMED_TRIP_ID);
        expect(note.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      }

      // Verify categories
      const emergencyNote = testStorage.notes.find(n => n.title === 'Emergency Contacts & Helplines');
      expect(emergencyNote?.category).toBe('Emergency');

      const darshanNote = testStorage.notes.find(n => n.title === 'Pilgrim Darshan Tips & Codes');
      expect(darshanNote?.category).toBe('Travel Tip');

      const safetyNote = testStorage.notes.find(n => n.title === 'Solo Travel Safety on Night Trains');
      expect(safetyNote?.category).toBe('Travel Tip');
    });
  });

  describe('2. Idempotency & Duplicate Prevention', () => {
    it('does not create duplicate notes when initialization runs repeatedly', async () => {
      // First run
      await ensureConfirmedNotes(CONFIRMED_TRIP_ID, mockDb);
      expect(testStorage.notes.length).toBe(3);

      // Second run
      await ensureConfirmedNotes(CONFIRMED_TRIP_ID, mockDb);
      expect(testStorage.notes.length).toBe(3);

      // Third run
      await ensureConfirmedNotes(CONFIRMED_TRIP_ID, mockDb);
      expect(testStorage.notes.length).toBe(3);

      const ids = testStorage.notes.map(n => n.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });
  });

  describe('3. User-Created Notes Preservation', () => {
    it('preserves existing user-created notes when initialization runs', async () => {
      // Pre-existing user custom note
      const userNote: TripNote = {
        id: 'user-note-khammam-bus',
        tripId: CONFIRMED_TRIP_ID,
        title: 'Khammam Direct Bus Timing Note',
        content: 'Check RTC bus timings from Khammam to Hyderabad MGBS on 16 Nov evening.',
        category: 'General',
        createdAt: '2026-10-25T10:00:00.000Z',
        updatedAt: '2026-10-25T10:00:00.000Z',
      };
      testStorage.notes = [userNote];

      await ensureConfirmedNotes(CONFIRMED_TRIP_ID, mockDb);

      // Total notes should be 4: 1 user note + 3 approved notes
      expect(testStorage.notes.length).toBe(4);

      // Verify the user note is completely preserved
      const retrieved = testStorage.notes.find(n => n.id === 'user-note-khammam-bus');
      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('Khammam Direct Bus Timing Note');
      expect(retrieved?.content).toContain('MGBS on 16 Nov evening');
    });
  });

  describe('4. User-Edited Notes Protection', () => {
    it('never overwrites a user-edited note even if its ID matches a source definition', async () => {
      // User edited note 1 with their personal emergency contact
      const note1Id = getNoteUUID(1);
      const userEditedNote: TripNote = {
        id: note1Id,
        tripId: CONFIRMED_TRIP_ID,
        title: 'Emergency Contacts & Helplines',
        content: 'National Emergency: 112\nFamily Emergency Contact: 9988776655\nLocal police: 100',
        category: 'Emergency',
        createdAt: '2026-10-14T00:00:00.000Z',
        updatedAt: '2026-10-28T08:00:00.000Z',
      };
      testStorage.notes = [userEditedNote];

      await ensureConfirmedNotes(CONFIRMED_TRIP_ID, mockDb);

      // Notes 2 and 3 should be added, note 1 preserved
      expect(testStorage.notes.length).toBe(3);

      const note1 = testStorage.notes.find(n => n.id === note1Id);
      expect(note1?.content).toContain('Family Emergency Contact: 9988776655');
      expect(note1?.updatedAt).toBe('2026-10-28T08:00:00.000Z');
    });
  });

  describe('5. Side-Effect Free Isolation', () => {
    it('does not alter or touch itinerary, expense, or document records', async () => {
      const initialDays = [...testStorage.itineraryDays];
      const initialExpenses = [...testStorage.expenses];
      const initialDocs = [...testStorage.documents];

      await ensureConfirmedNotes(CONFIRMED_TRIP_ID, mockDb);

      expect(testStorage.itineraryDays).toEqual(initialDays);
      expect(testStorage.expenses).toEqual(initialExpenses);
      expect(testStorage.documents).toEqual(initialDocs);
    });
  });
});
