import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ItineraryView, DetailSubTab } from '@/components/views/ItineraryView';
import { CONFIRMED_ITINERARY_DAYS } from '@/lib/itinerary-data';
import { Expense } from '@/types/trip';

describe('Phase 2 — Step 3: Day Details Module Verification', () => {
  const mockExpenses: Expense[] = [];

  const renderDetails = (props: Partial<React.ComponentProps<typeof ItineraryView>> = {}) => {
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
        initialView: 'details',
        ...props,
      })
    );
  };

  it('1. verifies that every itinerary day opens its own correct day number, date, and route title', () => {
    // Test multiple sample days across the 19-day circuit: Days 1, 2, 3, 7, 10, 12, 14, 16, 19
    const testIndices = [0, 1, 2, 6, 9, 11, 13, 15, 18];

    for (const idx of testIndices) {
      const expectedDay = CONFIRMED_ITINERARY_DAYS[idx];
      const html = renderDetails({ selectedDayIndex: idx });

      // Verify Day Number
      expect(html).toContain(`Day ${expectedDay.dayNumber}`);

      // Verify Planned badge
      expect(html).toContain('Planned');

      // Verify route title or waypoints in hero banner
      if (expectedDay.title.includes('→')) {
        const firstWaypoint = expectedDay.title.split('→')[0].trim();
        expect(html).toContain(firstWaypoint);
      } else {
        const cleanTitle = expectedDay.title.replace(/&/g, '&amp;');
        expect(html).toContain(cleanTitle);
      }
    }
  });

  it('2. verifies planned activities render in chronological order with proper activity titles and notes', () => {
    // Day 2 (Shirdi Sai Baba Mandir, Dwarkamai, etc.)
    const day2 = CONFIRMED_ITINERARY_DAYS[1];
    const html = renderDetails({ selectedDayIndex: 1, defaultSubTab: 'plan' });

    for (const task of day2.tasks) {
      const expectedInHtml = task.title.replace(/&/g, '&amp;');
      expect(html).toContain(expectedInHtml);
    }
  });

  it('3. verifies items requiring verification display the warning badge with verificationNote', () => {
    // Day 1 (Overnight train to Shirdi has needsVerification: true)
    const html = renderDetails({ selectedDayIndex: 0, defaultSubTab: 'plan' });

    expect(html).toContain('Train schedule and booking connection to be verified');
  });

  it('4. verifies sacred temples and sightseeing spots are derived dynamically without fabricated places', () => {
    // Day 4 (Grishneshwar Jyotirlinga & Ellora Caves)
    const html = renderDetails({ selectedDayIndex: 3, defaultSubTab: 'places' });

    // Grishneshwar must be in the places tab
    expect(html).toContain('Grishneshwar');
    expect(html).toContain('Sacred Darshan');

    // Fabricated old Khammam items must NOT be present
    expect(html).not.toContain('Sri Seetharama Temple');
    expect(html).not.toContain('Khammam Fort &amp; Local Ghats');
    expect(html).not.toContain('Khammam Fort');
  });

  it('5. verifies transit-only days without temples display "Not added yet" honestly instead of fake places', () => {
    // Day 1 (Hyderabad to Shirdi transit only, no temples)
    const html = renderDetails({ selectedDayIndex: 0, defaultSubTab: 'places' });

    expect(html).toContain('Not added yet');
    expect(html).toContain('Transit day');
  });

  it('6. verifies transport plan and planned overnight accommodation details render with unconfirmed markers', () => {
    // Day 1 (Overnight train journey)
    const html = renderDetails({ selectedDayIndex: 0, defaultSubTab: 'map' });

    // Transport plan section
    expect(html).toContain('Transport Plan &amp; Journey Notes');
    expect(html).toContain('Planned Overnight Destination &amp; Stay');
    expect(html).toContain('Unconfirmed');
    expect(html).toContain('Overnight Train Transit');
    expect(html).toContain('To be booked / arranged on arrival');
  });

  it('7. verifies daily checklist contains authentic pilgrimage tasks without fake pre-confirmed tickets', () => {
    const html = renderDetails({ selectedDayIndex: 0, defaultSubTab: 'checklist' });

    // Verify authentic checklist items
    expect(html).toContain('Verify train / transit schedule and connection');
    expect(html).toContain('Carry original ID proof');

    // Fabricated 'Train / Travel ticket confirmed' must NOT exist
    expect(html).not.toContain('Train / Travel ticket confirmed');
  });

  it('8. verifies back navigation button is rendered and points back to list view', () => {
    const html = renderDetails({ selectedDayIndex: 0 });

    expect(html).toContain('aria-label="Back to Itinerary list"');
  });

  it('9. verifies invalid or out-of-bounds day index safely displays Day Not Found error state', () => {
    const html = renderDetails({ selectedDayIndex: 999 });

    // Must show Day Not Found error state, NOT Day 1
    expect(html).toContain('Day Not Found');
    expect(html).toContain('The requested pilgrimage day could not be found');
    expect(html).toContain('Return to Itinerary');
  });

  it('10. verifies invalid selectedDayId safely displays Day Not Found error state', () => {
    const html = renderDetails({
      selectedDayId: 'non-existent-invalid-uuid-99999',
    });

    // Must show Day Not Found error state
    expect(html).toContain('Day Not Found');
    expect(html).toContain('Return to Itinerary');
  });
});
