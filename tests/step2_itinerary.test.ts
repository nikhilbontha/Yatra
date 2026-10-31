import { describe, it, expect } from 'vitest';
import { CONFIRMED_ITINERARY_DAYS, CONFIRMED_TRIP_ID, getConfirmedDayUUID, getConfirmedTaskUUID } from '@/lib/itinerary-data';
import { CONFIRMED_PILGRIMAGE_TRIP } from '@/lib/db';
import { ItineraryDay } from '@/types/trip';

describe('Phase 2 — Step 2: Itinerary Module Verification', () => {
  it('1. verifies exactly one intended pilgrimage trip is used with stable ID', () => {
    expect(CONFIRMED_TRIP_ID).toBe('00000000-0000-4000-8000-000000000001');
    expect(CONFIRMED_PILGRIMAGE_TRIP.title).toBe('Complete Jyotirlinga Pilgrimage');
    expect(CONFIRMED_PILGRIMAGE_TRIP.origin).toContain('Hyderabad');
    expect(CONFIRMED_PILGRIMAGE_TRIP.destination).toContain('Khammam');
    expect(CONFIRMED_PILGRIMAGE_TRIP.startDate).toBe('2026-11-17');
    expect(CONFIRMED_PILGRIMAGE_TRIP.endDate).toBe('2026-12-05');
  });

  it('2. verifies exactly 19 itinerary days exist for this trip', () => {
    expect(CONFIRMED_ITINERARY_DAYS).toHaveLength(19);
    for (const day of CONFIRMED_ITINERARY_DAYS) {
      expect(day.tripId).toBe(CONFIRMED_TRIP_ID);
    }
  });

  it('3. verifies dates run continuously from 17 November through 5 December 2026 without gaps', () => {
    expect(CONFIRMED_ITINERARY_DAYS[0].date).toBe('2026-11-17');
    expect(CONFIRMED_ITINERARY_DAYS[18].date).toBe('2026-12-05');

    for (let i = 0; i < CONFIRMED_ITINERARY_DAYS.length - 1; i++) {
      const current = new Date(CONFIRMED_ITINERARY_DAYS[i].date + 'T12:00:00Z');
      const next = new Date(CONFIRMED_ITINERARY_DAYS[i + 1].date + 'T12:00:00Z');
      const diffMs = next.getTime() - current.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(1);
    }
  });

  it('4. verifies day numbers run from 1 through 19 with no duplicates or gaps', () => {
    const dayNumbers = CONFIRMED_ITINERARY_DAYS.map(d => d.dayNumber);
    expect(dayNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    const uniqueNumbers = new Set(dayNumbers);
    expect(uniqueNumbers.size).toBe(19);
  });

  it('5. verifies days appear in correct chronological order', () => {
    for (let i = 0; i < CONFIRMED_ITINERARY_DAYS.length - 1; i++) {
      expect(CONFIRMED_ITINERARY_DAYS[i].date < CONFIRMED_ITINERARY_DAYS[i + 1].date).toBe(true);
    }
  });

  it('6. verifies destinations and activities match the working pilgrimage itinerary', () => {
    // Day 1: Hyderabad/Secunderabad → Shirdi
    expect(CONFIRMED_ITINERARY_DAYS[0].title).toContain('Hyderabad');
    expect(CONFIRMED_ITINERARY_DAYS[0].title).toContain('Shirdi');

    // Day 2: Shirdi (Sai Baba, Dwarkamai, Chavadi, Gurusthan, Lendi Baug)
    expect(CONFIRMED_ITINERARY_DAYS[1].location).toBe('Shirdi');
    const day2Tasks = CONFIRMED_ITINERARY_DAYS[1].tasks.map(t => t.title.toLowerCase());
    expect(day2Tasks.some(t => t.includes('samadhi'))).toBe(true);
    expect(day2Tasks.some(t => t.includes('dwarkamai'))).toBe(true);
    expect(day2Tasks.some(t => t.includes('lendi baug'))).toBe(true);

    // Day 3: Shirdi → Chhatrapati Sambhajinagar / Ellora
    expect(CONFIRMED_ITINERARY_DAYS[2].title).toContain('Sambhajinagar');
    expect(CONFIRMED_ITINERARY_DAYS[2].title).toContain('Ellora');

    // Day 4: Grishneshwar Jyotirlinga + Ellora Caves
    expect(CONFIRMED_ITINERARY_DAYS[3].title).toContain('Grishneshwar');
    expect(CONFIRMED_ITINERARY_DAYS[3].title).toContain('Ellora Caves');
    expect(CONFIRMED_ITINERARY_DAYS[3].tasks.some(t => t.title.includes('Grishneshwar'))).toBe(true);
    expect(CONFIRMED_ITINERARY_DAYS[3].tasks.some(t => t.title.includes('Ellora Caves'))).toBe(true);

    // Day 5: Chhatrapati Sambhajinagar / Ellora → Nashik
    expect(CONFIRMED_ITINERARY_DAYS[4].location).toBe('Nashik');
    expect(CONFIRMED_ITINERARY_DAYS[4].title).toContain('Nashik');

    // Day 6: Trimbakeshwar Jyotirlinga — Nashik
    expect(CONFIRMED_ITINERARY_DAYS[5].title).toContain('Trimbakeshwar');
    const day6Tasks = CONFIRMED_ITINERARY_DAYS[5].tasks.map(t => t.title.toLowerCase());
    expect(day6Tasks.some(t => t.includes('trimbakeshwar'))).toBe(true);
    expect(day6Tasks.some(t => t.includes('kushavarta'))).toBe(true);

    // Day 7: Bhimashankar Jyotirlinga — Pune / Manchar
    expect(CONFIRMED_ITINERARY_DAYS[6].title).toContain('Bhimashankar');
    expect(CONFIRMED_ITINERARY_DAYS[6].tasks.some(t => t.title.includes('Bhimashankar'))).toBe(true);

    // Day 8: Lonavala Sightseeing
    expect(CONFIRMED_ITINERARY_DAYS[7].title).toContain('Lonavala');

    // Day 9: Pune / Lonavala → Dwarka
    expect(CONFIRMED_ITINERARY_DAYS[8].title).toContain('Dwarka');

    // Day 10: Dwarkadhish Temple + Nageshwar Jyotirlinga
    expect(CONFIRMED_ITINERARY_DAYS[9].title).toContain('Dwarkadhish');
    expect(CONFIRMED_ITINERARY_DAYS[9].title).toContain('Nageshwar');
    const day10Tasks = CONFIRMED_ITINERARY_DAYS[9].tasks.map(t => t.title.toLowerCase());
    expect(day10Tasks.some(t => t.includes('dwarkadhish'))).toBe(true);
    expect(day10Tasks.some(t => t.includes('nageshwar'))).toBe(true);

    // Day 11: Dwarka → Somnath / Veraval
    expect(CONFIRMED_ITINERARY_DAYS[10].title).toContain('Somnath');

    // Day 12: Somnath Jyotirlinga Darshan
    expect(CONFIRMED_ITINERARY_DAYS[11].title).toContain('Somnath');
    const day12Tasks = CONFIRMED_ITINERARY_DAYS[11].tasks.map(t => t.title.toLowerCase());
    expect(day12Tasks.some(t => t.includes('somnath'))).toBe(true);
    expect(day12Tasks.some(t => t.includes('bhalka tirth'))).toBe(true);

    // Day 13: Somnath / Veraval → Ujjain
    expect(CONFIRMED_ITINERARY_DAYS[12].title).toContain('Ujjain');

    // Day 14: Mahakaleshwar Jyotirlinga — Ujjain
    expect(CONFIRMED_ITINERARY_DAYS[13].title).toContain('Mahakaleshwar');
    const day14Tasks = CONFIRMED_ITINERARY_DAYS[13].tasks.map(t => t.title.toLowerCase());
    expect(day14Tasks.some(t => t.includes('mahakaleshwar'))).toBe(true);
    expect(day14Tasks.some(t => t.includes('mahakal lok'))).toBe(true);

    // Day 15: Ujjain → Omkareshwar
    expect(CONFIRMED_ITINERARY_DAYS[14].title).toContain('Omkareshwar');

    // Day 16: Omkareshwar + Mamaleshwar
    expect(CONFIRMED_ITINERARY_DAYS[15].title).toContain('Mamaleshwar');
    const day16Tasks = CONFIRMED_ITINERARY_DAYS[15].tasks.map(t => t.title.toLowerCase());
    expect(day16Tasks.some(t => t.includes('omkareshwar'))).toBe(true);
    expect(day16Tasks.some(t => t.includes('mamaleshwar'))).toBe(true);

    // Day 17: Omkareshwar / Indore / Khandwa → Telangana
    expect(CONFIRMED_ITINERARY_DAYS[16].title).toContain('Telangana');

    // Day 18: Return Journey Toward Khammam
    expect(CONFIRMED_ITINERARY_DAYS[17].title).toContain('Return Journey');

    // Day 19: Arrival in Khammam
    expect(CONFIRMED_ITINERARY_DAYS[18].title).toContain('Khammam');
  });

  it('7. verifies Mallikarjuna/Srisailam is NOT included in the 19-day itinerary', () => {
    for (const day of CONFIRMED_ITINERARY_DAYS) {
      expect(day.title.toLowerCase()).not.toContain('mallikarjuna');
      expect(day.title.toLowerCase()).not.toContain('srisailam');
      expect((day.subtitle || '').toLowerCase()).not.toContain('mallikarjuna');
      expect((day.subtitle || '').toLowerCase()).not.toContain('srisailam');
      expect((day.details || '').toLowerCase()).not.toContain('mallikarjuna');
      expect((day.details || '').toLowerCase()).not.toContain('srisailam');
      for (const task of day.tasks) {
        expect(task.title.toLowerCase()).not.toContain('mallikarjuna');
        expect(task.title.toLowerCase()).not.toContain('srisailam');
      }
    }
  });

  it('8. verifies unconfirmed items are flagged with needsVerification: true and verificationNote', () => {
    // Day 1: Train connection
    const day1TrainTask = CONFIRMED_ITINERARY_DAYS[0].tasks.find(t => t.title.includes('Depart'));
    expect(day1TrainTask?.needsVerification).toBe(true);
    expect(day1TrainTask?.verificationNote).toBeTruthy();

    // Day 6: Trimbakeshwar queue / access
    const day6TempleTask = CONFIRMED_ITINERARY_DAYS[5].tasks.find(t => t.title.includes('Trimbakeshwar'));
    expect(day6TempleTask?.needsVerification).toBe(true);
    expect(day6TempleTask?.verificationNote).toBeTruthy();

    // Day 7: Bhimashankar access restrictions
    const day7TempleTask = CONFIRMED_ITINERARY_DAYS[6].tasks.find(t => t.title.includes('Bhimashankar'));
    expect(day7TempleTask?.needsVerification).toBe(true);
    expect(day7TempleTask?.verificationNote).toBeTruthy();

    // Day 9: Train schedule to be verified
    const day9TrainTask = CONFIRMED_ITINERARY_DAYS[8].tasks.find(t => t.title.includes('Dwarka'));
    expect(day9TrainTask?.needsVerification).toBe(true);
    expect(day9TrainTask?.verificationNote).toBeTruthy();

    // Day 19: Arrival subject to train schedule
    const day19Task = CONFIRMED_ITINERARY_DAYS[18].tasks.find(t => t.title.includes('Expected arrival'));
    expect(day19Task?.needsVerification).toBe(true);
    expect(day19Task?.verificationNote).toBeTruthy();
  });

  it('9. verifies child activities are linked to their parent day with stable UUIDs', () => {
    for (let d = 0; d < CONFIRMED_ITINERARY_DAYS.length; d++) {
      const day = CONFIRMED_ITINERARY_DAYS[d];
      expect(day.id).toBe(getConfirmedDayUUID(d + 1));
      expect(day.tasks.length).toBeGreaterThan(0);

      for (let t = 0; t < day.tasks.length; t++) {
        const task = day.tasks[t];
        expect(task.id).toBe(getConfirmedTaskUUID(d + 1, t + 1));
        expect(task.dayId).toBe(day.id);
        expect(task.tripId).toBe(CONFIRMED_TRIP_ID);
        expect(task.sortOrder).toBe(t + 1);
        expect(task.isCompleted).toBe(false);
      }
    }
  });

  it('10. verifies total activity count across all 19 days equals exactly 50 authentic tasks', () => {
    const totalActivities = CONFIRMED_ITINERARY_DAYS.reduce((sum, d) => sum + d.tasks.length, 0);
    expect(totalActivities).toBe(50);
  });
});
