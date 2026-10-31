'use client';

import React, { useState } from 'react';
import {
  Train,
  Bus,
  Eye,
  Download,
  Edit,
  Trash2,
  CheckCircle2,
  Copy,
  Check,
  Ticket,
  Clock,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { BookingDocument } from '@/types/trip';
import { resolveTicketTransitDetails } from '@/lib/tickets-helper';

export interface TicketPassCardProps {
  pass: BookingDocument;
  onView?: (pass: BookingDocument) => void;
  onEdit?: (pass: BookingDocument) => void;
  onDelete?: (passId: string) => void;
}

export const TicketPassCard: React.FC<TicketPassCardProps> = ({
  pass,
  onView,
  onEdit,
  onDelete,
}) => {
  const [copied, setCopied] = useState(false);
  const details = resolveTicketTransitDetails(pass);

  const handleCopyPnr = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (details.pnr) {
      navigator.clipboard?.writeText?.(details.pnr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="group relative rounded-3xl overflow-hidden bg-linear-to-b from-white via-[#fbfffd] to-emerald-50/40 border border-emerald-200/90 shadow-[0_12px_28px_-10px_rgba(15,91,68,0.16),0_4px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_-8px_rgba(15,91,68,0.26)] transition-all duration-300 hover:-translate-y-0.5"
    >
      {/* 3D Top Accent Gold-Emerald Trim */}
      <div className="h-1.5 w-full bg-linear-to-r from-amber-400 via-[#0F5B44] to-emerald-400" />

      {/* Main Transit Details Section */}
      <div className="p-4 sm:p-5 space-y-3.5">
        {/* Row 1: Brand Badge + PNR & Live Fare Stamp */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-[#0F5B44] to-emerald-800 text-amber-300 flex items-center justify-center shadow-md shadow-emerald-950/20 shrink-0">
              {details.isBus ? <Bus className="w-4 h-4" /> : <Train className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#0F5B44]">
                  {details.docTypeDisplay}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {details.status}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-gray-600 mt-0.5">
                <span className="font-semibold text-gray-500">PNR:</span>
                <span className="font-extrabold text-gray-900 tracking-wider">{details.pnr}</span>
                <button
                  type="button"
                  onClick={handleCopyPnr}
                  className="p-1 rounded hover:bg-emerald-100 text-gray-500 hover:text-[#0F5B44] transition-colors"
                  title="Copy PNR"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Fare / Price Badge */}
          <div className="text-right shrink-0">
            <div className="px-3 py-1 rounded-xl bg-linear-to-r from-emerald-600 to-[#0F5B44] text-white shadow-md shadow-emerald-900/25 border border-emerald-400/30 inline-flex items-baseline gap-0.5">
              <span className="text-xs text-amber-200 font-bold">₹</span>
              <span className="text-sm sm:text-base font-black tracking-tight">
                {details.priceFormatted.replace('₹', '')}
              </span>
            </div>
            <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-widest block mt-0.5 text-right">
              Total Fare
            </span>
          </div>
        </div>

        {/* Row 2: Train Number & Train Name Strip */}
        <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-2xl bg-linear-to-r from-amber-500/10 via-emerald-500/10 to-transparent border border-amber-300/40">
          <div className="px-2.5 py-1 rounded-lg bg-linear-to-r from-amber-500 to-amber-600 text-white font-mono text-xs font-black shadow-xs tracking-wider flex items-center gap-1 shrink-0">
            <span>#{details.trainNumber}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs sm:text-sm font-black text-gray-900 truncate">
              {details.trainName}
            </h4>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-white/95 text-emerald-900 border border-emerald-200 shadow-2xs shrink-0">
            {details.classType}
          </span>
        </div>

        {/* Row 3: Journey Route Timeline (From Station ➔ Track ➔ To Station) */}
        <div className="py-1">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
            {/* Origin (From Place) */}
            <div className="text-left min-w-0">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-lg sm:text-xl font-black text-gray-900 font-mono tracking-tight">
                  {details.departureTime}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-[#0F5B44] border border-emerald-200">
                  {details.fromStationCode}
                </span>
              </div>
              <p className="text-xs font-black text-gray-900 truncate mt-0.5" title={details.fromCity}>
                {details.fromCity}
              </p>
              <p className="text-[10px] font-semibold text-gray-500 truncate">
                {details.travelDateDisplay}
              </p>
            </div>

            {/* Central Track & Duration Graphic */}
            <div className="flex flex-col items-center justify-center px-1 shrink-0">
              <span className="text-[9px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80 mb-1">
                {details.duration}
              </span>
              <div className="w-16 sm:w-24 flex items-center">
                <div className="w-2 h-2 rounded-full bg-[#0F5B44] ring-2 ring-emerald-200" />
                <div className="h-0.5 flex-1 bg-linear-to-r from-[#0F5B44] via-amber-400 to-[#0F5B44] relative flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs border border-emerald-200 flex items-center justify-center -translate-y-0.2">
                    {details.isBus ? (
                      <Bus className="w-2.5 h-2.5 text-[#0F5B44]" />
                    ) : (
                      <Train className="w-2.5 h-2.5 text-[#0F5B44]" />
                    )}
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-[#0F5B44] ring-2 ring-emerald-200" />
              </div>
              <span className="text-[8.5px] font-semibold text-gray-400 mt-0.5">
                Direct Route
              </span>
            </div>

            {/* Destination (To Place) */}
            <div className="text-right min-w-0">
              <div className="flex items-baseline justify-end gap-1.5 flex-wrap">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-200">
                  {details.toStationCode}
                </span>
                <span className="text-lg sm:text-xl font-black text-gray-900 font-mono tracking-tight">
                  {details.arrivalTime.replace(/\s*\(\+[0-9]+\)/gi, '').trim()}
                </span>
              </div>
              <p className="text-xs font-black text-gray-900 truncate mt-0.5" title={details.toCity}>
                {details.toCity}
              </p>
              <p className="text-[10px] font-semibold text-gray-500 truncate">
                Arrival Destination
              </p>
            </div>
          </div>
        </div>

        {/* Row 4: Class & Quota and Seat / Berth Strip (Interchanged & Stacked - Clean Layout) */}
        <div className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-emerald-50/90 to-teal-50/50 border border-emerald-200/80 shadow-2xs space-y-2">
          {/* Top Row: Class & Quota with dedicated icon and chip */}
          <div className="flex items-center justify-between gap-2 border-b border-emerald-100/90 pb-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-emerald-100 text-[#0F5B44] flex items-center justify-center shrink-0 shadow-2xs">
                <Ticket className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800/80 block leading-tight">
                  Class & Quota
                </span>
                <span className="text-xs sm:text-sm font-black text-gray-900 leading-tight block truncate" title={details.classType}>
                  {details.classType}
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-emerald-100/80 text-emerald-800 border border-emerald-200/80 shrink-0">
              Confirmed
            </span>
          </div>

          {/* Bottom Row: Seat / Berth (Left) and Offline Storage Status (Right) */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800/80 block leading-tight">
                Seat / Berth
              </span>
              <span className="text-xs font-black text-gray-800 truncate block" title={details.seatFormatted}>
                {details.seatFormatted}
              </span>
            </div>

            <div className="shrink-0 text-right">
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800/80 block leading-tight">
                Offline Storage
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100/90 text-emerald-800 text-[10px] sm:text-[11px] font-black border border-emerald-200/70 shadow-2xs">
                <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-700 shrink-0" />
                <span>Offline Safe</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Perforation Tear Line with Semicircular Cutout Notches */}
      <div className="relative py-1">
        <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#f3f7f5] border-r-2 border-emerald-300/80 shadow-inner" />
        <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#f3f7f5] border-l-2 border-emerald-300/80 shadow-inner" />
        <div className="border-b-2 border-dashed border-emerald-200/90 mx-5" />
      </div>

      {/* Card Action Footer */}
      <div className="px-4 py-3 bg-linear-to-r from-emerald-50/30 via-white to-emerald-50/30 flex flex-wrap items-center justify-between gap-2.5">
        {/* Simulated Barcode */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
            <div className="w-1 h-5 bg-gray-800 rounded-xs" />
            <div className="w-0.5 h-5 bg-gray-800 rounded-xs" />
            <div className="w-1.5 h-5 bg-gray-800 rounded-xs" />
            <div className="w-0.5 h-5 bg-gray-800 rounded-xs" />
            <div className="w-2 h-5 bg-gray-800 rounded-xs" />
            <div className="w-0.5 h-5 bg-gray-800 rounded-xs" />
            <div className="w-1 h-5 bg-gray-800 rounded-xs" />
            <div className="w-1.5 h-5 bg-gray-800 rounded-xs" />
            <div className="w-0.5 h-5 bg-gray-800 rounded-xs" />
            <div className="w-1 h-5 bg-gray-800 rounded-xs" />
          </div>
          <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest hidden sm:inline">
            IRCTC-PASS
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 ml-auto">
          {onView && (
            <button
              type="button"
              onClick={() => onView(pass)}
              className="px-3 py-1.5 rounded-xl bg-linear-to-r from-[#0F5B44] to-emerald-800 hover:from-[#136a50] hover:to-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1 shadow-sm card-press-3d"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View</span>
            </button>
          )}

          {(pass.blobData || pass.fileUrl) && (
            <a
              href={pass.blobData || pass.fileUrl}
              download={pass.fileName || `${pass.title}.pdf`}
              className="px-2.5 py-1.5 rounded-xl bg-white border border-emerald-200 hover:bg-emerald-50 text-[#0F5B44] text-xs font-bold inline-flex items-center gap-1 shadow-2xs card-press-3d"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(pass)}
              className="p-1.5 rounded-xl bg-white hover:bg-emerald-50 text-[#0F5B44] border border-gray-200/80 shadow-2xs card-press-3d"
              title="Edit ticket details"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(pass.id)}
              className="p-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-gray-200/80 shadow-2xs card-press-3d"
              title="Delete pass"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

