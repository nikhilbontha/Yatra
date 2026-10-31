import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TransportView } from '@/components/views/TransportView';
import { DocumentsView } from '@/components/views/DocumentsView';
import { TicketsView } from '@/components/views/TicketsView';
import {
  INITIAL_TRIP,
  INITIAL_DAYS,
  INITIAL_TRANSPORT,
  INITIAL_DOCUMENTS,
} from '@/lib/seed-data';
import { BookingDocument, TransportLeg } from '@/types/trip';

describe('Redesigned 3 Standalone Pages & All Subpages Verification', () => {
  // ===========================================================================
  // 1. DEDICATED TRANSPORT & JOURNEY PAGE
  // ===========================================================================
  describe('1. Transport & Journey Dedicated Page', () => {
    it('renders clean standalone Transport view without any connecting dock to tickets or documents', () => {
      const html = renderToStaticMarkup(
        React.createElement(TransportView, {
          trip: INITIAL_TRIP,
          days: INITIAL_DAYS,
          transportLegs: INITIAL_TRANSPORT,
        })
      );

      // Dedicated Header & Badges
      expect(html).toContain('Transport');
      expect(html).toContain('PILGRIMAGE TRANSIT · 19 DAYS');
      expect(html).toContain('All your travel journeys in one place');

      // Quick Action Buttons
      expect(html).toContain('Add Train');
      expect(html).toContain('Add Bus');
      expect(html).toContain('Add Auto');
      expect(html).toContain('Add Other');

      // Upcoming Journey Hero Card with direct Edit & Delete
      expect(html).toContain('Upcoming Journey');
      expect(html).toContain('Edit');
      expect(html).toContain('Delete');

      // Filter Mode Pills
      expect(html).toContain('All Transport');
      expect(html).toContain('Train');
      expect(html).toContain('Bus');
      expect(html).toContain('Auto');

      // Chronological Timeline Transit Legs rendered inline
      expect(html).toContain('Secunderabad');
      expect(html).toContain('Shirdi');
      expect(html).toContain('Ellora');
      expect(html).toContain('Nashik');
      expect(html).toContain('Dwarka');
      expect(html).toContain('Somnath');
      expect(html).toContain('Ujjain');

      // NO connecting segmented dock bar to tickets or documents
      expect(html).not.toContain('class="glass-dock"');
      expect(html).not.toContain('Tickets &amp; Documents');
    });

    it('renders Subpage 1: Journey Details with boarding pass card, PNR, and action buttons', () => {
      const bookedLegWithPnr: TransportLeg = {
        ...INITIAL_TRANSPORT[0],
        bookingRef: 'IRCTC-4521098765',
      };
      const html = renderToStaticMarkup(
        React.createElement(TransportView, {
          trip: INITIAL_TRIP,
          days: INITIAL_DAYS,
          transportLegs: [bookedLegWithPnr],
          initialScreen: 'details',
          initialSelectedId: bookedLegWithPnr.id,
        })
      );

      expect(html).toContain('Back to Journeys');
      expect(html).toContain('Edit');
      expect(html).toContain('Delete');
      expect(html).toContain('Origin');
      expect(html).toContain('Destination');
      expect(html).toContain('Booking Reference');
      expect(html).toContain('IRCTC-4521098765');
      expect(html).toContain('Linked Itinerary Day');
    });

    it('renders Subpage 2: Add / Edit Journey Modal Form with all transit modes', () => {
      const html = renderToStaticMarkup(
        React.createElement(TransportView, {
          trip: INITIAL_TRIP,
          days: INITIAL_DAYS,
          transportLegs: INITIAL_TRANSPORT,
          initialScreen: 'add',
        })
      );

      expect(html).toContain('Add New Transit Journey');
      expect(html).toContain('From / Origin');
      expect(html).toContain('To / Destination');
      expect(html).toContain('Departure Time');
      expect(html).toContain('Arrival Time');
      expect(html).toContain('Booking Status');
      expect(html).toContain('Save Journey');
      expect(html).toContain('Cancel');
    });
  });

  // ===========================================================================
  // 2. DEDICATED DOCUMENTS PAGE
  // ===========================================================================
  describe('2. Documents Dedicated Page', () => {
    it('renders clean standalone Documents view with Document Vault and NO travel tickets section', () => {
      const html = renderToStaticMarkup(
        React.createElement(DocumentsView, {
          trip: INITIAL_TRIP,
          days: INITIAL_DAYS,
          documents: [],
        })
      );

      // Dedicated Header & Badges
      expect(html).toContain('Important Documents');
      expect(html).toContain('PILGRIMAGE VAULT · OFFLINE SAFE');
      expect(html).toContain('Pilgrimage Document Vault');

      // 3 Vault Pillars
      expect(html).toContain('Total Docs');
      expect(html).toContain('Stays &amp; Hotels');
      expect(html).toContain('ID &amp; Passes');

      // Dedicated Category Filters
      expect(html).toContain('Accommodation');
      expect(html).toContain('ID Proofs &amp; Cards');
      expect(html).toContain('Temple Passes');
      expect(html).toContain('Others');

      // Action Button
      expect(html).toContain('Upload Doc');

      // Empty State
      expect(html).toContain('No documents uploaded yet');
      expect(html).toContain('Tickets, hotel vouchers, and ID proofs will appear here once added.');

      // MUST NOT contain connecting dock or separate travel tickets section
      expect(html).not.toContain('Separate Travel Tickets Section');
      expect(html).not.toContain('class="glass-dock"');
    });

    it('renders Subpage 1: Document Details when viewing a stored document', () => {
      const sampleDoc: BookingDocument = {
        id: 'doc-hotel-shirdi',
        tripId: INITIAL_TRIP.id,
        title: 'Shirdi Bhaktaniwas Accommodation Voucher',
        docType: 'Hotel Receipt',
        type: 'hotel_booking',
        category: 'hotel_booking',
        bookingRef: 'SHIRDI-BHAKTA-882',
        fromCity: 'Shirdi',
        roomType: 'Dharamshala AC',
        travelDate: '2026-11-18',
        fileName: 'shirdi_voucher.pdf',
        fileSize: '180 KB',
        fileType: 'application/pdf',
        offlineCached: true,
        notes: 'Check-in: 12:00 PM',
        createdAt: '2026-10-24T00:00:00.000Z',
        updatedAt: '2026-10-24T00:00:00.000Z',
      };

      const html = renderToStaticMarkup(
        React.createElement(DocumentsView, {
          trip: INITIAL_TRIP,
          days: INITIAL_DAYS,
          documents: [sampleDoc],
          initialScreen: 'details',
          initialSelectedId: 'doc-hotel-shirdi',
        })
      );

      expect(html).toContain('Back to Vault');
      expect(html).toContain('Shirdi Bhaktaniwas Accommodation Voucher');
      expect(html).toContain('SHIRDI-BHAKTA-882');
      expect(html).toContain('Shirdi');
      expect(html).toContain('Dharamshala AC');
      expect(html).toContain('shirdi_voucher.pdf');
      expect(html).toContain('Download');
      expect(html).toContain('Edit');
      expect(html).toContain('Delete');
    });

    it('renders Subpage 2: Add Document with Dynamic Smart Questions based on Category', () => {
      // 1. Hotel Category form
      const hotelHtml = renderToStaticMarkup(
        React.createElement(DocumentsView, {
          trip: INITIAL_TRIP,
          days: INITIAL_DAYS,
          documents: [],
          initialScreen: 'add',
        })
      );

      expect(hotelHtml).toContain('Upload Document to Vault');
      expect(hotelHtml).toContain('Hotel / Stay');
      expect(hotelHtml).toContain('ID Proof &amp; Cards');
      expect(hotelHtml).toContain('Temple Pass');
      expect(hotelHtml).toContain('Hotel &amp; Stay Information');
      expect(hotelHtml).toContain('Hotel / Dharamshala Name');
      expect(hotelHtml).toContain('Check-in Date');
      expect(hotelHtml).toContain('Check-out Date');
      expect(hotelHtml).toContain('Room Type &amp; Tariff');
      expect(hotelHtml).toContain('Attach File (PDF, Image, Voucher - Saved Offline)');
      expect(hotelHtml).toContain('Save to Vault');
    });
  });

  // ===========================================================================
  // 3. DEDICATED TICKETS & PASSES PAGE
  // ===========================================================================
  describe('3. Travel Tickets & 19-Day Passes Dedicated Page', () => {
    it('renders clean standalone Tickets view with 19-Day Passes directly inline without dropdown accordion', () => {
      const html = renderToStaticMarkup(
        React.createElement(TicketsView, {
          trip: INITIAL_TRIP,
          days: INITIAL_DAYS,
          transportLegs: INITIAL_TRANSPORT,
          documents: [],
        })
      );

      // Dedicated Header
      expect(html).toContain('Travel Tickets &amp; Passes');
      expect(html).toContain('PILGRIMAGE TRANSIT · PASSES &amp; TICKETS');
      expect(html).toContain('All your bookings and important documents');

      // Circuit Passes Stats Card
      expect(html).toContain('Circuit Passes');
      expect(html).toContain('Uploaded');
      expect(html).toContain('Booked');

      // Section 1: 19-Day Pilgrimage Journey Passes directly inline (no "view legs" dropdown)
      expect(html).toContain('19-Day Pilgrimage Journey Passes');
      expect(html).toContain('Complete circuit transit legs directly available without dropdowns');
      expect(html).toContain('Legs');
      expect(html).toContain('Day 1');
      expect(html).toContain('Day 3');
      expect(html).toContain('Day 5');
      expect(html).toContain('+ Attach Ticket');

      // Section 2: Uploaded E-Tickets & Boarding Passes
      expect(html).toContain('Uploaded E-Tickets &amp; Boarding Passes');
      expect(html).toContain('Train Tickets');
      expect(html).toContain('Bus Tickets');
      expect(html).toContain('Other Tickets');

      // NO document vault banner or connection dock
      expect(html).not.toContain('Pilgrimage Document Vault');
      expect(html).not.toContain('class="glass-dock"');
    });

    it('renders Subpage 1: Boarding Pass Details when viewing an e-ticket', () => {
      const sampleTicket: BookingDocument = {
        id: 'tick-train-01',
        tripId: INITIAL_TRIP.id,
        title: '17208 / BZA SNSI EXP Train Ticket',
        docType: 'Train Ticket',
        pnr: '4521098765',
        fromCity: 'Secunderabad',
        toCity: 'Sainagar Shirdi',
        travelDate: '2026-11-17',
        checkInTime: '3:05 PM',
        coachSeat: 'S3 - Berth 45',
        fileName: 'irctc_shirdi_ticket.pdf',
        fileSize: '320 KB',
        fileType: 'application/pdf',
        offlineCached: true,
        notes: 'Sleeper Class Confirmed',
        createdAt: '2026-10-24T00:00:00.000Z',
        updatedAt: '2026-10-24T00:00:00.000Z',
      };

      const html = renderToStaticMarkup(
        React.createElement(TicketsView, {
          trip: INITIAL_TRIP,
          days: INITIAL_DAYS,
          transportLegs: INITIAL_TRANSPORT,
          documents: [sampleTicket],
          initialScreen: 'details',
          initialSelectedId: 'tick-train-01',
        })
      );

      expect(html).toContain('Back to Tickets');
      expect(html).toContain('17208 / BZA SNSI EXP Train Ticket');
      expect(html).toContain('Origin Station');
      expect(html).toContain('Secunderabad');
      expect(html).toContain('Destination Station');
      expect(html).toContain('Sainagar Shirdi');
      expect(html).toContain('PNR / Ref Number');
      expect(html).toContain('4521098765');
      expect(html).toContain('Coach &amp; Seat');
      expect(html).toContain('S3 - Berth 45');
      expect(html).toContain('irctc_shirdi_ticket.pdf');
      expect(html).toContain('Download');
    });

    it('renders Subpage 2: Add E-Ticket modal form with PNR, coach, seat, and offline file upload', () => {
      const html = renderToStaticMarkup(
        React.createElement(TicketsView, {
          trip: INITIAL_TRIP,
          days: INITIAL_DAYS,
          transportLegs: INITIAL_TRANSPORT,
          documents: [],
          initialScreen: 'add',
        })
      );

      expect(html).toContain('Add / Upload E-Ticket');
      expect(html).toContain('Transport Mode');
      expect(html).toContain('Ticket Name or Service');
      expect(html).toContain('From Station');
      expect(html).toContain('To Station');
      expect(html).toContain('PNR / Booking Ref');
      expect(html).toContain('Coach &amp; Seat / Berth');
      expect(html).toContain('Attach Ticket File (PDF or Screenshot - Saved Offline)');
      expect(html).toContain('Save Ticket');
      expect(html).toContain('Cancel');
    });
  });
});
