import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RecurringTaskForm } from "@/features/workspace/components/RecurringTaskForm";
import { RecurringTaskList } from "@/features/workspace/components/RecurringTaskList";

interface WorkspaceRoutineTabProps {
  recurringTasks: any[];
  addTask: (data: any) => Promise<void>;
  removeRecurringTask: (id: number) => Promise<void>;
  t: any;
}

export const WorkspaceRoutineTab = ({ recurringTasks, addTask, removeRecurringTask, t }: WorkspaceRoutineTabProps) => {
  return (
    <ScrollArea className="h-full pr-4">
      <div className="space-y-6 pb-6 pt-2">
        <div className="space-y-1 px-1">
          <h3 className="text-sm font-bold text-text-primary">{t.workspace_routine?.title}</h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            {t.workspace_routine?.desc}
          </p>
        </div>
        
        <RecurringTaskForm t={t} onSubmit={addTask} />
        
        <div className="space-y-3">
          <Label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-1">
            {t.workspace_routine?.list_label}
          </Label>
          <RecurringTaskList tasks={recurringTasks} onDelete={removeRecurringTask} t={t} />
        </div>
      </div>
    </ScrollArea>
  );
};
