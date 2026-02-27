import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Settings, Search, X, AlertCircle, Sparkles, Send, Clock, Zap, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { translations, getLang } from "@/lib/i18n";

// --- Types ---
interface TimeBlock {
  id: number;
  task_id: number | null;
  workspace_id: number;
  title: string;
  start_time: string;
  end_time: string;
  status: "DONE" | "NOW" | "WILL" | "UNPLUGGED" | "PENDING";
  review_memo: string | null;
}

// --- Time Helper ---
const isStartTimeBeforeEnd = (start?: string, end?: string) => {
  if (!start || !end || start === "" || end === "") return true;
  return start < end;
};

const formatDisplayTime = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

const SortableItem = ({ block, idx, timeline, currentTime, t, onTransition, hoverTaskId, setHoverTaskId }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, disabled: block.status === "UNPLUGGED" });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : (hoverTaskId === block.task_id ? 10 : 1),
    opacity: isDragging ? 0.6 : 1,
  };

  const isSplitWithNext = block.task_id && timeline[idx + 1]?.task_id === block.task_id;
  const isSplitWithPrev = block.task_id && timeline[idx - 1]?.task_id === block.task_id;
  const isPending = block.status === "PENDING";
  const isHovered = block.task_id && hoverTaskId === block.task_id;

  // 심슨 머리 스타일의 톱니 모양 clip-path (더 촘촘하게)
  const zigzagBottom = "polygon(0% 0%, 100% 0%, 100% 92%, 98% 100%, 96% 92%, 94% 100%, 92% 92%, 90% 100%, 88% 92%, 86% 100%, 84% 92%, 82% 100%, 80% 92%, 78% 100%, 76% 92%, 74% 100%, 72% 92%, 70% 100%, 68% 92%, 66% 100%, 64% 92%, 62% 100%, 60% 92%, 58% 100%, 56% 92%, 54% 100%, 52% 92%, 50% 100%, 48% 92%, 46% 100%, 44% 92%, 42% 100%, 40% 92%, 38% 100%, 36% 92%, 34% 100%, 32% 92%, 30% 100%, 28% 92%, 26% 100%, 24% 92%, 22% 100%, 20% 92%, 18% 100%, 16% 92%, 14% 100%, 12% 92%, 10% 100%, 8% 92%, 6% 100%, 4% 92%, 2% 100%, 0% 92%)";
  const zigzagTop = "polygon(0% 8%, 2% 0%, 4% 8%, 6% 0%, 8% 8%, 10% 0%, 12% 8%, 14% 0%, 16% 8%, 18% 0%, 20% 8%, 22% 0%, 24% 8%, 26% 0%, 28% 8%, 30% 0%, 32% 8%, 34% 0%, 36% 8%, 38% 0%, 40% 8%, 42% 0%, 44% 8%, 46% 0%, 48% 8%, 50% 0%, 52% 8%, 54% 0%, 56% 8%, 58% 0%, 60% 8%, 62% 0%, 64% 8%, 66% 0%, 68% 8%, 70% 0%, 72% 8%, 74% 0%, 76% 8%, 78% 0%, 80% 8%, 82% 0%, 84% 8%, 86% 0%, 88% 8%, 90% 0%, 92% 8%, 94% 0%, 96% 8%, 98% 0%, 100% 8%, 100% 100%, 0% 100%)";
  const zigzagBoth = "polygon(0% 8%, 2% 0%, 4% 8%, 6% 0%, 8% 8%, 10% 0%, 12% 8%, 14% 0%, 16% 8%, 18% 0%, 20% 8%, 22% 0%, 24% 8%, 26% 0%, 28% 8%, 30% 0%, 32% 8%, 34% 0%, 36% 8%, 38% 0%, 40% 8%, 42% 0%, 44% 8%, 46% 0%, 48% 8%, 50% 0%, 52% 8%, 54% 0%, 56% 8%, 58% 0%, 60% 8%, 62% 0%, 64% 8%, 66% 0%, 68% 8%, 70% 0%, 72% 8%, 74% 0%, 76% 8%, 78% 0%, 80% 8%, 82% 0%, 84% 8%, 86% 0%, 88% 8%, 90% 0%, 92% 8%, 94% 0%, 96% 8%, 98% 0%, 100% 8%, 100% 92%, 98% 100%, 96% 92%, 94% 100%, 92% 92%, 90% 100%, 88% 92%, 86% 100%, 84% 92%, 82% 100%, 80% 92%, 78% 100%, 76% 92%, 74% 100%, 72% 92%, 70% 100%, 68% 92%, 66% 100%, 64% 92%, 62% 100%, 60% 92%, 58% 100%, 56% 92%, 54% 100%, 52% 92%, 50% 100%, 48% 92%, 46% 100%, 44% 92%, 42% 100%, 40% 92%, 38% 100%, 36% 92%, 34% 100%, 32% 92%, 30% 100%, 28% 92%, 26% 100%, 24% 92%, 22% 100%, 20% 92%, 18% 100%, 16% 92%, 14% 100%, 12% 92%, 10% 100%, 8% 92%, 6% 100%, 4% 92%, 2% 100%, 0% 92%)";

  return (
    <div ref={setNodeRef} style={style} className="relative group/item">
      {/* Time Indicator */}
      <div className="absolute -left-[6.5rem] top-0 w-16 text-right space-y-1">
        <p className="text-[10px] font-black font-mono text-zinc-500">{formatDisplayTime(block.start_time)}</p>
        <p className="text-[10px] font-bold font-mono text-zinc-700 opacity-0 group-hover/item:opacity-100 transition-opacity">{formatDisplayTime(block.end_time)}</p>
      </div>
      
      {/* Dot on Line */}
      <div className={`absolute -left-[3.4rem] top-1 w-3 h-3 rounded-full border-2 bg-[#09090b] z-10 transition-colors ${
        block.status === "DONE" ? "border-green-500 bg-green-500/20" :
        block.status === "NOW" ? "border-red-500 scale-125 shadow-[0_0_10px_rgba(239,68,68,0.5)]" :
        block.status === "PENDING" ? "border-orange-500 bg-orange-500/20" :
        block.status === "UNPLUGGED" ? "border-zinc-700 bg-zinc-800" : "border-zinc-600"
      }`} />

      {/* Connection Line (Right Side) for Split Tasks */}
      {isSplitWithNext && (
        <div className={`absolute right-[-10px] top-8 bottom-[-24px] w-[3px] rounded-full z-0 transition-colors duration-300 ${isHovered ? "bg-white/40 shadow-[0_0_10px_rgba(255,255,255,0.2)]" : "bg-zinc-800"}`} />
      )}

      {/* Block Card */}
      <div 
        {...attributes}
        {...listeners}
        onMouseEnter={() => block.task_id && setHoverTaskId(block.task_id)}
        onMouseLeave={() => setHoverTaskId(null)}
        className={`p-5 rounded-2xl border transition-all duration-300 transform ${
        block.status === "DONE" ? "bg-green-500/5 border-green-500/20" :
        block.status === "NOW" ? (new Date(block.end_time) < currentTime ? "bg-red-500/10 border-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.2)]" : "bg-red-500/5 border-red-500/50 shadow-lg") :
        block.status === "PENDING" ? "bg-orange-500/5 border-orange-500/40 border-dashed" :
        block.status === "UNPLUGGED" ? "bg-zinc-900/40 border-[#27272a] opacity-60 border-dashed cursor-default" : "bg-[#18181b]/50 border-[#27272a] hover:bg-[#18181b]"
      } ${isHovered ? "border-white/40 bg-zinc-800/80 -translate-x-1 shadow-[0_0_30px_rgba(255,255,255,0.05)] scale-[1.02]" : ""} ${isSplitWithNext ? "rounded-b-none border-b-none pb-8 mb-0" : ""} ${isSplitWithPrev ? "rounded-t-none border-t-none mt-[-2px]" : ""}`}
        style={{
          clipPath: isSplitWithNext && !isSplitWithPrev 
            ? zigzagBottom
            : isSplitWithPrev && !isSplitWithNext
            ? zigzagTop
            : isSplitWithNext && isSplitWithPrev
            ? zigzagBoth
            : undefined
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <GripVertical size={14} className={`transition-opacity duration-300 ${isHovered || isDragging ? "text-white opacity-100" : "text-zinc-700 opacity-20"}`} />
            <div className="space-y-1">
                <h4 className={`font-black text-sm tracking-tight transition-colors duration-300 ${block.status === "UNPLUGGED" ? "text-zinc-500" : (isHovered ? "text-white" : "text-zinc-200")}`}>{block.title}</h4>
                <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{block.status}</span>
                    {block.status === "NOW" && new Date(block.end_time) < currentTime && (
                        <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                            {t.main.status.overdue}
                        </span>
                    )}
                    {isPending && (
                        <span className="bg-orange-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                            INTERRUPTED
                        </span>
                    )}
                </div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              onTransition(block);
            }}
            className={`h-9 w-9 p-0 rounded-xl transition-all duration-300 ${isHovered ? "bg-white text-black hover:bg-zinc-200" : "bg-zinc-800 text-zinc-500 hover:text-white"}`}
          >
            <AlertCircle size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [view, setView] = useState<"loading" | "onboarding" | "workspace_setup" | "main">("loading");
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [greeting, setGreeting] = useState<string>("");
  const [timeline, setTimeline] = useState<TimeBlock[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [transitionBlock, setTransitionBlock] = useState<TimeBlock | null>(null);
  const [reviewMemo, setReviewMemo] = useState("");
  const [customDelay, setCustomDelay] = useState<number>(15);
  const [agoMinutes, setAgoMinutes] = useState<number>(5);
  const [hoverTaskId, setHoverTaskId] = useState<number | null>(null);

  const lang = useMemo(() => getLang(), []);
  const t = translations[lang];

  // --- Validation Schemas ---
  const userSchema = z.object({
    nickname: z.string().min(1, t.onboarding.nickname_required).max(20),
    gemini_api_key: z.string().optional(),
  });

  const workspaceSchema = z.object({
    name: z.string().min(1, t.workspace_setup.name_required),
    core_time_start: z.string().optional(),
    core_time_end: z.string().optional(),
    role_intro: z.string().optional(),
    unplugged_times: z.array(z.object({
      label: z.string().min(1, t.workspace_setup.label_required),
      start_time: z.string().min(1, "Required"),
      end_time: z.string().min(1, "Required"),
    })).superRefine((items, ctx) => {
      items.forEach((item, index) => {
        if (!isStartTimeBeforeEnd(item.start_time, item.end_time)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t.workspace_setup.core_time_error,
            path: [index, "end_time"],
          });
        }
      });
    }),
  }).refine((data) => isStartTimeBeforeEnd(data.core_time_start || undefined, data.core_time_end || undefined), {
    message: t.workspace_setup.core_time_error,
    path: ["core_time_end"],
  });

  const taskSchema = z.object({
    title: z.string().min(1, "Task title is required"),
    hours: z.number().min(0).max(23),
    minutes: z.number().min(0).max(59),
    planning_memo: z.string().optional(),
    is_urgent: z.boolean(),
  }).refine((data) => data.hours > 0 || data.minutes > 0, {
    message: "Duration must be at least 1 minute",
    path: ["minutes"],
  });

  type UserFormValues = z.infer<typeof userSchema>;
  type WorkspaceFormValues = z.infer<typeof workspaceSchema>;
  type TaskFormValues = z.infer<typeof taskSchema>;

  // --- Forms ---
  const userForm = useForm<UserFormValues>({ 
    resolver: zodResolver(userSchema),
    defaultValues: { nickname: "", gemini_api_key: "" }
  });

  const workspaceForm = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { 
      name: "", 
      core_time_start: "", 
      core_time_end: "", 
      role_intro: "",
      unplugged_times: [] 
    }
  });

  const taskForm = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: "", hours: 0, minutes: 30, planning_memo: "", is_urgent: false }
  });

  const { fields, append, remove } = useFieldArray({
    control: workspaceForm.control,
    name: "unplugged_times",
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeWorkspaceId && view === "main") {
      fetchMainData();
    }
  }, [activeWorkspaceId, view]);

  const init = async () => {
    try {
      const userExists = await invoke<boolean>("check_user_exists");
      if (!userExists) {
        setView("onboarding");
        return;
      }
      const wsList = await invoke<any[]>("get_workspaces");
      setWorkspaces(wsList);

      if (wsList.length === 0) {
        setView("workspace_setup");
      } else {
        setActiveWorkspaceId(wsList[0].id);
        setView("main");
      }
    } catch (error) {
      console.error("Init failed:", error);
    }
  };

  const fetchMainData = async () => {
    if (!activeWorkspaceId) return;
    try {
      const g = await invoke<string>("get_greeting", { workspaceId: activeWorkspaceId, lang });
      setGreeting(g);
      const list = await invoke<TimeBlock[]>("get_timeline", { workspaceId: activeWorkspaceId });
      
      const now = new Date();
      const active = list.find(b => b.status === "NOW");
      if (active && new Date(active.end_time) < now && !transitionBlock) {
        setTransitionBlock(active);
      }

      if (!active) {
        const next = list.find(b => b.status === "WILL" && new Date(b.start_time) <= now);
        if (next) {
          await invoke("update_block_status", { blockId: next.id, status: "NOW" });
          const updatedList = await invoke<TimeBlock[]>("get_timeline", { workspaceId: activeWorkspaceId });
          setTimeline(updatedList);
          return;
        }
      }

      setTimeline(list);
    } catch (error) {
      console.error("Fetch failed:", error);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = timeline.findIndex((item) => item.id === active.id);
      const newIndex = timeline.findIndex((item) => item.id === over.id);
      
      const newTimeline = arrayMove(timeline, oldIndex, newIndex);
      setTimeline(newTimeline);

      const ids = newTimeline.filter(b => b.status !== "UNPLUGGED").map(b => b.id);
      if (activeWorkspaceId) {
        await invoke("reorder_blocks", { workspaceId: activeWorkspaceId, blockIds: ids });
        fetchMainData();
      }
    }
  };

  const onUserSubmit = async (data: UserFormValues) => {
    await invoke("save_user", { nickname: data.nickname, gemini_api_key: data.gemini_api_key || null });
    setView("workspace_setup");
  };

  const onWorkspaceSubmit = async (data: WorkspaceFormValues) => {
    try {
      const sanitizedData = {
        ...data,
        core_time_start: data.core_time_start || null,
        core_time_end: data.core_time_end || null,
        role_intro: data.role_intro || null,
      };
      const id = await invoke<number>("create_workspace", { input: sanitizedData });
      const wsList = await invoke<any[]>("get_workspaces");
      setWorkspaces(wsList);
      setActiveWorkspaceId(id);
      workspaceForm.reset();
      setView("main");
    } catch (error) {
      console.error("Workspace creation failed:", error);
    }
  };

  const onTaskSubmit = async (data: TaskFormValues) => {
    if (!activeWorkspaceId) return;
    try {
      await invoke("add_task", { 
        input: {
          workspace_id: activeWorkspaceId,
          ...data,
          planning_memo: data.planning_memo || null
        } 
      });
      taskForm.reset({ title: "", hours: 0, minutes: 30, planning_memo: "", is_urgent: false });
      fetchMainData();
    } catch (error) {
      console.error("Task add failed:", error);
    }
  };

  const handleTransition = async (action: string, extraMinutes?: number) => {
    if (!transitionBlock) return;
    try {
      await invoke("process_task_transition", {
        input: {
          block_id: transitionBlock.id,
          action,
          extra_minutes: extraMinutes || null,
          review_memo: reviewMemo || null
        }
      });
      setTransitionBlock(null);
      setReviewMemo("");
      fetchMainData();
    } catch (error) {
      console.error("Transition failed:", error);
    }
  };

  if (view === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-white antialiased font-bold">
        <p className="animate-pulse">{t.checking}</p>
      </div>
    );
  }

  const isFirstWorkspace = workspaces.length === 0;

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex overflow-hidden font-sans antialiased select-none">
      
      {/* 1차 사이드바 */}
      {view === "main" && (
        <aside className="w-16 border-r border-[#27272a] bg-[#09090b] flex flex-col items-center py-4 space-y-4 shrink-0 shadow-2xl z-20">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => setActiveWorkspaceId(ws.id)}
              className={`w-11 h-11 rounded-xl flex items-center justify-center text-xs font-black transition-all duration-300 transform ${
                activeWorkspaceId === ws.id 
                ? "bg-white text-black scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]" 
                : "bg-[#18181b] text-zinc-500 hover:bg-[#27272a] hover:text-white"
              }`}
            >
              {ws.name.substring(0, 2).toUpperCase()}
            </button>
          ))}
          <button 
            onClick={() => {
              workspaceForm.reset();
              setView("workspace_setup");
            }}
            className="w-11 h-11 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-500 transition-all duration-300"
          >
            <Plus size={22} />
          </button>
        </aside>
      )}

      {/* 2차 사이드바 */}
      {view === "main" && (
        <aside className="w-64 border-r border-[#27272a] bg-[#18181b] flex flex-col shrink-0 z-10">
          <div className="p-5 border-b border-[#27272a] flex items-center space-x-3 text-zinc-400 hover:text-white cursor-pointer transition-all active:scale-95">
            <Search size={18} />
            <span className="text-sm font-black tracking-tight">{t.sidebar.date_search}</span>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-8">
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">
                  {t.sidebar.inbox}
                </h3>
                <div className="p-8 border-2 border-dashed border-[#27272a] bg-[#09090b]/40 rounded-2xl text-center">
                  <p className="text-[11px] text-zinc-600 font-bold italic">{t.sidebar.no_tasks}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 border-t border-[#27272a]">
            <Button variant="ghost" className="w-full justify-start text-zinc-400 hover:text-white hover:bg-[#27272a] space-x-4 h-12 px-4 rounded-xl transition-all">
              <Settings size={20} />
              <span className="font-bold text-sm">{t.sidebar.settings}</span>
            </Button>
          </div>
        </aside>
      )}

      {/* 메인 영역 */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#09090b] antialiased">
        {view === "main" ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <header className="px-8 py-6 flex flex-col space-y-4 shrink-0 bg-[#09090b]/80 backdrop-blur-md z-10">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-3 text-2xl font-black font-mono tracking-tighter">
                    <Clock size={20} className="text-white" />
                    <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
                  </div>
                  <p className="text-zinc-500 font-bold text-sm tracking-tight">{greeting}</p>
                </div>
                <Button className="bg-zinc-800 hover:bg-zinc-700 text-white font-black rounded-xl gap-2 h-11 border border-zinc-700 shadow-xl shadow-black/40 px-6">
                  <Sparkles size={18} className="text-yellow-400" />
                  {t.main.retrospective_btn}
                </Button>
              </div>

              {/* Task Input Form */}
              <div className="p-2 bg-[#18181b] border border-[#27272a] rounded-2xl shadow-2xl">
                <form onSubmit={taskForm.handleSubmit(onTaskSubmit)} className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2 px-2 pt-2">
                    <Input 
                      {...taskForm.register("title")}
                      placeholder={t.main.task_placeholder} 
                      className="flex-1 bg-transparent border-none text-lg font-bold placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0 px-2 h-12"
                    />
                    <div className="flex items-center bg-[#09090b] border border-[#27272a] rounded-xl h-10 px-3 space-x-2">
                      <Input 
                        type="number" 
                        {...taskForm.register("hours", { valueAsNumber: true })}
                        className="w-8 bg-transparent border-none text-center font-black p-0 focus-visible:ring-0"
                      />
                      <span className="text-[10px] font-black text-zinc-500 uppercase">{t.main.hours}</span>
                      <Separator orientation="vertical" className="h-4 bg-zinc-700" />
                      <Input 
                        type="number" 
                        {...taskForm.register("minutes", { valueAsNumber: true })}
                        className="w-8 bg-transparent border-none text-center font-black p-0 focus-visible:ring-0"
                      />
                      <span className="text-[10px] font-black text-zinc-500 uppercase">{t.main.mins}</span>
                    </div>
                    
                    <label className="flex items-center space-x-2 bg-[#09090b] border border-[#27272a] rounded-xl h-10 px-4 cursor-pointer hover:bg-zinc-900 transition-colors">
                      <input type="checkbox" {...taskForm.register("is_urgent")} className="hidden" />
                      <Zap size={14} className={taskForm.watch("is_urgent") ? "text-red-500 fill-red-500" : "text-zinc-500"} />
                      <span className={`text-[10px] font-black uppercase ${taskForm.watch("is_urgent") ? "text-red-500" : "text-zinc-500"}`}>{t.main.urgent}</span>
                    </label>

                    <Button type="submit" className="h-10 px-6 bg-white text-black hover:bg-zinc-200 font-black rounded-xl">
                      <Send size={16} className="mr-2" />
                      {t.main.add_task}
                    </Button>
                  </div>
                  
                  <div className="px-4 pb-2">
                    <textarea 
                      {...taskForm.register("planning_memo")}
                      placeholder={t.main.planning_placeholder}
                      className="w-full bg-transparent text-xs font-bold text-zinc-400 placeholder:text-zinc-600 resize-none h-12 focus:outline-none focus:ring-0 py-2"
                    />
                  </div>
                </form>
              </div>
            </header>

            {/* Timeline */}
            <ScrollArea className="flex-1 px-8">
              <div className="py-8 space-y-4">
                {timeline.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-zinc-700 space-y-4 border-2 border-dashed border-zinc-800 rounded-3xl">
                    <Clock size={48} className="opacity-20" />
                    <p className="font-black text-sm uppercase tracking-widest opacity-50">{t.main.empty_timeline}</p>
                  </div>
                ) : (
                  <div className="space-y-6 relative pl-16 border-l border-zinc-800 ml-4 py-4">
                    <DndContext 
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext 
                        items={timeline.map(b => b.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {timeline.map((block, idx) => (
                          <SortableItem 
                            key={block.id === -1 ? `unplugged-${idx}` : block.id} 
                            block={block} 
                            idx={idx} 
                            timeline={timeline}
                            currentTime={currentTime}
                            t={t}
                            onTransition={setTransitionBlock}
                            hoverTaskId={hoverTaskId}
                            setHoverTaskId={setHoverTaskId}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Transition Modal */}
            <Dialog open={!!transitionBlock} onOpenChange={(open) => !open && setTransitionBlock(null)}>
              <DialogContent className="sm:max-w-[500px] bg-[#18181b] border-[#27272a] text-white shadow-2xl rounded-3xl p-8 antialiased [&>button]:hidden">
                <DialogHeader className="space-y-4">
                  <DialogTitle className="text-2xl font-black tracking-tighter text-white leading-none flex items-center gap-3">
                    <Sparkles className="text-yellow-400" size={24} />
                    {t.main.transition.title}
                  </DialogTitle>
                  <DialogDescription className="text-zinc-400 font-bold text-sm leading-relaxed">
                    {t.main.transition.description}
                  </DialogDescription>
                </DialogHeader>

                <div className="py-6 space-y-6">
                  <div className="p-4 bg-[#09090b] border border-[#27272a] rounded-2xl flex items-center justify-between">
                    <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Current Task</span>
                    <span className="font-bold text-sm">{transitionBlock?.title}</span>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xs font-black text-zinc-400 uppercase tracking-widest">{t.main.transition.review_placeholder}</Label>
                    <textarea 
                      value={reviewMemo}
                      onChange={(e) => setReviewMemo(e.target.value)}
                      placeholder={t.main.transition.review_placeholder}
                      className="w-full min-h-[80px] bg-[#09090b] border-[#27272a] rounded-2xl p-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/10 placeholder:text-zinc-700 font-bold"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Button 
                        onClick={() => handleTransition("COMPLETE_ON_TIME")}
                        variant="outline"
                        className="flex-1 border-[#27272a] bg-zinc-900/50 hover:bg-[#27272a] text-zinc-300 font-black h-12 rounded-xl text-xs active:scale-95 whitespace-normal"
                      >
                        {t.main.transition.complete_target}
                      </Button>
                      <Button 
                        onClick={() => handleTransition("COMPLETE_NOW")}
                        className="flex-1 bg-white text-black hover:bg-zinc-200 font-black h-12 rounded-xl text-xs shadow-xl active:scale-95 whitespace-normal"
                      >
                        {t.main.transition.complete_now}
                      </Button>
                    </div>

                    <div className="flex items-center space-x-3 bg-[#09090b] border border-[#27272a] rounded-xl px-4 h-12">
                       <Input 
                          type="number" 
                          value={agoMinutes} 
                          onChange={(e) => setAgoMinutes(parseInt(e.target.value) || 0)}
                          className="w-10 bg-transparent border-none text-center font-black focus-visible:ring-0 p-0"
                        />
                        <span className="text-[10px] font-black text-zinc-500 uppercase flex-1">{t.main.transition.complete_ago}</span>
                        <Button 
                          variant="ghost" 
                          onClick={() => handleTransition("COMPLETE_AGO", agoMinutes)}
                          className="text-white hover:text-white font-black hover:bg-zinc-800 h-8 rounded-lg"
                        >
                          <Send size={16} />
                        </Button>
                    </div>
                    
                    <Separator className="bg-[#27272a]" />

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-1 flex items-center bg-[#09090b] border border-[#27272a] rounded-xl px-3">
                        <Input 
                          type="number" 
                          value={customDelay} 
                          onChange={(e) => setCustomDelay(parseInt(e.target.value) || 0)}
                          className="w-full bg-transparent border-none text-center font-black focus-visible:ring-0 p-0 h-10"
                        />
                        <span className="text-[10px] font-black text-zinc-500 uppercase ml-1">min</span>
                      </div>
                      <Button 
                        variant="outline"
                        onClick={() => handleTransition("DELAY", customDelay)}
                        className="col-span-1 border-[#27272a] bg-zinc-900/50 hover:bg-[#27272a] text-zinc-300 font-black h-10 rounded-xl active:scale-95 text-xs"
                      >
                        {t.main.transition.delay}
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            {/* Onboarding Dialog */}
            <Dialog open={view === "onboarding"}>
              <DialogContent className="sm:max-w-[425px] bg-[#18181b] border-[#27272a] text-white shadow-2xl [&>button]:hidden rounded-2xl p-8 border-t-zinc-700/50 antialiased">
                <DialogHeader className="space-y-3">
                  <DialogTitle className="text-2xl font-black tracking-tighter text-white leading-none">{t.onboarding.title}</DialogTitle>
                  <DialogDescription className="text-zinc-400 font-bold text-sm leading-relaxed">{t.onboarding.description}</DialogDescription>
                </DialogHeader>
                <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-8 mt-6">
                  <div className="space-y-3">
                    <Label className="text-xs font-black text-zinc-400 uppercase tracking-widest">{t.onboarding.nickname_label}</Label>
                    <Input {...userForm.register("nickname")} placeholder={t.onboarding.nickname_placeholder} className="bg-[#09090b] border-[#27272a] text-white h-12 rounded-xl px-4 font-bold focus:ring-1 focus:ring-white/10" />
                    {userForm.formState.errors.nickname && (
                      <p className="text-[11px] text-red-400 font-bold flex items-center gap-1"><AlertCircle size={12}/> {userForm.formState.errors.nickname.message}</p>
                    )}
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs font-black text-zinc-400 uppercase tracking-widest">{t.onboarding.api_key_label}</Label>
                    <Input type="password" {...userForm.register("gemini_api_key")} placeholder={t.onboarding.api_key_placeholder} className="bg-[#09090b] border-[#27272a] text-white h-12 rounded-xl px-4 font-bold focus:ring-1 focus:ring-white/10" />
                    <p className="text-[10px] text-zinc-500 font-bold leading-relaxed">{t.onboarding.api_key_guide}</p>
                  </div>
                  <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200 font-black h-14 rounded-xl text-lg transition-all shadow-xl shadow-black/20 active:scale-95">
                    {t.onboarding.submit_btn}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            {/* Workspace Setup Dialog */}
            <Dialog 
              open={view === "workspace_setup"} 
              onOpenChange={(open) => {
                if (!open && !isFirstWorkspace) {
                  setView("main");
                }
              }}
            >
              <DialogContent className={`sm:max-w-[550px] h-[85vh] bg-[#18181b] border-[#27272a] text-white shadow-2xl flex flex-col rounded-2xl p-0 border-t-zinc-700/50 overflow-hidden antialiased ${isFirstWorkspace ? "[&>button]:hidden" : ""}`}>
                <DialogHeader className="p-8 pb-4 shrink-0 space-y-3">
                  <DialogTitle className="text-2xl font-black tracking-tighter text-white leading-none">
                    {isFirstWorkspace ? t.workspace_setup.title_first : t.workspace_setup.title_new}
                  </DialogTitle>
                  <DialogDescription className="text-zinc-400 font-bold text-sm">{t.workspace_setup.description}</DialogDescription>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto px-8 scrollbar-hide">
                  <form id="ws-form" onSubmit={workspaceForm.handleSubmit(onWorkspaceSubmit)} className="space-y-10 py-6">
                    <div className="space-y-3">
                      <Label className="text-xs font-black text-zinc-400 uppercase tracking-widest">{t.workspace_setup.name_label}</Label>
                      <Input {...workspaceForm.register("name")} placeholder={t.workspace_setup.name_placeholder} className="bg-[#09090b] border-[#27272a] text-white h-12 rounded-xl px-4 font-bold" />
                      {workspaceForm.formState.errors.name && (
                        <p className="text-[11px] text-red-400 font-bold flex items-center gap-1"><AlertCircle size={12}/> {workspaceForm.formState.errors.name.message}</p>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <Label className="text-xs font-black text-zinc-400 uppercase tracking-widest">{t.workspace_setup.core_time}</Label>
                          <p className="text-[10px] text-zinc-500 font-bold italic">{t.workspace_setup.core_time_guide}</p>
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => {
                            e.preventDefault();
                            workspaceForm.setValue("core_time_start", "");
                            workspaceForm.setValue("core_time_end", "");
                          }} 
                          className="h-8 text-[10px] font-black text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all rounded-lg uppercase tracking-wider"
                        >
                          {t.workspace_setup.core_time_reset}
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <Input type="time" {...workspaceForm.register("core_time_start")} className="bg-[#09090b] border-[#27272a] text-white h-12 rounded-xl px-4 font-bold [color-scheme:dark]" />
                        <Input type="time" {...workspaceForm.register("core_time_end")} className="bg-[#09090b] border-[#27272a] text-white h-12 rounded-xl px-4 font-bold [color-scheme:dark]" />
                      </div>
                      {workspaceForm.formState.errors.core_time_end && (
                        <p className="text-[11px] text-red-400 font-bold flex items-center gap-1"><AlertCircle size={12}/> {workspaceForm.formState.errors.core_time_end.message}</p>
                      )}
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <Label className="text-xs font-black text-zinc-400 uppercase tracking-widest">{t.workspace_setup.unplugged_time}</Label>
                          <p className="text-[10px] text-zinc-500 font-bold italic">{t.workspace_setup.unplugged_guide}</p>
                        </div>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={(e) => {
                            e.preventDefault();
                            append({ label: "", start_time: "12:00", end_time: "13:00" });
                          }} 
                          className="border-[#27272a] bg-[#09090b] hover:bg-[#27272a] text-zinc-200 font-black rounded-lg h-9"
                        >
                          <Plus size={16} className="mr-2" /> {t.workspace_setup.add_unplugged}
                        </Button>
                      </div>
                      
                      <div className="space-y-4 pb-2">
                        {fields.map((field, index) => (
                          <div key={field.id} className="p-5 bg-[#09090b]/60 border border-[#27272a] rounded-2xl space-y-5 relative animate-in slide-in-from-top-4 duration-300">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-zinc-600 tracking-widest uppercase">Block #{index + 1}</span>
                              <button type="button" onClick={() => remove(index)} className="text-zinc-600 hover:text-red-400 transition-colors active:scale-75">
                                <X size={16} />
                              </button>
                            </div>
                            <div className="space-y-2">
                                <Input {...workspaceForm.register(`unplugged_times.${index}.label` as const)} placeholder={t.workspace_setup.unplugged_label_placeholder} className="bg-[#18181b] border-[#27272a] h-11 rounded-xl px-4 font-bold" />
                                {workspaceForm.formState.errors.unplugged_times?.[index]?.label && (
                                    <p className="text-[10px] text-red-400 font-bold pl-1">{workspaceForm.formState.errors.unplugged_times[index]?.label?.message}</p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <Input type="time" {...workspaceForm.register(`unplugged_times.${index}.start_time` as const)} className="bg-[#18181b] border-[#27272a] h-11 rounded-xl font-bold [color-scheme:dark]" />
                              <div className="space-y-1">
                                <Input type="time" {...workspaceForm.register(`unplugged_times.${index}.end_time` as const)} className="bg-[#18181b] border-[#27272a] h-11 rounded-xl font-bold [color-scheme:dark]" />
                                {workspaceForm.formState.errors.unplugged_times?.[index]?.end_time && (
                                    <p className="text-[10px] text-red-400 font-bold pl-1">{workspaceForm.formState.errors.unplugged_times[index]?.end_time?.message}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator className="bg-[#27272a]" />

                    <div className="space-y-3">
                      <Label className="text-xs font-black text-zinc-400 uppercase tracking-widest">{t.workspace_setup.role_intro}</Label>
                      <textarea 
                        {...workspaceForm.register("role_intro")}
                        placeholder={t.workspace_setup.role_placeholder}
                        className="w-full min-h-[140px] bg-[#09090b] border-[#27272a] rounded-2xl p-5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/10 placeholder:text-zinc-700 font-bold leading-relaxed shadow-inner"
                      />
                    </div>
                  </form>
                </div>

                <DialogFooter className="p-8 pt-4 pb-8 border-t border-[#27272a] bg-[#18181b] shrink-0">
                  <Button type="submit" form="ws-form" className="w-full bg-white text-black hover:bg-zinc-200 font-black h-12 rounded-xl text-md transition-all shadow-xl shadow-black/20 active:scale-95">
                    {t.workspace_setup.submit_btn}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
