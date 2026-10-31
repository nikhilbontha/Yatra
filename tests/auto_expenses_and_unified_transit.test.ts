import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  syncStayExpense,
  deleteStayExpense,
  syncTransportExpense,
  deleteTransportExpense,
  syncTicketExpense,
  deleteTicketExpense,
} from '@/utils/autoExpenseSync';
import { TransportView } from '@/components/views/TransportView';
import { DocumentViewerModal } from '@/components/modals/DocumentViewerModal';
import { AccommodationStay, TransportLeg, BookingDocument, Expense } from '@/types/trip';
import { INITIAL_TRIP, INITIAL_DAYS, INITIAL_TRANSPORT, INITIAL_DOCUMENTS } from '@/lib/seed-data';

describe('Smart Auto-Expense Sync, Unified Transit & Tickets, and 3D Viewer Suite', () => {
  const sampleTripId = 'test-trip-auto-sync';

  // =========================================================================
  // TEST 1: ACCOMMODATION AUTO-EXPENSE SYNC
  // =========================================================================
  it('1. Automatically creates, updates, and deletes an expense when stay cost changes', () => {
    const stay: AccommodationStay = {
      id: 'stay-shirdi-101',
      tripId: sampleTripId,
      name: 'Sai Ashram Bhaktaniwas',
      city: 'Shirdi',
      stayType: 'Dharamshala',
      checkinDate: '2026-11-18',
      checkoutDate: '2026-11-19',
      estimatedCost: 500,
      totalAmount: 500,
      bookingStatus: 'Booked',
      status: 'Booked',
      capacityPersons: 1,
      createdAt: '2026-11-10T00:00:00Z',
      updatedAt: '2026-11-10T00:00:00Z',
    };

    const expensesList: Expense[] = [];

    // Step A: Initial creation of stay with cost 500
    const insertResult = syncStayExpense(stay, sampleTripId, expensesList);
    expect(insertResult).not.toBeNull();
    expect(insertResult?.action).toBe('insert');
    if (insertResult?.action === 'insert') {
      expect(insertResult.expense.amount).toBe(500);
      expect(insertResult.expense.category).toBe('Accommodation');
      expect(insertResult.expense.title).toContain('Sai Ashram Bhaktaniwas');
      expect(insertResult.expense.notes).toContain('[linked_stay:stay-shirdi-101]');
      expect(insertResult.expense.status).toBe('Paid');
      expensesList.push(insertResult.expense);
    }

    // Step B: Update stay cost to 750
    const updatedStay: AccommodationStay = {
      ...stay,
      totalAmount: 750,
      estimatedCost: 750,
    };
    const updateResult = syncStayExpense(updatedStay, sampleTripId, expensesList);
    expect(updateResult?.action).toBe('update');
    if (updateResult?.action === 'update') {
      expect(updateResult.expense.amount).toBe(750);
      expect(updateResult.expense.id).toBe(expensesList[0].id);
      expensesList[0] = updateResult.expense;
    }

    // Step C: Delete stay cleanly cascades to linked expense
    const deletedExpId = deleteStayExpense(stay.id, expensesList);
    expect(deletedExpId).toBe(expensesList[0].id);

    // Step D: When stay cost is set to 0, linked expense is deleted
    const zeroCostStay: AccommodationStay = {
      ...stay,
      totalAmount: 0,
      estimatedCost: 0,
    };
    const zeroResult = syncStayExpense(zeroCostStay, sampleTripId, expensesList);
    expect(zeroResult?.action).toBe('delete');
    if (zeroResult?.action === 'delete') {
      expect(zeroResult.expenseId).toBe(expensesList[0].id);
    }
  });

  // =========================================================================
  // TEST 2: TRANSPORT JOURNEY AUTO-EXPENSE SYNC
  // =========================================================================
  it('2. Automatically creates and updates an expense when transit journey fare is entered', () => {
    const leg: TransportLeg = {
      id: 'leg-hyd-shirdi-01',
      tripId: sampleTripId,
      fromLocation: 'Hyderabad',
      toLocation: 'Shirdi',
      mode: 'Train',
      trainName: 'Ajanta Express',
      fare: 380,
      status: 'Booked',
      needsVerification: false,
      date: '2026-11-17',
      createdAt: '2026-11-10T00:00:00Z',
      updatedAt: '2026-11-10T00:00:00Z',
    };

    const expensesList: Expense[] = [];

    // Step A: Insert transit expense
    const insertResult = syncTransportExpense(leg, sampleTripId, expensesList);
    expect(insertResult?.action).toBe('insert');
    if (insertResult?.action === 'insert') {
      expect(insertResult.expense.amount).toBe(380);
      expect(insertResult.expense.category).toBe('Transport');
      expect(insertResult.expense.title).toContain('Transit: Hyderabad → Shirdi');
      expect(insertResult.expense.notes).toContain('[linked_leg:leg-hyd-shirdi-01]');
      expect(insertResult.expense.status).toBe('Paid');
      expensesList.push(insertResult.expense);
    }

    // Step B: Update fare
    const legWithUpdatedFare: TransportLeg = {
      ...leg,
      fare: 450,
    };
    const updateResult = syncTransportExpense(legWithUpdatedFare, sampleTripId, expensesList);
    expect(updateResult?.action).toBe('update');
    if (updateResult?.action === 'update') {
      expect(updateResult.expense.amount).toBe(450);
      expensesList[0] = updateResult.expense;
    }

    // Step C: Delete journey cascades
    const deletedExpId = deleteTransportExpense(leg.id, expensesList);
    expect(deletedExpId).toBe(expensesList[0].id);
  });

  // =========================================================================
  // TEST 3: TRAVEL TICKET PASS AUTO-EXPENSE SYNC
  // =========================================================================
  it('3. Automatically creates and updates expense for travel tickets and boarding passes', () => {
    const doc: BookingDocument = {
      id: 'doc-irctc-17208',
      tripId: sampleTripId,
      title: 'IRCTC Sleeper Ticket to Shirdi',
      docType: 'Train Ticket',
      category: 'Travel Ticket',
      totalAmount: 420,
      pnr: '4521789632',
      travelDate: '2026-11-17',
      fileName: 'irctc_ticket.pdf',
      offlineCached: true,
      createdAt: '2026-11-10T00:00:00Z',
      updatedAt: '2026-11-10T00:00:00Z',
    };

    const expensesList: Expense[] = [];

    const insertResult = syncTicketExpense(doc, sampleTripId, expensesList);
    expect(insertResult?.action).toBe('insert');
    if (insertResult?.action === 'insert') {
      expect(insertResult.expense.amount).toBe(420);
      expect(insertResult.expense.category).toBe('Transport');
      expect(insertResult.expense.notes).toContain('[linked_ticket:doc-irctc-17208]');
      expensesList.push(insertResult.expense);
    }

    const deletedExpId = deleteTicketExpense(doc.id, expensesList);
    expect(deletedExpId).toBe(expensesList[0].id);
  });

  // =========================================================================
  // TEST 4: UNIFIED TRANSIT & TICKETS VIEW RENDER
  // =========================================================================
  it('4. Renders Unified Transit & Tickets View with filter tabs and pass integration', () => {
    const testDoc: BookingDocument = {
      id: 'doc-ticket-1',
      tripId: INITIAL_TRIP.id,
      title: 'Secunderabad to Shirdi Train Pass',
      docType: 'Train Ticket',
      category: 'Travel Ticket',
      pnr: '4521789632',
      fromCity: 'Secunderabad',
      toCity: 'Shirdi',
      travelDate: '2026-11-17',
      coachSeat: 'S4 / 45',
      totalAmount: 380,
      fileName: 'shirdi_pass.pdf',
      offlineCached: true,
      createdAt: '2026-11-10T00:00:00Z',
      updatedAt: '2026-11-10T00:00:00Z',
    };

    const html = renderToStaticMarkup(
      React.createElement(TransportView, {
        trip: INITIAL_TRIP,
        days: INITIAL_DAYS,
        transportLegs: INITIAL_TRANSPORT,
        documents: [testDoc],
        initialFilter: 'all',
      })
    );

    // Title & Header verification
    expect(html).toContain('Transport');
    expect(html).toContain('TRANSIT &amp; TICKETS');
    expect(html).toContain('All your travel journeys in one place');

    // Filter pills verification
    expect(html).toContain('All Transport');
    expect(html).toContain('Train');
    expect(html).toContain('Bus');
    expect(html).toContain('Tickets &amp; Passes');

    // Upload & Add buttons
    expect(html).toContain('Upload Pass');
    expect(html).toContain('Add Journey');

    // E-Ticket pass attached integration
    expect(html).toContain('Pass Attached');
    expect(html).toContain('View Pass');

    // Travel passes & e-tickets section
    expect(html).toContain('Travel Passes &amp; E-Tickets');
    expect(html).toContain('Secunderabad to Shirdi Train Pass');
  });

  // =========================================================================
  // TEST 5: 3D DOCUMENT VIEWER MODAL RENDER
  // =========================================================================
  it('5. Renders 3D In-App Document Viewer Modal for images and PDFs', () => {
    // Image document
    const imageDoc = {
      title: 'Aadhaar Card Scan',
      fileName: 'aadhaar_card.png',
      fileType: 'image/png',
      fileSize: '320 KB',
      blobData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      pnr: '1234-5678-9012',
    };

    const imageHtml = renderToStaticMarkup(
      React.createElement(DocumentViewerModal, {
        isOpen: true,
        document: imageDoc,
        onClose: () => {},
      })
    );

    expect(imageHtml).toContain('Aadhaar Card Scan');
    expect(imageHtml).toContain('aadhaar_card.png');
    expect(imageHtml).toContain('320 KB');
    expect(imageHtml).toContain('Zoom In');
    expect(imageHtml).toContain('Download');
    expect(imageHtml).toContain('Offline Encrypted');

    // PDF document
    const pdfDoc = {
      title: 'IRCTC Boarding Ticket',
      fileName: 'irctc_shirdi.pdf',
      fileType: 'application/pdf',
      fileSize: '540 KB',
      blobData: 'data:application/pdf;base64,JVBERi0xLjQKJ',
      pnr: '4521789632',
    };

    const pdfHtml = renderToStaticMarkup(
      React.createElement(DocumentViewerModal, {
        isOpen: true,
        document: pdfDoc,
        onClose: () => {},
      })
    );

    expect(pdfHtml).toContain('IRCTC Boarding Ticket');
    expect(pdfHtml).toContain('PNR / Ref: 4521789632');
    expect(pdfHtml).toContain('iframe');
  });
});
