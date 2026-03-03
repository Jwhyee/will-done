import { useState, useRef, useEffect } from "react";
import { Send, Zap, Inbox } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimePicker } from "./TimePicker";
import { cn } from "@/lib/utils";

interface TaskFormProps {
  t: any;
  taskForm: UseFormReturn<any>;
  onSubmit: (data: any, isInbox?: boolean) => Promise<void>;
  onError: (errors: any) => void;
}

export const TaskForm = ({ t, taskForm, onSubmit, onError }: TaskFormProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExpanded]);

  const handleFocus = () => {
    setIsExpanded(true);
  };

  const handleFormSubmit = async (data: any, isInbox?: boolean) => {
    await onSubmit(data, isInbox);
    setIsExpanded(false);
  };

  return (
    <div
      ref={formRef}
      className={cn(
        "bg-surface border border-border rounded-2xl shadow-xl transition-all duration-300 group/form",
        isExpanded
          ? "absolute left-8 right-8 top-full mt-2 z-[100] border-accent/30 shadow-2xl shadow-black/40 scale-[1.02] origin-top"
          : "relative overflow-hidden hover:border-border/80 p-1"
      )}
    >
      <form
        onSubmit={taskForm.handleSubmit((data) => handleFormSubmit(data), onError)}
        className="flex flex-col"
      >
        <div className={cn("px-3 pt-2", isExpanded && "pt-4 px-4")}>
          <div className="bg-background/40 border border-border/50 rounded-xl transition-all duration-300 group-focus-within/form:bg-background/60 group-focus-within/form:border-accent/30">
            <Input
              {...taskForm.register("title")}
              onFocus={handleFocus}
              placeholder={t.main.task_placeholder}
              className="w-full bg-transparent border-none text-lg font-bold placeholder:text-text-muted focus-visible:ring-0 focus-visible:ring-offset-0 px-3 h-12"
            />
          </div>
        </div>

        <div className={cn("px-4 mt-2 transition-all duration-300", isExpanded ? "mb-4" : "mb-0")}>
          <textarea
            {...taskForm.register("planningMemo")}
            onFocus={handleFocus}
            placeholder={t.main.planning_placeholder}
            className={cn(
              "w-full bg-transparent text-sm font-medium text-text-secondary placeholder:text-text-muted resize-none focus:outline-none focus:ring-0 py-1 leading-relaxed transition-all duration-300 scrollbar-hide",
              isExpanded ? "h-32" : "h-12"
            )}
          />
        </div>

        <div className={cn(
          "flex items-center justify-between px-3 pb-3 pt-2 border-t border-border bg-surface-elevated/30",
          isExpanded && "rounded-b-2xl px-4 py-4"
        )}>
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
                className={`text-xs font-medium uppercase tracking-wider ${taskForm.watch("isUrgent") ? "text-danger" : "text-text-secondary"
                  }`}
              >
                {t.main.urgent}
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={taskForm.handleSubmit((data) => handleFormSubmit(data, true), onError)}
              className="h-10 px-4 bg-surface-elevated text-text-primary border-border hover:bg-border font-bold rounded-xl transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Inbox size={16} className="text-text-secondary" />
              <span className="hidden sm:inline">인박스 보관</span>
            </Button>
            <Button
              type="submit"
              className="h-10 px-5 bg-text-primary text-background hover:bg-zinc-200 font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-black/20 flex items-center gap-1.5"
            >
              <Send size={16} />
              {t.main.add_task}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
