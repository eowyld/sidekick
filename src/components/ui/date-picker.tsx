import { useState, type ReactNode } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { DATE_FORMAT_PLACEHOLDER } from "@/lib/date-format";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "./utils";

interface DatePickerProps {
  value: string; // Format: YYYY-MM-DD
  onChange: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Relie le déclencheur au `<Label htmlFor="…">`. */
  id?: string;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  /** Classes Tailwind pour l’icône calendrier dans le bouton (ex. h-6 w-6) */
  calendarIconClassName?: string;
  formatDisplay?: (dateStr: string) => string;
}

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];
const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/** Boutons maîtres du mois / année — évite les styles Outline trop fades dans Dialog + Portal */
function CalendarNavButton({
  ariaLabel,
  onClick,
  children,
}: {
  ariaLabel: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[rgba(245,245,245,0.35)] bg-[rgba(245,245,245,0.08)] text-white hover:bg-[rgba(245,245,245,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0FF00]/55"
    >
      {children}
    </button>
  );
}

export function DatePicker({
  value,
  onChange,
  placeholder = DATE_FORMAT_PLACEHOLDER,
  disabled = false,
  id,
  className,
  size = "md",
  calendarIconClassName,
  formatDisplay,
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
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;
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
          id={id}
          variant="outline"
          size={size}
          disabled={disabled}
          className={cn(
            "justify-start text-left font-normal",
            size === "md" && "w-full",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Calendar
            className={cn(
              "mr-2 h-4 w-4 shrink-0 text-[#F5F5F5]/70",
              calendarIconClassName
            )}
          />
          {value ? (formatDisplay ? formatDisplay(value) : formatDisplayDate(value)) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        // `#171717` : la surface des menus et popovers du produit. Même bleu
        // ardoise résiduel que le Select, et il s'ouvrait juste à côté.
        className="w-auto border border-[rgba(245,245,245,0.1)] bg-[#171717] p-0 text-[#F5F5F5] shadow-[0_12px_32px_rgba(0,0,0,0.6)]"
        align="start"
      >
        <div className="p-2">
          {view === "days" ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <CalendarNavButton ariaLabel="Mois précédent" onClick={previousMonth}>
                  <ChevronLeft className="h-4 w-4 text-white" strokeWidth={2.25} aria-hidden />
                </CalendarNavButton>
                <button
                  type="button"
                  onClick={goToMonthsView}
                  className="text-xs font-medium rounded px-2 py-0.5 hover:bg-muted transition-colors min-w-[110px]"
                  title="Choisir le mois"
                >
                  {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </button>
                <CalendarNavButton ariaLabel="Mois suivant" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4 text-white" strokeWidth={2.25} aria-hidden />
                </CalendarNavButton>
              </div>

              <div className="grid grid-cols-7 mb-1">
                {DAY_NAMES.map((day) => (
                  <div
                    key={day}
                    className="flex h-6 items-center justify-center text-center text-[10px] font-medium text-[#F5F5F5]/60"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-7" />
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
                        "h-7 w-7 rounded text-xs transition-colors hover:bg-[rgba(245,245,245,0.12)]",
                        selected && "bg-[#F0FF00] text-[#101010] hover:bg-[#F0FF00]/90",
                        today &&
                          !selected &&
                          "border border-[#F0FF00] font-semibold text-[#F0FF00]",
                        !selected && !today && "text-[#F5F5F5]/85"
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
              <div className="flex items-center justify-between mb-2">
                <CalendarNavButton ariaLabel="Année précédente" onClick={previousYear}>
                  <ChevronLeft className="h-4 w-4 text-white" strokeWidth={2.25} aria-hidden />
                </CalendarNavButton>
                <span className="text-xs font-medium tabular-nums">{yearView}</span>
                <CalendarNavButton ariaLabel="Année suivante" onClick={nextYear}>
                  <ChevronRight className="h-4 w-4 text-white" strokeWidth={2.25} aria-hidden />
                </CalendarNavButton>
              </div>
              <div className="grid grid-cols-3 gap-0.5">
                {MONTH_NAMES.map((name, index) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => selectMonth(index)}
                    className={cn(
                      "h-8 rounded text-xs transition-colors hover:bg-[rgba(245,245,245,0.12)]",
                      currentMonth.getMonth() === index &&
                        currentMonth.getFullYear() === yearView
                        ? "bg-[#F0FF00] text-[#101010] hover:bg-[#F0FF00]/90"
                        : "text-[#F5F5F5]/85"
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
