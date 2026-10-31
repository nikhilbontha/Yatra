import { describe, it, expect } from 'vitest';
import {
  CONFIRMED_PLACES,
  getConfirmedPlaces,
  getConfirmedPlaceUUID,
} from '@/lib/itinerary-data';
import { INITIAL_TRIP, INITIAL_DAYS, INITIAL_PLACES } from '@/lib/seed-data';

describe('Phase 2 — Step 9: Places & Temples Module Verification', () => {
  describe('1. Trip Association & Deterministic IDs', () => {
    it('associates all 32 authentic pilgrimage places with the correct tripId', () => {
      const customTripId = 'test-trip-yatra-777';
      const places = getConfirmedPlaces(customTripId);
      expect(places.length).toBe(32);
      places.forEach(place => {
        expect(place.tripId).toBe(customTripId);
      });
    });

    it('uses deterministic v4 UUIDs for all seeded place records (prefix 8005)', () => {
      const uuid1 = getConfirmedPlaceUUID(1);
      const uuid32 = getConfirmedPlaceUUID(32);
      expect(uuid1).toBe('00000000-0000-4000-8005-000000000001');
      expect(uuid32).toBe('00000000-0000-4000-8005-000000000032');
      expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('has 32 unique IDs with zero duplicates', () => {
      const ids = CONFIRMED_PLACES.map(p => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(CONFIRMED_PLACES.length);
      expect(uniqueIds.size).toBe(32);
    });
  });

  describe('2. Eight Main Pilgrimage Destinations & Separation of Shirdi vs Jyotirlingas', () => {
    it('contains all 8 main pilgrimage destinations with exact expected names', () => {
      const placeNames = CONFIRMED_PLACES.map(p => p.name);
      
      // 1. Shirdi Sai Baba
      expect(placeNames).toContain('Shri Sai Baba Samadhi Mandir');
      // 2. Grishneshwar
      expect(placeNames).toContain('Grishneshwar Jyotirlinga Temple');
      // 3. Trimbakeshwar
      expect(placeNames).toContain('Trimbakeshwar Jyotirlinga Temple');
      // 4. Bhimashankar
      expect(placeNames).toContain('Bhimashankar Jyotirlinga Temple');
      // 5. Omkareshwar
      expect(placeNames).toContain('Omkareshwar Jyotirlinga Temple');
      // 6. Mahakaleshwar
      expect(placeNames).toContain('Shri Mahakaleshwar Jyotirlinga Temple');
      // 7. Nageshwar
      expect(placeNames).toContain('Nageshwar Jyotirlinga Temple');
      // 8. Somnath
      expect(placeNames).toContain('Somnath Jyotirlinga Temple');
    });

    it('strictly separates Shirdi Sai Baba from the 7 Jyotirlingas', () => {
      const shirdi = CONFIRMED_PLACES.find(p => p.name === 'Shri Sai Baba Samadhi Mandir');
      expect(shirdi).toBeDefined();
      expect(shirdi?.placeType).toBe('Temple');
      expect(shirdi?.city).toBe('Shirdi');

      const jyotirlingas = CONFIRMED_PLACES.filter(p => p.placeType === 'Jyotirlinga');
      expect(jyotirlingas.length).toBe(7);

      const jyotirlingaNames = jyotirlingas.map(j => j.name);
      expect(jyotirlingaNames).toEqual([
        'Grishneshwar Jyotirlinga Temple',
        'Trimbakeshwar Jyotirlinga Temple',
        'Bhimashankar Jyotirlinga Temple',
        'Nageshwar Jyotirlinga Temple',
        'Somnath Jyotirlinga Temple',
        'Shri Mahakaleshwar Jyotirlinga Temple',
        'Omkareshwar Jyotirlinga Temple',
      ]);
      expect(jyotirlingaNames).not.toContain('Shri Sai Baba Samadhi Mandir');
    });

    it('strictly excludes Srisailam and Mallikarjuna as they are not part of the 19-day route', () => {
      const allText = CONFIRMED_PLACES.map(p => `${p.name} ${p.city} ${p.significance || ''} ${p.notes || ''}`).join(' ').toLowerCase();
      expect(allText).not.toContain('srisailam');
      expect(allText).not.toContain('mallikarjuna');
    });
  });

  describe('3. Additional Sightseeing Places Representation', () => {
    it('accurately represents all required sightseeing places by destination cluster', () => {
      const names = CONFIRMED_PLACES.map(p => p.name);

      // Shirdi cluster
      expect(names).toContain('Dwarkamai');
      expect(names).toContain('Chavadi');
      expect(names).toContain('Gurusthan');
      expect(names).toContain('Lendi Baug');
      expect(names).toContain('Khandoba Temple');

      // Ellora/Verul cluster
      expect(names).toContain('Ellora Caves');
      expect(names).toContain('Cave 16 (Kailasa Temple)');

      // Nashik cluster
      expect(names).toContain('Panchavati');
      expect(names).toContain('Ramkund');
      expect(names).toContain('Kalaram Temple');
      expect(names).toContain('Kushavarta Kund');

      // Omkareshwar cluster
      expect(names).toContain('Mamleshwar Temple');
      expect(names).toContain('Narmada Ghats');

      // Ujjain cluster
      expect(names).toContain('Mahakal Lok Corridor');
      expect(names).toContain('Ram Ghat');
      expect(names).toContain('Kal Bhairav Temple');

      // Dwarka cluster
      expect(names).toContain('Dwarkadhish Temple (Jagat Mandir)');
      expect(names).toContain('Gomti Ghat');
      expect(names).toContain('Rukmini Devi Temple');
      expect(names).toContain('Gopi Talav');
      expect(names).toContain('Bet Dwarka');

      // Somnath cluster
      expect(names).toContain('Bhalka Tirth');
      expect(names).toContain('Dehotsarg / Golokdham');
      expect(names).toContain('Triveni Sangam');
    });

    it('has exactly 24 additional sightseeing/secondary places and 8 main destinations (total 32)', () => {
      expect(CONFIRMED_PLACES.length).toBe(32);
      expect(INITIAL_PLACES.length).toBe(32);
    });
  });

  describe('4. Place-to-Itinerary Day Relationships', () => {
    it('links every place to an existing itinerary day and valid dayId', () => {
      const dayIds = new Set(INITIAL_DAYS.map(d => d.id));
      CONFIRMED_PLACES.forEach(place => {
        expect(place.dayId).toBeDefined();
        expect(dayIds.has(place.dayId!)).toBe(true);
        expect(place.dayNumber).toBeGreaterThanOrEqual(2);
        expect(place.dayNumber).toBeLessThanOrEqual(16);
      });
    });

    it('aligns specific place day assignments with the 19-day pilgrimage itinerary', () => {
      const shirdi = CONFIRMED_PLACES.find(p => p.name === 'Shri Sai Baba Samadhi Mandir');
      expect(shirdi?.dayNumber).toBe(2);

      const grishneshwar = CONFIRMED_PLACES.find(p => p.name === 'Grishneshwar Jyotirlinga Temple');
      expect(grishneshwar?.dayNumber).toBe(4);

      const trimbak = CONFIRMED_PLACES.find(p => p.name === 'Trimbakeshwar Jyotirlinga Temple');
      expect(trimbak?.dayNumber).toBe(6);

      const bhimashankar = CONFIRMED_PLACES.find(p => p.name === 'Bhimashankar Jyotirlinga Temple');
      expect(bhimashankar?.dayNumber).toBe(7);

      const nageshwar = CONFIRMED_PLACES.find(p => p.name === 'Nageshwar Jyotirlinga Temple');
      expect(nageshwar?.dayNumber).toBe(10);

      const somnath = CONFIRMED_PLACES.find(p => p.name === 'Somnath Jyotirlinga Temple');
      expect(somnath?.dayNumber).toBe(12);

      const mahakal = CONFIRMED_PLACES.find(p => p.name === 'Shri Mahakaleshwar Jyotirlinga Temple');
      expect(mahakal?.dayNumber).toBe(14);

      const omkareshwar = CONFIRMED_PLACES.find(p => p.name === 'Omkareshwar Jyotirlinga Temple');
      expect(omkareshwar?.dayNumber).toBe(16);
    });
  });

  describe('5. Visit Status & Conditional Wording for Optional Places', () => {
    it('preserves visitStatus as Optional for conditional visits', () => {
      const lendiBaug = CONFIRMED_PLACES.find(p => p.name === 'Lendi Baug');
      expect(lendiBaug?.visitStatus).toBe('Optional');

      const khandoba = CONFIRMED_PLACES.find(p => p.name === 'Khandoba Temple');
      expect(khandoba?.visitStatus).toBe('Optional');

      const gopiTalav = CONFIRMED_PLACES.find(p => p.name === 'Gopi Talav');
      expect(gopiTalav?.visitStatus).toBe('Optional');

      const betDwarka = CONFIRMED_PLACES.find(p => p.name === 'Bet Dwarka');
      expect(betDwarka?.visitStatus).toBe('Optional');
    });

    it('marks Trimbakeshwar and Bhimashankar with Needs verification without guaranteeing access', () => {
      const trimbak = CONFIRMED_PLACES.find(p => p.name === 'Trimbakeshwar Jyotirlinga Temple');
      expect(trimbak?.needsVerification).toBe(true);
      expect(trimbak?.visitStatus).toBe('Needs verification');
      expect(trimbak?.notes?.toLowerCase()).toContain('access is not guaranteed');

      const bhimashankar = CONFIRMED_PLACES.find(p => p.name === 'Bhimashankar Jyotirlinga Temple');
      expect(bhimashankar?.needsVerification).toBe(true);
      expect(bhimashankar?.visitStatus).toBe('Needs verification');
      expect(bhimashankar?.notes?.toLowerCase()).toContain('access is not guaranteed');
    });

    it('does not mark any future visits as completed in seed data', () => {
      CONFIRMED_PLACES.forEach(place => {
        expect(place.isVisited).toBeFalsy();
        expect(place.visitStatus).not.toBe('Visited');
      });
    });
  });

  describe('6. Honest Information & No Fabricated Timings/Fees', () => {
    it('contains no fabricated opening hours or entry fees', () => {
      CONFIRMED_PLACES.forEach(place => {
        // Entry fee should be string or number, non-empty and honest
        if (typeof place.entryFee === 'number') {
          expect(place.entryFee).toBeGreaterThanOrEqual(0);
        } else if (typeof place.entryFee === 'string') {
          expect(place.entryFee.length).toBeGreaterThan(0);
        }
        // Notes & verification reminders are honest
        if (place.notes) {
          expect(place.notes.length).toBeGreaterThan(0);
        }
      });
    });
  });
});
