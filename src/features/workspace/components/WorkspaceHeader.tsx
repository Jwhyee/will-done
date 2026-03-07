import { useState, useEffect } from "react";
import { format, isSameDay } from "date-fns";
import * as locales from "date-fns/locale";
import { Clock, Inbox, Sparkles, Calendar as CalendarIcon, RotateCcw } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { TaskForm } from "./TaskForm";
import { User } from "@/types";

interface WorkspaceHeaderProps {
  t: any;
  user: User | null;
  greeting: string;
  currentTime: Date;
  logicalDate: Date;
  selectedDate: Date | null;
  onDateChange: (date: Date | null) => void;
  activeWorkspaceId: number | null;
  dailyProgress: number;
  inboxTasksCount: number;
  taskForm: UseFormReturn<any>;
  onTaskSubmit: (data: any, isInbox?: boolean) => Promise<void>;
  onTaskError: (errors: any) => void;
  onOpenInbox: () => void;
  onOpenRetrospective: () => void;
  isPastView: boolean;
}

export const WorkspaceHeader = ({
  t,
  user,
  greeting,
  currentTime,
  logicalDate,
  selectedDate,
  onDateChange,
  activeWorkspaceId,
  dailyProgress,
  inboxTasksCount,
  taskForm,
  onTaskSubmit,
  onTaskError,
  onOpenInbox,
  onOpenRetrospective,
  isPastView,
}: WorkspaceHeaderProps) => {
  const [activeDates, setActiveDates] = useState<string[]>([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const isRetroEnabled = !!user?.geminiApiKey;
  const activeLocale = user?.lang === "ko" ? locales.ko : locales.enUS;

  const viewDate = selectedDate || logicalDate;

  useEffect(() => {
    if (activeWorkspaceId) {
      invoke<string[]>("get_active_dates", { workspaceId: activeWorkspaceId })
        .then(setActiveDates)
        .catch(console.error);
    }
  }, [activeWorkspaceId]);

  const disabledDays = (date: Date) => {
    // Disable future dates beyond today
    if (date > logicalDate && !isSameDay(date, logicalDate)) return true;

    // If not today, only allow dates in activeDates
    if (isSameDay(date, logicalDate)) return false;

    const dateStr = format(date, "yyyy-MM-dd");
    return !activeDates.includes(dateStr);
  };

  return (
    <header className="px-8 pt-8 pb-6 flex flex-col space-y-4 shrink-0 bg-background/80 backdrop-blur-md z-50 border-b border-border select-none relative">
      <div className="flex items-center justify-between relative z-50">
        <div className="space-y-1 w-full max-w-2xl">
          <div className="flex items-center space-x-3 mb-1">
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-surface-elevated cursor-pointer transition-all active:scale-95 group border border-transparent hover:border-border/50">
                  <div className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${isPastView ? 'text-accent' : 'text-text-primary'}`}>
                    {format(viewDate, user?.lang === "ko" ? "yyyy년 M월 d일 (EEE)" : "MMM d, yyyy (EEE)", { locale: activeLocale })}
                  </div>
                  <CalendarIcon size={12} className={`transition-colors ${isPastView ? 'text-accent' : 'text-text-muted group-hover:text-text-primary'}`} />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-surface-elevated border-border shadow-2xl rounded-2xl overflow-hidden" align="start">
                <Calendar
                  mode="single"
                  selected={viewDate}
                  onSelect={(date) => {
                    if (date) {
                      onDateChange(isSameDay(date, logicalDate) ? null : date);
                      setIsCalendarOpen(false);
                    }
                  }}
                  disabled={disabledDays}
                  initialFocus
                  locale={activeLocale}
                  className="p-3"
                />
                <div className="p-2 border-t border-border bg-surface/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-surface-elevated rounded-lg h-9"
                    onClick={() => {
                      onDateChange(null);
                      setIsCalendarOpen(false);
                    }}
                  >
                    <RotateCcw size={14} />
                    {t.main.go_to_today}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <div className="flex items-center space-x-1.5 text-sm font-bold font-mono tracking-tight text-text-secondary">
              <Clock size={14} className="text-accent" />
              <span>{format(currentTime, "HH:mm:ss")}</span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-text-primary text-sm font-semibold leading-relaxed pl-1">{greeting}</p>

            <div className="flex items-center space-x-3 group">
              <div className="flex-1 max-w-[280px] h-1.5 bg-surface rounded-full overflow-hidden border border-border/50 relative">
                <div
                  className="h-full bg-accent transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                  style={{ width: `${dailyProgress}%` }}
                />
              </div>
              <span className="text-[10px] font-black text-accent bg-accent/10 px-1.5 py-0.5 rounded-md border border-accent/20">
                {dailyProgress}% DONE
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start pt-2">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onOpenInbox}
                  className="h-10 w-10 rounded-xl hover:bg-surface-elevated text-text-muted hover:text-text-primary relative"
                >
                  <Inbox size={24} />
                  {inboxTasksCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white ring-2 ring-background">
                      {inboxTasksCount}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-surface-elevated border-border text-text-primary font-bold text-xs rounded-xl">
                {t.sidebar.inbox}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-block">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onOpenRetrospective}
                    disabled={!isRetroEnabled}
                    className="h-10 w-10 rounded-xl hover:bg-surface-elevated text-text-muted hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <Sparkles size={20} className={isRetroEnabled ? "text-warning" : "text-text-muted"} />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-surface-elevated border-border text-text-primary font-bold text-xs rounded-xl">
                {isRetroEnabled
                  ? t.header.retrospective
                  : t.header.retro_disabled_tooltip
                }
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {!isPastView && (
        <TaskForm t={t} taskForm={taskForm} onSubmit={onTaskSubmit} onError={onTaskError} workspaceId={activeWorkspaceId} />
      )}
    </header>
  );
};
