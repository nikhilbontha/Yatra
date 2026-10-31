import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/sync/route';
import { NextRequest } from 'next/server';

describe('Local Server Sync Hub (/api/sync) Cross-Device Integration', () => {
  const TRIP_ID = '00000000-0000-4000-8000-000000000888';

  it('1. Handles POST from Mobile device (192.168.1.71) adding an expense', async () => {
    const expenseData = {
      id: 'exp-mobile-1',
      tripId: TRIP_ID,
      title: 'Auto from Shirdi Station',
      amount: 150,
      category: 'Transport',
      paymentMethod: 'Cash',
      date: '2026-11-18',
    };

    const postReq = new NextRequest('http://192.168.1.71:3000/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId: TRIP_ID,
        delta: {
          entity: 'expenses',
          action: 'create',
          item: expenseData,
        },
      }),
    });

    const postRes = await POST(postReq);
    expect(postRes.status).toBe(200);
    const postJson = await postRes.json();
    expect(postJson.success).toBe(true);
    expect(postJson.lastUpdated).toBeDefined();

    // 2. PC (localhost:3000) queries /api/sync and receives Mobile\'s update
    const getReq = new NextRequest(`http://localhost:3000/api/sync?tripId=${TRIP_ID}`, {
      method: 'GET',
    });

    const getRes = await GET(getReq);
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json();
    expect(getJson.updated).toBe(true);
    expect(getJson.data).toBeDefined();
    expect(getJson.data.expenses.some((e: any) => e.id === 'exp-mobile-1')).toBe(true);
    expect(getJson.data.expenses.find((e: any) => e.id === 'exp-mobile-1').title).toBe('Auto from Shirdi Station');
  });

  it('2. Handles POST from PC deleting a stay and Mobile receiving the tombstone', async () => {
    const stayId = 'stay-shirdi-1';

    // PC deletes stay
    const postReq = new NextRequest('http://localhost:3000/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId: TRIP_ID,
        delta: {
          entity: 'accommodations',
          action: 'delete',
          id: stayId,
        },
      }),
    });

    const postRes = await POST(postReq);
    expect(postRes.status).toBe(200);

    // Mobile queries /api/sync
    const getReq = new NextRequest(`http://192.168.1.71:3000/api/sync?tripId=${TRIP_ID}`, {
      method: 'GET',
    });

    const getRes = await GET(getReq);
    const getJson = await getRes.json();
    expect(getJson.updated).toBe(true);
    expect(getJson.data.deletedStayIds).toContain(stayId);
  });

  it('3. Respects "since" parameter so clients that are already up-to-date do zero redundant work', async () => {
    // Query with future timestamp
    const futureTime = new Date(Date.now() + 100000).toISOString();
    const getReq = new NextRequest(`http://localhost:3000/api/sync?tripId=${TRIP_ID}&since=${encodeURIComponent(futureTime)}`, {
      method: 'GET',
    });

    const getRes = await GET(getReq);
    const getJson = await getRes.json();
    expect(getJson.updated).toBe(false);
  });
});

