import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Clock, Inbox, Sparkles } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TaskForm } from "./TaskForm";

interface WorkspaceHeaderProps {
  t: any;
  greeting: string;
  currentTime: Date;
  logicalDate: Date;
  dailyProgress: number;
  inboxTasksCount: number;
  taskForm: UseFormReturn<any>;
  onTaskSubmit: (data: any) => Promise<void>;
  onTaskError: (errors: any) => void;
  onOpenInbox: () => void;
  onOpenRetrospective: () => void;
}

export const WorkspaceHeader = ({
  t,
  greeting,
  currentTime,
  logicalDate,
  dailyProgress,
  inboxTasksCount,
  taskForm,
  onTaskSubmit,
  onTaskError,
  onOpenInbox,
  onOpenRetrospective,
}: WorkspaceHeaderProps) => {
  return (
    <header className="px-8 pt-8 pb-6 flex flex-col space-y-4 shrink-0 bg-background/80 backdrop-blur-md z-10 border-b border-border select-none">
      <div className="flex items-center justify-between relative z-50">
        <div className="space-y-1 w-full max-w-2xl">
          <div className="flex items-center space-x-3 mb-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted bg-surface/50 px-2 py-0.5 rounded border border-border">
              {format(logicalDate, "yyyy년 M월 d일 (EEE)", { locale: ko })}
            </div>
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
                {t.sidebar?.inbox || "인박스"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onOpenRetrospective}
                  className="h-10 w-10 rounded-xl hover:bg-surface-elevated text-text-muted hover:text-text-primary"
                >
                  <Sparkles size={20} className="text-warning" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-surface-elevated border-border text-text-primary font-bold text-xs rounded-xl">
                {t.sidebar?.retrospective || "회고"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <TaskForm t={t} taskForm={taskForm} onSubmit={onTaskSubmit} onError={onTaskError} />
    </header>
  );
};
