import { format } from "date-fns";
import { Calendar as CalendarIcon, Inbox, Send, Settings } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { DroppableArea } from "@/features/workspace/components/DroppableArea";
import { InboxItem } from "@/features/workspace/components/InboxItem";
import { Task } from "@/types";

interface SecondarySidebarProps {
  t: any;
  selectedDate: Date;
  onDateSelect: (date: Date | undefined) => void;
  activeDates: string[];
  manualDate: string;
  onManualDateChange: (val: string) => void;
  onManualDateSubmit: (e: React.FormEvent) => void;
  inboxTasks: Task[];
  onMoveToTimeline: (taskId: number) => void;
  onDeleteTask: (id: number) => void;
  onOpenSettings: () => void;
}

export const SecondarySidebar = ({
  t,
  selectedDate,
  onDateSelect,
  activeDates,
  manualDate,
  onManualDateChange,
  onManualDateSubmit,
  inboxTasks,
  onMoveToTimeline,
  onDeleteTask,
  onOpenSettings,
}: SecondarySidebarProps) => {
  return (
    <aside className="w-64 border-r border-border bg-surface flex flex-col shrink-0 z-10">
      <div className="p-5 border-b border-border space-y-4">
        <Popover>
          <PopoverTrigger asChild>
            <div className="flex items-center space-x-3 text-text-secondary hover:text-text-primary cursor-pointer transition-all active:scale-95">
              <CalendarIcon size={18} />
              <span className="text-sm font-black tracking-tight">
                {format(selectedDate, "yyyy. MM. dd.")}
              </span>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-surface-elevated border-border" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={onDateSelect}
              initialFocus
              className="bg-surface-elevated text-text-primary"
              disabled={(date) => {
                const dateStr = format(date, "yyyy-MM-dd");
                const isToday = format(new Date(), "yyyy-MM-dd") === dateStr;
                return !activeDates.includes(dateStr) && !isToday;
              }}
              modifiers={{
                hasData: (date) => activeDates.includes(format(date, "yyyy-MM-dd"))
              }}
              modifiersClassNames={{
                hasData: "font-black text-accent"
              }}
            />
          </PopoverContent>
        </Popover>

        <form onSubmit={onManualDateSubmit} className="relative">
          <Input
            value={manualDate}
            onChange={(e) => onManualDateChange(e.target.value)}
            placeholder="YYYY-MM-DD"
            className="bg-background border-border text-[11px] font-mono font-bold h-9 rounded-xl focus-visible:ring-1 focus-visible:ring-white/10"
          />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
            <Send size={12} />
          </button>
        </form>
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-5 pb-2 flex items-center space-x-2">
          <Inbox size={14} className="text-text-muted" />
          <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
            {t.sidebar.inbox}
          </h3>
        </div>
        <ScrollArea className="flex-1 p-5 pt-0">
          <DroppableArea id="inbox" className="space-y-3 py-3 min-h-[100px]">
            <SortableContext 
              items={inboxTasks.map(t => `inbox-${t.id}`)}
              strategy={verticalListSortingStrategy}
            >
              {inboxTasks.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-border bg-background/40 rounded-2xl text-center">
                  <p className="text-[11px] text-text-muted font-bold italic">{t.sidebar.no_tasks}</p>
                </div>
              ) : (
                inboxTasks.map((task) => (
                  <InboxItem 
                    key={task.id} 
                    task={task} 
                    onMoveToTimeline={onMoveToTimeline}
                    onDelete={onDeleteTask}
                  />
                ))
              )}
            </SortableContext>
          </DroppableArea>
        </ScrollArea>
      </div>

      <div className="p-5 border-t border-border">
        <Button
          onClick={onOpenSettings}
          variant="ghost"
          className="w-full justify-start text-text-secondary hover:text-text-primary hover:bg-border space-x-4 h-12 px-4 rounded-xl transition-all"
        >
          <Settings size={20} />
          <span className="font-bold text-sm">{t.sidebar.settings}</span>
        </Button>
      </div>
    </aside>
  );
};
