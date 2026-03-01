import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown } from "lucide-react";

interface TimePickerProps {
  hours: number;
  minutes: number;
  onChange: (h: number, m: number) => void;
  t: any;
}

export const TimePicker = ({ 
  hours, 
  minutes, 
  onChange, 
  t 
}: TimePickerProps) => {
  const [open, setOpen] = useState(false);
  const hourOptions = Array.from({ length: 24 }, (_, i) => i);
  const minuteOptions = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center bg-background border border-border rounded-xl h-10 px-3 space-x-2 hover:bg-surface-elevated transition-colors"
        >
          <div className="flex items-center space-x-1">
            <span className="font-bold text-sm">{hours}</span>
            <span className="text-xs font-medium text-text-secondary uppercase">{t.main.hours}</span>
          </div>
          <Separator orientation="vertical" className="h-4 bg-border" />
          <div className="flex items-center space-x-1">
            <span className="font-bold text-sm">{minutes}</span>
            <span className="text-xs font-medium text-text-secondary uppercase">{t.main.mins}</span>
          </div>
          <ChevronDown size={14} className="text-text-muted ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0 bg-surface-elevated border-border shadow-2xl rounded-2xl overflow-hidden" align="center">
        <div className="flex h-64">
          <ScrollArea className="flex-1 border-r border-border">
            <div className="p-2 space-y-1">
              <div className="px-2 py-1 mb-1 border-b border-border/50">
                <span className="text-xs font-medium text-text-secondary uppercase">{t.main.hours}</span>
              </div>
              {hourOptions.map((h) => (
                <Button
                  key={h}
                  variant="ghost"
                  className={`w-full justify-center font-bold text-sm h-9 rounded-lg ${hours === h ? "bg-accent text-text-primary" : "text-text-secondary hover:bg-border"}`}
                  onClick={() => onChange(h, minutes)}
                >
                  {h}
                </Button>
              ))}
            </div>
          </ScrollArea>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              <div className="px-2 py-1 mb-1 border-b border-border/50">
                <span className="text-xs font-medium text-text-secondary uppercase">{t.main.mins}</span>
              </div>
              {minuteOptions.map((m) => (
                <Button
                  key={m}
                  variant="ghost"
                  className={`w-full justify-center font-bold text-sm h-9 rounded-lg ${minutes === m ? "bg-accent text-text-primary" : "text-text-secondary hover:bg-border"}`}
                  onClick={() => onChange(hours, m)}
                >
                  {m}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
};
