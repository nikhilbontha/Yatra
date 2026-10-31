'use client';

import React, { useState } from 'react';
import {
  Trip,
  Expense,
  BookingDocument,
  DocumentType,
  ItineraryDay,
  AccommodationStay,
  AccommodationBookingStatus,
  TripNote,
  ConflictItem,
  ExpenseCategory,
  PaymentMethod,
  DayThemeType,
  StayType,
  NoteCategory,
} from '@/types/trip';
import { X, Upload, AlertTriangle, ShieldCheck, Plus, Check, FileText, Image as ImageIcon, Trash2, CheckCircle2 } from 'lucide-react';
import { formatRupee } from '@/lib/calculations';
import { getCategoryDisplayLabel, formatDateShort } from '@/components/views/BudgetView';

interface ModalWrapperProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const ModalWrapper: React.FC<ModalWrapperProps> = ({ title, subtitle, onClose, children }) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#061812]/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative bg-gradient-to-b from-[#ffffff] via-[#fafdfb] to-[#edf4f0] w-full max-w-lg max-h-[92vh] sm:max-h-[86vh] overflow-y-auto rounded-t-[32px] sm:rounded-[32px] shadow-[0_25px_70px_-12px_rgba(9,27,21,0.4),0_0_0_1px_rgba(255,255,255,0.95)_inset] border border-white/90 flex flex-col safe-bottom touch-scroll transform transition-all animate-in zoom-in-95 duration-200 card-3d">
        {/* Soft Ambient Radial Flare */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-36 bg-gradient-radial from-emerald-400/15 via-teal-400/5 to-transparent blur-2xl pointer-events-none" />

        {/* Mobile drag handle indicator */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
          <div className="w-12 h-1 bg-emerald-950/20 rounded-full" />
        </div>

        {/* 3D Glassmorphic Header */}
        <div className="px-5 py-3.5 border-b border-gray-100/80 flex items-center justify-between bg-white/90 backdrop-blur-md sticky top-0 z-10 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
            <div>
              <h3 className="font-black text-sm sm:text-base text-gray-900 tracking-tight leading-none">{title}</h3>
              {subtitle && (
                <p className="text-[10px] sm:text-[11px] text-gray-500 font-semibold mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-emerald-50 hover:text-[#0F5B44] transition-all card-press-3d border border-gray-200/60"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 relative z-10">{children}</div>
      </div>
    </div>
  );
};

// 1. Trip Settings Modal
export const TripSettingsModal: React.FC<{
  trip: Trip;
  onSave: (updated: Partial<Trip>) => void;
  onClose: () => void;
}> = ({ trip, onSave, onClose }) => {
  const [totalBudget, setTotalBudget] = useState<string>(
    trip.totalBudget ? String(trip.totalBudget) : ''
  );
  const [emergencyReserve, setEmergencyReserve] = useState<string>(
    trip.emergencyReserve ? String(trip.emergencyReserve) : ''
  );
  const [openingCash, setOpeningCash] = useState<string>(
    trip.openingCash ? String(trip.openingCash) : ''
  );
  const [totalUpiAmount, setTotalUpiAmount] = useState<string>(
    trip.totalUpiAmount !== undefined && trip.totalUpiAmount !== 0
      ? String(trip.totalUpiAmount)
      : trip.totalBudget
      ? String(Math.max(0, (trip.totalBudget || 0) - (trip.openingCash || 0) - (trip.emergencyReserve || 0)))
      : ''
  );
  const [title, setTitle] = useState(trip.title);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const budgetNum = totalBudget ? Math.max(0, Number(totalBudget)) : 0;
    const reserveNum = emergencyReserve ? Math.max(0, Number(emergencyReserve)) : 0;
    const cashNum = openingCash ? Math.max(0, Number(openingCash)) : 0;
    const upiNum = totalUpiAmount ? Math.max(0, Number(totalUpiAmount)) : 0;

    onSave({
      title,
      totalBudget: budgetNum,
      emergencyReserve: reserveNum,
      openingCash: cashNum,
      totalUpiAmount: upiNum,
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <ModalWrapper title="Trip Settings & Budget Ceiling" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-bold text-[#374151] mb-1">Trip Name</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#111827] focus:border-[#0f4c3a]"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#374151] mb-1">
              Total Budget (₹)
            </label>
            <input
              type="number"
              min="0"
              step="100"
              value={totalBudget}
              onChange={e => {
                const val = e.target.value;
                setTotalBudget(val);
                const b = parseFloat(val) || 0;
                const c = parseFloat(openingCash) || 0;
                const r = parseFloat(emergencyReserve) || 0;
                const remainingUpi = Math.max(0, b - c - r);
                setTotalUpiAmount(remainingUpi > 0 ? String(remainingUpi) : '');
              }}
              placeholder="e.g. 25000"
              className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#111827] focus:border-[#0f4c3a]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#374151] mb-1">
              Total UPI Allocation (₹)
            </label>
            <input
              type="number"
              min="0"
              step="100"
              value={totalUpiAmount}
              onChange={e => setTotalUpiAmount(e.target.value)}
              placeholder="e.g. 15000"
              className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#111827] focus:border-[#0f4c3a]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#374151] mb-1">
              Total Hand Cash (₹)
            </label>
            <input
              type="number"
              min="0"
              step="100"
              value={openingCash}
              onChange={e => setOpeningCash(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#111827] focus:border-[#0f4c3a]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#374151] mb-1">
              Emergency Reserve (₹)
            </label>
            <input
              type="number"
              min="0"
              step="100"
              value={emergencyReserve}
              onChange={e => setEmergencyReserve(e.target.value)}
              placeholder="e.g. 3000"
              className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#111827] focus:border-[#0f4c3a]"
            />
          </div>
        </div>
        <p className="text-[11px] text-[#6b7280]">
          Total budget is partitioned across digital UPI, physical currency in hand, and protected emergency reserve.
        </p>


        <div className="pt-3 border-t border-[#e5ebe7] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-[#e5ebe7] text-[#6b7280] hover:bg-[#f3f4f6]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0f4c3a] text-white hover:bg-[#16654f] transition-all touch-press"
          >
            Save Settings
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
};

// 2. Expense Modal
export const ExpenseModal: React.FC<{
  initialData?: Expense | null;
  defaultDate?: string;
  days?: ItineraryDay[];
  onSave: (expense: Partial<Expense>) => Promise<any> | void;
  onClose: () => void;
}> = ({ initialData, defaultDate, days = [], onSave, onClose }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [amount, setAmount] = useState<string>(
    initialData?.amount !== undefined && initialData?.amount !== null ? String(initialData.amount) : ''
  );
  const [date, setDate] = useState(
    initialData?.date || defaultDate || new Date().toISOString().slice(0, 10)
  );
  const [category, setCategory] = useState<ExpenseCategory>(initialData?.category || 'Transport');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initialData?.paymentMethod || 'UPI');
  const [destination, setDestination] = useState(initialData?.destination || '');
  const [dayId, setDayId] = useState(initialData?.dayId || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [isCashInflow, setIsCashInflow] = useState(initialData?.isCashInflow || false);

  const [errors, setErrors] = useState<{ amount?: string; date?: string; category?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const errs: { amount?: string; date?: string; category?: string } = {};

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || !Number.isFinite(amountNum) || amountNum <= 0) {
      errs.amount = 'Amount must be a positive number greater than ₹0.';
    }

    if (!date || isNaN(new Date(date).getTime())) {
      errs.date = 'Please select a valid expense date.';
    }

    if (!category) {
      errs.category = 'Please choose an expense category.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validate()) return;

    const amountNum = parseFloat(amount);
    const resolvedTitle = title.trim() || getCategoryDisplayLabel(category);

    setIsSubmitting(true);
    setServerError(null);

    try {
      await onSave({
        id: initialData?.id,
        title: resolvedTitle,
        amount: amountNum,
        date,
        category,
        paymentMethod,
        destination: destination.trim() || undefined,
        dayId: dayId || undefined,
        notes: notes.trim() || undefined,
        isCashInflow,
        updatedAt: new Date().toISOString(),
      });
      onClose();
    } catch (err: any) {
      setServerError(err?.message || 'Failed to save expense. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <ModalWrapper
      title={initialData ? `Edit Expense: ${initialData.title || 'Saved Item'}` : 'Add Pilgrimage Expense'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Edit mode contextual indicator */}
        {initialData && (
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[#0f4c3a] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#0f4c3a]" />
              <span>Editing saved expense</span>
            </div>
            <span className="text-[10px] text-gray-500 font-mono">
              ID: {initialData.id.slice(0, 8)}...
            </span>
          </div>
        )}

        {/* Server / Save Error Banner */}
        {serverError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-2xl text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{serverError}</div>
          </div>
        )}

        {/* Amount & Date (Required) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#374151] mb-1">
              Amount (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0.01"
              step="any"
              value={amount}
              onChange={e => {
                setAmount(e.target.value);
                if (errors.amount) setErrors(prev => ({ ...prev, amount: undefined }));
              }}
              placeholder="e.g. 250"
              className={`w-full bg-white border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#111827] font-bold focus:border-[#0f4c3a] outline-none ${
                errors.amount ? 'border-red-400 focus:border-red-500' : 'border-[#e5ebe7]'
              }`}
              required
              autoFocus
            />
            {errors.amount && (
              <p className="text-red-500 text-[11px] font-semibold mt-1">{errors.amount}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#374151] mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={e => {
                setDate(e.target.value);
                if (errors.date) setErrors(prev => ({ ...prev, date: undefined }));
              }}
              className={`w-full bg-white border rounded-xl px-3 py-2.5 text-xs sm:text-sm text-[#111827] focus:border-[#0f4c3a] outline-none ${
                errors.date ? 'border-red-400 focus:border-red-500' : 'border-[#e5ebe7]'
              }`}
              required
            />
            {errors.date && (
              <p className="text-red-500 text-[11px] font-semibold mt-1">{errors.date}</p>
            )}
          </div>
        </div>

        {/* Category & Payment Method */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#374151] mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={e => {
                setCategory(e.target.value as ExpenseCategory);
                if (errors.category) setErrors(prev => ({ ...prev, category: undefined }));
              }}
              className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3 py-2.5 text-xs text-[#111827] focus:border-[#0f4c3a] outline-none font-medium"
            >
              <option value="Transport">🚆 Transport (Train / Bus / Local)</option>
              <option value="Accommodation">🏨 Accommodation</option>
              <option value="Food">🍽️ Food and water</option>
              <option value="Temple / donation">🛕 Temple donations and offerings</option>
              <option value="Sightseeing">🎟️ Entry tickets &amp; Sightseeing</option>
              <option value="Shopping">🛍️ Shopping and essentials</option>
              <option value="Other">🪙 Other</option>
            </select>
            {errors.category && (
              <p className="text-red-500 text-[11px] font-semibold mt-1">{errors.category}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#374151] mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3 py-2.5 text-xs text-[#111827] focus:border-[#0f4c3a] outline-none font-medium"
            >
              <option value="UPI">📱 UPI (GPay / PhonePe)</option>
              <option value="Cash">💵 Cash</option>
              <option value="Debit / credit card">💳 Card (Debit / Credit)</option>
              <option value="Online booking">🌐 Online Booking</option>
              <option value="Other">🪙 Other</option>
            </select>
          </div>
        </div>

        {/* Description / Item (Optional) */}
        <div>
          <label className="block text-xs font-bold text-[#374151] mb-1">
            Description / Title (Optional)
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={`e.g. Bus ticket or Thali (defaults to ${getCategoryDisplayLabel(category)})`}
            className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#111827] focus:border-[#0f4c3a] outline-none"
          />
        </div>

        {/* Place / Merchant & Related Day */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#374151] mb-1">
              Place / Merchant (Optional)
            </label>
            <input
              type="text"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              placeholder="e.g. Shirdi Sansthan or Manmad Junction"
              className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3.5 py-2 text-xs text-[#111827] focus:border-[#0f4c3a] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#374151] mb-1">
              Related Itinerary Day (Optional)
            </label>
            <select
              value={dayId}
              onChange={e => setDayId(e.target.value)}
              className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3 py-2 text-xs text-[#111827] focus:border-[#0f4c3a] outline-none"
            >
              <option value="">General (Not day-specific)</option>
              {days.map(d => (
                <option key={d.id} value={d.id}>
                  Day {d.dayNumber}: {d.title} ({formatDateShort(d.date)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-[#374151] mb-1">
            Notes / Reminders (Optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Split with friend, vendor receipt, etc."
            className="w-full bg-white border border-[#e5ebe7] rounded-xl p-2.5 text-xs text-[#111827] focus:border-[#0f4c3a] outline-none resize-none"
          />
        </div>

        {/* Cash Inflow Checkbox */}
        <div className="pt-1">
          <label className="flex items-start gap-2 cursor-pointer text-xs font-medium text-[#4b5563]">
            <input
              type="checkbox"
              checked={isCashInflow}
              onChange={e => setIsCashInflow(e.target.checked)}
              className="rounded border-[#cbd5cf] text-[#0f4c3a] focus:ring-[#0f4c3a] mt-0.5"
            />
            <span>This is an ATM Cash Withdrawal / Inflow (reconciles cash on hand without increasing spending)</span>
          </label>
        </div>

        {/* Action Buttons */}

        <div className="pt-3 border-t border-[#e5ebe7] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white border border-[#e5ebe7] text-[#6b7280] hover:bg-[#f3f4f6] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#0f4c3a] text-white hover:bg-[#16654f] transition-all touch-press disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
          >
            {isSubmitting ? (
              <span>Saving...</span>
            ) : initialData ? (
              <span>Update Expense</span>
            ) : (
              <span>Save Expense</span>
            )}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
};

// 3. Ticket & Document Modal
export const TicketModal: React.FC<{
  initialData?: BookingDocument | null;
  prefillTitle?: string;
  days?: ItineraryDay[];
  onSave: (doc: Partial<BookingDocument>, fileBlob?: string) => Promise<any> | void;
  onClose: () => void;
}> = ({ initialData, prefillTitle, days = [], onSave, onClose }) => {
  const [title, setTitle] = useState(initialData?.title || prefillTitle || '');
  const [docType, setDocType] = useState<DocumentType>(initialData?.docType || 'Train Ticket');
  const [travelDate, setTravelDate] = useState(initialData?.travelDate || '');
  const [pnr, setPnr] = useState(initialData?.pnr || initialData?.bookingRef || '');
  const [dayId, setDayId] = useState(initialData?.dayId || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  // Dual Attachment States: PDF e-Ticket & Photo Scan
  const initialPdf = initialData?.pdfBlob || (initialData?.blobData?.startsWith('data:application/pdf') || initialData?.fileName?.toLowerCase().endsWith('.pdf') ? initialData?.blobData : '');
  const [pdfData, setPdfData] = useState<string>(initialPdf || '');
  const [pdfFileName, setPdfFileName] = useState<string>(
    initialData?.pdfFileName || (initialData?.fileName?.toLowerCase().endsWith('.pdf') ? initialData.fileName : '')
  );
  const [pdfFileSize, setPdfFileSize] = useState<number | undefined>(
    typeof initialData?.pdfFileSize === 'number'
      ? initialData.pdfFileSize
      : (typeof initialData?.fileSize === 'number' && initialData?.fileName?.toLowerCase().endsWith('.pdf') ? initialData.fileSize : undefined)
  );

  const initialImage = initialData?.imageBlob || initialData?.imageUrl || (initialData?.blobData?.startsWith('data:image/') || initialData?.fileName?.match(/\.(jpe?g|png|webp|gif|svg)$/i) ? initialData?.blobData : '');
  const [imageData, setImageData] = useState<string>(initialImage || '');
  const [imageFileName, setImageFileName] = useState<string>(
    initialData?.imageFileName || (initialData?.fileName?.match(/\.(jpe?g|png|webp|gif|svg)$/i) ? initialData.fileName : '')
  );
  const [imageFileSize, setImageFileSize] = useState<number | undefined>(
    typeof initialData?.imageFileSize === 'number'
      ? initialData.imageFileSize
      : (typeof initialData?.fileSize === 'number' && initialData?.fileName?.match(/\.(jpe?g|png|webp|gif|svg)$/i) ? initialData.fileSize : undefined)
  );

  const [errors, setErrors] = useState<{ title?: string; pdf?: string; image?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      setErrors(prev => ({ ...prev, pdf: `PDF exceeds 10 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).` }));
      return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrors(prev => ({ ...prev, pdf: 'Please select a valid PDF document.' }));
      return;
    }

    setErrors(prev => ({ ...prev, pdf: undefined }));
    setPdfFileName(file.name);
    setPdfFileSize(file.size);

    const reader = new FileReader();
    reader.onload = () => {
      setPdfData(reader.result as string);
    };
    reader.onerror = () => {
      setErrors(prev => ({ ...prev, pdf: 'Failed to read PDF file.' }));
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      setErrors(prev => ({ ...prev, image: `Image exceeds 10 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).` }));
      return;
    }

    if (!file.type.startsWith('image/') && !file.name.match(/\.(jpe?g|png|webp|gif|svg)$/i)) {
      setErrors(prev => ({ ...prev, image: 'Please select an image file (JPG, PNG, WebP).' }));
      return;
    }

    setErrors(prev => ({ ...prev, image: undefined }));
    setImageFileName(file.name);
    setImageFileSize(file.size);

    const reader = new FileReader();
    reader.onload = () => {
      setImageData(reader.result as string);
    };
    reader.onerror = () => {
      setErrors(prev => ({ ...prev, image: 'Failed to read image file.' }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!title.trim()) {
      setErrors(prev => ({ ...prev, title: 'Document title is required.' }));
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    const primaryBlob = pdfData || imageData;
    const primaryName = pdfFileName || imageFileName || `${title.trim().replace(/\s+/g, '_')}.${pdfData ? 'pdf' : 'jpg'}`;
    const primaryType = pdfData ? 'application/pdf' : (imageData ? 'image/jpeg' : undefined);
    const primarySize = pdfFileSize || imageFileSize;

    try {
      await onSave(
        {
          id: initialData?.id,
          title: title.trim(),
          docType,
          travelDate: travelDate || undefined,
          pnr: pnr.trim() || undefined,
          bookingRef: pnr.trim() || undefined,
          dayId: dayId || undefined,
          notes: notes.trim() || undefined,
          fileName: primaryName,
          fileSize: primarySize,
          fileType: primaryType,
          storagePath: primaryBlob && !primaryBlob.startsWith('data:') ? primaryBlob : undefined,
          offlineCached: Boolean(pdfData || imageData),
          blobData: primaryBlob || undefined,
          // Dual attachment fields
          pdfBlob: pdfData || undefined,
          pdfFileName: pdfFileName || undefined,
          pdfFileSize: pdfFileSize || undefined,
          imageBlob: imageData || undefined,
          imageFileName: imageFileName || undefined,
          imageFileSize: imageFileSize || undefined,
          status: initialData?.status || 'Confirmed',
          updatedAt: new Date().toISOString(),
        },
        primaryBlob
      );
      onClose();
    } catch (err: any) {
      setServerError(err?.message || 'Failed to save document. Please check inputs and try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <ModalWrapper
      title={initialData ? `Edit Document: ${initialData.title || 'Saved Voucher'}` : 'Upload Ticket / Document'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Edit mode contextual indicator */}
        {initialData && (
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[#0f4c3a] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#0f4c3a]" />
              <span>Editing saved document</span>
            </div>
            <span className="text-[10px] text-gray-500 font-mono">
              ID: {initialData.id.slice(0, 8)}...
            </span>
          </div>
        )}

        {/* Server / Save Error Banner */}
        {serverError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-2xl text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{serverError}</div>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-[#374151] mb-1">
            Document Title / Booking Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => {
              setTitle(e.target.value);
              if (errors.title) setErrors(prev => ({ ...prev, title: undefined }));
            }}
            placeholder="e.g. Train 12727 Godavari Express or Ujjain Temple Pass"
            className={`w-full bg-white border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#111827] focus:border-[#0f4c3a] outline-none ${
              errors.title ? 'border-red-400 focus:border-red-500' : 'border-[#e5ebe7]'
            }`}
            required
            autoFocus
          />
          {errors.title && (
            <p className="text-red-500 text-[11px] font-semibold mt-1">{errors.title}</p>
          )}
        </div>

        {/* Document Type & Travel Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#374151] mb-1">
              Category / Type <span className="text-red-500">*</span>
            </label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value as DocumentType)}
              className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3 py-2.5 text-xs text-[#111827] focus:border-[#0f4c3a] outline-none font-medium"
            >
              <option value="Train Ticket">🚆 Train Ticket</option>
              <option value="Bus Ticket">🚌 Bus Ticket</option>
              <option value="Hotel Receipt">🏨 Accommodation / Hotel</option>
              <option value="Temple Pass">🛕 Temple Pass / Booking</option>
              <option value="ID Proof">🪪 Identity Document (ID)</option>
              <option value="Other">📄 Insurance &amp; Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#374151] mb-1">
              Travel / Valid Date
            </label>
            <input
              type="date"
              value={travelDate}
              onChange={e => setTravelDate(e.target.value)}
              className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3 py-2.5 text-xs text-[#111827] focus:border-[#0f4c3a] outline-none"
            />
          </div>
        </div>

        {/* PNR / Booking Ref & Related Itinerary Day */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#374151] mb-1">
              PNR / Booking Reference
            </label>
            <input
              type="text"
              value={pnr}
              onChange={e => setPnr(e.target.value)}
              placeholder="e.g. 10-digit PNR or booking reference"
              className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3.5 py-2 text-xs text-[#111827] focus:border-[#0f4c3a] outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#374151] mb-1">
              Related Itinerary Day
            </label>
            <select
              value={dayId}
              onChange={e => setDayId(e.target.value)}
              className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3 py-2 text-xs text-[#111827] focus:border-[#0f4c3a] outline-none font-medium"
            >
              <option value="">General (Not day-specific)</option>
              {days.map(d => (
                <option key={d.id} value={d.id}>
                  Day {d.dayNumber}: {d.title} ({formatDateShort(d.date)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes & Seat / Room details */}
        <div>
          <label className="block text-xs font-bold text-[#374151] mb-1">
            Notes / Seat &amp; Berth Details
          </label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Coach S3 Berth 45, 46 (Side Lower) · Split with friend"
            className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3.5 py-2 text-xs text-[#111827] focus:border-[#0f4c3a] outline-none"
          />
        </div>

        {/* Dual File Uploads: PDF Document & Image Photo Scan */}
        <div className="space-y-3 pt-1">
          <label className="block text-xs font-bold text-[#374151]">
            Attach Document File (PDF or Photo, max 10MB)
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Box 1: PDF Document Upload */}
            <div className="border border-emerald-200/80 rounded-2xl p-3 bg-linear-to-b from-white to-emerald-50/40 relative shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black text-emerald-900 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Official PDF Ticket</span>
                </span>
                {(pdfData || pdfFileName) && (
                  <button
                    type="button"
                    onClick={() => {
                      setPdfData('');
                      setPdfFileName('');
                      setPdfFileSize(undefined);
                    }}
                    className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                    title="Remove PDF"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              {pdfData || pdfFileName ? (
                <div className="p-2 rounded-xl bg-emerald-100/60 border border-emerald-200 text-xs">
                  <p className="font-bold text-emerald-950 truncate">{pdfFileName || 'ticket.pdf'}</p>
                  <p className="text-[10px] text-emerald-700 font-mono mt-0.5">
                    {pdfFileSize ? `${(pdfFileSize / 1024).toFixed(1)} KB` : 'Attached'} · Verified PDF
                  </p>
                </div>
              ) : (
                <div className="border border-dashed border-emerald-300 rounded-xl p-3 text-center bg-white/80 hover:bg-emerald-50/50 transition-colors cursor-pointer relative">
                  <Upload className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
                  <span className="text-[11px] font-bold text-emerald-800 block">
                    Choose PDF Ticket
                  </span>
                  <span className="text-[9px] text-gray-400 block">IRCTC or official pass</span>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handlePdfUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              )}
              {errors.pdf && (
                <p className="text-red-500 text-[10px] font-semibold mt-1">{errors.pdf}</p>
              )}
            </div>

            {/* Box 2: Image Photo Scan Upload */}
            <div className="border border-teal-200/80 rounded-2xl p-3 bg-linear-to-b from-white to-teal-50/40 relative shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black text-teal-900 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-teal-600" />
                  <span>Pass Photo / Scan</span>
                </span>
                {imageData && (
                  <button
                    type="button"
                    onClick={() => {
                      setImageData('');
                      setImageFileName('');
                      setImageFileSize(undefined);
                    }}
                    className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                    title="Remove Photo"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              {imageData ? (
                <div className="flex items-center gap-2 p-1.5 rounded-xl bg-teal-100/60 border border-teal-200 text-xs">
                  <img
                    src={imageData}
                    alt="Preview"
                    className="w-8 h-8 rounded-lg object-cover border border-white shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-teal-950 truncate text-[11px]">{imageFileName || 'photo.jpg'}</p>
                    <p className="text-[10px] text-teal-700 font-mono">
                      {imageFileSize ? `${(imageFileSize / 1024).toFixed(1)} KB` : 'Attached'} · Photo Pass
                    </p>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-teal-300 rounded-xl p-3 text-center bg-white/80 hover:bg-teal-50/50 transition-colors cursor-pointer relative">
                  <Upload className="w-4 h-4 mx-auto text-teal-600 mb-1" />
                  <span className="text-[11px] font-bold text-teal-800 block">
                    Choose Photo / Scan
                  </span>
                  <span className="text-[9px] text-gray-400 block">Screenshot or photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              )}
              {errors.image && (
                <p className="text-red-500 text-[10px] font-semibold mt-1">{errors.image}</p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}

        <div className="pt-3 border-t border-[#e5ebe7] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-[#e5ebe7] text-[#6b7280] hover:bg-[#f3f4f6] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0f4c3a] text-white hover:bg-[#16654f] transition-all touch-press disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
          >
            {isSubmitting ? (
              <span>Saving...</span>
            ) : initialData ? (
              <span>Update Document</span>
            ) : (
              <span>Save Document</span>
            )}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
};

// 4. Day Edit Modal
export const DayEditModal: React.FC<{
  day: ItineraryDay;
  onSave: (updated: Partial<ItineraryDay>) => void;
  onClose: () => void;
}> = ({ day, onSave, onClose }) => {
  const [title, setTitle] = useState(day.title);
  const [subtitle, setSubtitle] = useState(day.subtitle || '');
  const [themeType, setThemeType] = useState<DayThemeType>(day.themeType);
  const [location, setLocation] = useState(day.location || '');
  const [details, setDetails] = useState(day.details || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: day.id,
      title: title.trim(),
      subtitle: subtitle.trim(),
      themeType,
      location: location.trim(),
      details: details.trim(),
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <ModalWrapper title={`Edit Day ${day.dayNumber} Plan`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-bold text-[#374151] mb-1">Day Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#111827] focus:border-[#0f4c3a]"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#374151] mb-1">Theme</label>
            <select
              value={themeType}
              onChange={e => setThemeType(e.target.value as DayThemeType)}
              className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3 py-2 text-xs text-[#111827]"
            >
              <option value="Temple">Temple / Darshan</option>
              <option value="Sightseeing">Sightseeing</option>
              <option value="Transport">Transport</option>
              <option value="Personal">Personal</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#374151] mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3.5 py-2 text-xs text-[#111827]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#374151] mb-1">Subtitle</label>
          <input
            type="text"
            value={subtitle}
            onChange={e => setSubtitle(e.target.value)}
            className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3.5 py-2 text-xs text-[#111827]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#374151] mb-1">Details & Schedule</label>
          <textarea
            value={details}
            onChange={e => setDetails(e.target.value)}
            rows={3}
            className="w-full bg-white border border-[#e5ebe7] rounded-xl p-3 text-xs text-[#111827]"
          />
        </div>


        <div className="pt-3 border-t border-[#e5ebe7] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-[#e5ebe7] text-[#6b7280]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0f4c3a] text-white hover:bg-[#16654f] transition-all touch-press"
          >
            Save Day
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
};

// 5. Activity Modal (Replaces browser prompt for adding activities)
export const ActivityModal: React.FC<{
  isOpen: boolean;
  onSave: (title: string, itemType: string, timeEstimate?: string) => void;
  onClose: () => void;
}> = ({ isOpen, onSave, onClose }) => {
  const [title, setTitle] = useState('');
  const [itemType, setItemType] = useState('Activity');
  const [timeEstimate, setTimeEstimate] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(title.trim(), itemType, timeEstimate.trim() || undefined);
    setTitle('');
    setTimeEstimate('');
    onClose();
  };

  return (
    <ModalWrapper title="Add Activity or Darshan Task" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-bold text-[#374151] mb-1">
            Activity / Task Title
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Morning Aarti at Dwarkamai"
            className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#111827] focus:border-[#0f4c3a]"
            required
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#374151] mb-1">Type</label>
            <select
              value={itemType}
              onChange={e => setItemType(e.target.value)}
              className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3 py-2 text-xs text-[#111827]"
            >
              <option value="Activity">Activity</option>
              <option value="Darshan">Darshan</option>
              <option value="Transport">Transport</option>
              <option value="Meal">Meal</option>
              <option value="Check-in">Check-in</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#374151] mb-1">Time (Optional)</label>
            <input
              type="text"
              value={timeEstimate}
              onChange={e => setTimeEstimate(e.target.value)}
              placeholder="e.g. 06:30 AM"
              className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3.5 py-2 text-xs text-[#111827]"
            />
          </div>
        </div>


        <div className="pt-3 border-t border-[#e5ebe7] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-[#e5ebe7] text-[#6b7280]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0f4c3a] text-white hover:bg-[#16654f] transition-all touch-press"
          >
            Add Task
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
};

// 6. Stay Modal (Replaces browser prompt for adding/editing stays)
export const StayModal: React.FC<{
  isOpen: boolean;
  initialData?: AccommodationStay | null;
  days?: ItineraryDay[];
  onSave: (stay: Partial<AccommodationStay>) => void;
  onClose: () => void;
}> = ({ isOpen, initialData, days = [], onSave, onClose }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [city, setCity] = useState(initialData?.city || '');
  const [mapsUrl, setMapsUrl] = useState(initialData?.mapsUrl || (initialData as any)?.exactLocation || '');
  const [cost, setCost] = useState<string>(
    initialData?.estimatedCost ? String(initialData.estimatedCost) : ''
  );
  const [paymentMethod, setPaymentMethod] = useState<string>(
    initialData?.paymentMethod || 'UPI'
  );
  const [phone, setPhone] = useState(initialData?.contactPhone || '');
  const [stayType, setStayType] = useState<StayType>(initialData?.stayType || 'Dharamshala');
  const [bookingStatus, setBookingStatus] = useState<AccommodationBookingStatus>(
    (initialData?.bookingStatus as AccommodationBookingStatus) ||
      (initialData?.status as AccommodationBookingStatus) ||
      'Needs research'
  );
  const [bookingReference, setBookingReference] = useState(
    initialData?.bookingReference || initialData?.bookingId || ''
  );
  const [checkinDate, setCheckinDate] = useState(initialData?.checkinDate || '');
  const [checkoutDate, setCheckoutDate] = useState(initialData?.checkoutDate || '');
  const [dayId, setDayId] = useState(initialData?.dayId || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [capacityPersons, setCapacityPersons] = useState(initialData?.capacityPersons || 1);

  // Dual Attachment States: PDF Voucher & Stay Photo / Slip
  const initPdf = (initialData as any)?.pdfBlob || (initialData?.documentUrl?.startsWith('data:application/pdf') || initialData?.documentName?.toLowerCase().endsWith('.pdf') ? initialData?.documentUrl : '');
  const [pdfData, setPdfData] = useState<string>(initPdf || '');
  const [pdfName, setPdfName] = useState<string>((initialData as any)?.pdfFileName || initialData?.documentName || '');
  const [pdfSize, setPdfSize] = useState<string>((initialData as any)?.pdfFileSize || initialData?.documentSize || '');

  const initImage = (initialData as any)?.imageBlob || (initialData?.imageUrl && !initialData.imageUrl.startsWith('/images/shirdi-dharamshala.jpg') ? initialData.imageUrl : '');
  const [imageData, setImageData] = useState<string>(initImage || '');
  const [imageName, setImageName] = useState<string>((initialData as any)?.imageFileName || '');
  const [imageSize, setImageSize] = useState<string>((initialData as any)?.imageFileSize || '');
  const [uploadError, setUploadError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setCity(initialData?.city || '');
      setMapsUrl(initialData?.mapsUrl || (initialData as any)?.exactLocation || '');
      setCost(initialData?.estimatedCost ? String(initialData.estimatedCost) : '');
      setPaymentMethod(initialData?.paymentMethod || 'UPI');
      setPhone(initialData?.contactPhone || '');
      setStayType(initialData?.stayType || 'Dharamshala');
      setBookingStatus(
        (initialData?.bookingStatus as AccommodationBookingStatus) ||
          (initialData?.status as AccommodationBookingStatus) ||
          'Needs research'
      );
      setBookingReference(initialData?.bookingReference || initialData?.bookingId || '');
      setCheckinDate(initialData?.checkinDate || '');
      setCheckoutDate(initialData?.checkoutDate || '');
      setDayId(initialData?.dayId || '');
      setNotes(initialData?.notes || '');
      setCapacityPersons(initialData?.capacityPersons || 1);

      // Attachments hydrate
      const initPdf = (initialData as any)?.pdfBlob || (initialData?.documentUrl?.startsWith('data:application/pdf') || initialData?.documentName?.toLowerCase().endsWith('.pdf') ? initialData?.documentUrl : '');
      setPdfData(initPdf || '');
      setPdfName((initialData as any)?.pdfFileName || initialData?.documentName || '');
      setPdfSize((initialData as any)?.pdfFileSize || initialData?.documentSize || '');

      const initImage = (initialData as any)?.imageBlob || (initialData?.imageUrl && !initialData.imageUrl.startsWith('/images/shirdi-dharamshala.jpg') ? initialData.imageUrl : '');
      setImageData(initImage || '');
      setImageName((initialData as any)?.imageFileName || '');
      setImageSize((initialData as any)?.imageFileSize || '');
      setUploadError(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleStayPdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('PDF file exceeds 10 MB limit.');
      return;
    }
    setUploadError(null);
    setPdfName(file.name);
    setPdfSize(`${(file.size / 1024).toFixed(1)} KB`);
    const reader = new FileReader();
    reader.onload = () => {
      setPdfData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleStayImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image file exceeds 10 MB limit.');
      return;
    }
    setUploadError(null);
    setImageName(file.name);
    setImageSize(`${(file.size / 1024).toFixed(1)} KB`);
    const reader = new FileReader();
    reader.onload = () => {
      setImageData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const hasRef = Boolean(bookingReference.trim());
    const resolvedStatus =
      bookingStatus || (hasRef ? ('Booked' as AccommodationBookingStatus) : 'Needs research');

    const parsedCost = cost ? parseFloat(cost) : 0;

    onSave({
      id: initialData?.id,
      name: name.trim(),
      city: city.trim(),
      mapsUrl: mapsUrl.trim() || undefined,
      exactLocation: mapsUrl.trim() || undefined,
      estimatedCost: parsedCost,
      totalAmount: parsedCost,
      paymentMethod,
      contactPhone: phone.trim() || undefined,
      stayType,
      bookingStatus: resolvedStatus,
      status: resolvedStatus,
      bookingReference: bookingReference.trim() || undefined,
      bookingId: bookingReference.trim() || undefined,
      checkinDate: checkinDate || undefined,
      checkoutDate: checkoutDate || undefined,
      capacityPersons: Number(capacityPersons || 1),
      dayId: dayId || undefined,
      notes: notes.trim() || undefined,
      // Dual Attachment preservation
      documentUrl: pdfData || initialData?.documentUrl || undefined,
      documentName: pdfName || initialData?.documentName || undefined,
      documentSize: pdfSize || initialData?.documentSize || undefined,
      documentType: pdfData ? 'application/pdf' : undefined,
      pdfBlob: pdfData || undefined,
      pdfFileName: pdfName || undefined,
      pdfFileSize: pdfSize || undefined,
      imageUrl: imageData || initialData?.imageUrl || '/images/shirdi-dharamshala.jpg',
      imageBlob: imageData || undefined,
      imageFileName: imageName || undefined,
      imageFileSize: imageSize || undefined,
      updatedAt: new Date().toISOString(),
    } as any);
    onClose();
  };

  return (
    <ModalWrapper title={initialData ? 'Edit Stay' : 'Add Stay / Dharamshala'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-bold text-[#374151] mb-1">
            Property / Dharamshala Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Sai Ashram or MTDC Pilgrim Resort"
            className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#111827] focus:border-[#0f4c3a]"
            required
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#374151] mb-1">City / Locality</label>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="e.g. Shirdi"
              className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3.5 py-2 text-xs text-[#111827]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#374151] mb-1">Type</label>
            <select
              value={stayType}
              onChange={e => setStayType(e.target.value as StayType)}
              className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3 py-2 text-xs text-[#111827]"
            >
              <option value="Dharamshala">Dharamshala</option>
              <option value="Ashram">Ashram</option>
              <option value="Budget Hotel">Budget Hotel</option>
              <option value="Hotel">Hotel</option>
              <option value="Guest House">Guest House</option>
              <option value="Dormitory">Dormitory</option>
              <option value="Night Train">Night Train</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#374151] mb-1">Booking Status</label>
            <select
              value={bookingStatus}
              onChange={e => setBookingStatus(e.target.value as AccommodationBookingStatus)}
              className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3 py-2 text-xs text-[#111827]"
            >
              <option value="Not selected">Not selected</option>
              <option value="Needs research">Needs research</option>
              <option value="Option identified">Option identified</option>
              <option value="Booking pending">Booking pending</option>
              <option value="Booked">Booked</option>
              <option value="Checked in">Checked in</option>
              <option value="Completed or checked out">Completed or checked out</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#374151] mb-1">
              Booking Ref (Optional)
            </label>
            <input
              type="text"
              value={bookingReference}
              onChange={e => setBookingReference(e.target.value)}
              placeholder="e.g. BKG-10293"
              className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3.5 py-2 text-xs text-[#111827]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#374151] mb-1">Check-in Date</label>
            <input
              type="date"
              value={checkinDate}
              onChange={e => setCheckinDate(e.target.value)}
              className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3.5 py-2 text-xs text-[#111827]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#374151] mb-1">Check-out Date</label>
            <input
              type="date"
              value={checkoutDate}
              onChange={e => setCheckoutDate(e.target.value)}
              className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3.5 py-2 text-xs text-[#111827]"
            />
          </div>
        </div>

        {/* Exact Location & Google Maps Link */}
        <div>
          <label className="block text-xs font-bold text-[#374151] mb-1">
            Exact Location / Google Maps Link (Optional)
          </label>
          <input
            type="text"
            value={mapsUrl}
            onChange={e => setMapsUrl(e.target.value)}
            placeholder="e.g. https://maps.app.goo.gl/... or 19.7665, 74.4765"
            className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3.5 py-2 text-xs text-[#111827] focus:border-[#0f4c3a]"
          />
        </div>

        {/* Cost & Payment Mode Selection */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#374151] mb-1">Cost (₹, optional)</label>
            <input
              type="number"
              min="0"
              value={cost}
              onChange={e => setCost(e.target.value)}
              placeholder="e.g. 300"
              className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3.5 py-2 text-xs text-[#111827] focus:border-[#0f4c3a]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#374151] mb-1">Payment Mode</label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-50 rounded-xl border border-[#e5ebe7]">
              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                className={`py-1 rounded-lg text-xs font-black transition-all ${
                  paymentMethod === 'UPI'
                    ? 'bg-[#0f4c3a] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📱 UPI
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('Cash')}
                className={`py-1 rounded-lg text-xs font-black transition-all ${
                  paymentMethod === 'Cash'
                    ? 'bg-[#0f4c3a] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                💵 Cash
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#374151] mb-1">
            No. of Persons (Solo = 1)
          </label>
          <input
            type="number"
            min="1"
            value={capacityPersons}
            onChange={e => setCapacityPersons(Number(e.target.value) || 1)}
            className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3.5 py-2 text-xs text-[#111827]"
          />
        </div>

        {days.length > 0 && (
          <div>
            <label className="block text-xs font-bold text-[#374151] mb-1">
              Related Itinerary Day
            </label>
            <select
              value={dayId}
              onChange={e => setDayId(e.target.value)}
              className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3 py-2 text-xs text-[#111827]"
            >
              <option value="">General (Not day-specific)</option>
              {days.map(d => (
                <option key={d.id} value={d.id}>
                  Day {d.dayNumber}: {d.title} ({d.date})
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-[#374151] mb-1">Phone (Optional)</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Only verified trust phone"
            className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3.5 py-2 text-xs text-[#111827]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#374151] mb-1">Notes / Rules</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Carry Aadhaar Card for counter registration"
            className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3.5 py-2 text-xs text-[#111827]"
          />
        </div>

        {/* Dual Attachments: PDF Voucher & Stay Photo / Slip */}
        <div className="space-y-2 pt-1 border-t border-[#e5ebe7]">
          <label className="block text-xs font-bold text-[#374151]">
            Stay Attachments (Optional - Upload PDF Voucher &amp; Photo)
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Stay PDF Box */}
            <div className="border border-emerald-200/80 rounded-2xl p-2.5 bg-linear-to-b from-white to-emerald-50/40 relative shadow-2xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-black text-emerald-900 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Stay Voucher (PDF)</span>
                </span>
                {(pdfData || pdfName) && (
                  <button
                    type="button"
                    onClick={() => {
                      setPdfData('');
                      setPdfName('');
                      setPdfSize('');
                    }}
                    className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                    title="Remove PDF"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              {pdfData || pdfName ? (
                <div className="p-2 rounded-xl bg-emerald-100/60 border border-emerald-200 text-xs">
                  <p className="font-bold text-emerald-950 truncate text-[11px]">{pdfName || 'stay_voucher.pdf'}</p>
                  <p className="text-[9px] text-emerald-700 font-mono mt-0.5">{pdfSize || 'Attached'} · PDF Voucher</p>
                </div>
              ) : (
                <div className="border border-dashed border-emerald-300 rounded-xl p-2.5 text-center bg-white/80 hover:bg-emerald-50/50 transition-colors cursor-pointer relative">
                  <Upload className="w-3.5 h-3.5 mx-auto text-emerald-600 mb-0.5" />
                  <span className="text-[10px] font-bold text-emerald-800 block">Attach PDF Voucher</span>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleStayPdfUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Stay Photo / Slip Box */}
            <div className="border border-teal-200/80 rounded-2xl p-2.5 bg-linear-to-b from-white to-teal-50/40 relative shadow-2xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-black text-teal-900 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-teal-600" />
                  <span>Stay Photo / Slip</span>
                </span>
                {(imageData || imageName) && (
                  <button
                    type="button"
                    onClick={() => {
                      setImageData('');
                      setImageName('');
                      setImageSize('');
                    }}
                    className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                    title="Remove Photo"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              {imageData || imageName ? (
                <div className="flex items-center gap-2 p-1.5 rounded-xl bg-teal-100/60 border border-teal-200 text-xs">
                  {imageData ? (
                    <img
                      src={imageData}
                      alt="Preview"
                      className="w-7 h-7 rounded-lg object-cover border border-white shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-teal-200 flex items-center justify-center text-teal-800 shrink-0">
                      <ImageIcon className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-teal-950 truncate text-[11px]">{imageName || 'stay_photo.jpg'}</p>
                    <p className="text-[9px] text-teal-700 font-mono">{imageSize || 'Attached'} · Photo</p>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-teal-300 rounded-xl p-2.5 text-center bg-white/80 hover:bg-teal-50/50 transition-colors cursor-pointer relative">
                  <Upload className="w-3.5 h-3.5 mx-auto text-teal-600 mb-0.5" />
                  <span className="text-[10px] font-bold text-teal-800 block">Attach Photo / Slip</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleStayImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              )}
            </div>
          </div>
          {uploadError && (
            <p className="text-red-500 text-[10px] font-semibold">{uploadError}</p>
          )}
        </div>

        <div className="pt-3 border-t border-[#e5ebe7] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-[#e5ebe7] text-[#6b7280]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0f4c3a] text-white hover:bg-[#16654f] transition-all touch-press"
          >
            Save Stay
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
};

// 7. Note Modal (Replaces browser prompt for adding/editing notes)
export const NoteModal: React.FC<{
  isOpen: boolean;
  initialData?: TripNote | null;
  onSave: (note: Partial<TripNote>) => void | Promise<void>;
  onClose: () => void;
}> = ({ isOpen, initialData, onSave, onClose }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [category, setCategory] = useState<NoteCategory>(initialData?.category || 'General');

  if (!isOpen) return null;

  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      setSaveError(null);
      await onSave({
        id: initialData?.id,
        title: title.trim(),
        content: content.trim(),
        category,
        updatedAt: new Date().toISOString(),
      });
      onClose();
    } catch (err: any) {
      setSaveError(err.message || 'Could not save note to local storage');
    }
  };

  return (
    <ModalWrapper title={initialData ? 'Edit Note' : 'Add Note / Tip'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {saveError && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{saveError}</span>
          </div>
        )}
        <div>
          <label className="block text-xs font-bold text-[#374151] mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Trimbakeshwar VIP Line Timing"
            className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#111827] focus:border-[#0f4c3a]"
            required
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#374151] mb-1">Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value as NoteCategory)}
            className="w-full bg-white border border-[#e5ebe7] rounded-xl px-3 py-2 text-xs text-[#111827]"
          >
            <option value="General">General (General Trip Notes)</option>
            <option value="Emergency">Emergency (Helplines & Safety)</option>
            <option value="Travel Tip">Travel Tip (Temple Rules & Transport Advice)</option>
            <option value="Reflection">Reflection (Daily Journal & Experience)</option>
            <option value="Contact">Contact (Important Contacts)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#374151] mb-1">Content</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={4}
            placeholder="Write your note or travel tip here..."
            className="w-full bg-white border border-[#e5ebe7] rounded-xl p-3 text-xs text-[#111827]"
            required
          />
        </div>


        <div className="pt-3 border-t border-[#e5ebe7] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-[#e5ebe7] text-[#6b7280]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0f4c3a] text-white hover:bg-[#16654f] transition-all touch-press"
          >
            Save Note
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
};

// 8. Conflict Resolution Modal
export const ConflictModal: React.FC<{
  conflicts: ConflictItem[];
  onResolve: (conflict: ConflictItem, choice: 'keep_local' | 'keep_cloud') => void;
  onClose: () => void;
}> = ({ conflicts, onResolve, onClose }) => {
  const current = conflicts[0];
  if (!current) return null;

  return (
    <ModalWrapper title="Cloud Sync Conflict Detected" onClose={onClose}>
      <div className="space-y-4">
        <div className="p-3 bg-[#fffbeb] border border-[#fef3c7] rounded-xl text-xs text-[#92400e] flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-[#d97706]" />
          <div>
            <strong>Conflicting Modifications:</strong>
            The record for <span className="font-mono">{current.entity}</span> was updated both locally on this device and on the cloud. Choose which version to retain:
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-white rounded-xl border border-[#e5ebe7]">
            <span className="font-bold text-[#0f4c3a] block mb-1">Local Device Version</span>
            <p className="text-[11px] text-[#6b7280] mb-2">Updated: {current.localUpdatedAt}</p>
            <pre className="text-[10px] bg-[#f8faf9] p-2 rounded overflow-x-auto max-h-32">
              {JSON.stringify(current.localData, null, 2)}
            </pre>
            <button
              onClick={() => onResolve(current, 'keep_local')}
              className="w-full mt-3 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0f4c3a] text-white hover:bg-[#16654f]"
            >
              Keep Local Version
            </button>
          </div>

          <div className="p-3 bg-white rounded-xl border border-[#e5ebe7]">
            <span className="font-bold text-[#0284c7] block mb-1">Cloud Snapshot</span>
            <p className="text-[11px] text-[#6b7280] mb-2">Updated: {current.cloudUpdatedAt}</p>
            <pre className="text-[10px] bg-[#f8faf9] p-2 rounded overflow-x-auto max-h-32">
              {JSON.stringify(current.cloudData, null, 2)}
            </pre>
            <button
              onClick={() => onResolve(current, 'keep_cloud')}
              className="w-full mt-3 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-[#e5ebe7] text-[#4b5563] hover:bg-[#f8faf9]"
            >
              Accept Cloud Version
            </button>
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
};
