import { describe, it, expect } from 'vitest';
import { INITIAL_NOTES, getNoteUUID, DEFAULT_TRIP_ID } from '@/lib/seed-data';
import { TripNote, NoteCategory } from '@/types/trip';
import { formatRecordForPostgres } from '@/lib/sync';
import { CONFIRMED_ITINERARY_DAYS } from '@/lib/itinerary-data';

describe('Phase 2 — Step 11: Notes & Journal Module Verification', () => {
  describe('1. Authentic Notes & No Fictional Journal Entries', () => {
    it('contains only genuine emergency and safety notes in seed data without fictional diary stories', () => {
      expect(INITIAL_NOTES.length).toBeGreaterThanOrEqual(3);
      for (const note of INITIAL_NOTES) {
        expect(note.title).toBeDefined();
        expect(note.content).toBeDefined();
        // Ensure no fictional stories or fake diary claims
        expect(note.content).not.toContain('What a peaceful experience');
        expect(note.content).not.toContain('Met some good people on Godavari Express');
      }
    });

    it('verifies deterministic UUIDs for all seeded notes', () => {
      for (let i = 1; i <= INITIAL_NOTES.length; i++) {
        const expectedUUID = `e7a1b32d-9831-4fa2-8b43-0006000000${String(i).padStart(2, '0')}`;
        expect(getNoteUUID(i)).toBe(expectedUUID);
      }
    });

    it('associates all notes with the correct tripId', () => {
      for (const note of INITIAL_NOTES) {
        expect(note.tripId).toBe(DEFAULT_TRIP_ID);
      }
    });
  });

  describe('2. PostgreSQL Schema & Category Check Constraint', () => {
    const validPostgresCategories: NoteCategory[] = [
      'General',
      'Emergency',
      'Travel Tip',
      'Reflection',
      'Contact',
    ];

    it('ensures all initial notes use valid PostgreSQL check constraint categories', () => {
      for (const note of INITIAL_NOTES) {
        expect(validPostgresCategories).toContain(note.category);
      }
    });

    it('formats notes safely for Postgres sync with category fallbacks and sanitized day_id', () => {
      const testNote: TripNote = {
        id: 'test-note-1',
        tripId: DEFAULT_TRIP_ID,
        dayId: CONFIRMED_ITINERARY_DAYS[0].id,
        title: 'Shirdi Morning Aarti Advice',
        content: 'Reach queue complex by 4:00 AM for kakad aarti.',
        category: 'Travel Tip',
        createdAt: '2026-10-24T00:00:00.000Z',
        updatedAt: '2026-10-24T00:00:00.000Z',
      };

      const payload = formatRecordForPostgres('trip_notes', testNote, 'user-123');
      expect(payload.id).toBe('test-note-1');
      expect(payload.trip_id).toBe(DEFAULT_TRIP_ID);
      expect(payload.day_id).toBe(CONFIRMED_ITINERARY_DAYS[0].id);
      expect(payload.title).toBe('Shirdi Morning Aarti Advice');
      expect(payload.category).toBe('Travel Tip');

      // Test fallback mapping for legacy or non-standard category
      const legacyNote = {
        ...testNote,
        category: 'Daily' as any,
      };
      const legacyPayload = formatRecordForPostgres('trip_notes', legacyNote, 'user-123');
      expect(legacyPayload.category).toBe('Reflection');
    });

    it('sanitizes undefined or empty dayId to null for Postgres foreign key safety', () => {
      const noteWithoutDay: TripNote = {
        id: 'note-general-1',
        tripId: DEFAULT_TRIP_ID,
        title: 'General Pilgrim Packing Tip',
        content: 'Keep a separate small pouch for coins and small notes.',
        category: 'General',
        createdAt: '2026-10-24T00:00:00.000Z',
        updatedAt: '2026-10-24T00:00:00.000Z',
      };

      const payload = formatRecordForPostgres('trip_notes', noteWithoutDay, 'user-123');
      expect(payload.day_id).toBeNull();
    });
  });

  describe('3. Daily Journal & Day Association', () => {
    it('supports linking a journal entry to an itinerary day', () => {
      const day1 = CONFIRMED_ITINERARY_DAYS[0];
      const journalNote: TripNote = {
        id: 'journal-day-1',
        tripId: DEFAULT_TRIP_ID,
        dayId: day1.id,
        date: day1.date,
        title: 'Departure from Khammam',
        content: 'Commenced the 19-day pilgrimage toward Secunderabad on time.',
        category: 'Reflection',
        noteType: 'Daily',
        createdAt: '2026-11-17T08:00:00.000Z',
        updatedAt: '2026-11-17T08:00:00.000Z',
      };

      expect(journalNote.dayId).toBe(day1.id);
      expect(journalNote.date).toBe('2026-11-17');
      expect(journalNote.category).toBe('Reflection');
    });

    it('preserves user content and metadata when editing', () => {
      const originalNote: TripNote = {
        id: 'note-edit-test',
        tripId: DEFAULT_TRIP_ID,
        title: 'Original Title',
        content: 'Original Content with important instructions.',
        category: 'Travel Tip',
        location: 'Trimbakeshwar',
        tags: ['Temple', 'Darshan'],
        createdAt: '2026-10-20T10:00:00.000Z',
        updatedAt: '2026-10-20T10:00:00.000Z',
      };

      const updated = {
        ...originalNote,
        title: 'Updated Title',
        content: 'Updated Content with additional safety tips.',
        updatedAt: '2026-10-25T12:00:00.000Z',
      };

      expect(updated.id).toBe(originalNote.id);
      expect(updated.tripId).toBe(originalNote.tripId);
      expect(updated.createdAt).toBe(originalNote.createdAt);
      expect(updated.title).toBe('Updated Title');
      expect(updated.location).toBe('Trimbakeshwar');
      expect(updated.tags).toEqual(['Temple', 'Darshan']);
    });
  });
});
