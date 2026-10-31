'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  pushLocalChangeToServer,
  pushFullLocalStateToServer,
  pullLocalServerUpdates,
  triggerTwoWayLocalSync,
} from '@/lib/local-sync';
import {
  Trip,
  ItineraryDay,
  ItineraryItem,
  Expense,
  ExpenseCategory,
  Booking,
  BookingDocument,
  TransportLeg,
  AccommodationStay,
  AccommodationBookingStatus,
  Place,
  ChecklistItem,
  ChecklistCategory,
  TripNote,
  NoteCategory,
  ConflictItem,
} from '@/types/trip';
import {
  db,
  initializeDatabase,
  resetToDefaultData,
  getFullTripData,
  queueOfflineChange,
  exportBackupJSON,
  restoreBackupJSON,
  clearLocalSensitiveData,
  recordDeletedStay,
  unrecordDeletedStay,
  recordDeletedTransport,
  unrecordDeletedTransport,
  CONFIRMED_PILGRIMAGE_TRIP,
  CONFIRMED_TRIP_ID,
  deleteSyncQueueItem,
} from '@/lib/db';
import {
  CONFIRMED_ITINERARY_DAYS,
  getConfirmedPlaces,
  getConfirmedTransportLegs,
  getConfirmedAccommodationStays,
} from '@/lib/itinerary-data';
import { generateUUID } from '@/lib/uuid';
import { calculateBudget } from '@/lib/calculations';
import { syncWithCloud, resolveConflict, CloudRowCounts } from '@/lib/sync';
import { executeCleanDataReset, CLEAN_EMPTY_TRIP } from '@/lib/clean-reset';
import { getSupabaseClient, resetSupabaseClientInstance } from '@/lib/supabase';
import { Header } from '@/components/Header';
import { Navigation, NavTab, MoreSubTab } from '@/components/Navigation';
import { HomeView } from '@/components/views/HomeView';
import { ItineraryView } from '@/components/views/ItineraryView';
import { BudgetView, getCategoryDisplayLabel } from '@/components/views/BudgetView';
import { TicketsView } from '@/components/views/TicketsView';
import { TransportView } from '@/components/views/TransportView';
import { DocumentsView } from '@/components/views/DocumentsView';
import { AccommodationView } from '@/components/views/AccommodationView';
import { MoreView } from '@/components/views/MoreView';
import { PlacesScreen } from '@/components/views/PlacesView';
import { SyncInspectorModal } from '@/components/modals/SyncInspectorModal';
import { SyncFailureModal } from '@/components/modals/SyncFailureModal';
import { ConfirmModal, ConfirmModalProps } from '@/components/modals/ConfirmModal';
import { AlertModal, AlertModalProps } from '@/components/modals/AlertModal';
import { SyncTableDetail } from '@/lib/sync';
import {
  syncStayExpense,
  deleteStayExpense,
  syncTransportExpense,
  deleteTransportExpense,
  syncTicketExpense,
  deleteTicketExpense,
} from '@/utils/autoExpenseSync';
import {
  TripSettingsModal,
  ExpenseModal,
  TicketModal,
  DayEditModal,
  ConflictModal,
  ActivityModal,
  StayModal,
  NoteModal,
} from '@/components/Modals';

// Error Boundary to prevent any single view crash from freezing the application
class ViewErrorBoundary extends React.Component<
  { children: React.ReactNode; viewName: string; onReset?: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`ViewErrorBoundary [${this.props.viewName}] caught:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-red-100 shadow-sm text-center space-y-4 my-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-xl">
            ⚠️
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Unable to load {this.props.viewName}
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
              {this.state.error?.message || 'An unexpected error occurred while rendering this screen.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (this.props.onReset) this.props.onReset();
              }}
              className="px-4 py-2 rounded-xl bg-[#0F5B44] text-white text-xs font-bold shadow-xs hover:bg-[#16654f]"
            >
              Retry
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function YatraApp() {
  const [trip, setTrip] = useState<Trip>(() => ({
    id: CONFIRMED_TRIP_ID,
    ...CONFIRMED_PILGRIMAGE_TRIP,
  }));
  const [days, setDays] = useState<ItineraryDay[]>(CONFIRMED_ITINERARY_DAYS);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [documents, setDocuments] = useState<BookingDocument[]>([]);
  const [transportLegs, setTransportLegs] = useState<TransportLeg[]>(() => getConfirmedTransportLegs(CONFIRMED_TRIP_ID));
  const [accommodations, setAccommodations] = useState<AccommodationStay[]>(() => getConfirmedAccommodationStays(CONFIRMED_TRIP_ID));
  const [places, setPlaces] = useState<Place[]>(() => getConfirmedPlaces(CONFIRMED_TRIP_ID));
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);
  const [notes, setNotes] = useState<TripNote[]>([]);

  // Navigation state & Hierarchical History Stack
  interface HistoryEntry {
    tab: NavTab;
    subTab?: MoreSubTab;
    itineraryMode?: 'list' | 'details';
    dayIndex?: number;
    placeId?: string;
    placesScreen?: PlacesScreen;
  }

  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [activeMoreSubTab, setActiveMoreSubTab] = useState<MoreSubTab>('places');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | undefined>();
  const [placesScreen, setPlacesScreen] = useState<PlacesScreen | undefined>();
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [itineraryViewMode, setItineraryViewMode] = useState<'list' | 'details'>('list');
  const [navHistory, setNavHistory] = useState<HistoryEntry[]>([
    { tab: 'home' },
  ]);

  const navigateToTabWithHistory = (
    tab: NavTab,
    subTab?: MoreSubTab,
    mode?: 'list' | 'details',
    dayIdx?: number
  ) => {
    const resolvedMode = tab === 'itinerary' ? (mode || (activeTab === 'itinerary' ? itineraryViewMode : 'list')) : undefined;
    const resolvedDayIdx = tab === 'itinerary' ? (dayIdx !== undefined ? dayIdx : selectedDayIndex) : undefined;

    if (tab === 'itinerary' && mode) {
      setItineraryViewMode(mode);
    }
    if (tab === 'itinerary' && dayIdx !== undefined) {
      setSelectedDayIndex(dayIdx);
    }
    setActiveTab(tab);
    if (subTab) setActiveMoreSubTab(subTab);

    setNavHistory(prev => {
      const last = prev[prev.length - 1];
      if (
        last &&
        last.tab === tab &&
        last.subTab === subTab &&
        last.itineraryMode === resolvedMode &&
        last.dayIndex === resolvedDayIdx
      ) {
        return prev;
      }
      return [
        ...prev.slice(-30),
        {
          tab,
          subTab,
          itineraryMode: resolvedMode,
          dayIndex: resolvedDayIdx,
        },
      ];
    });
  };

  const handleSelectItineraryDay = (dayIdx: number) => {
    setSelectedDayIndex(dayIdx);
    setItineraryViewMode('details');
    setActiveTab('itinerary');
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('yatra_selected_day_index', String(dayIdx));
        sessionStorage.setItem('yatra_itinerary_view_mode', 'details');
      } catch {}
    }
    setNavHistory(prev => {
      const last = prev[prev.length - 1];
      if (
        last &&
        last.tab === 'itinerary' &&
        last.itineraryMode === 'details' &&
        last.dayIndex === dayIdx
      ) {
        return prev;
      }
      return [
        ...prev.slice(-30),
        {
          tab: 'itinerary',
          itineraryMode: 'details',
          dayIndex: dayIdx,
        },
      ];
    });
  };

  const handleBackToItineraryList = () => {
    setItineraryViewMode('list');
    setActiveTab('itinerary');
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('yatra_itinerary_view_mode', 'list');
      } catch {}
    }
    setNavHistory(prev => {
      const copy = [...prev];
      if (
        copy.length > 1 &&
        copy[copy.length - 2]?.tab === 'itinerary' &&
        copy[copy.length - 2]?.itineraryMode === 'list'
      ) {
        copy.pop();
        return copy;
      }
      return [...prev.slice(-30), { tab: 'itinerary', itineraryMode: 'list' }];
    });
  };

  const handleHeaderBack = () => {
    if (navHistory.length > 1) {
      const nextHistory = [...navHistory];
      nextHistory.pop(); // Remove current state
      const prev = nextHistory[nextHistory.length - 1];
      setNavHistory(nextHistory);

      setActiveTab(prev.tab);

      if (prev.tab === 'itinerary') {
        const mode = prev.itineraryMode || 'list';
        setItineraryViewMode(mode);
        if (typeof prev.dayIndex === 'number') {
          setSelectedDayIndex(prev.dayIndex);
        }
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('yatra_itinerary_view_mode', mode);
            if (typeof prev.dayIndex === 'number') {
              sessionStorage.setItem('yatra_selected_day_index', String(prev.dayIndex));
            }
          } catch {}
        }
      }

      if (prev.subTab) {
        setActiveMoreSubTab(prev.subTab);
      }

      if (prev.placesScreen) {
        setPlacesScreen(prev.placesScreen);
      }
      if (prev.placeId !== undefined) {
        setSelectedPlaceId(prev.placeId);
      }

      const title =
        prev.tab === 'itinerary' && prev.itineraryMode === 'details' && typeof prev.dayIndex === 'number'
          ? `Day ${prev.dayIndex + 1}`
          : prev.tab === 'itinerary' && prev.itineraryMode === 'list'
          ? 'Itinerary List'
          : prev.tab.charAt(0).toUpperCase() + prev.tab.slice(1);
      showToast(`Back to ${title}`);
      return;
    }

    if (activeTab !== 'home') {
      setActiveTab('home');
      setNavHistory([{ tab: 'home' }]);
      showToast('Back to Home');
    }
  };

  // Connectivity & Sync state
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [cloudUser, setCloudUser] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<'signed_out' | 'syncing' | 'synced' | 'offline' | 'failed'>('signed_out');
  const [syncMessage, setSyncMessage] = useState<string>('Operating locally in IndexedDB');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [cloudRowCounts, setCloudRowCounts] = useState<CloudRowCounts | null>(null);

  // Modal dialog states
  const [isTripSettingsOpen, setIsTripSettingsOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expensePrefillDate, setExpensePrefillDate] = useState<string | undefined>();
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<BookingDocument | null>(null);
  const [ticketPrefillTitle, setTicketPrefillTitle] = useState<string | undefined>();
  const [isDayEditOpen, setIsDayEditOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<ItineraryDay | null>(null);

  // Additional mobile-friendly modal states
  const [activityModalDayId, setActivityModalDayId] = useState<string | null>(null);
  const [stayModalState, setStayModalState] = useState<{ isOpen: boolean; stay: AccommodationStay | null }>({
    isOpen: false,
    stay: null,
  });
  const [noteModalState, setNoteModalState] = useState<{ isOpen: boolean; note: TripNote | null }>({
    isOpen: false,
    note: null,
  });

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Global 3D Confirmation and Alert Dialog States
  const [confirmDialog, setConfirmDialog] = useState<ConfirmModalProps | null>(null);
  const [alertDialog, setAlertDialog] = useState<AlertModalProps | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Initial Load from IndexedDB
  const refreshLocalData = async (tripId: string) => {
    const full = await getFullTripData(tripId);
    if (full.trip) {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('yatra_persisted_trip', JSON.stringify(full.trip));
        } catch {}
      }
    }
    setTrip(full.trip);
    setDays(full.days);
    setExpenses(full.expenses);
    setBookings(full.bookings);
    setDocuments(full.documents);
    setTransportLegs(full.transportLegs);
    setAccommodations(full.accommodations);
    setPlaces(full.places);
    setChecklists(full.checklists);
    setNotes(full.notes);

    const pendingCount = await db.syncQueue.where('status').equals('pending').count();
    setPendingSyncCount(pendingCount);
  };

  // Sync Inspector Modal States (Task 12)
  const [isSyncInspectorOpen, setIsSyncInspectorOpen] = useState(false);
  const [syncTableDetails, setSyncTableDetails] = useState<SyncTableDetail[]>([]);
  const [syncPendingItems, setSyncPendingItems] = useState<any[]>([]);

  // Sync Failure Reason Popup State
  const [syncFailureModal, setSyncFailureModal] = useState<{
    isOpen: boolean;
    errorReason: string;
    technicalDetails?: string;
    failedItems?: any[];
  }>({
    isOpen: false,
    errorReason: '',
  });

  const handleDeleteQueueItem = async (queueId: string) => {
    try {
      await deleteSyncQueueItem(queueId);
      await refreshInspectorQueue();
      showToast('Queued operation removed');
    } catch (e: any) {
      showToast(`Could not remove operation: ${e.message}`);
    }
  };

  // Helper to load pending queue items with human-readable titles immediately
  const refreshInspectorQueue = async () => {
    try {
      const queue = await db.syncQueue.where('status').anyOf(['pending', 'failed']).toArray();
      const mapped = queue.map(q => {
        let displayTitle = '';
        if (q.entity === 'transportLegs' || q.entity === 'transport_legs') {
          displayTitle = q.payload?.fromLocation && q.payload?.toLocation 
            ? `${q.payload.fromLocation} → ${q.payload.toLocation}`
            : 'Transport Journey';
        } else if (q.entity === 'accommodations' || q.entity === 'accommodation_stays') {
          displayTitle = q.payload?.name || q.payload?.city || 'Accommodation Stay';
        } else if (q.entity === 'expenses') {
          displayTitle = `${q.payload?.amount ? `₹${q.payload.amount}` : ''} ${q.payload?.title || 'Expense'}`.trim();
        } else if (q.entity === 'documents' || q.entity === 'booking_documents') {
          displayTitle = q.payload?.title || q.payload?.docType || 'Document';
        } else if (q.entity === 'notes' || q.entity === 'trip_notes') {
          displayTitle = q.payload?.title || 'Note';
        } else if (q.entity === 'checklists' || q.entity === 'checklist_items') {
          displayTitle = q.payload?.title || 'Checklist Item';
        } else {
          displayTitle = `${q.entity} Record`;
        }
        return {
          id: q.id,
          entity: q.entity,
          action: q.action,
          recordId: q.recordId,
          timestamp: q.timestamp || new Date().toISOString(),
          title: displayTitle,
          error: q.error,
        };
      });
      setSyncPendingItems(mapped);
      setPendingSyncCount(mapped.length);
    } catch {}
  };

  // Synchronize with Cloud Handler
  const handleCloudSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatus('syncing');
    setSyncMessage('Synchronizing with private Supabase cloud...');
    await refreshInspectorQueue();
    try {
      const result = await syncWithCloud(trip.id);
      setPendingSyncCount(result.pendingCount);
      if (result.tableDetails) setSyncTableDetails(result.tableDetails);
      if (result.status === 'synced') {
        setSyncStatus('synced');
        setSyncMessage(result.message || 'Synced with private cloud');
        if (result.lastSyncedAt) setLastSyncedAt(result.lastSyncedAt);
        if (result.rowCounts) setCloudRowCounts(result.rowCounts);
        showToast(result.message || 'Synced successfully!');
      } else if (result.status === 'unauthenticated') {
        setSyncStatus('signed_out');
        const reason = result.error || result.message || 'Operating locally in IndexedDB';
        setSyncMessage(reason);
        // Do NOT open SyncFailureModal for unauthenticated status - offline/local is primary
      } else if (result.status === 'offline') {
        setSyncStatus('offline');
        setSyncMessage('Offline mode: Changes queued locally on device');
        showToast('Offline: Changes queued locally');
      } else if (result.status === 'failed') {
        setSyncStatus('failed');
        const failureReason = result.error || result.message || 'Cloud synchronization failed';
        setSyncMessage(failureReason);
        showToast(`Sync failed: ${failureReason}`);
        setSyncFailureModal({
          isOpen: true,
          errorReason: failureReason,
          technicalDetails: result.error,
          failedItems: result.failedItems || [],
        });
      } else if (result.status === 'conflict') {
        setSyncStatus('synced');
        setConflicts(result.conflicts || []);
        showToast('Sync completed with conflicts requiring review');
      }
      await refreshLocalData(trip.id);
      await refreshInspectorQueue();
    } catch (err: any) {
      setSyncStatus('failed');
      const failureReason = err.message || 'Unknown network error';
      setSyncMessage(`Sync failed: ${failureReason}`);
      showToast(`Sync failed: ${failureReason}`);
      setSyncFailureModal({
        isOpen: true,
        errorReason: failureReason,
        technicalDetails: err.stack || err.message,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleHeaderSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatus('syncing');
    setSyncMessage('Synchronizing across connected devices...');
    showToast('Syncing with local server & devices...');
    try {
      await triggerTwoWayLocalSync(trip.id);
      await refreshLocalData(trip.id);
      showToast('All devices synchronized (Local Server)');
      setSyncStatus('synced');
      setSyncMessage('Local server & devices synchronized');

      if (cloudUser) {
        await handleCloudSync();
      }
    } catch (err: any) {
      console.warn('Sync error:', err);
      showToast('Sync completed locally on device');
    } finally {
      setIsSyncing(false);
    }
  };

  const triggerCloudSyncWithInspector = async () => {
    await refreshInspectorQueue();
    setIsSyncInspectorOpen(true);
    if (cloudUser) {
      handleCloudSync();
    }
  };

  // Synchronous URL Search Param Tab Router on Mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as NavTab;
      if (tabParam && ['home', 'itinerary', 'budget', 'transport', 'accommodation', 'tickets', 'documents', 'more'].includes(tabParam)) {
        setActiveTab(tabParam === 'tickets' ? 'transport' : tabParam);
      }
      const subTabParam = params.get('subtab') as MoreSubTab;
      if (subTabParam) {
        setActiveMoreSubTab(subTabParam);
      }
      const d = params.get('day');
      if (d) {
        const parsed = parseInt(d, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 19) setSelectedDayIndex(parsed - 1);
      }
      const v = params.get('view');
      if (v === 'details' || v === 'list') {
        setItineraryViewMode(v);
      } else if (d) {
        setItineraryViewMode('details');
      }
    }
  }, []);

  // Guarantee that switching tabs on mobile or desktop scrolls viewport to top
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [activeTab]);

  useEffect(() => {
    let authUnsubscribe: (() => void) | null = null;

    const init = async () => {
      // 1. Immediately hydrate persisted trip preferences from localStorage on client mount (safe from SSR hydration mismatch)
      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem('yatra_persisted_trip');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && (parsed.id || parsed.title)) {
              setTrip(prev => ({ ...prev, ...parsed }));
            }
          }
        } catch {}
      }

      const activeTrip = await initializeDatabase();
      await refreshLocalData(activeTrip.id);
      lastLocalSyncTimeRef.current = new Date().toISOString();
      if (activeTrip.totalBudget && activeTrip.totalBudget > 0) {
        pushFullLocalStateToServer(activeTrip.id).then(serverTime => {
          if (serverTime) lastLocalSyncTimeRef.current = serverTime;
        }).catch(() => {});
      }

      // Restore saved day navigation state if refreshed
      if (typeof window !== 'undefined') {
        const savedDayIdx = sessionStorage.getItem('yatra_selected_day_index');
        if (savedDayIdx !== null) {
          const parsed = parseInt(savedDayIdx, 10);
          if (!isNaN(parsed) && parsed >= 0) setSelectedDayIndex(parsed);
        }
        const savedMode = sessionStorage.getItem('yatra_itinerary_view_mode');
        if (savedMode === 'list' || savedMode === 'details') {
          setItineraryViewMode(savedMode);
        }

        // URL Search Param Navigation Support
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab') as NavTab;
        if (tabParam && ['home', 'itinerary', 'budget', 'transport', 'accommodation', 'tickets', 'documents', 'more'].includes(tabParam)) {
          setActiveTab(tabParam === 'tickets' ? 'transport' : tabParam);
        }
        const subTabParam = params.get('subtab') as MoreSubTab;
        if (subTabParam) {
          setActiveMoreSubTab(subTabParam);
        }
        const dayParam = params.get('day');
        if (dayParam) {
          const parsedDay = parseInt(dayParam, 10);
          if (!isNaN(parsedDay) && parsedDay >= 1) {
            setSelectedDayIndex(parsedDay - 1);
            setItineraryViewMode('details');
          }
        }
        const viewParam = params.get('view');
        if (viewParam === 'details' || viewParam === 'list') {
          setItineraryViewMode(viewParam);
        }
      }

      // Scroll to top immediately when active tab changes
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }

      // Check online status
      if (typeof navigator !== 'undefined') {
        setIsOnline(navigator.onLine);
        let onlineTimer: any = null;
        window.addEventListener('online', () => {
          setIsOnline(true);
          showToast('Connection restored · Synchronizing...');
          clearTimeout(onlineTimer);
          onlineTimer = setTimeout(async () => {
            try {
              await triggerTwoWayLocalSync(activeTrip.id);
              await refreshLocalData(activeTrip.id);
              if (cloudUser) {
                await handleCloudSync();
              }
            } catch {}
          }, 600);
        });
        window.addEventListener('offline', () => {
          setIsOnline(false);
          setSyncStatus('offline');
          setSyncMessage('Offline mode: Changes queued locally on device');
          showToast('Offline mode · Changes saved locally on device');
        });
      }

      // Check Supabase client and restore session
      const client = getSupabaseClient();
      if (client) {
        // 1. Immediately restore session from storage via getSession()
        const { data: { session }, error: sessionErr } = await client.auth.getSession();
        if (sessionErr) {
          console.warn('Supabase getSession error:', sessionErr.message);
        }

        const user = session?.user ?? null;
        setCloudUser(user);

        if (user) {
          setSyncStatus('syncing');
          setSyncMessage('Restoring session and synchronizing with cloud...');
          try {
            const res = await syncWithCloud(activeTrip.id);
            setPendingSyncCount(res.pendingCount);
            if (res.status === 'synced') {
              setSyncStatus('synced');
              setSyncMessage(res.message || 'Synced with private cloud');
              if (res.lastSyncedAt) setLastSyncedAt(res.lastSyncedAt);
              if (res.rowCounts) setCloudRowCounts(res.rowCounts);
              await refreshLocalData(activeTrip.id);
            } else if (res.status === 'failed') {
              setSyncStatus('failed');
              setSyncMessage(res.error || res.message || 'Sync failed');
            } else if (res.status === 'unauthenticated') {
              setSyncStatus('signed_out');
              setSyncMessage('Sign in to sync your pilgrimage data to the cloud');
              setCloudUser(null);
            }
          } catch (err: any) {
            setSyncStatus('failed');
            setSyncMessage(`Sync failed: ${err.message}`);
          }
        } else {
          setSyncStatus('signed_out');
          setSyncMessage('Sign in to sync your pilgrimage data to the cloud');
        }

        // 2. Listen for auth changes using onAuthStateChange()
        const { data: authListener } = client.auth.onAuthStateChange(async (event, newSession) => {
          const newUser = newSession?.user ?? null;
          setCloudUser(newUser);

          if (event === 'SIGNED_IN' && newUser) {
            setSyncStatus('syncing');
            setSyncMessage('Authenticated. Synchronizing pilgrimage data...');
            try {
              const res = await syncWithCloud(activeTrip.id);
              setPendingSyncCount(res.pendingCount);
              if (res.status === 'synced') {
                setSyncStatus('synced');
                setSyncMessage(res.message || 'Synced with private cloud');
                if (res.lastSyncedAt) setLastSyncedAt(res.lastSyncedAt);
                if (res.rowCounts) setCloudRowCounts(res.rowCounts);
                showToast('Synced with cloud successfully!');
              } else if (res.status === 'failed') {
                setSyncStatus('failed');
                setSyncMessage(res.error || res.message || 'Sync failed');
                showToast(`Sync error: ${res.error || res.message}`);
              }
              await refreshLocalData(activeTrip.id);
            } catch (err: any) {
              setSyncStatus('failed');
              setSyncMessage(`Sync error: ${err.message}`);
              showToast(`Sync error: ${err.message}`);
            }
          } else if (event === 'SIGNED_OUT') {
            setSyncStatus('signed_out');
            setSyncMessage('Sign in to sync your pilgrimage data to the cloud');
            setCloudRowCounts(null);
            setLastSyncedAt(null);
          }
        });

        authUnsubscribe = () => {
          authListener.subscription.unsubscribe();
        };
      } else {
        setSyncStatus('signed_out');
        setSyncMessage('Cloud sync not configured');
      }
    };

    init().catch(err => {
      console.error('Initialization error:', err);
    });

    return () => {
      if (authUnsubscribe) authUnsubscribe();
    };
  }, []);

  // Reference timestamp to track synchronization with the local Next.js server
  const lastLocalSyncTimeRef = useRef<string | null>(null);

  // Periodic background check & tab-focus sync with local Next.js server (/api/sync)
  // This enables seamless real-time sync between mobile (http://192.168.1.71:3000) and localhost:3000
  useEffect(() => {
    let isCancelled = false;

    const checkServerSync = async () => {
      if (isCancelled || !trip?.id) return;
      try {
        const res = await pullLocalServerUpdates(trip.id, lastLocalSyncTimeRef.current);
        if (res.updated) {
          lastLocalSyncTimeRef.current = res.lastUpdated || res.serverTime || new Date().toISOString();
          await refreshLocalData(trip.id);
        } else if (res.serverTime && !lastLocalSyncTimeRef.current) {
          lastLocalSyncTimeRef.current = res.lastUpdated || res.serverTime;
        }
      } catch (err) {
        // Non-blocking, fails quietly in offline mode
      }
    };

    // Run immediately on mount
    checkServerSync();

    // Run on 2.5s interval
    const interval = setInterval(checkServerSync, 2500);

    // Run on tab focus & visibility change
    const onFocus = () => { checkServerSync(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      isCancelled = true;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [trip?.id]);

  // Persist day selection & view mode in sessionStorage to survive page refresh
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('yatra_selected_day_index', String(selectedDayIndex));
      sessionStorage.setItem('yatra_itinerary_view_mode', itineraryViewMode);
    }
  }, [selectedDayIndex, itineraryViewMode]);

  // Compute financial totals with zero-tolerance precision
  const budgetCalc = useMemo(() => {
    return calculateBudget(trip, expenses);
  }, [trip, expenses]);

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------

  const handleSaveTripSettings = async (updated: Partial<Trip>) => {
    const newTrip = { ...trip, ...updated, updatedAt: new Date().toISOString() };
    await db.trips.put(newTrip);
    await queueOfflineChange('trips', 'update', newTrip.id, newTrip);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('yatra_persisted_trip', JSON.stringify(newTrip));
      } catch {}
    }
    setTrip(newTrip);
    setPendingSyncCount(prev => prev + 1);
    lastLocalSyncTimeRef.current = newTrip.updatedAt;
    showToast('Trip settings updated');
    await pushLocalChangeToServer(newTrip.id, 'trip', 'update', newTrip);
    await pushFullLocalStateToServer(newTrip.id);
    if (cloudUser) {
      handleCloudSync().catch(() => {});
    }
  };

  const handleNavigateToMoreSubTab = (subTab: MoreSubTab, targetPlaceId?: string, screen?: PlacesScreen) => {
    if (subTab === 'places') {
      if (targetPlaceId) {
        setSelectedPlaceId(targetPlaceId);
        setPlacesScreen(screen || 'details');
      } else {
        setPlacesScreen('overview');
      }
    }
    setActiveMoreSubTab(subTab);
    setActiveTab('more');
  };

  const handleOpenPlaceDetails = (placeId: string) => {
    setSelectedPlaceId(placeId);
    setPlacesScreen('details');
    setActiveMoreSubTab('places');
    setActiveTab('more');
  };

  const handleSaveExpense = async (expData: Partial<Expense>) => {
    const amount = Number(expData.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Amount must be a finite number greater than zero');
      throw new Error('Amount must be a finite number greater than zero');
    }
    if (!expData.date || !expData.date.trim()) {
      showToast('Expense date is required');
      throw new Error('Expense date is required');
    }
    if (!expData.category) {
      showToast('Expense category is required');
      throw new Error('Expense category is required');
    }

    const isNew = !expData.id;
    const expId = expData.id || generateUUID();

    // Verify trip ownership when editing an existing expense
    if (!isNew) {
      const existing = await db.expenses.get(expId);
      if (existing && existing.tripId !== trip.id) {
        showToast('Unauthorized: cannot edit expense from another trip');
        throw new Error('Unauthorized: cannot edit expense from another trip');
      }
    }

    // Default title to category display label if blank
    const fallbackTitle = getCategoryDisplayLabel(expData.category as ExpenseCategory);
    const resolvedTitle = expData.title && expData.title.trim() ? expData.title.trim() : fallbackTitle;

    const newExpense: Expense = {
      id: expId,
      tripId: trip.id || CONFIRMED_TRIP_ID,
      dayId: expData.dayId || undefined,
      date: expData.date.trim(),
      title: resolvedTitle,
      amount: Math.round(amount * 100) / 100,
      category: expData.category || 'Transport',
      paymentMethod: expData.paymentMethod || 'Cash',
      destination: expData.destination?.trim() || undefined,
      notes: expData.notes?.trim() || undefined,
      isCashInflow: Boolean(expData.isCashInflow),
      createdAt: expData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.expenses.put(newExpense);
    await queueOfflineChange('expenses', isNew ? 'insert' : 'update', expId, newExpense);
    setExpenses(prev => {
      const idx = prev.findIndex(e => e.id === expId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newExpense;
        return copy.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      }
      return [newExpense, ...prev].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    });
    await refreshLocalData(trip.id || CONFIRMED_TRIP_ID);
    showToast(isNew ? 'Expense logged' : 'Expense updated');
    pushLocalChangeToServer(trip.id || CONFIRMED_TRIP_ID, 'expenses', isNew ? 'create' : 'update', newExpense);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    const existing = await db.expenses.get(expenseId);
    if (existing && existing.tripId !== trip.id) {
      showToast('Unauthorized: cannot delete expense from another trip');
      return;
    }
    await db.expenses.delete(expenseId);
    await queueOfflineChange('expenses', 'delete', expenseId, { id: expenseId });
    setExpenses(prev => prev.filter(e => e.id !== expenseId));
    await refreshLocalData(trip.id || CONFIRMED_TRIP_ID);
    showToast('Expense removed');
    pushLocalChangeToServer(trip.id || CONFIRMED_TRIP_ID, 'expenses', 'delete', expenseId);
  };

  const handleSaveTicket = async (docData: Partial<BookingDocument>, fileBlob?: string) => {
    if (!docData.title || !docData.title.trim()) {
      showToast('Document title is required');
      throw new Error('Document title is required');
    }

    const isNew = !docData.id;
    const docId = docData.id || generateUUID();

    // Verify trip ownership when editing an existing document
    if (!isNew) {
      const existing = await db.documents.get(docId);
      if (existing && existing.tripId !== trip.id) {
        showToast('Unauthorized: cannot edit document from another trip');
        throw new Error('Unauthorized: cannot edit document from another trip');
      }
    }

    const newDoc: BookingDocument = {
      id: docId,
      tripId: trip.id,
      dayId: docData.dayId || undefined,
      title: docData.title.trim(),
      docType: docData.docType || 'Train Ticket',
      fileName: docData.fileName || `${docData.title.trim().replace(/\s+/g, '_')}.pdf`,
      fileSize: docData.fileSize,
      fileType: docData.fileType,
      storagePath: docData.storagePath || `${trip.id}/${docId}`,
      blobData: fileBlob || docData.blobData || docData.pdfBlob || docData.imageBlob,
      pdfBlob: docData.pdfBlob || (docData.fileType?.includes('pdf') || docData.fileName?.toLowerCase().endsWith('.pdf') ? (fileBlob || docData.blobData) : undefined),
      pdfUrl: docData.pdfUrl,
      pdfFileName: docData.pdfFileName || (docData.fileName?.toLowerCase().endsWith('.pdf') ? docData.fileName : undefined),
      pdfFileSize: docData.pdfFileSize || (docData.fileName?.toLowerCase().endsWith('.pdf') ? docData.fileSize : undefined),
      imageBlob: docData.imageBlob || (docData.fileType?.includes('image') || docData.fileName?.match(/\.(jpe?g|png|webp|gif|svg)$/i) ? (fileBlob || docData.blobData) : undefined),
      imageUrl: docData.imageUrl,
      imageFileName: docData.imageFileName || (docData.fileName?.match(/\.(jpe?g|png|webp|gif|svg)$/i) ? docData.fileName : undefined),
      imageFileSize: docData.imageFileSize || (docData.fileName?.match(/\.(jpe?g|png|webp|gif|svg)$/i) ? docData.fileSize : undefined),
      offlineCached: Boolean(fileBlob || docData.blobData || docData.pdfBlob || docData.imageBlob || docData.offlineCached),
      travelDate: docData.travelDate?.trim() || undefined,
      pnr: docData.pnr?.trim() || undefined,
      bookingRef: docData.bookingRef?.trim() || docData.pnr?.trim() || undefined,
      notes: docData.notes?.trim() || undefined,
      status: docData.status || 'Confirmed',
      trainName: docData.trainName,
      trainNumber: docData.trainNumber,
      serviceNumber: docData.serviceNumber || docData.trainNumber,
      departureTime: docData.departureTime,
      arrivalTime: docData.arrivalTime,
      duration: docData.duration,
      fromStationCode: docData.fromStationCode,
      toStationCode: docData.toStationCode,
      fromCity: docData.fromCity,
      toCity: docData.toCity,
      classType: docData.classType,
      coachSeat: docData.coachSeat,
      berthType: docData.berthType,
      platform: docData.platform,
      passengers: docData.passengers,
      hotelAddress: docData.hotelAddress,
      contactPhone: docData.contactPhone,
      roomType: docData.roomType,
      totalAmount: docData.totalAmount,
      createdAt: docData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.documents.put(newDoc);
    await queueOfflineChange('documents', isNew ? 'insert' : 'update', docId, newDoc);

    // Auto-sync ticket expense to budget ledger
    try {
      const allExpenses = await db.expenses.toArray();
      const expenseAction = syncTicketExpense(newDoc, trip.id || CONFIRMED_TRIP_ID, allExpenses);
      if (expenseAction) {
        if (expenseAction.action === 'insert') {
          await db.expenses.put(expenseAction.expense);
          await queueOfflineChange('expenses', 'insert', expenseAction.expense.id, expenseAction.expense);
          setExpenses(prev => [expenseAction.expense, ...prev.filter(e => e.id !== expenseAction.expense.id)]);
          pushLocalChangeToServer(trip.id || CONFIRMED_TRIP_ID, 'expenses', 'create', expenseAction.expense);
        } else if (expenseAction.action === 'update') {
          await db.expenses.put(expenseAction.expense);
          await queueOfflineChange('expenses', 'update', expenseAction.expense.id, expenseAction.expense);
          setExpenses(prev => prev.map(e => e.id === expenseAction.expense.id ? expenseAction.expense : e));
          pushLocalChangeToServer(trip.id || CONFIRMED_TRIP_ID, 'expenses', 'update', expenseAction.expense);
        } else if (expenseAction.action === 'delete') {
          await db.expenses.delete(expenseAction.expenseId);
          await queueOfflineChange('expenses', 'delete', expenseAction.expenseId, { id: expenseAction.expenseId });
          setExpenses(prev => prev.filter(e => e.id !== expenseAction.expenseId));
          pushLocalChangeToServer(trip.id || CONFIRMED_TRIP_ID, 'expenses', 'delete', expenseAction.expenseId);
        }
      }
    } catch (err) {
      console.warn('Auto-expense sync for ticket failed:', err);
    }

    await refreshLocalData(trip.id);
    showToast(isNew ? 'Document saved in vault' : 'Document updated');
    pushLocalChangeToServer(trip.id, 'documents', isNew ? 'create' : 'update', newDoc);
  };

  const handleDeleteTicket = async (docId: string) => {
    const existing = await db.documents.get(docId);
    if (existing && existing.tripId !== trip.id) {
      showToast('Unauthorized: cannot delete document from another trip');
      return;
    }
    await db.documents.delete(docId);
    await queueOfflineChange('documents', 'delete', docId, { id: docId });

    // Auto-delete linked expense
    try {
      const allExpenses = await db.expenses.toArray();
      const linkedExpenseId = deleteTicketExpense(docId, allExpenses);
      if (linkedExpenseId) {
        await db.expenses.delete(linkedExpenseId);
        await queueOfflineChange('expenses', 'delete', linkedExpenseId, { id: linkedExpenseId });
        setExpenses(prev => prev.filter(e => e.id !== linkedExpenseId));
        pushLocalChangeToServer(trip.id || CONFIRMED_TRIP_ID, 'expenses', 'delete', linkedExpenseId);
      }
    } catch (err) {
      console.warn('Auto-delete linked expense for ticket failed:', err);
    }

    await refreshLocalData(trip.id);
    showToast('Document removed');
    pushLocalChangeToServer(trip.id, 'documents', 'delete', docId);
  };

  const handleToggleDayTask = async (dayIndex: number, taskId: string, isDone: boolean) => {
    const updatedDays = [...days];
    const day = updatedDays[dayIndex];
    if (!day) return;

    const task = day.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.isCompleted = isDone;
    task.updatedAt = new Date().toISOString();

    await db.itineraryItems.put(task);
    await queueOfflineChange('itineraryItems', 'update', task.id, task);
    setDays(updatedDays);
    setPendingSyncCount(prev => prev + 1);
  };

  const handleSaveDayEdit = async (updatedDay: Partial<ItineraryDay>) => {
    if (!updatedDay.id) return;
    const existing = days.find(d => d.id === updatedDay.id);
    if (!existing) return;

    const { tasks, ...dayMeta } = { ...existing, ...updatedDay };
    await db.itineraryDays.put(dayMeta as ItineraryDay);
    await queueOfflineChange('itineraryDays', 'update', dayMeta.id, dayMeta);
    await refreshLocalData(trip.id);
    showToast('Day plan updated');
  };

  const handleAddTaskToDay = (dayId: string) => {
    setActivityModalDayId(dayId);
  };

  const handleSaveActivity = async (
    arg1: string | Partial<ItineraryItem>,
    arg2?: string,
    arg3?: string
  ) => {
    let actData: Partial<ItineraryItem> = {};
    if (typeof arg1 === 'object') {
      actData = arg1;
    } else {
      actData = {
        title: arg1,
        itemType: (arg2 || 'Darshan') as any,
        timeEstimate: arg3,
        dayId: activityModalDayId || undefined,
      };
    }

    const isNew = !actData.id;
    const actId = actData.id || generateUUID();
    const dayId = actData.dayId || activityModalDayId || days[selectedDayIndex]?.id || '';

    const item: ItineraryItem = {
      id: actId,
      tripId: trip.id,
      dayId,
      title: (actData.title || '').trim(),
      itemType: (actData.itemType || 'Darshan') as any,
      timeEstimate: actData.timeEstimate || actData.startTime || '12:00 PM',
      startTime: actData.startTime,
      endTime: actData.endTime,
      location: actData.location,
      notes: actData.notes,
      isCompleted: Boolean(actData.isCompleted),
      needsVerification: false,
      sortOrder: actData.sortOrder || 10,
      createdAt: actData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.itineraryItems.put(item);
    await queueOfflineChange('itineraryItems', isNew ? 'insert' : 'update', actId, item);
    await refreshLocalData(trip.id);
    showToast(isNew ? 'Activity added' : 'Activity updated');
  };

  const handleDeleteActivity = async (activityId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Activity?',
      message: 'Are you sure you want to delete this activity from your pilgrimage itinerary?',
      confirmLabel: 'Delete Activity',
      cancelLabel: 'Keep Activity',
      variant: 'danger',
      iconType: 'trash',
      onConfirm: async () => {
        setConfirmDialog(null);
        await db.itineraryItems.delete(activityId);
        await queueOfflineChange('itineraryItems', 'delete', activityId, { id: activityId });
        await refreshLocalData(trip.id);
        showToast('Activity removed');
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  const handleToggleChecklistItem = async (id: string, isDone: boolean) => {
    try {
      await db.checklists.update(id, { isCompleted: isDone, updatedAt: new Date().toISOString() });
      const item = await db.checklists.get(id);
      if (item) {
        await queueOfflineChange('checklists', 'update', id, item);
        setChecklists(prev => prev.map(c => (c.id === id ? { ...c, isCompleted: isDone } : c)));
        setPendingSyncCount(p => p + 1);
        pushLocalChangeToServer(trip.id, 'checklists', 'update', { ...item, isCompleted: isDone });
      }
    } catch (err: any) {
      console.error('Failed to toggle checklist item:', err);
      showToast(`Error updating task: ${err.message || 'Storage error'}`);
      throw err;
    }
  };

  const handleAddChecklistItem = async (arg: any) => {
    let category: ChecklistCategory = 'Documents';
    let title = '';
    let description = '';
    let checklistGroup: any = undefined;
    let priority: 'Low' | 'Medium' | 'High' = 'Medium';
    let dueDate: string | undefined = undefined;
    let reminder: string | undefined = undefined;
    let dayId: string | undefined = undefined;

    if (typeof arg === 'string') {
      category = (arg as ChecklistCategory) || 'Documents';
      title = prompt(`Add item for ${category}:`) || '';
    } else if (arg && typeof arg === 'object') {
      category = (arg.category as ChecklistCategory) || 'Documents';
      title = arg.title || '';
      description = arg.description || '';
      checklistGroup = arg.checklistGroup;
      priority = arg.priority || 'Medium';
      dueDate = arg.dueDate;
      reminder = arg.reminder;
      dayId = arg.dayId;
    }
    if (!title || !title.trim()) return;

    try {
      const newItem: ChecklistItem = {
        id: generateUUID(),
        tripId: trip.id,
        category,
        checklistGroup,
        title: title.trim(),
        description: description ? description.trim() : undefined,
        priority,
        dueDate,
        reminder,
        dayId,
        isCompleted: false,
        sortOrder: checklists.length + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.checklists.put(newItem);
      await queueOfflineChange('checklists', 'insert', newItem.id, newItem);
      await refreshLocalData(trip.id);
      setPendingSyncCount(p => p + 1);
      showToast('Checklist item added');
      pushLocalChangeToServer(trip.id, 'checklists', 'create', newItem);
    } catch (err: any) {
      console.error('Failed to add checklist item:', err);
      showToast(`Error adding checklist item: ${err.message || 'Storage error'}`);
      throw err;
    }
  };

  const handleEditChecklistItem = async (item: ChecklistItem) => {
    if (item.tripId && item.tripId !== trip.id) {
      console.warn('Trip mismatch on edit checklist item');
      showToast('Error: Cannot modify checklist item from another trip');
      return;
    }
    try {
      const updated: ChecklistItem = {
        ...item,
        updatedAt: new Date().toISOString(),
      };
      await db.checklists.put(updated);
      await queueOfflineChange('checklists', 'update', updated.id, updated);
      setChecklists(prev => prev.map(c => (c.id === updated.id ? updated : c)));
      setPendingSyncCount(p => p + 1);
      showToast('Checklist item updated');
      pushLocalChangeToServer(trip.id, 'checklists', 'update', updated);
    } catch (err: any) {
      console.error('Failed to update checklist item:', err);
      showToast(`Error updating checklist item: ${err.message || 'Storage error'}`);
      throw err;
    }
  };

  const handleDeleteChecklistItem = async (id: string) => {
    try {
      await db.checklists.delete(id);
      await queueOfflineChange('checklists', 'delete', id, { id });
      setChecklists(prev => prev.filter(c => c.id !== id));
      setPendingSyncCount(p => p + 1);
      showToast('Item deleted');
      pushLocalChangeToServer(trip.id, 'checklists', 'delete', id);
    } catch (err: any) {
      console.error('Failed to delete checklist item:', err);
      showToast(`Error deleting item: ${err.message || 'Storage error'}`);
      throw err;
    }
  };

  const handleSaveDocument = async (docData: Partial<BookingDocument>) => {
    await handleSaveTicket(docData, docData.blobData);
  };

  const handleSaveTransport = async (legData: Partial<TransportLeg>) => {
    if (!legData.fromLocation?.trim() || !legData.toLocation?.trim()) {
      showToast('Origin and destination are required');
      throw new Error('Origin and destination are required');
    }

    const isNew = !legData.id;
    const legId = legData.id || generateUUID();

    if (!isNew) {
      const existing = await db.transportLegs.get(legId);
      if (existing && existing.tripId !== trip.id && existing.tripId !== CONFIRMED_TRIP_ID && trip.id !== CONFIRMED_TRIP_ID) {
        showToast('Unauthorized: cannot edit journey from another trip');
        throw new Error('Unauthorized: cannot edit journey from another trip');
      }
    }

    // Determine status: respect user selection directly without artificial overrides (Task 8)
    const resolvedStatus: TransportLeg['status'] =
      legData.status || (legData.bookingRef || legData.pnr ? 'Booked' : 'Needs verification');

    const newLeg: TransportLeg = {
      id: legId,
      tripId: trip.id || CONFIRMED_TRIP_ID,
      dayId: legData.dayId || undefined,
      fromLocation: legData.fromLocation.trim(),
      toLocation: legData.toLocation.trim(),
      mode: legData.mode || 'Train',
      serviceNumber: legData.serviceNumber?.trim() || undefined,
      departureTime: legData.departureTime?.trim() || undefined,
      arrivalTime: legData.arrivalTime?.trim() || undefined,
      date: legData.date?.trim() || undefined,
      status: resolvedStatus,
      needsVerification: resolvedStatus === 'Needs verification',
      bookingRef: legData.bookingRef?.trim() || undefined,
      pnr: legData.pnr?.trim() || undefined,
      trainName: legData.trainName?.trim() || undefined,
      busType: legData.busType?.trim() || undefined,
      classType: legData.classType?.trim() || undefined,
      coachSeat: legData.coachSeat?.trim() || undefined,
      platformFrom: legData.platformFrom?.trim() || undefined,
      platformTo: legData.platformTo?.trim() || undefined,
      chartStatus: legData.chartStatus?.trim() || undefined,
      fare: typeof legData.fare === 'number' ? legData.fare : undefined,
      duration: legData.duration?.trim() || undefined,
      stops: typeof legData.stops === 'number' ? legData.stops : undefined,
      driverName: legData.driverName?.trim() || undefined,
      driverPhone: legData.driverPhone?.trim() || undefined,
      provider: legData.provider?.trim() || undefined,
      peopleCount: typeof legData.peopleCount === 'number' ? legData.peopleCount : undefined,
      pickupPoint: legData.pickupPoint?.trim() || undefined,
      dropPoint: legData.dropPoint?.trim() || undefined,
      notes: legData.notes?.trim() || undefined,
      createdAt: legData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Optimistically update React state immediately (Task 7)
    await unrecordDeletedTransport(legId);
    setTransportLegs(prev => {
      const idx = prev.findIndex(l => l.id === legId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newLeg;
        return copy;
      }
      return [newLeg, ...prev];
    });

    await db.transportLegs.put(newLeg);
    await queueOfflineChange('transportLegs', isNew ? 'insert' : 'update', legId, newLeg);

    // Auto-sync transport expense to budget ledger
    try {
      const allExpenses = await db.expenses.toArray();
      const expenseAction = syncTransportExpense(newLeg, trip.id || CONFIRMED_TRIP_ID, allExpenses);
      if (expenseAction) {
        if (expenseAction.action === 'insert') {
          await db.expenses.put(expenseAction.expense);
          await queueOfflineChange('expenses', 'insert', expenseAction.expense.id, expenseAction.expense);
          setExpenses(prev => [expenseAction.expense, ...prev.filter(e => e.id !== expenseAction.expense.id)]);
          pushLocalChangeToServer(trip.id || CONFIRMED_TRIP_ID, 'expenses', 'create', expenseAction.expense);
        } else if (expenseAction.action === 'update') {
          await db.expenses.put(expenseAction.expense);
          await queueOfflineChange('expenses', 'update', expenseAction.expense.id, expenseAction.expense);
          setExpenses(prev => prev.map(e => e.id === expenseAction.expense.id ? expenseAction.expense : e));
          pushLocalChangeToServer(trip.id || CONFIRMED_TRIP_ID, 'expenses', 'update', expenseAction.expense);
        } else if (expenseAction.action === 'delete') {
          await db.expenses.delete(expenseAction.expenseId);
          await queueOfflineChange('expenses', 'delete', expenseAction.expenseId, { id: expenseAction.expenseId });
          setExpenses(prev => prev.filter(e => e.id !== expenseAction.expenseId));
          pushLocalChangeToServer(trip.id || CONFIRMED_TRIP_ID, 'expenses', 'delete', expenseAction.expenseId);
        }
      }
    } catch (err) {
      console.warn('Auto-expense sync for transport failed:', err);
    }

    await refreshLocalData(trip.id);
    showToast(isNew ? 'Journey added' : 'Journey updated');
    pushLocalChangeToServer(trip.id, 'transportLegs', isNew ? 'create' : 'update', newLeg);
  };

  const handleDeleteTransport = async (legId: string) => {
    // Record deletion in metadata so it is permanent across refreshes and syncs
    await recordDeletedTransport(legId);
    // Optimistically update React state immediately
    setTransportLegs(prev => prev.filter(l => l.id !== legId));
    await db.transportLegs.delete(legId);
    await queueOfflineChange('transportLegs', 'delete', legId, { id: legId });

    // Auto-delete linked expense
    try {
      const allExpenses = await db.expenses.toArray();
      const linkedExpenseId = deleteTransportExpense(legId, allExpenses);
      if (linkedExpenseId) {
        await db.expenses.delete(linkedExpenseId);
        await queueOfflineChange('expenses', 'delete', linkedExpenseId, { id: linkedExpenseId });
        setExpenses(prev => prev.filter(e => e.id !== linkedExpenseId));
        pushLocalChangeToServer(trip.id || CONFIRMED_TRIP_ID, 'expenses', 'delete', linkedExpenseId);
      }
    } catch (err) {
      console.warn('Auto-delete linked expense for transport failed:', err);
    }

    await refreshLocalData(trip.id);
    showToast('Journey removed');
    pushLocalChangeToServer(trip.id, 'transportLegs', 'delete', legId);
  };

  const handleAddStay = () => {
    setStayModalState({ isOpen: true, stay: null });
  };

  const handleEditStay = (stay: AccommodationStay) => {
    setStayModalState({ isOpen: true, stay });
  };

  const handleSaveStay = async (stayData: Partial<AccommodationStay>) => {
    if (!stayData.name?.trim()) {
      showToast('Accommodation name is required');
      return;
    }
    const isNew = !stayData.id;
    const stayId = stayData.id || generateUUID();

    let existing: AccommodationStay | undefined;
    if (!isNew) {
      existing = await db.accommodations.get(stayId);
      if (existing && existing.tripId !== trip.id && existing.tripId !== CONFIRMED_TRIP_ID && trip.id !== CONFIRMED_TRIP_ID) {
        showToast('Unauthorized: cannot modify accommodation from another trip');
        return;
      }
      if (!existing) {
        existing = accommodations.find(s => s.id === stayId);
      }
    }

    // Determine status: respect user's explicit selection directly without resetting to 'Needs research' (Task 9)
    const resolvedStatus =
      stayData.bookingStatus !== undefined && stayData.bookingStatus !== null && String(stayData.bookingStatus).trim() !== ''
        ? (stayData.bookingStatus as AccommodationBookingStatus)
        : stayData.status !== undefined && stayData.status !== null && String(stayData.status).trim() !== ''
        ? (stayData.status as AccommodationBookingStatus)
        : existing?.bookingStatus || 'Needs research';

    const newStay: AccommodationStay = {
      ...(existing || {}),
      ...stayData,
      id: stayId,
      tripId: trip.id || CONFIRMED_TRIP_ID,
      dayId: stayData.dayId !== undefined ? stayData.dayId : existing?.dayId,
      name: stayData.name.trim(),
      stayType: stayData.stayType || existing?.stayType || 'Dharamshala',
      city: (stayData.city || existing?.city || '').trim(),
      checkinDate: stayData.checkinDate || existing?.checkinDate,
      checkoutDate: stayData.checkoutDate || existing?.checkoutDate,
      checkInTime: stayData.checkInTime || existing?.checkInTime,
      checkOutTime: stayData.checkOutTime || existing?.checkOutTime,
      estimatedCost: Number(stayData.estimatedCost !== undefined ? stayData.estimatedCost : (stayData.totalAmount !== undefined ? stayData.totalAmount : (existing?.estimatedCost || 0))),
      totalAmount: Number(stayData.totalAmount !== undefined ? stayData.totalAmount : (stayData.estimatedCost !== undefined ? stayData.estimatedCost : (existing?.totalAmount || 0))),
      advancePaid: Number(stayData.advancePaid !== undefined ? stayData.advancePaid : (existing?.advancePaid || 0)),
      balanceDue: Number(stayData.balanceDue !== undefined ? stayData.balanceDue : (existing?.balanceDue || 0)),
      capacityPersons: Number(stayData.capacityPersons || existing?.capacityPersons || 1), // Solo traveller default
      nightsCount: Number(stayData.nightsCount !== undefined ? stayData.nightsCount : (existing?.nightsCount || 1)),
      bookingStatus: resolvedStatus,
      status: resolvedStatus,
      bookingId: stayData.bookingId !== undefined ? stayData.bookingId : existing?.bookingId,
      bookingReference: stayData.bookingReference !== undefined ? stayData.bookingReference : existing?.bookingReference,
      bookingDate: stayData.bookingDate || existing?.bookingDate,
      bookedFrom: stayData.bookedFrom || existing?.bookedFrom,
      paymentMethod: stayData.paymentMethod || existing?.paymentMethod || 'UPI',
      cancellationPolicy: stayData.cancellationPolicy || existing?.cancellationPolicy,
      address: stayData.address !== undefined ? stayData.address : existing?.address,
      contactPhone: stayData.contactPhone !== undefined ? stayData.contactPhone : existing?.contactPhone,
      imageUrl: stayData.imageUrl || existing?.imageUrl || '/images/shirdi-dharamshala.jpg',
      imageBlob: (stayData as any).imageBlob !== undefined ? (stayData as any).imageBlob : (existing as any)?.imageBlob,
      imageFileName: (stayData as any).imageFileName !== undefined ? (stayData as any).imageFileName : (existing as any)?.imageFileName,
      imageFileSize: (stayData as any).imageFileSize !== undefined ? (stayData as any).imageFileSize : (existing as any)?.imageFileSize,
      pdfBlob: (stayData as any).pdfBlob !== undefined ? (stayData as any).pdfBlob : (existing as any)?.pdfBlob,
      pdfUrl: (stayData as any).pdfUrl !== undefined ? (stayData as any).pdfUrl : (existing as any)?.pdfUrl,
      pdfFileName: (stayData as any).pdfFileName !== undefined ? (stayData as any).pdfFileName : (existing as any)?.pdfFileName,
      pdfFileSize: (stayData as any).pdfFileSize !== undefined ? (stayData as any).pdfFileSize : (existing as any)?.pdfFileSize,
      galleryUrls: stayData.galleryUrls || existing?.galleryUrls,
      distanceFromTemple: stayData.distanceFromTemple || existing?.distanceFromTemple,
      pricePerPerson: stayData.pricePerPerson !== undefined ? stayData.pricePerPerson : existing?.pricePerPerson,
      rating: stayData.rating !== undefined ? stayData.rating : existing?.rating,
      notes: stayData.notes !== undefined ? stayData.notes : existing?.notes,
      documentUrl: stayData.documentUrl !== undefined ? stayData.documentUrl : (stayData as any).pdfBlob || existing?.documentUrl,
      documentName: stayData.documentName !== undefined ? stayData.documentName : (stayData as any).pdfFileName || existing?.documentName,
      documentType: stayData.documentType !== undefined ? stayData.documentType : existing?.documentType,
      documentSize: stayData.documentSize !== undefined ? stayData.documentSize : (stayData as any).pdfFileSize || existing?.documentSize,
      attachedDocuments: stayData.attachedDocuments !== undefined ? stayData.attachedDocuments : existing?.attachedDocuments,
      createdAt: existing?.createdAt || stayData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.accommodations.put(newStay);
    await queueOfflineChange('accommodations', isNew ? 'insert' : 'update', stayId, newStay);

    // Auto-sync stay expense to budget ledger
    try {
      const allExpenses = await db.expenses.toArray();
      const expenseAction = syncStayExpense(newStay, trip.id || CONFIRMED_TRIP_ID, allExpenses);
      if (expenseAction) {
        if (expenseAction.action === 'insert') {
          await db.expenses.put(expenseAction.expense);
          await queueOfflineChange('expenses', 'insert', expenseAction.expense.id, expenseAction.expense);
          setExpenses(prev => [expenseAction.expense, ...prev.filter(e => e.id !== expenseAction.expense.id)]);
          pushLocalChangeToServer(trip.id || CONFIRMED_TRIP_ID, 'expenses', 'create', expenseAction.expense);
        } else if (expenseAction.action === 'update') {
          await db.expenses.put(expenseAction.expense);
          await queueOfflineChange('expenses', 'update', expenseAction.expense.id, expenseAction.expense);
          setExpenses(prev => prev.map(e => e.id === expenseAction.expense.id ? expenseAction.expense : e));
          pushLocalChangeToServer(trip.id || CONFIRMED_TRIP_ID, 'expenses', 'update', expenseAction.expense);
        } else if (expenseAction.action === 'delete') {
          await db.expenses.delete(expenseAction.expenseId);
          await queueOfflineChange('expenses', 'delete', expenseAction.expenseId, { id: expenseAction.expenseId });
          setExpenses(prev => prev.filter(e => e.id !== expenseAction.expenseId));
          pushLocalChangeToServer(trip.id || CONFIRMED_TRIP_ID, 'expenses', 'delete', expenseAction.expenseId);
        }
      }
    } catch (err) {
      console.warn('Auto-expense sync for stay failed:', err);
    }

    // Optimistically update React state immediately
    await unrecordDeletedStay(stayId);
    setAccommodations(prev => {
      const idx = prev.findIndex(s => s.id === stayId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newStay;
        return copy;
      }
      return [newStay, ...prev];
    });

    setStayModalState({ isOpen: false, stay: null });
    await refreshLocalData(trip.id);
    showToast(isNew ? 'Accommodation planned' : 'Accommodation updated');
    pushLocalChangeToServer(trip.id, 'accommodations', isNew ? 'create' : 'update', newStay);
  };

  const handleDeleteStay = async (stayId: string) => {
    const existing = await db.accommodations.get(stayId);
    if (existing && existing.tripId !== trip.id) {
      showToast('Unauthorized: cannot remove accommodation from another trip');
      return;
    }
    // Record deletion in metadata so it is permanent across refreshes and syncs
    await recordDeletedStay(stayId);
    // Optimistically update React state immediately
    setAccommodations(prev => prev.filter(s => s.id !== stayId));
    await db.accommodations.delete(stayId);
    await queueOfflineChange('accommodations', 'delete', stayId, { id: stayId });

    // Auto-delete linked expense
    try {
      const allExpenses = await db.expenses.toArray();
      const linkedExpenseId = deleteStayExpense(stayId, allExpenses);
      if (linkedExpenseId) {
        await db.expenses.delete(linkedExpenseId);
        await queueOfflineChange('expenses', 'delete', linkedExpenseId, { id: linkedExpenseId });
        setExpenses(prev => prev.filter(e => e.id !== linkedExpenseId));
        pushLocalChangeToServer(trip.id || CONFIRMED_TRIP_ID, 'expenses', 'delete', linkedExpenseId);
      }
    } catch (err) {
      console.warn('Auto-delete linked expense for stay failed:', err);
    }

    await refreshLocalData(trip.id);
    showToast('Accommodation removed');
    pushLocalChangeToServer(trip.id, 'accommodations', 'delete', stayId);
  };

  const handleSaveNote = async (noteData: Partial<TripNote>) => {
    try {
      if (noteData.id) {
        const existing = await db.notes.get(noteData.id);
        const updatedNote: TripNote = {
          ...(existing || {}),
          ...noteData,
          id: noteData.id,
          tripId: trip.id,
          title: (noteData.title ?? existing?.title ?? '').trim(),
          content: (noteData.content ?? existing?.content ?? '').trim(),
          category: (noteData.category ?? existing?.category ?? 'General') as NoteCategory,
          dayId: noteData.dayId !== undefined ? (noteData.dayId || undefined) : existing?.dayId,
          updatedAt: new Date().toISOString(),
        } as TripNote;
        await db.notes.put(updatedNote);
        await queueOfflineChange('notes', 'update', noteData.id, updatedNote);
        setPendingSyncCount(p => p + 1);
        showToast('Note updated');
        pushLocalChangeToServer(trip.id, 'notes', 'update', updatedNote);
      } else {
        const newNote: TripNote = {
          id: generateUUID(),
          tripId: trip.id,
          dayId: noteData.dayId || undefined,
          title: (noteData.title || '').trim(),
          content: (noteData.content || '').trim(),
          category: (noteData.category || 'General') as NoteCategory,
          noteType: noteData.noteType || 'Daily',
          date: noteData.date || undefined,
          location: noteData.location || undefined,
          tags: noteData.tags || [],
          priority: noteData.priority || 'Medium',
          isImportant: noteData.isImportant || false,
          isPinned: noteData.isPinned || false,
          isBookmark: noteData.isBookmark || false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await db.notes.put(newNote);
        await queueOfflineChange('notes', 'insert', newNote.id, newNote);
        setPendingSyncCount(p => p + 1);
        showToast('Note added');
        pushLocalChangeToServer(trip.id, 'notes', 'create', newNote);
      }
      await refreshLocalData(trip.id);
    } catch (err: any) {
      console.error('Failed to save note locally:', err);
      showToast(`Error saving note: ${err.message || 'Storage error'}`);
      throw err;
    }
  };

  const handleAddNote = async (noteData?: Partial<TripNote>) => {
    if (noteData && noteData.title) {
      await handleSaveNote(noteData);
    } else {
      setNoteModalState({ isOpen: true, note: null });
    }
  };

  const handleEditNote = async (note: TripNote) => {
    await handleSaveNote(note);
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await db.notes.delete(noteId);
      await queueOfflineChange('notes', 'delete', noteId, { id: noteId });
      await refreshLocalData(trip.id);
      setPendingSyncCount(p => p + 1);
      showToast('Note removed');
      pushLocalChangeToServer(trip.id, 'notes', 'delete', noteId);
    } catch (err: any) {
      console.error('Failed to delete note:', err);
      showToast(`Error deleting note: ${err.message || 'Storage error'}`);
      throw err;
    }
  };

  // Places Handlers
  const handleSavePlace = async (placeData: Partial<Place>) => {
    if (!placeData.name?.trim() || !placeData.city?.trim()) {
      showToast('Place name and city are required');
      return;
    }
    const isNew = !placeData.id || placeData.id.startsWith('new-');
    if (!isNew) {
      const existing = await db.places.get(placeData.id!);
      if (existing && existing.tripId !== trip.id) {
        showToast('Error: Cannot modify a place belonging to another trip');
        return;
      }
    }
    const id = isNew ? generateUUID() : placeData.id!;

    let dayNumber = placeData.dayNumber;
    if (placeData.dayId && !dayNumber) {
      const matched = days.find(d => d.id === placeData.dayId);
      if (matched) dayNumber = matched.dayNumber;
    }

    const visitStatus =
      placeData.visitStatus ||
      (placeData.isVisited
        ? 'Visited'
        : placeData.needsVerification
        ? 'Needs verification'
        : 'Planned');

    const record: Place = {
      id,
      tripId: trip.id,
      dayId: placeData.dayId,
      dayNumber,
      date: placeData.date,
      name: placeData.name.trim(),
      city: placeData.city.trim(),
      placeType: placeData.placeType || 'Temple',
      visitStatus,
      significance: placeData.significance || '',
      openingHours: placeData.openingHours,
      dressCode: placeData.dressCode,
      darshanType: placeData.darshanType,
      entryFee: placeData.entryFee,
      needsVerification: Boolean(placeData.needsVerification),
      imageUrl: placeData.imageUrl || '/images/temple-hero.jpg',
      isVisited: Boolean(placeData.isVisited || visitStatus === 'Visited'),
      visitedDate: placeData.visitedDate,
      userNotes: placeData.userNotes,
      userRating: placeData.userRating,
      notes: placeData.notes,
      mapUrl: placeData.mapUrl,
      createdAt: placeData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.places.put(record);
    await queueOfflineChange('places', isNew ? 'insert' : 'update', id, record);
    await refreshLocalData(trip.id);
    showToast(isNew ? 'Place added' : 'Place updated');
    pushLocalChangeToServer(trip.id, 'places', isNew ? 'create' : 'update', record);
  };

  const handleDeletePlace = async (placeId: string) => {
    const existing = await db.places.get(placeId);
    if (existing && existing.tripId !== trip.id) {
      showToast('Error: Cannot delete place belonging to another trip');
      return;
    }
    await db.places.delete(placeId);
    await queueOfflineChange('places', 'delete', placeId, { id: placeId });
    await refreshLocalData(trip.id);
    showToast('Place removed');
    pushLocalChangeToServer(trip.id, 'places', 'delete', placeId);
  };

  // Backup Export & Restore
  const handleExportBackup = async () => {
    const backup = await exportBackupJSON(trip.id);
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `yatra-complete-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Trip backup exported');
  };

  const handleRestoreBackup = async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      setConfirmDialog({
        isOpen: true,
        title: 'Restore Trip Backup?',
        message: 'Restoring will replace existing local data for this trip with the backup file.\nDo you want to proceed?',
        confirmLabel: 'Restore Data',
        cancelLabel: 'Cancel',
        variant: 'warning',
        iconType: 'reset',
        onConfirm: async () => {
          setConfirmDialog(null);
          await restoreBackupJSON(json);
          await refreshLocalData(json.trip.id);
          pushFullLocalStateToServer(json.trip.id);
          showToast('Backup restored successfully!');
        },
        onCancel: () => setConfirmDialog(null),
      });
    } catch (err: any) {
      setAlertDialog({
        isOpen: true,
        title: 'Invalid Backup File',
        message: err.message || 'The selected backup file is malformed or corrupted.',
        variant: 'error',
        onClose: () => setAlertDialog(null),
      });
    }
  };

  const handleResetToSampleData = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Reload Pilgrimage Sample?',
      message: 'This will reset your local itinerary days and default checklists to the official 19-day pilgrimage template.',
      confirmLabel: 'Reload Sample',
      cancelLabel: 'Keep Current',
      variant: 'warning',
      iconType: 'reset',
      onConfirm: async () => {
        setConfirmDialog(null);
        const resetTrip = await resetToDefaultData();
        await refreshLocalData(resetTrip.id);
        pushFullLocalStateToServer(resetTrip.id);
        showToast('Sample 19-day pilgrimage itinerary reloaded!');
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  const handleCleanDataReset = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Clean Data Reset',
      message: 'This will permanently remove obsolete and sample trip records from local storage and Supabase cloud.\nYour auth account, database schema, and profile will NOT be touched.\n\nProceed with clean reset?',
      confirmLabel: 'Execute Reset',
      cancelLabel: 'Cancel',
      variant: 'danger',
      iconType: 'trash',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await executeCleanDataReset(trip.id);
          const cleanTrip = await db.trips.toCollection().first();
          if (cleanTrip) {
            setTrip(cleanTrip);
            await refreshLocalData(cleanTrip.id);
            pushFullLocalStateToServer(cleanTrip.id);
          }
          showToast('Clean Data Reset complete! Obsolete records removed.');
        } catch (err: any) {
          setAlertDialog({
            isOpen: true,
            title: 'Clean Reset Error',
            message: err.message || 'An error occurred during clean reset.',
            variant: 'error',
            onClose: () => setAlertDialog(null),
          });
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  // Cloud Settings & Supabase Auth
  const handleSaveCloudSettings = async (
    url: string,
    key: string,
    email?: string,
    password?: string,
    mode: 'sign_in' | 'sign_up' = 'sign_in'
  ) => {
    localStorage.setItem('yatra_supabase_url', url);
    localStorage.setItem('yatra_supabase_key', key);
    resetSupabaseClientInstance();

    const client = getSupabaseClient(url, key);
    if (!client) throw new Error('Could not initialize Supabase client with the provided URL and Key');

    if (email && password) {
      if (mode === 'sign_up') {
        const signUpRes = await client.auth.signUp({ email, password });
        if (signUpRes.error) throw signUpRes.error;
        if (!signUpRes.data.session && signUpRes.data.user && !signUpRes.data.user.confirmed_at) {
          setCloudUser(signUpRes.data.user);
          setSyncStatus('signed_out');
          setSyncMessage('Account created. Please verify your email before syncing.');
          showToast('Account registered! Check email to confirm registration.');
          return;
        }
        setCloudUser(signUpRes.data.user);
        setSyncStatus('signed_out');
        setSyncMessage('Authenticated. Ready to synchronize.');
        showToast('Account registered & signed in!');
      } else {
        const signInRes = await client.auth.signInWithPassword({ email, password });
        if (signInRes.error) throw signInRes.error;
        setCloudUser(signInRes.data.user);
        setSyncStatus('signed_out');
        setSyncMessage('Authenticated. Ready to synchronize.');
        showToast('Signed in successfully!');
      }
    } else {
      setSyncMessage('Cloud connection parameters configured.');
      showToast('Cloud connection parameters configured.');
    }
  };

  const handleCloudSignOut = async () => {
    const client = getSupabaseClient();
    if (client) await client.auth.signOut();
    setCloudUser(null);
    setSyncStatus('signed_out');
    setSyncMessage('Signed out. Local pilgrimage data preserved in IndexedDB.');
    setCloudRowCounts(null);
    setLastSyncedAt(null);
    await clearLocalSensitiveData(true);
    showToast('Signed out. Local sensitive cache cleared.');
  };

  const handleResolveConflict = async (conflict: ConflictItem, choice: 'keep_local' | 'keep_cloud') => {
    await resolveConflict(conflict, choice);
    setConflicts(prev => prev.filter(c => c.id !== conflict.id));
    await refreshLocalData(trip.id);
    showToast('Conflict resolved');
  };

  return (
    <div className="min-h-screen gradient-mesh-bg text-[#111827] flex flex-col font-sans relative overflow-x-clip selection:bg-[#0F5B44] selection:text-white">
      {/* Ambient 3D floating light orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-emerald-400/10 blur-3xl animate-float-3d" />
        <div className="absolute top-1/3 -right-24 w-96 h-96 rounded-full bg-amber-400/10 blur-3xl animate-float-3d" style={{ animationDelay: '-2.5s' }} />
        <div className="absolute -bottom-24 left-1/3 w-96 h-96 rounded-full bg-teal-400/10 blur-3xl animate-float-3d" style={{ animationDelay: '-1.2s' }} />
      </div>

      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-[#0F5B44] via-[#137255] to-teal-700 text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-xl border border-white/20 transition-all animate-bounce flex items-center gap-2">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container (responsive padding, clean mobile bottom gap) */}
      <div className="max-w-md sm:max-w-xl lg:max-w-5xl mx-auto w-full px-3.5 sm:px-6 py-1 sm:py-6 flex-1 flex flex-col lg:flex-row gap-5 relative z-10">
        {/* Navigation (Sidebar on Desktop, Bottom bar on Mobile) */}
        <Navigation
          activeTab={activeTab}
          onTabChange={tab => navigateToTabWithHistory(tab)}
          activeMoreSubTab={activeMoreSubTab}
          onMoreSubTabChange={subTab => navigateToTabWithHistory('more', subTab)}
          pendingSyncCount={pendingSyncCount}
        />

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 pb-32 sm:pb-36 lg:pb-10">
          <Header
            trip={trip}
            isOnline={isOnline}
            pendingSyncCount={pendingSyncCount}
            isSyncing={isSyncing}
            syncStatus={syncStatus}
            cloudUser={cloudUser}
            onSync={handleHeaderSync}
            onQuickAdd={() => {
              setEditingExpense(null);
              setExpensePrefillDate(undefined);
              setIsExpenseModalOpen(true);
            }}
            onOpenSettings={() => setIsTripSettingsOpen(true)}
            onBack={handleHeaderBack}
          />

          {/* Offline Mode Indicator Banner */}
          {!isOnline && (
            <div className="mt-2.5 bg-amber-50 border border-amber-200/80 rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold leading-tight truncate">Offline Mode Active</p>
                  <p className="text-[11px] text-amber-700 leading-none mt-0.5">All 19 pilgrimage days saved locally on device</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-1 rounded-lg shrink-0">
                {pendingSyncCount > 0 ? `${pendingSyncCount} queued` : 'Local DB'}
              </span>
            </div>
          )}

          {/* Active View Router */}
          <main className="mt-3 sm:mt-4">
            {activeTab === 'home' && (
              <ViewErrorBoundary viewName="Home">
                <HomeView
                  trip={trip}
                  days={days}
                  expenses={expenses}
                  bookings={bookings}
                  transportLegs={transportLegs}
                  checklists={checklists}
                  places={places}
                  isOnline={isOnline}
                  budgetCalc={budgetCalc}
                  cloudUser={cloudUser}
                  syncStatus={syncStatus}
                  syncMessage={syncMessage}
                  lastSyncedAt={lastSyncedAt}
                  cloudRowCounts={cloudRowCounts}
                  isSyncing={isSyncing}
                  onSync={handleHeaderSync}
                  onNavigateToTab={tab => navigateToTabWithHistory(tab)}
                  onNavigateToMoreSubTab={handleNavigateToMoreSubTab}
                  onOpenPlaceDetails={handleOpenPlaceDetails}
                  onSelectDay={handleSelectItineraryDay}
                  onAddExpense={() => {
                    setEditingExpense(null);
                    setIsExpenseModalOpen(true);
                  }}
                  onAddTicket={() => {
                    setEditingTicket(null);
                    setIsTicketModalOpen(true);
                  }}
                  onAddChecklist={() => {
                    handleAddChecklistItem('Documents');
                  }}
                  onEditTripSettings={() => setIsTripSettingsOpen(true)}
                  onToggleTask={handleToggleDayTask}
                />
              </ViewErrorBoundary>
            )}

            {activeTab === 'itinerary' && (
              <ViewErrorBoundary
                viewName="Itinerary"
                onReset={() => {
                  setItineraryViewMode('list');
                  setSelectedDayIndex(0);
                }}
              >
                <ItineraryView
                  days={days}
                  expenses={expenses}
                  places={places}
                  onOpenPlaceDetails={handleOpenPlaceDetails}
                  selectedDayIndex={selectedDayIndex}
                  onSelectDayIndex={handleSelectItineraryDay}
                  onEditDay={day => {
                    setEditingDay(day);
                    setIsDayEditOpen(true);
                  }}
                  onAddTask={handleAddTaskToDay}
                  onToggleTask={handleToggleDayTask}
                  onSaveActivity={handleSaveActivity}
                  onDeleteActivity={handleDeleteActivity}
                  onAddExpenseForDate={date => {
                    setEditingExpense(null);
                    setExpensePrefillDate(date);
                    setIsExpenseModalOpen(true);
                  }}
                  onReloadSample={handleResetToSampleData}
                  initialView={itineraryViewMode}
                  onBackToList={handleBackToItineraryList}
                  defaultSubTab="plan"
                />
              </ViewErrorBoundary>
            )}

            {activeTab === 'budget' && (
              <ViewErrorBoundary viewName="Budget">
                <BudgetView
                  trip={trip}
                  expenses={expenses}
                  budgetCalc={budgetCalc}
                  onAddExpense={() => {
                    setEditingExpense(null);
                    setIsExpenseModalOpen(true);
                  }}
                  onEditExpense={exp => {
                    setEditingExpense(exp);
                    setIsExpenseModalOpen(true);
                  }}
                  onDeleteExpense={handleDeleteExpense}
                  onSaveExpense={handleSaveExpense}
                  onEditTripSettings={() => setIsTripSettingsOpen(true)}
                />
              </ViewErrorBoundary>
            )}

            {(activeTab === 'transport' || activeTab === 'tickets') && (
              <ViewErrorBoundary viewName="Transit &amp; Tickets">
                <TransportView
                  trip={trip}
                  days={days}
                  transportLegs={transportLegs}
                  documents={documents}
                  initialFilter={activeTab === 'tickets' ? 'tickets' : 'all'}
                  onSaveTransport={handleSaveTransport}
                  onDeleteTransport={handleDeleteTransport}
                  onSaveDocument={handleSaveDocument}
                  onDeleteDocument={handleDeleteTicket}
                  onAddTicket={prefill => {
                    setEditingTicket(null);
                    setTicketPrefillTitle(prefill);
                    setIsTicketModalOpen(true);
                  }}
                  onSelectDayIndex={handleSelectItineraryDay}
                  onSaveOffline={() => {
                    showToast('Ticket cached in local storage');
                  }}
                />
              </ViewErrorBoundary>
            )}

            {activeTab === 'accommodation' && (
              <ViewErrorBoundary viewName="Accommodation">
                <AccommodationView
                  trip={trip}
                  days={days}
                  accommodations={accommodations}
                  onSaveStay={handleSaveStay}
                  onDeleteStay={handleDeleteStay}
                  initialScreen="overview"
                  initialSelectedStayId={undefined}
                  onSelectDayIndex={handleSelectItineraryDay}
                />
              </ViewErrorBoundary>
            )}

            {activeTab === 'documents' && (
              <ViewErrorBoundary viewName="Documents">
                <DocumentsView
                  trip={trip}
                  days={days}
                  documents={documents}
                  onSaveDocument={handleSaveDocument}
                  onDeleteDocument={handleDeleteTicket}
                  onSelectDayIndex={handleSelectItineraryDay}
                  onSaveOffline={() => {
                    showToast('Document cached in local storage');
                  }}
                />
              </ViewErrorBoundary>
            )}

            {activeTab === 'more' && (
              <ViewErrorBoundary viewName="More Tools">
                <MoreView
                  trip={trip}
                  days={days}
                  places={places}
                  accommodations={accommodations}
                  transportLegs={transportLegs}
                  checklists={checklists}
                  notes={notes}
                  activeSubTab={activeMoreSubTab}
                  initialSelectedPlaceId={selectedPlaceId}
                  initialPlacesScreen={placesScreen}
                  onSubTabChange={setActiveMoreSubTab}
                  onSelectDayIndex={handleSelectItineraryDay}
                  onAddStay={handleAddStay}
                  onEditStay={handleEditStay}
                  onSaveStay={handleSaveStay}
                  onDeleteStay={handleDeleteStay}
                  onAddNote={handleAddNote}
                  onEditNote={handleEditNote}
                  onDeleteNote={handleDeleteNote}
                  onAddChecklistItem={handleAddChecklistItem}
                  onEditChecklistItem={handleEditChecklistItem}
                  onToggleChecklistItem={handleToggleChecklistItem}
                  onDeleteChecklistItem={handleDeleteChecklistItem}
                  onExportBackup={handleExportBackup}
                  onRestoreBackup={handleRestoreBackup}
                  onSaveCloudSettings={handleSaveCloudSettings}
                  onCloudSignOut={handleCloudSignOut}
                  cloudUser={cloudUser}
                  isCloudConnected={Boolean(cloudUser)}
                  syncStatus={syncStatus}
                  syncMessage={syncMessage}
                  cloudRowCounts={cloudRowCounts}
                  lastSyncedAt={lastSyncedAt}
                  isSyncing={isSyncing}
                  pendingSyncCount={pendingSyncCount}
                  isOnline={isOnline}
                  onSync={handleHeaderSync}
                  onResetData={handleResetToSampleData}
                  onCleanDataReset={handleCleanDataReset}
                  onSavePlace={handleSavePlace}
                  onDeletePlace={handleDeletePlace}
                />
              </ViewErrorBoundary>
            )}
          </main>
        </div>
      </div>

      {/* Modals */}
      {isTripSettingsOpen && (
        <TripSettingsModal
          trip={trip}
          onSave={handleSaveTripSettings}
          onClose={() => setIsTripSettingsOpen(false)}
        />
      )}

      {isExpenseModalOpen && (
        <ExpenseModal
          initialData={editingExpense}
          defaultDate={expensePrefillDate}
          days={days}
          onSave={handleSaveExpense}
          onClose={() => {
            setIsExpenseModalOpen(false);
            setEditingExpense(null);
            setExpensePrefillDate(undefined);
          }}
        />
      )}

      {isTicketModalOpen && (
        <TicketModal
          initialData={editingTicket}
          prefillTitle={ticketPrefillTitle}
          days={days}
          onSave={handleSaveTicket}
          onClose={() => {
            setIsTicketModalOpen(false);
            setEditingTicket(null);
            setTicketPrefillTitle(undefined);
          }}
        />
      )}

      {isDayEditOpen && editingDay && (
        <DayEditModal
          day={editingDay}
          onSave={handleSaveDayEdit}
          onClose={() => {
            setIsDayEditOpen(false);
            setEditingDay(null);
          }}
        />
      )}

      {activityModalDayId && (
        <ActivityModal
          isOpen={Boolean(activityModalDayId)}
          onSave={handleSaveActivity}
          onClose={() => setActivityModalDayId(null)}
        />
      )}

      {stayModalState.isOpen && (
        <StayModal
          isOpen={stayModalState.isOpen}
          initialData={stayModalState.stay}
          onSave={handleSaveStay}
          onClose={() => setStayModalState({ isOpen: false, stay: null })}
        />
      )}

      {noteModalState.isOpen && (
        <NoteModal
          isOpen={noteModalState.isOpen}
          initialData={noteModalState.note}
          onSave={handleSaveNote}
          onClose={() => setNoteModalState({ isOpen: false, note: null })}
        />
      )}

      {conflicts.length > 0 && (
        <ConflictModal
          conflicts={conflicts}
          onResolve={handleResolveConflict}
          onClose={() => setConflicts([])}
        />
      )}

      {/* Cloud Sync Live Inspector Modal (Task 12) */}
      <SyncInspectorModal
        isOpen={isSyncInspectorOpen}
        isSyncing={isSyncing}
        syncStatus={syncStatus}
        syncMessage={syncMessage}
        pendingCount={pendingSyncCount}
        lastSyncedAt={lastSyncedAt}
        tableDetails={syncTableDetails}
        pendingItems={syncPendingItems}
        cloudUser={cloudUser}
        onSyncNow={handleCloudSync}
        onConnectCloud={handleSaveCloudSettings}
        onSignOutCloud={handleCloudSignOut}
        onDeleteQueueItem={handleDeleteQueueItem}
        onClose={() => setIsSyncInspectorOpen(false)}
        localCounts={{
          itineraryDays: days.length,
          transportLegs: transportLegs.length,
          accommodations: accommodations.length,
          documents: documents.length,
          expenses: expenses.length,
          checklistsNotes: checklists.length + notes.length,
        }}
      />
      {/* Global 3D Confirmation Modal */}
      {confirmDialog && (
        <ConfirmModal {...confirmDialog} />
      )}

      {/* Global 3D Alert Modal */}
      {alertDialog && (
        <AlertModal {...alertDialog} />
      )}

      {/* Cloud Sync Failure Reason Popup */}
      <SyncFailureModal
        isOpen={syncFailureModal.isOpen}
        onClose={() => setSyncFailureModal(prev => ({ ...prev, isOpen: false }))}
        onRetry={() => {
          setSyncFailureModal(prev => ({ ...prev, isOpen: false }));
          handleCloudSync();
        }}
        onOpenInspector={() => {
          setSyncFailureModal(prev => ({ ...prev, isOpen: false }));
          setIsSyncInspectorOpen(true);
        }}
        errorReason={syncFailureModal.errorReason}
        technicalDetails={syncFailureModal.technicalDetails}
        failedItems={syncFailureModal.failedItems}
        isRetrying={isSyncing}
      />
    </div>
  );
}
