import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BudgetView } from '@/components/views/BudgetView';
import { INITIAL_TRIP, INITIAL_EXPENSES } from '@/lib/seed-data';
import { calculateBudget } from '@/lib/calculations';
import { Trip, Expense } from '@/types/trip';

describe('BudgetView Clean Initialization & Calculation Test', () => {
  it('1. Renders Budget Overview in clean unconfirmed state with "Budget not set" and 0 spending', () => {
    const budgetCalc = calculateBudget(INITIAL_TRIP, INITIAL_EXPENSES);
    const html = renderToStaticMarkup(
      React.createElement(BudgetView, {
        trip: INITIAL_TRIP,
        expenses: INITIAL_EXPENSES,
        budgetCalc,
        onAddExpense: () => {},
        onEditExpense: () => {},
        onDeleteExpense: () => {},
        onEditTripSettings: () => {},
      })
    );

    expect(html).toContain('Budget &amp; Expenses');
    expect(html).toContain('Track your trip expenses');
    expect(html).toContain('Total Budget');
    expect(html).toContain('Budget not set');
    expect(html).toContain('No Budget');
    expect(html).toContain('₹0');
    expect(html).toContain('No expenses recorded yet');
    expect(INITIAL_EXPENSES.length).toBe(0);
    expect(budgetCalc.totalBudget).toBe(0);
    expect(budgetCalc.totalSpent).toBe(0);
  });

  it('2. Correctly calculates financial numbers and category breakdown when expenses are recorded', () => {
    const userTrip: Trip = {
      ...INITIAL_TRIP,
      totalBudget: 50000,
    };

    const userExpenses: Expense[] = [
      {
        id: 'exp-test-1',
        tripId: userTrip.id,
        date: '2026-11-17',
        title: 'Train Ticket',
        amount: 850,
        category: 'Transport',
        paymentMethod: 'UPI',
        isCashInflow: false,
        createdAt: '2026-10-24T00:00:00.000Z',
        updatedAt: '2026-10-24T00:00:00.000Z',
      },
      {
        id: 'exp-test-2',
        tripId: userTrip.id,
        date: '2026-11-18',
        title: 'Shirdi Ashram Stay',
        amount: 600,
        category: 'Accommodation',
        paymentMethod: 'Cash',
        isCashInflow: false,
        createdAt: '2026-10-24T00:00:00.000Z',
        updatedAt: '2026-10-24T00:00:00.000Z',
      },
      {
        id: 'exp-test-3',
        tripId: userTrip.id,
        date: '2026-11-18',
        title: 'Prasad Meal',
        amount: 150,
        category: 'Food',
        paymentMethod: 'Cash',
        isCashInflow: false,
        createdAt: '2026-10-24T00:00:00.000Z',
        updatedAt: '2026-10-24T00:00:00.000Z',
      },
    ];

    const calc = calculateBudget(userTrip, userExpenses);
    expect(calc.totalBudget).toBe(50000);
    expect(calc.totalSpent).toBe(1600);
    expect(calc.availableBudget).toBe(48400);
    expect(calc.percentSpent).toBeCloseTo(3.2, 1);
  });
});
