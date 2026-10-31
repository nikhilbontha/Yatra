import { describe, it, expect } from 'vitest';
import { toCamelCase, formatRecordForPostgres, hasMeaningfulTripDifference } from '@/lib/sync';
import { getSupabaseClient, resetSupabaseClientInstance } from '@/lib/supabase';

describe('Offline Synchronization & Data Mapping', () => {
  it('correctly maps snake_case database rows to camelCase client models', () => {
    const dbRow = {
      id: 'd1-2026-11-17',
      trip_id: 'e7a1b32d-9831-4fa2-8b43-96b61df30191',
      day_number: 1,
      theme_type: 'Transport',
      created_at: '2026-10-14T00:00:00.000Z',
      updated_at: '2026-10-14T12:00:00.000Z',
    };

    const clientModel = toCamelCase(dbRow);
    expect(clientModel.id).toBe('d1-2026-11-17');
    expect(clientModel.tripId).toBe('e7a1b32d-9831-4fa2-8b43-96b61df30191');
    expect(clientModel.dayNumber).toBe(1);
    expect(clientModel.themeType).toBe('Transport');
    expect(clientModel.createdAt).toBe('2026-10-14T00:00:00.000Z');
    expect(clientModel.updatedAt).toBe('2026-10-14T12:00:00.000Z');
  });

  it('preserves existing camelCase properties without mangling', () => {
    const alreadyCamel = {
      tripId: 'test-123',
      totalBudget: 25000,
    };
    const res = toCamelCase(alreadyCamel);
    expect(res.tripId).toBe('test-123');
    expect(res.totalBudget).toBe(25000);
  });

  it('correctly includes user_id on trips table payload', () => {
    const trip = {
      id: 'e7a1b32d-9831-4fa2-8b43-96b61df30191',
      title: 'Jyotirlinga Yatra',
      origin: 'Hyderabad',
      destination: 'Khammam',
      startDate: '2026-11-17',
      endDate: '2026-12-05',
      totalBudget: 25000,
      emergencyReserve: 5000,
      openingCash: 3000,
    };
    const payload = formatRecordForPostgres('trips', trip, 'user-uuid-123');
    expect(payload.user_id).toBe('user-uuid-123');
    expect(payload.title).toBe('Jyotirlinga Yatra');
    expect(payload.start_date).toBe('2026-11-17');
    expect(payload.end_date).toBe('2026-12-05');
  });

  it('strictly omits user_id from child tables (itinerary_days, items, expenses, etc.)', () => {
    const day = {
      id: 'e7a1b32d-9831-4fa2-8b43-000000000001',
      tripId: 'e7a1b32d-9831-4fa2-8b43-96b61df30191',
      dayNumber: 1,
      date: '2026-11-17',
      title: 'Day 1',
      tasks: [{ id: 'task-1' }],
    };
    const dayPayload = formatRecordForPostgres('itinerary_days', day, 'user-uuid-123');
    expect(dayPayload.user_id).toBeUndefined();
    expect(dayPayload.tasks).toBeUndefined();
    expect(dayPayload.trip_id).toBe('e7a1b32d-9831-4fa2-8b43-96b61df30191');

    const item = {
      id: 'e7a1b32d-9831-4fa2-8b43-000100010001',
      tripId: 'e7a1b32d-9831-4fa2-8b43-96b61df30191',
      dayId: 'e7a1b32d-9831-4fa2-8b43-000000000001',
      title: 'Check tickets',
      itemType: 'Task',
    };
    const itemPayload = formatRecordForPostgres('itinerary_items', item, 'user-uuid-123');
    expect(itemPayload.user_id).toBeUndefined();
    expect(itemPayload.day_id).toBe('e7a1b32d-9831-4fa2-8b43-000000000001');

    const expense = {
      id: 'exp-uuid-1',
      tripId: 'e7a1b32d-9831-4fa2-8b43-96b61df30191',
      dayId: '',
      date: '2026-11-17',
      title: 'Train ticket',
      amount: 450,
      category: 'Transport',
      paymentMethod: 'UPI',
    };
    const expPayload = formatRecordForPostgres('expenses', expense, 'user-uuid-123');
    expect(expPayload.user_id).toBeUndefined();
    expect(expPayload.day_id).toBeNull(); // Empty string sanitized to null for UUID column
  });

  it('correctly formats places, transport_legs, stays, checklists, and notes without user_id', () => {
    const place = {
      id: 'e7a1b32d-9831-4fa2-8b43-000300000001',
      tripId: 'e7a1b32d-9831-4fa2-8b43-96b61df30191',
      name: 'Grishneshwar',
      city: 'Ellora',
      placeType: 'Jyotirlinga',
    };
    const pPayload = formatRecordForPostgres('places', place, 'user-123');
    expect(pPayload.user_id).toBeUndefined();
    expect(pPayload.trip_id).toBe(place.tripId);
    expect(pPayload.place_type).toBe('Jyotirlinga');

    const leg = {
      id: 'e7a1b32d-9831-4fa2-8b43-000400000001',
      tripId: 'e7a1b32d-9831-4fa2-8b43-96b61df30191',
      fromLocation: 'Secunderabad',
      toLocation: 'Shirdi',
      mode: 'Train',
    };
    const lPayload = formatRecordForPostgres('transport_legs', leg, 'user-123');
    expect(lPayload.user_id).toBeUndefined();
    expect(lPayload.from_location).toBe('Secunderabad');

    const stay = {
      id: 'e7a1b32d-9831-4fa2-8b43-000500000001',
      tripId: 'e7a1b32d-9831-4fa2-8b43-96b61df30191',
      name: 'Sansthan Bhakta Niwas',
      city: 'Shirdi',
      stayType: 'Dharamshala',
    };
    const sPayload = formatRecordForPostgres('accommodation_stays', stay, 'user-123');
    expect(sPayload.user_id).toBeUndefined();
    expect(sPayload.stay_type).toBe('Dharamshala');

    const chk = {
      id: 'e7a1b32d-9831-4fa2-8b43-000200000001',
      tripId: 'e7a1b32d-9831-4fa2-8b43-96b61df30191',
      category: 'Documents',
      title: 'Aadhaar Original',
      isCompleted: true,
      sortOrder: 1,
    };
    const cPayload = formatRecordForPostgres('checklist_items', chk, 'user-123');
    expect(cPayload.user_id).toBeUndefined();
    expect(cPayload.is_completed).toBe(true);

    const note = {
      id: 'e7a1b32d-9831-4fa2-8b43-000600000001',
      tripId: 'e7a1b32d-9831-4fa2-8b43-96b61df30191',
      title: 'Helpline',
      content: '112',
      category: 'Emergency',
    };
    const nPayload = formatRecordForPostgres('trip_notes', note, 'user-123');
    expect(nPayload.user_id).toBeUndefined();
    expect(nPayload.category).toBe('Emergency');
  });

  it('guarantees shared singleton Supabase client instance across calls', () => {
    resetSupabaseClientInstance();
    const url = 'https://example.supabase.co';
    const key = 'test-anon-key-123';

    const client1 = getSupabaseClient(url, key);
    const client2 = getSupabaseClient(url, key);

    expect(client1).not.toBeNull();
    expect(client1).toBe(client2); // Same exact instance

    resetSupabaseClientInstance();
  });

  it('detects identical trip content despite server trigger timestamp differences (no false conflict)', () => {
    const local = {
      title: 'Complete Jyotirlinga Pilgrimage',
      origin: 'Hyderabad',
      destination: 'Khammam',
      startDate: '2026-11-17',
      endDate: '2026-12-05',
      totalBudget: 10000,
      emergencyReserve: 3000,
      openingCash: 2000,
      notes: 'Solo budget pilgrimage',
      isActive: true,
      updatedAt: '2026-10-13T19:59:12.439Z',
    };

    const cloudSnapshot = {
      title: 'Complete Jyotirlinga Pilgrimage',
      origin: 'Hyderabad',
      destination: 'Khammam',
      startDate: '2026-11-17',
      endDate: '2026-12-05',
      totalBudget: 10000,
      emergencyReserve: 3000,
      openingCash: 2000,
      notes: 'Solo budget pilgrimage',
      isActive: true,
      updatedAt: '2026-10-13T19:59:13.328009+00:00', // Newer server timestamp
    };

    const hasDiff = hasMeaningfulTripDifference(local, cloudSnapshot);
    expect(hasDiff).toBe(false); // MUST be false to prevent false positive conflict!
  });

  it('correctly detects genuine trip content differences', () => {
    const local = {
      totalBudget: 10000,
      emergencyReserve: 3000,
    };
    const cloud = {
      totalBudget: 15000, // Budget changed in cloud
      emergencyReserve: 3000,
    };

    expect(hasMeaningfulTripDifference(local, cloud)).toBe(true);
  });
});
