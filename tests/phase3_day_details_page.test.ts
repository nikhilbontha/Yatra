import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CONFIRMED_ITINERARY_DAYS, CONFIRMED_TRIP_ID } from '@/lib/itinerary-data';
import { CONFIRMED_PILGRIMAGE_TRIP } from '@/lib/db';
import { ItineraryView, DetailSubTab } from '@/components/views/ItineraryView';
import { Expense } from '@/types/trip';
import { getVerifiedTempleInfo, VERIFIED_TEMPLE_DATABASE } from '@/lib/temple-knowledge';

describe('Phase 3 — Populate the Yatra Day Details Page with Genuine Trip Data', () => {
  const mockExpenses: Expense[] = [];

  const renderDetails = (dayIndex: number, subTab: DetailSubTab = 'plan') => {
    return renderToStaticMarkup(
      React.createElement(ItineraryView, {
        days: CONFIRMED_ITINERARY_DAYS,
        expenses: mockExpenses,
        selectedDayIndex: dayIndex,
        onSelectDayIndex: vi.fn(),
        onEditDay: vi.fn(),
        onAddTask: vi.fn(),
        onToggleTask: vi.fn(),
        onAddExpenseForDate: vi.fn(),
        initialView: 'details',
        defaultSubTab: subTab,
      })
    );
  };

  it('1. Confirmed Trip Profile: Confirms Day Details reflects authentic trip parameters', () => {
    expect(CONFIRMED_PILGRIMAGE_TRIP.origin).toBe('Hyderabad, Telangana');
    expect(CONFIRMED_PILGRIMAGE_TRIP.startDate).toBe('2026-11-17');
    expect(CONFIRMED_PILGRIMAGE_TRIP.destination).toBe('Khammam, Telangana');
    expect(CONFIRMED_PILGRIMAGE_TRIP.totalBudget).toBe(0);
    expect(CONFIRMED_PILGRIMAGE_TRIP.targetDuration).toBe('12–15 days');
    expect(CONFIRMED_PILGRIMAGE_TRIP.preferredFirstStop).toContain('Shirdi');

    // Day 1 begins in Hyderabad and heads toward Shirdi
    const day1Html = renderDetails(0, 'plan');
    expect(day1Html).toContain('Day 1');
    expect(day1Html).toContain('Hyderabad');
    expect(day1Html).toContain('Shirdi');
  });

  it('2. Navigation & Day Number: Opens the correct day for all 19 itinerary days', () => {
    for (let idx = 0; idx < CONFIRMED_ITINERARY_DAYS.length; idx++) {
      const day = CONFIRMED_ITINERARY_DAYS[idx];
      const html = renderDetails(idx, 'plan');
      expect(html).toContain(`Day ${day.dayNumber}`);
    }
  });

  it('3. Day Details Field 2: Starting location and destination route segment', () => {
    // Day 1: Secunderabad / Hyderabad to Shirdi
    const day1Html = renderDetails(0, 'plan');
    expect(day1Html).toContain('Route Segment');
    expect(day1Html).toContain('Secunderabad');
    expect(day1Html).toContain('Shirdi');

    // Day 7: Pune to Bhimashankar
    const day7Html = renderDetails(6, 'plan');
    expect(day7Html).toContain('Pune');
    expect(day7Html).toContain('Bhimashankar');

    // Day 10: Dwarka / Nageshwar
    const day10Html = renderDetails(9, 'plan');
    expect(day10Html).toContain('Dwarka');
    expect(day10Html).toContain('Nageshwar');
  });

  it('4. Day Details Field 3: Chronologically ordered activities with time estimates and status', () => {
    // Day 2 (Shirdi): All 4 activities render in order
    const day2 = CONFIRMED_ITINERARY_DAYS[1];
    const html = renderDetails(1, 'plan');

    for (const task of day2.tasks) {
      const cleanTitle = task.title.replace(/&/g, '&amp;');
      expect(html).toContain(cleanTitle);
      expect(html).toContain(task.timeEstimate);
    }
  });

  it('5. Day Details Field 4 & 9: Temple darshan timings, waiting times, and official rules', () => {
    // Day 2: Shirdi Sai Baba Temple in Places tab
    const day2Html = renderDetails(1, 'places');
    expect(day2Html).toContain('Verified Temple Darshan &amp; Timings');
    expect(day2Html).toContain('05:00 AM – 10:00 PM');
    expect(day2Html).toContain('1.5–3 hours');
    expect(day2Html).toContain('online.sai.org.in');

    // Day 4: Grishneshwar Jyotirlinga + Ellora Caves in Places tab
    const day4Html = renderDetails(3, 'places');
    expect(day4Html).toContain('Grishneshwar');
    expect(day4Html).toContain('05:30 AM – 09:30 PM');
    expect(day4Html).toContain('45–90 minutes');
    expect(day4Html).toContain('Garbhagriha');
    expect(day4Html).toContain('Ellora Caves');
    expect(day4Html).toContain('Closed on Tuesdays');
    expect(day4Html).toContain('Kailasa');

    // Day 14: Mahakaleshwar Jyotirlinga with Bhasma Aarti notice
    const day14Html = renderDetails(13, 'places');
    expect(day14Html).toContain('Mahakaleshwar');
    expect(day14Html).toContain('Bhasma Aarti');
    expect(day14Html).toContain('shrimahakaleshwar.com');
  });

  it('6. Day Details Field 5 & 7: Transport mode, journey sequence, and duration', () => {
    // Day 1 (Train to Shirdi)
    const day1Html = renderDetails(0, 'map');
    expect(day1Html).toContain('Transport Plan &amp; Journey Notes');
    expect(day1Html).toContain('Mode');
    expect(day1Html).toContain('Travel Time');
    expect(day1Html).toContain('Distance');

    // Day 7 (Bhimashankar State bus)
    const day7Html = renderDetails(6, 'map');
    expect(day7Html).toContain('MSRTC');
    expect(day7Html).toContain('State Bus');
  });

  it('7. Day Details Field 6: Departure & arrival times reflect verified or pending status honestly', () => {
    const day1PlanHtml = renderDetails(0, 'plan');
    expect(day1PlanHtml).toContain('Departure Time');
    expect(day1PlanHtml).toContain('Arrival Time');
    expect(day1PlanHtml).toContain('Pending schedule verification');
    expect(day1PlanHtml).toContain('Pending arrival timetable');

    const day1MapHtml = renderDetails(0, 'map');
    expect(day1MapHtml).toContain('Departure Time:');
    expect(day1MapHtml).toContain('Arrival Time:');
  });

  it('8. Day Details Field 8: Travel cost estimation and reliable source attribution', () => {
    const day1Html = renderDetails(0, 'plan');
    expect(day1Html).toContain('Est. Travel Fare');
    expect(day1Html).toContain('₹360');
    expect(day1Html).toContain('Estimated');
    expect(day1Html).toContain('Fare Source:');
    expect(day1Html).toContain('IRCTC Sleeper Class standard fare estimate');
  });

  it('9. Day Details Field 10: Overnight accommodation details and unconfirmed booking status', () => {
    // Day 1: Overnight train transit
    const day1MapHtml = renderDetails(0, 'map');
    expect(day1MapHtml).toContain('Planned Overnight Destination &amp; Stay');
    expect(day1MapHtml).toContain('Overnight Train Transit');
    expect(day1MapHtml).toContain('To be booked / arranged on arrival');
    expect(day1MapHtml).toContain('No confirmed accommodation bookings created in this step.');

    // Day 2: Shirdi Sansthan Dharamshala
    const day2MapHtml = renderDetails(1, 'map');
    expect(day2MapHtml).toContain('Shri Sai Baba Sansthan Trust Dharamshala');
    expect(day2MapHtml).toContain('To be booked / arranged on arrival');
  });

  it('10. Day Details Field 11: Planned satvik meals note and empty expenses state', () => {
    const day1PlanHtml = renderDetails(0, 'plan');
    expect(day1PlanHtml).toContain('Planned Meals:');
    expect(day1PlanHtml).toContain('Satvik food / Temple Prasadalaya');

    const day1ExpHtml = renderDetails(0, 'expenses');
    expect(day1ExpHtml).toContain('Total Spent on Day 1');
    expect(day1ExpHtml).toContain('₹0');
    expect(day1ExpHtml).toContain('No expenses recorded for this day');
  });

  it('11. Day Details Field 12: Daily preparation and visit checklist with interactive items', () => {
    const day1ChecklistHtml = renderDetails(0, 'checklist');
    expect(day1ChecklistHtml).toContain('Day 1 Checklist');
    expect(day1ChecklistHtml).toContain('Verify train / transit schedule and connection');
    expect(day1ChecklistHtml).toContain('Carry original ID proof');
  });

  it('12. Day Details Field 13: Notes, source references and last-updated information', () => {
    const day1Html = renderDetails(0, 'plan');
    expect(day1Html).toContain('Planning Note:');
    expect(day1Html).toContain('Fare Source:');
    expect(day1Html).toContain('Last Updated:');
    expect(day1Html).toContain('Provisional Draft');
  });

  it('13. Temple Knowledge Lookup: Confirms verified coverage for all 11 candidate pilgrimage destinations', () => {
    const allCandidates = [
      'Shirdi',
      'Grishneshwar',
      'Ellora Caves',
      'Trimbakeshwar',
      'Bhimashankar',
      'Mahakaleshwar',
      'Omkareshwar',
      'Mamleshwar',
      'Nageshwar',
      'Dwarkadhish',
      'Somnath',
    ];

    for (const cand of allCandidates) {
      const info = getVerifiedTempleInfo(cand);
      expect(info).not.toBeNull();
      expect(info?.darshanTimings).toBeTruthy();
      expect(info?.estimatedWaitTime).toBeTruthy();
      expect(info?.dressCodeRules).toBeTruthy();
      expect(info?.sourceStatus).toBe('Verified Official Information');
    }
  });
});
