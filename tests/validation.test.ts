import { describe, it, expect } from 'vitest';
import {
  tripSchema,
  expenseSchema,
  itineraryDaySchema,
  bookingDocumentSchema,
} from '@/lib/validation';

describe('Zod Validation Schemas', () => {
  it('validates a valid trip configuration', () => {
    const validTrip = {
      title: 'Complete Jyotirlinga Pilgrimage',
      origin: 'Hyderabad',
      destination: 'Khammam',
      startDate: '2026-11-17',
      endDate: '2026-12-05',
      totalBudget: 25000,
      emergencyReserve: 5000,
      openingCash: 8000,
      isActive: true,
    };
    const parsed = tripSchema.safeParse(validTrip);
    expect(parsed.success).toBe(true);
  });

  it('rejects an invalid trip where end date is before start date', () => {
    const invalidTrip = {
      title: 'Complete Jyotirlinga Pilgrimage',
      origin: 'Hyderabad',
      destination: 'Khammam',
      startDate: '2026-12-05',
      endDate: '2026-11-17', // earlier than start date
      totalBudget: 25000,
      emergencyReserve: 5000,
      openingCash: 8000,
    };
    const parsed = tripSchema.safeParse(invalidTrip);
    expect(parsed.success).toBe(false);
  });

  it('rejects a negative trip budget', () => {
    const invalidTrip = {
      title: 'Complete Jyotirlinga Pilgrimage',
      origin: 'Hyderabad',
      destination: 'Khammam',
      startDate: '2026-11-17',
      endDate: '2026-12-05',
      totalBudget: -500,
      emergencyReserve: 0,
      openingCash: 0,
    };
    const parsed = tripSchema.safeParse(invalidTrip);
    expect(parsed.success).toBe(false);
  });

  it('validates a correct expense item', () => {
    const validExpense = {
      tripId: 'e7a1b32d-9831-4fa2-8b43-96b61df30191',
      date: '2026-11-18',
      title: 'Thali at Shirdi',
      amount: 180,
      category: 'Food',
      paymentMethod: 'Cash',
      destination: 'Shirdi',
      isCashInflow: false,
    };
    const parsed = expenseSchema.safeParse(validExpense);
    expect(parsed.success).toBe(true);
  });

  it('rejects an expense with zero or negative amount', () => {
    const zeroExpense = {
      tripId: 'e7a1b32d-9831-4fa2-8b43-96b61df30191',
      date: '2026-11-18',
      title: 'Thali at Shirdi',
      amount: 0,
      category: 'Food',
      paymentMethod: 'Cash',
    };
    expect(expenseSchema.safeParse(zeroExpense).success).toBe(false);

    const negativeExpense = { ...zeroExpense, amount: -150 };
    expect(expenseSchema.safeParse(negativeExpense).success).toBe(false);
  });

  it('rejects documents that exceed maximum allowed size', () => {
    const oversizedDoc = {
      tripId: 'e7a1b32d-9831-4fa2-8b43-96b61df30191',
      title: 'Oversized Scan',
      docType: 'Train Ticket',
      fileName: 'huge.pdf',
      fileSize: 15 * 1024 * 1024, // 15MB (> 10MB limit)
    };
    const parsed = bookingDocumentSchema.safeParse(oversizedDoc);
    expect(parsed.success).toBe(false);
  });
});
