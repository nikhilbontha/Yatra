import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BudgetView } from '@/components/views/BudgetView';
import { calculateBudget, formatRupee } from '@/lib/calculations';
import { Trip, Expense } from '@/types/trip';

describe('Phase 2 — Step 4: Budget & Expenses Module Verification Suite', () => {
  // Pristine confirmed pilgrimage trip where total budget has not yet been confirmed
  const unbudgetedTrip: Trip = {
    id: '00000000-0000-4000-8000-000000000001',
    title: 'Complete Jyotirlinga Pilgrimage Itinerary',
    origin: 'Hyderabad',
    destination: 'Khammam',
    startDate: '2026-11-17',
    endDate: '2026-12-05',
    totalBudget: 0, // Unconfirmed / not set
    emergencyReserve: 0,
    openingCash: 0,
    isActive: true,
    createdAt: '2026-10-24T00:00:00.000Z',
    updatedAt: '2026-10-24T00:00:00.000Z',
  };

  it('1. Displays "Budget not set" when user has not confirmed a trip budget (no invented budget)', () => {
    const budgetCalc = calculateBudget(unbudgetedTrip, []);
    const html = renderToStaticMarkup(
      React.createElement(BudgetView, {
        trip: unbudgetedTrip,
        expenses: [],
        budgetCalc,
        onAddExpense: () => {},
        onEditExpense: () => {},
        onDeleteExpense: () => {},
        onEditTripSettings: () => {},
      })
    );

    // Must show "Budget not set" rather than fabricated ₹1,00,000 or ₹0
    expect(html).toContain('Budget not set');
    expect(html).not.toContain('₹1,00,000');
    // Utilization percentage gauge must show '—' instead of NaN or 0% as though a budget existed
    expect(html).toContain('—');
    expect(html).toContain('No Budget');
  });

  it('2. Accurately displays ₹0 actual spending when no expenses are recorded', () => {
    const budgetCalc = calculateBudget(unbudgetedTrip, []);
    const html = renderToStaticMarkup(
      React.createElement(BudgetView, {
        trip: unbudgetedTrip,
        expenses: [],
        budgetCalc,
        onAddExpense: () => {},
        onEditExpense: () => {},
        onDeleteExpense: () => {},
        onEditTripSettings: () => {},
      })
    );

    expect(html).toContain('₹0');
    expect(budgetCalc.totalSpent).toBe(0);
  });

  it('3. Displays genuine empty states without fabricating fake transactions or sample cards', () => {
    const budgetCalc = calculateBudget(unbudgetedTrip, []);
    const html = renderToStaticMarkup(
      React.createElement(BudgetView, {
        trip: unbudgetedTrip,
        expenses: [],
        budgetCalc,
        onAddExpense: () => {},
        onEditExpense: () => {},
        onDeleteExpense: () => {},
        onEditTripSettings: () => {},
      })
    );

    // Empty state messages for recent expenses and daily spending
    expect(html).toContain('No expenses recorded yet');
    expect(html).toContain('No daily spending recorded yet');

    // Must NOT contain sample/fabricated transactions
    expect(html).not.toContain('sample-1');
    expect(html).not.toContain('sample-2');
  });

  it('4. Reconciles total spending strictly to the sum of saved expenses', () => {
    const genuineExpenses: Expense[] = [
      {
        id: 'exp-1',
        tripId: unbudgetedTrip.id,
        date: '2026-11-17',
        time: '06:00 AM',
        title: 'Train ticket to Manmad/Shirdi',
        amount: 850,
        category: 'Transport',
        paymentMethod: 'UPI',
        destination: 'Secunderabad → Shirdi',
        isCashInflow: false,
        createdAt: '2026-10-24T00:00:00.000Z',
        updatedAt: '2026-10-24T00:00:00.000Z',
      },
      {
        id: 'exp-2',
        tripId: unbudgetedTrip.id,
        date: '2026-11-18',
        time: '08:00 AM',
        title: 'Shirdi Ashram Dharamshala donation',
        amount: 500,
        category: 'Temple / donation',
        paymentMethod: 'Cash',
        destination: 'Shirdi',
        isCashInflow: false,
        createdAt: '2026-10-24T00:00:00.000Z',
        updatedAt: '2026-10-24T00:00:00.000Z',
      },
    ];

    const budgetCalc = calculateBudget(unbudgetedTrip, genuineExpenses);
    expect(budgetCalc.totalSpent).toBe(1350);

    const html = renderToStaticMarkup(
      React.createElement(BudgetView, {
        trip: unbudgetedTrip,
        expenses: genuineExpenses,
        budgetCalc,
        onAddExpense: () => {},
        onEditExpense: () => {},
        onDeleteExpense: () => {},
        onEditTripSettings: () => {},
      })
    );

    expect(html).toContain('₹1,350');
    expect(html).toContain('Train ticket to Manmad/Shirdi');
    expect(html).toContain('Shirdi Ashram Dharamshala donation');
  });

  it('5. Reconciles category breakdown totals strictly with total spending', () => {
    const genuineExpenses: Expense[] = [
      {
        id: 'exp-1',
        tripId: unbudgetedTrip.id,
        date: '2026-11-17',
        title: 'Train Ticket',
        amount: 1000,
        category: 'Transport',
        paymentMethod: 'UPI',
        isCashInflow: false,
        createdAt: '2026-10-24T00:00:00.000Z',
        updatedAt: '2026-10-24T00:00:00.000Z',
      },
      {
        id: 'exp-2',
        tripId: unbudgetedTrip.id,
        date: '2026-11-18',
        title: 'Temple Seva',
        amount: 500,
        category: 'Temple / donation',
        paymentMethod: 'Cash',
        isCashInflow: false,
        createdAt: '2026-10-24T00:00:00.000Z',
        updatedAt: '2026-10-24T00:00:00.000Z',
      },
    ];

    const budgetCalc = calculateBudget(unbudgetedTrip, genuineExpenses);
    const html = renderToStaticMarkup(
      React.createElement(BudgetView, {
        trip: unbudgetedTrip,
        expenses: genuineExpenses,
        budgetCalc,
        onAddExpense: () => {},
        onEditExpense: () => {},
        onDeleteExpense: () => {},
        onEditTripSettings: () => {},
      })
    );

    // Transport (1000 / 1500 = 67%) and Temple (500 / 1500 = 33%)
    expect(html).toContain('67%');
    expect(html).toContain('33%');
    expect(html).toContain('Transport (Train / Bus / Local)');
    expect(html).toContain('Temple donations and offerings');
  });

  it('6. Correctly computes remaining budget and utilization when planned budget is set', () => {
    const budgetedTrip: Trip = {
      ...unbudgetedTrip,
      totalBudget: 25000,
    };

    const expenses: Expense[] = [
      {
        id: 'exp-1',
        tripId: budgetedTrip.id,
        date: '2026-11-17',
        title: 'Train booking',
        amount: 5000,
        category: 'Transport',
        paymentMethod: 'UPI',
        isCashInflow: false,
        createdAt: '2026-10-24T00:00:00.000Z',
        updatedAt: '2026-10-24T00:00:00.000Z',
      },
    ];

    const budgetCalc = calculateBudget(budgetedTrip, expenses);
    const html = renderToStaticMarkup(
      React.createElement(BudgetView, {
        trip: budgetedTrip,
        expenses,
        budgetCalc,
        onAddExpense: () => {},
        onEditExpense: () => {},
        onDeleteExpense: () => {},
        onEditTripSettings: () => {},
      })
    );

    // Total: 25,000, Spent: 5,000, Remaining: 20,000, Percent: 20%
    expect(html).toContain('₹25,000');
    expect(html).toContain('₹5,000');
    expect(html).toContain('₹20,000');
    expect(html).toContain('20%');
  });

  it('7. Handles negative remaining budget safely when spending exceeds planned budget', () => {
    const overspentTrip: Trip = {
      ...unbudgetedTrip,
      totalBudget: 1000,
    };

    const expenses: Expense[] = [
      {
        id: 'exp-1',
        tripId: overspentTrip.id,
        date: '2026-11-17',
        title: 'Emergency taxi',
        amount: 1500,
        category: 'Transport',
        paymentMethod: 'Cash',
        isCashInflow: false,
        createdAt: '2026-10-24T00:00:00.000Z',
        updatedAt: '2026-10-24T00:00:00.000Z',
      },
    ];

    const budgetCalc = calculateBudget(overspentTrip, expenses);
    const html = renderToStaticMarkup(
      React.createElement(BudgetView, {
        trip: overspentTrip,
        expenses,
        budgetCalc,
        onAddExpense: () => {},
        onEditExpense: () => {},
        onDeleteExpense: () => {},
        onEditTripSettings: () => {},
      })
    );

    // Remaining: 1000 - 1500 = -500
    expect(html).toContain('-₹500');
    expect(html).toContain('150%');
  });

  it('8. Renders daily spending summary grouped chronologically by date', () => {
    const expenses: Expense[] = [
      {
        id: 'exp-1',
        tripId: unbudgetedTrip.id,
        date: '2026-11-17',
        title: 'Day 1 Meals',
        amount: 300,
        category: 'Food',
        paymentMethod: 'Cash',
        isCashInflow: false,
        createdAt: '2026-10-24T00:00:00.000Z',
        updatedAt: '2026-10-24T00:00:00.000Z',
      },
      {
        id: 'exp-2',
        tripId: unbudgetedTrip.id,
        date: '2026-11-17',
        title: 'Day 1 Water',
        amount: 50,
        category: 'Food',
        paymentMethod: 'UPI',
        isCashInflow: false,
        createdAt: '2026-10-24T00:00:00.000Z',
        updatedAt: '2026-10-24T00:00:00.000Z',
      },
      {
        id: 'exp-3',
        tripId: unbudgetedTrip.id,
        date: '2026-11-18',
        title: 'Day 2 Puja items',
        amount: 200,
        category: 'Temple / donation',
        paymentMethod: 'Cash',
        isCashInflow: false,
        createdAt: '2026-10-24T00:00:00.000Z',
        updatedAt: '2026-10-24T00:00:00.000Z',
      },
    ];

    const budgetCalc = calculateBudget(unbudgetedTrip, expenses);
    const html = renderToStaticMarkup(
      React.createElement(BudgetView, {
        trip: unbudgetedTrip,
        expenses,
        budgetCalc,
        onAddExpense: () => {},
        onEditExpense: () => {},
        onDeleteExpense: () => {},
        onEditTripSettings: () => {},
      })
    );

    expect(html).toContain('Daily Spending Summary');
    expect(html).toContain('17 Nov 2026 (Tue)');
    expect(html).toContain('₹350'); // 300 + 50
    expect(html).toContain('2 expenses recorded');
    expect(html).toContain('18 Nov 2026 (Wed)');
    expect(html).toContain('₹200');
  });

  it('9. Renders Trip Spending Progress across the 19-day trip', () => {
    const budgetCalc = calculateBudget(unbudgetedTrip, []);
    const html = renderToStaticMarkup(
      React.createElement(BudgetView, {
        trip: unbudgetedTrip,
        expenses: [],
        budgetCalc,
        onAddExpense: () => {},
        onEditExpense: () => {},
        onDeleteExpense: () => {},
        onEditTripSettings: () => {},
      })
    );

    expect(html).toContain('Trip Spending Progress (19 Days)');
    expect(html).toContain('17 Nov – 5 Dec 2026');
    expect(html).toContain('Actual Daily Avg');
    expect(html).toContain('Planned Daily Pace');
  });

  it('10. Provides clear Add Expense action linked to expense-entry flow', () => {
    const onAddExpenseSpy = vi.fn();
    const budgetCalc = calculateBudget(unbudgetedTrip, []);
    const html = renderToStaticMarkup(
      React.createElement(BudgetView, {
        trip: unbudgetedTrip,
        expenses: [],
        budgetCalc,
        onAddExpense: onAddExpenseSpy,
        onEditExpense: () => {},
        onDeleteExpense: () => {},
        onEditTripSettings: () => {},
      })
    );

    expect(html).toContain('Add Expense');
  });
});
