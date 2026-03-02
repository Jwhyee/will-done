import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Clock, Send, Zap, AlertCircle, Inbox, Sparkles } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TimeBlock, Task, User } from "@/types";
import { SortableItem } from "./components/SortableItem";
import { DroppableArea } from "./components/DroppableArea";
import { InboxItem } from "./components/InboxItem";
import { TimePicker } from "./components/TimePicker";
import { TransitionModal } from "./components/TransitionModal";
import { useToast } from "@/providers/ToastProvider";

interface WorkspaceViewProps {
  t: any;
  user: User | null;
  greeting: string;
  currentTime: Date;
  logicalDate: Date;
  timeline: TimeBlock[];
  inboxTasks: Task[];
  onTaskSubmit: (data: any) => Promise<void>;
  onTransition: (block: TimeBlock, action: string, extraMinutes?: number, reviewMemo?: string) => Promise<void>;
  onMoveToInbox: (blockId: number) => Promise<void>;
  onDeleteTask: (taskId: number) => Promise<void>;
  onHandleSplitTaskDeletion: (taskId: number, keepPast: boolean) => Promise<void>;
  onMoveAllToTimeline: () => Promise<void>;
  onMoveToTimeline: (taskId: number) => Promise<void>;
  onOpenRetrospective: () => void;
  transitionBlock: TimeBlock | null;
  setTransitionBlock: (block: TimeBlock | null) => void;
}

export const WorkspaceView = ({
  t,
  user,
  greeting,
  currentTime,
  logicalDate,
  timeline,
  inboxTasks,
  onTaskSubmit,
  onTransition,
  onMoveToInbox,
  onDeleteTask,
  onHandleSplitTaskDeletion,
  onMoveAllToTimeline,
  onMoveToTimeline,
  onOpenRetrospective,
  transitionBlock,
  setTransitionBlock,
}: WorkspaceViewProps) => {
  const [hoverTaskId, setHoverTaskId] = useState<number | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);
  const [isSplitDelete, setIsSplitDelete] = useState(false);
  const [moveAllConfirm, setMoveAllConfirm] = useState(false);
  const [exceededConfirm, setExceededConfirm] = useState<{data: any} | null>(null);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    // Auto-focus the current task (NOW) on mount
    const nowBlock = timeline.find(b => b.status === "NOW");
    if (nowBlock) {
      setTimeout(() => {
        const element = document.getElementById(`block-${nowBlock.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300); // Small delay to ensure render is complete
    }
  }, [timeline.length > 0]);

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
    if (!user) return;

    // Calculate expected end time
    const duration = data.hours * 60 + data.minutes;
    let startTime = currentTime;
    
    if (!data.isUrgent) {
      const activeBlocks = timeline.filter(b => b.status !== "UNPLUGGED");
      if (activeBlocks.length > 0) {
        // Find the last end time in the current timeline
        const lastBlock = activeBlocks.reduce((prev, current) => 
          new Date(prev.endTime) > new Date(current.endTime) ? prev : current
        );
        const lastEnd = new Date(lastBlock.endTime);
        if (lastEnd > currentTime) {
          startTime = lastEnd;
        }
      }
    }

    const endTime = new Date(startTime.getTime() + duration * 60000);
    
    // Check if endTime exceeds day_start_time of the logical day
    const [startH, startM] = user.dayStartTime.split(':').map(Number);
    const startOfLogicalDay = new Date(startTime);
    startOfLogicalDay.setHours(startH, startM, 0, 0);
    
    if (startTime < startOfLogicalDay) {
      startOfLogicalDay.setDate(startOfLogicalDay.getDate() - 1);
    }
    
    const endOfLogicalDay = new Date(startOfLogicalDay);
    endOfLogicalDay.setDate(endOfLogicalDay.getDate() + 1);
    
    if (endTime > endOfLogicalDay && !exceededConfirm) {
      setExceededConfirm({ data });
      return;
    }

    await onTaskSubmit(data);
    taskForm.reset({ title: "", hours: 0, minutes: 30, planningMemo: "", isUrgent: false });
    setExceededConfirm(null);
  };

  const handleTaskError = (errors: any) => {
    if (errors.minutes && (taskForm.getValues("hours") === 0 && taskForm.getValues("minutes") === 0)) {
      showToast(t.main?.toast?.set_duration || "수행 시간을 설정해주세요.", "error");
    } else if (errors.title) {
      showToast(t.main?.toast?.set_title || "태스크 제목을 입력해주세요.", "error");
    }
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
      .filter(b => b.status === "DONE" || b.status === "PENDING")
      .reduce((acc, b) => {
        const start = new Date(b.startTime).getTime();
        const end = new Date(b.endTime).getTime();
        return acc + (end - start);
      }, 0);
      
    return totalMinutes > 0 ? Math.round((doneMinutes / totalMinutes) * 100) : 0;
  };

  const dailyProgress = calculateProgress();

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background relative">
      {/* Dedicated Global Drag Handle Layer (Top 48px) */}
      <div 
        data-tauri-drag-region 
        className="absolute top-0 left-0 right-0 h-12 z-[50] pointer-events-none select-none"
      >
        <div data-tauri-drag-region className="w-full h-full pointer-events-auto bg-transparent" />
      </div>

      {/* Header */}
      <header className="px-8 pt-12 pb-6 flex flex-col space-y-4 shrink-0 bg-background/80 backdrop-blur-md z-10 border-b border-border select-none">
        <div className="flex items-center justify-between relative z-20">
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
                    onClick={() => setIsInboxOpen(true)}
                    className="h-10 w-10 rounded-xl hover:bg-surface-elevated text-text-muted hover:text-text-primary relative"
                  >
                    <Inbox size={24} />
                    {inboxTasks.length > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white ring-2 ring-background">
                        {inboxTasks.length}
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
        
        {/* Task Input Form */}
        <div className="p-1 bg-surface border border-border rounded-2xl shadow-xl overflow-hidden group/form transition-all duration-300 hover:border-border/80">
          <form onSubmit={taskForm.handleSubmit(handleTaskSubmit, handleTaskError)} className="flex flex-col">
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
            <DroppableArea id="timeline" className="space-y-6 relative pl-28 ml-4 pt-10 pb-4 min-h-[200px]">
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
                      onDelete={(id: number) => {
                        const isSplit = timeline.filter(b => b.taskId === id).length > 1;
                        setDeleteTaskId(id);
                        setIsSplitDelete(isSplit);
                      }}
                      hoverTaskId={hoverTaskId}
                      setHoverTaskId={setHoverTaskId}
                    />
                  ))}
                </SortableContext>
            </DroppableArea>
          )}
        </div>
      </ScrollArea>

      {/* Inbox Sheet */}
      <Sheet open={isInboxOpen} onOpenChange={setIsInboxOpen}>
        <SheetContent className="bg-surface border-l border-border p-0 w-[350px] sm:max-w-[350px]">
          <div className="flex flex-col h-full">
            <SheetHeader className="p-6 border-b border-border/50">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-lg font-bold text-text-primary flex items-center space-x-2">
                  <Inbox size={20} className="text-accent" />
                  <span>{t.sidebar?.inbox || "인박스"}</span>
                </SheetTitle>
                {inboxTasks.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setMoveAllConfirm(true)}
                    className="text-accent hover:text-accent/80 font-bold text-xs"
                  >
                    {t.main?.move_all?.btn || "전체 이동"}
                  </Button>
                )}
              </div>
            </SheetHeader>
            
            <ScrollArea className="flex-1 px-4 py-4">
              <DroppableArea id="inbox" className="space-y-3 min-h-[100px]">
                <SortableContext 
                  items={inboxTasks.map(t => `inbox-${t.id}`)}
                  strategy={verticalListSortingStrategy}
                >
                  {inboxTasks.length === 0 ? (
                    <div className="p-8 border border-dashed border-border bg-background/20 rounded-2xl text-center mt-4">
                      <p className="text-sm text-text-secondary font-bold leading-relaxed">
                        {t.sidebar?.no_tasks || "인박스가 비어있습니다."}
                      </p>
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
        </SheetContent>
      </Sheet>

      {/* Deletion Confirmation */}
      <Dialog open={!!deleteTaskId} onOpenChange={(open) => {
        if (!open) {
          setDeleteTaskId(null);
          setIsSplitDelete(false);
        }
      }}>
        <DialogContent className="sm:max-w-[420px] bg-surface-elevated border-border text-text-primary shadow-2xl rounded-3xl p-8 antialiased">
          {isSplitDelete ? (
            <>
              <DialogHeader className="space-y-4">
                <DialogTitle className="text-lg font-bold tracking-tight text-text-primary flex items-center gap-3">
                  <AlertCircle className="text-warning" size={20} />
                  {t.main.delete_split_confirm.title}
                </DialogTitle>
                <DialogDescription className="text-text-secondary text-sm leading-relaxed">
                  {t.main.delete_split_confirm.description}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-6 flex flex-col gap-3">
                <Button 
                  onClick={async () => {
                    if (deleteTaskId) {
                      await onHandleSplitTaskDeletion(deleteTaskId, false);
                      setDeleteTaskId(null);
                      setIsSplitDelete(false);
                    }
                  }}
                  className="w-full bg-danger text-text-primary hover:bg-danger/80 font-bold h-12 rounded-xl transition-all active:scale-95"
                >
                  {t.main.delete_split_confirm.delete_all}
                </Button>
                <Button 
                  variant="ghost"
                  onClick={async () => {
                    if (deleteTaskId) {
                      await onHandleSplitTaskDeletion(deleteTaskId, true);
                      setDeleteTaskId(null);
                      setIsSplitDelete(false);
                    }
                  }}
                  className="w-full bg-surface text-text-secondary hover:bg-border hover:text-text-primary font-bold h-12 rounded-xl transition-all"
                >
                  {t.main.delete_split_confirm.keep_past}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setDeleteTaskId(null);
                    setIsSplitDelete(false);
                  }}
                  className="w-full text-text-muted hover:text-text-secondary font-medium h-10"
                >
                  {t.main.delete_split_confirm.cancel}
                </Button>
              </div>
            </>
          ) : (
            <>
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
                  className="flex-1 bg-surface text-text-secondary hover:bg-border hover:text-text-primary font-bold rounded-xl h-12"
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
                  className="flex-1 bg-danger text-text-primary hover:bg-danger/80 font-bold rounded-xl h-12 transition-all active:scale-95"
                >
                  {t.main.delete_confirm.btn}
                </Button>
              </DialogFooter>
            </>
          )}
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

      {/* Deadline Exceeded Confirmation */}
      <Dialog open={!!exceededConfirm} onOpenChange={(open) => !open && setExceededConfirm(null)}>
        <DialogContent className="sm:max-w-[420px] bg-surface-elevated border-border text-text-primary shadow-2xl rounded-3xl p-8 antialiased">
          <DialogHeader className="space-y-4">
            <DialogTitle className="text-lg font-bold tracking-tight text-text-primary flex items-center gap-3">
              <AlertCircle className="text-warning" size={20} />
              {t.main.deadline_exceeded.title}
            </DialogTitle>
            <DialogDescription className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
              {t.main.deadline_exceeded.message.replace("{time}", user?.dayStartTime || "04:00")}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex flex-col gap-3">
            <Button 
              onClick={() => exceededConfirm && handleTaskSubmit(exceededConfirm.data)}
              className="w-full bg-accent text-text-primary hover:bg-accent/80 font-bold h-12 rounded-xl transition-all active:scale-95"
            >
              {t.main.deadline_exceeded.continue}
            </Button>
            <Button 
              variant="ghost"
              onClick={async () => {
                if (exceededConfirm) {
                  await onTaskSubmit({ ...exceededConfirm.data, isInbox: true });
                  taskForm.reset({ title: "", hours: 0, minutes: 30, planningMemo: "", isUrgent: false });
                  setExceededConfirm(null);
                }
              }}
              className="w-full bg-surface text-text-secondary hover:bg-border hover:text-text-primary font-bold h-12 rounded-xl transition-all"
            >
              {t.main.deadline_exceeded.to_inbox}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
