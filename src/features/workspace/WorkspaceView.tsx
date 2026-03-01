import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Clock, Sparkles, Send, Zap, AlertCircle } from "lucide-react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { TimeBlock, Task, User } from "@/types";
import { SortableItem } from "./components/SortableItem";
import { DroppableArea } from "./components/DroppableArea";

interface WorkspaceViewProps {
  t: any;
  user: User | null;
  greeting: string;
  currentTime: Date;
  timeline: TimeBlock[];
  inboxTasks: Task[];
  onTaskSubmit: (data: any) => Promise<void>;
  onTransition: (block: TimeBlock, action: string, extraMinutes?: number, reviewMemo?: string) => Promise<void>;
  onMoveToInbox: (blockId: number) => Promise<void>;
  onDeleteTask: (taskId: number) => Promise<void>;
  onMoveAllToTimeline: () => Promise<void>;
  onOpenRetrospective: () => void;
  transitionBlock: TimeBlock | null;
  setTransitionBlock: (block: TimeBlock | null) => void;
}

export const WorkspaceView = ({
  t,
  user,
  greeting,
  currentTime,
  timeline,
  inboxTasks,
  onTaskSubmit,
  onTransition,
  onMoveToInbox,
  onDeleteTask,
  onMoveAllToTimeline,
  onOpenRetrospective,
  transitionBlock,
  setTransitionBlock,
}: WorkspaceViewProps) => {
  const [hoverTaskId, setHoverTaskId] = useState<number | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);
  const [moveAllConfirm, setMoveAllConfirm] = useState(false);
  const [reviewMemo, setReviewMemo] = useState("");
  const [customDelay, setCustomDelay] = useState<number>(15);
  const [agoMinutes, setAgoMinutes] = useState<number>(5);

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
    taskForm.reset();
  };

  const handleTransition = async (action: string, extraMinutes?: number) => {
    if (!transitionBlock) return;
    await onTransition(transitionBlock, action, extraMinutes, reviewMemo);
    setReviewMemo("");
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="px-8 py-6 flex flex-col space-y-4 shrink-0 bg-background/80 backdrop-blur-md z-10">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-3 text-2xl font-black font-mono tracking-tighter">
              <Clock size={20} className="text-text-primary" />
              <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
            </div>
            <p className="text-text-secondary font-bold text-sm tracking-tight">{greeting}</p>
          </div>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button 
                    onClick={onOpenRetrospective}
                    disabled={!user?.geminiApiKey}
                    className="bg-surface-elevated hover:bg-border text-text-primary font-black rounded-xl gap-2 h-11 border border-border shadow-xl shadow-black/40 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles size={18} className="text-warning" />
                    {t.main.retrospective_btn}
                  </Button>
                </div>
              </TooltipTrigger>
              {!user?.geminiApiKey && (
                <TooltipContent className="bg-surface-elevated border-border text-text-secondary font-bold text-xs p-3 rounded-xl shadow-2xl">
                  <p>설정에서 GOOGLE AI STUDIO API KEY를 입력해주세요.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {/* Task Input Form */}
        <div className="p-2 bg-surface border border-border rounded-2xl shadow-2xl">
          <form onSubmit={taskForm.handleSubmit(handleTaskSubmit)} className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2 px-2 pt-2">
              <Input 
                {...taskForm.register("title")}
                placeholder={t.main.task_placeholder} 
                className="flex-1 bg-transparent border-none text-lg font-bold placeholder:text-text-muted focus-visible:ring-0 focus-visible:ring-offset-0 px-2 h-12"
              />
              <div className="flex items-center bg-background border border-border rounded-xl h-10 px-3 space-x-2">
                <Input 
                  type="number" 
                  {...taskForm.register("hours", { valueAsNumber: true })}
                  className="w-8 bg-transparent border-none text-center font-black p-0 focus-visible:ring-0"
                />
                <span className="text-[10px] font-black text-text-muted uppercase">{t.main.hours}</span>
                <Separator orientation="vertical" className="h-4 bg-border" />
                <Input 
                  type="number" 
                  {...taskForm.register("minutes", { valueAsNumber: true })}
                  className="w-8 bg-transparent border-none text-center font-black p-0 focus-visible:ring-0"
                />
                <span className="text-[10px] font-black text-text-muted uppercase">{t.main.mins}</span>
              </div>
              
              <label className="flex items-center space-x-2 bg-background border border-border rounded-xl h-10 px-4 cursor-pointer hover:bg-surface-elevated transition-colors">
                <input type="checkbox" {...taskForm.register("isUrgent")} className="hidden" />
                <Zap size={14} className={taskForm.watch("isUrgent") ? "text-danger fill-danger" : "text-text-muted"} />
                <span className={`text-[10px] font-black uppercase ${taskForm.watch("isUrgent") ? "text-danger" : "text-text-muted"}`}>{t.main.urgent}</span>
              </label>

              <Button type="submit" className="h-10 px-6 bg-text-primary text-background hover:bg-zinc-200 font-black rounded-xl">
                <Send size={16} className="mr-2" />
                {t.main.add_task}
              </Button>
            </div>
            
            <div className="px-4 pb-2">
              <textarea 
                {...taskForm.register("planningMemo")}
                placeholder={t.main.planning_placeholder}
                className="w-full bg-transparent text-xs font-bold text-text-secondary placeholder:text-text-muted resize-none h-12 focus:outline-none focus:ring-0 py-2"
              />
            </div>
          </form>
        </div>
      </header>

      {/* Timeline */}
      <ScrollArea className="flex-1 px-8">
        <div className="py-8 space-y-4">
          {timeline.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-text-muted space-y-4 border-2 border-dashed border-border rounded-3xl group relative overflow-hidden">
              <Clock size={48} className="opacity-20 transition-transform group-hover:scale-110 duration-500" />
              <div className="text-center space-y-2">
                <p className="font-black text-sm uppercase tracking-widest opacity-50">{t.main.empty_timeline}</p>
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
            <DroppableArea id="timeline" className="space-y-6 relative pl-16 border-l border-border ml-4 py-4 min-h-[200px]">
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
            <DialogTitle className="text-xl font-black tracking-tighter text-text-primary flex items-center gap-3">
              <AlertCircle className="text-danger" size={20} />
              {t.main.delete_confirm.title}
            </DialogTitle>
            <DialogDescription className="text-text-secondary font-bold text-sm">
              {t.main.delete_confirm.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex gap-3">
            <Button 
              variant="ghost" 
              onClick={() => setDeleteTaskId(null)}
              className="flex-1 bg-surface text-text-secondary hover:bg-border hover:text-text-primary font-black rounded-xl"
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
              className="flex-1 bg-danger text-text-primary hover:bg-danger/80 font-black rounded-xl"
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
            <DialogTitle className="text-xl font-black tracking-tighter text-text-primary flex items-center gap-3">
              <Send className="text-accent" size={20} />
              {t.main.move_all.title}
            </DialogTitle>
            <DialogDescription className="text-text-secondary font-bold text-sm">
              {t.main.move_all.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex gap-3">
            <Button 
              variant="ghost" 
              onClick={() => setMoveAllConfirm(false)}
              className="flex-1 bg-surface text-text-secondary hover:bg-border hover:text-text-primary font-black rounded-xl"
            >
              {t.main.move_all.cancel}
            </Button>
            <Button 
              onClick={async () => {
                await onMoveAllToTimeline();
                setMoveAllConfirm(false);
              }}
              className="flex-1 bg-accent text-text-primary hover:bg-accent/80 font-black rounded-xl"
            >
              {t.main.move_all.btn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transition Modal */}
      <Dialog open={!!transitionBlock} onOpenChange={(open) => !open && setTransitionBlock(null)}>
        <DialogContent className="sm:max-w-[500px] bg-surface-elevated border-border text-text-primary shadow-2xl rounded-3xl p-8 antialiased [&>button]:hidden">
          <DialogHeader className="space-y-4">
            <DialogTitle className="text-2xl font-black tracking-tighter text-text-primary leading-none flex items-center gap-3">
              <Sparkles className="text-warning" size={24} />
              {t.main.transition.title}
            </DialogTitle>
            <DialogDescription className="text-text-secondary font-bold text-sm leading-relaxed">
              {t.main.transition.description}
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-6">
            <div className="p-4 bg-background border border-border rounded-2xl flex items-center justify-between">
              <span className="text-xs font-black text-text-muted uppercase tracking-widest">Current Task</span>
              <span className="font-bold text-sm">{transitionBlock?.title}</span>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-black text-text-muted uppercase tracking-widest">{t.main.transition.review_placeholder}</Label>
              <textarea 
                value={reviewMemo}
                onChange={(e) => setReviewMemo(e.target.value)}
                placeholder={t.main.transition.review_placeholder}
                className="w-full min-h-[80px] bg-background border-border rounded-2xl p-4 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-white/10 placeholder:text-text-muted font-bold"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Button 
                  onClick={() => handleTransition("COMPLETE_ON_TIME")}
                  variant="outline"
                  className="flex-1 border-border bg-background hover:bg-border text-text-secondary font-black h-12 rounded-xl text-xs active:scale-95 whitespace-normal"
                >
                  {t.main.transition.complete_target}
                </Button>
                <Button 
                  onClick={() => handleTransition("COMPLETE_NOW")}
                  className="flex-1 bg-text-primary text-background hover:bg-zinc-200 font-black h-12 rounded-xl text-xs shadow-xl active:scale-95 whitespace-normal"
                >
                  {t.main.transition.complete_now}
                </Button>
              </div>

              <div className="flex items-center space-x-3 bg-background border border-border rounded-xl px-4 h-12">
                 <Input 
                    type="number" 
                    value={agoMinutes} 
                    onChange={(e) => setAgoMinutes(parseInt(e.target.value) || 0)}
                    className="w-10 bg-transparent border-none text-center font-black focus-visible:ring-0 p-0"
                  />
                  <span className="text-[10px] font-black text-text-muted uppercase flex-1">{t.main.transition.complete_ago}</span>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleTransition("COMPLETE_AGO", agoMinutes)}
                    className="text-text-primary hover:text-text-primary font-black hover:bg-border h-8 rounded-lg"
                  >
                    <Send size={16} />
                  </Button>
              </div>
              
              <Separator className="bg-border" />

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-1 flex items-center bg-background border border-border rounded-xl px-3">
                  <Input 
                    type="number" 
                    value={customDelay} 
                    onChange={(e) => setCustomDelay(parseInt(e.target.value) || 0)}
                    className="w-full bg-transparent border-none text-center font-black focus-visible:ring-0 p-0 h-10"
                  />
                  <span className="text-[10px] font-black text-text-muted uppercase ml-1">min</span>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => handleTransition("DELAY", customDelay)}
                  className="col-span-1 border-border bg-background hover:bg-border text-text-secondary font-black h-10 rounded-xl active:scale-95 text-xs"
                >
                  {t.main.transition.delay}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
