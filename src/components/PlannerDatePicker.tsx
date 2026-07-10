import React from 'react';
import ReactDatePicker from 'react-datepicker';
import { zhCN } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';

type PickerMode = 'date' | 'month';

interface PlannerDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  mode?: PickerMode;
  min?: string;
  placeholder?: string;
  ariaLabel?: string;
  compact?: boolean;
  autoFocus?: boolean;
  onKeyDown?: React.KeyboardEventHandler<HTMLElement>;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

const parsePickerValue = (value: string, mode: PickerMode): Date | null => {
  if (!value) return null;

  const parts = value.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = mode === 'month' ? 1 : parts[2];

  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatPickerValue = (date: Date, mode: PickerMode): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  if (mode === 'month') return `${year}-${month}`;

  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function PlannerDatePicker({
  value,
  onChange,
  mode = 'date',
  min,
  placeholder,
  ariaLabel,
  compact = false,
  autoFocus = false,
  onKeyDown,
  onClick,
}: PlannerDatePickerProps) {
  const isMonthPicker = mode === 'month';

  return (
    <div className={`planner-date-picker ${compact ? 'planner-date-picker--compact' : ''}`} onClick={onClick}>
      <ReactDatePicker
        selected={parsePickerValue(value, mode)}
        onChange={(date: Date | null) => onChange(date ? formatPickerValue(date, mode) : '')}
        minDate={min ? parsePickerValue(min, 'date') ?? undefined : undefined}
        dateFormat={isMonthPicker ? 'yyyy-MM' : 'yyyy-MM-dd'}
        placeholderText={placeholder ?? (isMonthPicker ? '选择月份' : '选择日期')}
        locale={zhCN}
        showMonthYearPicker={isMonthPicker}
        showFullMonthYearPicker={isMonthPicker}
        showMonthDropdown={!isMonthPicker}
        showYearDropdown={!isMonthPicker}
        dropdownMode="select"
        scrollableYearDropdown
        yearDropdownItemNumber={80}
        portalId="planner-datepicker-portal"
        popperPlacement="bottom-start"
        showPopperArrow={false}
        autoComplete="off"
        autoFocus={autoFocus}
        onKeyDown={onKeyDown}
        aria-label={ariaLabel}
        wrapperClassName="planner-date-picker__wrapper"
        className={`planner-date-picker__input ${compact ? 'planner-date-picker__input--compact' : ''}`}
        calendarClassName="planner-date-picker__calendar"
        popperClassName="planner-date-picker__popper"
      />
      <CalendarDays aria-hidden="true" className="planner-date-picker__icon" />
    </div>
  );
}
