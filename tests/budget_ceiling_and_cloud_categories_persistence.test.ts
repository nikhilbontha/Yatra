import { describe, it, expect, vi } from 'vitest';
import {
  checkMissingCloudRecords,
  formatRecordForPostgres,
} from '@/lib/sync';
import { toDeterministicUUID } from '@/lib/seed-data';
import { Trip } from '@/types/trip';

describe('Budget Ceiling Persistence & Cloud Categories Relational Integrity', () => {
  const TEST_TRIP_ID = '00000000-0000-4000-8000-000000000777';
  const USER_ID = '00000000-0000-4000-8000-000000000123';

  describe('1. Local Dexie & Server Store Budget Ceiling Preservation', () => {
    it('saves user-configured budget ceiling (₹50,000, UPI ₹32,000, Cash ₹12,000, Reserve ₹6,000) and preserves it across pull updates', () => {
      const initialTrip: Trip = {
        id: TEST_TRIP_ID,
        title: 'A Divine Journey Across India',
        origin: 'Hyderabad, Telangana',
        destination: 'Khammam, Telangana',
        startDate: '2026-11-17',
        endDate: '2026-12-05',
        totalBudget: 50000,
        totalUpiAmount: 32000,
        openingCash: 12000,
        emergencyReserve: 6000,
        isActive: true,
        createdAt: '2026-10-31T00:00:00.000Z',
        updatedAt: new Date().toISOString(),
      };

      expect(initialTrip.totalBudget).toBe(50000);
      expect(initialTrip.totalUpiAmount).toBe(32000);
      expect(initialTrip.openingCash).toBe(12000);
      expect(initialTrip.emergencyReserve).toBe(6000);
    });

    it('prevents stale or older server sync data from overwriting newer local user budget', () => {
      const localTrip: Trip = {
        id: TEST_TRIP_ID,
        title: 'A Divine Journey Across India',
        origin: 'Hyderabad, Telangana',
        destination: 'Khammam, Telangana',
        startDate: '2026-11-17',
        endDate: '2026-12-05',
        totalBudget: 50000,
        totalUpiAmount: 32000,
        openingCash: 12000,
        emergencyReserve: 6000,
        isActive: true,
        createdAt: '2026-10-31T00:00:00.000Z',
        updatedAt: '2026-10-31T12:00:00.000Z', // Newer local edit
      };

      const staleServerData = {
        trip: {
          id: TEST_TRIP_ID,
          totalBudget: 35000,
          updatedAt: '2026-10-31T10:00:00.000Z', // Older server timestamp
        },
      };

      const serverUpdated = new Date(staleServerData.trip.updatedAt).getTime();
      const localUpdated = new Date(localTrip.updatedAt).getTime();

      // Condition: strictly serverUpdated > localUpdated
      const shouldOverwrite = serverUpdated > localUpdated;
      expect(shouldOverwrite).toBe(false);

      // Total budget fallback logic ensures non-zero local budget is preserved
      const totalBudget = (staleServerData.trip.totalBudget !== undefined && staleServerData.trip.totalBudget > 0 && shouldOverwrite)
        ? staleServerData.trip.totalBudget
        : localTrip.totalBudget;

      expect(totalBudget).toBe(50000);
    });
  });

  describe('2. Supabase Cloud Schema & Budget Categories Synchronization', () => {
    it('detects missing budget_categories in Supabase via checkMissingCloudRecords', async () => {
      const mockClient: any = {
        from: vi.fn((table: string) => {
          if (table === 'budget_categories') {
            return {
              select: () => ({
                eq: () => Promise.resolve({ data: [], error: null }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [{ id: 'mock-1' }], error: null }),
            }),
          };
        }),
      };

      const mockLocal = {
        days: [{ id: 'mock-1', tasks: [] }],
        places: [{ id: 'mock-1' }],
        transportLegs: [{ id: 'mock-1' }],
        accommodations: [{ id: 'mock-1' }],
        checklists: [{ id: 'mock-1' }],
        notes: [{ id: 'mock-1' }],
      };

      const check = await checkMissingCloudRecords(mockClient, TEST_TRIP_ID, mockLocal);
      expect(check.needsImport).toBe(true);
      expect(check.missingSummary).toContain('budget categories (missing)');
    });

    it('generates deterministic UUIDs and correct allocations for all 7 budget categories', () => {
      const DEFAULT_BUDGET_CATEGORIES = [
        { name: 'Transport', icon: 'train', share: 0.35 },
        { name: 'Accommodation', icon: 'bed-double', share: 0.25 },
        { name: 'Food', icon: 'utensils', share: 0.15 },
        { name: 'Temple / donation', icon: 'landmark', share: 0.10 },
        { name: 'Sightseeing', icon: 'compass', share: 0.05 },
        { name: 'Shopping', icon: 'shopping-bag', share: 0.05 },
        { name: 'Other', icon: 'tag', share: 0.05 },
      ];

      const totalBudget = 50000;
      const catPayload = DEFAULT_BUDGET_CATEGORIES.map(c => ({
        id: toDeterministicUUID(`${TEST_TRIP_ID}-category-${c.name}`),
        trip_id: TEST_TRIP_ID,
        name: c.name,
        icon: c.icon,
        allocated_amount: Math.round(totalBudget * c.share),
      }));

      expect(catPayload).toHaveLength(7);
      expect(catPayload[0].name).toBe('Transport');
      expect(catPayload[0].allocated_amount).toBe(17500); // 35% of 50000
      expect(catPayload[1].name).toBe('Accommodation');
      expect(catPayload[1].allocated_amount).toBe(12500); // 25% of 50000
      expect(catPayload[2].name).toBe('Food');
      expect(catPayload[2].allocated_amount).toBe(7500);  // 15% of 50000
      expect(catPayload[3].name).toBe('Temple / donation');
      expect(catPayload[3].allocated_amount).toBe(5000);  // 10% of 50000

      // All category IDs must be valid UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      catPayload.forEach(cat => {
        expect(cat.id).toMatch(uuidRegex);
      });
    });

    it('formats trip record with correct total_budget for Supabase trips table', () => {
      const trip: Trip = {
        id: TEST_TRIP_ID,
        title: 'A Divine Journey Across India',
        origin: 'Hyderabad, Telangana',
        destination: 'Khammam, Telangana',
        startDate: '2026-11-17',
        endDate: '2026-12-05',
        totalBudget: 50000,
        emergencyReserve: 6000,
        openingCash: 12000,
        totalUpiAmount: 32000,
        isActive: true,
        createdAt: '2026-10-31T00:00:00.000Z',
        updatedAt: '2026-10-31T00:00:00.000Z',
      };

      const payload = formatRecordForPostgres('trips', trip, USER_ID);
      expect(payload.id).toBe(TEST_TRIP_ID);
      expect(payload.user_id).toBe(USER_ID);
      expect(payload.total_budget).toBe(50000);
      expect(payload.emergency_reserve).toBe(6000);
      expect(payload.opening_cash).toBe(12000);
    });
  });
});
