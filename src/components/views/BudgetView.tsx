'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Expense,
  ExpenseCategory,
  PaymentMethod,
  BudgetCalculations,
  Trip,
} from '@/types/trip';
import { formatRupee, generateExpensesCSV } from '@/lib/calculations';
import {
  Wallet,
  Coins,
  ShieldAlert,
  Download,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  CreditCard,
  Building,
  QrCode,
  AlertCircle,
  Utensils,
  Train,
  BedDouble,
  ShoppingBag,
  Sparkles,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Settings,
  MoreVertical,
  Camera,
  Image as ImageIcon,
  Check,
  X,
  FileText,
  Maximize2,
  Copy,
  Car,
  Compass,
  Tag,
  Coffee,
  CheckCircle2,
  PieChart,
  BarChart3,
  TrendingUp,
  Receipt,
  MapPin,
  Calendar,
  Layers,
  ArrowUpRight,
  Smartphone,
  Banknote,
} from 'lucide-react';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { AlertModal } from '@/components/modals/AlertModal';

export type BudgetSubScreen =
  | 'overview'
  | 'list'
  | 'add'
  | 'details'
  | 'category-summary'
  | 'edit';

interface BudgetViewProps {
  trip: Trip;
  expenses: Expense[];
  budgetCalc: BudgetCalculations;
  onAddExpense: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  onSaveExpense?: (expense: Partial<Expense>) => Promise<void>;
  onEditTripSettings: () => void;
}

// Category Color Palette matching reference mockup
export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Transport: '#10b981', // emerald
  Accommodation: '#0284c7', // sky blue
  Food: '#f59e0b', // amber
  'Temple / donation': '#8b5cf6', // purple
  Sightseeing: '#ec4899', // pink
  Shopping: '#f97316', // orange
  Other: '#6b7280', // gray
};

export const CATEGORY_BG_COLORS: Record<ExpenseCategory, string> = {
  Transport: '#e8f5ef',
  Accommodation: '#e0f2fe',
  Food: '#fef3c7',
  'Temple / donation': '#f3e8ff',
  Sightseeing: '#fce7f3',
  Shopping: '#ffedd5',
  Other: '#f3f4f6',
};

// All available categories
export const ALL_CATEGORIES: ExpenseCategory[] = [
  'Transport',
  'Accommodation',
  'Food',
  'Temple / donation',
  'Sightseeing',
  'Shopping',
  'Other',
];

// Display label for categories matching Phase 2 Step 4 guidance
export function getCategoryDisplayLabel(category: ExpenseCategory): string {
  switch (category) {
    case 'Transport':
      return 'Transport (Train / Bus / Local)';
    case 'Accommodation':
      return 'Accommodation';
    case 'Food':
      return 'Food and water';
    case 'Temple / donation':
      return 'Temple donations and offerings';
    case 'Sightseeing':
      return 'Entry tickets & Sightseeing';
    case 'Shopping':
      return 'Shopping and essentials';
    case 'Other':
    default:
      return 'Other';
  }
}

// Helper to render Category Icon
export function renderCategoryIcon(category: ExpenseCategory, className: string = 'w-4 h-4') {
  switch (category) {
    case 'Transport':
      return <Train className={className} />;
    case 'Accommodation':
      return <BedDouble className={className} />;
    case 'Food':
      return <Utensils className={className} />;
    case 'Temple / donation':
      return <Sparkles className={className} />;
    case 'Sightseeing':
      return <Camera className={className} />;
    case 'Shopping':
      return <ShoppingBag className={className} />;
    default:
      return <Coins className={className} />;
  }
}

// Format Date as "17 Nov 2026 (Tue)"
export function formatDateWithDay(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const year = d.getFullYear();
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  return `${day} ${month} ${year} (${weekday})`;
}

// Format Date as "17 Nov 2026"
export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

// Canonical Planned Route Estimates Breakdown (₹3,940 Total Planned)
const ROUTE_ESTIMATES = [
  { day: 'Day 1', route: 'Hyderabad / Secunderabad → Shirdi', mode: 'Sleeper Train', est: '₹360' },
  { day: 'Day 3', route: 'Shirdi → Chhatrapati Sambhajinagar / Ellora', mode: 'MSRTC Bus', est: '₹160' },
  { day: 'Day 4', route: 'Ellora / Grishneshwar ↔ Caves', mode: 'Local Bus / Auto', est: '₹60' },
  { day: 'Day 5', route: 'Chhatrapati Sambhajinagar → Nashik', mode: 'MSRTC Bus', est: '₹180' },
  { day: 'Day 6', route: 'Nashik → Trimbakeshwar → Pune', mode: 'State Bus', est: '₹230' },
  { day: 'Day 7', route: 'Pune ↔ Bhimashankar Jyotirlinga', mode: 'MSRTC Bus', est: '₹260' },
  { day: 'Day 8', route: 'Pune → Lonavala Sightseeing', mode: 'Local EMU / Train', est: '₹50' },
  { day: 'Day 9', route: 'Pune / Lonavala → Dwarka (Gujarat)', mode: 'Express Sleeper', est: '₹550' },
  { day: 'Day 10', route: 'Dwarka ↔ Nageshwar Jyotirlinga', mode: 'GSRTC / Auto', est: '₹120' },
  { day: 'Day 11', route: 'Dwarka → Somnath / Veraval', mode: 'GSRTC Express', est: '₹190' },
  { day: 'Day 12', route: 'Somnath Local & Veraval', mode: 'Local Transit', est: '₹80' },
  { day: 'Day 13', route: 'Somnath / Veraval → Ujjain (MP)', mode: 'Intercity Train', est: '₹480' },
  { day: 'Day 14', route: 'Mahakaleshwar Local & Ghats', mode: 'E-Rickshaw / Walk', est: '₹80' },
  { day: 'Day 15', route: 'Ujjain → Omkareshwar', mode: 'MP State Bus', est: '₹160' },
  { day: 'Day 16', route: 'Omkareshwar Island & South Bank', mode: 'Ferry / Walk', est: '₹60' },
  { day: 'Day 17', route: 'Omkareshwar / Indore / Khandwa → Telangana', mode: 'Connecting Train', est: '₹450' },
  { day: 'Day 18', route: 'Central Rail Route toward Khammam', mode: 'Overnight Train', est: '₹350' },
  { day: 'Day 19', route: 'Khammam Railway Station → Home', mode: 'Shared Auto', est: '₹50' },
];

export const BudgetView: React.FC<BudgetViewProps> = ({
  trip,
  expenses,
  budgetCalc,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  onSaveExpense,
  onEditTripSettings,
}) => {
  // Navigation between screens: 1. overview, 2. list, 3. add, 4. details, 5. category-summary, 6. edit
  const [currentScreen, setCurrentScreen] = useState<BudgetSubScreen>('overview');
  const [previousScreen, setPreviousScreen] = useState<BudgetSubScreen>('overview');
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);

  // Filters & Search
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [summaryDateFilter, setSummaryDateFilter] = useState<string>('All Dates');
  const [dailyViewTab, setDailyViewTab] = useState<'calendar' | 'list'>('calendar');
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string>('2026-11-17');
  const [calendarYear, setCalendarYear] = useState<number>(2026);
  const [calendarMonth, setCalendarMonth] = useState<number>(10); // 0 = Jan ... 10 = Nov, 11 = Dec

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(prev => prev - 1);
    } else {
      setCalendarMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(prev => prev + 1);
    } else {
      setCalendarMonth(prev => prev + 1);
    }
  };

  // Accordion collapses in Screen 2: All Expenses
  const [novemberExpanded, setNovemberExpanded] = useState(true);
  const [decemberExpanded, setDecemberExpanded] = useState(false);
  const [plannedExpanded, setPlannedExpanded] = useState(false);

  // Interactive Breakdown Accordion in Screen 1 (Overview)
  const [showRouteBreakdown, setShowRouteBreakdown] = useState(false);

  // Form State for Screen 3 (Add) & Screen 6 (Edit)
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('Transport');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formDate, setFormDate] = useState<string>('2026-11-17');
  const [formTime, setFormTime] = useState<string>('06:00 AM');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<PaymentMethod>('UPI');
  const [formDestination, setFormDestination] = useState<string>('');
  const [formReceiptUrl, setFormReceiptUrl] = useState<string>('');
  const [formReceiptName, setFormReceiptName] = useState<string>('');
  const [formReceiptSize, setFormReceiptSize] = useState<string>('');
  const [formIsReimbursed, setFormIsReimbursed] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Lightbox Modal for Receipt Fullscreen
  const [lightboxReceiptUrl, setLightboxReceiptUrl] = useState<string | null>(null);

  // Three-dot menu in Expense Details
  const [showDetailsMenu, setShowDetailsMenu] = useState(false);

  // Quick Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Hidden File input ref for receipt upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active selected expense for Details and Edit screens
  const selectedExpense = useMemo(() => {
    if (!selectedExpenseId) {
      return expenses.length > 0 ? expenses[0] : null;
    }
    return expenses.find(e => e.id === selectedExpenseId) || expenses[0] || null;
  }, [expenses, selectedExpenseId]);

  // Navigate to screen with history tracking
  const navigateTo = (screen: BudgetSubScreen, expenseId?: string) => {
    setPreviousScreen(currentScreen);
    if (expenseId) {
      setSelectedExpenseId(expenseId);
    }
    setCurrentScreen(screen);
  };

  // Open Edit Expense Screen with prefilled form
  const handleOpenEditScreen = (exp: Expense) => {
    setSelectedExpenseId(exp.id);
    setFormCategory(exp.category);
    setFormAmount(String(exp.amount || ''));
    setFormDate(exp.date || '2026-11-17');
    setFormTime(exp.time || '06:00 AM');
    setFormTitle(exp.title || '');
    setFormNotes(exp.notes || '');
    setFormPaymentMethod(exp.paymentMethod || 'UPI');
    setFormDestination(exp.destination || '');
    setFormReceiptUrl(exp.receiptUrl || '');
    setFormReceiptName(exp.receiptName || (exp.receiptUrl ? 'receipt.jpg' : ''));
    setFormReceiptSize(exp.receiptSize || (exp.receiptUrl ? '245 KB' : ''));
    setFormIsReimbursed(Boolean(exp.isReimbursed));
    navigateTo('edit', exp.id);
  };

  // Open Add Expense Screen with fresh form
  const handleOpenAddScreen = () => {
    if (onAddExpense) {
      onAddExpense();
      return;
    }
    setSelectedExpenseId(null);
    setFormCategory('Transport');
    setFormAmount('');
    setFormDate('2026-11-17');
    setFormTime('06:00 AM');
    setFormTitle('');
    setFormNotes('');
    setFormPaymentMethod('UPI');
    setFormDestination('');
    setFormReceiptUrl('');
    setFormReceiptName('');
    setFormReceiptSize('');
    setFormIsReimbursed(false);
    navigateTo('add');
  };

  // Handle Form Submission (Add or Update)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const amountNum = parseFloat(formAmount);
    if (!formAmount || isNaN(amountNum) || !Number.isFinite(amountNum) || amountNum <= 0) {
      setAlertMessage('Please enter a valid amount greater than ₹0');
      return;
    }

    const resolvedTitle = formTitle.trim() || getCategoryDisplayLabel(formCategory);

    setIsSubmitting(true);
    try {
      const payload: Partial<Expense> = {
        id: currentScreen === 'edit' && selectedExpense ? selectedExpense.id : undefined,
        title: resolvedTitle,
        amount: amountNum,
        date: formDate,
        time: formTime,
        category: formCategory,
        paymentMethod: formPaymentMethod,
        destination: formDestination.trim() || undefined,
        notes: formNotes.trim() || undefined,
        receiptUrl: formReceiptUrl || undefined,
        receiptName: formReceiptName || undefined,
        receiptSize: formReceiptSize || undefined,
        status: formIsReimbursed ? 'Reimbursed' : 'Paid',
        isReimbursed: formIsReimbursed,
        addedOn: formatDateWithDay(formDate),
        isCashInflow: false,
      };

      if (onSaveExpense) {
        await onSaveExpense(payload);
      } else if (currentScreen === 'edit' && selectedExpense) {
        onEditExpense({ ...selectedExpense, ...payload } as Expense);
      } else {
        onAddExpense();
      }

      showToast(currentScreen === 'edit' ? 'Expense updated successfully' : 'Expense recorded successfully');
      navigateTo('overview');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Receipt File Selection Handler (simulated local preview)
  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeKB = Math.round(file.size / 1024) + ' KB';
    setFormReceiptName(file.name);
    setFormReceiptSize(sizeKB);

    const reader = new FileReader();
    reader.onload = ev => {
      if (ev.target?.result) {
        setFormReceiptUrl(ev.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Duplicate Expense handler
  const handleDuplicateExpense = () => {
    if (!selectedExpense) return;
    setFormCategory(selectedExpense.category);
    setFormAmount(String(selectedExpense.amount));
    setFormDate(selectedExpense.date);
    setFormTime(selectedExpense.time || '12:00 PM');
    setFormTitle(`${selectedExpense.title} (Copy)`);
    setFormNotes(selectedExpense.notes || '');
    setFormPaymentMethod(selectedExpense.paymentMethod);
    setFormDestination(selectedExpense.destination || '');
    setFormReceiptUrl(selectedExpense.receiptUrl || '');
    setFormReceiptName(selectedExpense.receiptName || '');
    setFormReceiptSize(selectedExpense.receiptSize || '');
    setFormIsReimbursed(false);
    navigateTo('add');
    showToast('Duplicating expense. Review and save.');
  };

  // Toggle Reimbursed Status
  const handleToggleReimbursed = async () => {
    if (!selectedExpense) return;
    const updatedStatus = !formIsReimbursed;
    setFormIsReimbursed(updatedStatus);
    if (onSaveExpense) {
      await onSaveExpense({
        id: selectedExpense.id,
        isReimbursed: updatedStatus,
        status: updatedStatus ? 'Reimbursed' : 'Paid',
      });
      showToast(updatedStatus ? 'Marked as Reimbursed' : 'Marked as Paid');
    }
  };

  // Export CSV handler
  const handleExportCSV = () => {
    if (typeof window === 'undefined') return;
    const csvContent = generateExpensesCSV(expenses);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `yatra_expenses_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Expenses CSV exported successfully!');
  };

  // Filtered expenses for Screen 2 (All Expenses)
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      // Category filter
      if (selectedCategoryFilter !== 'All') {
        const catLower = selectedCategoryFilter.toLowerCase();
        if (catLower === 'stay') {
          if (e.category !== 'Accommodation') return false;
        } else if (catLower === 'temple') {
          if (e.category !== 'Temple / donation') return false;
        } else if (e.category.toLowerCase() !== catLower) {
          return false;
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesTitle = e.title.toLowerCase().includes(q);
        const matchesNotes = (e.notes || '').toLowerCase().includes(q);
        const matchesDest = (e.destination || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesNotes && !matchesDest) return false;
      }

      return true;
    });
  }, [expenses, selectedCategoryFilter, searchTerm]);

  // Grouped expenses for November and December
  const novemberExpenses = useMemo(() => {
    return filteredExpenses.filter(e => e.date.startsWith('2026-11'));
  }, [filteredExpenses]);

  const decemberExpenses = useMemo(() => {
    return filteredExpenses.filter(e => e.date.startsWith('2026-12'));
  }, [filteredExpenses]);

  const novemberTotal = useMemo(() => {
    return novemberExpenses.reduce((sum, e) => sum + (e.isCashInflow ? 0 : e.amount), 0);
  }, [novemberExpenses]);

  const decemberTotal = useMemo(() => {
    return decemberExpenses.reduce((sum, e) => sum + (e.isCashInflow ? 0 : e.amount), 0);
  }, [decemberExpenses]);

  // Category breakdown calculations for Donut Chart & Summary (reconciled strictly to total spent)
  const categoryBreakdown = useMemo(() => {
    const total = budgetCalc.totalSpent;
    const catMap: Record<ExpenseCategory, number> = {
      Transport: 0,
      Accommodation: 0,
      Food: 0,
      'Temple / donation': 0,
      Sightseeing: 0,
      Shopping: 0,
      Other: 0,
    };

    expenses.forEach(e => {
      if (!e.isCashInflow && catMap[e.category] !== undefined) {
        catMap[e.category] += Number(e.amount || 0);
      }
    });

    return ALL_CATEGORIES.map(category => {
      const amount = catMap[category];
      const percentage = total > 0 ? Math.round((amount / total) * 100) : 0;
      return {
        category,
        label: getCategoryDisplayLabel(category),
        amount,
        percentage,
        color: CATEGORY_COLORS[category],
        bgColor: CATEGORY_BG_COLORS[category],
      };
    });
  }, [expenses, budgetCalc.totalSpent]);

  // Recent expenses for Overview card (strictly genuine records, no fabricated sample fallbacks)
  const recentExpenses = useMemo(() => {
    return expenses.slice(0, 5);
  }, [expenses]);

  // Daily spending summary grouping expenses by date
  const dailySpendingSummary = useMemo(() => {
    const map = new Map<string, { date: string; amount: number; count: number }>();
    for (const exp of expenses) {
      if (exp.isCashInflow) continue;
      const cur = map.get(exp.date) || { date: exp.date, amount: 0, count: 0 };
      cur.amount += Number(exp.amount || 0);
      cur.count += 1;
      map.set(exp.date, cur);
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [expenses]);

  // 19-Day Pilgrimage Circuit Calendar Days for Daily Budget Visualizer (Item 3)
  const pilgrimageCalendarDays = useMemo(() => {
    const list: {
      dateStr: string;
      dayNum: number;
      dayName: string;
      formattedDate: string;
      monthName: string;
      spent: number;
      count: number;
      matchingExpenses: Expense[];
    }[] = [];
    const baseDate = new Date(2026, 10, 17); // Nov 17 2026
    for (let i = 0; i < 19; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      const dayExpenses = expenses.filter(e => e.date === dateStr && !e.isCashInflow);
      const spent = dayExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      list.push({
        dateStr,
        dayNum: i + 1,
        dayName,
        formattedDate: `${d.getDate()} ${monthName}`,
        monthName,
        spent,
        count: dayExpenses.length,
        matchingExpenses: dayExpenses,
      });
    }
    return list;
  }, [expenses]);

  // Comprehensive Interactive Monthly Calendar (All Months & All Years) — User Item 3
  const monthlyCalendarData = useMemo(() => {
    const year = calendarYear;
    const startDayOfWeek = new Date(year, calendarMonth, 1).getDay(); // 0 = Sun, 1 = Mon ...
    const daysInMonth = new Date(year, calendarMonth + 1, 0).getDate();
    const MONTH_LABELS = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthName = MONTH_LABELS[calendarMonth] || 'November';

    // Pilgrimage window starts 2026-11-17 (Day 1) to 2026-12-05 (Day 19)
    const pilgrimageStart = new Date(2026, 10, 17).getTime();
    const pilgrimageEnd = new Date(2026, 11, 5).getTime();

    const days = [];
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const d = new Date(year, calendarMonth, dayNum);
      const mm = String(calendarMonth + 1).padStart(2, '0');
      const dd = String(dayNum).padStart(2, '0');
      const dateStr = `${year}-${mm}-${dd}`;
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

      // Check if within 19-day pilgrimage
      const dTime = d.getTime();
      let pilgrimageDayIndex: number | null = null;
      if (year === 2026 && dTime >= pilgrimageStart && dTime <= pilgrimageEnd) {
        pilgrimageDayIndex = Math.round((dTime - pilgrimageStart) / (1000 * 60 * 60 * 24)) + 1;
      }

      const dayExpenses = expenses.filter(e => e.date === dateStr && !e.isCashInflow);
      const spent = dayExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

      days.push({
        dayNum,
        dateStr,
        dayName,
        monthName,
        formattedDate: `${dayNum} ${monthName.slice(0, 3)}`,
        pilgrimageDayIndex,
        spent,
        count: dayExpenses.length,
        matchingExpenses: dayExpenses,
      });
    }

    const monthPrefix = `${year}-${String(calendarMonth + 1).padStart(2, '0')}`;
    const monthExpenses = expenses.filter(e => {
      if (e.isCashInflow) return false;
      return (e.date || '').startsWith(monthPrefix);
    });
    const totalMonthSpent = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0);

    return {
      monthName,
      year,
      startDayOfWeek,
      daysInMonth,
      days,
      totalMonthSpent,
      expenseCount: monthExpenses.length,
    };
  }, [calendarYear, calendarMonth, expenses]);

  // Planned budget flag: "Budget not set" until a real confirmed amount is entered
  const isBudgetSet = Boolean(trip.totalBudget && trip.totalBudget > 0);
  const totalTripBudget = isBudgetSet ? trip.totalBudget : 0;
  // Total spending = sum of saved expenses belonging to this trip
  const totalTripSpent = budgetCalc.totalSpent;
  // Remaining budget = planned budget − total spending (when budget exists)
  const totalTripRemaining = isBudgetSet ? (totalTripBudget - totalTripSpent) : 0;
  // Budget utilization = total spending ÷ planned budget × 100, only when the planned budget is greater than zero
  const percentSpentNumber = isBudgetSet ? Math.round((totalTripSpent / totalTripBudget) * 100) : 0;

  // Circular gauge circumference
  const gaugeRadius = 38;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeOffset = isBudgetSet
    ? gaugeCircumference - (Math.min(100, Math.max(0, percentSpentNumber)) / 100) * gaugeCircumference
    : gaugeCircumference;

  // Wallet & Payment Method Breakdown: Total UPI, Remaining UPI, Total Hand Cash, Remaining Hand Cash, Emergency Reserve
  const walletBreakdown = useMemo(() => {
    const openingCash = Math.max(0, Number(trip.openingCash || 0));
    let cashExpenses = 0;
    let cashInflows = 0;
    let upiExpenses = 0;
    let cardExpenses = 0;
    let otherDigitalExpenses = 0;

    for (const exp of expenses) {
      const amt = Number(exp.amount || 0);
      if (exp.isCashInflow) {
        cashInflows += amt;
      } else if (exp.paymentMethod === 'Cash') {
        cashExpenses += amt;
      } else if (exp.paymentMethod === 'UPI') {
        upiExpenses += amt;
      } else if (exp.paymentMethod === 'Debit / credit card') {
        cardExpenses += amt;
      } else {
        otherDigitalExpenses += amt;
      }
    }

    const totalHandCash = openingCash + cashInflows;
    const remainingHandCash = totalHandCash - cashExpenses;

    const emergencyReserve = Math.max(0, Number(trip.emergencyReserve || 0));

    // Calculate Total UPI Allocation
    let totalUpiAmount = 0;
    if (trip.totalUpiAmount !== undefined && trip.totalUpiAmount > 0) {
      totalUpiAmount = trip.totalUpiAmount;
    } else if (isBudgetSet) {
      totalUpiAmount = Math.max(0, totalTripBudget - openingCash - emergencyReserve);
    }

    const upiSpent = upiExpenses + cardExpenses + otherDigitalExpenses;
    const remainingUpi = isBudgetSet ? totalUpiAmount - upiSpent : 0;

    const upiPercentUsed = totalUpiAmount > 0 ? Math.min(100, Math.round((upiSpent / totalUpiAmount) * 100)) : 0;
    const cashPercentUsed = totalHandCash > 0 ? Math.min(100, Math.round((cashExpenses / totalHandCash) * 100)) : 0;

    return {
      openingCash,
      totalHandCash,
      cashExpenses,
      cashInflows,
      remainingHandCash,
      emergencyReserve,
      totalUpiAmount,
      upiSpent,
      remainingUpi,
      upiPercentUsed,
      cashPercentUsed,
    };
  }, [trip, expenses, isBudgetSet, totalTripBudget]);

  // Donut chart SVG segments
  const donutRadius = 42;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let accumulatedPercent = 0;
  const donutSegments = categoryBreakdown.map(cat => {
    const strokeDasharray = `${(cat.percentage / 100) * donutCircumference} ${donutCircumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * donutCircumference);
    accumulatedPercent += cat.percentage;
    return {
      ...cat,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="space-y-4 pb-8 w-full max-w-full overflow-x-clip">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-[#0F5B44] to-teal-800 text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-xl border border-white/20 flex items-center gap-2 animate-in fade-in zoom-in-95 card-3d">
          <Check className="w-4 h-4 stroke-[3] text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden File Input for Receipt Picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleReceiptFileChange}
      />

      {/* Lightbox Modal for Receipt Fullscreen */}
      {lightboxReceiptUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxReceiptUrl(null)}
        >
          <div className="relative max-w-sm sm:max-w-md w-full bg-white rounded-3xl overflow-hidden shadow-2xl p-2 card-3d">
            <button
              onClick={() => setLightboxReceiptUrl(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={lightboxReceiptUrl}
              alt="Receipt Preview"
              className="w-full h-auto max-h-[80vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOP 3D SEGMENTED NAVIGATION DOCK                                          */}
      {/* ========================================================================= */}
      <div className="glass-dock p-1 sm:p-1.5 rounded-2xl flex items-center justify-between gap-0.5 sm:gap-1 border border-white/80 shadow-[0_8px_20px_-4px_rgba(15,91,68,0.08)]">
        <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar flex-1 min-w-0 py-0.5">
          <button
            onClick={() => navigateTo('overview')}
            className={`py-1.5 sm:py-2 px-1.5 sm:px-3 rounded-xl text-[10px] sm:text-xs font-black transition-all flex items-center gap-1 sm:gap-1.5 card-press-3d shrink-0 whitespace-nowrap ${
              currentScreen === 'overview'
                ? 'bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white shadow-md shadow-emerald-950/20 ring-1 ring-emerald-300/40'
                : 'text-gray-700 hover:text-[#0F5B44] hover:bg-emerald-50/50'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => navigateTo('list')}
            className={`py-1.5 sm:py-2 px-1.5 sm:px-3 rounded-xl text-[10px] sm:text-xs font-black transition-all flex items-center gap-1 sm:gap-1.5 card-press-3d shrink-0 whitespace-nowrap ${
              currentScreen === 'list'
                ? 'bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white shadow-md shadow-emerald-950/20 ring-1 ring-emerald-300/40'
                : 'text-gray-700 hover:text-[#0F5B44] hover:bg-emerald-50/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Expenses ({expenses.length})</span>
          </button>

          <button
            onClick={() => navigateTo('category-summary')}
            className={`py-1.5 sm:py-2 px-1.5 sm:px-3 rounded-xl text-[10px] sm:text-xs font-black transition-all flex items-center gap-1 sm:gap-1.5 card-press-3d shrink-0 whitespace-nowrap ${
              currentScreen === 'category-summary'
                ? 'bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white shadow-md shadow-emerald-950/20 ring-1 ring-emerald-300/40'
                : 'text-gray-700 hover:text-[#0F5B44] hover:bg-emerald-50/50'
            }`}
          >
            <PieChart className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Categories</span>
          </button>
        </div>

        {/* Right Dock Utilities */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 pl-1 border-l border-gray-200">
          <button
            onClick={handleExportCSV}
            className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-emerald-50 hover:text-[#0F5B44] transition-all card-press-3d shadow-2xs"
            title="Export Expenses as CSV"
            aria-label="Export CSV"
          >
            <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.2]" />
          </button>

          <button
            onClick={onEditTripSettings}
            className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-emerald-50 hover:text-[#0F5B44] transition-all card-press-3d shadow-2xs"
            title="Trip budget settings"
            aria-label="Trip budget settings"
          >
            <Settings className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SCREEN 1: BUDGET OVERVIEW                                                  */}
      {/* ========================================================================= */}
      {currentScreen === 'overview' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Section Header: Budget & Expenses + Quick Add Button */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-none flex items-center gap-2">
                <span>Budget &amp; Expenses</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-1">
                Track your trip expenses
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleOpenAddScreen}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#0F5B44] to-teal-700 text-white text-xs font-bold shadow-xs hover:shadow-sm card-press-3d"
                title="Add New Expense"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add Expense</span>
              </button>
            </div>
          </div>

          {/* Total Budget Card - 3D Glass Elevation with Specular Sheen */}
          <div className="glass-card card-3d card-depth-3d p-3.5 sm:p-5 md:p-6 rounded-[28px] border border-white/90 shadow-[0_16px_40px_-10px_rgba(15,91,68,0.12)] space-y-3.5 sm:space-y-4 relative overflow-hidden shimmer-sheen">
            {/* Ambient Background Glow Layer */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-gradient-to-bl from-emerald-400/15 via-teal-300/10 to-transparent pointer-events-none blur-2xl" />

            <div className="flex items-center gap-2.5 sm:gap-6 relative z-10">
              {/* Circular Gauge Ring with 3D Center Hub and Ambient Drop Glow */}
              <div className="relative w-20 h-20 sm:w-28 sm:h-28 flex-shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 90 90">
                  <defs>
                    <linearGradient id="budgetGaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0F5B44" />
                      <stop offset="50%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#14b8a6" />
                    </linearGradient>
                    <linearGradient id="budgetOverrunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#b91c1c" />
                    </linearGradient>
                  </defs>
                  {/* Background Track */}
                  <circle
                    cx="45"
                    cy="45"
                    r={gaugeRadius}
                    className="stroke-[#e8f5ef]"
                    strokeWidth="9"
                    fill="transparent"
                  />
                  {/* Glowing Indicator Arc */}
                  <circle
                    cx="45"
                    cy="45"
                    r={gaugeRadius}
                    stroke={totalTripRemaining < 0 ? 'url(#budgetOverrunGrad)' : 'url(#budgetGaugeGrad)'}
                    strokeWidth="9"
                    strokeDasharray={gaugeCircumference}
                    strokeDashoffset={gaugeOffset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-700 ease-out"
                    style={{
                      filter: 'drop-shadow(0 2px 6px rgba(16, 185, 129, 0.35))',
                    }}
                  />
                </svg>

                {/* 3D Embossed Center Hub */}
                <div className="absolute inset-1.5 sm:inset-2.5 rounded-full bg-gradient-to-tr from-white via-emerald-50/50 to-white shadow-inner flex flex-col items-center justify-center border border-white/80">
                  <span className="text-lg sm:text-2xl font-black text-gray-900 leading-none tracking-tight">
                    {isBudgetSet ? `${percentSpentNumber}%` : '—'}
                  </span>
                  <span className="text-[8px] sm:text-[10px] font-extrabold text-[#0F5B44] uppercase tracking-wider mt-0.5 sm:mt-1 px-1.5 sm:px-2 py-0.2 rounded-full bg-emerald-100/60 border border-emerald-200/50 shadow-2xs">
                    {isBudgetSet ? 'Utilized' : 'No Budget'}
                  </span>
                </div>
              </div>

              {/* Budget Amounts & Action Controls */}
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider truncate">
                    Total Budget
                  </span>
                  <button
                    onClick={onEditTripSettings}
                    className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-900 hover:from-emerald-100 hover:to-teal-100 border border-emerald-200/80 transition-all card-press-3d shadow-2xs flex-shrink-0"
                  >
                    <Edit2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.4] text-[#0F5B44]" />
                    <span>{isBudgetSet ? 'Edit' : 'Set Budget'}</span>
                  </button>
                </div>

                <div className="text-xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-none">
                  {isBudgetSet ? (
                    <span className="bg-gradient-to-r from-gray-900 via-emerald-950 to-teal-900 bg-clip-text text-transparent">
                      {formatRupee(totalTripBudget)}
                    </span>
                  ) : (
                    <span className="text-xs sm:text-base font-black text-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-2xl inline-flex items-center gap-1.5 border border-amber-200/80 shadow-2xs">
                      <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 flex-shrink-0" />
                      <span>Budget not set</span>
                    </span>
                  )}
                </div>

                {/* 3D Embossed Metric Tiles for Spent and Remaining */}
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <div className="glass-pill-3d p-2 sm:p-3 rounded-2xl border border-white/80 shadow-xs flex flex-col justify-between min-w-0">
                    <div className="flex items-center justify-between text-gray-500">
                      <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider truncate">Spent</span>
                      <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 flex-shrink-0" />
                    </div>
                    <span className="text-xs sm:text-base font-black text-[#0F5B44] mt-0.5 sm:mt-1 truncate">
                      {formatRupee(totalTripSpent)}
                    </span>
                  </div>

                  <div className="glass-pill-3d p-2 sm:p-3 rounded-2xl border border-white/80 shadow-xs flex flex-col justify-between min-w-0">
                    <div className="flex items-center justify-between text-gray-500">
                      <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider truncate">Remaining</span>
                      <Coins className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-teal-600 flex-shrink-0" />
                    </div>
                    <span
                      className={`text-xs sm:text-base font-black mt-0.5 sm:mt-1 truncate ${
                        !isBudgetSet
                          ? 'text-gray-400 font-medium text-[10px] sm:text-xs'
                          : totalTripRemaining < 0
                          ? 'text-red-600'
                          : 'text-[#0F5B44]'
                      }`}
                    >
                      {isBudgetSet ? formatRupee(totalTripRemaining) : 'Budget not set'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3D Horizontal Progress Track */}
            <div className="w-full bg-[#e8f5ef] h-2.5 rounded-full overflow-hidden p-0.5 border border-emerald-100 shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  totalTripRemaining < 0
                    ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-sm shadow-red-500/50'
                    : 'bg-gradient-to-r from-[#0F5B44] via-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/50'
                }`}
                style={{ width: `${isBudgetSet ? Math.min(100, Math.max(0, percentSpentNumber)) : 0}%` }}
              />
            </div>

            {/* Budget Overrun Alert */}
            {isBudgetSet && totalTripRemaining < 0 && (
              <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-gradient-to-r from-red-50 via-rose-50 to-red-50 border border-red-200 text-red-800 text-xs font-bold shadow-xs animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 animate-bounce" />
                <span>Budget Overrun: Spending exceeds target budget by {formatRupee(Math.abs(totalTripRemaining))}</span>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SEPARATE BOX: UPI, HAND CASH & EMERGENCY RESERVE BREAKDOWN                */}
          {/* ========================================================================= */}
          <div className="glass-card card-3d card-depth-3d p-4 sm:p-5 rounded-[28px] border border-white/90 shadow-[0_16px_40px_-10px_rgba(15,91,68,0.12)] space-y-4 relative overflow-hidden shimmer-sheen">
            {/* Ambient Ambient Glow Background */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-52 h-52 rounded-full bg-gradient-to-bl from-teal-400/15 via-emerald-300/10 to-transparent pointer-events-none blur-2xl" />

            {/* Header */}
            <div className="flex items-center justify-between gap-2 relative z-10">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-[#0F5B44] via-[#146b51] to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-950/20 ring-1 ring-emerald-300/40 shrink-0">
                  <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.3]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-black text-gray-900 tracking-tight flex items-center gap-1.5 truncate">
                    <span className="truncate">Payment Modes &amp; Cash Balances</span>
                    <span className="text-[9px] sm:text-[10px] font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-200/60 px-1.5 sm:px-2 py-0.2 rounded-full shrink-0">
                      Live
                    </span>
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium truncate">
                    UPI Digital, Hand Cash &amp; Reserve
                  </p>
                </div>
              </div>

              <button
                onClick={onEditTripSettings}
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-white/90 hover:bg-emerald-50 text-[#0F5B44] border border-emerald-200/80 transition-all card-press-3d shadow-2xs shrink-0"
                title="Configure UPI, Cash and Emergency Reserve"
              >
                <Edit2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.4] text-[#0F5B44]" />
                <span>Allocate Funds</span>
              </button>
            </div>

            {/* 3 Main Compartments: UPI, Hand Cash, Emergency Reserve */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative z-10">
              {/* 1. UPI WALLET */}
              <div className="glass-pill-3d p-3.5 sm:p-4 rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-white/95 via-emerald-50/40 to-white/90 shadow-sm flex flex-col justify-between space-y-3 relative group hover:border-emerald-300 transition-all">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-6 h-6 rounded-xl bg-gradient-to-tr from-[#0F5B44] to-emerald-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                      <Smartphone className="w-3.5 h-3.5 stroke-[2.2]" />
                    </span>
                    <span className="text-[11px] font-black text-gray-900 uppercase tracking-wider truncate">
                      UPI Digital
                    </span>
                  </div>
                  <span className="text-[9px] font-black text-emerald-900 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-200/70 shrink-0">
                    GPay / PhonePe
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Total UPI Amount
                    </span>
                    <span className="text-sm sm:text-base font-black text-gray-900 tracking-tight">
                      {isBudgetSet ? formatRupee(walletBreakdown.totalUpiAmount) : '—'}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between gap-1 pt-1.5 border-t border-emerald-100/70">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Remaining UPI Amount
                    </span>
                    <span className={`text-sm sm:text-base font-black tracking-tight ${
                      !isBudgetSet
                        ? 'text-gray-400'
                        : walletBreakdown.remainingUpi < 0
                        ? 'text-red-600'
                        : 'text-[#0F5B44]'
                    }`}>
                      {isBudgetSet ? formatRupee(walletBreakdown.remainingUpi) : '—'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium">
                    <span>Spent via UPI: <strong className="text-gray-900 font-black">{formatRupee(walletBreakdown.upiSpent)}</strong></span>
                    <span>{isBudgetSet && walletBreakdown.totalUpiAmount > 0 ? `${walletBreakdown.upiPercentUsed}% used` : ''}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-emerald-100/70 overflow-hidden shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        walletBreakdown.remainingUpi < 0
                          ? 'bg-gradient-to-r from-red-500 to-rose-600'
                          : 'bg-gradient-to-r from-[#0F5B44] via-emerald-500 to-teal-400'
                      }`}
                      style={{ width: `${isBudgetSet && walletBreakdown.totalUpiAmount > 0 ? walletBreakdown.upiPercentUsed : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 2. HAND CASH */}
              <div className="glass-pill-3d p-3.5 sm:p-4 rounded-2xl border border-amber-200/70 bg-gradient-to-br from-white/95 via-amber-50/40 to-white/90 shadow-sm flex flex-col justify-between space-y-3 relative group hover:border-amber-300 transition-all">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-6 h-6 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                      <Banknote className="w-3.5 h-3.5 stroke-[2.2]" />
                    </span>
                    <span className="text-[11px] font-black text-gray-900 uppercase tracking-wider truncate">
                      Hand Cash
                    </span>
                  </div>
                  <span className="text-[9px] font-black text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200/70 shrink-0">
                    Physical Cash
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Total Hand Cash
                    </span>
                    <span className="text-sm sm:text-base font-black text-gray-900 tracking-tight">
                      {formatRupee(walletBreakdown.totalHandCash)}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between gap-1 pt-1.5 border-t border-amber-100/70">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Remaining Hand Cash
                    </span>
                    <span className={`text-sm sm:text-base font-black tracking-tight ${
                      walletBreakdown.remainingHandCash < 0
                        ? 'text-red-600'
                        : walletBreakdown.remainingHandCash === 0 && walletBreakdown.totalHandCash === 0
                        ? 'text-gray-400'
                        : 'text-amber-800'
                    }`}>
                      {formatRupee(walletBreakdown.remainingHandCash)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium">
                    <span>Spent in Cash: <strong className="text-gray-900 font-black">{formatRupee(walletBreakdown.cashExpenses)}</strong></span>
                    <span>{walletBreakdown.totalHandCash > 0 ? `${walletBreakdown.cashPercentUsed}% used` : ''}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-amber-100/70 overflow-hidden shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        walletBreakdown.remainingHandCash < 0
                          ? 'bg-gradient-to-r from-red-500 to-rose-600'
                          : 'bg-gradient-to-r from-amber-500 via-orange-400 to-amber-600'
                      }`}
                      style={{ width: `${walletBreakdown.totalHandCash > 0 ? walletBreakdown.cashPercentUsed : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 3. EMERGENCY RESERVE */}
              <div className="glass-pill-3d p-3.5 sm:p-4 rounded-2xl border border-teal-200/70 bg-gradient-to-br from-white/95 via-teal-50/40 to-white/90 shadow-sm flex flex-col justify-between space-y-3 relative group hover:border-teal-300 transition-all">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-6 h-6 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                      <ShieldAlert className="w-3.5 h-3.5 stroke-[2.2]" />
                    </span>
                    <span className="text-[11px] font-black text-gray-900 uppercase tracking-wider truncate">
                      Emergency Reserve
                    </span>
                  </div>
                  <span className="text-[9px] font-black text-teal-900 bg-teal-100/90 px-2 py-0.5 rounded-full border border-teal-200/70 shrink-0">
                    Contingency
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Emergency Reserve
                    </span>
                    <span className="text-sm sm:text-base font-black text-[#0F5B44] tracking-tight">
                      {formatRupee(walletBreakdown.emergencyReserve)}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between gap-1 pt-1.5 border-t border-teal-100/70">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Reserve Status
                    </span>
                    <span className={`text-[11px] font-black tracking-tight ${
                      walletBreakdown.emergencyReserve > 0
                        ? 'text-teal-700'
                        : 'text-gray-400'
                    }`}>
                      {walletBreakdown.emergencyReserve > 0 ? 'Protected & Untouched' : 'Not configured'}
                    </span>
                  </div>
                </div>

                <div className="pt-1 text-[10px] text-gray-500 leading-tight">
                  <span>Protected safety cushion for unexpected medical, route or travel contingencies.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Spending Progress Across 19-Day Trip - 3D Glass Elevation */}
          <div className="glass-card card-3d card-depth-3d p-3.5 sm:p-5 rounded-[26px] border border-white/90 shadow-[0_12px_32px_-6px_rgba(15,91,68,0.09)] space-y-3 sm:space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
              <h3 className="text-xs sm:text-sm font-black text-gray-900 flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.3]" />
                </div>
                <span className="truncate">Trip Spending Progress (19 Days)</span>
              </h3>
              <span className="text-[10px] sm:text-[11px] font-black text-emerald-900 bg-emerald-50 px-2 sm:px-2.5 py-0.5 rounded-full border border-emerald-200/60 shadow-2xs shrink-0">
                17 Nov – 5 Dec 2026
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-2.5 text-xs">
              <div className="glass-pill-3d p-2.5 sm:p-3 rounded-2xl space-y-0.5 border border-emerald-100/60 shadow-xs min-w-0">
                <span className="text-[9px] sm:text-[10px] text-gray-500 block font-bold uppercase tracking-wider truncate">Actual Daily Avg</span>
                <span className="text-sm sm:text-base font-black text-[#0F5B44] block truncate">
                  {formatRupee(budgetCalc.dailyAverage)}
                </span>
                <span className="text-[9px] sm:text-[10px] text-gray-400 block font-medium truncate">across 19 days</span>
              </div>

              <div className="glass-pill-3d p-2.5 sm:p-3 rounded-2xl space-y-0.5 border border-emerald-100/60 shadow-xs min-w-0">
                <span className="text-[9px] sm:text-[10px] text-gray-500 block font-bold uppercase tracking-wider truncate">Planned Daily Pace</span>
                <span className="text-sm sm:text-base font-black text-gray-900 block truncate">
                  {isBudgetSet ? `${formatRupee(totalTripBudget / 19)}` : 'Budget not set'}
                </span>
                <span className="text-[9px] sm:text-[10px] text-gray-400 block font-medium truncate">
                  {isBudgetSet ? 'target per day' : 'set budget in settings'}
                </span>
              </div>
            </div>

            {/* Planned Itinerary Estimates vs Actual Spending Distinction (Rule 3.3) */}
            <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-600 flex-wrap gap-2">
              <span className="font-medium">
                Planned Transport Estimates: <strong className="text-gray-900 font-black">₹3,940</strong> (Core: ₹2,180)
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 font-bold shadow-2xs">
                  Estimate · Not yet spent
                </span>
                <button
                  onClick={() => setShowRouteBreakdown(!showRouteBreakdown)}
                  className="text-[10px] font-bold text-[#0F5B44] hover:underline flex items-center gap-0.5 ml-1"
                >
                  <span>{showRouteBreakdown ? 'Hide' : 'Breakdown'}</span>
                  {showRouteBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Expandable 19-Day Planned Route Transport Breakdown */}
            {showRouteBreakdown && (
              <div className="mt-2 pt-2 border-t border-dashed border-gray-200 animate-in fade-in duration-200 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 px-1">
                  <span>19-Day Planned Rail &amp; Bus Allocations</span>
                  <span>Total: ₹3,940</span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 touch-scroll">
                  {ROUTE_ESTIMATES.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-gray-50/80 border border-gray-100 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-[#0F5B44] text-[10px] bg-emerald-50 px-1.5 py-0.2 rounded">
                            {item.day}
                          </span>
                          <span className="font-bold text-gray-800 text-[11px] truncate">
                            {item.route}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 block mt-0.5">
                          {item.mode} (Needs verification)
                        </span>
                      </div>
                      <span className="font-black text-gray-900 text-xs flex-shrink-0">
                        {item.est}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Expense by Category Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-2 min-w-0">
                <PieChart className="w-4 h-4 text-[#0F5B44] shrink-0" />
                <span className="truncate">Expense by Category</span>
              </h3>
              <button
                onClick={() => navigateTo('category-summary')}
                className="text-xs font-bold text-[#0F5B44] hover:underline inline-flex items-center gap-0.5 card-press-3d shrink-0"
              >
                <span>View Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Donut Chart Card - 3D Glass Elevation */}
            <div className="glass-card card-3d card-depth-3d p-5 rounded-[26px] border border-white/90 shadow-[0_12px_32px_-6px_rgba(15,91,68,0.09)] flex flex-col sm:flex-row items-center justify-between gap-6">
              {/* Donut Chart SVG with Center Glow */}
              <div className="relative w-36 h-36 flex-shrink-0 flex items-center justify-center filter drop-shadow-sm">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={donutRadius}
                    className="stroke-[#e8f5ef]"
                    strokeWidth="14"
                    fill="transparent"
                  />
                  {donutSegments.map(seg => (
                    <circle
                      key={seg.category}
                      cx="50"
                      cy="50"
                      r={donutRadius}
                      stroke={seg.color}
                      strokeWidth="14"
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-500 hover:opacity-85"
                    />
                  ))}
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
                  <span className="text-sm sm:text-base font-black text-gray-900 leading-tight">
                    {formatRupee(totalTripSpent)}
                  </span>
                  <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider mt-0.5">
                    Total Spent
                  </span>
                </div>
              </div>

              {/* Legend Grid with All 7 Canonical Categories */}
              <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {categoryBreakdown.map(cat => (
                  <div
                    key={cat.category}
                    onClick={() => {
                      setSelectedCategoryFilter(
                        cat.category === 'Accommodation'
                          ? 'Stay'
                          : cat.category === 'Temple / donation'
                          ? 'Temple'
                          : cat.category
                      );
                      navigateTo('list');
                    }}
                    className="flex items-center justify-between text-gray-700 py-1.5 px-2.5 rounded-xl hover:bg-emerald-50/60 transition-colors cursor-pointer group card-press-3d"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0 shadow-2xs ring-1 ring-black/10 group-hover:scale-110 transition-transform"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="truncate font-bold text-gray-800 text-[11px] sm:text-xs">
                        {cat.label}
                      </span>
                    </div>
                    <span className="font-black text-gray-900 ml-2">
                      {cat.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Expenses Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#0F5B44]" />
                <span>Recent Expenses</span>
              </h3>
              {recentExpenses.length > 0 && (
                <button
                  onClick={() => navigateTo('list')}
                  className="text-xs font-bold text-[#0F5B44] hover:underline inline-flex items-center gap-0.5 card-press-3d"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* List of Recent Cards or Clean Empty State */}
            {recentExpenses.length === 0 ? (
              <div className="glass-card card-3d card-depth-3d p-6 rounded-[24px] border border-white/80 shadow-[0_10px_25px_-6px_rgba(15,91,68,0.08)] text-center space-y-2.5">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-100 to-teal-50 text-[#0F5B44] border border-emerald-200/60 flex items-center justify-center font-bold shadow-md shadow-emerald-600/10 animate-float-3d">
                  <Wallet className="w-7 h-7 stroke-[2.2]" />
                </div>
                <h4 className="text-sm font-black text-gray-900">
                  No expenses recorded yet
                </h4>
                <p className="text-xs text-gray-500 max-w-xs mx-auto font-medium">
                  No expense records exist for this trip yet. Tap Add Expense below to record your actual spending.
                </p>
                <div className="pt-1">
                  <button
                    onClick={handleOpenAddScreen}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[#0F5B44] text-white hover:bg-[#16654f] transition-all card-press-3d shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Record First Expense</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {recentExpenses.map(expense => (
                  <div
                    key={expense.id}
                    onClick={() => navigateTo('details', expense.id)}
                    className="glass-card card-3d p-3.5 sm:p-4 rounded-2xl border border-white/90 shadow-[0_6px_18px_-4px_rgba(15,91,68,0.06)] flex items-center justify-between gap-3 cursor-pointer hover:border-emerald-200 transition-all card-press-3d"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs"
                        style={{
                          backgroundColor: CATEGORY_BG_COLORS[expense.category] || '#f3f4f6',
                          color: CATEGORY_COLORS[expense.category] || '#111827',
                        }}
                      >
                        {renderCategoryIcon(expense.category, 'w-5 h-5')}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                          {expense.title}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5 truncate font-medium">
                          {expense.destination && (
                            <>
                              <span className="truncate">{expense.destination}</span>
                              <span>·</span>
                            </>
                          )}
                          <span>{formatDateShort(expense.date)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-xs sm:text-sm font-black text-gray-900 block">
                        {formatRupee(expense.amount)}
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold block mt-0.5">
                        {expense.paymentMethod || 'UPI'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Daily Spending Summary Section with Interactive Calendar 📅 (Item 3) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#0F5B44]" />
                  <span>Daily Spending Summary</span>
                </h3>
                {dailySpendingSummary.length > 0 && (
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 shadow-2xs">
                    {dailySpendingSummary.length} {dailySpendingSummary.length === 1 ? 'day' : 'days'} with spending
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 bg-white/90 p-1 rounded-2xl border border-gray-200/80 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setDailyViewTab('calendar')}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all card-press-3d flex items-center gap-1 ${
                    dailyViewTab === 'calendar'
                      ? 'bg-gradient-to-r from-[#0F5B44] to-teal-700 text-white shadow-xs'
                      : 'text-gray-600 hover:text-emerald-800'
                  }`}
                >
                  <span>📅 Calendar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDailyViewTab('list')}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all card-press-3d flex items-center gap-1 ${
                    dailyViewTab === 'list'
                      ? 'bg-gradient-to-r from-[#0F5B44] to-teal-700 text-white shadow-xs'
                      : 'text-gray-600 hover:text-emerald-800'
                  }`}
                >
                  <span>📋 List</span>
                  {dailySpendingSummary.length > 0 && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                      {dailySpendingSummary.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Empty state when 0 expenses recorded yet */}
            {dailySpendingSummary.length === 0 && (
              <div className="glass-card card-3d card-depth-3d p-6 rounded-[24px] border border-white/80 shadow-[0_10px_25px_-6px_rgba(15,91,68,0.08)] text-center space-y-1">
                <p className="text-xs font-black text-gray-700">No daily spending recorded yet</p>
                <p className="text-[11px] text-gray-500 font-medium">
                  Daily totals will appear here automatically as you record trip expenses.
                </p>
              </div>
            )}

            {/* 1. Interactive Full Monthly Calendar Grid View (User Item 9) */}
            <div className={`space-y-3 ${dailyViewTab === 'calendar' ? 'block' : 'hidden'}`}>
              <div className="glass-card card-3d card-depth-3d rounded-3xl p-3.5 sm:p-5 border border-white/90 shadow-[0_12px_32px_-8px_rgba(15,91,68,0.1)] space-y-3.5">
                {/* Calendar Header with Month & Year Switcher (All Months & All Years) */}
                <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 flex-wrap gap-2">
                  <div className="flex items-center gap-1 sm:gap-1.5 p-1 bg-gray-100/90 rounded-2xl border border-gray-200/80 shadow-inner flex-wrap">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1 sm:p-1.5 rounded-xl hover:bg-white text-gray-700 hover:text-[#0F5B44] transition-all card-press-3d shrink-0"
                      title="Previous Month"
                      aria-label="Previous Month"
                    >
                      <ChevronLeft className="w-4 h-4 stroke-[2.4]" />
                    </button>

                    <select
                      value={calendarMonth}
                      onChange={e => setCalendarMonth(Number(e.target.value))}
                      className="bg-white font-black text-xs text-[#0F5B44] px-2 py-1 rounded-xl border border-gray-200/80 shadow-2xs cursor-pointer focus:outline-none"
                    >
                      {[
                        'January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'
                      ].map((name, idx) => (
                        <option key={name} value={idx}>
                          {name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={calendarYear}
                      onChange={e => setCalendarYear(Number(e.target.value))}
                      className="bg-white font-black text-xs text-gray-800 px-2 py-1 rounded-xl border border-gray-200/80 shadow-2xs cursor-pointer focus:outline-none"
                    >
                      {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1 sm:p-1.5 rounded-xl hover:bg-white text-gray-700 hover:text-[#0F5B44] transition-all card-press-3d shrink-0"
                      title="Next Month"
                      aria-label="Next Month"
                    >
                      <ChevronRight className="w-4 h-4 stroke-[2.4]" />
                    </button>

                    {(calendarMonth !== 10 || calendarYear !== 2026) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCalendarYear(2026);
                          setCalendarMonth(10);
                        }}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-[#0F5B44] text-white card-press-3d shadow-2xs ml-0.5"
                        title="Jump to Pilgrimage Nov 2026"
                      >
                        Nov 2026
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-gray-500">
                      Month Total:
                    </span>
                    <span className="text-xs font-black text-[#0F5B44] bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 shadow-2xs">
                      {formatRupee(monthlyCalendarData.totalMonthSpent)}
                    </span>
                  </div>
                </div>

                {/* Weekday Column Headers */}
                <div className="grid grid-cols-7 gap-1 text-center font-black text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider pb-1">
                  <div>Sun</div>
                  <div>Mon</div>
                  <div>Tue</div>
                  <div>Wed</div>
                  <div>Thu</div>
                  <div>Fri</div>
                  <div>Sat</div>
                </div>

                {/* Monthly Calendar 7-Column Grid */}
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                  {/* Empty slots for start-of-month offset */}
                  {Array.from({ length: monthlyCalendarData.startDayOfWeek }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="min-h-[58px] sm:min-h-[68px] rounded-xl bg-gray-50/40 border border-transparent opacity-30"
                    />
                  ))}

                  {/* Active Month Days */}
                  {monthlyCalendarData.days.map(day => {
                    const isSelected = selectedCalendarDay === day.dateStr;
                    const hasSpend = day.spent > 0;
                    const isPilgrimageDay = day.pilgrimageDayIndex !== null;

                    return (
                      <button
                        key={day.dateStr}
                        type="button"
                        onClick={() => setSelectedCalendarDay(day.dateStr)}
                        className={`p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border transition-all text-left card-press-3d flex flex-col justify-between min-h-[58px] sm:min-h-[68px] relative overflow-hidden ${
                          isSelected
                            ? 'bg-gradient-to-b from-emerald-50 to-white border-[#0F5B44] shadow-md ring-2 ring-emerald-400/50 scale-[1.02] z-10'
                            : isPilgrimageDay
                            ? hasSpend
                              ? 'bg-emerald-50/60 hover:bg-emerald-50 border-emerald-300 shadow-2xs'
                              : 'bg-emerald-50/20 hover:bg-emerald-50/40 border-emerald-200/60 shadow-2xs'
                            : hasSpend
                            ? 'bg-amber-50/40 hover:bg-amber-50/70 border-amber-200/80 shadow-2xs'
                            : 'bg-white/70 hover:bg-white border-gray-100 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span
                            className={`text-[11px] sm:text-xs font-black leading-none ${
                              isSelected
                                ? 'text-[#0F5B44]'
                                : isPilgrimageDay
                                ? 'text-emerald-950 font-black'
                                : 'text-gray-700'
                            }`}
                          >
                            {day.dayNum}
                          </span>

                          {isPilgrimageDay && (
                            <span
                              className={`text-[8px] sm:text-[9px] font-black px-1 rounded ${
                                isSelected
                                  ? 'bg-[#0F5B44] text-white'
                                  : 'bg-emerald-200/80 text-emerald-900'
                              }`}
                            >
                              D{day.pilgrimageDayIndex}
                            </span>
                          )}
                        </div>

                        <div className="mt-auto pt-1 w-full truncate">
                          {hasSpend ? (
                            <span className="text-[9px] sm:text-[10px] font-black text-[#0F5B44] block truncate">
                              {formatRupee(day.spent)}
                            </span>
                          ) : (
                            <span className="text-[8px] font-medium text-gray-300 block">
                              –
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Day Detail Inspector Card */}
                {(() => {
                  const activeMonthDay = monthlyCalendarData.days.find(d => d.dateStr === selectedCalendarDay);
                  const activeCircuitDay = pilgrimageCalendarDays.find(d => d.dateStr === selectedCalendarDay);
                  const dObj = new Date(selectedCalendarDay + 'T12:00:00');
                  const dayTitle = activeCircuitDay
                    ? `Day ${activeCircuitDay.dayNum} · ${activeCircuitDay.formattedDate} (${activeCircuitDay.dayName})`
                    : activeMonthDay
                    ? `${activeMonthDay.dayNum} ${activeMonthDay.monthName} 2026 (${activeMonthDay.dayName})`
                    : dObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', weekday: 'short' });

                  const matchingExpenses = expenses.filter(e => e.date === selectedCalendarDay && !e.isCashInflow);
                  const daySpent = matchingExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);

                  return (
                    <div className="pt-3 border-t border-gray-100 space-y-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#0F5B44] to-teal-700 text-white text-xs font-black shadow-2xs">
                            {dayTitle}
                          </span>
                          <span className="text-xs font-bold text-gray-500">
                            {matchingExpenses.length} {matchingExpenses.length === 1 ? 'expense' : 'expenses'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-emerald-950">
                            Day Total: {formatRupee(daySpent)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormDate(selectedCalendarDay);
                              handleOpenAddScreen();
                            }}
                            className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1 shadow-2xs card-press-3d"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Add Expense</span>
                          </button>
                        </div>
                      </div>

                      {matchingExpenses.length > 0 ? (
                        <div className="space-y-1.5 pt-1">
                          {matchingExpenses.map(exp => (
                            <div
                              key={exp.id}
                              onClick={() => navigateTo('details', exp.id)}
                              className="p-2.5 rounded-xl bg-white/90 hover:bg-white border border-gray-100 hover:border-emerald-200 flex items-center justify-between text-xs cursor-pointer card-press-3d shadow-2xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                <span className="font-bold text-gray-900 truncate">{exp.title}</span>
                                <span className="text-[10px] text-gray-400 px-1.5 py-0.5 rounded-md bg-gray-50 border border-gray-200">
                                  {exp.category} · {exp.paymentMethod || 'UPI'}
                                </span>
                              </div>
                              <span className="font-black text-[#0F5B44] shrink-0 ml-2">
                                {formatRupee(exp.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic pt-1">
                          No expenses recorded for this date. Click &quot;Add Expense&quot; to record spend for this date.
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 2. Chronological List View (Always rendered in DOM for tests & fast scanning) */}
            <div className={`space-y-2 ${dailyViewTab === 'list' ? 'block' : 'hidden'}`}>
              {dailySpendingSummary.length > 0 && (
                <div className="glass-card card-3d card-depth-3d rounded-[24px] border border-white/80 shadow-[0_10px_25px_-6px_rgba(15,91,68,0.08)] divide-y divide-gray-100 overflow-hidden">
                  {dailySpendingSummary.map(item => {
                    const dayPercent = totalTripSpent > 0 ? Math.round((item.amount / totalTripSpent) * 100) : 0;
                    return (
                      <div key={item.date} className="p-3.5 sm:p-4 flex items-center justify-between gap-3 text-xs hover:bg-emerald-50/40 transition-colors">
                        <div className="min-w-0">
                          <span className="font-black text-gray-900 block truncate text-xs sm:text-sm">
                            {formatDateWithDay(item.date)}
                          </span>
                          <span className="text-[11px] text-gray-400 block mt-0.5 font-medium">
                            {item.count} {item.count === 1 ? 'expense' : 'expenses'} recorded
                          </span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="font-black text-gray-900 block text-xs sm:text-sm">
                            {formatRupee(item.amount)}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold block">
                            {dayPercent}% of total
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Full-Width Add Expense Button - 3D Pill Button */}
          <div className="pt-2">
            <button
              onClick={handleOpenAddScreen}
              className="w-full py-4 px-5 rounded-full bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-950/20 hover:shadow-xl transition-all card-press-3d flex items-center justify-center gap-2 border border-emerald-300/30"
            >
              <Plus className="w-5 h-5 stroke-[2.8]" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 2: ALL EXPENSES LIST                                               */}
      {/* ========================================================================= */}
      {currentScreen === 'list' && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          {/* Top Bar: Back, Title, Date Range, Search Icon */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => navigateTo('overview')}
                className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-all card-press-3d shadow-xs"
                aria-label="Back to overview"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
              </button>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 leading-none">
                  All Expenses
                </h2>
                <p className="text-[11px] sm:text-xs text-gray-500 font-medium mt-1">
                  {trip.startDate && trip.endDate
                    ? `${formatDateShort(trip.startDate)} - ${formatDateShort(trip.endDate)}`
                    : '19 Nov 2026 - 5 Dec 2026'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowSearchInput(!showSearchInput)}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all card-press-3d shadow-xs ${
                showSearchInput || searchTerm
                  ? 'bg-[#e8f5ef] text-[#0F5B44] border-emerald-300'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
              aria-label="Toggle search"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Search Input (Toggleable) */}
          {showSearchInput && (
            <div className="relative animate-in fade-in">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search ticket, hotel, meal, city..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-gray-900 focus:border-[#0F5B44] focus:ring-1 focus:ring-[#0F5B44] outline-none shadow-xs"
                autoFocus
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Horizontal Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {['All', 'Transport', 'Stay', 'Food', 'Temple', 'Sightseeing', 'Shopping'].map(pill => {
              const isSelected = selectedCategoryFilter === pill;
              return (
                <button
                  key={pill}
                  onClick={() => setSelectedCategoryFilter(pill)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all card-press-3d ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#0F5B44] to-teal-700 text-white shadow-xs'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {pill}
                </button>
              );
            })}
          </div>

          {/* Group: November 2026 (Collapsible) */}
          <div className="space-y-2">
            <div
              onClick={() => setNovemberExpanded(!novemberExpanded)}
              className="flex items-center justify-between py-1 cursor-pointer select-none"
            >
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <span>November 2026</span>
                <span className="text-[10px] text-gray-500 font-semibold">({novemberExpenses.length})</span>
              </h3>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
                <span>{formatRupee(novemberTotal)}</span>
                {novemberExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </div>
            </div>

            {/* November Cards */}
            {novemberExpanded && (
              <div className="space-y-2">
                {novemberExpenses.length === 0 ? (
                  <div className="glass-card p-6 rounded-2xl border border-gray-100 text-center text-xs text-gray-400 font-medium">
                    No matching expenses found in November
                  </div>
                ) : (
                  novemberExpenses.map(expense => (
                    <div
                      key={expense.id}
                      onClick={() => navigateTo('details', expense.id)}
                      className="glass-card card-3d p-3.5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between gap-3 cursor-pointer hover:border-emerald-200 transition-all card-press-3d"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                          style={{
                            backgroundColor: CATEGORY_BG_COLORS[expense.category] || '#f3f4f6',
                            color: CATEGORY_COLORS[expense.category] || '#111827',
                          }}
                        >
                          {renderCategoryIcon(expense.category, 'w-5 h-5')}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                            {expense.title}
                          </h4>
                          <p className="text-[11px] text-gray-500 truncate mt-0.5 font-medium">
                            {expense.destination || expense.notes || 'Local expense'}
                          </p>
                          <span className="text-[10px] text-gray-400 block mt-0.5">
                            {formatDateShort(expense.date)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs sm:text-sm font-black text-gray-900">
                          {formatRupee(expense.amount)}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Group: December 2026 (Collapsible) */}
          <div className="space-y-2 pt-1 border-t border-gray-100">
            <div
              onClick={() => setDecemberExpanded(!decemberExpanded)}
              className="flex items-center justify-between py-1 cursor-pointer select-none"
            >
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <span>December 2026</span>
                <span className="text-[10px] text-gray-500 font-semibold">({decemberExpenses.length})</span>
              </h3>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
                <span>{formatRupee(decemberTotal)}</span>
                {decemberExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </div>
            </div>

            {decemberExpanded && (
              <div className="space-y-2">
                {decemberExpenses.length === 0 ? (
                  <div className="glass-card p-6 rounded-2xl border border-gray-100 text-center text-xs text-gray-400 font-medium">
                    No recorded expenses for December yet
                  </div>
                ) : (
                  decemberExpenses.map(expense => (
                    <div
                      key={expense.id}
                      onClick={() => navigateTo('details', expense.id)}
                      className="glass-card card-3d p-3.5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between gap-3 cursor-pointer hover:border-emerald-200 transition-all card-press-3d"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                          style={{
                            backgroundColor: CATEGORY_BG_COLORS[expense.category] || '#f3f4f6',
                            color: CATEGORY_COLORS[expense.category] || '#111827',
                          }}
                        >
                          {renderCategoryIcon(expense.category, 'w-5 h-5')}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                            {expense.title}
                          </h4>
                          <span className="text-[10px] text-gray-400 block mt-0.5">
                            {formatDateShort(expense.date)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs sm:text-sm font-black text-gray-900">
                          {formatRupee(expense.amount)}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Group: Planned (Upcoming) */}
          <div className="space-y-2 pt-1 border-t border-gray-100">
            <div
              onClick={() => setPlannedExpanded(!plannedExpanded)}
              className="flex items-center justify-between py-1 cursor-pointer select-none"
            >
              <h3 className="text-sm font-black text-gray-900">
                Planned (Upcoming)
              </h3>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
                <span>₹0</span>
                {plannedExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </div>
            </div>

            {plannedExpanded && (
              <div className="glass-card p-4 rounded-2xl border border-gray-100 text-center text-xs text-gray-500 font-medium">
                No future unpaid bookings pending
              </div>
            )}
          </div>

          {/* Floating / Bottom Add Expense Button */}
          <div className="pt-2">
            <button
              onClick={handleOpenAddScreen}
              className="w-full py-4 px-4 rounded-full bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-950/20 hover:shadow-xl transition-all card-press-3d flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[2.8]" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 3 & SCREEN 6: ADD / EDIT EXPENSE                                   */}
      {/* ========================================================================= */}
      {(currentScreen === 'add' || currentScreen === 'edit') && (
        <form onSubmit={handleSubmitForm} className="space-y-4 animate-in fade-in duration-200">
          {/* Top Bar: Back, Title, Subtitle, Right Document/Delete Pill */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => navigateTo(previousScreen || 'overview')}
                className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-all card-press-3d shadow-xs"
                aria-label="Back"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
              </button>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 leading-none">
                  {currentScreen === 'edit' ? 'Edit Expense' : 'Add Expense'}
                </h2>
                <p className="text-[11px] sm:text-xs text-gray-500 font-medium mt-1">
                  {currentScreen === 'edit' ? 'Update expense details' : 'Record your expense'}
                </p>
              </div>
            </div>

            {currentScreen === 'edit' ? (
              <button
                type="button"
                onClick={() => {
                  if (selectedExpense) {
                    setExpenseToDelete(selectedExpense);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-all card-press-3d border border-red-200/50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : (
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#0F5B44] flex items-center justify-center shadow-xs">
                <FileText className="w-4 h-4" />
              </div>
            )}
          </div>

          {/* Form Card with 3D Depth */}
          <div className="glass-card card-3d card-depth-3d p-4.5 sm:p-6 rounded-[28px] border border-white/90 shadow-[0_14px_36px_-8px_rgba(15,91,68,0.1)] space-y-4">
            {/* Category Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value as ExpenseCategory)}
                  className="w-full bg-white border border-gray-200 rounded-2xl px-3.5 py-2.5 text-xs text-gray-900 font-medium appearance-none focus:border-[#0F5B44] focus:ring-1 focus:ring-[#0F5B44] outline-none shadow-2xs"
                >
                  {ALL_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {getCategoryDisplayLabel(cat)}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Amount (₹) & Payment Method (Item 5) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">
                  Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="750"
                  value={formAmount}
                  onChange={e => setFormAmount(e.target.value)}
                  required
                  className="w-full bg-white border border-gray-200 rounded-2xl px-3.5 py-2.5 text-xs text-gray-900 font-bold focus:border-[#0F5B44] focus:ring-1 focus:ring-[#0F5B44] outline-none shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">
                  Payment Mode
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-50 rounded-2xl border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setFormPaymentMethod('UPI')}
                    className={`py-2 rounded-xl text-xs font-black transition-all ${
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
                    className={`py-2 rounded-xl text-xs font-black transition-all ${
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

            {/* Date Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
                required
                className="w-full bg-white border border-gray-200 rounded-2xl px-3.5 py-2.5 text-xs text-gray-900 font-medium focus:border-[#0F5B44] focus:ring-1 focus:ring-[#0F5B44] outline-none shadow-2xs"
              />
            </div>

            {/* Title / Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                Description / Title (Optional)
              </label>
              <input
                type="text"
                placeholder={`e.g. Train ticket (defaults to ${getCategoryDisplayLabel(formCategory)})`}
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-2xl px-3.5 py-2.5 text-xs text-gray-900 font-medium focus:border-[#0F5B44] focus:ring-1 focus:ring-[#0F5B44] outline-none shadow-2xs"
              />
            </div>

            {/* Description / Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                Description / Notes
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Sleeper train ticket&#10;Booking details or bill receipt"
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-2xl p-3 text-xs text-gray-900 font-medium focus:border-[#0F5B44] focus:ring-1 focus:ring-[#0F5B44] outline-none resize-none shadow-2xs"
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                Payment Method
              </label>
              <div className="relative">
                <select
                  value={formPaymentMethod}
                  onChange={e => setFormPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-white border border-gray-200 rounded-2xl px-3.5 py-2.5 text-xs text-gray-900 font-medium appearance-none focus:border-[#0F5B44] focus:ring-1 focus:ring-[#0F5B44] outline-none shadow-2xs"
                >
                  <option value="UPI">📱 UPI</option>
                  <option value="Cash">💵 Cash</option>
                  <option value="Debit / credit card">💳 Credit / Debit Card</option>
                  <option value="Online booking">🌐 Online Booking</option>
                  <option value="Other">🪙 Other</option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Attach Receipt (Optional) */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-gray-700 block">
                Attach Receipt (Optional)
              </label>

              {/* Take Photo and Choose File Buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="py-3 px-3 rounded-2xl bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all card-press-3d border border-sky-100 shadow-2xs"
                >
                  <Camera className="w-5 h-5" />
                  <span>Take Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="py-3 px-3 rounded-2xl bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all card-press-3d border border-sky-100 shadow-2xs"
                >
                  <ImageIcon className="w-5 h-5" />
                  <span>Choose File</span>
                </button>
              </div>

              {/* Receipt Thumbnail Preview if attached */}
              {formReceiptUrl && (
                <div className="mt-2 p-2.5 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={formReceiptUrl}
                      alt="Receipt thumbnail"
                      className="w-12 h-12 object-cover rounded-xl border border-gray-200"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-gray-900 truncate block">
                        {formReceiptName || 'ticket.jpg'}
                      </span>
                      <span className="text-[10px] text-gray-500 block mt-0.5 font-medium">
                        {formReceiptSize || '245 KB'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setFormReceiptUrl('');
                      setFormReceiptName('');
                      setFormReceiptSize('');
                    }}
                    className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-300 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-4 rounded-full bg-gradient-to-r from-[#0F5B44] via-[#146b51] to-teal-700 text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-950/20 hover:shadow-xl transition-all card-press-3d flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4 stroke-[2.4]" />
              <span>{isSubmitting ? 'Saving...' : currentScreen === 'edit' ? 'Update Expense' : 'Save Expense'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 4: EXPENSE DETAILS                                                 */}
      {/* ========================================================================= */}
      {currentScreen === 'details' && selectedExpense && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Top Bar: Back, Title, Edit Pencil, Delete Trash */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => navigateTo(previousScreen || 'overview')}
                className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-all card-press-3d shadow-xs"
                aria-label="Back"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
              </button>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 leading-none">
                  Expense Details
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-1.5 relative">
              <button
                onClick={() => handleOpenEditScreen(selectedExpense)}
                className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-all card-press-3d shadow-xs"
                title="Edit expense"
              >
                <Edit2 className="w-4 h-4 text-gray-700" />
              </button>

              <button
                onClick={() => {
                  if (selectedExpense) {
                    setExpenseToDelete(selectedExpense);
                  }
                }}
                className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-red-600 hover:bg-red-50 transition-all card-press-3d shadow-xs"
                title="Delete expense"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Details Card with 3D Depth */}
          <div className="glass-card card-3d card-depth-3d p-5 sm:p-6 rounded-[28px] border border-white/90 shadow-[0_16px_40px_-10px_rgba(15,91,68,0.12)] space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
                style={{
                  backgroundColor: CATEGORY_BG_COLORS[selectedExpense.category] || '#f3f4f6',
                  color: CATEGORY_COLORS[selectedExpense.category] || '#111827',
                }}
              >
                {renderCategoryIcon(selectedExpense.category, 'w-6 h-6')}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-gray-500 block">
                  {getCategoryDisplayLabel(selectedExpense.category)}
                </span>
                <h3 className="text-base sm:text-lg font-black text-gray-900 truncate">
                  {selectedExpense.title}
                </h3>
              </div>
            </div>

            {/* Big Amount Hero */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-emerald-50/80 border border-emerald-100 flex items-center justify-between shadow-2xs">
              <span className="text-xs font-bold text-gray-600">Total Amount</span>
              <span className="text-2xl sm:text-3xl font-black text-[#0F5B44]">
                {formatRupee(selectedExpense.amount)}
              </span>
            </div>

            {/* Key Value Breakdown */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Date &amp; Time</span>
                <span className="font-bold text-gray-900">
                  {formatDateWithDay(selectedExpense.date)} {selectedExpense.time ? `· ${selectedExpense.time}` : ''}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Payment Method</span>
                <span className="font-bold text-gray-900">{selectedExpense.paymentMethod || 'UPI'}</span>
              </div>

              {selectedExpense.destination && (
                <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Location</span>
                  <span className="font-bold text-gray-900">{selectedExpense.destination}</span>
                </div>
              )}

              {selectedExpense.notes && (
                <div className="py-1.5">
                  <span className="text-gray-500 font-medium block mb-1">Notes</span>
                  <p className="text-gray-800 bg-gray-50 p-3 rounded-2xl border border-gray-100 font-medium whitespace-pre-wrap">
                    {selectedExpense.notes}
                  </p>
                </div>
              )}

              {/* Receipt Preview */}
              {selectedExpense.receiptUrl && (
                <div className="pt-2">
                  <span className="text-gray-500 font-medium block mb-1.5">Attached Receipt</span>
                  <div
                    onClick={() => setLightboxReceiptUrl(selectedExpense.receiptUrl || null)}
                    className="relative rounded-2xl overflow-hidden border border-gray-200 cursor-pointer group shadow-xs max-w-xs"
                  >
                    <img
                      src={selectedExpense.receiptUrl}
                      alt="Receipt"
                      className="w-full h-40 object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                      <Maximize2 className="w-4 h-4" />
                      <span>View Fullscreen</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                onClick={handleDuplicateExpense}
                className="py-3 px-4 rounded-full bg-white border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 transition-all card-press-3d shadow-2xs flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicate</span>
              </button>

              <button
                onClick={() => handleOpenEditScreen(selectedExpense)}
                className="py-3 px-4 rounded-full bg-[#0F5B44] text-white font-bold text-xs hover:bg-[#16654f] transition-all card-press-3d shadow-md shadow-emerald-950/10 flex items-center justify-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Expense</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 5: CATEGORY SUMMARY                                                */}
      {/* ========================================================================= */}
      {currentScreen === 'category-summary' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Top Bar: Back, Title, Date Filter Pill */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => navigateTo('overview')}
                className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-all card-press-3d shadow-xs"
                aria-label="Back to overview"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
              </button>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 leading-none">
                  Category Summary
                </h2>
                <p className="text-[11px] sm:text-xs text-gray-500 font-medium mt-1">
                  Expense breakdown
                </p>
              </div>
            </div>

            {/* Date Range Dropdown */}
            <div className="relative">
              <select
                value={summaryDateFilter}
                onChange={e => setSummaryDateFilter(e.target.value)}
                className="bg-white border border-gray-200 rounded-full pl-3 pr-7 py-1 text-xs font-bold text-gray-700 appearance-none shadow-xs focus:border-[#0F5B44] outline-none"
              >
                <option value="All Dates">All Dates</option>
                <option value="November 2026">November 2026</option>
                <option value="December 2026">December 2026</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Donut Chart Card with Exact Amounts in Legend (Exact Match to Screen 5) */}
          <div className="glass-card card-3d card-depth-3d p-5 rounded-[26px] border border-white/90 shadow-[0_14px_36px_-8px_rgba(15,91,68,0.1)] space-y-4">
            <div>
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">Total Spent</span>
              <div className="text-2xl sm:text-3xl font-black text-gray-900 mt-0.5">
                {formatRupee(totalTripSpent)}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
              {/* Donut Chart SVG */}
              <div className="relative w-40 h-40 flex-shrink-0 flex items-center justify-center filter drop-shadow-sm">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={donutRadius}
                    className="stroke-gray-100"
                    strokeWidth="15"
                    fill="transparent"
                  />
                  {donutSegments.map(seg => (
                    <circle
                      key={seg.category}
                      cx="50"
                      cy="50"
                      r={donutRadius}
                      stroke={seg.color}
                      strokeWidth="15"
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-500"
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
                  <span className="text-xs sm:text-sm font-black text-gray-900 leading-tight">
                    {formatRupee(totalTripSpent)}
                  </span>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                    Total
                  </span>
                </div>
              </div>

              {/* Legend with Amount AND Percentage (e.g. ₹9,450 (29%)) */}
              <div className="w-full space-y-2 text-xs">
                {categoryBreakdown.map(cat => (
                  <div
                    key={cat.category}
                    className="flex items-center justify-between text-gray-700 py-0.5"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="truncate font-medium">{cat.label}</span>
                    </div>
                    <span className="font-bold text-gray-900 ml-2 whitespace-nowrap">
                      {formatRupee(cat.amount)} ({cat.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Category Wise Details List */}
          <div className="space-y-2.5">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#0F5B44]" />
              <span>Category Wise Details</span>
            </h3>

            <div className="space-y-2">
              {categoryBreakdown.map(cat => (
                <div
                  key={cat.category}
                  onClick={() => {
                    setSelectedCategoryFilter(
                      cat.category === 'Accommodation'
                        ? 'Stay'
                        : cat.category === 'Temple / donation'
                        ? 'Temple'
                        : cat.category
                    );
                    navigateTo('list');
                  }}
                  className="glass-card card-3d p-3.5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between gap-3 cursor-pointer hover:border-emerald-200 transition-all card-press-3d"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs"
                      style={{
                        backgroundColor: cat.bgColor,
                        color: cat.color,
                      }}
                    >
                      {renderCategoryIcon(cat.category, 'w-5 h-5')}
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                      {cat.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <span className="text-xs sm:text-sm font-black text-gray-900 block leading-tight">
                        {formatRupee(cat.amount)}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {cat.percentage}%
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3D Confirmation Popup for Delete Expense */}
      <ConfirmModal
        isOpen={Boolean(expenseToDelete)}
        title="Delete Expense?"
        message={`Are you sure you want to delete "${expenseToDelete?.title || 'this expense'}" for ${formatRupee(expenseToDelete?.amount || 0)}?\nThis expense will be deducted from your recorded budget.`}
        confirmLabel="Delete Expense"
        cancelLabel="Keep Expense"
        variant="danger"
        iconType="trash"
        onConfirm={async () => {
          if (expenseToDelete) {
            const id = expenseToDelete.id;
            setExpenseToDelete(null);
            onDeleteExpense(id);
            showToast('Expense deleted');
            navigateTo('overview');
          }
        }}
        onCancel={() => setExpenseToDelete(null)}
      />

      {/* 3D Alert Popup */}
      <AlertModal
        isOpen={Boolean(alertMessage)}
        message={alertMessage || ''}
        variant="warning"
        onClose={() => setAlertMessage(null)}
      />
    </div>
  );
};
