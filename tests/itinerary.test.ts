import { describe, it, expect } from 'vitest';
import {
  INITIAL_TRIP,
  INITIAL_DAYS,
  INITIAL_PLACES,
  INITIAL_TRANSPORT,
  INITIAL_CHECKLIST,
} from '@/lib/seed-data';

describe('Preloaded Pilgrimage Itinerary Integrity', () => {
  it('contains exactly 19 planned days from 17 Nov to 5 Dec 2026', () => {
    expect(INITIAL_DAYS).toHaveLength(19);

    expect(INITIAL_TRIP.startDate).toBe('2026-11-17');
    expect(INITIAL_TRIP.endDate).toBe('2026-12-05');
    expect(INITIAL_TRIP.origin).toBe('Hyderabad');
    expect(INITIAL_TRIP.destination).toBe('Khammam');

    expect(INITIAL_DAYS[0].date).toBe('2026-11-17');
    expect(INITIAL_DAYS[0].dayNumber).toBe(1);

    expect(INITIAL_DAYS[18].date).toBe('2026-12-05');
    expect(INITIAL_DAYS[18].dayNumber).toBe(19);
  });

  it('maintains unbroken chronological progression across all 19 days', () => {
    for (let i = 0; i < INITIAL_DAYS.length - 1; i++) {
      const current = new Date(INITIAL_DAYS[i].date + 'T00:00:00');
      const next = new Date(INITIAL_DAYS[i + 1].date + 'T00:00:00');
      const diffDays = Math.round((next.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(1);
      expect(INITIAL_DAYS[i + 1].dayNumber).toBe(INITIAL_DAYS[i].dayNumber + 1);
    }
  });

  it('covers the planned 7 Jyotirlingas with appropriate sacred places preloaded', () => {
    const jyotirlingaPlaces = INITIAL_PLACES.filter(p => p.placeType === 'Jyotirlinga');
    expect(jyotirlingaPlaces.length).toBeGreaterThanOrEqual(7);

    const placeNames = jyotirlingaPlaces.map(p => p.name.toLowerCase());
    expect(placeNames.some(n => n.includes('grishneshwar'))).toBe(true);
    expect(placeNames.some(n => n.includes('trimbakeshwar'))).toBe(true);
    expect(placeNames.some(n => n.includes('bhimashankar'))).toBe(true);
    expect(placeNames.some(n => n.includes('omkareshwar'))).toBe(true);
    expect(placeNames.some(n => n.includes('mahakaleshwar'))).toBe(true);
    expect(placeNames.some(n => n.includes('nageshwar'))).toBe(true);
    expect(placeNames.some(n => n.includes('somnath'))).toBe(true);
  });

  it('marks unverified services and temple access points as Needs Verification', () => {
    // Day 1: Depart / train travel task
    const day1Tasks = INITIAL_DAYS[0].tasks;
    const trainTask = day1Tasks.find(t => t.title.toLowerCase().includes('depart') || t.title.includes('17208'));
    expect(trainTask).toBeDefined();

    // Day 6: Trimbakeshwar conditional access
    const day6Tasks = INITIAL_DAYS[5].tasks;
    const trimbakTask = day6Tasks.find(t => t.title.toLowerCase().includes('trimbakeshwar'));
    expect(trimbakTask?.needsVerification).toBe(true);

    // Day 7: Bhimashankar access restrictions
    const day7Tasks = INITIAL_DAYS[6].tasks;
    const bhimaTask = day7Tasks.find(t => t.title.toLowerCase().includes('bhimashankar'));
    expect(bhimaTask?.needsVerification).toBe(true);

    // Transport legs verification
    const unverifiedLegs = INITIAL_TRANSPORT.filter(t => t.needsVerification);
    expect(unverifiedLegs.length).toBeGreaterThan(0);
  });

  it('includes required packing and pre-trip checklists', () => {
    expect(INITIAL_CHECKLIST.length).toBeGreaterThanOrEqual(10);
    const titles = INITIAL_CHECKLIST.map(c => c.title.toLowerCase());
    expect(titles.some(t => t.includes('photo id') || t.includes('aadhaar'))).toBe(true);
    expect(titles.some(t => t.includes('tickets saved offline'))).toBe(true);
    expect(titles.some(t => t.includes('power bank'))).toBe(true);
  });
});
