import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TicketPassCard } from '@/components/tickets/TicketPassCard';
import { BookingDocument } from '@/types/trip';

describe('TicketPassCard 3D Component', () => {
  const samplePass: BookingDocument = {
    id: 'pass-test-1',
    tripId: 'confirmed-trip',
    title: 'hyd -> shirdi',
    pnr: '4447190834',
    travelDate: '2026-11-17',
    coachSeat: 's3/64/su',
    totalAmount: 453.15,
    docType: 'Train Ticket',
    offlineCached: true,
    fileUrl: 'https://example.com/ticket.pdf',
    fileName: 'hyd_to_shirdi.pdf',
    createdAt: '2026-10-29T15:00:00Z',
    updatedAt: '2026-10-29T15:00:00Z',
  };

  it('renders all required transit fields: train number, train name, from/to places, timings, seat, and price', () => {
    const html = renderToStaticMarkup(
      React.createElement(TicketPassCard, {
        pass: samplePass,
      })
    );

    // 1. Train Number
    expect(html).toContain('#17002');

    // 2. Train Name
    expect(html).toContain('Shirdi Express');

    // 3. From and To Places & station codes
    expect(html).toContain('Secunderabad');
    expect(html).toContain('SC');
    expect(html).toContain('Shirdi');
    expect(html).toContain('SNSI');

    // 4. Timings
    expect(html).toContain('16:30');
    expect(html).toContain('09:15');

    // 5. Seat & Berth
    expect(html).toContain('Coach S3 · Berth 64');
    expect(html).toContain('Side Upper');

    // 6. Price / Fare
    expect(html).toContain('453.15');

    // 7. PNR
    expect(html).toContain('4447190834');

    // 8. Visual 3D elements
    expect(html).toContain('rounded-full bg-[#f3f7f5]'); // Perforation tear notch
    expect(html).toContain('IRCTC-PASS'); // Barcode aesthetic simulation
  });

  it('renders custom train number, name, and timings if explicitly provided', () => {
    const customPass: BookingDocument = {
      id: 'pass-custom',
      tripId: 'confirmed-trip',
      title: 'Okha Somnath Express',
      trainNumber: '19252',
      trainName: 'Okha Somnath Express',
      fromCity: 'Dwarka',
      toCity: 'Somnath',
      fromStationCode: 'DWK',
      toStationCode: 'SMNH',
      departureTime: '20:25',
      arrivalTime: '05:25',
      duration: '9h 00m',
      coachSeat: 'B1/14/LB',
      totalAmount: 640,
      pnr: '7766554433',
      travelDate: '2026-11-27',
      docType: 'Train Ticket',
      offlineCached: true,
      createdAt: '2026-10-29T15:00:00Z',
      updatedAt: '2026-10-29T15:00:00Z',
    };

    const html = renderToStaticMarkup(
      React.createElement(TicketPassCard, {
        pass: customPass,
      })
    );

    expect(html).toContain('#19252');
    expect(html).toContain('Okha Somnath Express');
    expect(html).toContain('Dwarka');
    expect(html).toContain('DWK');
    expect(html).toContain('Somnath');
    expect(html).toContain('SMNH');
    expect(html).toContain('20:25');
    expect(html).toContain('05:25');
    expect(html).toContain('640');
    expect(html).toContain('Coach B1 · Berth 14');
  });
});
