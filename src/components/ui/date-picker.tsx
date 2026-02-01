import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "./utils";

interface DatePickerProps {
  value: string; // Format: YYYY-MM-DD
  onChange: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];
const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export function DatePicker({
  value,
  onChange,
  placeholder = "Sélectionner une date",
  disabled = false,
  className
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"days" | "months">("days");
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) return new Date(date.getFullYear(), date.getMonth(), 1);
    }
    return new Date();
  });
  const [yearView, setYearView] = useState(() =>
    value ? new Date(value).getFullYear() : new Date().getFullYear()
  );

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);

  const previousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    );
  };

  const goToMonthsView = () => {
    setYearView(currentMonth.getFullYear());
    setView("months");
  };

  const selectMonth = (monthIndex: number) => {
    setCurrentMonth(new Date(yearView, monthIndex, 1));
    setView("days");
  };

  const previousYear = () => setYearView((y) => y - 1);
  const nextYear = () => setYearView((y) => y + 1);

  const selectDate = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-").map(Number);
    return `${String(day).padStart(2, "0")}/${String(month).padStart(
      2,
      "0"
    )}/${year}`;
  };

  const isSelectedDate = (day: number) => {
    if (!value) return false;
    const [year, month, dayOfMonth] = value.split("-").map(Number);
    return (
      day === dayOfMonth &&
      currentMonth.getMonth() === month - 1 &&
      currentMonth.getFullYear() === year
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) setView("days");
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Calendar className="mr-2 h-4 w-4 text-gray-700" />
          {value ? formatDisplayDate(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 bg-white text-foreground shadow-lg border border-gray-200"
        align="start"
      >
        <div className="p-3">
          {view === "days" ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={previousMonth}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <button
                  type="button"
                  onClick={goToMonthsView}
                  className="text-sm font-medium rounded px-2 py-1 hover:bg-muted transition-colors min-w-[140px]"
                  title="Choisir le mois"
                >
                  {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextMonth}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-7 mb-1">
                {DAY_NAMES.map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-medium text-gray-600 h-8 flex items-center justify-center"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-8" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const selected = isSelectedDate(day);
                  const today = isToday(day);
                  return (
                    <button
                      key={day}
                      onClick={() => selectDate(day)}
                      className={cn(
                        "h-8 w-8 rounded-md text-sm transition-colors hover:bg-gray-100",
                        selected && "bg-indigo-600 text-white hover:bg-indigo-700",
                        today &&
                          !selected &&
                          "border border-indigo-600 text-indigo-600 font-semibold",
                        !selected && !today && "text-gray-700"
                      )}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={previousYear}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium tabular-nums">{yearView}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextYear}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {MONTH_NAMES.map((name, index) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => selectMonth(index)}
                    className={cn(
                      "h-9 rounded-md text-sm transition-colors hover:bg-gray-100",
                      currentMonth.getMonth() === index &&
                        currentMonth.getFullYear() === yearView
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "text-gray-700"
                    )}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
