'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  ItineraryDay,
  ItineraryItem,
  Expense,
  DayThemeType,
  Place,
} from '@/types/trip';
import {
  Calendar,
  CheckCircle2,
  Circle,
  MapPin,
  Clock,
  Plus,
  Edit2,
  ExternalLink,
  Search,
  Filter,
  AlertTriangle,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Bus,
  Train,
  BedDouble,
  Camera,
  Utensils,
  Wallet,
  FileText,
  CheckSquare,
  X,
  Layers,
  Navigation as NavigationIcon,
  Navigation2,
  Compass,
  Trash2,
  Save,
  Check,
  Building,
  Car,
  Image as ImageIcon,
  Sun,
  MoreVertical,
  Bell,
  Milestone,
  Share2,
  Copy,
} from 'lucide-react';
import { getVerifiedTempleInfo } from '@/lib/temple-knowledge';
import { CONFIRMED_PLACES } from '@/lib/itinerary-data';
import {
  migrateDayDetailsLocalStorageIfNeeded,
  loadDayDetailsFromDb,
  saveDayNoteToDb,
  toggleDayChecklistItemInDb,
  addDayChecklistItemToDb,
} from '@/lib/day-details-migration';

interface ItineraryViewProps {
  days: ItineraryDay[];
  expenses: Expense[];
  places?: Place[];
  onOpenPlaceDetails?: (placeId: string) => void;
  selectedDayIndex: number;
  selectedDayId?: string;
  onSelectDayIndex: (index: number) => void;
  onSelectDayId?: (dayId: string) => void;
  onBackToList?: () => void;
  onEditDay: (day: ItineraryDay) => void;
  onAddTask: (dayId: string) => void;
  onToggleTask: (dayIndex: number, taskId: string, isDone: boolean) => void;
  onSaveActivity?: (activityData: Partial<ItineraryItem>) => Promise<void>;
  onDeleteActivity?: (activityId: string) => Promise<void>;
  onAddExpenseForDate: (date: string) => void;
  onReloadSample?: () => void;
  initialView?: 'list' | 'details';
  defaultSubTab?: DetailSubTab;
}

export type DetailSubTab = 'plan' | 'map' | 'places' | 'notes' | 'expenses' | 'checklist';
export type FilterTab = 'all' | 'core' | 'extended' | 'place' | 'jyotirlinga';

interface DayChecklistItem {
  id: string;
  title: string;
  icon: string;
  isDone: boolean;
}

// 7 sacred Jyotirlinga tags for filtering in this 19-day pilgrimage circuit
const JYOTIRLINGA_LIST = [
  'All Jyotirlingas',
  'Grishneshwar',
  'Trimbakeshwar',
  'Bhimashankar',
  'Omkareshwar',
  'Mahakaleshwar',
  'Nageshwar',
  'Somnath',
];

// Helper to resolve an itinerary activity or day destination to a confirmed Place record
export function findMatchingPlace(
  titleOrLocation: string,
  places?: Place[]
): Place | undefined {
  if (!places || places.length === 0 || !titleOrLocation) return undefined;
  const q = titleOrLocation.toLowerCase().trim();

  // 1. Direct name match
  const direct = places.find(p => {
    const pName = p.name.toLowerCase();
    return q.includes(pName) || pName.includes(q);
  });
  if (direct) return direct;

  // 2. Specific keywords matching key pilgrimage candidates
  const keywords = [
    { key: 'grishneshwar', match: 'grishneshwar' },
    { key: 'shirdi', match: 'shirdi' },
    { key: 'ellora', match: 'ellora' },
    { key: 'trimbakeshwar', match: 'trimbakeshwar' },
    { key: 'bhimashankar', match: 'bhimashankar' },
    { key: 'mahakaleshwar', match: 'mahakaleshwar' },
    { key: 'omkareshwar', match: 'omkareshwar' },
    { key: 'mamaleshwar', match: 'mamleshwar' },
    { key: 'mamleshwar', match: 'mamleshwar' },
    { key: 'nageshwar', match: 'nageshwar' },
    { key: 'somnath', match: 'somnath' },
    { key: 'dwarkadhish', match: 'dwarka' },
    { key: 'dwarka', match: 'dwarka' },
    { key: 'khammam', match: 'khammam' },
    { key: 'charminar', match: 'charminar' },
  ];

  for (const { key, match } of keywords) {
    if (q.includes(key)) {
      const found = places.find(
        p => p.name.toLowerCase().includes(match) || (p.city && p.city.toLowerCase().includes(match))
      );
      if (found) return found;
    }
  }

  return undefined;
}

const DAY_AUTHENTIC_IMAGES: Record<number, string> = {
  1: '/images/places/shirdi-sai-samadhi-mandir.jpg', // Secunderabad to Shirdi overnight transit
  2: '/images/places/shirdi-sai-samadhi-mandir.jpg', // Shirdi Samadhi Mandir & Sacred Sites
  3: '/images/places/grishneshwar-jyotirlinga.jpg', // Shirdi to Chhatrapati Sambhajinagar
  4: '/images/places/ellora-kailasa-cave16.jpg', // Grishneshwar & Ellora Caves
  5: '/images/places/nashik-panchavati.jpg', // Nashik Panchavati & Ramkund
  6: '/images/places/trimbakeshwar-jyotirlinga.jpg', // Trimbakeshwar Jyotirlinga & Kushavarta
  7: '/images/places/bhimashankar-jyotirlinga.jpg', // Bhimashankar Jyotirlinga
  8: '/images/places/dwarka-dwarkadhish-temple.jpg', // Transit toward Gujarat
  9: '/images/places/dwarka-dwarkadhish-temple.jpg', // Transit toward Dwarka
  10: '/images/places/nageshwar-jyotirlinga.jpg', // Dwarkadhish & Nageshwar Jyotirlinga
  11: '/images/places/dwarka-bet-dwarka.jpg', // Bet Dwarka & Gopi Talav
  12: '/images/places/somnath-jyotirlinga.jpg', // Somnath Jyotirlinga & Triveni Sangam
  13: '/images/places/mahakaleshwar-jyotirlinga.jpg', // Somnath to Ujjain transit
  14: '/images/places/ujjain-mahakal-lok.jpg', // Mahakaleshwar & Mahakal Lok Corridor
  15: '/images/places/omkareshwar-jyotirlinga.jpg', // Ujjain to Omkareshwar transit
  16: '/images/places/omkareshwar-mamleshwar.jpg', // Omkareshwar Jyotirlinga & Mamleshwar
  17: '/images/places/omkareshwar-narmada-ghats.jpg', // Sacred Narmada Ghats & Return transit
  18: '/images/places/trimbakeshwar-jyotirlinga.jpg', // Central rail transit toward home
  19: '/images/khammam-fort.jpg', // Return to Khammam
};

// Helper to provide visual metadata matching the reference design
function getDayVisualMeta(day: ItineraryDay | undefined | null, index: number) {
  const safeIndex = typeof index === 'number' && index >= 0 ? index : 0;
  const safeDayNum = day?.dayNumber || (safeIndex + 1);
  const image = day?.imageUrl || DAY_AUTHENTIC_IMAGES[safeDayNum] || '/images/places/shirdi-sai-samadhi-mandir.jpg';

  // Distances and travel estimates
  const defaultDistances = [
    '~ 210 km',
    '~ 280 km',
    '~ 30 km',
    '~ 260 km',
    '~ 210 km',
    '~ 520 km',
    '~ 35 km',
    '~ 110 km',
    '~ 220 km',
    '~ 450 km',
    '~ 90 km',
    '~ 140 km',
    '~ 680 km',
    '~ 30 km',
    '~ 240 km',
    '~ 25 km',
    '~ 410 km',
    '~ 600 km',
    '~ 280 km',
  ];
  const distance = day?.distance || defaultDistances[safeIndex] || '~ 180 km';

  const defaultTravelTimes = [
    '6–7 hrs',
    '7–8 hrs',
    'Local',
    '6 hrs',
    '5 hrs',
    'Overnight',
    '1 hr',
    '2–3 hrs',
    '4–5 hrs',
    'Overnight',
    '2 hrs',
    '3 hrs',
    'Overnight',
    'Local',
    '5 hrs',
    'Local',
    '8 hrs',
    'Overnight',
    '5 hrs',
  ];
  const travelTime = day?.travelTime || defaultTravelTimes[safeIndex] || '4–5 hrs';

  const defaultPlacesCount = [3, 2, 4, 3, 2, 2, 3, 2, 3, 3, 2, 2, 3, 4, 2, 3, 2, 2, 2];
  const placesCount = day?.placesCount || defaultPlacesCount[safeIndex] || 3;

  const mode = day?.mode || (safeIndex % 3 === 0 ? 'Train / Road' : safeIndex % 3 === 1 ? 'State Bus' : 'Express Train');

  // Format route title with arrow: "Hyderabad → Khammam"
  let routeTitle = day?.title || 'Pilgrimage Route';
  if (!routeTitle.includes('→') && routeTitle.toLowerCase().includes(' to ')) {
    routeTitle = routeTitle.replace(/ to /i, ' → ');
  }

  // Derive origin & destination cities preferring explicit day record fields
  let originCity = day?.originCity || 'Hyderabad';
  let destinationCity = day?.destinationCity || 'Khammam';
  if (!day?.originCity || !day?.destinationCity) {
    if (routeTitle.includes('→')) {
      const parts = routeTitle.split('→');
      originCity = day?.originCity || (parts[0] || 'Hyderabad').trim();
      destinationCity = day?.destinationCity || (parts[parts.length - 1] || 'Destination').trim();
    } else if (routeTitle.toLowerCase().includes('to')) {
      const parts = routeTitle.split(/to/i);
      originCity = day?.originCity || (parts[0] || 'Hyderabad').trim();
      destinationCity = day?.destinationCity || (parts[parts.length - 1] || 'Destination').trim();
    } else {
      destinationCity = day?.destinationCity || day?.location || 'Pilgrimage Center';
    }
  }

  return {
    image,
    distance,
    travelTime,
    placesCount,
    mode,
    routeTitle,
    originCity,
    destinationCity,
  };
}

// Generate default checklist items for each pilgrimage day
function getDefaultDayChecklist(dayNumber: number, originCity: string, destCity: string): DayChecklistItem[] {
  return [
    { id: `dchk-${dayNumber}-1`, title: 'Verify train / transit schedule and connection', icon: 'train', isDone: false },
    { id: `dchk-${dayNumber}-2`, title: 'Carry original ID proof (Aadhaar / Voter ID)', icon: 'notes', isDone: false },
    { id: `dchk-${dayNumber}-3`, title: `Depart on schedule from ${originCity}`, icon: 'clock', isDone: false },
    { id: `dchk-${dayNumber}-4`, title: `Reach ${destCity}`, icon: 'pin', isDone: false },
    { id: `dchk-${dayNumber}-5`, title: 'Temple darshan, queue protocol & pooja', icon: 'temple', isDone: false },
    { id: `dchk-${dayNumber}-6`, title: 'Satvik meal & hydration', icon: 'food', isDone: false },
    { id: `dchk-${dayNumber}-7`, title: 'Dharamshala / stay check-in or overnight transit', icon: 'hotel', isDone: false },
    { id: `dchk-${dayNumber}-8`, title: 'Record daily expenses in Yatra app', icon: 'wallet', isDone: false },
    { id: `dchk-${dayNumber}-9`, title: 'Review next day schedule & train connections', icon: 'clock', isDone: false },
  ];
}

export const ItineraryView: React.FC<ItineraryViewProps> = ({
  days = [],
  expenses = [],
  places = [],
  onOpenPlaceDetails,
  selectedDayIndex = 0,
  selectedDayId,
  onSelectDayIndex,
  onSelectDayId,
  onBackToList,
  onEditDay,
  onAddTask,
  onToggleTask,
  onSaveActivity,
  onDeleteActivity,
  onAddExpenseForDate,
  onReloadSample,
  initialView = 'list',
  defaultSubTab = 'plan',
}) => {
  // Navigation & View mode: 'list' (Screen 1) or 'details' (Screens 2, 3, 4)
  const [currentView, setCurrentView] = useState<'list' | 'details'>(initialView);
  const [detailSubTab, setDetailSubTab] = useState<DetailSubTab>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const s = p.get('daysubtab') as DetailSubTab;
      if (s && ['plan', 'map', 'places', 'notes', 'expenses', 'checklist'].includes(s)) return s;
    }
    return defaultSubTab;
  });

  // Sync when initialView or defaultSubTab prop changes
  useEffect(() => {
    if (initialView) {
      setCurrentView(initialView);
    }
  }, [initialView]);

  useEffect(() => {
    if (defaultSubTab) {
      setDetailSubTab(defaultSubTab);
    }
  }, [defaultSubTab]);

  // Filters & Search
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [selectedPlaceFilter, setSelectedPlaceFilter] = useState<string>('All Places');
  const [selectedJyotirlingaFilter, setSelectedJyotirlingaFilter] = useState<string>('All Jyotirlingas');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Screen 5: Add / Edit Activity Modal State
  const [activityModal, setActivityModal] = useState<{
    isOpen: boolean;
    activity: ItineraryItem | null;
    dayId: string;
    dayNumber: number;
    dayDate: string;
  }>({
    isOpen: false,
    activity: null,
    dayId: '',
    dayNumber: 1,
    dayDate: '',
  });

  // Day Checklists stored in component state and synced with localStorage
  const [dayChecklists, setDayChecklists] = useState<Record<string, DayChecklistItem[]>>({});
  const [newChecklistText, setNewChecklistText] = useState('');
  const [showAddChecklistInput, setShowAddChecklistInput] = useState(false);

  // Day Notes state
  const [dayNotes, setDayNotes] = useState<Record<string, string>>({});
  const [editingNoteText, setEditingNoteText] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);

  // Day Details interactive features matching reference mockup
  const [showDayMenu, setShowDayMenu] = useState(false);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [reminderSelectedTime, setReminderSelectedTime] = useState('06:00 AM');
  const [photoCaption, setPhotoCaption] = useState('');
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [dayToast, setDayToast] = useState<string | null>(null);

  const showDayToast = (msg: string) => {
    setDayToast(msg);
    setTimeout(() => setDayToast(null), 3000);
  };

  // Load saved day checklists and notes from localStorage & Dexie on mount, and run migration
  useEffect(() => {
    let isMounted = true;
    const initDayDetails = async () => {
      // 1. Load legacy localStorage data first for immediate visual rendering
      if (typeof window !== 'undefined') {
        try {
          const savedChks = localStorage.getItem('yatra_day_checklists');
          if (savedChks && isMounted) setDayChecklists(JSON.parse(savedChks));
          const savedNotes = localStorage.getItem('yatra_day_notes');
          if (savedNotes && isMounted) setDayNotes(JSON.parse(savedNotes));
          const savedPhotos = localStorage.getItem('yatra_day_photos');
          if (savedPhotos && isMounted) setCapturedPhotos(JSON.parse(savedPhotos));
        } catch (err) {
          console.warn('Error reading stored day data:', err);
        }
      }

      // 2. Perform safe, idempotent migration from localStorage to Dexie if needed
      if (days && days.length > 0) {
        try {
          await migrateDayDetailsLocalStorageIfNeeded(days);
        } catch (err) {
          console.warn('Error running day details migration:', err);
        }

        // 3. Load authoritative DB records from Dexie into state
        try {
          const fromDb = await loadDayDetailsFromDb(days);
          if (isMounted) {
            if (Object.keys(fromDb.notesByDayId).length > 0) {
              setDayNotes(prev => ({ ...prev, ...fromDb.notesByDayId }));
            }
            if (Object.keys(fromDb.checklistsByDayId).length > 0) {
              setDayChecklists(prev => {
                const next = { ...prev };
                for (const [dayId, dbItems] of Object.entries(fromDb.checklistsByDayId)) {
                  if (!next[dayId]) {
                    next[dayId] = dbItems;
                  } else {
                    const merged = [...next[dayId]];
                    for (const dbItem of dbItems) {
                      const existingIndex = merged.findIndex(
                        m => m.title.toLowerCase().trim() === dbItem.title.toLowerCase().trim()
                      );
                      if (existingIndex >= 0) {
                        merged[existingIndex] = {
                          ...merged[existingIndex],
                          id: dbItem.id,
                          isDone: dbItem.isDone,
                        };
                      } else {
                        merged.push(dbItem);
                      }
                    }
                    next[dayId] = merged;
                  }
                }
                return next;
              });
            }
          }
        } catch (err) {
          console.warn('Error syncing day details from db:', err);
        }
      }
    };

    initDayDetails();
    return () => {
      isMounted = false;
    };
  }, [days]);

  const saveChecklistsToStorage = (updated: Record<string, DayChecklistItem[]>) => {
    setDayChecklists(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('yatra_day_checklists', JSON.stringify(updated));
      } catch (err) {
        console.warn('Error saving day checklists:', err);
      }
    }
  };

  const saveNotesToStorage = (updated: Record<string, string>) => {
    setDayNotes(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('yatra_day_notes', JSON.stringify(updated));
      } catch (err) {
        console.warn('Error saving day notes:', err);
      }
    }
  };

  // Extract distinct places across days for the "By Place" filter
  const distinctPlaces = useMemo(() => {
    const set = new Set<string>();
    set.add('All Places');
    (days || []).forEach(d => {
      if (!d) return;
      if (d.location) set.add(d.location.split('/')[0].trim());
      const meta = getDayVisualMeta(d, 0);
      if (meta?.originCity) set.add(meta.originCity);
      if (meta?.destinationCity) set.add(meta.destinationCity);
    });
    return Array.from(set).slice(0, 14);
  }, [days]);

  // Active day selection: validate selectedDayId or selectedDayIndex against existing days without clamping
  const activeDay = useMemo(() => {
    if (!days || days.length === 0) return null;
    if (selectedDayId) {
      return days.find(d => d.id === selectedDayId) || null;
    }
    if (typeof selectedDayIndex === 'number' && selectedDayIndex >= 0 && selectedDayIndex < days.length) {
      return days[selectedDayIndex];
    }
    return null;
  }, [days, selectedDayId, selectedDayIndex]);

  const activeMeta = activeDay ? getDayVisualMeta(activeDay, activeDay.dayNumber - 1) : null;

  // Sacred temples and sightseeing spots extracted directly from active day activities
  const dayPlaces = useMemo(() => {
    if (!activeDay?.tasks) return [];
    return activeDay.tasks.filter(t => {
      const type = (t.itemType || '').toLowerCase();
      const title = (t.title || '').toLowerCase();
      return (
        type === 'darshan' ||
        type === 'sightseeing' ||
        type === 'temple' ||
        title.includes('temple') ||
        title.includes('mandir') ||
        title.includes('darshan') ||
        title.includes('jyotirlinga') ||
        title.includes('caves') ||
        title.includes('ghat') ||
        title.includes('samadhi') ||
        title.includes('kund') ||
        title.includes('tirth') ||
        title.includes('chavadi') ||
        title.includes('dwarkamai')
      );
    });
  }, [activeDay]);

  // Genuine confirmed places for this active day from the 32-place pilgrimage dataset
  const dayConfirmedPlaces = useMemo(() => {
    if (!activeDay) return [];
    const direct = (places || []).filter(
      p => p.dayNumber === activeDay.dayNumber || p.dayId === activeDay.id
    );
    if (direct.length > 0) return direct;
    // Fallback: match by destination city
    if (activeDay.destinationCity) {
      const byCity = (places || []).filter(
        p => p.city?.toLowerCase() === activeDay.destinationCity?.toLowerCase()
      );
      if (byCity.length > 0) return byCity;
    }
    return [];
  }, [activeDay, places]);

  // Compute live Google Maps multi-point route directions URL with real locations
  const mapsDirectionsUrl = useMemo(() => {
    if (!activeDay) return '';
    if (dayConfirmedPlaces.length > 0) {
      if (activeDay.originCity === activeDay.destinationCity) {
        // Local circuit day (e.g. Day 2 Shirdi): start at first place, navigate via all waypoints, finish at last
        const origin = encodeURIComponent(`${dayConfirmedPlaces[0].name}, ${activeDay.originCity}`);
        const destination = encodeURIComponent(
          `${dayConfirmedPlaces[dayConfirmedPlaces.length - 1].name}, ${activeDay.destinationCity}`
        );
        const waypoints =
          dayConfirmedPlaces.length > 2
            ? dayConfirmedPlaces
                .slice(1, -1)
                .map(p => encodeURIComponent(`${p.name}, ${p.city}`))
                .join('|')
            : '';
        return waypoints
          ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}`
          : `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
      } else {
        // Transit day: station to destination temple/station
        const origin = encodeURIComponent(`${activeDay.originCity || 'Secunderabad'} Railway Station`);
        const destPlace = dayConfirmedPlaces[0];
        const destination = encodeURIComponent(
          destPlace ? `${destPlace.name}, ${activeDay.destinationCity}` : `${activeDay.destinationCity} Railway Station`
        );
        return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
      }
    }
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
      activeDay.originCity || activeMeta?.originCity || 'Secunderabad'
    )}&destination=${encodeURIComponent(
      activeDay.destinationCity || activeMeta?.destinationCity || 'Shirdi'
    )}`;
  }, [activeDay, activeMeta, dayConfirmedPlaces]);

  // Travel and transit tasks for active day
  const dayTravelTasks = useMemo(() => {
    if (!activeDay?.tasks) return [];
    return activeDay.tasks.filter(t => (t.itemType || '').toLowerCase() === 'travel');
  }, [activeDay]);

  // Chronologically sorted tasks (by sortOrder then startTime)
  const sortedTasks = useMemo(() => {
    if (!activeDay?.tasks) return [];
    return [...activeDay.tasks].sort((a, b) => {
      const orderA = a.sortOrder ?? 999;
      const orderB = b.sortOrder ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
      return 0;
    });
  }, [activeDay]);

  // Formatted date string matching reference mockup: "17 Nov 2026 (Tuesday)"
  const activeFormattedDateWithDay = useMemo(() => {
    if (!activeDay?.date) return '17 Nov 2026 (Tuesday)';
    const dateObj = new Date(activeDay.date + (activeDay.date.includes('T') ? '' : 'T12:00:00'));
    if (isNaN(dateObj.getTime())) return '17 Nov 2026 (Tuesday)';
    const dayNum = dateObj.getDate();
    const month = dateObj.toLocaleDateString('en-IN', { month: 'short' });
    const year = dateObj.getFullYear();
    const weekday = dateObj.toLocaleDateString('en-IN', { weekday: 'long' });
    return `${dayNum} ${month} ${year} (${weekday})`;
  }, [activeDay]);

  // Active day's checklist
  const currentDayChecklist = useMemo(() => {
    if (!activeDay) return [];
    if (dayChecklists[activeDay.id]) {
      return dayChecklists[activeDay.id];
    }
    const meta = activeMeta || getDayVisualMeta(activeDay, activeDay.dayNumber - 1);
    const defaultList = getDefaultDayChecklist(activeDay.dayNumber, meta.originCity, meta.destinationCity);

    if (activeDay.preparationChecklist && activeDay.preparationChecklist.length > 0) {
      const extraItems = activeDay.preparationChecklist
        .filter(item => !defaultList.some(d => d.title.toLowerCase() === item.toLowerCase()))
        .map((item, idx) => ({
          id: `dchk-${activeDay.dayNumber}-prep-${idx + 1}`,
          title: item,
          icon: (idx % 3 === 0 ? 'train' : idx % 3 === 1 ? 'notes' : 'clock') as DayChecklistItem['icon'],
          isDone: false,
        }));
      return [...defaultList, ...extraItems];
    }
    return defaultList;
  }, [activeDay, activeMeta, dayChecklists]);

  // Filtered days list for Screen 1
  const filteredDays = useMemo(() => {
    return days.filter((day, idx) => {
      const meta = getDayVisualMeta(day, idx);

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = (day.title || '').toLowerCase().includes(query);
        const matchesSub = (day.subtitle || '').toLowerCase().includes(query);
        const matchesLoc = (day.location || '').toLowerCase().includes(query);
        const matchesTask = day.tasks?.some(t => (t.title || '').toLowerCase().includes(query));
        if (!matchesTitle && !matchesSub && !matchesLoc && !matchesTask) return false;
      }

      // Filter by Core 12-15 Day Circuit (Days 1–12)
      if (filterTab === 'core' && day.dayNumber > 12) {
        return false;
      }

      // Filter by Extended Saurashtra Route (Days 13–19)
      if (filterTab === 'extended' && day.dayNumber <= 12) {
        return false;
      }

      // Filter by Place
      if (filterTab === 'place' && selectedPlaceFilter !== 'All Places') {
        const placeQuery = selectedPlaceFilter.toLowerCase();
        const matchesLoc = (day.location || '').toLowerCase().includes(placeQuery);
        const matchesOrig = (meta.originCity || '').toLowerCase().includes(placeQuery);
        const matchesDest = (meta.destinationCity || '').toLowerCase().includes(placeQuery);
        if (!matchesLoc && !matchesOrig && !matchesDest) return false;
      }

      // Filter by Jyotirlinga
      if (filterTab === 'jyotirlinga' && selectedJyotirlingaFilter !== 'All Jyotirlingas') {
        const jyoQuery = selectedJyotirlingaFilter.split('(')[0].trim().toLowerCase();
        const matchesLoc = (day.location || '').toLowerCase().includes(jyoQuery);
        const matchesTitle = (day.title || '').toLowerCase().includes(jyoQuery);
        const matchesSub = (day.subtitle || '').toLowerCase().includes(jyoQuery);
        const matchesTask = day.tasks?.some(t => (t.title || '').toLowerCase().includes(jyoQuery));
        if (!matchesLoc && !matchesTitle && !matchesSub && !matchesTask) return false;
      }

      return true;
    });
  }, [days, searchTerm, filterTab, selectedPlaceFilter, selectedJyotirlingaFilter]);

  // Fallback if no days are loaded yet
  if (days.length === 0) {
    return (
      <div className="space-y-4 pb-4">
        <div className="bg-white rounded-3xl p-8 border border-gray-100 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#e8f5ef] text-[#0F5B44] flex items-center justify-center font-bold text-2xl shadow-xs">
            🗺️
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">
              No Itinerary Days Planned Yet
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
              Your itinerary is clean and ready. Plan your schedule, activities, and routes when you are ready.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Handle toggling day checklist item with Dexie IndexedDB persistence
  const handleToggleDayChecklistItem = async (itemId: string) => {
    if (!activeDay) return;
    const targetItem = currentDayChecklist.find(item => item.id === itemId);
    if (!targetItem) return;
    const nextDone = !targetItem.isDone;

    try {
      await toggleDayChecklistItemInDb(activeDay, targetItem.title, nextDone);
    } catch (err) {
      console.warn('Error persisting checklist toggle to db:', err);
    }

    const updatedItems = currentDayChecklist.map(item =>
      item.id === itemId ? { ...item, isDone: nextDone } : item
    );
    const updated = { ...dayChecklists, [activeDay.id]: updatedItems };
    saveChecklistsToStorage(updated);
  };

  // Handle adding custom day checklist item with Dexie IndexedDB persistence
  const handleAddDayChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim() || !activeDay) return;
    const itemTitle = newChecklistText.trim();

    let newId = `dchk-${activeDay.dayNumber}-${Date.now()}`;
    try {
      const persisted = await addDayChecklistItemToDb(activeDay, itemTitle);
      if (persisted && persisted.id) {
        newId = persisted.id;
      }
    } catch (err) {
      console.warn('Error adding checklist item to db:', err);
    }

    const newItem: DayChecklistItem = {
      id: newId,
      title: itemTitle,
      icon: 'pin',
      isDone: false,
    };
    const updatedItems = [...currentDayChecklist, newItem];
    const updated = { ...dayChecklists, [activeDay.id]: updatedItems };
    saveChecklistsToStorage(updated);
    setNewChecklistText('');
    setShowAddChecklistInput(false);
  };

  // Helper for checklist icon
  const renderChecklistIcon = (iconName: string) => {
    switch (iconName) {
      case 'train':
        return <Train className="w-4 h-4 text-emerald-700" />;
      case 'clock':
        return <Clock className="w-4 h-4 text-emerald-700" />;
      case 'pin':
        return <MapPin className="w-4 h-4 text-emerald-700" />;
      case 'hotel':
        return <BedDouble className="w-4 h-4 text-emerald-700" />;
      case 'temple':
        return <Sparkles className="w-4 h-4 text-emerald-700" />;
      case 'food':
        return <Utensils className="w-4 h-4 text-emerald-700" />;
      case 'camera':
        return <Camera className="w-4 h-4 text-emerald-700" />;
      case 'wallet':
        return <Wallet className="w-4 h-4 text-emerald-700" />;
      case 'photo':
        return <ImageIcon className="w-4 h-4 text-emerald-700" />;
      default:
        return <FileText className="w-4 h-4 text-emerald-700" />;
    }
  };

  // Helper for timeline category icon and color
  const getActivityStyle = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('travel') || t.includes('transport') || t.includes('bus') || t.includes('train')) {
      return {
        icon: <Bus className="w-4 h-4 text-[#0F5B44]" />,
        bg: 'bg-[#e8f5ef]',
        border: 'border-emerald-200',
      };
    }
    if (t.includes('darshan') || t.includes('temple') || t.includes('pooja')) {
      return {
        icon: <Sparkles className="w-4 h-4 text-[#d97706]" />,
        bg: 'bg-[#fef3c7]',
        border: 'border-amber-200',
      };
    }
    if (t.includes('sightseeing') || t.includes('camera') || t.includes('local')) {
      return {
        icon: <Camera className="w-4 h-4 text-[#7c3aed]" />,
        bg: 'bg-[#ede9fe]',
        border: 'border-purple-200',
      };
    }
    if (t.includes('hotel') || t.includes('check') || t.includes('stay')) {
      return {
        icon: <BedDouble className="w-4 h-4 text-[#0284c7]" />,
        bg: 'bg-[#e0f2fe]',
        border: 'border-sky-200',
      };
    }
    if (t.includes('meal') || t.includes('food') || t.includes('lunch')) {
      return {
        icon: <Utensils className="w-4 h-4 text-[#ea580c]" />,
        bg: 'bg-[#ffedd5]',
        border: 'border-orange-200',
      };
    }
    return {
      icon: <CheckCircle2 className="w-4 h-4 text-[#0F5B44]" />,
      bg: 'bg-[#e8f5ef]',
      border: 'border-emerald-200',
    };
  };

  return (
    <div className="space-y-4 pb-6">
      {/* ========================================================================= */}
      {/* 1. ITINERARY LIST VIEW (SCREEN 1)                                          */}
      {/* ========================================================================= */}
      {currentView === 'list' && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          {/* Top Title & + Add Button Header */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
                Itinerary
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-1">
                Target: 12–15 Days (Core) · 19 Days Window (Extended to 5 Dec 2026)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`p-2 rounded-full border text-xs font-semibold transition-all ${
                  showSearch || searchTerm
                    ? 'bg-[#e8f5ef] text-[#0F5B44] border-emerald-300'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  if (!activeDay) return;
                  setActivityModal({
                    isOpen: true,
                    activity: null,
                    dayId: activeDay.id,
                    dayNumber: activeDay.dayNumber,
                    dayDate: activeDay.date,
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#0F5B44] text-white hover:bg-[#16654f] transition-all active:scale-95 touch-press shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Search Bar Input (Toggleable) */}
          {showSearch && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search destination, temple, train, day..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-gray-900 focus:border-[#0F5B44] focus:ring-1 focus:ring-[#0F5B44] outline-none shadow-xs"
                autoFocus
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Filter Pills Row */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => {
                setFilterTab('all');
                setSelectedPlaceFilter('All Places');
                setSelectedJyotirlingaFilter('All Jyotirlingas');
              }}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all card-press-3d ${
                filterTab === 'all'
                  ? 'bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white shadow-md shadow-emerald-950/20 ring-1 ring-emerald-300/40'
                  : 'glass-card text-gray-700 border border-white/80 hover:bg-emerald-50/70 hover:text-[#0F5B44]'
              }`}
            >
              All Days ({days.length})
            </button>

            <button
              onClick={() => {
                setFilterTab('core');
                setSelectedPlaceFilter('All Places');
                setSelectedJyotirlingaFilter('All Jyotirlingas');
              }}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all card-press-3d ${
                filterTab === 'core'
                  ? 'bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white shadow-md shadow-emerald-950/20 ring-1 ring-emerald-300/40'
                  : 'glass-card text-gray-700 border border-white/80 hover:bg-emerald-50/70 hover:text-[#0F5B44]'
              }`}
            >
              Core (Days 1–12)
            </button>

            <button
              onClick={() => {
                setFilterTab('extended');
                setSelectedPlaceFilter('All Places');
                setSelectedJyotirlingaFilter('All Jyotirlingas');
              }}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all card-press-3d ${
                filterTab === 'extended'
                  ? 'bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white shadow-md shadow-emerald-950/20 ring-1 ring-emerald-300/40'
                  : 'glass-card text-gray-700 border border-white/80 hover:bg-emerald-50/70 hover:text-[#0F5B44]'
              }`}
            >
              Extended (Days 13–19)
            </button>

            <button
              onClick={() => setFilterTab('place')}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all card-press-3d ${
                filterTab === 'place'
                  ? 'bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white shadow-md shadow-emerald-950/20 ring-1 ring-emerald-300/40'
                  : 'glass-card text-gray-700 border border-white/80 hover:bg-emerald-50/70 hover:text-[#0F5B44]'
              }`}
            >
              By Place
            </button>

            <button
              onClick={() => setFilterTab('jyotirlinga')}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all card-press-3d ${
                filterTab === 'jyotirlinga'
                  ? 'bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white shadow-md shadow-emerald-950/20 ring-1 ring-emerald-300/40'
                  : 'glass-card text-gray-700 border border-white/80 hover:bg-emerald-50/70 hover:text-[#0F5B44]'
              }`}
            >
              By Jyotirlinga
            </button>
          </div>

          {/* Secondary Sub-Filter Row when By Place or By Jyotirlinga is selected */}
          {filterTab === 'place' && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {distinctPlaces.map(place => (
                <button
                  key={place}
                  onClick={() => setSelectedPlaceFilter(place)}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                    selectedPlaceFilter === place
                      ? 'bg-[#e8f5ef] text-[#0F5B44] border border-[#a7f3d0] font-bold'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {place}
                </button>
              ))}
            </div>
          )}

          {filterTab === 'jyotirlinga' && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {JYOTIRLINGA_LIST.map(jyo => (
                <button
                  key={jyo}
                  onClick={() => setSelectedJyotirlingaFilter(jyo)}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                    selectedJyotirlingaFilter === jyo
                      ? 'bg-[#e8f5ef] text-[#0F5B44] border border-[#a7f3d0] font-bold'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {jyo}
                </button>
              ))}
            </div>
          )}

          {/* Connected Vertical Timeline of 19 Days */}
          <div className="space-y-3 pt-1">
            {filteredDays.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-gray-100 text-center text-xs text-gray-500 shadow-xs">
                <Compass className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="font-bold text-gray-700">No matching days found</p>
                <p className="mt-0.5">Try clearing your search or filter.</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterTab('all');
                  }}
                  className="mt-3 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#0F5B44] text-white"
                >
                  Show All Days
                </button>
              </div>
            ) : (
              filteredDays.map((day, idx) => {
                const originalIndex = days.findIndex(d => d.id === day.id);
                const isSelected = selectedDayIndex === originalIndex;
                const isLast = idx === filteredDays.length - 1;
                const isCompleted = day.status === 'Completed';
                const meta = getDayVisualMeta(day, originalIndex);
                const showExtensionBoundary = day.dayNumber === 13 && filterTab === 'all';

                const dateStr = day?.date || '2026-11-17';
                const dateObj = new Date(dateStr + (dateStr.includes('T') ? '' : 'T12:00:00'));
                const formattedDate = isNaN(dateObj.getTime())
                  ? 'Nov 2026'
                  : dateObj.toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      weekday: 'short',
                    });

                const activityCount = day.tasks?.length || 0;

                return (
                  <React.Fragment key={day.id || idx}>
                    {/* Duration & Feasibility Boundary Card before Day 13 */}
                    {showExtensionBoundary && (
                      <div className="my-2.5 p-3.5 sm:p-4 rounded-3xl bg-gradient-to-br from-amber-50/95 via-orange-50/90 to-amber-100/60 border border-amber-300/80 text-amber-950 shadow-md shadow-amber-900/10 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-xl bg-amber-200/80 flex items-center justify-center text-amber-800 flex-shrink-0">
                            <AlertTriangle className="w-3.5 h-3.5 stroke-[2.4]" />
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-wider text-amber-900">
                            12–15 Day Target Duration Boundary
                          </span>
                          <span className="ml-auto px-2.5 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-amber-200 to-orange-200 text-amber-900 shadow-2xs border border-amber-300/50">
                            Candidate Route Assessment
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                          Days 1–12 cover the <strong>Core Pilgrimage (Maharashtra & Gujarat Circuits: Shirdi, Grishneshwar, Trimbakeshwar, Bhimashankar, Lonavala, Dwarka, Somnath)</strong>.
                          Days 13–19 cover the <strong>Madhya Pradesh Circuit (Ujjain, Omkareshwar, Mamaleshwar) and confirmed return journey toward Telangana (Khammam)</strong>, concluding on 5 Dec 2026.
                        </p>
                      </div>
                    )}

                    <div
                      onClick={() => {
                        onSelectDayIndex(originalIndex);
                        setCurrentView('details');
                        setDetailSubTab('plan');
                      }}
                      className="flex items-stretch gap-3 group cursor-pointer"
                    >
                      {/* Left Timeline Node and Connecting Line */}
                      <div className="flex flex-col items-center flex-shrink-0 pt-2.5">
                        {/* 3D Sacred Waypoint Capsule */}
                        <div
                          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 group-hover:scale-105 shadow-md ${
                            isCompleted
                              ? 'bg-gradient-to-tr from-[#0F5B44] via-[#146b51] to-teal-600 text-white shadow-emerald-950/25 ring-4 ring-emerald-100'
                              : isSelected
                              ? 'bg-gradient-to-tr from-[#0F5B44] via-[#146b51] to-teal-700 text-white shadow-emerald-950/20 ring-4 ring-emerald-200'
                              : 'bg-white border-2 border-emerald-100/90 text-emerald-950 shadow-sm group-hover:border-emerald-400 group-hover:text-[#0F5B44] group-hover:shadow-md'
                          }`}
                        >
                          <span className="text-[8px] font-bold uppercase tracking-wider leading-none opacity-80">
                            Day
                          </span>
                          <span className="text-xs sm:text-sm font-black leading-none mt-0.5">
                            {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : originalIndex + 1}
                          </span>
                        </div>
                        {!isLast && (
                          <div className="w-1 flex-1 bg-gradient-to-b from-emerald-500 via-teal-400 to-emerald-600/30 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)] my-1.5 group-hover:bg-emerald-400 transition-colors" />
                        )}
                      </div>

                      {/* Right Day Card - 3D Glass Elevation */}
                      <div className="flex-1 glass-card card-3d rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-white/95 shadow-[0_10px_28px_-6px_rgba(15,91,68,0.08)] hover:shadow-[0_20px_42px_-6px_rgba(15,91,68,0.2)] hover:-translate-y-1 transition-all flex items-center gap-3.5 relative overflow-hidden">
                        {/* Ambient radiant corner glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-100/50 via-teal-50/20 to-transparent rounded-bl-full pointer-events-none opacity-40 group-hover:opacity-90 transition-opacity" />

                        {/* Square Thumbnail with zoom & soft ring */}
                        <div className="relative flex-shrink-0 overflow-hidden rounded-2xl w-16 h-16 sm:w-20 sm:h-20 shadow-md ring-2 ring-emerald-100/70 group-hover:ring-emerald-400/80 transition-all">
                          <img
                            src={meta.image}
                            alt={day.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>

                        {/* Day Metadata & Title */}
                        <div className="min-w-0 flex-1 relative z-10">
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                            <span className="font-extrabold text-emerald-950">
                              Day {originalIndex + 1}
                            </span>
                            <span>·</span>
                            <span>{formattedDate}</span>
                          </div>

                          <h3 className="text-sm sm:text-base font-extrabold text-gray-900 leading-snug break-words mt-0.5 group-hover:text-[#0F5B44] transition-colors">
                            {meta.routeTitle}
                          </h3>

                          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] text-gray-500 font-medium mt-1.5 flex-wrap">
                            {/* Theme Badge */}
                            {day.themeType === 'Temple' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-amber-50 to-orange-50 text-amber-900 border border-amber-200 shadow-2xs">
                                <Sparkles className="w-3 h-3 text-amber-600" />
                                <span>Temple Visit</span>
                              </span>
                            )}
                            {day.themeType === 'Transport' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-sky-50 to-cyan-50 text-sky-900 border border-sky-200 shadow-2xs">
                                <Train className="w-3 h-3 text-sky-600" />
                                <span>Travel / Transit</span>
                              </span>
                            )}
                            {day.themeType === 'Sightseeing' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-purple-50 to-violet-50 text-purple-900 border border-purple-200 shadow-2xs">
                                <Camera className="w-3 h-3 text-purple-600" />
                                <span>Sightseeing</span>
                              </span>
                            )}
                            {day.themeType === 'Personal' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-emerald-50 to-teal-50 text-[#0F5B44] border border-emerald-200 shadow-2xs">
                                <CheckCircle2 className="w-3 h-3 text-[#0F5B44]" />
                                <span>Return Home</span>
                              </span>
                            )}

                            <span className="inline-flex items-center gap-1 text-gray-600">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              <span>{activityCount} activities</span>
                            </span>

                            <span className="inline-flex items-center gap-1 text-gray-600">
                              <MapPin className="w-3.5 h-3.5 text-gray-400" />
                              <span>{day.location || meta.destinationCity}</span>
                            </span>

                            {typeof day.estimatedTravelCost === 'number' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-50 text-gray-700 border border-gray-200">
                                <Wallet className="w-3 h-3 text-gray-500" />
                                <span>₹{day.estimatedTravelCost} est.</span>
                              </span>
                            )}

                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#0F5B44] border border-emerald-200">
                              {day.planningStatus || day.status || 'Estimated'}
                            </span>

                            {day.isCircuitExtension && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-100/80 text-amber-900 border border-amber-200">
                                Extended Route
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right Interactive 3D Chevron Button */}
                        <div className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-50/80 text-[#0F5B44] flex items-center justify-center group-hover:bg-[#0F5B44] group-hover:text-white group-hover:scale-110 group-hover:shadow-md group-hover:shadow-emerald-950/20 transition-all duration-300 ml-auto">
                          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DAY DETAILS VIEW (EXACT MATCH TO REFERENCE MOCKUP)                     */}
      {/* ========================================================================= */}
      {currentView === 'details' && activeDay && activeMeta && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          {/* Day Toast Notification */}
          {dayToast && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#0F5B44] text-white px-4 py-2 rounded-2xl text-xs font-bold shadow-lg flex items-center gap-2 animate-in fade-in zoom-in-95">
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{dayToast}</span>
            </div>
          )}

          {/* 1. TOP BAR: Back Arrow, Day Number, Date, Edit Pill, and Three Dots Menu */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  setCurrentView('list');
                  if (onBackToList) onBackToList();
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-emerald-50 hover:text-[#0F5B44] hover:border-emerald-300 transition-all card-press-3d shadow-xs"
                aria-label="Back to Itinerary list"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
              </button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black text-gray-900 leading-none">
                    Day {activeDay.dayNumber}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e8f5ef] text-[#0F5B44] border border-[#a7f3d0]">
                    {activeDay.status || 'Planned'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-50 text-sky-800 border border-sky-200">
                    {activeDay.planningStatus || 'Estimated'}
                  </span>
                  {activeDay.isCircuitExtension && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                      Extended Circuit
                    </span>
                  )}
                </div>
                <p className="text-[11px] sm:text-xs text-gray-500 font-medium mt-1">
                  {activeFormattedDateWithDay}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 relative">
              {/* Day Switcher Carousel (Prev / Next) */}
              <div className="flex items-center bg-white/90 border border-gray-200 rounded-full p-0.5 shadow-xs mr-0.5">
                <button
                  disabled={selectedDayIndex <= 0}
                  onClick={() => onSelectDayIndex(selectedDayIndex - 1)}
                  className="px-2 py-1 rounded-full text-[11px] font-bold text-gray-700 hover:bg-emerald-50 hover:text-[#0F5B44] disabled:opacity-30 disabled:hover:bg-transparent transition-all flex items-center gap-0.5"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Prev</span>
                </button>
                <span className="text-[10px] font-black text-emerald-950 px-1.5 whitespace-nowrap">
                  {activeDay.dayNumber}/{days.length}
                </span>
                <button
                  disabled={selectedDayIndex >= days.length - 1}
                  onClick={() => onSelectDayIndex(selectedDayIndex + 1)}
                  className="px-2 py-1 rounded-full text-[11px] font-bold text-gray-700 hover:bg-emerald-50 hover:text-[#0F5B44] disabled:opacity-30 disabled:hover:bg-transparent transition-all flex items-center gap-0.5"
                  title="Next Day"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => onEditDay(activeDay)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#0F5B44] text-white hover:bg-[#16654f] transition-all touch-press shadow-xs"
              >
                <Edit2 className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Edit</span>
              </button>

              <button
                onClick={() => setShowDayMenu(!showDayMenu)}
                className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-all shadow-xs"
                aria-label="More options"
              >
                <MoreVertical className="w-4 h-4 text-gray-700" />
              </button>

              {/* Day Options Dropdown */}
              {showDayMenu && (
                <div className="absolute right-0 top-10 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `Pilgrimage Day ${activeDay.dayNumber}: ${activeMeta.routeTitle} (${activeDay.date}) - ${activeDay.subtitle || ''}`
                      );
                      setShowDayMenu(false);
                      showDayToast('Day plan copied to clipboard');
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-gray-700 hover:bg-[#e8f5ef] hover:text-[#0F5B44] flex items-center gap-2"
                  >
                    <Copy className="w-3.5 h-3.5 text-gray-400" />
                    <span>Copy Day Plan</span>
                  </button>
                  <button
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && navigator.share) {
                        navigator.share({
                          title: `Day ${activeDay.dayNumber}: ${activeMeta.routeTitle}`,
                          text: `${activeDay.subtitle || 'Pilgrimage Itinerary'} on ${activeDay.date}`,
                        }).catch(() => {});
                      } else {
                        navigator.clipboard.writeText(
                          `Day ${activeDay.dayNumber}: ${activeMeta.routeTitle} - ${activeDay.subtitle || ''}`
                        );
                        showDayToast('Link copied to clipboard');
                      }
                      setShowDayMenu(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-gray-700 hover:bg-[#e8f5ef] hover:text-[#0F5B44] flex items-center gap-2"
                  >
                    <Share2 className="w-3.5 h-3.5 text-gray-400" />
                    <span>Share Day Plan</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 2. HERO BANNER: Landmark Photo + Weather Widget + Bottom Route Headline */}
          <div className="relative rounded-3xl overflow-hidden shadow-sm h-52 sm:h-64 w-full flex flex-col justify-between p-4 sm:p-5 text-white">
            {/* Background Landmark Image */}
            <img
              src={activeMeta.image}
              alt={activeDay.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Dark Gradient Vignette for Text Legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/15" />

            {/* Top Right Floating Weather Widget (Exact Match to Mockup) */}
            <div className="relative z-10 flex justify-end">
              <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/40 shadow-xs flex items-center gap-2 text-gray-900">
                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-500 flex-shrink-0">
                  <Sun className="w-4 h-4 fill-amber-400 stroke-amber-500" />
                </div>
                <div className="text-left leading-tight">
                  <div className="text-xs font-black text-gray-900 leading-none">28°C</div>
                  <div className="text-[10px] font-semibold text-gray-500 mt-0.5">Sunny</div>
                </div>
              </div>
            </div>

            {/* Bottom Overlay Route Title & Subtitle */}
            <div className="relative z-10 space-y-1">
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight flex items-center gap-2">
                {activeMeta.routeTitle.includes('→') ? (
                  activeMeta.routeTitle.split('→').map((part, pIdx, arr) => (
                    <React.Fragment key={pIdx}>
                      <span>{part.trim()}</span>
                      {pIdx < arr.length - 1 && <span className="text-white/80 font-normal">→</span>}
                    </React.Fragment>
                  ))
                ) : (
                  <span>{activeMeta.routeTitle}</span>
                )}
              </h3>
              <p className="text-xs text-white/90 font-medium">
                {activeDay.subtitle || 'Travel to destination & local darshan'}
              </p>
            </div>
          </div>

          {/* 3. 4-ITEM METRIC STRIP: 3D Glass Elevation */}
          <div className="glass-card rounded-3xl p-3 sm:p-4 border border-white/80 grid grid-cols-4 divide-x divide-emerald-100/80 text-center shadow-[0_10px_28px_-6px_rgba(15,91,68,0.08)]">
            {/* Activities */}
            <div className="px-1 flex flex-col items-center">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-50 to-teal-50 text-[#0F5B44] border border-emerald-200/50 flex items-center justify-center mb-1 shadow-2xs">
                <Calendar className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="text-xs sm:text-sm font-black text-gray-900 leading-tight">
                {activeDay.tasks?.length || 0}
              </div>
              <div className="text-[10px] text-gray-500 font-medium mt-0.5">Activities</div>
            </div>

            {/* Places */}
            <div className="px-1 flex flex-col items-center">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-50 to-teal-50 text-[#0F5B44] border border-emerald-200/50 flex items-center justify-center mb-1 shadow-2xs">
                <MapPin className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="text-xs sm:text-sm font-black text-gray-900 leading-tight">
                {dayConfirmedPlaces.length > 0 ? dayConfirmedPlaces.length : dayPlaces.length}
              </div>
              <div className="text-[10px] text-gray-500 font-medium mt-0.5">Places</div>
            </div>

            {/* Distance */}
            <div className="px-1 flex flex-col items-center">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-50 to-teal-50 text-[#0F5B44] border border-emerald-200/50 flex items-center justify-center mb-1 shadow-2xs">
                <Milestone className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="text-xs sm:text-sm font-black text-gray-900 leading-tight truncate max-w-full">
                {activeDay.distance || activeMeta.distance || 'Not added yet'}
              </div>
              <div className="text-[10px] text-gray-500 font-medium mt-0.5">Distance</div>
            </div>

            {/* Travel Time */}
            <div className="px-1 flex flex-col items-center">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-50 to-teal-50 text-[#0F5B44] border border-emerald-200/50 flex items-center justify-center mb-1 shadow-2xs">
                <Clock className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="text-xs sm:text-sm font-black text-gray-900 leading-tight truncate max-w-full">
                {activeDay.travelTime || activeMeta.travelTime || 'Not added yet'}
              </div>
              <div className="text-[10px] text-gray-500 font-medium mt-0.5">Travel Time</div>
            </div>
          </div>

          {/* 4. SUB-TABS BAR (Plan, Map, Places, Notes, Expenses, Checklist) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {[
              { id: 'plan' as DetailSubTab, label: 'Plan' },
              { id: 'map' as DetailSubTab, label: 'Transport & Map' },
              { id: 'places' as DetailSubTab, label: `Places (${dayConfirmedPlaces.length > 0 ? dayConfirmedPlaces.length : dayPlaces.length})` },
              { id: 'notes' as DetailSubTab, label: 'Notes' },
              { id: 'expenses' as DetailSubTab, label: `Expenses (${expenses.filter(e => e.date === activeDay.date).length})` },
              { id: 'checklist' as DetailSubTab, label: `Checklist (${currentDayChecklist.length})` },
            ].map(tab => {
              const isActive = detailSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setDetailSubTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap card-press-3d ${
                    isActive
                      ? 'bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white shadow-md shadow-emerald-950/20 ring-1 ring-emerald-300/40'
                      : 'glass-card text-gray-600 hover:text-emerald-900 hover:bg-emerald-50/60'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* SCREEN 2 CONTENT: PLAN TAB (Connected Activity Timeline)               */}
          {/* --------------------------------------------------------------------- */}
          {detailSubTab === 'plan' && (
            <div className="space-y-3 pt-1">
              {/* Authentic Day Overview Card */}
              <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-gray-100 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-gray-900">
                      Day {activeDay.dayNumber} Planning Overview
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                      Planning Status: {activeDay.planningStatus || 'Estimated'}
                    </span>
                  </div>
                  {activeDay.isCircuitExtension && (
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200">
                      Extended Circuit
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="bg-[#f8faf9] p-2 rounded-xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 block font-medium">Route Segment</span>
                    <span className="font-extrabold text-gray-900 block truncate">
                      {activeDay.originCity || activeMeta.originCity} → {activeDay.destinationCity || activeMeta.destinationCity}
                    </span>
                  </div>

                  <div className="bg-[#f8faf9] p-2 rounded-xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 block font-medium">Transport Mode</span>
                    <span className="font-extrabold text-gray-900 block truncate">
                      {activeDay.mode || activeMeta.mode}
                    </span>
                  </div>

                  <div className="bg-[#f8faf9] p-2 rounded-xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 block font-medium">Est. Travel Fare</span>
                    <span className="font-extrabold text-[#0F5B44] block truncate">
                      {activeDay.estimatedTravelCost ? `₹${activeDay.estimatedTravelCost}` : '—'} ({activeDay.travelCostStatus || 'Estimated'})
                    </span>
                  </div>

                  <div className="bg-[#f8faf9] p-2 rounded-xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 block font-medium">Darshan / Sightseeing</span>
                    <span className="font-extrabold text-gray-900 block truncate">
                      {activeDay.darshanStatus || 'Planned'}
                    </span>
                  </div>
                </div>

                {/* Departure & Arrival Timetable (Rule 2.6: verified or unverified status) */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-[#f8faf9] p-2 rounded-xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 block font-medium">Departure Time</span>
                    <span className="font-bold text-gray-800 block truncate">
                      {activeDay.departureTime || 'Pending schedule verification'}
                    </span>
                  </div>

                  <div className="bg-[#f8faf9] p-2 rounded-xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 block font-medium">Arrival Time</span>
                    <span className="font-bold text-gray-800 block truncate">
                      {activeDay.arrivalTime || 'Pending arrival timetable'}
                    </span>
                  </div>
                </div>

                {/* Accommodation Plan, Meals & Source References */}
                <div className="pt-0.5 space-y-1.5 text-[11px]">
                  <div className="flex items-start gap-1.5 text-gray-700">
                    <BedDouble className="w-3.5 h-3.5 text-[#0F5B44] flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-gray-800">Stay Plan: </span>
                      <span className="text-gray-600">{activeDay.accommodationPlan || 'Dharamshala / Low-cost Budget Stay'}</span>
                      <span className="ml-1.5 text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        {activeDay.accommodationStatus || 'Estimated (To be arranged on arrival)'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-1.5 text-gray-700">
                    <Utensils className="w-3.5 h-3.5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-gray-800">Planned Meals: </span>
                      <span className="text-gray-600">Satvik food / Temple Prasadalaya (~₹150–200/day estimated, pay on-site)</span>
                    </div>
                  </div>

                  {activeDay.travelCostSource && (
                    <div className="flex items-start gap-1.5 text-gray-500">
                      <Wallet className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Fare Source:</strong> {activeDay.travelCostSource}</span>
                    </div>
                  )}

                  {activeDay.notesReferences && (
                    <div className="flex items-start gap-1.5 text-gray-500 bg-[#f8faf9] p-2 rounded-xl border border-gray-100/80">
                      <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span><strong>Planning Note:</strong> {activeDay.notesReferences}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-gray-100">
                    <span>Last Updated: {activeDay.updatedAt ? new Date(activeDay.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '24 Oct 2026'}</span>
                    <span className="text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Provisional Draft (Subject to booking verification)
                    </span>
                  </div>
                </div>
              </div>

              {/* Connected Timeline with Individual Activity Cards */}
              <div className="space-y-3">
                {sortedTasks.length === 0 ? (
                  <div className="bg-white rounded-3xl p-8 border border-gray-100 text-center text-xs text-gray-400 shadow-xs">
                    <Calendar className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <p className="font-semibold text-gray-700">Not added yet</p>
                    <p className="text-[11px] mt-0.5 text-gray-400">No activities scheduled for this day yet.</p>
                  </div>
                ) : (
                  sortedTasks.map((task, idx) => {
                    const isLast = idx === sortedTasks.length - 1;
                    const style = getActivityStyle(task.itemType || task.title);
                    const timeDisplay =
                      task.startTime || task.timeEstimate || 'Planned';
                    const locationDisplay =
                      task.location || activeDay.location || 'Pilgrimage Route';
                    const isTemple = (task.itemType || '').toLowerCase().includes('temple') || task.title.toLowerCase().includes('temple');
                    const isSightseeing = (task.itemType || '').toLowerCase().includes('sightseeing') || task.title.toLowerCase().includes('sightseeing');

                    return (
                      <div key={task.id || idx} className="flex items-start gap-3">
                        {/* Left Column: Time & Connected Vertical Line */}
                        <div className="flex flex-col items-center flex-shrink-0 w-16 pt-1">
                          <span className="text-xs font-extrabold text-gray-800 leading-none mb-2 text-center">
                            {timeDisplay}
                          </span>
                          {/* Concentric Bullseye Node */}
                          <div className="w-4 h-4 rounded-full border-2 border-[#0F5B44] bg-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#0F5B44]" />
                          </div>
                          {/* Vertical Connecting Line */}
                          {!isLast && (
                            <div className="w-0.5 h-full min-h-[5.5rem] bg-[#0F5B44] my-1" />
                          )}
                        </div>

                        {/* Right Column: Individual White Activity Card */}
                        <div className="flex-1 bg-white rounded-2xl p-3 sm:p-4 border border-gray-100 shadow-xs hover:border-emerald-200 transition-all flex flex-col justify-between mb-2">
                          <div className="flex items-start gap-3">
                            {/* Pastel Category Icon */}
                            <div className={`w-10 h-10 rounded-2xl ${style.bg} flex items-center justify-center flex-shrink-0 border ${style.border}`}>
                              {style.icon}
                            </div>

                            {/* Title & Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1">
                                <h4
                                  onClick={() => {
                                    setActivityModal({
                                      isOpen: true,
                                      activity: task,
                                      dayId: activeDay.id,
                                      dayNumber: activeDay.dayNumber,
                                      dayDate: activeDay.date,
                                    });
                                  }}
                                  className={`text-sm font-extrabold cursor-pointer leading-tight transition-colors ${
                                    task.isCompleted ? 'text-gray-400 line-through' : 'text-gray-900 hover:text-[#0F5B44]'
                                  }`}
                                >
                                  {task.title}
                                </h4>

                                {/* Activity Menu Button */}
                                <button
                                  onClick={() => {
                                    setActivityModal({
                                      isOpen: true,
                                      activity: task,
                                      dayId: activeDay.id,
                                      dayNumber: activeDay.dayNumber,
                                      dayDate: activeDay.date,
                                    });
                                  }}
                                  className="text-gray-400 hover:text-gray-700 p-1 -mt-1 -mr-1"
                                  aria-label="Activity options"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Subtitle / Notes */}
                              <p className="text-xs text-gray-500 font-medium mt-0.5">
                                {task.notes || task.itemType || 'Planned pilgrimage activity'}
                              </p>

                              {/* Unconfirmed / Needs Verification Warning Pill */}
                              {task.needsVerification && (
                                <div className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-semibold w-fit">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                                  <span>{task.verificationNote || 'Schedule / connection to be verified'}</span>
                                </div>
                              )}

                              {/* Location Pill & Directions / Details buttons */}
                              <div className="flex items-center justify-between gap-2 mt-2 pt-0.5 flex-wrap">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f4f7f5] text-[11px] font-semibold text-gray-700 border border-gray-100">
                                  <MapPin className="w-3 h-3 text-[#0F5B44]" />
                                  <span>{locationDisplay}</span>
                                </div>

                                <div className="flex items-center gap-2 ml-auto flex-wrap">
                                  {(() => {
                                    const matchedPlace = findMatchingPlace(task.title + ' ' + locationDisplay, places);
                                    if (!matchedPlace || !onOpenPlaceDetails) return null;
                                    return (
                                      <button
                                        onClick={() => onOpenPlaceDetails(matchedPlace.id)}
                                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 text-[#0F5B44] text-xs font-bold hover:bg-[#0F5B44] hover:text-white transition-all touch-press shadow-2xs group"
                                        title="Explore sacred details for this destination"
                                      >
                                        <Sparkles className="w-3 h-3 text-amber-500 group-hover:text-amber-300" />
                                        <span>Temple Details</span>
                                        <ChevronRight className="w-3 h-3" />
                                      </button>
                                    );
                                  })()}

                                  {isTemple && (
                                    <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.title + ' ' + locationDisplay)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-[#0F5B44] text-[#0F5B44] text-xs font-bold hover:bg-[#e8f5ef] transition-all touch-press shadow-2xs"
                                    >
                                      <Navigation2 className="w-3 h-3 fill-current rotate-45" />
                                      <span>Directions</span>
                                    </a>
                                  )}
                                </div>
                              </div>

                              {/* Sightseeing Photo Strip (Matching Reference Mockup Item 4) */}
                              {isSightseeing && (
                                <div className="flex items-center gap-2 mt-2.5 pt-1">
                                  <img
                                    src="/images/khammam-fort.jpg"
                                    alt="Khammam Fort"
                                    className="w-10 h-10 rounded-xl object-cover border border-gray-100 shadow-2xs"
                                  />
                                  <img
                                    src="/images/temple-lake.jpg"
                                    alt="Temple Lake"
                                    className="w-10 h-10 rounded-xl object-cover border border-gray-100 shadow-2xs"
                                  />
                                  <img
                                    src="/images/temple-gopuram.jpg"
                                    alt="Temple Gopuram"
                                    className="w-10 h-10 rounded-xl object-cover border border-gray-100 shadow-2xs"
                                  />
                                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-[#0F5B44] text-[11px] font-bold border border-emerald-200">
                                    2 places
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                  );
                })
                )}
              </div>

              {/* Dashed "+ Add Activity" Button (Exact Match to Mockup) */}
              <button
                onClick={() => {
                  setActivityModal({
                    isOpen: true,
                    activity: null,
                    dayId: activeDay.id,
                    dayNumber: activeDay.dayNumber,
                    dayDate: activeDay.date,
                  });
                }}
                className="w-full border-2 border-dashed border-[#a7f3d0] hover:border-[#0F5B44] bg-[#f0fdf4]/60 hover:bg-[#e8f5ef] text-[#0F5B44] py-3 rounded-2xl font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 touch-press mt-2"
              >
                <div className="w-5 h-5 rounded-full bg-[#0F5B44] text-white flex items-center justify-center shadow-xs">
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span>Add Activity</span>
              </button>

              {/* Quick Action Bar (Bottom 4 Pastel Buttons: Add Expense, Add Note, Take Photo, Set Reminder) */}
              <div className="grid grid-cols-4 gap-2 pt-1 pb-1">
                {/* 1. Add Expense */}
                <button
                  onClick={() => onAddExpenseForDate(activeDay.date)}
                  className="bg-[#fef3c7] hover:bg-[#fde68a] text-[#b45309] p-2.5 rounded-2xl flex flex-col items-center justify-center transition-all touch-press border border-amber-200/60 shadow-xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/75 flex items-center justify-center mb-1 text-[#d97706] shadow-2xs">
                    <Wallet className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <span className="text-[11px] font-bold text-gray-800">Add Expense</span>
                </button>

                {/* 2. Add Note */}
                <button
                  onClick={() => {
                    setDetailSubTab('notes');
                    setIsEditingNote(true);
                  }}
                  className="bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#0369a1] p-2.5 rounded-2xl flex flex-col items-center justify-center transition-all touch-press border border-sky-200/60 shadow-xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/75 flex items-center justify-center mb-1 text-[#0284c7] shadow-2xs">
                    <FileText className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <span className="text-[11px] font-bold text-gray-800">Add Note</span>
                </button>

                {/* 3. Take Photo */}
                <button
                  onClick={() => setShowPhotoDialog(true)}
                  className="bg-[#ffe4e6] hover:bg-[#fecdd3] text-[#e11d48] p-2.5 rounded-2xl flex flex-col items-center justify-center transition-all touch-press border border-rose-200/60 shadow-xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/75 flex items-center justify-center mb-1 text-[#e11d48] shadow-2xs">
                    <Camera className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <span className="text-[11px] font-bold text-gray-800">Take Photo</span>
                </button>

                {/* 4. Set Reminder */}
                <button
                  onClick={() => setShowReminderDialog(true)}
                  className="bg-[#ede9fe] hover:bg-[#ddd6fe] text-[#7c3aed] p-2.5 rounded-2xl flex flex-col items-center justify-center transition-all touch-press border border-purple-200/60 shadow-xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/75 flex items-center justify-center mb-1 text-[#7c3aed] shadow-2xs">
                    <Bell className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <span className="text-[11px] font-bold text-gray-800">Set Reminder</span>
                </button>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* SCREEN 3 CONTENT: ROUTE MAP & TRANSPORT TAB                            */}
          {/* --------------------------------------------------------------------- */}
          {detailSubTab === 'map' && (
            <div className="space-y-4 pt-1">
              {/* Interactive Visual Pilgrimage Route Topology Map */}
              <div className="relative rounded-3xl overflow-hidden border border-emerald-900/20 shadow-lg bg-gradient-to-br from-[#0c2e23] via-[#092219] to-[#04120d] text-white p-4 sm:p-5">
                {/* Background Grid Pattern & Radial Glow */}
                <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:18px_18px] opacity-15 pointer-events-none" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Top Live Status Bar */}
                <div className="relative z-10 flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-emerald-800/40">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-black text-emerald-200 uppercase tracking-wider">
                      Live Pilgrimage Route · Day {activeDay.dayNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-300 border border-emerald-400/30">
                      {activeDay.mode || activeMeta.mode}
                    </span>
                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
                      {activeDay.distance || activeMeta.distance}
                    </span>
                  </div>
                </div>

                {/* Route Header Headline with "Route:" label */}
                <div className="relative z-10 mt-3 mb-4">
                  <h4 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>Route: {activeMeta.routeTitle}</span>
                  </h4>
                  <p className="text-xs text-emerald-200/80 font-medium mt-0.5">
                    {activeDay.location ? `Region: ${activeDay.location} · ` : ''}
                    Estimated Transit: {activeDay.travelTime || activeMeta.travelTime}
                  </p>
                </div>

                {/* Pilgrimage Circuit Waypoint Pins Visualization */}
                <div className="relative z-10 bg-black/30 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-emerald-500/20 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-emerald-300/80 font-bold">
                    <span>PILGRIMAGE STOPS ({dayConfirmedPlaces.length > 0 ? dayConfirmedPlaces.length : 1})</span>
                    <span>Tap any stop to open in Google Maps</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Origin Departure Station */}
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((activeDay.originCity || 'Secunderabad') + ' Railway Station')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-2.5 transition-all group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-400/30 font-black text-[10px]">
                        A
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] text-emerald-400/80 uppercase font-black block">Origin / Departure</span>
                        <span className="text-xs font-bold text-white group-hover:text-emerald-300 truncate block">
                          {activeDay.originCity || 'Secunderabad'} Station
                        </span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-400/60 group-hover:text-emerald-300" />
                    </a>

                    {/* Destination Arrival Station / City */}
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((activeDay.destinationCity || 'Shirdi') + (dayConfirmedPlaces.length > 0 ? ' ' + dayConfirmedPlaces[0].name : ' Railway Station'))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-2.5 transition-all group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-400/30 font-black text-[10px]">
                        B
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] text-emerald-400/80 uppercase font-black block">Destination / Stay</span>
                        <span className="text-xs font-bold text-white group-hover:text-emerald-300 truncate block">
                          {activeDay.destinationCity || 'Shirdi'}
                        </span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-400/60 group-hover:text-emerald-300" />
                    </a>
                  </div>

                  {/* Waypoint Chips for all Sacred Places */}
                  {dayConfirmedPlaces.length > 0 && (
                    <div className="pt-1 border-t border-emerald-800/30">
                      <span className="text-[10px] text-emerald-400/90 font-black uppercase tracking-wider block mb-2">
                        Sacred Waypoints on Circuit:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {dayConfirmedPlaces.map((p, idx) => (
                          <a
                            key={p.id}
                            href={p.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + ' ' + p.city)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-600/30 border border-emerald-500/30 text-[11px] font-bold text-emerald-100 hover:text-white transition-all shadow-2xs group"
                          >
                            <span className="w-4 h-4 rounded-full bg-emerald-500/30 text-emerald-300 text-[9px] font-black flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="truncate max-w-[130px] sm:max-w-[180px]">{p.name}</span>
                            <MapPin className="w-3 h-3 text-emerald-400 group-hover:scale-110 transition-transform" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Primary Action Button: Open Complete Route in Google Maps & View on Google Maps */}
                <div className="relative z-10 pt-4">
                  <a
                    href={mapsDirectionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-gradient-to-r from-emerald-500 via-[#14835e] to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm shadow-lg hover:shadow-emerald-500/30 active:scale-98 transition-all flex items-center justify-center gap-2.5 touch-press border border-emerald-400/30"
                  >
                    <Navigation2 className="w-4 h-4 fill-white" />
                    <span>View on Google Maps · Live Route Directions</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>
                  <p className="text-[10px] text-emerald-300/70 text-center font-medium mt-1.5">
                    Launches Google Maps with real turn-by-turn navigation &amp; all circuit waypoints preloaded
                  </p>
                </div>
              </div>

              {/* Waypoint Cards with Dedicated Authentic Photos */}
              {dayConfirmedPlaces.length > 0 && (
                <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
                      <MapPin className="w-4 h-4 text-[#0F5B44]" />
                      <span>Sacred Stops &amp; Real Map Locations ({dayConfirmedPlaces.length})</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                      Dedicated Images
                    </span>
                  </div>

                  <div className="space-y-3 pt-1">
                    {dayConfirmedPlaces.map((p, idx) => (
                      <div
                        key={p.id}
                        className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-white to-[#f8fbf9] border border-gray-100 hover:border-emerald-300 transition-all flex flex-col sm:flex-row items-start sm:items-center gap-3.5 group shadow-2xs"
                      >
                        <div className="relative w-full sm:w-24 h-24 sm:h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0 shadow-xs">
                          <img
                            src={p.imageUrl || '/images/places/shirdi-sai-samadhi-mandir.jpg'}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-[#0F5B44] text-white text-[9px] font-black shadow-xs">
                            Stop {idx + 1}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <h5 className="text-xs sm:text-sm font-black text-gray-900 group-hover:text-[#0F5B44] transition-colors">
                              {p.name}
                            </h5>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold shrink-0">
                              {p.placeType}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 line-clamp-2">
                            {p.significance}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium">
                            <span>Hours: {p.openingHours || '06:00 - 21:00'}</span>
                            <span>·</span>
                            <span>{p.city}</span>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                          <a
                            href={p.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + ' ' + p.city)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0F5B44] text-white hover:bg-[#16654f] transition-all shadow-xs"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>View on Google Maps</span>
                          </a>
                          {onOpenPlaceDetails && (
                            <button
                              onClick={() => onOpenPlaceDetails(p.id)}
                              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-gray-700 border border-gray-200 hover:border-emerald-300 transition-all shadow-xs"
                            >
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              <span>Guide</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Route Summary Card */}
              <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
                  <Calendar className="w-4 h-4 text-[#0F5B44]" />
                  <span>Route: {activeMeta.routeTitle}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-2 border-t border-gray-100">
                  <div>
                    <span className="block text-[10px] text-gray-400 font-medium">Distance</span>
                    <span className="text-xs sm:text-sm font-extrabold text-gray-900 mt-0.5 block">
                      {activeDay.distance || activeMeta.distance}
                    </span>
                  </div>

                  <div className="border-x border-gray-100">
                    <span className="block text-[10px] text-gray-400 font-medium">Travel Time</span>
                    <span className="text-xs sm:text-sm font-extrabold text-gray-900 mt-0.5 block">
                      {activeDay.travelTime || activeMeta.travelTime}
                    </span>
                  </div>

                  <div className="border-r border-gray-100">
                    <span className="block text-[10px] text-gray-400 font-medium">Mode</span>
                    <span className="text-xs sm:text-sm font-extrabold text-gray-900 mt-0.5 block truncate px-1">
                      {activeDay.mode || activeMeta.mode}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] text-gray-400 font-medium">Est. Fare</span>
                    <span className="text-xs sm:text-sm font-extrabold text-[#0F5B44] mt-0.5 block truncate px-1">
                      {activeDay.estimatedTravelCost ? `₹${activeDay.estimatedTravelCost}` : '—'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-100 bg-[#f8faf9] p-2.5 rounded-2xl">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-semibold">Departure Time:</span>
                    <span className="font-bold text-gray-800">{activeDay.departureTime || 'Pending schedule verification'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-semibold">Arrival Time:</span>
                    <span className="font-bold text-gray-800">{activeDay.arrivalTime || 'Pending arrival timetable'}</span>
                  </div>
                  <div className="col-span-2 text-[10px] text-gray-400 italic pt-1 border-t border-gray-200/50">
                    Transport costs are estimated from standard government sleeper rail / state bus slabs. Synced to budget.
                  </div>
                </div>
              </div>

              {/* Transport Plan & Journey Tasks */}
              <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
                    <Train className="w-4 h-4 text-[#0F5B44]" />
                    <span>Transport Plan &amp; Journey Notes</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                    Planned
                  </span>
                </div>

                {dayTravelTasks.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    {dayTravelTasks.map(t => (
                      <div key={t.id} className="p-3 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-gray-900">{t.title}</span>
                          <span className="text-[11px] text-gray-500 font-medium">{t.timeEstimate || 'Planned'}</span>
                        </div>
                        {t.notes && <p className="text-[11px] text-gray-600">{t.notes}</p>}
                        {t.needsVerification && (
                          <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 font-medium mt-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                            <span>{t.verificationNote || 'Schedule to be verified'}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : activeDay.details ? (
                  <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                    {activeDay.details}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded-2xl border border-gray-100">
                    Not added yet
                  </p>
                )}
              </div>

              {/* Planned Overnight Accommodation Card */}
              <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
                    <BedDouble className="w-4 h-4 text-[#0F5B44]" />
                    <span>Planned Overnight Destination &amp; Stay</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                    Unconfirmed
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-gray-700">
                    <span className="font-semibold text-gray-500">Destination:</span>
                    <span className="font-bold text-gray-900">{activeMeta.destinationCity}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-700">
                    <span className="font-semibold text-gray-500">Stay Type:</span>
                    <span className="font-medium text-gray-800 text-right">
                      {activeDay.travelTime?.toLowerCase().includes('overnight') || activeDay.title.toLowerCase().includes('overnight') || (activeDay.accommodationPlan && activeDay.accommodationPlan.toLowerCase().includes('overnight'))
                        ? 'Overnight Train Transit (Sleeper class planned)'
                        : 'Dharamshala / Low-cost Budget Stay'}
                    </span>
                  </div>
                  {activeDay.accommodationPlan && (
                    <div className="flex items-center justify-between text-gray-700">
                      <span className="font-semibold text-gray-500">Plan Details:</span>
                      <span className="font-medium text-gray-800 text-right">{activeDay.accommodationPlan}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-gray-700">
                    <span className="font-semibold text-gray-500">Booking Status:</span>
                    <span className="text-amber-700 font-medium">
                      To be booked / arranged on arrival
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 italic pt-1 border-t border-gray-200/60">
                    No confirmed accommodation bookings created in this step.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* PLACES SUB-TAB: PLACES TO VISIT FOR THIS DAY                           */}
          {/* --------------------------------------------------------------------- */}
          {detailSubTab === 'places' && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-gray-900">
                    Sacred Places &amp; Attractions ({dayPlaces.length > 0 ? dayPlaces.length : dayConfirmedPlaces.length})
                  </h4>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    Day {activeDay.dayNumber} Pilgrimage &amp; Sightseeing Spots
                  </p>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                  Authentic Images Loaded
                </span>
              </div>

              {dayPlaces.length > 0 ? (
                dayPlaces.map((place, pIdx) => {
                  const isTemple =
                    (place.itemType || '').toLowerCase().includes('temple') ||
                    place.title.toLowerCase().includes('temple') ||
                    place.title.toLowerCase().includes('mandir') ||
                    place.title.toLowerCase().includes('jyotirlinga') ||
                    place.title.toLowerCase().includes('darshan');
                  const placeType = isTemple ? 'Sacred Darshan' : 'Pilgrimage Attraction';
                  const placeTime = place.startTime || place.timeEstimate || 'Planned';
                  const placeLocation = place.location || activeDay.location || 'Pilgrimage Route';
                  const matchedPlace = findMatchingPlace(
                    place.title + ' ' + (place.location || '') + ' ' + (activeDay.destinationCity || ''),
                    (places && places.length > 0) ? places : CONFIRMED_PLACES
                  );
                  const verifiedInfo = getVerifiedTempleInfo(place.title + ' ' + (place.location || ''));

                  return (
                    <div
                      key={place.id || pIdx}
                      className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:border-emerald-300 transition-all card-3d"
                    >
                      {/* Dedicated Authentic Image Banner */}
                      <div className="relative h-44 sm:h-52 w-full bg-gray-100 overflow-hidden">
                        <img
                          src={matchedPlace?.imageUrl || '/images/places/shirdi-sai-samadhi-mandir.jpg'}
                          alt={place.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-amber-300 text-[10px] font-black uppercase tracking-wider border border-white/20">
                            {placeType}
                          </span>
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/90 text-white text-[10px] font-bold shadow-xs">
                            Planned
                          </span>
                        </div>

                        {/* Title and City */}
                        <div className="absolute bottom-3 left-3 right-3 text-white">
                          <h5 className="text-base sm:text-lg font-black leading-snug drop-shadow-sm">
                            {place.title}
                          </h5>
                          <div className="flex items-center gap-2 text-xs text-emerald-200 font-medium mt-0.5">
                            <Clock className="w-3.5 h-3.5 text-emerald-300" />
                            <span>{placeTime}</span>
                            <span>·</span>
                            <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                            <span className="truncate">{placeLocation}</span>
                          </div>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="p-4 sm:p-5 space-y-3">
                        {place.notes && (
                          <p className="text-xs text-gray-600 leading-relaxed font-medium">
                            {place.notes}
                          </p>
                        )}

                        {place.needsVerification && (
                          <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                            <span>{place.verificationNote || 'Schedule to be verified'}</span>
                          </div>
                        )}

                        {/* Verified Temple Information & Timings */}
                        {verifiedInfo && (
                          <div className="p-3 rounded-2xl bg-[#f0f8f4] border border-emerald-200/80 text-[11px] space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#0F5B44]">Verified Temple Darshan &amp; Timings</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800">
                                Verified Official
                              </span>
                            </div>
                            <div className="text-gray-700">
                              <span className="font-semibold text-gray-900">Darshan Hours: </span>
                              <span>{verifiedInfo.darshanTimings}</span>
                            </div>
                            {verifiedInfo.aartiTimings && (
                              <div className="text-gray-700">
                                <span className="font-semibold text-gray-900">Aarti Timings: </span>
                                <span>{verifiedInfo.aartiTimings}</span>
                              </div>
                            )}
                            <div className="text-gray-700">
                              <span className="font-semibold text-gray-900">Est. Queue / Waiting Time: </span>
                              <span className="text-amber-900 font-medium">{verifiedInfo.estimatedWaitTime}</span>
                            </div>
                            {verifiedInfo.closureNote && (
                              <div className="text-amber-900 bg-amber-50 p-1.5 rounded-lg border border-amber-200 font-bold">
                                {verifiedInfo.closureNote}
                              </div>
                            )}
                            <div className="text-gray-600 text-[10px]">
                              <span className="font-semibold text-gray-800">Dress Code &amp; Protocol: </span>
                              <span>{verifiedInfo.dressCodeRules}</span>
                            </div>
                            {verifiedInfo.bookingRequirement && (
                              <div className="text-gray-600 text-[10px]">
                                <span className="font-semibold text-gray-800">Booking / Pass: </span>
                                <span>{verifiedInfo.bookingRequirement}</span>
                              </div>
                            )}
                            <div className="text-[9px] text-gray-400 italic pt-0.5 border-t border-emerald-200/40">
                              Source: {verifiedInfo.sourceReference}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons: Open in Google Maps & Explore Guide */}
                        <div className="flex items-center gap-2 pt-1">
                          <a
                            href={matchedPlace?.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.title + ' ' + placeLocation)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-[#0F5B44] hover:bg-[#16654f] text-white py-2.5 px-3.5 rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-1.5 touch-press"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Open in Google Maps</span>
                          </a>
                          {matchedPlace && onOpenPlaceDetails && (
                            <button
                              onClick={() => onOpenPlaceDetails(matchedPlace.id)}
                              className="flex-1 bg-white hover:bg-emerald-50 text-gray-800 hover:text-[#0F5B44] py-2.5 px-3.5 rounded-xl text-xs font-bold border border-gray-200 hover:border-emerald-300 transition-all flex items-center justify-center gap-1.5 touch-press shadow-2xs"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              <span>Temple Guide</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  })
                ) : (
                  <div className="bg-white rounded-3xl p-8 border border-gray-100 text-center text-xs text-gray-500 shadow-xs space-y-2">
                    <MapPin className="w-8 h-8 mx-auto text-gray-300" />
                    <p className="font-bold text-gray-700">Not added yet</p>
                    <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                      Transit day: Dedicated intercity travel journey. View the Transport &amp; Map tab for full transit schedule.
                    </p>
                  </div>
                )}
              </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* EXPENSES SUB-TAB: EXPENSES RECORDED FOR THIS DAY                       */}
          {/* --------------------------------------------------------------------- */}
          {detailSubTab === 'expenses' && (
            <div className="space-y-3 pt-1">
              <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-gray-500 font-medium">
                    Total Spent on Day {activeDay.dayNumber}
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">
                    ₹{expenses.filter(e => e.date === activeDay.date).reduce((sum, e) => sum + e.amount, 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <button
                  onClick={() => onAddExpenseForDate(activeDay.date)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F5B44] text-white text-xs font-bold shadow-xs hover:bg-[#16654f] transition-all touch-press"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Expense</span>
                </button>
              </div>

              {expenses.filter(e => e.date === activeDay.date).length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-gray-100 text-center text-xs text-gray-500 shadow-xs">
                  <Wallet className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                  <p className="font-bold text-gray-700">No expenses recorded for this day</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Record travel tickets, prasad, stay, or food costs.</p>
                  <button
                    onClick={() => onAddExpenseForDate(activeDay.date)}
                    className="mt-3 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#0F5B44] text-white shadow-xs"
                  >
                    Record First Expense
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-3 sm:p-4 border border-gray-100 shadow-xs divide-y divide-gray-100">
                  {expenses
                    .filter(e => e.date === activeDay.date)
                    .map(exp => (
                      <div key={exp.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <h5 className="text-xs font-bold text-gray-900">{exp.title}</h5>
                          <span className="text-[10px] text-gray-500">{exp.category} · {exp.paymentMethod}</span>
                        </div>
                        <span className="text-xs font-extrabold text-gray-900">
                          ₹{exp.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* SCREEN 4 CONTENT: DAY CHECKLIST TAB                                   */}
          {/* --------------------------------------------------------------------- */}
          {detailSubTab === 'checklist' && (
            <div className="space-y-4 pt-1">
              {/* Header Title */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-gray-900">
                    Day {activeDay ? activeDay.dayNumber : (selectedDayIndex + 1)} Checklist
                  </h4>
                  <p className="text-xs text-gray-500 font-medium">
                    Mark items as you complete
                  </p>
                </div>

                <button
                  onClick={() => setShowAddChecklistInput(!showAddChecklistInput)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#0F5B44] hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
              </div>

              {/* Add Custom Item Input Bar */}
              {showAddChecklistInput && (
                <form onSubmit={handleAddDayChecklistItem} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newChecklistText}
                    onChange={e => setNewChecklistText(e.target.value)}
                    placeholder="e.g. Carry darshan pass & ID proof"
                    className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 focus:border-[#0F5B44] outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#0F5B44] text-white"
                  >
                    Save
                  </button>
                </form>
              )}

              {/* Checklist Items List (Exact Match to Reference Screen 4) */}
              <div className="bg-white rounded-3xl p-3 sm:p-4 border border-gray-100 shadow-xs divide-y divide-gray-100">
                {currentDayChecklist.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleDayChecklistItem(item.id)}
                    className="py-3 flex items-center gap-3 cursor-pointer group hover:bg-gray-50/50 rounded-xl px-2 transition-colors"
                  >
                    {/* Checkbox box */}
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                        item.isDone
                          ? 'bg-[#0F5B44] text-white shadow-xs'
                          : 'border border-gray-300 group-hover:border-emerald-500'
                      }`}
                    >
                      {item.isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    {/* Icon */}
                    <div className="w-7 h-7 rounded-lg bg-[#e8f5ef] flex items-center justify-center flex-shrink-0">
                      {renderChecklistIcon(item.icon)}
                    </div>

                    {/* Title */}
                    <span
                      className={`text-xs sm:text-sm font-semibold flex-1 ${
                        item.isDone ? 'text-gray-400 line-through' : 'text-gray-800'
                      }`}
                    >
                      {item.title}
                    </span>
                  </div>
                ))}
              </div>

              {/* Bottom Action Button: + Add Checklist Item */}
              <button
                onClick={() => setShowAddChecklistInput(true)}
                className="w-full bg-white border border-gray-200 hover:border-gray-300 text-gray-800 py-3 rounded-2xl font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 touch-press"
              >
                <Plus className="w-4 h-4 text-[#0F5B44]" />
                <span>Add Checklist Item</span>
              </button>
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* DAY NOTES TAB                                                         */}
          {/* --------------------------------------------------------------------- */}
          {detailSubTab === 'notes' && (
            <div className="space-y-4 pt-1">
              <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm sm:text-base font-extrabold text-gray-900">
                    Day {activeDay ? activeDay.dayNumber : (selectedDayIndex + 1)} Notes & Tips
                  </h4>
                  <button
                    onClick={() => {
                      setEditingNoteText(dayNotes[activeDay.id] || activeDay.details || '');
                      setIsEditingNote(!isEditingNote);
                    }}
                    className="text-xs font-bold text-[#0F5B44] flex items-center gap-1 hover:underline"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{isEditingNote ? 'Cancel' : 'Edit Note'}</span>
                  </button>
                </div>

                {isEditingNote ? (
                  <div className="space-y-2">
                    <textarea
                      rows={5}
                      value={editingNoteText}
                      onChange={e => setEditingNoteText(e.target.value)}
                      placeholder="Write temple darshan timings, dress code notes, auto rickshaw fares, or personal memories..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 text-xs sm:text-sm text-gray-900 focus:bg-white focus:border-[#0F5B44] outline-none"
                    />
                    <button
                      onClick={async () => {
                        try {
                          await saveDayNoteToDb(activeDay, editingNoteText);
                        } catch (err) {
                          console.error('Failed to persist note to IndexedDB:', err);
                        }
                        const updated = { ...dayNotes, [activeDay.id]: editingNoteText };
                        saveNotesToStorage(updated);
                        setIsEditingNote(false);
                        showDayToast('Note saved successfully');
                        if (onEditDay) {
                          onEditDay({ ...activeDay, details: editingNoteText, updatedAt: new Date().toISOString() });
                        }
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0F5B44] text-white hover:bg-[#16654f] transition-all"
                    >
                      Save Note
                    </button>
                  </div>
                ) : (
                  <div className="text-xs sm:text-sm text-gray-700 leading-relaxed bg-[#f8faf9] p-3.5 rounded-2xl border border-gray-100">
                    {dayNotes[activeDay.id] || activeDay.details || (
                      <span className="text-gray-400 italic">
                        No custom notes added for this day yet. Tap Edit Note to add darshan tips or diary reflections.
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Interactive Modal: Take Photo */}
          {showPhotoDialog && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                      <Camera className="w-4 h-4" />
                    </div>
                    <h3 className="font-extrabold text-gray-900 text-sm">Capture Memory</h3>
                  </div>
                  <button onClick={() => setShowPhotoDialog(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center space-y-2 bg-gray-50/50">
                  <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-500 mx-auto flex items-center justify-center">
                    <Camera className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-gray-700">Add a pilgrimage photo for Day {activeDay.dayNumber}</p>
                  <p className="text-[11px] text-gray-400">Capture temple darshan, prasad, or train view</p>
                  <label className="inline-block mt-2 px-4 py-2 rounded-xl bg-[#0F5B44] text-white text-xs font-bold cursor-pointer hover:bg-[#16654f]">
                    <span>Choose Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            const dataUrl = reader.result as string;
                            const updated = [dataUrl, ...capturedPhotos].slice(0, 10);
                            setCapturedPhotos(updated);
                            localStorage.setItem('yatra_day_photos', JSON.stringify(updated));
                            setShowPhotoDialog(false);
                            showDayToast('Photo added to Day ' + activeDay.dayNumber);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>

                <button
                  onClick={() => setShowPhotoDialog(false)}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Interactive Modal: Set Reminder */}
          {showReminderDialog && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <Bell className="w-4 h-4" />
                    </div>
                    <h3 className="font-extrabold text-gray-900 text-sm">Set Day Reminder</h3>
                  </div>
                  <button onClick={() => setShowReminderDialog(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 block">Choose Activity Time</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['06:00 AM Departure', '12:00 PM Arrival', '01:00 PM Darshan', '04:00 PM Sightseeing'].map(t => (
                      <button
                        key={t}
                        onClick={() => setReminderSelectedTime(t)}
                        className={`p-2 rounded-xl text-xs font-semibold text-left border transition-all ${
                          reminderSelectedTime === t
                            ? 'bg-[#ede9fe] text-[#7c3aed] border-purple-300 font-bold'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowReminderDialog(false);
                    showDayToast(`Reminder scheduled for ${reminderSelectedTime}!`);
                  }}
                  className="w-full py-3 rounded-2xl bg-[#0F5B44] text-white text-xs font-bold shadow-md hover:bg-[#16654f]"
                >
                  Confirm Reminder
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Safe Error / Empty State when Day is Not Found */}
      {currentView === 'details' && (!activeDay || !activeMeta) && (
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xs text-center space-y-4 my-6 animate-in fade-in">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-2xl">
            ⚠️
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-gray-900">Day Not Found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              The requested pilgrimage day could not be found or has not been loaded yet.
            </p>
          </div>
          <button
            onClick={() => {
              setCurrentView('list');
              if (onBackToList) onBackToList();
              onSelectDayIndex(0);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F5B44] text-white text-xs font-bold shadow-xs hover:bg-[#16654f] transition-all touch-press"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.2]" />
            <span>Return to Itinerary</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ADD / EDIT ACTIVITY MODAL (SCREEN 5)                                   */}
      {/* ========================================================================= */}
      {activityModal.isOpen && (
        <ActivityModalDialog
          activity={activityModal.activity}
          dayNumber={activityModal.dayNumber}
          dayDate={activityModal.dayDate}
          dayId={activityModal.dayId}
          onClose={() => setActivityModal({ isOpen: false, activity: null, dayId: '', dayNumber: 1, dayDate: '' })}
          onSave={async (data) => {
            if (onSaveActivity) {
              await onSaveActivity(data);
            }
            setActivityModal({ isOpen: false, activity: null, dayId: '', dayNumber: 1, dayDate: '' });
          }}
          onDelete={async (id) => {
            if (onDeleteActivity) {
              await onDeleteActivity(id);
            }
            setActivityModal({ isOpen: false, activity: null, dayId: '', dayNumber: 1, dayDate: '' });
          }}
        />
      )}
    </div>
  );
};

// =============================================================================
// SCREEN 5: ADD / EDIT ACTIVITY MODAL COMPONENT (Exact Match to Reference)
// =============================================================================
interface ActivityModalDialogProps {
  activity: ItineraryItem | null;
  dayNumber: number;
  dayDate: string;
  dayId: string;
  onClose: () => void;
  onSave: (data: Partial<ItineraryItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const ActivityModalDialog: React.FC<ActivityModalDialogProps> = ({
  activity,
  dayNumber,
  dayDate,
  dayId,
  onClose,
  onSave,
  onDelete,
}) => {
  const isEditing = Boolean(activity?.id);
  const [title, setTitle] = useState(activity?.title || '');
  const [category, setCategory] = useState(activity?.itemType || 'Temple Visit');
  const [startTime, setStartTime] = useState(activity?.startTime || activity?.timeEstimate || '01:00 PM');
  const [endTime, setEndTime] = useState(activity?.endTime || '02:30 PM');
  const [location, setLocation] = useState(activity?.location || 'Khammam');
  const [notes, setNotes] = useState(activity?.notes || '');
  const [isCompleted, setIsCompleted] = useState(Boolean(activity?.isCompleted));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSave({
        id: activity?.id,
        dayId,
        title: title.trim(),
        itemType: category as any,
        startTime,
        endTime,
        timeEstimate: `${startTime}${endTime ? ' – ' + endTime : ''}`,
        location: location.trim(),
        notes: notes.trim(),
        isCompleted,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedDate = (() => {
    if (!dayDate) return '';
    const dateObj = new Date(dayDate + (dayDate.includes('T') ? '' : 'T12:00:00'));
    return isNaN(dateObj.getTime())
      ? ''
      : dateObj.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
  })();

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 flex flex-col safe-bottom touch-scroll">
        {/* Mobile drag handle */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header with Back Arrow and Title (Matching Screen 5) */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-700 transition-colors"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
            </button>
            <div>
              <h3 className="text-base font-extrabold text-gray-900 leading-none">
                {isEditing ? 'Edit Activity' : 'Add Activity'}
              </h3>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                Day {dayNumber} · {formattedDate}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {/* Activity Title * */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">
              Activity Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Visit Sri Seetharama Temple"
              className="w-full bg-[#f8faf9] border border-gray-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 focus:bg-white focus:border-[#0F5B44] outline-none transition-all shadow-xs"
              required
              autoFocus
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">
              Category
            </label>
            <div className="relative">
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full appearance-none bg-[#f8faf9] border border-gray-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 focus:bg-white focus:border-[#0F5B44] outline-none transition-all shadow-xs pr-8"
              >
                <option value="Temple Visit">🏛 Temple Visit</option>
                <option value="Travel">🚂 Travel / Transit</option>
                <option value="Stay">🏨 Hotel / Stay Check-in</option>
                <option value="Meal">🍽 Meal / Food</option>
                <option value="Sightseeing">📸 Local Sightseeing</option>
                <option value="Task">📝 Task / Preparation</option>
                <option value="Rest">🧘 Rest / Personal</option>
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                ▾
              </div>
            </div>
          </div>

          {/* Start Time & End Time side-by-side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">
                Start Time
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  placeholder="01:00 PM"
                  className="w-full bg-[#f8faf9] border border-gray-200 rounded-2xl pl-9 pr-3 py-2.5 text-xs sm:text-sm text-gray-900 focus:bg-white focus:border-[#0F5B44] outline-none shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">
                End Time
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  placeholder="02:30 PM"
                  className="w-full bg-[#f8faf9] border border-gray-200 rounded-2xl pl-9 pr-3 py-2.5 text-xs sm:text-sm text-gray-900 focus:bg-white focus:border-[#0F5B44] outline-none shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Location / Place */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">
              Location / Place
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Khammam"
                className="w-full bg-[#f8faf9] border border-gray-200 rounded-2xl pl-10 pr-3 py-2.5 text-xs sm:text-sm text-gray-900 focus:bg-white focus:border-[#0F5B44] outline-none shadow-xs"
              />
            </div>
          </div>

          {/* Description / Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">
              Description / Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add notes, darshan details, ticket info, dress code etc."
              className="w-full bg-[#f8faf9] border border-gray-200 rounded-2xl p-3 text-xs sm:text-sm text-gray-900 focus:bg-white focus:border-[#0F5B44] outline-none shadow-xs"
            />
          </div>

          {/* Mark as Completed Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
            <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#0F5B44]" />
              <span>Mark as Completed</span>
            </span>

            <button
              type="button"
              onClick={() => setIsCompleted(!isCompleted)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                isCompleted ? 'bg-[#0F5B44]' : 'bg-gray-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  isCompleted ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#0F5B44] hover:bg-[#16654f] text-white py-3 rounded-2xl font-bold text-xs sm:text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 touch-press"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save Activity'}</span>
            </button>

            {isEditing && activity?.id && (
              <button
                type="button"
                onClick={() => onDelete(activity.id)}
                className="w-full py-2.5 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-2xl transition-all"
              >
                Delete Activity
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
