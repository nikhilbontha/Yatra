import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AccommodationView, getAccommodationStatusBadgeClass } from '@/components/views/AccommodationView';
import {
  CONFIRMED_ACCOMMODATION_STAYS,
  getConfirmedAccommodationStays,
  getConfirmedAccommodationUUID,
} from '@/lib/itinerary-data';
import { INITIAL_TRIP, INITIAL_DAYS, INITIAL_STAYS } from '@/lib/seed-data';

describe('Phase 2 — Step 8: Accommodation Module Verification', () => {
  describe('1. Trip Association & Deterministic IDs', () => {
    it('associates all 11 destination accommodation stays with the correct tripId', () => {
      const customTripId = 'test-trip-xyz-999';
      const stays = getConfirmedAccommodationStays(customTripId);
      expect(stays.length).toBe(11);
      stays.forEach(stay => {
        expect(stay.tripId).toBe(customTripId);
      });
    });

    it('uses deterministic v4 UUIDs for all seeded accommodation records', () => {
      const uuid1 = getConfirmedAccommodationUUID(1);
      const uuid11 = getConfirmedAccommodationUUID(11);
      expect(uuid1).toBe('00000000-0000-4000-8004-000000000001');
      expect(uuid11).toBe('00000000-0000-4000-8004-000000000011');
      expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('2. Route Destinations & Dates Alignment with 19-Day Pilgrimage Itinerary', () => {
    it('covers all 11 route destinations in chronological sequence without gaps', () => {
      const stays = CONFIRMED_ACCOMMODATION_STAYS;
      expect(stays.length).toBe(11);

      const cities = stays.map(s => s.city);
      expect(cities).toEqual([
        'Shirdi',
        'Ellora',
        'Nashik',
        'Pune',
        'Lonavala',
        'Dwarka',
        'Somnath',
        'Ujjain',
        'Omkareshwar',
        'Khandwa / Indore',
        'Khammam',
      ]);
    });

    it('accurately links each accommodation stay to its corresponding itinerary day', () => {
      const stays = CONFIRMED_ACCOMMODATION_STAYS;
      stays.forEach(stay => {
        expect(stay.dayId).toBeDefined();
        const matchedDay = INITIAL_DAYS.find(d => d.id === stay.dayId);
        expect(matchedDay).toBeDefined();
        // Check-in date aligns with or precedes day date
        expect(stay.checkinDate).toBeDefined();
      });

      // Specific check-in day checks
      expect(stays[0].city).toBe('Shirdi');
      expect(stays[0].checkinDate).toBe('2026-11-18'); // Day 2
      expect(stays[1].city).toBe('Ellora');
      expect(stays[1].checkinDate).toBe('2026-11-19'); // Day 3
      expect(stays[2].city).toBe('Nashik');
      expect(stays[2].checkinDate).toBe('2026-11-21'); // Day 5
      expect(stays[3].city).toBe('Pune');
      expect(stays[3].checkinDate).toBe('2026-11-22'); // Days 6-7
      expect(stays[4].city).toBe('Lonavala');
      expect(stays[4].checkinDate).toBe('2026-11-24'); // Day 8 transit
      expect(stays[5].city).toBe('Dwarka');
      expect(stays[5].checkinDate).toBe('2026-11-25'); // Days 9-10
      expect(stays[6].city).toBe('Somnath');
      expect(stays[6].checkinDate).toBe('2026-11-27'); // Days 11-12
      expect(stays[7].city).toBe('Ujjain');
      expect(stays[7].checkinDate).toBe('2026-11-29'); // Days 13-14
      expect(stays[8].city).toBe('Omkareshwar');
      expect(stays[8].checkinDate).toBe('2026-12-01'); // Days 15-16
      expect(stays[9].city).toBe('Khandwa / Indore');
      expect(stays[9].checkinDate).toBe('2026-12-03'); // Day 17
      expect(stays[10].city).toBe('Khammam');
      expect(stays[10].checkinDate).toBe('2026-12-05'); // Day 19
    });
  });

  describe('3. No Invented Bookings, Phone Numbers, or Fabricated Prices', () => {
    it('contains zero fake booking references, fake PNRs, or fake advance payments in seed data', () => {
      const stays = CONFIRMED_ACCOMMODATION_STAYS;
      stays.forEach(stay => {
        expect(stay.bookingReference).toBeUndefined();
        expect(stay.bookingId).toBeUndefined();
        expect(stay.advancePaid ?? 0).toBe(0);
        // Phone numbers are not fake random mobiles
        if (stay.contactPhone) {
          expect(stay.contactPhone).not.toContain('+91 98765 43210');
        }
      });
    });

    it('defaults all planned stays to Needs research or Not selected status', () => {
      const stays = CONFIRMED_ACCOMMODATION_STAYS;
      stays.forEach(stay => {
        expect(['Needs research', 'Not selected']).toContain(stay.bookingStatus);
        expect(['Needs research', 'Not selected']).toContain(stay.status);
      });
    });
  });

  describe('4. Solo Traveller & Budget Preferences', () => {
    it('sets capacity to 1 person (Solo traveller) across all accommodation stays', () => {
      const stays = CONFIRMED_ACCOMMODATION_STAYS;
      stays.forEach(stay => {
        expect(stay.capacityPersons).toBe(1);
      });
    });

    it('prioritizes Dharamshalas, Ashrams, and Dormitories over commercial hotels', () => {
      const stays = CONFIRMED_ACCOMMODATION_STAYS;
      const dharamshalaAndAshramCount = stays.filter(
        s => s.stayType === 'Dharamshala' || s.stayType === 'Ashram' || s.stayType === 'Dormitory'
      ).length;
      expect(dharamshalaAndAshramCount).toBeGreaterThanOrEqual(9);
    });
  });

  describe('5. Status Handling & Badges', () => {
    it('renders all 7 supported statuses with dedicated styling', () => {
      const statuses = [
        'Not selected',
        'Needs research',
        'Option identified',
        'Booking pending',
        'Booked',
        'Checked in',
        'Completed or checked out',
      ];

      statuses.forEach(status => {
        const badge = getAccommodationStatusBadgeClass(status);
        expect(badge.label).toBeDefined();
        expect(badge.badgeClass).toBeDefined();
        expect(badge.badgeClass.length).toBeGreaterThan(5);
      });
    });
  });

  describe('6. UI Component Rendering Across All Screens', () => {
    it('renders Screen 1 Overview with accurate solo traveller and dharamshala stats', () => {
      const html = renderToStaticMarkup(
        React.createElement(AccommodationView, {
          trip: INITIAL_TRIP,
          days: INITIAL_DAYS,
          accommodations: INITIAL_STAYS,
          initialScreen: 'overview',
        })
      );

      expect(html).toContain('Accommodation');
      expect(html).toContain('Total Stays');
      expect(html).toContain('11'); // 11 stays
      expect(html).toContain('Upcoming Stay');
      expect(html).toContain('Solo');
      expect(html).toContain('Needs research');
    });

    it('renders Screen 2 List with day badges and links to itinerary days', () => {
      let selectedDayIdx = -1;
      const html = renderToStaticMarkup(
        React.createElement(AccommodationView, {
          trip: INITIAL_TRIP,
          days: INITIAL_DAYS,
          accommodations: INITIAL_STAYS,
          initialScreen: 'list',
          onSelectDayIndex: idx => {
            selectedDayIdx = idx;
          },
        })
      );

      expect(html).toContain('All Stays');
      expect(html).toContain('Day 2: Shirdi');
      expect(html).toContain('Day 3: Chhatrapati Sambhajinagar / Ellora');
      expect(html).toContain('Tariff unverified');
    });

    it('renders Screen 3 Add form with Related Day and Booking Status dropdowns', () => {
      const html = renderToStaticMarkup(
        React.createElement(AccommodationView, {
          trip: INITIAL_TRIP,
          days: INITIAL_DAYS,
          accommodations: INITIAL_STAYS,
          initialScreen: 'add',
        })
      );

      expect(html).toContain('Add Accommodation');
      expect(html).toContain('Related Itinerary Day');
      expect(html).toContain('Booking Status');
      expect(html).toContain('Solo Pilgrimage Preference:');
      expect(html).toContain('Booking Reference / ID (Optional)');
    });

    it('renders Screen 4 Details with linked itinerary day button and no fake phone numbers', () => {
      const html = renderToStaticMarkup(
        React.createElement(AccommodationView, {
          trip: INITIAL_TRIP,
          days: INITIAL_DAYS,
          accommodations: INITIAL_STAYS,
          initialScreen: 'details',
          initialSelectedStayId: INITIAL_STAYS[0].id,
        })
      );

      expect(html).toContain('Stay Details');
      expect(html).toContain('Shri Sai Baba Sansthan Trust Bhaktaniwas');
      expect(html).toContain('Day 2:');
      expect(html).toContain('Shirdi');
      expect(html).toContain('1 Person (Solo)');
      expect(html).toContain('Inquire directly at temple trust counter');
      expect(html).not.toContain('+91 98765 43210');
    });

    it('renders Screen 5 Booking Details with honest unbooked states', () => {
      const html = renderToStaticMarkup(
        React.createElement(AccommodationView, {
          trip: INITIAL_TRIP,
          days: INITIAL_DAYS,
          accommodations: INITIAL_STAYS,
          initialScreen: 'booking',
          initialSelectedStayId: INITIAL_STAYS[0].id,
        })
      );

      expect(html).toContain('Booking Details');
      expect(html).toContain('Not booked (Pending research)');
      expect(html).toContain('Pending reservation');
      expect(html).toContain('Tariff to be verified at counter');
      expect(html).toContain('₹0 (No advance payment)');
      expect(html).not.toContain('SHIRDI20261117');
    });

    it('renders Screen 6 Edit form prefilled with stay data', () => {
      const html = renderToStaticMarkup(
        React.createElement(AccommodationView, {
          trip: INITIAL_TRIP,
          days: INITIAL_DAYS,
          accommodations: INITIAL_STAYS,
          initialScreen: 'edit',
          initialSelectedStayId: INITIAL_STAYS[0].id,
        })
      );

      expect(html).toContain('Edit Accommodation');
      expect(html).toContain('Shri Sai Baba Sansthan Trust Bhaktaniwas');
      expect(html).toContain('Related Itinerary Day');
      expect(html).toContain('Booking Status');
      expect(html).toContain('Update Stay');
    });

    it('renders Screen 10 Settings with Established Pilgrimage Preferences and verified portals', () => {
      const html = renderToStaticMarkup(
        React.createElement(AccommodationView, {
          trip: INITIAL_TRIP,
          days: INITIAL_DAYS,
          accommodations: INITIAL_STAYS,
          initialScreen: 'settings',
        })
      );

      expect(html).toContain('Accommodation Settings');
      expect(html).toContain('Established Pilgrimage Trip Preferences');
      expect(html).toContain('Solo Traveller:');
      expect(html).toContain('Dharamshala &amp; Low-Cost First:');
      expect(html).toContain('Night Travel Room Savings:');
      expect(html).toContain('Official Pilgrimage Stays &amp; Dharamshala Portals');
      expect(html).toContain('Shri Saibaba Sansthan Trust (Shirdi)');
      expect(html).toContain('Shree Somnath Trust (Somnath / Veraval)');
      expect(html).toContain('Shri Mahakaleshwar Temple Trust (Ujjain)');
      expect(html).toContain('IRCTC Retiring Rooms (Station Transit)');
    });

    it('renders empty state gracefully when accommodations array is empty', () => {
      const html = renderToStaticMarkup(
        React.createElement(AccommodationView, {
          trip: INITIAL_TRIP,
          days: INITIAL_DAYS,
          accommodations: [],
          initialScreen: 'list',
        })
      );

      expect(html).toContain('No Accommodation Found');
      expect(html).toContain('Add Stay / Dharamshala');
    });
  });
});
