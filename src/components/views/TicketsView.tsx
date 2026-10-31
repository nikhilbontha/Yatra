'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Ticket,
  Train,
  Bus,
  Car,
  Plane,
  Plus,
  Trash2,
  Edit,
  Eye,
  Download,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  ChevronLeft,
  Search,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  X,
  QrCode,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { BookingDocument, TransportLeg, Trip, ItineraryDay, Booking } from '@/types/trip';
import { DocumentsView } from '@/components/views/DocumentsView';
import { TransportView } from '@/components/views/TransportView';
import { getConfirmedTransportLegs } from '@/lib/itinerary-data';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { AlertModal } from '@/components/modals/AlertModal';
import { DocumentViewerModal } from '@/components/modals/DocumentViewerModal';
import { ViewAttachmentChooserModal } from '@/components/modals/ViewAttachmentChooserModal';
import { TicketPassCard } from '@/components/tickets/TicketPassCard';
import { resolveTicketTransitDetails } from '@/lib/tickets-helper';

export type TicketScreen = 'overview' | 'details' | 'add' | 'edit';
export type TicketModeFilter = 'all' | 'train' | 'bus' | 'other';

export interface TicketsViewProps {
  trip?: Trip;
  days?: ItineraryDay[];
  bookings?: Booking[];
  documents?: BookingDocument[];
  transportLegs?: TransportLeg[];
  initialSection?: 'tickets' | 'documents' | 'transport';
  initialScreen?: TicketScreen;
  initialSelectedId?: string;
  initialTransportScreen?: string;
  initialSelectedTransportId?: string;
  onAddTicket?: (prefillTitle?: string) => void;
  onEditTicket?: (document: BookingDocument) => void;
  onDeleteTicket?: (docId: string) => void;
  onSaveDocument?: (doc: Partial<BookingDocument>, fileBlob?: string) => Promise<void> | void;
  onDeleteDocument?: (docId: string) => Promise<void> | void;
  onSaveTransport?: (leg: Partial<TransportLeg>) => Promise<void> | void;
  onDeleteTransport?: (legId: string) => Promise<void> | void;
  onSaveOffline?: (docId?: string) => void;
  onSelectDayIndex?: (dayIndex: number) => void;
}

export const TicketsView: React.FC<TicketsViewProps> = props => {
  const {
    trip,
    days = [],
    documents = [],
    transportLegs = [],
    initialSection = 'tickets',
    initialSelectedId,
    initialTransportScreen,
    initialSelectedTransportId,
    onSaveDocument,
    onDeleteDocument,
    onDeleteTicket,
    onSaveTransport,
    onDeleteTransport,
    onSelectDayIndex,
  } = props;

  // If invoked with initialSection='documents', delegate directly to dedicated DocumentsView
  if (initialSection === 'documents') {
    return (
      <DocumentsView
        trip={trip}
        days={days}
        documents={documents}
        onSaveDocument={onSaveDocument}
        onDeleteDocument={onDeleteDocument || onDeleteTicket}
        onSelectDayIndex={onSelectDayIndex}
      />
    );
  }

  // If invoked with initialSection='transport', delegate directly to dedicated TransportView
  if (initialSection === 'transport') {
    return (
      <TransportView
        trip={trip}
        days={days}
        transportLegs={transportLegs}
        initialTransportScreen={initialTransportScreen}
        initialSelectedTransportId={initialSelectedTransportId}
        onSaveTransport={onSaveTransport}
        onDeleteTransport={onDeleteTransport}
        onSelectDayIndex={onSelectDayIndex}
      />
    );
  }

  // Pure Standalone Travel Tickets & Passes View
  return <PureTicketsViewInner {...props} />;
};

const PureTicketsViewInner: React.FC<TicketsViewProps> = ({
  trip,
  days = [],
  documents = [],
  transportLegs = [],
  initialScreen = 'overview',
  initialSelectedId,
  onSaveDocument,
  onDeleteDocument,
  onDeleteTicket,
  onSelectDayIndex,
}) => {
  const [screen, setScreen] = useState<TicketScreen>(initialScreen);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(initialSelectedId || null);
  const [filter, setFilter] = useState<TicketModeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [viewingTicket, setViewingTicket] = useState<BookingDocument | null>(null);
  const [chooserTicket, setChooserTicket] = useState<BookingDocument | null>(null);
  const [ticketViewerMode, setTicketViewerMode] = useState<'image' | 'pdf'>('pdf');

  const handleSelectTicketMode = (mode: 'image' | 'pdf', ticketItem: any) => {
    setChooserTicket(null);
    setTicketViewerMode(mode);
    setViewingTicket(ticketItem);
  };

  const handleAttachTicketFile = async (type: 'image' | 'pdf', fileData: string, fileName: string, fileSize: number) => {
    const targetId = chooserTicket?.id || viewingTicket?.id || selectedTicketId;
    if (!targetId) return;
    const existing = uploadedTickets.find(d => d.id === targetId);
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
    if (chooserTicket && chooserTicket.id === targetId) {
      setChooserTicket(updatedDoc);
    }
    if (viewingTicket && viewingTicket.id === targetId) {
      setViewingTicket(updatedDoc);
    }
    showToast(`${type === 'pdf' ? 'PDF pass' : 'Pass photo'} attached successfully`);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

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

  // Canonical 19-Day Pilgrimage Transit Legs
  const canonicalLegs = useMemo(() => {
    if (transportLegs && transportLegs.length > 0) return transportLegs;
    return getConfirmedTransportLegs(trip?.id);
  }, [transportLegs, trip?.id]);

  // Uploaded Tickets & Passes
  const uploadedTickets = useMemo(() => {
    return documents;
  }, [documents]);

  // Filtered uploaded tickets
  const filteredTickets = useMemo(() => {
    return uploadedTickets.filter(ticket => {
      const mode = (ticket.docType || ticket.type || ticket.notes || '').toLowerCase();
      if (filter === 'train' && !mode.includes('train')) return false;
      if (filter === 'bus' && !mode.includes('bus')) return false;
      if (filter === 'other' && (mode.includes('train') || mode.includes('bus'))) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = ticket.title?.toLowerCase().includes(q);
        const pnrMatch = ticket.pnr?.toLowerCase().includes(q);
        const trainMatch = ticket.trainName?.toLowerCase().includes(q);
        const fromMatch = ticket.fromCity?.toLowerCase().includes(q);
        const toMatch = ticket.toCity?.toLowerCase().includes(q);
        if (!titleMatch && !pnrMatch && !trainMatch && !fromMatch && !toMatch) return false;
      }
      return true;
    });
  }, [uploadedTickets, filter, searchQuery]);

  // Selected Ticket
  const selectedTicket = useMemo(() => {
    const idToFind = selectedTicketId || initialSelectedId;
    if (idToFind) {
      return uploadedTickets.find(t => t.id === idToFind) || uploadedTickets[0] || null;
    }
    return uploadedTickets[0] || null;
  }, [uploadedTickets, selectedTicketId, initialSelectedId]);

  const initialDetails = useMemo(() => {
    return initialScreen === 'edit' && selectedTicket ? resolveTicketTransitDetails(selectedTicket) : null;
  }, [initialScreen, selectedTicket]);

  const initialPdf = useMemo(() => {
    if (initialScreen !== 'edit' || !selectedTicket) return { blob: '', name: '', size: '' };
    const blob = selectedTicket.pdfBlob || (selectedTicket.fileType?.includes('pdf') || selectedTicket.fileName?.toLowerCase().endsWith('.pdf') ? (selectedTicket.blobData || selectedTicket.fileUrl) : '') || '';
    const name = selectedTicket.pdfFileName || (selectedTicket.fileName?.toLowerCase().endsWith('.pdf') ? selectedTicket.fileName : '') || '';
    const size = selectedTicket.pdfFileSize ? String(selectedTicket.pdfFileSize) : (selectedTicket.fileName?.toLowerCase().endsWith('.pdf') && selectedTicket.fileSize ? String(selectedTicket.fileSize) : '') || '';
    return { blob, name, size };
  }, [initialScreen, selectedTicket]);

  const initialImg = useMemo(() => {
    if (initialScreen !== 'edit' || !selectedTicket) return { blob: '', name: '', size: '' };
    const blob = selectedTicket.imageBlob || selectedTicket.imageUrl || (selectedTicket.fileType?.includes('image') || selectedTicket.fileName?.match(/\.(jpe?g|png|webp|gif|svg)$/i) ? (selectedTicket.blobData || selectedTicket.fileUrl) : '') || '';
    const name = selectedTicket.imageFileName || (selectedTicket.fileName?.match(/\.(jpe?g|png|webp|gif|svg)$/i) ? selectedTicket.fileName : '') || '';
    const size = selectedTicket.imageFileSize ? String(selectedTicket.imageFileSize) : (selectedTicket.fileName?.match(/\.(jpe?g|png|webp|gif|svg)$/i) && selectedTicket.fileSize ? String(selectedTicket.fileSize) : '') || '';
    return { blob, name, size };
  }, [initialScreen, selectedTicket]);

  // Form State for Add / Edit Ticket
  const [formTitle, setFormTitle] = useState(initialScreen === 'edit' && selectedTicket ? selectedTicket.title || '' : '');
  const [formMode, setFormMode] = useState<string>(initialScreen === 'edit' && selectedTicket ? (selectedTicket.docType || (initialDetails?.isBus ? 'Bus Ticket' : 'Train Ticket')) : 'Train Ticket');
  const [formPnr, setFormPnr] = useState(initialScreen === 'edit' && selectedTicket ? (selectedTicket.pnr || selectedTicket.bookingRef || initialDetails?.pnr || '') : '');
  const [formTrainNumber, setFormTrainNumber] = useState(initialScreen === 'edit' && selectedTicket ? (selectedTicket.trainNumber || initialDetails?.trainNumber || '') : '');
  const [formTrainName, setFormTrainName] = useState(initialScreen === 'edit' && selectedTicket ? (selectedTicket.trainName || initialDetails?.trainName || '') : '');
  const [formDepartureTime, setFormDepartureTime] = useState(initialScreen === 'edit' && selectedTicket ? (selectedTicket.departureTime || initialDetails?.departureTime || '') : '');
  const [formArrivalTime, setFormArrivalTime] = useState(initialScreen === 'edit' && selectedTicket ? (selectedTicket.arrivalTime || initialDetails?.arrivalTime || '') : '');
  const [formAmount, setFormAmount] = useState(initialScreen === 'edit' && selectedTicket ? (selectedTicket.totalAmount !== undefined ? String(selectedTicket.totalAmount) : (initialDetails?.rawPrice !== undefined ? String(initialDetails.rawPrice) : '')) : '');
  const [formClassType, setFormClassType] = useState(initialScreen === 'edit' && selectedTicket ? (selectedTicket.classType || initialDetails?.classType || 'Sleeper Class (SL)') : 'Sleeper Class (SL)');
  const [formFromCity, setFormFromCity] = useState(initialScreen === 'edit' && selectedTicket ? (selectedTicket.fromCity || initialDetails?.fromCity || '') : '');
  const [formToCity, setFormToCity] = useState(initialScreen === 'edit' && selectedTicket ? (selectedTicket.toCity || initialDetails?.toCity || '') : '');
  const [formDate, setFormDate] = useState(initialScreen === 'edit' && selectedTicket ? (selectedTicket.travelDate || selectedTicket.date || initialDetails?.rawTravelDate || '') : '');
  const [formTime, setFormTime] = useState(initialScreen === 'edit' && selectedTicket ? (selectedTicket.departureTime || '') : '');
  const [formSeat, setFormSeat] = useState(initialScreen === 'edit' && selectedTicket ? (selectedTicket.coachSeat || initialDetails?.seatFormatted || '') : '');
  const [formDayId, setFormDayId] = useState(initialScreen === 'edit' && selectedTicket ? (selectedTicket.dayId || '') : '');
  const [formPaymentMethod, setFormPaymentMethod] = useState<'UPI' | 'Cash'>(initialScreen === 'edit' && selectedTicket ? ((selectedTicket as any).paymentMethod || 'UPI') : 'UPI');
  const [formFileName, setFormFileName] = useState(initialScreen === 'edit' && selectedTicket ? (selectedTicket.fileName || initialPdf.name || initialImg.name || '') : '');
  const [formFileSize, setFormFileSize] = useState(initialScreen === 'edit' && selectedTicket ? (selectedTicket.fileSize ? String(selectedTicket.fileSize) : (initialPdf.size || initialImg.size || '')) : '');
  const [formFileType, setFormFileType] = useState(initialScreen === 'edit' && selectedTicket ? (selectedTicket.fileType || (initialPdf.blob ? 'application/pdf' : 'image/jpeg')) : '');
  const [formBlobData, setFormBlobData] = useState(initialScreen === 'edit' && selectedTicket ? (selectedTicket.blobData || selectedTicket.fileUrl || initialPdf.blob || initialImg.blob || '') : '');
  const [formNotes, setFormNotes] = useState(initialScreen === 'edit' && selectedTicket ? (selectedTicket.notes || '') : '');

  // Dual Attachment States: Official PDF Ticket & Pass Photo / Screenshot
  const [formPdfBlob, setFormPdfBlob] = useState(initialPdf.blob);
  const [formPdfName, setFormPdfName] = useState(initialPdf.name);
  const [formPdfSize, setFormPdfSize] = useState(initialPdf.size);

  const [formImageBlob, setFormImageBlob] = useState(initialImg.blob);
  const [formImageName, setFormImageName] = useState(initialImg.name);
  const [formImageSize, setFormImageSize] = useState(initialImg.size);

  const ticketPdfInputRef = useRef<HTMLInputElement>(null);
  const ticketImageInputRef = useRef<HTMLInputElement>(null);

  // Counts
  const counts = useMemo(() => {
    const totalLegs = canonicalLegs.length;
    const bookedLegs = canonicalLegs.filter(l => l.status === 'Booked' || l.status === 'Confirmed').length;
    const verifiedLegs = totalLegs - bookedLegs;
    return {
      passes: totalLegs,
      uploaded: uploadedTickets.length,
      booked: bookedLegs,
      needsVerification: verifiedLegs,
    };
  }, [canonicalLegs, uploadedTickets]);

  // File Upload Handlers (reads base64 for 100% offline Dexie storage)
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setAlertMessage('PDF size exceeds the 15MB limit. Please select a smaller document.');
      return;
    }

    const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
    setFormPdfName(file.name);
    setFormPdfSize(sizeStr);

    const reader = new FileReader();
    reader.onload = ev => {
      if (ev.target?.result) {
        setFormPdfBlob(ev.target.result as string);
        showToast('Official PDF ticket cached offline');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setAlertMessage('Image size exceeds the 15MB limit. Please select a smaller image.');
      return;
    }

    const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
    setFormImageName(file.name);
    setFormImageSize(sizeStr);

    const reader = new FileReader();
    reader.onload = ev => {
      if (ev.target?.result) {
        setFormImageBlob(ev.target.result as string);
        showToast('Pass photo/scan updated successfully');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setAlertMessage('File size exceeds the 15MB limit. Please select a smaller document.');
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      handlePdfUpload(e);
    } else {
      handleImageUpload(e);
    }

    setFormFileName(file.name);
    setFormFileSize(Math.round(file.size / 1024) + ' KB');
    setFormFileType(file.type || (isPdf ? 'application/pdf' : 'image/jpeg'));

    const reader = new FileReader();
    reader.onload = ev => {
      if (ev.target?.result) {
        setFormBlobData(ev.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const openAddForm = (prefillRoute?: { from?: string; to?: string; service?: string }) => {
    setFormTitle(prefillRoute?.service ? `${prefillRoute.service} Ticket` : '');
    setFormMode('Train Ticket');
    setFormPnr('');
    setFormTrainNumber(prefillRoute?.service || '17002');
    setFormTrainName('Secunderabad - Sainagar Shirdi Express');
    setFormDepartureTime('16:30');
    setFormArrivalTime('09:15');
    setFormAmount('453.15');
    setFormPaymentMethod('UPI');
    setFormClassType('Sleeper Class (SL)');
    setFormFromCity(prefillRoute?.from || 'Secunderabad / Hyderabad');
    setFormToCity(prefillRoute?.to || 'Sainagar Shirdi');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormTime('16:30');
    setFormSeat('S3/64/SU');
    setFormDayId(days[0]?.id || '');
    setFormFileName('');
    setFormFileSize('');
    setFormFileType('');
    setFormBlobData('');
    setFormPdfBlob('');
    setFormPdfName('');
    setFormPdfSize('');
    setFormImageBlob('');
    setFormImageName('');
    setFormImageSize('');
    setFormNotes('');
    setScreen('add');
  };

  const openEditForm = (ticket: BookingDocument) => {
    const details = resolveTicketTransitDetails(ticket);
    setSelectedTicketId(ticket.id);
    setFormTitle(ticket.title || '');
    setFormMode(ticket.docType || 'Train Ticket');
    setFormPnr(ticket.pnr || ticket.bookingRef || details.pnr || '');
    setFormTrainNumber(ticket.trainNumber || details.trainNumber || '');
    setFormTrainName(ticket.trainName || details.trainName || '');
    setFormDepartureTime(ticket.departureTime || details.departureTime || '');
    setFormArrivalTime(ticket.arrivalTime || details.arrivalTime || '');
    setFormAmount(
      ticket.totalAmount !== undefined
        ? `${ticket.totalAmount}`
        : details.rawPrice !== undefined
        ? `${details.rawPrice}`
        : '453.15'
    );
    setFormPaymentMethod((ticket as any).paymentMethod || 'UPI');
    setFormClassType(ticket.classType || details.classType || 'Sleeper Class (SL)');
    setFormFromCity(ticket.fromCity || details.fromCity || '');
    setFormToCity(ticket.toCity || details.toCity || '');
    setFormDate(ticket.travelDate || ticket.date || details.rawTravelDate || '');
    setFormTime(ticket.departureTime || details.departureTime || '');
    setFormSeat(ticket.coachSeat || details.seatFormatted || '');
    setFormDayId(ticket.dayId || '');

    // Resolve Dual Attachments
    const pdfBlob = ticket.pdfBlob || (ticket.fileType?.includes('pdf') || ticket.fileName?.toLowerCase().endsWith('.pdf') ? (ticket.blobData || ticket.fileUrl) : '');
    const pdfName = ticket.pdfFileName || (ticket.fileName?.toLowerCase().endsWith('.pdf') ? ticket.fileName : '');
    const pdfSize = ticket.pdfFileSize ? String(ticket.pdfFileSize) : (ticket.fileName?.toLowerCase().endsWith('.pdf') && ticket.fileSize ? String(ticket.fileSize) : '');
    setFormPdfBlob(pdfBlob || '');
    setFormPdfName(pdfName || '');
    setFormPdfSize(pdfSize || '');

    const imgBlob = ticket.imageBlob || ticket.imageUrl || (ticket.fileType?.includes('image') || ticket.fileName?.match(/\.(jpe?g|png|webp|gif|svg)$/i) ? (ticket.blobData || ticket.fileUrl) : '');
    const imgName = ticket.imageFileName || (ticket.fileName?.match(/\.(jpe?g|png|webp|gif|svg)$/i) ? ticket.fileName : '');
    const imgSize = ticket.imageFileSize ? String(ticket.imageFileSize) : (ticket.fileName?.match(/\.(jpe?g|png|webp|gif|svg)$/i) && ticket.fileSize ? String(ticket.fileSize) : '');
    setFormImageBlob(imgBlob || '');
    setFormImageName(imgName || '');
    setFormImageSize(imgSize || '');

    setFormFileName(ticket.fileName || pdfName || imgName || '');
    setFormFileSize(ticket.fileSize ? `${ticket.fileSize}` : (pdfSize || imgSize || ''));
    setFormFileType(ticket.fileType || (pdfBlob ? 'application/pdf' : (imgBlob ? 'image/jpeg' : '')));
    setFormBlobData(ticket.blobData || ticket.fileUrl || pdfBlob || imgBlob || '');
    setFormNotes(ticket.notes || '');
    setScreen('edit');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveDocument) return;

    const titleToSave =
      formTitle.trim() ||
      `${formFromCity ? `${formFromCity} to ${formToCity}` : 'Travel'} ${formMode}`;

    setIsSubmitting(true);
    try {
      const parsedAmt = formAmount ? parseFloat(formAmount) : undefined;
      const primaryBlob = formPdfBlob || formImageBlob || formBlobData;
      const primaryName = formPdfName || formImageName || formFileName || `${titleToSave.replace(/\s+/g, '_')}.${formPdfBlob ? 'pdf' : 'jpg'}`;
      const primarySize = formPdfSize || formImageSize || formFileSize;

      const ticketPayload: Partial<BookingDocument> = {
        id: screen === 'edit' && selectedTicket ? selectedTicket.id : undefined,
        tripId: trip?.id,
        dayId: formDayId || undefined,
        title: titleToSave,
        docType: formMode as any,
        type: formMode,
        category: 'Travel Ticket',
        pnr: formPnr.trim() || undefined,
        bookingRef: formPnr.trim() || undefined,
        trainNumber: formTrainNumber.trim() || undefined,
        serviceNumber: formTrainNumber.trim() || undefined,
        trainName: formTrainName.trim() || undefined,
        departureTime: formDepartureTime.trim() || undefined,
        arrivalTime: formArrivalTime.trim() || undefined,
        classType: formClassType.trim() || undefined,
        totalAmount: typeof parsedAmt === 'number' && !isNaN(parsedAmt) ? parsedAmt : undefined,
        paymentMethod: formPaymentMethod,
        fromCity: formFromCity.trim() || undefined,
        toCity: formToCity.trim() || undefined,
        travelDate: formDate || undefined,
        date: formDate || undefined,
        checkInTime: formTime.trim() || undefined,
        coachSeat: formSeat.trim() || undefined,
        fileName: primaryName || undefined,
        fileSize: primarySize || undefined,
        fileType: formPdfBlob ? 'application/pdf' : (formImageBlob ? 'image/jpeg' : undefined),
        blobData: primaryBlob || undefined,
        fileUrl: primaryBlob || undefined,
        pdfBlob: formPdfBlob || undefined,
        pdfFileName: formPdfName || undefined,
        pdfFileSize: formPdfSize || undefined,
        imageBlob: formImageBlob || undefined,
        imageFileName: formImageName || undefined,
        imageFileSize: formImageSize || undefined,
        offlineCached: true,
        isOfflineAvailable: true,
        notes: formNotes.trim() || undefined,
      };

      await onSaveDocument(ticketPayload, primaryBlob);
      showToast(screen === 'edit' ? 'Ticket updated' : 'Ticket added successfully');
      setScreen('overview');
    } catch (err) {
      console.error('Error saving ticket:', err);
      showToast('Failed to save ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (docId: string) => {
    const handler = onDeleteDocument || onDeleteTicket;
    if (!handler) return;
    setTicketToDelete(docId);
  };

  const getModeIcon = (mode: string = 'train', className: string = 'w-4 h-4') => {
    const m = mode.toLowerCase();
    if (m.includes('bus')) return <Bus className={className} />;
    if (m.includes('train')) return <Train className={className} />;
    if (m.includes('flight') || m.includes('plane')) return <Plane className={className} />;
    return <Car className={className} />;
  };

  // ===========================================================================
  // SUBPAGE 1: TICKET BOARDING PASS DETAILS
  // ===========================================================================
  if (screen === 'details' && selectedTicket) {
    const hasFile = Boolean(selectedTicket.blobData || selectedTicket.fileUrl || selectedTicket.fileName);

    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            onClick={() => setScreen('overview')}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#0F5B44] hover:underline card-press-3d"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Back to Tickets</span>
          </button>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => openEditForm(selectedTicket)}
              className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-[#0F5B44] text-xs font-bold hover:bg-emerald-50 transition-all card-press-3d shadow-2xs inline-flex items-center gap-1.5"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => handleDelete(selectedTicket.id)}
              className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-600 text-xs font-bold hover:bg-rose-50 transition-all card-press-3d shadow-2xs inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Boarding Pass Hero Card */}
        <div className="glass-card card-3d card-depth-3d rounded-3xl p-5 border border-white/90 shadow-[0_12px_32px_-8px_rgba(15,91,68,0.12)] space-y-4 relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0F5B44] via-[#146b51] to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-950/20">
                {getModeIcon(selectedTicket.docType || 'train', 'w-5 h-5')}
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  {selectedTicket.docType || 'Travel Ticket'}
                </span>
                <h3 className="text-base font-black text-gray-900 leading-tight">
                  {selectedTicket.title}
                </h3>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
              Confirmed
            </span>
          </div>

          {/* Route Display */}
          {(selectedTicket.fromCity || selectedTicket.toCity) && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-white border border-emerald-200/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                  Origin Station
                </span>
                <h4 className="text-sm font-black text-emerald-950">
                  {selectedTicket.fromCity || 'Secunderabad'}
                </h4>
              </div>
              <ArrowRight className="w-5 h-5 text-emerald-700 stroke-[2.5]" />
              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                  Destination Station
                </span>
                <h4 className="text-sm font-black text-emerald-950">
                  {selectedTicket.toCity || 'Shirdi'}
                </h4>
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            {selectedTicket.pnr && (
              <div className="p-3 rounded-2xl bg-gray-50/90 border border-gray-100 space-y-0.5">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                  PNR / Ref Number
                </span>
                <span className="font-mono font-black text-gray-900 text-sm">
                  {selectedTicket.pnr}
                </span>
              </div>
            )}

            {(selectedTicket.travelDate || selectedTicket.date) && (
              <div className="p-3 rounded-2xl bg-gray-50/90 border border-gray-100 space-y-0.5">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                  Journey Date
                </span>
                <span className="font-bold text-gray-800">
                  {formatDateDisplay(selectedTicket.travelDate || selectedTicket.date)}
                </span>
              </div>
            )}

            {selectedTicket.checkInTime && (
              <div className="p-3 rounded-2xl bg-gray-50/90 border border-gray-100 space-y-0.5">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                  Departure Time
                </span>
                <span className="font-bold text-gray-800">{selectedTicket.checkInTime}</span>
              </div>
            )}

            {selectedTicket.coachSeat && (
              <div className="p-3 rounded-2xl bg-gray-50/90 border border-gray-100 space-y-0.5">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                  Coach &amp; Seat
                </span>
                <span className="font-bold text-gray-800">{selectedTicket.coachSeat}</span>
              </div>
            )}
          </div>

          {/* Attached Digital File Preview */}
          {hasFile && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-emerald-950 truncate">
                    {selectedTicket.fileName || 'Attached Ticket Document'}
                  </p>
                  <p className="text-[10px] text-emerald-800 font-medium">
                    {selectedTicket.fileSize || 'Offline cached'} · {selectedTicket.fileType || 'PDF'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setChooserTicket(selectedTicket)}
                  className="px-3 py-1.5 rounded-xl bg-[#0F5B44] text-white text-xs font-bold hover:bg-[#136a50] transition-all shadow-2xs inline-flex items-center gap-1.5 card-press-3d"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View</span>
                </button>
                <a
                  href={selectedTicket.blobData || selectedTicket.fileUrl}
                  download={selectedTicket.fileName || 'ticket'}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-[#0F5B44] text-xs font-bold hover:bg-emerald-100 transition-all shadow-2xs inline-flex items-center gap-1.5 card-press-3d"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </div>
            </div>
          )}

          {/* Notes */}
          {selectedTicket.notes && (
            <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs text-gray-700">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">
                Ticket Notes
              </span>
              <p className="whitespace-pre-wrap">{selectedTicket.notes}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===========================================================================
  // SUBPAGE 2 & 3: ADD / EDIT TICKET MODAL FORM
  // ===========================================================================
  if (screen === 'add' || screen === 'edit') {
    const isEdit = screen === 'edit';

    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            onClick={() => setScreen('overview')}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#0F5B44] hover:underline card-press-3d"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Cancel</span>
          </button>
          <h2 className="text-sm font-black text-gray-900">
            {isEdit ? 'Edit Ticket' : 'Add / Upload E-Ticket'}
          </h2>
          <div className="w-10" />
        </div>

        <form
          onSubmit={handleFormSubmit}
          className="glass-card card-3d rounded-3xl p-5 border border-white/90 shadow-[0_12px_32px_-8px_rgba(15,91,68,0.12)] space-y-4"
        >
          {/* Mode Selector */}
          <div>
            <label className="text-xs font-black text-gray-800 block mb-1.5">Transport Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Train Ticket', label: 'Train', icon: Train },
                { id: 'Bus Ticket', label: 'Bus', icon: Bus },
                { id: 'Other', label: 'Other', icon: Car },
              ].map(m => {
                const isSel = formMode === m.id;
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setFormMode(m.id)}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-2xl border text-xs font-bold transition-all card-press-3d ${
                      isSel
                        ? 'bg-[#0F5B44] text-white border-transparent shadow-md'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-emerald-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ticket Title / Service Name */}
          <div>
            <label className="text-xs font-black text-gray-700 block mb-1">
              Ticket Name or Service <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="e.g. 17208 / BZA SNSI EXP or MSRTC Semi-Luxury"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
            />
          </div>

          {/* Train Number & Train Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">Train / Service Number</label>
              <input
                type="text"
                value={formTrainNumber}
                onChange={e => setFormTrainNumber(e.target.value)}
                placeholder="e.g. 17002"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-mono font-bold focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">Train / Carrier Name</label>
              <input
                type="text"
                value={formTrainName}
                onChange={e => setFormTrainName(e.target.value)}
                placeholder="e.g. Secunderabad - Sainagar Shirdi Express"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
          </div>

          {/* From & To Stations */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">From Station</label>
              <input
                type="text"
                value={formFromCity}
                onChange={e => setFormFromCity(e.target.value)}
                placeholder="e.g. Secunderabad"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">To Station</label>
              <input
                type="text"
                value={formToCity}
                onChange={e => setFormToCity(e.target.value)}
                placeholder="e.g. Sainagar Shirdi"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
          </div>

          {/* Timings */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">Departure</label>
              <input
                type="text"
                value={formDepartureTime || formTime}
                onChange={e => {
                  setFormDepartureTime(e.target.value);
                  setFormTime(e.target.value);
                }}
                placeholder="e.g. 16:30"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-mono font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">Arrival</label>
              <input
                type="text"
                value={formArrivalTime}
                onChange={e => setFormArrivalTime(e.target.value)}
                placeholder="e.g. 09:15"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-mono font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
          </div>

          {/* Cost & Payment Mode */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">Fare (₹)</label>
              <input
                type="number"
                step="any"
                value={formAmount}
                onChange={e => setFormAmount(e.target.value)}
                placeholder="453.15"
                className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-300 text-xs font-bold text-emerald-900 focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-emerald-50/40"
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">Payment Mode</label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-50 rounded-xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => setFormPaymentMethod('UPI')}
                  className={`py-1.5 rounded-lg text-xs font-black transition-all ${
                    formPaymentMethod === 'UPI'
                      ? 'bg-[#0F5B44] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 bg-white/60'
                  }`}
                >
                  📱 UPI
                </button>
                <button
                  type="button"
                  onClick={() => setFormPaymentMethod('Cash')}
                  className={`py-1.5 rounded-lg text-xs font-black transition-all ${
                    formPaymentMethod === 'Cash'
                      ? 'bg-[#0F5B44] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 bg-white/60'
                  }`}
                >
                  💵 Cash
                </button>
              </div>
            </div>
          </div>

          {/* PNR & Seat/Coach */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">PNR / Booking Ref</label>
              <input
                type="text"
                value={formPnr}
                onChange={e => setFormPnr(e.target.value)}
                placeholder="e.g. 4521098765"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-mono font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">Coach &amp; Seat / Berth</label>
              <input
                type="text"
                value={formSeat}
                onChange={e => setFormSeat(e.target.value)}
                placeholder="e.g. S3 - Berth 45"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
          </div>

          {/* Date & Departure Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">Travel Date</label>
              <input
                type="date"
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">Departure Time</label>
              <input
                type="text"
                value={formTime}
                onChange={e => setFormTime(e.target.value)}
                placeholder="e.g. 3:05 PM"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
          </div>

          {/* Offline File Attachment - Dual PDF & Image Upload */}
          <div className="space-y-3">
            <span className="sr-only">Attach Ticket File (PDF or Screenshot - Saved Offline)</span>
            
            {/* 1. Official PDF Ticket Slot */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-teal-700" />
                  <span>Official PDF Ticket (IRCTC / Bus e-Ticket)</span>
                </label>
                {(formPdfName || (formFileName && formFileName.toLowerCase().endsWith('.pdf'))) && (
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                    PDF Attached
                  </span>
                )}
              </div>
              <input
                type="file"
                ref={ticketPdfInputRef}
                onChange={handlePdfUpload}
                accept="application/pdf"
                className="hidden"
              />
              {(formPdfName || (formFileName && formFileName.toLowerCase().endsWith('.pdf'))) ? (
                <div className="p-3 rounded-2xl bg-teal-50/80 border border-teal-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCheck className="w-5 h-5 text-teal-700 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-black text-teal-950 truncate">
                        {formPdfName || formFileName}
                      </p>
                      <p className="text-[10px] text-teal-700 font-bold">
                        {formPdfSize || formFileSize || 'PDF Document'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => ticketPdfInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-xl bg-white border border-teal-300 text-xs font-bold text-teal-800 hover:bg-teal-50 card-press-3d cursor-pointer"
                    >
                      Change PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormPdfName('');
                        setFormPdfSize('');
                        setFormPdfBlob('');
                        if (formFileName.toLowerCase().endsWith('.pdf')) {
                          setFormFileName('');
                          setFormFileSize('');
                          setFormBlobData('');
                        }
                      }}
                      className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 card-press-3d cursor-pointer"
                      title="Remove PDF"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => ticketPdfInputRef.current?.click()}
                  className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-teal-300 hover:border-teal-600 bg-teal-50/30 hover:bg-teal-50/60 transition-all flex items-center justify-center gap-2 text-teal-800 card-press-3d cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-teal-700" />
                  <span className="text-xs font-bold">Attach Official PDF Ticket</span>
                </button>
              )}
            </div>

            {/* 2. Pass Photo / Screenshot Slot */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-700" />
                  <span>Pass Photo / Screenshot (Mobile Pass or Physical Slip)</span>
                </label>
                {(formImageName || (formFileName && formFileName.match(/\.(jpe?g|png|webp|gif|svg)$/i))) && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Photo Attached
                  </span>
                )}
              </div>
              <input
                type="file"
                ref={ticketImageInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              {(formImageName || (formFileName && formFileName.match(/\.(jpe?g|png|webp|gif|svg)$/i))) ? (
                <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {formImageBlob ? (
                      <img
                        src={formImageBlob}
                        alt="Pass preview"
                        className="w-8 h-8 rounded-xl object-cover border border-amber-300 shrink-0 shadow-2xs"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-white text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-black text-amber-950 truncate">
                        {formImageName || formFileName}
                      </p>
                      <p className="text-[10px] text-amber-800 font-bold">
                        {formImageSize || formFileSize || 'Photo Image'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => ticketImageInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-xl bg-white border border-amber-300 text-xs font-bold text-amber-800 hover:bg-amber-50 card-press-3d cursor-pointer"
                    >
                      Change Image
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormImageName('');
                        setFormImageSize('');
                        setFormImageBlob('');
                        if (formFileName.match(/\.(jpe?g|png|webp|gif|svg)$/i)) {
                          setFormFileName('');
                          setFormFileSize('');
                          setFormBlobData('');
                        }
                      }}
                      className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 card-press-3d cursor-pointer"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => ticketImageInputRef.current?.click()}
                  className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-amber-300 hover:border-amber-600 bg-amber-50/30 hover:bg-amber-50/60 transition-all flex items-center justify-center gap-2 text-amber-900 card-press-3d cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-amber-700" />
                  <span className="text-xs font-bold">Attach Pass Photo / Screenshot (JPG, PNG, WebP)</span>
                </button>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-black text-gray-700 block mb-1">Notes</label>
            <textarea
              rows={2}
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              placeholder="e.g. Sleeper Class, confirmed ticket..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
            />
          </div>

          {/* Actions */}
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
              {isSubmitting ? 'Saving...' : isEdit ? 'Update Ticket' : 'Save Ticket'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ===========================================================================
  // OVERVIEW SCREEN (STANDALONE TICKETS & 19-DAY PASSES - NO SEGMENTED DOCK)
  // ===========================================================================
  return (
    <div className="space-y-5">
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
            <Ticket className="w-3 h-3 text-emerald-600" />
            <span>PILGRIMAGE TRANSIT · PASSES &amp; TICKETS</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-tight">
            Travel Tickets &amp; Passes
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            All your bookings and important documents
          </p>
        </div>
        <button
          onClick={() => openAddForm()}
          className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-950/25 hover:shadow-lg transition-all card-press-3d inline-flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Document</span>
        </button>
      </div>

      {/* Stats Summary Card with gentle guidance including Tickets, Documents and Transport */}
      <div className="glass-card card-3d card-depth-3d rounded-3xl p-4 sm:p-5 border border-white/90 shadow-[0_12px_32px_-8px_rgba(15,91,68,0.1)] relative overflow-hidden space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-2xl bg-white/70 border border-white/80 shadow-2xs">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
              Circuit Passes
            </span>
            <span className="text-base sm:text-lg font-black text-[#0F5B44]">
              {counts.passes}
            </span>
            <span className="text-[9px] text-gray-400 block font-medium">transit legs</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-white/70 border border-white/80 shadow-2xs">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
              Uploaded
            </span>
            <span className="text-base sm:text-lg font-black text-teal-700">
              {counts.uploaded}
            </span>
            <span className="text-[9px] text-gray-400 block font-medium">e-tickets</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-white/70 border border-white/80 shadow-2xs">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
              Booked
            </span>
            <span className="text-base sm:text-lg font-black text-emerald-700">
              {counts.booked}
            </span>
            <span className="text-[9px] text-gray-400 block font-medium">confirmed</span>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 text-center font-medium">
          Manage your pilgrimage Tickets, linked to Documents and Transport journeys
        </p>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 1: 19-DAY PILGRIMAGE JOURNEY PASSES (COMPLETELY INLINE) */}
      {/* ===================================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#0F5B44] text-white flex items-center justify-center">
              <Ticket className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 leading-tight">
                19-Day Pilgrimage Journey Passes
              </h3>
              <p className="text-[10px] text-gray-500 font-medium">
                Complete circuit transit legs directly available without dropdowns
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
            {canonicalLegs.length} Legs
          </span>
        </div>

        {/* Complete Inline Passes List */}
        <div className="space-y-2">
          {canonicalLegs.map((leg, idx) => {
            const isBooked = leg.status === 'Booked' || leg.status === 'Confirmed';
            const linkedDay = days.find(d => d.id === leg.dayId);
            const dayNum = linkedDay ? days.indexOf(linkedDay) + 1 : idx + 1;

            return (
              <div
                key={leg.id}
                className="glass-card card-3d rounded-2xl p-3.5 border border-white/80 shadow-2xs hover:shadow-md transition-all card-press-3d group space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-[#0F5B44]/10 text-[#0F5B44] shrink-0">
                      Day {dayNum}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-black text-gray-900 truncate">
                      <span className="truncate">{leg.fromLocation}</span>
                      <ArrowRight className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="truncate">{leg.toLocation}</span>
                    </div>
                  </div>
                  {isBooked ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Booked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                      <AlertCircle className="w-2.5 h-2.5" /> Needs verification
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100/70 text-[10px] text-gray-500">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-bold text-gray-700">{leg.mode}</span>
                    {leg.serviceNumber && (
                      <span className="text-gray-400 font-mono truncate">{leg.serviceNumber}</span>
                    )}
                    {leg.departureTime && (
                      <span className="text-gray-400">· Dep: {leg.departureTime}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      openAddForm({
                        from: leg.fromLocation,
                        to: leg.toLocation,
                        service: leg.serviceNumber,
                      })
                    }
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-[#0F5B44] text-[#0F5B44] hover:text-white text-[10px] font-bold transition-colors card-press-3d shrink-0"
                  >
                    + Attach Ticket
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 2: UPLOADED E-TICKETS & BOARDING PASSES */}
      {/* ===================================================================== */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-teal-600 text-white flex items-center justify-center">
              <QrCode className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 leading-tight">
                Uploaded E-Tickets &amp; Boarding Passes
              </h3>
              <p className="text-[10px] text-gray-500 font-medium">
                Your digital train and bus passes stored offline
              </p>
            </div>
          </div>
        </div>

        {/* Filter Pills & Search */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'all', label: `All (${uploadedTickets.length})` },
            { id: 'train', label: 'Train Tickets' },
            { id: 'bus', label: 'Bus Tickets' },
            { id: 'other', label: 'Other Tickets' },
          ].map(f => {
            const isSel = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all card-press-3d ${
                  isSel
                    ? 'bg-[#0F5B44] text-white shadow-sm'
                    : 'bg-white/80 text-gray-600 hover:bg-emerald-50 border border-gray-200/80'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Tickets List */}
        <div className="space-y-2.5">
          {filteredTickets.length === 0 ? (
            <div className="glass-card rounded-3xl p-7 border border-white/80 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto shadow-2xs">
                <Ticket className="w-6 h-6 stroke-[2]" />
              </div>
              <div>
                <h4 className="text-sm font-black text-gray-900">No documents uploaded yet</h4>
                <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1">
                  Tickets, hotel vouchers, and ID proofs will appear here once added.
                </p>
              </div>
              <button
                onClick={() => openAddForm()}
                className="px-4 py-2 rounded-xl bg-[#0F5B44] text-white text-xs font-bold card-press-3d shadow-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload First Ticket</span>
              </button>
            </div>
          ) : (
            filteredTickets.map(ticket => (
              <TicketPassCard
                key={ticket.id}
                pass={ticket}
                onView={t => setChooserTicket(t)}
                onEdit={t => openEditForm(t)}
                onDelete={id => handleDelete(id)}
              />
            ))
          )}
        </div>
      </div>

      {/* 3D Confirmation Popup for Delete Ticket */}
      <ConfirmModal
        isOpen={Boolean(ticketToDelete)}
        title="Delete Travel Ticket?"
        message="Are you sure you want to delete this travel ticket?\nThis pass will be removed from your offline vault."
        confirmLabel="Delete Ticket"
        cancelLabel="Keep Ticket"
        variant="danger"
        iconType="trash"
        onConfirm={async () => {
          if (ticketToDelete) {
            const handler = onDeleteDocument || onDeleteTicket;
            const id = ticketToDelete;
            setTicketToDelete(null);
            if (handler) await handler(id);
            showToast('Ticket deleted');
            if (selectedTicketId === id) {
              setSelectedTicketId(null);
              setScreen('overview');
            }
          }
        }}
        onCancel={() => setTicketToDelete(null)}
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
        isOpen={Boolean(chooserTicket)}
        item={chooserTicket}
        itemType="ticket"
        onSelectMode={handleSelectTicketMode}
        onClose={() => setChooserTicket(null)}
        onAttachFile={handleAttachTicketFile}
      />

      {/* 3D In-App Document / Ticket Viewer Modal */}
      <DocumentViewerModal
        isOpen={Boolean(viewingTicket)}
        document={viewingTicket}
        initialMode={ticketViewerMode}
        onClose={() => setViewingTicket(null)}
        onAttachFile={handleAttachTicketFile}
      />
    </div>
  );
};
