import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Clock, Send, Zap, AlertCircle } from "lucide-react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { TimeBlock, Task } from "@/types";
import { SortableItem } from "./components/SortableItem";
import { DroppableArea } from "./components/DroppableArea";
import { TimePicker } from "./components/TimePicker";
import { TransitionModal } from "./components/TransitionModal";

interface WorkspaceViewProps {
  t: any;
  greeting: string;
  currentTime: Date;
  timeline: TimeBlock[];
  inboxTasks: Task[];
  onTaskSubmit: (data: any) => Promise<void>;
  onTransition: (block: TimeBlock, action: string, extraMinutes?: number, reviewMemo?: string) => Promise<void>;
  onMoveToInbox: (blockId: number) => Promise<void>;
  onDeleteTask: (taskId: number) => Promise<void>;
  onMoveAllToTimeline: () => Promise<void>;
  transitionBlock: TimeBlock | null;
  setTransitionBlock: (block: TimeBlock | null) => void;
}

export const WorkspaceView = ({
  t,
  greeting,
  currentTime,
  timeline,
  inboxTasks,
  onTaskSubmit,
  onTransition,
  onMoveToInbox,
  onDeleteTask,
  onMoveAllToTimeline,
  transitionBlock,
  setTransitionBlock,
}: WorkspaceViewProps) => {
  const [hoverTaskId, setHoverTaskId] = useState<number | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);
  const [moveAllConfirm, setMoveAllConfirm] = useState(false);

  const taskSchema = z.object({
    title: z.string().min(1, "Task title is required"),
    hours: z.number().min(0).max(23),
    minutes: z.number().min(0).max(59),
    planningMemo: z.string().optional(),
    isUrgent: z.boolean(),
  }).refine((data) => data.hours > 0 || data.minutes > 0, {
    message: "Duration must be at least 1 minute",
    path: ["minutes"],
  });

  type TaskFormValues = z.infer<typeof taskSchema>;

  const taskForm = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: "", hours: 0, minutes: 30, planningMemo: "", isUrgent: false }
  });

  const handleTaskSubmit = async (data: TaskFormValues) => {
    await onTaskSubmit(data);
    taskForm.reset({ title: "", hours: 0, minutes: 30, planningMemo: "", isUrgent: false });
  };

  const calculateProgress = () => {
    const activeBlocks = timeline.filter(b => b.status !== "UNPLUGGED");
    if (activeBlocks.length === 0) return 0;
    
    const totalMinutes = activeBlocks.reduce((acc, b) => {
      const start = new Date(b.startTime).getTime();
      const end = new Date(b.endTime).getTime();
      return acc + (end - start);
    }, 0);
    
    const doneMinutes = activeBlocks
      .filter(b => b.status === "DONE")
      .reduce((acc, b) => {
        const start = new Date(b.startTime).getTime();
        const end = new Date(b.endTime).getTime();
        return acc + (end - start);
      }, 0);
      
    return totalMinutes > 0 ? Math.round((doneMinutes / totalMinutes) * 100) : 0;
  };

  const dailyProgress = calculateProgress();

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <header className="px-8 py-6 flex flex-col space-y-4 shrink-0 bg-background/80 backdrop-blur-md z-10 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="space-y-1 w-full max-w-2xl">
            <div className="flex items-center space-x-3 mb-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted bg-surface/50 px-2 py-0.5 rounded border border-border">
                {format(currentTime, "yyyy년 M월 d일 (EEE)", { locale: ko })}
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
        </div>
        
        {/* Task Input Form */}
        <div className="p-1 bg-surface border border-border rounded-2xl shadow-xl overflow-hidden group/form transition-all duration-300 hover:border-border/80">
          <form onSubmit={taskForm.handleSubmit(handleTaskSubmit)} className="flex flex-col">
            <div className="px-3 pt-2">
              <div className="bg-background/40 border border-border/50 rounded-xl transition-all duration-300 group-focus-within/form:bg-background/60 group-focus-within/form:border-accent/30">
                <Input 
                  {...taskForm.register("title")}
                  placeholder={t.main.task_placeholder} 
                  className="w-full bg-transparent border-none text-lg font-bold placeholder:text-text-muted focus-visible:ring-0 focus-visible:ring-offset-0 px-3 h-12"
                />
              </div>
            </div>
            
            <div className="px-4 mt-[-4px]">
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
                  <Zap size={14} className={taskForm.watch("isUrgent") ? "text-danger fill-danger" : "text-text-secondary"} />
                  <span className={`text-xs font-medium uppercase tracking-wider ${taskForm.watch("isUrgent") ? "text-danger" : "text-text-secondary"}`}>{t.main.urgent}</span>
                </label>
              </div>

              <Button type="submit" className="h-10 px-5 bg-text-primary text-background hover:bg-zinc-200 font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-black/20">
                <Send size={16} className="mr-1.5" />
                {t.main.add_task}
              </Button>
            </div>
          </form>
        </div>
      </header>

      {/* Timeline */}
      <ScrollArea className="flex-1 px-8">
        <div className="py-8 space-y-4">
          {timeline.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-text-secondary space-y-4 border-2 border-dashed border-border rounded-3xl group relative overflow-hidden">
              <Clock size={48} className="opacity-20 transition-transform group-hover:scale-110 duration-500" />
              <div className="text-center space-y-2">
                <p className="font-bold text-sm uppercase tracking-widest opacity-50">{t.main.empty_timeline}</p>
                {inboxTasks.length > 0 && (
                  <Button 
                    variant="ghost" 
                    onClick={() => setMoveAllConfirm(true)}
                    className="text-accent hover:text-accent/80 font-bold text-xs gap-2"
                  >
                    <Send size={14} />
                    {t.main.move_all.description}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <DroppableArea id="timeline" className="space-y-6 relative pl-16 ml-4 py-4 min-h-[200px]">
                <SortableContext
                  items={timeline.map(b => b.id.toString())}
                  strategy={verticalListSortingStrategy}
                >
                  {timeline.map((block) => (
                    <SortableItem
                      key={block.id === -1 ? `unplugged-${block.startTime}` : block.id}
                      block={block}
                      timeline={timeline}
                      currentTime={currentTime}
                      t={t}
                      onTransition={setTransitionBlock}
                      onMoveToInbox={onMoveToInbox}
                      onDelete={(id: number) => setDeleteTaskId(id)}
                      hoverTaskId={hoverTaskId}
                      setHoverTaskId={setHoverTaskId}
                    />
                  ))}
                </SortableContext>
            </DroppableArea>
          )}
        </div>
      </ScrollArea>

      {/* Deletion Confirmation */}
      <Dialog open={!!deleteTaskId} onOpenChange={(open) => !open && setDeleteTaskId(null)}>
        <DialogContent className="sm:max-w-[400px] bg-surface-elevated border-border text-text-primary shadow-2xl rounded-3xl p-8 antialiased">
          <DialogHeader className="space-y-4">
            <DialogTitle className="text-lg font-bold tracking-tight text-text-primary flex items-center gap-3">
              <AlertCircle className="text-danger" size={20} />
              {t.main.delete_confirm.title}
            </DialogTitle>
            <DialogDescription className="text-text-secondary text-sm leading-relaxed">
              {t.main.delete_confirm.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex gap-3">
            <Button 
              variant="ghost" 
              onClick={() => setDeleteTaskId(null)}
              className="flex-1 bg-surface text-text-secondary hover:bg-border hover:text-text-primary font-bold rounded-xl"
            >
              {t.main.delete_confirm.cancel}
            </Button>
            <Button 
              onClick={async () => {
                if (deleteTaskId) {
                  await onDeleteTask(deleteTaskId);
                  setDeleteTaskId(null);
                }
              }}
              className="flex-1 bg-danger text-text-primary hover:bg-danger/80 font-bold rounded-xl"
            >
              {t.main.delete_confirm.btn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move All Confirmation */}
      <Dialog open={moveAllConfirm} onOpenChange={setMoveAllConfirm}>
        <DialogContent className="sm:max-w-[400px] bg-surface-elevated border-border text-text-primary shadow-2xl rounded-3xl p-8 antialiased">
          <DialogHeader className="space-y-4">
            <DialogTitle className="text-lg font-bold tracking-tight text-text-primary flex items-center gap-3">
              <Send className="text-accent" size={20} />
              {t.main.move_all.title}
            </DialogTitle>
            <DialogDescription className="text-text-secondary text-sm leading-relaxed">
              {t.main.move_all.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex gap-3">
            <Button 
              variant="ghost" 
              onClick={() => setMoveAllConfirm(false)}
              className="flex-1 bg-surface text-text-secondary hover:bg-border hover:text-text-primary font-bold rounded-xl"
            >
              {t.main.move_all.cancel}
            </Button>
            <Button 
              onClick={async () => {
                await onMoveAllToTimeline();
                setMoveAllConfirm(false);
              }}
              className="flex-1 bg-accent text-text-primary hover:bg-accent/80 font-bold rounded-xl"
            >
              {t.main.move_all.btn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TransitionModal 
        t={t}
        transitionBlock={transitionBlock}
        onClose={() => setTransitionBlock(null)}
        onTransition={async (action, extra, memo) => {
          if (transitionBlock) {
            await onTransition(transitionBlock, action, extra, memo);
          }
        }}
      />
    </div>
  );
};
