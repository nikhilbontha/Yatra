'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, X } from 'lucide-react';

export interface AlertModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  buttonLabel?: string;
  variant?: 'info' | 'warning' | 'error' | 'success';
  onClose: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  title,
  message,
  buttonLabel = 'Understood',
  variant = 'warning',
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const defaultTitles: Record<string, string> = {
    info: 'Information',
    warning: 'Please Note',
    error: 'Action Required',
    success: 'Success',
  };

  const modalTitle = title || defaultTitles[variant] || 'Notification';

  const renderIcon = () => {
    const iconClass = 'w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2]';
    switch (variant) {
      case 'success':
        return <CheckCircle2 className={iconClass} />;
      case 'error':
        return <AlertCircle className={iconClass} />;
      case 'info':
        return <Info className={iconClass} />;
      case 'warning':
      default:
        return <AlertTriangle className={iconClass} />;
    }
  };

  const getStyles = () => {
    switch (variant) {
      case 'success':
        return {
          glow: 'from-emerald-400/20 to-transparent',
          bg: 'bg-gradient-to-tr from-[#0F5B44] via-[#146b51] to-teal-600 text-white shadow-emerald-500/30 ring-4 ring-emerald-100',
          btn: 'bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 hover:from-[#0d4634] hover:to-teal-800 text-white shadow-emerald-950/25',
        };
      case 'error':
        return {
          glow: 'from-rose-400/20 to-transparent',
          bg: 'bg-gradient-to-tr from-rose-500 via-rose-600 to-red-600 text-white shadow-rose-500/35 ring-4 ring-rose-100',
          btn: 'bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-700 hover:to-red-700 text-white shadow-rose-600/35',
        };
      case 'info':
        return {
          glow: 'from-sky-400/20 to-transparent',
          bg: 'bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-sky-500/30 ring-4 ring-sky-100',
          btn: 'bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-700 hover:to-blue-700 text-white shadow-blue-600/30',
        };
      case 'warning':
      default:
        return {
          glow: 'from-amber-400/20 to-transparent',
          bg: 'bg-gradient-to-tr from-amber-500 to-yellow-500 text-white shadow-amber-500/30 ring-4 ring-amber-100',
          btn: 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white shadow-amber-600/30',
        };
    }
  };

  const style = getStyles();

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#061812]/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-sm sm:max-w-md bg-gradient-to-b from-white via-[#fbfdfc] to-[#f4f8f6] rounded-3xl p-6 sm:p-7 border border-white/90 shadow-[0_25px_60px_-15px_rgba(9,27,21,0.35),0_0_0_1px_rgba(255,255,255,0.9)_inset] text-center transform transition-all animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Soft Radial Glow */}
        <div
          className={`absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-gradient-radial ${style.glow} blur-2xl pointer-events-none`}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100/80 transition-all card-press-3d"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 3D Icon */}
        <div className="relative z-10">
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl flex items-center justify-center mb-4.5 shadow-xl border border-white/40 transform transition-transform hover:scale-105 duration-200 ${style.bg}`}
          >
            {renderIcon()}
          </div>

          <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight leading-snug">
            {modalTitle}
          </h3>

          <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed px-1 font-medium whitespace-pre-line">
            {message}
          </p>
        </div>

        {/* Action Button */}
        <div className="relative z-10 mt-6 pt-2">
          <button
            type="button"
            onClick={onClose}
            className={`w-full py-3 px-5 rounded-2xl font-extrabold text-xs sm:text-sm shadow-lg border border-white/20 transition-all card-press-3d ${style.btn}`}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

