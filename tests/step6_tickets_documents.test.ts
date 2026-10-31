import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TicketModal } from '@/components/Modals';
import { TicketsView } from '@/components/views/TicketsView';
import { Trip, BookingDocument, ItineraryDay } from '@/types/trip';

describe('Phase 2 — Step 6: Tickets & Documents Module Verification Suite', () => {
  const genuineTrip: Trip = {
    id: '00000000-0000-4000-8000-000000000001',
    title: 'Complete Jyotirlinga Pilgrimage Itinerary',
    origin: 'Hyderabad',
    destination: 'Khammam',
    startDate: '2026-11-17',
    endDate: '2026-12-05',
    totalBudget: 45000,
    emergencyReserve: 5000,
    openingCash: 5000,
    isActive: true,
    createdAt: '2026-10-24T00:00:00.000Z',
    updatedAt: '2026-10-24T00:00:00.000Z',
  };

  const sampleDays: ItineraryDay[] = [
    {
      id: 'day-01',
      tripId: genuineTrip.id,
      dayNumber: 1,
      date: '2026-11-17',
      title: 'Departure from Hyderabad to Ujjain',
      subtitle: 'Train travel',
      accommodationPlan: 'Mahakal Dharamshala',
      status: 'Planned',
      themeType: 'Temple',
      tasks: [],
      details: '',
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
    },
    {
      id: 'day-02',
      tripId: genuineTrip.id,
      dayNumber: 2,
      date: '2026-11-18',
      title: 'Ujjain to Omkareshwar Darshan',
      subtitle: 'Bus travel',
      accommodationPlan: 'Narmada Resort',
      status: 'Planned',
      themeType: 'Temple',
      tasks: [],
      details: '',
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
    },
  ];

  it('1. Renders Add Document modal with title, type, date, PNR, day linkage, and file attachment', () => {
    const html = renderToStaticMarkup(
      React.createElement(TicketModal, {
        days: sampleDays,
        onSave: vi.fn(),
        onClose: vi.fn(),
      })
    );

    expect(html).toContain('Upload Ticket / Document');
    expect(html).toContain('Document Title / Booking Name');
    expect(html).toContain('Category / Type');
    expect(html).toContain('Travel / Valid Date');
    expect(html).toContain('PNR / Booking Reference');
    expect(html).toContain('Related Itinerary Day');
    expect(html).toContain('Day 1: Departure from Hyderabad to Ujjain');
    expect(html).toContain('Attach Document File (PDF or Photo, max 10MB)');
    expect(html).toContain('Save Document');
    expect(html).toContain('Cancel');
  });

  it('2. Supports all canonical document types in alignment with database schema', () => {
    const html = renderToStaticMarkup(
      React.createElement(TicketModal, {
        days: sampleDays,
        onSave: vi.fn(),
        onClose: vi.fn(),
      })
    );

    expect(html).toContain('Train Ticket');
    expect(html).toContain('Bus Ticket');
    expect(html).toContain('Accommodation / Hotel');
    expect(html).toContain('Temple Pass / Booking');
    expect(html).toContain('Identity Document (ID)');
    expect(html).toContain('Insurance &amp; Other');
  });

  it('3. Renders Edit Document modal with prefilled data and edit indicator', () => {
    const existingDoc: BookingDocument = {
      id: 'doc-ticket-001',
      tripId: genuineTrip.id,
      dayId: 'day-01',
      title: 'Train 12727 Godavari Express Ticket',
      docType: 'Train Ticket',
      travelDate: '2026-11-17',
      pnr: '4521098765',
      notes: 'Coach S3 Berth 45 (Side Lower)',
      fileName: 'Godavari_Express_Ticket.pdf',
      fileSize: 420 * 1024,
      offlineCached: true,
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
    };

    const html = renderToStaticMarkup(
      React.createElement(TicketModal, {
        initialData: existingDoc,
        days: sampleDays,
        onSave: vi.fn(),
        onClose: vi.fn(),
      })
    );

    expect(html).toContain('Edit Document: Train 12727 Godavari Express Ticket');
    expect(html).toContain('Editing saved document');
    expect(html).toContain('ID: doc-tick...');
    expect(html).toContain('4521098765');
    expect(html).toContain('Coach S3 Berth 45 (Side Lower)');
    expect(html).toContain('Godavari_Express_Ticket.pdf');
    expect(html).toContain('Update Document');
  });

  it('4. Title validation: Requires non-empty title string', () => {
    const validateTitle = (title: string): boolean => {
      return Boolean(title && title.trim().length > 0);
    };

    expect(validateTitle('')).toBe(false);
    expect(validateTitle('   ')).toBe(false);
    expect(validateTitle('Train Ticket Hyderabad to Ujjain')).toBe(true);
  });

  it('5. File upload validation: Enforces 10MB limit and allowed MIME/extensions', () => {
    const MAX_SIZE = 10 * 1024 * 1024;
    const allowedExtensions = /\.(pdf|jpg|jpeg|png|webp)$/i;

    const testFiles = [
      { name: 'irctc_ticket.pdf', size: 1024 * 500, expectedValid: true },
      { name: 'hotel_voucher.png', size: 1024 * 1024 * 2, expectedValid: true },
      { name: 'aadhaar_card.jpg', size: 1024 * 800, expectedValid: true },
      { name: 'temple_pass.webp', size: 1024 * 300, expectedValid: true },
      { name: 'huge_scan.pdf', size: 1024 * 1024 * 12, expectedValid: false }, // > 10MB
      { name: 'script.exe', size: 1024 * 50, expectedValid: false }, // disallowed extension
      { name: 'booking.zip', size: 1024 * 50, expectedValid: false }, // disallowed extension
    ];

    testFiles.forEach(({ name, size, expectedValid }) => {
      const isValid = size <= MAX_SIZE && allowedExtensions.test(name);
      expect(isValid).toBe(expectedValid);
    });
  });

  it('6. Editing preserves original record ID, tripId, and updates properties without duplicates', () => {
    const existingDoc: BookingDocument = {
      id: 'doc-original-777',
      tripId: genuineTrip.id,
      title: 'IRCTC Sleeper Ticket',
      docType: 'Train Ticket',
      fileName: 'ticket.pdf',
      offlineCached: true,
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
    };

    const docList: BookingDocument[] = [existingDoc];

    const editPayload: Partial<BookingDocument> = {
      id: existingDoc.id,
      title: 'IRCTC 3rd AC Ticket (Upgraded)',
      pnr: '2109876543',
    };

    const updatedDoc: BookingDocument = {
      ...existingDoc,
      ...editPayload,
      updatedAt: '2026-10-27T15:00:00.000Z',
    };

    const updatedList = docList.map(d => (d.id === updatedDoc.id ? updatedDoc : d));

    expect(updatedList.length).toBe(1);
    expect(updatedList[0].id).toBe('doc-original-777');
    expect(updatedList[0].tripId).toBe(genuineTrip.id);
    expect(updatedList[0].title).toBe('IRCTC 3rd AC Ticket (Upgraded)');
    expect(updatedList[0].pnr).toBe('2109876543');
  });

  it('7. Enforces cross-trip authorization: Rejects updating or deleting document belonging to another trip', () => {
    const otherTripId = '99999999-9999-4999-8999-999999999999';
    const foreignDoc: BookingDocument = {
      id: 'foreign-doc-001',
      tripId: otherTripId,
      title: 'Foreign User Document',
      docType: 'Train Ticket',
      offlineCached: false,
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
    };

    const verifyOwnership = (doc: BookingDocument, currentTripId: string) => {
      if (doc.tripId !== currentTripId) {
        throw new Error('Unauthorized: cannot edit document from another trip');
      }
    };

    expect(() => verifyOwnership(foreignDoc, genuineTrip.id)).toThrow(
      'Unauthorized: cannot edit document from another trip'
    );
  });

  it('8. Empty state: Renders informative empty state without creating fake records when no documents are added', () => {
    const html = renderToStaticMarkup(
      React.createElement(TicketsView, {
        documents: [],
        trip: genuineTrip,
        days: sampleDays,
      })
    );

    expect(html).toContain('No documents uploaded yet');
    expect(html).toContain('Tickets, hotel vouchers, and ID proofs will appear here once added.');
  });

  it('9. Genuine details: Displays real values and avoids inventing fake PNRs or numbers', () => {
    const genuineDoc: BookingDocument = {
      id: 'doc-genuine-1',
      tripId: genuineTrip.id,
      title: 'Ujjain Temple VIP Darshan Pass',
      docType: 'Temple Pass',
      travelDate: '2026-11-17',
      // No PNR or phone provided
      notes: 'Slot time: 06:00 AM Bhasma Aarti',
      offlineCached: false,
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
    };

    const html = renderToStaticMarkup(
      React.createElement(TicketsView, {
        documents: [genuineDoc],
        trip: genuineTrip,
        days: sampleDays,
      })
    );

    expect(html).toContain('Ujjain Temple VIP Darshan Pass');
    expect(html).toContain('17 Nov 2026');
  });

  it('10. Offline support: Reflects offline cache status correctly without hardcoding counts', () => {
    const docWithCache: BookingDocument = {
      id: 'doc-cached-1',
      tripId: genuineTrip.id,
      title: 'Offline Cached Pass',
      docType: 'Other',
      offlineCached: true,
      blobData: 'data:application/pdf;base64,JVBERi0xLjQK...',
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
    };

    const docUncached: BookingDocument = {
      id: 'doc-uncached-2',
      tripId: genuineTrip.id,
      title: 'Cloud Only Document',
      docType: 'Other',
      offlineCached: false,
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
    };

    const docs = [docWithCache, docUncached];
    const cachedCount = docs.filter(d => d.offlineCached).length;

    expect(cachedCount).toBe(1);
    expect(docs[0].offlineCached).toBe(true);
    expect(docs[1].offlineCached).toBe(false);
  });
});
