import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlacesView } from '@/components/views/PlacesView';
import { ChecklistsView } from '@/components/views/ChecklistsView';
import { NotesView } from '@/components/views/NotesView';
import { SettingsCloudView } from '@/components/views/SettingsCloudView';
import { MoreView } from '@/components/views/MoreView';
import {
  INITIAL_TRIP,
  INITIAL_PLACES,
  INITIAL_CHECKLIST,
  INITIAL_NOTES,
  INITIAL_STAYS,
  INITIAL_TRANSPORT,
} from '@/lib/seed-data';

describe('Redesigned Modules: Places, Checklists, Notes, Cloud & Settings', () => {
  it('renders PlacesView (Image 1 suite) with 12 screen navigation and stats', () => {
    const html = renderToStaticMarkup(
      React.createElement(PlacesView, {
        trip: INITIAL_TRIP,
        places: INITIAL_PLACES,
      })
    );

    // 12-screen switcher bar
    expect(html).toContain('1. Overview');
    expect(html).toContain('2. All Places');
    expect(html).toContain('3. Details');
    expect(html).toContain('4. Darshan &amp; Timings');
    expect(html).toContain('5. Photos &amp; Videos');
    expect(html).toContain('6. Nearby Places');
    expect(html).toContain('7. Add Place');
    expect(html).toContain('8. Edit Place');
    expect(html).toContain('9. Map View');
    expect(html).toContain('10. Visited Tracker');
    expect(html).toContain('11. Notes &amp; Experience');
    expect(html).toContain('12. Settings');

    // Overview Stats & Actions
    expect(html).toContain('Places &amp; Temples');
    expect(html).toContain('Explore all destinations and temples');
    expect(html).toContain('Jyotirlingas');
    expect(html).toContain('Other Temples');
    expect(html).toContain('Sightseeing');
    expect(html).toContain('Total Places');
    expect(html).toContain('Upcoming Place');
    expect(html).toContain('Quick Actions');
  });

  it('renders ChecklistsView (Image 2 suite) with 12 screen navigation, progress donut and categories', () => {
    const html = renderToStaticMarkup(
      React.createElement(ChecklistsView, {
        trip: INITIAL_TRIP,
        checklists: INITIAL_CHECKLIST,
      })
    );

    // 12-screen switcher bar
    expect(html).toContain('1. Overview');
    expect(html).toContain('2. All Checklists');
    expect(html).toContain('3. Packing');
    expect(html).toContain('4. Add Task');
    expect(html).toContain('5. Edit Task');
    expect(html).toContain('6. Documents');
    expect(html).toContain('7. Preparation');
    expect(html).toContain('8. Health &amp; Safety');
    expect(html).toContain('9. Electronics');
    expect(html).toContain('10. Calendar');
    expect(html).toContain('11. Templates');
    expect(html).toContain('12. Settings');

    // Progress & Upcoming tasks
    expect(html).toContain('Overall Progress');
    expect(html).toContain('tasks completed');
    expect(html).toContain('Upcoming Tasks');
    expect(html).toContain('Add New Checklist Task');
  });

  it('renders NotesView (Image 3 suite) with 12 screen navigation, memories and categories', () => {
    const html = renderToStaticMarkup(
      React.createElement(NotesView, {
        trip: INITIAL_TRIP,
        notes: INITIAL_NOTES,
      })
    );

    // 12-screen switcher bar
    expect(html).toContain('1. Overview');
    expect(html).toContain('2. All Notes');
    expect(html).toContain('3. Add Note');
    expect(html).toContain('4. Note Details');
    expect(html).toContain('5. Note Photos');
    expect(html).toContain('6. Edit Note');
    expect(html).toContain('7. Reminder Details');
    expect(html).toContain('8. Experiences');
    expect(html).toContain('9. Important Notes');
    expect(html).toContain('10. Notes Map');
    expect(html).toContain('11. Journal Calendar');
    expect(html).toContain('12. Settings');

    // Categories & Recent Notes
    expect(html).toContain('Notes &amp; Journal');
    expect(html).toContain('Daily Notes');
    expect(html).toContain('Experiences');
    expect(html).toContain('Reminders');
    expect(html).toContain('Recent Notes');
    expect(html).toContain('Add New Note');
  });

  it('renders SettingsCloudView (Image 4 suite) with 12 screen navigation, 2x3 grid and offline options', () => {
    const html = renderToStaticMarkup(
      React.createElement(SettingsCloudView, {
        trip: INITIAL_TRIP,
        cloudUser: { email: 'siva.kumar@example.com' },
        isCloudConnected: true,
        syncStatus: 'synced',
        isSyncing: false,
        onSync: () => {},
      })
    );

    // 12-screen switcher bar
    expect(html).toContain('1. Overview');
    expect(html).toContain('2. Cloud Sync');
    expect(html).toContain('3. Sync Settings');
    expect(html).toContain('4. Offline Access');
    expect(html).toContain('5. Backups');
    expect(html).toContain('6. Restore Data');
    expect(html).toContain('7. Account Details');
    expect(html).toContain('8. App Settings');
    expect(html).toContain('9. Data &amp; Storage');
    expect(html).toContain('10. Export &amp; Import');
    expect(html).toContain('11. Privacy &amp; Security');
    expect(html).toContain('12. Help &amp; Support');

    // 2x3 Grid
    expect(html).toContain('Settings &amp; Cloud');
    expect(html).toContain('Cloud Sync');
    expect(html).toContain('Account');
    expect(html).toContain('Offline Access');
    expect(html).toContain('Backups');
    expect(html).toContain('App Settings');
    expect(html).toContain('Data &amp; Storage');
    expect(html).toContain('Help &amp; Support');
    expect(html).toContain('About App');
  });

  it('routes cleanly in MoreView between places, checklists, notes, and cloud settings', () => {
    // 1. Places subtab
    const placesHtml = renderToStaticMarkup(
      React.createElement(MoreView, {
        trip: INITIAL_TRIP,
        places: INITIAL_PLACES,
        accommodations: INITIAL_STAYS,
        transportLegs: INITIAL_TRANSPORT,
        checklists: INITIAL_CHECKLIST,
        notes: INITIAL_NOTES,
        activeSubTab: 'places',
        onSubTabChange: () => {},
      })
    );
    expect(placesHtml).toContain('Places &amp; Temples');
    expect(placesHtml).toContain('Explore all destinations and temples');

    // 2. Checklists subtab
    const checkHtml = renderToStaticMarkup(
      React.createElement(MoreView, {
        trip: INITIAL_TRIP,
        places: INITIAL_PLACES,
        accommodations: INITIAL_STAYS,
        transportLegs: INITIAL_TRANSPORT,
        checklists: INITIAL_CHECKLIST,
        notes: INITIAL_NOTES,
        activeSubTab: 'checklists',
        onSubTabChange: () => {},
      })
    );
    expect(checkHtml).toContain('Checklists');
    expect(checkHtml).toContain('Overall Progress');

    // 3. Notes subtab
    const notesHtml = renderToStaticMarkup(
      React.createElement(MoreView, {
        trip: INITIAL_TRIP,
        places: INITIAL_PLACES,
        accommodations: INITIAL_STAYS,
        transportLegs: INITIAL_TRANSPORT,
        checklists: INITIAL_CHECKLIST,
        notes: INITIAL_NOTES,
        activeSubTab: 'notes',
        onSubTabChange: () => {},
      })
    );
    expect(notesHtml).toContain('Notes &amp; Journal');
    expect(notesHtml).toContain('Daily Notes');

    // 4. Settings subtab
    const settingsHtml = renderToStaticMarkup(
      React.createElement(MoreView, {
        trip: INITIAL_TRIP,
        places: INITIAL_PLACES,
        accommodations: INITIAL_STAYS,
        transportLegs: INITIAL_TRANSPORT,
        checklists: INITIAL_CHECKLIST,
        notes: INITIAL_NOTES,
        activeSubTab: 'settings',
        onSubTabChange: () => {},
      })
    );
    expect(settingsHtml).toContain('Settings &amp; Cloud');
    expect(settingsHtml).toContain('Manage your account, sync, backups and app preferences');
  });
});
