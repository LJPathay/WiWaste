import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../ui/utils';
import { MoreHorizontal, Edit2, Trash2, Eye, UserX, RotateCcw, Lock, Archive } from 'lucide-react';

export interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'primary';
  disabled?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  trigger?: React.ReactNode;
  align?: 'left' | 'right';
}

export function ActionMenu({ items, trigger, align = 'right' }: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Actions"
      >
        {trigger || (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-1 min-w-[160px] rounded-lg bg-white dark:bg-slate-850 shadow-lg border border-slate-200 dark:border-white/10 py-1 overflow-hidden',
            align === 'right' ? 'right-0' : 'left-0'
          )}
          role="menu"
        >
          {items.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              disabled={item.disabled}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors',
                item.variant === 'danger'
                  ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/20'
                  : item.variant === 'primary'
                  ? 'text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/20'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
              )}
              disabled={item.disabled}
              role="menuitem"
            >
              {item.icon && <span className="h-4 w-4 shrink-0">{item.icon}</span>}
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Pre-defined action creators for common patterns
export const createEditAction = (onClick: () => void) => ({
  label: 'Edit',
  icon: <Edit2 className="h-4 w-4" />,
  onClick,
});

export const createViewAction = (onClick: () => void) => ({
  label: 'View',
  icon: <Eye className="h-4 w-4" />,
  onClick,
});

export const createDeleteAction = (onClick: () => void) => ({
  label: 'Delete',
  icon: <Trash2 className="h-4 w-4" />,
  onClick,
  variant: 'danger' as const,
});

export const createArchiveAction = (onClick: () => void) => ({
  label: 'Archive',
  icon: <Archive className="h-4 w-4" />,
  onClick,
  variant: 'danger' as const,
});

export const createRestoreAction = (onClick: () => void) => ({
  label: 'Restore',
  icon: <RotateCcw className="h-4 w-4" />,
  onClick,
  variant: 'primary' as const,
});

export const createQuarantineAction = (onClick: () => void) => ({
  label: 'Quarantine',
  icon: <Lock className="h-4 w-4" />,
  onClick,
  variant: 'danger' as const,
});

export const createReactivateAction = (onClick: () => void) => ({
  label: 'Reactivate',
  icon: <RotateCcw className="h-4 w-4" />,
  onClick,
  variant: 'primary' as const,
});