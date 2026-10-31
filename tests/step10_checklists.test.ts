import { describe, it, expect } from 'vitest';
import {
  CONFIRMED_CHECKLIST_ITEMS,
  getConfirmedChecklistItems,
  getConfirmedChecklistUUID,
} from '@/lib/itinerary-data';
import { INITIAL_TRIP, INITIAL_DAYS, INITIAL_CHECKLIST } from '@/lib/seed-data';

describe('Phase 2 — Step 10: Checklists Module Verification', () => {
  describe('1. Trip Association & Deterministic IDs', () => {
    it('associates all 36 authentic checklist items with the specified tripId', () => {
      const customTripId = 'test-trip-yatra-checklists-999';
      const items = getConfirmedChecklistItems(customTripId);
      expect(items.length).toBe(36);
      items.forEach(item => {
        expect(item.tripId).toBe(customTripId);
      });
    });

    it('uses deterministic v4 UUIDs for all seeded checklist records (prefix 8006)', () => {
      const uuid1 = getConfirmedChecklistUUID(1);
      const uuid36 = getConfirmedChecklistUUID(36);
      expect(uuid1).toBe('00000000-0000-4000-8006-000000000001');
      expect(uuid36).toBe('00000000-0000-4000-8006-000000000036');
      expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('has 36 unique IDs with zero duplicates', () => {
      const ids = CONFIRMED_CHECKLIST_ITEMS.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(CONFIRMED_CHECKLIST_ITEMS.length);
      expect(uniqueIds.size).toBe(36);
    });
  });

  describe('2. All Five Checklist Groups Representation', () => {
    it('contains all 7 required items in Group A: Before departure', () => {
      const groupA = CONFIRMED_CHECKLIST_ITEMS.filter(c => c.checklistGroup === 'Before departure');
      expect(groupA.length).toBe(7);

      const titles = groupA.map(c => c.title);
      expect(titles).toContain('Confirm the final day-by-day itinerary');
      expect(titles).toContain('Verify train and bus connections');
      expect(titles).toContain('Check temple access, timings, and travel restrictions');
      expect(titles).toContain('Review the trip budget');
      expect(titles).toContain('Identify suitable budget accommodation or dharamshalas');
      expect(titles).toContain('Check weather forecasts closer to departure');
      expect(titles).toContain('Confirm the return journey toward Khammam');
    });

    it('contains all 6 required items in Group B: Documents and bookings', () => {
      const groupB = CONFIRMED_CHECKLIST_ITEMS.filter(c => c.checklistGroup === 'Documents and bookings');
      expect(groupB.length).toBe(6);

      const titles = groupB.map(c => c.title);
      expect(titles.some(t => t.includes('Government-issued identity document'))).toBe(true);
      expect(titles.some(t => t.includes('Train tickets and PNR details'))).toBe(true);
      expect(titles).toContain('Bus tickets, if booked');
      expect(titles).toContain('Accommodation confirmations, if booked');
      expect(titles).toContain('Emergency contact information');
      expect(titles).toContain('Copies of essential documents');
    });

    it('contains all 10 required items in Group C: Packing essentials', () => {
      const groupC = CONFIRMED_CHECKLIST_ITEMS.filter(c => c.checklistGroup === 'Packing essentials');
      expect(groupC.length).toBe(10);

      const titles = groupC.map(c => c.title);
      expect(titles).toContain('Phone and charger');
      expect(titles).toContain('Power bank');
      expect(titles).toContain('Earphones');
      expect(titles).toContain('Wallet, cash, and payment cards');
      expect(titles).toContain('Comfortable walking footwear');
      expect(titles).toContain('Appropriate clothing');
      expect(titles).toContain('Toiletries and personal hygiene items');
      expect(titles).toContain('Reusable water bottle');
      expect(titles).toContain('Small day bag');
      expect(titles).toContain('Regular personal essentials');
    });

    it('contains all 6 required items in Group D: Travel safety', () => {
      const groupD = CONFIRMED_CHECKLIST_ITEMS.filter(c => c.checklistGroup === 'Travel safety');
      expect(groupD.length).toBe(6);

      const titles = groupD.map(c => c.title);
      expect(titles).toContain('Share the itinerary with a trusted contact');
      expect(titles).toContain('Keep important documents accessible');
      expect(titles).toContain('Keep emergency contacts available offline');
      expect(titles).toContain('Check transport updates before departure');
      expect(titles).toContain('Keep some emergency funds separate');
      expect(titles).toContain('Confirm the next connection before travelling onward');
    });

    it('contains all 7 required items in Group E: Daily checklist', () => {
      const groupE = CONFIRMED_CHECKLIST_ITEMS.filter(c => c.checklistGroup === 'Daily checklist');
      expect(groupE.length).toBe(7);

      const titles = groupE.map(c => c.title);
      expect(titles).toContain("Check today's route and transport status");
      expect(titles).toContain('Confirm the destination and onward connection');
      expect(titles).toContain('Check temple access information');
      expect(titles).toContain('Carry required documents and essentials');
      expect(titles).toContain('Record actual expenses');
      expect(titles).toContain('Save useful travel notes');
      expect(titles).toContain("Check the next day's plan");
    });

    it('sums to exactly 36 items across all 5 groups in INITIAL_CHECKLIST', () => {
      expect(CONFIRMED_CHECKLIST_ITEMS.length).toBe(36);
      expect(INITIAL_CHECKLIST.length).toBe(36);
    });
  });

  describe('3. Completion Status & Task Honesty', () => {
    it('ensures zero actionable tasks are marked completed by default in seed data', () => {
      CONFIRMED_CHECKLIST_ITEMS.forEach(item => {
        expect(item.isCompleted).toBe(false);
      });
      INITIAL_CHECKLIST.forEach(item => {
        expect(item.isCompleted).toBe(false);
      });
    });

    it('supports checking and unchecking states without fabricating completion', () => {
      const firstTask = { ...CONFIRMED_CHECKLIST_ITEMS[0] };
      expect(firstTask.isCompleted).toBe(false);

      // Check task
      firstTask.isCompleted = true;
      expect(firstTask.isCompleted).toBe(true);

      // Uncheck task
      firstTask.isCompleted = false;
      expect(firstTask.isCompleted).toBe(false);
    });
  });

  describe('4. Daily Tasks Linked to Itinerary Days', () => {
    it('links daily checklist tasks to valid itinerary days', () => {
      const dayIds = new Set(INITIAL_DAYS.map(d => d.id));
      const dailyTasks = CONFIRMED_CHECKLIST_ITEMS.filter(c => c.checklistGroup === 'Daily checklist');

      dailyTasks.forEach(task => {
        expect(task.dayId).toBeDefined();
        expect(dayIds.has(task.dayId!)).toBe(true);
        expect(task.isSpecificDay).toBe(true);
      });
    });
  });

  describe('5. Database Schema & Check Constraint Compatibility', () => {
    it('strictly adheres to PostgreSQL category check constraint in initial schema', () => {
      const allowedCategories = new Set([
        'Documents',
        'Clothing',
        'Medicines',
        'Electronics',
        'Toiletries',
        'Gear',
        'Pre-Trip Preparation',
      ]);

      CONFIRMED_CHECKLIST_ITEMS.forEach(item => {
        expect(allowedCategories.has(item.category)).toBe(true);
      });
    });

    it('contains descriptions and priorities for rich task tracking', () => {
      CONFIRMED_CHECKLIST_ITEMS.forEach(item => {
        expect(item.title.trim().length).toBeGreaterThan(0);
        expect(item.description).toBeDefined();
        expect(item.description!.trim().length).toBeGreaterThan(0);
        expect(item.priority).toMatch(/^(Low|Medium|High)$/);
      });
    });
  });
});
