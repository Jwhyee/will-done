import { motion, AnimatePresence } from "framer-motion";
import { Plus, Sparkles, Clock } from "lucide-react";
import { RecurringTask } from "../hooks/useRecurringTasks";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RoutineSuggestionBarProps {
  suggestions: RecurringTask[];
  onInstantiate: (task: RecurringTask) => void;
  t: any;
}

export const RoutineSuggestionBar = ({
  suggestions,
  onInstantiate,
  t,
}: RoutineSuggestionBarProps) => {
  if (suggestions.length === 0) return null;

  return (
    <div className="w-full py-3 px-4 mb-4 bg-accent/5 border border-accent/20 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-accent/10 text-accent">
          <Sparkles size={14} className="animate-pulse" />
        </div>
        <span className="text-xs font-bold text-text-primary tracking-tight">
          {t.main.routine_suggestion.banner}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {suggestions.map((task) => {
            const hours = Math.floor(task.duration / 60);
            const minutes = task.duration % 60;

            return (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onInstantiate(task)}
                        className="h-9 px-3 bg-surface border-border hover:border-accent/40 hover:bg-accent/5 text-text-primary rounded-xl transition-all group flex items-center gap-2 shadow-sm"
                      >
                        <div className="flex flex-col items-start leading-none gap-0.5">
                          <span className="text-[11px] font-bold truncate max-w-[120px]">
                            {task.title}
                          </span>
                          <div className="flex items-center gap-1 opacity-60">
                            <Clock size={10} />
                            <span className="text-[9px] font-medium">
                              {hours > 0 && `${hours}${t.main.hours} `}
                              {minutes > 0 && `${minutes}${t.main.mins}`}
                            </span>
                          </div>
                        </div>
                        <div className="w-5 h-5 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                          <Plus size={12} className="text-accent" />
                        </div>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-surface-elevated border-border text-[10px] font-bold px-2 py-1">
                      {t.main.routine_suggestion.add_tooltip}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
