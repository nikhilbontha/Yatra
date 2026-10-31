import { describe, it, expect, vi } from 'vitest';
import {
  CONFIRMED_ITINERARY_DAYS,
  CONFIRMED_TRIP_ID,
  getConfirmedDayUUID,
  getConfirmedTaskUUID,
} from '@/lib/itinerary-data';
import {
  canonicalizeTaskUuid,
  formatRecordForPostgres,
  checkMissingCloudRecords,
} from '@/lib/sync';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('Phase 5A: Activity UUID Generation & Canonical Validity', () => {
  it('1. generates valid canonical 36-character UUIDs for all 50 approved activities', () => {
    let taskCount = 0;
    for (const day of CONFIRMED_ITINERARY_DAYS) {
      for (const task of day.tasks || []) {
        taskCount++;
        expect(task.id).toHaveLength(36);
        expect(task.id).toMatch(UUID_V4_REGEX);
        expect(task.id.startsWith('00000000-0000-4000-8002-000000')).toBe(true);
      }
    }
    expect(taskCount).toBe(50);
  });

  it('2. ensures all 50 activity IDs are globally unique across all 19 itinerary days', () => {
    const allTaskIds = CONFIRMED_ITINERARY_DAYS.flatMap(d => (d.tasks || []).map(t => t.id));
    const uniqueIds = new Set(allTaskIds);
    expect(uniqueIds.size).toBe(50);
    expect(allTaskIds).toHaveLength(50);
  });

  it('3. confirms getConfirmedTaskUUID is strictly deterministic and repeatable', () => {
    for (let d = 1; d <= 19; d++) {
      for (let t = 1; t <= 5; t++) {
        const id1 = getConfirmedTaskUUID(d, t);
        const id2 = getConfirmedTaskUUID(d, t);
        expect(id1).toBe(id2);
        expect(id1).toHaveLength(36);
        expect(id1).toMatch(UUID_V4_REGEX);
      }
    }
  });

  it('4. preserves genuine activity content, day associations, and flags without alterations', () => {
    // Day 1
    const day1 = CONFIRMED_ITINERARY_DAYS[0];
    expect(day1.tasks[0].title).toBe('Depart from Hyderabad / Secunderabad');
    expect(day1.tasks[0].dayId).toBe(getConfirmedDayUUID(1));
    expect(day1.tasks[0].tripId).toBe(CONFIRMED_TRIP_ID);
    expect(day1.tasks[0].needsVerification).toBe(true);

    // Day 6 (Trimbakeshwar)
    const day6 = CONFIRMED_ITINERARY_DAYS[5];
    const trimbakTask = day6.tasks.find(t => t.title.includes('Trimbakeshwar'));
    expect(trimbakTask).toBeDefined();
    expect(trimbakTask?.dayId).toBe(getConfirmedDayUUID(6));
    expect(trimbakTask?.needsVerification).toBe(true);

    // Day 7 (Bhimashankar)
    const day7 = CONFIRMED_ITINERARY_DAYS[6];
    const bhimaTask = day7.tasks.find(t => t.title.includes('Bhimashankar'));
    expect(bhimaTask).toBeDefined();
    expect(bhimaTask?.dayId).toBe(getConfirmedDayUUID(7));
    expect(bhimaTask?.needsVerification).toBe(true);
  });

  it('5. canonicalizeTaskUuid correctly maps legacy 34-character task IDs to valid 36-char UUIDs', () => {
    const legacyId = '00000000-0000-4000-8002-0000010001';
    expect(legacyId).toHaveLength(34);

    const canonicalId = canonicalizeTaskUuid(legacyId);
    expect(canonicalId).toHaveLength(36);
    expect(canonicalId).toBe('00000000-0000-4000-8002-000000010001');
    expect(canonicalId).toMatch(UUID_V4_REGEX);

    // Passing an already canonical 36-char ID returns it untouched
    expect(canonicalizeTaskUuid(canonicalId)).toBe(canonicalId);
  });

  it('6. formatRecordForPostgres sanitizes and produces valid 36-char task IDs for itinerary_items', () => {
    const sampleRecord = {
      id: '00000000-0000-4000-8002-0000010001', // legacy 34-char ID
      tripId: CONFIRMED_TRIP_ID,
      dayId: getConfirmedDayUUID(1),
      title: 'Depart from Hyderabad',
      itemType: 'Travel',
      sortOrder: 1,
    };

    const payload = formatRecordForPostgres('itinerary_items', sampleRecord, 'user-123');
    expect(payload.id).toHaveLength(36);
    expect(payload.id).toBe('00000000-0000-4000-8002-000000010001');
    expect(payload.id).toMatch(UUID_V4_REGEX);
    expect(payload).not.toHaveProperty('user_id'); // Child table must NOT have user_id
  });
});

describe('Phase 5A: Sync Entry Point & Independent Child Record Detection', () => {
  it('7. checkMissingCloudRecords detects missing child records even when days already exist (19/19)', async () => {
    // Mock Supabase client where itinerary_days has 19, but itinerary_items, places, etc. have 0
    const mockClient: any = {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(async () => {
            if (table === 'itinerary_days') {
              return { data: CONFIRMED_ITINERARY_DAYS.map(d => ({ id: d.id })), error: null };
            }
            if (table === 'trip_notes') {
              return { data: [{ id: 'cloud-note-1' }, { id: 'cloud-note-2' }], error: null };
            }
            return { data: [], error: null }; // all other child tables 0
          }),
        })),
      })),
    };

    const mockLocalData = {
      days: CONFIRMED_ITINERARY_DAYS,
      places: new Array(32).fill(null).map((_, i) => ({ id: `p-${i}` })),
      transportLegs: new Array(17).fill(null).map((_, i) => ({ id: `t-${i}` })),
      accommodations: new Array(11).fill(null).map((_, i) => ({ id: `a-${i}` })),
      checklists: new Array(36).fill(null).map((_, i) => ({ id: `c-${i}` })),
      notes: new Array(3).fill(null).map((_, i) => ({ id: `n-${i}` })),
    };

    const check = await checkMissingCloudRecords(mockClient, CONFIRMED_TRIP_ID, mockLocalData);

    expect(check.needsImport).toBe(true);
    expect(check.missingSummary).toContain('activities (50 missing)');
    expect(check.missingSummary).toContain('places (32 missing)');
    expect(check.missingSummary).toContain('transport (17 missing)');
    expect(check.missingSummary).toContain('accommodations (11 missing)');
    expect(check.missingSummary).toContain('checklists (36 missing)');
    expect(check.missingSummary).toContain('notes (3 missing)');
    // Days are complete (19/19), so 'days' is NOT in missingSummary
    expect(check.missingSummary.some(s => s.startsWith('days'))).toBe(false);
  });

  it('8. checkMissingCloudRecords reports needsImport = false when all cloud tables are complete', async () => {
    const mockLocalData = {
      days: CONFIRMED_ITINERARY_DAYS,
      places: new Array(32).fill(null).map((_, i) => ({ id: `p-${i}` })),
      transportLegs: new Array(17).fill(null).map((_, i) => ({ id: `t-${i}` })),
      accommodations: new Array(11).fill(null).map((_, i) => ({ id: `a-${i}` })),
      checklists: new Array(36).fill(null).map((_, i) => ({ id: `c-${i}` })),
      notes: new Array(3).fill(null).map((_, i) => ({ id: `n-${i}` })),
    };

    const mockClient: any = {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(async () => {
            if (table === 'itinerary_days') return { data: CONFIRMED_ITINERARY_DAYS.map(d => ({ id: d.id })), error: null };
            if (table === 'itinerary_items') return { data: CONFIRMED_ITINERARY_DAYS.flatMap(d => d.tasks).map(t => ({ id: t.id })), error: null };
            if (table === 'places') return { data: mockLocalData.places.map(p => ({ id: p.id })), error: null };
            if (table === 'transport_legs') return { data: mockLocalData.transportLegs.map(l => ({ id: l.id })), error: null };
            if (table === 'accommodation_stays') return { data: mockLocalData.accommodations.map(a => ({ id: a.id })), error: null };
            if (table === 'checklist_items') return { data: mockLocalData.checklists.map(c => ({ id: c.id })), error: null };
            if (table === 'trip_notes') return { data: [...mockLocalData.notes.map(n => ({ id: n.id })), { id: 'cloud-note-1' }, { id: 'cloud-note-2' }], error: null };
            if (table === 'budget_categories') return { data: [{ id: 'cat-1' }], error: null };
            return { data: [], error: null };
          }),
        })),
      })),
    };

    const check = await checkMissingCloudRecords(mockClient, CONFIRMED_TRIP_ID, mockLocalData);
    expect(check.needsImport).toBe(false);
    expect(check.missingSummary).toHaveLength(0);
  });

  it('9. checkMissingCloudRecords propagates query errors without masking them', async () => {
    const mockClient: any = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(async () => ({ count: null, error: { message: 'Database connection failed', code: '08006' } })),
        })),
      })),
    };

    const mockLocalData = {
      days: CONFIRMED_ITINERARY_DAYS,
      places: [],
      transportLegs: [],
      accommodations: [],
      checklists: [],
      notes: [],
    };

    await expect(checkMissingCloudRecords(mockClient, CONFIRMED_TRIP_ID, mockLocalData)).rejects.toThrow(
      'Query itinerary_days failed: Database connection failed'
    );
  });
});
