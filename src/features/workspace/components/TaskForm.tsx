import { useState, useRef, useEffect } from "react";
import { Send, Zap, Inbox } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimePicker } from "./TimePicker";
import { cn } from "@/lib/utils";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";

interface TaskFormProps {
  t: any;
  taskForm: UseFormReturn<any>;
  onSubmit: (data: any, isInbox?: boolean) => Promise<void>;
  onError: (errors: any) => void;
}

export const TaskForm = ({ t, taskForm, onSubmit, onError }: TaskFormProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Close form on outside click
  useOnClickOutside(formRef, (event) => {
    const target = event.target as HTMLElement;
    // Ignore clicks inside the TimePicker popover (which is rendered in a portal)
    if (target.closest && target.closest('.time-picker-popover')) {
      return;
    }
    if (isExpanded) {
      setIsExpanded(false);
    }
  });

  // Auto-focus on title input when expanded
  useEffect(() => {
    if (isExpanded && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isExpanded]);

  const handleFocus = () => {
    setIsExpanded(true);
  };

  const handleFormSubmit = async (data: any, isInbox?: boolean) => {
    await onSubmit(data, isInbox);
    setIsExpanded(false);
  };

  const { ref: titleRef, ...titleRegister } = taskForm.register("title");

  return (
    <div
      ref={formRef}
      className={cn(
        "relative transition-all duration-300",
        !isExpanded && "bg-surface border border-border rounded-2xl p-1 shadow-xl hover:border-border/80 overflow-hidden"
      )}
    >
      <form
        onSubmit={taskForm.handleSubmit((data) => handleFormSubmit(data), onError)}
        className="flex flex-col"
      >
        <div className={cn("p-1", isExpanded && "hidden")}>
          <Input
            {...titleRegister}
            ref={(e) => {
              titleRef(e);
              // @ts-ignore
              titleInputRef.current = e;
            }}
            onFocus={handleFocus}
            placeholder="새로운 업무를 입력하세요..."
            className="w-full bg-transparent border-none text-base font-bold placeholder:text-text-muted focus-visible:ring-0 focus-visible:ring-offset-0 px-3 h-10"
          />
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute left-0 right-0 top-0 z-50 bg-surface-elevated border border-border rounded-2xl shadow-2xl ring-1 ring-accent/20 overflow-hidden"
            >
              <div className="p-4 flex flex-col">
                <div className="bg-background border border-zinc-700 rounded-xl transition-all duration-300 focus-within:border-accent mb-4 shadow-sm">
                  <Input
                    {...titleRegister}
                    ref={(e) => {
                      titleRef(e);
                      // @ts-ignore
                      titleInputRef.current = e;
                    }}
                    placeholder={t.main.task_placeholder}
                    className="w-full bg-transparent border-none text-lg font-bold placeholder:text-text-muted focus-visible:ring-0 focus-visible:ring-offset-0 px-3 h-12"
                  />
                </div>

                <div className="mt-2 mb-4 p-4 bg-background border border-zinc-700 rounded-xl transition-all duration-300 focus-within:border-accent mb-4 shadow-sm">
                  <textarea
                    {...taskForm.register("planningMemo")}
                    placeholder={t.main.planning_placeholder}
                    className="w-full bg-transparent text-sm font-medium text-text-secondary placeholder:text-text-muted resize-none focus:outline-none focus:ring-0 py-1 px-1 leading-relaxed transition-all duration-300 scrollbar-hide h-32"
                  />
                </div>

                <div className="flex items-center justify-between py-4 border-t border-border mt-auto">
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
                      onClick={taskForm.handleSubmit((data) => handleFormSubmit(data, true), onError)}
                      className="h-10 px-5 bg-text-primary text-background hover:bg-zinc-200 font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-black/20 flex items-center gap-1.5"
                    >
                      <Inbox size={16} />
                      <span className="hidden sm:inline">{t.main.add_task_inbox}</span>
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
};
