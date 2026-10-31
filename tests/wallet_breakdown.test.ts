import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BudgetView } from '@/components/views/BudgetView';
import { calculateBudget } from '@/lib/calculations';
import { Trip, Expense } from '@/types/trip';

describe('Payment Modes & Cash Balances (UPI, Hand Cash, Emergency Reserve)', () => {
  const sampleTrip: Trip = {
    id: 'test-trip-wallet',
    title: 'Complete Jyotirlinga Pilgrimage',
    origin: 'Hyderabad, Telangana',
    destination: 'Khammam, Telangana',
    startDate: '2026-11-17',
    endDate: '2026-12-05',
    totalBudget: 12000,
    openingCash: 3500,
    emergencyReserve: 1500,
    totalUpiAmount: 7000,
    isActive: true,
    createdAt: '2026-10-28T00:00:00.000Z',
    updatedAt: '2026-10-28T00:00:00.000Z',
  };

  it('1. Renders the separate box with Total UPI Amount, Remaining UPI Amount, Total Hand Cash, Remaining Hand Cash, and Emergency Reserve', () => {
    const budgetCalc = calculateBudget(sampleTrip, []);
    const html = renderToStaticMarkup(
      React.createElement(BudgetView, {
        trip: sampleTrip,
        expenses: [],
        budgetCalc,
        onAddExpense: () => {},
        onEditExpense: () => {},
        onDeleteExpense: () => {},
        onEditTripSettings: () => {},
      })
    );

    // Box header
    expect(html).toContain('Payment Modes &amp; Cash Balances');

    // UPI metrics
    expect(html).toContain('Total UPI Amount');
    expect(html).toContain('Remaining UPI Amount');
    expect(html).toContain('₹7,000');

    // Hand cash metrics
    expect(html).toContain('Total Hand Cash');
    expect(html).toContain('Remaining Hand Cash');
    expect(html).toContain('₹3,500');

    // Emergency reserve
    expect(html).toContain('Emergency Reserve');
    expect(html).toContain('₹1,500');
    expect(html).toContain('Protected &amp; Untouched');
  });

  it('2. Dynamically updates Remaining UPI Amount and Remaining Hand Cash as expenses are recorded', () => {
    const expenses: Expense[] = [
      {
        id: 'exp-1',
        tripId: sampleTrip.id,
        title: 'Shirdi Train Ticket',
        amount: 800,
        category: 'Transport',
        paymentMethod: 'UPI',
        date: '2026-11-17',
        isCashInflow: false,
        createdAt: '2026-10-28T00:00:00.000Z',
        updatedAt: '2026-10-28T00:00:00.000Z',
      },
      {
        id: 'exp-2',
        tripId: sampleTrip.id,
        title: 'Local Auto in Shirdi',
        amount: 300,
        category: 'Transport',
        paymentMethod: 'Cash',
        date: '2026-11-18',
        isCashInflow: false,
        createdAt: '2026-10-28T00:00:00.000Z',
        updatedAt: '2026-10-28T00:00:00.000Z',
      },
    ];

    const budgetCalc = calculateBudget(sampleTrip, expenses);
    const html = renderToStaticMarkup(
      React.createElement(BudgetView, {
        trip: sampleTrip,
        expenses,
        budgetCalc,
        onAddExpense: () => {},
        onEditExpense: () => {},
        onDeleteExpense: () => {},
        onEditTripSettings: () => {},
      })
    );

    // Remaining UPI should be ₹7,000 - ₹800 = ₹6,200
    expect(html).toContain('₹6,200');
    expect(html).toContain('Spent via UPI:');
    expect(html).toContain('₹800');

    // Remaining Hand Cash should be ₹3,500 - ₹300 = ₹3,200
    expect(html).toContain('₹3,200');
    expect(html).toContain('Spent in Cash:');
    expect(html).toContain('₹300');
  });
});

