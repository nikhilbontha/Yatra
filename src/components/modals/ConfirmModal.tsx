'use client';

import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, LogOut, RefreshCw, Info, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  iconType?: 'trash' | 'warning' | 'logout' | 'reset' | 'info';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isProcessing?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  iconType = 'trash',
  onConfirm,
  onCancel,
  isProcessing = false,
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const renderIcon = () => {
    const iconClass = 'w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2]';
    switch (iconType) {
      case 'trash':
        return <Trash2 className={iconClass} />;
      case 'warning':
        return <AlertTriangle className={iconClass} />;
      case 'logout':
        return <LogOut className={iconClass} />;
      case 'reset':
        return <RefreshCw className={iconClass} />;
      default:
        return <Info className={iconClass} />;
    }
  };

  const getIconStyles = () => {
    switch (variant) {
      case 'warning':
        return {
          glow: 'from-amber-400/20 to-transparent',
          bg: 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-white shadow-amber-500/30 ring-4 ring-amber-100',
        };
      case 'primary':
        return {
          glow: 'from-emerald-400/20 to-transparent',
          bg: 'bg-gradient-to-tr from-[#0F5B44] via-[#146b51] to-teal-600 text-white shadow-emerald-500/30 ring-4 ring-emerald-100',
        };
      case 'danger':
      default:
        return {
          glow: 'from-rose-400/20 to-transparent',
          bg: 'bg-gradient-to-tr from-rose-500 via-rose-600 to-red-600 text-white shadow-rose-500/35 ring-4 ring-rose-100',
        };
    }
  };

  const getConfirmBtnStyles = () => {
    switch (variant) {
      case 'warning':
        return 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white shadow-lg shadow-amber-600/30';
      case 'primary':
        return 'bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 hover:from-[#0d4634] hover:to-teal-800 text-white shadow-lg shadow-emerald-950/25';
      case 'danger':
      default:
        return 'bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-700 hover:to-red-700 text-white shadow-lg shadow-rose-600/35';
    }
  };

  const iconStyle = getIconStyles();

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#061812]/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget && !isProcessing) {
          onCancel();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-sm sm:max-w-md bg-gradient-to-b from-white via-[#fbfdfc] to-[#f4f8f6] rounded-3xl p-6 sm:p-7 border border-white/90 shadow-[0_25px_60px_-15px_rgba(9,27,21,0.35),0_0_0_1px_rgba(255,255,255,0.9)_inset] text-center transform transition-all animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Soft Radial Glow Backdrop */}
        <div
          className={`absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-gradient-radial ${iconStyle.glow} blur-2xl pointer-events-none`}
        />

        {/* Close cross in top right */}
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100/80 transition-all card-press-3d"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 3D Elevated Icon with Halo */}
        <div className="relative z-10">
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl flex items-center justify-center mb-4.5 shadow-xl border border-white/40 transform transition-transform hover:scale-105 duration-200 ${iconStyle.bg}`}
          >
            {renderIcon()}
          </div>

          {/* Heading */}
          <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight leading-snug">
            {title}
          </h3>

          {/* Message / Description */}
          <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed px-1 font-medium whitespace-pre-line">
            {message}
          </p>
        </div>

        {/* 3D Tactile Action Buttons */}
        <div className="relative z-10 grid grid-cols-2 gap-3 mt-6 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="w-full py-3 px-4 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs sm:text-sm shadow-xs transition-all card-press-3d disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={async () => {
              await onConfirm();
            }}
            disabled={isProcessing}
            className={`w-full py-3 px-4 rounded-2xl font-extrabold text-xs sm:text-sm border border-white/20 transition-all card-press-3d disabled:opacity-50 flex items-center justify-center gap-2 ${getConfirmBtnStyles()}`}
          >
            {isProcessing ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : null}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

