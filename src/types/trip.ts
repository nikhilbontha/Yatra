export type ExpenseCategory =
  | 'Transport'
  | 'Accommodation'
  | 'Food'
  | 'Temple / donation'
  | 'Sightseeing'
  | 'Shopping'
  | 'Other';

export type PaymentMethod =
  | 'Cash'
  | 'UPI'
  | 'Debit / credit card'
  | 'Online booking'
  | 'Other';

export type DayThemeType = 'Temple' | 'Sightseeing' | 'Transport' | 'Personal';
export type DayStatus = 'Planned' | 'In Progress' | 'Completed' | 'Skipped';

export type BookingType =
  | 'Train'
  | 'Bus'
  | 'Accommodation'
  | 'Temple booking'
  | 'ID / document'
  | 'Other';

export type BookingStatus =
  | 'Needs verification'
  | 'Confirmed'
  | 'Waitlisted'
  | 'Completed'
  | 'Cancelled';

export type DocumentType =
  | 'Train Ticket'
  | 'Bus Ticket'
  | 'Hotel Receipt'
  | 'ID Proof'
  | 'Temple Pass'
  | 'Other';

export type TransportMode =
  | 'Train'
  | 'State Bus'
  | 'Local Bus'
  | 'Shared Auto'
  | 'Walking'
  | 'Taxi'
  | 'Other';

export type StayType =
  | 'Dharamshala'
  | 'Budget Hotel'
  | 'Hotel'
  | 'Guest House'
  | 'Ashram'
  | 'Dormitory'
  | 'Night Train'
  | 'Other';

export type AccommodationBookingStatus =
  | 'Not selected'
  | 'Needs research'
  | 'Option identified'
  | 'Booking pending'
  | 'Booked'
  | 'Checked in'
  | 'Completed'
  | 'Checked out'
  | 'Confirmed'
  | 'Pending'
  | 'Waitlisted'
  | 'Cancelled';

export type PlaceType =
  | 'Jyotirlinga'
  | 'Temple'
  | 'Cave'
  | 'Ghat'
  | 'Viewpoint'
  | 'Heritage'
  | 'Transit'
  | 'Sightseeing'
  | 'City'
  | 'Other';

export type PlaceVisitStatus =
  | 'Planned'
  | 'Optional'
  | 'Needs verification'
  | 'Visited';

export type ChecklistCategory =
  | 'Documents'
  | 'Clothing'
  | 'Medicines'
  | 'Electronics'
  | 'Toiletries'
  | 'Gear'
  | 'Pre-Trip Preparation'
  | 'Packing'
  | 'Preparation'
  | 'Health'
  | 'Health & Safety'
  | 'General'
  | 'Miscellaneous';

export type ChecklistGroup =
  | 'Before departure'
  | 'Documents and bookings'
  | 'Packing essentials'
  | 'Travel safety'
  | 'Daily checklist';

export type NoteCategory =
  | 'General'
  | 'Emergency'
  | 'Travel Tip'
  | 'Reflection'
  | 'Contact';

export interface Trip {
  id: string;
  userId?: string;
  title: string;
  origin: string;
  destination: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  totalBudget: number;
  emergencyReserve: number;
  openingCash: number;
  totalUpiAmount?: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  targetDuration?: string;
  returnDateStatus?: 'confirmed' | 'pending';
  travelStyle?: string;
  preferredTransport?: string;
  preferredAccommodation?: string;
  preferredFirstStop?: string;
}

export interface ItineraryItem {
  id: string;
  tripId: string;
  dayId: string;
  title: string;
  itemType: 'Darshan' | 'Travel' | 'Sightseeing' | 'Task' | 'Rest' | 'Meal' | string;
  timeEstimate?: string;
  startTime?: string;
  endTime?: string;
  isCompleted: boolean;
  needsVerification: boolean;
  verificationNote?: string;
  location?: string;
  notes?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  estimatedCost?: number;
  costStatus?: 'Draft' | 'Estimated' | 'Verified';
  planningStatus?: 'Draft' | 'Estimated' | 'Verified' | 'Booked';
  placeId?: string;
}

export interface ItineraryDay {
  id: string;
  tripId: string;
  dayNumber: number;
  date: string; // YYYY-MM-DD
  title: string;
  subtitle?: string;
  themeType: DayThemeType;
  details?: string;
  location?: string;
  status: DayStatus;
  tasks: ItineraryItem[];
  imageUrl?: string;
  distance?: string;
  travelTime?: string;
  placesCount?: number;
  mode?: string;
  originCity?: string;
  destinationCity?: string;
  createdAt: string;
  updatedAt: string;

  // Authentic planning & estimation model (Phase 2)
  planningStatus?: 'Draft' | 'Estimated' | 'Verified' | 'Booked';
  departureTime?: string;
  arrivalTime?: string;
  estimatedTravelCost?: number;
  travelCostStatus?: 'Draft' | 'Estimated' | 'Verified';
  travelCostSource?: string;
  accommodationPlan?: string;
  accommodationStatus?: 'Draft' | 'Estimated' | 'Verified' | 'Booked';
  darshanStatus?: 'Planned' | 'Estimated' | 'Verified' | 'N/A';
  notesReferences?: string;
  isCircuitExtension?: boolean;
  preparationChecklist?: string[];
}

export interface Expense {
  id: string;
  tripId: string;
  dayId?: string;
  date: string; // YYYY-MM-DD
  time?: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  paymentMethod: PaymentMethod;
  destination?: string;
  notes?: string;
  isCashInflow: boolean;
  receiptUrl?: string;
  receiptName?: string;
  receiptSize?: string;
  status?: 'Paid' | 'Pending' | 'Reimbursed';
  isReimbursed?: boolean;
  addedOn?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  tripId: string;
  title: string;
  bookingType: BookingType;
  referencePnr?: string;
  provider?: string;
  bookingDate?: string;
  departureTime?: string;
  arrivalTime?: string;
  seatDetails?: string;
  status: BookingStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingDocument {
  id: string;
  tripId: string;
  dayId?: string;
  bookingId?: string;
  title: string;
  docType: DocumentType;
  type?: string;
  category?: string;
  fileName?: string;
  fileSize?: number | string;
  fileType?: string;
  storagePath?: string;
  fileUrl?: string;
  blobData?: string; // base64 / data URL for offline access
  // Dual Attachment Support (PDF + Image)
  pdfBlob?: string;
  pdfUrl?: string;
  pdfFileName?: string;
  pdfFileSize?: number | string;
  imageBlob?: string;
  imageUrl?: string;
  imageFileName?: string;
  imageFileSize?: number | string;
  offlineCached: boolean;
  isOfflineAvailable?: boolean;
  travelDate?: string;
  date?: string;
  pnr?: string;
  bookingRef?: string;
  status?: string;
  trainName?: string;
  trainNumber?: string;
  serviceNumber?: string;
  departureTime?: string;
  arrivalTime?: string;
  duration?: string;
  fromCity?: string;
  toCity?: string;
  fromStationCode?: string;
  toStationCode?: string;
  classType?: string;
  coachSeat?: string;
  berthType?: string;
  platform?: string;
  bookingDate?: string;
  passengers?: string;
  hotelAddress?: string;
  contactPhone?: string;
  roomType?: string;
  totalAmount?: number;
  paymentStatus?: string;
  paymentMethod?: 'UPI' | 'Cash' | string;
  nights?: number;
  checkInTime?: string;
  checkOutTime?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransportLeg {
  id: string;
  tripId: string;
  dayId?: string;
  fromLocation: string;
  toLocation: string;
  mode: TransportMode;
  serviceNumber?: string;
  departureTime?: string;
  arrivalTime?: string;
  date?: string;
  status: 'Needs verification' | 'Scheduled' | 'Booked' | 'Completed' | 'Confirmed';
  needsVerification: boolean;
  bookingRef?: string;
  pnr?: string;
  trainName?: string;
  busType?: string;
  classType?: string;
  coachSeat?: string;
  platformFrom?: string;
  platformTo?: string;
  chartStatus?: string;
  fare?: number;
  duration?: string;
  stops?: number;
  driverName?: string;
  driverPhone?: string;
  provider?: string;
  peopleCount?: number;
  pickupPoint?: string;
  dropPoint?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccommodationStay {
  id: string;
  tripId: string;
  dayId?: string;
  name: string;
  stayType: StayType;
  city: string;
  checkinDate?: string;
  checkoutDate?: string;
  estimatedCost: number;
  contactPhone?: string;
  address?: string;
  bookingReference?: string;
  bookingStatus?: AccommodationBookingStatus;
  status?: AccommodationBookingStatus | string;
  capacityPersons?: number;
  nightsCount?: number;
  checkInTime?: string;
  checkOutTime?: string;
  bookingId?: string;
  bookingDate?: string;
  bookedFrom?: string;
  totalAmount?: number;
  advancePaid?: number;
  balanceDue?: number;
  paymentMethod?: string;
  cancellationPolicy?: string;
  mapsUrl?: string;
  imageUrl?: string;
  galleryUrls?: string[];
  distanceFromTemple?: string;
  pricePerPerson?: number;
  rating?: number;
  notes?: string;
  documentUrl?: string;
  documentName?: string;
  documentType?: string;
  documentSize?: string;
  // Dual Attachment Support (PDF + Image)
  pdfBlob?: string;
  pdfUrl?: string;
  pdfFileName?: string;
  pdfFileSize?: string;
  imageBlob?: string;
  imageFileName?: string;
  imageFileSize?: string;
  attachedDocuments?: Array<{
    id?: string;
    title: string;
    fileUrl?: string;
    fileName?: string;
    docType?: string;
    fileSize?: string;
    uploadedAt?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Place {
  id: string;
  tripId: string;
  dayId?: string;
  name: string;
  city: string;
  placeType: PlaceType;
  visitStatus?: PlaceVisitStatus;
  significance?: string;
  openingHours?: string;
  dressCode?: string;
  darshanType?: string;
  needsVerification: boolean;
  mapUrl?: string;
  notes?: string;
  imageUrl?: string;
  galleryUrls?: string[];
  darshanTimings?: {
    mandirOpen?: string;
    morningAarti?: string;
    generalDarshan?: string;
    afternoonBreak?: string;
    eveningDarshan?: string;
    nightAarti?: string;
  };
  darshanInfo?: {
    darshanType?: string;
    darshanTime?: string;
    crowdLevel?: string;
    dressCode?: string;
    mobileAllowed?: string;
    photography?: string;
  };
  sevas?: { name: string; price: number; description?: string }[];
  nearbyPlaces?: { id: string; name: string; distance: string; category: string; imageUrl?: string }[];
  isVisited?: boolean;
  visitedDate?: string;
  userNotes?: string;
  userRating?: number;
  bestTime?: string;
  timeRequired?: string;
  entryFee?: string;
  isFavorite?: boolean;
  category?: string;
  dayNumber?: number;
  date?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  tripId: string;
  category: ChecklistCategory;
  checklistGroup?: ChecklistGroup;
  title: string;
  isCompleted: boolean;
  sortOrder: number;
  priority?: 'Low' | 'Medium' | 'High';
  dueDate?: string;
  reminder?: string;
  dayId?: string;
  description?: string;
  subcategory?: string;
  isSpecificDay?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TripNote {
  id: string;
  tripId: string;
  dayId?: string;
  title: string;
  content: string;
  category: NoteCategory;
  noteType?: 'Daily' | 'Experience' | 'Reminder';
  date?: string;
  time?: string;
  location?: string;
  tags?: string[];
  photos?: string[];
  priority?: 'Low' | 'Medium' | 'High';
  dueDate?: string;
  reminderTime?: string;
  isImportant?: boolean;
  isPinned?: boolean;
  isBookmark?: boolean;
  isCompleted?: boolean;
  rating?: number;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SyncQueueItem {
  id: string;
  entity: string;
  action: 'insert' | 'update' | 'delete';
  recordId: string;
  payload: any;
  timestamp: string;
  status: 'pending' | 'failed' | 'synced';
  error?: string;
  retryCount?: number;
  lastAttempt?: string;
  nextRetry?: string;
}

export interface ConflictItem {
  id: string;
  entity: string;
  recordId: string;
  localData: any;
  cloudData: any;
  localUpdatedAt: string;
  cloudUpdatedAt: string;
}

export interface BudgetCalculations {
  totalBudget: number;
  totalSpent: number;
  emergencyReserve: number;
  availableBudget: number;
  openingCash: number;
  cashInflows: number;
  cashExpenses: number;
  cashOnHand: number;
  dailyAverage: number;
  percentSpent: number;
  isNearLimit: boolean;
  isOverBudget: boolean;
  isReserveBreached: boolean;
  categoryTotals: { category: ExpenseCategory; amount: number; percentage: number }[];
  destinationTotals: { destination: string; amount: number }[];
}

export interface YatraBackupFile {
  format: 'yatra-backup-v2';
  exportedAt: string;
  trip: Trip;
  days: ItineraryDay[];
  expenses: Expense[];
  bookings: Booking[];
  documents: BookingDocument[];
  transportLegs: TransportLeg[];
  accommodations: AccommodationStay[];
  places: Place[];
  checklists: ChecklistItem[];
  notes: TripNote[];
}
