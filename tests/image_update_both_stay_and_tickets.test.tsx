import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ViewAttachmentChooserModal } from '@/components/modals/ViewAttachmentChooserModal';
import { DocumentViewerModal } from '@/components/modals/DocumentViewerModal';
import { TransportView } from '@/components/views/TransportView';
import { AccommodationView } from '@/components/views/AccommodationView';
import { TicketsView } from '@/components/views/TicketsView';
import { BookingDocument, AccommodationStay, TransportLeg, Trip, ItineraryDay } from '@/types/trip';
import { INITIAL_TRIP, INITIAL_DAYS, INITIAL_STAYS, INITIAL_DOCUMENTS } from '@/lib/seed-data';

describe('Dual Attachment Update for Both Stays and Tickets', () => {
  const dummyTicket: BookingDocument = {
    id: 'ticket-shirdi-1',
    tripId: INITIAL_TRIP.id,
    title: 'hyd to shirdi',
    docType: 'Train Ticket',
    pnr: '4447190834',
    trainNumber: '17002',
    trainName: 'Secunderabad - Sainagar Shirdi Express',
    fromCity: 'Hyderabad / Secunderabad',
    toCity: 'Sainagar Shirdi',
    travelDate: '2026-11-17',
    totalAmount: 453.15,
    pdfBlob: 'data:application/pdf;base64,JVBERi0xLjQK...',
    pdfFileName: '4447190834.pdf',
    pdfFileSize: '84.8 KB',
    imageBlob: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
    imageFileName: '39058.jpg',
    imageFileSize: '1719.7 KB',
    fileName: '4447190834.pdf',
    fileSize: '84.8 KB',
    fileType: 'application/pdf',
    blobData: 'data:application/pdf;base64,JVBERi0xLjQK...',
    offlineCached: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  };

  const dummyStay: AccommodationStay = {
    id: 'stay-shirdi-1',
    tripId: INITIAL_TRIP.id,
    name: 'Shree Sai Ashram Dharamshala',
    stayType: 'Dharamshala',
    city: 'Shirdi',
    checkinDate: '2026-11-18',
    checkoutDate: '2026-11-19',
    estimatedCost: 500,
    totalAmount: 500,
    bookingStatus: 'Booked',
    status: 'Booked',
    pdfBlob: 'data:application/pdf;base64,JVBERi0xLjQK...',
    pdfFileName: 'shirdi_voucher.pdf',
    pdfFileSize: '120.4 KB',
    imageBlob: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
    imageFileName: 'shirdi_counter_slip.jpg',
    imageFileSize: '850.2 KB',
    documentName: 'shirdi_voucher.pdf',
    documentUrl: 'data:application/pdf;base64,JVBERi0xLjQK...',
    documentSize: '120.4 KB',
    imageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  };

  it('1. ViewAttachmentChooserModal provides Update Image and Update PDF buttons when files are attached', () => {
    const html = renderToStaticMarkup(
      React.createElement(ViewAttachmentChooserModal, {
        isOpen: true,
        item: dummyTicket,
        itemType: 'ticket',
        onSelectMode: () => {},
        onClose: () => {},
        onAttachFile: () => {},
      })
    );

    expect(html).toContain('Pass Photo / Screenshot (Image)');
    expect(html).toContain('39058.jpg');
    expect(html).toContain('Update Image');
    expect(html).toContain('View Image');

    expect(html).toContain('Official PDF Document');
    expect(html).toContain('4447190834.pdf');
    expect(html).toContain('Update PDF');
    expect(html).toContain('View PDF Document');
  });

  it('2. TransportView Edit Ticket Form renders both PDF Ticket slot with Change PDF and Photo slot with Change Image', () => {
    const html = renderToStaticMarkup(
      React.createElement(TransportView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        transportLegs: [],
        documents: [dummyTicket],
        initialTransportScreen: 'edit_ticket',
        initialSelectedTransportId: dummyTicket.id,
        onSaveDocument: () => {},
      })
    );

    expect(html).toContain('Official PDF Ticket (IRCTC / Bus e-Ticket)');
    expect(html).toContain('Change PDF');
    expect(html).toContain('4447190834.pdf');

    expect(html).toContain('Pass Photo / Screenshot (Mobile Pass or Physical Slip)');
    expect(html).toContain('Change Image');
    expect(html).toContain('39058.jpg');
  });

  it('3. TicketsView Edit Ticket Form renders dual attachments with Change PDF and Change Image', () => {
    const html = renderToStaticMarkup(
      React.createElement(TicketsView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        documents: [dummyTicket],
        initialScreen: 'edit',
        initialSelectedId: dummyTicket.id,
        onSaveDocument: () => {},
      })
    );

    expect(html).toContain('Official PDF Ticket (IRCTC / Bus e-Ticket)');
    expect(html).toContain('Change PDF');
    expect(html).toContain('Pass Photo / Screenshot (Mobile Pass or Physical Slip)');
    expect(html).toContain('Change Image');
  });

  it('4. AccommodationView Stay Form renders both Official Stay Voucher with Change Voucher and Stay Photo with Change Photo', () => {
    const html = renderToStaticMarkup(
      React.createElement(AccommodationView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        accommodations: [dummyStay],
        initialScreen: 'edit',
        initialSelectedStayId: dummyStay.id,
        onSaveStay: () => {},
      })
    );

    expect(html).toContain('Official Stay Voucher (PDF)');
    expect(html).toContain('Change Voucher');
    expect(html).toContain('shirdi_voucher.pdf');

    expect(html).toContain('Stay Photo / Check-in Slip (Image)');
    expect(html).toContain('Change Photo');
  });

  it('5. DocumentViewerModal renders in-viewer Update Photo and Update PDF buttons', () => {
    const imageViewerHtml = renderToStaticMarkup(
      React.createElement(DocumentViewerModal, {
        isOpen: true,
        document: dummyTicket,
        initialMode: 'image',
        onClose: () => {},
        onAttachFile: () => {},
      })
    );

    expect(imageViewerHtml).toContain('Update Photo');

    const pdfViewerHtml = renderToStaticMarkup(
      React.createElement(DocumentViewerModal, {
        isOpen: true,
        document: dummyTicket,
        initialMode: 'pdf',
        onClose: () => {},
        onAttachFile: () => {},
      })
    );

    expect(pdfViewerHtml).toContain('Update PDF');
  });
});
