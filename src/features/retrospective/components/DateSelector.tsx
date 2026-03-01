import { useMemo } from "react";
import { 
  format, 
  parse,
  isValid,
} from "date-fns";
import { ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Stepper } from "./Stepper";
import { getWeekKey } from "../utils";

interface DateSelectorProps {
  type: "DAILY" | "WEEKLY" | "MONTHLY";
  value: string;
  onChange: (val: string) => void;
  activeDates: string[];
  t: any;
}

export const DateSelector = ({ 
  type, 
  value, 
  onChange, 
  activeDates, 
  t 
}: DateSelectorProps) => {
  // 1. Available Dates processing
  const availableMonths = useMemo(() => {
    return Array.from(new Set(activeDates.map(d => d.substring(0, 7)))).sort();
  }, [activeDates]);

  const availableWeeks = useMemo(() => {
    const keys = new Set<string>();
    activeDates.forEach(d => {
      try {
        const date = parse(d, "yyyy-MM-dd", new Date());
        if (isValid(date)) keys.add(getWeekKey(date));
      } catch (e) { /* skip */ }
    });
    return Array.from(keys).sort((a, b) => {
      const [y1, m1, w1] = a.split("|").map(Number);
      const [y2, m2, w2] = b.split("|").map(Number);
      return y1 !== y2 ? y1 - y2 : m1 !== m2 ? m1 - m2 : w1 - w2;
    });
  }, [activeDates]);

  // 2. Stepper Logic for MONTHLY
  if (type === "MONTHLY") {
    const currentIndex = availableMonths.indexOf(value);
    const label = value ? `${value.split("-")[0]}${t.common?.year || '년'} ${parseInt(value.split("-")[1])}${t.common?.month || '월'}` : "---";
    
    return (
      <Stepper 
        label={label}
        onPrev={() => onChange(availableMonths[currentIndex - 1])}
        onNext={() => onChange(availableMonths[currentIndex + 1])}
        prevDisabled={currentIndex <= 0}
        nextDisabled={currentIndex === -1 || currentIndex >= availableMonths.length - 1}
      />
    );
  }

  // 3. Stepper Logic for WEEKLY
  if (type === "WEEKLY") {
    const currentIndex = availableWeeks.indexOf(value);
    let label = "---";
    if (value.includes("|")) {
      const [y, m, w] = value.split("|");
      label = `${y}${t.common?.year || '년'} ${parseInt(m)}${t.common?.month || '월'} ${w}${t.retrospective?.week_unit || '주'}`;
    }

    return (
      <Stepper 
        label={label}
        onPrev={() => onChange(availableWeeks[currentIndex - 1])}
        onNext={() => onChange(availableWeeks[currentIndex + 1])}
        prevDisabled={currentIndex <= 0}
        nextDisabled={currentIndex === -1 || currentIndex >= availableWeeks.length - 1}
      />
    );
  }

  // 4. Popover Logic for DAILY
  let currentParsedDate = new Date();
  try {
    const p = parse(value, "yyyy-MM-dd", new Date());
    if (isValid(p)) currentParsedDate = p;
  } catch (e) { /* ignore */ }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full h-12 bg-surface border-border rounded-xl flex items-center justify-between px-4 hover:bg-surface-elevated transition-all group"
        >
          <div className="flex items-center gap-2">
            <CalendarIcon size={16} className="text-text-secondary group-hover:text-primary transition-colors" />
            <span className="text-sm font-bold tracking-tight text-text-primary">
              {value.replace(/-/g, ". ")}
            </span>
          </div>
          <ChevronRight size={16} className="text-text-secondary group-hover:translate-x-1 transition-transform" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-surface border-border rounded-xl shadow-2xl" align="center">
        <Calendar
          mode="single"
          selected={currentParsedDate}
          onSelect={(date) => {
            if (date && isValid(date)) {
              onChange(format(date, "yyyy-MM-dd"));
            }
          }}
          disabled={(date) => !activeDates.includes(format(date, "yyyy-MM-dd"))}
          modifiers={{
            active: (date) => activeDates.includes(format(date, "yyyy-MM-dd"))
          }}
          modifiersClassNames={{
            active: "bg-primary/20 text-primary font-bold border border-primary/50"
          }}
          className="[color-scheme:dark]"
        />
      </PopoverContent>
    </Popover>
  );
};
