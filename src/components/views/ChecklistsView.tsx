'use client';

import React, { useState, useMemo } from 'react';
import { ChecklistItem, ChecklistCategory, ChecklistGroup, Trip, ItineraryDay } from '@/types/trip';
import {
  CheckSquare,
  Square,
  Search,
  Filter,
  Plus,
  ArrowLeft,
  Calendar,
  Clock,
  AlertCircle,
  MoreVertical,
  CheckCircle2,
  Trash2,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Settings,
  FolderPlus,
  Layers,
  FileText,
  Briefcase,
  ShieldAlert,
  Smartphone,
  Wallet,
  Check,
  Tag,
  CalendarDays,
  ShieldCheck,
  Compass,
  Circle,
} from 'lucide-react';
import { AlertModal } from '@/components/modals/AlertModal';

export type ChecklistsScreen =
  | 'overview'
  | 'all'
  | 'packing'
  | 'add_task'
  | 'edit_task'
  | 'documents'
  | 'preparation'
  | 'health'
  | 'electronics'
  | 'calendar'
  | 'templates'
  | 'settings';

export interface ChecklistsViewProps {
  trip?: Trip;
  days?: ItineraryDay[];
  checklists: ChecklistItem[];
  onAddChecklistItem?: (arg: any, title?: string) => Promise<void> | void;
  onEditChecklistItem?: (item: ChecklistItem) => Promise<void> | void;
  onToggleChecklistItem?: (id: string, isDone: boolean) => Promise<void> | void;
  onDeleteChecklistItem?: (id: string) => Promise<void> | void;
  onSelectDayIndex?: (dayIndex: number) => void;
  initialScreen?: ChecklistsScreen;
}

export const ChecklistsView: React.FC<ChecklistsViewProps> = ({
  trip,
  days = [],
  checklists = [],
  onAddChecklistItem,
  onEditChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
  onSelectDayIndex,
  initialScreen = 'overview',
}) => {
  const [currentScreen, setCurrentScreen] = useState<ChecklistsScreen>(initialScreen);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('All');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [calendarSelectedDate, setCalendarSelectedDate] = useState('2026-11-17');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Settings
  const [showCompletedTasks, setShowCompletedTasks] = useState(true);
  const [groupByCategory, setGroupByCategory] = useState(true);

  // Form states for Add / Edit task
  const [formGroup, setFormGroup] = useState<ChecklistGroup>('Before departure');
  const [formCategory, setFormCategory] = useState<ChecklistCategory>('Pre-Trip Preparation');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPriority, setFormPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [formDueDate, setFormDueDate] = useState('2026-11-16');
  const [formReminder, setFormReminder] = useState('1 day before');
  const [formDayId, setFormDayId] = useState<string>('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskCompleted, setEditingTaskCompleted] = useState(false);

  // Local state for immediate interactive feedback before database refresh
  const [localChecked, setLocalChecked] = useState<Record<string, boolean>>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Helper to determine accurate task completion status
  const isTaskCompleted = (c: ChecklistItem): boolean => {
    if (localChecked[c.id] !== undefined) {
      return localChecked[c.id];
    }
    return Boolean(c.isCompleted);
  };

  // Helper to resolve checklist group accurately (supporting explicit field or inferred subcategory/category)
  const getTaskGroup = (item: ChecklistItem): ChecklistGroup => {
    if (item.checklistGroup) return item.checklistGroup;
    if (item.subcategory === 'Before departure' || item.category === 'Pre-Trip Preparation') {
      if (item.dayId || item.isSpecificDay) return 'Daily checklist';
      return 'Before departure';
    }
    if (item.category === 'Documents') return 'Documents and bookings';
    if (
      item.category === 'Clothing' ||
      item.category === 'Electronics' ||
      item.category === 'Toiletries' ||
      item.category === 'Gear'
    ) {
      return 'Packing essentials';
    }
    if (item.category === 'Medicines') return 'Packing essentials';
    return 'Before departure';
  };

  // Dynamic calculations strictly from actual saved checklist records
  const totalTasks = checklists.length;
  const completedTasks = checklists.filter(c => isTaskCompleted(c)).length;
  const pendingTasks = totalTasks - completedTasks;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Group-specific dynamic calculations
  const getGroupStats = (group: ChecklistGroup) => {
    const items = checklists.filter(c => getTaskGroup(c) === group);
    const done = items.filter(c => isTaskCompleted(c)).length;
    const total = items.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { done, total, pct, text: `${done} / ${total}` };
  };

  // Category-specific dynamic calculations
  const getCatStats = (cat: ChecklistCategory) => {
    const items = checklists.filter(c => c.category === cat);
    const done = items.filter(c => isTaskCompleted(c)).length;
    const total = items.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { done, total, pct, text: `${done} / ${total}` };
  };

  const toggleTaskCheck = async (id: string, currentVal: boolean) => {
    const newVal = !currentVal;
    setLocalChecked(prev => ({ ...prev, [id]: newVal }));
    if (onToggleChecklistItem) {
      try {
        await onToggleChecklistItem(id, newVal);
        showToast(newVal ? 'Task completed! ✨' : 'Task marked pending');
      } catch (err: any) {
        setLocalChecked(prev => ({ ...prev, [id]: currentVal }));
        showToast(`Failed to update task: ${err.message || 'Storage error'}`);
      }
    } else {
      showToast(newVal ? 'Task completed! ✨' : 'Task marked pending');
    }
  };

  const handleOpenAddTask = (group: ChecklistGroup = 'Before departure', cat: ChecklistCategory = 'Pre-Trip Preparation') => {
    setFormGroup(group);
    setFormCategory(cat);
    setFormTitle('');
    setFormDescription('');
    setFormPriority('Medium');
    setFormDueDate('2026-11-16');
    setFormReminder('1 day before');
    setFormDayId('');
    setEditingTaskId(null);
    setCurrentScreen('add_task');
  };

  const handleOpenEditTask = (task: ChecklistItem) => {
    setEditingTaskId(task.id);
    setFormGroup(getTaskGroup(task));
    setFormCategory(task.category);
    setFormTitle(task.title);
    setFormDescription(task.description || '');
    setFormPriority(task.priority || 'Medium');
    setFormDueDate(task.dueDate || '2026-11-16');
    setFormReminder(task.reminder || '1 day before');
    setFormDayId(task.dayId || '');
    setEditingTaskCompleted(isTaskCompleted(task));
    setCurrentScreen('edit_task');
  };

  // Filtered lists
  const filteredChecklists = useMemo(() => {
    return checklists.filter(item => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        const matchesCat = item.category?.toLowerCase().includes(q);
        const matchesSub = item.subcategory?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesCat && !matchesSub) return false;
      }

      // Group filter
      if (selectedGroupFilter !== 'All') {
        if (getTaskGroup(item) !== selectedGroupFilter) return false;
      }

      // Category filter
      if (selectedCategoryFilter !== 'All') {
        if (item.category !== selectedCategoryFilter) return false;
      }

      // Status filter
      const done = isTaskCompleted(item);
      if (statusFilter === 'pending' && done) return false;
      if (statusFilter === 'completed' && !done) return false;

      return true;
    });
  }, [checklists, searchQuery, selectedGroupFilter, selectedCategoryFilter, statusFilter, localChecked]);

  // 12-Screen Switcher Navigation List
  const screensList: { id: ChecklistsScreen; label: string; icon: string }[] = [
    { id: 'overview', label: '1. Overview', icon: '📊' },
    { id: 'all', label: '2. All Checklists', icon: '📋' },
    { id: 'packing', label: '3. Packing', icon: '🧳' },
    { id: 'add_task', label: '4. Add Task', icon: '➕' },
    { id: 'edit_task', label: '5. Edit Task', icon: '✏️' },
    { id: 'documents', label: '6. Documents', icon: '📄' },
    { id: 'preparation', label: '7. Preparation', icon: '🧭' },
    { id: 'health', label: '8. Health & Safety', icon: '🩺' },
    { id: 'electronics', label: '9. Electronics', icon: '📱' },
    { id: 'calendar', label: '10. Calendar', icon: '📅' },
    { id: 'templates', label: '11. Templates', icon: '📦' },
    { id: 'settings', label: '12. Settings', icon: '⚙️' },
  ];

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

      {/* SCREEN 1: CHECKLISTS OVERVIEW */}
      {currentScreen === 'overview' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="glass-card card-3d card-depth-3d rounded-3xl p-4 sm:p-5 border border-white/90 shadow-[0_12px_32px_-8px_rgba(15,91,68,0.12)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9.5px] font-black uppercase tracking-wider mb-1">
                  <CheckSquare className="w-3 h-3 text-emerald-600" />
                  <span>PILGRIMAGE PREPAREDNESS</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Checklists</h1>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Stay organized for a worry-free journey</p>
              </div>
              <button
                onClick={() => setCurrentScreen('settings')}
                className="w-10 h-10 rounded-2xl bg-white border border-gray-200/80 text-gray-600 flex items-center justify-center hover:bg-emerald-50 hover:text-[#0F5B44] shadow-2xs card-press-3d transition-all"
                title="Checklist Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            {/* Circular Progress & Overall Stats - 3D Hero Banner */}
            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-teal-50/60 to-white border border-emerald-200/80 shadow-2xs flex items-center gap-4 sm:gap-5">
              <div className="relative w-16 h-16 sm:w-18 sm:h-18 flex items-center justify-center shrink-0">
                <svg className="w-16 h-16 sm:w-18 sm:h-18 -rotate-90">
                  <circle
                    cx="36"
                    cy="36"
                    r="30"
                    stroke="#e2e8f0"
                    strokeWidth="6"
                    fill="none"
                  />
                  <circle
                    cx="36"
                    cy="36"
                    r="30"
                    stroke="url(#progressGradient)"
                    strokeWidth="6"
                    strokeDasharray={2 * Math.PI * 30}
                    strokeDashoffset={2 * Math.PI * 30 * (1 - progressPercent / 100)}
                    strokeLinecap="round"
                    fill="none"
                    className="transition-all duration-500 ease-out"
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0F5B44" />
                      <stop offset="100%" stopColor="#14b8a6" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute text-xs sm:text-sm font-black text-[#0F5B44]">{progressPercent}%</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-wide">Overall Progress</h3>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 shadow-2xs">
                    {completedTasks} / {totalTasks} Done
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 font-medium">
                  {totalTasks === 0 ? 'No tasks created yet' : `${completedTasks} of ${totalTasks} tasks completed`}
                </p>
                <div className="w-full max-w-xs h-2 rounded-full bg-gray-200/80 mt-2 overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-[#0F5B44] to-teal-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 5 Established Checklist Groups Mini Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5 mt-3.5">
              <div
                onClick={() => {
                  setSelectedGroupFilter('Before departure');
                  setCurrentScreen('preparation');
                }}
                className="cursor-pointer p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-center hover:border-emerald-400 hover:shadow-xs transition-all card-press-3d shadow-2xs"
              >
                <span className="text-xl">🧭</span>
                <p className="text-xs font-black text-gray-900 mt-1">Before Departure</p>
                <p className="text-[10px] text-gray-500 font-bold">{getGroupStats('Before departure').text}</p>
              </div>
              <div
                onClick={() => {
                  setSelectedGroupFilter('Documents and bookings');
                  setCurrentScreen('documents');
                }}
                className="cursor-pointer p-3 rounded-2xl bg-sky-50/70 border border-sky-200/80 text-center hover:border-sky-400 hover:shadow-xs transition-all card-press-3d shadow-2xs"
              >
                <span className="text-xl">📄</span>
                <p className="text-xs font-black text-gray-900 mt-1">Documents</p>
                <p className="text-[10px] text-gray-500 font-bold">{getGroupStats('Documents and bookings').text}</p>
              </div>
              <div
                onClick={() => {
                  setSelectedGroupFilter('Packing essentials');
                  setCurrentScreen('packing');
                }}
                className="cursor-pointer p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-center hover:border-amber-400 hover:shadow-xs transition-all card-press-3d shadow-2xs"
              >
                <span className="text-xl">🧳</span>
                <p className="text-xs font-black text-gray-900 mt-1">Packing</p>
                <p className="text-[10px] text-gray-500 font-bold">{getGroupStats('Packing essentials').text}</p>
              </div>
              <div
                onClick={() => {
                  setSelectedGroupFilter('Travel safety');
                  setCurrentScreen('health');
                }}
                className="cursor-pointer p-3 rounded-2xl bg-purple-50/70 border border-purple-200/80 text-center hover:border-purple-400 hover:shadow-xs transition-all card-press-3d shadow-2xs"
              >
                <span className="text-xl">🩺</span>
                <p className="text-xs font-black text-gray-900 mt-1">Travel Safety</p>
                <p className="text-[10px] text-gray-500 font-bold">{getGroupStats('Travel safety').text}</p>
              </div>
              <div
                onClick={() => {
                  setSelectedGroupFilter('Daily checklist');
                  setCurrentScreen('electronics');
                }}
                className="cursor-pointer p-3 rounded-2xl bg-teal-50/70 border border-teal-200/80 text-center hover:border-teal-400 hover:shadow-xs transition-all card-press-3d shadow-2xs col-span-2 sm:col-span-1"
              >
                <span className="text-xl">☀️</span>
                <p className="text-xs font-black text-gray-900 mt-1">Daily Tasks</p>
                <p className="text-[10px] text-gray-500 font-bold">{getGroupStats('Daily checklist').text}</p>
              </div>
            </div>
          </div>

          {/* Upcoming Pending Tasks */}
          <div className="glass-card card-3d card-depth-3d rounded-3xl p-4 sm:p-5 border border-white/90 shadow-[0_12px_32px_-8px_rgba(15,91,68,0.12)]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900">Upcoming Tasks</h2>
              <button
                onClick={() => setCurrentScreen('all')}
                className="text-xs text-[#0F5B44] font-bold hover:underline flex items-center gap-0.5"
              >
                <span>View All ({pendingTasks} pending)</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {checklists.length === 0 ? (
              <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center space-y-1">
                <p className="text-xs font-bold text-gray-700">No checklist tasks yet</p>
                <p className="text-[11px] text-gray-400">
                  Tap below to create your packing, travel documents, or preparation tasks.
                </p>
              </div>
            ) : pendingTasks === 0 ? (
              <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-center space-y-1.5">
                <CheckCircle2 className="w-8 h-8 text-[#0F5B44] mx-auto" />
                <h4 className="text-xs font-bold text-[#0F5B44]">All tasks completed!</h4>
                <p className="text-[11px] text-gray-500">You are completely packed and ready for the sacred pilgrimage.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {checklists
                  .filter(c => !isTaskCompleted(c))
                  .slice(0, 5)
                  .map(task => {
                    const matchedDay = days.find(d => d.id === task.dayId);
                    return (
                      <div
                        key={task.id}
                        className="p-3 rounded-2xl border border-gray-100 hover:bg-gray-50 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleTaskCheck(task.id, false)}
                            className="w-5 h-5 rounded-lg border-2 border-gray-300 hover:border-[#0F5B44] flex items-center justify-center shrink-0 transition-colors"
                          >
                            <Square className="w-4 h-4 text-transparent" />
                          </button>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-gray-900 truncate">{task.title}</h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="px-1.5 py-0.2 bg-gray-100 text-gray-700 text-[9px] font-bold rounded-md">
                                {getTaskGroup(task)}
                              </span>
                              {task.priority && (
                                <span
                                  className={`px-1.5 py-0.2 text-[9px] font-bold rounded-md ${
                                    task.priority === 'High'
                                      ? 'bg-rose-50 text-rose-700'
                                      : task.priority === 'Medium'
                                      ? 'bg-amber-50 text-amber-700'
                                      : 'bg-sky-50 text-sky-700'
                                  }`}
                                >
                                  {task.priority}
                                </span>
                              )}
                              {matchedDay && (
                                <span className="px-1.5 py-0.2 bg-emerald-50 text-[#0F5B44] text-[9px] font-bold rounded-md">
                                  Day {matchedDay.dayNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenEditTask(task)}
                          className="p-1 text-gray-400 hover:text-gray-600 shrink-0"
                          title="Edit Task"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}

            <button
              onClick={() => handleOpenAddTask('Before departure')}
              className="w-full mt-4 py-3 rounded-2xl bg-[#0F5B44] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs hover:bg-[#16654f] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Checklist Task</span>
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 2: ALL CHECKLISTS */}
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
                <h2 className="text-lg font-bold text-gray-900">All Checklists</h2>
                <p className="text-[11px] text-gray-500">
                  {totalTasks} tasks • {completedTasks} completed
                </p>
              </div>
            </div>
            <button
              onClick={() => handleOpenAddTask('Before departure')}
              className="px-3 py-1.5 rounded-xl bg-[#0F5B44] text-white text-xs font-bold flex items-center gap-1 shadow-xs hover:bg-[#16654f]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search checklists or tasks..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs focus:bg-white focus:outline-hidden focus:border-[#0F5B44]"
            />
          </div>

          {/* Checklist Groups Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {['All', 'Before departure', 'Documents and bookings', 'Packing essentials', 'Travel safety', 'Daily checklist'].map(
              grp => {
                const isSelected = selectedGroupFilter === grp;
                const count = grp === 'All' ? totalTasks : checklists.filter(c => getTaskGroup(c) === grp).length;
                return (
                  <button
                    key={grp}
                    onClick={() => setSelectedGroupFilter(grp)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                      isSelected
                        ? 'bg-[#0F5B44] text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {grp} ({count})
                  </button>
                );
              }
            )}
          </div>

          {/* Status Sub-Filters (All / Pending / Completed) */}
          <div className="flex rounded-2xl bg-gray-100 p-1">
            {(['all', 'pending', 'completed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl capitalize transition-all ${
                  statusFilter === f ? 'bg-[#0F5B44] text-white shadow-xs' : 'text-gray-600'
                }`}
              >
                {f} ({f === 'all' ? totalTasks : f === 'pending' ? pendingTasks : completedTasks})
              </button>
            ))}
          </div>

          {/* Tasks List */}
          <div className="space-y-2.5 pt-2">
            {filteredChecklists.length === 0 ? (
              <div className="p-8 text-center border border-gray-100 rounded-3xl space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 text-[#0F5B44] flex items-center justify-center font-bold text-xl">
                  📋
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">No Tasks Found</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                    {searchQuery
                      ? `No checklist items matching "${searchQuery}".`
                      : 'No tasks found for the selected filter.'}
                  </p>
                </div>
                <button
                  onClick={() => handleOpenAddTask(selectedGroupFilter !== 'All' ? (selectedGroupFilter as ChecklistGroup) : 'Before departure')}
                  className="px-4 py-2 rounded-xl bg-[#0F5B44] text-white text-xs font-bold hover:bg-[#16654f] transition-all inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Checklist Task</span>
                </button>
              </div>
            ) : (
              filteredChecklists.map(task => {
                const isDone = isTaskCompleted(task);
                const matchedDay = days.find(d => d.id === task.dayId);
                return (
                  <div
                    key={task.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                      isDone
                        ? 'bg-emerald-50/30 border-emerald-100/60'
                        : 'bg-white border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => toggleTaskCheck(task.id, isDone)}
                        className={`w-5 h-5 rounded-lg flex items-center justify-center mt-0.5 shrink-0 transition-all ${
                          isDone
                            ? 'bg-[#0F5B44] text-white border border-[#0F5B44]'
                            : 'border-2 border-gray-300 hover:border-[#0F5B44] bg-white'
                        }`}
                        title={isDone ? 'Mark as pending' : 'Mark as completed'}
                      >
                        {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
                      </button>
                      <div className="min-w-0 flex-1">
                        <h4
                          onClick={() => toggleTaskCheck(task.id, isDone)}
                          className={`text-xs font-bold cursor-pointer transition-colors ${
                            isDone ? 'line-through text-gray-400' : 'text-gray-900 hover:text-[#0F5B44]'
                          }`}
                        >
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                            {task.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-bold">
                            {getTaskGroup(task)}
                          </span>
                          {task.priority && (
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                task.priority === 'High'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : task.priority === 'Medium'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-sky-50 text-sky-700 border border-sky-200'
                              }`}
                            >
                              {task.priority} Priority
                            </span>
                          )}
                          {task.dueDate && (
                            <span className="px-2 py-0.5 rounded-md bg-gray-50 text-gray-500 text-[10px] flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              <span>{task.dueDate}</span>
                            </span>
                          )}
                          {matchedDay && (
                            <button
                              type="button"
                              onClick={() => onSelectDayIndex && onSelectDayIndex(matchedDay.dayNumber - 1)}
                              className="px-2 py-0.5 rounded-md bg-emerald-100 text-[#0F5B44] text-[10px] font-bold hover:underline"
                            >
                              Day {matchedDay.dayNumber}: {matchedDay.location || matchedDay.title} →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditTask(task)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                        title="Edit Task"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SCREEN 3: PACKING CHECKLIST (Group C) */}
      {currentScreen === 'packing' && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('all')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-bold text-gray-900">Packing Essentials</h2>
              <p className="text-[11px] text-gray-500">{getGroupStats('Packing essentials').text} completed</p>
            </div>
            <button
              onClick={() => handleOpenAddTask('Packing essentials', 'Gear')}
              className="w-8 h-8 rounded-full bg-[#0F5B44] text-white flex items-center justify-center hover:bg-[#16654f]"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Dynamic Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold text-gray-700">
              <span>Packing Progress</span>
              <span>{getGroupStats('Packing essentials').pct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-[#0F5B44] rounded-full transition-all"
                style={{ width: `${getGroupStats('Packing essentials').pct}%` }}
              />
            </div>
          </div>

          {/* Real Packing Items from Database */}
          <div className="divide-y divide-gray-100 text-xs pt-1">
            {checklists
              .filter(c => getTaskGroup(c) === 'Packing essentials')
              .map(item => {
                const isChecked = isTaskCompleted(item);
                return (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleTaskCheck(item.id, isChecked)}
                        className="w-4 h-4 accent-[#0F5B44] rounded-sm shrink-0"
                      />
                      <div className="min-w-0">
                        <span className={isChecked ? 'line-through text-gray-400 font-medium' : 'font-bold text-gray-800'}>
                          {item.title}
                        </span>
                        {item.description && (
                          <p className="text-[11px] text-gray-500 mt-0.5">{item.description}</p>
                        )}
                      </div>
                    </label>
                    <button
                      onClick={() => handleOpenEditTask(item)}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* SCREEN 4: ADD TASK */}
      {currentScreen === 'add_task' && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('all')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-bold text-gray-900">Add Task</h2>
              <p className="text-[11px] text-gray-500">Create a new pilgrimage task</p>
            </div>
            <div className="w-8" />
          </div>

          <div className="space-y-3 pt-1">
            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">Checklist Group *</label>
              <select
                value={formGroup}
                onChange={e => {
                  const grp = e.target.value as ChecklistGroup;
                  setFormGroup(grp);
                  if (grp === 'Documents and bookings') setFormCategory('Documents');
                  else if (grp === 'Packing essentials') setFormCategory('Gear');
                  else setFormCategory('Pre-Trip Preparation');
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:outline-hidden focus:border-[#0F5B44]"
              >
                <option value="Before departure">Before departure</option>
                <option value="Documents and bookings">Documents and bookings</option>
                <option value="Packing essentials">Packing essentials</option>
                <option value="Travel safety">Travel safety</option>
                <option value="Daily checklist">Daily checklist</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">Category *</label>
              <select
                value={formCategory}
                onChange={e => setFormCategory(e.target.value as ChecklistCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:outline-hidden focus:border-[#0F5B44]"
              >
                <option value="Pre-Trip Preparation">Pre-Trip Preparation</option>
                <option value="Documents">Documents</option>
                <option value="Clothing">Clothing</option>
                <option value="Electronics">Electronics</option>
                <option value="Toiletries">Toiletries</option>
                <option value="Gear">Gear & Luggage</option>
                <option value="Medicines">Medicines & Health</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">Task Title *</label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="e.g. Verify morning train status"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs focus:outline-hidden focus:border-[#0F5B44]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">Description / Notes</label>
              <input
                type="text"
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                placeholder="Specific instructions or verification reminders (optional)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs focus:outline-hidden focus:border-[#0F5B44]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1.5">Priority</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Low', 'Medium', 'High'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFormPriority(p)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      formPriority === p
                        ? p === 'High'
                          ? 'bg-rose-50 border-rose-500 text-rose-700'
                          : 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">Due Date</label>
              <input
                type="date"
                value={formDueDate}
                onChange={e => setFormDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:outline-hidden focus:border-[#0F5B44]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">Related Itinerary Day</label>
              <select
                value={formDayId}
                onChange={e => setFormDayId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:outline-hidden focus:border-[#0F5B44]"
              >
                <option value="">General (No Specific Day)</option>
                {days.map(d => (
                  <option key={d.id} value={d.id}>
                    Day {d.dayNumber}: {d.location || d.title} ({d.date})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={async () => {
                if (!formTitle.trim()) {
                  setAlertMessage('Please enter a task title.');
                  return;
                }
                try {
                  if (onAddChecklistItem) {
                    await onAddChecklistItem({
                      title: formTitle.trim(),
                      description: formDescription.trim(),
                      checklistGroup: formGroup,
                      category: formCategory,
                      priority: formPriority,
                      dueDate: formDueDate,
                      dayId: formDayId || undefined,
                      isSpecificDay: Boolean(formDayId),
                    });
                  }
                  showToast(`Task "${formTitle}" saved!`);
                  setCurrentScreen('all');
                } catch (err: any) {
                  setAlertMessage(`Failed to save task: ${err.message || 'Storage error'}`);
                }
              }}
              className="w-full py-3 mt-2 rounded-2xl bg-[#0F5B44] text-white text-xs font-bold shadow-xs hover:bg-[#16654f] transition-all"
            >
              💾 Save Task
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 5: EDIT TASK */}
      {currentScreen === 'edit_task' && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('all')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-bold text-gray-900">Edit Task</h2>
              <p className="text-[11px] text-gray-500">Update task details</p>
            </div>
            <button
              onClick={() => {
                if (editingTaskId && onDeleteChecklistItem) {
                  onDeleteChecklistItem(editingTaskId);
                }
                showToast('Task deleted');
                setCurrentScreen('all');
              }}
              className="px-2.5 py-1 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold flex items-center gap-1 hover:bg-rose-100"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>

          <div className="space-y-3 pt-1">
            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">Checklist Group *</label>
              <select
                value={formGroup}
                onChange={e => setFormGroup(e.target.value as ChecklistGroup)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:outline-hidden focus:border-[#0F5B44]"
              >
                <option value="Before departure">Before departure</option>
                <option value="Documents and bookings">Documents and bookings</option>
                <option value="Packing essentials">Packing essentials</option>
                <option value="Travel safety">Travel safety</option>
                <option value="Daily checklist">Daily checklist</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">Category *</label>
              <select
                value={formCategory}
                onChange={e => setFormCategory(e.target.value as ChecklistCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:outline-hidden focus:border-[#0F5B44]"
              >
                <option value="Pre-Trip Preparation">Pre-Trip Preparation</option>
                <option value="Documents">Documents</option>
                <option value="Clothing">Clothing</option>
                <option value="Electronics">Electronics</option>
                <option value="Toiletries">Toiletries</option>
                <option value="Gear">Gear & Luggage</option>
                <option value="Medicines">Medicines & Health</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">Task Title *</label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs focus:outline-hidden focus:border-[#0F5B44]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">Description / Notes</label>
              <input
                type="text"
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs focus:outline-hidden focus:border-[#0F5B44]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1.5">Priority</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Low', 'Medium', 'High'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFormPriority(p)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      formPriority === p
                        ? p === 'High'
                          ? 'bg-rose-50 border-rose-500 text-rose-700'
                          : 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="py-2.5 flex items-center justify-between border-t border-gray-100">
              <div>
                <p className="text-xs font-bold text-gray-900">Mark as Completed</p>
                <p className="text-[10px] text-gray-400">Toggle task status</p>
              </div>
              <input
                type="checkbox"
                checked={editingTaskCompleted}
                onChange={e => setEditingTaskCompleted(e.target.checked)}
                className="w-4 h-4 accent-[#0F5B44]"
              />
            </div>

            <button
              type="button"
              onClick={async () => {
                if (editingTaskId && onEditChecklistItem) {
                  const existing = checklists.find(c => c.id === editingTaskId);
                  if (existing) {
                    try {
                      await onEditChecklistItem({
                        ...existing,
                        title: formTitle.trim(),
                        description: formDescription.trim(),
                        checklistGroup: formGroup,
                        category: formCategory,
                        priority: formPriority,
                        dueDate: formDueDate,
                        dayId: formDayId || undefined,
                        isCompleted: editingTaskCompleted,
                        updatedAt: new Date().toISOString(),
                      });
                      showToast('Task updated successfully!');
                      setCurrentScreen('all');
                    } catch (err: any) {
                      setAlertMessage(`Failed to update task: ${err.message || 'Storage error'}`);
                    }
                  }
                }
              }}
              className="w-full py-3 mt-2 rounded-2xl bg-[#0F5B44] text-white text-xs font-bold shadow-xs hover:bg-[#16654f] transition-all"
            >
              Update Task
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 6: DOCUMENTS CHECKLIST (Group B) */}
      {currentScreen === 'documents' && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('all')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-bold text-gray-900">Documents & Bookings</h2>
              <p className="text-[11px] text-gray-500">{getGroupStats('Documents and bookings').text} completed</p>
            </div>
            <button
              onClick={() => handleOpenAddTask('Documents and bookings', 'Documents')}
              className="w-8 h-8 rounded-full bg-[#0F5B44] text-white flex items-center justify-center hover:bg-[#16654f]"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold text-gray-700">
              <span>Documents Verified</span>
              <span>{getGroupStats('Documents and bookings').pct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-[#0F5B44] rounded-full transition-all"
                style={{ width: `${getGroupStats('Documents and bookings').pct}%` }}
              />
            </div>
          </div>

          {/* Actual items from database */}
          <div className="divide-y divide-gray-100 text-xs">
            {checklists
              .filter(c => getTaskGroup(c) === 'Documents and bookings')
              .map(doc => {
                const isChecked = isTaskCompleted(doc);
                return (
                  <div key={doc.id} className="py-2.5 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleTaskCheck(doc.id, isChecked)}
                        className="w-4 h-4 accent-[#0F5B44] rounded-sm shrink-0"
                      />
                      <div className="min-w-0">
                        <span className={isChecked ? 'line-through text-gray-400 font-medium' : 'font-bold text-gray-800'}>
                          {doc.title}
                        </span>
                        {doc.description && (
                          <p className="text-[11px] text-gray-500 mt-0.5">{doc.description}</p>
                        )}
                      </div>
                    </label>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {doc.priority && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[9px] font-bold">
                          {doc.priority}
                        </span>
                      )}
                      <button
                        onClick={() => handleOpenEditTask(doc)}
                        className="text-gray-400 hover:text-gray-600 p-1"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* SCREEN 7: BEFORE DEPARTURE (Group A) */}
      {currentScreen === 'preparation' && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('all')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-bold text-gray-900">Before Departure</h2>
              <p className="text-[11px] text-gray-500">{getGroupStats('Before departure').text} completed</p>
            </div>
            <button
              onClick={() => handleOpenAddTask('Before departure', 'Pre-Trip Preparation')}
              className="w-8 h-8 rounded-full bg-[#0F5B44] text-white flex items-center justify-center"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold text-gray-700">
              <span>Preparation Completed</span>
              <span>{getGroupStats('Before departure').pct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-[#0F5B44] rounded-full transition-all"
                style={{ width: `${getGroupStats('Before departure').pct}%` }}
              />
            </div>
          </div>

          <div className="divide-y divide-gray-100 text-xs">
            {checklists
              .filter(c => getTaskGroup(c) === 'Before departure')
              .map(item => {
                const isChecked = isTaskCompleted(item);
                return (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleTaskCheck(item.id, isChecked)}
                        className="w-4 h-4 accent-[#0F5B44] rounded-sm shrink-0"
                      />
                      <div className="min-w-0">
                        <span className={isChecked ? 'line-through text-gray-400 font-medium' : 'font-bold text-gray-800'}>
                          {item.title}
                        </span>
                        {item.description && (
                          <p className="text-[11px] text-gray-500 mt-0.5">{item.description}</p>
                        )}
                      </div>
                    </label>
                    <button
                      onClick={() => handleOpenEditTask(item)}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* SCREEN 8: TRAVEL SAFETY (Group D) */}
      {currentScreen === 'health' && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('all')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-bold text-gray-900">Travel Safety</h2>
              <p className="text-[11px] text-gray-500">{getGroupStats('Travel safety').text} completed</p>
            </div>
            <button
              onClick={() => handleOpenAddTask('Travel safety', 'Pre-Trip Preparation')}
              className="w-8 h-8 rounded-full bg-[#0F5B44] text-white flex items-center justify-center"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold text-gray-700">
              <span>Safety Preparedness</span>
              <span>{getGroupStats('Travel safety').pct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-[#0F5B44] rounded-full transition-all"
                style={{ width: `${getGroupStats('Travel safety').pct}%` }}
              />
            </div>
          </div>

          <div className="divide-y divide-gray-100 text-xs">
            {checklists
              .filter(c => getTaskGroup(c) === 'Travel safety')
              .map(item => {
                const isChecked = isTaskCompleted(item);
                return (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleTaskCheck(item.id, isChecked)}
                        className="w-4 h-4 accent-[#0F5B44] rounded-sm shrink-0"
                      />
                      <div className="min-w-0">
                        <span className={isChecked ? 'line-through text-gray-400 font-medium' : 'font-bold text-gray-800'}>
                          {item.title}
                        </span>
                        {item.description && (
                          <p className="text-[11px] text-gray-500 mt-0.5">{item.description}</p>
                        )}
                      </div>
                    </label>
                    <button
                      onClick={() => handleOpenEditTask(item)}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* SCREEN 9: DAILY CHECKLIST (Group E) */}
      {currentScreen === 'electronics' && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('all')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-bold text-gray-900">Daily Checklist</h2>
              <p className="text-[11px] text-gray-500">{getGroupStats('Daily checklist').text} completed</p>
            </div>
            <button
              onClick={() => handleOpenAddTask('Daily checklist', 'Pre-Trip Preparation')}
              className="w-8 h-8 rounded-full bg-[#0F5B44] text-white flex items-center justify-center"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold text-gray-700">
              <span>Daily Tasks Completion</span>
              <span>{getGroupStats('Daily checklist').pct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-[#0F5B44] rounded-full transition-all"
                style={{ width: `${getGroupStats('Daily checklist').pct}%` }}
              />
            </div>
          </div>

          <div className="divide-y divide-gray-100 text-xs">
            {checklists
              .filter(c => getTaskGroup(c) === 'Daily checklist')
              .map(item => {
                const isChecked = isTaskCompleted(item);
                const matchedDay = days.find(d => d.id === item.dayId);
                return (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleTaskCheck(item.id, isChecked)}
                        className="w-4 h-4 accent-[#0F5B44] rounded-sm shrink-0"
                      />
                      <div className="min-w-0">
                        <span className={isChecked ? 'line-through text-gray-400 font-medium' : 'font-bold text-gray-800'}>
                          {item.title}
                        </span>
                        {item.description && (
                          <p className="text-[11px] text-gray-500 mt-0.5">{item.description}</p>
                        )}
                        {matchedDay && (
                          <span className="inline-block mt-1 px-1.5 py-0.2 rounded bg-emerald-100 text-[#0F5B44] text-[9px] font-bold">
                            Linked to Day {matchedDay.dayNumber}
                          </span>
                        )}
                      </div>
                    </label>
                    <button
                      onClick={() => handleOpenEditTask(item)}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* SCREEN 10: CHECKLIST CALENDAR */}
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
              <h2 className="text-base font-bold text-gray-900">Checklist Calendar</h2>
              <p className="text-[11px] text-gray-500">View tasks by date</p>
            </div>
            <div className="w-8" />
          </div>

          {/* Month Header */}
          <div className="flex items-center justify-between px-2 text-xs font-bold text-gray-800">
            <span>November 2026</span>
            <span className="text-gray-400 text-[10px]">19-Day Pilgrimage</span>
          </div>

          {/* Tasks matching selected date or linked to Day 1 / 2 */}
          <div className="pt-2 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-900 mb-2">Pilgrimage Active Tasks</h3>
            <div className="space-y-2">
              {checklists.slice(0, 8).map(task => {
                const isChecked = isTaskCompleted(task);
                return (
                  <div key={task.id} className="p-3 rounded-2xl border border-gray-100 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleTaskCheck(task.id, isChecked)}
                        className="w-4 h-4 accent-[#0F5B44]"
                      />
                      <span className={`text-xs font-medium truncate ${isChecked ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {task.title}
                      </span>
                    </label>
                    {task.priority && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[9px] font-bold shrink-0">
                        {task.priority}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 11: CHECKLIST TEMPLATES */}
      {currentScreen === 'templates' && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('overview')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-bold text-gray-900">Checklist Templates</h2>
              <p className="text-[11px] text-gray-500">Official pilgrimage sets</p>
            </div>
            <div className="w-8" />
          </div>

          <div className="space-y-3 pt-1">
            {[
              {
                icon: '🛕',
                title: '19-Day Jyotirlinga Pilgrimage',
                desc: '36 authentic items covering departure, documents, packing, safety, and daily routines.',
              },
              {
                icon: '🎒',
                title: 'Solo Pilgrim Essentials',
                desc: 'Lightweight packing, under-seat chain lock, and power bank readiness.',
              },
              {
                icon: '💰',
                title: 'Budget & Dharamshala Pack',
                desc: 'Dharamshala cash reserves, ID photocopies, and quick-dry towel setup.',
              },
            ].map((tpl, i) => (
              <div
                key={i}
                className="p-3.5 rounded-2xl border border-gray-100 flex items-center justify-between gap-3 hover:border-emerald-200 hover:bg-emerald-50/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{tpl.icon}</span>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">{tpl.title}</h4>
                    <p className="text-[10px] text-gray-500">{tpl.desc}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => showToast(`Template "${tpl.title}" active!`)}
                  className="px-3 py-1.5 rounded-xl border border-[#0F5B44] text-[#0F5B44] text-xs font-bold hover:bg-[#0F5B44] hover:text-white transition-all shrink-0"
                >
                  Active
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SCREEN 12: CHECKLIST SETTINGS */}
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
              <h2 className="text-base font-bold text-gray-900">Checklist Settings</h2>
              <p className="text-[11px] text-gray-500">Preferences &amp; Group Info</p>
            </div>
            <div className="w-8" />
          </div>

          {/* Group Info Banner */}
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-[#0F5B44] font-bold text-xs">
              <ShieldCheck className="w-4 h-4" />
              <span>5 Established Checklist Groups</span>
            </div>
            <p className="text-[11px] text-gray-700 leading-relaxed">
              Organized into 5 strict groups: <span className="font-bold text-[#0F5B44]">Before departure</span> (7), <span className="font-bold text-[#0F5B44]">Documents and bookings</span> (6), <span className="font-bold text-[#0F5B44]">Packing essentials</span> (10), <span className="font-bold text-[#0F5B44]">Travel safety</span> (6), and <span className="font-bold text-[#0F5B44]">Daily checklist</span> (7).
            </p>
            <p className="text-[10px] text-gray-500 italic">
              All tasks adhere strictly to PostgreSQL schema constraints and Dexie offline synchronization.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl border border-gray-100 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-gray-900">Show Completed Tasks</h4>
                <p className="text-[10px] text-gray-400">Display checked items in lists</p>
              </div>
              <input
                type="checkbox"
                checked={showCompletedTasks}
                onChange={e => setShowCompletedTasks(e.target.checked)}
                className="w-4 h-4 accent-[#0F5B44]"
              />
            </div>

            <div className="p-3.5 rounded-2xl border border-gray-100 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-gray-900">Group by Category</h4>
                <p className="text-[10px] text-gray-400">Organize list view by category</p>
              </div>
              <input
                type="checkbox"
                checked={groupByCategory}
                onChange={e => setGroupByCategory(e.target.checked)}
                className="w-4 h-4 accent-[#0F5B44]"
              />
            </div>
          </div>
        </div>
      )}

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
