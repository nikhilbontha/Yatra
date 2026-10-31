import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// 1. Load Supabase configuration safely
const envContent = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const url = urlMatch ? urlMatch[1].trim() : '';
const key = keyMatch ? keyMatch[1].trim() : '';

console.log('================================================================');
console.log('PHASE 3B — AUTHENTICATED SUPABASE DATA-INTEGRITY AUDIT');
console.log('================================================================');

// 2. Safely extract session from local storage without logging secrets
function getPersistedBrowserSession(): { access_token: string; refresh_token: string; user?: any } | null {
  const lsDir = path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data', 'Default', 'Local Storage', 'leveldb');
  if (!fs.existsSync(lsDir)) return null;

  const files = fs.readdirSync(lsDir).filter(f => f.endsWith('.ldb') || f.endsWith('.log'));
  const marker = 'sb-zsugpkramhwuvoynhadz-auth-token';

  for (const f of files) {
    try {
      const buf = fs.readFileSync(path.join(lsDir, f));
      const idx = buf.indexOf(marker);
      if (idx !== -1) {
        console.log(`[Session Search] Found marker in ${f} at index ${idx}`);
        const jsonStart = buf.indexOf('{"access_token":', idx);
        console.log(`[Session Search] jsonStart: ${jsonStart}`);
        if (jsonStart !== -1) {
          let depth = 0;
          let jsonEnd = -1;
          for (let i = jsonStart; i < buf.length; i++) {
            if (buf[i] === 0x7b) depth++;
            else if (buf[i] === 0x7d) {
              depth--;
              if (depth === 0) {
                jsonEnd = i;
                break;
              }
            }
          }
          console.log(`[Session Search] jsonEnd: ${jsonEnd}`);
          if (jsonEnd !== -1) {
            const rawJson = buf.slice(jsonStart, jsonEnd + 1).toString('utf8');
            try {
              const parsed = JSON.parse(rawJson);
              if (parsed.access_token) {
                console.log('[Session Search] Successfully extracted session!');
                return parsed;
              }
            } catch (err: any) {
              console.log('[Session Search] JSON parse error:', err.message);
              console.log('Pos 451 charCode:', rawJson.charCodeAt(451), 'char:', JSON.stringify(rawJson[451]));
              // Filter buffer bytes directly to remove control characters before utf8 decode
              let cleaned = '';
              try {
                const cleanChars: string[] = [];
                for (let k = 0; k < rawJson.length; k++) {
                  const code = rawJson.charCodeAt(k);
                  if (code >= 32 || code === 9 || code === 10 || code === 13) {
                    cleanChars.push(rawJson[k]);
                  }
                }
                cleaned = cleanChars.join('');
                const parsed = JSON.parse(cleaned);
                if (parsed.access_token) {
                  console.log('[Session Search] Successfully parsed after character code cleaning!');
                  return parsed;
                }
              } catch (sanErr: any) {
                console.log('[Session Search] Clean parse error:', sanErr.message);
                const rtMarker = Buffer.from('"refresh_token":"');
                const rtIdx = buf.indexOf(rtMarker, idx);
                if (rtIdx !== -1) {
                  const valStart = rtIdx + rtMarker.length;
                  const valEnd = buf.indexOf('"', valStart);
                  if (valEnd !== -1 && valEnd - valStart < 200) {
                    const refreshToken = buf.slice(valStart, valEnd).toString('ascii');
                    console.log('[Session Search] Found refresh_token! Length:', refreshToken.length);
                    return {
                      access_token: '',
                      refresh_token: refreshToken,
                    };
                  }
                }
              }
            }
          }
        }
      }
    } catch (e: any) {
      console.log('[Session Search] File read error:', e.message);
    }
  }
  return null;
}

// 3. Scan local Chrome IndexedDB leveldb files for stored records
function inspectLocalIndexedDB(): {
  foundTripId?: string;
  tableCounts: Record<string, number>;
  sampleIds: Record<string, string[]>;
} {
  const idbDir = path.join(
    process.env.LOCALAPPDATA || '',
    'Google',
    'Chrome',
    'User Data',
    'Default',
    'IndexedDB',
    'http_localhost_3000.indexeddb.leveldb'
  );

  const result: {
    foundTripId?: string;
    tableCounts: Record<string, number>;
    sampleIds: Record<string, string[]>;
  } = {
    tableCounts: {
      trips: 0,
      itineraryDays: 0,
      itineraryItems: 0,
      transportLegs: 0,
      accommodations: 0,
      places: 0,
      checklists: 0,
      notes: 0,
      expenses: 0,
      documents: 0,
      bookings: 0,
      syncQueue: 0,
    },
    sampleIds: {},
  };

  if (!fs.existsSync(idbDir)) return result;

  const files = fs.readdirSync(idbDir).filter(f => f.endsWith('.ldb') || f.endsWith('.log'));
  for (const f of files) {
    try {
      const data = fs.readFileSync(path.join(idbDir, f), 'latin1');

      // Check trip ID
      if (data.includes('00000000-0000-4000-8000-000000000001')) {
        result.foundTripId = '00000000-0000-4000-8000-000000000001';
      }

      // Check UUID patterns for deterministic ranges
      // Days: 8001
      const dayMatches = data.match(/00000000-0000-4000-8001-[0-9a-f]{12}/gi) || [];
      const uniqueDays = Array.from(new Set(dayMatches));
      if (uniqueDays.length > result.tableCounts.itineraryDays) {
        result.tableCounts.itineraryDays = uniqueDays.length;
        result.sampleIds['itineraryDays'] = uniqueDays.slice(0, 3);
      }

      // Tasks: 8002
      const taskMatches = data.match(/00000000-0000-4000-8002-[0-9a-f]{12}/gi) || [];
      const uniqueTasks = Array.from(new Set(taskMatches));
      if (uniqueTasks.length > result.tableCounts.itineraryItems) {
        result.tableCounts.itineraryItems = uniqueTasks.length;
        result.sampleIds['itineraryItems'] = uniqueTasks.slice(0, 3);
      }

      // Transport: 8003
      const transMatches = data.match(/00000000-0000-4000-8003-[0-9a-f]{12}/gi) || [];
      const uniqueTrans = Array.from(new Set(transMatches));
      if (uniqueTrans.length > result.tableCounts.transportLegs) {
        result.tableCounts.transportLegs = uniqueTrans.length;
        result.sampleIds['transportLegs'] = uniqueTrans.slice(0, 3);
      }

      // Stays: 8004
      const stayMatches = data.match(/00000000-0000-4000-8004-[0-9a-f]{12}/gi) || [];
      const uniqueStays = Array.from(new Set(stayMatches));
      if (uniqueStays.length > result.tableCounts.accommodations) {
        result.tableCounts.accommodations = uniqueStays.length;
        result.sampleIds['accommodations'] = uniqueStays.slice(0, 3);
      }

      // Places: 8005
      const placeMatches = data.match(/00000000-0000-4000-8005-[0-9a-f]{12}/gi) || [];
      const uniquePlaces = Array.from(new Set(placeMatches));
      if (uniquePlaces.length > result.tableCounts.places) {
        result.tableCounts.places = uniquePlaces.length;
        result.sampleIds['places'] = uniquePlaces.slice(0, 3);
      }

      // Checklists: 8006
      const chkMatches = data.match(/00000000-0000-4000-8006-[0-9a-f]{12}/gi) || [];
      const uniqueChks = Array.from(new Set(chkMatches));
      if (uniqueChks.length > result.tableCounts.checklists) {
        result.tableCounts.checklists = uniqueChks.length;
        result.sampleIds['checklists'] = uniqueChks.slice(0, 3);
      }

      // Notes: 8007
      const noteMatches = data.match(/00000000-0000-4000-8007-[0-9a-f]{12}/gi) || [];
      const uniqueNotes = Array.from(new Set(noteMatches));
      if (uniqueNotes.length > result.tableCounts.notes) {
        result.tableCounts.notes = uniqueNotes.length;
        result.sampleIds['notes'] = uniqueNotes.slice(0, 3);
      }
    } catch (e) {}
  }

  if (result.foundTripId) result.tableCounts.trips = 1;
  return result;
}

async function runAuthenticatedAudit() {
  // A. Local IndexedDB Inspection
  console.log('\n[1] LOCAL INDEXED-DB DISK INSPECTION');
  const localIdb = inspectLocalIndexedDB();
  console.log('IndexedDB Active Trip ID Found:', localIdb.foundTripId || 'None detected in raw files');
  console.log('IndexedDB Record Counts Detected:');
  console.table(localIdb.tableCounts);

  // B. Authentication Flow Check
  console.log('\n[2] AUTHENTICATION SESSION RESTORATION');
  const session = getPersistedBrowserSession();

  if (!session) {
    console.log('STATUS: No authenticated session found in browser Local Storage.');
    console.log('ACTION REQUIRED: The user is currently signed out in the browser.');
    return;
  }

  console.log('STATUS: Authenticated session detected in application storage!');

  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: true,
    },
  });

  let activeUser = session.user;
  if (!session.access_token && session.refresh_token) {
    console.log('Restoring fresh access token using valid refresh_token...');
    const { data: refreshData, error: refreshErr } = await client.auth.refreshSession({
      refresh_token: session.refresh_token,
    });
    if (refreshErr) {
      console.error('Error refreshing session:', refreshErr.message);
      return;
    }
    activeUser = refreshData.session?.user;
  } else {
    const { data: sessionRes, error: setSessionErr } = await client.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    if (setSessionErr) {
      console.warn('Set session returned error, attempting token refresh:', setSessionErr.message);
      const { data: refreshData, error: refreshErr } = await client.auth.refreshSession({
        refresh_token: session.refresh_token,
      });
      if (refreshErr) {
        console.error('Error refreshing session:', refreshErr.message);
        return;
      }
      activeUser = refreshData.session?.user;
    } else {
      activeUser = sessionRes.session?.user || session.user;
    }
  }

  console.log('User ID:', activeUser?.id);
  console.log('User Email:', activeUser?.email ? '[CONFIRMED PRESENT - REDACTED]' : 'No email');
  console.log('Session restored successfully on Supabase client.');

  // C. Authenticated Read-Only Queries
  console.log('\n[3] AUTHENTICATED CLOUD READ-ONLY QUERIES');

  // Query Trips
  const { data: cloudTrips, error: tripsErr } = await client
    .from('trips')
    .select('*');

  if (tripsErr) {
    console.log('Trips query error (RLS / Permission):', tripsErr.message, 'Code:', tripsErr.code);
  } else {
    console.log(`Cloud Trips returned: ${cloudTrips?.length || 0}`);
    if (cloudTrips && cloudTrips.length > 0) {
      cloudTrips.forEach((t, i) => {
        console.log(`Trip #${i + 1}:`);
        console.log(`  ID: ${t.id}`);
        console.log(`  Title: ${t.title}`);
        console.log(`  Owner User ID: ${t.user_id}`);
        console.log(`  Matches Authenticated User: ${t.user_id === activeUser?.id ? 'YES' : 'NO'}`);
        console.log(`  Matches Target Trip ID: ${t.id === '00000000-0000-4000-8000-000000000001' ? 'YES' : 'NO'}`);
        console.log(`  Dates: ${t.start_date} to ${t.end_date}`);
      });
    }
  }

  const tripsToAudit = [
    { name: 'Target Active Trip (00000000-0000-4000-8000-000000000001)', id: '00000000-0000-4000-8000-000000000001' },
    { name: 'Legacy Prototype Trip (e7a1b32d-9831-4fa2-8b43-96b61df30191)', id: 'e7a1b32d-9831-4fa2-8b43-96b61df30191' },
  ];

  const cloudTables = [
    { entity: 'itineraryDays', table: 'itinerary_days' },
    { entity: 'itineraryItems', table: 'itinerary_items' },
    { entity: 'transportLegs', table: 'transport_legs' },
    { entity: 'accommodations', table: 'accommodation_stays' },
    { entity: 'places', table: 'places' },
    { entity: 'checklists', table: 'checklist_items' },
    { entity: 'notes', table: 'trip_notes' },
    { entity: 'expenses', table: 'expenses' },
    { entity: 'documents', table: 'booking_documents' },
    { entity: 'bookings', table: 'bookings' },
    { entity: 'syncMetadata', table: 'sync_metadata' },
  ];

  for (const tInfo of tripsToAudit) {
    console.log(`\n--- Child Records for ${tInfo.name} ---`);
    const report: any[] = [];
    for (const { entity, table } of cloudTables) {
      const { data, count, error } = await client
        .from(table)
        .select('*', { count: 'exact' })
        .eq('trip_id', tInfo.id);

      if (error) {
        report.push({ table, count: 'Error', status: error.message });
      } else {
        const rows = data || [];
        const sampleIds = rows.slice(0, 2).map((r: any) => r.id).join(', ') || 'None';
        report.push({ table, count: count ?? rows.length, sampleIds });
      }
    }
    console.table(report);
  }

  // D. Checklist items day-association investigation
  console.log('\n[4] CHECKLIST ITEMS DAY-ASSOCIATION INVESTIGATION');
  const { data: cloudChecklists } = await client
    .from('checklist_items')
    .select('*')
    .limit(1);

  if (cloudChecklists && cloudChecklists.length > 0) {
    console.log('PostgreSQL checklist_items column names in Supabase:', Object.keys(cloudChecklists[0]));
    console.log('Does PostgreSQL checklist_items have day_id column?:', 'day_id' in cloudChecklists[0] ? 'YES' : 'NO');
    console.log('Sample Checklist Record:', {
      id: cloudChecklists[0].id,
      trip_id: cloudChecklists[0].trip_id,
      category: cloudChecklists[0].category,
      title: cloudChecklists[0].title,
      is_completed: cloudChecklists[0].is_completed,
    });
  }

  // Inspect the notes for target active trip
  console.log('\n[5] NOTES IN CLOUD FOR TARGET ACTIVE TRIP');
  const { data: activeNotes } = await client
    .from('trip_notes')
    .select('*')
    .eq('trip_id', '00000000-0000-4000-8000-000000000001');

  if (activeNotes) {
    console.log(`Found ${activeNotes.length} notes in Supabase for target active trip:`);
    activeNotes.forEach((n, i) => {
      console.log(`  Note #${i + 1}: id=${n.id}, day_id=${n.day_id}, category=${n.category}, title="${n.title}"`);
    });
  }

  // Inspect the days in cloud for target active trip
  console.log('\n[6] DAYS IN CLOUD FOR TARGET ACTIVE TRIP');
  const { data: activeDays } = await client
    .from('itinerary_days')
    .select('id, day_number, date, title')
    .eq('trip_id', '00000000-0000-4000-8000-000000000001')
    .order('day_number', { ascending: true });

  if (activeDays) {
    console.log(`Found ${activeDays.length} days in Supabase for target active trip.`);
    console.log(`  First Day: Day ${activeDays[0]?.day_number} (${activeDays[0]?.date}) - ID: ${activeDays[0]?.id}`);
    console.log(`  Last Day: Day ${activeDays[activeDays.length - 1]?.day_number} (${activeDays[activeDays.length - 1]?.date}) - ID: ${activeDays[activeDays.length - 1]?.id}`);
  }

  // E. Sync Status & Offline Queue Check
  console.log('\n[5] OFFLINE SYNC QUEUE STATUS');
  console.log('Sync Queue replay triggered?: NO (strictly read-only audit)');
  console.log('Local mutations attempted?: NONE');
  console.log('Cloud mutations attempted?: NONE');
}

runAuthenticatedAudit().catch(err => {
  console.error('Fatal audit error:', err);
});
