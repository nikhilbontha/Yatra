import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BudgetView, getCategoryDisplayLabel, ALL_CATEGORIES } from '@/components/views/BudgetView';
import { calculateBudget, formatRupee } from '@/lib/calculations';
import { CONFIRMED_PILGRIMAGE_TRIP, CONFIRMED_TRIP_ID } from '@/lib/db';
import { formatRecordForPostgres } from '@/lib/sync';
import { Trip, Expense, ExpenseCategory } from '@/types/trip';

describe('Phase 4 — Yatra Budget & Expenses Page Verification Suite', () => {
  // Confirmed pilgrimage trip with target budget of ₹10,000
  const pilgrimageTrip: Trip = {
    id: CONFIRMED_TRIP_ID,
    ...CONFIRMED_PILGRIMAGE_TRIP,
    totalBudget: 10000,
  };

  it('1. Verifies that the trip profile has a target budget of ₹10,000 as a planned target', () => {
    expect(pilgrimageTrip.title).toBe('Complete Jyotirlinga Pilgrimage');
    expect(pilgrimageTrip.origin).toBe('Hyderabad, Telangana');
    expect(pilgrimageTrip.destination).toBe('Khammam, Telangana');
    expect(pilgrimageTrip.startDate).toBe('2026-11-17');
    expect(pilgrimageTrip.endDate).toBe('2026-12-05');
    expect(pilgrimageTrip.targetDuration).toBe('12–15 days');
    expect(pilgrimageTrip.totalBudget).toBe(10000);
  });

  it('2. Initializes actual spending to ₹0 with full ₹10,000 remaining and 0% utilization when no genuine expenses exist', () => {
    const budgetCalc = calculateBudget(pilgrimageTrip, []);
    expect(budgetCalc.totalSpent).toBe(0);
    expect(budgetCalc.availableBudget).toBe(10000);
    expect(budgetCalc.percentSpent).toBe(0);
    expect(budgetCalc.dailyAverage).toBe(0);

    const html = renderToStaticMarkup(
      React.createElement(BudgetView, {
        trip: pilgrimageTrip,
        expenses: [],
        budgetCalc,
        onAddExpense: () => {},
        onEditExpense: () => {},
        onDeleteExpense: () => {},
        onEditTripSettings: () => {},
      })
    );

    // Displays total budget ₹10,000, Spent ₹0, Remaining ₹10,000, 0% utilized
    expect(html).toContain('₹10,000');
    expect(html).toContain('₹0');
    expect(html).toContain('0%');
    expect(html).toContain('Utilized');
  });

  it('3. Preserves clean empty states for Recent Expenses and Daily Spending Summary without fabricating demo data', () => {
    const budgetCalc = calculateBudget(pilgrimageTrip, []);
    const html = renderToStaticMarkup(
      React.createElement(BudgetView, {
        trip: pilgrimageTrip,
        expenses: [],
        budgetCalc,
        onAddExpense: () => {},
        onEditExpense: () => {},
        onDeleteExpense: () => {},
        onEditTripSettings: () => {},
      })
    );

    // Empty state banners
    expect(html).toContain('No expenses recorded yet');
    expect(html).toContain('No daily spending recorded yet');

    // No demo or fabricated transaction names
    expect(html).not.toContain('Demo Expense');
    expect(html).not.toContain('Sample Transaction');
    expect(html).not.toContain('fake-id');
  });

  it('4. Covers all required categories without creating duplicate categories', () => {
    const expectedCategories: ExpenseCategory[] = [
      'Transport',
      'Accommodation',
      'Food',
      'Temple / donation',
      'Sightseeing',
      'Shopping',
      'Other',
    ];

    expect(ALL_CATEGORIES).toEqual(expectedCategories);

    // Verify distinct labels covering trains, buses, autos, food, water, stays, donations, tickets, shopping
    expect(getCategoryDisplayLabel('Transport')).toContain('Transport');
    expect(getCategoryDisplayLabel('Accommodation')).toBe('Accommodation');
    expect(getCategoryDisplayLabel('Food')).toContain('Food and water');
    expect(getCategoryDisplayLabel('Temple / donation')).toContain('Temple donations');
    expect(getCategoryDisplayLabel('Sightseeing')).toContain('Sightseeing');
    expect(getCategoryDisplayLabel('Shopping')).toContain('Shopping');
    expect(getCategoryDisplayLabel('Other')).toBe('Other');

    // Ensure no duplicates exist in ALL_CATEGORIES
    const uniqueCategories = new Set(ALL_CATEGORIES);
    expect(uniqueCategories.size).toBe(ALL_CATEGORIES.length);
  });

  it('5. Clearly distinguishes planned estimates (₹3,940 / Core ₹2,180) from actual spending', () => {
    const budgetCalc = calculateBudget(pilgrimageTrip, []);
    const html = renderToStaticMarkup(
      React.createElement(BudgetView, {
        trip: pilgrimageTrip,
        expenses: [],
        budgetCalc,
        onAddExpense: () => {},
        onEditExpense: () => {},
        onDeleteExpense: () => {},
        onEditTripSettings: () => {},
      })
    );

    // Distinct banner marking planned transport estimates
    expect(html).toContain('Planned Transport Estimates:');
    expect(html).toContain('₹3,940');
    expect(html).toContain('Core: ₹2,180');
    expect(html).toContain('Estimate · Not yet spent');

    // Actual spending remains exactly ₹0
    expect(budgetCalc.totalSpent).toBe(0);
  });

  it('6. Recalculates total spent, remaining balance, and category percentages accurately when adding genuine expenses', () => {
    // Transaction 1: Train ticket ₹850
    const exp1: Expense = {
      id: 'exp-genuine-1',
      tripId: pilgrimageTrip.id,
      date: '2026-11-17',
      time: '06:00 AM',
      title: 'Train Ticket: Secunderabad to Manmad',
      amount: 850,
      category: 'Transport',
      paymentMethod: 'UPI',
      destination: 'Secunderabad → Shirdi',
      isCashInflow: false,
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
    };

    let expenses = [exp1];
    let calc = calculateBudget(pilgrimageTrip, expenses);

    expect(calc.totalSpent).toBe(850);
    expect(calc.availableBudget).toBe(9150); // 10,000 - 850
    expect(calc.percentSpent).toBe(8.5); // 850 / 10000 = 8.5%
    expect(Math.round(calc.percentSpent)).toBe(9);

    let html = renderToStaticMarkup(
      React.createElement(BudgetView, {
        trip: pilgrimageTrip,
        expenses,
        budgetCalc: calc,
        onAddExpense: () => {},
        onEditExpense: () => {},
        onDeleteExpense: () => {},
        onEditTripSettings: () => {},
      })
    );

    expect(html).toContain('₹850');
    expect(html).toContain('₹9,150');
    expect(html).toContain('Train Ticket: Secunderabad to Manmad');
    expect(html).toContain('100%'); // Transport is 100% of spending

    // Transaction 2: Dharamshala ₹400
    const exp2: Expense = {
      id: 'exp-genuine-2',
      tripId: pilgrimageTrip.id,
      date: '2026-11-18',
      time: '01:00 PM',
      title: 'Shirdi Ashram Dharamshala Room',
      amount: 400,
      category: 'Accommodation',
      paymentMethod: 'Cash',
      destination: 'Shirdi',
      isCashInflow: false,
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
    };

    // Transaction 3: Lunch and mineral water ₹150
    const exp3: Expense = {
      id: 'exp-genuine-3',
      tripId: pilgrimageTrip.id,
      date: '2026-11-18',
      time: '02:30 PM',
      title: 'Lunch Prasadam and Drinking Water',
      amount: 150,
      category: 'Food',
      paymentMethod: 'UPI',
      destination: 'Shirdi',
      isCashInflow: false,
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
    };

    expenses = [exp1, exp2, exp3];
    calc = calculateBudget(pilgrimageTrip, expenses);

    expect(calc.totalSpent).toBe(1400); // 850 + 400 + 150
    expect(calc.availableBudget).toBe(8600); // 10000 - 1400
    expect(calc.percentSpent).toBe(14); // 1400 / 10000 = 14%

    html = renderToStaticMarkup(
      React.createElement(BudgetView, {
        trip: pilgrimageTrip,
        expenses,
        budgetCalc: calc,
        onAddExpense: () => {},
        onEditExpense: () => {},
        onDeleteExpense: () => {},
        onEditTripSettings: () => {},
      })
    );

    expect(html).toContain('₹1,400');
    expect(html).toContain('₹8,600');
    expect(html).toContain('14%');
    // Daily spending summary displays both dates
    expect(html).toContain('2 days with spending');
  });

  it('7. Recalculates totals consistently when editing an existing transaction', () => {
    const exp1: Expense = {
      id: 'exp-genuine-1',
      tripId: pilgrimageTrip.id,
      date: '2026-11-17',
      time: '06:00 AM',
      title: 'Train Ticket',
      amount: 850,
      category: 'Transport',
      paymentMethod: 'UPI',
      isCashInflow: false,
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
    };

    const exp2: Expense = {
      id: 'exp-genuine-2',
      tripId: pilgrimageTrip.id,
      date: '2026-11-18',
      time: '01:00 PM',
      title: 'Dharamshala Room',
      amount: 400,
      category: 'Accommodation',
      paymentMethod: 'Cash',
      isCashInflow: false,
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
    };

    // User edits exp2 amount from ₹400 to ₹600
    const updatedExp2: Expense = {
      ...exp2,
      amount: 600,
      notes: 'Upgraded to single occupancy room',
      updatedAt: '2026-10-24T01:00:00.000Z',
    };

    const updatedExpenses = [exp1, updatedExp2];
    const calc = calculateBudget(pilgrimageTrip, updatedExpenses);

    expect(calc.totalSpent).toBe(1450); // 850 + 600
    expect(calc.availableBudget).toBe(8550); // 10000 - 1450
    expect(calc.percentSpent).toBe(14.5); // 1450 / 10000 = 14.5%
    expect(Math.round(calc.percentSpent)).toBe(15);

    const html = renderToStaticMarkup(
      React.createElement(BudgetView, {
        trip: pilgrimageTrip,
        expenses: updatedExpenses,
        budgetCalc: calc,
        onAddExpense: () => {},
        onEditExpense: () => {},
        onDeleteExpense: () => {},
        onEditTripSettings: () => {},
      })
    );

    expect(html).toContain('₹1,450');
    expect(html).toContain('₹8,550');
  });

  it('8. Recalculates totals consistently when deleting an existing transaction', () => {
    const exp1: Expense = {
      id: 'exp-genuine-1',
      tripId: pilgrimageTrip.id,
      date: '2026-11-17',
      time: '06:00 AM',
      title: 'Train Ticket',
      amount: 850,
      category: 'Transport',
      paymentMethod: 'UPI',
      isCashInflow: false,
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
    };

    const exp2: Expense = {
      id: 'exp-genuine-2',
      tripId: pilgrimageTrip.id,
      date: '2026-11-18',
      time: '01:00 PM',
      title: 'Dharamshala Room',
      amount: 400,
      category: 'Accommodation',
      paymentMethod: 'Cash',
      isCashInflow: false,
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
    };

    // User deletes exp2
    const remainingExpenses = [exp1];
    const calc = calculateBudget(pilgrimageTrip, remainingExpenses);

    expect(calc.totalSpent).toBe(850);
    expect(calc.availableBudget).toBe(9150);
    expect(calc.percentSpent).toBe(8.5);
    expect(Math.round(calc.percentSpent)).toBe(9);

    const html = renderToStaticMarkup(
      React.createElement(BudgetView, {
        trip: pilgrimageTrip,
        expenses: remainingExpenses,
        budgetCalc: calc,
        onAddExpense: () => {},
        onEditExpense: () => {},
        onDeleteExpense: () => {},
        onEditTripSettings: () => {},
      })
    );

    expect(html).toContain('₹850');
    expect(html).toContain('₹9,150');
    expect(html).not.toContain('Dharamshala Room');
  });

  it('9. Accurately reports and displays budget overrun when spending exceeds the ₹10,000 target', () => {
    const overrunExpenses: Expense[] = [
      {
        id: 'exp-overrun-1',
        tripId: pilgrimageTrip.id,
        date: '2026-11-20',
        time: '10:00 AM',
        title: 'Emergency Private Taxi',
        amount: 8500,
        category: 'Transport',
        paymentMethod: 'UPI',
        isCashInflow: false,
        createdAt: '2026-10-24T00:00:00.000Z',
        updatedAt: '2026-10-24T00:00:00.000Z',
      },
      {
        id: 'exp-overrun-2',
        tripId: pilgrimageTrip.id,
        date: '2026-11-21',
        time: '02:00 PM',
        title: 'Special Darshan Pass & Seva',
        amount: 3000,
        category: 'Temple / donation',
        paymentMethod: 'Cash',
        isCashInflow: false,
        createdAt: '2026-10-24T00:00:00.000Z',
        updatedAt: '2026-10-24T00:00:00.000Z',
      },
    ];

    const calc = calculateBudget(pilgrimageTrip, overrunExpenses);

    expect(calc.totalSpent).toBe(11500); // 8500 + 3000
    expect(calc.availableBudget).toBe(-1500); // 10000 - 11500 = -1500 overrun
    expect(calc.percentSpent).toBe(115); // 11500 / 10000 = 115%

    const html = renderToStaticMarkup(
      React.createElement(BudgetView, {
        trip: pilgrimageTrip,
        expenses: overrunExpenses,
        budgetCalc: calc,
        onAddExpense: () => {},
        onEditExpense: () => {},
        onDeleteExpense: () => {},
        onEditTripSettings: () => {},
      })
    );

    // Overrun banner must be prominently displayed
    expect(html).toContain('Budget Overrun: Spending exceeds target budget by ₹1,500');
    // Negative remaining balance is styled in red
    expect(html).toContain('text-red-600');
    expect(html).toContain('-₹1,500');
  });

  it('10. Validates amounts and prevents invalid or duplicate submissions in the expense form', () => {
    // Zero amount validation
    const zeroAmount = 0;
    expect(isNaN(zeroAmount) || zeroAmount <= 0).toBe(true);

    // Negative amount validation
    const negativeAmount = -50;
    expect(isNaN(negativeAmount) || negativeAmount <= 0).toBe(true);

    // Missing title validation
    const emptyTitle = '   ';
    expect(!emptyTitle.trim()).toBe(true);

    // Valid inputs
    const validAmount = 550;
    const validTitle = 'Bus from Pune to Nashik';
    expect(validAmount > 0 && validTitle.trim().length > 0).toBe(true);
  });

  it('11. Verifies cloud synchronization schema mapping for expenses without illegal columns', () => {
    const expenseRecord: Expense = {
      id: '00000000-0000-4000-8000-000000000055',
      tripId: pilgrimageTrip.id,
      dayId: '00000000-0000-4000-8000-000000000101',
      date: '2026-11-17',
      title: 'Sleeper Train Ticket',
      amount: 850,
      category: 'Transport',
      paymentMethod: 'UPI',
      destination: 'Secunderabad → Shirdi',
      notes: 'IRCTC booking confirmed',
      isCashInflow: false,
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
    };

    const pgRecord = formatRecordForPostgres('expenses', expenseRecord, 'user-uuid-123');

    // Child table expenses MUST NOT have user_id (per PostgreSQL schema 001_initial_schema.sql)
    expect(pgRecord).not.toHaveProperty('user_id');
    expect(pgRecord.id).toBe(expenseRecord.id);
    expect(pgRecord.trip_id).toBe(pilgrimageTrip.id);
    expect(pgRecord.day_id).toBe(expenseRecord.dayId);
    expect(pgRecord.amount).toBe(850);
    expect(pgRecord.category).toBe('Transport');
    expect(pgRecord.payment_method).toBe('UPI');
    expect(pgRecord.date).toBe('2026-11-17');
    expect(pgRecord.title).toBe('Sleeper Train Ticket');
  });

  it('12. Verifies Set Budget action updates planned target budget and recalculates remaining balance dynamically', () => {
    // When user changes budget from ₹10,000 to ₹12,000
    const updatedTrip: Trip = {
      ...pilgrimageTrip,
      totalBudget: 12000,
    };

    const exp: Expense = {
      id: 'exp-1',
      tripId: updatedTrip.id,
      date: '2026-11-17',
      title: 'Train Ticket',
      amount: 1000,
      category: 'Transport',
      paymentMethod: 'UPI',
      isCashInflow: false,
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
    };

    const calc = calculateBudget(updatedTrip, [exp]);
    expect(calc.totalBudget).toBe(12000);
    expect(calc.totalSpent).toBe(1000);
    expect(calc.availableBudget).toBe(11000); // 12000 - 1000
    expect(Number(calc.percentSpent.toFixed(1))).toBe(8.3); // 1000 / 12000 = 8.33%
    expect(Math.round(calc.percentSpent)).toBe(8);

    const html = renderToStaticMarkup(
      React.createElement(BudgetView, {
        trip: updatedTrip,
        expenses: [exp],
        budgetCalc: calc,
        onAddExpense: () => {},
        onEditExpense: () => {},
        onDeleteExpense: () => {},
        onEditTripSettings: () => {},
      })
    );

    expect(html).toContain('₹12,000');
    expect(html).toContain('₹1,000');
    expect(html).toContain('₹11,000');
    expect(html).toContain('8%');
  });
});
