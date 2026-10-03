import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (value: { from: string; to: string }) => void;
  className?: string;
}

export function DateRangePicker({ from, to, onChange, className = '' }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempFrom, setTempFrom] = useState(from);
  const [tempTo, setTempTo] = useState(to);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date(from);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const isDateSelected = (date: Date) => {
    const d = formatDate(date);
    return d === tempFrom || d === tempTo || (d > tempFrom && d < tempTo);
  };

  const isStartDate = (date: Date) => formatDate(date) === tempFrom;
  const isEndDate = (date: Date) => formatDate(date) === tempTo;

  const prevMonth = () => {
    setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const formatted = formatDate(date);

    if (!tempFrom || (tempFrom && tempTo)) {
      setTempFrom(formatted);
      setTempTo('');
    } else if (formatted < tempFrom) {
      setTempFrom(formatted);
    } else {
      setTempTo(formatted);
    }
  };

  const apply = () => {
    if (tempFrom && tempTo) {
      onChange({ from: tempFrom, to: tempTo });
    } else if (tempFrom && !tempTo) {
      onChange({ from: tempFrom, to: tempFrom });
    }
    setIsOpen(false);
  };

  const clear = () => {
    setTempFrom('');
    setTempTo('');
    onChange({ from: '', to: '' });
    setIsOpen(false);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#006a61] transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
      >
        <Calendar className="h-4 w-4 text-slate-500" />
        <span className="truncate max-w-[200px]">
          {from && to ? `${from} – ${to}` : 'Select date range'}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <button onClick={prevMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-medium text-sm text-slate-900 dark:text-white">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={nextMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-xs font-semibold text-slate-500 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDayOfMonth(currentMonth) }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth(currentMonth) }).map((_, i) => {
              const day = i + 1;
              const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
              const formatted = formatDate(date);
              const selected = isDateSelected(date);
              const isStart = isStartDate(date);
              const isEnd = isEndDate(date);
              const isToday = date.toDateString() === today.toDateString();
              const disabled = date > today;

              return (
                <button
                  key={day}
                  onClick={() => !disabled && handleDayClick(day)}
                  disabled={disabled}
                  className={`
                    aspect-square rounded-full text-sm font-medium transition-all
                    ${disabled ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : ''}
                    ${selected ? 'bg-[#006a61] text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}
                    ${isStart ? 'rounded-l-full' : ''}
                    ${isEnd ? 'rounded-r-full' : ''}
                    ${isToday && !selected ? 'ring-2 ring-[#006a61]' : ''}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={clear}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Clear
            </button>
            <button
              onClick={apply}
              disabled={!tempFrom || !tempTo}
              className="h-8 px-3 bg-[#006a61] hover:bg-[#00574f] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}