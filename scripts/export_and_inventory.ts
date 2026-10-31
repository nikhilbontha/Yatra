import fs from 'fs';
import path from 'path';
import {
  DEFAULT_TRIP_ID,
  INITIAL_TRIP,
  INITIAL_DAYS,
  INITIAL_EXPENSES,
  INITIAL_DOCUMENTS,
  INITIAL_TRANSPORT,
  INITIAL_STAYS,
  INITIAL_PLACES,
  INITIAL_CHECKLIST,
  INITIAL_NOTES,
} from '../src/lib/seed-data';

async function main() {
  const totalTasks = INITIAL_DAYS.reduce((acc, d) => acc + (d.tasks?.length || 0), 0);

  const inventory = {
    tripId: DEFAULT_TRIP_ID,
    trip: INITIAL_TRIP,
    counts: {
      trips: 1,
      itineraryDays: INITIAL_DAYS.length,
      itineraryItems: totalTasks,
      expenses: INITIAL_EXPENSES.length,
      documents: INITIAL_DOCUMENTS.length,
      transportLegs: INITIAL_TRANSPORT.length,
      accommodations: INITIAL_STAYS.length,
      places: INITIAL_PLACES.length,
      checklists: INITIAL_CHECKLIST.length,
      notes: INITIAL_NOTES.length,
      bookings: 0,
    },
    days: INITIAL_DAYS,
    expenses: INITIAL_EXPENSES,
    documents: INITIAL_DOCUMENTS,
    transportLegs: INITIAL_TRANSPORT,
    accommodations: INITIAL_STAYS,
    places: INITIAL_PLACES,
    checklists: INITIAL_CHECKLIST,
    notes: INITIAL_NOTES,
  };

  const backupDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupFilePath = path.join(backupDir, 'yatra-pre-reset-backup.json');

  const cleanBackup = {
    format: 'yatra-backup-v2',
    exportedAt: new Date().toISOString(),
    description: 'Pre-reset recoverable backup of initial demo/seed pilgrimage data',
    trip: inventory.trip,
    days: inventory.days,
    expenses: inventory.expenses,
    bookings: [],
    documents: inventory.documents,
    transportLegs: inventory.transportLegs,
    accommodations: inventory.accommodations,
    places: inventory.places,
    checklists: inventory.checklists,
    notes: inventory.notes,
  };

  fs.writeFileSync(backupFilePath, JSON.stringify(cleanBackup, null, 2), 'utf-8');
  console.log('BACKUP_SAVED_TO:', backupFilePath);
  console.log('RECORD_COUNTS:', JSON.stringify(inventory.counts, null, 2));
}

main().catch(err => {
  console.error('Error running inventory:', err);
  process.exit(1);
});
