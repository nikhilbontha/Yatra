import { describe, it, expect } from 'vitest';
import {
  parseCoachSeat,
  formatTransitDate,
  resolveTicketTransitDetails,
} from '@/lib/tickets-helper';
import { BookingDocument } from '@/types/trip';

describe('Transit Passes & E-Tickets Helper', () => {
  it('correctly parses coach and berth abbreviation: s3/64/su', () => {
    const res = parseCoachSeat('s3/64/su');
    expect(res.coach).toBe('S3');
    expect(res.seat).toBe('64');
    expect(res.berthType).toContain('Side Upper');
    expect(res.formatted).toBe('Coach S3 · Berth 64 (Side Upper (SU))');
    expect(res.inferredClass).toBe('Sleeper Class (SL)');
  });

  it('correctly parses AC 3-tier seat: B2/45/MB', () => {
    const res = parseCoachSeat('B2/45/MB');
    expect(res.coach).toBe('B2');
    expect(res.seat).toBe('45');
    expect(res.berthType).toContain('Middle Berth');
    expect(res.inferredClass).toBe('AC 3 Tier (3A)');
  });

  it('formats transit dates into readable English day and month', () => {
    const formatted = formatTransitDate('2026-11-17');
    expect(formatted).toContain('17 Nov 2026');
    expect(formatted).toContain('Tue');
  });

  it('intelligently resolves all requested fields for the user uploaded ticket: hyd -> shirdi', () => {
    const userDoc: BookingDocument = {
      id: 'doc-user-1',
      tripId: 'confirmed-yatra-2026',
      title: 'hyd -> shirdi',
      docType: 'Train Ticket',
      pnr: '4447190834',
      travelDate: '2026-11-17',
      coachSeat: 's3/64/su',
      totalAmount: 453.15,
      offlineCached: true,
      createdAt: '2026-10-29T15:00:00Z',
      updatedAt: '2026-10-29T15:00:00Z',
    };

    const details = resolveTicketTransitDetails(userDoc);

    // 1. Train Number
    expect(details.trainNumber).toBe('17002');

    // 2. Train Name
    expect(details.trainName).toContain('Shirdi Express');

    // 3. From and To Places & station codes
    expect(details.fromCity).toContain('Secunderabad');
    expect(details.fromStationCode).toBe('SC');
    expect(details.toCity).toContain('Shirdi');
    expect(details.toStationCode).toBe('SNSI');

    // 4. Timings
    expect(details.departureTime).toBe('16:30');
    expect(details.arrivalTime).toContain('09:15');

    // 5. Seat & Berth
    expect(details.coach).toBe('S3');
    expect(details.seat).toBe('64');
    expect(details.seatFormatted).toContain('Coach S3 · Berth 64');

    // 6. Price
    expect(details.priceFormatted).toBe('₹453.15');

    // 7. PNR and Date
    expect(details.pnr).toBe('4447190834');
    expect(details.travelDateDisplay).toContain('17 Nov 2026');
  });

  it('respects explicitly provided trainNumber, trainName, and timings when user edits ticket', () => {
    const customDoc: BookingDocument = {
      id: 'doc-custom',
      tripId: 'confirmed-yatra-2026',
      title: 'Tapovan Superfast Pass',
      docType: 'Train Ticket',
      trainNumber: '17618',
      trainName: 'Tapovan Superfast Express',
      fromCity: 'Chhatrapati Sambhajinagar',
      toCity: 'Nashik Road',
      departureTime: '06:15',
      arrivalTime: '09:45',
      pnr: '8877665544',
      travelDate: '2026-11-20',
      coachSeat: 'D1/12/WS',
      totalAmount: 185,
      offlineCached: true,
      createdAt: '2026-10-29T15:00:00Z',
      updatedAt: '2026-10-29T15:00:00Z',
    };

    const details = resolveTicketTransitDetails(customDoc);
    expect(details.trainNumber).toBe('17618');
    expect(details.trainName).toBe('Tapovan Superfast Express');
    expect(details.fromCity).toBe('Chhatrapati Sambhajinagar');
    expect(details.toCity).toBe('Nashik Road');
    expect(details.departureTime).toBe('06:15');
    expect(details.arrivalTime).toBe('09:45');
    expect(details.priceFormatted).toBe('₹185');
    expect(details.coach).toBe('D1');
    expect(details.seat).toBe('12');
  });
});

