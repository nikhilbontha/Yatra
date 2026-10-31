import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlacesView } from '@/components/views/PlacesView';
import { INITIAL_TRIP, INITIAL_DAYS, INITIAL_PLACES } from '@/lib/seed-data';

describe('PlacesView Comprehensive Render Tests', () => {
  it('renders Screen 1: Places Overview with stat cards, upcoming place, and quick actions', () => {
    const html = renderToStaticMarkup(
      React.createElement(PlacesView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        places: INITIAL_PLACES,
        initialScreen: 'overview',
        onSavePlace: () => Promise.resolve(),
        onDeletePlace: () => Promise.resolve(),
      })
    );

    // Header & Titles
    expect(html).toContain('Places &amp; Temples');
    expect(html).toContain('Explore all destinations and temples');

    // Stat Cards
    expect(html).toContain('Jyotirlingas');
    expect(html).toContain('7');
    expect(html).toContain('Other Temples');
    expect(html).toContain('Sightseeing');
    expect(html).toContain('Total Places');
    expect(html).toContain('32');

    // Upcoming Place Card
    expect(html).toContain('Upcoming Place');
    expect(html).toContain('Shri Sai Baba Samadhi Mandir');
    expect(html).toContain('Shirdi');

    // Quick Actions & Categories
    expect(html).toContain('All Places');
    expect(html).toContain('Nearby');
    expect(html).toContain('Map View');
    expect(html).toContain('7 Jyotirlingas');
    expect(html).toContain('Shirdi &amp; Temples');
  });

  it('renders Screen 2: All Places List with filter pills, categories, and destination names', () => {
    const html = renderToStaticMarkup(
      React.createElement(PlacesView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        places: INITIAL_PLACES,
        initialScreen: 'list',
        onSavePlace: () => Promise.resolve(),
        onDeletePlace: () => Promise.resolve(),
      })
    );

    expect(html).toContain('All Places');
    expect(html).toContain('Search places, temples or cities...');

    // Filter pills
    expect(html).toContain('All');
    expect(html).toContain('Jyotirlinga');
    expect(html).toContain('Temple');
    expect(html).toContain('Sightseeing');
    expect(html).toContain('Optional');
    expect(html).toContain('Needs verification');

    // Main Jyotirlinga names present in markup
    expect(html).toContain('Grishneshwar Jyotirlinga Temple');
    expect(html).toContain('Trimbakeshwar Jyotirlinga Temple');
    expect(html).toContain('Bhimashankar Jyotirlinga Temple');
    expect(html).toContain('Omkareshwar Jyotirlinga Temple');
    expect(html).toContain('Shri Mahakaleshwar Jyotirlinga Temple');
    expect(html).toContain('Nageshwar Jyotirlinga Temple');
    expect(html).toContain('Somnath Jyotirlinga Temple');

    // Sightseeing names present
    expect(html).toContain('Ellora Caves');
    expect(html).toContain('Cave 16 (Kailasa Temple)');
    expect(html).toContain('Mahakal Lok Corridor');
    expect(html).toContain('Dwarkadhish Temple (Jagat Mandir)');
  });

  it('renders Screen 3: Place Details with access notices and status badges', () => {
    const firstPlace = INITIAL_PLACES[0]; // Shri Sai Baba Samadhi Mandir
    const html = renderToStaticMarkup(
      React.createElement(PlacesView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        places: INITIAL_PLACES,
        initialScreen: 'details',
        initialSelectedPlaceId: firstPlace.id,
        onSavePlace: () => Promise.resolve(),
        onDeletePlace: () => Promise.resolve(),
      })
    );

    expect(html).toContain(firstPlace.name);
    expect(html).toContain(firstPlace.city);
    expect(html).toContain('Day 2:');
    expect(html).toContain('Mark as Visited');
    expect(html).toContain('Edit Place');
  });

  it('renders access disclaimer for Trimbakeshwar in details screen', () => {
    const trimbak = INITIAL_PLACES.find(p => p.name === 'Trimbakeshwar Jyotirlinga Temple')!;
    const html = renderToStaticMarkup(
      React.createElement(PlacesView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        places: INITIAL_PLACES,
        initialScreen: 'details',
        initialSelectedPlaceId: trimbak.id,
        onSavePlace: () => Promise.resolve(),
        onDeletePlace: () => Promise.resolve(),
      })
    );

    expect(html).toContain('Trimbakeshwar Jyotirlinga Temple');
    expect(html).toContain('Pilgrim Notice &amp; Access Information');
    expect(html).toContain('Access is not guaranteed');
  });

  it('renders Screen 4: Darshan & Timings Guidance without fabricated hours', () => {
    const firstPlace = INITIAL_PLACES[0];
    const html = renderToStaticMarkup(
      React.createElement(PlacesView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        places: INITIAL_PLACES,
        initialScreen: 'darshan',
        initialSelectedPlaceId: firstPlace.id,
        onSavePlace: () => Promise.resolve(),
        onDeletePlace: () => Promise.resolve(),
      })
    );

    expect(html).toContain('Darshan &amp; Timings');
    expect(html).toContain('Trust Verification Guidance');
    expect(html).toContain('Temple opening hours');
    expect(html).toContain('Dress Code');
  });

  it('renders Screen 7: Add Place form with valid categories', () => {
    const html = renderToStaticMarkup(
      React.createElement(PlacesView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        places: INITIAL_PLACES,
        initialScreen: 'add',
        onSavePlace: () => Promise.resolve(),
        onDeletePlace: () => Promise.resolve(),
      })
    );

    expect(html).toContain('Add Place');
    expect(html).toContain('Place Name *');
    expect(html).toContain('Place Type *');
    expect(html).toContain('Location / City *');
    expect(html).toContain('Related Itinerary Day');
    expect(html).toContain('Visit Status');
    expect(html).toContain('Save Place');
  });

  it('renders Screen 8: Edit Place form prefilled with place data', () => {
    const placeToEdit = INITIAL_PLACES[1]; // Grishneshwar
    const html = renderToStaticMarkup(
      React.createElement(PlacesView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        places: INITIAL_PLACES,
        initialScreen: 'edit',
        initialSelectedPlaceId: placeToEdit.id,
        onSavePlace: () => Promise.resolve(),
        onDeletePlace: () => Promise.resolve(),
      })
    );

    expect(html).toContain('Edit Place');
    expect(html).toContain(placeToEdit.name);
    expect(html).toContain(placeToEdit.city);
    expect(html).toContain('Update Place');
  });

  it('renders Screen 10: Visited Tracker with 0 visited in fresh seed state', () => {
    const html = renderToStaticMarkup(
      React.createElement(PlacesView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        places: INITIAL_PLACES,
        initialScreen: 'visited',
        onSavePlace: () => Promise.resolve(),
        onDeletePlace: () => Promise.resolve(),
      })
    );

    expect(html).toContain('Visited Places');
    expect(html).toContain('Track your verified visits');
    expect(html).toContain('No visited places recorded');
  });

  it('renders Screen 12: Pilgrimage Settings and Route Scope banner', () => {
    const html = renderToStaticMarkup(
      React.createElement(PlacesView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        places: INITIAL_PLACES,
        initialScreen: 'settings',
        onSavePlace: () => Promise.resolve(),
        onDeletePlace: () => Promise.resolve(),
      })
    );

    expect(html).toContain('Pilgrimage Route Scope');
    expect(html).toContain('8 Main Pilgrimage Destinations');
    expect(html).toContain('Shri Sai Baba Samadhi Mandir (Shirdi)');
    expect(html).toContain('Srisailam / Mallikarjuna is not part of this 19-day itinerary and is excluded');
    expect(html).toContain('Official Temple Trust Portals');
  });

  it('renders an empty state gracefully when no places are available', () => {
    const html = renderToStaticMarkup(
      React.createElement(PlacesView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        places: [],
        initialScreen: 'list',
        onSavePlace: () => Promise.resolve(),
        onDeletePlace: () => Promise.resolve(),
      })
    );

    expect(html).toContain('No Places Found');
    expect(html).toContain('Add Place / Temple');
  });
});
