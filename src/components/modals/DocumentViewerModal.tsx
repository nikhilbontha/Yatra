'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  FileText,
  Calendar,
  Ticket,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Image as ImageIcon,
  Upload,
  BedDouble,
  Sparkles,
} from 'lucide-react';
import { detectAttachmentAvailability, formatFileSize } from '@/lib/attachment-helper';
import { PdfCanvasViewer } from './PdfCanvasViewer';

export interface DocumentViewerData {
  id?: string;
  title?: string;
  fileName?: string;
  fileSize?: string | number;
  fileType?: string;
  blobData?: string;
  downloadUrl?: string;
  pnr?: string;
  bookingRef?: string;
  bookingReference?: string;
  trainName?: string;
  carrier?: string;
  travelDate?: string;
  notes?: string;
  docType?: string;
  stayType?: string;
  name?: string;
  // Dual attachment fields
  pdfBlob?: string;
  pdfUrl?: string;
  pdfFileName?: string;
  pdfFileSize?: string | number;
  imageBlob?: string;
  imageUrl?: string;
  imageFileName?: string;
  imageFileSize?: string | number;
  documentUrl?: string;
  documentName?: string;
  documentType?: string;
  documentSize?: string;
}

export interface DocumentViewerModalProps {
  isOpen: boolean;
  document: DocumentViewerData | null;
  initialMode?: 'image' | 'pdf';
  onClose: () => void;
  onAttachFile?: (type: 'image' | 'pdf', fileData: string, fileName: string, fileSize: number) => Promise<void> | void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  document: doc,
  initialMode,
  onClose,
  onAttachFile,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  // Detect availability of both attachments
  const availability = detectAttachmentAvailability(doc);

  const [activeMode, setActiveMode] = useState<'image' | 'pdf'>(() => {
    if (initialMode) return initialMode;
    if (doc?.fileType?.startsWith('image/') || doc?.fileName?.match(/\.(jpe?g|png|webp|gif|svg)$/i) || doc?.imageBlob || (doc?.blobData && doc.blobData.startsWith('data:image/'))) {
      return 'image';
    }
    return 'pdf';
  });
  const [isUploading, setIsUploading] = useState<'image' | 'pdf' | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileInputType, setFileInputType] = useState<'image' | 'pdf'>('image');

  // Initialize active mode when modal opens or document changes
  useEffect(() => {
    if (isOpen && doc) {
      setZoom(1);
      setRotation(0);
      if (initialMode) {
        setActiveMode(initialMode);
      } else if (availability.hasPdf && !availability.hasImage) {
        setActiveMode('pdf');
      } else if (availability.hasImage && !availability.hasPdf) {
        setActiveMode('image');
      } else if (availability.hasPdf) {
        setActiveMode('pdf');
      } else {
        setActiveMode('image');
      }
    }
  }, [isOpen, doc?.fileName, doc?.title, doc?.id, initialMode, availability.hasPdf, availability.hasImage]);

  // Handle Escape key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !doc) return null;

  // Resolve current active file data source
  const currentImageSource = availability.imageInfo?.source || (doc.imageBlob || doc.imageUrl || (doc.blobData?.startsWith('data:image/') ? doc.blobData : ''));
  const currentPdfSource = availability.pdfInfo?.source || (doc.pdfBlob || doc.pdfUrl || (doc.blobData?.startsWith('data:application/pdf') || doc.fileName?.toLowerCase().endsWith('.pdf') ? doc.blobData : ''));

  const activeSource = activeMode === 'image' ? currentImageSource : currentPdfSource;
  const hasActiveContent = Boolean(activeSource);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3.5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleDownload = () => {
    if (!activeSource) return;
    const link = window.document.createElement('a');
    link.href = activeSource;
    const defaultName = activeMode === 'image'
      ? (availability.imageInfo?.fileName || `${doc.title || doc.name || 'pass'}_photo.jpg`)
      : (availability.pdfInfo?.fileName || `${doc.title || doc.name || 'pass'}.pdf`);
    link.download = defaultName;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const triggerUpload = (type: 'image' | 'pdf') => {
    setFileInputType(type);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 50);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onAttachFile) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds 10 MB limit.');
      return;
    }

    setUploadError(null);
    setIsUploading(fileInputType);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        if (reader.result) {
          await onAttachFile(fileInputType, reader.result as string, file.name, file.size);
          setActiveMode(fileInputType);
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

  const itemTitle = doc.title || doc.name || doc.fileName || 'Pilgrimage Pass';
  const itemRef = doc.pnr || doc.bookingRef || doc.bookingReference || '';
  const isStay = Boolean(doc.stayType);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-viewer-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
    >
      {/* 3D Glassmorphic Dark Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/85 backdrop-blur-xl transition-all"
      />

      {/* Hidden File Picker for In-Viewer Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept={fileInputType === 'image' ? 'image/*' : '.pdf,application/pdf'}
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Main Viewer Card */}
      <div
        onClick={e => e.stopPropagation()}
        className="relative z-10 w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0b1311] border border-emerald-500/40 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(15,91,68,0.35)] overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Top 3D Accent Gold-Emerald Trim */}
        <div className="h-1.5 w-full bg-linear-to-r from-amber-400 via-[#0F5B44] to-teal-400" />

        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-linear-to-r from-emerald-950/90 via-[#0a231b] to-black border-b border-emerald-500/20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-950/50 shrink-0">
              {activeMode === 'pdf' ? (
                <FileText className="w-5 h-5 stroke-[2.3]" />
              ) : (
                <ImageIcon className="w-5 h-5 stroke-[2.3]" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3
                  id="document-viewer-title"
                  className="text-sm sm:text-base font-black text-white truncate"
                >
                  {itemTitle}
                </h3>
                {doc.docType && (
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {doc.docType}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-emerald-400/80 font-medium truncate">
                {activeMode === 'pdf'
                  ? (availability.pdfInfo?.fileName || doc.fileName || 'pdf_document.pdf')
                  : (availability.imageInfo?.fileName || 'photo_scan.jpg')}{' '}
                {doc.fileSize ? `• ${formatFileSize(doc.fileSize)}` : ''}
              </p>
            </div>
          </div>

          {/* Center / Right Controls Bar: Mode Switcher & Actions */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {/* 3D Tab Switcher: [🖼️ Image] [📄 PDF] */}
            <div className="flex items-center bg-white/10 rounded-2xl p-0.5 border border-white/10">
              <button
                type="button"
                onClick={() => setActiveMode('image')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  activeMode === 'image'
                    ? 'bg-linear-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Photo</span>
                {availability.hasImage && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('pdf')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  activeMode === 'pdf'
                    ? 'bg-linear-to-r from-teal-600 to-[#0F5B44] text-white shadow-md'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">PDF</span>
                {availability.hasPdf && (
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-300 ml-0.5" />
                )}
              </button>
            </div>

            {/* Zoom / Rotate Controls (active in both image & PDF mode) */}
            {hasActiveContent && (
              <div className="hidden sm:flex items-center gap-1 bg-white/10 rounded-2xl p-1 border border-white/10">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                  title="Zoom Out"
                  aria-label="Zoom Out"
                  className="p-1.5 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all card-press-3d"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono text-gray-300 px-1 font-bold min-w-9 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3.5}
                  title="Zoom In"
                  aria-label="Zoom In"
                  className="p-1.5 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all card-press-3d"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleRotate}
                  title="Rotate 90°"
                  aria-label="Rotate 90 degrees"
                  className="p-1.5 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all card-press-3d"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  title="Reset View"
                  aria-label="Reset View"
                  className="p-1.5 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all card-press-3d"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Download Button */}
            {hasActiveContent && (
              <button
                type="button"
                onClick={handleDownload}
                title="Download Attachment"
                aria-label="Download Attachment"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition-all card-press-3d cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </button>
            )}

            {/* Update / Replace Active Attachment Button */}
            {onAttachFile && (
              <button
                type="button"
                onClick={() => triggerUpload(activeMode)}
                disabled={Boolean(isUploading)}
                title={activeMode === 'image' ? 'Update or replace photo image' : 'Update or replace PDF document'}
                aria-label={activeMode === 'image' ? 'Update photo image' : 'Update PDF document'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/10 hover:bg-white/20 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold transition-all card-press-3d cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {isUploading ? 'Updating...' : (activeMode === 'image' ? 'Update Photo' : 'Update PDF')}
                </span>
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              title="Close (Esc)"
              aria-label="Close"
              className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white border border-white/10 transition-all card-press-3d"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Content Viewport */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-radial from-[#13231e] via-[#08110e] to-black min-h-[52vh] max-h-[72vh]">
          {activeMode === 'image' ? (
            hasActiveContent ? (
              <div className="relative overflow-auto max-w-full max-h-full flex items-center justify-center transition-transform duration-200">
                <img
                  src={activeSource}
                  alt={itemTitle}
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease-out',
                  }}
                  className="max-h-[62vh] max-w-full object-contain rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(15,91,68,0.3)] border border-emerald-500/20"
                />
              </div>
            ) : (
              /* No Image Attached - 3D Action Card */
              <div className="text-center p-8 space-y-4 max-w-sm bg-white/5 border border-emerald-500/30 rounded-3xl backdrop-blur-md shadow-xl">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
                  <ImageIcon className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-white font-black text-sm sm:text-base">
                    No Pass Photo / Screenshot Attached
                  </h4>
                  <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                    Attach a photo scan or screenshot of this booking to view it offline in the 3D lightbox.
                  </p>
                </div>
                {onAttachFile && (
                  <button
                    type="button"
                    onClick={() => triggerUpload('image')}
                    disabled={isUploading === 'image'}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/60 transition-all card-press-3d disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isUploading === 'image' ? 'Attaching Image...' : '+ Upload Pass Photo / Scan'}</span>
                  </button>
                )}
                {availability.hasPdf && (
                  <button
                    type="button"
                    onClick={() => setActiveMode('pdf')}
                    className="block mx-auto text-[11px] text-emerald-300 hover:text-white font-semibold underline underline-offset-2 mt-2"
                  >
                    Switch to view official PDF instead →
                  </button>
                )}
              </div>
            )
          ) : (
            /* PDF Mode Viewport */
            hasActiveContent ? (
              <PdfCanvasViewer
                source={activeSource || ''}
                title={itemTitle}
                zoom={zoom}
                rotation={rotation}
                onDownload={handleDownload}
              />
            ) : (
              /* No PDF Attached - 3D Action Card */
              <div className="text-center p-8 space-y-4 max-w-sm bg-white/5 border border-teal-500/30 rounded-3xl backdrop-blur-md shadow-xl">
                <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/30 text-teal-400 mx-auto flex items-center justify-center shadow-inner">
                  <FileText className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-white font-black text-sm sm:text-base">
                    No Official PDF Document Attached
                  </h4>
                  <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                    Attach the downloaded IRCTC train e-ticket or official hotel voucher PDF for full verification.
                  </p>
                </div>
                {onAttachFile && (
                  <button
                    type="button"
                    onClick={() => triggerUpload('pdf')}
                    disabled={isUploading === 'pdf'}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-linear-to-r from-teal-600 to-[#0F5B44] hover:from-teal-500 hover:to-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-950/60 transition-all card-press-3d disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isUploading === 'pdf' ? 'Attaching PDF...' : '+ Upload Official PDF Pass'}</span>
                  </button>
                )}
                {availability.hasImage && (
                  <button
                    type="button"
                    onClick={() => setActiveMode('image')}
                    className="block mx-auto text-[11px] text-teal-300 hover:text-white font-semibold underline underline-offset-2 mt-2"
                  >
                    Switch to view pass photo instead →
                  </button>
                )}
              </div>
            )
          )}
        </div>

        {/* Bottom Details Footer Bar */}
        <div className="px-4 sm:px-6 py-3 bg-linear-to-r from-black via-[#0a1813] to-black border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {itemRef && (
              <span className="px-2.5 py-1 rounded-xl bg-white/10 text-emerald-300 font-mono font-bold text-[11px] border border-white/10">
                PNR / Ref: {itemRef}
              </span>
            )}
            {doc.carrier && (
              <span className="px-2.5 py-1 rounded-xl bg-white/10 text-gray-300 font-semibold text-[11px]">
                {doc.carrier}
              </span>
            )}
            {doc.travelDate && (
              <span className="inline-flex items-center gap-1 text-gray-400 text-[11px]">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>{doc.travelDate}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[10px] text-emerald-400/80 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Offline Encrypted
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all card-press-3d"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
