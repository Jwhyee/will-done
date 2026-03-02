import { Send, Zap } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimePicker } from "./TimePicker";

interface TaskFormProps {
  t: any;
  taskForm: UseFormReturn<any>;
  onSubmit: (data: any) => Promise<void>;
  onError: (errors: any) => void;
}

export const TaskForm = ({ t, taskForm, onSubmit, onError }: TaskFormProps) => {
  return (
    <div className="p-1 bg-surface border border-border rounded-2xl shadow-xl overflow-hidden group/form transition-all duration-300 hover:border-border/80">
      <form onSubmit={taskForm.handleSubmit(onSubmit, onError)} className="flex flex-col">
        <div className="px-3 pt-2">
          <div className="bg-background/40 border border-border/50 rounded-xl transition-all duration-300 group-focus-within/form:bg-background/60 group-focus-within/form:border-accent/30">
            <Input
              {...taskForm.register("title")}
              placeholder={t.main.task_placeholder}
              className="w-full bg-transparent border-none text-lg font-bold placeholder:text-text-muted focus-visible:ring-0 focus-visible:ring-offset-0 px-3 h-12"
            />
          </div>
        </div>

        <div className="px-4 mt-2">
          <textarea
            {...taskForm.register("planningMemo")}
            placeholder={t.main.planning_placeholder}
            className="w-full bg-transparent text-sm font-medium text-text-secondary placeholder:text-text-muted resize-none h-12 focus:outline-none focus:ring-0 py-1 leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-between px-3 pb-3 pt-2 border-t border-border bg-surface-elevated/30">
          <div className="flex items-center space-x-2">
            <TimePicker
              hours={taskForm.watch("hours")}
              minutes={taskForm.watch("minutes")}
              onChange={(h, m) => {
                taskForm.setValue("hours", h);
                taskForm.setValue("minutes", m);
              }}
              t={t}
            />

            <label className="flex items-center space-x-2 bg-background border border-border rounded-xl h-10 px-4 cursor-pointer hover:bg-surface-elevated transition-colors">
              <input type="checkbox" {...taskForm.register("isUrgent")} className="hidden" />
              <Zap
                size={14}
                className={taskForm.watch("isUrgent") ? "text-danger fill-danger" : "text-text-secondary"}
              />
              <span
                className={`text-xs font-medium uppercase tracking-wider ${
                  taskForm.watch("isUrgent") ? "text-danger" : "text-text-secondary"
                }`}
              >
                {t.main.urgent}
              </span>
            </label>
          </div>

          <Button
            type="submit"
            className="h-10 px-5 bg-text-primary text-background hover:bg-zinc-200 font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-black/20"
          >
            <Send size={16} className="mr-1.5" />
            {t.main.add_task}
          </Button>
        </div>
      </form>
    </div>
  );
};
