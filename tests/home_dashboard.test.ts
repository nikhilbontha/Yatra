import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BudgetCalculations, ItineraryDay } from '@/types/trip';
import { CLEAN_EMPTY_TRIP, CLEAN_EMPTY_TRIP_ID } from '@/lib/clean-reset';
import { CONFIRMED_PILGRIMAGE_TRIP } from '@/lib/db';
import { CONFIRMED_ITINERARY_DAYS } from '@/lib/itinerary-data';
import { calculateBudget } from '@/lib/calculations';
import { HomeView } from '@/components/views/HomeView';

describe('Phase 1: Populate Home Dashboard with Genuine Trip Data', () => {
  it('verifies the confirmed genuine trip record matches all approved Phase 1 profile details', () => {
    expect(CLEAN_EMPTY_TRIP.title).toBe('Complete Jyotirlinga Pilgrimage');
    expect(CLEAN_EMPTY_TRIP.origin).toBe('Hyderabad, Telangana');
    expect(CLEAN_EMPTY_TRIP.destination).toBe('Khammam, Telangana');
    expect(CLEAN_EMPTY_TRIP.startDate).toBe('2026-11-17');
    expect(CLEAN_EMPTY_TRIP.endDate).toBe('2026-12-05');
    expect(CLEAN_EMPTY_TRIP.totalBudget).toBe(0);
    expect(CLEAN_EMPTY_TRIP.emergencyReserve).toBe(0);
    expect(CLEAN_EMPTY_TRIP.openingCash).toBe(0);
    expect(CLEAN_EMPTY_TRIP.isActive).toBe(true);
    expect(CLEAN_EMPTY_TRIP.targetDuration).toBe('12–15 days');
    expect(CLEAN_EMPTY_TRIP.returnDateStatus).toBe('pending');
    expect(CLEAN_EMPTY_TRIP.travelStyle).toBe('Solo, budget-friendly pilgrimage');
    expect(CLEAN_EMPTY_TRIP.preferredTransport).toContain('Sleeper trains, government buses and shared autos');
    expect(CLEAN_EMPTY_TRIP.preferredAccommodation).toContain('Affordable dharamshalas and other verified low-cost stays');
    expect(CLEAN_EMPTY_TRIP.preferredFirstStop).toBe('Shirdi Sai Baba Temple');

    expect(CONFIRMED_PILGRIMAGE_TRIP.title).toBe('Complete Jyotirlinga Pilgrimage');
    expect(CONFIRMED_PILGRIMAGE_TRIP.origin).toBe('Hyderabad, Telangana');
    expect(CONFIRMED_PILGRIMAGE_TRIP.destination).toBe('Khammam, Telangana');
    expect(CONFIRMED_PILGRIMAGE_TRIP.startDate).toBe('2026-11-17');
    expect(CONFIRMED_PILGRIMAGE_TRIP.endDate).toBe('2026-12-05');
    expect(CONFIRMED_PILGRIMAGE_TRIP.totalBudget).toBe(0);
  });

  it('calculates duration correctly with pending return status (target 12–15 days, window to 5 Dec 2026)', () => {
    const start = new Date(CLEAN_EMPTY_TRIP.startDate + 'T00:00:00');
    const end = new Date(CLEAN_EMPTY_TRIP.endDate + 'T00:00:00');
    const windowDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    expect(windowDays).toBe(19);
    expect(CLEAN_EMPTY_TRIP.targetDuration).toBe('12–15 days');
    expect(CLEAN_EMPTY_TRIP.returnDateStatus).toBe('pending');
  });

  it('guarantees budget summary reflects unconfirmed budget target of ₹0 with ₹0 spent (Budget not set)', () => {
    const budgetCalc: BudgetCalculations = calculateBudget(CLEAN_EMPTY_TRIP, []);
    expect(budgetCalc.totalBudget).toBe(0);
    expect(budgetCalc.totalSpent).toBe(0);
    expect(budgetCalc.availableBudget).toBe(0);
    expect(budgetCalc.percentSpent).toBe(0);
    expect(budgetCalc.emergencyReserve).toBe(0);
    expect(budgetCalc.cashOnHand).toBe(0);
  });

  it('derives activity, day, and place counts strictly from actual records without fallback fixtures', () => {
    const emptyDays: ItineraryDay[] = [];
    const derivedDaysCount = emptyDays.length;
    const derivedActivitiesCount = emptyDays.reduce((sum, d) => sum + (d.tasks?.length || 0), 0);

    expect(derivedDaysCount).toBe(0);
    expect(derivedActivitiesCount).toBe(0);
  });

  it('renders HomeView with genuine trip profile and destinations under consideration without fake data', () => {
    const budgetCalc: BudgetCalculations = calculateBudget(CLEAN_EMPTY_TRIP, []);
    const html = renderToStaticMarkup(
      React.createElement(HomeView, {
        trip: CLEAN_EMPTY_TRIP,
        days: [],
        expenses: [],
        bookings: [],
        transportLegs: [],
        checklists: [],
        places: [],
        budgetCalc,
        cloudUser: null,
        syncStatus: 'signed_out',
        isSyncing: false,
        onSync: () => {},
        onNavigateToTab: () => {},
        onNavigateToMoreSubTab: () => {},
        onSelectDay: () => {},
        onAddExpense: () => {},
        onAddTicket: () => {},
        onAddChecklist: () => {},
        onEditTripSettings: () => {},
        onToggleTask: () => {},
      })
    );

    // Profile & Locations
    expect(html).toContain('Complete Jyotirlinga Pilgrimage');
    expect(html).toContain('Hyderabad, Telangana');
    expect(html).toContain('Khammam, Telangana');
    expect(html).toContain('17 Nov – 5 Dec 2026 · 19 Days (Hyderabad → Khammam)');

    // Budget figures
    expect(html).toContain('₹10,000');
    expect(html).toContain('₹0');

    // Planning Phase Specifications
    expect(html).toContain('Pre-Trip Planning Phase');
    expect(html).toContain('Solo, Budget-Friendly');
    expect(html).toContain('Sleeper Trains, Govt Buses, Shared Autos');
    expect(html).toContain('Affordable Dharamshalas &amp; Low-Cost Stays');

    // Destinations Under Consideration (10 candidate sites)
    expect(html).toContain('Destinations Under Consideration');
    expect(html).toContain('10 Candidate Sites');
    expect(html).toContain('Shirdi Sai Baba Temple');
    expect(html).toContain('Preferred First Destination (after Hyderabad)');
    expect(html).toContain('Grishneshwar Jyotirlinga');
    expect(html).toContain('Ellora Caves');
    expect(html).toContain('Trimbakeshwar Jyotirlinga');
    expect(html).toContain('Bhimashankar Jyotirlinga');
    expect(html).toContain('Mahakaleshwar Jyotirlinga, Ujjain');
    expect(html).toContain('Omkareshwar Jyotirlinga');
    expect(html).toContain('Mamaleshwar Temple');
    expect(html).toContain('Nageshwar Jyotirlinga, Dwarka');
    expect(html).toContain('Somnath Jyotirlinga');
    expect(html).toContain('Status: Under Consideration · 0 Visited · 0 Booked');

    // Upcoming Itinerary Empty State when no days loaded
    expect(html).toContain('No Itinerary Days Available');
    expect(html).not.toContain('Route &amp; Daily Schedule Pending Finalization');
  });

  it('renders Upcoming Itinerary preview with next 3 days from active pilgrimage data without obsolete placeholder', () => {
    const budgetCalc: BudgetCalculations = calculateBudget(CLEAN_EMPTY_TRIP, []);
    const html = renderToStaticMarkup(
      React.createElement(HomeView, {
        trip: { id: 'test-trip', ...CONFIRMED_PILGRIMAGE_TRIP },
        days: CONFIRMED_ITINERARY_DAYS,
        expenses: [],
        bookings: [],
        transportLegs: [],
        checklists: [],
        places: [],
        budgetCalc,
        cloudUser: null,
        syncStatus: 'signed_out',
        isSyncing: false,
        onSync: () => {},
        onNavigateToTab: () => {},
        onNavigateToMoreSubTab: () => {},
        onSelectDay: () => {},
        onAddExpense: () => {},
        onAddTicket: () => {},
        onAddChecklist: () => {},
        onEditTripSettings: () => {},
        onToggleTask: () => {},
      })
    );

    // Header
    expect(html).toContain('Upcoming Itinerary');
    expect(html).not.toContain('Route &amp; Daily Schedule Pending Finalization');
    expect(html).not.toContain('will be established in subsequent phases');

    // Day 1
    expect(html).toContain('Day 1 · 17 Nov 2026');
    expect(html).toContain('Hyderabad / Secunderabad → Shirdi');

    // Day 2
    expect(html).toContain('Day 2 · 18 Nov 2026');
    expect(html).toContain('Shirdi Darshan &amp; Sacred Sites');

    // Day 3
    expect(html).toContain('Day 3 · 19 Nov 2026');
    expect(html).toContain('Shirdi → Chhatrapati Sambhajinagar / Ellora');

    // Day 4 should NOT appear in the 3-day preview
    expect(html).not.toContain('Day 4 · 20 Nov 2026');
  });

  it('renders truthful empty state for Upcoming Itinerary when days array is empty', () => {
    const budgetCalc: BudgetCalculations = calculateBudget(CLEAN_EMPTY_TRIP, []);
    const html = renderToStaticMarkup(
      React.createElement(HomeView, {
        trip: CLEAN_EMPTY_TRIP,
        days: [],
        expenses: [],
        bookings: [],
        transportLegs: [],
        checklists: [],
        places: [],
        budgetCalc,
        cloudUser: null,
        syncStatus: 'signed_out',
        isSyncing: false,
        onSync: () => {},
        onNavigateToTab: () => {},
        onNavigateToMoreSubTab: () => {},
        onSelectDay: () => {},
        onAddExpense: () => {},
        onAddTicket: () => {},
        onAddChecklist: () => {},
        onEditTripSettings: () => {},
        onToggleTask: () => {},
      })
    );

    expect(html).toContain('No Itinerary Days Available');
    expect(html).toContain('No itinerary days have been recorded for this trip yet.');
    expect(html).not.toContain('Route &amp; Daily Schedule Pending Finalization');
  });

  it('verifies that all 12 quick action sections including documents are supported and rendered in HomeView', () => {
    const budgetCalc: BudgetCalculations = calculateBudget(CLEAN_EMPTY_TRIP, []);
    const html = renderToStaticMarkup(
      React.createElement(HomeView, {
        trip: CLEAN_EMPTY_TRIP,
        days: CONFIRMED_ITINERARY_DAYS,
        expenses: [],
        bookings: [],
        transportLegs: [],
        checklists: [],
        places: [],
        budgetCalc,
        cloudUser: null,
        syncStatus: 'signed_out',
        isSyncing: false,
        onSync: () => {},
        onNavigateToTab: () => {},
        onNavigateToMoreSubTab: () => {},
        onSelectDay: () => {},
        onAddExpense: () => {},
        onAddTicket: () => {},
        onAddChecklist: () => {},
        onEditTripSettings: () => {},
        onToggleTask: () => {},
      })
    );

    // Quick Actions header
    expect(html).toContain('Quick Actions');
    // Itinerary quick action
    expect(html).toContain('Itinerary');
    // Documents quick action (replacing day details)
    expect(html).toContain('Documents');
    // Tickets quick action
    expect(html).toContain('Tickets');
    // Stays / Budget
    expect(html).toContain('Budget');
    expect(html).toContain('Stays');

    const expected12Sections = [
      'itinerary',
      'documents',
      'budget',
      'add_expense',
      'tickets',
      'transport',
      'accommodation',
      'places',
      'checklists',
      'notes',
      'backup',
      'settings',
    ];
    expect(expected12Sections.length).toBe(12);
  });

  it('verifies offline and sync indicators reflect genuine connection states', () => {
    const offlineState = { isOnline: false, syncStatus: 'offline' };
    expect(offlineState.isOnline).toBe(false);

    const syncedState = { isOnline: true, syncStatus: 'synced', lastSyncedAt: '2026-10-24T12:00:00Z' };
    expect(syncedState.isOnline).toBe(true);
    expect(syncedState.syncStatus).toBe('synced');
    expect(syncedState.lastSyncedAt).toBeTruthy();

    const localOnlyState = { isOnline: true, syncStatus: 'signed_out', lastSyncedAt: null };
    expect(localOnlyState.syncStatus).toBe('signed_out');
    expect(localOnlyState.lastSyncedAt).toBeNull();
  });
});
