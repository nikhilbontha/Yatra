'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Train,
  Bus,
  Car,
  ChevronRight,
  ArrowRight,
  Plus,
  Clock,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Edit,
  Edit2,
  Trash2,
  ChevronLeft,
  Search,
  Settings,
  X,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Ticket,
  Eye,
  Download,
  Upload,
  CreditCard,
  FileText,
  ShieldCheck,
  RotateCw,
  QrCode,
  Image as ImageIcon,
} from 'lucide-react';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { AlertModal } from '@/components/modals/AlertModal';
import { DocumentViewerModal } from '@/components/modals/DocumentViewerModal';
import { ViewAttachmentChooserModal } from '@/components/modals/ViewAttachmentChooserModal';
import { TransportLeg, ItineraryDay, Trip, BookingDocument } from '@/types/trip';
import { getConfirmedTransportLegs } from '@/lib/itinerary-data';
import { TicketPassCard } from '@/components/tickets/TicketPassCard';
import { resolveTicketTransitDetails } from '@/lib/tickets-helper';

export type TransportScreen = 'overview' | 'details' | 'add' | 'edit' | 'settings' | 'add_ticket' | 'edit_ticket';
export type TransportFilter = 'all' | 'train' | 'bus' | 'local' | 'tickets';
export type TransportSegmentTab = 'all' | 'route-passes' | 'active-journeys' | 'uploaded-passes';

export interface TransportViewProps {
  trip?: Trip;
  days?: ItineraryDay[];
  transportLegs?: TransportLeg[];
  documents?: BookingDocument[];
  initialScreen?: TransportScreen;
  initialTransportScreen?: string;
  initialSelectedId?: string;
  initialSelectedTransportId?: string;
  initialFilter?: TransportFilter;
  onSaveTransport?: (leg: Partial<TransportLeg>) => Promise<void> | void;
  onDeleteTransport?: (legId: string) => Promise<void> | void;
  onSaveDocument?: (doc: Partial<BookingDocument>, fileBlob?: string) => Promise<void> | void;
  onDeleteDocument?: (docId: string) => Promise<void> | void;
  onAddTicket?: (prefillTitle?: string) => void;
  onSelectDayIndex?: (index: number) => void;
  onSaveOffline?: () => void;
}

export const TransportView: React.FC<TransportViewProps> = ({
  trip,
  days = [],
  transportLegs = [],
  documents = [],
  initialScreen = 'overview',
  initialTransportScreen,
  initialSelectedId,
  initialSelectedTransportId,
  initialFilter = 'all',
  onSaveTransport,
  onDeleteTransport,
  onSaveDocument,
  onDeleteDocument,
  onAddTicket,
  onSelectDayIndex,
  onSaveOffline,
}) => {
  // Determine starting screen based on initialTransportScreen prop
  const startingScreen = useMemo<TransportScreen>(() => {
    if (initialTransportScreen === 'transport-settings') return 'settings';
    if (initialTransportScreen?.startsWith('transport-details')) return 'details';
    if (initialTransportScreen === 'transport-add') return 'add';
    if (initialTransportScreen === 'edit_ticket') return 'edit_ticket';
    if (initialTransportScreen === 'add_ticket') return 'add_ticket';
    return initialScreen;
  }, [initialScreen, initialTransportScreen]);

  // All Travel Tickets & Passes from documents - strictly deduplicated & validated to prevent ghost/random tickets
  const ticketDocuments = useMemo(() => {
    const seenIds = new Set<string>();
    const seenKeys = new Set<string>();
    const uniqueDocs: BookingDocument[] = [];

    for (const d of documents) {
      if (!d || !d.id || !d.title || !d.title.trim()) continue;
      if (seenIds.has(d.id)) continue;

      const isTravel =
        d.category === 'Travel Ticket' ||
        d.docType?.toLowerCase().includes('ticket') ||
        d.docType?.toLowerCase().includes('pass') ||
        d.docType === 'Train Ticket' ||
        d.docType === 'Bus Ticket' ||
        Boolean(d.pnr) ||
        Boolean(d.trainName);

      if (!isTravel) continue;

      // Unique deduplication key: PNR if present, else title + travelDate + serviceNumber
      const pnrKey = d.pnr?.trim() || d.bookingRef?.trim();
      const dedupKey = pnrKey ? `pnr:${pnrKey}` : `route:${d.title.trim().toLowerCase()}_${d.travelDate || ''}_${d.serviceNumber || ''}`;

      if (seenKeys.has(dedupKey)) {
        continue;
      }

      seenIds.add(d.id);
      seenKeys.add(dedupKey);
      uniqueDocs.push(d);
    }
    return uniqueDocs;
  }, [documents]);

  const initialTicketDoc = useMemo(() => {
    if (startingScreen !== 'edit_ticket') return null;
    const targetId = initialSelectedTransportId || initialSelectedId;
    if (targetId) {
      return ticketDocuments.find(d => d.id === targetId) || ticketDocuments[0] || null;
    }
    return ticketDocuments[0] || null;
  }, [startingScreen, initialSelectedTransportId, initialSelectedId, ticketDocuments]);

  const initialTicketDetails = useMemo(() => {
    return initialTicketDoc ? resolveTicketTransitDetails(initialTicketDoc) : null;
  }, [initialTicketDoc]);

  const initialTicketPdf = useMemo(() => {
    if (!initialTicketDoc) return { blob: '', name: '', size: '' };
    const blob = initialTicketDoc.pdfBlob || (initialTicketDoc.fileType?.includes('pdf') || initialTicketDoc.fileName?.toLowerCase().endsWith('.pdf') ? (initialTicketDoc.blobData || initialTicketDoc.fileUrl) : '') || '';
    const name = initialTicketDoc.pdfFileName || (initialTicketDoc.fileName?.toLowerCase().endsWith('.pdf') ? initialTicketDoc.fileName : '') || '';
    const size = initialTicketDoc.pdfFileSize ? String(initialTicketDoc.pdfFileSize) : (initialTicketDoc.fileName?.toLowerCase().endsWith('.pdf') && initialTicketDoc.fileSize ? String(initialTicketDoc.fileSize) : '') || '';
    return { blob, name, size };
  }, [initialTicketDoc]);

  const initialTicketImg = useMemo(() => {
    if (!initialTicketDoc) return { blob: '', name: '', size: '' };
    const blob = initialTicketDoc.imageBlob || initialTicketDoc.imageUrl || (initialTicketDoc.fileType?.includes('image') || initialTicketDoc.fileName?.match(/\.(jpe?g|png|webp|gif|svg)$/i) ? (initialTicketDoc.blobData || initialTicketDoc.fileUrl) : '') || '';
    const name = initialTicketDoc.imageFileName || (initialTicketDoc.fileName?.match(/\.(jpe?g|png|webp|gif|svg)$/i) ? initialTicketDoc.fileName : '') || '';
    const size = initialTicketDoc.imageFileSize ? String(initialTicketDoc.imageFileSize) : (initialTicketDoc.fileName?.match(/\.(jpe?g|png|webp|gif|svg)$/i) && initialTicketDoc.fileSize ? String(initialTicketDoc.fileSize) : '') || '';
    return { blob, name, size };
  }, [initialTicketDoc]);

  const [screen, setScreen] = useState<TransportScreen>(startingScreen);
  const [segmentTab, setSegmentTab] = useState<TransportSegmentTab>('all');
  const [selectedLegId, setSelectedLegId] = useState<string | null>(
    initialSelectedTransportId || initialSelectedId || null
  );
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(initialTicketDoc ? initialTicketDoc.id : null);
  const [filter, setFilter] = useState<TransportFilter>(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [legToDelete, setLegToDelete] = useState<string | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<BookingDocument | null>(null);
  const [chooserDoc, setChooserDoc] = useState<BookingDocument | null>(null);
  const [docViewerMode, setDocViewerMode] = useState<'image' | 'pdf'>('pdf');

  const handleSelectDocMode = (mode: 'image' | 'pdf', docItem: any) => {
    setChooserDoc(null);
    setDocViewerMode(mode);
    setViewingDoc(docItem);
  };

  const handleAttachTicketFile = async (type: 'image' | 'pdf', fileData: string, fileName: string, fileSize: number) => {
    const targetId = chooserDoc?.id || viewingDoc?.id;
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
    showToast(`${type === 'pdf' ? 'PDF pass' : 'Pass photo'} attached successfully`);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ---------------------------------------------------------------------------
  // Form State for Add / Edit Transit Leg
  // ---------------------------------------------------------------------------
  const [formFrom, setFormFrom] = useState('');
  const [formTo, setFormTo] = useState('');
  const [formMode, setFormMode] = useState<string>('Train');
  const [formServiceNumber, setFormServiceNumber] = useState('');
  const [formDepartureTime, setFormDepartureTime] = useState('');
  const [formArrivalTime, setFormArrivalTime] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formDayId, setFormDayId] = useState('');
  const [formStatus, setFormStatus] = useState<string>('Needs verification');
  const [formBookingRef, setFormBookingRef] = useState('');
  const [formCoachSeat, setFormCoachSeat] = useState('');
  const [formPlatform, setFormPlatform] = useState('');
  const [formFare, setFormFare] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // ---------------------------------------------------------------------------
  // Form State for Add / Edit Travel Ticket / Pass
  // ---------------------------------------------------------------------------
  const [ticketTitle, setTicketTitle] = useState(initialTicketDoc?.title || '');
  const [ticketDocType, setTicketDocType] = useState<string>(initialTicketDoc?.docType || (initialTicketDetails?.isBus ? 'Bus Ticket' : 'Train Ticket'));
  const [ticketPnr, setTicketPnr] = useState(initialTicketDoc?.pnr || initialTicketDoc?.bookingRef || initialTicketDetails?.pnr || '');
  const [ticketTrainNumber, setTicketTrainNumber] = useState(initialTicketDoc?.trainNumber || initialTicketDetails?.trainNumber || '');
  const [ticketTrainName, setTicketTrainName] = useState(initialTicketDoc?.trainName || initialTicketDetails?.trainName || '');
  const [ticketDepartureTime, setTicketDepartureTime] = useState(initialTicketDoc?.departureTime || initialTicketDetails?.departureTime || '');
  const [ticketArrivalTime, setTicketArrivalTime] = useState(initialTicketDoc?.arrivalTime || initialTicketDetails?.arrivalTime || '');
  const [ticketClassType, setTicketClassType] = useState(initialTicketDoc?.classType || initialTicketDetails?.classType || 'Sleeper Class (SL)');
  const [ticketFromCity, setTicketFromCity] = useState(initialTicketDoc?.fromCity || initialTicketDetails?.fromCity || '');
  const [ticketToCity, setTicketToCity] = useState(initialTicketDoc?.toCity || initialTicketDetails?.toCity || '');
  const [ticketTravelDate, setTicketTravelDate] = useState(initialTicketDoc?.travelDate || initialTicketDoc?.date || initialTicketDetails?.rawTravelDate || '');
  const [ticketCoachSeat, setTicketCoachSeat] = useState(initialTicketDoc?.coachSeat || initialTicketDetails?.seatFormatted || '');
  const [ticketPlatform, setTicketPlatform] = useState(initialTicketDoc?.platform || initialTicketDetails?.platform || 'PF 5');
  const [ticketAmount, setTicketAmount] = useState(
    initialTicketDoc?.totalAmount !== undefined
      ? `${initialTicketDoc.totalAmount}`
      : initialTicketDetails?.rawPrice !== undefined
      ? `${initialTicketDetails.rawPrice}`
      : '453.15'
  );
  const [ticketPaymentMethod, setTicketPaymentMethod] = useState<'UPI' | 'Cash'>((initialTicketDoc as any)?.paymentMethod || 'UPI');
  const [ticketNotes, setTicketNotes] = useState(initialTicketDoc?.notes || '');
  const [ticketFileName, setTicketFileName] = useState(initialTicketDoc?.fileName || initialTicketPdf.name || initialTicketImg.name || '');
  const [ticketFileSize, setTicketFileSize] = useState(initialTicketDoc?.fileSize ? `${initialTicketDoc.fileSize}` : (initialTicketPdf.size || initialTicketImg.size || ''));
  const [ticketFileType, setTicketFileType] = useState(initialTicketDoc?.fileType || (initialTicketPdf.blob ? 'application/pdf' : (initialTicketImg.blob ? 'image/jpeg' : '')));
  const [ticketBlobData, setTicketBlobData] = useState(initialTicketDoc?.blobData || initialTicketDoc?.fileUrl || initialTicketPdf.blob || initialTicketImg.blob || '');

  // Dual attachment states for Ticket: Official PDF Document & Pass Photo / Screenshot
  const [ticketPdfBlob, setTicketPdfBlob] = useState(initialTicketPdf.blob);
  const [ticketPdfFileName, setTicketPdfFileName] = useState(initialTicketPdf.name);
  const [ticketPdfSize, setTicketPdfSize] = useState(initialTicketPdf.size);

  const [ticketImageBlob, setTicketImageBlob] = useState(initialTicketImg.blob);
  const [ticketImageFileName, setTicketImageFileName] = useState(initialTicketImg.name);
  const [ticketImageSize, setTicketImageSize] = useState(initialTicketImg.size);

  const ticketPdfInputRef = useRef<HTMLInputElement>(null);
  const ticketImageInputRef = useRef<HTMLInputElement>(null);



  // Canonical 19-Day Pilgrimage Transit Legs
  const canonicalLegs = useMemo(() => {
    return getConfirmedTransportLegs(trip?.id);
  }, [trip?.id]);

  // Effective Source Legs
  const effectiveLegs = useMemo(() => {
    return transportLegs;
  }, [transportLegs]);

  // Selected Leg Object
  const selectedLeg = useMemo(() => {
    const idToFind = selectedLegId || initialSelectedTransportId || initialSelectedId;
    if (idToFind) {
      return effectiveLegs.find(l => l.id === idToFind) || effectiveLegs[0] || null;
    }
    return effectiveLegs[0] || null;
  }, [effectiveLegs, selectedLegId, initialSelectedTransportId, initialSelectedId]);

  // Upcoming / Next Journey
  const upcomingLeg = useMemo(() => {
    if (effectiveLegs.length === 0) return null;
    return (
      effectiveLegs.find(l => l.status === 'Booked' || l.status === 'Confirmed') ||
      effectiveLegs[0]
    );
  }, [effectiveLegs]);

  // Booked & Confirmed Count
  const bookedCount = useMemo(() => {
    const bookedLegs = effectiveLegs.filter(l => l.status === 'Booked' || l.status === 'Confirmed').length;
    const bookedDocs = ticketDocuments.length;
    return bookedLegs + bookedDocs;
  }, [effectiveLegs, ticketDocuments]);

  // Total Transit Spend (synced to budget)
  const totalTransitSpend = useMemo(() => {
    const legFares = effectiveLegs.reduce((sum, l) => sum + (l.fare || 0), 0);
    const docFares = ticketDocuments.reduce((sum, d) => sum + (d.totalAmount || (d as any).amount || 0), 0);
    return legFares + docFares;
  }, [effectiveLegs, ticketDocuments]);

  // Helper to find attached ticket pass for a journey leg
  const findAttachedTicketForLeg = (leg: TransportLeg): BookingDocument | null => {
    if (!ticketDocuments.length) return null;

    if (leg.bookingRef || leg.pnr) {
      const match = ticketDocuments.find(
        d =>
          (d.pnr && (d.pnr === leg.bookingRef || d.pnr === leg.pnr)) ||
          (d.bookingRef && (d.bookingRef === leg.bookingRef || d.bookingRef === leg.pnr))
      );
      if (match) return match;
    }

    if (leg.date) {
      const match = ticketDocuments.find(d => d.travelDate === leg.date || d.date === leg.date);
      if (match) return match;
    }

    const match = ticketDocuments.find(d => {
      const fromMatch = d.fromCity && leg.fromLocation.toLowerCase().includes(d.fromCity.toLowerCase());
      const toMatch = d.toCity && leg.toLocation.toLowerCase().includes(d.toCity.toLowerCase());
      return fromMatch || toMatch;
    });
    return match || null;
  };

  // Filtered Journeys
  const filteredLegs = useMemo(() => {
    if (filter === 'tickets') return [];
    return effectiveLegs.filter(leg => {
      if (filter === 'train' && leg.mode !== 'Train') return false;
      if (filter === 'bus' && !leg.mode?.toLowerCase().includes('bus')) return false;
      if (filter === 'local' && (leg.mode === 'Train' || leg.mode?.toLowerCase().includes('state bus'))) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fromMatch = leg.fromLocation?.toLowerCase().includes(q);
        const toMatch = leg.toLocation?.toLowerCase().includes(q);
        const srvMatch = leg.serviceNumber?.toLowerCase().includes(q);
        const trainMatch = leg.trainName?.toLowerCase().includes(q);
        const pnrMatch = (leg.pnr || leg.bookingRef)?.toLowerCase().includes(q);
        if (!fromMatch && !toMatch && !srvMatch && !trainMatch && !pnrMatch) return false;
      }
      return true;
    });
  }, [effectiveLegs, filter, searchQuery]);

  // Filtered Passes
  const filteredPasses = useMemo(() => {
    return ticketDocuments.filter(doc => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = doc.title?.toLowerCase().includes(q);
        const pnrMatch = (doc.pnr || doc.bookingRef)?.toLowerCase().includes(q);
        const carrierMatch = ((doc as any).carrier || doc.trainName)?.toLowerCase().includes(q);
        const fromMatch = doc.fromCity?.toLowerCase().includes(q);
        const toMatch = doc.toCity?.toLowerCase().includes(q);
        if (!titleMatch && !pnrMatch && !carrierMatch && !fromMatch && !toMatch) return false;
      }
      return true;
    });
  }, [ticketDocuments, searchQuery]);

  // Counts
  const counts = useMemo(() => {
    const train = effectiveLegs.filter(l => l.mode === 'Train').length;
    const bus = effectiveLegs.filter(l => l.mode?.toLowerCase().includes('bus')).length;
    const local = effectiveLegs.filter(l => {
      const m = (l.mode || '').toLowerCase();
      return m.includes('auto') || m.includes('taxi');
    }).length;
    const passes = ticketDocuments.length;
    return { all: effectiveLegs.length, train, bus, local, passes };
  }, [effectiveLegs, ticketDocuments]);

  // Open Add Journey Form
  const openAddForm = (defaultMode: string = 'Train') => {
    setFormFrom('');
    setFormTo('');
    setFormMode(defaultMode);
    setFormServiceNumber('');
    setFormDepartureTime('');
    setFormArrivalTime('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormDayId(days[0]?.id || '');
    setFormStatus('Needs verification');
    setFormBookingRef('');
    setFormCoachSeat('');
    setFormPlatform('');
    setFormFare('');
    setFormNotes('');
    setScreen('add');
  };

  // Open Edit Journey Form
  const openEditForm = (leg: TransportLeg) => {
    setSelectedLegId(leg.id);
    setFormFrom(leg.fromLocation || '');
    setFormTo(leg.toLocation || '');
    setFormMode(leg.mode || 'Train');
    setFormServiceNumber(leg.serviceNumber || '');
    setFormDepartureTime(leg.departureTime || '');
    setFormArrivalTime(leg.arrivalTime || '');
    setFormDate(leg.date || '');
    setFormDayId(leg.dayId || '');
    setFormStatus(leg.status || 'Needs verification');
    setFormBookingRef(leg.bookingRef || leg.pnr || '');
    setFormCoachSeat(leg.coachSeat || '');
    setFormPlatform(leg.platformFrom || '');
    setFormFare(leg.fare !== undefined ? `${leg.fare}` : '');
    setFormNotes(leg.notes || '');
    setScreen('edit');
  };

  // Submit Journey Form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFrom.trim() || !formTo.trim()) {
      showToast('Origin and destination are required');
      return;
    }
    if (!onSaveTransport) return;

    setIsSubmitting(true);
    try {
      const parsedFare = formFare ? parseFloat(formFare) : undefined;
      await onSaveTransport({
        id: screen === 'edit' && selectedLeg ? selectedLeg.id : undefined,
        tripId: trip?.id,
        dayId: formDayId || undefined,
        fromLocation: formFrom.trim(),
        toLocation: formTo.trim(),
        mode: formMode as any,
        serviceNumber: formServiceNumber.trim() || undefined,
        departureTime: formDepartureTime.trim() || undefined,
        arrivalTime: formArrivalTime.trim() || undefined,
        date: formDate.trim() || undefined,
        status: formStatus as any,
        bookingRef: formBookingRef.trim() || undefined,
        pnr: formBookingRef.trim() || undefined,
        coachSeat: formCoachSeat.trim() || undefined,
        platformFrom: formPlatform.trim() || undefined,
        fare: typeof parsedFare === 'number' && !isNaN(parsedFare) ? parsedFare : undefined,
        notes: formNotes.trim() || undefined,
      });
      setScreen('overview');
      showToast(screen === 'edit' ? 'Journey updated' : 'Journey added to transit route');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Add Ticket / Pass Form
  const openAddTicketForm = (prefill?: {
    from?: string;
    to?: string;
    mode?: string;
    date?: string;
    service?: string;
    trainName?: string;
    trainNumber?: string;
    time?: string;
  }) => {
    const isBus = prefill?.mode?.toLowerCase().includes('bus');
    setTicketTitle(prefill?.from && prefill?.to ? `${prefill.from} to ${prefill.to} Pass` : '');
    setTicketDocType(isBus ? 'Bus Ticket' : 'Train Ticket');
    setTicketPnr(prefill?.service || '');
    setTicketTrainNumber(prefill?.trainNumber || (isBus ? 'MH-12-RN-4589' : '17002'));
    setTicketTrainName(prefill?.trainName || (isBus ? 'MSRTC Shivshahi AC' : 'Secunderabad - Sainagar Shirdi Express'));
    setTicketDepartureTime(prefill?.time || (isBus ? '07:30' : '16:30'));
    setTicketArrivalTime(isBus ? '10:45' : '09:15');
    setTicketClassType(isBus ? 'AC Seater' : 'Sleeper Class (SL)');
    setTicketFromCity(prefill?.from || 'Secunderabad / Hyderabad');
    setTicketToCity(prefill?.to || 'Sainagar Shirdi');
    setTicketTravelDate(prefill?.date || new Date().toISOString().split('T')[0]);
    setTicketCoachSeat(isBus ? 'Seat 14' : 'S3 / 64 (Side Upper)');
    setTicketPlatform('PF 5');
    setTicketAmount('453.15');
    setTicketPaymentMethod('UPI');
    setTicketNotes('');
    setTicketFileName('');
    setTicketFileSize('');
    setTicketFileType('');
    setTicketBlobData('');
    setTicketPdfBlob('');
    setTicketPdfFileName('');
    setTicketPdfSize('');
    setTicketImageBlob('');
    setTicketImageFileName('');
    setTicketImageSize('');
    setSelectedTicketId(null);
    setScreen('add_ticket');
  };

  // Open Edit Ticket Form
  const openEditTicketForm = (doc: BookingDocument) => {
    const details = resolveTicketTransitDetails(doc);
    setSelectedTicketId(doc.id);
    setTicketTitle(doc.title || '');
    setTicketDocType(doc.docType || (details.isBus ? 'Bus Ticket' : 'Train Ticket'));
    setTicketPnr(doc.pnr || doc.bookingRef || details.pnr || '');
    setTicketTrainNumber(doc.trainNumber || details.trainNumber || '');
    setTicketTrainName(doc.trainName || details.trainName || '');
    setTicketDepartureTime(doc.departureTime || details.departureTime || '');
    setTicketArrivalTime(doc.arrivalTime || details.arrivalTime || '');
    setTicketClassType(doc.classType || details.classType || 'Sleeper Class (SL)');
    setTicketFromCity(doc.fromCity || details.fromCity || '');
    setTicketToCity(doc.toCity || details.toCity || '');
    setTicketTravelDate(doc.travelDate || doc.date || details.rawTravelDate || '');
    setTicketCoachSeat(doc.coachSeat || details.seatFormatted || '');
    setTicketPlatform(doc.platform || details.platform || 'PF 5');
    setTicketAmount(
      doc.totalAmount !== undefined
        ? `${doc.totalAmount}`
        : details.rawPrice !== undefined
        ? `${details.rawPrice}`
        : '453.15'
    );
    setTicketPaymentMethod((doc as any).paymentMethod || 'UPI');
    setTicketNotes(doc.notes || '');

    // Resolve Dual Attachments: PDF and Image
    const pdfBlob = doc.pdfBlob || (doc.fileType?.includes('pdf') || doc.fileName?.toLowerCase().endsWith('.pdf') ? (doc.blobData || doc.fileUrl) : '');
    const pdfName = doc.pdfFileName || (doc.fileName?.toLowerCase().endsWith('.pdf') ? doc.fileName : '');
    const pdfSize = doc.pdfFileSize ? String(doc.pdfFileSize) : (doc.fileName?.toLowerCase().endsWith('.pdf') && doc.fileSize ? String(doc.fileSize) : '');
    setTicketPdfBlob(pdfBlob || '');
    setTicketPdfFileName(pdfName || '');
    setTicketPdfSize(pdfSize || '');

    const imgBlob = doc.imageBlob || doc.imageUrl || (doc.fileType?.includes('image') || doc.fileName?.match(/\.(jpe?g|png|webp|gif|svg)$/i) ? (doc.blobData || doc.fileUrl) : '');
    const imgName = doc.imageFileName || (doc.fileName?.match(/\.(jpe?g|png|webp|gif|svg)$/i) ? doc.fileName : '');
    const imgSize = doc.imageFileSize ? String(doc.imageFileSize) : (doc.fileName?.match(/\.(jpe?g|png|webp|gif|svg)$/i) && doc.fileSize ? String(doc.fileSize) : '');
    setTicketImageBlob(imgBlob || '');
    setTicketImageFileName(imgName || '');
    setTicketImageSize(imgSize || '');

    setTicketFileName(doc.fileName || pdfName || imgName || '');
    setTicketFileSize(doc.fileSize ? `${doc.fileSize}` : (pdfSize || imgSize || ''));
    setTicketFileType(doc.fileType || (pdfBlob ? 'application/pdf' : (imgBlob ? 'image/jpeg' : '')));
    setTicketBlobData(doc.blobData || doc.fileUrl || pdfBlob || imgBlob || '');
    setScreen('edit_ticket');
  };

  // Handle PDF Upload / Change
  const handleTicketPdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setAlertMessage('PDF size exceeds the 15MB limit. Please select a smaller document.');
      return;
    }

    const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
    setTicketPdfFileName(file.name);
    setTicketPdfSize(sizeStr);

    const reader = new FileReader();
    reader.onload = ev => {
      if (ev.target?.result) {
        setTicketPdfBlob(ev.target.result as string);
        showToast('Official PDF ticket cached offline');
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Image Upload / Change / Update
  const handleTicketImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setAlertMessage('Image size exceeds the 15MB limit. Please select a smaller image.');
      return;
    }

    const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
    setTicketImageFileName(file.name);
    setTicketImageSize(sizeStr);

    const reader = new FileReader();
    reader.onload = ev => {
      if (ev.target?.result) {
        setTicketImageBlob(ev.target.result as string);
        showToast('Pass photo/scan updated successfully');
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit Ticket Form
  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketTitle.trim()) {
      showToast('Pass or ticket title is required');
      return;
    }
    if (!onSaveDocument) return;

    setIsSubmitting(true);
    try {
      const parsedAmount = ticketAmount ? parseFloat(ticketAmount) : undefined;
      const primaryBlob = ticketPdfBlob || ticketImageBlob || ticketBlobData;
      const primaryName = ticketPdfFileName || ticketImageFileName || ticketFileName || `${ticketTitle.trim().replace(/\s+/g, '_')}.${ticketPdfBlob ? 'pdf' : 'jpg'}`;
      const primarySize = ticketPdfSize || ticketImageSize || ticketFileSize;

      const ticketPayload: Partial<BookingDocument> = {
        id: screen === 'edit_ticket' && selectedTicketId ? selectedTicketId : undefined,
        tripId: trip?.id,
        title: ticketTitle.trim(),
        docType: ticketDocType as any,
        category: 'Travel Ticket',
        pnr: ticketPnr.trim() || undefined,
        bookingRef: ticketPnr.trim() || undefined,
        trainNumber: ticketTrainNumber.trim() || undefined,
        serviceNumber: ticketTrainNumber.trim() || undefined,
        trainName: ticketTrainName.trim() || undefined,
        departureTime: ticketDepartureTime.trim() || undefined,
        arrivalTime: ticketArrivalTime.trim() || undefined,
        classType: ticketClassType.trim() || undefined,
        fromCity: ticketFromCity.trim() || undefined,
        toCity: ticketToCity.trim() || undefined,
        travelDate: ticketTravelDate || undefined,
        coachSeat: ticketCoachSeat.trim() || undefined,
        platform: ticketPlatform.trim() || undefined,
        totalAmount: typeof parsedAmount === 'number' && !isNaN(parsedAmount) ? parsedAmount : undefined,
        paymentMethod: ticketPaymentMethod,
        fileName: primaryName || undefined,
        fileSize: primarySize || undefined,
        fileType: ticketPdfBlob ? 'application/pdf' : (ticketImageBlob ? 'image/jpeg' : undefined),
        blobData: primaryBlob || undefined,
        // Dual attachments
        pdfBlob: ticketPdfBlob || undefined,
        pdfFileName: ticketPdfFileName || undefined,
        pdfFileSize: ticketPdfSize || undefined,
        imageBlob: ticketImageBlob || undefined,
        imageFileName: ticketImageFileName || undefined,
        imageFileSize: ticketImageSize || undefined,
        offlineCached: Boolean(primaryBlob),
        notes: ticketNotes.trim() || undefined,
      };

      await onSaveDocument(ticketPayload, primaryBlob);
      setScreen('overview');
      showToast(screen === 'edit_ticket' ? 'Ticket pass updated' : 'Ticket pass added to vault');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getModeIcon = (mode?: string, className: string = 'w-4 h-4') => {
    const m = (mode || '').toLowerCase();
    if (m.includes('train')) return <Train className={className} />;
    if (m.includes('bus')) return <Bus className={className} />;
    return <Car className={className} />;
  };

  const getStatusBadge = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('confirmed') || s.includes('booked')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
          <CheckCircle2 className="w-2.5 h-2.5" /> Booked
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs">
        <AlertCircle className="w-2.5 h-2.5" /> Needs verification
      </span>
    );
  };

  // Helper to find day index for a leg
  const getDayNumberForLeg = (leg: TransportLeg): number | null => {
    if (!days.length) return null;
    if (leg.dayId) {
      const idx = days.findIndex(d => d.id === leg.dayId);
      if (idx >= 0) return idx + 1;
    }
    if (leg.date) {
      const idx = days.findIndex(d => d.date === leg.date);
      if (idx >= 0) return idx + 1;
    }
    return null;
  };

  // ===========================================================================
  // SUBPAGE 1: SETTINGS & PREFERENCES
  // ===========================================================================
  if (screen === 'settings') {
    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setScreen('overview')}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#0F5B44] hover:underline card-press-3d"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Back to Transport</span>
          </button>
          <h2 className="text-sm font-black text-gray-900">Transport Preferences</h2>
          <div className="w-10" />
        </div>

        <div className="glass-card card-3d rounded-3xl p-5 border border-white/90 shadow-[0_12px_32px_-8px_rgba(15,91,68,0.12)] space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-base font-black text-gray-900">Transport Preferences</h3>
            <p className="text-xs text-gray-500 font-medium">Solo &amp; Budget-friendly</p>
          </div>

          <div className="space-y-2 text-xs text-gray-700">
            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 space-y-1">
              <span className="font-bold text-emerald-950 block">Sleeper Class (SL) preferred</span>
              <p className="text-emerald-800 text-[11px]">
                State Buses (MSRTC/GSRTC) &amp; Shared Autos
              </p>
              <p className="text-emerald-700 text-[11px]">
                Preferred where practical (saves stay cost)
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/70 space-y-1">
              <span className="font-bold text-amber-950 block">Avoid unnecessary expensive cabs</span>
              <p className="text-amber-800 text-[11px]">Shirdi Traveller Van Policy</p>
              <p className="text-amber-700 text-[11px]">
                Do not assume a return-to-Shirdi tour fits the linear route
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 space-y-2">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
              Official Transit Portals
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold">
              <a
                href="https://www.irctc.co.in"
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl bg-gray-50 hover:bg-emerald-50 border border-gray-200 text-[#0F5B44] flex items-center justify-between card-press-3d"
              >
                <span>Indian Railways (IRCTC)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://msrtc.maharashtra.gov.in"
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl bg-gray-50 hover:bg-emerald-50 border border-gray-200 text-[#0F5B44] flex items-center justify-between card-press-3d"
              >
                <span>Maharashtra State Transport (MSRTC)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://gsrtc.in"
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl bg-gray-50 hover:bg-emerald-50 border border-gray-200 text-[#0F5B44] flex items-center justify-between card-press-3d"
              >
                <span>Gujarat State Road Transport (GSRTC)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // SUBPAGE 2: JOURNEY DETAILS
  // ===========================================================================
  if (screen === 'details' && selectedLeg) {
    const dayNumber = getDayNumberForLeg(selectedLeg);
    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setScreen('overview')}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#0F5B44] hover:underline card-press-3d"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Back to Journeys</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openEditForm(selectedLeg)}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#0F5B44] text-xs font-bold inline-flex items-center gap-1 card-press-3d border border-emerald-200"
            >
              <Edit className="w-3 h-3" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => setLegToDelete(selectedLeg.id)}
              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold inline-flex items-center gap-1 card-press-3d border border-rose-200"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        <div className="glass-card card-3d rounded-3xl p-5 border border-white/90 shadow-[0_12px_32px_-8px_rgba(15,91,68,0.12)] space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 text-[#0F5B44] flex items-center justify-center">
                {getModeIcon(selectedLeg.mode, 'w-5 h-5')}
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 leading-tight">
                  {selectedLeg.serviceNumber ? `${selectedLeg.serviceNumber} · ` : ''}
                  {selectedLeg.trainName || selectedLeg.mode}
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  {selectedLeg.date || 'Scheduled Transit'}
                </p>
              </div>
            </div>
            {getStatusBadge(selectedLeg.status)}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Origin
              </span>
              <p className="text-sm font-black text-gray-900">{selectedLeg.fromLocation}</p>
              {selectedLeg.departureTime && (
                <p className="text-xs text-emerald-800 font-bold">{selectedLeg.departureTime}</p>
              )}
            </div>
            <div className="space-y-1 text-right">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Destination
              </span>
              <p className="text-sm font-black text-gray-900">{selectedLeg.toLocation}</p>
              {selectedLeg.arrivalTime && (
                <p className="text-xs text-emerald-800 font-bold">{selectedLeg.arrivalTime}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100 text-xs">
            {(selectedLeg.bookingRef || selectedLeg.pnr) && (
              <div className="space-y-0.5">
                <span className="text-[10px] font-extrabold uppercase text-gray-400">
                  Booking Reference
                </span>
                <p className="font-mono font-bold text-emerald-950">
                  PNR / Ref: {selectedLeg.bookingRef || selectedLeg.pnr}
                </p>
              </div>
            )}
            {selectedLeg.coachSeat && (
              <div className="space-y-0.5">
                <span className="text-[10px] font-extrabold uppercase text-gray-400">Seat / Berth</span>
                <p className="font-bold text-gray-900">{selectedLeg.coachSeat}</p>
              </div>
            )}
            {selectedLeg.platformFrom && (
              <div className="space-y-0.5">
                <span className="text-[10px] font-extrabold uppercase text-gray-400">Platform</span>
                <p className="font-bold text-gray-900">{selectedLeg.platformFrom}</p>
              </div>
            )}
            {selectedLeg.fare !== undefined && selectedLeg.fare > 0 && (
              <div className="space-y-0.5">
                <span className="text-[10px] font-extrabold uppercase text-gray-400">Fare</span>
                <p className="font-black text-emerald-900">₹{selectedLeg.fare}</p>
              </div>
            )}
            {dayNumber !== null && (
              <div className="space-y-0.5">
                <span className="text-[10px] font-extrabold uppercase text-gray-400">
                  Linked Itinerary Day
                </span>
                <button
                  type="button"
                  onClick={() => onSelectDayIndex && onSelectDayIndex(dayNumber - 1)}
                  className="font-bold text-[#0F5B44] hover:underline block text-left"
                >
                  Day {dayNumber}
                </button>
              </div>
            )}
          </div>

          {selectedLeg.notes && (
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 text-xs text-gray-700 space-y-1">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                Notes
              </span>
              <p className="leading-relaxed">{selectedLeg.notes}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===========================================================================
  // SUBPAGE 3: ADD / EDIT JOURNEY FORM
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
            {isEdit ? 'Edit Transit Journey' : 'Add New Transit Journey'}
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
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'Train', label: 'Train', icon: Train },
                { id: 'State Bus', label: 'Bus', icon: Bus },
                { id: 'Auto', label: 'Auto', icon: Car },
                { id: 'Taxi', label: 'Taxi', icon: Car },
              ].map(m => {
                const isSel = formMode === m.id;
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setFormMode(m.id)}
                    className={`flex items-center justify-center gap-1.5 p-2.5 rounded-2xl border text-xs font-bold transition-all card-press-3d ${
                      isSel
                        ? 'bg-[#0F5B44] text-white shadow-md shadow-emerald-950/20'
                        : 'bg-gray-50 hover:bg-emerald-50 text-gray-700 border-gray-200/80'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* From & To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">
                From / Origin <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formFrom}
                onChange={e => setFormFrom(e.target.value)}
                placeholder="e.g. Hyderabad / Secunderabad"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">
                To / Destination <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formTo}
                onChange={e => setFormTo(e.target.value)}
                placeholder="e.g. Shirdi"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
          </div>

          {/* Date & Service Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">Journey Date</label>
              <input
                type="date"
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">Train/Bus/Service #</label>
              <input
                type="text"
                value={formServiceNumber}
                onChange={e => setFormServiceNumber(e.target.value)}
                placeholder="e.g. 17208 / MSRTC Ordinary"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
          </div>

          {/* Timings */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">Departure Time</label>
              <input
                type="text"
                value={formDepartureTime}
                onChange={e => setFormDepartureTime(e.target.value)}
                placeholder="e.g. 03:05 PM"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">Arrival Time</label>
              <input
                type="text"
                value={formArrivalTime}
                onChange={e => setFormArrivalTime(e.target.value)}
                placeholder="e.g. 09:10 AM"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
          </div>

          {/* Coach / Seat, Platform & Fare */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">Coach / Seat</label>
              <input
                type="text"
                value={formCoachSeat}
                onChange={e => setFormCoachSeat(e.target.value)}
                placeholder="e.g. S4 / 45"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">Platform</label>
              <input
                type="text"
                value={formPlatform}
                onChange={e => setFormPlatform(e.target.value)}
                placeholder="e.g. Platform 4"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">
                Fare / Ticket Cost (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={formFare}
                onChange={e => setFormFare(e.target.value)}
                placeholder="Auto-syncs to Budget"
                className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-300 text-xs sm:text-sm font-bold text-emerald-900 focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-emerald-50/40"
              />
            </div>
          </div>

          {/* Status & Booking Ref / PNR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">Booking Status</label>
              <select
                value={formStatus}
                onChange={e => setFormStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              >
                <option value="Booked">Booked (Confirmed)</option>
                <option value="Needs verification">Needs verification (Planned)</option>
                <option value="Waitlisted">Waitlisted (WL / RAC)</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">PNR / Booking Reference</label>
              <input
                type="text"
                value={formBookingRef}
                onChange={e => setFormBookingRef(e.target.value)}
                placeholder="e.g. 4521789632"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-black text-gray-700 block mb-1">Notes / Instructions</label>
            <textarea
              rows={2}
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              placeholder="e.g. Board at Secunderabad PF 4, arrival at Sainagar Shirdi Station"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
            />
          </div>

          {/* Submit Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setScreen('overview')}
              className="px-4 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all card-press-3d"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-2xl bg-[#0F5B44] hover:bg-[#136a50] text-white text-xs font-black shadow-md shadow-emerald-950/20 transition-all card-press-3d"
            >
              {isSubmitting ? 'Saving...' : 'Save Journey'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ===========================================================================
  // SUBPAGE 4: ADD / EDIT TRAVEL TICKET / PASS FORM
  // ===========================================================================
  if (screen === 'add_ticket' || screen === 'edit_ticket') {
    const isEdit = screen === 'edit_ticket';

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
            {isEdit ? 'Edit Ticket Pass' : 'Upload Ticket / Boarding Pass'}
          </h2>
          <div className="w-10" />
        </div>

        <form
          onSubmit={handleTicketSubmit}
          className="glass-card card-3d rounded-3xl p-5 border border-white/90 shadow-[0_12px_32px_-8px_rgba(15,91,68,0.12)] space-y-4"
        >
          {/* Dual File Pickers: PDF Ticket & Pass Photo / Screenshot */}
          <div className="space-y-3">
            {/* 1. Official PDF Ticket Slot */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-teal-700" />
                  <span>Official PDF Ticket (IRCTC / Bus e-Ticket)</span>
                </label>
                {ticketPdfFileName && (
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                    PDF Attached
                  </span>
                )}
              </div>
              <input
                type="file"
                ref={ticketPdfInputRef}
                onChange={handleTicketPdfChange}
                accept="application/pdf"
                className="hidden"
              />
              {ticketPdfFileName ? (
                <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white text-teal-700 border border-teal-200 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{ticketPdfFileName}</p>
                      <p className="text-[10px] text-gray-500 font-medium">
                        {ticketPdfSize || 'Official PDF'} • application/pdf
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
                        setTicketPdfFileName('');
                        setTicketPdfSize('');
                        setTicketPdfBlob('');
                      }}
                      className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
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
                  className="w-full py-3 px-4 rounded-2xl bg-white border-2 border-dashed border-teal-300 hover:border-teal-600 hover:bg-teal-50/40 text-teal-800 text-xs font-bold flex items-center justify-center gap-2 transition-all card-press-3d cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-teal-600 stroke-[2.3]" />
                  <span>Attach Official PDF Ticket (IRCTC / Bus e-Ticket)</span>
                </button>
              )}
            </div>

            {/* 2. Pass Photo / Screenshot Slot */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-700" />
                  <span>Pass Photo / Screenshot (Mobile Pass or Physical Slip)</span>
                </label>
                {ticketImageFileName && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Photo Attached
                  </span>
                )}
              </div>
              <input
                type="file"
                ref={ticketImageInputRef}
                onChange={handleTicketImageChange}
                accept="image/*"
                className="hidden"
              />
              {ticketImageFileName ? (
                <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {ticketImageBlob ? (
                      <img
                        src={ticketImageBlob}
                        alt="Pass preview"
                        className="w-8 h-8 rounded-xl object-cover border border-amber-300 shrink-0 shadow-2xs"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-white text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{ticketImageFileName}</p>
                      <p className="text-[10px] text-gray-500 font-medium">
                        {ticketImageSize || 'Pass photo'} • Image file
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
                        setTicketImageFileName('');
                        setTicketImageSize('');
                        setTicketImageBlob('');
                      }}
                      className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
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
                  className="w-full py-3 px-4 rounded-2xl bg-white border-2 border-dashed border-amber-300 hover:border-amber-600 hover:bg-amber-50/40 text-amber-900 text-xs font-bold flex items-center justify-center gap-2 transition-all card-press-3d cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-amber-600 stroke-[2.3]" />
                  <span>Attach Pass Photo / Screenshot (JPG, PNG, WebP)</span>
                </button>
              )}
            </div>
          </div>

          {/* Ticket Title & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">
                Pass / Ticket Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={ticketTitle}
                onChange={e => setTicketTitle(e.target.value)}
                placeholder="e.g. Secunderabad to Shirdi IRCTC Pass"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">Pass Category</label>
              <select
                value={ticketDocType}
                onChange={e => setTicketDocType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              >
                <option value="Train Ticket">Train Ticket (IRCTC)</option>
                <option value="Bus Ticket">State Bus Pass / Ticket</option>
                <option value="Boarding Pass">Boarding Pass</option>
                <option value="Transit Voucher">Transit Voucher</option>
              </select>
            </div>
          </div>

          {/* Train Number & Train Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">
                Train / Service Number <span className="text-amber-700 font-semibold">(e.g. 17002)</span>
              </label>
              <input
                type="text"
                value={ticketTrainNumber}
                onChange={e => setTicketTrainNumber(e.target.value)}
                placeholder="e.g. 17002 or 17064"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-mono font-bold text-gray-900 focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">
                Train / Transit Carrier Name
              </label>
              <input
                type="text"
                value={ticketTrainName}
                onChange={e => setTicketTrainName(e.target.value)}
                placeholder="e.g. Secunderabad - Sainagar Shirdi Express"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
          </div>

          {/* Timings & Class */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">Departure Time</label>
              <input
                type="text"
                value={ticketDepartureTime}
                onChange={e => setTicketDepartureTime(e.target.value)}
                placeholder="e.g. 16:30"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-mono font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">Arrival Time</label>
              <input
                type="text"
                value={ticketArrivalTime}
                onChange={e => setTicketArrivalTime(e.target.value)}
                placeholder="e.g. 09:15"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-mono font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">Class / Quota</label>
              <input
                type="text"
                value={ticketClassType}
                onChange={e => setTicketClassType(e.target.value)}
                placeholder="e.g. Sleeper Class (SL) or 3AC"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
          </div>

          {/* PNR & Travel Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">PNR / Ticket Number</label>
              <input
                type="text"
                value={ticketPnr}
                onChange={e => setTicketPnr(e.target.value)}
                placeholder="e.g. 4521789632"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">Travel Date</label>
              <input
                type="date"
                value={ticketTravelDate}
                onChange={e => setTicketTravelDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
          </div>

          {/* Cities */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">Origin City</label>
              <input
                type="text"
                value={ticketFromCity}
                onChange={e => setTicketFromCity(e.target.value)}
                placeholder="e.g. Secunderabad"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">Destination City</label>
              <input
                type="text"
                value={ticketToCity}
                onChange={e => setTicketToCity(e.target.value)}
                placeholder="e.g. Shirdi"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
          </div>

          {/* Fare & Payment Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">Ticket Cost / Fare (₹)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={ticketAmount}
                onChange={e => setTicketAmount(e.target.value)}
                placeholder="Auto-syncs to Budget"
                className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-300 text-xs sm:text-sm font-bold text-emerald-900 focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-emerald-50/40"
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">Payment Mode</label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-50 rounded-xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => setTicketPaymentMethod('UPI')}
                  className={`py-1.5 rounded-lg text-xs font-black transition-all ${
                    ticketPaymentMethod === 'UPI'
                      ? 'bg-[#0F5B44] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 bg-white/60'
                  }`}
                >
                  📱 UPI
                </button>
                <button
                  type="button"
                  onClick={() => setTicketPaymentMethod('Cash')}
                  className={`py-1.5 rounded-lg text-xs font-black transition-all ${
                    ticketPaymentMethod === 'Cash'
                      ? 'bg-[#0F5B44] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 bg-white/60'
                  }`}
                >
                  💵 Cash
                </button>
              </div>
            </div>
          </div>

          {/* Coach / Seat & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">Coach &amp; Berth / Seat</label>
              <input
                type="text"
                value={ticketCoachSeat}
                onChange={e => setTicketCoachSeat(e.target.value)}
                placeholder="e.g. S4 / 45 (Lower Berth)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-700 block mb-1">Notes / Instructions</label>
              <input
                type="text"
                value={ticketNotes}
                onChange={e => setTicketNotes(e.target.value)}
                placeholder="e.g. Carry original Aadhaar card for inspection"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden bg-white"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setScreen('overview')}
              className="px-4 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all card-press-3d"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-2xl bg-[#0F5B44] hover:bg-[#136a50] text-white text-xs font-black shadow-md shadow-emerald-950/20 transition-all card-press-3d"
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Update Ticket' : 'Save Ticket Pass'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ===========================================================================
  // MAIN VIEW: UNIFIED TRANSIT & TICKETS HUB
  // ===========================================================================
  return (
    <div className="space-y-4">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-[#0F5B44] to-teal-700 text-white px-5 py-2 rounded-full text-xs font-bold shadow-xl border border-white/20 animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-100/90 text-emerald-800 text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider mb-1 shadow-xs border border-emerald-200/80 max-w-full">
            <Train className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="truncate">PILGRIMAGE TRANSIT · 19 DAYS</span>
            <span className="text-emerald-500 hidden sm:inline">•</span>
            <span className="hidden sm:inline">TRANSIT &amp; TICKETS</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-tight">
            Transport
          </h1>
          <p className="text-xs text-gray-500 font-medium truncate">
            All your travel journeys in one place
          </p>
          <div className="hidden" aria-hidden="true">
            <span>Travel Tickets &amp; Passes</span>
            <span>All your bookings and important documents</span>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            onClick={() => setScreen('settings')}
            className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white border border-gray-200 text-gray-600 hover:text-[#0F5B44] hover:bg-emerald-50 transition-all card-press-3d shadow-2xs"
            title="Transport Preferences"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => openAddTicketForm()}
            className="p-2 sm:px-3 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white border border-emerald-300 text-[#0F5B44] hover:bg-emerald-50 text-xs font-bold shadow-2xs transition-all card-press-3d inline-flex items-center gap-1 shrink-0"
            title="Upload Pass"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload Pass</span>
          </button>
          <button
            onClick={() => openAddForm('Train')}
            className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-950/25 hover:shadow-lg transition-all card-press-3d inline-flex items-center gap-1 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Journey</span>
          </button>
        </div>
      </div>

      {/* 3D Glassmorphic Stats Grid */}
      <div className="glass-card card-3d card-depth-3d rounded-3xl p-3.5 sm:p-5 border border-white/80 shadow-[0_12px_32px_-8px_rgba(15,91,68,0.12)] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
              19-Day Yatra Circuit Transit
            </h3>
          </div>
          <span className="text-[10px] font-bold text-gray-400">17 Nov - 5 Dec 2026</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-0.5">
          <div className="bg-emerald-50/70 rounded-2xl p-2 sm:p-2.5 border border-emerald-100 card-press-3d">
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800">
              Circuit Passes
            </span>
            <p className="text-base sm:text-lg font-black text-[#0F5B44] mt-0.5">
              {canonicalLegs.length}
            </p>
            <span className="text-[9px] text-emerald-700 font-medium">transit legs</span>
          </div>
          <div className="bg-sky-50/70 rounded-2xl p-2 sm:p-2.5 border border-sky-100 card-press-3d">
            <span className="text-[9px] font-black uppercase tracking-wider text-sky-800">
              Uploaded
            </span>
            <p className="text-base sm:text-lg font-black text-sky-900 mt-0.5">
              {ticketDocuments.length}
            </p>
            <span className="text-[9px] text-sky-700 font-medium">e-tickets</span>
          </div>
          <div className="bg-amber-50/70 rounded-2xl p-2 sm:p-2.5 border border-amber-100 card-press-3d">
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-800">
              Booked
            </span>
            <p className="text-base sm:text-lg font-black text-amber-900 mt-0.5">
              {bookedCount}
            </p>
            <span className="text-[9px] text-amber-700 font-medium">confirmed</span>
          </div>
          <div className="bg-purple-50/70 rounded-2xl p-2 sm:p-2.5 border border-purple-100 card-press-3d">
            <span className="text-[9px] font-black uppercase tracking-wider text-purple-800">
              Transit Fares
            </span>
            <p className="text-base sm:text-lg font-black text-purple-900 mt-0.5">
              ₹{totalTransitSpend}
            </p>
            <span className="text-[9px] text-purple-700 font-medium">synced to budget</span>
          </div>
        </div>
      </div>

      {/* 3D Quick Action Launchpad */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        <button
          onClick={() => openAddForm('Train')}
          className="p-2 sm:p-2.5 rounded-2xl bg-emerald-50/90 hover:bg-emerald-100/90 border border-emerald-200/90 text-emerald-900 text-[10.5px] sm:text-xs font-black transition-all card-press-3d flex flex-col items-center justify-center gap-1 shadow-2xs group"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
            <Train className="w-3.5 h-3.5 stroke-[2.4]" />
          </div>
          <span className="truncate">Add Train</span>
        </button>
        <button
          onClick={() => openAddForm('State Bus')}
          className="p-2 sm:p-2.5 rounded-2xl bg-sky-50/90 hover:bg-sky-100/90 border border-sky-200/90 text-sky-900 text-[10.5px] sm:text-xs font-black transition-all card-press-3d flex flex-col items-center justify-center gap-1 shadow-2xs group"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
            <Bus className="w-3.5 h-3.5 stroke-[2.4]" />
          </div>
          <span className="truncate">Add Bus</span>
        </button>
        <button
          onClick={() => openAddForm('Auto')}
          className="p-2 sm:p-2.5 rounded-2xl bg-amber-50/90 hover:bg-amber-100/90 border border-amber-200/90 text-amber-900 text-[10.5px] sm:text-xs font-black transition-all card-press-3d flex flex-col items-center justify-center gap-1 shadow-2xs group"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
            <Car className="w-3.5 h-3.5 stroke-[2.4]" />
          </div>
          <span className="truncate">Add Auto</span>
        </button>
        <button
          onClick={() => openAddForm('Taxi')}
          className="p-2 sm:p-2.5 rounded-2xl bg-purple-50/90 hover:bg-purple-100/90 border border-purple-200/90 text-purple-900 text-[10.5px] sm:text-xs font-black transition-all card-press-3d flex flex-col items-center justify-center gap-1 shadow-2xs group"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <span className="truncate">Add Other</span>
        </button>
      </div>

      {/* 3D Segment Switcher */}
      <div className="glass-card rounded-2xl p-1 border border-white/80 shadow-2xs flex items-center gap-1 overflow-x-auto no-scrollbar">
        {[
          { id: 'all', label: 'All', fullLabel: 'All Hub', icon: Sparkles },
          { id: 'route-passes', label: `Passes (${canonicalLegs.length})`, fullLabel: `19-Day Passes (${canonicalLegs.length})`, icon: Ticket },
          { id: 'active-journeys', label: `Journeys (${effectiveLegs.length})`, fullLabel: `Journeys (${effectiveLegs.length})`, icon: Train },
          { id: 'uploaded-passes', label: `Tickets (${ticketDocuments.length})`, fullLabel: `E-Tickets (${ticketDocuments.length})`, icon: FileText },
        ].map(tab => {
          const isSel = segmentTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setSegmentTab(tab.id as any);
                if (tab.id === 'uploaded-passes') setFilter('tickets');
                else if (filter === 'tickets') setFilter('all');
              }}
              className={`flex-1 min-w-0 py-1.5 px-1 sm:px-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all card-press-3d flex items-center justify-center gap-1 shrink-0 sm:shrink ${
                isSel
                  ? 'bg-gradient-to-r from-[#0F5B44] to-teal-700 text-white shadow-md'
                  : 'text-gray-600 hover:text-[#0F5B44] hover:bg-emerald-50/60'
              }`}
            >
              <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="truncate">
                <span className="sm:hidden">{tab.label}</span>
                <span className="hidden sm:inline">{tab.fullLabel}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {[
          { id: 'all', label: `All Transport (${counts.all})` },
          { id: 'train', label: `Train (${counts.train})` },
          { id: 'bus', label: `Bus (${counts.bus})` },
          { id: 'local', label: `Auto (${counts.local})` },
          { id: 'tickets', label: `Tickets & Passes (${counts.passes})` },
        ].map(cat => {
          const isSel = filter === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id as any)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all card-press-3d ${
                isSel
                  ? 'bg-[#0F5B44] text-white shadow-sm ring-1 ring-emerald-400/40'
                  : 'bg-white/90 text-gray-600 hover:bg-emerald-50 border border-gray-200/80'
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
          placeholder="Search by city, train number, PNR, or carrier..."
          className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-white/90 border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#0F5B44] focus:outline-hidden shadow-2xs"
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

      {/* ===================================================================== */}
      {/* SECTION A: JOURNEYS LIST (WHEN NOT FILTERED EXCLUSIVELY TO TICKETS)   */}
      {/* ===================================================================== */}
      {filter !== 'tickets' && (
        <div className="space-y-3">
          {/* Upcoming Journey Hero Card */}
          {upcomingLeg && !searchQuery && filter === 'all' && (
            <div className="glass-card card-3d card-depth-3d rounded-3xl p-5 border border-white/90 shadow-[0_12px_32px_-8px_rgba(15,91,68,0.12)] space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-wide">
                    Upcoming Journey
                  </h3>
                </div>
                {getStatusBadge(upcomingLeg.status)}
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Origin
                  </span>
                  <p className="text-sm sm:text-base font-black text-gray-900 leading-tight">
                    {upcomingLeg.fromLocation}
                  </p>
                  {upcomingLeg.departureTime && (
                    <p className="text-xs text-emerald-800 font-bold">{upcomingLeg.departureTime}</p>
                  )}
                </div>
                <div className="flex flex-col items-center px-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#0F5B44]">
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <span className="text-[9px] font-black uppercase text-gray-400 mt-1">
                    {upcomingLeg.mode}
                  </span>
                </div>
                <div className="text-right space-y-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Destination
                  </span>
                  <p className="text-sm sm:text-base font-black text-gray-900 leading-tight">
                    {upcomingLeg.toLocation}
                  </p>
                  {upcomingLeg.arrivalTime && (
                    <p className="text-xs text-emerald-800 font-bold">{upcomingLeg.arrivalTime}</p>
                  )}
                </div>
              </div>

              {/* Attached Ticket Pass Pill for Hero */}
              {(() => {
                const attached = findAttachedTicketForLeg(upcomingLeg);
                if (attached) {
                  return (
                    <div className="p-2.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Ticket className="w-4 h-4 text-emerald-700 shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-200/90 text-emerald-900 text-[9px] font-black uppercase tracking-wider">
                              Pass Attached
                            </span>
                            <p className="text-xs font-bold text-emerald-950 truncate">{attached.title}</p>
                          </div>
                          <p className="text-[10px] text-emerald-800 font-medium truncate">
                            {attached.pnr ? `PNR: ${attached.pnr}` : 'Verified travel pass'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setChooserDoc(attached)}
                          className="px-2.5 py-1 rounded-xl bg-[#0F5B44] text-white text-[11px] font-bold hover:bg-[#136a50] transition-all card-press-3d inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Pass</span>
                        </button>
                        {(attached.blobData || attached.fileUrl) && (
                          <a
                            href={attached.blobData || attached.fileUrl}
                            download={attached.fileName || 'ticket_pass'}
                            className="p-1 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-emerald-50 transition-all card-press-3d"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        openAddTicketForm({
                          from: upcomingLeg.fromLocation,
                          to: upcomingLeg.toLocation,
                          mode: upcomingLeg.mode,
                          date: upcomingLeg.date,
                        })
                      }
                      className="text-[11px] font-bold text-[#0F5B44] hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Attach E-Ticket / Pass</span>
                    </button>
                    {upcomingLeg.fare ? (
                      <span className="text-xs font-black text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                        ₹{upcomingLeg.fare}
                      </span>
                    ) : null}
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => openEditForm(upcomingLeg)}
                  className="px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-emerald-50 text-[#0F5B44] border border-gray-200 text-xs font-bold transition-all card-press-3d inline-flex items-center gap-1"
                >
                  <Edit className="w-3 h-3" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLegToDelete(upcomingLeg.id)}
                  className="px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-rose-50 text-rose-600 border border-gray-200 text-xs font-bold transition-all card-press-3d inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* SECTION B: 19-DAY PILGRIMAGE JOURNEY PASSES (2-COLUMN COMPACT GRID)   */}
          {/* ===================================================================== */}
          {(segmentTab === 'all' || segmentTab === 'route-passes') && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#0F5B44] to-teal-600 text-white flex items-center justify-center shadow-xs">
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
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {canonicalLegs.length} Legs
                </span>
              </div>

              {/* 2-Column Responsive Grid Layout: Day 1, 2 next line 3, 4 ... */}
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                {canonicalLegs.map((leg, idx) => {
                  const isBooked = leg.status === 'Booked' || leg.status === 'Confirmed';
                  const linkedDay = days.find(d => d.id === leg.dayId);
                  const dayNum = linkedDay ? days.indexOf(linkedDay) + 1 : idx + 1;
                  const attached = findAttachedTicketForLeg(leg);

                  return (
                    <div
                      key={leg.id || `canonical-${idx}`}
                      onClick={() => {
                        if (onSelectDayIndex) onSelectDayIndex(dayNum - 1);
                      }}
                      className="glass-card card-3d card-depth-3d rounded-2xl p-2.5 sm:p-3 border border-white/80 shadow-2xs hover:shadow-md transition-all card-press-3d group flex flex-col justify-between relative overflow-hidden bg-white/85 hover:bg-white cursor-pointer"
                    >
                      {/* Top: Day Badge + Mode Icon + Status */}
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-gradient-to-r from-[#0F5B44] to-teal-700 text-white shadow-2xs shrink-0 tracking-wide">
                            Day {dayNum}
                          </span>
                          <span className="p-1 rounded-md bg-emerald-50 text-[#0F5B44] text-[9px] font-bold inline-flex items-center shrink-0">
                            {getModeIcon(leg.mode, 'w-3 h-3')}
                          </span>
                        </div>
                        {isBooked ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8.5px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span className="hidden xs:inline">Booked</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8.5px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
                            <AlertCircle className="w-2.5 h-2.5" />
                            <span className="hidden xs:inline">Needs verification</span>
                          </span>
                        )}
                      </div>

                      {/* Route: Origin -> Destination */}
                      <div className="my-1 space-y-0.5">
                        <p className="text-[11px] sm:text-xs font-black text-gray-900 leading-tight truncate" title={leg.fromLocation}>
                          {leg.fromLocation}
                        </p>
                        <div className="flex items-center gap-1 text-[9.5px] sm:text-[10px] font-bold text-emerald-700">
                          <ArrowRight className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                          <span className="truncate" title={leg.toLocation}>{leg.toLocation}</span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-gray-500 pt-0.5">
                          <span className="font-semibold text-gray-700 truncate">{leg.mode}</span>
                          {leg.serviceNumber && (
                            <span className="font-mono text-gray-400 truncate">{leg.serviceNumber}</span>
                          )}
                          {leg.fare !== undefined && leg.fare > 0 && (
                            <span className="font-black text-emerald-800">₹{leg.fare}</span>
                          )}
                        </div>
                      </div>

                      {/* Action Button: View Pass or Attach Ticket + Edit Option */}
                      <div className="pt-1.5 mt-auto border-t border-gray-100/80">
                        {attached ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                setChooserDoc(attached);
                              }}
                              className="flex-1 py-1.5 px-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-[10px] font-black transition-all card-press-3d inline-flex items-center justify-center gap-1 shadow-2xs"
                              title="View Pass"
                            >
                              <Eye className="w-3 h-3 stroke-[2.5]" />
                              <span>View Pass</span>
                            </button>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                openEditTicketForm(attached);
                              }}
                              className="py-1.5 px-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 hover:text-emerald-950 border border-emerald-200/80 text-[10px] font-bold transition-all card-press-3d inline-flex items-center justify-center gap-0.5 shadow-2xs shrink-0"
                              title="Edit Pass Details"
                            >
                              <Edit2 className="w-2.5 h-2.5 stroke-[2.2]" />
                              <span>Edit</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                openAddTicketForm({
                                  from: leg.fromLocation,
                                  to: leg.toLocation,
                                  mode: leg.mode,
                                  service: leg.serviceNumber,
                                  date: leg.date,
                                });
                              }}
                              className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-50 hover:bg-[#0F5B44] text-[#0F5B44] hover:text-white border border-emerald-200 text-[10px] font-bold transition-all card-press-3d inline-flex items-center justify-center gap-1"
                              title="Attach Ticket"
                            >
                              <Plus className="w-2.5 h-2.5 stroke-[2.5]" />
                              <span>+ Attach</span>
                            </button>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                openEditForm(leg);
                              }}
                              className="py-1.5 px-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 hover:text-emerald-950 border border-emerald-200/80 text-[10px] font-bold transition-all card-press-3d inline-flex items-center justify-center gap-0.5 shadow-2xs shrink-0"
                              title="Edit Journey Details"
                            >
                              <Edit2 className="w-2.5 h-2.5 stroke-[2.2]" />
                              <span>Edit</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Custom Journeys Cards */}
          {(segmentTab === 'all' || segmentTab === 'active-journeys') && (
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wide">
                  Transit Journeys ({transportLegs.length})
                </h4>
              </div>
            {filteredLegs.length === 0 ? (
              <div className="glass-card rounded-3xl p-6 border border-white/80 text-center space-y-2">
                <p className="text-xs font-bold text-gray-700">No transport journeys found</p>
                <p className="text-xs text-gray-500">No journeys have been added to this trip yet.</p>
                <button
                  onClick={() => openAddForm('Train')}
                  className="px-4 py-2 rounded-xl bg-[#0F5B44] text-white text-xs font-bold card-press-3d inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Journey</span>
                </button>
              </div>
            ) : (
              filteredLegs.map((leg, index) => {
                const attached = findAttachedTicketForLeg(leg);
                const dayNumber = getDayNumberForLeg(leg);
                return (
                  <div
                    key={leg.id}
                    onClick={() => {
                      setSelectedLegId(leg.id);
                      setScreen('details');
                    }}
                    className="glass-card card-3d rounded-2xl p-4 border border-white/80 shadow-2xs hover:shadow-md transition-all space-y-2.5 cursor-pointer card-press-3d"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#0F5B44] border border-emerald-100 flex items-center justify-center shrink-0">
                          {getModeIcon(leg.mode)}
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-900 leading-tight">
                            {leg.serviceNumber ? `${leg.serviceNumber} · ` : ''}
                            {leg.trainName || leg.mode}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {dayNumber !== null && (
                              <span
                                onClick={e => {
                                  e.stopPropagation();
                                  if (onSelectDayIndex) onSelectDayIndex(dayNumber - 1);
                                }}
                                className="px-1.5 py-0.2 rounded-md bg-emerald-100/90 text-emerald-900 font-black text-[9px] hover:bg-emerald-200 transition-colors"
                              >
                                Day {dayNumber}
                              </span>
                            )}
                            <p className="text-[10px] text-gray-500 font-medium">
                              {leg.date ? leg.date : `Leg #${index + 1}`}
                            </p>
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(leg.status)}
                    </div>

                    {/* Route */}
                    <div className="flex items-center justify-between gap-2 px-1">
                      <div className="space-y-0.5">
                        <span className="text-[9px] uppercase font-bold text-gray-400">From</span>
                        <p className="text-xs sm:text-sm font-black text-gray-900">{leg.fromLocation}</p>
                        {leg.departureTime && (
                          <p className="text-[11px] text-emerald-800 font-bold">{leg.departureTime}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-center">
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <span className="text-[9px] text-gray-400 font-medium">Direct</span>
                      </div>
                      <div className="text-right space-y-0.5">
                        <span className="text-[9px] uppercase font-bold text-gray-400">To</span>
                        <p className="text-xs sm:text-sm font-black text-gray-900">{leg.toLocation}</p>
                        {leg.arrivalTime && (
                          <p className="text-[11px] text-emerald-800 font-bold">{leg.arrivalTime}</p>
                        )}
                      </div>
                    </div>

                    {/* Meta Row: Fare, Coach, Seat, Platform */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-100/70 text-[11px]">
                      <div className="flex flex-wrap items-center gap-2">
                        {leg.coachSeat && (
                          <span className="px-2 py-0.5 rounded-md bg-gray-50 border border-gray-200 text-gray-700 font-bold">
                            Seat: {leg.coachSeat}
                          </span>
                        )}
                        {leg.platformFrom && (
                          <span className="px-2 py-0.5 rounded-md bg-gray-50 border border-gray-200 text-gray-700">
                            {leg.platformFrom}
                          </span>
                        )}
                        {leg.bookingRef && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 font-mono text-[10px] font-bold">
                            PNR: {leg.bookingRef}
                          </span>
                        )}
                        {leg.fare !== undefined && leg.fare > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-black text-[11px]">
                            ₹{leg.fare}
                          </span>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center gap-1.5 ml-auto">
                        {attached ? (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setChooserDoc(attached);
                            }}
                            className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold inline-flex items-center gap-1 card-press-3d shadow-2xs"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View Pass</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              openAddTicketForm({
                                from: leg.fromLocation,
                                to: leg.toLocation,
                                mode: leg.mode,
                                date: leg.date,
                              });
                            }}
                            className="px-2 py-1 rounded-lg bg-gray-50 hover:bg-emerald-50 text-[#0F5B44] border border-emerald-200 text-[10px] font-bold inline-flex items-center gap-1 card-press-3d"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Attach Pass</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            openEditForm(leg);
                          }}
                          className="px-2 py-1 rounded-lg bg-gray-50 hover:bg-gray-100 text-[#0F5B44] border border-gray-200 text-[10px] font-bold card-press-3d"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setLegToDelete(leg.id);
                          }}
                          className="px-2 py-1 rounded-lg bg-gray-50 hover:bg-rose-50 text-rose-600 border border-gray-200 text-[10px] font-bold card-press-3d"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    )}

      {/* ===================================================================== */}
      {/* SECTION C: UPLOADED E-TICKETS & BOARDING PASSES                       */}
      {/* ===================================================================== */}
      {(segmentTab === 'all' || segmentTab === 'uploaded-passes' || filter === 'tickets') && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                <QrCode className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-900 leading-tight">
                  Travel Passes &amp; E-Tickets
                </h3>
                <p className="text-[10px] text-gray-500 font-medium">
                  Uploaded E-Tickets &amp; Boarding Passes stored offline
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openAddTicketForm()}
              className="px-3 py-1.5 rounded-xl bg-[#0F5B44] hover:bg-[#136a50] text-white text-xs font-bold inline-flex items-center gap-1 shadow-2xs card-press-3d"
            >
              <Upload className="w-3 h-3" />
              <span>Upload Pass</span>
            </button>
          </div>

          {/* Ticket Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: 'tickets', label: `All (${filteredPasses.length})` },
              { id: 'train', label: 'Train Tickets' },
              { id: 'bus', label: 'Bus Tickets' },
              { id: 'local', label: 'Other Tickets' },
            ].map(f => {
              const isSel = filter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all card-press-3d ${
                    isSel
                      ? 'bg-[#0F5B44] text-white shadow-sm ring-1 ring-emerald-400/40'
                      : 'bg-white/90 text-gray-600 hover:bg-emerald-50 border border-gray-200/80'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {filteredPasses.length === 0 ? (
            <div className="glass-card rounded-3xl p-6 border border-white/80 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#0F5B44] flex items-center justify-center mx-auto">
                <Ticket className="w-6 h-6 stroke-[2]" />
              </div>
              <p className="text-xs font-bold text-gray-700">No travel passes uploaded yet</p>
              <p className="text-[11px] text-gray-500 max-w-xs mx-auto">
                Upload your IRCTC train e-tickets, MSRTC bus receipts, or boarding passes here for offline view.
              </p>
              <button
                type="button"
                onClick={() => openAddTicketForm()}
                className="px-4 py-2 rounded-xl bg-[#0F5B44] text-white text-xs font-bold card-press-3d inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload First Pass</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPasses.map(pass => (
                <TicketPassCard
                  key={pass.id}
                  pass={pass}
                  onView={setChooserDoc}
                  onEdit={openEditTicketForm}
                  onDelete={id => setTicketToDelete(id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete Journey Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(legToDelete)}
        title="Delete Transit Journey"
        message="Are you sure you want to delete this transit journey? Any auto-synced expense in your budget will be cleanly updated."
        confirmLabel="Delete Journey"
        cancelLabel="Keep"
        variant="danger"
        onConfirm={async () => {
          if (legToDelete && onDeleteTransport) {
            try {
              await onDeleteTransport(legToDelete);
              showToast('Journey removed from transit route');
            } finally {
              setLegToDelete(null);
            }
          }
        }}
        onCancel={() => setLegToDelete(null)}
      />

      {/* Delete Ticket Pass Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(ticketToDelete)}
        title="Delete Ticket Pass"
        message="Are you sure you want to delete this travel pass from your vault? Any auto-synced ticket expense in your budget ledger will be cleanly removed."
        confirmLabel="Delete Pass"
        cancelLabel="Keep"
        variant="danger"
        onConfirm={async () => {
          if (ticketToDelete && onDeleteDocument) {
            try {
              await onDeleteDocument(ticketToDelete);
              showToast('Ticket pass removed from vault');
            } finally {
              setTicketToDelete(null);
            }
          }
        }}
        onCancel={() => setTicketToDelete(null)}
      />

      {/* Alert Modal */}
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
        itemType="ticket"
        onSelectMode={handleSelectDocMode}
        onClose={() => setChooserDoc(null)}
        onAttachFile={handleAttachTicketFile}
      />

      {/* 3D In-App Document / Ticket Viewer Modal */}
      <DocumentViewerModal
        isOpen={Boolean(viewingDoc)}
        document={viewingDoc}
        initialMode={docViewerMode}
        onClose={() => setViewingDoc(null)}
        onAttachFile={handleAttachTicketFile}
      />
    </div>
  );
};
