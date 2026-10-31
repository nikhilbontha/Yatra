'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Sliders,
  X,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  CloudOff,
  ShieldAlert,
  WifiOff,
  Database,
  ArrowRight,
} from 'lucide-react';

export interface FailedQueueItemSummary {
  entity: string;
  action: string;
  recordId?: string;
  title?: string;
  error?: string;
}

export interface SyncFailureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  onOpenInspector: () => void;
  errorReason: string;
  technicalDetails?: string;
  failedItems?: FailedQueueItemSummary[];
  isRetrying?: boolean;
}

export const SyncFailureModal: React.FC<SyncFailureModalProps> = ({
  isOpen,
  onClose,
  onRetry,
  onOpenInspector,
  errorReason,
  technicalDetails,
  failedItems = [],
  isRetrying = false,
}) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setShowTechnicalDetails(false);
      setCopied(false);
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Translate raw error into clear human-friendly explanation and diagnostic tag
  const getDiagnosticInfo = (err?: string) => {
    const lower = (err || '').toLowerCase();
    if (lower.includes('jwt') || lower.includes('claim') || lower.includes('auth') || lower.includes('401') || lower.includes('pgrst301')) {
      return {
        tag: 'Authentication Required',
        icon: ShieldAlert,
        summary: 'Your Supabase cloud session has expired or requires sign-in.',
        suggestion: 'Please open Cloud & Sync settings and reconnect your account to resume syncing.',
      };
    }
    if (lower.includes('network') || lower.includes('failed to fetch') || lower.includes('offline') || lower.includes('load failed')) {
      return {
        tag: 'Network Connection',
        icon: WifiOff,
        summary: 'Unable to reach the Supabase cloud server.',
        suggestion: 'Check your internet connection. All changes remain safely preserved in your offline local database.',
      };
    }
    if (lower.includes('row-level security') || lower.includes('42501') || lower.includes('permission')) {
      return {
        tag: 'Cloud Permissions',
        icon: ShieldAlert,
        summary: 'Row-level security policy restricted modifying this cloud record.',
        suggestion: 'Verify that the cloud user account matches the creator of this pilgrimage trip.',
      };
    }
    if (lower.includes('23503') || lower.includes('foreign key')) {
      return {
        tag: 'Data Link Conflict',
        icon: Database,
        summary: 'A referenced parent record (such as an itinerary day) does not exist in the cloud database.',
        suggestion: 'Try syncing all days first or inspect the queued operation.',
      };
    }
    if (lower.includes('column') || lower.includes('pgrst204') || lower.includes('schema cache')) {
      return {
        tag: 'Schema Cache',
        icon: Database,
        summary: 'Cloud table schema mismatch with local record format.',
        suggestion: 'Check table columns or remove outdated pending items from the Sync Inspector.',
      };
    }
    return {
      tag: 'Synchronization Error',
      icon: CloudOff,
      summary: 'An error interrupted synchronization with your private cloud.',
      suggestion: 'Review the technical failure reason below or inspect queued operations.',
    };
  };

  const diag = getDiagnosticInfo(errorReason);
  const DiagIcon = diag.icon;

  const copyTechnicalDetails = () => {
    const textToCopy = `Yatra Cloud Sync Failure:\nReason: ${errorReason}\nDetails: ${technicalDetails || 'N/A'}\nFailed Items: ${JSON.stringify(failedItems, null, 2)}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#061812]/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sync-failure-title"
    >
      <div className="relative bg-gradient-to-b from-[#ffffff] via-[#fafdfb] to-[#f4f8f5] w-full max-w-lg rounded-3xl shadow-[0_25px_70px_-12px_rgba(9,27,21,0.45),0_0_0_1px_rgba(255,255,255,0.95)_inset] border border-white/90 overflow-hidden flex flex-col card-3d animate-in zoom-in-95 duration-200">
        {/* Soft Ambient Radial Flare (Rose / Warning) */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-36 bg-gradient-radial from-rose-500/20 via-amber-500/10 to-transparent blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white/90 backdrop-blur-sm relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-rose-950/25 ring-2 ring-rose-200/50">
              <AlertTriangle className="w-5 h-5 stroke-[2.4]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="sync-failure-title" className="text-sm sm:text-base font-black text-gray-900 leading-tight">
                  Cloud Sync Failed
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                  {diag.tag}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                Pilgrimage data could not be synced to Supabase
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100/80 hover:bg-gray-200/80 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar relative z-10">
          {/* Diagnostic Summary Card */}
          <div className="bg-gradient-to-br from-rose-50/90 via-amber-50/50 to-white rounded-2xl p-4 border border-rose-200/80 shadow-xs space-y-2.5">
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-rose-500/10 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                <DiagIcon className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-black text-rose-950">
                  Why synchronization failed:
                </h4>
                <p className="text-xs text-rose-900/90 leading-relaxed font-semibold mt-1">
                  {diag.summary}
                </p>
                <p className="text-[11px] text-rose-800/80 leading-relaxed font-medium mt-1.5">
                  💡 {diag.suggestion}
                </p>
              </div>
            </div>
          </div>

          {/* Failed Items List (if specific operations failed) */}
          {failedItems.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                  Failed Operation ({failedItems.length})
                </span>
                <span className="text-[10px] font-bold text-rose-600">Pending Retry</span>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden shadow-2xs">
                {failedItems.map((item, idx) => (
                  <div key={idx} className="p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-gray-900 truncate">
                        {item.title || `${item.entity} Operation`}
                      </span>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                        {item.action}
                      </span>
                    </div>
                    {item.error && (
                      <p className="text-[11px] text-rose-700 font-mono bg-rose-50/80 rounded-lg p-1.5 break-all border border-rose-100">
                        {item.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw Technical Reason Box */}
          <div className="space-y-1.5">
            <button
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-gray-500 hover:text-gray-800 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3 h-3" />
                <span>Technical Failure Details</span>
              </span>
              {showTechnicalDetails ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showTechnicalDetails && (
              <div className="bg-[#101815] text-emerald-300 rounded-2xl p-3 text-[11px] font-mono space-y-2 border border-emerald-900/50 shadow-inner">
                <div className="flex items-center justify-between text-gray-400 text-[10px] border-b border-gray-800 pb-1.5">
                  <span>Server Response / Error Log</span>
                  <button
                    onClick={copyTechnicalDetails}
                    className="flex items-center gap-1 text-emerald-400 hover:text-white transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="overflow-x-auto max-h-36 overflow-y-auto space-y-1 text-rose-300 break-all leading-relaxed">
                  <div><strong>Error:</strong> {errorReason}</div>
                  {technicalDetails && <div><strong>Detail:</strong> {technicalDetails}</div>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 relative z-10">
          <button
            onClick={() => {
              onClose();
              onOpenInspector();
            }}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 hover:text-gray-900 transition-all flex items-center justify-center gap-1.5 shadow-2xs card-press-3d"
          >
            <Sliders className="w-3.5 h-3.5 text-gray-500" />
            <span>Open Sync Inspector</span>
          </button>

          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 hover:from-[#0c4a37] hover:to-teal-800 transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-950/20 card-press-3d disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Retrying Sync...' : 'Retry Sync Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

