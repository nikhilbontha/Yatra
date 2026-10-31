import { z } from 'zod';

export const tripSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(2, 'Trip title must be at least 2 characters'),
  origin: z.string().min(2, 'Origin city is required'),
  destination: z.string().min(2, 'Destination city is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid start date required (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid end date required (YYYY-MM-DD)'),
  totalBudget: z.number().min(0, 'Budget cannot be negative'),
  emergencyReserve: z.number().min(0, 'Emergency reserve cannot be negative'),
  openingCash: z.number().min(0, 'Opening cash cannot be negative'),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
}).refine(data => data.endDate >= data.startDate, {
  message: 'End date must be on or after start date',
  path: ['endDate'],
});

export const expenseCategories = [
  'Transport',
  'Accommodation',
  'Food',
  'Temple / donation',
  'Sightseeing',
  'Shopping',
  'Other',
] as const;

export const paymentMethods = [
  'Cash',
  'UPI',
  'Debit / credit card',
  'Online booking',
  'Other',
] as const;

export const expenseSchema = z.object({
  id: z.string().uuid().optional(),
  tripId: z.string(),
  dayId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date required (YYYY-MM-DD)'),
  title: z.string().min(1, 'Description or title is required'),
  amount: z.number().positive('Amount must be greater than zero'),
  category: z.enum(expenseCategories, {
    message: 'Invalid expense category',
  }),
  paymentMethod: z.enum(paymentMethods, {
    message: 'Invalid payment method',
  }),
  destination: z.string().optional(),
  notes: z.string().optional(),
  isCashInflow: z.boolean().default(false),
  receiptUrl: z.string().optional(),
});

export const itineraryItemSchema = z.object({
  id: z.string().uuid().optional(),
  tripId: z.string(),
  dayId: z.string(),
  title: z.string().min(1, 'Task or activity title is required'),
  itemType: z.enum(['Darshan', 'Travel', 'Sightseeing', 'Task', 'Rest', 'Meal']).default('Task'),
  timeEstimate: z.string().optional(),
  isCompleted: z.boolean().default(false),
  needsVerification: z.boolean().default(false),
  verificationNote: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  sortOrder: z.number().int().default(0),
});

export const itineraryDaySchema = z.object({
  id: z.string().uuid().optional(),
  tripId: z.string(),
  dayNumber: z.number().int().positive('Day number must be at least 1'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date required (YYYY-MM-DD)'),
  title: z.string().min(1, 'Day title is required'),
  subtitle: z.string().optional(),
  themeType: z.enum(['Temple', 'Sightseeing', 'Transport', 'Personal']).default('Temple'),
  details: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(['Planned', 'In Progress', 'Completed', 'Skipped']).default('Planned'),
});

export const bookingSchema = z.object({
  id: z.string().uuid().optional(),
  tripId: z.string(),
  title: z.string().min(1, 'Booking title is required'),
  bookingType: z.enum(['Train', 'Bus', 'Accommodation', 'Temple booking', 'ID / document', 'Other']),
  referencePnr: z.string().optional(),
  provider: z.string().optional(),
  bookingDate: z.string().optional(),
  departureTime: z.string().optional(),
  arrivalTime: z.string().optional(),
  seatDetails: z.string().optional(),
  status: z.enum(['Needs verification', 'Confirmed', 'Waitlisted', 'Completed', 'Cancelled']).default('Needs verification'),
  notes: z.string().optional(),
});

export const bookingDocumentSchema = z.object({
  id: z.string().uuid().optional(),
  tripId: z.string(),
  bookingId: z.string().optional(),
  title: z.string().min(1, 'Document title is required'),
  docType: z.enum(['Train Ticket', 'Bus Ticket', 'Hotel Receipt', 'ID Proof', 'Temple Pass', 'Other']),
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.number().max(10 * 1024 * 1024, 'File size must not exceed 10 MB').optional(),
  fileType: z.string().optional(),
  storagePath: z.string().optional(),
  travelDate: z.string().optional(),
  notes: z.string().optional(),
});

export const accommodationStaySchema = z.object({
  id: z.string().uuid().optional(),
  tripId: z.string(),
  name: z.string().min(1, 'Property or dharamshala name is required'),
  stayType: z.enum(['Dharamshala', 'Budget Hotel', 'Ashram', 'Dormitory', 'Night Train', 'Other']).default('Dharamshala'),
  city: z.string().min(1, 'City is required'),
  checkinDate: z.string().optional(),
  checkoutDate: z.string().optional(),
  estimatedCost: z.number().min(0, 'Estimated cost cannot be negative').default(0),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  bookingReference: z.string().optional(),
  notes: z.string().optional(),
});

export const checklistItemSchema = z.object({
  id: z.string().uuid().optional(),
  tripId: z.string(),
  category: z.enum(['Documents', 'Clothing', 'Medicines', 'Electronics', 'Toiletries', 'Gear', 'Pre-Trip Preparation']),
  title: z.string().min(1, 'Checklist item is required'),
  isCompleted: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const tripNoteSchema = z.object({
  id: z.string().uuid().optional(),
  tripId: z.string(),
  dayId: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  category: z.enum(['General', 'Emergency', 'Travel Tip', 'Reflection', 'Contact']).default('General'),
});
