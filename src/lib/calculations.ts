import { Expense, ExpenseCategory, BudgetCalculations, Trip } from '@/types/trip';

/**
 * Format an amount in Indian Rupees (₹)
 */
export function formatRupee(amount: number, showDecimals: boolean = false): string {
  const num = Number(amount || 0);
  if (!Number.isFinite(num)) return '₹0';
  if (num === 0) return '₹0';

  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const formatted = absNum.toLocaleString('en-IN', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });

  return isNegative ? `-₹${formatted}` : `₹${formatted}`;
}

/**
 * Perform all financial computations deterministically.
 * Avoid floating point imprecision by using Math.round with 100 for cents/paise.
 */
export function calculateBudget(trip: Trip, expenses: Expense[]): BudgetCalculations {
  const totalBudget = Math.max(0, Number(trip.totalBudget || 0));
  const emergencyReserve = Math.max(0, Number(trip.emergencyReserve || 0));
  const openingCash = Math.max(0, Number(trip.openingCash || 0));

  let totalSpentPaise = 0;
  let cashInflowsPaise = 0;
  let cashExpensesPaise = 0;

  const categoryMap = new Map<ExpenseCategory, number>();
  const destinationMap = new Map<string, number>();

  for (const exp of expenses) {
    const amtPaise = Math.round(Number(exp.amount || 0) * 100);

    if (exp.isCashInflow) {
      cashInflowsPaise += amtPaise;
      continue;
    }

    totalSpentPaise += amtPaise;

    // Track payment method for Cash on Hand
    if (exp.paymentMethod === 'Cash') {
      cashExpensesPaise += amtPaise;
    }

    // Category tracking
    const currentCatPaise = categoryMap.get(exp.category) || 0;
    categoryMap.set(exp.category, currentCatPaise + amtPaise);

    // Destination tracking
    const dest = exp.destination?.trim() || 'General / Transit';
    const currentDestPaise = destinationMap.get(dest) || 0;
    destinationMap.set(dest, currentDestPaise + amtPaise);
  }

  const totalSpent = totalSpentPaise / 100;
  const cashInflows = cashInflowsPaise / 100;
  const cashExpenses = cashExpensesPaise / 100;

  // Formula: Available budget = total budget − total spent − protected emergency reserve
  const availableBudget = totalBudget - totalSpent - emergencyReserve;

  // Formula: Cash on hand = recorded opening cash + recorded cash inflows − recorded cash expenses
  const cashOnHand = openingCash + cashInflows - cashExpenses;

  // Duration in days
  const start = new Date(trip.startDate + 'T00:00:00');
  const end = new Date(trip.endDate + 'T00:00:00');
  const dayCount = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const dailyAverage = totalSpent / dayCount;

  const percentSpent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const isNearLimit = totalBudget > 0 && percentSpent >= 80 && percentSpent < 100;
  const isOverBudget = totalBudget > 0 && totalSpent > totalBudget;
  const isReserveBreached = totalBudget > 0 && emergencyReserve > 0 && totalSpent > (totalBudget - emergencyReserve);

  const categoryTotals = Array.from(categoryMap.entries()).map(([category, amtPaise]) => {
    const amount = amtPaise / 100;
    const percentage = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
    return {
      category,
      amount,
      percentage: Math.round(percentage * 10) / 10,
    };
  }).sort((a, b) => b.amount - a.amount);

  const destinationTotals = Array.from(destinationMap.entries()).map(([destination, amtPaise]) => ({
    destination,
    amount: amtPaise / 100,
  })).sort((a, b) => b.amount - a.amount);

  return {
    totalBudget,
    totalSpent,
    emergencyReserve,
    availableBudget,
    openingCash,
    cashInflows,
    cashExpenses,
    cashOnHand,
    dailyAverage: Math.round(dailyAverage * 100) / 100,
    percentSpent: Math.round(percentSpent * 10) / 10,
    isNearLimit,
    isOverBudget,
    isReserveBreached,
    categoryTotals,
    destinationTotals,
  };
}

/**
 * Generate CSV export for expenses compliant with RFC 4180
 */
export function generateExpensesCSV(expenses: Expense[]): string {
  const headers = ['Date', 'Title', 'Category', 'Amount (INR)', 'Payment Method', 'Destination', 'Type', 'Notes'];
  
  const escapeCell = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = expenses.map(e => [
    escapeCell(e.date),
    escapeCell(e.title),
    escapeCell(e.category),
    escapeCell(Number(e.amount).toFixed(2)),
    escapeCell(e.paymentMethod),
    escapeCell(e.destination || ''),
    escapeCell(e.isCashInflow ? 'Cash Inflow' : 'Expense'),
    escapeCell(e.notes || ''),
  ].join(','));

  // Prepend UTF-8 BOM so Excel opens Hindi/special characters correctly
  return '\uFEFF' + [headers.map(escapeCell).join(','), ...rows].join('\r\n');
}
