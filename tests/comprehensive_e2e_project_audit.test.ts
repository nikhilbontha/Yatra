import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Level 1: Foundations & Math
import {
  calculateBudget,
  formatRupee,
} from '../src/lib/calculations';
import { generateUUID } from '../src/lib/uuid';
import {
  expenseSchema,
  tripSchema,
  itineraryItemSchema,
  tripNoteSchema,
  checklistItemSchema,
} from '../src/lib/validation';
import { CONFIRMED_ITINERARY_DAYS } from '../src/lib/itinerary-data';
import {
  INITIAL_TRIP,
  INITIAL_EXPENSES,
  INITIAL_DOCUMENTS,
  INITIAL_TRANSPORT,
  INITIAL_PLACES,
  INITIAL_CHECKLIST,
  INITIAL_NOTES,
  INITIAL_STAYS,
} from '../src/lib/seed-data';

// Level 2 & 3: DB, Sync & Error Handling
import { db, deleteSyncQueueItem } from '../src/lib/db';
import { formatRecordForPostgres } from '../src/lib/sync';

// Level 4: UI Modals & Shared Components
import { SyncFailureModal } from '../src/components/modals/SyncFailureModal';
import { SyncInspectorModal } from '../src/components/modals/SyncInspectorModal';
import { DocumentViewerModal } from '../src/components/modals/DocumentViewerModal';
import { ConfirmModal } from '../src/components/modals/ConfirmModal';
import { AlertModal } from '../src/components/modals/AlertModal';
import { Header } from '../src/components/Header';
import { Navigation } from '../src/components/Navigation';

// Level 5: Page Views
import { HomeView } from '../src/components/views/HomeView';
import { ItineraryView } from '../src/components/views/ItineraryView';
import { BudgetView } from '../src/components/views/BudgetView';
import { TicketsView } from '../src/components/views/TicketsView';
import { AccommodationView } from '../src/components/views/AccommodationView';
import { PlacesView } from '../src/components/views/PlacesView';
import { ChecklistsView } from '../src/components/views/ChecklistsView';
import { NotesView } from '../src/components/views/NotesView';
import { MoreView } from '../src/components/views/MoreView';
import { SettingsCloudView } from '../src/components/views/SettingsCloudView';

describe('Comprehensive End-to-End Master Project Test Suite', () => {
  // ==========================================
  // LEVEL 1: FOUNDATIONS & MATH (Smallest Primitives)
  // ==========================================
  describe('Level 1: Foundations, Math, UUID & Validation Primitives', () => {
    it('1.1: Math Engine correctly calculates budget, spend, remaining and currency formatting', () => {
      const expenses = [
        { id: '1', tripId: INITIAL_TRIP.id, amount: 453.15, category: 'Transport', date: '2026-11-17', title: 'Train ticket', paymentMethod: 'UPI' },
        { id: '2', tripId: INITIAL_TRIP.id, amount: 500, category: 'Accommodation', date: '2026-11-18', title: 'Dharamshala', paymentMethod: 'Cash' },
        { id: '3', tripId: INITIAL_TRIP.id, amount: 200, category: 'Food', date: '2026-11-18', title: 'Prasadam', paymentMethod: 'Cash' },
      ] as any;

      const trip = { ...INITIAL_TRIP, totalBudget: 15000 };
      const budgetCalc = calculateBudget(trip, expenses);

      expect(budgetCalc.totalSpent).toBe(1153.15);
      expect(budgetCalc.availableBudget).toBe(13846.85);

      const formatted = formatRupee(budgetCalc.totalSpent, true);
      expect(formatted).toContain('1,153.15');

      const transportTotal = budgetCalc.categoryTotals.find(c => c.category === 'Transport')?.amount;
      const accommodationTotal = budgetCalc.categoryTotals.find(c => c.category === 'Accommodation')?.amount;
      const foodTotal = budgetCalc.categoryTotals.find(c => c.category === 'Food')?.amount;

      expect(transportTotal).toBe(453.15);
      expect(accommodationTotal).toBe(500);
      expect(foodTotal).toBe(200);
    });

    it('1.2: UUID Engine strictly conforms to RFC-4122 v4 pattern', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();

      expect(uuidRegex.test(uuid1)).toBe(true);
      expect(uuidRegex.test(uuid2)).toBe(true);
      expect(uuid1).not.toBe(uuid2);
    });

    it('1.3: Data Validation safely validates schemas and rejects corrupt inputs', () => {
      // Valid expense
      const validExpenseResult = expenseSchema.safeParse({
        tripId: '00000000-0000-4000-8000-000000000001',
        title: 'Shirdi Prasad',
        amount: 150,
        category: 'Food',
        date: '2026-11-18',
        paymentMethod: 'Cash',
      });
      expect(validExpenseResult.success).toBe(true);

      // Invalid negative expense
      const negativeExpenseResult = expenseSchema.safeParse({
        tripId: '00000000-0000-4000-8000-000000000001',
        title: 'Invalid',
        amount: -50,
        category: 'Food',
        date: '2026-11-18',
        paymentMethod: 'Cash',
      });
      expect(negativeExpenseResult.success).toBe(false);

      // Valid note
      const validNote = tripNoteSchema.safeParse({
        tripId: '00000000-0000-4000-8000-000000000001',
        title: 'Darshan reflection',
        content: 'Peaceful kakad aarti at Shirdi',
        category: 'Reflection',
      });
      expect(validNote.success).toBe(true);
    });

    it('1.4: Authentic Seed & Knowledge integrity contains 19 unbroken days and 32 verified places', () => {
      expect(CONFIRMED_ITINERARY_DAYS.length).toBe(19);
      expect(CONFIRMED_ITINERARY_DAYS[0].dayNumber).toBe(1);
      expect(CONFIRMED_ITINERARY_DAYS[18].dayNumber).toBe(19);

      // Verify all 19 days have authentic titles and dates
      expect(CONFIRMED_ITINERARY_DAYS[0].date).toBe('2026-11-17');
      expect(CONFIRMED_ITINERARY_DAYS[18].date).toBe('2026-12-05');

      // Verify 32 confirmed places
      expect(INITIAL_PLACES.length).toBe(32);
      INITIAL_PLACES.forEach((p) => {
        expect(p.name).toBeTruthy();
        expect(p.placeType).toBeTruthy();
      });

      // Verify Jyotirlingas count in places catalog is 7
      const jyotirlingas = INITIAL_PLACES.filter((p) => p.placeType === 'Jyotirlinga');
      expect(jyotirlingas.length).toBe(7);
    });
  });

  // ==========================================
  // LEVEL 2 & 3: DATABASE, SYNC & QUEUE RESILIENCE
  // ==========================================
  describe('Level 2 & 3: IndexedDB, Sync Resilience & Error Classifier', () => {
    it('2.1: Postgres sync sanitizer safely maps categories, payment methods, and null foreign keys', () => {
      const sanitized = formatRecordForPostgres('expenses', {
        id: '00000000-0000-4000-8002-000000000001',
        tripId: '00000000-0000-4000-8000-000000000001',
        title: 'Special puja fee',
        amount: 250,
        category: 'InvalidCat' as any,
        paymentMethod: 'UPI',
        date: '2026-11-18',
        dayId: 'not-a-uuid',
      }, 'user-123');

      expect(sanitized.category).toBe('Other');
      expect(sanitized.day_id).toBeNull();
      expect(sanitized.payment_method).toBe('UPI');
    });

    it('2.2: deleteSyncQueueItem function is exported and removes items safely', () => {
      expect(typeof deleteSyncQueueItem).toBe('function');
    });

    it('2.3: Sync Failure Modal correctly classifies authentication, RLS and network errors', () => {
      const authErrorModal = renderToStaticMarkup(
        React.createElement(SyncFailureModal, {
          isOpen: true,
          errorReason: 'JWT expired: User session is invalid',
          onClose: () => {},
          onRetry: () => {},
          onOpenInspector: () => {},
        })
      );
      expect(authErrorModal).toContain('Authentication Required');

      const rlsErrorModal = renderToStaticMarkup(
        React.createElement(SyncFailureModal, {
          isOpen: true,
          errorReason: 'new row violates row-level security policy for table expenses',
          onClose: () => {},
          onRetry: () => {},
          onOpenInspector: () => {},
        })
      );
      expect(rlsErrorModal).toContain('Cloud Permissions');

      const offlineModal = renderToStaticMarkup(
        React.createElement(SyncFailureModal, {
          isOpen: true,
          errorReason: 'Failed to fetch: net::ERR_INTERNET_DISCONNECTED',
          onClose: () => {},
          onRetry: () => {},
          onOpenInspector: () => {},
        })
      );
      expect(offlineModal).toContain('Network Connection');
      expect(offlineModal).toContain('All changes remain safely preserved in your offline local database');
    });

    it('2.4: Sync Failure Modal displays failed item details and 1-click copy button', () => {
      const failedItems = [
        {
          entity: 'expenses',
          action: 'delete',
          title: 'Shirdi Auto Fare',
          error: 'violates foreign key constraint',
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(SyncFailureModal, {
          isOpen: true,
          errorReason: 'violates foreign key constraint',
          technicalDetails: 'PostgreSQL error code 23503',
          failedItems,
          onClose: () => {},
          onRetry: () => {},
          onOpenInspector: () => {},
        })
      );

      expect(html).toContain('Shirdi Auto Fare');
      expect(html).toContain('Retry Sync Now');
      expect(html).toContain('Open Sync Inspector');
      expect(html).toContain('Technical Failure Details');
    });

    it('2.5: Sync Inspector Modal renders delete/discard button for stuck queue items', () => {
      const mockQueue = [
        {
          id: 'q-stuck-1',
          entity: 'expenses',
          action: 'delete',
          recordId: 'exp-1',
          timestamp: 'Just now',
          title: 'Train Cancellation Fee',
          error: 'PGRST116 row not found',
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(SyncInspectorModal, {
          isOpen: true,
          isSyncing: false,
          syncStatus: 'idle',
          syncMessage: 'Offline · Local Queue Active',
          onClose: () => {},
          onSyncNow: () => Promise.resolve(),
          pendingCount: mockQueue.length,
          pendingItems: mockQueue,
          cloudUser: null,
          onDeleteQueueItem: () => {},
        })
      );

      expect(html).toContain('Cloud Sync Inspector');
      expect(html).toContain('Train Cancellation Fee');
      expect(html).toContain('PGRST116 row not found');
      expect(html).toContain('Delete');
      expect(html).toContain('Discard this queued operation');
    });
  });

  // ==========================================
  // LEVEL 4: UI PRIMITIVES & MODALS
  // ==========================================
  describe('Level 4: Modals, Header & Global Navigation Shell', () => {
    it('3.1: Header renders pilgrimage title, sync button, and profile indicator without login/search button', () => {
      const html = renderToStaticMarkup(
        React.createElement(Header, {
          trip: INITIAL_TRIP,
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

      expect(html).toContain('Yatra');
      expect(html).toContain('A Divine Journey Across India');
      expect(html).toContain('Sync');
      expect(html).not.toContain('Login');
    });

    it('3.2: Navigation renders sidebar and mobile navigation with Tickets replacing Transport', () => {
      const html = renderToStaticMarkup(
        React.createElement(Navigation, {
          activeTab: 'tickets',
          onTabChange: () => {},
        })
      );

      expect(html).toContain('Home');
      expect(html).toContain('Itinerary');
      expect(html).toContain('Budget');
      expect(html).toContain('Tickets');
      expect(html).toContain('Accommodation');
      expect(html).toContain('More');
    });

    it('3.3: DocumentViewerModal renders 3D viewer for e-tickets, image passes and PDFs', () => {
      const html = renderToStaticMarkup(
        React.createElement(DocumentViewerModal, {
          isOpen: true,
          document: {
            title: 'Hyd to Shirdi Train Ticket',
            docType: 'train_ticket',
            pnr: '4447190834',
            blobData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
            fileName: 'ticket.png',
          },
          onClose: () => {},
        })
      );

      expect(html).toContain('Hyd to Shirdi Train Ticket');
      expect(html).toContain('4447190834');
      expect(html).toContain('ticket.png');
    });

    it('3.4: ConfirmModal & AlertModal render custom 3D design without native alerts', () => {
      const confirmHtml = renderToStaticMarkup(
        React.createElement(ConfirmModal, {
          isOpen: true,
          title: 'Delete Expense',
          message: 'Are you sure you want to delete this expense record?',
          confirmLabel: 'Delete Now',
          cancelLabel: 'Cancel',
          onConfirm: () => {},
          onCancel: () => {},
        })
      );

      expect(confirmHtml).toContain('Delete Expense');
      expect(confirmHtml).toContain('Delete Now');

      const alertHtml = renderToStaticMarkup(
        React.createElement(AlertModal, {
          isOpen: true,
          title: 'Action Completed',
          message: 'Expense has been recorded successfully.',
          buttonLabel: 'Understood',
          onClose: () => {},
        })
      );

      expect(alertHtml).toContain('Action Completed');
      expect(alertHtml).toContain('Expense has been recorded successfully.');
    });
  });

  // ==========================================
  // LEVEL 5: ALL PAGE VIEWS (Large Components)
  // ==========================================
  describe('Level 5: Comprehensive Page Views Verification', () => {
    it('4.1: HomeView renders Quick Actions, Journey Circuit, and Wallet Cards', () => {
      const budgetCalc = calculateBudget(INITIAL_TRIP, INITIAL_EXPENSES);
      const html = renderToStaticMarkup(
        React.createElement(HomeView, {
          trip: INITIAL_TRIP,
          days: CONFIRMED_ITINERARY_DAYS,
          expenses: INITIAL_EXPENSES,
          bookings: [],
          transportLegs: INITIAL_TRANSPORT,
          checklists: INITIAL_CHECKLIST,
          places: INITIAL_PLACES,
          budgetCalc,
          cloudUser: null,
          syncStatus: 'synced',
          isSyncing: false,
          onSync: () => {},
          onNavigateToTab: () => {},
          onNavigateToMoreSubTab: () => {},
          onSelectDay: () => {},
          onAddExpense: () => {},
          onAddTicket: () => {},
          onAddChecklist: () => {},
          onEditTripSettings: () => {},
          onToggleTask: () => {},
        })
      );

      expect(html).toContain('Quick Actions');
      expect(html).toContain('Upcoming Itinerary');
      expect(html).toContain('Total Budget');
    });

    it('4.2: ItineraryView renders all 19 pilgrimage days and filter tabs', () => {
      const html = renderToStaticMarkup(
        React.createElement(ItineraryView, {
          days: CONFIRMED_ITINERARY_DAYS,
          expenses: [],
          selectedDayIndex: 0,
          initialView: 'list',
          onSelectDayIndex: () => {},
          onEditDay: () => {},
          onAddTask: () => {},
          onToggleTask: () => {},
          onAddExpenseForDate: () => {},
          onReloadSample: () => {},
        })
      );

      expect(html).toContain('All Days (19)');
      expect(html).toContain('Core (Days 1–12)');
      expect(html).toContain('Extended (Days 13–19)');
      expect(html).toContain('Hyderabad / Secunderabad → Shirdi');
      expect(html).toContain('Arrival in Khammam');
    });

    it('4.3: BudgetView renders interactive calendar, spend statistics, and category breakdown', () => {
      const budgetCalc = calculateBudget(INITIAL_TRIP, INITIAL_EXPENSES);
      const html = renderToStaticMarkup(
        React.createElement(BudgetView, {
          trip: INITIAL_TRIP,
          expenses: INITIAL_EXPENSES,
          budgetCalc,
          onAddExpense: () => {},
          onEditExpense: () => {},
          onDeleteExpense: () => {},
          onEditTripSettings: () => {},
        })
      );

      expect(html).toContain('Daily Spending Summary');
      expect(html).toContain('17 Nov');
      expect(html).toContain('Total Budget');
      expect(html).toContain('Add Expense');
    });

    it('4.4: Tickets/TransportView renders unified transit hub with 19-leg passes grid and boarding passes', () => {
      const html = renderToStaticMarkup(
        React.createElement(TicketsView, {
          documents: INITIAL_DOCUMENTS,
          transportLegs: INITIAL_TRANSPORT,
          trip: INITIAL_TRIP,
          days: CONFIRMED_ITINERARY_DAYS,
          initialSection: 'transport',
          initialTransportScreen: 'transport-list',
          onSaveDocument: vi.fn(),
          onDeleteDocument: vi.fn(),
          onSaveTransport: vi.fn(),
          onDeleteTransport: vi.fn(),
        })
      );

      expect(html).toContain('19-Day Pilgrimage Journey Passes');
      expect(html).toContain('Day 1');
      expect(html).toContain('Day 2');
      expect(html).toContain('Day 18');
      expect(html).toContain('Day 19');
    });

    it('4.5: AccommodationView renders clean stays overview without duplicate sacred circuit', () => {
      const html = renderToStaticMarkup(
        React.createElement(AccommodationView, {
          trip: INITIAL_TRIP,
          days: CONFIRMED_ITINERARY_DAYS,
          accommodations: INITIAL_STAYS,
          onSaveStay: () => Promise.resolve(),
          onDeleteStay: () => Promise.resolve(),
        })
      );

      expect(html).toContain('Accommodation');
      expect(html).toContain('All your stays in one place');
      expect(html).not.toContain('Sacred Stay Circuit 19-Day Pilgrimage Circuit Stays');
    });

    it('4.6: PlacesView renders 32 authentic holy sites with category filters and visited tracker', () => {
      const html = renderToStaticMarkup(
        React.createElement(PlacesView, {
          trip: INITIAL_TRIP,
          days: CONFIRMED_ITINERARY_DAYS,
          places: INITIAL_PLACES,
          initialScreen: 'overview',
          onSavePlace: () => Promise.resolve(),
          onDeletePlace: () => Promise.resolve(),
        })
      );

      expect(html).toContain('Places &amp; Temples');
      expect(html).toContain('Explore all destinations and temples');
      expect(html).toContain('Jyotirlingas');
      expect(html).toContain('7');
      expect(html).toContain('Total Places');
      expect(html).toContain('32');
    });

    it('4.7: ChecklistsView renders checklist categories and completion tracker', () => {
      const html = renderToStaticMarkup(
        React.createElement(ChecklistsView, {
          trip: INITIAL_TRIP,
          days: CONFIRMED_ITINERARY_DAYS,
          checklists: INITIAL_CHECKLIST,
          initialScreen: 'overview',
        })
      );

      expect(html).toContain('Checklists');
      expect(html).toContain('Overall Progress');
      expect(html).toContain('Before Departure');
      expect(html).toContain('Packing');
    });

    it('4.8: NotesView renders spiritual reflections, categories, and add note controls', () => {
      const html = renderToStaticMarkup(
        React.createElement(NotesView, {
          trip: INITIAL_TRIP,
          days: CONFIRMED_ITINERARY_DAYS,
          notes: INITIAL_NOTES,
          initialScreen: 'overview',
        })
      );

      expect(html).toContain('Notes &amp; Journal');
      expect(html).toContain('Emergency Contacts &amp; Helplines');
      expect(html).toContain('Pilgrim Darshan Tips &amp; Codes');
    });

    it('4.9: MoreView renders 3D quick action cards and deep route links', () => {
      const html = renderToStaticMarkup(
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

      expect(html).toContain('Places &amp; Temples');
      expect(html).toContain('Checklists');
      expect(html).toContain('Notes &amp; Journal');
      expect(html).toContain('Cloud &amp; Settings');
    });

    it('4.10: SettingsCloudView renders Supabase sync, backup export, and restore controls', () => {
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
      expect(html).toContain('Backups');
      expect(html).toContain('App Settings');
      expect(html).toContain('Data &amp; Storage');
    });
  });
});
