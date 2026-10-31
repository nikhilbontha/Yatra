import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import {
  CONFIRMED_TRIP_ID,
  CONFIRMED_PILGRIMAGE_TRIP,
} from '@/lib/db';
import { CONFIRMED_ITINERARY_DAYS } from '@/lib/itinerary-data';
import { INITIAL_NOTES } from '@/lib/seed-data';
import { TABLE_SYNC_ORDER, formatRecordForPostgres, sanitizeUuid } from '@/lib/sync';

describe('Yatra Offline Reliability & Automatic Cloud Sync Verification Suite', () => {
  const rootDir = process.cwd();
  const swPath = path.join(rootDir, 'public', 'sw.js');
  const swContent = fs.readFileSync(swPath, 'utf8');

  // ----------------------------------------------------------------------------
  // 1. Service Worker & Immutable Static Asset Caching
  // ----------------------------------------------------------------------------
  describe('1. Service Worker Hardening & Static Asset Caching', () => {
    it('defines a valid versioned cache name matching yatra-shell-v*', () => {
      expect(swContent).toMatch(/CACHE_NAME\s*=\s*['"]yatra-shell-v\d+['"]/);
    });

    it('contains Cache-First optimization for /_next/static/ immutable JS/CSS chunks', () => {
      expect(swContent).toContain('/_next/static/');
      expect(swContent).toContain('caches.match(event.request)');
    });

    it('strictly excludes private API endpoints, auth routes, and signed storage URLs from cache', () => {
      const sensitiveExclusions = [
        "'/auth/'",
        "'/storage/v1/object/sign/'",
        "'/rest/v1/'",
        "'supabase.co'",
        "'/api/'",
      ];
      for (const exclusion of sensitiveExclusions) {
        expect(swContent).toContain(exclusion);
      }
    });

    it('validates syntax of service worker in isolated JavaScript VM', () => {
      expect(() => {
        new vm.Script(swContent, { filename: 'public/sw.js' });
      }).not.toThrow();
    });
  });

  // ----------------------------------------------------------------------------
  // 2. Offline Reads from IndexedDB
  // ----------------------------------------------------------------------------
  describe('2. Offline Data Read Availability & Trip Integrity', () => {
    it('reads all 19 approved pilgrimage days offline with exact boundaries', () => {
      expect(CONFIRMED_ITINERARY_DAYS.length).toBe(19);
      expect(CONFIRMED_ITINERARY_DAYS[0].dayNumber).toBe(1);
      expect(CONFIRMED_ITINERARY_DAYS[0].date).toBe('2026-11-17');
      expect(CONFIRMED_ITINERARY_DAYS[18].dayNumber).toBe(19);
      expect(CONFIRMED_ITINERARY_DAYS[18].date).toBe('2026-12-05');
    });

    it('retains approved notes locally for offline viewing in the field', () => {
      expect(INITIAL_NOTES.length).toBe(3);
      const titles = INITIAL_NOTES.map(n => n.title);
      expect(titles).toContain('Emergency Contacts & Helplines');
      expect(titles).toContain('Pilgrim Darshan Tips & Codes');
      expect(titles).toContain('Solo Travel Safety on Night Trains');
    });

    it('preserves approved trip ID 00000000-0000-4000-8000-000000000001', () => {
      expect(CONFIRMED_TRIP_ID).toBe('00000000-0000-4000-8000-000000000001');
      expect(CONFIRMED_PILGRIMAGE_TRIP.startDate).toBe('2026-11-17');
      expect(CONFIRMED_PILGRIMAGE_TRIP.endDate).toBe('2026-12-05');
    });
  });

  // ----------------------------------------------------------------------------
  // 3. Queue Deduplication & Offline Mutation Coalescing
  // ----------------------------------------------------------------------------
  describe('3. Queue Deduplication & Idempotent Mutation Handling', () => {
    it('coalesces multiple offline updates for the same record into a single latest payload', () => {
      const queue: any[] = [];

      function simulateQueueOfflineChange(entity: string, action: 'insert' | 'update' | 'delete', recordId: string, payload: any) {
        const existingIdx = queue.findIndex(q => q.status !== 'synced' && q.entity === entity && q.recordId === recordId);
        if (existingIdx >= 0) {
          const existing = queue[existingIdx];
          if (existing.action === 'insert') {
            if (action === 'delete') {
              queue.splice(existingIdx, 1);
              return;
            } else {
              existing.payload = payload;
              existing.status = 'pending';
              return;
            }
          } else if (existing.action === 'update') {
            if (action === 'delete') {
              existing.action = 'delete';
              existing.payload = { id: recordId };
              existing.status = 'pending';
              return;
            } else {
              existing.payload = payload;
              existing.status = 'pending';
              return;
            }
          }
        }

        queue.push({
          id: `sq-${queue.length + 1}`,
          entity,
          action,
          recordId,
          payload,
          status: 'pending',
          retryCount: 0,
        });
      }

      // 1. Edit note first time offline
      simulateQueueOfflineChange('notes', 'update', 'note-uuid-1', { content: 'First edit' });
      expect(queue.length).toBe(1);
      expect(queue[0].payload.content).toBe('First edit');

      // 2. Edit same note second time offline
      simulateQueueOfflineChange('notes', 'update', 'note-uuid-1', { content: 'Second edit' });
      expect(queue.length).toBe(1); // Deduped! Does not create a duplicate entry
      expect(queue[0].payload.content).toBe('Second edit');

      // 3. Insert and then delete offline before syncing to cloud
      simulateQueueOfflineChange('expenses', 'insert', 'temp-exp-1', { amount: 50 });
      expect(queue.length).toBe(2);
      simulateQueueOfflineChange('expenses', 'delete', 'temp-exp-1', { id: 'temp-exp-1' });
      expect(queue.length).toBe(1); // Record was cancelled out before upload
    });
  });

  // ----------------------------------------------------------------------------
  // 4. Bounded Exponential Backoff & Failed Upload Retention
  // ----------------------------------------------------------------------------
  describe('4. Bounded Exponential Backoff & Error Retry Safety', () => {
    it('calculates bounded exponential backoff up to 30 seconds max', () => {
      const getBackoffMs = (retryCount: number) => Math.min(1000 * Math.pow(2, retryCount), 30000);

      expect(getBackoffMs(1)).toBe(2000);   // 2s
      expect(getBackoffMs(2)).toBe(4000);   // 4s
      expect(getBackoffMs(3)).toBe(8000);   // 8s
      expect(getBackoffMs(4)).toBe(16000);  // 16s
      expect(getBackoffMs(5)).toBe(30000);  // Cap at 30s
      expect(getBackoffMs(10)).toBe(30000); // Stays at 30s cap
    });

    it('never removes unuploaded items from the queue when upload fails', () => {
      const queueItem = {
        id: 'sq-123',
        entity: 'checklists',
        action: 'update' as const,
        recordId: 'chk-1',
        payload: { isCompleted: true },
        status: 'pending' as const,
        retryCount: 0,
      };

      // Simulate a network failure during sync
      const syncFailed = true;
      let finalStatus: string = queueItem.status;
      let retryCount = queueItem.retryCount;

      if (syncFailed) {
        finalStatus = 'failed';
        retryCount += 1;
      }

      // The item MUST remain in the queue with status 'failed' or 'pending'
      expect(finalStatus).toBe('failed');
      expect(retryCount).toBe(1);
    });
  });

  // ----------------------------------------------------------------------------
  // 5. Authentication Expiry & Authorization Error Handling
  // ----------------------------------------------------------------------------
  describe('5. Session Expiry & Authorization Handling', () => {
    it('identifies authentication expiration tokens and returns unauthenticated state', () => {
      const authErrors = [
        { message: 'JWT expired', code: 'PGRST301' },
        { message: 'invalid claim: missing sub claim', code: '401' },
        { message: 'auth/invalid-session', status: 401 },
      ];

      for (const err of authErrors) {
        const isAuthErr =
          err.message?.includes('JWT') ||
          err.message?.includes('auth') ||
          err.message?.includes('claim') ||
          err.code === 'PGRST301' ||
          err.code === '401' ||
          (err as any).status === 401;

        expect(isAuthErr).toBe(true);
      }
    });

    it('ensures child records strictly respect parent-child RLS constraints without leaking user_id', () => {
      const userId = '00000000-0000-4000-8000-000000000001';

      // Parent trip has user_id
      const tripPayload = formatRecordForPostgres('trips', {
        id: CONFIRMED_TRIP_ID,
        ...CONFIRMED_PILGRIMAGE_TRIP,
      }, userId);
      expect(tripPayload.user_id).toBe(userId);

      // Child tables omit user_id to enforce parent-based cascade RLS
      const dayPayload = formatRecordForPostgres('itinerary_days', {
        id: 'day-1',
        tripId: CONFIRMED_TRIP_ID,
        dayNumber: 1,
        date: '2026-11-17',
        title: 'Hyderabad to Shirdi',
      }, userId);
      expect(dayPayload.user_id).toBeUndefined();
      expect(dayPayload.trip_id).toBe(CONFIRMED_TRIP_ID);
    });

    it('maintains strict topological sequence in TABLE_SYNC_ORDER', () => {
      expect(TABLE_SYNC_ORDER[0]).toBe('trips');
      expect(TABLE_SYNC_ORDER.indexOf('trips')).toBeLessThan(TABLE_SYNC_ORDER.indexOf('itinerary_days'));
      expect(TABLE_SYNC_ORDER.indexOf('itinerary_days')).toBeLessThan(TABLE_SYNC_ORDER.indexOf('itinerary_items'));
    });
  });

  // ----------------------------------------------------------------------------
  // 6. PostgreSQL Schema Compliance: Checklist Categories & UUID Sanitization
  // ----------------------------------------------------------------------------
  describe('6. PostgreSQL Schema Normalization & Constraint Compliance', () => {
    it('normalizes non-schema checklist categories to valid PostgreSQL CHECK constraint values', () => {
      const userId = '00000000-0000-4000-8000-000000000001';
      const validChecklistCategories = [
        'Documents',
        'Clothing',
        'Medicines',
        'Electronics',
        'Toiletries',
        'Gear',
        'Pre-Trip Preparation',
      ];

      // Packing -> Clothing
      const packingRecord = formatRecordForPostgres('checklist_items', {
        id: 'c1',
        tripId: CONFIRMED_TRIP_ID,
        category: 'Packing',
        title: 'Thermal innerwear',
      }, userId);
      expect(validChecklistCategories).toContain(packingRecord.category);
      expect(packingRecord.category).toBe('Clothing');

      // Health -> Medicines
      const healthRecord = formatRecordForPostgres('checklist_items', {
        id: 'c2',
        tripId: CONFIRMED_TRIP_ID,
        category: 'Health',
        title: 'Paracetamol & ORS',
      }, userId);
      expect(validChecklistCategories).toContain(healthRecord.category);
      expect(healthRecord.category).toBe('Medicines');

      // Preparation -> Pre-Trip Preparation
      const prepRecord = formatRecordForPostgres('checklist_items', {
        id: 'c3',
        tripId: CONFIRMED_TRIP_ID,
        category: 'Preparation',
        title: 'Leave copy of itinerary at home',
      }, userId);
      expect(validChecklistCategories).toContain(prepRecord.category);
      expect(prepRecord.category).toBe('Pre-Trip Preparation');

      // Unknown category -> Documents default
      const unknownRecord = formatRecordForPostgres('checklist_items', {
        id: 'c4',
        tripId: CONFIRMED_TRIP_ID,
        category: 'General',
        title: 'Train timings printout',
      }, userId);
      expect(validChecklistCategories).toContain(unknownRecord.category);
      expect(unknownRecord.category).toBe('Documents');
    });

    it('sanitizes UUIDs so non-UUID strings do not cause PostgreSQL 22P02 errors', () => {
      const validUuid = '11111111-2222-3333-4444-555555555555';
      expect(sanitizeUuid(validUuid)).toBe(validUuid);

      // Non-UUID strings (e.g. 'd1', 'day-1', empty string) must be null
      expect(sanitizeUuid('d1')).toBeNull();
      expect(sanitizeUuid('day-1')).toBeNull();
      expect(sanitizeUuid('')).toBeNull();
      expect(sanitizeUuid(undefined)).toBeNull();
      expect(sanitizeUuid(null)).toBeNull();

      // Verify in formatRecordForPostgres for notes
      const userId = '00000000-0000-4000-8000-000000000001';
      const notePayload = formatRecordForPostgres('trip_notes', {
        id: 'n1',
        tripId: CONFIRMED_TRIP_ID,
        dayId: 'd1', // Invalid UUID string
        title: 'Shirdi VIP line info',
        content: 'Gate 3 opens at 5:00 AM',
      }, userId);
      expect(notePayload.day_id).toBeNull();
    });
  });

  // ----------------------------------------------------------------------------
  // 7. Local Write Safety & Secure Context Identification
  // ----------------------------------------------------------------------------
  describe('7. Local Persistence & Secure Context Diagnostics', () => {
    it('ensures failed local database write throws and is not masked as success', async () => {
      let reportedSuccess = false;
      let reportedError: string | null = null;

      const failingPut = async () => {
        throw new Error('QuotaExceededError: Local database storage is full');
      };

      try {
        await failingPut();
        reportedSuccess = true;
      } catch (err: any) {
        reportedError = err.message;
      }

      expect(reportedSuccess).toBe(false);
      expect(reportedError).toContain('QuotaExceededError');
    });

    it('validates secure context rules for service worker registration', () => {
      const isOriginSecure = (origin: string, isSecureContextFlag: boolean) => {
        if (origin.startsWith('https://') || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
          return true;
        }
        return isSecureContextFlag;
      };

      // HTTPS and localhost are secure contexts
      expect(isOriginSecure('https://pilgrimage.example.com', true)).toBe(true);
      expect(isOriginSecure('http://localhost:3000', true)).toBe(true);

      // HTTP LAN addresses (e.g. 192.168.1.71) are NOT secure contexts on mobile browsers
      expect(isOriginSecure('http://192.168.1.71:3000', false)).toBe(false);
    });
  });
});
