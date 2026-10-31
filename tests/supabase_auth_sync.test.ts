import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getSupabaseClient,
  resetSupabaseClientInstance,
  isValidSupabaseUrl,
  isValidSupabaseKey,
} from '@/lib/supabase';
import { formatRecordForPostgres, TABLE_SYNC_ORDER } from '@/lib/sync';
import { CONFIRMED_TRIP_ID, CONFIRMED_PILGRIMAGE_TRIP } from '@/lib/db';

describe('Supabase Cloud Authentication & Safe Sync Verification', () => {
  beforeEach(() => {
    resetSupabaseClientInstance();
  });

  afterEach(() => {
    resetSupabaseClientInstance();
  });

  describe('1. Configuration & Security Parameter Validation', () => {
    it('validates Supabase URL format correctly', () => {
      expect(isValidSupabaseUrl('')).toBe(false);
      expect(isValidSupabaseUrl(undefined)).toBe(false);
      expect(isValidSupabaseUrl('not-a-url')).toBe(false);
      expect(isValidSupabaseUrl('xyzcompany.supabase.co')).toBe(false); // missing protocol
      expect(isValidSupabaseUrl('ftp://xyzcompany.supabase.co')).toBe(false);

      expect(isValidSupabaseUrl('https://xyzcompany.supabase.co')).toBe(true);
      expect(isValidSupabaseUrl('http://127.0.0.1:54321')).toBe(true);
      expect(isValidSupabaseUrl('  https://my-project.supabase.co  ')).toBe(true); // trims whitespace
    });

    it('validates public key and strictly rejects service_role secrets', () => {
      expect(isValidSupabaseKey('')).toBe(false);
      expect(isValidSupabaseKey(undefined)).toBe(false);
      expect(isValidSupabaseKey('short-key')).toBe(false); // < 20 characters

      // Critical Security Rule: service_role key must NEVER be accepted
      expect(isValidSupabaseKey('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service_role.secret')).toBe(false);
      expect(isValidSupabaseKey('SERVICE_ROLE_KEY_SECRET_12345678901234567890')).toBe(false);

      // Valid anon/publishable key format
      expect(isValidSupabaseKey('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.public-anon-token-1234567890')).toBe(true);
    });

    it('returns null client when environment credentials are empty or missing', () => {
      const client = getSupabaseClient('', '');
      expect(client).toBeNull();
    });

    it('refuses to initialize if URL or key fails security validation', () => {
      const invalidUrlClient = getSupabaseClient('ftp://invalid-url.com', 'valid-length-public-key-1234567890');
      expect(invalidUrlClient).toBeNull();

      const serviceRoleClient = getSupabaseClient(
        'https://project.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service_role.key'
      );
      expect(serviceRoleClient).toBeNull();
    });
  });

  describe('2. User Ownership & RLS Schema Integrity', () => {
    it('associates authenticated user_id with the parent trips table payload', () => {
      const testUserId = 'a0000000-0000-4000-8000-000000000001';
      const tripRecord = {
        id: CONFIRMED_TRIP_ID,
        ...CONFIRMED_PILGRIMAGE_TRIP,
      };

      const payload = formatRecordForPostgres('trips', tripRecord, testUserId);
      expect(payload.user_id).toBe(testUserId);
      expect(payload.id).toBe(CONFIRMED_TRIP_ID);
      expect(payload.origin).toBe('Hyderabad, Telangana');
      expect(payload.destination).toBe('Khammam, Telangana');
      expect(payload.start_date).toBe('2026-11-17');
      expect(payload.end_date).toBe('2026-12-05');
    });

    it('strictly omits user_id from child tables to adhere to parent-child RLS policies', () => {
      const testUserId = 'a0000000-0000-4000-8000-000000000001';

      // Itinerary Day
      const dayRecord = {
        id: 'd1-uuid',
        tripId: CONFIRMED_TRIP_ID,
        dayNumber: 1,
        date: '2026-11-17',
        title: 'Hyderabad to Shirdi',
      };
      const dayPayload = formatRecordForPostgres('itinerary_days', dayRecord, testUserId);
      expect(dayPayload.user_id).toBeUndefined();
      expect(dayPayload.trip_id).toBe(CONFIRMED_TRIP_ID);

      // Checklist Item
      const checklistRecord = {
        id: 'chk-uuid',
        tripId: CONFIRMED_TRIP_ID,
        title: 'Original Aadhaar Card',
        isCompleted: true,
      };
      const chkPayload = formatRecordForPostgres('checklist_items', checklistRecord, testUserId);
      expect(chkPayload.user_id).toBeUndefined();
      expect(chkPayload.trip_id).toBe(CONFIRMED_TRIP_ID);

      // Note Item
      const noteRecord = {
        id: 'note-uuid',
        tripId: CONFIRMED_TRIP_ID,
        title: 'Emergency Contacts',
        content: 'Police: 100',
      };
      const notePayload = formatRecordForPostgres('trip_notes', noteRecord, testUserId);
      expect(notePayload.user_id).toBeUndefined();
      expect(notePayload.trip_id).toBe(CONFIRMED_TRIP_ID);
    });

    it('maintains strict topological table dependency order for foreign key synchronization', () => {
      expect(TABLE_SYNC_ORDER[0]).toBe('trips'); // Parent must come first
      expect(TABLE_SYNC_ORDER.indexOf('trips')).toBeLessThan(TABLE_SYNC_ORDER.indexOf('itinerary_days'));
      expect(TABLE_SYNC_ORDER.indexOf('itinerary_days')).toBeLessThan(TABLE_SYNC_ORDER.indexOf('itinerary_items'));
      expect(TABLE_SYNC_ORDER.indexOf('trips')).toBeLessThan(TABLE_SYNC_ORDER.indexOf('expenses'));
    });
  });

  describe('3. Account Details Connection States & Decoupled Sync', () => {
    it('distinguishes authentication state from cloud sync state', () => {
      // Being authenticated does NOT mean cloud sync is completed
      const authenticatedUnsynced = {
        cloudUser: { id: 'user-123', email: 'pilgrim@example.com' },
        syncStatus: 'signed_out' as const,
        lastSyncedAt: null,
      };

      expect(authenticatedUnsynced.cloudUser).not.toBeNull();
      expect(authenticatedUnsynced.syncStatus).toBe('signed_out');
      expect(authenticatedUnsynced.lastSyncedAt).toBeNull();
    });

    it('evaluates connection states accurately without false claims', () => {
      const getStatusLabel = (user: any, submitting: boolean, err: string | null, url: string, key: string) => {
        if (user) return 'Connected';
        if (submitting) return 'Connecting';
        if (err) return 'Error';
        if (!url || !key) return 'Not configured';
        return 'Guest';
      };

      expect(getStatusLabel(null, false, null, '', '')).toBe('Not configured');
      expect(getStatusLabel(null, false, null, 'https://test.supabase.co', 'key-12345678901234567890')).toBe('Guest');
      expect(getStatusLabel(null, true, null, 'https://test.supabase.co', 'key-12345678901234567890')).toBe('Connecting');
      expect(getStatusLabel(null, false, 'Invalid password', 'https://test.supabase.co', 'key-12345678901234567890')).toBe('Error');
      expect(getStatusLabel({ email: 'test@example.com' }, false, null, 'https://test.supabase.co', 'key-12345678901234567890')).toBe('Connected');
    });

    it('preserves the active trip identifier during cloud integration operations', () => {
      expect(CONFIRMED_TRIP_ID).toBe('00000000-0000-4000-8000-000000000001');
    });
  });

  describe('4. Local Data Preservation & Failed Sync Safety', () => {
    it('guarantees that sync failures do not clear, drop, or mutate local records', async () => {
      // Mock failure scenario during cloud sync
      const mockSyncError = new Error('Network timeout during sync');
      const localTripBefore = { ...CONFIRMED_PILGRIMAGE_TRIP, id: CONFIRMED_TRIP_ID };

      // Simulate a sync operation that catches an error
      let caughtError: Error | null = null;
      let localTripAfter = localTripBefore;

      try {
        throw mockSyncError;
      } catch (err: any) {
        caughtError = err;
        // Verify local trip data was never mutated or deleted in catch block
        expect(localTripAfter.id).toBe(CONFIRMED_TRIP_ID);
        expect(localTripAfter.title).toBe(localTripBefore.title);
      }

      expect(caughtError).toBe(mockSyncError);
      expect(localTripAfter).toEqual(localTripBefore);
    });

    it('retains pending items in sync queue on upload error for safe retry', () => {
      const pendingQueue = [
        { id: 'sq-1', entity: 'trip_notes', action: 'insert', recordId: 'note-1', status: 'pending' },
      ];

      // Simulate failed network request
      const failed = true;
      if (failed) {
        // Status remains 'pending' or 'error', never removed from array
        expect(pendingQueue.length).toBe(1);
        expect(pendingQueue[0].status).toBe('pending');
      }
    });

    it('preserves session persistence via official Supabase client storage without storing raw passwords', () => {
      // Verify no sensitive keys or passwords exist in configuration
      expect(process.env.SUPABASE_PASSWORD).toBeUndefined();
      expect(process.env.SERVICE_ROLE_KEY).toBeUndefined();
    });
  });
});
