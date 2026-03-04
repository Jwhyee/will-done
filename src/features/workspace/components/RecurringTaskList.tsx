import { Trash2, Clock, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RecurringTask {
  id: number;
  title: string;
  duration: number;
  daysOfWeek: string; // JSON array string e.g., "[1,2,3]"
  planningMemo?: string;
}

interface RecurringTaskListProps {
  tasks: RecurringTask[];
  onDelete: (id: number) => Promise<void>;
  t: any;
}

export const RecurringTaskList = ({ tasks, onDelete, t }: RecurringTaskListProps) => {
  const parseDays = (daysStr: string) => {
    try {
      return JSON.parse(daysStr) as number[];
    } catch (e) {
      return [] as number[];
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="p-12 text-center space-y-4 bg-surface border border-border/50 rounded-2xl">
        <p className="text-xs text-text-secondary">{t.workspace_routine.list_empty}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const days = parseDays(task.daysOfWeek);
        const hours = Math.floor(task.duration / 60);
        const minutes = task.duration % 60;

        return (
          <div 
            key={task.id} 
            className="p-4 bg-surface border border-border rounded-xl flex items-center justify-between group transition-all hover:border-border/80 hover:shadow-sm"
          >
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-text-primary">{task.title}</h4>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-background border border-border/50">
                  <Clock size={10} className="text-text-muted" />
                  <span className="text-[10px] font-bold text-text-secondary">
                    {hours > 0 && `${hours}${t.main.hours} `}
                    {minutes > 0 && `${minutes}${t.main.mins}`}
                  </span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <span 
                    key={d} 
                    className={cn(
                      "w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-bold border transition-colors",
                      days.includes(d) 
                        ? "bg-text-primary/5 border-text-primary/20 text-text-primary" 
                        : "bg-background border-border/30 text-text-muted"
                    )}
                  >
                    {t.workspace_routine.days[d]}
                  </span>
                ))}
              </div>

              {task.planningMemo && (
                <p className="text-[11px] text-text-secondary line-clamp-1 italic">
                  {task.planningMemo}
                </p>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(task.id)}
              className="opacity-0 group-hover:opacity-100 h-9 w-9 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
            >
              <Trash2 size={16} />
            </Button>
          </div>
        );
      })}
    </div>
  );
};
