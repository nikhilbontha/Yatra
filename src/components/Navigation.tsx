'use client';

import React from 'react';
import {
  Home,
  CalendarDays,
  Wallet,
  Ticket,
  MoreHorizontal,
  Compass,
  BedDouble,
  Train,
  CheckSquare,
  FileText,
  ShieldCheck,
  Settings,
} from 'lucide-react';

export type NavTab = 'home' | 'itinerary' | 'budget' | 'transport' | 'accommodation' | 'tickets' | 'documents' | 'more';
export type MoreSubTab = 'places' | 'accommodation' | 'transport' | 'tickets' | 'documents' | 'checklists' | 'notes' | 'backup' | 'settings';

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  activeMoreSubTab?: MoreSubTab;
  onMoreSubTabChange?: (subTab: MoreSubTab) => void;
  pendingSyncCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  activeMoreSubTab,
  onMoreSubTabChange,
  pendingSyncCount = 0,
}) => {
  const mainNavItems = [
    { id: 'home' as NavTab, label: 'Home', icon: Home },
    { id: 'itinerary' as NavTab, label: 'Itinerary', icon: CalendarDays },
    { id: 'budget' as NavTab, label: 'Budget', icon: Wallet },
    { id: 'tickets' as NavTab, label: 'Tickets', icon: Ticket },
    { id: 'accommodation' as NavTab, label: 'Accommodation', icon: BedDouble },
    { id: 'more' as NavTab, label: 'More', icon: MoreHorizontal },
  ];

  const moreSubItems = [
    { id: 'accommodation' as MoreSubTab, label: 'Stays & Hotels', icon: BedDouble },
    { id: 'transport' as MoreSubTab, label: 'Transit & Tickets', icon: Train },
    { id: 'documents' as MoreSubTab, label: 'Pilgrimage Document Vault', icon: FileText },
    { id: 'places' as MoreSubTab, label: 'Places & Temples', icon: Compass },
    { id: 'checklists' as MoreSubTab, label: 'Checklists', icon: CheckSquare },
    { id: 'notes' as MoreSubTab, label: 'Notes & Journal', icon: FileText },
    { id: 'backup' as MoreSubTab, label: 'Backup & Restore', icon: ShieldCheck },
    { id: 'settings' as MoreSubTab, label: 'Cloud & Sync', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Sidebar (lg screens) */}
      <aside className="hidden lg:flex flex-col w-64 glass-card rounded-3xl p-5 border border-white/80 shadow-[0_16px_40px_-10px_rgba(15,91,68,0.12)] self-start sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto no-scrollbar shrink-0">
        {/* App Branding */}
        <div className="flex items-center gap-3 px-3 py-3 mb-5 bg-gradient-to-br from-emerald-50/90 via-teal-50/70 to-emerald-100/40 rounded-2xl border border-emerald-200/60 shadow-xs">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0F5B44] via-[#146b51] to-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-emerald-900/25 ring-2 ring-emerald-300/50 transform hover:scale-105 transition-transform">
            🕉
          </div>
          <div>
            <h2 className="font-black text-[#0F5B44] text-base leading-tight">Yatra</h2>
            <p className="text-[11px] text-emerald-800/80 font-bold">My Pilgrimage Planner</p>
          </div>
        </div>

        {/* Primary Navigation */}
        <div className="space-y-1.5">
          <p className="px-3 text-[10px] font-extrabold text-emerald-900/60 uppercase tracking-wider mb-2">Main Menu</p>
          {mainNavItems.map(item => {
            const Icon = item.icon;
            const isActive =
              activeTab === item.id ||
              (item.id === 'tickets' && (activeTab === 'transport' || activeTab === 'documents'));
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all card-press-3d ${
                  isActive
                    ? 'bg-gradient-to-r from-[#0F5B44] via-[#136a50] to-teal-700 text-white shadow-md shadow-emerald-950/25 ring-1 ring-emerald-300/40'
                    : 'text-gray-600 hover:bg-emerald-50/80 hover:text-[#0F5B44]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white stroke-[2.4]' : 'text-gray-400 stroke-[1.9]'}`} />
                <span>{item.label}</span>
                {item.id === 'tickets' && (
                  <span className="sr-only">Transport</span>
                )}
                {item.id === 'tickets' && pendingSyncCount > 0 && (
                  <span className="ml-auto text-[10px] bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold px-2 py-0.5 rounded-full shadow-xs">
                    {pendingSyncCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Details & Tools Sub-Sections on Desktop */}
        <div className="mt-6 pt-5 border-t border-emerald-900/10 space-y-1">
          <p className="px-3 text-[10px] font-extrabold text-emerald-900/60 uppercase tracking-wider mb-2">Details & Tools</p>
          {moreSubItems.map(item => {
            const Icon = item.icon;
            const isSubActive = activeTab === 'more' && activeMoreSubTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'transport') {
                    onTabChange('transport');
                  } else if (item.id === 'documents') {
                    onTabChange('documents');
                  } else if (item.id === 'accommodation') {
                    onTabChange('accommodation');
                  } else {
                    onTabChange('more');
                    if (onMoreSubTabChange) onMoreSubTabChange(item.id);
                  }
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isSubActive
                    ? 'bg-emerald-50 text-[#0F5B44] font-bold border border-emerald-200 shadow-2xs'
                    : 'text-gray-600 hover:bg-emerald-50/50 hover:text-[#0F5B44]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSubActive ? 'text-[#0F5B44]' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Desktop Footer info */}
        <div className="mt-auto pt-4 px-3 text-[11px] text-gray-500 border-t border-emerald-900/10">
          <p className="font-bold text-gray-700">17 Nov – 5 Dec 2026</p>
          <p className="text-emerald-800/80 font-medium">Hyderabad → Khammam</p>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (Screens < lg) - 3D Floating Glass Island Dock */}
      <nav
        className="lg:hidden fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-md sm:max-w-lg z-40 glass-dock safe-bottom rounded-[28px] transition-all shadow-[0_16px_40px_-8px_rgba(15,91,68,0.22)] border border-white/90 p-1.5 backdrop-blur-2xl"
        aria-label="Mobile Navigation"
      >
        <div className="flex items-center justify-around w-full gap-0.5 sm:gap-1">
          {mainNavItems.map(item => {
            const Icon = item.icon;
            const isActive =
              activeTab === item.id ||
              (item.id === 'tickets' && (activeTab === 'transport' || activeTab === 'documents'));
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center justify-center flex-1 py-0.5 px-0.5 min-w-0 transition-all rounded-2xl card-press-3d ${
                  isActive
                    ? 'text-white'
                    : 'text-gray-500 hover:text-emerald-800 hover:bg-emerald-50/60'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive ? (
                  <div className="w-full bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white py-1.5 px-0.5 rounded-2xl flex flex-col items-center shadow-md shadow-emerald-950/25 ring-1 ring-emerald-300/40 transform scale-102 transition-all">
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.4]" />
                    <span className="text-[9px] sm:text-[11px] font-extrabold mt-0.5 tracking-tight leading-none truncate max-w-full px-0.5">
                      {item.id === 'tickets' ? (
                        <>
                          <span>Tickets</span>
                          <span className="sr-only">Transport</span>
                        </>
                      ) : item.id === 'accommodation' ? (
                        <>
                          <span className="sm:hidden">Stays</span>
                          <span className="hidden sm:inline">Accommodation</span>
                        </>
                      ) : (
                        item.label
                      )}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-1 max-w-full w-full">
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.9] text-gray-500 hover:text-emerald-800 transition-colors" />
                    <span className="text-[9px] sm:text-[11px] font-semibold text-gray-600 mt-0.5 tracking-tight leading-none truncate max-w-full px-0.5">
                      {item.id === 'tickets' ? (
                        <>
                          <span>Tickets</span>
                          <span className="sr-only">Transport</span>
                        </>
                      ) : item.id === 'accommodation' ? (
                        <>
                          <span className="sm:hidden">Stays</span>
                          <span className="hidden sm:inline">Accommodation</span>
                        </>
                      ) : (
                        item.label
                      )}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
