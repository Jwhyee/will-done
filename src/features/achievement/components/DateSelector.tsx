import {
  format,
  parse,
  isValid,
} from "date-fns";
import { ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DateSelectorProps {
  value: string;
  onChange: (val: string) => void;
  activeDates: string[];
}

export const DateSelector = ({
  value,
  onChange,
  activeDates,
}: DateSelectorProps) => {
  // Popover Logic for DAILY
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
