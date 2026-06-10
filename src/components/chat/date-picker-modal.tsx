"use client";

import * as React from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DatePickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (date: Date) => void;
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export function DatePickerModal({ open, onClose, onSelect }: DatePickerModalProps) {
  const today = new Date();
  const [viewMonth, setViewMonth] = React.useState(today.getMonth());
  const [viewYear, setViewYear] = React.useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    setSelectedDate(d);
  };

  const handleConfirm = () => {
    if (selectedDate) {
      onSelect(selectedDate);
      onClose();
    }
  };

  const handleToday = () => {
    setViewMonth(today.getMonth());
    setViewYear(today.getFullYear());
    setSelectedDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  };

  if (!open) return null;

  const cells: React.ReactNode[] = [];

  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const isToday =
      day === today.getDate() &&
      viewMonth === today.getMonth() &&
      viewYear === today.getFullYear();
    const isSelected =
      selectedDate &&
      day === selectedDate.getDate() &&
      viewMonth === selectedDate.getMonth() &&
      viewYear === selectedDate.getFullYear();
    const isFuture =
      new Date(viewYear, viewMonth, day) >
      new Date(today.getFullYear(), today.getMonth(), today.getDate());

    cells.push(
      <button
        key={day}
        type="button"
        disabled={isFuture}
        onClick={() => handleSelectDay(day)}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors",
          isToday && !isSelected && "font-bold text-primary",
          isSelected && "bg-primary text-primary-foreground font-bold",
          isFuture && "opacity-30 cursor-not-allowed",
          !isSelected && !isFuture && "hover:bg-accent",
        )}
      >
        {day}
      </button>,
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-[340px] rounded-2xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Перейти к дате</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 transition-colors hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          {/* Month / Year nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-0 mb-1">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="flex h-8 items-center justify-center text-[11px] font-medium text-muted-foreground">
                {wd}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-0 place-items-center">
            {cells}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4">
            <button
              type="button"
              onClick={handleToday}
              className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              Сегодня
            </button>
            <button
              type="button"
              disabled={!selectedDate}
              onClick={handleConfirm}
              className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              Перейти
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
