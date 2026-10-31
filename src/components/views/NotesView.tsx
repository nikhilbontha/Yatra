'use client';

import React, { useState, useMemo } from 'react';
import { TripNote, NoteCategory, Trip, ItineraryDay } from '@/types/trip';
import {
  FileText,
  Search,
  Filter,
  Plus,
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Tag,
  Share2,
  Trash2,
  Edit2,
  MoreVertical,
  Camera,
  UploadCloud,
  ChevronRight,
  ChevronLeft,
  Bell,
  Star,
  Pin,
  Bookmark,
  CheckCircle2,
  Heart,
  Settings,
  Layers,
  Sparkles,
  Phone,
  Hotel,
  Train,
  Check,
  Compass,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { ConfirmModal } from '@/components/modals/ConfirmModal';

export type NotesScreen =
  | 'overview'
  | 'all'
  | 'add_note'
  | 'details'
  | 'photos'
  | 'edit_note'
  | 'reminder'
  | 'experiences'
  | 'important'
  | 'map'
  | 'calendar'
  | 'settings';

export interface NotesViewProps {
  trip?: Trip;
  days?: ItineraryDay[];
  notes: TripNote[];
  onAddNote?: (note: Partial<TripNote>) => void | Promise<void>;
  onEditNote?: (note: TripNote) => void | Promise<void>;
  onDeleteNote?: (id: string) => void | Promise<void>;
  onSelectDayIndex?: (dayIndex: number) => void;
  initialScreen?: NotesScreen;
}

export const NotesView: React.FC<NotesViewProps> = ({
  trip,
  days = [],
  notes,
  onAddNote,
  onEditNote,
  onDeleteNote,
  onSelectDayIndex,
  initialScreen = 'overview',
}) => {
  const [currentScreen, setCurrentScreen] = useState<NotesScreen>(initialScreen);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [expCategoryFilter, setExpCategoryFilter] = useState('All');
  const [importantFilter, setImportantFilter] = useState('All');
  const [calendarSelectedDate, setCalendarSelectedDate] = useState('2026-11-17');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<TripNote | null>(null);

  // Settings
  const [showPhotosInList, setShowPhotosInList] = useState(true);
  const [showNoteLocations, setShowNoteLocations] = useState(true);
  const [groupByType, setGroupByType] = useState(true);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(true);

  // Form states for Add / Edit
  const [formType, setFormType] = useState<'Daily' | 'Experience' | 'Reminder'>('Daily');
  const [formCategory, setFormCategory] = useState<NoteCategory>('Reflection');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formDayId, setFormDayId] = useState<string>('');
  const [formDate, setFormDate] = useState('2026-11-17');
  const [formLocation, setFormLocation] = useState('');
  const [formSelectedTags, setFormSelectedTags] = useState<string[]>(['Temple', 'Darshan']);
  const [formPriority, setFormPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [formIsImportant, setFormIsImportant] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string>(notes[0]?.id || '');

  // Selected note for detail view
  const selectedNote = useMemo(() => {
    const found = notes.find(n => n.id === selectedNoteId);
    if (found) return found;
    return notes[0] || null;
  }, [notes, selectedNoteId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenAddNote = (
    type: 'Daily' | 'Experience' | 'Reminder' = 'Daily',
    initialCategory?: NoteCategory,
    initialDayId?: string
  ) => {
    setErrorMessage(null);
    setFormType(type);
    setFormCategory(initialCategory || (type === 'Daily' ? 'Reflection' : type === 'Experience' ? 'Travel Tip' : 'General'));
    setFormTitle('');
    setFormContent('');
    setFormDayId(initialDayId || '');
    if (initialDayId && days.length > 0) {
      const matchDay = days.find(d => d.id === initialDayId);
      if (matchDay?.date) setFormDate(matchDay.date);
    } else {
      setFormDate('2026-11-17');
    }
    setFormLocation('');
    setFormSelectedTags(['Temple']);
    setFormPriority('Medium');
    setFormIsImportant(false);
    setCurrentScreen('add_note');
  };

  const handleOpenEditNote = (note: TripNote) => {
    setErrorMessage(null);
    setSelectedNoteId(note.id);
    setFormType((note.noteType as any) || 'Daily');
    setFormCategory(note.category || 'General');
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormDayId(note.dayId || '');
    setFormDate(note.date || (note.createdAt ? note.createdAt.split('T')[0] : '2026-11-17'));
    setFormLocation(note.location || '');
    setFormSelectedTags(note.tags || ['Temple']);
    setFormPriority(note.priority || 'Medium');
    setFormIsImportant(Boolean(note.isImportant));
    setCurrentScreen('edit_note');
  };

  // Screen Switcher Pills
  const screensList: { id: NotesScreen; label: string; icon: string }[] = [
    { id: 'overview', label: '1. Overview', icon: '📖' },
    { id: 'all', label: '2. All Notes', icon: '📝' },
    { id: 'add_note', label: '3. Add Note', icon: '➕' },
    { id: 'details', label: '4. Note Details', icon: '📄' },
    { id: 'photos', label: '5. Note Photos', icon: '📷' },
    { id: 'edit_note', label: '6. Edit Note', icon: '✏️' },
    { id: 'reminder', label: '7. Reminder Details', icon: '🔔' },
    { id: 'experiences', label: '8. Experiences', icon: '💜' },
    { id: 'important', label: '9. Important Notes', icon: '📌' },
    { id: 'map', label: '10. Notes Map', icon: '🗺️' },
    { id: 'calendar', label: '11. Journal Calendar', icon: '📅' },
    { id: 'settings', label: '12. Settings', icon: '⚙️' },
  ];

  // Filtered notes list for Screen 2
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = n.title?.toLowerCase().includes(q);
        const matchesContent = n.content?.toLowerCase().includes(q);
        const matchesLoc = n.location?.toLowerCase().includes(q);
        const matchesTag = n.tags?.some(t => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesContent && !matchesLoc && !matchesTag) return false;
      }

      if (selectedCategoryFilter !== 'All') {
        if (selectedCategoryFilter === 'Daily') {
          return n.noteType === 'Daily' || n.category === 'Reflection';
        }
        if (selectedCategoryFilter === 'Experience') {
          return n.noteType === 'Experience' || n.category === 'Travel Tip';
        }
        if (selectedCategoryFilter === 'Reminder') {
          return n.noteType === 'Reminder' || n.category === 'Emergency' || n.category === 'Contact';
        }
        return n.category === selectedCategoryFilter;
      }

      return true;
    });
  }, [notes, searchQuery, selectedCategoryFilter]);

  // Calendar day notes
  const calendarNotes = useMemo(() => {
    return notes.filter(n => {
      if (n.date === calendarSelectedDate) return true;
      if (n.dayId && days.length > 0) {
        const d = days.find(day => day.id === n.dayId);
        if (d?.date === calendarSelectedDate) return true;
      }
      return false;
    });
  }, [notes, calendarSelectedDate, days]);

  return (
    <div className="space-y-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#0F5B44] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xl animate-fade-in flex items-center gap-2">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 12-Screen Switcher Header Bar - 3D Tactile Strip */}
      <div className="glass-card card-3d card-depth-3d rounded-2xl p-1.5 sm:p-2 border border-white/90 shadow-[0_8px_20px_-4px_rgba(15,91,68,0.08)] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {screensList.map(s => {
          const isActive = currentScreen === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setCurrentScreen(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all card-press-3d ${
                isActive
                  ? 'bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white shadow-md shadow-emerald-950/25 ring-1 ring-emerald-300/40'
                  : 'bg-white/80 text-gray-700 hover:text-[#0F5B44] hover:bg-emerald-50/70 border border-gray-100 shadow-2xs'
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* SCREEN 1: NOTES & JOURNAL OVERVIEW */}
      {currentScreen === 'overview' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="glass-card card-3d card-depth-3d rounded-3xl p-4 sm:p-5 border border-white/90 shadow-[0_12px_32px_-8px_rgba(15,91,68,0.12)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9.5px] font-black uppercase tracking-wider mb-1">
                  <FileText className="w-3 h-3 text-emerald-600" />
                  <span>PILGRIMAGE REFLECTIONS</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Notes &amp; Journal
                </h1>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Capture your journey, memories and important reminders
                </p>
              </div>
              <button
                onClick={() => setCurrentScreen('settings')}
                className="w-10 h-10 rounded-2xl bg-white border border-gray-200/80 text-gray-600 flex items-center justify-center hover:bg-emerald-50 hover:text-[#0F5B44] shadow-2xs card-press-3d transition-all"
                title="Notes Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            {/* 3 Stat Category Cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 mt-4">
              <div
                onClick={() => {
                  setSelectedCategoryFilter('Daily');
                  setCurrentScreen('all');
                }}
                className="cursor-pointer p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-center hover:border-emerald-400 hover:shadow-xs transition-all card-press-3d shadow-2xs"
              >
                <span className="text-xl">📝</span>
                <p className="text-xs font-black text-gray-900 mt-1">Daily Notes</p>
                <p className="text-[10px] text-gray-500 font-bold">
                  {notes.filter(n => n.noteType === 'Daily' || n.category === 'Reflection').length} notes
                </p>
              </div>
              <div
                onClick={() => setCurrentScreen('experiences')}
                className="cursor-pointer p-3 rounded-2xl bg-purple-50/70 border border-purple-200/80 text-center hover:border-purple-400 hover:shadow-xs transition-all card-press-3d shadow-2xs"
              >
                <span className="text-xl">💜</span>
                <p className="text-xs font-black text-gray-900 mt-1">Experiences</p>
                <p className="text-[10px] text-gray-500 font-bold">
                  {notes.filter(n => n.noteType === 'Experience' || n.category === 'Travel Tip').length} memories
                </p>
              </div>
              <div
                onClick={() => setCurrentScreen('reminder')}
                className="cursor-pointer p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-center hover:border-amber-400 hover:shadow-xs transition-all card-press-3d shadow-2xs"
              >
                <span className="text-xl">🔔</span>
                <p className="text-xs font-black text-gray-900 mt-1">Reminders</p>
                <p className="text-[10px] text-gray-500 font-bold">
                  {notes.filter(n => n.noteType === 'Reminder' || n.category === 'Emergency' || n.category === 'Contact').length} items
                </p>
              </div>
            </div>
          </div>

          {/* Recent Notes Section */}
          <div className="glass-card card-3d card-depth-3d rounded-3xl p-4 sm:p-5 border border-white/90 shadow-[0_12px_32px_-8px_rgba(15,91,68,0.12)]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900">Recent Notes</h2>
              <button
                onClick={() => setCurrentScreen('all')}
                className="text-xs text-[#0F5B44] font-bold hover:underline flex items-center gap-0.5"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {notes.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-gray-100 rounded-2xl space-y-2">
                  <span className="text-2xl">📝</span>
                  <p className="text-xs font-bold text-gray-700">No notes written yet</p>
                  <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                    Keep track of your pilgrimage reflections, memorable moments, and experiences.
                  </p>
                </div>
              ) : (
                notes.slice(0, 4).map(item => {
                  const linkedDay = days.find(d => d.id === item.dayId);
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedNoteId(item.id);
                        setCurrentScreen('details');
                      }}
                      className="group cursor-pointer p-3.5 rounded-2xl border border-gray-100 hover:border-[#0F5B44]/30 hover:bg-[#0F5B44]/5 flex items-center gap-3.5 transition-all"
                    >
                      <div className="w-12 h-12 rounded-xl bg-[#e8f5ef] text-[#0F5B44] flex items-center justify-center shrink-0 text-xl font-bold">
                        {item.category === 'Emergency' ? '🚨' : item.category === 'Travel Tip' ? '🧭' : item.category === 'Reflection' ? '🪔' : '📝'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-gray-900 group-hover:text-[#0F5B44] truncate">
                            {item.title}
                          </h4>
                          <span className="text-[10px] text-gray-400 font-medium shrink-0">
                            {item.date || (item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Saved')}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">{item.content}</p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[9px] font-semibold">
                            {item.category}
                          </span>
                          {linkedDay && (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-[#0F5B44] text-[9px] font-bold">
                              Day {linkedDay.dayNumber}
                            </span>
                          )}
                          {item.location && (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[9px] font-semibold">
                              📍 {item.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={() => handleOpenAddNote('Daily')}
              className="w-full mt-4 py-3 rounded-2xl bg-[#0F5B44] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs hover:bg-[#16654f] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Note</span>
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 2: ALL NOTES LIST */}
      {currentScreen === 'all' && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentScreen('overview')}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-lg font-bold text-gray-900">All Notes</h2>
                <p className="text-[11px] text-gray-500">
                  {filteredNotes.length} notes • {new Set(filteredNotes.map(n => n.category)).size} categories
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentScreen('calendar')}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                title="Calendar View"
              >
                <Calendar className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleOpenAddNote('Daily')}
                className="px-3 py-1.5 rounded-xl bg-[#0F5B44] text-white text-xs font-bold flex items-center gap-1 shadow-xs hover:bg-[#16654f]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search notes, tags, locations or reflections..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs focus:bg-white focus:border-[#0F5B44]"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {['All', 'General', 'Emergency', 'Travel Tip', 'Reflection', 'Contact'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategoryFilter === cat
                    ? 'bg-[#0F5B44] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Date-grouped notes */}
          <div className="space-y-3 pt-1">
            {filteredNotes.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xs text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[#e8f5ef] text-[#0F5B44] flex items-center justify-center font-bold text-xl">
                  📝
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">No notes written yet</h4>
                  <p className="text-xs text-gray-400 max-w-xs mx-auto mt-1">
                    Keep track of your pilgrimage reflections, memorable moments, and experiences.
                  </p>
                </div>
                <button
                  onClick={() => handleOpenAddNote('Daily')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F5B44] text-white text-xs font-bold hover:bg-[#16654f] transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Write Note</span>
                </button>
              </div>
            ) : (
              filteredNotes.map(note => {
                const linkedDay = days.find(d => d.id === note.dayId);
                return (
                  <div
                    key={note.id}
                    onClick={() => {
                      setSelectedNoteId(note.id);
                      setCurrentScreen('details');
                    }}
                    className="p-3.5 rounded-2xl border border-gray-100 hover:border-[#0F5B44]/30 hover:bg-[#0F5B44]/5 flex items-center gap-3.5 cursor-pointer transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#e8f5ef] text-[#0F5B44] flex items-center justify-center shrink-0 font-bold text-xl">
                      {note.category === 'Emergency' ? '🚨' : note.category === 'Travel Tip' ? '🧭' : note.category === 'Reflection' ? '🪔' : '📝'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-gray-900 truncate">{note.title}</h4>
                        <span className="text-[10px] text-gray-400 font-medium shrink-0">
                          {note.date || (note.createdAt ? new Date(note.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Saved')}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">{note.content}</p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[9px] font-semibold">
                          {note.category}
                        </span>
                        {linkedDay && (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-[#0F5B44] text-[9px] font-bold">
                            Day {linkedDay.dayNumber}
                          </span>
                        )}
                        {note.location && (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[9px] font-semibold">
                            📍 {note.location}
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

      {/* SCREEN 3: ADD NOTE */}
      {currentScreen === 'add_note' && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('overview')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-bold text-gray-900">Add Note</h2>
              <p className="text-[11px] text-gray-500">Create a new entry</p>
            </div>
            <button
              onClick={async () => {
                if (!formTitle.trim()) {
                  setErrorMessage('Please enter a note title');
                  return;
                }
                if (!formContent.trim()) {
                  setErrorMessage('Please enter note content');
                  return;
                }
                setErrorMessage(null);
                try {
                  if (onAddNote) {
                    await onAddNote({
                      title: formTitle.trim(),
                      content: formContent.trim(),
                      category: formCategory,
                      noteType: formType,
                      dayId: formDayId || undefined,
                      date: formDate,
                      location: formLocation.trim() || undefined,
                      tags: formSelectedTags,
                      priority: formPriority,
                      isImportant: formIsImportant,
                    });
                  }
                  showToast(`Note "${formTitle}" saved!`);
                  setCurrentScreen('all');
                } catch (e: any) {
                  setErrorMessage(e.message || 'Failed to save note. Text is preserved.');
                }
              }}
              className="px-3.5 py-1.5 rounded-xl bg-[#0F5B44] text-white text-xs font-bold shadow-xs hover:bg-[#16654f]"
            >
              Save
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-3 pt-1">
            {/* Note Type Selector */}
            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">Note Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Daily', label: 'Daily Journal', icon: '📝' },
                  { id: 'Experience', label: 'Experience', icon: '💜' },
                  { id: 'Reminder', label: 'Reminder', icon: '🔔' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setFormType(item.id as any);
                      if (item.id === 'Daily') setFormCategory('Reflection');
                      if (item.id === 'Experience') setFormCategory('Travel Tip');
                      if (item.id === 'Reminder') setFormCategory('Travel Tip');
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      formType === item.id
                        ? 'bg-emerald-50 border-[#0F5B44] text-[#0F5B44]'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span className="text-[11px]">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">Title *</label>
              <input
                type="text"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="e.g. Shirdi Morning Kakad Aarti Darshan"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs focus:bg-white focus:border-[#0F5B44]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value as NoteCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium focus:bg-white"
                >
                  <option value="General">General (General Trip Notes)</option>
                  <option value="Emergency">Emergency (Helplines &amp; Safety)</option>
                  <option value="Travel Tip">Travel Tip (Temple Rules &amp; Transport)</option>
                  <option value="Reflection">Reflection (Daily Journal &amp; Memories)</option>
                  <option value="Contact">Contact (Key Contacts)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Related Itinerary Day</label>
                <select
                  value={formDayId}
                  onChange={e => {
                    const dId = e.target.value;
                    setFormDayId(dId);
                    if (dId && days.length > 0) {
                      const matchDay = days.find(d => d.id === dId);
                      if (matchDay?.date) setFormDate(matchDay.date);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium focus:bg-white"
                >
                  <option value="">None (General Trip Note)</option>
                  {days.map(d => (
                    <option key={d.id} value={d.id}>
                      Day {d.dayNumber}: {d.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Location</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={e => setFormLocation(e.target.value)}
                  placeholder="e.g. Shirdi / Trimbakeshwar"
                  className="w-full px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1.5">Tags</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {['Temple', 'Darshan', 'Transport', 'Stay', 'Safety', '+ Add Tag'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      if (tag === '+ Add Tag') {
                        const newTag = prompt('Enter custom tag:');
                        if (newTag?.trim()) setFormSelectedTags(prev => [...prev, newTag.trim()]);
                      } else {
                        setFormSelectedTags(prev =>
                          prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                        );
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      formSelectedTags.includes(tag)
                        ? 'bg-[#0F5B44] text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">Content / Journal Text *</label>
              <textarea
                rows={5}
                value={formContent}
                onChange={e => setFormContent(e.target.value)}
                placeholder="Write your pilgrimage notes, reflections, tips, or experiences here..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs focus:bg-white focus:border-[#0F5B44]"
                required
              />
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 4: NOTE DETAILS */}
      {currentScreen === 'details' && (
        !selectedNote ? (
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xs text-center space-y-3">
            <h4 className="text-sm font-bold text-gray-900">No Note Selected</h4>
            <button
              onClick={() => setCurrentScreen('overview')}
              className="px-4 py-2 rounded-xl bg-[#0F5B44] text-white text-xs font-bold"
            >
              Back to Overview
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentScreen('all')}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEditNote(selectedNote)}
                  className="p-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                  title="Edit Note"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setNoteToDelete(selectedNote)}
                  className="p-1.5 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 card-press-3d"
                  title="Delete Note"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Title & Metadata */}
            <div>
              <h2 className="text-lg font-black text-gray-900">{selectedNote.title}</h2>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span>
                  {selectedNote.createdAt
                    ? new Date(selectedNote.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : selectedNote.date || 'Saved'}
                </span>
                {selectedNote.priority && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                    {selectedNote.priority}
                  </span>
                )}
              </div>
            </div>

            {/* Tag Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                {selectedNote.category || 'General'}
              </span>
              {selectedNote.location && (
                <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-semibold flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{selectedNote.location}</span>
                </span>
              )}
              {selectedNote.tags?.map(t => (
                <span key={t} className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px]">
                  #{t}
                </span>
              ))}
            </div>

            {/* Linked Itinerary Day Card */}
            {(() => {
              const linkedDay = days.find(d => d.id === selectedNote.dayId);
              if (!linkedDay) return null;
              return (
                <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl">🧭</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#0F5B44] truncate">
                        Day {linkedDay.dayNumber}: {linkedDay.title}
                      </p>
                      <p className="text-[10px] text-gray-500">{linkedDay.date}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (onSelectDayIndex) onSelectDayIndex(linkedDay.dayNumber - 1);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-[#0F5B44] text-white text-[10px] font-bold shrink-0 hover:bg-[#16654f] flex items-center gap-1"
                  >
                    <span>View Day</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              );
            })()}

            {/* Note Content Text */}
            <div className="p-4 rounded-2xl bg-gray-50/60 border border-gray-100">
              <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-line font-medium">
                {selectedNote.content || 'No content provided.'}
              </p>
            </div>

            {/* Actions Bottom Bar */}
            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => handleOpenEditNote(selectedNote)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 flex items-center justify-center gap-1.5 hover:bg-gray-50"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Note</span>
              </button>
              <button
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(`${selectedNote.title}\n\n${selectedNote.content}`);
                    showToast('Note copied to clipboard');
                  } else {
                    showToast('Sharing ready');
                  }
                }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 flex items-center justify-center gap-1.5 hover:bg-gray-50"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
              <button
                onClick={() => setNoteToDelete(selectedNote)}
                className="p-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 card-press-3d"
                title="Delete Note"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )
      )}

      {/* SCREEN 5: NOTE PHOTOS */}
      {currentScreen === 'photos' && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('details')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-bold text-gray-900">Note Photos</h2>
              <p className="text-[11px] text-gray-500">0 photos attached</p>
            </div>
            <button
              onClick={() => showToast('Photo uploaded')}
              className="px-3 py-1.5 rounded-xl bg-[#0F5B44] text-white text-xs font-bold flex items-center gap-1 shadow-xs hover:bg-[#16654f]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          <div className="p-8 text-center border-2 border-dashed border-gray-100 rounded-2xl space-y-2">
            <FileText className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="text-xs font-bold text-gray-600">No photos attached</p>
            <p className="text-[11px] text-gray-400">Photos added to your notes will appear here</p>
          </div>
        </div>
      )}

      {/* SCREEN 6: EDIT NOTE */}
      {currentScreen === 'edit_note' && selectedNote && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('details')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-bold text-gray-900">Edit Note</h2>
              <p className="text-[11px] text-gray-500">Update note details</p>
            </div>
            <button
              onClick={() => setNoteToDelete(selectedNote)}
              className="px-2.5 py-1 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold flex items-center gap-1 hover:bg-rose-100 card-press-3d"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-3 pt-1">
            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">Title *</label>
              <input
                type="text"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs focus:bg-white focus:border-[#0F5B44]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value as NoteCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium focus:bg-white"
                >
                  <option value="General">General (General Trip Notes)</option>
                  <option value="Emergency">Emergency (Helplines &amp; Safety)</option>
                  <option value="Travel Tip">Travel Tip (Temple Rules &amp; Transport)</option>
                  <option value="Reflection">Reflection (Daily Journal &amp; Memories)</option>
                  <option value="Contact">Contact (Key Contacts)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Related Itinerary Day</label>
                <select
                  value={formDayId}
                  onChange={e => {
                    const dId = e.target.value;
                    setFormDayId(dId);
                    if (dId && days.length > 0) {
                      const matchDay = days.find(d => d.id === dId);
                      if (matchDay?.date) setFormDate(matchDay.date);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium focus:bg-white"
                >
                  <option value="">None (General Trip Note)</option>
                  {days.map(d => (
                    <option key={d.id} value={d.id}>
                      Day {d.dayNumber}: {d.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Location</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={e => setFormLocation(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">Notes *</label>
              <textarea
                rows={5}
                value={formContent}
                onChange={e => setFormContent(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs focus:bg-white focus:border-[#0F5B44]"
                required
              />
            </div>

            <button
              onClick={async () => {
                if (!formTitle.trim()) {
                  setErrorMessage('Please enter a note title');
                  return;
                }
                if (!formContent.trim()) {
                  setErrorMessage('Please enter note content');
                  return;
                }
                setErrorMessage(null);
                try {
                  if (onEditNote) {
                    await onEditNote({
                      ...selectedNote,
                      title: formTitle.trim(),
                      content: formContent.trim(),
                      category: formCategory,
                      dayId: formDayId || undefined,
                      date: formDate,
                      location: formLocation.trim() || undefined,
                      tags: formSelectedTags,
                      priority: formPriority,
                      isImportant: formIsImportant,
                    });
                  }
                  showToast('Note updated successfully!');
                  setCurrentScreen('details');
                } catch (e: any) {
                  setErrorMessage(e.message || 'Failed to update note. Text is preserved.');
                }
              }}
              className="w-full py-3 mt-2 rounded-2xl bg-[#0F5B44] text-white text-xs font-bold shadow-xs hover:bg-[#16654f] transition-all"
            >
              Update Note
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 7: REMINDER DETAILS */}
      {currentScreen === 'reminder' && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('overview')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-bold text-gray-900">Reminder Details</h2>
              <p className="text-[11px] text-gray-500">Trip alerts and schedules</p>
            </div>
            <button
              onClick={() => handleOpenAddNote('Reminder', 'Travel Tip')}
              className="px-3 py-1.5 rounded-xl bg-[#0F5B44] text-white text-xs font-bold flex items-center gap-1 shadow-xs hover:bg-[#16654f]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          <div className="space-y-3 pt-1">
            {notes.filter(n => n.noteType === 'Reminder' || n.category === 'Emergency' || n.category === 'Travel Tip').length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-gray-100 rounded-2xl space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#0F5B44] flex items-center justify-center mx-auto">
                  <Bell className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">No Active Reminders</h3>
                <p className="text-xs text-gray-500">Scheduled reminders and alerts will appear here.</p>
                <button
                  onClick={() => handleOpenAddNote('Reminder', 'Travel Tip')}
                  className="px-4 py-2 rounded-xl bg-[#0F5B44] text-white text-xs font-bold"
                >
                  Add Reminder
                </button>
              </div>
            ) : (
              notes
                .filter(n => n.noteType === 'Reminder' || n.category === 'Emergency' || n.category === 'Travel Tip')
                .map(r => (
                  <div
                    key={r.id}
                    onClick={() => {
                      setSelectedNoteId(r.id);
                      setCurrentScreen('details');
                    }}
                    className="p-3.5 rounded-2xl border border-gray-100 hover:bg-gray-50 flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl">🔔</span>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-gray-900 truncate">{r.title}</h4>
                        <p className="text-[10px] text-gray-500 truncate mt-0.5">{r.content}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 shrink-0">
                      {r.category}
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* SCREEN 8: EXPERIENCES */}
      {currentScreen === 'experiences' && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('overview')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-bold text-gray-900">Experiences</h2>
              <p className="text-[11px] text-gray-500">
                {notes.filter(n => n.noteType === 'Experience' || n.category === 'Reflection').length} memories • Special moments
              </p>
            </div>
            <button
              onClick={() => handleOpenAddNote('Experience', 'Reflection')}
              className="w-8 h-8 rounded-full bg-[#0F5B44] text-white flex items-center justify-center"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {['All', 'Darshan', 'Food', 'People', 'Nature'].map(cat => (
              <button
                key={cat}
                onClick={() => setExpCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${
                  expCategoryFilter === cat ? 'bg-[#0F5B44] text-white shadow-xs' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Experiences Card Feed */}
          <div className="space-y-3 pt-1">
            {notes.filter(n => n.noteType === 'Experience' || n.category === 'Reflection').length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-gray-100 rounded-2xl space-y-2">
                <p className="text-xs font-bold text-gray-600">No experiences logged yet</p>
                <p className="text-[11px] text-gray-400">Capture special moments and stories from your journey.</p>
                <button
                  onClick={() => handleOpenAddNote('Experience', 'Reflection')}
                  className="mt-2 px-3 py-1.5 rounded-xl bg-[#0F5B44] text-white text-xs font-bold"
                >
                  Add First Experience
                </button>
              </div>
            ) : (
              notes
                .filter(n => n.noteType === 'Experience' || n.category === 'Reflection')
                .map(exp => (
                  <div
                    key={exp.id}
                    onClick={() => {
                      setSelectedNoteId(exp.id);
                      setCurrentScreen('details');
                    }}
                    className="group cursor-pointer p-3.5 rounded-2xl border border-gray-100 hover:border-[#0F5B44]/30 hover:bg-[#0F5B44]/5 flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl">💜</span>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-gray-900 group-hover:text-[#0F5B44] truncate">{exp.title}</h4>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">{exp.content}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* SCREEN 9: IMPORTANT NOTES */}
      {currentScreen === 'important' && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('overview')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-bold text-gray-900">Important Notes</h2>
              <p className="text-[11px] text-gray-500">
                {notes.filter(n => n.category === 'Emergency' || n.isImportant || n.isPinned).length} important notes
              </p>
            </div>
            <div className="w-8" />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2">
            {['All', 'Emergency', 'Pinned', 'Bookmarks'].map(cat => (
              <button
                key={cat}
                onClick={() => setImportantFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                  importantFilter === cat ? 'bg-[#0F5B44] text-white shadow-xs' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Important Card List */}
          <div className="space-y-2.5 pt-1">
            {notes.filter(n => n.category === 'Emergency' || n.isImportant || n.isPinned).length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-gray-100 rounded-2xl space-y-2">
                <p className="text-xs font-bold text-gray-600">No important notes flagged</p>
                <p className="text-[11px] text-gray-400">Keep emergency contacts, dress codes, or critical information here.</p>
                <button
                  onClick={() => handleOpenAddNote('Daily', 'Emergency')}
                  className="mt-2 px-3 py-1.5 rounded-xl bg-[#0F5B44] text-white text-xs font-bold"
                >
                  Add Important Note
                </button>
              </div>
            ) : (
              notes
                .filter(n => n.category === 'Emergency' || n.isImportant || n.isPinned)
                .map(item => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedNoteId(item.id);
                      setCurrentScreen('details');
                    }}
                    className="p-3.5 rounded-2xl border border-gray-100 hover:bg-gray-50 flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl">🚨</span>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-gray-900 truncate">{item.title}</h4>
                        <p className="text-[10px] text-gray-500 truncate mt-0.5">{item.content}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* SCREEN 10: NOTES MAP VIEW */}
      {currentScreen === 'map' && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('overview')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-bold text-gray-900">Notes Map</h2>
              <p className="text-[11px] text-gray-500">Notes with locations</p>
            </div>
            <button
              onClick={() => showToast('GPS location locked')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600"
            >
              <MapPin className="w-4 h-4 text-[#0F5B44]" />
            </button>
          </div>

          {notes.filter(n => Boolean(n.location)).length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-gray-100 rounded-2xl space-y-3">
              <MapPin className="w-10 h-10 text-gray-300 mx-auto" />
              <h4 className="text-xs font-bold text-gray-700">No Geotagged Notes Yet</h4>
              <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                Add location tags to your notes to view them plotted along your route.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes
                .filter(n => Boolean(n.location))
                .map(item => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedNoteId(item.id);
                      setCurrentScreen('details');
                    }}
                    className="p-3.5 rounded-2xl border border-gray-100 hover:bg-gray-50 flex items-center justify-between cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F5B44]">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{item.location}</span>
                      </div>
                      <h4 className="text-xs font-bold text-gray-900 truncate mt-1">{item.title}</h4>
                      <p className="text-[10px] text-gray-500 truncate">{item.content}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* SCREEN 11: JOURNAL CALENDAR */}
      {currentScreen === 'calendar' && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('overview')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-bold text-gray-900">Journal Calendar</h2>
              <p className="text-[11px] text-gray-500">View notes by date</p>
            </div>
            <div className="w-8" />
          </div>

          {/* Month selector */}
          <div className="flex items-center justify-between px-2 text-xs font-bold text-gray-800">
            <ChevronLeft className="w-4 h-4 text-gray-400 cursor-pointer" />
            <span>November 2026</span>
            <ChevronRight className="w-4 h-4 text-gray-400 cursor-pointer" />
          </div>

          {/* Mini Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-400">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30].map(
              day => {
                const dateStr = `2026-11-${String(day).padStart(2, '0')}`;
                const isSelected = calendarSelectedDate === dateStr;
                const hasNotes = notes.some(n => n.date === dateStr || (n.dayId && days.find(d => d.id === n.dayId)?.date === dateStr));

                return (
                  <button
                    key={day}
                    onClick={() => setCalendarSelectedDate(dateStr)}
                    className={`h-8 rounded-xl flex flex-col items-center justify-center text-xs transition-all relative ${
                      isSelected
                        ? 'bg-[#0F5B44] text-white font-black shadow-xs'
                        : hasNotes
                        ? 'bg-emerald-50 text-[#0F5B44] font-bold border border-emerald-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{day}</span>
                    {hasNotes && !isSelected && (
                      <span className="w-1 h-1 rounded-full bg-[#0F5B44] absolute bottom-1" />
                    )}
                  </button>
                );
              }
            )}
          </div>

          {/* Selected Date Timeline */}
          <div className="pt-2 border-t border-gray-100 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-900">{calendarSelectedDate}</h3>
              <button
                onClick={() => handleOpenAddNote('Daily', 'Reflection')}
                className="text-xs text-[#0F5B44] font-bold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Write Entry</span>
              </button>
            </div>

            {calendarNotes.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-gray-100 rounded-2xl text-xs text-gray-400">
                No journal entries recorded for this date.
              </div>
            ) : (
              <div className="space-y-2">
                {calendarNotes.map(n => (
                  <div
                    key={n.id}
                    onClick={() => {
                      setSelectedNoteId(n.id);
                      setCurrentScreen('details');
                    }}
                    className="p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer"
                  >
                    <h4 className="text-xs font-bold text-gray-900">{n.title}</h4>
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">{n.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SCREEN 12: NOTES SETTINGS */}
      {currentScreen === 'settings' && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('overview')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-bold text-gray-900">Notes Settings</h2>
              <p className="text-[11px] text-gray-500">Display options, categories, export</p>
            </div>
            <div className="w-8" />
          </div>

          {/* Display Preferences */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Display Preferences</h3>
            <div className="divide-y divide-gray-100 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">Show Photos in List</p>
                  <p className="text-[10px] text-gray-400">Display photo previews on notes feed</p>
                </div>
                <input
                  type="checkbox"
                  checked={showPhotosInList}
                  onChange={e => setShowPhotosInList(e.target.checked)}
                  className="w-4 h-4 accent-[#0F5B44]"
                />
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">Show Note Locations</p>
                  <p className="text-[10px] text-gray-400">Include geotag badges on notes</p>
                </div>
                <input
                  type="checkbox"
                  checked={showNoteLocations}
                  onChange={e => setShowNoteLocations(e.target.checked)}
                  className="w-4 h-4 accent-[#0F5B44]"
                />
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">Group by Note Type</p>
                  <p className="text-[10px] text-gray-400">Separate daily notes and memories</p>
                </div>
                <input
                  type="checkbox"
                  checked={groupByType}
                  onChange={e => setGroupByType(e.target.checked)}
                  className="w-4 h-4 accent-[#0F5B44]"
                />
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Data Management</h3>
            <div className="divide-y divide-gray-100 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">Sync with Cloud</p>
                  <p className="text-[10px] text-gray-400">Secure journal sync in Supabase</p>
                </div>
                <input
                  type="checkbox"
                  checked={cloudSyncEnabled}
                  onChange={e => setCloudSyncEnabled(e.target.checked)}
                  className="w-4 h-4 accent-[#0F5B44]"
                />
              </div>
              <div
                onClick={() => showToast('Notes backup created')}
                className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-gray-50"
              >
                <div>
                  <p className="font-semibold text-gray-900">Backup Notes</p>
                  <p className="text-[10px] text-gray-400">Offline Dexie persistence active</p>
                </div>
                <span className="text-gray-400">&gt;</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3D Confirmation Popup for Delete Note */}
      <ConfirmModal
        isOpen={Boolean(noteToDelete)}
        title="Delete Note?"
        message={`Are you sure you want to delete "${noteToDelete?.title || 'this note'}"?\nThis note will be permanently removed.`}
        confirmLabel="Delete Note"
        cancelLabel="Keep Note"
        variant="danger"
        iconType="trash"
        onConfirm={async () => {
          if (noteToDelete) {
            const id = noteToDelete.id;
            setNoteToDelete(null);
            if (onDeleteNote) await onDeleteNote(id);
            showToast('Note deleted');
            setCurrentScreen('all');
          }
        }}
        onCancel={() => setNoteToDelete(null)}
      />
    </div>
  );
};
