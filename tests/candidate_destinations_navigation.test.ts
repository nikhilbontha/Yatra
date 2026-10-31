import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CONFIRMED_PLACES, CONFIRMED_ITINERARY_DAYS } from '@/lib/itinerary-data';
import { CONFIRMED_PILGRIMAGE_TRIP } from '@/lib/db';
import { PlacesView } from '@/components/views/PlacesView';

describe('Candidate Destinations End-to-End Navigation to Place Details', () => {
  const candidateSites = [
    { siteName: 'Shirdi Sai Baba Temple', expectedName: 'Shri Sai Baba Samadhi Mandir' },
    { siteName: 'Grishneshwar Jyotirlinga', expectedName: 'Grishneshwar Jyotirlinga Temple' },
    { siteName: 'Ellora Caves', expectedName: 'Ellora Caves' },
    { siteName: 'Trimbakeshwar Jyotirlinga', expectedName: 'Trimbakeshwar Jyotirlinga Temple' },
    { siteName: 'Bhimashankar Jyotirlinga', expectedName: 'Bhimashankar Jyotirlinga Temple' },
    { siteName: 'Mahakaleshwar Jyotirlinga, Ujjain', expectedName: 'Shri Mahakaleshwar Jyotirlinga Temple' },
    { siteName: 'Omkareshwar Jyotirlinga', expectedName: 'Omkareshwar Jyotirlinga Temple' },
    { siteName: 'Mamaleshwar Temple', expectedName: 'Mamleshwar Temple' },
    { siteName: 'Nageshwar Jyotirlinga, Dwarka', expectedName: 'Nageshwar Jyotirlinga Temple' },
    { siteName: 'Somnath Jyotirlinga', expectedName: 'Somnath Jyotirlinga Temple' },
  ];

  it('accurately resolves each of the 10 candidate destinations to genuine database records in CONFIRMED_PLACES', () => {
    for (const item of candidateSites) {
      const match = CONFIRMED_PLACES.find(p => p.name.toLowerCase() === item.expectedName.toLowerCase());
      expect(match, `Expected place ${item.expectedName} not found`).toBeDefined();
      expect(match?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    }
  });

  it('renders Grishneshwar Jyotirlinga Details Page with all temple guide sections when opened directly with initialSelectedPlaceId and screen=details', () => {
    const grishneshwar = CONFIRMED_PLACES.find(p => p.name.includes('Grishneshwar'));
    expect(grishneshwar).toBeDefined();

    const html = renderToStaticMarkup(
      React.createElement(PlacesView, {
        trip: { id: 'test-trip', ...CONFIRMED_PILGRIMAGE_TRIP },
        days: CONFIRMED_ITINERARY_DAYS,
        places: CONFIRMED_PLACES,
        initialScreen: 'details',
        initialSelectedPlaceId: grishneshwar!.id,
        onSelectDayIndex: () => {},
      })
    );

    // Title & Location
    expect(html).toContain('Grishneshwar Jyotirlinga Temple');
    expect(html).toContain('Ellora');

    // Tags
    expect(html).toContain('Jyotirlinga');
    expect(html).toContain('Jyotirlinga Shrine');
    expect(html).toContain('Pilgrimage Stop');

    // Day Link
    expect(html).toContain('Day 4');
    expect(html).toContain('View Day');

    // Overview & Details
    expect(html).toContain('The 12th and last Jyotirlinga on earth');
    expect(html).toContain('Queen Ahilyabai Holkar');
    expect(html).toContain('Visit Notes:');
    expect(html).toContain('Located ~1 km from Ellora Caves');

    // Action buttons
    expect(html).toContain('Edit Place');
    expect(html).toContain('Mark as Visited');
  });

  it('renders Somnath Jyotirlinga Details Page when opened directly', () => {
    const somnath = CONFIRMED_PLACES.find(p => p.name.includes('Somnath'));
    expect(somnath).toBeDefined();

    const html = renderToStaticMarkup(
      React.createElement(PlacesView, {
        trip: { id: 'test-trip', ...CONFIRMED_PILGRIMAGE_TRIP },
        days: CONFIRMED_ITINERARY_DAYS,
        places: CONFIRMED_PLACES,
        initialScreen: 'details',
        initialSelectedPlaceId: somnath!.id,
      })
    );

    expect(html).toContain('Somnath Jyotirlinga Temple');
    expect(html).toContain('Jyotirlinga');
    expect(html).toContain('Edit Place');
  });
});
