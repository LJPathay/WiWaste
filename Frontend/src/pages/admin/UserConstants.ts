import { Shield, Package, Briefcase } from 'lucide-react';

export const ITEMS_PER_PAGE = 5;

export const ROLE_CONFIG = {
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
  'Business Owner': {
    label: 'Business Owner',
    icon: Briefcase,
    iconColor: 'text-amber-600 dark:text-amber-400',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50',
    description: 'Reports, financial insights & POS',
  },
} as const;

export const maskEmail = (email: string) => {
  if (!email || !email.includes('@')) return email;
  const [name, domain] = email.split('@');
  if (name?.length <= 2) {
    return `${name[0]}*@${domain}`;
  }
  const maskedName = `${name[0]}${'*'.repeat(Math.min(name.length - 2, 5))}${name.at(-1)}`;
  return `${maskedName}@${domain}`;
};

export interface UserForm {
  Full_name: string;
  username: string;
  email: string;
  password: string;
  role: 'Admin' | 'Inventory' | 'Business Owner';
  status: 'Active' | 'Inactive' | 'Quarantined';
}

export const EMPTY_FORM: UserForm = {
  Full_name: '',
  username: '',
  email: '',
  password: '',
  role: 'Inventory',
  status: 'Active',
};

export function getPasswordRules(password: string) {
  return [
    { id: 'length', label: 'At least 6 characters', met: password.length >= 6 },
    { id: 'upper', label: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { id: 'lower', label: 'One lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { id: 'number', label: 'One number (0-9)', met: /\d/.test(password) },
    { id: 'special', label: 'One special character (!@#$%^&*)', met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) },
  ];
}

export function isPasswordValid(password: string) {
  return getPasswordRules(password).every(r => r.met);
}
