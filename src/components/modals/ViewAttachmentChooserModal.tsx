'use client';

import React, { useRef, useState } from 'react';
import {
  X,
  FileText,
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sparkles,
  Ticket,
  BedDouble,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { detectAttachmentAvailability, AttachmentInfo } from '@/lib/attachment-helper';

export interface ViewAttachmentChooserModalProps {
  isOpen: boolean;
  item: any | null; // BookingDocument or AccommodationStay
  itemType?: 'ticket' | 'stay' | 'document';
  onSelectMode: (mode: 'image' | 'pdf', item: any) => void;
  onClose: () => void;
  onAttachFile?: (type: 'image' | 'pdf', fileData: string, fileName: string, fileSize: number) => Promise<void> | void;
}

export const ViewAttachmentChooserModal: React.FC<ViewAttachmentChooserModalProps> = ({
  isOpen,
  item,
  itemType = 'ticket',
  onSelectMode,
  onClose,
  onAttachFile,
}) => {
  const [isUploading, setIsUploading] = useState<'image' | 'pdf' | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !item) return null;

  const availability = detectAttachmentAvailability(item);
  const itemTitle = item.title || item.name || 'Travel Pass';
  const itemRef = item.pnr || item.bookingRef || item.bookingReference || '';
  const isStay = itemType === 'stay' || Boolean(item.stayType);

  const handleFileUpload = (type: 'image' | 'pdf', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onAttachFile) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds 10 MB limit. Please select a smaller file.');
      return;
    }

    setUploadError(null);
    setIsUploading(type);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        if (reader.result) {
          await onAttachFile(type, reader.result as string, file.name, file.size);
        }
      } finally {
        setIsUploading(null);
      }
    };
    reader.onerror = () => {
      setIsUploading(null);
      setUploadError('Failed to read file from your device.');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="view-chooser-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      {/* 3D Dark Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
      />

      {/* Hidden File Pickers */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => handleFileUpload('image', e)}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={e => handleFileUpload('pdf', e)}
      />

      {/* Main 3D Card */}
      <div
        onClick={e => e.stopPropagation()}
        className="relative z-10 w-full max-w-lg bg-linear-to-b from-[#0e1d18] via-[#091512] to-black border border-emerald-500/40 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(15,91,68,0.35)] overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Top 3D Accent Temple Bar */}
        <div className="h-1.5 w-full bg-linear-to-r from-amber-400 via-emerald-400 to-teal-400" />

        {/* Modal Header */}
        <div className="px-5 sm:px-6 pt-5 pb-3 border-b border-emerald-500/20 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-linear-to-tr from-[#0F5B44] via-emerald-700 to-teal-500 text-amber-300 flex items-center justify-center shadow-lg shadow-emerald-950/60 shrink-0">
              {isStay ? (
                <BedDouble className="w-5 h-5 stroke-[2.2]" />
              ) : (
                <Ticket className="w-5 h-5 stroke-[2.2]" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {isStay ? 'Stay Voucher' : 'Travel Pass'}
                </span>
                {itemRef && (
                  <span className="text-[10px] font-mono text-emerald-400/90 font-bold">
                    Ref: {itemRef}
                  </span>
                )}
              </div>
              <h3
                id="view-chooser-title"
                className="text-base sm:text-lg font-black text-white truncate mt-0.5"
              >
                {itemTitle}
              </h3>
              <p className="text-xs text-emerald-300/80 font-medium">
                Choose format to preview with 3D controls
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all card-press-3d shrink-0"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Chooser Options Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Card 1: View Image / Photo Scan */}
          <div
            className={`group relative rounded-2xl p-4 transition-all duration-200 border ${
              availability.hasImage
                ? 'bg-linear-to-br from-white/8 via-white/4 to-transparent border-emerald-500/40 hover:border-emerald-400/80 hover:bg-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.4)]'
                : 'bg-white/3 border-white/10 opacity-80 hover:opacity-100'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                    availability.hasImage
                      ? 'bg-linear-to-br from-amber-500 to-emerald-600 text-white'
                      : 'bg-white/10 text-gray-400'
                  }`}
                >
                  <ImageIcon className="w-6 h-6 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-white">
                      Pass Photo / Screenshot (Image)
                    </h4>
                    {availability.hasImage ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Ready
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-white/10 text-gray-400 border border-white/10">
                        Not Attached
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-300 mt-0.5">
                    {availability.hasImage
                      ? availability.imageInfo?.fileName || 'Attached High-Resolution Photo'
                      : 'Upload phone screenshot or photo of your physical ticket/stay slip'}
                  </p>
                  {availability.hasImage && availability.imageInfo?.fileSize && (
                    <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                      Size: {availability.imageInfo.fileSize}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Button for Image */}
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {availability.hasImage ? (
                <>
                  <button
                    type="button"
                    onClick={() => onSelectMode('image', item)}
                    className="flex-1 min-w-[200px] py-2.5 px-3 rounded-xl bg-linear-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-1.5 transition-all card-press-3d cursor-pointer"
                  >
                    <Eye className="w-4 h-4 stroke-[2.5]" />
                    <span>View Image (3D Lightbox &amp; Zoom)</span>
                    <ChevronRight className="w-4 h-4 stroke-[2.5] ml-auto" />
                  </button>
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isUploading === 'image'}
                    className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all card-press-3d shrink-0 disabled:opacity-50 cursor-pointer"
                    title="Change or update this photo / scan image"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploading === 'image' ? 'Updating...' : 'Update Image'}</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploading === 'image'}
                  className="w-full py-2.5 px-3 rounded-xl bg-white/10 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition-all card-press-3d disabled:opacity-50 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploading === 'image' ? 'Attaching photo...' : '+ Upload Pass Photo / Scan'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Card 2: View PDF Document */}
          <div
            className={`group relative rounded-2xl p-4 transition-all duration-200 border ${
              availability.hasPdf
                ? 'bg-linear-to-br from-white/8 via-white/4 to-transparent border-teal-500/40 hover:border-teal-400/80 hover:bg-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.4)]'
                : 'bg-white/3 border-white/10 opacity-80 hover:opacity-100'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                    availability.hasPdf
                      ? 'bg-linear-to-br from-teal-500 to-[#0F5B44] text-white'
                      : 'bg-white/10 text-gray-400'
                  }`}
                >
                  <FileText className="w-6 h-6 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-white">
                      Official PDF Document
                    </h4>
                    {availability.hasPdf ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-teal-500/20 text-teal-300 border border-teal-500/30">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Ready
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-white/10 text-gray-400 border border-white/10">
                        Not Attached
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-300 mt-0.5">
                    {availability.hasPdf
                      ? availability.pdfInfo?.fileName || 'Official e-Ticket / Pass PDF'
                      : 'Upload downloaded IRCTC e-ticket or official hotel voucher PDF'}
                  </p>
                  {availability.hasPdf && availability.pdfInfo?.fileSize && (
                    <span className="text-[10px] text-teal-400 font-mono font-semibold">
                      Size: {availability.pdfInfo.fileSize}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Button for PDF */}
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {availability.hasPdf ? (
                <>
                  <button
                    type="button"
                    onClick={() => onSelectMode('pdf', item)}
                    className="flex-1 min-w-[200px] py-2.5 px-3 rounded-xl bg-linear-to-r from-teal-600 via-[#0F5B44] to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-1.5 transition-all card-press-3d cursor-pointer"
                  >
                    <Eye className="w-4 h-4 stroke-[2.5]" />
                    <span>View PDF Document (Interactive)</span>
                    <ChevronRight className="w-4 h-4 stroke-[2.5] ml-auto" />
                  </button>
                  <button
                    type="button"
                    onClick={() => pdfInputRef.current?.click()}
                    disabled={isUploading === 'pdf'}
                    className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-teal-600/30 border border-teal-500/40 text-teal-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all card-press-3d shrink-0 disabled:opacity-50 cursor-pointer"
                    title="Change or update this PDF document"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploading === 'pdf' ? 'Updating...' : 'Update PDF'}</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => pdfInputRef.current?.click()}
                  disabled={isUploading === 'pdf'}
                  className="w-full py-2.5 px-3 rounded-xl bg-white/10 hover:bg-teal-600/30 border border-teal-500/30 text-teal-300 font-bold text-xs flex items-center justify-center gap-2 transition-all card-press-3d disabled:opacity-50 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploading === 'pdf' ? 'Attaching PDF...' : '+ Upload PDF Pass'}</span>
                </button>
              )}
            </div>
          </div>

          {uploadError && (
            <p className="text-red-400 text-xs font-bold text-center bg-red-950/40 border border-red-500/30 rounded-xl py-2 px-3">
              {uploadError}
            </p>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-black/60 border-t border-emerald-500/20 flex items-center justify-between gap-3 text-xs">
          <span className="text-[11px] text-emerald-400/80 font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Stored in Private Offline Vault</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all card-press-3d"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
