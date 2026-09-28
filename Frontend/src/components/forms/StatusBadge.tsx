import React from 'react';
import { cn } from '../ui/utils';
import { STATUS_COLORS, USER_ROLES } from '../../constants';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({ status, size = 'md', showDot = true, className }: StatusBadgeProps) {
  const config = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.Active;
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-0.5 text-[11px]',
    lg: 'px-3 py-1 text-xs',
  };

  const dotSizes = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-bold rounded-full border',
        sizeClasses[size],
        config.bg,
        config.border,
        'text-nowrap'
      )}
    >
      {showDot && (
        <span className={cn(config.dot, 'rounded-full', sizeClasses[size] === 'px-2 py-0.5 text-[10px]' ? 'w-1.5 h-1.5' : 'w-1.5 h-1.5')} />
      )}
      <span>{status}</span>
    </span>
  );
}

interface RoleBadgeProps {
  role: (typeof USER_ROLES)[number];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

import { ROLE_COLORS } from '../../constants';

export function RoleBadge({ role, size = 'md', className }: RoleBadgeProps) {
  const config = ROLE_COLORS[role] || ROLE_COLORS.Inventory;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-md border',
        sizeClasses[size],
        config.bg,
        className
      )}
    >
      <Icon className={cn('h-3.5 w-3.5 shrink-0', config.iconColor)} />
      <span>{role}</span>
    </div>
  );
}

export function PaymentMethodBadge({ method, size = 'md' }: { method: string; size?: 'sm' | 'md' | 'lg' }) {
  const methodColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    Cash: {
      bg: 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 border border-green-200 dark:border-green-800/50',
      text: '',
      icon: (
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.105 0 2-.895 3-2s-.895-2-3-2-3 .895-3 2 1.343 2 3 2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5" />
        </svg>
      )},
    Card: {
      bg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50',
      text: '',
      icon: (
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )},
    'E-Wallet': {
      bg: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50',
      text: '',
      icon: (
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )},
  };

  const config = methodColors[method] || { bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700', text: '', icon: null };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${config.bg}`}>
      {config.icon && <span>{config.icon}</span>}
      <span>{method}</span>
    </span>
  );
}