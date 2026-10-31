import { describe, it, expect, vi } from 'vitest';
import {
  CONFIRMED_TRIP_ID,
  CONFIRMED_ITINERARY_DAYS,
  CONFIRMED_PLACES,
  CONFIRMED_TRANSPORT_LEGS,
  CONFIRMED_ACCOMMODATION_STAYS,
  CONFIRMED_CHECKLIST_ITEMS,
} from '@/lib/itinerary-data';
import { INITIAL_NOTES, INITIAL_TRIP } from '@/lib/seed-data';

// Mock getFullTripData to return the confirmed pilgrimage dataset matching approved Phase 5F values
vi.mock('@/lib/db', () => ({
  getFullTripData: vi.fn(async (tripId: string) => ({
    trip: {
      id: CONFIRMED_TRIP_ID,
      title: 'Complete Jyotirlinga Pilgrimage',
      origin: 'Hyderabad, Telangana',
      destination: 'Khammam, Telangana',
      startDate: '2026-11-17',
      endDate: '2026-12-05',
      totalBudget: 10000,
      emergencyReserve: 0,
      openingCash: 0,
      notes: 'Solo, budget-friendly pilgrimage. Preferred transport: Sleeper trains, government buses and shared autos. Preferred accommodation: Affordable dharamshalas and other verified low-cost stays. Shirdi is the preferred first destination after Hyderabad. Final route sequence and return date pending confirmation.',
      isActive: true,
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
    },
    days: CONFIRMED_ITINERARY_DAYS,
    expenses: [],
    bookings: [],
    documents: [],
    transportLegs: CONFIRMED_TRANSPORT_LEGS,
    accommodations: CONFIRMED_ACCOMMODATION_STAYS,
    places: CONFIRMED_PLACES,
    checklists: CONFIRMED_CHECKLIST_ITEMS,
    notes: INITIAL_NOTES.slice(0, 3).map((n, i) => ({
      ...n,
      id: `00000000-0000-4000-8007-00000000000${i + 1}`,
      tripId: CONFIRMED_TRIP_ID,
    })),
  })),
  db: {
    syncQueue: {
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn(async () => []),
          count: vi.fn(async () => 0),
          and: vi.fn(() => ({ delete: vi.fn() })),
        })),
        anyOf: vi.fn(() => ({
          toArray: vi.fn(async () => []),
          count: vi.fn(async () => 0),
        })),
      })),
    },
    meta: { put: vi.fn() },
    trips: { get: vi.fn(), put: vi.fn(), update: vi.fn() },
  },
  queueOfflineChange: vi.fn(),
}));

import {
  checkMissingCloudRecords,
  safeInitialCloudImport,
  formatRecordForPostgres,
} from '@/lib/sync';

describe('Phase 5D/5F — Safety Correction: Trip Timestamp, Ownership & Budget Preservation', () => {
  it('1. preserves existing cloud created_at timestamp and approved trip parameters when active trip already exists in Supabase', async () => {
    const cloudCreatedAt = '2026-10-24T07:22:15.987Z';
    const cloudUserId = 'c1fa11ad-f348-45bb-a8bd-d7660a9f2118';

    let capturedTripPayload: any = null;

    const mockClient: any = {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => {
              if (table === 'trips') {
                return {
                  data: {
                    id: CONFIRMED_TRIP_ID,
                    user_id: cloudUserId,
                    created_at: cloudCreatedAt,
                    total_budget: 10000,
                  },
                  error: null,
                };
              }
              return { data: null, error: null };
            }),
            then: (resolve: any) => {
              resolve({ data: [], error: null });
            },
          })),
        })),
        upsert: vi.fn(async (payload: any) => {
          if (table === 'trips') {
            capturedTripPayload = payload;
          }
          return { error: null };
        }),
      })),
    };

    // Simulate import call with a fresh session user ID
    await safeInitialCloudImport(mockClient, 'new-session-user-id', CONFIRMED_TRIP_ID);

    expect(capturedTripPayload).toBeDefined();
    // Must preserve original cloud created_at
    expect(capturedTripPayload.created_at).toBe(cloudCreatedAt);
    // Must preserve original cloud user ownership
    expect(capturedTripPayload.user_id).toBe(cloudUserId);
    // Must preserve active trip ID
    expect(capturedTripPayload.id).toBe(CONFIRMED_TRIP_ID);
    // Must match approved core pilgrimage parameters
    expect(capturedTripPayload.title).toBe('Complete Jyotirlinga Pilgrimage');
    expect(capturedTripPayload.start_date).toBe('2026-11-17');
    expect(capturedTripPayload.end_date).toBe('2026-12-05');
    expect(capturedTripPayload.total_budget).toBe(10000);
    expect(capturedTripPayload.opening_cash).toBe(0);
    expect(capturedTripPayload.emergency_reserve).toBe(0);
  });

  it('2. sets default created_at only if the trip row does not exist in Supabase', async () => {
    let capturedTripPayload: any = null;

    const mockClient: any = {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => {
              if (table === 'trips') {
                return { data: null, error: null }; // Trip does not exist yet
              }
              return { data: null, error: null };
            }),
            then: (resolve: any) => {
              resolve({ data: [], error: null });
            },
          })),
        })),
        upsert: vi.fn(async (payload: any) => {
          if (table === 'trips') {
            capturedTripPayload = payload;
          }
          return { error: null };
        }),
      })),
    };

    const newUserId = 'brand-new-user-123';
    await safeInitialCloudImport(mockClient, newUserId, CONFIRMED_TRIP_ID);

    expect(capturedTripPayload).toBeDefined();
    expect(capturedTripPayload.user_id).toBe(newUserId);
    expect(capturedTripPayload.created_at).toBeDefined();
    expect(new Date(capturedTripPayload.created_at).getTime()).toBeGreaterThan(0);
  });
});

describe('Phase 5D — Exact-ID Set Validation (Cannot Skip on Count Alone)', () => {
  it('3. does NOT skip a table when row count matches but an ID is mismatched or missing', async () => {
    // Scenario: Cloud has 19 days, but one of the days has a legacy/mismatched ID
    const mismatchedCloudDays = [
      ...CONFIRMED_ITINERARY_DAYS.slice(0, 18).map(d => ({ id: d.id })),
      { id: '00000000-0000-4000-8001-999999999999' }, // Mismatched 19th day ID!
    ];
    expect(mismatchedCloudDays).toHaveLength(19); // Count is 19!

    const mockClient: any = {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(async () => {
            if (table === 'itinerary_days') return { data: mismatchedCloudDays, error: null };
            if (table === 'itinerary_items') return { data: CONFIRMED_ITINERARY_DAYS.flatMap(d => d.tasks).map(t => ({ id: t.id })), error: null };
            if (table === 'places') return { data: new Array(32).fill(null).map((_, i) => ({ id: `p-${i}` })), error: null };
            if (table === 'transport_legs') return { data: new Array(17).fill(null).map((_, i) => ({ id: `t-${i}` })), error: null };
            if (table === 'accommodation_stays') return { data: new Array(11).fill(null).map((_, i) => ({ id: `a-${i}` })), error: null };
            if (table === 'checklist_items') return { data: new Array(36).fill(null).map((_, i) => ({ id: `c-${i}` })), error: null };
            if (table === 'trip_notes') return { data: new Array(3).fill(null).map((_, i) => ({ id: `n-${i}` })), error: null };
            return { data: [], error: null };
          }),
        })),
      })),
    };

    const mockLocalData = {
      days: CONFIRMED_ITINERARY_DAYS, // 19 approved days
      places: new Array(32).fill(null).map((_, i) => ({ id: `p-${i}` })),
      transportLegs: new Array(17).fill(null).map((_, i) => ({ id: `t-${i}` })),
      accommodations: new Array(11).fill(null).map((_, i) => ({ id: `a-${i}` })),
      checklists: new Array(36).fill(null).map((_, i) => ({ id: `c-${i}` })),
      notes: new Array(3).fill(null).map((_, i) => ({ id: `n-${i}` })),
    };

    const check = await checkMissingCloudRecords(mockClient, CONFIRMED_TRIP_ID, mockLocalData);

    // Despite cloud having 19 rows, the 19th day ID was mismatched:
    expect(check.needsImport).toBe(true);
    expect(check.missingSummary).toContain('days (1 missing)');
  });

  it('4. safeInitialCloudImport correctly skips all 19 days when all 19 IDs match', async () => {
    let daysUpsertCalled = false;

    const mockClient: any = {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => {
              if (table === 'trips') {
                return {
                  data: {
                    id: CONFIRMED_TRIP_ID,
                    user_id: 'c1fa11ad-f348-45bb-a8bd-d7660a9f2118',
                    created_at: '2026-10-24T07:22:15.987Z',
                  },
                  error: null,
                };
              }
              return { data: null, error: null };
            }),
            then: (resolve: any) => {
              // Return all 19 approved day IDs for itinerary_days
              if (table === 'itinerary_days') {
                resolve({ data: CONFIRMED_ITINERARY_DAYS.map(d => ({ id: d.id })), error: null });
              } else {
                resolve({ data: [], error: null });
              }
            },
          })),
        })),
        upsert: vi.fn(async (_payload: any) => {
          if (table === 'itinerary_days') {
            daysUpsertCalled = true;
          }
          return { error: null };
        }),
      })),
    };

    await safeInitialCloudImport(mockClient, 'c1fa11ad-f348-45bb-a8bd-d7660a9f2118', CONFIRMED_TRIP_ID);

    // Itinerary days must NOT have been upserted because all 19 IDs are already present
    expect(daysUpsertCalled).toBe(false);
  });
});

describe('Phase 5D — Safe Resumption & Idempotence', () => {
  it('5. resumes a partially completed import without duplicating already-synced tables', async () => {
    const upsertedTables: string[] = [];

    // Simulate scenario: itinerary_days (19) and itinerary_items (50) already synced in cloud;
    // places, transport, stays, checklists, notes still missing in cloud
    const mockClient: any = {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => {
              if (table === 'trips') {
                return {
                  data: {
                    id: CONFIRMED_TRIP_ID,
                    user_id: 'c1fa11ad-f348-45bb-a8bd-d7660a9f2118',
                    created_at: '2026-10-24T07:22:15.987Z',
                  },
                  error: null,
                };
              }
              return { data: null, error: null };
            }),
            then: (resolve: any) => {
              if (table === 'itinerary_days') {
                resolve({ data: CONFIRMED_ITINERARY_DAYS.map(d => ({ id: d.id })), error: null });
              } else if (table === 'itinerary_items') {
                resolve({ data: CONFIRMED_ITINERARY_DAYS.flatMap(d => d.tasks).map(t => ({ id: t.id })), error: null });
              } else {
                resolve({ data: [], error: null });
              }
            },
          })),
        })),
        upsert: vi.fn(async (_payload: any) => {
          upsertedTables.push(table);
          return { error: null };
        }),
      })),
    };

    await safeInitialCloudImport(mockClient, 'c1fa11ad-f348-45bb-a8bd-d7660a9f2118', CONFIRMED_TRIP_ID);

    // Days and items were already present: neither should be upserted
    expect(upsertedTables).not.toContain('itinerary_days');
    expect(upsertedTables).not.toContain('itinerary_items');

    // Remaining missing tables MUST be upserted
    expect(upsertedTables).toContain('places');
    expect(upsertedTables).toContain('transport_legs');
    expect(upsertedTables).toContain('accommodation_stays');
    expect(upsertedTables).toContain('checklist_items');
    expect(upsertedTables).toContain('trip_notes');
  });

  it('6. preserves existing cloud-only notes ("Xx" and "Iii") without deleting them', async () => {
    let capturedNotesPayload: any[] = [];
    const cloudOnlyNoteIds = [
      '8bfa5aba-64db-4b47-b50a-cf11ba0fb6df', // "Xx"
      '7b059405-e807-44ca-8aa0-c752674e2a87', // "Iii"
    ];

    const mockClient: any = {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => {
              if (table === 'trips') {
                return {
                  data: {
                    id: CONFIRMED_TRIP_ID,
                    user_id: 'c1fa11ad-f348-45bb-a8bd-d7660a9f2118',
                    created_at: '2026-10-24T07:22:15.987Z',
                  },
                  error: null,
                };
              }
              return { data: null, error: null };
            }),
            then: (resolve: any) => {
              if (table === 'trip_notes') {
                resolve({
                  data: cloudOnlyNoteIds.map(id => ({ id })),
                  error: null,
                });
              } else {
                resolve({ data: [], error: null });
              }
            },
          })),
        })),
        upsert: vi.fn(async (payload: any) => {
          if (table === 'trip_notes') {
            capturedNotesPayload = payload;
          }
          return { error: null };
        }),
      })),
    };

    await safeInitialCloudImport(mockClient, 'c1fa11ad-f348-45bb-a8bd-d7660a9f2118', CONFIRMED_TRIP_ID);

    // Only the 3 local approved notes should be upserted
    expect(capturedNotesPayload).toHaveLength(3);
    const upsertedNoteIds = capturedNotesPayload.map(n => n.id);
    // Cloud-only notes Xx and Iii are NOT in the payload and no delete call is made
    expect(upsertedNoteIds).not.toContain(cloudOnlyNoteIds[0]);
    expect(upsertedNoteIds).not.toContain(cloudOnlyNoteIds[1]);
  });
});

describe('Phase 5D — Strict Schema & Scope Guardrails', () => {
  it('7. ensures checklist_items does not serialize day_id (pending future approved migration)', () => {
    const sampleChecklistItem = {
      id: '00000000-0000-4000-8006-000000000001',
      tripId: CONFIRMED_TRIP_ID,
      dayId: '00000000-0000-4000-8001-000000000001',
      title: 'Original Aadhaar Card',
      category: 'Documents',
      isCompleted: false,
      sortOrder: 1,
    };

    const payload = formatRecordForPostgres('checklist_items', sampleChecklistItem, 'user-123');
    expect(payload).not.toHaveProperty('day_id');
    expect(payload).not.toHaveProperty('user_id');
    expect(payload.trip_id).toBe(CONFIRMED_TRIP_ID);
    expect(payload.id).toBe('00000000-0000-4000-8006-000000000001');
  });
});

describe('Phase 5F — Budget Handling & Opening Cash Safety', () => {
  it('8. preserves approved trip budget of ₹10,000 from cloud even if local payload budget is 0', async () => {
    let capturedTripPayload: any = null;

    // Supabase cloud already has the user-entered 10,000 budget
    const mockClient: any = {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => {
              if (table === 'trips') {
                return {
                  data: {
                    id: CONFIRMED_TRIP_ID,
                    user_id: 'c1fa11ad-f348-45bb-a8bd-d7660a9f2118',
                    created_at: '2026-10-24T07:22:15.987Z',
                    total_budget: 10000,
                  },
                  error: null,
                };
              }
              return { data: null, error: null };
            }),
            then: (resolve: any) => {
              resolve({ data: [], error: null });
            },
          })),
        })),
        upsert: vi.fn(async (payload: any) => {
          if (table === 'trips') {
            capturedTripPayload = payload;
          }
          return { error: null };
        }),
      })),
    };

    await safeInitialCloudImport(mockClient, 'c1fa11ad-f348-45bb-a8bd-d7660a9f2118', CONFIRMED_TRIP_ID);

    expect(capturedTripPayload).toBeDefined();
    // Must preserve ₹10,000 budget
    expect(capturedTripPayload.total_budget).toBe(10000);
    // Must strictly set opening_cash = 0 and emergency_reserve = 0
    expect(capturedTripPayload.opening_cash).toBe(0);
    expect(capturedTripPayload.emergency_reserve).toBe(0);
  });

  it('9. strictly enforces opening_cash = 0 and does NOT inherit unapproved cloud prototype 1,000 value', async () => {
    let capturedTripPayload: any = null;

    // Cloud has unapproved prototype opening_cash of 1,000
    const mockClient: any = {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => {
              if (table === 'trips') {
                return {
                  data: {
                    id: CONFIRMED_TRIP_ID,
                    user_id: 'c1fa11ad-f348-45bb-a8bd-d7660a9f2118',
                    created_at: '2026-10-24T07:22:15.987Z',
                    total_budget: 10000,
                    opening_cash: 1000, // Unapproved prototype value in cloud
                  },
                  error: null,
                };
              }
              return { data: null, error: null };
            }),
            then: (resolve: any) => {
              resolve({ data: [], error: null });
            },
          })),
        })),
        upsert: vi.fn(async (payload: any) => {
          if (table === 'trips') {
            capturedTripPayload = payload;
          }
          return { error: null };
        }),
      })),
    };

    await safeInitialCloudImport(mockClient, 'c1fa11ad-f348-45bb-a8bd-d7660a9f2118', CONFIRMED_TRIP_ID);

    expect(capturedTripPayload).toBeDefined();
    // Opening cash must be 0 (user-approved), NOT 1000
    expect(capturedTripPayload.opening_cash).toBe(0);
    expect(capturedTripPayload.total_budget).toBe(10000);
    expect(capturedTripPayload.emergency_reserve).toBe(0);
  });

  it('10. protects unrelated cloud fields: preserves created_at, user_id, 19 days, and notes Xx & Iii', async () => {
    let tripUpsertPayload: any = null;
    let daysUpsertCalled = false;
    let capturedNotesPayload: any[] = [];

    const cloudCreatedAt = '2026-10-24T00:00:00+00:00';
    const cloudUserId = 'c1fa11ad-f348-45bb-a8bd-d7660a9f2118';
    const cloudNoteIds = ['8bfa5aba-64db-4b47-b50a-cf11ba0fb6df', '7b059405-e807-44ca-8aa0-c752674e2a87'];

    const mockClient: any = {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => {
              if (table === 'trips') {
                return {
                  data: {
                    id: CONFIRMED_TRIP_ID,
                    user_id: cloudUserId,
                    created_at: cloudCreatedAt,
                    total_budget: 10000,
                  },
                  error: null,
                };
              }
              return { data: null, error: null };
            }),
            then: (resolve: any) => {
              if (table === 'itinerary_days') {
                resolve({ data: CONFIRMED_ITINERARY_DAYS.map(d => ({ id: d.id })), error: null });
              } else if (table === 'trip_notes') {
                resolve({ data: cloudNoteIds.map(id => ({ id })), error: null });
              } else {
                resolve({ data: [], error: null });
              }
            },
          })),
        })),
        upsert: vi.fn(async (payload: any) => {
          if (table === 'trips') tripUpsertPayload = payload;
          if (table === 'itinerary_days') daysUpsertCalled = true;
          if (table === 'trip_notes') capturedNotesPayload = payload;
          return { error: null };
        }),
      })),
    };

    await safeInitialCloudImport(mockClient, cloudUserId, CONFIRMED_TRIP_ID);

    // 1. Trip created_at and user_id protected
    expect(tripUpsertPayload.created_at).toBe(cloudCreatedAt);
    expect(tripUpsertPayload.user_id).toBe(cloudUserId);

    // 2. 19 Itinerary Days skipped (not re-upserted or modified)
    expect(daysUpsertCalled).toBe(false);

    // 3. Cloud notes Xx and Iii preserved (not in payload, not deleted)
    expect(capturedNotesPayload).toHaveLength(3);
    const upsertedNoteIds = capturedNotesPayload.map(n => n.id);
    expect(upsertedNoteIds).not.toContain(cloudNoteIds[0]);
    expect(upsertedNoteIds).not.toContain(cloudNoteIds[1]);
  });
});
