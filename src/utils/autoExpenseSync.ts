import { Expense, AccommodationStay, TransportLeg, BookingDocument, ExpenseCategory } from '@/types/trip';
import { generateUUID } from '@/lib/uuid';

export type AutoExpenseSyncResult =
  | { action: 'insert'; expense: Expense }
  | { action: 'update'; expense: Expense }
  | { action: 'delete'; expenseId: string }
  | null;

/**
 * Sync accommodation stay cost directly into the Budget expense ledger.
 * Links via [linked_stay:${stay.id}] in the expense notes.
 */
export function syncStayExpense(
  stay: AccommodationStay,
  tripId: string,
  existingExpenses: Expense[]
): AutoExpenseSyncResult {
  const stayId = stay.id;
  const amount = Number(
    stay.totalAmount !== undefined && stay.totalAmount > 0
      ? stay.totalAmount
      : stay.estimatedCost !== undefined && stay.estimatedCost > 0
      ? stay.estimatedCost
      : 0
  );

  const existingExp = existingExpenses.find(
    e => e.notes && e.notes.includes(`[linked_stay:${stayId}]`)
  );

  if (amount > 0) {
    const isBooked =
      stay.bookingStatus === 'Booked' ||
      stay.bookingStatus === 'Completed' ||
      stay.bookingStatus === 'Checked in';

    if (existingExp) {
      const updatedExpense: Expense = {
        ...existingExp,
        amount,
        title: `Stay: ${stay.name} (${stay.city || 'Shirdi'})`,
        date: stay.checkinDate || existingExp.date || new Date().toISOString().split('T')[0],
        category: 'Accommodation',
        paymentMethod: (stay.paymentMethod as any) || existingExp.paymentMethod || 'UPI',
        destination: stay.city || existingExp.destination,
        status: isBooked ? 'Paid' : 'Pending',
        updatedAt: new Date().toISOString(),
      };
      return { action: 'update', expense: updatedExpense };
    }

    const newExpense: Expense = {
      id: generateUUID(),
      tripId,
      dayId: stay.dayId,
      date: stay.checkinDate || new Date().toISOString().split('T')[0],
      title: `Stay: ${stay.name} (${stay.city || 'Shirdi'})`,
      amount,
      category: 'Accommodation',
      paymentMethod: (stay.paymentMethod as any) || 'UPI',
      destination: stay.city || undefined,
      notes: `Auto-synced from stay booking [linked_stay:${stayId}]`,
      isCashInflow: false,
      status: isBooked ? 'Paid' : 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return { action: 'insert', expense: newExpense };
  }

  // If amount was reduced to 0 or removed, delete the orphan linked expense
  if (existingExp) {
    return { action: 'delete', expenseId: existingExp.id };
  }

  return null;
}

/**
 * Delete expense linked to a stay when the stay is deleted.
 */
export function deleteStayExpense(
  stayId: string,
  existingExpenses: Expense[]
): string | null {
  const existingExp = existingExpenses.find(
    e => e.notes && e.notes.includes(`[linked_stay:${stayId}]`)
  );
  return existingExp ? existingExp.id : null;
}

/**
 * Sync transport journey fare directly into the Budget expense ledger.
 * Links via [linked_leg:${leg.id}] in the expense notes.
 */
export function syncTransportExpense(
  leg: TransportLeg,
  tripId: string,
  existingExpenses: Expense[]
): AutoExpenseSyncResult {
  const legId = leg.id;
  const fare = typeof leg.fare === 'number' && leg.fare > 0 ? leg.fare : 0;

  const existingExp = existingExpenses.find(
    e => e.notes && e.notes.includes(`[linked_leg:${legId}]`)
  );

  if (fare > 0) {
    const isBooked = leg.status === 'Booked';

    if (existingExp) {
      const updatedExpense: Expense = {
        ...existingExp,
        amount: fare,
        title: `Transit: ${leg.fromLocation} → ${leg.toLocation} (${leg.mode || 'Train'})`,
        date: leg.date || existingExp.date || new Date().toISOString().split('T')[0],
        category: 'Transport',
        paymentMethod: existingExp.paymentMethod || 'Online booking',
        destination: leg.toLocation || existingExp.destination,
        status: isBooked ? 'Paid' : 'Pending',
        updatedAt: new Date().toISOString(),
      };
      return { action: 'update', expense: updatedExpense };
    }

    const newExpense: Expense = {
      id: generateUUID(),
      tripId,
      dayId: leg.dayId,
      date: leg.date || new Date().toISOString().split('T')[0],
      title: `Transit: ${leg.fromLocation} → ${leg.toLocation} (${leg.mode || 'Train'})`,
      amount: fare,
      category: 'Transport',
      paymentMethod: 'Online booking',
      destination: leg.toLocation || undefined,
      notes: `Auto-synced from transport journey [linked_leg:${legId}]`,
      isCashInflow: false,
      status: isBooked ? 'Paid' : 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return { action: 'insert', expense: newExpense };
  }

  if (existingExp) {
    return { action: 'delete', expenseId: existingExp.id };
  }

  return null;
}

/**
 * Delete expense linked to a transport leg when the leg is deleted.
 */
export function deleteTransportExpense(
  legId: string,
  existingExpenses: Expense[]
): string | null {
  const existingExp = existingExpenses.find(
    e => e.notes && e.notes.includes(`[linked_leg:${legId}]`)
  );
  return existingExp ? existingExp.id : null;
}

/**
 * Sync ticket pass / booking document cost into the Budget expense ledger.
 * Links via [linked_ticket:${doc.id}] in the expense notes.
 */
export function syncTicketExpense(
  doc: BookingDocument,
  tripId: string,
  existingExpenses: Expense[]
): AutoExpenseSyncResult {
  const docId = doc.id;
  const cost =
    typeof doc.totalAmount === 'number' && doc.totalAmount > 0
      ? doc.totalAmount
      : 0;

  const existingExp = existingExpenses.find(
    e => e.notes && e.notes.includes(`[linked_ticket:${docId}]`)
  );

  if (cost > 0) {
    const category: ExpenseCategory =
      (doc.docType as any) === 'Hotel Receipt' || (doc.docType as any) === 'Hotel Booking'
        ? 'Accommodation'
        : 'Transport';

    if (existingExp) {
      const updatedExpense: Expense = {
        ...existingExp,
        amount: cost,
        title: `Pass: ${doc.title}`,
        date: doc.travelDate || existingExp.date || new Date().toISOString().split('T')[0],
        category,
        paymentMethod: existingExp.paymentMethod || 'Online booking',
        destination: doc.toCity || existingExp.destination,
        status: 'Paid',
        updatedAt: new Date().toISOString(),
      };
      return { action: 'update', expense: updatedExpense };
    }

    const newExpense: Expense = {
      id: generateUUID(),
      tripId,
      dayId: doc.dayId,
      date: doc.travelDate || new Date().toISOString().split('T')[0],
      title: `Pass: ${doc.title}`,
      amount: cost,
      category,
      paymentMethod: 'Online booking',
      destination: doc.toCity || undefined,
      notes: `Auto-synced from booking pass [linked_ticket:${docId}]`,
      isCashInflow: false,
      status: 'Paid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return { action: 'insert', expense: newExpense };
  }

  if (existingExp) {
    return { action: 'delete', expenseId: existingExp.id };
  }

  return null;
}

/**
 * Delete expense linked to a ticket pass when the document is deleted.
 */
export function deleteTicketExpense(
  docId: string,
  existingExpenses: Expense[]
): string | null {
  const existingExp = existingExpenses.find(
    e => e.notes && e.notes.includes(`[linked_ticket:${docId}]`)
  );
  return existingExp ? existingExp.id : null;
}
