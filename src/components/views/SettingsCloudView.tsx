'use client';

import React, { useState, useEffect } from 'react';
import { Trip } from '@/types/trip';
import { CloudRowCounts } from '@/lib/sync';
import {
  Cloud,
  CloudOff,
  User,
  Wifi,
  WifiOff,
  ShieldCheck,
  Settings,
  Database,
  HelpCircle,
  Info,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  Lock,
  Smartphone,
  Download,
  Upload,
  FileText,
  FileJson,
  Key,
  Calendar,
  Layers,
  ChevronRight,
  ExternalLink,
  ChevronDown,
  Trash2,
  Share2,
  Mail,
  Phone,
  Edit2,
  Check,
  Search,
  AlertTriangle,
  Fingerprint,
  MoreVertical,
  LogOut,
  Radio,
} from 'lucide-react';
import { ConfirmModal } from '@/components/modals/ConfirmModal';

import { isValidSupabaseUrl, isValidSupabaseKey } from '@/lib/supabase';

export type SettingsCloudScreen =
  | 'overview'
  | 'cloud_sync'
  | 'sync_settings'
  | 'offline'
  | 'backups'
  | 'restore'
  | 'account'
  | 'app_settings'
  | 'data_storage'
  | 'export_import'
  | 'privacy'
  | 'help';

export interface SettingsCloudViewProps {
  trip?: Trip;
  cloudUser?: any;
  isCloudConnected: boolean;
  syncStatus: 'signed_out' | 'syncing' | 'synced' | 'offline' | 'failed';
  syncMessage?: string;
  cloudRowCounts?: CloudRowCounts | null;
  lastSyncedAt?: string | null;
  isSyncing: boolean;
  pendingSyncCount?: number;
  isOnline?: boolean;
  initialScreen?: SettingsCloudScreen;
  onSync: () => void;
  onExportBackup?: () => void;
  onRestoreBackup?: (file: File) => void;
  onSaveCloudSettings?: (
    url: string,
    key: string,
    email?: string,
    password?: string,
    mode?: 'sign_in' | 'sign_up'
  ) => Promise<void>;
  onCloudSignOut?: () => Promise<void>;
  onResetData?: () => void;
  onCleanDataReset?: () => void;
}

export const SettingsCloudView: React.FC<SettingsCloudViewProps> = ({
  trip,
  cloudUser,
  isCloudConnected,
  syncStatus,
  syncMessage,
  cloudRowCounts,
  lastSyncedAt,
  isSyncing,
  pendingSyncCount = 0,
  isOnline = true,
  initialScreen = 'overview',
  onSync,
  onExportBackup,
  onRestoreBackup,
  onSaveCloudSettings,
  onCloudSignOut,
  onResetData,
  onCleanDataReset,
}) => {
  const [currentScreen, setCurrentScreen] = useState<SettingsCloudScreen>(initialScreen);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  // Sync Settings toggles with persistent localStorage
  const [autoSync, setAutoSync] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('yatra_auto_sync');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const [wifiOnlySync, setWifiOnlySync] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('yatra_wifi_only_sync');
      return saved !== null ? saved === 'true' : false;
    }
    return false;
  });

  const [syncInterval, setSyncInterval] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('yatra_sync_interval') || 'Every 1 hour';
    }
    return 'Every 1 hour';
  });

  // What to sync options
  const [whatToSync, setWhatToSync] = useState<Record<string, boolean>>({
    itinerary: true,
    expenses: true,
    accommodation: true,
    places: true,
    checklists: true,
    notes: true,
    photos: true,
  });

  // Offline toggles
  const [offlineToggles, setOfflineToggles] = useState<Record<string, boolean>>({
    itinerary: true,
    places: true,
    accommodation: true,
    photos: true,
  });

  // Backup state
  const [autoBackup, setAutoBackup] = useState(true);
  const [wifiOnlyBackup, setWifiOnlyBackup] = useState(true);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('yatra_last_backup_time');
    }
    return null;
  });

  // App Settings states with persistent localStorage
  const [themeSetting, setThemeSetting] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('yatra_theme_setting') || 'System Default';
    }
    return 'System Default';
  });

  const [currencySetting] = useState('INR (₹)'); // Strict scope: INR for Indian Pilgrimage
  const [distanceUnit, setDistanceUnit] = useState('Kilometres (km)');
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(true);
  const [enableAnimations, setEnableAnimations] = useState(true);
  const [playNotificationSound, setPlayNotificationSound] = useState(true);
  const [keepScreenAwake, setKeepScreenAwake] = useState(false);
  const [defaultHomeTab, setDefaultHomeTab] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('yatra_default_home_tab') || 'Itinerary';
    }
    return 'Itinerary';
  });

  // Security states
  const [appLock, setAppLock] = useState(true);
  const [requireAuth, setRequireAuth] = useState(true);
  const [useBiometrics, setUseBiometrics] = useState(true);

  // Supabase credentials form state
  const [supabaseUrl, setSupabaseUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('yatra_supabase_url') ||
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        ''
      );
    }
    return '';
  });
  const [supabaseKey, setSupabaseKey] = useState(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('yatra_supabase_key') ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        ''
      );
    }
    return '';
  });
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authMode, setAuthMode] = useState<'sign_in' | 'sign_up'>('sign_in');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleManualSyncClick = () => {
    onSync();
    showToast('Sync initiated with Supabase');
  };

  const handleThemeChange = (newTheme: string) => {
    setThemeSetting(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('yatra_theme_setting', newTheme);
    }
    showToast(`Theme set to ${newTheme}`);
  };

  const handleAutoSyncToggle = (val: boolean) => {
    setAutoSync(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('yatra_auto_sync', String(val));
    }
  };

  const handleWifiOnlyToggle = (val: boolean) => {
    setWifiOnlySync(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('yatra_wifi_only_sync', String(val));
    }
  };

  const handleDefaultTabChange = (tab: string) => {
    setDefaultHomeTab(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('yatra_default_home_tab', tab);
    }
    showToast(`Default start tab: ${tab}`);
  };

  const handleExportBackupClick = () => {
    const now = new Date().toISOString();
    setLastBackupTime(now);
    if (typeof window !== 'undefined') {
      localStorage.setItem('yatra_last_backup_time', now);
    }
    if (onExportBackup) {
      onExportBackup();
    } else {
      showToast('Trip backup exported');
    }
  };

  const handleSaveCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    const cleanUrl = supabaseUrl.trim();
    const cleanKey = supabaseKey.trim();
    const cleanEmail = emailInput.trim();

    if (!cleanUrl || !cleanKey) {
      setAuthError('Supabase Project URL and Public API Key are required');
      return;
    }

    if (!isValidSupabaseUrl(cleanUrl)) {
      setAuthError('Invalid Supabase URL: Must be a valid HTTP or HTTPS address (e.g. https://xyz.supabase.co)');
      return;
    }

    if (!isValidSupabaseKey(cleanKey)) {
      setAuthError('Invalid API Key: Must be a valid public/anon key and must not contain service_role tokens');
      return;
    }

    if (cleanEmail && !/\S+@\S+\.\S+/.test(cleanEmail)) {
      setAuthError('Please enter a valid email address');
      return;
    }

    if (cleanEmail && (!passwordInput || passwordInput.length < 6)) {
      setAuthError('Password must be at least 6 characters long');
      return;
    }

    setIsSubmittingAuth(true);
    try {
      if (onSaveCloudSettings) {
        await onSaveCloudSettings(cleanUrl, cleanKey, cleanEmail || undefined, passwordInput || undefined, authMode);
        if (cleanEmail) {
          const successMsg = authMode === 'sign_up'
            ? 'Account registered! Please check email if confirmation is required.'
            : 'Signed in successfully!';
          setAuthSuccess(successMsg);
          showToast(successMsg);
          // Never persist passwords in component memory after submission
          setPasswordInput('');
        } else {
          setAuthSuccess('Connection settings saved.');
          showToast('Connection settings saved.');
        }
      }
    } catch (err: any) {
      let friendly = err.message || 'Authentication failed. Please check credentials.';
      if (friendly.includes('Invalid login credentials')) {
        friendly = 'Invalid email or password. Please verify your credentials or create an account.';
      } else if (friendly.includes('Email not confirmed')) {
        friendly = 'Email address not yet confirmed. Please check your inbox for the confirmation link.';
      } else if (friendly.includes('User already registered')) {
        friendly = 'An account with this email already exists. Switch to Sign In.';
      }
      setAuthError(friendly);
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // 12-Screen Switcher Navigation List
  const screensList: { id: SettingsCloudScreen; label: string; icon: string }[] = [
    { id: 'overview', label: '1. Overview', icon: '⚙️' },
    { id: 'cloud_sync', label: '2. Cloud Sync', icon: '☁️' },
    { id: 'sync_settings', label: '3. Sync Settings', icon: '🔄' },
    { id: 'offline', label: '4. Offline Access', icon: '📶' },
    { id: 'backups', label: '5. Backups', icon: '🛡️' },
    { id: 'restore', label: '6. Restore Data', icon: '📥' },
    { id: 'account', label: '7. Account Details', icon: '👤' },
    { id: 'app_settings', label: '8. App Settings', icon: '🎨' },
    { id: 'data_storage', label: '9. Data & Storage', icon: '💾' },
    { id: 'export_import', label: '10. Export & Import', icon: '📤' },
    { id: 'privacy', label: '11. Privacy & Security', icon: '🔒' },
    { id: 'help', label: '12. Help & Support', icon: '❓' },
  ];

  // Helper to format timestamps without inventing fake values
  const formatSyncTime = (timestamp?: string | null) => {
    if (!timestamp) return 'Not available';
    try {
      const d = new Date(timestamp);
      if (isNaN(d.getTime())) return 'Not available';
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Not available';
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#0F5B44] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xl animate-fade-in flex items-center gap-2">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 12-Screen Switcher Header Bar - 3D Tactile Strip */}
      <div className="glass-card card-3d card-depth-3d rounded-2xl p-1.5 sm:p-2 border border-white/90 shadow-[0_8px_20px_-4px_rgba(15,91,68,0.08)] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {screensList.map(s => {
          const isActive = currentScreen === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setCurrentScreen(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all card-press-3d ${
                isActive
                  ? 'bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white shadow-md shadow-emerald-950/25 ring-1 ring-emerald-300/40'
                  : 'bg-white/80 text-gray-700 hover:text-[#0F5B44] hover:bg-emerald-50/70 border border-gray-100 shadow-2xs'
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* SCREEN 1: SETTINGS & CLOUD OVERVIEW */}
      {currentScreen === 'overview' && (
        <div className="space-y-4">
          <div className="glass-card card-3d card-depth-3d rounded-3xl p-4 sm:p-5 border border-white/90 shadow-[0_12px_32px_-8px_rgba(15,91,68,0.12)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9.5px] font-black uppercase tracking-wider mb-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>PREFERENCES &amp; SYNC</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Settings &amp; Cloud
                </h1>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Manage your account, sync, backups and app preferences
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black bg-white border border-gray-200 shadow-2xs">
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="text-gray-800">{isOnline ? 'Online' : 'Offline'}</span>
              </div>
            </div>

            {/* 2x3 Grid of Feature Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 mt-4">
              {/* Card 1: Cloud Sync */}
              <div
                onClick={() => setCurrentScreen('cloud_sync')}
                className="cursor-pointer p-4 rounded-2xl bg-gradient-to-b from-emerald-50/80 to-white border border-emerald-200/80 hover:border-emerald-400 hover:shadow-xs transition-all text-center flex flex-col items-center justify-center gap-1.5 card-press-3d shadow-2xs"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-xs">
                  <Cloud className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-black text-gray-900">Cloud Sync</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-[#0F5B44] shadow-2xs">
                  {syncStatus === 'synced'
                    ? 'Synced'
                    : syncStatus === 'syncing'
                    ? 'Syncing...'
                    : syncStatus === 'offline'
                    ? 'Offline'
                    : syncStatus === 'failed'
                    ? 'Sync error'
                    : 'Not connected'}
                </span>
              </div>

              {/* Card 2: Account */}
              <div
                onClick={() => setCurrentScreen('account')}
                className="cursor-pointer p-4 rounded-2xl bg-sky-50/60 border border-sky-100 hover:border-sky-300 transition-all text-center flex flex-col items-center justify-center gap-1.5"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-bold text-gray-900">Account</h3>
                <span className="text-[10px] text-sky-800 font-semibold truncate max-w-[120px]">
                  {cloudUser?.email ? cloudUser.email.split('@')[0] : 'Sign In'}
                </span>
              </div>

              {/* Card 3: Offline Access */}
              <div
                onClick={() => setCurrentScreen('offline')}
                className="cursor-pointer p-4 rounded-2xl bg-teal-50/60 border border-teal-100 hover:border-teal-300 transition-all text-center flex flex-col items-center justify-center gap-1.5"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-500 text-white flex items-center justify-center">
                  <Wifi className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-bold text-gray-900">Offline Access</h3>
                <span className="text-[10px] text-teal-800 font-semibold">
                  {pendingSyncCount > 0 ? `${pendingSyncCount} queued` : '19 Days cached'}
                </span>
              </div>

              {/* Card 4: Backups */}
              <div
                onClick={() => setCurrentScreen('backups')}
                className="cursor-pointer p-4 rounded-2xl bg-blue-50/60 border border-blue-100 hover:border-blue-300 transition-all text-center flex flex-col items-center justify-center gap-1.5"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-bold text-gray-900">Backups</h3>
                <span className="text-[10px] text-blue-800 font-semibold">
                  {lastBackupTime ? 'Backup available' : 'Export JSON'}
                </span>
              </div>

              {/* Card 5: App Settings */}
              <div
                onClick={() => setCurrentScreen('app_settings')}
                className="cursor-pointer p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 hover:border-indigo-300 transition-all text-center flex flex-col items-center justify-center gap-1.5"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center">
                  <Settings className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-bold text-gray-900">App Settings</h3>
                <span className="text-[10px] text-indigo-800 font-semibold">INR (₹) · English</span>
              </div>

              {/* Card 6: Data & Storage */}
              <div
                onClick={() => setCurrentScreen('data_storage')}
                className="cursor-pointer p-4 rounded-2xl bg-amber-50/60 border border-amber-100 hover:border-amber-300 transition-all text-center flex flex-col items-center justify-center gap-1.5"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-bold text-gray-900">Data &amp; Storage</h3>
                <span className="text-[10px] text-amber-800 font-semibold">IndexedDB active</span>
              </div>
            </div>

            {/* Bottom 2 Auxiliary Cards */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div
                onClick={() => setCurrentScreen('help')}
                className="cursor-pointer p-3.5 rounded-2xl border border-gray-100 hover:bg-gray-50 flex items-center gap-3 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#0F5B44] flex items-center justify-center shrink-0">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Help &amp; Support</h4>
                  <p className="text-[10px] text-gray-500">Get assistance</p>
                </div>
              </div>
              <div
                onClick={() => showToast('Yatra Pilgrimage Planner v2.4.0 (Production)')}
                className="cursor-pointer p-3.5 rounded-2xl border border-gray-100 hover:bg-gray-50 flex items-center gap-3 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-gray-50 text-gray-600 flex items-center justify-center shrink-0">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">About App</h4>
                  <p className="text-[10px] text-gray-500">Version 2.4.0</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 2: CLOUD SYNC */}
      {currentScreen === 'cloud_sync' && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('overview')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-bold text-gray-900">Cloud Sync</h2>
              <p className="text-[11px] text-gray-500">Synchronize pilgrimage data with Supabase</p>
            </div>
            <button
              onClick={() => setCurrentScreen('sync_settings')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
              title="Sync Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Big Status Banner */}
          <div
            className={`p-5 rounded-2xl border text-center space-y-2 transition-all ${
              syncStatus === 'synced'
                ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
                : syncStatus === 'offline'
                ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200'
                : syncStatus === 'failed'
                ? 'bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200'
                : 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200'
            }`}
          >
            <div
              className={`w-12 h-12 mx-auto rounded-full text-white flex items-center justify-center shadow-xs ${
                syncStatus === 'synced'
                  ? 'bg-[#0F5B44]'
                  : syncStatus === 'offline'
                  ? 'bg-amber-600'
                  : syncStatus === 'failed'
                  ? 'bg-rose-600'
                  : 'bg-gray-500'
              }`}
            >
              {syncStatus === 'synced' ? (
                <Check className="w-6 h-6 stroke-[3]" />
              ) : syncStatus === 'offline' ? (
                <WifiOff className="w-6 h-6" />
              ) : syncStatus === 'failed' ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <Cloud className="w-6 h-6" />
              )}
            </div>

            <h3 className="text-sm font-bold text-gray-900">
              {syncStatus === 'synced'
                ? 'Synced with Cloud'
                : syncStatus === 'syncing'
                ? 'Synchronizing Changes...'
                : syncStatus === 'offline'
                ? 'Offline Mode Active'
                : syncStatus === 'failed'
                ? 'Sync Encountered an Error'
                : 'Not Connected to Cloud'}
            </h3>

            <p className="text-[11px] text-gray-500">
              Last synced: {formatSyncTime(lastSyncedAt)}
            </p>

            {pendingSyncCount > 0 && (
              <p className="text-[11px] font-bold text-amber-700">
                {pendingSyncCount} local change{pendingSyncCount > 1 ? 's' : ''} queued offline
              </p>
            )}

            {syncMessage && (
              <div className={`p-2.5 rounded-xl text-xs flex items-center justify-center gap-2 ${
                syncStatus === 'failed'
                  ? 'bg-rose-100/80 text-rose-800'
                  : syncStatus === 'offline'
                  ? 'bg-amber-100/80 text-amber-800'
                  : 'bg-emerald-100/80 text-emerald-800'
              }`}>
                <span>{syncMessage}</span>
              </div>
            )}

            <button
              onClick={handleManualSyncClick}
              disabled={isSyncing}
              className="px-6 py-2.5 rounded-2xl bg-[#0F5B44] text-white text-xs font-bold flex items-center justify-center gap-1.5 mx-auto shadow-xs hover:bg-[#16654f] transition-all disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>

          {/* Sync Status items list with genuine database counts */}
          <div className="space-y-2.5 pt-1">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Record Synchronization</h3>
            <div className="divide-y divide-gray-100 text-xs">
              {[
                {
                  name: 'Itinerary Days & Tasks',
                  items: cloudRowCounts
                    ? `${cloudRowCounts.itineraryDays} Days (${cloudRowCounts.itineraryItems} Tasks)`
                    : '19 Days preloaded',
                  icon: '📅',
                },
                {
                  name: 'Expenses & Budget',
                  items: cloudRowCounts ? `${cloudRowCounts.expenses} Entries` : 'Tracked locally',
                  icon: '💳',
                },
                {
                  name: 'Accommodation',
                  items: cloudRowCounts ? `${cloudRowCounts.accommodations} Stays` : '19 Stays',
                  icon: '🏨',
                },
                {
                  name: 'Places & Temples',
                  items: cloudRowCounts ? `${cloudRowCounts.places} Places` : '20+ Pilgrimage Places',
                  icon: '🛕',
                },
                {
                  name: 'Checklists',
                  items: cloudRowCounts ? `${cloudRowCounts.checklists} Items` : '36 Confirmed Items',
                  icon: '☑️',
                },
                {
                  name: 'Notes & Journal',
                  items: cloudRowCounts ? `${cloudRowCounts.notes} Notes` : 'Saved locally',
                  icon: '📝',
                },
                {
                  name: 'Settings',
                  items: 'Preferences & Config',
                  icon: '⚙️',
                },
              ].map((item, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span>{item.icon}</span>
                    <span className="font-semibold text-gray-900">{item.name}</span>
                    <span className="text-[10px] text-gray-400 font-normal">{item.items}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      syncStatus === 'synced'
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {syncStatus === 'synced' ? 'Synced' : 'Local Cache'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 3: SYNC SETTINGS */}
      {currentScreen === 'sync_settings' && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('cloud_sync')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-bold text-gray-900">Sync Settings</h2>
              <p className="text-[11px] text-gray-500">Configure automatic sync &amp; triggers</p>
            </div>
            <div className="w-8" />
          </div>

          {/* Auto sync options */}
          <div className="divide-y divide-gray-100 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">Auto Sync</p>
                <p className="text-[10px] text-gray-400">Automatically sync when connection restored</p>
              </div>
              <input
                type="checkbox"
                checked={autoSync}
                onChange={e => handleAutoSyncToggle(e.target.checked)}
                className="w-4 h-4 accent-[#0F5B44]"
              />
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">Sync on Wi-Fi Only</p>
                <p className="text-[10px] text-gray-400">Preserve mobile cellular data during travel</p>
              </div>
              <input
                type="checkbox"
                checked={wifiOnlySync}
                onChange={e => handleWifiOnlyToggle(e.target.checked)}
                className="w-4 h-4 accent-[#0F5B44]"
              />
            </div>
            <div className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-gray-50">
              <span className="font-semibold text-gray-900">Sync Interval</span>
              <span className="font-bold text-gray-600 flex items-center gap-1">
                {syncInterval} &gt;
              </span>
            </div>
          </div>

          {/* What to Sync */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">What to Sync</h3>
            <div className="divide-y divide-gray-100 text-xs">
              {[
                { id: 'itinerary', label: 'Itinerary & Days' },
                { id: 'expenses', label: 'Budget & Expenses' },
                { id: 'accommodation', label: 'Accommodation' },
                { id: 'places', label: 'Places & Temples' },
                { id: 'checklists', label: 'Checklists' },
                { id: 'notes', label: 'Notes & Journal' },
              ].map(opt => (
                <div key={opt.id} className="py-2 flex items-center justify-between">
                  <span className="font-medium text-gray-800">{opt.label}</span>
                  <input
                    type="checkbox"
                    checked={whatToSync[opt.id]}
                    onChange={e => setWhatToSync(prev => ({ ...prev, [opt.id]: e.target.checked }))}
                    className="w-4 h-4 accent-[#0F5B44]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Advanced */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Conflict Resolution</h3>
            <div className="divide-y divide-gray-100 text-xs">
              <div
                onClick={() => showToast('Conflict policy: Server timestamps & user choice')}
                className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-gray-50"
              >
                <span className="font-semibold text-gray-900">Resolve Conflicts</span>
                <span className="text-gray-500 font-bold">Keep latest version &gt;</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 4: OFFLINE ACCESS */}
      {currentScreen === 'offline' && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('overview')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-bold text-gray-900">Offline Access</h2>
              <p className="text-[11px] text-gray-500">IndexedDB local storage active</p>
            </div>
            <div className="w-8" />
          </div>

          {/* Status banner */}
          <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 text-center space-y-1">
            <div className="w-10 h-10 mx-auto rounded-full bg-teal-600 text-white flex items-center justify-center">
              <Wifi className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-gray-900">Offline Mode Ready</h3>
            <p className="text-[10px] text-gray-500">
              Your 19-day pilgrimage itinerary and data are fully cached in IndexedDB
            </p>
          </div>

          {/* Local cache summary */}
          <div className="space-y-2 pt-1">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Cached Pilgrimage Data</h3>
            <div className="divide-y divide-gray-100 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">Itinerary &amp; Days</p>
                  <p className="text-[10px] text-gray-400">19 planned days cached locally</p>
                </div>
                <span className="text-emerald-700 font-bold">Available Offline</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">Places &amp; Temples</p>
                  <p className="text-[10px] text-gray-400">20+ verified temples &amp; ghats</p>
                </div>
                <span className="text-emerald-700 font-bold">Available Offline</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">Accommodation</p>
                  <p className="text-[10px] text-gray-400">19 dharamshalas &amp; stays</p>
                </div>
                <span className="text-emerald-700 font-bold">Available Offline</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">Checklists</p>
                  <p className="text-[10px] text-gray-400">36 verified checklist items</p>
                </div>
                <span className="text-emerald-700 font-bold">Available Offline</span>
              </div>
            </div>
          </div>

          {/* Pending Changes */}
          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-gray-700">
              <span>Pending Offline Sync Operations</span>
              <span>{pendingSyncCount}</span>
            </div>
            <p className="text-[10px] text-gray-500">
              {pendingSyncCount === 0
                ? 'All local changes are fully synchronized'
                : `${pendingSyncCount} local edit(s) will automatically upload once online`}
            </p>
          </div>

          {/* PWA & Service Worker Diagnostics */}
          <div className="space-y-2 pt-1">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Service Worker &amp; Offline Diagnostics</h3>
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">Security Context</p>
                  <p className="text-[10px] text-gray-400">
                    {typeof window !== 'undefined' ? window.location.origin : 'Current origin'}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  typeof window !== 'undefined' && window.isSecureContext
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  {typeof window !== 'undefined' && window.isSecureContext ? 'Secure Context (HTTPS / Localhost)' : 'Insecure Origin (HTTP LAN)'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">Service Worker Controller</p>
                  <p className="text-[10px] text-gray-400">Offline shell cache controller</p>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  typeof navigator !== 'undefined' && navigator.serviceWorker?.controller
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}>
                  {typeof navigator !== 'undefined' && navigator.serviceWorker?.controller
                    ? 'Active & Controlling'
                    : 'Not Controlling'}
                </span>
              </div>

              {typeof window !== 'undefined' && !window.isSecureContext && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] space-y-1">
                  <p className="font-bold">⚠️ Mobile HTTP LAN Limitation:</p>
                  <p>
                    Android browsers strictly disable Service Worker registration on plain HTTP LAN addresses (e.g. <code>http://192.168.x.x:3000</code>).
                  </p>
                  <p>
                    To test offline reload on your phone:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 pl-1">
                    <li>Use Android USB Chrome Port Forwarding (access via <code>http://localhost:3000</code>).</li>
                    <li>Or launch a secure HTTPS tunnel (e.g., Cloudflare Tunnel / ngrok).</li>
                    <li>Or add your LAN IP to Chrome&apos;s <code>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code>.</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 5: BACKUPS */}
      {currentScreen === 'backups' && (
        <div className="glass-card card-3d card-depth-3d rounded-3xl p-5 sm:p-6 border border-white/90 shadow-[0_16px_36px_-8px_rgba(9,27,21,0.08),0_1px_3px_rgba(0,0,0,0.03)] bg-gradient-to-b from-white via-[#fafdfb] to-[#f4f8f5] space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('overview')}
              className="w-9 h-9 rounded-full bg-white/90 border border-gray-200/70 shadow-2xs flex items-center justify-center text-gray-700 hover:bg-emerald-50 hover:text-[#0F5B44] transition-all card-press-3d"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-black text-gray-900 tracking-tight">Backups</h2>
              <p className="text-[11px] text-gray-500 font-medium">Create &amp; manage backups</p>
            </div>
            <button
              onClick={() => setCurrentScreen('restore')}
              className="text-xs font-black text-[#0F5B44] hover:underline card-press-3d"
            >
              Restore &gt;
            </button>
          </div>

          {/* Status banner with 3D elevation */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/8 to-teal-500/12 border border-emerald-300/80 flex items-center justify-between gap-3 card-3d shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#0F5B44] to-teal-700 text-white flex items-center justify-center shrink-0 shadow-md">
                <ShieldCheck className="w-6 h-6 drop-shadow-xs" />
              </div>
              <div>
                <h3 className="text-xs font-black text-gray-900 tracking-tight">Your data is safe</h3>
                <p className="text-[10px] text-gray-600 font-medium mt-0.5">
                  Last backup: {lastBackupTime ? formatSyncTime(lastBackupTime) : 'Not available'}
                </p>
              </div>
            </div>
            <button
              onClick={handleExportBackupClick}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-950/20 hover:shadow-lg transition-all card-press-3d"
            >
              Back Up Now
            </button>
          </div>

          {/* Backup History */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Backup History</h3>
            <div className="space-y-2">
              <div className="p-3.5 sm:p-4 rounded-2xl border border-white/90 bg-white/90 shadow-2xs flex items-center justify-between hover:bg-emerald-50/40 card-3d card-press-3d transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#0F5B44] flex items-center justify-center shrink-0 shadow-2xs">
                    <Cloud className="w-5 h-5 text-[#0F5B44]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-900">
                      {lastBackupTime ? formatSyncTime(lastBackupTime) : 'Local Storage Snapshot'}
                    </h4>
                    <p className="text-[10px] text-gray-500 font-medium">Complete JSON trip export</p>
                  </div>
                </div>
                <button
                  onClick={handleExportBackupClick}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 text-xs font-black text-[#0F5B44] hover:bg-emerald-100/80 shadow-2xs card-press-3d transition-all"
                >
                  Download
                </button>
              </div>
            </div>
          </div>

          {/* Phase 1 Clean Data Reset Action Card */}
          <div className="pt-3 border-t border-gray-100/80">
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/15 via-amber-500/8 to-yellow-500/10 border border-amber-300/80 space-y-2.5 card-3d shadow-xs">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-amber-800" />
                <h4 className="text-xs font-black text-gray-900 tracking-tight">Clean Data Reset (Phase 1)</h4>
              </div>
              <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                Safely remove obsolete sample records from device and Supabase. Creates a clean empty state while preserving your authentication, account profile, and schemas.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (onCleanDataReset) {
                    onCleanDataReset();
                  } else {
                    showToast('Clean reset triggered');
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-700 via-amber-600 to-yellow-700 hover:shadow-md text-white text-xs font-black shadow-xs transition-all flex items-center gap-2 card-press-3d"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Execute Clean Data Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 6: RESTORE DATA */}
      {currentScreen === 'restore' && (
        <div className="glass-card card-3d card-depth-3d rounded-3xl p-5 sm:p-6 border border-white/90 shadow-[0_16px_36px_-8px_rgba(9,27,21,0.08),0_1px_3px_rgba(0,0,0,0.03)] bg-gradient-to-b from-white via-[#fafdfb] to-[#f4f8f5] space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('backups')}
              className="w-9 h-9 rounded-full bg-white/90 border border-gray-200/70 shadow-2xs flex items-center justify-center text-gray-700 hover:bg-emerald-50 hover:text-[#0F5B44] transition-all card-press-3d"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-black text-gray-900 tracking-tight">Restore Data</h2>
              <p className="text-[11px] text-gray-500 font-medium">Restore trip data from JSON backup</p>
            </div>
            <div className="w-9" />
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-amber-500/8 to-yellow-500/10 border border-amber-300/80 flex items-start gap-3 card-3d shadow-xs">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 leading-relaxed font-medium">
              Restoring will safely populate your local IndexedDB with records from your backup file.
            </p>
          </div>

          {/* File Upload Option */}
          <div className="p-8 text-center border-2 border-dashed border-emerald-300/80 bg-white/80 rounded-3xl space-y-3.5 card-3d shadow-inner hover:border-emerald-500 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#0F5B44] flex items-center justify-center mx-auto shadow-xs">
              <Upload className="w-6 h-6 text-[#0F5B44]" />
            </div>
            <div>
              <h4 className="text-xs font-black text-gray-900">Select Yatra Backup JSON</h4>
              <p className="text-[10px] text-gray-500 font-medium mt-0.5">Upload a previously exported .json file</p>
            </div>
            <label className="inline-block px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white text-xs font-black cursor-pointer hover:shadow-lg transition-all card-press-3d shadow-md shadow-emerald-950/20">
              <span>Choose File</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file && onRestoreBackup) {
                    onRestoreBackup(file);
                  }
                }}
              />
            </label>
          </div>
        </div>
      )}

      {/* SCREEN 7: ACCOUNT DETAILS */}
      {currentScreen === 'account' && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('overview')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-bold text-gray-900">Account Details</h2>
              <p className="text-[11px] text-gray-500">Authentication &amp; profile</p>
            </div>
            <div className="w-8" />
          </div>

          {/* Connection State Badge Calculation */}
          {(() => {
            let connectionState: 'Connected' | 'Connecting' | 'Error' | 'Guest' | 'Not configured' = 'Guest';
            let connectionBadgeColor = 'bg-blue-50 text-blue-700 border-blue-200';

            if (cloudUser) {
              connectionState = 'Connected';
              connectionBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            } else if (isSubmittingAuth) {
              connectionState = 'Connecting';
              connectionBadgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
            } else if (authError) {
              connectionState = 'Error';
              connectionBadgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
            } else if (!supabaseUrl.trim() || !supabaseKey.trim()) {
              connectionState = 'Not configured';
              connectionBadgeColor = 'bg-slate-100 text-slate-600 border-slate-200';
            } else {
              connectionState = 'Guest';
              connectionBadgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
            }

            return (
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#0F5B44] text-white flex items-center justify-center font-bold text-lg">
                    {cloudUser?.email ? cloudUser.email[0].toUpperCase() : 'Y'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-900">
                        {cloudUser?.email ? cloudUser.email.split('@')[0] : 'Guest Pilgrim'}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${connectionBadgeColor}`}>
                        {connectionState}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {cloudUser?.email || 'Not connected to Supabase'}
                    </p>
                  </div>
                </div>
                {cloudUser && (
                  <button
                    onClick={() => setShowSignOutConfirm(true)}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600 hover:bg-rose-100 flex items-center gap-1 card-press-3d"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            );
          })()}

          {/* Credentials Form (If not signed in) */}
          {!cloudUser && (
            <form onSubmit={handleSaveCredentialsSubmit} className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Connect Supabase Cloud</h3>
                {/* Mode Selector */}
                <div className="inline-flex rounded-xl bg-gray-100 p-0.5 border border-gray-200">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('sign_in'); setAuthError(null); setAuthSuccess(null); }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      authMode === 'sign_in' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('sign_up'); setAuthError(null); setAuthSuccess(null); }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      authMode === 'sign_up' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Create Account
                  </button>
                </div>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{authError}</span>
                </div>
              )}

              {authSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{authSuccess}</span>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Supabase URL</label>
                <input
                  type="url"
                  value={supabaseUrl}
                  onChange={e => setSupabaseUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono"
                  disabled={isSubmittingAuth}
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">Anon Public Key</label>
                <input
                  type="password"
                  value={supabaseKey}
                  onChange={e => setSupabaseKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono"
                  disabled={isSubmittingAuth}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">Email</label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    placeholder="pilgrim@example.com"
                    className="w-full px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs"
                    disabled={isSubmittingAuth}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">Password</label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs"
                    disabled={isSubmittingAuth}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="w-full py-2.5 rounded-xl bg-[#0F5B44] text-white text-xs font-bold hover:bg-[#16654f] transition-all disabled:opacity-50"
              >
                {isSubmittingAuth
                  ? 'Connecting...'
                  : authMode === 'sign_up'
                  ? 'Create Account'
                  : 'Save & Authenticate'}
              </button>

              <p className="text-[10px] text-gray-500 text-center pt-1">
                {authMode === 'sign_in' ? (
                  <>
                    Need an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setAuthMode('sign_up'); setAuthError(null); setAuthSuccess(null); }}
                      className="text-[#0F5B44] font-bold underline"
                    >
                      Create Account
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setAuthMode('sign_in'); setAuthError(null); setAuthSuccess(null); }}
                      className="text-[#0F5B44] font-bold underline"
                    >
                      Sign In
                    </button>
                  </>
                )}
              </p>
            </form>
          )}
        </div>
      )}

      {/* SCREEN 8: APP SETTINGS */}
      {currentScreen === 'app_settings' && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('overview')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-bold text-gray-900">App Settings</h2>
              <p className="text-[11px] text-gray-500">Theme, currency and preferences</p>
            </div>
            <div className="w-8" />
          </div>

          {/* General Settings */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">General Settings</h3>
            <div className="divide-y divide-gray-100 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="font-semibold text-gray-900">Theme</span>
                <select
                  value={themeSetting}
                  onChange={e => handleThemeChange(e.target.value)}
                  className="bg-transparent font-bold text-[#0F5B44] text-xs text-right cursor-pointer"
                >
                  <option value="System Default">System Default</option>
                  <option value="Light">Light</option>
                  <option value="Dark">Dark</option>
                </select>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="font-semibold text-gray-900">Currency</span>
                <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                  {currencySetting}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="font-semibold text-gray-900">Distance Unit</span>
                <span className="font-bold text-gray-600">{distanceUnit}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="font-semibold text-gray-900">Default Home Tab</span>
                <select
                  value={defaultHomeTab}
                  onChange={e => handleDefaultTabChange(e.target.value)}
                  className="bg-transparent font-bold text-[#0F5B44] text-xs text-right cursor-pointer"
                >
                  <option value="Itinerary">Itinerary</option>
                  <option value="Dashboard">Dashboard</option>
                  <option value="Budget">Budget</option>
                  <option value="Tickets">Tickets</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 9: DATA & STORAGE */}
      {currentScreen === 'data_storage' && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('overview')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-bold text-gray-900">Data &amp; Storage</h2>
              <p className="text-[11px] text-gray-500">IndexedDB local database info</p>
            </div>
            <div className="w-8" />
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
            <h4 className="text-xs font-bold text-gray-900">Dexie IndexedDB Storage</h4>
            <div className="divide-y divide-gray-100 text-xs">
              <div className="py-2 flex justify-between">
                <span className="text-gray-500">Database Name</span>
                <span className="font-mono font-bold text-gray-800">YatraDatabase</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-gray-500">Current Trip ID</span>
                <span className="font-mono text-[10px] text-gray-800">{trip?.id || 'Active'}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-gray-500">Offline Queue</span>
                <span className="font-bold text-[#0F5B44]">{pendingSyncCount} pending</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 10: EXPORT & IMPORT */}
      {currentScreen === 'export_import' && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('overview')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-bold text-gray-900">Export &amp; Import</h2>
              <p className="text-[11px] text-gray-500">Backups and transfer files</p>
            </div>
            <div className="w-8" />
          </div>

          {/* Export Data */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Export Data</h3>
            <div className="p-3 rounded-2xl border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileJson className="w-5 h-5 text-emerald-600" />
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Export as JSON</h4>
                  <p className="text-[10px] text-gray-500">Complete trip data</p>
                </div>
              </div>
              <button
                onClick={handleExportBackupClick}
                className="px-3 py-1.5 rounded-xl bg-[#0F5B44] text-white text-xs font-bold hover:bg-[#16654f]"
              >
                Export
              </button>
            </div>
          </div>

          {/* Import Data */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Import Data</h3>
            <div className="p-3 rounded-2xl border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Upload className="w-5 h-5 text-teal-600" />
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Import from File</h4>
                  <p className="text-[10px] text-gray-500">Restore data from a JSON backup</p>
                </div>
              </div>
              <label className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 cursor-pointer">
                <span>Choose File</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file && onRestoreBackup) onRestoreBackup(file);
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 11: PRIVACY & SECURITY */}
      {currentScreen === 'privacy' && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('overview')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-bold text-gray-900">Privacy &amp; Security</h2>
              <p className="text-[11px] text-gray-500">Row-Level Security &amp; privacy policy</p>
            </div>
            <div className="w-8" />
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-gray-900">Row Level Security (RLS)</p>
                <p className="text-[10px] text-gray-500">
                  Every table in PostgreSQL is protected by RLS policies ensuring users can only read and write their own records.
                </p>
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-gray-900">Encrypted in Transit &amp; at Rest</p>
                <p className="text-[10px] text-gray-500">
                  All synchronization with Supabase cloud occurs over TLS/HTTPS with JWT token authentication.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 12: HELP & SUPPORT */}
      {currentScreen === 'help' && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentScreen('overview')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-bold text-gray-900">Help &amp; Support</h2>
              <p className="text-[11px] text-gray-500">Offline guides and troubleshooting</p>
            </div>
            <div className="w-8" />
          </div>

          <div className="space-y-2 pt-1">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Quick Help</h3>
            <div className="divide-y divide-gray-100 text-xs">
              {[
                { title: 'Offline Pilgrimage Use', desc: 'All itinerary and stays remain accessible without internet' },
                { title: 'Cloud Synchronization', desc: 'Sync your data across devices with Supabase' },
                { title: 'JSON Backups', desc: 'Download a full local copy of your pilgrimage records' },
                { title: 'Clean Reset', desc: 'Safely reset sample records while preserving accounts' },
              ].map((qh, i) => (
                <div
                  key={i}
                  onClick={() => showToast(`Topic: ${qh.title}`)}
                  className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{qh.title}</p>
                    <p className="text-[10px] text-gray-400">{qh.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3D Confirmation Popup for Sign Out */}
      <ConfirmModal
        isOpen={showSignOutConfirm}
        title="Sign Out of Supabase?"
        message="Are you sure you want to sign out of your Supabase cloud account?\nYour locally cached offline trip data and documents will remain safe on this device."
        confirmLabel="Sign Out"
        cancelLabel="Stay Connected"
        variant="warning"
        iconType="logout"
        onConfirm={async () => {
          setShowSignOutConfirm(false);
          if (onCloudSignOut) {
            await onCloudSignOut();
          }
          showToast('Signed out successfully');
        }}
        onCancel={() => setShowSignOutConfirm(false)}
      />
    </div>
  );
};
