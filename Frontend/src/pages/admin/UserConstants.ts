import { Shield, ShieldCheck, Package, Briefcase, UserCheck, UserX, Archive } from 'lucide-react';

export const ITEMS_PER_PAGE = 5;

export const ROLE_CONFIG = {
  'Owner': {
    label: 'Owner',
    icon: Shield,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50',
    description: 'Full system control & user management',
  },
  'Admin': {
    label: 'Admin',
    icon: ShieldCheck,
    iconColor: 'text-sky-600 dark:text-sky-400',
    badgeClass: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50',
    description: 'Co-administrator — same authority as the Owner',
  },
  'Inventory': {
    label: 'Inventory Staff',
    icon: Package,
    iconColor: 'text-[#006a61] dark:text-[#7ef0cf]',
    badgeClass: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800/50',
    description: 'Manage stock, products & wastage',
  },
  'Cashier': {
    label: 'Cashier',
    icon: Briefcase,
    iconColor: 'text-amber-600 dark:text-amber-400',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50',
    description: 'Point-of-sale operations & transactions',
  },
} as const;

export type RoleKey = keyof typeof ROLE_CONFIG;

/**
 * Presentation for an arbitrary stored role value.
 *
 * The `role` column also accepts 'Pharmacist', which is storable but is not one of the
 * roles this screen offers. Reading `ROLE_CONFIG[user.role]` directly therefore threw
 * `Cannot read properties of undefined` on such an account — the same failure mode
 * that emptied `role` when the Admin value was truncated by the database. Anything
 * unrecognised falls back to a neutral badge that still names the real value.
 */
export function roleConfigFor(role: string): { label: string; icon: typeof Shield; iconColor: string; badgeClass: string } {
  const known = ROLE_CONFIG[role as RoleKey];
  if (known) return known;

  return {
    label: role || 'Unassigned',
    icon: Shield,
    iconColor: 'text-muted-fg dark:text-muted-fg',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-border dark:border-slate-700/50',
  };
}

/**
 * Account statuses, with the badge used to render each one.
 *
 * QA requires Active, Inactive and Quarantined to be visibly distinct. The table used
 * to render every non-archived account as "Active", so an Inactive or Quarantined user
 * read as Active in the list and in the detail view.
 */
export const STATUS_CONFIG = {
  'Active': {
    label: 'Active',
    icon: UserCheck,
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50',
    description: 'Can sign in and use the system',
  },
  'Inactive': {
    label: 'Inactive',
    icon: UserX,
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50',
    description: 'Sign-in is blocked; the account is retained',
  },
  'Quarantined': {
    label: 'Quarantined',
    icon: ShieldCheck,
    badgeClass: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border border-violet-200 dark:border-violet-800/50',
    description: 'Held for review; sign-in is blocked',
  },
  'Archived': {
    label: 'Archived',
    icon: Archive,
    badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50',
    description: 'Retired from the active list; sign-in is blocked',
  },
} as const;

export type UserStatus = keyof typeof STATUS_CONFIG;

/** Statuses an administrator may assign directly. Archived is only reachable by archiving. */
export const ASSIGNABLE_STATUSES = ['Active', 'Inactive', 'Quarantined'] as const;

export const maskEmail = (email: string) => {
  if (!email?.includes('@')) return email ?? '';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [name, domain] = parts;
  if (!name?.length) return email;
  if (name.length <= 2) {
    return `${name[0]}*@${domain}`;
  }
  const maskedName = `${name[0]}${'*'.repeat(Math.min(name.length - 2, 5))}${name.at(-1)}`;
  return `${maskedName}@${domain}`;
};

export interface UserForm {
  full_name: string;
  contact_number: string;
  role: RoleKey;
}

export const EMPTY_FORM: UserForm = {
  full_name: '',
  contact_number: '',
  role: 'Inventory',
};

export const DEFAULT_PASSWORD = 'WiWaste123!';

export function generateUsername(fullName: string): string {
  if (!fullName?.trim()) return '';
  return fullName
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, '')
    .slice(0, 20);
}

export function generateEmail(fullName: string): string {
  const username = generateUsername(fullName);
  return username ? `${username}@wiwaste.com` : '';
}

export function getPasswordRules(password: string) {
  return [
    { id: 'length', label: 'At least 8 characters', met: password.length >= 8 },
    { id: 'upper', label: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { id: 'lower', label: 'One lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { id: 'number', label: 'One number (0-9)', met: /\d/.test(password) },
    { id: 'special', label: 'One special character (!@#$%^&*)', met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) },
  ];
}

export function isPasswordValid(password: string) {
  return getPasswordRules(password).every(r => r.met);
}
