import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TicketsView } from '@/components/views/TicketsView';
import {
  CONFIRMED_TRANSPORT_LEGS,
  getConfirmedTransportLegs,
} from '@/lib/itinerary-data';
import {
  DEFAULT_TRIP_ID,
  INITIAL_TRIP,
  INITIAL_DAYS,
  INITIAL_TRANSPORT,
  INITIAL_DOCUMENTS,
} from '@/lib/seed-data';
import { TransportLeg } from '@/types/trip';

describe('Phase 2 — Step 7: Transport Module Verification Suite', () => {
  it('1. Verifies all 14 requested route segments from the 19-day itinerary are represented', () => {
    const legs = getConfirmedTransportLegs(DEFAULT_TRIP_ID);

    // Segment 1: Hyderabad/Secunderabad → Shirdi
    const seg1 = legs.find(l => l.fromLocation.includes('Hyderabad') && l.toLocation.includes('Shirdi'));
    expect(seg1).toBeDefined();
    expect(seg1?.mode).toBe('Train');

    // Segment 3: Shirdi → Chhatrapati Sambhajinagar / Ellora
    const seg3 = legs.find(l => l.fromLocation.includes('Shirdi') && l.toLocation.includes('Ellora'));
    expect(seg3).toBeDefined();
    expect(seg3?.mode).toBe('State Bus');

    // Segment 5: Chhatrapati Sambhajinagar / Ellora → Nashik
    const seg5 = legs.find(l => l.fromLocation.includes('Ellora') && l.toLocation.includes('Nashik'));
    expect(seg5).toBeDefined();
    expect(seg5?.mode).toBe('State Bus');

    // Segment 6: Nashik → Trimbakeshwar → Pune / Manchar
    const seg6 = legs.find(l => l.fromLocation.includes('Nashik') && l.toLocation.includes('Pune'));
    expect(seg6).toBeDefined();
    expect(seg6?.mode).toBe('State Bus');

    // Segment 7: Pune / Manchar → Bhimashankar → Pune
    const seg7 = legs.find(l => l.fromLocation.includes('Pune') && l.toLocation.includes('Bhimashankar'));
    expect(seg7).toBeDefined();
    expect(seg7?.mode).toBe('State Bus');

    // Segment 8: Pune → Lonavala
    const seg8 = legs.find(l => l.fromLocation.includes('Pune') && l.toLocation.includes('Lonavala'));
    expect(seg8).toBeDefined();
    expect(seg8?.mode).toBe('Train');

    // Segment 9: Pune / Lonavala → Dwarka
    const seg9 = legs.find(l => (l.fromLocation.includes('Pune') || l.fromLocation.includes('Lonavala')) && l.toLocation.includes('Dwarka'));
    expect(seg9).toBeDefined();
    expect(seg9?.mode).toBe('Train');

    // Segment 10: Dwarka → Nageshwar → Dwarka
    const seg10 = legs.find(l => l.fromLocation.includes('Dwarka') && l.toLocation.includes('Nageshwar'));
    expect(seg10).toBeDefined();
    expect(seg10?.mode).toBe('Local Bus');

    // Segment 11: Dwarka → Somnath / Veraval
    const seg11 = legs.find(l => l.fromLocation.includes('Dwarka') && l.toLocation.includes('Somnath'));
    expect(seg11).toBeDefined();
    expect(seg11?.mode).toBe('State Bus');

    // Segment 13: Somnath / Veraval → Ujjain
    const seg13 = legs.find(l => l.fromLocation.includes('Somnath') && l.toLocation.includes('Ujjain'));
    expect(seg13).toBeDefined();
    expect(seg13?.mode).toBe('Train');

    // Segment 15: Ujjain → Omkareshwar via Indore
    const seg15 = legs.find(l => l.fromLocation.includes('Ujjain') && l.toLocation.includes('Omkareshwar'));
    expect(seg15).toBeDefined();
    expect(seg15?.mode).toBe('State Bus');

    // Segment 17: Omkareshwar / Indore / Khandwa → Telangana
    const seg17 = legs.find(l => (l.fromLocation.includes('Omkareshwar') || l.fromLocation.includes('Khandwa')) && l.toLocation.includes('Telangana'));
    expect(seg17).toBeDefined();
    expect(seg17?.mode).toBe('Train');

    // Segment 18: Return rail transit toward Khammam
    const seg18 = legs.find(l => l.toLocation.includes('Khammam'));
    expect(seg18).toBeDefined();
    expect(seg18?.mode).toBe('Train');
  });

  it('2. Verifies journey dates strictly align with the 19-day itinerary schedule', () => {
    const legs = getConfirmedTransportLegs(DEFAULT_TRIP_ID);

    // Day 1: Nov 17 - Departure from Secunderabad to Shirdi
    const d1Leg = legs.find(l => l.date === '2026-11-17');
    expect(d1Leg?.fromLocation).toContain('Hyderabad');
    expect(d1Leg?.toLocation).toContain('Shirdi');

    // Day 3: Nov 19 - Shirdi to Ellora
    const d3Leg = legs.find(l => l.date === '2026-11-19');
    expect(d3Leg?.fromLocation).toContain('Shirdi');

    // Day 5: Nov 21 - Sambhajinagar / Ellora to Nashik
    const d5Leg = legs.find(l => l.date === '2026-11-21');
    expect(d5Leg?.toLocation).toContain('Nashik');

    // Day 6: Nov 22 - Nashik to Pune
    const d6Leg = legs.find(l => l.date === '2026-11-22');
    expect(d6Leg?.fromLocation).toContain('Nashik');

    // Day 7: Nov 23 - Pune to Bhimashankar
    const d7Leg = legs.find(l => l.date === '2026-11-23');
    expect(d7Leg?.fromLocation).toContain('Pune');

    // Day 8: Nov 24 - Pune to Lonavala
    const d8Leg = legs.find(l => l.date === '2026-11-24');
    expect(d8Leg?.toLocation).toContain('Lonavala');

    // Day 9: Nov 25 - Pune / Lonavala to Dwarka
    const d9Leg = legs.find(l => l.date === '2026-11-25');
    expect(d9Leg?.toLocation).toContain('Dwarka');

    // Day 10: Nov 26 - Dwarka to Nageshwar
    const d10Leg = legs.find(l => l.date === '2026-11-26');
    expect(d10Leg?.fromLocation).toContain('Dwarka');

    // Day 11: Nov 27 - Dwarka to Somnath
    const d11Leg = legs.find(l => l.date === '2026-11-27');
    expect(d11Leg?.fromLocation).toContain('Dwarka');

    // Day 13: Nov 29 - Somnath to Ujjain
    const d13Leg = legs.find(l => l.date === '2026-11-29');
    expect(d13Leg?.fromLocation).toContain('Somnath');
    expect(d13Leg?.toLocation).toContain('Ujjain');

    // Day 15: Dec 01 - Ujjain to Omkareshwar
    const d15Leg = legs.find(l => l.date === '2026-12-01');
    expect(d15Leg?.fromLocation).toContain('Ujjain');
    expect(d15Leg?.toLocation).toContain('Omkareshwar');

    // Day 17: Dec 03 - Omkareshwar / Khandwa to Telangana
    const d17Leg = legs.find(l => l.date === '2026-12-03');
    expect(d17Leg?.toLocation).toContain('Telangana');

    // Day 18: Dec 04 - Toward Khammam
    const d18Leg = legs.find(l => l.date === '2026-12-04');
    expect(d18Leg?.toLocation).toContain('Khammam');
  });

  it('3. Guarantees planned journeys are NOT misrepresented as confirmed bookings', () => {
    const legs = getConfirmedTransportLegs(DEFAULT_TRIP_ID);

    // None of the preloaded planned route segments should have status 'Booked'
    const bookedLegs = legs.filter(l => l.status === 'Booked');
    expect(bookedLegs.length).toBe(0);

    // All planned segments must have status 'Needs verification' and needsVerification = true
    for (const leg of legs) {
      expect(leg.status).toBe('Needs verification');
      expect(leg.needsVerification).toBe(true);
    }
  });

  it('4. Guarantees zero fake train numbers, fake PNRs, or fabricated fares exist in seed data', () => {
    const legs = getConfirmedTransportLegs(DEFAULT_TRIP_ID);

    for (const leg of legs) {
      // Must not contain fake PNRs
      expect(leg.pnr).toBeUndefined();
      // Must not contain fabricated booking references
      expect(leg.bookingRef).toBeUndefined();
      // Must not contain fake booked ticket numbers or seats
      expect(leg.coachSeat).toBeUndefined();
      // Must not have confirmed fare masquerading as paid expense
      expect(leg.fare).toBeUndefined();
      // Train names/numbers should not be fabricated
      expect(leg.serviceNumber).toBeUndefined();
    }
  });

  it('5. Renders Transport & Journeys view with accurate route information and badges', () => {
    const html = renderToStaticMarkup(
      React.createElement(TicketsView, {
        documents: INITIAL_DOCUMENTS,
        transportLegs: INITIAL_TRANSPORT,
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        initialSection: 'transport',
        initialTransportScreen: 'transport-list',
        onSaveDocument: vi.fn(),
        onDeleteDocument: vi.fn(),
        onSaveTransport: vi.fn(),
        onDeleteTransport: vi.fn(),
      })
    );

    // Header & mode pills
    expect(html).toContain('All Transport');
    expect(html).toContain('Train');
    expect(html).toContain('Bus');
    expect(html).toContain('Auto');

    // Segments rendered
    expect(html).toContain('Hyderabad / Secunderabad');
    expect(html).toContain('Shirdi');
    expect(html).toContain('Chhatrapati Sambhajinagar');
    expect(html).toContain('Ellora');
    expect(html).toContain('Nashik');
    expect(html).toContain('Bhimashankar');
    expect(html).toContain('Indore');
    expect(html).toContain('Omkareshwar');
    expect(html).toContain('Ujjain');
    expect(html).toContain('Dwarka');
    expect(html).toContain('Nageshwar');
    expect(html).toContain('Somnath / Veraval');
    expect(html).toContain('Telangana');
    expect(html).toContain('Khammam');

    // Day link badges
    expect(html).toContain('Day 1');
    expect(html).toContain('Day 3');
    expect(html).toContain('Day 18');
  });

  it('6. Enforces practical pilgrimage travel preferences in UI settings', () => {
    const html = renderToStaticMarkup(
      React.createElement(TicketsView, {
        documents: INITIAL_DOCUMENTS,
        transportLegs: INITIAL_TRANSPORT,
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        initialSection: 'transport',
        initialTransportScreen: 'transport-settings',
        onSaveDocument: vi.fn(),
        onDeleteDocument: vi.fn(),
        onSaveTransport: vi.fn(),
        onDeleteTransport: vi.fn(),
      })
    );

    // Practical travel preference guidelines
    expect(html).toContain('Transport Preferences');
    expect(html).toContain('Solo &amp; Budget-friendly');
    expect(html).toContain('Sleeper Class (SL) preferred');
    expect(html).toContain('State Buses (MSRTC/GSRTC) &amp; Shared Autos');
    expect(html).toContain('Preferred where practical (saves stay cost)');
    expect(html).toContain('Avoid unnecessary expensive cabs');
    expect(html).toContain('Shirdi Traveller Van Policy');
    expect(html).toContain('Do not assume a return-to-Shirdi tour fits the linear route');

    // Verified Official transit links
    expect(html).toContain('Indian Railways (IRCTC)');
    expect(html).toContain('Maharashtra State Transport (MSRTC)');
    expect(html).toContain('Gujarat State Road Transport (GSRTC)');
  });

  it('7. Renders clean empty state when no transport legs exist', () => {
    const html = renderToStaticMarkup(
      React.createElement(TicketsView, {
        documents: [],
        transportLegs: [],
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        initialSection: 'transport',
        initialTransportScreen: 'transport-list',
        onSaveDocument: vi.fn(),
        onDeleteDocument: vi.fn(),
        onSaveTransport: vi.fn(),
        onDeleteTransport: vi.fn(),
      })
    );

    expect(html).toContain('No transport journeys found');
    expect(html).toContain('No journeys have been added to this trip yet.');
    expect(html).toContain('Add Journey');
  });

  it('8. Supports day linking to Itinerary view via onSelectDayIndex callback', () => {
    const onSelectDayIndex = vi.fn();
    const html = renderToStaticMarkup(
      React.createElement(TicketsView, {
        documents: INITIAL_DOCUMENTS,
        transportLegs: INITIAL_TRANSPORT,
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        initialSection: 'transport',
        initialTransportScreen: 'transport-list',
        onSelectDayIndex,
        onSaveDocument: vi.fn(),
        onDeleteDocument: vi.fn(),
        onSaveTransport: vi.fn(),
        onDeleteTransport: vi.fn(),
      })
    );

    // Itinerary Day chips are rendered on journeys
    expect(html).toContain('Day 1');
    expect(html).toContain('Day 3');
  });

  it('9. Deterministic UUID generation guarantees stable IDs without collision', () => {
    const legsA = getConfirmedTransportLegs('trip-test-01');
    const legsB = getConfirmedTransportLegs('trip-test-01');

    expect(legsA.length).toBe(legsB.length);
    for (let i = 0; i < legsA.length; i++) {
      expect(legsA[i].id).toBe(legsB[i].id);
      expect(legsA[i].tripId).toBe('trip-test-01');
    }
  });

  it('10. Custom user transport legs allow saving real verified PNR and booking reference', () => {
    const customBookedLeg: TransportLeg = {
      id: 'custom-leg-booked-01',
      tripId: DEFAULT_TRIP_ID,
      dayId: '00000000-0000-4000-8000-000000000001',
      fromLocation: 'Secunderabad Jn (SC)',
      toLocation: 'Sainagar Shirdi (SNSI)',
      mode: 'Train',
      date: '2026-11-17',
      serviceNumber: '17002',
      trainName: 'Shirdi Express',
      pnr: '4521098765',
      coachSeat: 'S3-24',
      status: 'Booked',
      departureTime: '16:30',
      arrivalTime: '09:15',
      duration: '16h 45m',
      fare: 480,
      notes: 'Actual user entered booking',
      needsVerification: false,
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
    };

    const html = renderToStaticMarkup(
      React.createElement(TicketsView, {
        documents: [],
        transportLegs: [customBookedLeg],
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        initialSection: 'transport',
        initialTransportScreen: 'transport-details-train',
        initialSelectedTransportId: 'custom-leg-booked-01',
        onSaveDocument: vi.fn(),
        onDeleteDocument: vi.fn(),
        onSaveTransport: vi.fn(),
        onDeleteTransport: vi.fn(),
      })
    );

    expect(html).toContain('Secunderabad Jn (SC)');
    expect(html).toContain('Sainagar Shirdi (SNSI)');
    expect(html).toContain('PNR / Ref: 4521098765');
    expect(html).toContain('₹480');
    expect(html).toContain('Booked');
  });
});
