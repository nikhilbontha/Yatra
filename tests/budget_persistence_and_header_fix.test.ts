import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Header } from '@/components/Header';
import { Trip } from '@/types/trip';
import { CONFIRMED_TRIP_ID, CONFIRMED_PILGRIMAGE_TRIP } from '@/lib/db';
import { formatRecordForPostgres, TABLE_SYNC_ORDER } from '@/lib/sync';

describe('Budget Persistence, Database Schemas, and Header Fixes', () => {
  const dummyTrip: Trip = {
    id: CONFIRMED_TRIP_ID,
    ...CONFIRMED_PILGRIMAGE_TRIP,
    totalBudget: 45000,
    totalUpiAmount: 30000,
    openingCash: 10000,
    emergencyReserve: 5000,
  };

  it('1. Header removes SACRED YATRA badge and displays A Divine Journey Across India without truncation', () => {
    const html = renderToStaticMarkup(
      React.createElement(Header, {
        trip: dummyTrip,
        isOnline: true,
        pendingSyncCount: 0,
        isSyncing: false,
        syncStatus: 'synced',
        cloudUser: null,
        onSync: () => {},
        onQuickAdd: () => {},
        onOpenSettings: () => {},
      })
    );

    // Verify SACRED YATRA badge is removed
    expect(html).not.toContain('SACRED YATRA');

    // Verify A Divine Journey Across India subtitle is rendered with whitespace-nowrap and without truncate
    expect(html).toContain('A Divine Journey Across India');
    expect(html).toContain('whitespace-nowrap');
    expect(html).not.toContain('truncate select-none drop-shadow');
  });

  it('2. TABLE_SYNC_ORDER includes budget_categories and respects foreign key hierarchies', () => {
    expect(TABLE_SYNC_ORDER[0]).toBe('trips');
    expect(TABLE_SYNC_ORDER).toContain('budget_categories');
    expect(TABLE_SYNC_ORDER.indexOf('trips')).toBeLessThan(TABLE_SYNC_ORDER.indexOf('budget_categories'));
    expect(TABLE_SYNC_ORDER.indexOf('trips')).toBeLessThan(TABLE_SYNC_ORDER.indexOf('itinerary_days'));
    expect(TABLE_SYNC_ORDER.indexOf('trips')).toBeLessThan(TABLE_SYNC_ORDER.indexOf('expenses'));
  });

  it('3. formatRecordForPostgres formats trips and budget_categories cleanly', () => {
    const tripPayload = formatRecordForPostgres('trips', dummyTrip, 'test-user-id');
    expect(tripPayload.id).toBe(CONFIRMED_TRIP_ID);
    expect(tripPayload.total_budget).toBe(45000);
    expect(tripPayload.opening_cash).toBe(10000);
    expect(tripPayload.emergency_reserve).toBe(5000);

    const catPayload = formatRecordForPostgres('budget_categories', {
      id: 'cat-uuid-1',
      tripId: CONFIRMED_TRIP_ID,
      name: 'Transport',
      icon: 'train',
      allocatedAmount: 15750,
    }, 'test-user-id');

    expect(catPayload.id).toBe('cat-uuid-1');
    expect(catPayload.trip_id).toBe(CONFIRMED_TRIP_ID);
    expect(catPayload.name).toBe('Transport');
    expect(catPayload.allocated_amount).toBe(15750);
  });
});

