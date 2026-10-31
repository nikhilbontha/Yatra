import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NotesView } from '@/components/views/NotesView';
import { INITIAL_TRIP, INITIAL_NOTES } from '@/lib/seed-data';
import { CONFIRMED_ITINERARY_DAYS } from '@/lib/itinerary-data';
import { TripNote } from '@/types/trip';

describe('NotesView Static Markup Rendering', () => {
  it('renders Screen 1 (Overview) with recent notes from actual saved notes', () => {
    const html = renderToStaticMarkup(
      React.createElement(NotesView, {
        trip: INITIAL_TRIP,
        days: CONFIRMED_ITINERARY_DAYS,
        notes: INITIAL_NOTES,
        initialScreen: 'overview',
      })
    );

    expect(html).toContain('Notes &amp; Journal');
    expect(html).toContain('Daily Notes');
    expect(html).toContain('Experiences');
    expect(html).toContain('Reminders');
    expect(html).toContain('Recent Notes');
    expect(html).toContain('Add New Note');
    // Ensure genuine saved items appear in Recent Notes
    expect(html).toContain('Emergency Contacts &amp; Helplines');
    expect(html).toContain('Pilgrim Darshan Tips &amp; Codes');
  });

  it('renders Screen 1 (Overview) empty state when notes array is empty', () => {
    const html = renderToStaticMarkup(
      React.createElement(NotesView, {
        trip: INITIAL_TRIP,
        days: CONFIRMED_ITINERARY_DAYS,
        notes: [],
        initialScreen: 'overview',
      })
    );

    expect(html).toContain('No notes written yet');
    expect(html).toContain('Add New Note');
  });

  it('renders Screen 2 (All Notes) with search bar and category filters', () => {
    const html = renderToStaticMarkup(
      React.createElement(NotesView, {
        trip: INITIAL_TRIP,
        days: CONFIRMED_ITINERARY_DAYS,
        notes: INITIAL_NOTES,
        initialScreen: 'all',
      })
    );

    expect(html).toContain('All Notes');
    expect(html).toContain('Search notes');
    expect(html).toContain('Emergency');
    expect(html).toContain('Travel Tip');
  });

  it('renders Screen 3 (Add Note) with form inputs and Day selector', () => {
    const html = renderToStaticMarkup(
      React.createElement(NotesView, {
        trip: INITIAL_TRIP,
        days: CONFIRMED_ITINERARY_DAYS,
        notes: INITIAL_NOTES,
        initialScreen: 'add_note',
      })
    );

    expect(html).toContain('Add Note');
    expect(html).toContain('Title *');
    expect(html).toContain('Category');
    expect(html).toContain('Related Itinerary Day');
    expect(html).toContain('None (General Trip Note)');
    expect(html).toContain('Day 1:');
    expect(html).toContain('Content / Journal Text *');
    expect(html).toContain('Save');
  });

  it('renders Screen 4 (Note Details) with linked itinerary day card and actions', () => {
    const noteWithDay: TripNote = {
      id: 'note-with-day-1',
      tripId: INITIAL_TRIP.id,
      dayId: CONFIRMED_ITINERARY_DAYS[1].id, // Day 2: Shirdi
      title: 'Shirdi Samadhi Mandir Guidelines',
      content: 'Early morning VIP darshan token counter opens at 5:00 AM.',
      category: 'Travel Tip',
      location: 'Shirdi, Maharashtra',
      tags: ['Temple', 'Darshan'],
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
    };

    const html = renderToStaticMarkup(
      React.createElement(NotesView, {
        trip: INITIAL_TRIP,
        days: CONFIRMED_ITINERARY_DAYS,
        notes: [noteWithDay, ...INITIAL_NOTES],
        initialScreen: 'details',
      })
    );

    expect(html).toContain('Shirdi Samadhi Mandir Guidelines');
    expect(html).toContain('Early morning VIP darshan token counter');
    expect(html).toContain('Travel Tip');
    expect(html).toContain('Shirdi, Maharashtra');
    expect(html).toContain('Day 2:');
    expect(html).toContain('View Day');
    expect(html).toContain('Edit Note');
    expect(html).toContain('Share');
  });

  it('renders Screen 6 (Edit Note) prefilled with existing note data', () => {
    const html = renderToStaticMarkup(
      React.createElement(NotesView, {
        trip: INITIAL_TRIP,
        days: CONFIRMED_ITINERARY_DAYS,
        notes: INITIAL_NOTES,
        initialScreen: 'edit_note',
      })
    );

    expect(html).toContain('Edit Note');
    expect(html).toContain('Update Note');
    expect(html).toContain('Delete');
  });

  it('renders Screen 7 (Reminder Details) listing active reminders', () => {
    const html = renderToStaticMarkup(
      React.createElement(NotesView, {
        trip: INITIAL_TRIP,
        days: CONFIRMED_ITINERARY_DAYS,
        notes: INITIAL_NOTES,
        initialScreen: 'reminder',
      })
    );

    expect(html).toContain('Reminder Details');
    expect(html).toContain('Emergency Contacts &amp; Helplines');
  });

  it('renders Screen 8 (Experiences) with empty or populated experience list', () => {
    const html = renderToStaticMarkup(
      React.createElement(NotesView, {
        trip: INITIAL_TRIP,
        days: CONFIRMED_ITINERARY_DAYS,
        notes: INITIAL_NOTES,
        initialScreen: 'experiences',
      })
    );

    expect(html).toContain('Experiences');
  });

  it('renders Screen 9 (Important Notes) displaying flagged emergency notes', () => {
    const html = renderToStaticMarkup(
      React.createElement(NotesView, {
        trip: INITIAL_TRIP,
        days: CONFIRMED_ITINERARY_DAYS,
        notes: INITIAL_NOTES,
        initialScreen: 'important',
      })
    );

    expect(html).toContain('Important Notes');
    expect(html).toContain('Emergency Contacts &amp; Helplines');
  });

  it('renders Screen 10 (Notes Map) empty state and geotagged notes', () => {
    const html = renderToStaticMarkup(
      React.createElement(NotesView, {
        trip: INITIAL_TRIP,
        days: CONFIRMED_ITINERARY_DAYS,
        notes: INITIAL_NOTES,
        initialScreen: 'map',
      })
    );

    expect(html).toContain('Notes Map');
  });

  it('renders Screen 11 (Journal Calendar) with month navigation and date grid', () => {
    const html = renderToStaticMarkup(
      React.createElement(NotesView, {
        trip: INITIAL_TRIP,
        days: CONFIRMED_ITINERARY_DAYS,
        notes: INITIAL_NOTES,
        initialScreen: 'calendar',
      })
    );

    expect(html).toContain('Journal Calendar');
    expect(html).toContain('November 2026');
  });

  it('renders Screen 12 (Settings) with preferences and offline backup options', () => {
    const html = renderToStaticMarkup(
      React.createElement(NotesView, {
        trip: INITIAL_TRIP,
        days: CONFIRMED_ITINERARY_DAYS,
        notes: INITIAL_NOTES,
        initialScreen: 'settings',
      })
    );

    expect(html).toContain('Notes Settings');
    expect(html).toContain('Display Preferences');
    expect(html).toContain('Data Management');
    expect(html).toContain('Offline Dexie persistence active');
  });
});
