import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChecklistsView } from '@/components/views/ChecklistsView';
import { INITIAL_TRIP, INITIAL_DAYS, INITIAL_CHECKLIST } from '@/lib/seed-data';

describe('ChecklistsView Comprehensive Render Tests', () => {
  it('renders Screen 1: Overview with dynamic progress summary, 5 group cards, and upcoming tasks', () => {
    const html = renderToStaticMarkup(
      React.createElement(ChecklistsView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        checklists: INITIAL_CHECKLIST,
        initialScreen: 'overview',
      })
    );

    // Header & Titles
    expect(html).toContain('Checklists');
    expect(html).toContain('Stay organized for a worry-free journey');

    // Dynamic Progress
    expect(html).toContain('Overall Progress');
    expect(html).toContain('0%');
    expect(html).toContain('0 of 36 tasks completed');

    // 5 Group Mini Cards
    expect(html).toContain('Before Departure');
    expect(html).toContain('0 / 7');
    expect(html).toContain('Documents');
    expect(html).toContain('0 / 6');
    expect(html).toContain('Packing');
    expect(html).toContain('0 / 10');
    expect(html).toContain('Travel Safety');
    expect(html).toContain('0 / 6');
    expect(html).toContain('Daily Tasks');
    expect(html).toContain('0 / 7');

    // Upcoming Tasks
    expect(html).toContain('Upcoming Tasks');
    expect(html).toContain('View All (36 pending)');
    expect(html).toContain('Confirm the final day-by-day itinerary');
    expect(html).toContain('Add New Checklist Task');
  });

  it('renders Screen 2: All Checklists with search, 5 group filter pills, status pills, and task cards', () => {
    const html = renderToStaticMarkup(
      React.createElement(ChecklistsView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        checklists: INITIAL_CHECKLIST,
        initialScreen: 'all',
      })
    );

    expect(html).toContain('All Checklists');
    expect(html).toContain('36 tasks • 0 completed');
    expect(html).toContain('Search checklists or tasks...');

    // Group Filter Pills
    expect(html).toContain('All (36)');
    expect(html).toContain('Before departure (7)');
    expect(html).toContain('Documents and bookings (6)');
    expect(html).toContain('Packing essentials (10)');
    expect(html).toContain('Travel safety (6)');
    expect(html).toContain('Daily checklist (7)');

    // Status Filter Pills
    expect(html).toContain('all (36)');
    expect(html).toContain('pending (36)');
    expect(html).toContain('completed (0)');

    // Real Task Titles
    expect(html).toContain('Government-issued identity document');
    expect(html).toContain('Phone and charger');
    expect(html).toContain('Share the itinerary with a trusted contact');
    expect(html).toContain("Check today&#x27;s route and transport status");
  });

  it('renders Screen 3: Packing Checklist with dynamic calculation and packing items', () => {
    const html = renderToStaticMarkup(
      React.createElement(ChecklistsView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        checklists: INITIAL_CHECKLIST,
        initialScreen: 'packing',
      })
    );

    expect(html).toContain('Packing Essentials');
    expect(html).toContain('0 / 10 completed');
    expect(html).toContain('Packing Progress');

    // Packing Items
    expect(html).toContain('Phone and charger');
    expect(html).toContain('Power bank');
    expect(html).toContain('Earphones');
    expect(html).toContain('Wallet, cash, and payment cards');
    expect(html).toContain('Comfortable walking footwear');
    expect(html).toContain('Appropriate clothing');
    expect(html).toContain('Toiletries and personal hygiene items');
    expect(html).toContain('Reusable water bottle');
    expect(html).toContain('Small day bag');
    expect(html).toContain('Regular personal essentials');
  });

  it('renders Screen 4: Add Task form with Group and Category dropdowns', () => {
    const html = renderToStaticMarkup(
      React.createElement(ChecklistsView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        checklists: INITIAL_CHECKLIST,
        initialScreen: 'add_task',
      })
    );

    expect(html).toContain('Add Task');
    expect(html).toContain('Checklist Group *');
    expect(html).toContain('Before departure');
    expect(html).toContain('Category *');
    expect(html).toContain('Task Title *');
    expect(html).toContain('Description / Notes');
    expect(html).toContain('Priority');
    expect(html).toContain('Due Date');
    expect(html).toContain('Related Itinerary Day');
    expect(html).toContain('Save Task');
  });

  it('renders Screen 5: Edit Task form prefilled with task data', () => {
    const html = renderToStaticMarkup(
      React.createElement(ChecklistsView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        checklists: INITIAL_CHECKLIST,
        initialScreen: 'edit_task',
      })
    );

    expect(html).toContain('Edit Task');
    expect(html).toContain('Checklist Group *');
    expect(html).toContain('Task Title *');
    expect(html).toContain('Mark as Completed');
    expect(html).toContain('Update Task');
    expect(html).toContain('Delete');
  });

  it('renders Screen 6: Documents & Bookings with dynamic verification progress', () => {
    const html = renderToStaticMarkup(
      React.createElement(ChecklistsView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        checklists: INITIAL_CHECKLIST,
        initialScreen: 'documents',
      })
    );

    expect(html).toContain('Documents &amp; Bookings');
    expect(html).toContain('0 / 6 completed');
    expect(html).toContain('Documents Verified');
    expect(html).toContain('Government-issued identity document');
    expect(html).toContain('Train tickets and PNR details, if booked');
    expect(html).toContain('Bus tickets, if booked');
    expect(html).toContain('Accommodation confirmations, if booked');
    expect(html).toContain('Emergency contact information');
    expect(html).toContain('Copies of essential documents');
  });

  it('renders Screen 7: Before Departure with 7 pre-trip preparation items', () => {
    const html = renderToStaticMarkup(
      React.createElement(ChecklistsView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        checklists: INITIAL_CHECKLIST,
        initialScreen: 'preparation',
      })
    );

    expect(html).toContain('Before Departure');
    expect(html).toContain('0 / 7 completed');
    expect(html).toContain('Preparation Completed');
    expect(html).toContain('Confirm the final day-by-day itinerary');
    expect(html).toContain('Verify train and bus connections');
    expect(html).toContain('Check temple access, timings, and travel restrictions');
    expect(html).toContain('Review the trip budget');
    expect(html).toContain('Identify suitable budget accommodation or dharamshalas');
    expect(html).toContain('Check weather forecasts closer to departure');
    expect(html).toContain('Confirm the return journey toward Khammam');
  });

  it('renders Screen 8: Travel Safety with 6 safety items', () => {
    const html = renderToStaticMarkup(
      React.createElement(ChecklistsView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        checklists: INITIAL_CHECKLIST,
        initialScreen: 'health',
      })
    );

    expect(html).toContain('Travel Safety');
    expect(html).toContain('0 / 6 completed');
    expect(html).toContain('Safety Preparedness');
    expect(html).toContain('Share the itinerary with a trusted contact');
    expect(html).toContain('Keep important documents accessible');
    expect(html).toContain('Keep emergency contacts available offline');
    expect(html).toContain('Check transport updates before departure');
    expect(html).toContain('Keep some emergency funds separate');
    expect(html).toContain('Confirm the next connection before travelling onward');
  });

  it('renders Screen 9: Daily Checklist with tasks linked to itinerary days', () => {
    const html = renderToStaticMarkup(
      React.createElement(ChecklistsView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        checklists: INITIAL_CHECKLIST,
        initialScreen: 'electronics',
      })
    );

    expect(html).toContain('Daily Checklist');
    expect(html).toContain('0 / 7 completed');
    expect(html).toContain('Daily Tasks Completion');
    expect(html).toContain("Check today&#x27;s route and transport status");
    expect(html).toContain('Confirm the destination and onward connection');
    expect(html).toContain('Check temple access information');
    expect(html).toContain('Carry required documents and essentials');
    expect(html).toContain('Record actual expenses');
    expect(html).toContain('Save useful travel notes');
    expect(html).toContain("Check the next day&#x27;s plan");
    expect(html).toContain('Linked to Day 1');
  });

  it('renders Screen 12: Checklist Settings with 5 established groups description', () => {
    const html = renderToStaticMarkup(
      React.createElement(ChecklistsView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        checklists: INITIAL_CHECKLIST,
        initialScreen: 'settings',
      })
    );

    expect(html).toContain('Checklist Settings');
    expect(html).toContain('5 Established Checklist Groups');
    expect(html).toContain('Before departure');
    expect(html).toContain('Documents and bookings');
    expect(html).toContain('Packing essentials');
    expect(html).toContain('Travel safety');
    expect(html).toContain('Daily checklist');
    expect(html).toContain('Show Completed Tasks');
    expect(html).toContain('Group by Category');
  });

  it('renders a useful empty state when no checklist items exist', () => {
    const html = renderToStaticMarkup(
      React.createElement(ChecklistsView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        checklists: [],
        initialScreen: 'all',
      })
    );

    expect(html).toContain('No Tasks Found');
    expect(html).toContain('Add Checklist Task');
  });
});
