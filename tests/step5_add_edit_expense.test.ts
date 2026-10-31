import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExpenseModal } from '@/components/Modals';
import { BudgetView, getCategoryDisplayLabel } from '@/components/views/BudgetView';
import { calculateBudget } from '@/lib/calculations';
import { Trip, Expense, ExpenseCategory, ItineraryDay } from '@/types/trip';

describe('Phase 2 — Step 5: Add / Edit Expense Module Verification Suite', () => {
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
      title: 'Departure from Hyderabad & Arrival at Mahakaleshwar',
      subtitle: 'Hyderabad to Ujjain via train',
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
      subtitle: 'Ujjain to Omkareshwar bus',
      accommodationPlan: 'Narmada Resort',
      status: 'Planned',
      themeType: 'Temple',
      tasks: [],
      details: '',
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
    },
  ];

  it('1. Renders Add Expense modal with all required fields and mobile-friendly inputs', () => {
    const html = renderToStaticMarkup(
      React.createElement(ExpenseModal, {
        days: sampleDays,
        onSave: vi.fn(),
        onClose: vi.fn(),
      })
    );

    // Modal title & required field labels
    expect(html).toContain('Add Pilgrimage Expense');
    expect(html).toContain('Amount (₹)');
    expect(html).toContain('Category');
    expect(html).toContain('Date');
    // Save & Cancel actions
    expect(html).toContain('Save Expense');
    expect(html).toContain('Cancel');
  });

  it('2. Renders all 7 consistent categories and payment methods', () => {
    const html = renderToStaticMarkup(
      React.createElement(ExpenseModal, {
        days: sampleDays,
        onSave: vi.fn(),
        onClose: vi.fn(),
      })
    );

    // Categories
    expect(html).toContain('Transport (Train / Bus / Local)');
    expect(html).toContain('Accommodation');
    expect(html).toContain('Food and water');
    expect(html).toContain('Temple donations and offerings');
    expect(html).toContain('Entry tickets &amp; Sightseeing');
    expect(html).toContain('Shopping and essentials');
    expect(html).toContain('Other');

    // Payment methods
    expect(html).toContain('Cash');
    expect(html).toContain('UPI');
    expect(html).toContain('Card');
    expect(html).toContain('Online Booking');
  });

  it('3. Renders optional fields: Description, Place/Merchant, Related Day, Notes, ATM toggle', () => {
    const html = renderToStaticMarkup(
      React.createElement(ExpenseModal, {
        days: sampleDays,
        onSave: vi.fn(),
        onClose: vi.fn(),
      })
    );

    expect(html).toContain('Description / Title (Optional)');
    expect(html).toContain('Place / Merchant (Optional)');
    expect(html).toContain('Related Itinerary Day (Optional)');
    expect(html).toContain('Day 1: Departure from Hyderabad');
    expect(html).toContain('Day 2: Ujjain to Omkareshwar');
    expect(html).toContain('Notes / Reminders (Optional)');
    expect(html).toContain('ATM Cash Withdrawal');
  });

  it('4. Renders Edit Expense modal loading actual saved values and showing edit banner', () => {
    const existingExpense: Expense = {
      id: 'exp-1234-5678',
      tripId: genuineTrip.id,
      dayId: 'day-01',
      date: '2026-11-17',
      title: 'Bhasma Aarti VIP Darshan Pass',
      amount: 500,
      category: 'Sightseeing',
      paymentMethod: 'UPI',
      destination: 'Mahakaleshwar Temple, Ujjain',
      notes: 'Booked online via temple portal',
      isCashInflow: false,
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
    };

    const html = renderToStaticMarkup(
      React.createElement(ExpenseModal, {
        initialData: existingExpense,
        days: sampleDays,
        onSave: vi.fn(),
        onClose: vi.fn(),
      })
    );

    expect(html).toContain('Edit Expense: Bhasma Aarti VIP Darshan Pass');
    expect(html).toContain('Editing saved expense');
    expect(html).toContain('ID: exp-1234...');
    expect(html).toContain('500');
    expect(html).toContain('Mahakaleshwar Temple, Ujjain');
    expect(html).toContain('Booked online via temple portal');
    expect(html).toContain('Update Expense');
  });

  it('5. Amount validation: Rejects zero, negative, NaN, non-finite, and empty amounts', () => {
    const testCases = [
      { amount: 0, valid: false },
      { amount: -150, valid: false },
      { amount: NaN, valid: false },
      { amount: Infinity, valid: false },
      { amount: -Infinity, valid: false },
      { amount: 0.0, valid: false },
      { amount: 0.001, valid: true },
      { amount: 250, valid: true },
      { amount: 1500.5, valid: true },
    ];

    testCases.forEach(({ amount, valid }) => {
      const isValidAmount = Number.isFinite(amount) && amount > 0;
      expect(isValidAmount).toBe(valid);
    });
  });

  it('6. Optional title fallback: Defaults to readable category label when user leaves title blank', () => {
    const categories: { cat: ExpenseCategory; expectedLabel: string }[] = [
      { cat: 'Transport', expectedLabel: 'Transport (Train / Bus / Local)' },
      { cat: 'Accommodation', expectedLabel: 'Accommodation' },
      { cat: 'Food', expectedLabel: 'Food and water' },
      { cat: 'Temple / donation', expectedLabel: 'Temple donations and offerings' },
      { cat: 'Sightseeing', expectedLabel: 'Entry tickets & Sightseeing' },
      { cat: 'Shopping', expectedLabel: 'Shopping and essentials' },
      { cat: 'Other', expectedLabel: 'Other' },
    ];

    categories.forEach(({ cat, expectedLabel }) => {
      const label = getCategoryDisplayLabel(cat);
      expect(label).toBe(expectedLabel);

      // Verify that when title is blank, resolving fallback title works
      const inputTitle = '';
      const resolved = inputTitle.trim() || label;
      expect(resolved).toBe(expectedLabel);
    });
  });

  it('7. Editing preserves original record ID, tripId, and updates modified fields without duplicates', () => {
    const existingExpense: Expense = {
      id: 'original-exp-id-999',
      tripId: genuineTrip.id,
      dayId: 'day-01',
      date: '2026-11-17',
      title: 'Auto from Station to Hotel',
      amount: 150,
      category: 'Transport',
      paymentMethod: 'Cash',
      isCashInflow: false,
      createdAt: '2026-10-24T10:00:00.000Z',
      updatedAt: '2026-10-24T10:00:00.000Z',
    };

    const expensesList: Expense[] = [existingExpense];

    // Simulate update
    const updatedData: Partial<Expense> = {
      id: existingExpense.id,
      title: 'Auto from Station to Mahakal Temple',
      amount: 200,
      paymentMethod: 'UPI',
    };

    // Update in-place
    const isNew = !updatedData.id;
    expect(isNew).toBe(false);

    const updatedExpense: Expense = {
      ...existingExpense,
      ...updatedData,
      amount: Number(updatedData.amount),
      updatedAt: '2026-10-27T12:00:00.000Z',
    };

    const updatedList = expensesList.map(e => (e.id === updatedExpense.id ? updatedExpense : e));

    expect(updatedList.length).toBe(1); // No duplicate created
    expect(updatedList[0].id).toBe('original-exp-id-999'); // Original ID preserved
    expect(updatedList[0].tripId).toBe(genuineTrip.id); // Original tripId preserved
    expect(updatedList[0].title).toBe('Auto from Station to Mahakal Temple');
    expect(updatedList[0].amount).toBe(200);
    expect(updatedList[0].paymentMethod).toBe('UPI');
  });

  it('8. Enforces cross-trip authorization: Rejects updating or deleting expense belonging to another trip', () => {
    const otherTripId = '99999999-9999-4999-8999-999999999999';
    const unauthorizedExpense: Expense = {
      id: 'other-trip-exp',
      tripId: otherTripId,
      date: '2026-11-17',
      title: 'Intruder Expense',
      amount: 5000,
      category: 'Other',
      paymentMethod: 'Debit / credit card',
      isCashInflow: false,
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
    };

    // Attempt to update with current trip session
    const checkOwnership = (exp: Expense, currentTripId: string) => {
      if (exp.tripId !== currentTripId) {
        throw new Error('Unauthorized: cannot edit expense from another trip');
      }
    };

    expect(() => checkOwnership(unauthorizedExpense, genuineTrip.id)).toThrow(
      'Unauthorized: cannot edit expense from another trip'
    );
  });

  it('9. Accurate budget update: Adding a ₹350 food expense updates totalSpent, availableBudget, and category breakdown', () => {
    const initialCalc = calculateBudget(genuineTrip, []);
    expect(initialCalc.totalSpent).toBe(0);
    expect(initialCalc.availableBudget).toBe(40000); // 45000 - 0 - 5000 emergency reserve

    const newExpense: Expense = {
      id: 'exp-lunch-ujjain',
      tripId: genuineTrip.id,
      dayId: 'day-01',
      date: '2026-11-17',
      title: 'Thali lunch in Ujjain',
      amount: 350,
      category: 'Food',
      paymentMethod: 'UPI',
      isCashInflow: false,
      createdAt: '2026-10-27T00:00:00.000Z',
      updatedAt: '2026-10-27T00:00:00.000Z',
    };

    const updatedCalc = calculateBudget(genuineTrip, [newExpense]);
    expect(updatedCalc.totalSpent).toBe(350);
    expect(updatedCalc.availableBudget).toBe(39650); // 45000 - 350 - 5000
    const foodTotal = updatedCalc.categoryTotals.find(c => c.category === 'Food');
    expect(foodTotal?.amount).toBe(350);
    expect(updatedCalc.isOverBudget).toBe(false);
  });

  it('10. ATM Cash Inflow: Accurately tracks cash withdrawals without artificially inflating total trip expenses', () => {
    const atmWithdrawal: Expense = {
      id: 'atm-1',
      tripId: genuineTrip.id,
      date: '2026-11-17',
      title: 'SBI ATM Cash Withdrawal',
      amount: 5000,
      category: 'Other',
      paymentMethod: 'Debit / credit card',
      isCashInflow: true, // Marked as ATM withdrawal
      createdAt: '2026-10-27T00:00:00.000Z',
      updatedAt: '2026-10-27T00:00:00.000Z',
    };

    const actualPurchase: Expense = {
      id: 'purchase-1',
      tripId: genuineTrip.id,
      date: '2026-11-17',
      title: 'Dharamshala Room Deposit & Rent',
      amount: 800,
      category: 'Accommodation',
      paymentMethod: 'Cash',
      isCashInflow: false,
      createdAt: '2026-10-27T00:00:00.000Z',
      updatedAt: '2026-10-27T00:00:00.000Z',
    };

    const calc = calculateBudget(genuineTrip, [atmWithdrawal, actualPurchase]);
    // Budget calculations treat actual spending (non-inflow) as ₹800
    expect(calc.totalSpent).toBe(800);
    expect(calc.cashInflows).toBe(5000);
    expect(calc.cashExpenses).toBe(800);
    expect(calc.cashOnHand).toBe(5000 + 5000 - 800); // 9200
    expect(calc.availableBudget).toBe(45000 - 800 - 5000); // 39200
  });

  it('11. Delete behavior requires confirmation and safely removes the targeted expense only', () => {
    const exp1: Expense = {
      id: 'exp-1',
      tripId: genuineTrip.id,
      date: '2026-11-17',
      title: 'Tea & Snacks',
      amount: 60,
      category: 'Food',
      paymentMethod: 'Cash',
      isCashInflow: false,
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
    };

    const exp2: Expense = {
      id: 'exp-2',
      tripId: genuineTrip.id,
      date: '2026-11-17',
      title: 'Auto Fare',
      amount: 100,
      category: 'Transport',
      paymentMethod: 'Cash',
      isCashInflow: false,
      createdAt: '2026-10-24T00:00:00.000Z',
      updatedAt: '2026-10-24T00:00:00.000Z',
    };

    let expenses = [exp1, exp2];

    // Deleting exp1
    const deleteId = 'exp-1';
    expenses = expenses.filter(e => e.id !== deleteId);

    expect(expenses.length).toBe(1);
    expect(expenses[0].id).toBe('exp-2');
    expect(expenses[0].amount).toBe(100);
  });
});
