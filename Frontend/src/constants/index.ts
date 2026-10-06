/**
 * Centralized application constants
 * Single source of truth for magic numbers and strings
 */

// Pagination
export const DEFAULT_PAGE_SIZE = 15;
export const MAX_PAGE_SIZE = 100;
export const SMALL_PAGE_SIZE = 5;

// Animation
export const CHART_ANIMATION_DURATION = 600;
export const CHART_ANIMATION_EASING = 'easeOutQuart';
export const UI_ANIMATION_DURATION = 200;

// Debounce
export const SEARCH_DEBOUNCE_MS = 300;
export const INPUT_DEBOUNCE_MS = 150;

// Cache
export const DEFAULT_CACHE_TTL_MS = 30_000; // 30 seconds

// Toast
export const TOAST_DURATION_MS = 3500;

// Retry
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY_MS = 1000;

// Status colors
export const STATUS_COLORS = {
  Active: {
    bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50',
    dot: 'bg-emerald-500',
  },
  Inactive: {
    bg: 'bg-bg text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-border dark:border-slate-700/50',
    dot: 'bg-slate-400',
  },
  Quarantined: {
    bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/50',
    dot: 'bg-amber-500',
  },
  Archived: {
    bg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800/50',
    dot: 'bg-rose-500',
  },
} as const;

// Role colors
export const ROLE_COLORS = {
  Owner: {
    bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    icon: 'Shield',
  },
  Inventory: {
    bg: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800/50',
    iconColor: 'text-teal-600 dark:text-teal-400',
    icon: 'Package',
  },
  Cashier: {
    bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/50',
    iconColor: 'text-amber-600 dark:text-amber-400',
    icon: 'Briefcase',
  },
} as const;

// Chart colors
export const CHART_COLORS = {
  primary: '#0F766E',
  primaryLight: '#10B981',
  secondary: '#3B82F6',
  danger: '#EF4444',
  warning: '#F59E0B',
  info: '#06B6D4',
  grid: '#F1F5F9',
  text: '#94A3B8',
  axis: '#E5E7EB',
} as const;

// Chart gradients
export const CHART_GRADIENTS = {
  primary: 'chart-primary-gradient',
  primaryFill: 'chart-primary-fill',
  secondary: 'chart-secondary-gradient',
  secondaryFill: 'chart-secondary-fill',
  danger: 'chart-danger-gradient',
  dangerFill: 'chart-danger-fill',
  warning: 'chart-warning-gradient',
  warningFill: 'chart-warning-fill',
  stockIn: 'chart-stock-in-fill',
  stockOut: 'chart-stock-out-fill',
  wastage: 'chart-wastage-fill',
} as const;

// Default passwords
export const DEFAULT_PASSWORD = 'WiWaste123!';

// Page size options
export const PAGE_SIZE_OPTIONS = [5, 10, 15, 25, 50, 100];

// Date formats
export const DATE_FORMATS = {
  short: 'MMM d, yyyy',
  long: 'MMMM d, yyyy',
  shortTime: 'MMM d, yyyy h:mm a',
  longTime: 'MMMM d, yyyy h:mm:ss a',
  iso: 'yyyy-MM-dd',
  isoTime: 'yyyy-MM-dd\'T\'HH:mm:ss',
} as const;

// Currency
export const CURRENCY = {
  locale: 'en-PH',
  currency: 'PHP',
  maximumFractionDigits: 2,
} as const;

// Status options
export const USER_STATUS_OPTIONS = ['Active', 'Inactive', 'Quarantined', 'Archived'] as const;
export const PRODUCT_STATUS_OPTIONS = ['Active', 'Discontinued'] as const;
export const ORDER_STATUS_OPTIONS = ['Completed', 'Voided', 'Refunded'] as const;

// Roles
export const USER_ROLES = ['Owner', 'Inventory', 'Cashier'] as const;

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'wiwaste_token',
  AUTH_USER: 'wiwaste_user',
  HEADER_STYLE: 'wiwaste_header_style',
  PAGE_VISITS: 'wiwaste_page_visits_v1',
  POS_PINNED_ORDER: 'pos_pinned_order',
  POS_HOTKEYS: 'pos_hotkeys',
  POS_HOTKEYS_ENABLED: 'pos_hotkeys_enabled',
} as const;

// API endpoints
export const API_ENDPOINTS = {
  LOGIN: '/api/login',
  LOGOUT: '/api/logout',
  ME: '/api/me',
  USERS: '/api/users',
  CATEGORIES: '/api/categories',
  SUPPLIERS: '/api/suppliers',
  PRODUCTS: '/api/products',
  INVENTORY: '/api/inventory',
  WASTAGE: '/api/wastage',
  SALES: '/api/sales',
  RETURNS: '/api/returns',
  REPORTS: '/api/reports',
} as const;

// Validation
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^\+?[\d\s-]{10,}$/,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 50,
  NAME_MAX_LENGTH: 100,
} as const;

// Timeouts
export const TIMEOUTS = {
  FETCH_TIMEOUT_MS: 30_000,
  TOAST_DURATION: 3500,
  DEBOUNCE_SEARCH: 300,
  DEBOUNCE_INPUT: 150,
  MODAL_ANIMATION: 200,
} as const;

// Regex patterns
export const REGEX = {
  USERNAME: /^[a-zA-Z0-9_-]+$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s-]{10,}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/,
  CURRENCY: /^[\d,]+\.?\d*$/,
} as const;