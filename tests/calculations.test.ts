import { describe, it, expect } from 'vitest';
import { calculateBudget, formatRupee, generateExpensesCSV } from '@/lib/calculations';
import { Trip, Expense } from '@/types/trip';

describe('Financial Calculation Engine', () => {
  const baseTrip: Trip = {
    id: 'test-trip-1',
    title: 'Pilgrimage Test Trip',
    origin: 'Hyderabad',
    destination: 'Khammam',
    startDate: '2026-11-17',
    endDate: '2026-12-05', // 19 days inclusive
    totalBudget: 30000,
    emergencyReserve: 5000,
    openingCash: 10000,
    isActive: true,
    createdAt: '2026-10-14T00:00:00.000Z',
    updatedAt: '2026-10-14T00:00:00.000Z',
  };

  it('calculates total spent, available budget and emergency reserve accurately', () => {
    const expenses: Expense[] = [
      {
        id: 'e1',
        tripId: baseTrip.id,
        date: '2026-11-17',
        title: 'Train ticket',
        amount: 1200,
        category: 'Transport',
        paymentMethod: 'UPI',
        isCashInflow: false,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'e2',
        tripId: baseTrip.id,
        date: '2026-11-18',
        title: 'Dharamshala stay',
        amount: 800,
        category: 'Accommodation',
        paymentMethod: 'Cash',
        isCashInflow: false,
        createdAt: '',
        updatedAt: '',
      },
    ];

    const result = calculateBudget(baseTrip, expenses);

    // Total spent = 1200 + 800 = 2000
    expect(result.totalSpent).toBe(2000);

    // Available budget = total budget (30000) - total spent (2000) - emergency reserve (5000) = 23000
    expect(result.availableBudget).toBe(23000);

    // Emergency reserve is strictly protected
    expect(result.emergencyReserve).toBe(5000);
  });

  it('calculates cash on hand considering opening cash, ATM inflows and cash expenses', () => {
    const expenses: Expense[] = [
      // 1. Cash expense
      {
        id: 'e1',
        tripId: baseTrip.id,
        date: '2026-11-18',
        title: 'Lunch thali',
        amount: 250,
        category: 'Food',
        paymentMethod: 'Cash',
        isCashInflow: false,
        createdAt: '',
        updatedAt: '',
      },
      // 2. UPI expense (does not deduct physical cash on hand)
      {
        id: 'e2',
        tripId: baseTrip.id,
        date: '2026-11-18',
        title: 'Online bus pass',
        amount: 400,
        category: 'Transport',
        paymentMethod: 'UPI',
        isCashInflow: false,
        createdAt: '',
        updatedAt: '',
      },
      // 3. ATM cash withdrawal / inflow (+3000 cash notes)
      {
        id: 'e3',
        tripId: baseTrip.id,
        date: '2026-11-19',
        title: 'ATM Cash Withdrawal at Shirdi',
        amount: 3000,
        category: 'Other',
        paymentMethod: 'Cash',
        isCashInflow: true,
        createdAt: '',
        updatedAt: '',
      },
    ];

    const result = calculateBudget(baseTrip, expenses);

    // Cash on hand = Opening Cash (10000) + Cash Inflows (3000) - Cash Expenses (250) = 12750
    expect(result.cashOnHand).toBe(12750);
    expect(result.cashInflows).toBe(3000);
    expect(result.cashExpenses).toBe(250);

    // ATM cash withdrawal MUST NOT count as a trip expenditure
    expect(result.totalSpent).toBe(650); // 250 + 400
  });

  it('triggers reserve breached alert when spent exceeds (budget - reserve)', () => {
    // Total budget = 30000, reserve = 5000. Spendable limit = 25000.
    const heavyExpenses: Expense[] = [
      {
        id: 'e1',
        tripId: baseTrip.id,
        date: '2026-11-20',
        title: 'Heavy expenditures',
        amount: 26000,
        category: 'Transport',
        paymentMethod: 'Debit / credit card',
        isCashInflow: false,
        createdAt: '',
        updatedAt: '',
      },
    ];

    const result = calculateBudget(baseTrip, heavyExpenses);
    expect(result.totalSpent).toBe(26000);
    expect(result.availableBudget).toBe(-1000); // 30000 - 26000 - 5000 = -1000
    expect(result.isReserveBreached).toBe(true);
    expect(result.isOverBudget).toBe(false); // 26000 is still under 30000 total budget
  });

  it('computes daily averages over the 19 planned days', () => {
    const expenses: Expense[] = [
      {
        id: 'e1',
        tripId: baseTrip.id,
        date: '2026-11-18',
        title: 'Total spend',
        amount: 1900,
        category: 'Food',
        paymentMethod: 'UPI',
        isCashInflow: false,
        createdAt: '',
        updatedAt: '',
      },
    ];

    const result = calculateBudget(baseTrip, expenses);
    // 1900 / 19 days = 100 / day
    expect(result.dailyAverage).toBe(100);
  });

  it('formats Rupee currency with Indian numbering format', () => {
    expect(formatRupee(1000)).toBe('₹1,000');
    expect(formatRupee(150000)).toBe('₹1,50,000');
    expect(formatRupee(0)).toBe('₹0');
  });

  it('generates compliant CSV with UTF-8 BOM and proper escaping', () => {
    const expenses: Expense[] = [
      {
        id: 'e1',
        tripId: 't1',
        date: '2026-11-17',
        title: 'Train "17208" to Shirdi',
        amount: 1450.5,
        category: 'Transport',
        paymentMethod: 'UPI',
        destination: 'Shirdi, MH',
        notes: 'Sleeper berth, confirmed',
        isCashInflow: false,
        createdAt: '',
        updatedAt: '',
      },
    ];

    const csv = generateExpensesCSV(expenses);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"Train ""17208"" to Shirdi"');
    expect(csv).toContain('"1450.50"');
    expect(csv).toContain('"Shirdi, MH"');
  });
});
