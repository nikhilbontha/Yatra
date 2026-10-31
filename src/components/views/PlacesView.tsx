'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Place, PlaceType, PlaceVisitStatus, Trip, ItineraryDay } from '@/types/trip';
import {
  Compass,
  MapPin,
  Search,
  Filter,
  Heart,
  MoreVertical,
  Plus,
  ArrowLeft,
  Clock,
  Shirt,
  Camera,
  Smartphone,
  Calendar,
  CheckCircle2,
  Circle,
  Share2,
  Trash2,
  ChevronRight,
  ExternalLink,
  Star,
  Eye,
  Layers,
  Sparkles,
  Sliders,
  ChevronDown,
  Navigation as NavIcon,
  UploadCloud,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { AlertModal } from '@/components/modals/AlertModal';

export type PlacesScreen =
  | 'overview'
  | 'list'
  | 'details'
  | 'darshan'
  | 'photos'
  | 'nearby'
  | 'add'
  | 'edit'
  | 'map'
  | 'visited'
  | 'notes_exp'
  | 'settings';

export interface PlacesViewProps {
  trip?: Trip;
  days?: ItineraryDay[];
  places: Place[];
  onAddPlace?: (place: Partial<Place>) => Promise<void> | void;
  onEditPlace?: (place: Place) => Promise<void> | void;
  onSavePlace?: (place: any) => Promise<void> | void;
  onDeletePlace?: (id: string) => Promise<void> | void;
  onToggleVisited?: (id: string, isVisited: boolean) => void;
  onSaveExperienceNote?: (placeId: string, note: string, rating: number, visitedDate: string) => void;
  onSelectDayIndex?: (dayIndex: number) => void;
  initialScreen?: PlacesScreen;
  initialSelectedPlaceId?: string;
}

export function getPlaceStatusBadge(status?: string, needsVerification?: boolean) {
  if (status === 'Visited') {
    return {
      label: 'Visited',
      badgeClass: 'bg-emerald-100 text-[#0F5B44] border border-emerald-300 font-bold',
    };
  }
  if (status === 'Optional') {
    return {
      label: 'Optional',
      badgeClass: 'bg-purple-50 text-purple-800 border border-purple-200 font-bold',
    };
  }
  if (status === 'Needs verification' || needsVerification) {
    return {
      label: 'Needs verification',
      badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200 font-bold',
    };
  }
  return {
    label: 'Planned',
    badgeClass: 'bg-sky-50 text-sky-800 border border-sky-200 font-bold',
  };
}

export const PlacesView: React.FC<PlacesViewProps> = ({
  trip,
  days = [],
  places,
  onAddPlace,
  onEditPlace,
  onSavePlace,
  onDeletePlace,
  onToggleVisited,
  onSaveExperienceNote,
  onSelectDayIndex,
  initialScreen = 'overview',
  initialSelectedPlaceId,
}) => {
  const handleAdd = onAddPlace || onSavePlace;
  const handleEdit = onEditPlace || onSavePlace;
  const [currentScreen, setCurrentScreen] = useState<PlacesScreen>(initialScreen);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>(
    initialSelectedPlaceId || places[0]?.id || ''
  );

  // Synchronize when parent updates target place or screen (e.g. from HomeView candidate sites)
  useEffect(() => {
    if (initialSelectedPlaceId) {
      setSelectedPlaceId(initialSelectedPlaceId);
    }
  }, [initialSelectedPlaceId]);

  useEffect(() => {
    if (initialScreen) {
      setCurrentScreen(initialScreen);
    }
  }, [initialScreen]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [darshanSubTab, setDarshanSubTab] = useState<'info' | 'timings' | 'aarti' | 'sevas'>('info');
  const [photoFilter, setPhotoFilter] = useState('All');
  const [nearbySubTab, setNearbySubTab] = useState<'nearby' | 'food_stay'>('nearby');
  const [visitedTab, setVisitedTab] = useState<'visited' | 'pending' | 'skipped'>('visited');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({
    [places[0]?.id || 'place-1']: true,
  });

  // Settings state
  const [showDistanceOnList, setShowDistanceOnList] = useState(true);
  const [showMapViewToggle, setShowMapViewToggle] = useState(true);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(true);

  // Active selected place
  const selectedPlace = useMemo(() => {
    const found = places.find(p => p.id === selectedPlaceId);
    if (found) return found;
    return places[0] || null;
  }, [places, selectedPlaceId]);

  const initialTargetPlace = useMemo(() => {
    if (initialSelectedPlaceId) {
      const match = places.find(p => p.id === initialSelectedPlaceId);
      if (match) return match;
    }
    return places[0] || null;
  }, [places, initialSelectedPlaceId]);

  // Form states for Add/Edit
  const [formPlaceType, setFormPlaceType] = useState<string>(
    initialScreen === 'edit' && initialTargetPlace ? initialTargetPlace.placeType : 'Jyotirlinga'
  );
  const [formName, setFormName] = useState(
    initialScreen === 'edit' && initialTargetPlace ? initialTargetPlace.name : ''
  );
  const [formCity, setFormCity] = useState(
    initialScreen === 'edit' && initialTargetPlace ? initialTargetPlace.city : ''
  );
  const [formDescription, setFormDescription] = useState(
    initialScreen === 'edit' && initialTargetPlace
      ? initialTargetPlace.significance || initialTargetPlace.notes || ''
      : ''
  );
  const [formDayId, setFormDayId] = useState(
    initialScreen === 'edit' && initialTargetPlace ? initialTargetPlace.dayId || '' : ''
  );
  const [formVisitStatus, setFormVisitStatus] = useState<PlaceVisitStatus>(
    initialScreen === 'edit' && initialTargetPlace
      ? initialTargetPlace.visitStatus || 'Planned'
      : 'Planned'
  );
  const [formNeedsVerification, setFormNeedsVerification] = useState<boolean>(
    initialScreen === 'edit' && initialTargetPlace ? Boolean(initialTargetPlace.needsVerification) : false
  );
  const [formOpeningHours, setFormOpeningHours] = useState(
    initialScreen === 'edit' && initialTargetPlace ? initialTargetPlace.openingHours || '' : ''
  );
  const [formDressCode, setFormDressCode] = useState(
    initialScreen === 'edit' && initialTargetPlace ? initialTargetPlace.dressCode || '' : ''
  );
  const [formEntryFee, setFormEntryFee] = useState(
    initialScreen === 'edit' && initialTargetPlace ? initialTargetPlace.entryFee || '' : ''
  );
  const [formNotes, setFormNotes] = useState(
    initialScreen === 'edit' && initialTargetPlace ? initialTargetPlace.notes || '' : ''
  );
  const [formImageUrl, setFormImageUrl] = useState('/images/places/shirdi-sai-samadhi-mandir.jpg');

  // Experience Note state
  const [expNotes, setExpNotes] = useState(
    'Very peaceful darshan. Crowd was moderate in the morning. Had a good experience. Prasadam was nice.'
  );
  const [expDate, setExpDate] = useState('2026-11-22');
  const [expRating, setExpRating] = useState(4);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [placeToDelete, setPlaceToDelete] = useState<Place | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Derived filter list
  const filteredPlaces = useMemo(() => {
    return places.filter(p => {
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.city.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat =
        selectedCategoryFilter === 'All' ||
        (selectedCategoryFilter === 'Jyotirlinga' && (p.placeType === 'Jyotirlinga' || p.category === 'Jyotirlinga')) ||
        (selectedCategoryFilter === 'Temple' && (p.placeType === 'Temple' || p.category === 'Temple')) ||
        (selectedCategoryFilter === 'Ghat' && p.placeType === 'Ghat') ||
        (selectedCategoryFilter === 'Cave' && p.placeType === 'Cave') ||
        (selectedCategoryFilter === 'Heritage' && (p.placeType === 'Heritage' || p.placeType === 'Cave')) ||
        (selectedCategoryFilter === 'Sightseeing' &&
          (p.placeType === 'Sightseeing' || p.placeType === 'Heritage' || p.placeType === 'Cave' || p.placeType === 'Ghat')) ||
        (selectedCategoryFilter === 'Optional' && p.visitStatus === 'Optional') ||
        (selectedCategoryFilter === 'Needs verification' && (p.visitStatus === 'Needs verification' || p.needsVerification)) ||
        (selectedCategoryFilter === 'City' && p.city.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSearch && matchCat;
    });
  }, [places, searchQuery, selectedCategoryFilter]);

  const sortedPlaces = useMemo(() => {
    return [...filteredPlaces].sort((a, b) => (a.dayNumber || 99) - (b.dayNumber || 99));
  }, [filteredPlaces]);

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
    showToast(favorites[id] ? 'Removed from favorites' : 'Added to favorites');
  };

  const handleOpenEdit = (p: Place) => {
    setSelectedPlaceId(p.id);
    setFormName(p.name);
    setFormCity(p.city);
    setFormPlaceType(p.placeType);
    setFormDayId(p.dayId || '');
    setFormVisitStatus(p.visitStatus || 'Planned');
    setFormNeedsVerification(Boolean(p.needsVerification));
    setFormOpeningHours(p.openingHours || '');
    setFormDressCode(p.dressCode || '');
    setFormEntryFee(p.entryFee || '');
    setFormDescription(p.significance || '');
    setFormNotes(p.notes || '');
    setFormImageUrl(p.imageUrl || '/images/places/shirdi-sai-samadhi-mandir.jpg');
    setCurrentScreen('edit');
  };

  const handleOpenAdd = () => {
    setFormName('');
    setFormCity('');
    setFormPlaceType('Jyotirlinga');
    setFormDayId(days[0]?.id || '');
    setFormVisitStatus('Planned');
    setFormNeedsVerification(false);
    setFormOpeningHours('');
    setFormDressCode('');
    setFormEntryFee('Free');
    setFormDescription('');
    setFormNotes('');
    setFormImageUrl('/images/places/shirdi-sai-samadhi-mandir.jpg');
    setCurrentScreen('add');
  };

  // Screen Selector Pills
  const screensList: { id: PlacesScreen; label: string; icon: string }[] = [
    { id: 'overview', label: '1. Overview', icon: '🏛️' },
    { id: 'list', label: '2. All Places', icon: '📋' },
    { id: 'details', label: '3. Details', icon: '🛕' },
    { id: 'darshan', label: '4. Darshan & Timings', icon: '⏰' },
    { id: 'photos', label: '5. Photos & Videos', icon: '📷' },
    { id: 'nearby', label: '6. Nearby Places', icon: '📍' },
    { id: 'add', label: '7. Add Place', icon: '➕' },
    { id: 'edit', label: '8. Edit Place', icon: '✏️' },
    { id: 'map', label: '9. Map View', icon: '🗺️' },
    { id: 'visited', label: '10. Visited Tracker', icon: '✅' },
    { id: 'notes_exp', label: '11. Notes & Experience', icon: '📝' },
    { id: 'settings', label: '12. Settings', icon: '⚙️' },
  ];

  return (
    <div className="space-y-4">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#0F5B44] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xl animate-fade-in flex items-center gap-2">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 12-Screen Switcher Header Bar */}
      <div className="bg-gradient-to-r from-emerald-950/[0.04] via-white/90 to-teal-950/[0.04] backdrop-blur-md rounded-2xl p-2 border border-emerald-900/10 shadow-[0_4px_16px_rgba(9,27,21,0.04)] flex items-center gap-1.5 overflow-x-auto no-scrollbar card-3d">
        {screensList.map(s => {
          const isActive = currentScreen === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setCurrentScreen(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all card-press-3d ${
                isActive
                  ? 'bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white shadow-md shadow-emerald-950/20 scale-[1.02] border border-emerald-400/30'
                  : 'bg-white/80 text-gray-700 hover:bg-white hover:text-gray-900 border border-gray-200/50 shadow-2xs'
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* SCREEN 1: PLACES & TEMPLES OVERVIEW */}
      {currentScreen === 'overview' && (
        <div className="space-y-5">
          {/* Header */}
          <div className="glass-card card-3d card-depth-3d rounded-3xl p-5 sm:p-6 border border-white/90 shadow-[0_16px_36px_-8px_rgba(9,27,21,0.08),0_1px_3px_rgba(0,0,0,0.03)] bg-gradient-to-b from-white via-[#fafdfb] to-[#f2f7f4] relative overflow-hidden">
            {/* Ambient gold-emerald glow */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br from-amber-400/15 via-emerald-400/10 to-transparent rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100/80 text-[#0F5B44] text-[10px] font-black uppercase tracking-wider mb-1 border border-emerald-200/60">
                  <Sparkles className="w-3 h-3 text-[#0F5B44]" />
                  <span>Sacred Pilgrimage Destinations</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <span>Places & Temples</span>
                  <span className="text-base sm:text-lg text-amber-500">🛕</span>
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">Explore all destinations and temples</p>
              </div>
              <button
                onClick={() => setCurrentScreen('list')}
                className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#0F5B44] to-teal-700 text-white flex items-center justify-center hover:shadow-lg hover:shadow-emerald-950/20 transition-all card-press-3d shadow-md"
                title="View All"
              >
                <Compass className="w-5 h-5" />
              </button>
            </div>

            {/* 4 Interactive Filter Stat Cards (User Item 12) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 relative z-10">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategoryFilter('Jyotirlinga');
                  setCurrentScreen('list');
                }}
                className="bg-gradient-to-b from-amber-500/12 to-amber-500/5 hover:from-amber-500/20 hover:to-amber-500/10 rounded-2xl p-3 sm:p-3.5 border border-amber-200/90 hover:border-amber-400 text-center shadow-xs card-3d card-press-3d hover:-translate-y-0.5 transition-all cursor-pointer group"
                title="Click to view all Jyotirlingas"
              >
                <span className="text-2xl drop-shadow-xs group-hover:scale-110 transition-transform inline-block">🕉️</span>
                <p className="text-xl font-black text-gray-900 mt-1">
                  {places.filter(p => p.placeType === 'Jyotirlinga').length}
                </p>
                <p className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">7 Jyotirlingas</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedCategoryFilter('Temple');
                  setCurrentScreen('list');
                }}
                className="bg-gradient-to-b from-emerald-500/12 to-emerald-500/5 hover:from-emerald-500/20 hover:to-emerald-500/10 rounded-2xl p-3 sm:p-3.5 border border-emerald-200/90 hover:border-emerald-400 text-center shadow-xs card-3d card-press-3d hover:-translate-y-0.5 transition-all cursor-pointer group"
                title="Click to view other temples"
              >
                <span className="text-2xl drop-shadow-xs group-hover:scale-110 transition-transform inline-block">🛕</span>
                <p className="text-xl font-black text-gray-900 mt-1">
                  {places.filter(p => p.placeType === 'Temple').length}
                </p>
                <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">Other Temples</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedCategoryFilter('Sightseeing');
                  setCurrentScreen('list');
                }}
                className="bg-gradient-to-b from-sky-500/12 to-sky-500/5 hover:from-sky-500/20 hover:to-sky-500/10 rounded-2xl p-3 sm:p-3.5 border border-sky-200/90 hover:border-sky-400 text-center shadow-xs card-3d card-press-3d hover:-translate-y-0.5 transition-all cursor-pointer group"
                title="Click to view sightseeing destinations"
              >
                <span className="text-2xl drop-shadow-xs group-hover:scale-110 transition-transform inline-block">📷</span>
                <p className="text-xl font-black text-gray-900 mt-1">
                  {places.filter(p => p.placeType === 'Sightseeing' || p.placeType === 'Heritage' || p.placeType === 'Cave' || p.placeType === 'Ghat').length}
                </p>
                <p className="text-[10px] text-sky-800 font-bold uppercase tracking-wider">Sightseeing</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedCategoryFilter('All');
                  setCurrentScreen('list');
                }}
                className="bg-gradient-to-b from-rose-500/12 to-rose-500/5 hover:from-rose-500/20 hover:to-rose-500/10 rounded-2xl p-3 sm:p-3.5 border border-rose-200/90 hover:border-rose-400 text-center shadow-xs card-3d card-press-3d hover:-translate-y-0.5 transition-all cursor-pointer group"
                title="Click to view all destinations"
              >
                <span className="text-2xl drop-shadow-xs group-hover:scale-110 transition-transform inline-block">📍</span>
                <p className="text-xl font-black text-gray-900 mt-1">{places.length}</p>
                <p className="text-[10px] text-rose-800 font-bold uppercase tracking-wider">Total Places</p>
              </button>
            </div>
          </div>

          {/* Upcoming Place Banner */}
          <div className="glass-card card-3d card-depth-3d rounded-3xl p-5 sm:p-6 border border-white/90 shadow-[0_16px_36px_-8px_rgba(9,27,21,0.08),0_1px_3px_rgba(0,0,0,0.03)] bg-gradient-to-br from-white via-[#fafdfb] to-[#f4f8f5] relative overflow-hidden">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" />
                <h2 className="text-sm font-black text-gray-900 tracking-tight uppercase">Upcoming Place</h2>
              </div>
              <button
                onClick={() => setCurrentScreen('list')}
                className="text-xs text-[#0F5B44] font-bold hover:underline flex items-center gap-0.5 card-press-3d"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {places.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-500 space-y-2">
                <div className="w-10 h-10 mx-auto rounded-2xl bg-[#e8f5ef] text-[#0F5B44] flex items-center justify-center font-bold text-lg">
                  📍
                </div>
                <h4 className="font-bold text-gray-800 text-sm">No places added yet</h4>
                <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                  Add sacred temples, Jyotirlingas, or heritage spots to plan your pilgrimage visits.
                </p>
                <button
                  onClick={handleOpenAdd}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F5B44] text-white text-xs font-bold hover:bg-[#16654f] transition-all card-press-3d shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Place</span>
                </button>
              </div>
            ) : (
              (() => {
                const upcoming = places.find(p => !p.isVisited && p.visitStatus !== 'Optional') || places[0];
                const matchedDay = days.find(d => d.id === upcoming.dayId || d.dayNumber === upcoming.dayNumber);
                const badge = getPlaceStatusBadge(upcoming.visitStatus, upcoming.needsVerification);
                return (
                  <div
                    onClick={() => {
                      if (upcoming) setSelectedPlaceId(upcoming.id);
                      setCurrentScreen('details');
                    }}
                    className="group cursor-pointer flex flex-col sm:flex-row gap-4 p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-white to-emerald-500/10 border border-amber-200/80 hover:border-emerald-400/80 shadow-xs hover:shadow-md transition-all card-3d card-press-3d"
                  >
                    <div className="relative w-full sm:w-40 h-32 rounded-xl overflow-hidden bg-gray-100 shrink-0 shadow-inner">
                      <img
                        src={upcoming.imageUrl || '/images/places/shirdi-sai-samadhi-mandir.jpg'}
                        alt={upcoming.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className="absolute top-2 left-2 px-2.5 py-0.5 bg-gradient-to-r from-amber-600 to-amber-700 text-white text-[10px] font-black rounded-lg shadow-md border border-amber-300/40">
                        Next Stop ✨
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-base font-black text-gray-900 group-hover:text-[#0F5B44] transition-colors truncate">
                            {upcoming.name}
                          </h3>
                          <span className="text-[11px] font-black text-[#0F5B44] bg-emerald-100/90 border border-emerald-300/60 px-2.5 py-0.5 rounded-full shrink-0 shadow-2xs">
                            {upcoming.placeType}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 font-medium mt-1 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          <span>{upcoming.city}</span>
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2 border-t border-gray-100/80">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${badge.badgeClass}`}>
                          {badge.label}
                        </span>
                        {matchedDay && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-[#0F5B44] text-[10px] font-black border border-emerald-300/60 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#0F5B44]" />
                            <span>Day {matchedDay.dayNumber}: {matchedDay.location || matchedDay.title}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>

          {/* Quick Actions Grid */}
          <div className="glass-card card-3d card-depth-3d rounded-3xl p-5 sm:p-6 border border-white/90 shadow-[0_16px_36px_-8px_rgba(9,27,21,0.08),0_1px_3px_rgba(0,0,0,0.03)] bg-gradient-to-b from-white via-[#fafdfb] to-[#f2f7f4]">
            <h2 className="text-sm font-black text-gray-900 tracking-tight uppercase mb-3.5">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => {
                  setSelectedCategoryFilter('All');
                  setCurrentScreen('list');
                }}
                className="p-4 rounded-2xl bg-white/90 hover:bg-emerald-500/10 hover:border-emerald-300 border border-gray-200/70 flex flex-col items-center justify-center gap-2 transition-all text-center card-3d card-press-3d shadow-xs hover:-translate-y-0.5"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100/80 text-[#0F5B44] flex items-center justify-center shadow-xs">
                  <Compass className="w-5 h-5 text-[#0F5B44]" />
                </div>
                <span className="text-xs font-black text-gray-800">All Places</span>
              </button>
              <button
                onClick={() => {
                  setSelectedCategoryFilter('Jyotirlinga');
                  setCurrentScreen('list');
                }}
                className="p-4 rounded-2xl bg-white/90 hover:bg-amber-500/10 hover:border-amber-300 border border-gray-200/70 flex flex-col items-center justify-center gap-2 transition-all text-center card-3d card-press-3d shadow-xs hover:-translate-y-0.5"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100/80 text-amber-800 flex items-center justify-center shadow-xs text-xl">
                  🕉️
                </div>
                <span className="text-xs font-black text-gray-800">Jyotirlingas</span>
              </button>
              <button
                onClick={() => setCurrentScreen('nearby')}
                className="p-4 rounded-2xl bg-white/90 hover:bg-sky-500/10 hover:border-sky-300 border border-gray-200/70 flex flex-col items-center justify-center gap-2 transition-all text-center card-3d card-press-3d shadow-xs hover:-translate-y-0.5"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-100/80 text-sky-700 flex items-center justify-center shadow-xs">
                  <NavIcon className="w-5 h-5 text-sky-700" />
                </div>
                <span className="text-xs font-black text-gray-800">Nearby</span>
              </button>
              <button
                onClick={() => setCurrentScreen('map')}
                className="p-4 rounded-2xl bg-white/90 hover:bg-emerald-500/10 hover:border-emerald-300 border border-gray-200/70 flex flex-col items-center justify-center gap-2 transition-all text-center card-3d card-press-3d shadow-xs hover:-translate-y-0.5"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-100/80 text-[#0F5B44] flex items-center justify-center shadow-xs">
                  <MapPin className="w-5 h-5 text-[#0F5B44]" />
                </div>
                <span className="text-xs font-black text-gray-800">Map View</span>
              </button>
            </div>
          </div>

          {/* Popular Categories */}
          <div className="glass-card card-3d card-depth-3d rounded-3xl p-5 sm:p-6 border border-white/90 shadow-[0_16px_36px_-8px_rgba(9,27,21,0.08),0_1px_3px_rgba(0,0,0,0.03)] bg-gradient-to-b from-white via-[#fafdfb] to-[#f2f7f4]">
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-sm font-black text-gray-900 tracking-tight uppercase">Popular Categories</h2>
              <button
                onClick={() => setCurrentScreen('list')}
                className="text-xs text-[#0F5B44] font-bold hover:underline flex items-center gap-0.5 card-press-3d"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div
                onClick={() => {
                  setSelectedCategoryFilter('Jyotirlinga');
                  setCurrentScreen('list');
                }}
                className="cursor-pointer group relative h-32 rounded-2xl overflow-hidden border border-white/80 shadow-md hover:shadow-xl transition-all duration-300 card-3d card-press-3d hover:-translate-y-1"
              >
                <img
                  src="/images/places/somnath-jyotirlinga.jpg"
                  alt="Jyotirlingas"
                  className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-3.5">
                  <span className="text-amber-300 text-[10px] font-black uppercase tracking-wider">Sacred Circuit</span>
                  <span className="text-white font-black text-sm">7 Jyotirlingas</span>
                </div>
              </div>
              <div
                onClick={() => {
                  setSelectedCategoryFilter('Temple');
                  setCurrentScreen('list');
                }}
                className="cursor-pointer group relative h-32 rounded-2xl overflow-hidden border border-white/80 shadow-md hover:shadow-xl transition-all duration-300 card-3d card-press-3d hover:-translate-y-1"
              >
                <img
                  src="/images/places/shirdi-sai-samadhi-mandir.jpg"
                  alt="Shirdi & Temples"
                  className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-3.5">
                  <span className="text-emerald-300 text-[10px] font-black uppercase tracking-wider">Devotional Stays</span>
                  <span className="text-white font-black text-sm">Shirdi &amp; Temples</span>
                </div>
              </div>
              <div
                onClick={() => {
                  setSelectedCategoryFilter('Sightseeing');
                  setCurrentScreen('list');
                }}
                className="cursor-pointer group relative h-32 rounded-2xl overflow-hidden border border-white/80 shadow-md hover:shadow-xl transition-all duration-300 card-3d card-press-3d hover:-translate-y-1"
              >
                <img
                  src="/images/places/ellora-kailasa-cave16.jpg"
                  alt="Ghats & Caves"
                  className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-3.5">
                  <span className="text-sky-300 text-[10px] font-black uppercase tracking-wider">Heritage Trails</span>
                  <span className="text-white font-black text-sm">Ghats &amp; Heritage</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 2: ALL PLACES LIST */}
      {currentScreen === 'list' && (
        <div className="glass-card card-3d card-depth-3d rounded-3xl p-5 sm:p-6 border border-white/90 shadow-[0_16px_36px_-8px_rgba(9,27,21,0.08),0_1px_3px_rgba(0,0,0,0.03)] bg-gradient-to-b from-white via-[#fafdfb] to-[#f4f8f5] space-y-4 relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setCurrentScreen('overview')}
                className="w-9 h-9 rounded-full bg-white/90 border border-gray-200/70 shadow-2xs flex items-center justify-center text-gray-700 hover:bg-emerald-50 hover:text-[#0F5B44] transition-all card-press-3d"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-lg font-black text-gray-900 tracking-tight">All Places</h2>
                <p className="text-[11px] text-gray-500 font-medium">Destinations across the 19-day pilgrimage</p>
              </div>
            </div>
            <button
              onClick={handleOpenAdd}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#0F5B44] to-teal-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all card-press-3d"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {/* Search bar with 3D depth */}
          <div className="relative">
            <Search className="w-4 h-4 text-emerald-800/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search places, temples or cities..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/90 border border-gray-200/80 text-xs font-medium focus:outline-hidden focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)] transition-all"
            />
          </div>

          {/* Category filter pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {['All', 'Jyotirlinga', 'Temple', 'Ghat', 'Sightseeing', 'Optional', 'Needs verification'].map(cat => {
              const isSelected = selectedCategoryFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all card-press-3d ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white shadow-md shadow-emerald-950/20 scale-[1.02] border border-emerald-400/30'
                      : 'bg-white/80 text-gray-700 hover:bg-white hover:text-gray-900 border border-gray-200/60 shadow-2xs'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Places List */}
          <div className="space-y-3 pt-2">
            {sortedPlaces.length === 0 ? (
              <div className="bg-white/90 p-8 rounded-3xl text-center border border-gray-200/60 shadow-xs space-y-3 card-3d">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 text-[#0F5B44] flex items-center justify-center shadow-inner">
                  <Compass className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900">No Places Found</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                    {searchQuery
                      ? `No places matching "${searchQuery}". Try another search term.`
                      : 'No pilgrimage destinations found for this filter.'}
                  </p>
                </div>
                <button
                  onClick={handleOpenAdd}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0F5B44] to-teal-700 text-white text-xs font-black hover:shadow-md transition-all inline-flex items-center gap-1.5 card-press-3d shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Place / Temple</span>
                </button>
              </div>
            ) : (
              sortedPlaces.map(p => {
                const isFav = Boolean(favorites[p.id]);
                const matchedDay = days.find(d => d.id === p.dayId || d.dayNumber === p.dayNumber);
                const badge = getPlaceStatusBadge(p.visitStatus, p.needsVerification);
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedPlaceId(p.id);
                      setCurrentScreen('details');
                    }}
                    className="group cursor-pointer p-3 sm:p-3.5 rounded-2xl border border-white/90 bg-white/90 hover:bg-gradient-to-r hover:from-white hover:to-emerald-50/50 hover:border-emerald-300/80 flex gap-3.5 transition-all items-center card-3d card-press-3d shadow-xs hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-xl overflow-hidden bg-gray-100 shrink-0 relative shadow-sm border border-black/5">
                      <img
                        src={p.imageUrl || '/images/places/shirdi-sai-samadhi-mandir.jpg'}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-sm font-black text-gray-900 truncate group-hover:text-[#0F5B44] transition-colors">
                          {p.name}
                        </h4>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={e => toggleFavorite(p.id, e)}
                            className="p-1 text-gray-400 hover:text-rose-500 transition-colors card-press-3d"
                          >
                            <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleOpenEdit(p);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-700 transition-colors card-press-3d"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-500 font-medium truncate mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                        <span>{p.city}</span>
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200/60 shadow-2xs">
                          {p.placeType || 'Temple'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] ${badge.badgeClass}`}>
                          {badge.label}
                        </span>
                        {matchedDay ? (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              if (onSelectDayIndex) onSelectDayIndex(matchedDay.dayNumber - 1);
                            }}
                            className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-[#0F5B44] border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1 shadow-2xs card-press-3d"
                            title={`Jump to Day ${matchedDay.dayNumber} in Itinerary`}
                          >
                            <Calendar className="w-3 h-3 text-[#0F5B44]" />
                            <span>Day {matchedDay.dayNumber}: {matchedDay.location || matchedDay.title}</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-gray-500 font-medium">
                            {p.date || 'Planned Stop'}
                          </span>
                        )}
                        {p.needsVerification && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Needs verification
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SCREEN 3: PLACE DETAILS (TEMPLE) */}
      {currentScreen === 'details' && (
        !selectedPlace ? (
          <div className="glass-card card-3d card-depth-3d bg-white p-8 rounded-3xl text-center border border-white/90 shadow-md space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#e8f5ef] text-[#0F5B44] flex items-center justify-center font-bold text-xl shadow-inner">
              🛕
            </div>
            <div>
              <h4 className="text-sm font-black text-gray-900">No Place Selected</h4>
              <p className="text-xs text-gray-500 mt-1">Please select a place or temple from the list.</p>
            </div>
            <button
              onClick={() => setCurrentScreen('list')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0F5B44] to-teal-700 text-white text-xs font-black shadow-xs card-press-3d"
            >
              Back to List
            </button>
          </div>
        ) : (
        <div className="glass-card card-3d card-depth-3d rounded-3xl p-5 sm:p-6 border border-white/90 shadow-[0_16px_36px_-8px_rgba(9,27,21,0.08),0_1px_3px_rgba(0,0,0,0.03)] bg-gradient-to-b from-white via-[#fafdfb] to-[#f4f8f5] space-y-5 relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('list')}
              className="w-9 h-9 rounded-full bg-white/90 border border-gray-200/70 shadow-2xs flex items-center justify-center text-gray-700 hover:bg-emerald-50 hover:text-[#0F5B44] transition-all card-press-3d"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-black text-gray-900 truncate max-w-[200px] sm:max-w-xs">{selectedPlace.name}</h2>
              <p className="text-[11px] text-gray-500 font-medium">{selectedPlace.city}</p>
            </div>
            <button
              onClick={() => toggleFavorite(selectedPlace.id)}
              className="p-2 rounded-full bg-white/90 border border-gray-200/70 text-gray-400 hover:text-rose-500 shadow-2xs transition-all card-press-3d"
            >
              <Heart
                className={`w-4 h-4 ${favorites[selectedPlace.id] ? 'fill-rose-500 text-rose-500' : ''}`}
              />
            </button>
          </div>

          {/* Hero Banner with 3D elevation */}
          <div className="relative h-52 sm:h-64 rounded-3xl overflow-hidden bg-gray-100 shadow-md card-3d">
            <img
              src={selectedPlace.imageUrl || '/images/places/shirdi-sai-samadhi-mandir.jpg'}
              alt={selectedPlace.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <div>
                <p className="text-white/80 text-[10px] font-bold uppercase tracking-wider">{selectedPlace.city}</p>
                <h3 className="text-white font-black text-lg sm:text-xl drop-shadow-md leading-tight">{selectedPlace.name}</h3>
              </div>
              <div>
                {(() => {
                  const badge = getPlaceStatusBadge(selectedPlace.visitStatus, selectedPlace.needsVerification);
                  return (
                    <span className={`text-[11px] font-black px-3 py-1 rounded-full ${badge.badgeClass} shadow-md backdrop-blur-md`}>
                      {badge.label}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Place Tag Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-xs font-black border border-amber-200/60 shadow-2xs">
              {selectedPlace.placeType}
            </span>
            {selectedPlace.placeType === 'Jyotirlinga' && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-black border border-emerald-200/60 shadow-2xs">
                Jyotirlinga Shrine
              </span>
            )}
            {selectedPlace.name.includes('Sai Baba') && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-black border border-emerald-200/60 shadow-2xs">
                Primary Samadhi Mandir
              </span>
            )}
            <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 text-xs font-black border border-sky-200/60 shadow-2xs">
              Pilgrimage Stop
            </span>
          </div>

          {/* Linked Itinerary Day Banner */}
          {(() => {
            const matchedDay = days.find(d => d.id === selectedPlace.dayId || d.dayNumber === selectedPlace.dayNumber);
            if (!matchedDay) return null;
            return (
              <div className="bg-gradient-to-r from-emerald-500/12 via-emerald-500/6 to-teal-500/10 border border-emerald-200/80 rounded-2xl p-3.5 flex items-center justify-between card-3d shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#0F5B44] flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-[#0F5B44]" />
                  </div>
                  <span className="text-xs font-black text-gray-900 truncate">
                    Day {matchedDay.dayNumber}: {matchedDay.title} ({matchedDay.date})
                  </span>
                </div>
                {onSelectDayIndex && (
                  <button
                    type="button"
                    onClick={() => onSelectDayIndex(matchedDay.dayNumber - 1)}
                    className="text-xs font-black text-[#0F5B44] hover:underline flex-shrink-0 ml-2 card-press-3d"
                  >
                    View Day →
                  </button>
                )}
              </div>
            );
          })()}

          {/* Access & Verification Notice */}
          {(selectedPlace.needsVerification ||
            selectedPlace.name.includes('Trimbakeshwar') ||
            selectedPlace.name.includes('Bhimashankar') ||
            selectedPlace.visitStatus === 'Optional') && (
            <div className="bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-yellow-500/10 border border-amber-300/80 rounded-2xl p-4 space-y-1.5 shadow-xs card-3d">
              <div className="flex items-center gap-2 text-xs font-black text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Pilgrim Notice &amp; Access Information</span>
              </div>
              <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                {selectedPlace.name.includes('Trimbakeshwar') || selectedPlace.name.includes('Bhimashankar')
                  ? 'Access Notice: Temple access, inner sanctum entry, and abhishek are subject to local administrative crowd management and ghat road conditions. Access is not guaranteed. Please verify current rules upon arrival.'
                  : selectedPlace.visitStatus === 'Optional'
                  ? 'Optional Visit: Conditional on available transit connection time. Not mandatory to complete the sacred circuit.'
                  : 'Verification Required: Temple opening hours and sanctum queue rules are subject to daily temple administration.'}
              </p>
            </div>
          )}

          {/* Sub Navigation Tabs with 3D Pills */}
          <div className="flex border-b border-gray-200/70 pb-1 gap-2 text-xs font-black overflow-x-auto no-scrollbar">
            <button
              onClick={() => setCurrentScreen('details')}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0F5B44] to-teal-700 text-white shadow-xs card-press-3d"
            >
              Overview
            </button>
            <button
              onClick={() => {
                setDarshanSubTab('info');
                setCurrentScreen('darshan');
              }}
              className="px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white text-gray-700 border border-gray-200/60 card-press-3d shadow-2xs"
            >
              Darshan
            </button>
            <button
              onClick={() => {
                setDarshanSubTab('timings');
                setCurrentScreen('darshan');
              }}
              className="px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white text-gray-700 border border-gray-200/60 card-press-3d shadow-2xs"
            >
              Timings
            </button>
            <button
              onClick={() => setCurrentScreen('photos')}
              className="px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white text-gray-700 border border-gray-200/60 card-press-3d shadow-2xs"
            >
              Photos
            </button>
          </div>

          {/* Overview text */}
          <div className="space-y-3">
            <p className="text-xs text-gray-700 leading-relaxed font-medium">
              {selectedPlace.significance ||
                `${selectedPlace.name} is one of the sacred pilgrimage centers on this yatra circuit.`}
            </p>
            {selectedPlace.notes && (
              <div className="p-3.5 bg-white/90 rounded-2xl border border-gray-200/70 text-xs text-gray-700 card-3d shadow-2xs">
                <span className="font-black text-[#0F5B44]">Visit Notes: </span>
                <span>{selectedPlace.notes}</span>
              </div>
            )}
          </div>

          {/* 4 Info Badges */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-white/90 border border-gray-200/70 card-3d shadow-2xs">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Location</span>
              <p className="text-xs font-black text-gray-900 mt-0.5 truncate">{selectedPlace.city}</p>
              <button
                onClick={() => setCurrentScreen('map')}
                className="text-[10px] text-[#0F5B44] font-black hover:underline mt-1 block card-press-3d"
              >
                View on Map
              </button>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/90 border border-gray-200/70 card-3d shadow-2xs">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Visit Status</span>
              <p className="text-xs font-black text-gray-900 mt-0.5">{selectedPlace.visitStatus || 'Planned'}</p>
              <span className="text-[10px] text-gray-500 font-medium mt-1 block">
                {selectedPlace.isVisited ? 'Completed' : 'Upcoming'}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/90 border border-gray-200/70 card-3d shadow-2xs">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Dress Code</span>
              <p className="text-xs font-black text-gray-900 mt-0.5 truncate">
                {selectedPlace.dressCode || 'Modest Indian attire'}
              </p>
              <span className="text-[10px] text-gray-500 font-medium mt-1 block">Traditional preferred</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/90 border border-gray-200/70 card-3d shadow-2xs">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Entry Fee</span>
              <p className="text-xs font-black text-gray-900 mt-0.5">{selectedPlace.entryFee || 'Free (General line)'}</p>
              <span className="text-[10px] text-gray-500 font-medium mt-1 block">No unverified fees</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-3">
            <button
              onClick={() => handleOpenEdit(selectedPlace)}
              className="flex-1 py-3 rounded-2xl border border-gray-300/80 bg-white/90 text-xs font-black text-gray-800 hover:bg-gray-50 shadow-xs card-press-3d text-center"
            >
              Edit Place
            </button>
            <button
              onClick={() => {
                const nextVisited = !selectedPlace.isVisited;
                if (onToggleVisited) onToggleVisited(selectedPlace.id, nextVisited);
                if (handleEdit) {
                  handleEdit({
                    ...selectedPlace,
                    isVisited: nextVisited,
                    visitStatus: nextVisited ? 'Visited' : 'Planned',
                  });
                }
                showToast(nextVisited ? `Marked ${selectedPlace.name} as Visited!` : `Marked ${selectedPlace.name} as Planned`);
              }}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-950/20 hover:shadow-lg transition-all card-press-3d text-center"
            >
              {selectedPlace.isVisited ? '✓ Visited (Undo)' : '✓ Mark as Visited'}
            </button>
          </div>
        </div>
        )
      )}

      {/* SCREEN 4: DARSHAN & TIMINGS */}
      {currentScreen === 'darshan' && selectedPlace && (
        <div className="glass-card card-3d card-depth-3d rounded-3xl p-5 sm:p-6 border border-white/90 shadow-[0_16px_36px_-8px_rgba(9,27,21,0.08),0_1px_3px_rgba(0,0,0,0.03)] bg-gradient-to-b from-white via-[#fafdfb] to-[#f4f8f5] space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('details')}
              className="w-9 h-9 rounded-full bg-white/90 border border-gray-200/70 shadow-2xs flex items-center justify-center text-gray-700 hover:bg-emerald-50 hover:text-[#0F5B44] transition-all card-press-3d"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-black text-gray-900 tracking-tight">{selectedPlace.name}</h2>
              <p className="text-[11px] text-gray-500 font-medium">Darshan &amp; Timings</p>
            </div>
            <div className="w-9" />
          </div>

          {/* Sub tabs with 3D tactile pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'info', label: 'Darshan Info' },
              { id: 'timings', label: 'Timings' },
              { id: 'aarti', label: 'Aarti' },
              { id: 'sevas', label: 'Sevas' },
            ].map(tab => {
              const active = darshanSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setDarshanSubTab(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all card-press-3d ${
                    active
                      ? 'bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white shadow-md shadow-emerald-950/20 scale-[1.02] border border-emerald-400/30'
                      : 'bg-white/80 text-gray-700 hover:bg-white hover:text-gray-900 border border-gray-200/60 shadow-2xs'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="space-y-3 pt-2">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-yellow-500/10 border border-amber-300/80 text-xs text-amber-900 space-y-1.5 card-3d shadow-xs">
              <p className="font-black flex items-center gap-2 text-amber-900">
                <Clock className="w-4 h-4 text-amber-700" />
                <span>Trust Verification Guidance</span>
              </p>
              <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                Temple opening hours, Kakad/Sandhya aarti timings, and special sevas are strictly administered by the local temple devasthan. Do not rely on third-party estimates; confirm directly at temple counter upon arrival.
              </p>
            </div>

            <div className="space-y-2 pt-1 text-xs">
              <div className="p-3.5 rounded-2xl bg-white/90 border border-gray-200/70 shadow-2xs flex items-center justify-between card-3d">
                <span className="text-gray-500 font-bold">Opening Hours</span>
                <span className="font-black text-gray-900">{selectedPlace.openingHours || 'Inquire at counter'}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/90 border border-gray-200/70 shadow-2xs flex items-center justify-between card-3d">
                <span className="text-gray-500 font-bold">Darshan Mode</span>
                <span className="font-black text-gray-900">{selectedPlace.darshanType || 'General queue'}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/90 border border-gray-200/70 shadow-2xs flex items-center justify-between card-3d">
                <span className="text-gray-500 font-bold">Dress Code</span>
                <span className="font-black text-gray-900">{selectedPlace.dressCode || 'Modest traditional attire'}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/90 border border-gray-200/70 shadow-2xs flex items-center justify-between card-3d">
                <span className="text-gray-500 font-bold">Entry Fee</span>
                <span className="font-black text-gray-900">{selectedPlace.entryFee || 'Free (General line)'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 5: PHOTOS & VIDEOS */}
      {currentScreen === 'photos' && selectedPlace && (
        <div className="glass-card card-3d card-depth-3d rounded-3xl p-5 sm:p-6 border border-white/90 shadow-[0_16px_36px_-8px_rgba(9,27,21,0.08),0_1px_3px_rgba(0,0,0,0.03)] bg-gradient-to-b from-white via-[#fafdfb] to-[#f4f8f5] space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('details')}
              className="w-9 h-9 rounded-full bg-white/90 border border-gray-200/70 shadow-2xs flex items-center justify-center text-gray-700 hover:bg-emerald-50 hover:text-[#0F5B44] transition-all card-press-3d"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-black text-gray-900 tracking-tight">{selectedPlace.name}</h2>
              <p className="text-[11px] text-gray-500 font-medium">Photos &amp; Media</p>
            </div>
            <div className="w-9" />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-2xl overflow-hidden aspect-video bg-gray-100 border border-white/90 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 card-3d card-press-3d">
              <img src={selectedPlace.imageUrl || '/images/places/shirdi-sai-samadhi-mandir.jpg'} alt="Primary Photo" className="w-full h-full object-cover" />
            </div>
            {places.filter(p => p.id !== selectedPlace.id && (p.city === selectedPlace.city || p.dayNumber === selectedPlace.dayNumber)).slice(0, 3).map((subP, sIdx) => (
              <div key={subP.id} className="rounded-2xl overflow-hidden aspect-video bg-gray-100 border border-white/90 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 card-3d card-press-3d">
                <img src={subP.imageUrl || '/images/places/ellora-kailasa-cave16.jpg'} alt={`Photo ${sIdx + 2}`} className="w-full h-full object-cover" />
              </div>
            ))}
            {places.filter(p => p.id !== selectedPlace.id && (p.city === selectedPlace.city || p.dayNumber === selectedPlace.dayNumber)).length < 3 && (
              <div className="rounded-2xl overflow-hidden aspect-video bg-gray-100 border border-white/90 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 card-3d card-press-3d">
                <img src="/images/places/somnath-jyotirlinga.jpg" alt="Sacred Jyotirlinga" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* SCREEN 6: NEARBY PLACES */}
      {currentScreen === 'nearby' && selectedPlace && (
        <div className="glass-card card-3d card-depth-3d rounded-3xl p-5 sm:p-6 border border-white/90 shadow-[0_16px_36px_-8px_rgba(9,27,21,0.08),0_1px_3px_rgba(0,0,0,0.03)] bg-gradient-to-b from-white via-[#fafdfb] to-[#f4f8f5] space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('overview')}
              className="w-9 h-9 rounded-full bg-white/90 border border-gray-200/70 shadow-2xs flex items-center justify-center text-gray-700 hover:bg-emerald-50 hover:text-[#0F5B44] transition-all card-press-3d"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-black text-gray-900 tracking-tight">Nearby Places</h2>
              <p className="text-[11px] text-gray-500 font-medium">Places around {selectedPlace.city}</p>
            </div>
            <div className="w-9" />
          </div>

          <div className="space-y-3 pt-1">
            {places
              .filter(p => p.id !== selectedPlace.id && (p.city === selectedPlace.city || p.dayNumber === selectedPlace.dayNumber))
              .slice(0, 4)
              .map(p => (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedPlaceId(p.id);
                    setCurrentScreen('details');
                  }}
                  className="p-3.5 rounded-2xl border border-white/90 bg-white/90 hover:bg-gradient-to-r hover:from-white hover:to-emerald-50/50 hover:border-emerald-300 flex items-center justify-between cursor-pointer card-3d card-press-3d shadow-xs hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3">
                    <img src={p.imageUrl || '/images/places/shirdi-sai-samadhi-mandir.jpg'} alt={p.name} className="w-12 h-12 rounded-xl object-cover shrink-0 shadow-2xs" />
                    <div>
                      <h4 className="text-xs font-black text-gray-900">{p.name}</h4>
                      <p className="text-[10px] text-gray-500 font-medium">{p.city} · {p.placeType}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-800" />
                </div>
              ))}
          </div>
        </div>
      )}

      {/* SCREEN 7: ADD PLACE */}
      {currentScreen === 'add' && (
        <div className="glass-card card-3d card-depth-3d rounded-3xl p-5 sm:p-6 border border-white/90 shadow-[0_16px_36px_-8px_rgba(9,27,21,0.08),0_1px_3px_rgba(0,0,0,0.03)] bg-gradient-to-b from-white via-[#fafdfb] to-[#f4f8f5] space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('overview')}
              className="w-9 h-9 rounded-full bg-white/90 border border-gray-200/70 shadow-2xs flex items-center justify-center text-gray-700 hover:bg-emerald-50 hover:text-[#0F5B44] transition-all card-press-3d"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-black text-gray-900 tracking-tight">Add Place</h2>
              <p className="text-[11px] text-gray-500 font-medium">Add a new place or temple</p>
            </div>
            <div className="w-9" />
          </div>

          <div className="space-y-3.5 pt-1">
            <div>
              <label className="text-[11px] font-black text-gray-700 block mb-1.5 uppercase tracking-wider">Place Type *</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {['Jyotirlinga', 'Temple', 'Cave', 'Ghat', 'Heritage', 'Viewpoint', 'Transit'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormPlaceType(type)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all card-press-3d ${
                      formPlaceType === type
                        ? 'bg-gradient-to-r from-[#0F5B44] to-teal-700 text-white shadow-xs'
                        : 'bg-white/90 text-gray-700 border border-gray-200/70'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-black text-gray-700 block mb-1 uppercase tracking-wider">Place Name *</label>
              <input
                type="text"
                required
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="e.g. Mahakaleshwar Temple"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/90 border border-gray-200/80 text-xs font-medium focus:outline-hidden focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-black text-gray-700 block mb-1 uppercase tracking-wider">Location / City *</label>
                <input
                  type="text"
                  required
                  value={formCity}
                  onChange={e => setFormCity(e.target.value)}
                  placeholder="e.g. Ujjain"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/90 border border-gray-200/80 text-xs font-medium focus:outline-hidden focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)]"
                />
              </div>

              <div>
                <label className="text-[11px] font-black text-gray-700 block mb-1 uppercase tracking-wider">Related Itinerary Day</label>
                <select
                  value={formDayId}
                  onChange={e => setFormDayId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/90 border border-gray-200/80 text-xs font-medium focus:outline-hidden focus:border-emerald-600 focus:bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)]"
                >
                  <option value="">No Day Linked</option>
                  {days.map(d => (
                    <option key={d.id} value={d.id}>
                      Day {d.dayNumber}: {d.location || d.title} ({d.date})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-black text-gray-700 block mb-1 uppercase tracking-wider">Visit Status</label>
                <select
                  value={formVisitStatus}
                  onChange={e => setFormVisitStatus(e.target.value as PlaceVisitStatus)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/90 border border-gray-200/80 text-xs font-medium focus:outline-hidden focus:border-emerald-600 focus:bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)]"
                >
                  <option value="Planned">Planned</option>
                  <option value="Optional">Optional</option>
                  <option value="Needs verification">Needs verification</option>
                  <option value="Visited">Visited</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-black text-gray-700 block mb-1 uppercase tracking-wider">Entry Fee (Optional)</label>
                <input
                  type="text"
                  value={formEntryFee}
                  onChange={e => setFormEntryFee(e.target.value)}
                  placeholder="e.g. Free or ₹40"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/90 border border-gray-200/80 text-xs font-medium focus:outline-hidden focus:border-emerald-600 focus:bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="add-needs-verif"
                checked={formNeedsVerification}
                onChange={e => setFormNeedsVerification(e.target.checked)}
                className="w-4 h-4 accent-[#0F5B44] rounded"
              />
              <label htmlFor="add-needs-verif" className="text-xs font-bold text-gray-700">
                Mark as "Needs verification" (timings or access conditional)
              </label>
            </div>

            <div>
              <label className="text-[11px] font-black text-gray-700 block mb-1 uppercase tracking-wider">Description / Significance</label>
              <textarea
                rows={2}
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                placeholder="Spiritual significance, deity details..."
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/90 border border-gray-200/80 text-xs font-medium focus:outline-hidden focus:border-emerald-600 focus:bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)]"
              />
            </div>

            <div>
              <label className="text-[11px] font-black text-gray-700 block mb-1 uppercase tracking-wider">Visit Notes / Rules</label>
              <textarea
                rows={2}
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder="Dress code, photography rules, crowd precautions..."
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/90 border border-gray-200/80 text-xs font-medium focus:outline-hidden focus:border-emerald-600 focus:bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)]"
              />
            </div>

            <button
              onClick={() => {
                if (!formName.trim() || !formCity.trim()) {
                  setAlertMessage('Please enter a place name and city.');
                  return;
                }
                const matchedDay = days.find(d => d.id === formDayId);
                if (handleAdd) {
                  handleAdd({
                    name: formName.trim(),
                    city: formCity.trim(),
                    placeType: formPlaceType as PlaceType,
                    dayId: formDayId || undefined,
                    dayNumber: matchedDay?.dayNumber,
                    date: matchedDay?.date,
                    visitStatus: formVisitStatus,
                    needsVerification: formNeedsVerification,
                    significance: formDescription,
                    notes: formNotes,
                    entryFee: formEntryFee || 'Free',
                    imageUrl: formImageUrl,
                    isVisited: formVisitStatus === 'Visited',
                  });
                }
                showToast(`Place "${formName}" added!`);
                setCurrentScreen('list');
              }}
              className="w-full py-3.5 mt-2 rounded-2xl bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-950/20 hover:shadow-lg transition-all card-press-3d"
            >
              💾 Save Place
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 8: EDIT PLACE */}
      {currentScreen === 'edit' && selectedPlace && (
        <div className="glass-card card-3d card-depth-3d rounded-3xl p-5 sm:p-6 border border-white/90 shadow-[0_16px_36px_-8px_rgba(9,27,21,0.08),0_1px_3px_rgba(0,0,0,0.03)] bg-gradient-to-b from-white via-[#fafdfb] to-[#f4f8f5] space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('details')}
              className="w-9 h-9 rounded-full bg-white/90 border border-gray-200/70 shadow-2xs flex items-center justify-center text-gray-700 hover:bg-emerald-50 hover:text-[#0F5B44] transition-all card-press-3d"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-black text-gray-900 tracking-tight">Edit Place</h2>
              <p className="text-[11px] text-gray-500 font-medium">Update place details</p>
            </div>
            <button
              onClick={() => {
                setPlaceToDelete(selectedPlace);
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200/70 text-xs font-black hover:bg-rose-100 flex items-center gap-1 shadow-2xs card-press-3d"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>

          <div className="space-y-3.5 pt-1">
            <div>
              <label className="text-[11px] font-black text-gray-700 block mb-1.5 uppercase tracking-wider">Place Type *</label>
              <select
                value={formPlaceType}
                onChange={e => setFormPlaceType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/90 border border-gray-200/80 text-xs font-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)]"
              >
                <option value="Jyotirlinga">Jyotirlinga</option>
                <option value="Temple">Temple</option>
                <option value="Cave">Cave</option>
                <option value="Ghat">Ghat</option>
                <option value="Heritage">Heritage</option>
                <option value="Viewpoint">Viewpoint</option>
                <option value="Transit">Transit</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-black text-gray-700 block mb-1 uppercase tracking-wider">Place Name *</label>
              <input
                type="text"
                required
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/90 border border-gray-200/80 text-xs font-semibold shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-black text-gray-700 block mb-1 uppercase tracking-wider">Location / City *</label>
                <input
                  type="text"
                  required
                  value={formCity}
                  onChange={e => setFormCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/90 border border-gray-200/80 text-xs font-semibold shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)]"
                />
              </div>

              <div>
                <label className="text-[11px] font-black text-gray-700 block mb-1 uppercase tracking-wider">Related Itinerary Day</label>
                <select
                  value={formDayId}
                  onChange={e => setFormDayId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/90 border border-gray-200/80 text-xs font-semibold shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)]"
                >
                  <option value="">No Day Linked</option>
                  {days.map(d => (
                    <option key={d.id} value={d.id}>
                      Day {d.dayNumber}: {d.location || d.title} ({d.date})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-black text-gray-700 block mb-1 uppercase tracking-wider">Visit Status</label>
                <select
                  value={formVisitStatus}
                  onChange={e => setFormVisitStatus(e.target.value as PlaceVisitStatus)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/90 border border-gray-200/80 text-xs font-semibold shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)]"
                >
                  <option value="Planned">Planned</option>
                  <option value="Optional">Optional</option>
                  <option value="Needs verification">Needs verification</option>
                  <option value="Visited">Visited</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-black text-gray-700 block mb-1 uppercase tracking-wider">Entry Fee</label>
                <input
                  type="text"
                  value={formEntryFee}
                  onChange={e => setFormEntryFee(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/90 border border-gray-200/80 text-xs font-semibold shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="edit-needs-verif"
                checked={formNeedsVerification}
                onChange={e => setFormNeedsVerification(e.target.checked)}
                className="w-4 h-4 accent-[#0F5B44] rounded"
              />
              <label htmlFor="edit-needs-verif" className="text-xs font-bold text-gray-700">
                Mark as "Needs verification"
              </label>
            </div>

            <div>
              <label className="text-[11px] font-black text-gray-700 block mb-1 uppercase tracking-wider">Description / Significance</label>
              <textarea
                rows={2}
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/90 border border-gray-200/80 text-xs font-medium shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)]"
              />
            </div>

            <div>
              <label className="text-[11px] font-black text-gray-700 block mb-1 uppercase tracking-wider">Notes / Rules</label>
              <textarea
                rows={2}
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/90 border border-gray-200/80 text-xs font-medium shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)]"
              />
            </div>

            <button
              onClick={() => {
                if (!formName.trim() || !formCity.trim()) {
                  setAlertMessage('Please enter a place name and city.');
                  return;
                }
                const matchedDay = days.find(d => d.id === formDayId);
                if (handleEdit) {
                  handleEdit({
                    ...selectedPlace,
                    name: formName.trim(),
                    city: formCity.trim(),
                    placeType: formPlaceType as PlaceType,
                    dayId: formDayId || undefined,
                    dayNumber: matchedDay?.dayNumber || selectedPlace.dayNumber,
                    date: matchedDay?.date || selectedPlace.date,
                    visitStatus: formVisitStatus,
                    needsVerification: formNeedsVerification,
                    significance: formDescription,
                    notes: formNotes,
                    entryFee: formEntryFee || 'Free',
                    imageUrl: formImageUrl,
                    isVisited: formVisitStatus === 'Visited',
                  });
                }
                showToast('Place updated successfully!');
                setCurrentScreen('details');
              }}
              className="w-full py-3 mt-2 rounded-2xl bg-[#0F5B44] text-white text-xs font-bold shadow-xs hover:bg-[#16654f]"
            >
              Update Place
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 9: PLACES MAP VIEW */}
      {currentScreen === 'map' && (
        <div className="glass-card card-3d card-depth-3d rounded-3xl p-5 sm:p-6 border border-white/90 shadow-[0_16px_36px_-8px_rgba(9,27,21,0.08),0_1px_3px_rgba(0,0,0,0.03)] bg-gradient-to-b from-white via-[#fafdfb] to-[#f4f8f5] space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('overview')}
              className="w-9 h-9 rounded-full bg-white/90 border border-gray-200/70 shadow-2xs flex items-center justify-center text-gray-700 hover:bg-emerald-50 hover:text-[#0F5B44] transition-all card-press-3d"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-black text-gray-900 tracking-tight">Places Map</h2>
              <p className="text-[11px] text-gray-500 font-medium">Route map &amp; temple pins</p>
            </div>
            <div className="w-9" />
          </div>

          <div className="space-y-3 pt-1">
            <div className="rounded-3xl bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-emerald-500/5 border border-emerald-300/80 p-6 text-center space-y-3 card-3d shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0F5B44] to-teal-700 text-white flex items-center justify-center mx-auto shadow-md">
                <MapPin className="w-7 h-7 text-white drop-shadow-sm" />
              </div>
              <p className="text-sm font-black text-gray-900 tracking-tight">
                {selectedPlace ? `${selectedPlace.name} · ${selectedPlace.city}` : 'Pilgrimage Circuit Map'}
              </p>
              <p className="text-xs text-gray-600 max-w-sm mx-auto leading-relaxed font-medium">
                Interactive route covering Shirdi, Ellora, Nashik, Pune, Lonavala, Dwarka, Somnath, Ujjain, and Omkareshwar.
              </p>
              {selectedPlace?.mapUrl && (
                <a
                  href={selectedPlace.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white text-xs font-black shadow-md hover:shadow-lg transition-all card-press-3d"
                >
                  <span>Open in Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 10: VISITED PLACES TRACKER */}
      {currentScreen === 'visited' && (
        <div className="glass-card card-3d card-depth-3d rounded-3xl p-5 sm:p-6 border border-white/90 shadow-[0_16px_36px_-8px_rgba(9,27,21,0.08),0_1px_3px_rgba(0,0,0,0.03)] bg-gradient-to-b from-white via-[#fafdfb] to-[#f4f8f5] space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('overview')}
              className="w-9 h-9 rounded-full bg-white/90 border border-gray-200/70 shadow-2xs flex items-center justify-center text-gray-700 hover:bg-emerald-50 hover:text-[#0F5B44] transition-all card-press-3d"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-black text-gray-900 tracking-tight">Visited Places</h2>
              <p className="text-[11px] text-gray-500 font-medium">Track your verified visits</p>
            </div>
            <div className="w-9" />
          </div>

          {/* 3D Completion Meter Card */}
          {(() => {
            const visitedCount = places.filter(p => p.isVisited || p.visitStatus === 'Visited').length;
            const pct = places.length > 0 ? Math.round((visitedCount / places.length) * 100) : 0;
            return (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/12 via-emerald-500/6 to-teal-500/10 border border-emerald-200/80 card-3d shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#0F5B44]" />
                    <span className="text-xs font-black text-gray-900 uppercase tracking-wider">
                      Pilgrimage Progress
                    </span>
                  </div>
                  <span className="text-xs font-black text-[#0F5B44] bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300/60 shadow-2xs">
                    {visitedCount} / {places.length} ({pct}%)
                  </span>
                </div>
                <div className="w-full bg-emerald-950/10 h-2.5 rounded-full overflow-hidden p-0.5 border border-emerald-900/10">
                  <div
                    className="bg-gradient-to-r from-[#0F5B44] to-teal-500 h-full rounded-full transition-all duration-700 shadow-sm"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Segmented Filter with 3D Pills */}
          <div className="flex rounded-2xl bg-gray-100/80 p-1 border border-gray-200/50 shadow-inner">
            {['visited', 'pending', 'skipped'].map(tab => (
              <button
                key={tab}
                onClick={() => setVisitedTab(tab as any)}
                className={`flex-1 py-1.5 text-xs font-black rounded-xl capitalize transition-all card-press-3d ${
                  visitedTab === tab
                    ? 'bg-gradient-to-r from-[#0F5B44] to-teal-700 text-white shadow-md shadow-emerald-950/20'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="space-y-3 pt-1">
            {(() => {
              const filtered = places.filter(p => {
                if (visitedTab === 'visited') return Boolean(p.isVisited || p.visitStatus === 'Visited');
                if (visitedTab === 'skipped') return p.visitStatus === 'Optional';
                return !p.isVisited && p.visitStatus !== 'Visited';
              });

              if (filtered.length === 0) {
                return (
                  <div className="p-8 text-center text-xs text-gray-500 space-y-2 bg-white/90 rounded-2xl border border-dashed border-gray-300/80 card-3d">
                    <CheckCircle2 className="w-8 h-8 text-gray-300 mx-auto" />
                    <p className="font-black text-gray-800 capitalize text-sm">No {visitedTab} places recorded</p>
                    <p className="text-[11px] text-gray-500 max-w-xs mx-auto">
                      {visitedTab === 'visited'
                        ? 'Mark places as visited after your sacred pilgrimage darshan.'
                        : 'No places currently match this status filter.'}
                    </p>
                  </div>
                );
              }

              return filtered.map(p => {
                const isDone = Boolean(p.isVisited || p.visitStatus === 'Visited');
                return (
                  <div
                    key={p.id}
                    className="p-3 sm:p-3.5 rounded-2xl border border-white/90 bg-white/90 flex items-center justify-between gap-3 hover:bg-gradient-to-r hover:from-white hover:to-emerald-50/50 hover:border-emerald-300 card-3d card-press-3d shadow-xs hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={p.imageUrl || '/images/places/shirdi-sai-samadhi-mandir.jpg'}
                        alt={p.name}
                        className="w-12 h-12 rounded-xl object-cover shrink-0 shadow-2xs border border-black/5"
                      />
                      <div>
                        <h4 className="text-xs font-black text-gray-900">{p.name}</h4>
                        <p className="text-[10px] text-gray-500 font-medium">{p.city} · {p.placeType}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const nextVisited = !isDone;
                        if (onToggleVisited) onToggleVisited(p.id, nextVisited);
                        if (handleEdit) {
                          handleEdit({
                            ...p,
                            isVisited: nextVisited,
                            visitStatus: nextVisited ? 'Visited' : 'Planned',
                          });
                        }
                        showToast(`Status updated for ${p.name}`);
                      }}
                      className="p-2 text-[#0F5B44] card-press-3d rounded-xl hover:bg-emerald-50 transition-colors"
                      title={isDone ? 'Mark as Pending' : 'Mark as Visited'}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 fill-emerald-100" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-300 hover:text-gray-400" />
                      )}
                    </button>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* SCREEN 11: NOTES & EXPERIENCE */}
      {currentScreen === 'notes_exp' && selectedPlace && (
        <div className="glass-card card-3d card-depth-3d rounded-3xl p-5 sm:p-6 border border-white/90 shadow-[0_16px_36px_-8px_rgba(9,27,21,0.08),0_1px_3px_rgba(0,0,0,0.03)] bg-gradient-to-b from-white via-[#fafdfb] to-[#f4f8f5] space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('details')}
              className="w-9 h-9 rounded-full bg-white/90 border border-gray-200/70 shadow-2xs flex items-center justify-center text-gray-700 hover:bg-emerald-50 hover:text-[#0F5B44] transition-all card-press-3d"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-black text-gray-900 tracking-tight">Place Notes</h2>
              <p className="text-[11px] text-gray-500 font-medium">Your notes and experience</p>
            </div>
            <div className="w-9" />
          </div>

          {/* Place Header Card */}
          <div className="p-3.5 rounded-2xl bg-white/90 border border-gray-200/70 flex items-center gap-3 card-3d shadow-2xs">
            <img
              src={selectedPlace.imageUrl || '/images/places/shirdi-sai-samadhi-mandir.jpg'}
              alt={selectedPlace.name}
              className="w-12 h-12 rounded-xl object-cover shrink-0 shadow-2xs border border-black/5"
            />
            <div>
              <h4 className="text-xs font-black text-gray-900">{selectedPlace.name}</h4>
              <p className="text-[10px] text-gray-500 font-medium">{selectedPlace.city}</p>
            </div>
          </div>

          <div className="space-y-3.5 pt-1">
            <div>
              <label className="text-[11px] font-black text-gray-700 block mb-1 uppercase tracking-wider">My Notes</label>
              <textarea
                rows={4}
                value={expNotes}
                onChange={e => setExpNotes(e.target.value)}
                placeholder="Personal spiritual reflections, peaceful moments, darshan feelings..."
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white/90 border border-gray-200/80 text-xs font-medium focus:outline-hidden focus:border-emerald-600 focus:bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)]"
              />
            </div>

            <div>
              <label className="text-[11px] font-black text-gray-700 block mb-1 uppercase tracking-wider">Visited On</label>
              <input
                type="date"
                value={expDate}
                onChange={e => setExpDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-2xl bg-white/90 border border-gray-200/80 text-xs font-semibold shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)]"
              />
            </div>

            <div>
              <label className="text-[11px] font-black text-gray-700 block mb-1.5 uppercase tracking-wider">Rating</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setExpRating(star)}
                    className="p-1 hover:scale-125 transition-transform card-press-3d"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= expRating
                          ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                          : 'fill-gray-100 text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                if (onSaveExperienceNote) {
                  onSaveExperienceNote(selectedPlace.id, expNotes, expRating, expDate);
                }
                showToast('Personal experience saved!');
                setCurrentScreen('details');
              }}
              className="w-full py-3.5 mt-2 rounded-2xl bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-950/20 hover:shadow-lg transition-all card-press-3d"
            >
              💾 Save Note
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 12: PLACES SETTINGS */}
      {currentScreen === 'settings' && (
        <div className="glass-card card-3d card-depth-3d rounded-3xl p-5 sm:p-6 border border-white/90 shadow-[0_16px_36px_-8px_rgba(9,27,21,0.08),0_1px_3px_rgba(0,0,0,0.03)] bg-gradient-to-b from-white via-[#fafdfb] to-[#f4f8f5] space-y-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('overview')}
              className="w-9 h-9 rounded-full bg-white/90 border border-gray-200/70 shadow-2xs flex items-center justify-center text-gray-700 hover:bg-emerald-50 hover:text-[#0F5B44] transition-all card-press-3d"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-black text-gray-900 tracking-tight">Places Settings</h2>
              <p className="text-[11px] text-gray-500 font-medium">Route destinations &amp; portals</p>
            </div>
            <div className="w-9" />
          </div>

          {/* Pilgrimage Route Scope */}
          <div className="bg-gradient-to-r from-emerald-500/12 via-emerald-500/6 to-teal-500/10 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 space-y-2 card-3d shadow-xs">
            <div className="flex items-center gap-2 text-[#0F5B44] font-black text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Pilgrimage Route Scope (19-Day Working Route)</span>
            </div>
            <p className="text-[11px] text-gray-700 leading-relaxed font-medium">
              This journey encompasses <span className="font-bold text-[#0F5B44]">8 Main Pilgrimage Destinations</span>: Shri Sai Baba Samadhi Mandir (Shirdi) plus the 7 Jyotirlingas along the approved route (Grishneshwar, Trimbakeshwar, Bhimashankar, Nageshwar, Somnath, Mahakaleshwar, Omkareshwar).
            </p>
            <p className="text-[11px] text-gray-500 italic">
              Note: Srisailam / Mallikarjuna is not part of this 19-day itinerary and is excluded to maintain strict route integrity.
            </p>
          </div>

          {/* Official Pilgrimage Trust Portals */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Official Temple Trust Portals</h3>
            <div className="space-y-2 text-xs">
              <a
                href="https://online.sai.org.in"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-2xl bg-white/90 border border-gray-200/70 shadow-2xs flex items-center justify-between hover:text-[#0F5B44] hover:border-emerald-300 card-3d card-press-3d transition-all"
              >
                <div>
                  <p className="font-black text-gray-900">Shri Saibaba Sansthan Trust</p>
                  <p className="text-[10px] text-gray-500 font-medium">Shirdi, Maharashtra (online.sai.org.in)</p>
                </div>
                <ExternalLink className="w-4 h-4 text-emerald-800" />
              </a>
              <a
                href="https://shrimahakaleshwar.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-2xl bg-white/90 border border-gray-200/70 shadow-2xs flex items-center justify-between hover:text-[#0F5B44] hover:border-emerald-300 card-3d card-press-3d transition-all"
              >
                <div>
                  <p className="font-black text-gray-900">Shri Mahakaleshwar Temple Trust</p>
                  <p className="text-[10px] text-gray-500 font-medium">Ujjain, Madhya Pradesh (shrimahakaleshwar.com)</p>
                </div>
                <ExternalLink className="w-4 h-4 text-emerald-800" />
              </a>
              <a
                href="https://somnath.org"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-2xl bg-white/90 border border-gray-200/70 shadow-2xs flex items-center justify-between hover:text-[#0F5B44] hover:border-emerald-300 card-3d card-press-3d transition-all"
              >
                <div>
                  <p className="font-black text-gray-900">Shree Somnath Trust</p>
                  <p className="text-[10px] text-gray-500 font-medium">Somnath / Prabhas Patan, Gujarat (somnath.org)</p>
                </div>
                <ExternalLink className="w-4 h-4 text-emerald-800" />
              </a>
              <a
                href="https://dwarkadhish.org"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-2xl bg-white/90 border border-gray-200/70 shadow-2xs flex items-center justify-between hover:text-[#0F5B44] hover:border-emerald-300 card-3d card-press-3d transition-all"
              >
                <div>
                  <p className="font-black text-gray-900">Dwarkadhish Temple Administration</p>
                  <p className="text-[10px] text-gray-500 font-medium">Dwarka, Gujarat (dwarkadhish.org)</p>
                </div>
                <ExternalLink className="w-4 h-4 text-emerald-800" />
              </a>
              <a
                href="https://shriomkareshwar.org"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-2xl bg-white/90 border border-gray-200/70 shadow-2xs flex items-center justify-between hover:text-[#0F5B44] hover:border-emerald-300 card-3d card-press-3d transition-all"
              >
                <div>
                  <p className="font-black text-gray-900">Shri Omkareshwar Temple Trust</p>
                  <p className="text-[10px] text-gray-500 font-medium">Omkareshwar, Madhya Pradesh (shriomkareshwar.org)</p>
                </div>
                <ExternalLink className="w-4 h-4 text-emerald-800" />
              </a>
              <a
                href="https://trimbak.org"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-2xl bg-white/90 border border-gray-200/70 shadow-2xs flex items-center justify-between hover:text-[#0F5B44] hover:border-emerald-300 card-3d card-press-3d transition-all"
              >
                <div>
                  <p className="font-black text-gray-900">Shri Trimbakeshwar Sansthan</p>
                  <p className="text-[10px] text-gray-500 font-medium">Nashik, Maharashtra (trimbak.org)</p>
                </div>
                <ExternalLink className="w-4 h-4 text-emerald-800" />
              </a>
            </div>
          </div>

          {/* Display Preferences */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Display Preferences</h3>
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-2xl bg-white/90 border border-gray-200/70 shadow-2xs flex items-center justify-between card-3d">
                <div>
                  <p className="font-black text-gray-900">Show Distance on List</p>
                  <p className="text-[10px] text-gray-500 font-medium">Calculate distance between temples</p>
                </div>
                <input
                  type="checkbox"
                  checked={showDistanceOnList}
                  onChange={e => setShowDistanceOnList(e.target.checked)}
                  className="w-4 h-4 accent-[#0F5B44] rounded"
                />
              </div>
              <div className="p-3 rounded-2xl bg-white/90 border border-gray-200/70 shadow-2xs flex items-center justify-between card-3d">
                <div>
                  <p className="font-black text-gray-900">Show Map View</p>
                  <p className="text-[10px] text-gray-500 font-medium">Display mini-map on overview</p>
                </div>
                <input
                  type="checkbox"
                  checked={showMapViewToggle}
                  onChange={e => setShowMapViewToggle(e.target.checked)}
                  className="w-4 h-4 accent-[#0F5B44] rounded"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3D Confirmation Popup for Delete Place */}
      <ConfirmModal
        isOpen={Boolean(placeToDelete)}
        title="Delete Place?"
        message={`Are you sure you want to delete "${placeToDelete?.name || 'this place'}"?\nThis attraction will be removed from your pilgrimage itinerary.`}
        confirmLabel="Delete Place"
        cancelLabel="Keep Place"
        variant="danger"
        iconType="trash"
        onConfirm={async () => {
          if (placeToDelete) {
            const id = placeToDelete.id;
            setPlaceToDelete(null);
            if (onDeletePlace) await onDeletePlace(id);
            showToast('Place deleted');
            setCurrentScreen('list');
          }
        }}
        onCancel={() => setPlaceToDelete(null)}
      />

      {/* 3D Alert Popup */}
      <AlertModal
        isOpen={Boolean(alertMessage)}
        message={alertMessage || ''}
        variant="warning"
        onClose={() => setAlertMessage(null)}
      />
    </div>
  );
};
