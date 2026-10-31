import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TicketsView } from '@/components/views/TicketsView';
import { Navigation } from '@/components/Navigation';
import { INITIAL_TRIP, INITIAL_DAYS, INITIAL_TRANSPORT, INITIAL_DOCUMENTS } from '@/lib/seed-data';
import { BookingDocument } from '@/types/trip';

describe('TicketsView & TransportView Render Test', () => {
  it('1. Renders Tickets & Documents in clean unbooked state without fabricated tickets', () => {
    const html = renderToStaticMarkup(
      React.createElement(TicketsView, {
        documents: INITIAL_DOCUMENTS,
        transportLegs: INITIAL_TRANSPORT,
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        onSaveDocument: () => Promise.resolve(),
        onDeleteDocument: () => Promise.resolve(),
        onSaveTransport: () => Promise.resolve(),
        onDeleteTransport: () => Promise.resolve(),
      })
    );

    // Header & Titles for Travel Tickets
    expect(html).toContain('Travel Tickets &amp; Passes');
    expect(html).toContain('All your bookings and important documents');

    // Category pills for Tickets
    expect(html).toContain('Train Tickets');
    expect(html).toContain('Bus Tickets');

    // Render dedicated Documents view (Separated Sections)
    const docHtml = renderToStaticMarkup(
      React.createElement(TicketsView, {
        trip: INITIAL_TRIP,
        documents: [],
        transportLegs: INITIAL_TRANSPORT,
        initialSection: 'documents',
        onAddTicket: () => {},
        onDeleteTicket: () => {},
        onSaveDocument: () => Promise.resolve(),
        onDeleteDocument: () => Promise.resolve(),
        onSaveTransport: () => Promise.resolve(),
        onDeleteTransport: () => Promise.resolve(),
      })
    );

    // Dedicated Documents categories
    expect(docHtml).toContain('Accommodation');
    expect(docHtml).toContain('Others');

    // Must NOT contain fabricated tickets from old prototype
    expect(html).not.toContain('Godavari Express');
    expect(html).not.toContain('Srisailam');
    expect(html).not.toContain('Hotel Sri Sai Residency');

    // Action button
    expect(html).toContain('Add Document');

    // Segmented tab switchers
    expect(html).toContain('Tickets');
    expect(html).toContain('Documents');
    expect(html).toContain('Transport');
  });

  it('2. Confirms INITIAL_DOCUMENTS is an empty array for fresh trips with zero fabricated tickets', () => {
    expect(INITIAL_DOCUMENTS.length).toBe(0);
  });

  it('3. Renders user-added documents accurately when provided', () => {
    const userDocs: BookingDocument[] = [
      {
        id: 'doc-1',
        tripId: INITIAL_TRIP.id,
        title: 'Shirdi Darshan Pass',
        docType: 'Temple Pass',
        fileName: 'shirdi-pass.pdf',
        fileSize: 1024 * 100,
        fileType: 'application/pdf',
        storagePath: 'user/shirdi-pass.pdf',
        offlineCached: true,
        travelDate: '2026-11-18',
        createdAt: '2026-10-24T00:00:00.000Z',
        updatedAt: '2026-10-24T00:00:00.000Z',
      },
    ];

    const html = renderToStaticMarkup(
      React.createElement(TicketsView, {
        documents: userDocs,
        transportLegs: INITIAL_TRANSPORT,
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        onSaveDocument: () => Promise.resolve(),
        onDeleteDocument: () => Promise.resolve(),
        onSaveTransport: () => Promise.resolve(),
        onDeleteTransport: () => Promise.resolve(),
      })
    );

    expect(html).toContain('Shirdi Darshan Pass');
  });

  it('4. Contains preloaded transport legs matching pilgrimage itinerary', () => {
    expect(INITIAL_TRANSPORT.length).toBe(19);
    const trainLeg = INITIAL_TRANSPORT.find(t => t.mode === 'Train');
    expect(trainLeg).toBeDefined();
    expect(trainLeg?.fromLocation).toContain('Hyderabad');
    expect(trainLeg?.toLocation).toContain('Shirdi');
    expect(trainLeg?.status).toBe('Needs verification');

    const busLeg = INITIAL_TRANSPORT.find(t => t.mode === 'State Bus');
    expect(busLeg).toBeDefined();
    expect(busLeg?.status).toBe('Needs verification');
  });

  it('5. Renders Navigation with Transport positioned between Budget and Accommodation', () => {
    const html = renderToStaticMarkup(
      React.createElement(Navigation, {
        activeTab: 'transport',
        onTabChange: () => {},
      })
    );

    expect(html).toContain('Budget');
    expect(html).toContain('Transport');
    expect(html).toContain('Accommodation');

    const budgetIndex = html.indexOf('Budget');
    const transportIndex = html.indexOf('Transport');
    const accommodationIndex = html.indexOf('Accommodation');

    expect(budgetIndex).toBeLessThan(transportIndex);
    expect(transportIndex).toBeLessThan(accommodationIndex);
  });
});
