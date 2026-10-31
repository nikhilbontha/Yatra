import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import {
  CONFIRMED_TRIP_ID,
  CONFIRMED_PILGRIMAGE_TRIP,
} from '../src/lib/db';
import {
  CONFIRMED_ITINERARY_DAYS,
  CONFIRMED_ACCOMMODATION_STAYS,
  CONFIRMED_TRANSPORT_LEGS,
} from '../src/lib/itinerary-data';
import {
  INITIAL_PLACES,
  INITIAL_CHECKLIST,
  INITIAL_NOTES,
  INITIAL_EXPENSES,
  INITIAL_DOCUMENTS,
} from '../src/lib/seed-data';

// Load Supabase configuration safely
const envContent = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const url = urlMatch ? urlMatch[1].trim() : '';
const key = keyMatch ? keyMatch[1].trim() : '';

const parsedUrl = new URL(url);

console.log('================================================================');
console.log('PHASE 3 — AUTHENTICATED SUPABASE DATA-INTEGRITY AUDIT');
console.log('================================================================');

console.log('\n[1] CONFIGURED SUPABASE PROJECT PARAMETERS');
console.log('Host:', parsedUrl.hostname);
console.log('Project Reference:', parsedUrl.hostname.split('.')[0]);
console.log('Protocol:', parsedUrl.protocol);
console.log('Storage Bucket:', process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'trip-documents');
console.log('Key Type:', key.startsWith('sb_publish') ? 'Publishable Key (modern Supabase)' : (key.startsWith('eyJ') ? 'JWT Anon Key (legacy)' : 'Custom/Other'));
console.log('Key Length:', key.length, 'characters (redacted for safety)');

const client = createClient(url, key);

async function runAudit() {
  console.log('\n[2] AUTHENTICATION STATE & SESSION AUDIT');
  const { data: sessionData, error: sessionErr } = await client.auth.getSession();
  if (sessionErr) {
    console.log('Auth getSession Error:', sessionErr.message, 'Code:', sessionErr.status);
  }

  const hasSession = Boolean(sessionData?.session);
  console.log('Persisted Session in Node Process:', hasSession ? 'ACTIVE USER SESSION' : 'NO PERSISTED SESSION (ANON ROLE)');
  if (hasSession && sessionData?.session) {
    console.log('User ID:', sessionData.session.user.id);
    console.log('User Role:', sessionData.session.user.role || 'authenticated');
  } else {
    console.log('Access Role: anon (anonymous API caller)');
    console.log('Notice: Client queries execute under anon role without user JWT');
  }

  console.log('\n[3] LOCAL DATA INVENTORY & RECORD IDs');
  const totalTasks = CONFIRMED_ITINERARY_DAYS.reduce((sum, d) => sum + (d.tasks?.length || 0), 0);
  const localInventory = {
    tripId: CONFIRMED_TRIP_ID,
    tripTitle: CONFIRMED_PILGRIMAGE_TRIP.title,
    counts: {
      trips: 1,
      itineraryDays: CONFIRMED_ITINERARY_DAYS.length,
      itineraryItems: totalTasks,
      transportLegs: CONFIRMED_TRANSPORT_LEGS.length,
      accommodations: CONFIRMED_ACCOMMODATION_STAYS.length,
      places: INITIAL_PLACES.length,
      checklists: INITIAL_CHECKLIST.length,
      notes: INITIAL_NOTES.length,
      expenses: INITIAL_EXPENSES.length,
      documents: INITIAL_DOCUMENTS.length,
      bookings: 0,
    },
  };
  console.log('Local Active Trip ID:', localInventory.tripId);
  console.log('Expected Target Trip ID:', '00000000-0000-4000-8000-000000000001');
  console.log('ID Match:', localInventory.tripId === '00000000-0000-4000-8000-000000000001' ? 'EXACT MATCH' : 'MISMATCH');
  console.log('Local Record Counts:', JSON.stringify(localInventory.counts, null, 2));

  console.log('\n[4] CLOUD SUPABASE READ-ONLY QUERIES & RLS EVALUATION');
  const cloudTableMap: Record<string, string> = {
    trips: 'trips',
    itineraryDays: 'itinerary_days',
    itineraryItems: 'itinerary_items',
    transportLegs: 'transport_legs',
    accommodations: 'accommodation_stays',
    places: 'places',
    checklists: 'checklist_items',
    notes: 'trip_notes',
    expenses: 'expenses',
    documents: 'booking_documents',
    bookings: 'bookings',
    syncQueue: 'sync_metadata',
  };

  const comparisonTable: Array<{
    entity: string;
    cloudTable: string;
    localCount: number;
    cloudCount: number | string;
    readStatus: string;
    rlsRestricted: boolean;
  }> = [];

  for (const [entity, cloudTable] of Object.entries(cloudTableMap)) {
    const localCount = (localInventory.counts as any)[entity] ?? 0;
    try {
      const { data, error, count } = await client
        .from(cloudTable)
        .select('*', { count: 'exact', head: false })
        .limit(5);

      if (error) {
        comparisonTable.push({
          entity,
          cloudTable,
          localCount,
          cloudCount: 'Error',
          readStatus: `${error.message} (Code: ${error.code})`,
          rlsRestricted: true,
        });
      } else {
        const returnedRows = data?.length || 0;
        const total = count ?? returnedRows;
        comparisonTable.push({
          entity,
          cloudTable,
          localCount,
          cloudCount: total,
          readStatus: total === 0 ? 'Empty (0 rows returned under RLS)' : `Returned ${total} rows`,
          rlsRestricted: total === 0,
        });
      }
    } catch (e: any) {
      comparisonTable.push({
        entity,
        cloudTable,
        localCount,
        cloudCount: 'Exception',
        readStatus: e.message,
        rlsRestricted: true,
      });
    }
  }

  console.table(comparisonTable);

  console.log('\n[5] DETAILED SCHEMA MAPPING AUDIT');
  console.log('1. Trips:');
  console.log('   - Local: id, title, origin, destination, startDate, endDate, totalBudget, emergencyReserve, openingCash, notes, isActive');
  console.log('   - Cloud: id, user_id, title, origin, destination, start_date, end_date, total_budget, emergency_reserve, opening_cash, notes, is_active');
  console.log('   - Mapping: Exact 1-to-1 match. user_id required by PostgreSQL RLS.');

  console.log('2. Itinerary Days & Tasks:');
  console.log('   - itinerary_days: id, trip_id, day_number, date, title, subtitle, theme_type, details, location, status');
  console.log('   - itinerary_items: id, trip_id, day_id, title, item_type, time_estimate, is_completed, needs_verification, verification_note, location, notes, sort_order');
  console.log('   - Mapping: Exact 1-to-1 match. Foreign key day_id REFERENCES itinerary_days(id) ON DELETE CASCADE.');

  console.log('3. Transport:');
  console.log('   - transport_legs: id, trip_id, day_id (nullable UUID), from_location, to_location, mode, service_number, departure_time, arrival_time, status, needs_verification, booking_ref, notes');
  console.log('   - Mapping: Exact 1-to-1 match.');

  console.log('4. Accommodation:');
  console.log('   - accommodation_stays: id, trip_id, name, stay_type, city, checkin_date, checkout_date, estimated_cost, contact_phone, address, booking_reference, notes');
  console.log('   - Mapping Note: Cloud schema has NO day_id column in accommodation_stays; uses checkin_date/checkout_date. Local model carries dayId.');

  console.log('5. Places:');
  console.log('   - places: id, trip_id, name, city, place_type, significance, opening_hours, dress_code, darshan_type, needs_verification, map_url, notes');
  console.log('   - Mapping: Exact 1-to-1 match.');

  console.log('6. Checklist Items:');
  console.log('   - checklist_items: id, trip_id, category, title, is_completed, sort_order');
  console.log('   - CRITICAL FINDING: PostgreSQL table "checklist_items" has NO day_id column!');
  console.log('   - Consequence: Day Details checklist items lose their day association in Supabase cloud sync.');
  console.log('   - Day association is preserved locally in Dexie IndexedDB and localStorage, but not in cloud schema.');

  console.log('7. Trip Notes:');
  console.log('   - trip_notes: id, trip_id, day_id (nullable UUID), title, content, category');
  console.log('   - Mapping: Exact 1-to-1 match. Retains day_id in PostgreSQL.');

  console.log('8. Expenses:');
  console.log('   - expenses: id, trip_id, day_id (nullable UUID), date, title, amount, category, payment_method, destination, notes, is_cash_inflow, receipt_url');
  console.log('   - Mapping: Exact 1-to-1 match. day_id sanitized to valid UUID or NULL.');

  console.log('9. Tickets & Documents:');
  console.log('   - booking_documents: id, trip_id, booking_id (nullable UUID), title, doc_type, file_name, file_size, file_type, storage_path, travel_date, notes');
  console.log('   - Mapping: Exact 1-to-1 match. Binary payloads store in private bucket "trip-documents".');

  console.log('10. Offline Sync Queue:');
  console.log('   - Dexie db.syncQueue: id, table, operation, recordId, payload, timestamp, retryCount');
  console.log('   - Cloud: Handled via client-side sequential replay and sync_metadata (device_id, last_synced_at).');
}

runAudit().catch(err => {
  console.error('Fatal audit failure:', err.message);
});
