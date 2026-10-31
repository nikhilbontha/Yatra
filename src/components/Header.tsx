'use client';

import React from 'react';
import { Trip } from '@/types/trip';
import {
  Calendar,
  RefreshCw,
  WifiOff,
} from 'lucide-react';

interface HeaderProps {
  trip: Trip;
  isOnline: boolean;
  pendingSyncCount: number;
  isSyncing: boolean;
  syncStatus: 'signed_out' | 'syncing' | 'synced' | 'offline' | 'failed';
  cloudUser: any;
  onSync: () => void;
  onQuickAdd: () => void;
  onOpenSettings: () => void;
  onSearchClick?: () => void;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  trip,
  isOnline,
  pendingSyncCount,
  isSyncing,
  syncStatus,
  cloudUser,
  onSync,
  onQuickAdd,
  onOpenSettings,
  onSearchClick,
  onBack,
}) => {
  return (
    <header className="sticky top-0 z-30 px-2 sm:px-4 py-2 sm:py-3 transition-all">
      {/* 
        Master Ornate Frame matching user specification:
        - Golden double border with antique brass sheen
        - Left & Right mandala corner flourishes
        - Center temple silhouette & golden sunrise backdrop (seamless blend)
        - Sacred temple gopuram badge with golden Om (ॐ) seal (Click to go back to previous page)
        - Sacred Tilak flame & 'SACRED YATRA' badge
        - 'A Divine Journey Across India' in Divine Gold
        - Royal Emerald Gold-Rimmed Sync pill
      */}
      <div className="relative max-w-full rounded-[24px] sm:rounded-[28px] border-2 border-[#d4a359] ring-1 ring-[#cba052]/50 ring-inset shadow-[0_8px_30px_-6px_rgba(212,163,89,0.22)] bg-gradient-to-r from-[#FFFDF9] via-[#FFFBF2] to-[#FFFDF9] p-2 sm:p-2.5 overflow-hidden">

        {/* Left Corner Mandala Wing */}
        <img
          src="/images/mandala-left-wing.png"
          alt=""
          aria-hidden="true"
          className="absolute left-0 top-0 h-full w-auto pointer-events-none opacity-90 z-0 select-none hidden sm:block"
        />

        {/* Center Temple Silhouette & Rising Sun Background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
          <img
            src="/images/temple-silhouette-clean.png"
            alt=""
            aria-hidden="true"
            className="h-full w-auto max-h-[85px] sm:max-h-[96px] object-contain opacity-90 mix-blend-multiply select-none [mask-image:linear-gradient(to_right,transparent_0%,black_12%,black_88%,transparent_100%)]"
          />
        </div>

        {/* Right Corner Mandala Wing (Clean Static Decorative Flourish) */}
        <img
          src="/images/mandala-right-wing.png"
          alt=""
          aria-hidden="true"
          className="absolute right-0 top-0 h-full w-auto pointer-events-none opacity-80 sm:opacity-90 z-0 select-none"
        />

        {/* Bottom Center Ornamental Gold Jewel Badge */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-10 pointer-events-none flex items-center justify-center">
          <div className="w-5 h-2.5 bg-[#FFFBF2] border border-[#d4a359] rounded-full flex items-center justify-center shadow-2xs">
            <span className="text-[#b47b18] text-[8px] leading-none">❖</span>
          </div>
        </div>

        {/* Content Bar */}
        <div className="relative z-10 flex items-center justify-between gap-2 sm:gap-4 px-1 sm:px-4">

          {/* LEFT: Sacred Temple Emblem (Back Button) & Yatra Title */}
          <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
            {/* Authentic Temple Gopuram with Golden Om (ॐ) Seal (Click to go back to previous page) */}
            <button
              type="button"
              onClick={onBack}
              className="relative w-11 h-11 sm:w-14 sm:h-14 shrink-0 rounded-2xl overflow-hidden shadow-md border-2 border-[#d4af37] bg-[#074735] flex items-center justify-center group hover:scale-105 active:scale-95 transition-transform duration-300 card-press-3d cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#d4af37]/60"
              title="Click Temple to go back to previous page"
              aria-label="Go back to previous page"
            >
              <img
                src="/images/sacred-temple-emblem.jpg"
                alt="Yatra Sacred Temple Emblem - Click to go back"
                className="w-full h-full object-cover group-hover:brightness-105 transition-all"
              />
            </button>

            {/* Typography & Sacred Badge */}
            <div className="min-w-0">
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                {/* Brand Name */}
                <h1 className="text-lg sm:text-2xl font-black text-[#0c4030] tracking-tight leading-none font-serif">
                  Yatra
                </h1>

                {/* Sacred Saffron Tilak Mark */}
                <svg className="w-2.5 h-4.5 sm:h-5.5 shrink-0" viewBox="0 0 10 24" fill="none" aria-hidden="true">
                  <path
                    d="M5 2C5 2 2 8 2 12C2 14.5 3.3 16 5 16C6.7 16 8 14.5 8 12C8 8 5 2 5 2Z"
                    fill="url(#tilak-gradient)"
                  />
                  <circle cx="5" cy="20" r="2" fill="#d97706" />
                  <defs>
                    <linearGradient id="tilak-gradient" x1="5" y1="2" x2="5" y2="16" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#f59e0b" />
                      <stop offset="1" stopColor="#ea580c" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Subtitle in Divine Gold - fully visible on mobile without truncation */}
              <div className="flex items-center gap-1 mt-0.5 sm:mt-1 whitespace-nowrap">
                <span className="text-[#cba052] text-[8px] sm:text-[10px] leading-none shrink-0 select-none">✦</span>
                <p className="text-[10px] xs:text-[11.5px] sm:text-[13px] font-bold text-[#b47b18] tracking-tight leading-none font-serif select-none whitespace-nowrap drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]">
                  A Divine Journey Across India
                </p>
                <span className="text-[#cba052] text-[8px] sm:text-[10px] leading-none shrink-0 select-none">✦</span>
                {/* Accessible fallback for screen readers and search */}
                <span className="sr-only">My Pilgrimage Planner · 19 Days</span>
              </div>

              {/* Delicate Golden Ornamental Flourish Rule */}
              <div className="hidden sm:flex items-center gap-1.5 pt-1 max-w-[220px]" aria-hidden="true">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#d4a359]/70 to-[#d4a359]" />
                <span className="text-[#b47b18] text-[8.5px] leading-none select-none">❖</span>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#d4a359]/70 to-[#d4a359]" />
              </div>
            </div>
          </div>

          {/* RIGHT: Royal Emerald Gold-Rimmed Sync Button */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Vertical Divider Line */}
            <div className="hidden sm:block w-[1.5px] h-6 sm:h-7 bg-[#cba052]/50 shrink-0 mx-0.5" aria-hidden="true" />

            <button
              type="button"
              onClick={onSync}
              disabled={isSyncing}
              className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full text-white font-extrabold shadow-md shadow-emerald-950/20 card-press-3d transition-all shrink-0 group border-2 border-[#d4af37] ${isSyncing
                ? 'bg-gradient-to-b from-[#0284c7] to-[#0369a1]'
                : !isOnline
                  ? 'bg-gradient-to-b from-[#d97706] to-[#b45309]'
                  : 'bg-gradient-to-b from-[#08523f] to-[#043b2d] hover:from-[#0a5c47] hover:to-[#054334]'
                }`}
              title="Cloud Synchronization & Offline Status"
              aria-label="Cloud Synchronization"
            >
              {isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white stroke-[2.5] animate-spin" />
              ) : !isOnline ? (
                <WifiOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white stroke-[2.5]" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white stroke-[2.5] group-hover:rotate-180 transition-transform duration-500" />
              )}
              <span className="text-xs sm:text-sm tracking-wide">
                {isSyncing ? 'Syncing...' : 'Sync'}
              </span>
              {pendingSyncCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-400 text-amber-950 border border-white/80 shadow-2xs ml-0.5">
                  {pendingSyncCount}
                </span>
              )}
            </button>
          </div>
        </div>

      </div>
    </header>
  );
};
