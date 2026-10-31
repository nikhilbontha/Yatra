import {
  Trip,
  ItineraryDay,
  TransportLeg,
  Place,
  ChecklistItem,
  AccommodationStay,
  TripNote,
  Expense,
  BookingDocument,
} from '@/types/trip';
import {
  CONFIRMED_ITINERARY_DAYS,
  getConfirmedItineraryDays,
  CONFIRMED_TRANSPORT_LEGS,
  getConfirmedTransportLegs,
  CONFIRMED_ACCOMMODATION_STAYS,
  getConfirmedAccommodationStays,
  CONFIRMED_PLACES,
  getConfirmedPlaces,
  CONFIRMED_CHECKLIST_ITEMS,
  getConfirmedChecklistItems,
} from './itinerary-data';

export const DEFAULT_TRIP_ID = 'e7a1b32d-9831-4fa2-8b43-96b61df30191';

// Deterministic RFC 4122 v4-compliant UUID generators
export function getDayUUID(dayNumber: number): string {
  return `e7a1b32d-9831-4fa2-8b43-0000000000${String(dayNumber).padStart(2, '0')}`;
}

export function getTaskUUID(dayNumber: number, taskIndex: number): string {
  return `e7a1b32d-9831-4fa2-8b43-000100${String(dayNumber).padStart(2, '0')}${String(taskIndex).padStart(4, '0')}`;
}

export function getChecklistUUID(index: number): string {
  return `e7a1b32d-9831-4fa2-8b43-0002000000${String(index).padStart(2, '0')}`;
}

export function getPlaceUUID(index: number): string {
  return `e7a1b32d-9831-4fa2-8b43-0003000000${String(index).padStart(2, '0')}`;
}

export function getTransportUUID(index: number): string {
  return `e7a1b32d-9831-4fa2-8b43-0004000000${String(index).padStart(2, '0')}`;
}

export function getStayUUID(index: number): string {
  return `e7a1b32d-9831-4fa2-8b43-0005000000${String(index).padStart(2, '0')}`;
}

export function getNoteUUID(index: number): string {
  return `e7a1b32d-9831-4fa2-8b43-0006000000${String(index).padStart(2, '0')}`;
}

export function getExpenseUUID(index: number): string {
  return `e7a1b32d-9831-4fa2-8b43-0007000000${String(index).padStart(2, '0')}`;
}

export function getDocumentUUID(index: number): string {
  return `e7a1b32d-9831-4fa2-8b43-0008000000${String(index).padStart(2, '0')}`;
}

import { generateUUID } from './uuid';

/**
 * Convert any legacy string ID to a deterministic RFC 4122 valid UUID
 */
export function toDeterministicUUID(id: string): string {
  if (!id) return generateUUID();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return id.toLowerCase();
  }

  // Map legacy day IDs: d1-2026-11-17 -> getDayUUID(1)
  const dayMatch = id.match(/^d(\d+)-/);
  if (dayMatch) {
    return getDayUUID(parseInt(dayMatch[1], 10));
  }

  // Map legacy task IDs: task-1-2 -> getTaskUUID(1, 2)
  const taskMatch = id.match(/^task-(\d+)-(\d+)$/);
  if (taskMatch) {
    return getTaskUUID(parseInt(taskMatch[1], 10), parseInt(taskMatch[2], 10));
  }

  // Map legacy checklist IDs: chk-1 -> getChecklistUUID(1)
  const chkMatch = id.match(/^chk-(\d+)$/);
  if (chkMatch) {
    return getChecklistUUID(parseInt(chkMatch[1], 10));
  }

  // Map legacy place IDs: place-1 -> getPlaceUUID(1)
  const placeMatch = id.match(/^place-(\d+)$/);
  if (placeMatch) {
    return getPlaceUUID(parseInt(placeMatch[1], 10));
  }

  // Map legacy transport IDs: leg-1 -> getTransportUUID(1)
  const legMatch = id.match(/^leg-(\d+)$/);
  if (legMatch) {
    return getTransportUUID(parseInt(legMatch[1], 10));
  }

  // Map legacy stay IDs: stay-1 -> getStayUUID(1)
  const stayMatch = id.match(/^stay-(\d+)$/);
  if (stayMatch) {
    return getStayUUID(parseInt(stayMatch[1], 10));
  }

  // Map legacy note IDs: note-1 -> getNoteUUID(1)
  const noteMatch = id.match(/^note-(\d+)$/);
  if (noteMatch) {
    return getNoteUUID(parseInt(noteMatch[1], 10));
  }

  // Map legacy expense IDs: exp-1 -> getExpenseUUID(1)
  const expMatch = id.match(/^exp-(\d+)$/);
  if (expMatch) {
    return getExpenseUUID(parseInt(expMatch[1], 10));
  }

  // Map legacy document IDs: doc-1 -> getDocumentUUID(1)
  const docMatch = id.match(/^(?:doc|document)-(\d+)$/);
  if (docMatch) {
    return getDocumentUUID(parseInt(docMatch[1], 10));
  }

  // Fallback: deterministic hash to UUID
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `e7a1b32d-9831-4fa2-8b43-${hex.padEnd(12, '0')}`;
}

export const INITIAL_TRIP: Trip = {
  id: DEFAULT_TRIP_ID,
  title: 'Complete Jyotirlinga Pilgrimage',
  origin: 'Hyderabad',
  destination: 'Khammam',
  startDate: '2026-11-17',
  endDate: '2026-12-05',
  totalBudget: 0,
  emergencyReserve: 0,
  openingCash: 0,
  notes: 'Solo budget-conscious pilgrimage across 7 sacred Jyotirlingas and key pilgrimage centres. Using Sleeper trains, state buses, shared autos and dharamshalas.',
  isActive: true,
  createdAt: '2026-10-14T00:00:00.000Z',
  updatedAt: '2026-10-14T00:00:00.000Z',
};

export const INITIAL_DAYS: ItineraryDay[] = getConfirmedItineraryDays(DEFAULT_TRIP_ID);

export const INITIAL_CHECKLIST: ChecklistItem[] = getConfirmedChecklistItems(DEFAULT_TRIP_ID);

export const INITIAL_PLACES: Place[] = getConfirmedPlaces(DEFAULT_TRIP_ID);

export const INITIAL_TRANSPORT: TransportLeg[] = getConfirmedTransportLegs(DEFAULT_TRIP_ID);

export const INITIAL_DOCUMENTS: BookingDocument[] = [];

export const INITIAL_STAYS: AccommodationStay[] = getConfirmedAccommodationStays(DEFAULT_TRIP_ID);

export const INITIAL_NOTES: TripNote[] = [
  {
    id: getNoteUUID(1),
    tripId: DEFAULT_TRIP_ID,
    title: 'Emergency Contacts & Helplines',
    content: 'National Emergency: 112\nRailway Helpline: 139\nWomen Helpline: 1091\nTelangana Police: 100\nIRCTC Customer Care: 14646\nMedical Emergency: 108',
    category: 'Emergency',
    createdAt: '2026-10-14T00:00:00.000Z',
    updatedAt: '2026-10-14T00:00:00.000Z',
  },
  {
    id: getNoteUUID(2),
    tripId: DEFAULT_TRIP_ID,
    title: 'Pilgrim Darshan Tips & Codes',
    content: '1. Always keep Aadhaar original handy for temple security checkpoints.\n2. In Mahakaleshwar & Grishneshwar, garbhagriha entry demands unstitched dhoti.\n3. Deposit phones and smartwatches only at official temple trust counters and collect safe brass token.\n4. Avoid middleman agents and unauthorized darshan touts; use only official trust lines.',
    category: 'Travel Tip',
    createdAt: '2026-10-14T00:00:00.000Z',
    updatedAt: '2026-10-14T00:00:00.000Z',
  },
  {
    id: getNoteUUID(3),
    tripId: DEFAULT_TRIP_ID,
    title: 'Solo Travel Safety on Night Trains',
    content: '1. Fasten backpack to luggage hoop under sleeper berth using steel chain and key lock.\n2. Keep phone, wallet, ticket copies, and power bank in small crossbody sling pouch inside your sleeping bag/shawl.\n3. Drink only sealed bottled water or verified railway station RO fountains.',
    category: 'Travel Tip',
    createdAt: '2026-10-14T00:00:00.000Z',
    updatedAt: '2026-10-14T00:00:00.000Z',
  },
];

export const INITIAL_EXPENSES: Expense[] = [];
