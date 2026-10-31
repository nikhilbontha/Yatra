import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SettingsCloudView } from '@/components/views/SettingsCloudView';
import { INITIAL_TRIP } from '@/lib/seed-data';

describe('SettingsCloudView Static Markup Rendering', () => {
  it('renders Screen 1 (Overview) with actual sync status and 2x3 grid', () => {
    const html = renderToStaticMarkup(
      React.createElement(SettingsCloudView, {
        trip: INITIAL_TRIP,
        cloudUser: { email: 'siva.kumar@example.com' },
        isCloudConnected: true,
        syncStatus: 'synced',
        lastSyncedAt: '2026-10-24T10:30:00.000Z',
        isSyncing: false,
        pendingSyncCount: 0,
        isOnline: true,
        initialScreen: 'overview',
        onSync: () => {},
      })
    );

    expect(html).toContain('Settings &amp; Cloud');
    expect(html).toContain('Cloud Sync');
    expect(html).toContain('Account');
    expect(html).toContain('Offline Access');
    expect(html).toContain('Backups');
    expect(html).toContain('App Settings');
    expect(html).toContain('Data &amp; Storage');
    expect(html).toContain('Help &amp; Support');
    expect(html).toContain('About App');
    expect(html).toContain('Online');
  });

  it('renders Screen 1 (Overview) in offline state with queued changes', () => {
    const html = renderToStaticMarkup(
      React.createElement(SettingsCloudView, {
        trip: INITIAL_TRIP,
        cloudUser: null,
        isCloudConnected: false,
        syncStatus: 'offline',
        lastSyncedAt: null,
        isSyncing: false,
        pendingSyncCount: 4,
        isOnline: false,
        initialScreen: 'overview',
        onSync: () => {},
      })
    );

    expect(html).toContain('Offline');
    expect(html).toContain('4 queued');
  });

  it('renders Screen 2 (Cloud Sync) with sync status and record synchronization', () => {
    const html = renderToStaticMarkup(
      React.createElement(SettingsCloudView, {
        trip: INITIAL_TRIP,
        cloudUser: { email: 'siva.kumar@example.com' },
        isCloudConnected: true,
        syncStatus: 'synced',
        lastSyncedAt: '2026-10-24T10:30:00.000Z',
        isSyncing: false,
        initialScreen: 'cloud_sync',
        onSync: () => {},
      })
    );

    expect(html).toContain('Cloud Sync');
    expect(html).toContain('Synced with Cloud');
    expect(html).toContain('Sync Now');
    expect(html).toContain('Record Synchronization');
    expect(html).toContain('Itinerary Days &amp; Tasks');
    expect(html).toContain('Checklists');
  });

  it('renders Screen 3 (Sync Settings) with auto-sync and intervals', () => {
    const html = renderToStaticMarkup(
      React.createElement(SettingsCloudView, {
        trip: INITIAL_TRIP,
        cloudUser: null,
        isCloudConnected: false,
        syncStatus: 'signed_out',
        isSyncing: false,
        initialScreen: 'sync_settings',
        onSync: () => {},
      })
    );

    expect(html).toContain('Sync Settings');
    expect(html).toContain('Auto Sync');
    expect(html).toContain('Sync on Wi-Fi Only');
    expect(html).toContain('What to Sync');
  });

  it('renders Screen 4 (Offline Access) exposing IndexedDB cache capabilities', () => {
    const html = renderToStaticMarkup(
      React.createElement(SettingsCloudView, {
        trip: INITIAL_TRIP,
        cloudUser: null,
        isCloudConnected: false,
        syncStatus: 'offline',
        isSyncing: false,
        pendingSyncCount: 2,
        initialScreen: 'offline',
        onSync: () => {},
      })
    );

    expect(html).toContain('Offline Access');
    expect(html).toContain('Offline Mode Ready');
    expect(html).toContain('19 planned days cached locally');
    expect(html).toContain('36 verified checklist items');
    expect(html).toContain('Pending Offline Sync Operations');
  });

  it('renders Screen 5 (Backups) with backup status and clean data reset option', () => {
    const html = renderToStaticMarkup(
      React.createElement(SettingsCloudView, {
        trip: INITIAL_TRIP,
        cloudUser: null,
        isCloudConnected: false,
        syncStatus: 'signed_out',
        isSyncing: false,
        initialScreen: 'backups',
        onSync: () => {},
      })
    );

    expect(html).toContain('Backups');
    expect(html).toContain('Back Up Now');
    expect(html).toContain('Clean Data Reset (Phase 1)');
  });

  it('renders Screen 6 (Restore Data) with JSON upload form', () => {
    const html = renderToStaticMarkup(
      React.createElement(SettingsCloudView, {
        trip: INITIAL_TRIP,
        cloudUser: null,
        isCloudConnected: false,
        syncStatus: 'signed_out',
        isSyncing: false,
        initialScreen: 'restore',
        onSync: () => {},
      })
    );

    expect(html).toContain('Restore Data');
    expect(html).toContain('Select Yatra Backup JSON');
    expect(html).toContain('Choose File');
  });

  it('renders Screen 7 (Account Details) with sign-out when authenticated', () => {
    const html = renderToStaticMarkup(
      React.createElement(SettingsCloudView, {
        trip: INITIAL_TRIP,
        cloudUser: { email: 'siva.kumar@example.com' },
        isCloudConnected: true,
        syncStatus: 'synced',
        isSyncing: false,
        initialScreen: 'account',
        onSync: () => {},
      })
    );

    expect(html).toContain('Account Details');
    expect(html).toContain('siva.kumar@example.com');
    expect(html).toContain('Sign Out');
  });

  it('renders Screen 7 (Account Details) with credentials form when not signed in', () => {
    const html = renderToStaticMarkup(
      React.createElement(SettingsCloudView, {
        trip: INITIAL_TRIP,
        cloudUser: null,
        isCloudConnected: false,
        syncStatus: 'signed_out',
        isSyncing: false,
        initialScreen: 'account',
        onSync: () => {},
      })
    );

    expect(html).toContain('Account Details');
    expect(html).toContain('Guest Pilgrim');
    expect(html).toContain('Connect Supabase Cloud');
    expect(html).toContain('Supabase URL');
    expect(html).toContain('Anon Public Key');
  });

  it('renders Screen 8 (App Settings) with INR currency and theme settings', () => {
    const html = renderToStaticMarkup(
      React.createElement(SettingsCloudView, {
        trip: INITIAL_TRIP,
        cloudUser: null,
        isCloudConnected: false,
        syncStatus: 'signed_out',
        isSyncing: false,
        initialScreen: 'app_settings',
        onSync: () => {},
      })
    );

    expect(html).toContain('App Settings');
    expect(html).toContain('General Settings');
    expect(html).toContain('INR (₹)');
    expect(html).toContain('Theme');
  });

  it('renders Screen 9 (Data & Storage) with IndexedDB store name', () => {
    const html = renderToStaticMarkup(
      React.createElement(SettingsCloudView, {
        trip: INITIAL_TRIP,
        cloudUser: null,
        isCloudConnected: false,
        syncStatus: 'signed_out',
        isSyncing: false,
        initialScreen: 'data_storage',
        onSync: () => {},
      })
    );

    expect(html).toContain('Data &amp; Storage');
    expect(html).toContain('YatraDatabase');
  });

  it('renders Screen 10 (Export & Import) with JSON export and import options', () => {
    const html = renderToStaticMarkup(
      React.createElement(SettingsCloudView, {
        trip: INITIAL_TRIP,
        cloudUser: null,
        isCloudConnected: false,
        syncStatus: 'signed_out',
        isSyncing: false,
        initialScreen: 'export_import',
        onSync: () => {},
      })
    );

    expect(html).toContain('Export &amp; Import');
    expect(html).toContain('Export as JSON');
    expect(html).toContain('Import from File');
  });

  it('renders Screen 11 (Privacy & Security) with RLS policy details', () => {
    const html = renderToStaticMarkup(
      React.createElement(SettingsCloudView, {
        trip: INITIAL_TRIP,
        cloudUser: null,
        isCloudConnected: false,
        syncStatus: 'signed_out',
        isSyncing: false,
        initialScreen: 'privacy',
        onSync: () => {},
      })
    );

    expect(html).toContain('Privacy &amp; Security');
    expect(html).toContain('Row Level Security (RLS)');
  });

  it('renders Screen 12 (Help & Support) with quick help topics', () => {
    const html = renderToStaticMarkup(
      React.createElement(SettingsCloudView, {
        trip: INITIAL_TRIP,
        cloudUser: null,
        isCloudConnected: false,
        syncStatus: 'signed_out',
        isSyncing: false,
        initialScreen: 'help',
        onSync: () => {},
      })
    );

    expect(html).toContain('Help &amp; Support');
    expect(html).toContain('Quick Help');
    expect(html).toContain('Offline Pilgrimage Use');
  });
});
