import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';

// Store sync data in os.tmpdir() to prevent Next.js / Turbopack file watcher from triggering full page reloads
const SYNC_DIR = path.join(os.tmpdir(), 'yatra-local-sync');
const SYNC_FILE = path.join(SYNC_DIR, 'sync-store.json');

interface TripSyncData {
  trip?: any;
  expenses: any[];
  accommodations: any[];
  transportLegs: any[];
  documents: any[];
  notes: any[];
  checklists: any[];
  places: any[];
  deletedStayIds: string[];
  deletedTransportIds: string[];
  deletedExpenseIds: string[];
  lastUpdated: string;
}

interface LocalSyncStore {
  version: number;
  lastUpdated: string;
  trips: Record<string, TripSyncData>;
}

let memoryStore: LocalSyncStore | null = null;
let lastFileMtime: number = 0;

function loadSyncStore(): LocalSyncStore {
  try {
    if (fs.existsSync(SYNC_FILE)) {
      const stats = fs.statSync(SYNC_FILE);
      if (stats.mtimeMs !== lastFileMtime || !memoryStore) {
        const raw = fs.readFileSync(SYNC_FILE, 'utf-8');
        memoryStore = JSON.parse(raw);
        lastFileMtime = stats.mtimeMs;
      }
      if (memoryStore && typeof memoryStore === 'object' && memoryStore.trips) {
        return memoryStore;
      }
    }
  } catch (err) {
    console.warn('[LocalSync] Error reading sync-store.json:', err);
  }

  if (!memoryStore) {
    memoryStore = {
      version: 1,
      lastUpdated: new Date().toISOString(),
      trips: {},
    };
  }
  return memoryStore;
}

function saveSyncStore(store: LocalSyncStore): void {
  memoryStore = store;
  try {
    if (!fs.existsSync(SYNC_DIR)) {
      fs.mkdirSync(SYNC_DIR, { recursive: true });
    }
    fs.writeFileSync(SYNC_FILE, JSON.stringify(store, null, 2), 'utf-8');
    const stats = fs.statSync(SYNC_FILE);
    lastFileMtime = stats.mtimeMs;
  } catch (err) {
    console.warn('[LocalSync] Error saving sync-store.json:', err);
  }
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tripId = searchParams.get('tripId') || '00000000-0000-4000-8000-000000000001';
  const since = searchParams.get('since');

  const store = loadSyncStore();
  const tripData = store.trips[tripId];

  if (!tripData) {
    return NextResponse.json(
      {
        updated: false,
        serverTime: new Date().toISOString(),
        lastUpdated: store.lastUpdated,
        message: 'No server data recorded yet for this trip',
      },
      { headers: CORS_HEADERS }
    );
  }

  // If client's timestamp is equal to or newer than server's last updated time, return not updated
  if (since && tripData.lastUpdated) {
    const sinceTime = new Date(since).getTime();
    const serverTime = new Date(tripData.lastUpdated).getTime();
    if (!isNaN(sinceTime) && !isNaN(serverTime) && sinceTime >= serverTime) {
      return NextResponse.json(
        {
          updated: false,
          serverTime: new Date().toISOString(),
          lastUpdated: tripData.lastUpdated,
        },
        { headers: CORS_HEADERS }
      );
    }
  }

  return NextResponse.json(
    {
      updated: true,
      serverTime: new Date().toISOString(),
      lastUpdated: tripData.lastUpdated,
      data: tripData,
    },
    { headers: CORS_HEADERS }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tripId = body.tripId || '00000000-0000-4000-8000-000000000001';
    const store = loadSyncStore();
    const now = new Date().toISOString();

    if (!store.trips[tripId]) {
      store.trips[tripId] = {
        expenses: [],
        accommodations: [],
        transportLegs: [],
        documents: [],
        notes: [],
        checklists: [],
        places: [],
        deletedStayIds: [],
        deletedTransportIds: [],
        deletedExpenseIds: [],
        lastUpdated: now,
      };
    }

    const current = store.trips[tripId];

    // Helper: merge array by ID preserving newer items
    const mergeEntities = (existingArr: any[], incomingArr: any[], deletedIds: string[] = []) => {
      const map = new Map<string, any>();
      for (const item of existingArr || []) {
        if (item && item.id && !deletedIds.includes(item.id)) map.set(item.id, item);
      }
      for (const item of incomingArr || []) {
        if (item && item.id && !deletedIds.includes(item.id)) {
          const old = map.get(item.id);
          if (!old || !old.updatedAt || (item.updatedAt && item.updatedAt >= old.updatedAt)) {
            map.set(item.id, item);
          }
        }
      }
      return Array.from(map.values());
    };

    // 1. Merge full dataset (bulk sync)
    if (body.fullData) {
      const fd = body.fullData;

      // Merge Trip settings preserving non-zero budgets
      if (fd.trip) {
        current.trip = {
          ...(current.trip || {}),
          ...fd.trip,
          totalBudget: fd.trip.totalBudget !== undefined ? fd.trip.totalBudget : (current.trip?.totalBudget || 0),
          totalUpiAmount: fd.trip.totalUpiAmount !== undefined ? fd.trip.totalUpiAmount : current.trip?.totalUpiAmount,
          emergencyReserve: fd.trip.emergencyReserve !== undefined ? fd.trip.emergencyReserve : current.trip?.emergencyReserve,
          openingCash: fd.trip.openingCash !== undefined ? fd.trip.openingCash : current.trip?.openingCash,
          updatedAt: fd.trip.updatedAt || now,
        };
      }

      // Merge deleted tombstones
      if (Array.isArray(fd.deletedStayIds)) {
        current.deletedStayIds = Array.from(new Set([...(current.deletedStayIds || []), ...fd.deletedStayIds]));
      }
      if (Array.isArray(fd.deletedTransportIds)) {
        current.deletedTransportIds = Array.from(new Set([...(current.deletedTransportIds || []), ...fd.deletedTransportIds]));
      }
      if (Array.isArray(fd.deletedExpenseIds)) {
        current.deletedExpenseIds = Array.from(new Set([...(current.deletedExpenseIds || []), ...fd.deletedExpenseIds]));
      }

      // Merge entity collections
      if (Array.isArray(fd.accommodations)) {
        current.accommodations = mergeEntities(current.accommodations, fd.accommodations, current.deletedStayIds);
      }
      if (Array.isArray(fd.transportLegs)) {
        current.transportLegs = mergeEntities(current.transportLegs, fd.transportLegs, current.deletedTransportIds);
      }
      if (Array.isArray(fd.expenses)) {
        current.expenses = mergeEntities(current.expenses, fd.expenses, current.deletedExpenseIds);
      }
      if (Array.isArray(fd.documents)) {
        current.documents = mergeEntities(current.documents, fd.documents);
      }
      if (Array.isArray(fd.notes)) {
        current.notes = mergeEntities(current.notes, fd.notes);
      }
      if (Array.isArray(fd.checklists)) {
        current.checklists = mergeEntities(current.checklists, fd.checklists);
      }
      if (Array.isArray(fd.places)) {
        current.places = mergeEntities(current.places, fd.places);
      }
    }

    // 2. Merge single delta / change
    const delta = body.delta || (body.change ? {
      entity: body.change.entity,
      action: body.change.action,
      item: body.change.record,
      id: typeof body.change.record === 'string' ? body.change.record : body.change.record?.id,
    } : null);

    if (delta) {
      const { entity, action, item, id } = delta;

      if (entity === 'accommodations') {
        if (action === 'delete') {
          current.accommodations = (current.accommodations || []).filter(x => x.id !== id);
          if (id && !current.deletedStayIds.includes(id)) current.deletedStayIds.push(id);
        } else if (item && item.id) {
          const idx = (current.accommodations || []).findIndex(x => x.id === item.id);
          if (idx >= 0) current.accommodations[idx] = item;
          else current.accommodations.push(item);
          current.deletedStayIds = (current.deletedStayIds || []).filter(x => x !== item.id);
        }
      } else if (entity === 'transportLegs') {
        if (action === 'delete') {
          current.transportLegs = (current.transportLegs || []).filter(x => x.id !== id);
          if (id && !current.deletedTransportIds.includes(id)) current.deletedTransportIds.push(id);
        } else if (item && item.id) {
          const idx = (current.transportLegs || []).findIndex(x => x.id === item.id);
          if (idx >= 0) current.transportLegs[idx] = item;
          else current.transportLegs.push(item);
          current.deletedTransportIds = (current.deletedTransportIds || []).filter(x => x !== item.id);
        }
      } else if (entity === 'expenses') {
        if (action === 'delete') {
          current.expenses = (current.expenses || []).filter(x => x.id !== id);
          if (id && !current.deletedExpenseIds.includes(id)) current.deletedExpenseIds.push(id);
        } else if (item && item.id) {
          const idx = (current.expenses || []).findIndex(x => x.id === item.id);
          if (idx >= 0) current.expenses[idx] = item;
          else current.expenses.push(item);
          current.deletedExpenseIds = (current.deletedExpenseIds || []).filter(x => x !== item.id);
        }
      } else if (entity === 'documents') {
        if (action === 'delete') {
          current.documents = (current.documents || []).filter(x => x.id !== id);
        } else if (item && item.id) {
          const idx = (current.documents || []).findIndex(x => x.id === item.id);
          if (idx >= 0) current.documents[idx] = item;
          else current.documents.push(item);
        }
      } else if (entity === 'notes') {
        if (action === 'delete') {
          current.notes = (current.notes || []).filter(x => x.id !== id);
        } else if (item && item.id) {
          const idx = (current.notes || []).findIndex(x => x.id === item.id);
          if (idx >= 0) current.notes[idx] = item;
          else current.notes.push(item);
        }
      } else if (entity === 'checklists') {
        if (action === 'delete') {
          current.checklists = (current.checklists || []).filter(x => x.id !== id);
        } else if (item && item.id) {
          const idx = (current.checklists || []).findIndex(x => x.id === item.id);
          if (idx >= 0) current.checklists[idx] = item;
          else current.checklists.push(item);
        }
      } else if (entity === 'places') {
        if (action === 'delete') {
          current.places = (current.places || []).filter(x => x.id !== id);
        } else if (item && item.id) {
          const idx = (current.places || []).findIndex(x => x.id === item.id);
          if (idx >= 0) current.places[idx] = item;
          else current.places.push(item);
        }
      } else if ((entity === 'trip' || entity === 'trips') && item) {
        current.trip = {
          ...(current.trip || {}),
          ...item,
          totalBudget: item.totalBudget !== undefined ? item.totalBudget : current.trip?.totalBudget,
          totalUpiAmount: item.totalUpiAmount !== undefined ? item.totalUpiAmount : current.trip?.totalUpiAmount,
          emergencyReserve: item.emergencyReserve !== undefined ? item.emergencyReserve : current.trip?.emergencyReserve,
          openingCash: item.openingCash !== undefined ? item.openingCash : current.trip?.openingCash,
          updatedAt: item.updatedAt || now,
        };
      }
    }

    current.lastUpdated = now;
    store.lastUpdated = now;
    saveSyncStore(store);

    return NextResponse.json(
      {
        success: true,
        serverTime: now,
        lastUpdated: now,
      },
      { headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
