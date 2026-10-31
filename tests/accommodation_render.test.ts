import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AccommodationView } from '@/components/views/AccommodationView';
import { INITIAL_TRIP, INITIAL_DAYS, INITIAL_STAYS } from '@/lib/seed-data';

describe('AccommodationView Comprehensive Render Tests', () => {
  it('renders Screen 1: Accommodation Overview with stat cards, upcoming stay and quick actions', () => {
    const html = renderToStaticMarkup(
      React.createElement(AccommodationView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        accommodations: INITIAL_STAYS,
        initialScreen: 'overview',
        onSaveStay: () => Promise.resolve(),
        onDeleteStay: () => Promise.resolve(),
      })
    );

    // Header & Titles
    expect(html).toContain('Accommodation');
    expect(html).toContain('All your stays in one place');

    // Stat Cards
    expect(html).toContain('Total Stays');
    expect(html).toContain('Dharamshalas');
    expect(html).toContain('Hotels');
    expect(html).toContain('Others');

    // Upcoming Stay Card
    expect(html).toContain('Upcoming Stay');
    expect(html).toContain('Shri Sai Baba Sansthan Trust Bhaktaniwas');
    expect(html).toContain('Needs research');

    // Quick Actions
    expect(html).toContain('Add Stay');
    expect(html).toContain('Find Nearby');
    expect(html).toContain('View on Map');
    expect(html).toContain('My Bookings');
  });

  it('renders Screen 2: All Stays list with search, filter pills, and all 11 destinations', () => {
    const html = renderToStaticMarkup(
      React.createElement(AccommodationView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        accommodations: INITIAL_STAYS,
        initialScreen: 'list',
        onSaveStay: () => Promise.resolve(),
        onDeleteStay: () => Promise.resolve(),
      })
    );

    expect(html).toContain('All Stays');
    expect(html).toContain('Search stays, places or hotels...');
    // Destination checks
    expect(html).toContain('Shirdi');
    expect(html).toContain('Ellora');
    expect(html).toContain('Nashik');
    expect(html).toContain('Pune');
    expect(html).toContain('Lonavala');
    expect(html).toContain('Dwarka');
    expect(html).toContain('Somnath');
    expect(html).toContain('Ujjain');
    expect(html).toContain('Omkareshwar');
    expect(html).toContain('Khandwa');
    expect(html).toContain('Khammam');
  });

  it('renders Screen 4: Stay Details with solo capacity, linked itinerary day, and honest placeholders', () => {
    const html = renderToStaticMarkup(
      React.createElement(AccommodationView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        accommodations: INITIAL_STAYS,
        initialScreen: 'details',
        onSaveStay: () => Promise.resolve(),
        onDeleteStay: () => Promise.resolve(),
      })
    );

    expect(html).toContain('Stay Details');
    expect(html).toContain('Shri Sai Baba Sansthan Trust Bhaktaniwas');
    expect(html).toContain('Dharamshala');
    expect(html).toContain('1 Person (Solo)');
    expect(html).toContain('1 Night');
    expect(html).toContain('Day 2:');
    expect(html).toContain('Shirdi');
    expect(html).toContain('Inquire directly at temple trust counter');
    expect(html).toContain('Booking Info');
    expect(html).toContain('Photos &amp; Docs');
  });

  it('renders Screen 5: Booking Details without fake fallbacks', () => {
    const html = renderToStaticMarkup(
      React.createElement(AccommodationView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        accommodations: INITIAL_STAYS,
        initialScreen: 'booking',
        onSaveStay: () => Promise.resolve(),
        onDeleteStay: () => Promise.resolve(),
      })
    );

    expect(html).toContain('Booking Details');
    expect(html).toContain('Booking Status');
    expect(html).toContain('Not booked (Pending research)');
    expect(html).toContain('Official Portal / Counter');
    expect(html).toContain('Tariff to be verified at counter');
    expect(html).toContain('₹0 (No advance payment)');
    expect(html).toContain('Pay on counter upon arrival');
    expect(html).toContain('View Booking Confirmation');
    expect(html).toContain('Download Receipt');
  });

  it('renders Screen 7: Nearby Accommodation with verified trust options', () => {
    const html = renderToStaticMarkup(
      React.createElement(AccommodationView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        accommodations: INITIAL_STAYS,
        initialScreen: 'nearby',
        onSaveStay: () => Promise.resolve(),
        onDeleteStay: () => Promise.resolve(),
      })
    );

    expect(html).toContain('Nearby Accommodation');
    expect(html).toContain('Shirdi, Maharashtra');
    expect(html).toContain('Sai Ashram Complex (Sansthan Trust)');
    expect(html).toContain('Dwarawati Bhakta Niwas (Sansthan)');
    expect(html).toContain('Shanti Kamal Trust Complex');
  });

  it('renders Screen 8: Map View with landmarks and navigation pins', () => {
    const html = renderToStaticMarkup(
      React.createElement(AccommodationView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        accommodations: INITIAL_STAYS,
        initialScreen: 'map',
        onSaveStay: () => Promise.resolve(),
        onDeleteStay: () => Promise.resolve(),
      })
    );

    expect(html).toContain('Map View');
    expect(html).toContain('Sai Baba Temple');
    expect(html).toContain('Directions');
    expect(html).toContain('View Details');
  });

  it('renders Screen 9: Photos & Documents and Screen 10: Settings with established preferences', () => {
    const photosHtml = renderToStaticMarkup(
      React.createElement(AccommodationView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        accommodations: INITIAL_STAYS,
        initialScreen: 'photos',
        onSaveStay: () => Promise.resolve(),
        onDeleteStay: () => Promise.resolve(),
      })
    );
    expect(photosHtml).toContain('Stay Photos &amp; Documents');
    expect(photosHtml).toContain('Photo Gallery');
    expect(photosHtml).toContain('Attached Documents');
    expect(photosHtml).toContain('Upload Files');

    const settingsHtml = renderToStaticMarkup(
      React.createElement(AccommodationView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        accommodations: INITIAL_STAYS,
        initialScreen: 'settings',
        onSaveStay: () => Promise.resolve(),
        onDeleteStay: () => Promise.resolve(),
      })
    );
    expect(settingsHtml).toContain('Accommodation Settings');
    expect(settingsHtml).toContain('Established Pilgrimage Trip Preferences');
    expect(settingsHtml).toContain('Solo Traveller');
    expect(settingsHtml).toContain('Dharamshala &amp; Low-Cost First');
    expect(settingsHtml).toContain('Night Travel Room Savings');
    expect(settingsHtml).toContain('Preferred Stay Type');
    expect(settingsHtml).toContain('Max Budget per Night');
    expect(settingsHtml).toContain('Show on Map');
    expect(settingsHtml).toContain('Reminders');
    expect(settingsHtml).toContain('Official Pilgrimage Stays &amp; Dharamshala Portals');
    expect(settingsHtml).toContain('Shri Saibaba Sansthan Trust');
    expect(settingsHtml).toContain('Shree Somnath Trust');
    expect(settingsHtml).toContain('Shri Mahakaleshwar Temple Trust');
  });
});
