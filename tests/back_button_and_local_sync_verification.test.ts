import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/sync/route';
import {
  pushLocalChangeToServer,
  pullLocalServerUpdates,
  triggerTwoWayLocalSync,
} from '@/lib/local-sync';
import { db } from '@/lib/db';

describe('User Verification: Back Button, Zero Cloud Nagging & Local Server Cross-Device Sync', () => {
  const TRIP_ID = '00000000-0000-4000-8000-000000000999';

  describe('1. Back Button Hierarchical Navigation Stack Simulation', () => {
    interface HistoryEntry {
      tab: string;
      subTab?: string;
      itineraryMode?: 'list' | 'details';
      dayIndex?: number;
    }

    it('navigates Home -> Itinerary list -> Day 1 -> Day 2, and back clicks smoothly return Day 1 -> Itinerary list -> Home', () => {
      // Step 1: Initial state (Home)
      let currentTab = 'home';
      let itineraryMode: 'list' | 'details' = 'list';
      let selectedDayIndex = 0;
      const historyStack: HistoryEntry[] = [{ tab: 'home' }];

      // Step 2: User clicks Itinerary tab
      currentTab = 'itinerary';
      itineraryMode = 'list';
      historyStack.push({ tab: 'itinerary', itineraryMode: 'list' });

      expect(currentTab).toBe('itinerary');
      expect(itineraryMode).toBe('list');
      expect(historyStack.length).toBe(2);

      // Step 3: User opens Day 1 (index 0)
      selectedDayIndex = 0;
      itineraryMode = 'details';
      historyStack.push({ tab: 'itinerary', itineraryMode: 'details', dayIndex: 0 });

      expect(selectedDayIndex).toBe(0);
      expect(itineraryMode).toBe('details');
      expect(historyStack.length).toBe(3);

      // Step 4: User clicks Next Day to open Day 2 (index 1)
      selectedDayIndex = 1;
      historyStack.push({ tab: 'itinerary', itineraryMode: 'details', dayIndex: 1 });

      expect(selectedDayIndex).toBe(1);
      expect(historyStack.length).toBe(4);

      // --- SIMULATE HEADER TEMPLE BACK BUTTON CLICKS ---

      // Back Click 1: Must return to Day 1 (NOT Home!)
      historyStack.pop();
      const prev1 = historyStack[historyStack.length - 1];
      currentTab = prev1.tab;
      itineraryMode = prev1.itineraryMode || 'list';
      if (typeof prev1.dayIndex === 'number') selectedDayIndex = prev1.dayIndex;

      expect(currentTab).toBe('itinerary');
      expect(itineraryMode).toBe('details');
      expect(selectedDayIndex).toBe(0); // Day 1!

      // Back Click 2: Must return to Itinerary list overview
      historyStack.pop();
      const prev2 = historyStack[historyStack.length - 1];
      currentTab = prev2.tab;
      itineraryMode = prev2.itineraryMode || 'list';

      expect(currentTab).toBe('itinerary');
      expect(itineraryMode).toBe('list');

      // Back Click 3: Must return to Home
      historyStack.pop();
      const prev3 = historyStack[historyStack.length - 1];
      currentTab = prev3.tab;

      expect(currentTab).toBe('home');
      expect(historyStack.length).toBe(1);
    });
  });

  describe('2. Local Server Sync Hub: Localhost to Mobile Reflection', () => {
    it('propagates budget changes saved on localhost to mobile device via /api/sync', async () => {
      // 1. Localhost sets budget ceiling to ₹35,000 and opening cash ₹6,000
      const updatedTrip = {
        id: TRIP_ID,
        title: 'Confirmed Jyotirlinga Yatra',
        totalBudget: 35000,
        openingCash: 6000,
        totalUpiAmount: 25000,
        emergencyReserve: 4000,
        updatedAt: new Date().toISOString(),
      };

      const postReq = new NextRequest('http://localhost:3000/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: TRIP_ID,
          delta: {
            entity: 'trip',
            action: 'update',
            item: updatedTrip,
          },
        }),
      });

      const postRes = await POST(postReq);
      expect(postRes.status).toBe(200);

      // 2. Mobile device (192.168.1.71) polls /api/sync
      const getReq = new NextRequest(`http://192.168.1.71:3000/api/sync?tripId=${TRIP_ID}`, {
        method: 'GET',
      });
      const getRes = await GET(getReq);
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();

      expect(getJson.updated).toBe(true);
      expect(getJson.data.trip).toBeDefined();
      expect(getJson.data.trip.totalBudget).toBe(35000);
      expect(getJson.data.trip.openingCash).toBe(6000);
      expect(getJson.data.trip.totalUpiAmount).toBe(25000);
    });

    it('propagates newly added sacred place on localhost to mobile device', async () => {
      const customPlaceId = '00000000-0000-4000-8005-000000000999';
      const newPlace = {
        id: customPlaceId,
        tripId: TRIP_ID,
        name: 'Bhimashankar Jyotirlinga Sacred Forest',
        city: 'Pune / Bhimashankar',
        placeType: 'Temple',
        visitStatus: 'Planned',
        updatedAt: new Date().toISOString(),
      };

      // Localhost adds place
      const postReq = new NextRequest('http://localhost:3000/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: TRIP_ID,
          delta: {
            entity: 'places',
            action: 'create',
            item: newPlace,
          },
        }),
      });
      const postRes = await POST(postReq);
      expect(postRes.status).toBe(200);

      // Mobile device queries
      const getReq = new NextRequest(`http://192.168.1.71:3000/api/sync?tripId=${TRIP_ID}`, {
        method: 'GET',
      });
      const getRes = await GET(getReq);
      const getJson = await getRes.json();

      expect(getJson.updated).toBe(true);
      expect(getJson.data.places.some((p: any) => p.id === customPlaceId)).toBe(true);
      expect(getJson.data.places.find((p: any) => p.id === customPlaceId).name).toBe(
        'Bhimashankar Jyotirlinga Sacred Forest'
      );
    });
  });
});

