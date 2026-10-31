import { db, queueOfflineChange, getFullTripData, getUserDeletedStayIds, getUserDeletedTransportIds, CONFIRMED_TRIP_ID } from './db';
import { getSupabaseClient } from './supabase';
import { ConflictItem, SyncQueueItem, Expense, BookingDocument, AccommodationStay, TransportLeg } from '@/types/trip';
import { SupabaseClient } from '@supabase/supabase-js';
import { toDeterministicUUID } from './seed-data';

export interface CloudRowCounts {
  trips: number;
  itineraryDays: number;
  itineraryItems: number;
  expenses: number;
  bookings: number;
  places: number;
  checklists: number;
  transportLegs: number;
  accommodations: number;
  notes: number;
  documents: number;
  budgetCategories?: number;
}

export interface SyncTableDetail {
  name: string;
  synced: number;
  pending: number;
  status: 'synced' | 'pending' | 'idle';
}

export interface SyncResult {
  status: 'synced' | 'offline' | 'unauthenticated' | 'conflict' | 'failed';
  pendingCount: number;
  syncedCount: number;
  conflicts: ConflictItem[];
  lastSyncedAt?: string;
  message?: string;
  error?: string;
  rowCounts?: CloudRowCounts;
  tableDetails?: SyncTableDetail[];
  pendingItems?: Array<{
    id: string;
    entity: string;
    action: string;
    recordId: string;
    timestamp: string;
    error?: string;
  }>;
  failedItems?: Array<{
    entity: string;
    action: string;
    recordId?: string;
    title?: string;
    error?: string;
  }>;
}

/**
 * Map local Dexie entity names to Supabase PostgreSQL table names
 */
const ENTITY_TO_TABLE_MAP: Record<string, string> = {
  trips: 'trips',
  budgetCategories: 'budget_categories',
  itineraryDays: 'itinerary_days',
  itineraryItems: 'itinerary_items',
  expenses: 'expenses',
  bookings: 'bookings',
  documents: 'booking_documents',
  transportLegs: 'transport_legs',
  accommodations: 'accommodation_stays',
  places: 'places',
  checklists: 'checklist_items',
  notes: 'trip_notes',
};

/**
 * Dependency order for table inserts/upserts:
 * Parent tables must be inserted before child foreign key tables.
 */
export const TABLE_SYNC_ORDER = [
  'trips',
  'budget_categories',
  'itinerary_days',
  'itinerary_items',
  'places',
  'accommodation_stays',
  'transport_legs',
  'checklist_items',
  'trip_notes',
  'bookings',
  'expenses',
  'booking_documents',
];

/**
 * Sanitize a value for PostgreSQL:
 * Empty strings for UUID or DATE columns must be null.
 */
function sanitizeVal(val: any): any {
  if (val === undefined || val === '') return null;
  return val;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate and sanitize UUID format for PostgreSQL UUID columns.
 * Non-UUID strings (e.g. 'd1', invalid format) must return null to prevent 22P02 syntax errors.
 */
export function sanitizeUuid(val: any): string | null {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

/**
 * Normalize legacy 34-char deterministic activity UUIDs to valid 36-char canonical RFC 4122 UUIDs.
 */
export function canonicalizeTaskUuid(id: any): string {
  if (typeof id === 'string' && id.length === 34 && id.startsWith('00000000-0000-4000-8002-0000')) {
    return id.replace('00000000-0000-4000-8002-0000', '00000000-0000-4000-8002-000000');
  }
  return typeof id === 'string' ? id : '';
}

/**
 * Format local camelCase entity to exact PostgreSQL schema columns
 * matching 001_initial_schema.sql.
 *
 * CRITICAL RULE: Child tables (itinerary_days, itinerary_items, expenses, etc.)
 * DO NOT have a user_id column. Passing user_id causes PostgreSQL errors.
 */
export function formatRecordForPostgres(tableName: string, record: Record<string, any>, userId: string): Record<string, any> {
  const now = new Date().toISOString();

  switch (tableName) {
    case 'trips':
      return {
        id: record.id,
        user_id: userId,
        title: record.title,
        origin: record.origin,
        destination: record.destination,
        start_date: record.startDate,
        end_date: record.endDate,
        total_budget: Number(record.totalBudget || 0),
        emergency_reserve: Number(record.emergencyReserve || 0),
        opening_cash: Number(record.openingCash || 0),
        notes: sanitizeVal(record.notes),
        is_active: record.isActive !== false,
        created_at: record.createdAt || now,
        updated_at: record.updatedAt || now,
      };

    case 'budget_categories':
      return {
        id: record.id,
        trip_id: record.tripId || record.trip_id,
        name: record.name,
        icon: record.icon || 'tag',
        allocated_amount: Number(record.allocatedAmount || record.allocated_amount || 0),
        created_at: record.createdAt || now,
      };

    case 'itinerary_days':
      return {
        id: record.id,
        trip_id: record.tripId,
        day_number: Number(record.dayNumber),
        date: record.date,
        title: record.title,
        subtitle: sanitizeVal(record.subtitle),
        theme_type: record.themeType || 'Temple',
        details: sanitizeVal(record.details),
        location: sanitizeVal(record.location),
        status: record.status || 'Planned',
        created_at: record.createdAt || now,
        updated_at: record.updatedAt || now,
      };

    case 'itinerary_items':
      return {
        id: canonicalizeTaskUuid(record.id),
        trip_id: record.tripId,
        day_id: record.dayId,
        title: record.title,
        item_type: record.itemType || 'Task',
        time_estimate: sanitizeVal(record.timeEstimate),
        is_completed: Boolean(record.isCompleted),
        needs_verification: Boolean(record.needsVerification),
        verification_note: sanitizeVal(record.verificationNote),
        location: sanitizeVal(record.location),
        notes: sanitizeVal(record.notes),
        sort_order: Number(record.sortOrder || 0),
        created_at: record.createdAt || now,
        updated_at: record.updatedAt || now,
      };

    case 'expenses': {
      const VALID_CATEGORIES = ['Transport', 'Accommodation', 'Food', 'Temple / donation', 'Sightseeing', 'Shopping', 'Other'];
      const rawCategory = record.category || 'Other';
      const safeCategory = VALID_CATEGORIES.includes(rawCategory) ? rawCategory : 'Other';

      const VALID_PAYMENT_METHODS = ['Cash', 'UPI', 'Debit / credit card', 'Online booking', 'Other'];
      const rawMethod = record.paymentMethod || 'Cash';
      const safeMethod = VALID_PAYMENT_METHODS.includes(rawMethod) ? rawMethod : 'Other';

      return {
        id: record.id,
        trip_id: record.tripId,
        day_id: sanitizeUuid(record.dayId),
        date: record.date,
        title: record.title,
        amount: Number(record.amount || 0),
        category: safeCategory,
        payment_method: safeMethod,
        destination: sanitizeVal(record.destination),
        notes: sanitizeVal(record.notes),
        is_cash_inflow: Boolean(record.isCashInflow),
        receipt_url: sanitizeVal(record.receiptUrl),
        created_at: record.createdAt || now,
        updated_at: record.updatedAt || now,
      };
    }

    case 'bookings':
      return {
        id: record.id,
        trip_id: record.tripId,
        title: record.title,
        booking_type: record.bookingType || 'Train',
        reference_pnr: sanitizeVal(record.referencePnr),
        provider: sanitizeVal(record.provider),
        booking_date: sanitizeVal(record.bookingDate),
        departure_time: sanitizeVal(record.departureTime),
        arrival_time: sanitizeVal(record.arrivalTime),
        seat_details: sanitizeVal(record.seatDetails),
        status: record.status || 'Needs verification',
        notes: sanitizeVal(record.notes),
        created_at: record.createdAt || now,
        updated_at: record.updatedAt || now,
      };

    case 'booking_documents':
      return {
        id: record.id,
        trip_id: record.tripId,
        booking_id: sanitizeUuid(record.bookingId),
        title: record.title,
        doc_type: record.docType || 'Train Ticket',
        file_name: record.fileName || 'ticket.pdf',
        file_size: record.fileSize ? Number(record.fileSize) : null,
        file_type: sanitizeVal(record.fileType),
        storage_path: record.storagePath || `${userId}/${record.id}.bin`,
        travel_date: sanitizeVal(record.travelDate),
        notes: sanitizeVal(record.notes),
        created_at: record.createdAt || now,
        updated_at: record.updatedAt || now,
      };

    case 'transport_legs':
      return {
        id: record.id,
        trip_id: record.tripId,
        day_id: sanitizeUuid(record.dayId),
        from_location: record.fromLocation,
        to_location: record.toLocation,
        mode: record.mode || 'Train',
        service_number: sanitizeVal(record.serviceNumber),
        departure_time: sanitizeVal(record.departureTime),
        arrival_time: sanitizeVal(record.arrivalTime),
        status: record.status || 'Needs verification',
        needs_verification: Boolean(record.needsVerification),
        booking_ref: sanitizeVal(record.bookingRef),
        notes: sanitizeVal(record.notes),
        created_at: record.createdAt || now,
        updated_at: record.updatedAt || now,
      };

    case 'accommodation_stays': {
      let encodedNotes = record.notes || '';
      const stayStatus = record.bookingStatus || record.status;
      if (stayStatus && !encodedNotes.includes(`[status:${stayStatus}]`)) {
        encodedNotes = encodedNotes.replace(/\[status:[^\]]+\]/g, '').trim();
        encodedNotes = encodedNotes ? `${encodedNotes} [status:${stayStatus}]` : `[status:${stayStatus}]`;
      }
      return {
        id: record.id,
        trip_id: record.tripId,
        name: record.name,
        stay_type: record.stayType || 'Dharamshala',
        city: record.city,
        checkin_date: sanitizeVal(record.checkinDate),
        checkout_date: sanitizeVal(record.checkoutDate),
        estimated_cost: Number(record.estimatedCost || 0),
        contact_phone: sanitizeVal(record.contactPhone),
        address: sanitizeVal(record.address),
        booking_reference: sanitizeVal(record.bookingReference),
        notes: sanitizeVal(encodedNotes),
        created_at: record.createdAt || now,
        updated_at: record.updatedAt || now,
      };
    }

    case 'places':
      return {
        id: toDeterministicUUID(record.id),
        trip_id: toDeterministicUUID(record.tripId || CONFIRMED_TRIP_ID),
        name: record.name,
        city: record.city,
        place_type: record.placeType || 'Jyotirlinga',
        significance: sanitizeVal(record.significance),
        opening_hours: sanitizeVal(record.openingHours),
        dress_code: sanitizeVal(record.dressCode),
        darshan_type: sanitizeVal(record.darshanType),
        needs_verification: Boolean(record.needsVerification),
        map_url: sanitizeVal(record.mapUrl),
        notes: sanitizeVal(record.notes),
        created_at: record.createdAt || now,
        updated_at: record.updatedAt || now,
      };

    case 'checklist_items': {
      const validCategories = ['Documents', 'Clothing', 'Medicines', 'Electronics', 'Toiletries', 'Gear', 'Pre-Trip Preparation'];
      let safeCategory = record.category || 'Documents';
      if (!validCategories.includes(safeCategory)) {
        if (safeCategory === 'Packing') safeCategory = 'Clothing';
        else if (safeCategory === 'Health' || safeCategory === 'Health & Safety') safeCategory = 'Medicines';
        else if (safeCategory === 'Preparation' || safeCategory === 'Pre-Trip') safeCategory = 'Pre-Trip Preparation';
        else if (safeCategory === 'Tech' || safeCategory === 'Gadgets') safeCategory = 'Electronics';
        else safeCategory = 'Documents';
      }
      return {
        id: record.id,
        trip_id: record.tripId,
        category: safeCategory,
        title: record.title,
        is_completed: Boolean(record.isCompleted),
        sort_order: Number(record.sortOrder || 0),
        created_at: record.createdAt || now,
        updated_at: record.updatedAt || now,
      };
    }

    case 'trip_notes': {
      const validCategories = ['General', 'Emergency', 'Travel Tip', 'Reflection', 'Contact'];
      let safeCategory = record.category || 'General';
      if (!validCategories.includes(safeCategory)) {
        if (safeCategory === 'Daily' || safeCategory === 'Experience') safeCategory = 'Reflection';
        else if (safeCategory === 'Reminder' || safeCategory === 'Temple Rules') safeCategory = 'Travel Tip';
        else if (safeCategory === 'Important') safeCategory = 'Emergency';
        else safeCategory = 'General';
      }
      return {
        id: record.id,
        trip_id: record.tripId,
        day_id: sanitizeUuid(record.dayId),
        title: record.title,
        content: record.content,
        category: safeCategory,
        created_at: record.createdAt || now,
        updated_at: record.updatedAt || now,
      };
    }

    default: {
      const result: Record<string, any> = {};
      for (const [key, val] of Object.entries(record)) {
        if (key === 'blobData' || key === 'tasks' || key === 'offlineCached') continue;
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        result[snakeKey] = sanitizeVal(val);
      }
      return result;
    }
  }
}

/**
 * Format snake_case from PostgreSQL to camelCase for local TypeScript models
 */
export function toCamelCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = val;
  }
  return result;
}

/**
 * Query actual database row counts from Supabase to verify physical table state
 */
export async function fetchCloudRowCounts(client: SupabaseClient, tripId: string): Promise<CloudRowCounts> {
  const [
    { count: tripsCount, error: tErr },
    { count: daysCount, error: dErr },
    { count: itemsCount, error: iErr },
    { count: expCount, error: eErr },
    { count: bCount, error: bErr },
    { count: placesCount, error: pErr },
    { count: chkCount, error: cErr },
    { count: legsCount, error: lErr },
    { count: staysCount, error: sErr },
    { count: notesCount, error: nErr },
    { count: docCount, error: docErr },
    { count: bCatCount, error: bCatErr },
  ] = await Promise.all([
    client.from('trips').select('*', { count: 'exact', head: true }).eq('id', tripId),
    client.from('itinerary_days').select('*', { count: 'exact', head: true }).eq('trip_id', tripId),
    client.from('itinerary_items').select('*', { count: 'exact', head: true }).eq('trip_id', tripId),
    client.from('expenses').select('*', { count: 'exact', head: true }).eq('trip_id', tripId),
    client.from('bookings').select('*', { count: 'exact', head: true }).eq('trip_id', tripId),
    client.from('places').select('*', { count: 'exact', head: true }).eq('trip_id', tripId),
    client.from('checklist_items').select('*', { count: 'exact', head: true }).eq('trip_id', tripId),
    client.from('transport_legs').select('*', { count: 'exact', head: true }).eq('trip_id', tripId),
    client.from('accommodation_stays').select('*', { count: 'exact', head: true }).eq('trip_id', tripId),
    client.from('trip_notes').select('*', { count: 'exact', head: true }).eq('trip_id', tripId),
    client.from('booking_documents').select('*', { count: 'exact', head: true }).eq('trip_id', tripId),
    client.from('budget_categories').select('*', { count: 'exact', head: true }).eq('trip_id', tripId),
  ]);

  if (tErr) throw new Error(`Query trips failed: ${tErr.message} (Code: ${tErr.code})`);
  if (dErr) throw new Error(`Query itinerary_days failed: ${dErr.message} (Code: ${dErr.code})`);
  if (iErr) throw new Error(`Query itinerary_items failed: ${iErr.message} (Code: ${iErr.code})`);
  if (eErr) throw new Error(`Query expenses failed: ${eErr.message} (Code: ${eErr.code})`);
  if (bErr) throw new Error(`Query bookings failed: ${bErr.message} (Code: ${bErr.code})`);
  if (pErr) throw new Error(`Query places failed: ${pErr.message} (Code: ${pErr.code})`);
  if (cErr) throw new Error(`Query checklists failed: ${cErr.message} (Code: ${cErr.code})`);
  if (lErr) throw new Error(`Query transport_legs failed: ${lErr.message} (Code: ${lErr.code})`);
  if (sErr) throw new Error(`Query stays failed: ${sErr.message} (Code: ${sErr.code})`);
  if (nErr) throw new Error(`Query notes failed: ${nErr.message} (Code: ${nErr.code})`);
  if (docErr) throw new Error(`Query documents failed: ${docErr.message} (Code: ${docErr.code})`);

  return {
    trips: tripsCount ?? 0,
    itineraryDays: daysCount ?? 0,
    itineraryItems: itemsCount ?? 0,
    expenses: expCount ?? 0,
    bookings: bCount ?? 0,
    places: placesCount ?? 0,
    checklists: chkCount ?? 0,
    transportLegs: legsCount ?? 0,
    accommodations: staysCount ?? 0,
    notes: notesCount ?? 0,
    documents: docCount ?? 0,
    budgetCategories: bCatCount ?? 0,
  };
}

export interface MissingCloudRecordsCheck {
  needsImport: boolean;
  missingSummary: string[];
}

/**
 * Detect whether the active trip in Supabase is missing child entity records
 * (activities, places, transport, stays, checklists, or notes) compared to the local baseline.
 */
export async function checkMissingCloudRecords(
  client: SupabaseClient,
  tripId: string,
  local: {
    days: any[];
    places: any[];
    transportLegs: any[];
    accommodations: any[];
    checklists: any[];
    notes: any[];
  }
): Promise<MissingCloudRecordsCheck> {
  const allTasks = local.days.flatMap(d => d.tasks || []);
  const [
    { data: cloudDays, error: dErr },
    { data: cloudItems, error: iErr },
    { data: cloudPlaces, error: pErr },
    { data: cloudLegs, error: lErr },
    { data: cloudStays, error: sErr },
    { data: cloudChks, error: cErr },
    { data: cloudNotes, error: nErr },
    { data: cloudCategories, error: catErr },
  ] = await Promise.all([
    client.from('itinerary_days').select('id').eq('trip_id', tripId),
    client.from('itinerary_items').select('id').eq('trip_id', tripId),
    client.from('places').select('id').eq('trip_id', tripId),
    client.from('transport_legs').select('id').eq('trip_id', tripId),
    client.from('accommodation_stays').select('id').eq('trip_id', tripId),
    client.from('checklist_items').select('id').eq('trip_id', tripId),
    client.from('trip_notes').select('id').eq('trip_id', tripId),
    client.from('budget_categories').select('id').eq('trip_id', tripId),
  ]);

  if (dErr) throw new Error(`Query itinerary_days failed: ${dErr.message}`);
  if (iErr) throw new Error(`Query itinerary_items failed: ${iErr.message}`);
  if (pErr) throw new Error(`Query places failed: ${pErr.message}`);
  if (lErr) throw new Error(`Query transport_legs failed: ${lErr.message}`);
  if (sErr) throw new Error(`Query accommodation_stays failed: ${sErr.message}`);
  if (cErr) throw new Error(`Query checklist_items failed: ${cErr.message}`);
  if (nErr) throw new Error(`Query trip_notes failed: ${nErr.message}`);

  const cloudDayIds = new Set((cloudDays || []).map(r => r.id));
  const cloudItemIds = new Set((cloudItems || []).map(r => r.id));
  const cloudPlaceIds = new Set((cloudPlaces || []).map(r => r.id));
  const cloudLegIds = new Set((cloudLegs || []).map(r => r.id));
  const cloudStayIds = new Set((cloudStays || []).map(r => r.id));
  const cloudChkIds = new Set((cloudChks || []).map(r => r.id));
  const cloudNoteIds = new Set((cloudNotes || []).map(r => r.id));

  const missingDays = local.days.filter(d => !cloudDayIds.has(d.id));
  const missingTasks = allTasks.filter(t => !cloudItemIds.has(canonicalizeTaskUuid(t.id)));
  const missingPlaces = local.places.filter(p => !cloudPlaceIds.has(p.id) && !cloudPlaceIds.has(toDeterministicUUID(p.id)));
  const missingLegs = local.transportLegs.filter(l => !cloudLegIds.has(l.id));
  const missingStays = local.accommodations.filter(s => !cloudStayIds.has(s.id));
  const missingChks = local.checklists.filter(c => !cloudChkIds.has(c.id));
  const missingNotes = local.notes.filter(n => !cloudNoteIds.has(n.id));
  const missingCategories = !cloudCategories || cloudCategories.length === 0;

  const missing: string[] = [];
  if (missingDays.length > 0) missing.push(`days (${missingDays.length} missing)`);
  if (missingTasks.length > 0) missing.push(`activities (${missingTasks.length} missing)`);
  if (missingPlaces.length > 0) missing.push(`places (${missingPlaces.length} missing)`);
  if (missingLegs.length > 0) missing.push(`transport (${missingLegs.length} missing)`);
  if (missingStays.length > 0) missing.push(`accommodations (${missingStays.length} missing)`);
  if (missingChks.length > 0) missing.push(`checklists (${missingChks.length} missing)`);
  if (missingNotes.length > 0) missing.push(`notes (${missingNotes.length} missing)`);
  if (missingCategories) missing.push(`budget categories (missing)`);

  return {
    needsImport: missing.length > 0,
    missingSummary: missing,
  };
}

/**
 * Safely import existing local IndexedDB records into Supabase for the authenticated user.
 * Preserves local data, avoids duplicate trips, and satisfies all RLS policies and foreign keys.
 * Uses exact primary-key ID checks to ensure complete, conflict-safe synchronization.
 */
export async function safeInitialCloudImport(
  client: SupabaseClient,
  userId: string,
  tripId: string
): Promise<{ importedCount: number; message: string }> {
  const local = await getFullTripData(tripId);
  let importedCount = 0;

  // 1. Check if the parent trip row exists in Supabase
  const { data: existingCloudTrip, error: checkTripError } = await client
    .from('trips')
    .select('id, user_id, created_at, total_budget')
    .eq('id', tripId)
    .maybeSingle();

  if (checkTripError) {
    throw new Error(`Failed checking cloud trip: ${checkTripError.message} (Code: ${checkTripError.code})`);
  }

  // Insert or update parent trip first (required by RLS policy on all child tables)
  const safeUserId = existingCloudTrip?.user_id || userId;
  const tripPayload = formatRecordForPostgres('trips', local.trip, safeUserId);

  // Preserve existing cloud created_at timestamp if trip already exists
  if (existingCloudTrip?.created_at) {
    tripPayload.created_at = existingCloudTrip.created_at;
  }

  // Preserve approved trip budget of ₹10,000:
  // If cloud already has the user-entered 10,000 and local is 0, preserve 10,000
  if (existingCloudTrip && Number(existingCloudTrip.total_budget) > 0 && Number(tripPayload.total_budget) === 0) {
    tripPayload.total_budget = Number(existingCloudTrip.total_budget);
  }

  // Strictly enforce user-approved opening_cash = 0 and emergency_reserve = 0
  // (Do NOT inherit or propagate the unapproved 1,000 cloud opening-cash prototype value)
  tripPayload.opening_cash = Number(local.trip?.openingCash || 0);
  tripPayload.emergency_reserve = Number(local.trip?.emergencyReserve || 0);

  const { error: tripUpsertError } = await client.from('trips').upsert(tripPayload, { onConflict: 'id' });
  if (tripUpsertError) {
    throw new Error(`Cloud sync error on 'trips': ${tripUpsertError.message} (Code: ${tripUpsertError.code})`);
  }
  importedCount++;

  // 1b. Check and ensure budget_categories exist in Supabase (satisfies relational schema)
  try {
    const DEFAULT_BUDGET_CATEGORIES = [
      { name: 'Transport', icon: 'train', share: 0.35 },
      { name: 'Accommodation', icon: 'bed-double', share: 0.25 },
      { name: 'Food', icon: 'utensils', share: 0.15 },
      { name: 'Temple / donation', icon: 'landmark', share: 0.10 },
      { name: 'Sightseeing', icon: 'compass', share: 0.05 },
      { name: 'Shopping', icon: 'shopping-bag', share: 0.05 },
      { name: 'Other', icon: 'tag', share: 0.05 },
    ];

    const { data: cloudCategories } = await client
      .from('budget_categories')
      .select('id, name')
      .eq('trip_id', tripId);

    const existingCatMap = new Map((cloudCategories || []).map(c => [c.name, c.id]));
    const totalB = Number(tripPayload.total_budget || local.trip?.totalBudget || 0);
    const catPayload = DEFAULT_BUDGET_CATEGORIES.map(c => ({
      id: existingCatMap.get(c.name) || toDeterministicUUID(`${tripId}-category-${c.name}`),
      trip_id: tripId,
      name: c.name,
      icon: c.icon,
      allocated_amount: Math.round(totalB * c.share),
      created_at: new Date().toISOString(),
    }));
    const { error: catError } = await client.from('budget_categories').upsert(catPayload, { onConflict: 'id' });
    if (!catError) {
      importedCount += catPayload.length;
    }
  } catch (catErr: any) {
    console.warn('Budget categories sync warning:', catErr?.message);
  }

  // 2. Check if itinerary days exist using exact primary-key IDs
  const { data: cloudDays, error: daysFetchError } = await client
    .from('itinerary_days')
    .select('id')
    .eq('trip_id', tripId);

  if (daysFetchError) {
    throw new Error(`Failed checking cloud itinerary days: ${daysFetchError.message}`);
  }

  const cloudDayIdSet = new Set((cloudDays || []).map(d => d.id));
  const missingDays = local.days.filter(d => !cloudDayIdSet.has(d.id));

  // If any local days are missing from cloud, upsert only the missing days
  if (missingDays.length > 0) {
    const daysPayload = missingDays.map(d => formatRecordForPostgres('itinerary_days', d, safeUserId));
    const { error: daysError } = await client.from('itinerary_days').upsert(daysPayload, { onConflict: 'id' });
    if (daysError) {
      throw new Error(`Cloud sync error on 'itinerary_days': ${daysError.message} (Code: ${daysError.code})`);
    }
    importedCount += daysPayload.length;
  }

  // 3. Check and upsert itinerary items (daily tasks & activities) using exact IDs
  const allTasks = local.days.flatMap(d => d.tasks);
  if (allTasks.length > 0) {
    const { data: cloudItems, error: itemsFetchError } = await client
      .from('itinerary_items')
      .select('id')
      .eq('trip_id', tripId);

    if (itemsFetchError) {
      throw new Error(`Failed checking cloud itinerary items: ${itemsFetchError.message}`);
    }

    const cloudItemIdSet = new Set((cloudItems || []).map(i => i.id));
    const missingTasks = allTasks.filter(t => !cloudItemIdSet.has(canonicalizeTaskUuid(t.id)));

    if (missingTasks.length > 0) {
      const itemsPayload = missingTasks.map(t => formatRecordForPostgres('itinerary_items', t, safeUserId));
      const { error: itemsError } = await client.from('itinerary_items').upsert(itemsPayload, { onConflict: 'id' });
      if (itemsError) {
        throw new Error(`Cloud sync error on 'itinerary_items': ${itemsError.message} (Code: ${itemsError.code})`);
      }
      importedCount += itemsPayload.length;
    }
  }

  // 4. Places using exact IDs
  if (local.places.length > 0) {
    const { data: cloudPlaces, error: placesFetchError } = await client
      .from('places')
      .select('id')
      .eq('trip_id', tripId);

    if (placesFetchError) {
      throw new Error(`Failed checking cloud places: ${placesFetchError.message}`);
    }

    const cloudPlaceIdSet = new Set((cloudPlaces || []).map(p => p.id));
    const missingPlaces = local.places.filter(p => !cloudPlaceIdSet.has(p.id) && !cloudPlaceIdSet.has(toDeterministicUUID(p.id)));

    if (missingPlaces.length > 0) {
      const placesPayload = missingPlaces.map(p => formatRecordForPostgres('places', p, safeUserId));
      const { error: placesError } = await client.from('places').upsert(placesPayload, { onConflict: 'id' });
      if (placesError) {
        throw new Error(`Cloud sync error on 'places': ${placesError.message} (Code: ${placesError.code})`);
      }
      importedCount += placesPayload.length;
    }
  }

  // 5. Transport Legs using exact IDs
  if (local.transportLegs.length > 0) {
    const { data: cloudLegs, error: legsFetchError } = await client
      .from('transport_legs')
      .select('id')
      .eq('trip_id', tripId);

    if (legsFetchError) {
      throw new Error(`Failed checking cloud transport legs: ${legsFetchError.message}`);
    }

    const cloudLegIdSet = new Set((cloudLegs || []).map(l => l.id));
    const missingLegs = local.transportLegs.filter(l => !cloudLegIdSet.has(l.id));

    if (missingLegs.length > 0) {
      const legsPayload = missingLegs.map(l => formatRecordForPostgres('transport_legs', l, safeUserId));
      const { error: legsError } = await client.from('transport_legs').upsert(legsPayload, { onConflict: 'id' });
      if (legsError) {
        throw new Error(`Cloud sync error on 'transport_legs': ${legsError.message} (Code: ${legsError.code})`);
      }
      importedCount += legsPayload.length;
    }
  }

  // 6. Accommodations using exact IDs
  if (local.accommodations.length > 0) {
    const { data: cloudStays, error: staysFetchError } = await client
      .from('accommodation_stays')
      .select('id')
      .eq('trip_id', tripId);

    if (staysFetchError) {
      throw new Error(`Failed checking cloud accommodation stays: ${staysFetchError.message}`);
    }

    const cloudStayIdSet = new Set((cloudStays || []).map(s => s.id));
    const missingStays = local.accommodations.filter(s => !cloudStayIdSet.has(s.id));

    if (missingStays.length > 0) {
      const staysPayload = missingStays.map(s => formatRecordForPostgres('accommodation_stays', s, safeUserId));
      const { error: staysError } = await client.from('accommodation_stays').upsert(staysPayload, { onConflict: 'id' });
      if (staysError) {
        throw new Error(`Cloud sync error on 'accommodation_stays': ${staysError.message} (Code: ${staysError.code})`);
      }
      importedCount += staysPayload.length;
    }
  }

  // 7. Checklists using exact IDs
  if (local.checklists.length > 0) {
    const { data: cloudChks, error: chksFetchError } = await client
      .from('checklist_items')
      .select('id')
      .eq('trip_id', tripId);

    if (chksFetchError) {
      throw new Error(`Failed checking cloud checklist items: ${chksFetchError.message}`);
    }

    const cloudChkIdSet = new Set((cloudChks || []).map(c => c.id));
    const missingChks = local.checklists.filter(c => !cloudChkIdSet.has(c.id));

    if (missingChks.length > 0) {
      const chkPayload = missingChks.map(c => formatRecordForPostgres('checklist_items', c, safeUserId));
      const { error: chkError } = await client.from('checklist_items').upsert(chkPayload, { onConflict: 'id' });
      if (chkError) {
        throw new Error(`Cloud sync error on 'checklist_items': ${chkError.message} (Code: ${chkError.code})`);
      }
      importedCount += chkPayload.length;
    }
  }

  // 8. Notes using exact IDs
  if (local.notes.length > 0) {
    const { data: cloudNotes, error: notesFetchError } = await client
      .from('trip_notes')
      .select('id')
      .eq('trip_id', tripId);

    if (notesFetchError) {
      throw new Error(`Failed checking cloud trip notes: ${notesFetchError.message}`);
    }

    const cloudNoteIdSet = new Set((cloudNotes || []).map(n => n.id));
    const missingNotes = local.notes.filter(n => !cloudNoteIdSet.has(n.id));

    if (missingNotes.length > 0) {
      const notesPayload = missingNotes.map(n => formatRecordForPostgres('trip_notes', n, safeUserId));
      const { error: notesError } = await client.from('trip_notes').upsert(notesPayload, { onConflict: 'id' });
      if (notesError) {
        throw new Error(`Cloud sync error on 'trip_notes': ${notesError.message} (Code: ${notesError.code})`);
      }
      importedCount += notesPayload.length;
    }
  }

  // 9. Expenses using exact IDs (preserve user logged expenses without inventing fake records)
  if (local.expenses.length > 0) {
    const { data: cloudExpenses, error: expFetchError } = await client
      .from('expenses')
      .select('id')
      .eq('trip_id', tripId);

    if (expFetchError) {
      throw new Error(`Failed checking cloud expenses: ${expFetchError.message}`);
    }

    const cloudExpenseIdSet = new Set((cloudExpenses || []).map(e => e.id));
    const missingExpenses = local.expenses.filter(e => !cloudExpenseIdSet.has(e.id));

    if (missingExpenses.length > 0) {
      const expPayload = missingExpenses.map(e => formatRecordForPostgres('expenses', e, safeUserId));
      let { error: expError } = await client.from('expenses').upsert(expPayload, { onConflict: 'id' });
      if (expError && (expError.code === '23503' || expError.message?.includes('23503'))) {
        const fallbackPayload = expPayload.map(p => ({ ...p, day_id: null }));
        const retryRes = await client.from('expenses').upsert(fallbackPayload, { onConflict: 'id' });
        expError = retryRes.error;
      }
      if (expError) {
        throw new Error(`Cloud sync error on 'expenses': ${expError.message} (Code: ${expError.code})`);
      }
      importedCount += expPayload.length;
    }
  }

  // 10. Bookings using exact IDs (preserve real user bookings)
  if (local.bookings.length > 0) {
    const { data: cloudBookings, error: bFetchError } = await client
      .from('bookings')
      .select('id')
      .eq('trip_id', tripId);

    if (bFetchError) {
      throw new Error(`Failed checking cloud bookings: ${bFetchError.message}`);
    }

    const cloudBookingIdSet = new Set((cloudBookings || []).map(b => b.id));
    const missingBookings = local.bookings.filter(b => !cloudBookingIdSet.has(b.id));

    if (missingBookings.length > 0) {
      const bPayload = missingBookings.map(b => formatRecordForPostgres('bookings', b, safeUserId));
      const { error: bError } = await client.from('bookings').upsert(bPayload, { onConflict: 'id' });
      if (bError) {
        throw new Error(`Cloud sync error on 'bookings': ${bError.message} (Code: ${bError.code})`);
      }
      importedCount += bPayload.length;
    }
  }

  // 11. Documents using exact IDs
  if (local.documents.length > 0) {
    const { data: cloudDocs, error: docFetchError } = await client
      .from('booking_documents')
      .select('id')
      .eq('trip_id', tripId);

    if (docFetchError) {
      throw new Error(`Failed checking cloud booking documents: ${docFetchError.message}`);
    }

    const cloudDocIdSet = new Set((cloudDocs || []).map(d => d.id));
    const missingDocs = local.documents.filter(d => !cloudDocIdSet.has(d.id));

    if (missingDocs.length > 0) {
      const docPayload = missingDocs.map(d => formatRecordForPostgres('booking_documents', d, safeUserId));
      const { error: docError } = await client.from('booking_documents').upsert(docPayload, { onConflict: 'id' });
      if (docError) {
        throw new Error(`Cloud sync error on 'booking_documents': ${docError.message} (Code: ${docError.code})`);
      }
      importedCount += docPayload.length;
    }
  }

  return {
    importedCount,
    message: `Initial cloud import completed: synchronized ${importedCount} records to Supabase`,
  };
}

// Concurrency guard to prevent parallel overlapping sync runs
let isCloudSyncRunning = false;

/**
 * Execute comprehensive two-way synchronization between local IndexedDB and private Supabase cloud.
 * Features bounded exponential backoff, retry tracking, and safe conflict detection.
 */
export async function syncWithCloud(tripId: string, forceImmediate: boolean = true): Promise<SyncResult> {
  if (isCloudSyncRunning) {
    const currentPending = await db.syncQueue.where('status').anyOf(['pending', 'failed']).count();
    return {
      status: 'failed',
      pendingCount: currentPending,
      syncedCount: 0,
      conflicts: [],
      message: 'Synchronization already in progress. Please wait...',
    };
  }

  isCloudSyncRunning = true;
  let syncedCount = 0;
  const conflicts: ConflictItem[] = [];

  try {
    const allPendingOrFailed = await db.syncQueue
      .where('status')
      .anyOf(['pending', 'failed'])
      .toArray();

    const pendingCount = allPendingOrFailed.length;

    // 1. Check network connectivity
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return {
        status: 'offline',
        pendingCount,
        syncedCount: 0,
        conflicts: [],
        message: 'Offline mode: Changes queued locally on device',
      };
    }

    // 2. Check Supabase client initialization
    const client = getSupabaseClient();
    if (!client) {
      return {
        status: 'offline',
        pendingCount,
        syncedCount: 0,
        conflicts: [],
        message: 'Cloud sync not configured: Working with local IndexedDB',
      };
    }

    // 3. Check Auth session using getSession() and getUser()
    const { data: sessionData, error: sessionErr } = await client.auth.getSession();
    if (sessionErr) {
      return {
        status: 'failed',
        pendingCount,
        syncedCount: 0,
        conflicts: [],
        message: `Auth session error: ${sessionErr.message}`,
        error: sessionErr.message,
      };
    }

    const user = sessionData.session?.user;
    if (!user) {
      return {
        status: 'unauthenticated',
        pendingCount,
        syncedCount: 0,
        conflicts: [],
        message: 'Sign in to sync your pilgrimage data to the cloud',
      };
    }

    // 4. Initial Import check:
    // Check whether the trip or any child tables need initial cloud synchronization
    const local = await getFullTripData(tripId);
    let missingCheck: MissingCloudRecordsCheck;
    try {
      missingCheck = await checkMissingCloudRecords(client, tripId, local);
    } catch (checkErr: any) {
      const isAuthErr =
        checkErr.message?.includes('JWT') ||
        checkErr.message?.includes('auth') ||
        checkErr.message?.includes('PGRST301') ||
        checkErr.code === 'PGRST301';
      if (isAuthErr) {
        return {
          status: 'unauthenticated',
          pendingCount,
          syncedCount: 0,
          conflicts: [],
          message: 'Session expired. Please sign in again to sync.',
        };
      }
      throw checkErr;
    }

    if (missingCheck.needsImport && local.days.length > 0) {
      const importRes = await safeInitialCloudImport(client, user.id, tripId);
      syncedCount += importRes.importedCount;
    }

    // Ensure parent trip row exists in Supabase with current user_id before child operations
    if (local.trip) {
      const parentTripPayload = formatRecordForPostgres('trips', local.trip, user.id);
      const { error: tripError } = await client.from('trips').upsert(parentTripPayload, { onConflict: 'id' });
      if (tripError) {
        console.warn('Trip upsert warning during sync:', tripError.message);
      }

      // Ensure budget_categories in Supabase are synchronized with current trip budget ceiling
      try {
        const DEFAULT_BUDGET_CATEGORIES = [
          { name: 'Transport', icon: 'train', share: 0.35 },
          { name: 'Accommodation', icon: 'bed-double', share: 0.25 },
          { name: 'Food', icon: 'utensils', share: 0.15 },
          { name: 'Temple / donation', icon: 'landmark', share: 0.10 },
          { name: 'Sightseeing', icon: 'compass', share: 0.05 },
          { name: 'Shopping', icon: 'shopping-bag', share: 0.05 },
          { name: 'Other', icon: 'tag', share: 0.05 },
        ];
        const { data: cloudCategories } = await client
          .from('budget_categories')
          .select('id, name')
          .eq('trip_id', tripId);

        const existingCatMap = new Map((cloudCategories || []).map(c => [c.name, c.id]));
        const totalB = Number(local.trip.totalBudget || 0);
        const catPayload = DEFAULT_BUDGET_CATEGORIES.map(c => ({
          id: existingCatMap.get(c.name) || toDeterministicUUID(`${tripId}-category-${c.name}`),
          trip_id: tripId,
          name: c.name,
          icon: c.icon,
          allocated_amount: Math.round(totalB * c.share),
          created_at: new Date().toISOString(),
        }));
        const { error: catUpsertError } = await client.from('budget_categories').upsert(catPayload, { onConflict: 'id' });
        if (catUpsertError) {
          console.warn('Budget categories sync warning:', catUpsertError.message);
        } else {
          syncedCount += catPayload.length;
        }
      } catch (catErr: any) {
        console.warn('Budget categories sync warning:', catErr?.message);
      }
    }

    // 5. Process pending / failed syncQueue items with bounded exponential backoff
    const now = new Date();
    const readyItems = forceImmediate
      ? allPendingOrFailed
      : allPendingOrFailed.filter(item => {
          if (!item.nextRetry) return true;
          return new Date(item.nextRetry) <= now;
        });

    let queueFailureError: string | null = null;
    const failedItemDetails: { entity: string; action: string; recordId?: string; title?: string; error?: string }[] = [];

    if (readyItems.length > 0) {
      // Sort items by table sync order to respect foreign key constraints
      const sortedQueue = [...readyItems].sort((a, b) => {
        const tableA = ENTITY_TO_TABLE_MAP[a.entity] || '';
        const tableB = ENTITY_TO_TABLE_MAP[b.entity] || '';
        const indexA = TABLE_SYNC_ORDER.indexOf(tableA);
        const indexB = TABLE_SYNC_ORDER.indexOf(tableB);
        return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
      });

      for (const item of sortedQueue) {
        const tableName = ENTITY_TO_TABLE_MAP[item.entity];
        if (!tableName) continue;

        try {
          if (item.action === 'delete') {
            const safeId = sanitizeUuid(item.recordId);
            if (!safeId) {
              // Record had a local client ID and never reached cloud; mark as synced
              await db.syncQueue.update(item.id, {
                status: 'synced',
                error: undefined,
              });
              syncedCount++;
              continue;
            }
            const { error: delError } = await client.from(tableName).delete().eq('id', safeId);
            if (delError) {
              // If record doesn't exist on server (already deleted), treat as success
              if (delError.code === 'PGRST116' || delError.message?.includes('0 rows')) {
                await db.syncQueue.update(item.id, {
                  status: 'synced',
                  error: undefined,
                });
                syncedCount++;
                continue;
              }
              throw new Error(`Delete on ${tableName} failed: ${delError.message} (Code: ${delError.code || 'unknown'})`);
            }
          } else {
            const payload = formatRecordForPostgres(tableName, item.payload, user.id);
            let { error: upsertError } = await client.from(tableName).upsert(payload, { onConflict: 'id' });
            if (upsertError && (upsertError.code === '23503' || upsertError.message?.includes('23503'))) {
              if (payload.day_id) {
                payload.day_id = null;
                const retryRes = await client.from(tableName).upsert(payload, { onConflict: 'id' });
                upsertError = retryRes.error;
              }
            }
            if (upsertError) {
              throw new Error(`Upsert on ${tableName} (${item.recordId}) failed: ${upsertError.message} (Code: ${upsertError.code || 'unknown'})`);
            }
          }

          // Mark successfully synced
          await db.syncQueue.update(item.id, {
            status: 'synced',
            error: undefined,
          });
          syncedCount++;
        } catch (itemErr: any) {
          queueFailureError = itemErr.message || 'Operation failed';
          failedItemDetails.push({
            entity: item.entity,
            action: item.action,
            recordId: item.recordId,
            error: itemErr.message,
          });

          const nextRetryCount = (item.retryCount || 0) + 1;
          // Bounded exponential backoff: 1s, 2s, 4s, 8s, up to max 30s
          const backoffMs = Math.min(1000 * Math.pow(2, nextRetryCount), 30000);
          const nextRetry = new Date(Date.now() + backoffMs).toISOString();

          await db.syncQueue.update(item.id, {
            status: 'failed',
            error: itemErr.message,
            retryCount: nextRetryCount,
            lastAttempt: new Date().toISOString(),
            nextRetry,
          });

          // Check if this error was due to an expired/invalid token
          const isAuthErr =
            itemErr.message?.includes('JWT') ||
            itemErr.message?.includes('auth') ||
            itemErr.message?.includes('claim') ||
            itemErr.status === 401 ||
            itemErr.code === '401' ||
            itemErr.code === 'PGRST301';
          if (isAuthErr) {
            const remaining = await db.syncQueue.where('status').anyOf(['pending', 'failed']).count();
            return {
              status: 'unauthenticated',
              pendingCount: remaining,
              syncedCount,
              conflicts: [],
              message: 'Authentication expired during sync. Please sign in again.',
              error: itemErr.message,
            };
          }

          // Stop processing dependent items on this run to avoid cascading foreign key errors
          break;
        }
      }
    }

    // Clean up old synced queue items older than 2 hours
    const cutoffTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    await db.syncQueue.where('status').equals('synced').and(i => i.timestamp < cutoffTime).delete();

    // 6. Pull remote updates for active trip (Pull Phase)
    const { data: cloudTrip, error: tripPullErr } = await client
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .maybeSingle();

    if (!tripPullErr && cloudTrip) {
      const localTrip = await db.trips.get(tripId);
      const cloudUpdated = new Date(cloudTrip.updated_at).getTime();
      const localUpdated = localTrip ? new Date(localTrip.updatedAt).getTime() : 0;

      if (localTrip) {
        const camelCloud = toCamelCase(cloudTrip) as any;
        const hasContentDifference = hasMeaningfulTripDifference(localTrip, camelCloud);

        // Only flag a genuine conflict if data attributes actually differ AND local has unpushed edits
        if (hasContentDifference && cloudUpdated > localUpdated) {
          const remainingLocalEdits = await db.syncQueue
            .where('status')
            .equals('pending')
            .and(q => q.entity === 'trips' && q.recordId === tripId)
            .count();

          if (remainingLocalEdits > 0) {
            conflicts.push({
              id: `conf-trip-${tripId}`,
              entity: 'trips',
              recordId: tripId,
              localData: localTrip,
              cloudData: camelCloud,
              localUpdatedAt: localTrip.updatedAt,
              cloudUpdatedAt: cloudTrip.updated_at,
            });
          } else {
            // Cloud has genuinely newer remote changes from another device/session
            const totalBudget = (camelCloud.totalBudget !== undefined && Number(camelCloud.totalBudget) > 0)
              ? Number(camelCloud.totalBudget)
              : (localTrip.totalBudget || 0);

            const mergedCloudTrip = {
              ...localTrip,
              ...camelCloud,
              totalBudget,
              totalUpiAmount: (camelCloud.totalUpiAmount !== undefined && Number(camelCloud.totalUpiAmount) > 0)
                ? camelCloud.totalUpiAmount
                : (localTrip.totalUpiAmount !== undefined
                  ? localTrip.totalUpiAmount
                  : Math.max(0, Number(totalBudget || 0) - Number(camelCloud.openingCash || 0) - Number(camelCloud.emergencyReserve || 0))),
            };
            await db.trips.put(mergedCloudTrip);
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('yatra_persisted_trip', JSON.stringify(mergedCloudTrip));
              } catch {}
            }
          }
        } else if (Number(localTrip.totalBudget || 0) > 0 && Number(camelCloud.totalBudget || 0) === 0) {
          // Local has user-configured budget ceiling while cloud has 0: push local trip up to cloud
          const parentTripPayload = formatRecordForPostgres('trips', localTrip, user.id);
          await client.from('trips').upsert(parentTripPayload, { onConflict: 'id' });
        } else if (!hasContentDifference) {
          // Content is identical: align local Dexie timestamp with PostgreSQL trigger timestamp
          if (cloudUpdated !== localUpdated) {
            await db.trips.update(tripId, { updatedAt: cloudTrip.updated_at });
          }
        }
      }
    }

    // 6b. Clean obsolete test expenses from cloud once if requested for this trip
    const cloudExpensesCleaned = await db.meta.get('user_expenses_cloud_cleaned_v3');
    if (!cloudExpensesCleaned?.value && user) {
      await client.from('expenses').delete().eq('trip_id', tripId);
      await db.meta.put({ key: 'user_expenses_cloud_cleaned_v3', value: true, updatedAt: new Date().toISOString() });
    }

    // 6c. Pull remote expenses from Supabase for active trip (Bidirectional Sync)
    const { data: cloudExpenses, error: expPullErr } = await client
      .from('expenses')
      .select('*')
      .eq('trip_id', tripId);

    if (!expPullErr && cloudExpenses && cloudExpenses.length > 0) {
      for (const rawExp of cloudExpenses) {
        const localExp = await db.expenses.get(rawExp.id);
        const camelExp: Expense = {
          id: rawExp.id,
          tripId: rawExp.trip_id,
          dayId: rawExp.day_id || undefined,
          date: rawExp.date,
          title: rawExp.title,
          amount: Number(rawExp.amount || 0),
          category: rawExp.category || 'Other',
          paymentMethod: rawExp.payment_method || 'Cash',
          destination: rawExp.destination || undefined,
          notes: rawExp.notes || undefined,
          isCashInflow: Boolean(rawExp.is_cash_inflow),
          receiptUrl: rawExp.receipt_url || undefined,
          createdAt: rawExp.created_at || new Date().toISOString(),
          updatedAt: rawExp.updated_at || new Date().toISOString(),
        };

        if (!localExp) {
          await db.expenses.put(camelExp);
          syncedCount++;
        } else {
          const remoteUpdated = new Date(rawExp.updated_at || rawExp.created_at).getTime();
          const localUpdated = new Date(localExp.updatedAt || localExp.createdAt).getTime();
          if (remoteUpdated > localUpdated) {
            await db.expenses.put(camelExp);
            syncedCount++;
          }
        }
      }
    }

    // 6c. Push any local expenses that are not yet in Supabase
    if (local.expenses.length > 0) {
      const existingCloudExpIds = new Set((cloudExpenses || []).map(e => e.id));
      const unpushedExpenses = local.expenses.filter(e => !existingCloudExpIds.has(e.id));
      if (unpushedExpenses.length > 0) {
        const expPayload = unpushedExpenses.map(e => formatRecordForPostgres('expenses', e, user.id));
        let { error: pushErr } = await client.from('expenses').upsert(expPayload, { onConflict: 'id' });
        if (pushErr && (pushErr.code === '23503' || pushErr.message?.includes('23503'))) {
          const fallbackPayload = expPayload.map(p => ({ ...p, day_id: null }));
          const retryRes = await client.from('expenses').upsert(fallbackPayload, { onConflict: 'id' });
          pushErr = retryRes.error;
        }
        if (!pushErr) {
          syncedCount += expPayload.length;
        }
      }
    }

    // 6d. Pull remote documents from Supabase for active trip
    const { data: cloudDocuments, error: docPullErr } = await client
      .from('booking_documents')
      .select('*')
      .eq('trip_id', tripId);

    if (!docPullErr && cloudDocuments && cloudDocuments.length > 0) {
      for (const rawDoc of cloudDocuments) {
        const localDoc = await db.documents.get(rawDoc.id);
        const camelDoc: BookingDocument = {
          id: rawDoc.id,
          tripId: rawDoc.trip_id,
          bookingId: rawDoc.booking_id || undefined,
          title: rawDoc.title,
          docType: rawDoc.doc_type || 'Other',
          fileUrl: rawDoc.file_url || localDoc?.fileUrl || undefined,
          storagePath: rawDoc.storage_path || localDoc?.storagePath || undefined,
          fileName: rawDoc.file_name || localDoc?.fileName || undefined,
          fileSize: rawDoc.file_size ? Number(rawDoc.file_size) : localDoc?.fileSize,
          fileType: rawDoc.file_type || localDoc?.fileType || undefined,
          notes: rawDoc.notes || localDoc?.notes || undefined,
          travelDate: rawDoc.travel_date || localDoc?.travelDate || undefined,
          pnr: rawDoc.pnr || localDoc?.pnr || undefined,
          bookingRef: rawDoc.booking_ref || localDoc?.bookingRef || undefined,
          status: rawDoc.status || localDoc?.status || 'Confirmed',
          offlineCached: Boolean(rawDoc.offline_cached || localDoc?.offlineCached || localDoc?.blobData || localDoc?.pdfBlob || localDoc?.imageBlob),
          // Strictly preserve local blobs and offline data attachments
          blobData: localDoc?.blobData,
          pdfBlob: localDoc?.pdfBlob,
          pdfUrl: localDoc?.pdfUrl,
          pdfFileName: localDoc?.pdfFileName,
          pdfFileSize: localDoc?.pdfFileSize,
          imageBlob: localDoc?.imageBlob,
          imageUrl: localDoc?.imageUrl,
          imageFileName: localDoc?.imageFileName,
          imageFileSize: localDoc?.imageFileSize,
          // Preserve transit metadata
          trainName: (rawDoc as any).train_name || localDoc?.trainName,
          trainNumber: (rawDoc as any).train_number || localDoc?.trainNumber,
          coachSeat: (rawDoc as any).coach_seat || localDoc?.coachSeat,
          classType: (rawDoc as any).class_type || localDoc?.classType,
          fromCity: (rawDoc as any).from_city || localDoc?.fromCity,
          toCity: (rawDoc as any).to_city || localDoc?.toCity,
          departureTime: (rawDoc as any).departure_time || localDoc?.departureTime,
          arrivalTime: (rawDoc as any).arrival_time || localDoc?.arrivalTime,
          platform: (rawDoc as any).platform || localDoc?.platform,
          totalAmount: (rawDoc as any).total_amount || localDoc?.totalAmount,
          createdAt: rawDoc.created_at || new Date().toISOString(),
          updatedAt: rawDoc.updated_at || new Date().toISOString(),
        };

        if (!localDoc) {
          await db.documents.put(camelDoc);
          syncedCount++;
        } else {
          const remoteUpdated = new Date(rawDoc.updated_at || rawDoc.created_at).getTime();
          const localUpdated = new Date(localDoc.updatedAt || localDoc.createdAt).getTime();
          if (remoteUpdated > localUpdated) {
            await db.documents.put(camelDoc);
            syncedCount++;
          }
        }
      }
    }

    // 6e. Pull remote accommodations from Supabase for active trip
    const { data: cloudStays, error: stayPullErr } = await client
      .from('accommodation_stays')
      .select('*')
      .eq('trip_id', tripId);

    if (!stayPullErr && cloudStays && cloudStays.length > 0) {
      const deletedStays = await getUserDeletedStayIds();
      for (const rawStay of cloudStays) {
        if (deletedStays.has(rawStay.id)) continue;
        const localStay = await db.accommodations.get(rawStay.id);
        let pulledStatus = rawStay.booking_status || rawStay.status || localStay?.bookingStatus;
        let cleanNotes = rawStay.notes || undefined;
        if (cleanNotes && cleanNotes.includes('[status:')) {
          const match = cleanNotes.match(/\[status:([^\]]+)\]/);
          if (match && match[1]) {
            pulledStatus = match[1];
          }
          cleanNotes = cleanNotes.replace(/\[status:[^\]]+\]/g, '').trim() || undefined;
        }

        const camelStay: AccommodationStay = {
          id: rawStay.id,
          tripId: rawStay.trip_id,
          name: rawStay.name,
          stayType: rawStay.stay_type || 'Dharamshala',
          city: rawStay.city,
          checkinDate: rawStay.checkin_date || undefined,
          checkoutDate: rawStay.checkout_date || undefined,
          estimatedCost: Number(rawStay.estimated_cost || 0),
          contactPhone: rawStay.contact_phone || undefined,
          address: rawStay.address || undefined,
          bookingReference: rawStay.booking_reference || undefined,
          bookingStatus: (pulledStatus || 'Needs research') as any,
          status: (pulledStatus || 'Needs research') as any,
          capacityPersons: rawStay.capacity_persons || localStay?.capacityPersons || 1,
          nightsCount: rawStay.nights_count || localStay?.nightsCount || 1,
          notes: cleanNotes,
          documentUrl: rawStay.document_url || localStay?.documentUrl,
          documentName: rawStay.document_name || localStay?.documentName,
          documentSize: rawStay.document_size || localStay?.documentSize,
          imageUrl: rawStay.image_url || localStay?.imageUrl || '/images/shirdi-dharamshala.jpg',
          imageBlob: localStay?.imageBlob,
          imageFileName: localStay?.imageFileName,
          imageFileSize: localStay?.imageFileSize,
          pdfBlob: localStay?.pdfBlob,
          pdfUrl: localStay?.pdfUrl,
          pdfFileName: localStay?.pdfFileName,
          pdfFileSize: localStay?.pdfFileSize,
          mapsUrl: rawStay.maps_url || localStay?.mapsUrl,
          attachedDocuments: localStay?.attachedDocuments,
          createdAt: rawStay.created_at || new Date().toISOString(),
          updatedAt: rawStay.updated_at || new Date().toISOString(),
        };

        if (!localStay) {
          await db.accommodations.put(camelStay);
          syncedCount++;
        } else {
          const remoteUpdated = new Date(rawStay.updated_at || rawStay.created_at).getTime();
          const localUpdated = new Date(localStay.updatedAt || localStay.createdAt).getTime();
          if (remoteUpdated > localUpdated) {
            await db.accommodations.put(camelStay);
            syncedCount++;
          }
        }
      }
    }

    // 6f. Pull remote transport legs from Supabase for active trip
    const { data: cloudTransport, error: transPullErr } = await client
      .from('transport_legs')
      .select('*')
      .eq('trip_id', tripId);

    if (!transPullErr && cloudTransport && cloudTransport.length > 0) {
      const deletedTransports = await getUserDeletedTransportIds();
      for (const rawLeg of cloudTransport) {
        if (deletedTransports.has(rawLeg.id)) continue;
        const localLeg = await db.transportLegs.get(rawLeg.id);
        const camelLeg: TransportLeg = {
          id: rawLeg.id,
          tripId: rawLeg.trip_id,
          dayId: rawLeg.day_id || undefined,
          fromLocation: rawLeg.from_location,
          toLocation: rawLeg.to_location,
          mode: rawLeg.mode || 'Train',
          serviceNumber: rawLeg.service_number || undefined,
          departureTime: rawLeg.departure_time || undefined,
          arrivalTime: rawLeg.arrival_time || undefined,
          status: rawLeg.status || 'Needs verification',
          needsVerification: Boolean(rawLeg.needs_verification),
          bookingRef: rawLeg.booking_ref || undefined,
          notes: rawLeg.notes || undefined,
          createdAt: rawLeg.created_at || new Date().toISOString(),
          updatedAt: rawLeg.updated_at || new Date().toISOString(),
        };

        if (!localLeg) {
          await db.transportLegs.put(camelLeg);
          syncedCount++;
        } else {
          const remoteUpdated = new Date(rawLeg.updated_at || rawLeg.created_at).getTime();
          const localUpdated = new Date(localLeg.updatedAt || localLeg.createdAt).getTime();
          if (remoteUpdated > localUpdated) {
            await db.transportLegs.put(camelLeg);
            syncedCount++;
          }
        }
      }
    }

    // 7. Verify actual Supabase database row counts
    const rowCounts = await fetchCloudRowCounts(client, tripId);

    const syncedIso = new Date().toISOString();
    await db.meta.put({
      key: 'lastSyncedAt',
      value: syncedIso,
      updatedAt: syncedIso,
    });

    const remainingPending = await db.syncQueue.where('status').anyOf(['pending', 'failed']).count();
    const pendingQueueItems = await db.syncQueue.where('status').anyOf(['pending', 'failed']).toArray();

    const tableDetails: SyncTableDetail[] = [
      {
        name: 'Itinerary Days & Activities',
        synced: rowCounts.itineraryDays + rowCounts.itineraryItems,
        pending: pendingQueueItems.filter(q => q.entity === 'itineraryDays' || q.entity === 'itineraryItems').length,
        status: pendingQueueItems.some(q => q.entity === 'itineraryDays' || q.entity === 'itineraryItems') ? 'pending' : 'synced',
      },
      {
        name: 'Transport Journeys',
        synced: rowCounts.transportLegs,
        pending: pendingQueueItems.filter(q => q.entity === 'transportLegs').length,
        status: pendingQueueItems.some(q => q.entity === 'transportLegs') ? 'pending' : 'synced',
      },
      {
        name: 'Accommodations & Stays',
        synced: rowCounts.accommodations,
        pending: pendingQueueItems.filter(q => q.entity === 'accommodations').length,
        status: pendingQueueItems.some(q => q.entity === 'accommodations') ? 'pending' : 'synced',
      },
      {
        name: 'Documents & Passes',
        synced: rowCounts.documents,
        pending: pendingQueueItems.filter(q => q.entity === 'documents' || q.entity === 'bookings').length,
        status: pendingQueueItems.some(q => q.entity === 'documents' || q.entity === 'bookings') ? 'pending' : 'synced',
      },
      {
        name: 'Expenses & Budget',
        synced: rowCounts.expenses,
        pending: pendingQueueItems.filter(q => q.entity === 'expenses').length,
        status: pendingQueueItems.some(q => q.entity === 'expenses') ? 'pending' : 'synced',
      },
      {
        name: 'Checklists & Notes',
        synced: rowCounts.checklists + rowCounts.notes,
        pending: pendingQueueItems.filter(q => q.entity === 'checklists' || q.entity === 'notes').length,
        status: pendingQueueItems.some(q => q.entity === 'checklists' || q.entity === 'notes') ? 'pending' : 'synced',
      },
    ];

    const pendingItemsSummary = pendingQueueItems.map(q => ({
      id: q.id,
      entity: q.entity,
      action: q.action,
      recordId: q.recordId,
      timestamp: q.timestamp || (q as any).createdAt || new Date().toISOString(),
      error: q.error,
    }));

    // If any items are marked failed or queue error occurred, report status 'failed' with reason
    const failedQueueItems = pendingQueueItems.filter(q => q.status === 'failed');
    if (failedQueueItems.length > 0) {
      const primaryError = queueFailureError || failedQueueItems[0].error || 'One or more operations could not be synchronized to cloud';
      return {
        status: 'failed',
        pendingCount: remainingPending,
        syncedCount,
        conflicts,
        lastSyncedAt: syncedIso,
        rowCounts,
        tableDetails,
        pendingItems: pendingItemsSummary,
        error: primaryError,
        message: `Sync failed: ${primaryError}`,
        failedItems: failedItemDetails.length > 0 ? failedItemDetails : failedQueueItems.map(f => ({
          entity: f.entity,
          action: f.action,
          recordId: f.recordId,
          error: f.error,
        })),
      };
    }

    const summaryText = `Synced: ${rowCounts.itineraryDays} days, ${rowCounts.itineraryItems} activities, ${rowCounts.places} places in Supabase`;

    return {
      status: conflicts.length > 0 ? 'conflict' : 'synced',
      pendingCount: remainingPending,
      syncedCount,
      conflicts,
      lastSyncedAt: syncedIso,
      rowCounts,
      tableDetails,
      pendingItems: pendingItemsSummary,
      message: conflicts.length > 0 ? 'Sync completed with conflict alerts requiring review' : summaryText,
    };
  } catch (err: any) {
    const errorMsg = err.message || 'Unknown network error';
    console.error('Cloud synchronization error:', err);
    const remainingPending = await db.syncQueue.where('status').anyOf(['pending', 'failed']).count();

    return {
      status: 'failed',
      pendingCount: remainingPending,
      syncedCount,
      conflicts,
      error: errorMsg,
      message: `Sync failed: ${errorMsg}`,
    };
  } finally {
    isCloudSyncRunning = false;
  }
}

/**
 * Compare local and cloud trip fields to determine if a real data divergence exists
 */
export function hasMeaningfulTripDifference(local: any, cloud: any): boolean {
  if (!local || !cloud) return false;
  return (
    (local.title || '') !== (cloud.title || '') ||
    (local.origin || '') !== (cloud.origin || '') ||
    (local.destination || '') !== (cloud.destination || '') ||
    (local.startDate || '') !== (cloud.startDate || '') ||
    (local.endDate || '') !== (cloud.endDate || '') ||
    Number(local.totalBudget || 0) !== Number(cloud.totalBudget || 0) ||
    Number(local.emergencyReserve || 0) !== Number(cloud.emergencyReserve || 0) ||
    Number(local.openingCash || 0) !== Number(cloud.openingCash || 0) ||
    (local.notes || '') !== (cloud.notes || '') ||
    Boolean(local.isActive) !== Boolean(cloud.isActive)
  );
}

/**
 * Conflict resolution handler
 */
export async function resolveConflict(
  conflict: ConflictItem,
  choice: 'keep_local' | 'keep_cloud'
): Promise<void> {
  const table = (db as any)[conflict.entity];
  if (!table) return;

  if (choice === 'keep_local') {
    const updatedLocal = {
      ...conflict.localData,
      updatedAt: new Date().toISOString(),
    };
    await table.put(updatedLocal);
    await queueOfflineChange(conflict.entity, 'update', conflict.recordId, updatedLocal);
  } else {
    // Dismiss pending local edits for this record so they do not overwrite cloud
    await db.syncQueue
      .where('entity')
      .equals(conflict.entity)
      .and(q => q.recordId === conflict.recordId)
      .delete();
    await table.put(conflict.cloudData);
  }
}
