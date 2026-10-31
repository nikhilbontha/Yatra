'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Trip,
  ItineraryDay,
  AccommodationStay,
  StayType,
} from '@/types/trip';
import { formatRupee } from '@/lib/calculations';
import { CONFIRMED_ACCOMMODATION_STAYS } from '@/lib/itinerary-data';
import {
  BedDouble,
  Building2,
  Home,
  Compass,
  MapPin,
  Calendar,
  Clock,
  Phone,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  CheckCircle,
  Clock3,
  Edit,
  Trash2,
  Share2,
  Download,
  FileText,
  FileCheck,
  Upload,
  UploadCloud,
  Check,
  Navigation as NavigationIcon,
  Filter,
  Settings,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Camera,
  Image as ImageIcon,
  Layers,
  ArrowRight,
  Info,
  Map as MapIcon,
  SlidersHorizontal,
  ChevronDown,
  X,
  Milestone,
  Zap,
  Flame,
  BookmarkCheck,
  Eye,
} from 'lucide-react';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { AlertModal } from '@/components/modals/AlertModal';
import { DocumentViewerModal } from '@/components/modals/DocumentViewerModal';
import { ViewAttachmentChooserModal } from '@/components/modals/ViewAttachmentChooserModal';

export type AccommodationScreen =
  | 'overview' // 1. Accommodation Overview
  | 'list' // 2. Accommodation List (All Stays)
  | 'add' // 3. Add Accommodation
  | 'details' // 4. Accommodation Details (Stay Details)
  | 'booking' // 5. Booking Information
  | 'edit' // 6. Edit Accommodation
  | 'nearby' // 7. Nearby Accommodation
  | 'map' // 8. Map View
  | 'photos' // 9. Stay Photos & Documents
  | 'settings'; // 10. Accommodation Settings

export const getAccommodationStatusBadgeClass = (
  status?: string
): { badgeClass: string; label: string } => {
  const normalized = (status || 'Needs research').trim();
  switch (normalized) {
    case 'Not selected':
      return { badgeClass: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Not selected' };
    case 'Needs research':
      return { badgeClass: 'bg-amber-50 text-amber-800 border-amber-200', label: 'Needs research' };
    case 'Option identified':
      return { badgeClass: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Option identified' };
    case 'Booking pending':
      return { badgeClass: 'bg-orange-50 text-orange-700 border-orange-200', label: 'Booking pending' };
    case 'Booked':
    case 'Confirmed':
      return { badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Booked' };
    case 'Checked in':
      return { badgeClass: 'bg-teal-50 text-teal-800 border-teal-200', label: 'Checked in' };
    case 'Completed':
    case 'Checked out':
    case 'Completed or checked out':
      return { badgeClass: 'bg-purple-50 text-purple-700 border-purple-200', label: 'Completed' };
    default:
      return { badgeClass: 'bg-gray-100 text-gray-700 border-gray-200', label: normalized };
  }
};

interface AccommodationViewProps {
  trip?: Trip;
  days?: ItineraryDay[];
  accommodations: AccommodationStay[];
  onSaveStay?: (stay: Partial<AccommodationStay>) => Promise<void> | void;
  onDeleteStay?: (stayId: string) => Promise<void> | void;
  initialScreen?: AccommodationScreen;
  initialSelectedStayId?: string;
  onSelectDayIndex?: (index: number) => void;
}

interface NearbyPlace {
  id: string;
  name: string;
  type: 'Dharamshala' | 'Hotel' | 'Guest House';
  distance: string;
  priceText: string;
  numericPrice: number;
  rating: number;
  imageUrl: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
}

const NEARBY_STAYS: NearbyPlace[] = [
  {
    id: 'nb-1',
    name: 'Sai Ashram Complex (Sansthan Trust)',
    type: 'Dharamshala',
    distance: '1.0 km from temple (Sansthan bus available)',
    priceText: 'Trust rate (enquire at Sansthan counter / portal)',
    numericPrice: 200,
    rating: 4.8,
    imageUrl: '/images/shirdi-dharamshala.jpg',
    address: 'Pimpalwadi Road, Shirdi, Maharashtra',
    phone: 'Sansthan Enquiry: online.sai.org.in',
    lat: 19.7665,
    lng: 74.4765,
  },
  {
    id: 'nb-2',
    name: 'Dwarawati Bhakta Niwas (Sansthan)',
    type: 'Dharamshala',
    distance: '0.4 km from temple gate',
    priceText: 'Subsidized pilgrim rate',
    numericPrice: 300,
    rating: 4.7,
    imageUrl: '/images/shirdi-dharamshala.jpg',
    address: 'Near Shirdi Bus Stand, Pimpalwadi Road',
    phone: 'Direct booking at Sansthan reception',
    lat: 19.768,
    lng: 74.4745,
  },
  {
    id: 'nb-3',
    name: 'Shanti Kamal Trust Complex',
    type: 'Dharamshala',
    distance: '0.6 km from temple',
    priceText: 'Budget dharamshala tariff',
    numericPrice: 350,
    rating: 4.5,
    imageUrl: '/images/shirdi-room.jpg',
    address: 'Near Dwarakamai, Shirdi, Maharashtra',
    phone: 'Verify availability at counter on arrival',
    lat: 19.7645,
    lng: 74.4795,
  },
  {
    id: 'nb-4',
    name: 'MTDC Pilgrim Holiday Resort',
    type: 'Hotel',
    distance: '1.2 km from temple',
    priceText: 'Govt tourism tariff',
    numericPrice: 900,
    rating: 4.4,
    imageUrl: '/images/shirdi-room.jpg',
    address: 'Nagar-Manmad Road, Shirdi',
    phone: 'maharashtratourism.gov.in',
    lat: 19.769,
    lng: 74.478,
  },
  {
    id: 'nb-5',
    name: 'IRCTC Retiring Rooms (Sainagar Shirdi Station)',
    type: 'Guest House',
    distance: 'At SNSI Railway Station (3 km to temple)',
    priceText: 'IRCTC official tariff',
    numericPrice: 400,
    rating: 4.3,
    imageUrl: '/images/hotel-receipt.jpg',
    address: 'Sainagar Shirdi Railway Station',
    phone: 'Bookable with valid PNR on irctctourism.com',
    lat: 19.762,
    lng: 74.482,
  },
];

export const AccommodationView: React.FC<AccommodationViewProps> = ({
  trip,
  days = [],
  accommodations = [],
  onSaveStay,
  onDeleteStay,
  initialScreen = 'overview',
  initialSelectedStayId,
  onSelectDayIndex,
}) => {
  // Navigation Screen State
  const [screen, setScreen] = useState<AccommodationScreen>(initialScreen);
  const [returnScreen, setReturnScreen] = useState<AccommodationScreen>('overview');

  // Canonical stays merged with any user updates
  const displayStays = useMemo(() => {
    return accommodations || [];
  }, [accommodations]);

  // Selected Stay
  const [selectedStayId, setSelectedStayId] = useState<string>(
    initialSelectedStayId || accommodations?.[0]?.id || ''
  );

  // Sync selectedStayId if props change or if currently unset
  React.useEffect(() => {
    if (initialSelectedStayId) {
      setSelectedStayId(initialSelectedStayId);
    } else if ((!selectedStayId || !displayStays.some(s => s.id === selectedStayId)) && displayStays.length > 0) {
      setSelectedStayId(displayStays[0].id);
    }
  }, [initialSelectedStayId, displayStays]);

  React.useEffect(() => {
    if (initialScreen) {
      setScreen(initialScreen);
    }
  }, [initialScreen]);

  // Active selected stay object
  const selectedStay = useMemo(() => {
    if (!selectedStayId) return displayStays[0] || null;
    return displayStays.find(s => s.id === selectedStayId) || displayStays[0] || null;
  }, [displayStays, selectedStayId]);

  const selectedStayIndex = useMemo(() => {
    if (!selectedStay) return 0;
    const idx = displayStays.findIndex(s => s.id === selectedStay.id);
    return idx >= 0 ? idx : 0;
  }, [displayStays, selectedStay]);

  // Toast Notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showDeleteStayConfirm, setShowDeleteStayConfirm] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Form State for Add / Edit Stay
  const [formStayType, setFormStayType] = useState<StayType>(
    initialScreen === 'edit' && selectedStay ? selectedStay.stayType : 'Dharamshala'
  );
  const [formName, setFormName] = useState<string>(
    initialScreen === 'edit' && selectedStay ? selectedStay.name : ''
  );
  const [formCity, setFormCity] = useState<string>(
    initialScreen === 'edit' && selectedStay ? selectedStay.city : ''
  );
  const [formMapsUrl, setFormMapsUrl] = useState<string>(
    initialScreen === 'edit' && selectedStay ? (selectedStay as any).mapsUrl || (selectedStay as any).exactLocation || '' : ''
  );
  const [formAddress, setFormAddress] = useState<string>(
    initialScreen === 'edit' && selectedStay ? selectedStay.address || '' : ''
  );
  const [formCheckinDate, setFormCheckinDate] = useState<string>(
    initialScreen === 'edit' && selectedStay ? selectedStay.checkinDate || '2026-11-18' : '2026-11-18'
  );
  const [formCheckoutDate, setFormCheckoutDate] = useState<string>(
    initialScreen === 'edit' && selectedStay ? selectedStay.checkoutDate || '2026-11-19' : '2026-11-19'
  );
  const [formNights, setFormNights] = useState<number>(
    initialScreen === 'edit' && selectedStay ? selectedStay.nightsCount || 1 : 1
  );
  const [formPersons, setFormPersons] = useState<number>(
    initialScreen === 'edit' && selectedStay ? selectedStay.capacityPersons || 1 : 1
  );
  const [formCost, setFormCost] = useState<string>(
    initialScreen === 'edit' && selectedStay && (selectedStay.totalAmount || selectedStay.estimatedCost)
      ? String(selectedStay.totalAmount || selectedStay.estimatedCost)
      : ''
  );
  const [formPaymentMethod, setFormPaymentMethod] = useState<string>(
    initialScreen === 'edit' && selectedStay ? selectedStay.paymentMethod || 'UPI' : 'UPI'
  );
  const [formPhone, setFormPhone] = useState<string>(
    initialScreen === 'edit' && selectedStay ? selectedStay.contactPhone || '' : ''
  );
  const [formNotes, setFormNotes] = useState<string>(
    initialScreen === 'edit' && selectedStay ? selectedStay.notes || '' : ''
  );
  const [formBookingStatus, setFormBookingStatus] = useState<string>(
    initialScreen === 'edit' && selectedStay
      ? (selectedStay.bookingStatus as string) ||
          (selectedStay.status as string) ||
          'Needs research'
      : 'Needs research'
  );
  const [formBookingReference, setFormBookingReference] = useState<string>(
    initialScreen === 'edit' && selectedStay
      ? selectedStay.bookingReference || selectedStay.bookingId || ''
      : ''
  );
  const [formDayId, setFormDayId] = useState<string>(
    initialScreen === 'edit' && selectedStay ? selectedStay.dayId || '' : ''
  );

  // Sync edit form whenever selected stay changes
  React.useEffect(() => {
    if (screen === 'edit' && selectedStay) {
      setFormStayType(selectedStay.stayType);
      setFormName(selectedStay.name);
      setFormCity(selectedStay.city);
      setFormMapsUrl((selectedStay as any).mapsUrl || (selectedStay as any).exactLocation || '');
      setFormAddress(selectedStay.address || '');
      setFormCheckinDate(selectedStay.checkinDate || '2026-11-18');
      setFormCheckoutDate(selectedStay.checkoutDate || '2026-11-19');
      setFormNights(selectedStay.nightsCount || 1);
      setFormPersons(selectedStay.capacityPersons || 1);
      setFormCost(
        selectedStay.totalAmount || selectedStay.estimatedCost
          ? String(selectedStay.totalAmount || selectedStay.estimatedCost)
          : ''
      );
      setFormPaymentMethod(selectedStay.paymentMethod || 'UPI');
      setFormPhone(selectedStay.contactPhone || '');
      setFormNotes(selectedStay.notes || '');
      setFormBookingStatus(
        (selectedStay.bookingStatus as string) || (selectedStay.status as string) || 'Needs research'
      );
      setFormBookingReference(selectedStay.bookingReference || selectedStay.bookingId || '');
      setFormDayId(selectedStay.dayId || '');
      setFormDocumentUrl(selectedStay.documentUrl || '');
      setFormDocumentName(selectedStay.documentName || '');
      setFormDocumentSize(selectedStay.documentSize || '');
    }
  }, [screen, selectedStay?.id]);

  // Attached Document State (Task 10) & Dual Attachment Support (PDF + Image)
  const [formDocumentUrl, setFormDocumentUrl] = useState<string>(
    initialScreen === 'edit' && selectedStay ? selectedStay.documentUrl || '' : ''
  );
  const [formDocumentName, setFormDocumentName] = useState<string>(
    initialScreen === 'edit' && selectedStay ? selectedStay.documentName || '' : ''
  );
  const [formDocumentSize, setFormDocumentSize] = useState<string>(
    initialScreen === 'edit' && selectedStay ? selectedStay.documentSize || '' : ''
  );

  const [formPdfBlob, setFormPdfBlob] = useState<string>(
    initialScreen === 'edit' && selectedStay ? ((selectedStay as any).pdfBlob || selectedStay.documentUrl || '') : ''
  );
  const [formPdfName, setFormPdfName] = useState<string>(
    initialScreen === 'edit' && selectedStay ? ((selectedStay as any).pdfFileName || selectedStay.documentName || '') : ''
  );
  const [formPdfSize, setFormPdfSize] = useState<string>(
    initialScreen === 'edit' && selectedStay ? ((selectedStay as any).pdfFileSize || selectedStay.documentSize || '') : ''
  );

  const [formImageBlob, setFormImageBlob] = useState<string>(
    initialScreen === 'edit' && selectedStay ? ((selectedStay as any).imageBlob || (selectedStay.imageUrl && !selectedStay.imageUrl.startsWith('/images/shirdi-dharamshala.jpg') ? selectedStay.imageUrl : '')) : ''
  );
  const [formImageName, setFormImageName] = useState<string>(
    initialScreen === 'edit' && selectedStay ? ((selectedStay as any).imageFileName || '') : ''
  );
  const [formImageSize, setFormImageSize] = useState<string>(
    initialScreen === 'edit' && selectedStay ? ((selectedStay as any).imageFileSize || '') : ''
  );

  const docFileInputRef = useRef<HTMLInputElement>(null);
  const stayPdfInputRef = useRef<HTMLInputElement>(null);
  const stayImageInputRef = useRef<HTMLInputElement>(null);

  const handleStayPdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      showToast('PDF exceeds 12 MB limit');
      return;
    }
    const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
    setFormPdfName(file.name);
    setFormPdfSize(sizeStr);
    setFormDocumentName(file.name);
    setFormDocumentSize(sizeStr);
    const reader = new FileReader();
    reader.onload = ev => {
      if (ev.target?.result) {
        setFormPdfBlob(ev.target.result as string);
        setFormDocumentUrl(ev.target.result as string);
        showToast('Stay voucher PDF updated');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStayImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      showToast('Image exceeds 12 MB limit');
      return;
    }
    const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
    setFormImageName(file.name);
    setFormImageSize(sizeStr);
    const reader = new FileReader();
    reader.onload = ev => {
      if (ev.target?.result) {
        setFormImageBlob(ev.target.result as string);
        showToast('Stay photo / slip updated');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAccommodationDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      handleStayPdfChange(e);
    } else {
      handleStayImageChange(e);
    }
  };

  // Filters State
  const [listSearch, setListSearch] = useState<string>('');
  const [listFilter, setListFilter] = useState<string>('All');
  const [nearbyFilter, setNearbyFilter] = useState<string>('All');
  const [mapFilter, setMapFilter] = useState<string>('All');
  const [photosFilter, setPhotosFilter] = useState<string>('All');
  const [activeMapStay, setActiveMapStay] = useState<NearbyPlace>(NEARBY_STAYS[0]);
  const [viewingDoc, setViewingDoc] = useState<any>(null);
  const [chooserStay, setChooserStay] = useState<AccommodationStay | null>(null);
  const [stayViewerMode, setStayViewerMode] = useState<'image' | 'pdf'>('pdf');

  // Settings State (Reflecting Solo Traveller Pilgrimage Preferences)
  const [prefStayType, setPrefStayType] = useState<string>('Dharamshala');
  const [prefMaxBudget, setPrefMaxBudget] = useState<string>('₹800');
  const [prefLocation, setPrefLocation] = useState<string>('Near Temple');
  const [prefPersons, setPrefPersons] = useState<number>(1); // Solo traveller
  const [settingShowOnMap, setSettingShowOnMap] = useState<boolean>(true);
  const [settingReminders, setSettingReminders] = useState<boolean>(true);
  const [settingSyncCloud, setSettingSyncCloud] = useState<boolean>(true);

  // Statistics calculation strictly derived from actual accommodation records
  const totalStaysCount = displayStays.length;
  const dharamshalaCount = useMemo(
    () => displayStays.filter(s => s.stayType === 'Dharamshala' || s.stayType === 'Ashram').length,
    [displayStays]
  );
  const hotelCount = useMemo(
    () => displayStays.filter(s => s.stayType === 'Hotel' || s.stayType === 'Budget Hotel').length,
    [displayStays]
  );
  const otherCount = useMemo(
    () => displayStays.filter(s => s.stayType === 'Guest House' || s.stayType === 'Dormitory' || s.stayType === 'Night Train' || s.stayType === 'Other').length,
    [displayStays]
  );

  // Filtered Stays list for Screen 2
  const filteredStays = useMemo(() => {
    return displayStays.filter(stay => {
      const matchSearch =
        !listSearch ||
        stay.name.toLowerCase().includes(listSearch.toLowerCase()) ||
        stay.city.toLowerCase().includes(listSearch.toLowerCase()) ||
        (stay.address && stay.address.toLowerCase().includes(listSearch.toLowerCase()));

      let matchType = true;
      if (listFilter === 'Dharamshala') {
        matchType = stay.stayType === 'Dharamshala' || stay.stayType === 'Ashram';
      } else if (listFilter === 'Hotel') {
        matchType = stay.stayType === 'Hotel' || stay.stayType === 'Budget Hotel';
      } else if (listFilter === 'Guest House') {
        matchType = stay.stayType === 'Guest House';
      } else if (listFilter === 'Other') {
        matchType = stay.stayType === 'Dormitory' || stay.stayType === 'Other' || stay.stayType === 'Night Train';
      }

      return matchSearch && matchType;
    });
  }, [displayStays, listSearch, listFilter]);

  // Open Add Form cleanly
  const openAddForm = () => {
    setReturnScreen(screen);
    setFormStayType('Dharamshala');
    setFormName('');
    setFormCity('');
    setFormMapsUrl('');
    setFormAddress('');
    setFormCheckinDate('2026-11-18');
    setFormCheckoutDate('2026-11-19');
    setFormNights(1);
    setFormPersons(1);
    setFormCost('');
    setFormPaymentMethod('UPI');
    setFormPhone('');
    setFormNotes('');
    setFormBookingStatus('Needs research');
    setFormBookingReference('');
    setFormDayId('');
    setFormDocumentUrl('');
    setFormDocumentName('');
    setFormDocumentSize('');
    setFormPdfBlob('');
    setFormPdfName('');
    setFormPdfSize('');
    setFormImageBlob('');
    setFormImageName('');
    setFormImageSize('');
    setScreen('add');
  };

  // Open Edit Form prefilled
  const openEditForm = (stay: AccommodationStay) => {
    setReturnScreen(screen);
    setSelectedStayId(stay.id);
    setFormStayType(stay.stayType);
    setFormName(stay.name);
    setFormCity(stay.city || '');
    setFormMapsUrl((stay as any).mapsUrl || (stay as any).exactLocation || '');
    setFormAddress(stay.address || '');
    setFormCheckinDate(stay.checkinDate || '2026-11-18');
    setFormCheckoutDate(stay.checkoutDate || '2026-11-19');
    setFormNights(stay.nightsCount || 1);
    setFormPersons(stay.capacityPersons || 1);
    setFormCost(stay.totalAmount || stay.estimatedCost ? String(stay.totalAmount || stay.estimatedCost) : '');
    setFormPaymentMethod(stay.paymentMethod || 'UPI');
    setFormPhone(stay.contactPhone || '');
    setFormNotes(stay.notes || '');
    setFormBookingStatus(
      (stay.bookingStatus as string) || (stay.status as string) || 'Needs research'
    );
    setFormBookingReference(stay.bookingReference || stay.bookingId || '');
    setFormDayId(stay.dayId || '');

    const pdfBlob = (stay as any).pdfBlob || stay.documentUrl || '';
    const pdfName = (stay as any).pdfFileName || stay.documentName || '';
    const pdfSize = (stay as any).pdfFileSize || stay.documentSize || '';
    setFormPdfBlob(pdfBlob);
    setFormPdfName(pdfName);
    setFormPdfSize(pdfSize);
    setFormDocumentUrl(pdfBlob);
    setFormDocumentName(pdfName);
    setFormDocumentSize(pdfSize);

    const imgBlob = (stay as any).imageBlob || (stay.imageUrl && !stay.imageUrl.startsWith('/images/shirdi-dharamshala.jpg') ? stay.imageUrl : '');
    const imgName = (stay as any).imageFileName || '';
    const imgSize = (stay as any).imageFileSize || '';
    setFormImageBlob(imgBlob);
    setFormImageName(imgName);
    setFormImageSize(imgSize);

    setScreen('edit');
  };

  // Open Stay Details
  const openStayDetails = (stay: AccommodationStay) => {
    setReturnScreen(screen);
    setSelectedStayId(stay.id);
    setScreen('details');
  };

  const handleViewStayDocument = (stay: AccommodationStay) => {
    setChooserStay(stay);
  };

  const handleSelectStayViewerMode = (mode: 'image' | 'pdf', stay: AccommodationStay) => {
    setChooserStay(null);
    setStayViewerMode(mode);
    const attached = stay.attachedDocuments?.[0];
    const url = mode === 'pdf'
      ? ((stay as any).pdfBlob || stay.documentUrl || attached?.fileUrl || '')
      : ((stay as any).imageBlob || (stay.imageUrl && !stay.imageUrl.startsWith('/images/shirdi-dharamshala.jpg') ? stay.imageUrl : ''));

    setViewingDoc({
      id: stay.id,
      title: stay.name,
      fileName: mode === 'pdf'
        ? ((stay as any).pdfFileName || stay.documentName || attached?.fileName || `${stay.name.replace(/\s+/g, '_')}_voucher.pdf`)
        : ((stay as any).imageFileName || `${stay.name.replace(/\s+/g, '_')}_photo.jpg`),
      fileSize: mode === 'pdf' ? ((stay as any).pdfFileSize || stay.documentSize) : (stay as any).imageFileSize,
      pdfBlob: (stay as any).pdfBlob || stay.documentUrl,
      pdfUrl: (stay as any).pdfUrl || stay.documentUrl,
      pdfFileName: (stay as any).pdfFileName || stay.documentName,
      pdfFileSize: (stay as any).pdfFileSize || stay.documentSize,
      imageBlob: (stay as any).imageBlob,
      imageUrl: stay.imageUrl,
      imageFileName: (stay as any).imageFileName,
      imageFileSize: (stay as any).imageFileSize,
      blobData: url,
      downloadUrl: url,
      docType: stay.stayType || 'Accommodation Voucher',
      stayType: stay.stayType,
      name: stay.name,
      bookingRef: stay.bookingReference || 'PILGRIM-CONFIRMED',
      travelDate: stay.checkinDate,
      notes: stay.notes || `Pilgrimage stay at ${stay.name}, ${stay.city}. Stay type: ${stay.stayType}. Tariff: ₹${stay.estimatedCost || 0}.`,
    });
  };

  const handleAttachStayFile = async (type: 'image' | 'pdf', fileData: string, fileName: string, fileSize: number) => {
    const targetStayId = chooserStay?.id || viewingDoc?.id || selectedStay?.id;
    if (!targetStayId) return;
    const targetStay = displayStays.find(s => s.id === targetStayId) || selectedStay;
    if (!targetStay) return;

    const formattedSize = `${(fileSize / 1024).toFixed(1)} KB`;
    const updatedStay: AccommodationStay = {
      ...targetStay,
      ...(type === 'pdf' ? {
        pdfBlob: fileData,
        pdfFileName: fileName,
        pdfFileSize: formattedSize,
        documentUrl: fileData,
        documentName: fileName,
        documentSize: formattedSize,
        documentType: 'application/pdf',
      } : {
        imageBlob: fileData,
        imageUrl: fileData,
        imageFileName: fileName,
        imageFileSize: formattedSize,
      }),
      updatedAt: new Date().toISOString(),
    };

    if (onSaveStay) {
      await onSaveStay(updatedStay);
    }
    if (chooserStay && chooserStay.id === targetStayId) {
      setChooserStay(updatedStay);
    }
    if (viewingDoc && viewingDoc.id === targetStayId) {
      setViewingDoc((prev: any) => ({
        ...prev,
        ...(type === 'pdf' ? {
          pdfBlob: fileData,
          pdfFileName: fileName,
          pdfFileSize: formattedSize,
        } : {
          imageBlob: fileData,
          imageUrl: fileData,
          imageFileName: fileName,
          imageFileSize: formattedSize,
        }),
        blobData: fileData,
      }));
    }
    showToast(`${type === 'pdf' ? 'PDF voucher' : 'Stay photo'} attached successfully`);
  };

  // Submit Save
  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setAlertMessage('Please enter an accommodation stay name.');
      return;
    }

    const hasBookingRef = Boolean(formBookingReference.trim());
    const isExplicitlyBooked = formBookingStatus === 'Booked' || formBookingStatus === 'Confirmed';
    const isBooked = isExplicitlyBooked || hasBookingRef;

    // Respect the user's chosen booking status directly (Task 9)
    const resolvedStatus = formBookingStatus && formBookingStatus.trim() !== ''
      ? formBookingStatus
      : (hasBookingRef ? 'Booked' : 'Needs research');

    const targetStayId = screen === 'edit' ? (selectedStay?.id || selectedStayId) : undefined;
    const parsedCost = formCost ? parseFloat(formCost) : 0;
    const validCost = !isNaN(parsedCost) && parsedCost > 0 ? parsedCost : 0;

    const payload: Partial<AccommodationStay> = {
      id: targetStayId,
      name: formName.trim(),
      stayType: formStayType,
      city: formCity.trim() || 'Shirdi',
      address: formAddress.trim() || undefined,
      mapsUrl: formMapsUrl.trim() || undefined,
      exactLocation: formMapsUrl.trim() || undefined,
      checkinDate: formCheckinDate || undefined,
      checkoutDate: formCheckoutDate || undefined,
      checkInTime: formCheckinDate ? `${formCheckinDate} (Standard: 12:00 PM)` : undefined,
      checkOutTime: formCheckoutDate ? `${formCheckoutDate} (Standard: 11:00 AM)` : undefined,
      nightsCount: formNights > 0 ? formNights : 1,
      capacityPersons: formPersons > 0 ? formPersons : 1,
      estimatedCost: validCost,
      totalAmount: validCost,
      paymentMethod: formPaymentMethod || 'UPI',
      advancePaid: isBooked && validCost > 0 ? (selectedStay?.advancePaid || 0) : 0,
      balanceDue: validCost,
      contactPhone: formPhone.trim() || undefined,
      notes: formNotes.trim() || undefined,
      bookingStatus: resolvedStatus as any,
      status: resolvedStatus as any,
      bookingReference: formBookingReference.trim() || undefined,
      bookingId: formBookingReference.trim() || undefined,
      bookingDate: isBooked ? (selectedStay?.bookingDate || 'Recorded by traveller') : undefined,
      bookedFrom: isBooked ? (selectedStay?.bookedFrom || 'Official Portal / Counter') : undefined,
      dayId: formDayId || undefined,
      documentUrl: formPdfBlob || formDocumentUrl || undefined,
      documentName: formPdfName || formDocumentName || undefined,
      documentSize: formPdfSize || formDocumentSize || undefined,
      pdfBlob: formPdfBlob || undefined,
      pdfFileName: formPdfName || formDocumentName || undefined,
      pdfFileSize: formPdfSize || formDocumentSize || undefined,
      imageBlob: formImageBlob || (selectedStay as any)?.imageBlob || undefined,
      imageFileName: formImageName || (selectedStay as any)?.imageFileName || undefined,
      imageFileSize: formImageSize || (selectedStay as any)?.imageFileSize || undefined,
      imageUrl:
        formImageBlob ||
        (selectedStay as any)?.imageBlob ||
        (selectedStay?.imageUrl && !selectedStay.imageUrl.startsWith('/images/shirdi-dharamshala.jpg')
          ? selectedStay.imageUrl
          : formStayType === 'Hotel' || formStayType === 'Budget Hotel'
          ? '/images/shirdi-room.jpg'
          : '/images/shirdi-dharamshala.jpg'),
    } as any;

    if (onSaveStay) {
      await onSaveStay(payload);
    }
    showToast(screen === 'edit' ? 'Accommodation updated!' : 'Accommodation saved!');
    if (screen === 'edit' && targetStayId) {
      setSelectedStayId(targetStayId);
    }
    setScreen(returnScreen || 'overview');
  };

  // Delete stay
  const handleDeleteStay = async () => {
    if (!selectedStay) return;
    const stayId = selectedStay.id;
    if (onDeleteStay) {
      await onDeleteStay(stayId);
    }
    const remaining = displayStays.filter(s => s.id !== stayId);
    if (remaining.length > 0) {
      setSelectedStayId(remaining[0].id);
    } else {
      setSelectedStayId('');
    }
    showToast('Accommodation deleted');
    setScreen('overview');
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Hidden File Picker Input for Stay Documents (Task 10) */}
      <input
        ref={docFileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleAccommodationDocChange}
      />

      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gray-900/95 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg backdrop-blur-md flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 1: ACCOMMODATION OVERVIEW                                          */}
      {/* ========================================================================= */}
      {screen === 'overview' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Header Title Bar */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider mb-1 max-w-full">
                <BedDouble className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="truncate">PILGRIMAGE STAYS · 19 DAYS</span>
                <span className="text-emerald-300 hidden xs:inline">|</span>
                <span className="text-emerald-900 font-black hidden xs:inline">{totalStaysCount} PLANNED</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-tight flex items-center gap-1.5">
                <span>Accommodation</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </h1>
              <p className="text-xs text-gray-500 font-medium truncate">All your stays in one place</p>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                onClick={() => setScreen('map')}
                className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white border border-gray-200 text-gray-600 hover:text-[#0F5B44] hover:bg-emerald-50 transition-all card-press-3d shadow-2xs"
                title="View Map"
              >
                <MapIcon className="w-4 h-4 text-[#0F5B44]" />
              </button>
              <button
                onClick={() => setScreen('settings')}
                className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white border border-gray-200 text-gray-600 hover:text-[#0F5B44] hover:bg-emerald-50 transition-all card-press-3d shadow-2xs"
                title="Accommodation Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={openAddForm}
                className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-950/25 hover:shadow-lg transition-all card-press-3d inline-flex items-center gap-1 shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Add Stay</span>
              </button>
            </div>
          </div>

          {/* 4 Stat Cards (4-columns 3D Glass strip) */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
            {/* Total Stays */}
            <div
              onClick={() => {
                setListFilter('All');
                setScreen('list');
              }}
              className="glass-card card-3d p-2 sm:p-3 rounded-2xl sm:rounded-3xl border border-white/80 shadow-[0_8px_20px_-4px_rgba(15,91,68,0.08)] text-center cursor-pointer hover:border-emerald-200 transition-all card-press-3d relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <div className="w-7 h-7 sm:w-9 sm:h-9 mx-auto rounded-xl bg-gradient-to-tr from-emerald-50 to-teal-50 text-[#0F5B44] border border-emerald-200/50 flex items-center justify-center mb-1 shadow-2xs">
                <BedDouble className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
              </div>
              <div className="text-sm sm:text-base font-black text-gray-900 leading-none">
                {totalStaysCount}
              </div>
              <div className="text-[8.5px] sm:text-[10px] text-gray-500 font-bold mt-0.5 leading-tight truncate">
                Total Stays
              </div>
            </div>

            {/* Dharamshalas */}
            <div
              onClick={() => {
                setListFilter('Dharamshala');
                setScreen('list');
              }}
              className="glass-card card-3d p-2 sm:p-3 rounded-2xl sm:rounded-3xl border border-white/80 shadow-[0_8px_20px_-4px_rgba(15,91,68,0.08)] text-center cursor-pointer hover:border-sky-200 transition-all card-press-3d relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-cyan-500" />
              <div className="w-7 h-7 sm:w-9 sm:h-9 mx-auto rounded-xl bg-gradient-to-tr from-sky-50 to-cyan-50 text-sky-700 border border-sky-200/50 flex items-center justify-center mb-1 shadow-2xs">
                <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
              </div>
              <div className="text-sm sm:text-base font-black text-gray-900 leading-none">
                {dharamshalaCount}
              </div>
              <div className="text-[8px] sm:text-[10px] text-gray-500 font-bold mt-0.5 leading-tight tracking-tight">
                <span className="sm:hidden">Dharamshala</span>
                <span className="hidden sm:inline">Dharamshalas</span>
              </div>
            </div>

            {/* Hotels */}
            <div
              onClick={() => {
                setListFilter('Hotel');
                setScreen('list');
              }}
              className="glass-card card-3d p-2 sm:p-3 rounded-2xl sm:rounded-3xl border border-white/80 shadow-[0_8px_20px_-4px_rgba(15,91,68,0.08)] text-center cursor-pointer hover:border-amber-200 transition-all card-press-3d relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
              <div className="w-7 h-7 sm:w-9 sm:h-9 mx-auto rounded-xl bg-gradient-to-tr from-amber-50 to-orange-50 text-amber-700 border border-amber-200/50 flex items-center justify-center mb-1 shadow-2xs">
                <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
              </div>
              <div className="text-sm sm:text-base font-black text-gray-900 leading-none">
                {hotelCount}
              </div>
              <div className="text-[8.5px] sm:text-[10px] text-gray-500 font-bold mt-0.5 leading-tight">
                Hotels
              </div>
            </div>

            {/* Others / Ashrams */}
            <div
              onClick={() => {
                setListFilter('Other');
                setScreen('list');
              }}
              className="glass-card card-3d p-2 sm:p-3 rounded-2xl sm:rounded-3xl border border-white/80 shadow-[0_8px_20px_-4px_rgba(15,91,68,0.08)] text-center cursor-pointer hover:border-purple-200 transition-all card-press-3d relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-violet-500" />
              <div className="w-7 h-7 sm:w-9 sm:h-9 mx-auto rounded-xl bg-gradient-to-tr from-purple-50 to-violet-50 text-purple-700 border border-purple-200/50 flex items-center justify-center mb-1 shadow-2xs">
                <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
              </div>
              <div className="text-sm sm:text-base font-black text-gray-900 leading-none">
                {otherCount}
              </div>
              <div className="text-[8.5px] sm:text-[10px] text-gray-500 font-bold mt-0.5 leading-tight">
                Others
              </div>
            </div>
          </div>

          {/* 19-Day Pilgrim Route Milestone Track (Horizontal Ribbon) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Milestone className="w-4 h-4 text-[#0F5B44]" />
                <h3 className="text-xs sm:text-sm font-black text-gray-900 tracking-tight uppercase">
                  19-Day Pilgrim Route Track
                </h3>
              </div>
              <span className="text-[10px] font-bold text-[#0F5B44] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                11 Sacred Stops
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {displayStays.map((stay, idx) => {
                const isSelected = selectedStay?.id === stay.id;
                const matchedDay = days.find(d => d.id === stay.dayId);
                const dayLabel = matchedDay ? `D${matchedDay.dayNumber}` : `S${idx + 1}`;
                return (
                  <button
                    key={stay.id}
                    onClick={() => {
                      setReturnScreen('overview');
                      setSelectedStayId(stay.id);
                      setScreen('details');
                    }}
                    className={`flex-shrink-0 px-3 py-2 rounded-2xl border transition-all text-left flex items-center gap-2.5 card-press-3d ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white border-emerald-600 shadow-md shadow-emerald-950/20'
                        : 'glass-card text-gray-800 border-white/80 hover:border-emerald-300 shadow-xs'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black border ${
                        isSelected
                          ? 'bg-white/20 text-white border-white/30'
                          : 'bg-emerald-50 text-[#0F5B44] border-emerald-200'
                      }`}
                    >
                      {dayLabel}
                    </div>
                    <div className="min-w-0 pr-1">
                      <div className="text-[11px] font-bold truncate max-w-[100px]">
                        {stay.city}
                      </div>
                      <div
                        className={`text-[9px] font-semibold truncate max-w-[100px] ${
                          isSelected ? 'text-emerald-100' : 'text-gray-400'
                        }`}
                      >
                        {stay.stayType}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Upcoming Stay Card - 3D Boarding Pass / Stay Voucher Design */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-bold text-gray-900">
                Upcoming Stay
              </h3>
              <button
                onClick={() => {
                  setListFilter('All');
                  setScreen('list');
                }}
                className="text-xs font-bold text-[#0F5B44] hover:underline inline-flex items-center gap-0.5"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {selectedStay ? (
              <div
                onClick={() => openStayDetails(selectedStay)}
                className="relative overflow-hidden rounded-3xl p-4 sm:p-5 border border-emerald-200/90 shadow-[0_16px_40px_-8px_rgba(15,91,68,0.16)] bg-gradient-to-b from-white via-[#fcfefd] to-[#f4f9f6] cursor-pointer hover:border-emerald-400 transition-all card-press-3d group space-y-3.5"
              >
                {/* Perforated ticket circular notches */}
                <div className="absolute -left-2.5 top-[62%] -translate-y-1/2 w-5 h-5 rounded-full bg-slate-100 border border-emerald-200/80 shadow-inner pointer-events-none z-10" />
                <div className="absolute -right-2.5 top-[62%] -translate-y-1/2 w-5 h-5 rounded-full bg-slate-100 border border-emerald-200/80 shadow-inner pointer-events-none z-10" />

                {/* 1. Header Bar: Service Type & Total Tariff Badge */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0F5B44] via-[#146b51] to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-950/20 ring-2 ring-emerald-200/50">
                      <BedDouble className="w-5 h-5 stroke-[2.3]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black uppercase tracking-wider text-emerald-950">
                          Pilgrimage Stay Voucher
                        </span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] font-bold text-gray-500">
                          {selectedStay.bookingReference ? `REF: ${selectedStay.bookingReference}` : `Stay #${selectedStayIndex + 1} of ${displayStays.length}`}
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.2 rounded-full bg-emerald-100/90 text-emerald-900 border border-emerald-300/80 uppercase">
                          {selectedStay.bookingStatus || selectedStay.status || 'Confirmed'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tariff & Payment Method */}
                  <div className="text-right">
                    <div className="text-base sm:text-lg font-black text-[#0F5B44] bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-1 rounded-xl border border-emerald-200/90 shadow-2xs inline-flex items-center gap-1.5">
                      <span>
                        {selectedStay.totalAmount || selectedStay.estimatedCost
                          ? formatRupee(selectedStay.totalAmount || selectedStay.estimatedCost!)
                          : 'Tariff Unverified'}
                      </span>
                    </div>
                    <div className="text-[10px] font-bold text-gray-500 mt-0.5">
                      Paid via {selectedStay.paymentMethod || 'UPI'}
                    </div>
                  </div>
                </div>

                {/* 2. Golden Banner: Stay Name & City */}
                <div className="bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-teal-500/15 border border-amber-200/80 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-white font-mono font-black text-xs shadow-2xs shrink-0">
                      {selectedStay.stayType}
                    </span>
                    <h4 className="text-xs sm:text-sm font-black text-gray-900 truncate">
                      {selectedStay.name}
                    </h4>
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-emerald-900 bg-white/80 px-2.5 py-0.5 rounded-lg border border-emerald-200/60 shrink-0 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#0F5B44]" />
                    <span>{selectedStay.city || 'Shirdi'}</span>
                  </span>
                </div>

                {/* 3. Stay Duration & Schedule (Check-in -> Check-out) */}
                <div className="grid grid-cols-3 gap-2 items-center text-center py-1">
                  <div className="text-left">
                    <div className="flex items-center gap-1">
                      <span className="text-sm sm:text-base font-black text-gray-900 leading-none">12:00 PM</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800">IN</span>
                    </div>
                    <div className="text-[11px] font-black text-gray-800 mt-1 truncate">
                      {selectedStay.checkinDate || '18 Nov 2026'}
                    </div>
                    <div className="text-[9px] text-gray-500 font-medium">Check-in Date</div>
                  </div>

                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shadow-2xs">
                      {selectedStay.nightsCount || 1} Night Stay
                    </span>
                    <div className="w-full flex items-center gap-1 my-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-600" />
                      <div className="flex-1 h-0.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
                      <div className="w-2 h-2 rounded-full bg-emerald-600" />
                    </div>
                    <span className="text-[9px] font-bold text-gray-500">Reserved Pilgrim Stay</span>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-sm sm:text-base font-black text-gray-900 leading-none">11:00 AM</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-teal-100 text-teal-800">OUT</span>
                    </div>
                    <div className="text-[11px] font-black text-gray-800 mt-1 truncate">
                      {selectedStay.checkoutDate || '19 Nov 2026'}
                    </div>
                    <div className="text-[9px] text-gray-500 font-medium">Check-out Date</div>
                  </div>
                </div>

                {/* 4. Specs Grid: Capacity, Status, and Storage */}
                <div className="bg-emerald-50/50 rounded-2xl p-2.5 border border-emerald-100 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <span className="text-[9px] text-gray-500 font-bold uppercase block">Capacity</span>
                    <span className="font-black text-gray-900 text-[11px]">
                      {selectedStay.capacityPersons || 1} {selectedStay.capacityPersons === 1 ? 'Person (Solo)' : 'Persons'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-500 font-bold uppercase block">Type & Quota</span>
                    <span className="font-black text-emerald-900 text-[11px] truncate block">
                      {selectedStay.stayType}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-500 font-bold uppercase block">Storage</span>
                    <span className="font-black text-emerald-800 text-[11px] inline-flex items-center gap-1 justify-center">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Offline Safe</span>
                    </span>
                  </div>
                </div>

                {/* 5. Perforation Tear Line */}
                <div className="relative pt-2">
                  <div className="border-b-2 border-dashed border-emerald-200/80 -mx-4 sm:-mx-5" />
                </div>

                {/* 6. Action Strip matching TicketPassCard */}
                <div className="flex items-center justify-between gap-2 pt-1 flex-wrap" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1 font-mono text-[10px] text-gray-400">
                    <span className="tracking-widest">||||||||||||||||</span>
                    <span className="font-bold text-gray-500">PILGRIM-STAY</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewStayDocument(selectedStay);
                      }}
                      className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0F5B44] to-teal-700 text-white text-[11px] font-bold inline-flex items-center gap-1 shadow-2xs hover:shadow-xs card-press-3d cursor-pointer"
                      title="View Stay Document / Voucher"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>

                    {((selectedStay as any).mapsUrl || (selectedStay as any).exactLocation || selectedStay.city) && (
                      <a
                        href={
                          (selectedStay as any).mapsUrl?.startsWith('http')
                            ? (selectedStay as any).mapsUrl
                            : `https://maps.google.com/?q=${encodeURIComponent(`${selectedStay.name} ${selectedStay.city || ''}`)}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 text-gray-700 hover:text-[#0F5B44] text-[11px] font-bold inline-flex items-center gap-1 shadow-2xs card-press-3d cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Map</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => openEditForm(selectedStay)}
                      className="p-1.5 rounded-xl bg-white border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 text-[#0F5B44] shadow-2xs card-press-3d"
                      title="Edit Stay"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowDeleteStayConfirm(true)}
                      className="p-1.5 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 shadow-2xs card-press-3d"
                      title="Delete Stay"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card p-6 rounded-3xl text-center border border-white/80 text-gray-500 text-xs shadow-xs">
                No upcoming stay scheduled.
              </div>
            )}
          </div>

          {/* Quick Actions (4-buttons Grid) */}
          <div className="space-y-2">
            <h3 className="text-sm sm:text-base font-bold text-gray-900">
              Quick Actions
            </h3>

            <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
              {/* Add Stay */}
              <button
                onClick={openAddForm}
                className="glass-card card-3d p-3 rounded-2xl border border-white/80 shadow-xs flex flex-col items-center justify-center gap-1.5 text-center hover:border-emerald-200 transition-all card-press-3d"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-50 to-teal-50 text-[#0F5B44] border border-emerald-200/50 flex items-center justify-center shadow-2xs">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <span className="text-[11px] font-bold text-gray-800">Add Stay</span>
              </button>

              {/* Find Nearby */}
              <button
                onClick={() => setScreen('nearby')}
                className="glass-card card-3d p-3 rounded-2xl border border-white/80 shadow-xs flex flex-col items-center justify-center gap-1.5 text-center hover:border-sky-200 transition-all card-press-3d"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-50 to-cyan-50 text-sky-700 border border-sky-200/50 flex items-center justify-center shadow-2xs">
                  <Compass className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[11px] font-bold text-gray-800">Find Nearby</span>
              </button>

              {/* View on Map */}
              <button
                onClick={() => setScreen('map')}
                className="glass-card card-3d p-3 rounded-2xl border border-white/80 shadow-xs flex flex-col items-center justify-center gap-1.5 text-center hover:border-amber-200 transition-all card-press-3d"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-50 to-orange-50 text-amber-700 border border-amber-200/50 flex items-center justify-center shadow-2xs">
                  <MapIcon className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[11px] font-bold text-gray-800">View on Map</span>
              </button>

              {/* My Bookings */}
              <button
                onClick={() => {
                  if (selectedStay) {
                    setScreen('booking');
                  } else {
                    setScreen('list');
                  }
                }}
                className="glass-card card-3d p-3 rounded-2xl border border-white/80 shadow-xs flex flex-col items-center justify-center gap-1.5 text-center hover:border-purple-200 transition-all card-press-3d"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-50 to-violet-50 text-purple-700 border border-purple-200/50 flex items-center justify-center shadow-2xs">
                  <Calendar className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[11px] font-bold text-gray-800">My Bookings</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 2: ACCOMMODATION LIST (ALL STAYS)                                  */}
      {/* ========================================================================= */}
      {screen === 'list' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          {/* Header Bar */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setScreen('overview')}
                className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 shadow-xs"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
              </button>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 leading-none">
                  All Stays
                </h2>
                <p className="text-[11px] sm:text-xs text-gray-500 font-medium mt-1">
                  {filteredStays.length} stays · 17 Nov – 5 Dec 2026
                </p>
              </div>
            </div>

            <button
              onClick={openAddForm}
              className="w-8 h-8 rounded-full bg-[#0F5B44] text-white flex items-center justify-center hover:bg-[#0c4936] shadow-xs"
              title="Add Stay"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Search Input Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={listSearch}
              onChange={e => setListSearch(e.target.value)}
              placeholder="Search stays, places or hotels..."
              className="w-full pl-9 pr-4 py-2 bg-white rounded-2xl border border-gray-200 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#0F5B44] transition-all"
            />
            {listSearch && (
              <button
                onClick={() => setListSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {['All', 'Dharamshala', 'Hotel', 'Guest House', 'Other'].map(type => (
              <button
                key={type}
                onClick={() => setListFilter(type)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap card-press-3d ${
                  listFilter === type
                    ? 'bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white shadow-md shadow-emerald-950/20 ring-1 ring-emerald-300/40'
                    : 'glass-card text-gray-700 border border-white/80 hover:bg-emerald-50/60'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Grouped Date Cards matching Reference Screen 2 */}
          <div className="space-y-3 pt-1">
            {filteredStays.length === 0 ? (
              <div className="glass-card card-3d p-8 rounded-3xl text-center border border-white/80 shadow-[0_10px_25px_-6px_rgba(15,91,68,0.08)] space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-50 to-teal-50 text-[#0F5B44] border border-emerald-200/50 flex items-center justify-center shadow-2xs">
                  <BedDouble className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">No Accommodation Found</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                    {listSearch
                      ? `No stays matching "${listSearch}". Try another search term.`
                      : 'No accommodation entries found for this filter. Plan low-cost dharamshalas or temple stays.'}
                  </p>
                </div>
                <button
                  onClick={openAddForm}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0F5B44] to-teal-700 text-white text-xs font-bold hover:shadow-md transition-all inline-flex items-center gap-1.5 shadow-xs card-press-3d"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Stay / Dharamshala</span>
                </button>
              </div>
            ) : (
              [...filteredStays]
                .sort((a, b) => (a.checkinDate || '').localeCompare(b.checkinDate || ''))
                .map(stay => {
                  const matchedDay = days.find(d => d.id === stay.dayId);
                  const badge = getAccommodationStatusBadgeClass(
                    stay.bookingStatus || stay.status
                  );
                  return (
                    <div key={stay.id} className="space-y-1.5">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-black text-emerald-950 tracking-tight">
                          {stay.checkinDate ? `${stay.checkinDate}` : 'Dates to be verified'}
                        </span>
                        {matchedDay ? (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              if (onSelectDayIndex) onSelectDayIndex(matchedDay.dayNumber - 1);
                            }}
                            className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50/80 text-[#0F5B44] border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1 shadow-2xs"
                            title={`Jump to Day ${matchedDay.dayNumber} in Itinerary`}
                          >
                            <Calendar className="w-3 h-3" />
                            <span>Day {matchedDay.dayNumber}: {matchedDay.location || matchedDay.title}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-400 font-medium">
                            {stay.stayType}
                          </span>
                        )}
                      </div>

                      <div
                        onClick={() => openStayDetails(stay)}
                        className="glass-card card-3d p-3 sm:p-3.5 rounded-2xl border border-white/90 shadow-[0_8px_20px_-4px_rgba(15,91,68,0.08)] flex items-center justify-between gap-3 cursor-pointer hover:border-emerald-200 transition-all card-press-3d"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={stay.imageUrl || '/images/shirdi-dharamshala.jpg'}
                            alt={stay.name}
                            onError={(e) => { e.currentTarget.src = '/images/shirdi-dharamshala.jpg'; }}
                            className="w-12 h-12 rounded-xl object-cover border border-white/60 shadow-xs flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                              {stay.name}
                            </h4>
                            <p className="text-[11px] text-gray-500 truncate mt-0.5 font-medium">
                              {stay.city}
                              {stay.totalAmount || stay.estimatedCost
                                ? ` · ${formatRupee(stay.totalAmount || stay.estimatedCost!)}`
                                : ' · Tariff unverified'}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {stay.nightsCount || 1} night · {stay.capacityPersons || 1} person
                              {stay.capacityPersons === 1 ? ' (Solo)' : 's'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.badgeClass} shadow-2xs`}
                          >
                            {badge.label}
                          </span>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              openEditForm(stay);
                            }}
                            className="w-7 h-7 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 3: ADD ACCOMMODATION                                               */}
      {/* ========================================================================= */}
      {screen === 'add' && (
        <form onSubmit={handleSaveSubmit} className="space-y-4 animate-in fade-in duration-150 pb-16">
          <div className="flex items-center gap-2.5 pt-0.5">
            <button
              type="button"
              onClick={() => setScreen(returnScreen || 'overview')}
              className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 shadow-xs"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
            </button>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-gray-900 leading-none">
                Add Accommodation
              </h2>
              <p className="text-[11px] sm:text-xs text-gray-500 font-medium mt-1">
                Add a new stay or booking
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs space-y-3.5">
            {/* Solo Traveller Pilgrimage Note */}
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#0F5B44] flex-shrink-0 mt-0.5" />
              <div className="text-[11px] text-gray-600 leading-relaxed">
                <span className="font-bold text-[#0F5B44]">Solo Pilgrimage Preference:</span> Prefer dharamshalas, ashrams, and suitable low-cost pilgrim accommodations. Night train berths help save room nights.
              </div>
            </div>

            {/* Stay Type */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                Stay Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['Dharamshala', 'Hotel', 'Guest House', 'Other'] as StayType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormStayType(t)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center ${
                      formStayType === t
                        ? 'bg-[#0F5B44] text-white shadow-xs'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Stay Name */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Stay Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="e.g. Sai Ashram or MTDC Pilgrim Resort"
                className="w-full px-3.5 py-2.5 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0F5B44]"
              />
            </div>

            {/* Location / City & Exact Geo-Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Location / City (Optional)
                </label>
                <input
                  type="text"
                  value={formCity}
                  onChange={e => setFormCity(e.target.value)}
                  placeholder="e.g. Shirdi"
                  className="w-full px-3.5 py-2.5 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0F5B44]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Exact Geo-Location / Google Maps Link (Optional)
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formMapsUrl}
                    onChange={e => setFormMapsUrl(e.target.value)}
                    placeholder="e.g. https://maps.app.goo.gl/... or 19.7665, 74.4765"
                    className="w-full pl-8 pr-3 py-2.5 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0F5B44]"
                  />
                </div>
              </div>
            </div>

            {/* Related Itinerary Day */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Related Itinerary Day
              </label>
              <select
                value={formDayId}
                onChange={e => setFormDayId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0F5B44]"
              >
                <option value="">General (Not day-specific)</option>
                {days.map(d => (
                  <option key={d.id} value={d.id}>
                    Day {d.dayNumber}: {d.title} ({d.date})
                  </option>
                ))}
              </select>
            </div>

            {/* Booking Status & Booking Reference */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black text-gray-800">
                    Booking Status
                  </label>
                  <span className="text-[10px] font-bold text-[#0F5B44] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Selected: {formBookingStatus}
                  </span>
                </div>

                {/* 3D Tactile Status Selection Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2">
                  {[
                    { val: 'Needs research', label: 'Needs research' },
                    { val: 'Option identified', label: 'Option identified' },
                    { val: 'Booking pending', label: 'Booking pending' },
                    { val: 'Booked', label: 'Booked' },
                    { val: 'Checked in', label: 'Checked in' },
                    { val: 'Completed or checked out', label: 'Completed' },
                    { val: 'Not selected', label: 'Not selected' },
                  ].map(item => {
                    const isSelected =
                      formBookingStatus === item.val ||
                      (item.val === 'Booked' && formBookingStatus === 'Confirmed') ||
                      (item.val === 'Completed or checked out' && formBookingStatus === 'Completed');
                    return (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setFormBookingStatus(item.val)}
                        className={`p-2 rounded-xl text-left border text-xs font-bold transition-all card-press-3d flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#0F5B44] text-white border-[#0F5B44] shadow-sm ring-2 ring-emerald-400/40'
                            : 'bg-gray-50/80 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] shrink-0 text-white" />}
                      </button>
                    );
                  })}
                </div>

                <select
                  value={formBookingStatus}
                  onChange={e => setFormBookingStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0F5B44] font-medium"
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
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Booking Reference / ID (Optional)
                </label>
                <input
                  type="text"
                  value={formBookingReference}
                  onChange={e => setFormBookingReference(e.target.value)}
                  placeholder="e.g. BKG-10293 (only if genuinely booked)"
                  className="w-full px-3.5 py-2.5 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0F5B44]"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Address (Optional, only if verified)
              </label>
              <input
                type="text"
                value={formAddress}
                onChange={e => setFormAddress(e.target.value)}
                placeholder="Enter verified address or landmark"
                className="w-full px-3.5 py-2.5 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0F5B44]"
              />
            </div>

            {/* Dates (2 columns) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Check-in Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    required
                    value={formCheckinDate}
                    onChange={e => setFormCheckinDate(e.target.value)}
                    className="w-full pl-8 pr-2 py-2 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0F5B44]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Check-out Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    required
                    value={formCheckoutDate}
                    onChange={e => setFormCheckoutDate(e.target.value)}
                    className="w-full pl-8 pr-2 py-2 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0F5B44]"
                  />
                </div>
              </div>
            </div>

            {/* No. of Nights & Persons (2 columns) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  No. of Nights
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={formNights}
                  onChange={e => setFormNights(parseInt(e.target.value) || 1)}
                  className="w-full px-3.5 py-2 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0F5B44]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  No. of Persons (Solo = 1)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formPersons}
                  onChange={e => setFormPersons(parseInt(e.target.value) || 1)}
                  className="w-full px-3.5 py-2 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0F5B44]"
                />
              </div>
            </div>

            {/* Total Estimated Cost & Payment Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Total Cost (₹, optional)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formCost}
                  onChange={e => setFormCost(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full px-3.5 py-2.5 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0F5B44] font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Payment Mode
                </label>
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

            {/* Contact Phone */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Contact Phone (Optional)
              </label>
              <input
                type="tel"
                value={formPhone}
                onChange={e => setFormPhone(e.target.value)}
                placeholder="Only verified trust phone"
                className="w-full px-3.5 py-2.5 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0F5B44]"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Booking Notes / Temple Proximity
              </label>
              <textarea
                rows={2}
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder="Close to temple gate, check-in rules, dharamshala counter timings..."
                className="w-full px-3.5 py-2 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0F5B44]"
              />
            </div>

            {/* Dual Attachment Section: Stay Voucher (PDF) & Stay Photo / Slip (Image) */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <span className="sr-only">Attach Documents / Booking Voucher</span>
              
              {/* 1. Official Stay Voucher (PDF) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-teal-700" />
                    <span>Official Stay Voucher (PDF)</span>
                  </label>
                  {(formPdfName || formDocumentName) && (
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                      PDF Attached
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  ref={stayPdfInputRef}
                  onChange={handleStayPdfChange}
                  accept="application/pdf"
                  className="hidden"
                />
                {(formPdfName || formDocumentName) ? (
                  <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-white text-teal-700 border border-teal-200 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-gray-900 truncate block">
                          {formPdfName || formDocumentName}
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium block">
                          {formPdfSize || formDocumentSize || 'Official Voucher PDF'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => stayPdfInputRef.current?.click()}
                        className="px-2.5 py-1 rounded-xl bg-white border border-teal-300 text-xs font-bold text-teal-800 hover:bg-teal-50 card-press-3d cursor-pointer"
                      >
                        Change Voucher
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormPdfName('');
                          setFormPdfSize('');
                          setFormPdfBlob('');
                          setFormDocumentName('');
                          setFormDocumentSize('');
                          setFormDocumentUrl('');
                        }}
                        className="w-7 h-7 rounded-full bg-white text-rose-600 border border-rose-200 flex items-center justify-center hover:bg-rose-50 cursor-pointer"
                        title="Remove voucher"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => stayPdfInputRef.current?.click()}
                    className="w-full py-3 px-4 rounded-2xl bg-white border-2 border-dashed border-teal-300 hover:border-teal-600 hover:bg-teal-50/40 text-teal-800 text-xs font-bold flex items-center justify-center gap-2 transition-all card-press-3d cursor-pointer"
                  >
                    <Upload className="w-4 h-4 stroke-[2.3]" />
                    <span>Attach Official Stay Voucher (PDF)</span>
                  </button>
                )}
              </div>

              {/* 2. Stay Photo / Check-in Slip (Image) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-700" />
                    <span>Stay Photo / Check-in Slip (Image)</span>
                  </label>
                  {(formImageName || formImageBlob) && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Photo Attached
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  ref={stayImageInputRef}
                  onChange={handleStayImageChange}
                  accept="image/*"
                  className="hidden"
                />
                {(formImageName || formImageBlob) ? (
                  <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {formImageBlob ? (
                        <img
                          src={formImageBlob}
                          alt="Stay preview"
                          className="w-8 h-8 rounded-xl object-cover border border-amber-300 shrink-0 shadow-2xs"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-white text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-gray-900 truncate block">
                          {formImageName || 'Stay Photo / Slip'}
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium block">
                          {formImageSize || 'Photo image'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => stayImageInputRef.current?.click()}
                        className="px-2.5 py-1 rounded-xl bg-white border border-amber-300 text-xs font-bold text-amber-800 hover:bg-amber-50 card-press-3d cursor-pointer"
                      >
                        Change Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormImageName('');
                          setFormImageSize('');
                          setFormImageBlob('');
                        }}
                        className="w-7 h-7 rounded-full bg-white text-rose-600 border border-rose-200 flex items-center justify-center hover:bg-rose-50 cursor-pointer"
                        title="Remove photo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => stayImageInputRef.current?.click()}
                    className="w-full py-3 px-4 rounded-2xl bg-white border-2 border-dashed border-amber-300 hover:border-amber-600 hover:bg-amber-50/40 text-amber-900 text-xs font-bold flex items-center justify-center gap-2 transition-all card-press-3d cursor-pointer"
                  >
                    <Upload className="w-4 h-4 stroke-[2.3]" />
                    <span>Attach Stay Photo / Slip (JPG, PNG, WebP)</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-[#0F5B44] text-white text-xs sm:text-sm font-black shadow-sm hover:bg-[#0c4936] transition-all touch-press flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Save Accommodation</span>
          </button>
        </form>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 4: ACCOMMODATION DETAILS (STAY DETAILS)                            */}
      {/* ========================================================================= */}
      {screen === 'details' && (
        !selectedStay ? (
          <div className="bg-white p-8 rounded-3xl text-center border border-gray-100 shadow-xs space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#e8f5ef] text-[#0F5B44] flex items-center justify-center text-xl font-bold">
              🏨
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900">No Stay Selected</h4>
              <p className="text-xs text-gray-400 mt-1">Please select a stay from the list or add a new accommodation.</p>
            </div>
            <button
              onClick={() => setScreen('overview')}
              className="px-4 py-2 rounded-xl bg-[#0F5B44] text-white text-xs font-bold"
            >
              Back to Overview
            </button>
          </div>
        ) : (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Header Bar */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <button
              onClick={() => setScreen(returnScreen || 'overview')}
              className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 shadow-xs"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
            </button>
            <h2 className="text-base sm:text-lg font-black text-gray-900">
              Stay Details
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => openEditForm(selectedStay)}
                className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 shadow-xs"
                title="Edit"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowDeleteStayConfirm(true)}
                className="w-8 h-8 rounded-full bg-white border border-red-200 flex items-center justify-center text-red-600 hover:bg-red-50 shadow-xs"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Hero Photo with Status Badge */}
          <div className="relative rounded-3xl overflow-hidden border border-gray-100 shadow-xs bg-gray-100 aspect-video max-h-56">
            <img
              src={selectedStay.imageUrl || '/images/shirdi-dharamshala.jpg'}
              alt={selectedStay.name}
              onError={(e) => { e.currentTarget.src = '/images/shirdi-dharamshala.jpg'; }}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 right-3">
              {(() => {
                const badge = getAccommodationStatusBadgeClass(
                  selectedStay.bookingStatus || selectedStay.status
                );
                return (
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${badge.badgeClass} shadow-sm flex items-center gap-1 backdrop-blur-xs`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{badge.label}</span>
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Title & Location */}
          <div>
            <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight leading-tight">
              {selectedStay.name}
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              {selectedStay.city}
              {selectedStay.totalAmount || selectedStay.estimatedCost
                ? ` · ${formatRupee(selectedStay.totalAmount || selectedStay.estimatedCost!)}`
                : ' · Tariff unverified'}
            </p>
          </div>

          {/* Linked Itinerary Day Banner */}
          {(() => {
            const matchedDay = days.find(d => d.id === selectedStay.dayId);
            if (!matchedDay) return null;
            return (
              <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Calendar className="w-4 h-4 text-[#0F5B44] flex-shrink-0" />
                  <span className="text-xs font-bold text-gray-800 truncate">
                    Day {matchedDay.dayNumber}: {matchedDay.title} ({matchedDay.date})
                  </span>
                </div>
                {onSelectDayIndex && (
                  <button
                    type="button"
                    onClick={() => onSelectDayIndex(matchedDay.dayNumber - 1)}
                    className="text-xs font-bold text-[#0F5B44] hover:underline flex-shrink-0 ml-2"
                  >
                    View Day →
                  </button>
                )}
              </div>
            );
          })()}

          {/* 3 Quick Chips (Type, Capacity, Duration) */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white p-2.5 rounded-2xl border border-gray-100 shadow-xs text-center flex flex-col items-center justify-center">
              <Home className="w-4 h-4 text-emerald-700 mb-1" />
              <span className="text-[11px] font-bold text-gray-800">{selectedStay.stayType}</span>
            </div>
            <div className="bg-white p-2.5 rounded-2xl border border-gray-100 shadow-xs text-center flex flex-col items-center justify-center">
              <Layers className="w-4 h-4 text-sky-700 mb-1" />
              <span className="text-[11px] font-bold text-gray-800">
                {selectedStay.capacityPersons || 1} Person
                {selectedStay.capacityPersons === 1 ? ' (Solo)' : 's'}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-2xl border border-gray-100 shadow-xs text-center flex flex-col items-center justify-center">
              <Clock className="w-4 h-4 text-purple-700 mb-1" />
              <span className="text-[11px] font-bold text-gray-800">{selectedStay.nightsCount || 1} Night</span>
            </div>
          </div>

          {/* Check-in / Check-out timing card */}
          <div className="bg-white p-3.5 rounded-3xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                Check-in
              </span>
              <span className="text-xs font-black text-gray-900 mt-0.5 block">
                {selectedStay.checkInTime ||
                  (selectedStay.checkinDate
                    ? `${selectedStay.checkinDate} (12:00 PM)`
                    : 'Date to be confirmed')}
              </span>
            </div>

            <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />

            <div className="text-right">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                Check-out
              </span>
              <span className="text-xs font-black text-gray-900 mt-0.5 block">
                {selectedStay.checkOutTime ||
                  (selectedStay.checkoutDate
                    ? `${selectedStay.checkoutDate} (11:00 AM)`
                    : 'Date to be confirmed')}
              </span>
            </div>
          </div>

          {/* Address Section with View on Map */}
          <div className="bg-white p-3.5 rounded-3xl border border-gray-100 shadow-xs space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0">
                <MapPin className="w-4 h-4 text-[#0F5B44] flex-shrink-0 mt-0.5" />
                <div className="text-xs text-gray-700 font-medium leading-relaxed">
                  <p className="font-bold text-gray-900">Address</p>
                  <p className="text-gray-600 mt-0.5">
                    {selectedStay.address ||
                      `Near temple / pilgrimage center, ${selectedStay.city} (Verify exact counter on arrival)`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setScreen('map')}
                className="text-[11px] font-bold text-[#0F5B44] hover:underline flex items-center gap-1 flex-shrink-0 pt-0.5"
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>View on Map</span>
              </button>
            </div>
          </div>

          {/* Contact Section */}
          <div className="bg-white p-3.5 rounded-3xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-[#0F5B44]" />
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Contact</span>
                <span className="text-xs font-bold text-gray-900">
                  {selectedStay.contactPhone || 'Inquire directly at temple trust counter'}
                </span>
              </div>
            </div>

            {selectedStay.contactPhone && (
              <a
                href={`tel:${selectedStay.contactPhone}`}
                className="py-1.5 px-3.5 rounded-xl bg-emerald-50 text-[#0F5B44] text-xs font-bold hover:bg-emerald-100 flex items-center gap-1.5 touch-press"
              >
                <Phone className="w-3.5 h-3.5 fill-current" />
                <span>Call</span>
              </a>
            )}
          </div>

          {/* Attached Documents / Receipts (Task 10) */}
          <div className="bg-white p-3.5 rounded-3xl border border-gray-100 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-gray-900 tracking-tight flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#0F5B44]" />
                Attached Documents &amp; Vouchers
              </span>
              {selectedStay.documentName && (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Attached
                </span>
              )}
            </div>

            {selectedStay.documentName ? (
              <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-50/60 to-teal-50/40 border border-emerald-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white text-[#0F5B44] border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-gray-900 truncate block">
                      {selectedStay.documentName}
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium block">
                      {selectedStay.documentSize || 'Attached Voucher'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedStay.documentUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setViewingDoc({
                          title: selectedStay.documentName || selectedStay.name,
                          fileName: selectedStay.documentName,
                          fileSize: selectedStay.documentSize,
                          blobData: selectedStay.documentUrl,
                          docType: 'Accommodation Voucher',
                        })
                      }
                      className="px-2.5 py-1.5 rounded-xl bg-[#0F5B44] text-white text-[11px] font-bold hover:bg-[#16654f] card-press-3d inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-gray-50/80 border border-dashed border-gray-200 text-center space-y-1.5">
                <p className="text-xs text-gray-500 font-medium">
                  No booking vouchers or ID proofs attached yet.
                </p>
                <button
                  type="button"
                  onClick={() => openEditForm(selectedStay)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 text-[#0F5B44] border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold card-press-3d inline-flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Attach Document</span>
                </button>
              </div>
            )}
          </div>

          {/* Action Navigation Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => setScreen('booking')}
              className="py-3 px-3 rounded-2xl bg-white border border-gray-200 text-gray-800 text-xs font-bold hover:bg-gray-50 flex items-center justify-center gap-1.5 shadow-xs touch-press"
            >
              <FileText className="w-4 h-4 text-[#0F5B44]" />
              <span>Booking Info</span>
            </button>

            <button
              onClick={() => setScreen('photos')}
              className="py-3 px-3 rounded-2xl bg-[#0F5B44] text-white text-xs font-bold hover:bg-[#0c4936] flex items-center justify-center gap-1.5 shadow-xs touch-press"
            >
              <Camera className="w-4 h-4" />
              <span>Photos &amp; Docs</span>
            </button>
          </div>
        </div>
        )
      )}

      {/* ========================================================================= */}
      {/* SCREEN 5: BOOKING INFORMATION (BOOKING DETAILS)                           */}
      {/* ========================================================================= */}
      {screen === 'booking' && selectedStay && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Header Bar */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <button
              onClick={() => setScreen('details')}
              className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 shadow-xs"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
            </button>
            <h2 className="text-base sm:text-lg font-black text-gray-900">
              Booking Details
            </h2>
            <button
              onClick={() => setScreen('overview')}
              className="text-xs font-bold text-gray-500 hover:text-gray-900"
            >
              Done
            </button>
          </div>

          {/* Booking Status Card */}
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <span className="text-xs font-bold text-gray-500">Booking Status</span>
              {(() => {
                const badge = getAccommodationStatusBadgeClass(
                  selectedStay.bookingStatus || selectedStay.status
                );
                return (
                  <span
                    className={`text-xs font-black px-3 py-1 rounded-full ${badge.badgeClass} flex items-center gap-1`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{badge.label}</span>
                  </span>
                );
              })()}
            </div>

            {/* Grid of Key-Values matching Reference Screen 5 */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Booking ID / Ref</span>
                <span className="font-extrabold text-gray-900 mt-0.5 block">
                  {selectedStay.bookingReference ||
                    selectedStay.bookingId ||
                    'Not booked (Pending research)'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Booking Date</span>
                <span className="font-extrabold text-gray-900 mt-0.5 block">
                  {selectedStay.bookingDate || 'Pending reservation'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Booked From</span>
                <span className="font-extrabold text-gray-900 mt-0.5 block">
                  {selectedStay.bookedFrom || 'Official Portal / Counter'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Total Amount</span>
                <span className="font-extrabold text-gray-900 mt-0.5 block">
                  {selectedStay.totalAmount || selectedStay.estimatedCost
                    ? formatRupee(selectedStay.totalAmount || selectedStay.estimatedCost!)
                    : 'Tariff to be verified at counter'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Advance Paid</span>
                <span className="font-bold text-emerald-700 mt-0.5 block">
                  {selectedStay.advancePaid
                    ? formatRupee(selectedStay.advancePaid)
                    : '₹0 (No advance payment)'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Balance Due</span>
                <span className="font-bold text-amber-700 mt-0.5 block">
                  {selectedStay.balanceDue
                    ? `${formatRupee(selectedStay.balanceDue)} (at check-in)`
                    : 'Pay on counter upon arrival'}
                </span>
              </div>

              <div className="col-span-2">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Payment Method</span>
                <span className="font-extrabold text-gray-900 mt-0.5 block">
                  {selectedStay.paymentMethod || 'Cash at counter / UPI'}
                </span>
              </div>

              <div className="col-span-2">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Cancellation Policy</span>
                <span className="font-medium text-gray-600 mt-0.5 block">
                  {selectedStay.cancellationPolicy ||
                    'Subject to temple trust rules. Most dharamshala walk-in bookings require no cancellation fee.'}
                </span>
              </div>

              <div className="col-span-2">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Notes &amp; Guidelines</span>
                <span className="font-medium text-gray-600 mt-0.5 block">
                  {selectedStay.notes ||
                    'Solo traveller pilgrim stay. Ground floor preferred. Carry Government Photo ID (Aadhaar).'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons: View Confirmation & Download Receipt */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => setScreen('photos')}
              className="w-full py-3 rounded-2xl bg-white border border-gray-200 text-gray-800 text-xs sm:text-sm font-bold shadow-xs hover:bg-gray-50 transition-all flex items-center justify-center gap-2 touch-press"
            >
              <FileText className="w-4 h-4 text-[#0F5B44]" />
              <span>View Booking Confirmation</span>
            </button>

            <button
              onClick={() => showToast('Receipt downloaded')}
              className="w-full py-3 rounded-2xl bg-emerald-50 text-[#0F5B44] border border-emerald-200 text-xs sm:text-sm font-bold hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 touch-press"
            >
              <Download className="w-4 h-4" />
              <span>Download Receipt</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 6: EDIT ACCOMMODATION                                              */}
      {/* ========================================================================= */}
      {screen === 'edit' && (
        !selectedStay ? (
          <div className="bg-white p-8 rounded-3xl text-center border border-gray-100 shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-gray-900">No Stay Selected for Edit</h4>
            <button
              onClick={() => setScreen('overview')}
              className="px-4 py-2 rounded-xl bg-[#0F5B44] text-white text-xs font-bold"
            >
              Back to Overview
            </button>
          </div>
        ) : (
        <form onSubmit={handleSaveSubmit} className="space-y-4 animate-in fade-in duration-150 pb-16">
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setScreen(returnScreen || 'overview')}
                className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 shadow-xs"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
              </button>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 leading-none">
                  Edit Accommodation
                </h2>
                <p className="text-[11px] sm:text-xs text-gray-500 font-medium mt-1">
                  Update stay details, dates, persons
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowDeleteStayConfirm(true)}
              className="py-1.5 px-3 rounded-full border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs space-y-3.5">
            {/* Stay Type */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                Stay Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['Dharamshala', 'Hotel', 'Guest House', 'Other'] as StayType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormStayType(t)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center ${
                      formStayType === t
                        ? 'bg-[#0F5B44] text-white shadow-xs'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Stay Name */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Stay Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0F5B44]"
              />
            </div>

            {/* Location / City & Exact Geo-Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Location / City (Optional)
                </label>
                <input
                  type="text"
                  value={formCity}
                  onChange={e => setFormCity(e.target.value)}
                  placeholder="e.g. Shirdi"
                  className="w-full px-3.5 py-2.5 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0F5B44]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Exact Geo-Location / Google Maps Link (Optional)
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formMapsUrl}
                    onChange={e => setFormMapsUrl(e.target.value)}
                    placeholder="e.g. https://maps.app.goo.gl/... or 19.7665, 74.4765"
                    className="w-full pl-8 pr-3 py-2.5 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0F5B44]"
                  />
                </div>
              </div>
            </div>

            {/* Related Itinerary Day */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Related Itinerary Day
              </label>
              <select
                value={formDayId}
                onChange={e => setFormDayId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0F5B44]"
              >
                <option value="">General (Not day-specific)</option>
                {days.map(d => (
                  <option key={d.id} value={d.id}>
                    Day {d.dayNumber}: {d.title} ({d.date})
                  </option>
                ))}
              </select>
            </div>

            {/* Booking Status & Booking Reference */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black text-gray-800">
                    Booking Status
                  </label>
                  <span className="text-[10px] font-bold text-[#0F5B44] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Selected: {formBookingStatus}
                  </span>
                </div>

                {/* 3D Tactile Status Selection Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2">
                  {[
                    { val: 'Needs research', label: 'Needs research' },
                    { val: 'Option identified', label: 'Option identified' },
                    { val: 'Booking pending', label: 'Booking pending' },
                    { val: 'Booked', label: 'Booked' },
                    { val: 'Checked in', label: 'Checked in' },
                    { val: 'Completed or checked out', label: 'Completed' },
                    { val: 'Not selected', label: 'Not selected' },
                  ].map(item => {
                    const isSelected =
                      formBookingStatus === item.val ||
                      (item.val === 'Booked' && formBookingStatus === 'Confirmed') ||
                      (item.val === 'Completed or checked out' && formBookingStatus === 'Completed');
                    return (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setFormBookingStatus(item.val)}
                        className={`p-2 rounded-xl text-left border text-xs font-bold transition-all card-press-3d flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#0F5B44] text-white border-[#0F5B44] shadow-sm ring-2 ring-emerald-400/40'
                            : 'bg-gray-50/80 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] shrink-0 text-white" />}
                      </button>
                    );
                  })}
                </div>

                <select
                  value={formBookingStatus}
                  onChange={e => setFormBookingStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0F5B44] font-medium"
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
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Booking Reference / ID (Optional)
                </label>
                <input
                  type="text"
                  value={formBookingReference}
                  onChange={e => setFormBookingReference(e.target.value)}
                  placeholder="e.g. BKG-10293 (only if genuinely booked)"
                  className="w-full px-3.5 py-2.5 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0F5B44]"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Address (Optional, only if verified)
              </label>
              <input
                type="text"
                value={formAddress}
                onChange={e => setFormAddress(e.target.value)}
                placeholder="Enter verified address"
                className="w-full px-3.5 py-2.5 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0F5B44]"
              />
            </div>

            {/* Dates (2 columns) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Check-in Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formCheckinDate}
                  onChange={e => setFormCheckinDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0F5B44]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Check-out Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formCheckoutDate}
                  onChange={e => setFormCheckoutDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0F5B44]"
                />
              </div>
            </div>

            {/* Nights & Persons */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  No. of Nights
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={formNights}
                  onChange={e => setFormNights(parseInt(e.target.value) || 1)}
                  className="w-full px-3.5 py-2 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0F5B44]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  No. of Persons (Solo = 1)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formPersons}
                  onChange={e => setFormPersons(parseInt(e.target.value) || 1)}
                  className="w-full px-3.5 py-2 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0F5B44]"
                />
              </div>
            </div>

            {/* Total Estimated Cost & Payment Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Total Cost (₹, optional)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formCost}
                  onChange={e => setFormCost(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full px-3.5 py-2.5 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0F5B44] font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Payment Mode
                </label>
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

            {/* Contact Phone */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Contact Phone (Optional)
              </label>
              <input
                type="tel"
                value={formPhone}
                onChange={e => setFormPhone(e.target.value)}
                placeholder="Only verified trust phone"
                className="w-full px-3.5 py-2.5 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0F5B44]"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Booking Notes / Remarks
              </label>
              <textarea
                rows={2}
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder="Ground floor preferred, close to temple gate..."
                className="w-full px-3.5 py-2 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#0F5B44]"
              />
            </div>

            {/* Dual Attachment Section: Stay Voucher (PDF) & Stay Photo / Slip (Image) */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <span className="sr-only">Attach Documents / Booking Voucher</span>
              
              {/* 1. Official Stay Voucher (PDF) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-teal-700" />
                    <span>Official Stay Voucher (PDF)</span>
                  </label>
                  {(formPdfName || formDocumentName) && (
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                      PDF Attached
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  ref={stayPdfInputRef}
                  onChange={handleStayPdfChange}
                  accept="application/pdf"
                  className="hidden"
                />
                {(formPdfName || formDocumentName) ? (
                  <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-white text-teal-700 border border-teal-200 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-gray-900 truncate block">
                          {formPdfName || formDocumentName}
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium block">
                          {formPdfSize || formDocumentSize || 'Official Voucher PDF'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => stayPdfInputRef.current?.click()}
                        className="px-2.5 py-1 rounded-xl bg-white border border-teal-300 text-xs font-bold text-teal-800 hover:bg-teal-50 card-press-3d cursor-pointer"
                      >
                        Change Voucher
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormPdfName('');
                          setFormPdfSize('');
                          setFormPdfBlob('');
                          setFormDocumentName('');
                          setFormDocumentSize('');
                          setFormDocumentUrl('');
                        }}
                        className="w-7 h-7 rounded-full bg-white text-rose-600 border border-rose-200 flex items-center justify-center hover:bg-rose-50 cursor-pointer"
                        title="Remove voucher"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => stayPdfInputRef.current?.click()}
                    className="w-full py-3 px-4 rounded-2xl bg-white border-2 border-dashed border-teal-300 hover:border-teal-600 hover:bg-teal-50/40 text-teal-800 text-xs font-bold flex items-center justify-center gap-2 transition-all card-press-3d cursor-pointer"
                  >
                    <Upload className="w-4 h-4 stroke-[2.3]" />
                    <span>Attach Official Stay Voucher (PDF)</span>
                  </button>
                )}
              </div>

              {/* 2. Stay Photo / Check-in Slip (Image) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-700" />
                    <span>Stay Photo / Check-in Slip (Image)</span>
                  </label>
                  {(formImageName || formImageBlob) && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Photo Attached
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  ref={stayImageInputRef}
                  onChange={handleStayImageChange}
                  accept="image/*"
                  className="hidden"
                />
                {(formImageName || formImageBlob) ? (
                  <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {formImageBlob ? (
                        <img
                          src={formImageBlob}
                          alt="Stay preview"
                          className="w-8 h-8 rounded-xl object-cover border border-amber-300 shrink-0 shadow-2xs"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-white text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-gray-900 truncate block">
                          {formImageName || 'Stay Photo / Slip'}
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium block">
                          {formImageSize || 'Photo image'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => stayImageInputRef.current?.click()}
                        className="px-2.5 py-1 rounded-xl bg-white border border-amber-300 text-xs font-bold text-amber-800 hover:bg-amber-50 card-press-3d cursor-pointer"
                      >
                        Change Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormImageName('');
                          setFormImageSize('');
                          setFormImageBlob('');
                        }}
                        className="w-7 h-7 rounded-full bg-white text-rose-600 border border-rose-200 flex items-center justify-center hover:bg-rose-50 cursor-pointer"
                        title="Remove photo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => stayImageInputRef.current?.click()}
                    className="w-full py-3 px-4 rounded-2xl bg-white border-2 border-dashed border-amber-300 hover:border-amber-600 hover:bg-amber-50/40 text-amber-900 text-xs font-bold flex items-center justify-center gap-2 transition-all card-press-3d cursor-pointer"
                  >
                    <Upload className="w-4 h-4 stroke-[2.3]" />
                    <span>Attach Stay Photo / Slip (JPG, PNG, WebP)</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 mb-10 rounded-2xl bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-950/20 hover:shadow-xl transition-all touch-press flex items-center justify-center gap-2 card-press-3d"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Update Stay</span>
          </button>
        </form>
        )
      )}

      {/* ========================================================================= */}
      {/* SCREEN 7: NEARBY ACCOMMODATION                                            */}
      {/* ========================================================================= */}
      {screen === 'nearby' && (
        <div className="space-y-3.5 animate-in fade-in duration-150">
          {/* Header Bar */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setScreen('overview')}
                className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 shadow-xs"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
              </button>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 leading-none">
                  Nearby Accommodation
                </h2>
                <p className="text-[11px] sm:text-xs text-gray-500 font-medium mt-1">
                  Shirdi, Maharashtra
                </p>
              </div>
            </div>

            <button
              onClick={() => setScreen('map')}
              className="py-1.5 px-3 rounded-full bg-emerald-50 text-[#0F5B44] text-xs font-bold flex items-center gap-1 hover:bg-emerald-100"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map</span>
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {['All', 'Dharamshala', 'Hotel', 'Guest House'].map(t => (
              <button
                key={t}
                onClick={() => setNearbyFilter(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap touch-press ${
                  nearbyFilter === t
                    ? 'bg-[#0F5B44] text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Nearby List Cards matching Screen 7 */}
          <div className="space-y-2.5">
            {NEARBY_STAYS.filter(s => nearbyFilter === 'All' || s.type === nearbyFilter).map(item => (
              <div
                key={item.id}
                className="bg-white p-3 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between gap-3 hover:border-emerald-200 transition-all touch-press"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-14 h-14 rounded-xl object-cover border border-gray-100 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                      {item.name}
                    </h4>
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">
                      {item.distance}
                    </p>
                    <p className="text-[11px] font-extrabold text-[#0F5B44] mt-0.5">
                      {item.priceText}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setActiveMapStay(item);
                    setScreen('map');
                  }}
                  className="py-1.5 px-3 rounded-xl border border-emerald-300 text-[#0F5B44] text-xs font-bold hover:bg-emerald-50 flex-shrink-0"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 8: MAP VIEW                                                        */}
      {/* ========================================================================= */}
      {screen === 'map' && (
        <div className="space-y-3.5 animate-in fade-in duration-150">
          {/* Header Bar */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setScreen('overview')}
                className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 shadow-xs"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
              </button>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 leading-none">
                  Map View
                </h2>
                <p className="text-[11px] sm:text-xs text-gray-500 font-medium mt-1">
                  See all nearby stays on map
                </p>
              </div>
            </div>

            <button
              onClick={() => setScreen('nearby')}
              className="py-1.5 px-3 rounded-full bg-emerald-50 text-[#0F5B44] text-xs font-bold hover:bg-emerald-100"
            >
              List View
            </button>
          </div>

          {/* Filter Pills Floating atop Map */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {['All', 'Dharamshala', 'Hotel'].map(t => (
              <button
                key={t}
                onClick={() => setMapFilter(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap touch-press ${
                  mapFilter === t
                    ? 'bg-[#0F5B44] text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Interactive Map Visual */}
          <div className="relative rounded-3xl overflow-hidden border border-gray-200 shadow-sm bg-stone-100 aspect-[4/3] sm:aspect-[16/10]">
            <img
              src="/images/shirdi-map.jpg"
              alt="Shirdi Navigation Map"
              className="w-full h-full object-cover"
            />

            {/* Pins positioned matching mockup */}
            {/* Sai Baba Temple Landmark */}
            <div className="absolute top-[42%] left-[64%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
              <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md border-2 border-white animate-pulse">
                🏛
              </div>
              <span className="text-[9px] font-black bg-white/90 text-gray-900 px-1.5 py-0.5 rounded shadow-xs mt-0.5">
                Sai Baba Temple
              </span>
            </div>

            {/* Sai Seva Dharamshala Pin */}
            <div
              onClick={() => setActiveMapStay(NEARBY_STAYS[0])}
              className="absolute top-[32%] left-[54%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer hover:scale-110 transition-transform"
            >
              <div className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md border-2 border-white">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <span className="text-[8px] font-bold bg-white text-gray-900 px-1 rounded shadow-xs">
                Sai Seva
              </span>
            </div>

            {/* Hotel Sai Residency Pin */}
            <div
              onClick={() => setActiveMapStay(NEARBY_STAYS[2])}
              className="absolute top-[48%] left-[52%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer hover:scale-110 transition-transform"
            >
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md border-2 border-white">
                <BedDouble className="w-3.5 h-3.5" />
              </div>
              <span className="text-[8px] font-bold bg-white text-gray-900 px-1 rounded shadow-xs">
                Hotel Sai
              </span>
            </div>

            {/* Sai Ashram Trust Pin */}
            <div
              onClick={() => setActiveMapStay(NEARBY_STAYS[3])}
              className="absolute top-[60%] left-[68%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer hover:scale-110 transition-transform"
            >
              <div className="w-6 h-6 rounded-full bg-[#0F5B44] text-white flex items-center justify-center shadow-md border-2 border-white">
                <Home className="w-3.5 h-3.5" />
              </div>
              <span className="text-[8px] font-bold bg-white text-gray-900 px-1 rounded shadow-xs">
                Sai Ashram
              </span>
            </div>
          </div>

          {/* Bottom Selected Stay Preview Card matching Screen 8 */}
          {activeMapStay && (
            <div className="bg-white p-3.5 rounded-3xl border border-gray-100 shadow-md space-y-2.5">
              <div className="flex items-center gap-3">
                <img
                  src={activeMapStay.imageUrl || '/images/shirdi-dharamshala.jpg'}
                  alt={activeMapStay.name}
                  onError={(e) => { e.currentTarget.src = '/images/shirdi-dharamshala.jpg'; }}
                  className="w-14 h-14 rounded-2xl object-cover border border-gray-100 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-gray-900 truncate">
                    {activeMapStay.name}
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {activeMapStay.distance} · {activeMapStay.priceText}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(activeMapStay.name + ' Shirdi')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 flex items-center justify-center gap-1.5"
                >
                  <NavigationIcon className="w-3.5 h-3.5 text-[#0F5B44]" />
                  <span>Directions</span>
                </a>

                <button
                  onClick={() => {
                    // Navigate to details
                    const matched = accommodations.find(a => a.name.includes(activeMapStay.name) || activeMapStay.name.includes(a.name));
                    if (matched) {
                      openStayDetails(matched);
                    } else {
                      showToast(`Viewing ${activeMapStay.name}`);
                    }
                  }}
                  className="py-2 rounded-xl bg-[#0F5B44] text-white text-xs font-bold hover:bg-[#0c4936] flex items-center justify-center gap-1.5"
                >
                  <span>View Details</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 9: STAY PHOTOS & DOCUMENTS                                         */}
      {/* ========================================================================= */}
      {screen === 'photos' && selectedStay && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Header Bar */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setScreen('details')}
                className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 shadow-xs"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
              </button>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 leading-none">
                  Stay Photos &amp; Documents
                </h2>
                <p className="text-[11px] sm:text-xs text-gray-500 font-medium mt-1">
                  {selectedStay.name}
                </p>
              </div>
            </div>

            <button
              onClick={() => showToast('Upload photo / document')}
              className="w-8 h-8 rounded-full bg-emerald-50 text-[#0F5B44] flex items-center justify-center hover:bg-emerald-100"
              title="Add photo"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Filter Tabs matching Screen 9 */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {['All', 'Photos', 'Booking', 'Receipts', 'Other'].map(t => (
              <button
                key={t}
                onClick={() => setPhotosFilter(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap touch-press ${
                  photosFilter === t
                    ? 'bg-[#0F5B44] text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Photo Gallery 2x2 Grid matching Reference Screen 9 */}
          {(photosFilter === 'All' || photosFilter === 'Photos') && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Photo Gallery
              </h3>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { title: 'Main Building', url: '/images/shirdi-dharamshala.jpg' },
                  { title: 'Room', url: '/images/shirdi-room.jpg' },
                  { title: 'Dining Hall', url: '/images/hotel-receipt.jpg' },
                  { title: 'Entrance', url: '/images/shirdi-dharamshala.jpg' },
                ].map((photo, i) => (
                  <div
                    key={i}
                    onClick={() => showToast(`Expanded ${photo.title}`)}
                    className="relative rounded-2xl overflow-hidden border border-gray-100 shadow-xs group cursor-pointer aspect-video bg-gray-100"
                  >
                    <img
                      src={photo.url}
                      alt={photo.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <span className="text-[11px] font-bold text-white block truncate">
                        {photo.title}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents Section below gallery */}
          {(photosFilter === 'All' || photosFilter === 'Booking' || photosFilter === 'Receipts') && (
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Attached Documents
              </h3>

              <div className="space-y-2">
                {[
                  { title: 'Booking Confirmation', type: 'PDF', size: '245 KB', date: '10 Nov 2026' },
                  { title: 'Receipt', type: 'JPG', size: '120 KB', date: '10 Nov 2026' },
                  { title: 'Rules & Guidelines', type: 'PDF', size: '1.2 MB', date: '10 Nov 2026' },
                ].map((doc, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-3 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between gap-3 hover:border-emerald-200 transition-all touch-press cursor-pointer"
                    onClick={() => showToast(`Opened ${doc.title}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0F5B44] flex items-center justify-center flex-shrink-0 font-bold text-xs">
                        {doc.type}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">
                          {doc.title}
                        </h4>
                        <span className="text-[11px] text-gray-400 font-medium">
                          {doc.type} · {doc.size}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        showToast(`Downloaded ${doc.title}`);
                      }}
                      className="w-8 h-8 rounded-full border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 flex items-center justify-center flex-shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full-width Upload Files Button */}
          <div className="pt-2">
            <button
              onClick={() => showToast('Choose file or photo to upload')}
              className="w-full py-3 rounded-2xl bg-[#0F5B44] text-white text-xs sm:text-sm font-black shadow-sm hover:bg-[#0c4936] transition-all touch-press flex items-center justify-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Files</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 10: ACCOMMODATION SETTINGS                                         */}
      {/* ========================================================================= */}
      {screen === 'settings' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Header Bar */}
          <div className="flex items-center gap-2.5 pt-0.5">
            <button
              onClick={() => setScreen('overview')}
              className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 shadow-xs"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
            </button>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-gray-900 leading-none">
                Accommodation Settings
              </h2>
              <p className="text-[11px] sm:text-xs text-gray-500 font-medium mt-1">
                Pilgrimage preferences, guidelines and official links
              </p>
            </div>
          </div>

          {/* Established Pilgrimage Preferences Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-[#0F5B44]">
              <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Established Pilgrimage Trip Preferences
              </h3>
            </div>
            <ul className="text-xs text-gray-700 space-y-1.5 pl-1 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-[#0F5B44] font-bold">•</span>
                <span><strong>Solo Traveller:</strong> Accommodations default to 1 person capacity.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0F5B44] font-bold">•</span>
                <span><strong>Dharamshala &amp; Low-Cost First:</strong> Prefer temple trust dharamshalas, ashrams, and budget pilgrim stays.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0F5B44] font-bold">•</span>
                <span><strong>Night Travel Room Savings:</strong> 4 overnight trains on route reduce hotel nights in transit.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0F5B44] font-bold">•</span>
                <span><strong>Budget Discipline:</strong> Avoid expensive commercial hotels unless explicitly required.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0F5B44] font-bold">•</span>
                <span><strong>Counter Disclaimer:</strong> Free or trust stays are not guaranteed in advance; availability depends on walk-in queue and temple trust rules.</span>
              </li>
            </ul>
          </div>

          {/* Section 1: Default Preferences */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
              Default Preferences
            </h3>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-xs divide-y divide-gray-50 text-xs">
              <div
                onClick={() => {
                  const opts = ['Dharamshala', 'Hotel', 'Guest House', 'Ashram'];
                  const next = opts[(opts.indexOf(prefStayType) + 1) % opts.length];
                  setPrefStayType(next);
                  showToast(`Preferred stay: ${next}`);
                }}
                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-gray-50"
              >
                <span className="font-bold text-gray-700">Preferred Stay Type</span>
                <span className="text-gray-500 font-semibold inline-flex items-center gap-1">
                  {prefStayType} <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                </span>
              </div>

              <div
                onClick={() => {
                  const opts = ['₹500', '₹800', '₹1,200', '₹1,500'];
                  const next = opts[(opts.indexOf(prefMaxBudget) + 1) % opts.length];
                  setPrefMaxBudget(next);
                  showToast(`Max budget: ${next}`);
                }}
                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-gray-50"
              >
                <span className="font-bold text-gray-700">Max Budget per Night</span>
                <span className="text-gray-500 font-semibold inline-flex items-center gap-1">
                  {prefMaxBudget} <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                </span>
              </div>

              <div
                onClick={() => {
                  const opts = ['Near Temple', 'Near Bus Stand', 'Near Railway Station', 'Budget Central'];
                  const next = opts[(opts.indexOf(prefLocation) + 1) % opts.length];
                  setPrefLocation(next);
                  showToast(`Location: ${next}`);
                }}
                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-gray-50"
              >
                <span className="font-bold text-gray-700">Preferred Location</span>
                <span className="text-gray-500 font-semibold inline-flex items-center gap-1">
                  {prefLocation} <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                </span>
              </div>

              <div
                onClick={() => {
                  const next = prefPersons >= 4 ? 1 : prefPersons + 1;
                  setPrefPersons(next);
                  showToast(`Default persons: ${next}`);
                }}
                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-gray-50"
              >
                <span className="font-bold text-gray-700">Default No. of Persons</span>
                <span className="text-gray-500 font-semibold inline-flex items-center gap-1">
                  {prefPersons} (Solo) <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: General Settings */}
          <div className="space-y-1.5 pt-1">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
              General Settings
            </h3>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-xs divide-y divide-gray-50 text-xs">
              {/* Show on Map Toggle */}
              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-800 block">Show on Map</span>
                  <span className="text-[11px] text-gray-400 font-medium">Display stays on interactive map</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSettingShowOnMap(v => !v)}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                    settingShowOnMap ? 'bg-[#0F5B44]' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                      settingShowOnMap ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Reminders Toggle */}
              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-800 block">Reminders</span>
                  <span className="text-[11px] text-gray-400 font-medium">Get reminder 1 day before check-in</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSettingReminders(v => !v)}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                    settingReminders ? 'bg-[#0F5B44]' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                      settingReminders ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Sync to Cloud Toggle */}
              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-800 block">Sync to Cloud</span>
                  <span className="text-[11px] text-gray-400 font-medium">Keep accommodation data backed up</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSettingSyncCloud(v => !v)}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                    settingSyncCloud ? 'bg-[#0F5B44]' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                      settingSyncCloud ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Official Temple Trust Portals */}
          <div className="space-y-1.5 pt-1">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
              Official Pilgrimage Stays &amp; Dharamshala Portals
            </h3>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-xs divide-y divide-gray-50 text-xs">
              <a
                href="https://online.sai.org.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 flex items-center justify-between hover:bg-gray-50 text-gray-800"
              >
                <div className="flex items-center gap-2.5">
                  <Home className="w-4 h-4 text-[#0F5B44]" />
                  <div>
                    <span className="font-bold block">Shri Saibaba Sansthan Trust (Shirdi)</span>
                    <span className="text-[10px] text-gray-400">Sai Ashram &amp; Dwarawati Bhakta Niwas</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </a>

              <a
                href="https://somnath.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 flex items-center justify-between hover:bg-gray-50 text-gray-800"
              >
                <div className="flex items-center gap-2.5">
                  <Home className="w-4 h-4 text-emerald-700" />
                  <div>
                    <span className="font-bold block">Shree Somnath Trust (Somnath / Veraval)</span>
                    <span className="text-[10px] text-gray-400">Sagar Darshan, Maheshwari &amp; Lilavati Guest Houses</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </a>

              <a
                href="https://shrimahakaleshwar.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 flex items-center justify-between hover:bg-gray-50 text-gray-800"
              >
                <div className="flex items-center gap-2.5">
                  <Home className="w-4 h-4 text-sky-700" />
                  <div>
                    <span className="font-bold block">Shri Mahakaleshwar Temple Trust (Ujjain)</span>
                    <span className="text-[10px] text-gray-400">Mahakal Dharamshala &amp; Yatri Niwas</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </a>

              <a
                href="https://www.irctctourism.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 flex items-center justify-between hover:bg-gray-50 text-gray-800"
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-amber-700" />
                  <div>
                    <span className="font-bold block">IRCTC Retiring Rooms (Station Transit)</span>
                    <span className="text-[10px] text-gray-400">Indore, Ujjain, Ahmedabad &amp; Pune Stations</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 3D Confirmation Popup for Delete Stay */}
      <ConfirmModal
        isOpen={showDeleteStayConfirm}
        title="Delete Accommodation?"
        message={`Are you sure you want to delete "${selectedStay?.name || 'this stay'}"?\nThis stay will be removed from your route circuit.`}
        confirmLabel="Delete Stay"
        cancelLabel="Keep Stay"
        variant="danger"
        iconType="trash"
        onConfirm={async () => {
          setShowDeleteStayConfirm(false);
          await handleDeleteStay();
        }}
        onCancel={() => setShowDeleteStayConfirm(false)}
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
        isOpen={Boolean(chooserStay)}
        item={chooserStay}
        itemType="stay"
        onSelectMode={handleSelectStayViewerMode}
        onClose={() => setChooserStay(null)}
        onAttachFile={handleAttachStayFile}
      />

      {/* 3D In-App Document / Image Viewer Modal */}
      <DocumentViewerModal
        isOpen={Boolean(viewingDoc)}
        document={viewingDoc}
        initialMode={stayViewerMode}
        onClose={() => setViewingDoc(null)}
        onAttachFile={handleAttachStayFile}
      />
    </div>
  );
};
