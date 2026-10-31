import { db, queueOfflineChange, CONFIRMED_TRIP_ID } from './db';
import { generateUUID } from './uuid';
import { ItineraryDay, TripNote, ChecklistItem } from '@/types/trip';

export interface DayDetailsMigrationResult {
  migratedNotesCount: number;
  migratedChecklistsCount: number;
  skippedDuplicatesCount: number;
  unmappedDayReferences: string[];
  alreadyMigrated: boolean;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Safely resolve a day reference key to a confirmed itinerary day.
 * If the key cannot be mapped with certainty, returns null without guessing.
 */
export function resolveSafeDayId(
  dayKey: string,
  days: ItineraryDay[]
): { dayId: string; day: ItineraryDay } | null {
  if (!dayKey || !days || days.length === 0) return null;
  const trimmed = dayKey.trim();

  // 1. Direct ID match
  const directMatch = days.find(d => d.id === trimmed);
  if (directMatch && UUID_REGEX.test(directMatch.id)) {
    return { dayId: directMatch.id, day: directMatch };
  }

  // 2. Day number match: e.g. "1", "2"
  const numericVal = parseInt(trimmed, 10);
  if (!isNaN(numericVal) && String(numericVal) === trimmed) {
    const numMatch = days.find(d => d.dayNumber === numericVal);
    if (numMatch && UUID_REGEX.test(numMatch.id)) {
      return { dayId: numMatch.id, day: numMatch };
    }
  }

  // 3. Legacy day string: e.g. "d1-2026-11-17", "day-1", "d1"
  const legacyMatch = trimmed.match(/^(?:d|day)[-_]?(\d+)/i);
  if (legacyMatch) {
    const legacyNum = parseInt(legacyMatch[1], 10);
    const dayMatch = days.find(d => d.dayNumber === legacyNum);
    if (dayMatch && UUID_REGEX.test(dayMatch.id)) {
      return { dayId: dayMatch.id, day: dayMatch };
    }
  }

  // Cannot safely map without guessing
  return null;
}

/**
 * Idempotently migrate legacy localStorage notes and checklists into Dexie IndexedDB.
 *
 * Rules:
 * - Preserves existing localStorage entries without clearing or deleting them.
 * - Prevents duplicate notes and checklist records on repeated executions.
 * - Uses valid RFC 4122 UUIDs for all records and foreign day references.
 * - Enqueues mutations via queueOfflineChange without triggering a bulk sync.
 * - Preserves unmapped entries safely and reports them.
 */
export async function migrateDayDetailsLocalStorageIfNeeded(
  days: ItineraryDay[],
  tripId: string = CONFIRMED_TRIP_ID,
  options: { force?: boolean } = {}
): Promise<DayDetailsMigrationResult> {
  const result: DayDetailsMigrationResult = {
    migratedNotesCount: 0,
    migratedChecklistsCount: 0,
    skippedDuplicatesCount: 0,
    unmappedDayReferences: [],
    alreadyMigrated: false,
  };

  if (typeof window === 'undefined') {
    return result;
  }

  // Check idempotent migration flag unless force option is passed
  const migrationDone = localStorage.getItem('yatra_day_details_migrated_v1');
  if (migrationDone === 'true' && !options.force) {
    result.alreadyMigrated = true;
    return result;
  }

  let rawNotes: Record<string, string> = {};
  let rawChecklists: Record<string, any[]> = {};

  try {
    const savedNotes = localStorage.getItem('yatra_day_notes');
    if (savedNotes) rawNotes = JSON.parse(savedNotes);
  } catch (err) {
    console.warn('Could not parse legacy yatra_day_notes for migration:', err);
  }

  try {
    const savedChks = localStorage.getItem('yatra_day_checklists');
    if (savedChks) rawChecklists = JSON.parse(savedChks);
  } catch (err) {
    console.warn('Could not parse legacy yatra_day_checklists for migration:', err);
  }

  // Fetch existing notes and checklists in IndexedDB to prevent duplicate creation
  const existingNotes = await db.notes.where('tripId').equals(tripId).toArray();
  const existingChecklists = await db.checklists.where('tripId').equals(tripId).toArray();

  const now = new Date().toISOString();

  // 1. Migrate Notes
  for (const [dayKey, noteContent] of Object.entries(rawNotes)) {
    if (!noteContent || typeof noteContent !== 'string' || !noteContent.trim()) {
      continue;
    }

    const resolved = resolveSafeDayId(dayKey, days);
    if (!resolved) {
      result.unmappedDayReferences.push(`Note for key: ${dayKey}`);
      continue;
    }

    const trimmedContent = noteContent.trim();

    // Check if an existing note in db.notes already contains this note for this day
    const alreadyExists = existingNotes.some(
      n => n.dayId === resolved.dayId && n.content.trim() === trimmedContent
    );

    if (alreadyExists) {
      result.skippedDuplicatesCount++;
      continue;
    }

    // Check if a note already exists for this day to update rather than duplicate
    const existingDayNote = existingNotes.find(n => n.dayId === resolved.dayId);
    if (existingDayNote) {
      if (existingDayNote.content.trim() !== trimmedContent) {
        const updatedNote: TripNote = {
          ...existingDayNote,
          content: trimmedContent,
          updatedAt: now,
        };
        await db.notes.put(updatedNote);
        await queueOfflineChange('notes', 'update', updatedNote.id, updatedNote);
        result.migratedNotesCount++;
      } else {
        result.skippedDuplicatesCount++;
      }
    } else {
      const newNote: TripNote = {
        id: generateUUID(),
        tripId,
        dayId: resolved.dayId,
        title: `${resolved.day.title || `Day ${resolved.day.dayNumber}`} - Notes`,
        content: trimmedContent,
        category: 'Reflection',
        noteType: 'Daily',
        date: resolved.day.date,
        createdAt: now,
        updatedAt: now,
      };
      await db.notes.put(newNote);
      await queueOfflineChange('notes', 'insert', newNote.id, newNote);
      existingNotes.push(newNote);
      result.migratedNotesCount++;
    }
  }

  // 2. Migrate Checklists
  for (const [dayKey, items] of Object.entries(rawChecklists)) {
    if (!Array.isArray(items) || items.length === 0) {
      continue;
    }

    const resolved = resolveSafeDayId(dayKey, days);
    if (!resolved) {
      result.unmappedDayReferences.push(`Checklist for key: ${dayKey}`);
      continue;
    }

    for (const item of items) {
      if (!item || !item.title || typeof item.title !== 'string') continue;
      const titleTrimmed = item.title.trim();

      // Check if item already exists in db.checklists for this day
      const existingItem = existingChecklists.find(
        c => c.dayId === resolved.dayId && c.title.toLowerCase().trim() === titleTrimmed.toLowerCase()
      );

      if (existingItem) {
        if (existingItem.isCompleted !== Boolean(item.isDone)) {
          const updatedChk: ChecklistItem = {
            ...existingItem,
            isCompleted: Boolean(item.isDone),
            updatedAt: now,
          };
          await db.checklists.put(updatedChk);
          await queueOfflineChange('checklists', 'update', updatedChk.id, updatedChk);
          result.migratedChecklistsCount++;
        } else {
          result.skippedDuplicatesCount++;
        }
      } else {
        const newChk: ChecklistItem = {
          id: generateUUID(),
          tripId,
          dayId: resolved.dayId,
          category: 'Pre-Trip Preparation',
          checklistGroup: 'Daily checklist',
          title: titleTrimmed,
          isCompleted: Boolean(item.isDone),
          sortOrder: 10,
          createdAt: now,
          updatedAt: now,
        };
        await db.checklists.put(newChk);
        await queueOfflineChange('checklists', 'insert', newChk.id, newChk);
        existingChecklists.push(newChk);
        result.migratedChecklistsCount++;
      }
    }
  }

  // Mark migration as executed in localStorage without touching original keys
  try {
    localStorage.setItem('yatra_day_details_migrated_v1', 'true');
  } catch (err) {
    console.warn('Could not store migration flag in localStorage:', err);
  }

  return result;
}

/**
 * Load the persistent note for a specific day from IndexedDB
 */
export async function getDayNoteFromDb(dayId: string): Promise<TripNote | null> {
  if (!dayId) return null;
  try {
    const note = await db.notes.where('dayId').equals(dayId).first();
    return note || null;
  } catch (err) {
    console.warn('Error reading day note from db:', err);
    return null;
  }
}

/**
 * Save or update a day note in IndexedDB and enqueue sync
 */
export async function saveDayNoteToDb(
  day: ItineraryDay,
  content: string,
  tripId: string = CONFIRMED_TRIP_ID
): Promise<TripNote> {
  const existing = await db.notes.where('dayId').equals(day.id).first();
  const now = new Date().toISOString();

  if (existing) {
    const updated: TripNote = {
      ...existing,
      content: content.trim(),
      updatedAt: now,
    };
    await db.notes.put(updated);
    await queueOfflineChange('notes', 'update', updated.id, updated);
    return updated;
  } else {
    const newNote: TripNote = {
      id: generateUUID(),
      tripId: day.tripId || tripId,
      dayId: day.id,
      title: `${day.title || `Day ${day.dayNumber}`} - Notes`,
      content: content.trim(),
      category: 'Reflection',
      noteType: 'Daily',
      date: day.date,
      createdAt: now,
      updatedAt: now,
    };
    await db.notes.put(newNote);
    await queueOfflineChange('notes', 'insert', newNote.id, newNote);
    return newNote;
  }
}

/**
 * Load all persistent checklist items for a specific day from IndexedDB
 */
export async function getDayChecklistItemsFromDb(dayId: string): Promise<ChecklistItem[]> {
  if (!dayId) return [];
  try {
    return await db.checklists.where('dayId').equals(dayId).toArray();
  } catch (err) {
    console.warn('Error reading day checklist items from db:', err);
    return [];
  }
}

/**
 * Toggle or create a day checklist item in IndexedDB and enqueue sync
 */
export async function toggleDayChecklistItemInDb(
  day: ItineraryDay,
  itemTitle: string,
  isDone: boolean,
  tripId: string = CONFIRMED_TRIP_ID
): Promise<ChecklistItem> {
  const existing = await db.checklists
    .where('dayId')
    .equals(day.id)
    .filter(c => c.title.toLowerCase().trim() === itemTitle.toLowerCase().trim())
    .first();

  const now = new Date().toISOString();
  if (existing) {
    const updated: ChecklistItem = {
      ...existing,
      isCompleted: isDone,
      updatedAt: now,
    };
    await db.checklists.put(updated);
    await queueOfflineChange('checklists', 'update', updated.id, updated);
    return updated;
  } else {
    const newChk: ChecklistItem = {
      id: generateUUID(),
      tripId: day.tripId || tripId,
      dayId: day.id,
      category: 'Pre-Trip Preparation',
      checklistGroup: 'Daily checklist',
      title: itemTitle.trim(),
      isCompleted: isDone,
      sortOrder: 10,
      createdAt: now,
      updatedAt: now,
    };
    await db.checklists.put(newChk);
    await queueOfflineChange('checklists', 'insert', newChk.id, newChk);
    return newChk;
  }
}

/**
 * Add a custom day checklist item to IndexedDB and enqueue sync
 */
export async function addDayChecklistItemToDb(
  day: ItineraryDay,
  title: string,
  tripId: string = CONFIRMED_TRIP_ID
): Promise<ChecklistItem> {
  const now = new Date().toISOString();
  const newChk: ChecklistItem = {
    id: generateUUID(),
    tripId: day.tripId || tripId,
    dayId: day.id,
    category: 'Pre-Trip Preparation',
    checklistGroup: 'Daily checklist',
    title: title.trim(),
    isCompleted: false,
    sortOrder: 10,
    createdAt: now,
    updatedAt: now,
  };
  await db.checklists.put(newChk);
  await queueOfflineChange('checklists', 'insert', newChk.id, newChk);
  return newChk;
}

export interface DayDetailsChecklistItem {
  id: string;
  title: string;
  icon: string;
  isDone: boolean;
}

/**
 * Load all persistent notes and checklists grouped by dayId from IndexedDB
 */
export async function loadDayDetailsFromDb(
  days: ItineraryDay[],
  tripId: string = CONFIRMED_TRIP_ID
): Promise<{
  notesByDayId: Record<string, string>;
  checklistsByDayId: Record<string, DayDetailsChecklistItem[]>;
}> {
  const result: {
    notesByDayId: Record<string, string>;
    checklistsByDayId: Record<string, DayDetailsChecklistItem[]>;
  } = {
    notesByDayId: {},
    checklistsByDayId: {},
  };

  try {
    const notes = await db.notes.where('tripId').equals(tripId).toArray();
    for (const note of notes) {
      if (note.dayId && note.content) {
        result.notesByDayId[note.dayId] = note.content;
      }
    }

    const checklists = await db.checklists.where('tripId').equals(tripId).toArray();
    for (const chk of checklists) {
      if (chk.dayId) {
        if (!result.checklistsByDayId[chk.dayId]) {
          result.checklistsByDayId[chk.dayId] = [];
        }
        result.checklistsByDayId[chk.dayId].push({
          id: chk.id,
          title: chk.title,
          icon: 'pin',
          isDone: Boolean(chk.isCompleted),
        });
      }
    }
  } catch (err) {
    console.warn('Error loading day details from db:', err);
  }

  return result;
}
