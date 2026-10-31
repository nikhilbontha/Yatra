'use client';

import React from 'react';
import {
  Trip,
  ItineraryDay,
  Place,
  AccommodationStay,
  TransportLeg,
  ChecklistItem,
  TripNote,
} from '@/types/trip';
import { MoreSubTab } from '@/components/Navigation';
import { PlacesView, PlacesScreen } from '@/components/views/PlacesView';
import { ChecklistsView } from '@/components/views/ChecklistsView';
import { NotesView } from '@/components/views/NotesView';
import { SettingsCloudView } from '@/components/views/SettingsCloudView';
import { AccommodationView } from '@/components/views/AccommodationView';
import { CloudRowCounts } from '@/lib/sync';
import {
  Compass,
  CheckSquare,
  FileText,
  Settings,
  BedDouble,
  ShieldCheck,
  Train,
} from 'lucide-react';

interface MoreViewProps {
  trip: Trip;
  days?: ItineraryDay[];
  places: Place[];
  accommodations: AccommodationStay[];
  transportLegs: TransportLeg[];
  checklists: ChecklistItem[];
  notes: TripNote[];
  activeSubTab: MoreSubTab;
  initialSelectedPlaceId?: string;
  initialPlacesScreen?: PlacesScreen;
  onSubTabChange: (tab: MoreSubTab) => void;
  onSelectDayIndex?: (dayIndex: number) => void;
  onAddStay?: () => void;
  onEditStay?: (stay: AccommodationStay) => void;
  onSaveStay?: (stay: Partial<AccommodationStay>) => Promise<void> | void;
  onDeleteStay?: (stayId: string) => Promise<void> | void;
  onAddNote?: (note?: Partial<TripNote>) => Promise<void> | void;
  onEditNote?: (note: TripNote) => Promise<void> | void;
  onDeleteNote?: (noteId: string) => Promise<void> | void;
  onAddChecklistItem?: (arg: any) => Promise<void> | void;
  onEditChecklistItem?: (item: ChecklistItem) => Promise<void> | void;
  onToggleChecklistItem?: (id: string, isDone: boolean) => Promise<void> | void;
  onDeleteChecklistItem?: (id: string) => Promise<void> | void;
  onExportBackup?: () => void;
  onRestoreBackup?: (file: File) => void;
  onSaveCloudSettings?: (url: string, key: string, email?: string, password?: string, mode?: 'sign_in' | 'sign_up') => Promise<void>;
  onCloudSignOut?: () => Promise<void>;
  cloudUser?: any;
  isCloudConnected?: boolean;
  syncStatus?: 'signed_out' | 'syncing' | 'synced' | 'offline' | 'failed';
  syncMessage?: string;
  cloudRowCounts?: CloudRowCounts | null;
  lastSyncedAt?: string | null;
  isSyncing?: boolean;
  pendingSyncCount?: number;
  isOnline?: boolean;
  onSync?: () => void;
  onResetData?: () => void;
  onSavePlace?: (place: Partial<Place>) => Promise<void> | void;
  onDeletePlace?: (id: string) => Promise<void> | void;
  onCleanDataReset?: () => void;
}

export const MoreView: React.FC<MoreViewProps> = ({
  trip,
  days,
  places,
  accommodations,
  transportLegs,
  checklists,
  notes,
  activeSubTab,
  initialSelectedPlaceId,
  initialPlacesScreen,
  onSubTabChange,
  onSelectDayIndex,
  onAddStay,
  onEditStay,
  onSaveStay,
  onDeleteStay,
  onAddNote,
  onEditNote,
  onDeleteNote,
  onAddChecklistItem,
  onEditChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
  onExportBackup,
  onRestoreBackup,
  onSaveCloudSettings,
  onCloudSignOut,
  cloudUser,
  isCloudConnected = false,
  syncStatus = 'signed_out',
  syncMessage,
  cloudRowCounts,
  lastSyncedAt,
  isSyncing = false,
  pendingSyncCount = 0,
  isOnline = true,
  onSync = () => {},
  onResetData,
  onSavePlace,
  onDeletePlace,
  onCleanDataReset,
}) => {
  const subTabs = [
    { id: 'places' as MoreSubTab, label: 'Places & Temples', icon: Compass, count: places.length },
    { id: 'checklists' as MoreSubTab, label: 'Checklists', icon: CheckSquare, count: checklists.length },
    { id: 'notes' as MoreSubTab, label: 'Notes & Journal', icon: FileText, count: notes.length },
    { id: 'settings' as MoreSubTab, label: 'Cloud & Settings', icon: Settings },
    { id: 'accommodation' as MoreSubTab, label: 'Stays & Hotels', icon: BedDouble, count: accommodations.length },
    { id: 'backup' as MoreSubTab, label: 'Backups', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-4">
      {/* Top Module Subtabs Bar - 3D Glass Elevation */}
      <div className="glass-card card-3d card-depth-3d rounded-2xl p-1.5 sm:p-2 border border-white/90 shadow-[0_10px_28px_-6px_rgba(15,91,68,0.1)] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {subTabs.map(tab => {
          const isActive =
            activeSubTab === tab.id ||
            (tab.id === 'settings' && activeSubTab === 'backup') ||
            (tab.id === 'backup' && activeSubTab === 'settings' && false);
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onSubTabChange(tab.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all card-press-3d ${
                isActive
                  ? 'bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white shadow-md shadow-emerald-950/25 ring-1 ring-emerald-300/50 scale-[1.02]'
                  : 'bg-white/80 text-gray-700 hover:text-[#0F5B44] hover:bg-emerald-50/70 border border-gray-100 shadow-2xs'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300 stroke-[2.4]' : 'text-emerald-700 stroke-[2]'}`} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                    isActive ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SUB-VIEW 1: PLACES & TEMPLES (All 12 Screens from Image 1) */}
      {activeSubTab === 'places' && (
        <PlacesView
          trip={trip}
          days={days}
          places={places}
          initialScreen={initialPlacesScreen || 'overview'}
          initialSelectedPlaceId={initialSelectedPlaceId}
          onAddPlace={onSavePlace}
          onEditPlace={onSavePlace}
          onDeletePlace={onDeletePlace}
          onSelectDayIndex={onSelectDayIndex}
        />
      )}

      {/* SUB-VIEW 2: CHECKLISTS (All 12 Screens from Image 2) */}
      {activeSubTab === 'checklists' && (
        <ChecklistsView
          trip={trip}
          days={days}
          checklists={checklists}
          onAddChecklistItem={onAddChecklistItem}
          onEditChecklistItem={onEditChecklistItem}
          onToggleChecklistItem={onToggleChecklistItem}
          onDeleteChecklistItem={onDeleteChecklistItem}
          onSelectDayIndex={onSelectDayIndex}
        />
      )}

      {/* SUB-VIEW 3: NOTES & JOURNAL (All 12 Screens from Image 3) */}
      {activeSubTab === 'notes' && (
        <NotesView
          trip={trip}
          days={days}
          notes={notes}
          onAddNote={async noteData => {
            if (onAddNote) await onAddNote(noteData);
          }}
          onEditNote={async note => {
            if (onEditNote) await onEditNote(note);
          }}
          onDeleteNote={onDeleteNote}
          onSelectDayIndex={onSelectDayIndex}
        />
      )}

      {/* SUB-VIEW 4: CLOUD & SETTINGS / BACKUPS (All 12 Screens from Image 4) */}
      {(activeSubTab === 'settings' || activeSubTab === 'backup') && (
        <SettingsCloudView
          trip={trip}
          cloudUser={cloudUser}
          isCloudConnected={isCloudConnected}
          syncStatus={syncStatus}
          syncMessage={syncMessage}
          cloudRowCounts={cloudRowCounts}
          lastSyncedAt={lastSyncedAt}
          isSyncing={isSyncing}
          pendingSyncCount={pendingSyncCount}
          isOnline={isOnline}
          initialScreen={activeSubTab === 'backup' ? 'backups' : 'overview'}
          onSync={onSync}
          onExportBackup={onExportBackup}
          onRestoreBackup={onRestoreBackup}
          onSaveCloudSettings={onSaveCloudSettings}
          onCloudSignOut={onCloudSignOut}
          onResetData={onResetData}
          onCleanDataReset={onCleanDataReset}
        />
      )}

      {/* SUB-VIEW 5: ACCOMMODATION (Preserved Stays) */}
      {activeSubTab === 'accommodation' && (
        <AccommodationView
          trip={trip}
          days={days || []}
          accommodations={accommodations}
          onSaveStay={onSaveStay}
          onDeleteStay={onDeleteStay}
          onSelectDayIndex={onSelectDayIndex}
        />
      )}
    </div>
  );
};
