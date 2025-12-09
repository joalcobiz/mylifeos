
export type View = 'dashboard' | 'search' | 'calendar' | 'projects' | 'financial' | 'purchases' | 'loans' | 'journal' | 'genealogy' | 'places' | 'templates' | 'documents' | 'settings' | 'reports' | 'groceries' | 'itineraries' | 'habits' | 'goals' | 'admin' | 'features';

export interface PlaceGoogleInfo {
    summary?: string;
    vibe?: string;
    bestTime?: string;
    reviewSummary?: string;
    tip?: string;
}

export interface VisitRecord {
    id: string;
    date: string;
    rating: number;
    notes: string;
    journalEntryId?: string;
    photos?: string[];
}

export interface PlaceEvent {
    id: string;
    name: string; // e.g. "Jazz Festival" or "Peak Fall Colors"
    startDate: string;
    endDate?: string;
    type: 'Event' | 'Best Time' | 'Season' | 'Other';
    description?: string;
    notes?: string;
}

export interface Place {
  id: string;
  name: string;
  type: string;
  address: string;
  city: string;
  state: string;
  country?: string;
  rating: number;
  notes: string;
  visitedCount: number;
  lastVisited?: string;
  website?: string;
  lat?: number;
  lng?: number;
  collections?: string[];
  googleInfo?: PlaceGoogleInfo;
  photos?: string[];
  visitHistory?: VisitRecord[];
  events?: PlaceEvent[];
  owner?: string;
  isShared?: boolean;
  sharedWith?: string[];
  googleMapsData?: {
    placeId?: string;
    formattedAddress?: string;
    phone?: string;
    website?: string;
    types?: string[];
    openingHours?: string[];
    reviews?: string;
    rating?: number;
    totalRatings?: number;
    priceLevel?: number;
    lastUpdated?: string;
  };
  isSupermarket?: boolean;
  isTestData?: boolean;
  isIncomplete?: boolean;
}

export enum PlaceType {
  Restaurant = 'Restaurant',
  Cafe = 'Cafe',
  Park = 'Park',
  Gym = 'Gym',
  Library = 'Library',
  Museum = 'Museum',
  Theater = 'Theater',
  Shop = 'Shop',
  Office = 'Office',
  Other = 'Other'
}

export interface SortConfig<T> {
  key: keyof T;
  direction: 'ascending' | 'descending';
}

// Project & Task Interfaces
export type PriorityLevel = 'Low' | 'Medium' | 'High';
export type StatusLevel = 'In Progress' | 'Completed' | 'Not Started' | 'On Hold' | 'Incomplete';

export interface Attachment {
    id: string;
    name: string;
    url: string;
    type: 'file' | 'image' | 'link';
}

export interface Note {
    id: string;
    content: string;
    createdAt: string;
    author: string;
    attachments?: Attachment[];
}

export interface Reminder {
  id: string;
  datetime: string;
  type: 'once' | 'daily' | 'weekly';
  notified?: boolean;
}

export interface ProjectItem {
  id: string;
  type: 'project' | 'task';
  name: string;
  description?: string;
  status: StatusLevel;
  priority: PriorityLevel;
  dueDate: string;
  createdDate?: string; 
  creator?: string; 
  owner?: string;
  assignee: string;
  progress: number;
  subtasks?: ProjectItem[];
  isExpanded?: boolean;
  totalTasks?: number;
  notes?: Note[];
  parentProjectName?: string; 
  parentPath?: string[];
  dependencies?: string[];
  isArchived?: boolean;
  isQuickNotes?: boolean;
  isShared?: boolean;
  sharedWith?: string[];
  isTestData?: boolean;
  reminder?: Reminder;
}

// Templates Interfaces
export interface TemplateField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'rating' | 'currency' | 'boolean' | 'url' | 'longtext';
  options?: string[]; // For select type
  required?: boolean;
}

export interface TemplateItem {
  id: string;
  [key: string]: any; // Dynamic fields
}

export interface Template {
  id: string;
  name: string;
  type: string; // Flexible string
  category?: string; // e.g. "Media", "Financial"
  description: string;
  fields: TemplateField[];
  items: TemplateItem[];
  isTestData?: boolean;
}

// Documents Interfaces
export type DocumentType = 'file' | 'note' | 'link' | 'image';
export type DocumentCategory = 'Insurance' | 'Medical' | 'Personal' | 'Legal' | 'Financial' | 'Education' | 'Work' | 'Home' | 'Other';

export interface Document {
  id: string;
  title: string;
  type: DocumentType;
  category: DocumentCategory;
  tags: string[];
  dateAdded: string;
  dateModified: string;
  size?: string;
  url?: string;
  content?: string;
  folderId?: string;
  starred?: boolean;
  expiryDate?: string;
  owner?: string;
  isShared?: boolean;
  sharedWith?: string[];
  isTestData?: boolean;
}

export interface Folder {
  id: string;
  name: string;
  parentId?: string;
  isTestData?: boolean;
}

// Journal Interfaces
export type Mood = 'Happy' | 'Neutral' | 'Sad' | 'Excited' | 'Anxious' | 'Calm' | 'Frustrated' | 'Grateful';

export interface JournalAttachment {
    id: string;
    type: 'image' | 'video' | 'file';
    url: string;
    name: string;
}

export interface JournalEntry {
  id: string;
  title: string;
  body: string;
  date: string;
  mood: string;
  tags: string[];
  location?: string;
  attachments?: JournalAttachment[];
  sentimentAnalysis?: string;
  owner?: string;
  isShared?: boolean;
  sharedWith?: string[];
  isTestData?: boolean;
}

// Loans Interfaces (Money Flows)
export type LoanCategory = 'I Owe' | 'Owed To Me';
export type LoanType = 'Mortgage' | 'Auto' | 'Student' | 'Personal' | 'Credit Card' | 'Business' | 'Other';
export type LoanStatus = 'Active' | 'Paid Off' | 'Defaulted';

export interface LoanTransaction {
    id: string;
    date: string;
    amount: number;
    type: 'Payment' | 'Borrowing' | 'Interest' | 'Adjustment';
    direction: 'in' | 'out';
    note?: string;
    balanceAfter?: number;
}

export interface Loan {
  id: string;
  category: LoanCategory;
  name: string;
  type: string;
  lender: string;
  originalAmount: number;
  remainingBalance: number;
  interestRate: number;
  currency: CurrencyCode;
  monthlyPayment: number;
  dueDate: number;
  startDate: string;
  termMonths: number;
  status: LoanStatus;
  transactions?: LoanTransaction[];
  isArchived: boolean;
  includeInExpenses: boolean;
  owner?: string;
  isShared?: boolean;
  sharedWith?: string[];
  isTestData?: boolean;
}

// Purchases Interfaces
export type PurchaseStatus = 'Ordered' | 'Shipped' | 'Delivered' | 'Returned' | 'Cancelled';
export type UrgencyLevel = 'Just Curious' | 'Would Like' | 'Must Have';

export interface Purchase {
  id: string;
  itemName: string;
  store: string;
  category: string;
  date: string;
  price: number;
  quantity: number;
  total: number;
  status: PurchaseStatus;
  priorityLevel?: UrgencyLevel;
  warrantyEnd?: string;
  returnDeadline?: string;
  notes?: string;
  linkedProjectId?: string;
  owner?: string;
  createdBy?: string;
  isShared?: boolean;
  sharedWith?: string[];
  assignedTo?: string;
  urgency?: UrgencyType;
  dueDate?: string;
  isTestData?: boolean;
}

// Financial Interfaces
export type TransactionType = 'income' | 'expense';
export type CurrencyCode = 'USD' | 'EUR' | 'COP' | 'GBP' | 'MXN' | 'CAD' | 'AUD' | 'JPY' | 'CHF' | 'CNY' | 'INR' | 'BRL';

export interface CurrencyEntry {
    code: string;
    name: string;
    symbol: string;
    rateToUSD: number;
    source: 'api' | 'manual';
    lastUpdated: string;
}

export interface CurrencyRateHistory {
    id: string;
    date: string;
    code: string;
    rateToUSD: number;
    source: 'api' | 'manual';
    updatedBy?: string;
}
export type Frequency = 'Monthly' | 'Bi-Weekly' | 'Twice-Monthly' | 'Weekly' | 'Annually' | 'One-Time' | 'Custom';

export interface BalanceHistoryEntry {
  id: string;
  date: string;
  balance: number;
  previousBalance?: number;
  note?: string;
}

export interface FinancialItem {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  currency: CurrencyCode;
  isEnabled: boolean;
  
  // Expenses specific
  frequency: Frequency;
  owner: string;
  dueDay: number; // 1-31
  dueDay2?: number; // For Twice-Monthly
  balance?: number; // In native currency
  lastBalanceUpdate?: string; // ISO Date string
  balanceHistory?: BalanceHistoryEntry[]; // History of balance changes
  notes?: string;
  attachments?: Attachment[];
  
  // Categorization
  category: string;
  subType?: string; // Specific type e.g. "Bill", "Subscription" or "Salary", "Gift"
  account?: string; // Shared list (Deposit Account for Income, Pay From for Expense)
  
  // Income specific
  receivedMethod?: string; // How income is received (Direct Deposit, Check, Cash, Wire, etc.)
  usdEquivalent?: number; // Auto-calculated USD equivalent for non-USD income
  isTestData?: boolean;
}

// Grocery Interfaces
export interface GroceryList {
    id: string;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    isDefault?: boolean;
    createdAt: string;
    updatedAt: string;
    owner: string;
    isShared?: boolean;
    sharedWith?: string[];
}

export interface GroceryItem {
    id: string;
    name: string;
    category: string;
    completed: boolean;
    listId?: string;
    isHistory?: boolean;
    isTestData?: boolean;
    quantity?: number;
    unit?: string;
    unitPrice?: number;
    notes?: string;
    priority?: 'low' | 'medium' | 'high';
    purchaseCount?: number;
    lastPurchased?: string;
    store?: string;
    storePlaceId?: string;
    storeCity?: string;
    owner?: string;
    createdBy?: string;
    isShared?: boolean;
    sharedWith?: string[];
    assignedTo?: string;
    urgency?: UrgencyType;
    dueDate?: string;
}

// Calendar Interfaces
export interface CalendarEvent {
    id: string;
    title: string;
    date: Date;
    type: 'project' | 'financial' | 'journal' | 'custom' | 'place' | 'habit' | 'goal' | 'itinerary' | 'purchase' | 'loan';
    color: string;
    icon?: any;
    creator?: string;
    allDay?: boolean;
    start?: string;
    endDate?: Date;
}

// Itinerary Interfaces
export type StopPlaceType = 'Restaurant' | 'Hotel' | 'Attraction' | 'Museum' | 'Park' | 'Beach' | 'Shopping' | 'Entertainment' | 'Transport' | 'Other';

export type TimeBucket = 'earlyMorning' | 'morning' | 'midday' | 'earlyAfternoon' | 'lateAfternoon' | 'evening' | 'night' | 'lateNight';

export type StopSource = 'manual' | 'manual+google' | 'places' | 'saved';

export interface ItineraryStop {
    id: string;
    isManual: boolean;
    placeId?: string;
    googlePlaceId?: string;
    name: string;
    address?: string;
    placeType?: StopPlaceType;
    date?: string;
    day?: number;
    time?: string;
    timeMode?: 'fixed' | 'bucket';
    timeBucket?: TimeBucket;
    sortKey?: string;
    manualOrder?: number;
    notes?: string;
    photos?: string[];
    completed: boolean;
    completedAt?: string;
    journalEntryId?: string;
    order?: number;
    lat?: number;
    lng?: number;
    source?: StopSource;
    mapImageUrl?: string;
    duration?: number;
    cost?: number;
    currency?: string;
    bookingRef?: string;
    bookingUrl?: string;
}

export interface Itinerary {
    id: string;
    name: string;
    startDate?: string;
    endDate?: string;
    status: 'Planned' | 'Active' | 'Completed' | 'Archived';
    stops: ItineraryStop[];
    notes?: string;
    description?: string;
    coverImage?: string;
    owner?: string;
    isShared?: boolean;
    sharedWith?: string[];
    isTestData?: boolean;
    isPublic?: boolean;
    publicShareToken?: string;
    slug?: string;
    theme?: 'default' | 'tropical' | 'adventure' | 'city' | 'beach' | 'mountain';
    pdfExportedAt?: string;
}

// Habit Interfaces
export interface Habit {
    id: string;
    name: string;
    description?: string;
    frequency: 'Daily' | 'Weekly';
    streak: number;
    history: string[]; // ISO date strings of completions
    targetDays?: number[]; // e.g. [1,3,5] for Mon,Wed,Fri
    isTestData?: boolean;
}

// Goal Interfaces
export interface Goal {
    id: string;
    name: string;
    description?: string;
    deadline: string;
    progress: number;
    status: 'Not Started' | 'In Progress' | 'Achieved';
    linkedProjectIds?: string[];
    isTestData?: boolean;
}

// Upcoming Feature Interfaces
export interface UpcomingFeature {
    id: string;
    name: string;
    type: 'module' | 'improvement' | 'bugfix' | 'enhancement';
    targetModule?: string;
    description?: string;
    notes?: string;
    status: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    complexity?: number; // 1-10 scale
    budget?: number;
    currency?: string;
    attachments?: Attachment[];
    priority?: 'Low' | 'Medium' | 'High' | 'Critical';
    dueDate?: string;
    completedAt?: string;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
    isTestData?: boolean;
}

export interface Attachment {
    id: string;
    name: string;
    url: string;
    type: string;
    size?: number;
    uploadedAt?: string;
}

export interface NavigationState {
    view: View;
    params?: {
        focusId?: string;
        [key: string]: any;
    };
}

// Exchange Rate Interface
export interface ExchangeRateHistory {
    date: string;
    rates: Record<CurrencyCode, number>;
}

// Label Colors Interface
export interface LabelColors {
    [label: string]: string; // "Groceries": "#EF4444"
}

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    role: 'Admin' | 'User';
    initials: string;
    color: string;
    theme: 'blue' | 'purple' | 'emerald' | 'orange' | 'rose' | 'cyan' | 'slate';
    jobTitle?: string;
    phone?: string;
    bio?: string;
    username?: string;
    passwordHash?: string;
    isSystemAdmin?: boolean;
}

// Menu Layout Interface
export interface MenuItem {
    id: string;
    type: 'view' | 'divider';
    view?: View;
    label?: string; // For custom override if needed
    isVisible: boolean;
}

// Global Settings Interface
export interface Settings {
    id: string;
    currency: CurrencyCode;
    exchangeRates: Record<string, number>;
    exchangeRateHistory: ExchangeRateHistory[];
    currencies?: CurrencyEntry[];
    currencyRateHistory?: CurrencyRateHistory[];
    labelColors: LabelColors;
    
    // System Config
    appTitle?: string;
    dateFormat?: 'US' | 'International';
    startOfWeek?: 'Monday' | 'Sunday';

    // API Keys
    googleApiKey?: string;
    currencyApiKey?: string;

    // Users
    users: UserProfile[];

    // Navigation
    menuLayout: MenuItem[];

    // Financial
    accounts: string[];
    expenseCategories: string[];
    incomeCategories: string[];
    
    // Projects
    projectStatuses: string[];
    
    // Life
    journalMoods: string[];
    journalTags: string[];
    groceryCategories: string[];
    placeTypes: string[];
    placeCollections: string[]; // e.g. Date Night, Best Coffee
    
    // Inventory/Loans
    loanTypes: string[];
    documentCategories: string[];
    
    // New Lists
    listCategories: string[];
    itineraryTypes: string[];
    collectionCategories: string[];
    
    // Habits & Goals
    habitCategories: string[];
    goalCategories: string[];
    goalPriorities: string[];
    
    // Feature Roadmap
    featureStatuses: string[];
    featureTypes: string[];
    
    // Dashboard Layout
    dashboardWidgets?: DashboardWidget[];
}

export interface DashboardWidget {
    id: string;
    type: 'stats' | 'habits' | 'upcoming' | 'goals' | 'journal' | 'groceries' | 'trips' | 'quickCapture' | 'taskStream';
    isVisible: boolean;
    order: number;
}

// Search Interface
export interface SearchResult {
    id: string;
    type: View;
    title: string;
    subtitle?: string;
    date?: string;
    matchField: string;
}

// Urgency System Types
export type UrgencyType = 'today' | 'tomorrow' | 'dayAfter' | 'thisWeek' | '30days' | 'none' | 'date';

export interface UrgencyOption {
    value: UrgencyType;
    label: string;
    color: string;
    bgColor: string;
}

export const URGENCY_OPTIONS: UrgencyOption[] = [
    { value: 'today', label: 'Today', color: 'text-red-700', bgColor: 'bg-red-100' },
    { value: 'tomorrow', label: 'Tomorrow', color: 'text-orange-700', bgColor: 'bg-orange-100' },
    { value: 'dayAfter', label: 'Day After Tomorrow', color: 'text-amber-700', bgColor: 'bg-amber-100' },
    { value: 'thisWeek', label: 'This Week', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
    { value: '30days', label: 'Within 30 Days', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    { value: 'none', label: 'No Urgency', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    { value: 'date', label: 'Pick a Date', color: 'text-purple-700', bgColor: 'bg-purple-100' }
];

export function normalizeUrgencyToDate(urgency: UrgencyType, customDate?: string): string | null {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    switch (urgency) {
        case 'today':
            return today.toISOString();
        case 'tomorrow':
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow.toISOString();
        case 'dayAfter':
            const dayAfter = new Date(today);
            dayAfter.setDate(dayAfter.getDate() + 2);
            return dayAfter.toISOString();
        case 'thisWeek':
            const endOfWeek = new Date(today);
            const daysUntilSunday = 7 - today.getDay();
            endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday);
            return endOfWeek.toISOString();
        case '30days':
            const thirtyDays = new Date(today);
            thirtyDays.setDate(thirtyDays.getDate() + 30);
            return thirtyDays.toISOString();
        case 'date':
            return customDate || null;
        case 'none':
        default:
            return null;
    }
}

export function getUrgencyFromDate(dueDate: string | null): UrgencyType {
    if (!dueDate) return 'none';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'today';
    if (diffDays === 1) return 'tomorrow';
    if (diffDays === 2) return 'dayAfter';
    if (diffDays <= 7) return 'thisWeek';
    if (diffDays <= 30) return '30days';
    return 'date';
}

// Sharing System Types
export type SharingMode = 'full' | 'partial' | 'private';

export interface ModuleSharingSettings {
    projects: SharingMode;
    groceries: SharingMode;
    purchases: SharingMode;
    quickNotes: SharingMode;
    itineraries: SharingMode;
    places: SharingMode;
    documents: SharingMode;
    financial: SharingMode;
    loans: SharingMode;
    journal: SharingMode;
    habits: SharingMode;
    goals: SharingMode;
}

export const DEFAULT_SHARING_SETTINGS: ModuleSharingSettings = {
    projects: 'full',
    groceries: 'full',
    purchases: 'full',
    quickNotes: 'partial',
    itineraries: 'full',
    places: 'full',
    documents: 'partial',
    financial: 'private',
    loans: 'private',
    journal: 'private',
    habits: 'partial',
    goals: 'partial'
};

// Account System Types
export type AccountRole = 'owner' | 'admin' | 'member' | 'viewer';
export type AccountStatus = 'active' | 'disabled' | 'archived';

export interface AccountMember {
    uid: string;
    displayName: string;
    role: AccountRole;
    joinedAt: string;
}

export interface Account {
    id: string;
    name: string;
    description?: string;
    parentAccountId?: string | null;
    path: string[];
    members: AccountMember[];
    status: AccountStatus;
    createdAt: string;
    createdBy: string;
    updatedAt: string;
    color?: string;
    icon?: string;
}

export type UserRole = 'super-admin' | 'admin' | 'user';

export interface UserAccount {
    uid: string;
    role: UserRole;
    accounts: string[];
    defaultAccountId?: string;
    displayName: string;
    email: string;
}

// Base interface for account-scoped data
export interface AccountScoped {
    accountId?: string;
    accountPath?: string[];
}
