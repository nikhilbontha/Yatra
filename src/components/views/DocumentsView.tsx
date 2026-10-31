'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  FileText,
  ShieldCheck,
  Plus,
  Trash2,
  Edit,
  Eye,
  Download,
  Calendar,
  Clock,
  MapPin,
  Building,
  CreditCard,
  Sparkles,
  ChevronLeft,
  Search,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Tag,
  Hotel,
  Shield,
  FileCheck,
  X,
  Compass,
} from 'lucide-react';
import { BookingDocument, Trip, ItineraryDay } from '@/types/trip';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { AlertModal } from '@/components/modals/AlertModal';
import { DocumentViewerModal } from '@/components/modals/DocumentViewerModal';
import { ViewAttachmentChooserModal } from '@/components/modals/ViewAttachmentChooserModal';

export type DocumentScreen = 'overview' | 'details' | 'add' | 'edit';
export type DocumentCategoryFilter = 'all' | 'hotel_booking' | 'id_proof' | 'temple_pass' | 'other';

export interface DocumentsViewProps {
  trip?: Trip;
  days?: ItineraryDay[];
  documents?: BookingDocument[];
  initialScreen?: DocumentScreen;
  initialSelectedId?: string;
  onSaveDocument?: (doc: Partial<BookingDocument>) => Promise<void> | void;
  onDeleteDocument?: (docId: string) => Promise<void> | void;
  onSelectDayIndex?: (dayIndex: number) => void;
  onSaveOffline?: () => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  trip,
  days = [],
  documents = [],
  initialScreen = 'overview',
  initialSelectedId,
  onSaveDocument,
  onDeleteDocument,
  onSelectDayIndex,
  onSaveOffline,
}) => {
  const [screen, setScreen] = useState<DocumentScreen>(initialScreen);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(initialSelectedId || null);
  const [filter, setFilter] = useState<DocumentCategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<BookingDocument | null>(null);
  const [chooserDoc, setChooserDoc] = useState<BookingDocument | null>(null);
  const [docViewerMode, setDocViewerMode] = useState<'image' | 'pdf'>('pdf');

  const handleSelectDocMode = (mode: 'image' | 'pdf', docItem: any) => {
    setChooserDoc(null);
    setDocViewerMode(mode);
    setViewingDoc(docItem);
  };

  const handleAttachDocFile = async (type: 'image' | 'pdf', fileData: string, fileName: string, fileSize: number) => {
    const targetId = chooserDoc?.id || viewingDoc?.id || selectedDocId;
    if (!targetId) return;
    const existing = documents.find(d => d.id === targetId);
    if (!existing) return;

    const formattedSize = `${(fileSize / 1024).toFixed(1)} KB`;
    const updatedDoc: BookingDocument = {
      ...existing,
      ...(type === 'pdf' ? {
        pdfBlob: fileData,
        pdfFileName: fileName,
        pdfFileSize: formattedSize,
        fileName: existing.fileName || fileName,
        fileType: 'application/pdf',
      } : {
        imageBlob: fileData,
        imageFileName: fileName,
        imageFileSize: formattedSize,
      }),
      blobData: fileData || existing.blobData,
      offlineCached: true,
      updatedAt: new Date().toISOString(),
    };

    if (onSaveDocument) {
      await onSaveDocument(updatedDoc);
    }
    if (chooserDoc && chooserDoc.id === targetId) {
      setChooserDoc(updatedDoc);
    }
    if (viewingDoc && viewingDoc.id === targetId) {
      setViewingDoc(updatedDoc);
    }
    showToast(`${type === 'pdf' ? 'PDF document' : 'Photo scan'} attached successfully`);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ---------------------------------------------------------------------------
  // Dynamic Form State for Add / Edit
  // ---------------------------------------------------------------------------
  const [docCategory, setDocCategory] = useState<'hotel_booking' | 'id_proof' | 'temple_pass' | 'other'>('hotel_booking');
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formDayId, setFormDayId] = useState('');
  const [formFileName, setFormFileName] = useState('');
  const [formFileSize, setFormFileSize] = useState('');
  const [formFileType, setFormFileType] = useState('');
  const [formBlobData, setFormBlobData] = useState('');

  // Category-specific fields
  // 1. Hotel / Stay
  const [hotelName, setHotelName] = useState('');
  const [hotelCity, setHotelCity] = useState('Shirdi');
  const [hotelCheckIn, setHotelCheckIn] = useState('');
  const [hotelCheckOut, setHotelCheckOut] = useState('');
  const [hotelBookingRef, setHotelBookingRef] = useState('');
  const [hotelRoomType, setHotelRoomType] = useState('Dharamshala');
  const [hotelAmount, setHotelAmount] = useState<string>('');

  // 2. ID Proof
  const [idType, setIdType] = useState('Aadhaar Card');
  const [idHolderName, setIdHolderName] = useState('');
  const [idNumber, setIdNumber] = useState('');

  // 3. Temple Pass
  const [templeName, setTempleName] = useState('Shirdi Sai Baba Sansthan');
  const [templeSlot, setTempleSlot] = useState('');
  const [templeToken, setTempleToken] = useState('');
  const [templePersons, setTemplePersons] = useState('1');

  // 4. Other
  const [otherPurpose, setOtherPurpose] = useState('');
  const [otherRef, setOtherRef] = useState('');

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const monthIdx = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        if (monthIdx >= 0 && monthIdx < 12) {
          return `${day} ${months[monthIdx]} ${year}`;
        }
      }
    } catch (e) {}
    return dateStr;
  };

  // Selected Doc
  const selectedDoc = useMemo(() => {
    if (!selectedDocId) return null;
    return documents.find(d => d.id === selectedDocId) || null;
  }, [documents, selectedDocId]);

  // Document Categorization Helper
  const inferDocCategory = (doc: BookingDocument): 'hotel_booking' | 'id_proof' | 'temple_pass' | 'other' => {
    const t = (doc.type || doc.docType || '').toLowerCase();
    const title = (doc.title || '').toLowerCase();
    if (t.includes('hotel') || t.includes('accommodation') || title.includes('stay') || title.includes('hotel') || title.includes('bhaktaniwas')) {
      return 'hotel_booking';
    }
    if (t.includes('id') || t.includes('proof') || t.includes('aadhaar') || title.includes('aadhaar') || title.includes('passport')) {
      return 'id_proof';
    }
    if (t.includes('temple') || t.includes('pass') || t.includes('darshan') || title.includes('darshan') || title.includes('vip')) {
      return 'temple_pass';
    }
    return 'other';
  };

  // Filtered Documents
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const cat = inferDocCategory(doc);
      if (filter !== 'all' && cat !== filter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = doc.title?.toLowerCase().includes(q);
        const refMatch = (doc.pnr || doc.bookingRef || '')?.toLowerCase().includes(q);
        const fileMatch = doc.fileName?.toLowerCase().includes(q);
        const cityMatch = (doc.fromCity || doc.toCity || doc.hotelAddress || '')?.toLowerCase().includes(q);
        if (!titleMatch && !refMatch && !fileMatch && !cityMatch) return false;
      }
      return true;
    });
  }, [documents, filter, searchQuery]);

  // Counts
  const counts = useMemo(() => {
    let hotel = 0;
    let idp = 0;
    let temple = 0;
    let other = 0;
    documents.forEach(d => {
      const cat = inferDocCategory(d);
      if (cat === 'hotel_booking') hotel++;
      else if (cat === 'id_proof') idp++;
      else if (cat === 'temple_pass') temple++;
      else other++;
    });
    return { all: documents.length, hotel, idp, temple, other };
  }, [documents]);

  // File Upload Handler (reads base64 for 100% offline Dexie storage)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      setAlertMessage('File size exceeds the 12MB limit. Please choose a smaller document.');
      return;
    }

    setFormFileName(file.name);
    setFormFileSize(Math.round(file.size / 1024) + ' KB');
    setFormFileType(file.type || 'application/octet-stream');

    const reader = new FileReader();
    reader.onload = ev => {
      if (ev.target?.result) {
        setFormBlobData(ev.target.result as string);
        showToast('Document file attached offline');
      }
    };
    reader.readAsDataURL(file);
  };

  // Open Add Form
  const openAddForm = (defaultCategory: 'hotel_booking' | 'id_proof' | 'temple_pass' | 'other' = 'hotel_booking') => {
    setDocCategory(defaultCategory);
    setFormTitle('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormNotes('');
    setFormDayId(days[0]?.id || '');
    setFormFileName('');
    setFormFileSize('');
    setFormFileType('');
    setFormBlobData('');

    // Specific defaults
    setHotelName('');
    setHotelCity('Shirdi');
    setHotelCheckIn('2026-11-18');
    setHotelCheckOut('2026-11-19');
    setHotelBookingRef('');
    setHotelRoomType('Dharamshala');
    setHotelAmount('');

    setIdType('Aadhaar Card');
    setIdHolderName('');
    setIdNumber('');

    setTempleName('Shirdi Sai Baba Sansthan');
    setTempleSlot('Morning Darshan');
    setTempleToken('');
    setTemplePersons('1');

    setOtherPurpose('');
    setOtherRef('');

    setScreen('add');
  };

  // Open Edit Form
  const openEditForm = (doc: BookingDocument) => {
    setSelectedDocId(doc.id);
    const cat = inferDocCategory(doc);
    setDocCategory(cat);
    setFormTitle(doc.title || '');
    setFormDate(doc.travelDate || doc.date || doc.bookingDate || '');
    setFormNotes(doc.notes || '');
    setFormDayId(doc.dayId || '');
    setFormFileName(doc.fileName || '');
    setFormFileSize(doc.fileSize ? `${doc.fileSize}` : '');
    setFormFileType(doc.fileType || '');
    setFormBlobData(doc.blobData || doc.fileUrl || '');

    // Prefill category specifics
    if (cat === 'hotel_booking') {
      setHotelName(doc.title || '');
      setHotelCity(doc.fromCity || doc.toCity || 'Shirdi');
      setHotelCheckIn(doc.checkInTime || doc.travelDate || '');
      setHotelCheckOut(doc.checkOutTime || '');
      setHotelBookingRef(doc.bookingRef || doc.pnr || '');
      setHotelRoomType(doc.roomType || 'Dharamshala');
      setHotelAmount(doc.totalAmount ? `${doc.totalAmount}` : '');
    } else if (cat === 'id_proof') {
      setIdType(doc.type || 'Aadhaar Card');
      setIdHolderName(doc.passengers || '');
      setIdNumber(doc.pnr || doc.bookingRef || '');
    } else if (cat === 'temple_pass') {
      setTempleName(doc.title || 'Temple Darshan');
      setTempleSlot(doc.checkInTime || 'Morning Slot');
      setTempleToken(doc.pnr || doc.bookingRef || '');
      setTemplePersons(doc.passengers || '1');
    } else {
      setOtherPurpose(doc.category || 'General Document');
      setOtherRef(doc.pnr || doc.bookingRef || '');
    }

    setScreen('edit');
  };

  // Submit Handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveDocument) return;

    let titleToSave = formTitle.trim();
    let bookingRefToSave = '';
    let categoryToSave = docCategory;

    if (docCategory === 'hotel_booking') {
      titleToSave = titleToSave || hotelName.trim() || 'Hotel Booking Voucher';
      bookingRefToSave = hotelBookingRef.trim();
    } else if (docCategory === 'id_proof') {
      titleToSave = titleToSave || `${idType} - ${idHolderName.trim() || 'Pilgrim'}`;
      bookingRefToSave = idNumber.trim();
    } else if (docCategory === 'temple_pass') {
      titleToSave = titleToSave || `${templeName.trim()} Darshan Pass`;
      bookingRefToSave = templeToken.trim();
    } else {
      titleToSave = titleToSave || 'Important Document';
      bookingRefToSave = otherRef.trim();
    }

    setIsSubmitting(true);
    try {
      const docPayload: Partial<BookingDocument> = {
        id: screen === 'edit' && selectedDoc ? selectedDoc.id : undefined,
        tripId: trip?.id,
        dayId: formDayId || undefined,
        title: titleToSave,
        docType:
          docCategory === 'hotel_booking'
            ? 'Hotel Receipt'
            : docCategory === 'id_proof'
            ? 'ID Proof'
            : docCategory === 'temple_pass'
            ? 'Temple Pass'
            : 'Other',
        type: docCategory,
        category: docCategory,
        date: formDate || undefined,
        travelDate: formDate || undefined,
        bookingRef: bookingRefToSave || undefined,
        pnr: bookingRefToSave || undefined,
        fileName: formFileName || undefined,
        fileSize: formFileSize || undefined,
        fileType: formFileType || undefined,
        blobData: formBlobData || undefined,
        fileUrl: formBlobData || undefined,
        offlineCached: true,
        isOfflineAvailable: true,
        notes: formNotes.trim() || undefined,
        // Specific Hotel Fields
        roomType: docCategory === 'hotel_booking' ? hotelRoomType : undefined,
        fromCity: docCategory === 'hotel_booking' ? hotelCity : undefined,
        checkInTime:
          docCategory === 'hotel_booking'
            ? hotelCheckIn
            : docCategory === 'temple_pass'
            ? templeSlot
            : undefined,
        checkOutTime: docCategory === 'hotel_booking' ? hotelCheckOut : undefined,
        totalAmount:
          docCategory === 'hotel_booking' && hotelAmount ? parseFloat(hotelAmount) : undefined,
        passengers:
          docCategory === 'id_proof'
            ? idHolderName
            : docCategory === 'temple_pass'
            ? templePersons
            : undefined,
      };

      await onSaveDocument(docPayload);
      showToast(screen === 'edit' ? 'Document updated successfully' : 'Document stored in vault');
      setScreen('overview');
    } catch (err) {
      console.error('Error saving document:', err);
      showToast('Failed to save document');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Handler
  const handleDelete = (docId: string) => {
    if (!onDeleteDocument) return;
    setDocToDelete(docId);
  };

  const getCategoryBadge = (cat: 'hotel_booking' | 'id_proof' | 'temple_pass' | 'other') => {
    switch (cat) {
      case 'hotel_booking':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
            <Hotel className="w-2.5 h-2.5" /> Accommodation
          </span>
        );
      case 'id_proof':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-2.5 h-2.5" /> ID Proofs &amp; Cards
          </span>
        );
      case 'temple_pass':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
            <Compass className="w-2.5 h-2.5" /> Temple Passes
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
            <FileText className="w-2.5 h-2.5" /> Others
          </span>
        );
    }
  };

  // ===========================================================================
  // SUBPAGE 1: DOCUMENT DETAILS
  // ===========================================================================
  if (screen === 'details' && selectedDoc) {
    const cat = inferDocCategory(selectedDoc);
    const hasFile = Boolean(selectedDoc.blobData || selectedDoc.fileUrl || selectedDoc.fileName);

    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        {/* Navigation Header */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            onClick={() => setScreen('overview')}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#0F5B44] hover:underline card-press-3d"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Back to Vault</span>
          </button>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => openEditForm(selectedDoc)}
              className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-[#0F5B44] text-xs font-bold hover:bg-emerald-50 transition-all card-press-3d shadow-2xs inline-flex items-center gap-1.5"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => handleDelete(selectedDoc.id)}
              className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-600 text-xs font-bold hover:bg-rose-50 transition-all card-press-3d shadow-2xs inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* 3D Document Hero Card */}
        <div className="glass-card card-3d card-depth-3d rounded-3xl p-5 border border-white/90 shadow-[0_12px_32px_-8px_rgba(15,91,68,0.12)] space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-indigo-600/25">
                <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Pilgrimage Vault Record
                </span>
                <h3 className="text-base font-black text-gray-900 leading-tight">
                  {selectedDoc.title}
                </h3>
              </div>
            </div>
            {getCategoryBadge(cat)}
          </div>

          {/* Contextual Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            {selectedDoc.bookingRef && (
              <div className="p-3 rounded-2xl bg-gray-50/90 border border-gray-100 space-y-0.5">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                  Reference / PNR
                </span>
                <span className="font-mono font-black text-gray-800 text-sm">
                  {selectedDoc.bookingRef}
                </span>
              </div>
            )}

            {(selectedDoc.travelDate || selectedDoc.date) && (
              <div className="p-3 rounded-2xl bg-gray-50/90 border border-gray-100 space-y-0.5">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                  Valid / Travel Date
                </span>
                <span className="font-bold text-gray-800">
                  {formatDateDisplay(selectedDoc.travelDate || selectedDoc.date)}
                </span>
              </div>
            )}

            {cat === 'hotel_booking' && selectedDoc.fromCity && (
              <div className="p-3 rounded-2xl bg-gray-50/90 border border-gray-100 space-y-0.5">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                  Destination City
                </span>
                <span className="font-bold text-gray-800">{selectedDoc.fromCity}</span>
              </div>
            )}

            {cat === 'hotel_booking' && selectedDoc.roomType && (
              <div className="p-3 rounded-2xl bg-gray-50/90 border border-gray-100 space-y-0.5">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                  Room Type
                </span>
                <span className="font-bold text-gray-800">{selectedDoc.roomType}</span>
              </div>
            )}

            {cat === 'id_proof' && selectedDoc.passengers && (
              <div className="p-3 rounded-2xl bg-gray-50/90 border border-gray-100 space-y-0.5">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                  Holder Name
                </span>
                <span className="font-bold text-gray-800">{selectedDoc.passengers}</span>
              </div>
            )}

            {cat === 'temple_pass' && selectedDoc.checkInTime && (
              <div className="p-3 rounded-2xl bg-gray-50/90 border border-gray-100 space-y-0.5">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                  Darshan Slot
                </span>
                <span className="font-bold text-gray-800">{selectedDoc.checkInTime}</span>
              </div>
            )}
          </div>

          {/* Attached File Preview or Card */}
          {hasFile ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-emerald-950 truncate">
                    {selectedDoc.fileName || 'Attached Digital Document'}
                  </p>
                  <p className="text-[10px] text-emerald-800 font-medium">
                    {selectedDoc.fileSize || 'Offline cached'} · {selectedDoc.fileType || 'Document'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setChooserDoc(selectedDoc)}
                  className="px-3 py-1.5 rounded-xl bg-[#0F5B44] text-white text-xs font-bold hover:bg-[#136a50] transition-all shadow-2xs inline-flex items-center gap-1.5 card-press-3d"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View</span>
                </button>
                <a
                  href={selectedDoc.blobData || selectedDoc.fileUrl}
                  download={selectedDoc.fileName || 'pilgrimage_doc'}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-[#0F5B44] text-xs font-bold hover:bg-emerald-100 transition-all shadow-2xs inline-flex items-center gap-1.5 card-press-3d"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-700" />
              <span>No image or PDF file attached. You can edit this record to attach one.</span>
            </div>
          )}

          {/* Notes */}
          {selectedDoc.notes && (
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 text-xs text-gray-700 space-y-1">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                Vault Notes
              </span>
              <p className="whitespace-pre-wrap leading-relaxed">{selectedDoc.notes}</p>
            </div>
          )}

          {/* Offline Guarantee badge */}
          <div className="pt-2 flex items-center gap-2 text-[11px] font-bold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Encrypted &amp; available 100% offline in IndexedDB</span>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // SUBPAGE 2 & 3: ADD / EDIT DOCUMENT (DYNAMIC SMART FORM)
  // ===========================================================================
  if (screen === 'add' || screen === 'edit') {
    const isEdit = screen === 'edit';

    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            onClick={() => setScreen('overview')}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#0F5B44] hover:underline card-press-3d"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Cancel</span>
          </button>
          <h2 className="text-sm font-black text-gray-900">
            {isEdit ? 'Edit Document' : 'Upload Document to Vault'}
          </h2>
          <div className="w-10" />
        </div>

        {/* Dynamic Interactive Form */}
        <form
          onSubmit={handleFormSubmit}
          className="glass-card card-3d rounded-3xl p-5 border border-white/90 shadow-[0_12px_32px_-8px_rgba(15,91,68,0.12)] space-y-4"
        >
          {/* Step 1: Category Selector */}
          <div>
            <label className="text-xs font-black text-gray-800 block mb-1.5">
              Document Category <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'hotel_booking', label: 'Hotel / Stay', icon: Hotel },
                { id: 'id_proof', label: 'ID Proof & Cards', icon: ShieldCheck },
                { id: 'temple_pass', label: 'Temple Pass', icon: Compass },
                { id: 'other', label: 'Other Document', icon: FileText },
              ].map(cat => {
                const isSel = docCategory === cat.id;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setDocCategory(cat.id as any)}
                    className={`flex items-center gap-2 p-2.5 rounded-2xl border text-xs font-bold transition-all card-press-3d text-left ${
                      isSel
                        ? 'bg-gradient-to-tr from-[#0F5B44] to-teal-700 text-white border-transparent shadow-md shadow-emerald-950/20'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-emerald-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Dynamic Category Questions */}
          {docCategory === 'hotel_booking' && (
            <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200/60 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-black text-purple-900 border-b border-purple-200/40 pb-2">
                <Hotel className="w-4 h-4 text-purple-700" />
                <span>Hotel &amp; Stay Information</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-700 block mb-1">
                    Hotel / Dharamshala Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={hotelName}
                    onChange={e => setHotelName(e.target.value)}
                    placeholder="e.g. Shri Sai Baba Sansthan Bhaktaniwas"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-purple-600 focus:outline-hidden bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-700 block mb-1">
                    City / Location
                  </label>
                  <input
                    type="text"
                    value={hotelCity}
                    onChange={e => setHotelCity(e.target.value)}
                    placeholder="e.g. Shirdi, Dwarka, Somnath, Ujjain"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-purple-600 focus:outline-hidden bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-700 block mb-1">Check-in Date</label>
                  <input
                    type="date"
                    value={hotelCheckIn}
                    onChange={e => setHotelCheckIn(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-purple-600 focus:outline-hidden bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-700 block mb-1">Check-out Date</label>
                  <input
                    type="date"
                    value={hotelCheckOut}
                    onChange={e => setHotelCheckOut(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-purple-600 focus:outline-hidden bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-700 block mb-1">
                    Booking / Voucher Ref
                  </label>
                  <input
                    type="text"
                    value={hotelBookingRef}
                    onChange={e => setHotelBookingRef(e.target.value)}
                    placeholder="e.g. SHIRDI-BHAKTA-882"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-purple-600 focus:outline-hidden bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-700 block mb-1">
                    Room Type &amp; Tariff
                  </label>
                  <input
                    type="text"
                    value={hotelRoomType}
                    onChange={e => setHotelRoomType(e.target.value)}
                    placeholder="e.g. Dharamshala Non-AC"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-purple-600 focus:outline-hidden bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {docCategory === 'id_proof' && (
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-900 border-b border-emerald-200/40 pb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Identity Card Information</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-700 block mb-1">ID Type</label>
                  <select
                    value={idType}
                    onChange={e => setIdType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
                  >
                    <option value="Aadhaar Card">Aadhaar Card</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Passport">Passport</option>
                    <option value="Driving License">Driving License</option>
                    <option value="PAN Card">PAN Card</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-700 block mb-1">
                    Full Name on ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={idHolderName}
                    onChange={e => setIdHolderName(e.target.value)}
                    placeholder="e.g. Pilgrim Name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-700 block mb-1">ID Number</label>
                  <input
                    type="text"
                    value={idNumber}
                    onChange={e => setIdNumber(e.target.value)}
                    placeholder="e.g. XXXX-XXXX-4589"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {docCategory === 'temple_pass' && (
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/60 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-black text-amber-900 border-b border-amber-200/40 pb-2">
                <Compass className="w-4 h-4 text-amber-700" />
                <span>Temple Darshan Pass Details</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-700 block mb-1">
                    Temple / Shrine Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={templeName}
                    onChange={e => setTempleName(e.target.value)}
                    placeholder="e.g. Shirdi Sai Baba, Somnath, Dwarkadhish"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-amber-600 focus:outline-hidden bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-700 block mb-1">
                    Darshan Slot / Timing
                  </label>
                  <input
                    type="text"
                    value={templeSlot}
                    onChange={e => setTempleSlot(e.target.value)}
                    placeholder="e.g. 6:00 AM - 7:30 AM Morning Aarti"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-amber-600 focus:outline-hidden bg-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-700 block mb-1">
                    Pass / Token Number
                  </label>
                  <input
                    type="text"
                    value={templeToken}
                    onChange={e => setTempleToken(e.target.value)}
                    placeholder="e.g. VIP-DARSHAN-452"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-amber-600 focus:outline-hidden bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-700 block mb-1">Persons Count</label>
                  <input
                    type="number"
                    min="1"
                    value={templePersons}
                    onChange={e => setTemplePersons(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-amber-600 focus:outline-hidden bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {docCategory === 'other' && (
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/60 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-black text-blue-900 border-b border-blue-200/40 pb-2">
                <FileText className="w-4 h-4 text-blue-700" />
                <span>Document Details</span>
              </div>
              <div>
                <label className="text-xs font-black text-gray-700 block mb-1">
                  Document Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. Travel Insurance, Medical Certificate, Permit"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-hidden bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-700 block mb-1">Category / Purpose</label>
                  <input
                    type="text"
                    value={otherPurpose}
                    onChange={e => setOtherPurpose(e.target.value)}
                    placeholder="e.g. Medical, Insurance, Permit"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-blue-600 focus:outline-hidden bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-700 block mb-1">Reference / Number</label>
                  <input
                    type="text"
                    value={otherRef}
                    onChange={e => setOtherRef(e.target.value)}
                    placeholder="e.g. POL-99201"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-blue-600 focus:outline-hidden bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Offline File Attachment */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-gray-800 block">
              Attach File (PDF, Image, Voucher - Saved Offline)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,application/pdf"
              className="hidden"
            />
            {formFileName ? (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-black text-emerald-950 truncate">{formFileName}</p>
                    <p className="text-[10px] text-emerald-700 font-bold">{formFileSize}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormFileName('');
                    setFormFileSize('');
                    setFormFileType('');
                    setFormBlobData('');
                  }}
                  className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 card-press-3d"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-4 rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#0F5B44] bg-gray-50/50 hover:bg-emerald-50/40 transition-all flex flex-col items-center justify-center gap-1.5 text-gray-500 hover:text-[#0F5B44] card-press-3d"
              >
                <Upload className="w-5 h-5" />
                <span className="text-xs font-bold">Tap to browse or attach PDF / Photo</span>
                <span className="text-[10px] text-gray-400">Stores directly inside your browser database</span>
              </button>
            )}
          </div>

          {/* Step 4: Notes */}
          <div>
            <label className="text-xs font-black text-gray-700 block mb-1">Important Notes</label>
            <textarea
              rows={2}
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              placeholder="e.g. Carry original Aadhaar at temple counter..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setScreen('overview')}
              className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-100 transition-all card-press-3d"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#0F5B44] via-[#136a50] to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-950/25 hover:shadow-lg transition-all card-press-3d disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Update Document' : 'Save to Vault'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ===========================================================================
  // OVERVIEW SCREEN (STANDALONE VAULT - NO TOP TICKET/TRANSPORT DOCK)
  // ===========================================================================
  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-gray-900/90 text-white text-xs font-bold backdrop-blur-md shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top duration-200">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider mb-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>PILGRIMAGE VAULT · OFFLINE SAFE</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-tight">
            Important Documents
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            All your bookings, IDs and pilgrimage passes stored offline
          </p>
        </div>
        <button
          onClick={() => openAddForm('hotel_booking')}
          className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-950/25 hover:shadow-lg transition-all card-press-3d inline-flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Upload Doc</span>
        </button>
      </div>

      {/* Vault Stats Banner */}
      <div className="glass-card card-3d card-depth-3d rounded-3xl p-4 sm:p-5 border border-white/90 shadow-[0_12px_32px_-8px_rgba(15,91,68,0.1)] relative overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-gray-100/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#0F5B44] to-teal-600 text-white flex items-center justify-center shadow-xs">
              <Shield className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-gray-900">
                Pilgrimage Document Vault
              </h3>
              <p className="text-[10px] text-gray-500 font-medium">
                Encrypted offline storage for IDs, stays &amp; temple passes
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
            Offline Safe
          </span>
        </div>

        {/* 3 Metric Pillars */}
        <div className="grid grid-cols-3 gap-2 pt-3 text-center">
          <div className="p-2.5 rounded-2xl bg-white/70 border border-white/80 shadow-2xs">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
              Total Docs
            </span>
            <span className="text-base sm:text-lg font-black text-[#0F5B44]">
              {counts.all}
            </span>
            <span className="text-[9px] text-gray-400 block font-medium">files</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-white/70 border border-white/80 shadow-2xs">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
              Stays &amp; Hotels
            </span>
            <span className="text-base sm:text-lg font-black text-purple-700">
              {counts.hotel}
            </span>
            <span className="text-[9px] text-gray-400 block font-medium">bookings</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-white/70 border border-white/80 shadow-2xs">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
              ID &amp; Passes
            </span>
            <span className="text-base sm:text-lg font-black text-blue-700">
              {counts.idp + counts.temple}
            </span>
            <span className="text-[9px] text-gray-400 block font-medium">records</span>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {[
          { id: 'all', label: `All (${counts.all})` },
          { id: 'hotel_booking', label: `Accommodation (${counts.hotel})` },
          { id: 'id_proof', label: `ID Proofs & Cards (${counts.idp})` },
          { id: 'temple_pass', label: `Temple Passes (${counts.temple})` },
          { id: 'other', label: `Others (${counts.other})` },
        ].map(cat => {
          const isSel = filter === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all card-press-3d ${
                isSel
                  ? 'bg-[#0F5B44] text-white shadow-sm'
                  : 'bg-white/80 text-gray-600 hover:bg-emerald-50 border border-gray-200/80'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by document title, reference, or destination..."
          className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-white/90 border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden shadow-2xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Documents List */}
      <div className="space-y-2.5">
        {filteredDocs.length === 0 ? (
          <div className="glass-card rounded-3xl p-8 border border-white/80 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#0F5B44] flex items-center justify-center mx-auto shadow-2xs">
              <ShieldCheck className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h4 className="text-sm font-black text-gray-900">No documents uploaded yet</h4>
              <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1">
                {searchQuery
                  ? 'No documents matched your search filter.'
                  : 'Tickets, hotel vouchers, and ID proofs will appear here once added.'}
              </p>
            </div>
            <button
              onClick={() => openAddForm('hotel_booking')}
              className="px-4 py-2 rounded-xl bg-[#0F5B44] text-white text-xs font-bold card-press-3d shadow-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload First Document</span>
            </button>
          </div>
        ) : (
          filteredDocs.map(doc => {
            const cat = inferDocCategory(doc);
            return (
              <div
                key={doc.id}
                onClick={() => {
                  setSelectedDocId(doc.id);
                  setScreen('details');
                }}
                className="glass-card card-3d rounded-2xl p-4 border border-white/80 shadow-2xs hover:shadow-md transition-all cursor-pointer card-press-3d group space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {cat === 'hotel_booking' ? (
                        <Hotel className="w-4 h-4 text-purple-600" />
                      ) : cat === 'id_proof' ? (
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      ) : cat === 'temple_pass' ? (
                        <Compass className="w-4 h-4 text-amber-600" />
                      ) : (
                        <FileText className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-black text-gray-900 truncate">
                        {doc.title}
                      </h4>
                      <p className="text-[10px] text-gray-500 font-medium truncate">
                        {doc.bookingRef ? `Ref: ${doc.bookingRef}` : doc.docType || 'Document'}
                        {doc.travelDate || doc.date ? ` · ${formatDateDisplay(doc.travelDate || doc.date)}` : ''}
                      </p>
                    </div>
                  </div>
                  {getCategoryBadge(cat)}
                </div>

                {/* Sub row with actions */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100/60 text-[10px] font-bold text-gray-400">
                  <span className="text-emerald-700 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Offline Cached
                  </span>
                  <div className="flex items-center gap-2">
                    {(doc.blobData || doc.fileUrl) && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setChooserDoc(doc);
                        }}
                        className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#0F5B44] border border-emerald-200 card-press-3d inline-flex items-center gap-1 font-bold"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        openEditForm(doc);
                      }}
                      className="px-2 py-1 rounded-lg bg-gray-50 hover:bg-emerald-50 text-[#0F5B44] border border-gray-200/60 card-press-3d inline-flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleDelete(doc.id);
                      }}
                      className="px-2 py-1 rounded-lg bg-gray-50 hover:bg-rose-50 text-rose-600 border border-gray-200/60 card-press-3d inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3D Confirmation Popup for Delete Document */}
      <ConfirmModal
        isOpen={Boolean(docToDelete)}
        title="Delete Document?"
        message="Are you sure you want to remove this document from your vault?\nThis stored file and booking record will be removed."
        confirmLabel="Delete Document"
        cancelLabel="Keep Document"
        variant="danger"
        iconType="trash"
        onConfirm={async () => {
          if (docToDelete && onDeleteDocument) {
            const id = docToDelete;
            setDocToDelete(null);
            await onDeleteDocument(id);
            showToast('Document removed');
            if (selectedDocId === id) {
              setSelectedDocId(null);
              setScreen('overview');
            }
          }
        }}
        onCancel={() => setDocToDelete(null)}
      />

      {/* 3D Alert Popup */}
      <AlertModal
        isOpen={Boolean(alertMessage)}
        message={alertMessage || ''}
        variant="warning"
        onClose={() => setAlertMessage(null)}
      />

      {/* 3D Format Chooser Modal */}
      <ViewAttachmentChooserModal
        isOpen={Boolean(chooserDoc)}
        item={chooserDoc}
        itemType="document"
        onSelectMode={handleSelectDocMode}
        onClose={() => setChooserDoc(null)}
        onAttachFile={handleAttachDocFile}
      />

      {/* 3D In-App Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={Boolean(viewingDoc)}
        document={viewingDoc}
        initialMode={docViewerMode}
        onClose={() => setViewingDoc(null)}
        onAttachFile={handleAttachDocFile}
      />
    </div>
  );
};
