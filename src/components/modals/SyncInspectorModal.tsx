'use client';

import React, { useState } from 'react';
import {
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  X,
  ShieldCheck,
  Layers,
  Wifi,
  WifiOff,
  Database,
  Trash2,
  PlusCircle,
  Edit3,
  Train,
  BedDouble,
  Receipt,
  FileText,
  User,
  Key,
  LogIn,
  LogOut,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { SyncTableDetail } from '@/lib/sync';

export interface PendingQueueItemDetail {
  id: string;
  entity: string;
  action: 'insert' | 'update' | 'delete' | string;
  recordId: string;
  timestamp: string;
  title?: string;
  error?: string;
}

interface SyncInspectorModalProps {
  isOpen: boolean;
  isSyncing: boolean;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'failed' | 'offline' | 'signed_out';
  syncMessage: string;
  pendingCount: number;
  lastSyncedAt?: string | null;
  tableDetails?: SyncTableDetail[];
  pendingItems?: PendingQueueItemDetail[];
  cloudUser?: any;
  onSyncNow: () => Promise<void> | void;
  onConnectCloud?: (email: string, password: string, mode: 'sign_in' | 'sign_up') => Promise<void>;
  onSignOutCloud?: () => Promise<void>;
  onDeleteQueueItem?: (queueId: string) => Promise<void> | void;
  onClose: () => void;
  localCounts?: {
    itineraryDays: number;
    transportLegs: number;
    accommodations: number;
    documents: number;
    expenses: number;
    checklistsNotes: number;
  };
}

export const SyncInspectorModal: React.FC<SyncInspectorModalProps> = ({
  isOpen,
  isSyncing,
  syncStatus,
  syncMessage,
  pendingCount,
  lastSyncedAt,
  tableDetails = [],
  pendingItems = [],
  cloudUser,
  onSyncNow,
  onConnectCloud,
  onSignOutCloud,
  onDeleteQueueItem,
  onClose,
  localCounts = {
    itineraryDays: 19,
    transportLegs: 12,
    accommodations: 11,
    documents: 0,
    expenses: 0,
    checklistsNotes: 5,
  },
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'sign_in' | 'sign_up'>('sign_in');
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showAuthForm, setShowAuthForm] = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onConnectCloud) return;
    if (!email.trim() || !password.trim()) {
      setAuthError('Email and password are required');
      return;
    }
    setAuthError(null);
    setIsAuthSubmitting(true);
    try {
      await onConnectCloud(email.trim(), password.trim(), authMode);
      setShowAuthForm(false);
      setEmail('');
      setPassword('');
      await onSyncNow();
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const getEntityIcon = (entity: string) => {
    switch (entity) {
      case 'transportLegs':
      case 'transport_legs':
        return <Train className="w-3.5 h-3.5 text-blue-600" />;
      case 'accommodations':
      case 'accommodation_stays':
        return <BedDouble className="w-3.5 h-3.5 text-purple-600" />;
      case 'expenses':
        return <Receipt className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-teal-600" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case 'delete':
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
            <Trash2 className="w-2.5 h-2.5" /> Delete
          </span>
        );
      case 'insert':
      case 'add':
      case 'create':
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            <PlusCircle className="w-2.5 h-2.5" /> Added
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            <Edit3 className="w-2.5 h-2.5" /> Updated
          </span>
        );
    }
  };

  const defaultDetails: SyncTableDetail[] = tableDetails.length > 0 ? tableDetails : [
    {
      name: 'Itinerary Days & Activities',
      synced: cloudUser ? 19 : 0,
      pending: pendingItems.filter(q => q.entity === 'itineraryDays' || q.entity === 'itineraryItems').length,
      status: 'synced',
    },
    {
      name: 'Transport Journeys',
      synced: cloudUser ? localCounts.transportLegs : 0,
      pending: pendingItems.filter(q => q.entity === 'transportLegs').length,
      status: pendingItems.some(q => q.entity === 'transportLegs') ? 'pending' : 'synced',
    },
    {
      name: 'Accommodations & Stays',
      synced: cloudUser ? localCounts.accommodations : 0,
      pending: pendingItems.filter(q => q.entity === 'accommodations').length,
      status: pendingItems.some(q => q.entity === 'accommodations') ? 'pending' : 'synced',
    },
    {
      name: 'Documents & Passes',
      synced: cloudUser ? localCounts.documents : 0,
      pending: pendingItems.filter(q => q.entity === 'documents').length,
      status: pendingItems.some(q => q.entity === 'documents') ? 'pending' : 'synced',
    },
    {
      name: 'Expenses & Budget',
      synced: cloudUser ? localCounts.expenses : 0,
      pending: pendingItems.filter(q => q.entity === 'expenses').length,
      status: pendingItems.some(q => q.entity === 'expenses') ? 'pending' : 'synced',
    },
    {
      name: 'Checklists & Notes',
      synced: cloudUser ? localCounts.checklistsNotes : 0,
      pending: pendingItems.filter(q => q.entity === 'checklists' || q.entity === 'notes').length,
      status: pendingItems.some(q => q.entity === 'checklists' || q.entity === 'notes') ? 'pending' : 'synced',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-[#061812]/75 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative bg-gradient-to-b from-[#ffffff] via-[#fafdfb] to-[#edf4f0] w-full max-w-lg max-h-[92vh] sm:max-h-[86vh] overflow-y-auto rounded-t-[32px] sm:rounded-[32px] shadow-[0_25px_70px_-12px_rgba(9,27,21,0.4),0_0_0_1px_rgba(255,255,255,0.95)_inset] border border-white/90 flex flex-col safe-bottom touch-scroll transform transition-all animate-in zoom-in-95 duration-200 card-3d overflow-hidden">
        {/* Soft Ambient Radial Flare */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-36 bg-gradient-radial from-emerald-400/15 via-teal-400/5 to-transparent blur-2xl pointer-events-none" />

        {/* Mobile drag handle */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
          <div className="w-12 h-1 bg-emerald-950/20 rounded-full" />
        </div>

        {/* 3D Header Bar */}
        <div className="px-5 py-3.5 border-b border-[#e5ebe7] flex items-center justify-between bg-white/95 backdrop-blur-sm sticky top-0 z-10 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#0F5B44] to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-950/20">
              <Cloud className={`w-5 h-5 ${isSyncing ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-gray-900 leading-tight">
                Cloud Sync Inspector
              </h3>
              <p className="text-[10px] sm:text-[11px] text-gray-500 font-semibold mt-0.5 flex items-center gap-1.5">
                {isOnline ? (
                  <span className="flex items-center gap-1 text-emerald-700 font-bold">
                    <Wifi className="w-3 h-3" /> Online · Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-700 font-bold">
                    <WifiOff className="w-3 h-3" /> Offline · Local Queue Active
                  </span>
                )}
                <span className="text-gray-300">·</span>
                {cloudUser?.email ? (
                  <span className="text-[#0F5B44] font-bold truncate max-w-[140px] sm:max-w-none">
                    {cloudUser.email}
                  </span>
                ) : (
                  <span className="text-gray-500 font-bold">Local Device Storage</span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-emerald-50 hover:text-[#0F5B44] transition-all card-press-3d"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* 3D Status Banner */}
          <div className="glass-card card-3d card-depth-3d p-4 rounded-2xl sm:rounded-3xl border border-white/90 bg-gradient-to-tr from-white via-emerald-50/40 to-teal-50/20 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                  isSyncing
                    ? 'bg-gradient-to-tr from-[#0F5B44] to-teal-500 text-white animate-spin'
                    : pendingCount === 0 && cloudUser
                    ? 'bg-gradient-to-tr from-emerald-500 to-teal-600 text-white'
                    : pendingCount > 0
                    ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white'
                    : 'bg-gradient-to-tr from-[#0F5B44] to-teal-600 text-white'
                }`}
              >
                {isSyncing ? (
                  <RefreshCw className="w-6 h-6" />
                ) : pendingCount === 0 && cloudUser ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : pendingCount > 0 ? (
                  <Clock className="w-6 h-6" />
                ) : (
                  <ShieldCheck className="w-6 h-6" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <span className="text-xs sm:text-sm font-black text-gray-900">
                    {isSyncing
                      ? 'Synchronizing Now...'
                      : pendingCount > 0
                      ? `${pendingCount} Pending Operation${pendingCount === 1 ? '' : 's'}`
                      : cloudUser
                      ? 'Local & Cloud Up To Date'
                      : 'Saved Securely on Device'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      pendingCount === 0
                        ? 'bg-emerald-100 text-[#0F5B44] border border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {pendingCount === 0 ? 'All Synced' : `${pendingCount} Queued`}
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 font-medium mt-1 leading-snug">
                  {syncMessage || (pendingCount === 0 ? 'All changes safely stored and mirrored.' : `${pendingCount} operations waiting to be pushed to private cloud.`)}
                </p>
                {lastSyncedAt && (
                  <span className="text-[10px] text-gray-400 font-semibold block mt-1">
                    Last sync: {new Date(lastSyncedAt).toLocaleTimeString()} · {new Date(lastSyncedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 1: WHAT IS PENDING (Always Prominently Visible) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Pending Operations Queue</span>
              </span>
              <span className="text-[10px] font-bold text-gray-500">
                {pendingItems.length} in queue
              </span>
            </div>

            {pendingItems.length > 0 ? (
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-amber-200/80 shadow-xs divide-y divide-gray-100 overflow-hidden max-h-52 overflow-y-auto">
                {pendingItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-amber-50/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                        {getEntityIcon(item.entity)}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-gray-900 block truncate">
                          {item.title || `${item.entity} Record`}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium block">
                          {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'Pending sync'}
                        </span>
                        {item.error && (
                          <span className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200/80 rounded px-1.5 py-0.5 mt-1 block font-medium break-all">
                            ⚠️ {item.error}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {getActionBadge(item.action)}
                      {onDeleteQueueItem && (
                        <button
                          type="button"
                          onClick={() => onDeleteQueueItem(item.id)}
                          className="w-6 h-6 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center"
                          title="Discard this queued operation"
                          aria-label="Discard operation"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex items-center gap-2.5 text-xs text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-[#0F5B44] shrink-0" />
                <span className="font-bold">
                  Zero pending operations — everything is up to date on this device!
                </span>
              </div>
            )}
          </div>

          {/* SECTION 2: DATA TABLES STATUS (Device vs Cloud) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-700" />
                <span>Data Tables Breakdown</span>
              </span>
              <span className="text-[10px] font-bold text-gray-500">
                Device vs Cloud
              </span>
            </div>

            <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-xs divide-y divide-gray-100 overflow-hidden">
              {defaultDetails.map((detail, idx) => (
                <div
                  key={idx}
                  className="p-3 sm:p-3.5 flex items-center justify-between gap-2 hover:bg-emerald-50/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                        detail.pending > 0
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-[#0F5B44] border border-emerald-200'
                      }`}
                    >
                      {detail.pending > 0 ? (
                        <Clock className="w-3.5 h-3.5" />
                      ) : (
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-gray-800 truncate">
                      {detail.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      {cloudUser ? `${detail.synced} in cloud` : 'Local DB'}
                    </span>
                    {detail.pending > 0 ? (
                      <span className="text-[10px] font-black text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                        {detail.pending} queued
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-400">
                        0 pending
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: CLOUD ACCOUNT & MULTI-DEVICE SYNC */}
          <div className="space-y-2">
            {cloudUser ? (
              <div className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#0F5B44] border border-emerald-200 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">
                      Connected Account
                    </span>
                    <span className="text-xs font-bold text-gray-900 truncate block">
                      {cloudUser.email}
                    </span>
                  </div>
                </div>

                {onSignOutCloud && (
                  <button
                    type="button"
                    onClick={onSignOutCloud}
                    className="px-2.5 py-1.5 rounded-xl bg-gray-50 hover:bg-rose-50 text-gray-600 hover:text-rose-600 border border-gray-200 text-xs font-bold flex items-center gap-1 transition-colors card-press-3d shrink-0"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-emerald-100 p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0F5B44] to-teal-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-gray-900">
                        Multi-Device Cloud Sync (Optional)
                      </h4>
                      <p className="text-[10px] text-gray-500 font-semibold">
                        Local Wi-Fi sync is already active. Sign in if you want external Supabase cloud backup.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAuthForm(!showAuthForm)}
                    className="text-xs font-bold text-[#0F5B44] hover:underline shrink-0"
                  >
                    {showAuthForm ? 'Hide Form' : 'Connect Account'}
                  </button>
                </div>

                {showAuthForm && (
                  <form onSubmit={handleAuthSubmit} className="space-y-2.5 pt-2 border-t border-gray-100 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 p-1 bg-gray-50 rounded-xl border border-gray-200/80">
                      <button
                        type="button"
                        onClick={() => setAuthMode('sign_in')}
                        className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${
                          authMode === 'sign_in' ? 'bg-[#0F5B44] text-white shadow-2xs' : 'text-gray-600'
                        }`}
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthMode('sign_up')}
                        className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${
                          authMode === 'sign_up' ? 'bg-[#0F5B44] text-white shadow-2xs' : 'text-gray-600'
                        }`}
                      >
                        Create Free Account
                      </button>
                    </div>

                    <div className="space-y-1">
                      <input
                        type="email"
                        required
                        placeholder="Email address"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-900 outline-none focus:border-[#0F5B44]"
                      />
                    </div>

                    <div className="space-y-1">
                      <input
                        type="password"
                        required
                        placeholder="Password (min 6 characters)"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-900 outline-none focus:border-[#0F5B44]"
                      />
                    </div>

                    {authError && (
                      <p className="text-[10px] text-rose-600 font-bold bg-rose-50 p-2 rounded-xl border border-rose-200">
                        {authError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={isAuthSubmitting}
                      className="w-full py-2.5 rounded-xl bg-[#0F5B44] text-white text-xs font-black shadow-md hover:bg-[#0c4936] transition-all card-press-3d flex items-center justify-center gap-1.5 disabled:opacity-60"
                    >
                      {isAuthSubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <LogIn className="w-3.5 h-3.5" />
                          <span>{authMode === 'sign_in' ? 'Sign In & Sync' : 'Register & Sync'}</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* ACTION BUTTONS WITH 3D TACTILE ELEVATION */}
          <div className="pt-2 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={isSyncing}
              onClick={onSyncNow}
              className="py-3 px-4 rounded-2xl bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-950/20 hover:from-[#146b51] hover:to-teal-800 transition-all card-press-3d flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 rounded-2xl bg-white border border-gray-200 text-gray-700 text-xs sm:text-sm font-black hover:bg-gray-50 transition-all card-press-3d flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Done</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
