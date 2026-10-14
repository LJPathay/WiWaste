import { Shield, Package, Briefcase, ReceiptText, Pill, Users, type LucideIcon } from 'lucide-react';
import type { ApiUser, CreateUserPayload } from '../../types/api';

export const ITEMS_PER_PAGE = 5;

interface RoleConfig {
  label: string;
  icon: LucideIcon;
  iconColor: string;
  badgeClass: string;
  description: string;
}

export const ASSIGNABLE_ROLES = ['Owner', 'Inventory', 'Cashier', 'Pharmacist'] as const satisfies readonly ApiUser['role'][];

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
    icon: Shield,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50',
    description: 'Full system control & user management',
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
    icon: ReceiptText,
    iconColor: 'text-sky-600 dark:text-sky-400',
    badgeClass: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50',
    description: 'Process sales, payments & receipts',
  },
  'Pharmacist': {
    label: 'Pharmacist',
    icon: Pill,
    iconColor: 'text-violet-600 dark:text-violet-400',
    badgeClass: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border border-violet-200 dark:border-violet-800/50',
    description: 'Dispensing, batch tracking & pharmacy compliance',
  },
  'Business Owner': {
    label: 'Cashier',
    icon: Briefcase,
    iconColor: 'text-amber-600 dark:text-amber-400',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50',
    description: 'Process sales, payments & receipts',
  },
} as const satisfies Record<ApiUser['role'], RoleConfig>;

export function getRoleConfig(role: string): RoleConfig {
  if (Object.prototype.hasOwnProperty.call(ROLE_CONFIG, role)) {
    return ROLE_CONFIG[role as keyof typeof ROLE_CONFIG];
  }

  return {
    label: role || 'Unassigned',
    icon: Users,
    iconColor: 'text-slate-500 dark:text-slate-400',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    description: 'Account role',
  };
}

export const maskEmail = (email: string) => {
  if (!email?.includes('@')) return email;
  const [name, domain] = email.split('@');
  if (name?.length <= 2) {
    return `${name[0]}*@${domain}`;
  }
  const maskedName = `${name[0]}${'*'.repeat(Math.min(name.length - 2, 5))}${name.at(-1)}`;
  return `${maskedName}@${domain}`;
};

export interface UserForm {
  First_name: string;
  Middle_name: string;
  Surname: string;
  contact_number: string;
  address: string;
  username: string;
  email: string;
  password: string;
  role: CreateUserPayload['role'];
  status: CreateUserPayload['status'];
}

export const EMPTY_FORM: UserForm = {
  First_name: '',
  Middle_name: '',
  Surname: '',
  contact_number: '',
  address: '',
  username: '',
  email: '',
  password: '',
  role: 'Inventory',
  status: 'Active',
};

export { getPasswordRules, isPasswordValid } from '../../utils/passwordPolicy';
