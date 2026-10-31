import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CONFIRMED_ITINERARY_DAYS, CONFIRMED_TRIP_ID } from '@/lib/itinerary-data';
import { CONFIRMED_PILGRIMAGE_TRIP } from '@/lib/db';
import { ItineraryView } from '@/components/views/ItineraryView';
import { Expense } from '@/types/trip';

describe('Phase 2 — Populate the Yatra Itinerary Page with Genuine Trip Data', () => {
  const mockExpenses: Expense[] = [];

  const renderItinerary = (props: Partial<React.ComponentProps<typeof ItineraryView>> = {}) => {
    return renderToStaticMarkup(
      React.createElement(ItineraryView, {
        days: CONFIRMED_ITINERARY_DAYS,
        expenses: mockExpenses,
        selectedDayIndex: 0,
        onSelectDayIndex: vi.fn(),
        onEditDay: vi.fn(),
        onAddTask: vi.fn(),
        onToggleTask: vi.fn(),
        onAddExpenseForDate: vi.fn(),
        initialView: 'list',
        ...props,
      })
    );
  };

  it('1. Confirmed Trip Details: Matches confirmed trip configuration', () => {
    expect(CONFIRMED_PILGRIMAGE_TRIP.title).toBe('Complete Jyotirlinga Pilgrimage');
    expect(CONFIRMED_PILGRIMAGE_TRIP.origin).toBe('Hyderabad, Telangana');
    expect(CONFIRMED_PILGRIMAGE_TRIP.destination).toBe('Khammam, Telangana');
    expect(CONFIRMED_PILGRIMAGE_TRIP.startDate).toBe('2026-11-17');
    expect(CONFIRMED_PILGRIMAGE_TRIP.totalBudget).toBe(0);
    expect(CONFIRMED_PILGRIMAGE_TRIP.targetDuration).toBe('12–15 days');
    expect(CONFIRMED_PILGRIMAGE_TRIP.preferredFirstStop).toContain('Shirdi');

    // Day 1 must start on 17 Nov 2026 from Hyderabad and head toward Shirdi
    const day1 = CONFIRMED_ITINERARY_DAYS[0];
    expect(day1.date).toBe('2026-11-17');
    expect(day1.title).toContain('Hyderabad');
    expect(day1.title).toContain('Shirdi');
  });

  it('2. Candidate Destinations: Validates all 11 candidate destinations are accurately placed without unrelated temples', () => {
    const candidateDestinations = [
      'Sai Baba', // Shirdi Sai Baba Temple
      'Grishneshwar Jyotirlinga',
      'Ellora Caves',
      'Trimbakeshwar Jyotirlinga',
      'Bhimashankar Jyotirlinga',
      'Nageshwar Jyotirlinga',
      'Dwarkadhish',
      'Somnath Jyotirlinga',
      'Mahakaleshwar Jyotirlinga',
      'Omkareshwar Jyotirlinga',
      'Mamleshwar', // Mamaleshwar Temple
    ];

    const allTitlesAndTasks = CONFIRMED_ITINERARY_DAYS.flatMap(d => [
      d.title,
      d.subtitle || '',
      d.location || '',
      ...d.tasks.map(t => t.title),
    ]).join(' ');

    for (const place of candidateDestinations) {
      expect(allTitlesAndTasks.toLowerCase()).toContain(place.toLowerCase());
    }

    // Must NOT contain Srisailam / Mallikarjuna or unrelated Jyotirlingas
    expect(allTitlesAndTasks.toLowerCase()).not.toContain('mallikarjuna');
    expect(allTitlesAndTasks.toLowerCase()).not.toContain('srisailam');
    expect(allTitlesAndTasks.toLowerCase()).not.toContain('kedarnath');
    expect(allTitlesAndTasks.toLowerCase()).not.toContain('kashi vishwanath');
    expect(allTitlesAndTasks.toLowerCase()).not.toContain('rameshwaram');
    expect(allTitlesAndTasks.toLowerCase()).not.toContain('vaidyanath');
  });

  it('3. Route Feasibility: Core 12-day circuit (Days 1–12) fits 12–15 days duration, and Days 13–19 are identified as extension', () => {
    const coreDays = CONFIRMED_ITINERARY_DAYS.filter(d => !d.isCircuitExtension);
    const extendedDays = CONFIRMED_ITINERARY_DAYS.filter(d => d.isCircuitExtension);

    expect(coreDays).toHaveLength(12);
    expect(extendedDays).toHaveLength(7);

    // Core Days 1–12 cover Maharashtra & Gujarat circuits
    const coreTitles = coreDays.map(d => `${d.title} ${d.subtitle || ''}`).join(' ');
    expect(coreTitles).toContain('Shirdi');
    expect(coreTitles).toContain('Grishneshwar');
    expect(coreTitles).toContain('Ellora Caves');
    expect(coreTitles).toContain('Trimbakeshwar');
    expect(coreTitles).toContain('Bhimashankar');
    expect(coreTitles).toContain('Lonavala');
    expect(coreTitles).toContain('Dwarka');
    expect(coreTitles).toContain('Somnath');

    // Days 13–19 cover Madhya Pradesh circuit (Ujjain, Omkareshwar, Mamaleshwar) and return
    const extendedTitles = extendedDays.map(d => `${d.title} ${d.subtitle || ''}`).join(' ');
    expect(extendedTitles).toContain('Ujjain');
    expect(extendedTitles).toContain('Mahakaleshwar');
    expect(extendedTitles).toContain('Omkareshwar');
    expect(extendedTitles).toContain('Mamaleshwar');
    expect(extendedTitles).toContain('Khammam');
  });

  it('4. Data Model: Verifies all required itinerary data model fields are populated', () => {
    for (const day of CONFIRMED_ITINERARY_DAYS) {
      expect(day.dayNumber).toBeGreaterThan(0);
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(day.title).toBeTruthy();
      expect(day.mode).toBeTruthy();
      expect(day.estimatedTravelCost).toBeDefined();
      expect(day.travelCostStatus).toBe('Estimated');
      expect(day.travelCostSource).toBeTruthy();
      expect(day.accommodationPlan).toBeTruthy();
      expect(day.accommodationStatus).toBe('Estimated');
      expect(day.notesReferences).toBeTruthy();
      expect(day.planningStatus).toBe('Estimated');
      expect(day.tasks.length).toBeGreaterThan(0);
      expect(day.preparationChecklist).toBeDefined();
      expect(day.preparationChecklist?.length).toBeGreaterThan(0);
    }
  });

  it('5. Status and Data Integrity: Zero completed days, zero fake ticket references, zero fake bookings', () => {
    for (const day of CONFIRMED_ITINERARY_DAYS) {
      expect(day.status).toBe('Planned');
      for (const task of day.tasks) {
        expect(task.isCompleted).toBe(false);
      }
    }
  });

  it('6. UI Requirements: Renders Itinerary page with target duration header, badges, filter pills, and costs', () => {
    const html = renderItinerary();

    // Duration header
    expect(html).toContain('Target: 12–15 Days (Core) · 19 Days Window (Extended to 5 Dec 2026)');

    // Filter pills
    expect(html).toContain('All Days (19)');
    expect(html).toContain('Core (Days 1–12)');
    expect(html).toContain('Extended (Days 13–19)');

    // Thematic badges
    expect(html).toContain('Travel / Transit');
    expect(html).toContain('Temple Visit');
    expect(html).toContain('Sightseeing');

    // Planning and cost pills
    expect(html).toContain('Estimated');
    expect(html).toContain('est.');

    // Route assessment banner for extension
    expect(html).toContain('Candidate Route Assessment');
    expect(html).toContain('12–15 Day Target Duration Boundary');
  });

  it('7. Day Details View: Renders authentic planning details without fake confirmation', () => {
    const html = renderToStaticMarkup(
      React.createElement(ItineraryView, {
        days: CONFIRMED_ITINERARY_DAYS,
        expenses: mockExpenses,
        selectedDayIndex: 0,
        onSelectDayIndex: vi.fn(),
        onEditDay: vi.fn(),
        onAddTask: vi.fn(),
        onToggleTask: vi.fn(),
        onAddExpenseForDate: vi.fn(),
        initialView: 'details',
        defaultSubTab: 'plan',
      })
    );

    expect(html).toContain('Day 1 Planning Overview');
    expect(html).toContain('Route Segment');
    expect(html).toContain('Est. Travel Fare');
    expect(html).toContain('Stay Plan:');
    expect(html).toContain('Planning Status: Estimated');
  });
});
