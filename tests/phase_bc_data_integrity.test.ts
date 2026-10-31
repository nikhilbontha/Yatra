import { describe, it, expect } from 'vitest';
import {
  CONFIRMED_TRIP_ID,
  CONFIRMED_ITINERARY_DAYS,
  CONFIRMED_TRANSPORT_LEGS,
  CONFIRMED_ACCOMMODATION_STAYS,
  CONFIRMED_PLACES,
  CONFIRMED_CHECKLIST_ITEMS,
} from '@/lib/itinerary-data';
import {
  DEFAULT_TRIP_ID,
  INITIAL_TRIP,
  INITIAL_EXPENSES,
  INITIAL_DOCUMENTS,
  INITIAL_NOTES,
} from '@/lib/seed-data';
import { CONFIRMED_PILGRIMAGE_TRIP } from '@/lib/db';
import { CLEAN_EMPTY_TRIP } from '@/lib/clean-reset';

describe('Phase B/C — Safe Data Correction & Clean Initialization Verification Suite', () => {
  describe('1. Trip Dates and Itinerary Boundaries', () => {
    it('departs from Hyderabad on Tuesday, 17 November 2026', () => {
      expect(CONFIRMED_PILGRIMAGE_TRIP.startDate).toBe('2026-11-17');
      expect(CONFIRMED_PILGRIMAGE_TRIP.origin).toContain('Hyderabad');
      expect(CONFIRMED_ITINERARY_DAYS[0].date).toBe('2026-11-17');
      expect(CONFIRMED_ITINERARY_DAYS[0].dayNumber).toBe(1);
      expect(CONFIRMED_ITINERARY_DAYS[0].title).toContain('Hyderabad');
      expect(CONFIRMED_ITINERARY_DAYS[0].title).toContain('Shirdi');
    });

    it('contains exactly 19 approved itinerary days (17 Nov – 5 Dec 2026)', () => {
      expect(CONFIRMED_ITINERARY_DAYS.length).toBe(19);
      expect(CONFIRMED_ITINERARY_DAYS[18].dayNumber).toBe(19);
      expect(CONFIRMED_ITINERARY_DAYS[18].date).toBe('2026-12-05');
      expect(CONFIRMED_ITINERARY_DAYS[18].title).toContain('Khammam');
    });

    it('preserves all approved route locations without skipping days', () => {
      const dates = CONFIRMED_ITINERARY_DAYS.map(d => d.date);
      for (let i = 0; i < 19; i++) {
        const expectedDate = new Date(Date.UTC(2026, 10, 17 + i)).toISOString().slice(0, 10);
        expect(dates[i]).toBe(expectedDate);
      }
    });
  });

  describe('2. Safe Removal of Fabricated Financial and Booking Data', () => {
    it('sets unconfirmed budget to 0 on initial and clean trip templates ("Budget not set")', () => {
      expect(INITIAL_TRIP.totalBudget).toBe(0);
      expect(INITIAL_TRIP.emergencyReserve).toBe(0);
      expect(INITIAL_TRIP.openingCash).toBe(0);

      expect(CONFIRMED_PILGRIMAGE_TRIP.totalBudget).toBe(0);
      expect(CONFIRMED_PILGRIMAGE_TRIP.emergencyReserve).toBe(0);
      expect(CONFIRMED_PILGRIMAGE_TRIP.openingCash).toBe(0);

      expect(CLEAN_EMPTY_TRIP.totalBudget).toBe(0);
      expect(CLEAN_EMPTY_TRIP.emergencyReserve).toBe(0);
      expect(CLEAN_EMPTY_TRIP.openingCash).toBe(0);
    });

    it('ensures INITIAL_EXPENSES is empty with zero fabricated expenses', () => {
      expect(INITIAL_EXPENSES).toEqual([]);
      expect(INITIAL_EXPENSES.length).toBe(0);
    });

    it('ensures INITIAL_DOCUMENTS is empty with zero fabricated tickets or PNRs', () => {
      expect(INITIAL_DOCUMENTS).toEqual([]);
      expect(INITIAL_DOCUMENTS.length).toBe(0);
    });
  });

  describe('3. Strict Route Integrity and Destination Audit', () => {
    it('contains zero mentions of Srisailam or Mallikarjuna across all core datasets', () => {
      const allText = JSON.stringify({
        days: CONFIRMED_ITINERARY_DAYS,
        places: CONFIRMED_PLACES,
        transport: CONFIRMED_TRANSPORT_LEGS,
        stays: CONFIRMED_ACCOMMODATION_STAYS,
        documents: INITIAL_DOCUMENTS,
        expenses: INITIAL_EXPENSES,
      }).toLowerCase();

      expect(allText).not.toContain('srisailam');
      expect(allText).not.toContain('mallikarjuna');
    });

    it('preserves all 32 holy places & temples including 7 Jyotirlingas', () => {
      expect(CONFIRMED_PLACES.length).toBe(32);
      const jyotirlingas = CONFIRMED_PLACES.filter(p => p.placeType === 'Jyotirlinga');
      expect(jyotirlingas.length).toBe(7);

      const names = CONFIRMED_PLACES.map(p => p.name);
      expect(names).toContain('Shri Sai Baba Samadhi Mandir');
      expect(names).toContain('Grishneshwar Jyotirlinga Temple');
      expect(names).toContain('Trimbakeshwar Jyotirlinga Temple');
      expect(names).toContain('Bhimashankar Jyotirlinga Temple');
      expect(names).toContain('Omkareshwar Jyotirlinga Temple');
      expect(names).toContain('Shri Mahakaleshwar Jyotirlinga Temple');
      expect(names).toContain('Nageshwar Jyotirlinga Temple');
      expect(names).toContain('Somnath Jyotirlinga Temple');
      expect(names).toContain('Dwarkadhish Temple (Jagat Mandir)');
      expect(names).toContain('Ellora Caves');
    });

    it('preserves 19 planned transport legs clearly labeled with Needs verification', () => {
      expect(CONFIRMED_TRANSPORT_LEGS.length).toBe(19);
      CONFIRMED_TRANSPORT_LEGS.forEach(leg => {
        expect(leg.status).toBe('Needs verification');
        expect(leg.needsVerification).toBe(true);
        expect(leg.pnr).toBeUndefined();
      });
    });

    it('preserves 11 accommodation research options with 0 cost and Needs research status', () => {
      expect(CONFIRMED_ACCOMMODATION_STAYS.length).toBe(11);
      CONFIRMED_ACCOMMODATION_STAYS.forEach(stay => {
        expect(['Needs research', 'Not selected']).toContain(stay.bookingStatus);
        expect(['Needs research', 'Not selected']).toContain(stay.status);
        expect(stay.estimatedCost).toBe(0);
        expect(stay.totalAmount).toBe(0);
        expect(stay.bookingReference).toBeUndefined();
      });
    });

    it('preserves 36 checklist items and 3 genuine notes', () => {
      expect(CONFIRMED_CHECKLIST_ITEMS.length).toBe(36);
      expect(INITIAL_NOTES.length).toBe(3);
    });
  });
});
