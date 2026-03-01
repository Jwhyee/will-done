import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Settings, X, AlertCircle, Sparkles, Send, Clock, Zap, GripVertical, Calendar as CalendarIcon, Inbox, Pencil, AlertTriangle, ChevronLeft } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  defaultDropAnimationSideEffects,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";

const DroppableArea = ({ id, children, className }: { id: string, children: React.ReactNode, className?: string }) => {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? 'ring-2 ring-blue-500/50 rounded-xl' : ''}`}>
      {children}
    </div>
  );
};

import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { translations, getLang, type Lang } from "@/lib/i18n";
import { format } from "date-fns";

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
  is_urgent: boolean;
}

interface Task {
  id: number;
  workspace_id: number;
  title: string;
  planning_memo: string | null;
}

interface User {
  id: number;
  nickname: string;
  gemini_api_key: string | null;
  lang: string;
}

interface Retrospective {
  id: number;
  workspace_id: number;
  retro_type: "DAILY" | "WEEKLY" | "MONTHLY";
  content: string;
  date_label: string;
  created_at: string;
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

const SortableItem = ({ block, timeline, currentTime, t, onTransition, onMoveToInbox, onDelete, hoverTaskId, setHoverTaskId }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, disabled: block.status === "UNPLUGGED" || block.status === "DONE" });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : (hoverTaskId === block.task_id ? 10 : 1),
    opacity: isDragging ? 0.6 : 1,
    scale: isDragging ? 1.05 : 1,
    boxShadow: isDragging ? "0 20px 40px rgba(0,0,0,0.5), 0 0 20px rgba(59,130,246,0.3)" : undefined,
  };

  const taskBlocks = block.task_id ? timeline.filter((b: any) => b.task_id === block.task_id) : [];
  const blockIndexInTask = taskBlocks.findIndex((b: any) => b.id === block.id);
  const isSplit = taskBlocks.length > 1;
  const isFirstOfTask = isSplit && blockIndexInTask === 0;
  const isLastOfTask = isSplit && blockIndexInTask === taskBlocks.length - 1;
  const isMiddleOfTask = isSplit && blockIndexInTask > 0 && blockIndexInTask < taskBlocks.length - 1;

  const isPending = block.status === "PENDING";
  const isHovered = block.task_id && hoverTaskId === block.task_id;

  const zigzagBottom = "polygon(0% 0%, 100% 0%, 100% 92%, 98% 100%, 96% 92%, 94% 100%, 92% 92%, 90% 100%, 88% 92%, 86% 100%, 84% 92%, 82% 100%, 80% 92%, 78% 100%, 76% 92%, 74% 100%, 72% 92%, 70% 100%, 68% 92%, 66% 100%, 64% 92%, 62% 100%, 60% 92%, 58% 100%, 56% 92%, 54% 100%, 52% 92%, 50% 100%, 48% 92%, 46% 100%, 44% 92%, 42% 100%, 40% 92%, 38% 100%, 36% 92%, 34% 100%, 32% 92%, 30% 100%, 28% 92%, 26% 100%, 24% 92%, 22% 100%, 20% 92%, 18% 100%, 16% 92%, 14% 100%, 12% 92%, 10% 100%, 8% 92%, 6% 100%, 4% 92%, 2% 100%, 0% 92%)";
  const zigzagTop = "polygon(0% 8%, 2% 0%, 4% 8%, 6% 0%, 8% 8%, 10% 0%, 12% 8%, 14% 0%, 16% 8%, 18% 0%, 20% 8%, 22% 0%, 24% 8%, 26% 0%, 28% 8%, 30% 0%, 32% 8%, 34% 0%, 36% 8%, 38% 0%, 40% 8%, 42% 0%, 44% 8%, 46% 0%, 48% 8%, 50% 0%, 52% 8%, 54% 0%, 56% 8%, 58% 0%, 60% 8%, 62% 0%, 64% 8%, 66% 0%, 68% 8%, 70% 0%, 72% 8%, 74% 0%, 76% 8%, 78% 0%, 80% 8%, 82% 0%, 84% 8%, 86% 0%, 88% 8%, 90% 0%, 92% 8%, 94% 0%, 96% 8%, 98% 0%, 100% 8%, 100% 100%, 0% 100%)";
  const zigzagBoth = "polygon(0% 8%, 2% 0%, 4% 8%, 6% 0%, 8% 8%, 10% 0%, 12% 8%, 14% 0%, 16% 8%, 18% 0%, 20% 8%, 22% 0%, 24% 8%, 26% 0%, 28% 8%, 30% 0%, 32% 8%, 34% 0%, 36% 8%, 38% 0%, 40% 8%, 42% 0%, 44% 8%, 46% 0%, 48% 8%, 50% 0%, 52% 8%, 54% 0%, 56% 8%, 58% 0%, 60% 8%, 62% 0%, 64% 8%, 66% 0%, 68% 8%, 70% 0%, 72% 8%, 74% 0%, 76% 8%, 78% 0%, 80% 8%, 82% 0%, 84% 8%, 86% 0%, 88% 8%, 90% 0%, 92% 8%, 94% 0%, 96% 8%, 98% 0%, 100% 8%, 100% 92%, 98% 100%, 96% 92%, 94% 100%, 92% 92%, 90% 100%, 88% 92%, 86% 100%, 84% 92%, 82% 100%, 80% 92%, 78% 100%, 76% 92%, 74% 100%, 72% 92%, 70% 100%, 68% 92%, 66% 100%, 64% 92%, 62% 100%, 60% 92%, 58% 100%, 56% 92%, 54% 100%, 52% 92%, 50% 100%, 48% 92%, 46% 100%, 44% 92%, 42% 100%, 40% 92%, 38% 100%, 36% 92%, 34% 100%, 32% 92%, 30% 100%, 28% 92%, 26% 100%, 24% 92%, 22% 100%, 20% 92%, 18% 100%, 16% 92%, 14% 100%, 12% 92%, 10% 100%, 8% 92%, 6% 100%, 4% 92%, 2% 100%, 0% 92%)";

  return (
    <div ref={setNodeRef} style={style} className="relative group/item">
      <div className="absolute -left-[6.5rem] top-6 w-16 text-right space-y-1">
        <p className="text-[10px] font-black font-mono text-text-secondary">{formatDisplayTime(block.start_time)}</p>
      </div>
      
      <div className={`absolute -left-[70px] top-1 w-3 h-3 rounded-full border-2 bg-surface z-10 transition-all duration-300 ${
        block.status === "DONE" ? "border-success bg-success/20" :
        block.status === "NOW" ? "border-accent scale-125 shadow-[0_0_10px_rgba(59,130,246,0.5)] bg-accent/20" :
        block.status === "PENDING" ? "border-warning bg-warning/20" :
        block.status === "UNPLUGGED" ? "border-border bg-surface-elevated" : "border-border"
      }`} />

      {isSplit && blockIndexInTask < taskBlocks.length - 1 && (
        <div className={`absolute right-[-10px] top-8 bottom-[-24px] w-[3px] rounded-full z-0 transition-colors duration-300 ${isHovered ? "bg-text-primary/40 shadow-[0_0_10px_rgba(255,255,255,0.2)]" : "bg-surface-elevated"}`} />
      )}

      <div 
        onMouseEnter={() => block.task_id && setHoverTaskId(block.task_id)}
        onMouseLeave={() => setHoverTaskId(null)}
        className={`p-5 rounded-2xl border-[1.5px] transition-all duration-300 transform ${
        block.status === "DONE" ? "bg-success/5 border-success/20" :
        block.status === "NOW" ? (new Date(block.end_time) < currentTime ? "bg-danger/10 border-danger animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.2)]" : "bg-accent/5 border-accent shadow-[0_0_15px_rgba(59,130,246,0.1)]") :
        block.status === "PENDING" ? "bg-warning/5 border-warning/40 border-dashed" :
        block.status === "UNPLUGGED" ? "bg-surface/40 border-border opacity-60 border-dashed cursor-default" : "bg-surface-elevated/50 border-border hover:bg-surface-elevated"
      } ${isHovered ? "border-text-primary/40 bg-surface-elevated/80 -translate-x-1 shadow-[0_0_30px_rgba(255,255,255,0.05)] scale-[1.01]" : ""} ${isFirstOfTask ? "rounded-b-none border-b-0 pb-8 mb-0" : ""} ${isLastOfTask ? "rounded-t-none border-t-0 mt-[-2px]" : ""} ${isMiddleOfTask ? "rounded-none border-y-0 py-8 my-[-2px]" : ""}`}
        style={{
          clipPath: isFirstOfTask 
            ? zigzagBottom
            : isLastOfTask
            ? zigzagTop
            : isMiddleOfTask
            ? zigzagBoth
            : undefined
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
              <GripVertical size={14} className={`transition-opacity duration-300 ${isHovered || isDragging ? "text-text-primary opacity-100" : "text-text-muted opacity-20"}`} />
            </div>
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                  {block.is_urgent && <AlertTriangle size={14} className="text-danger fill-danger/20" />}
                  <h4 className={`font-black text-sm tracking-tight transition-colors duration-300 ${block.status === "UNPLUGGED" ? "text-text-muted" : (isHovered ? "text-text-primary" : "text-text-secondary")}`}>{block.title}</h4>
                  <span className="text-[10px] font-mono font-bold text-text-muted bg-background px-2 py-0.5 rounded-md">
                    {formatDisplayTime(block.start_time)} - {formatDisplayTime(block.end_time)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${block.status === "NOW" ? "text-accent" : "text-text-muted"}`}>{block.status}</span>
                    {block.status === "NOW" && new Date(block.end_time) < currentTime && (
                        <span className="bg-danger text-text-primary text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                            {t.main.status.overdue}
                        </span>
                    )}
                    {isPending && (
                        <span className="bg-warning text-background text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                            INTERRUPTED
                        </span>
                    )}
                </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                onMoveToInbox(block.id);
              }}
              className={`h-9 w-9 p-0 rounded-xl transition-all duration-300 ${isHovered ? "bg-surface-elevated text-text-primary hover:bg-border" : "bg-surface text-text-muted hover:text-text-primary"}`}
            >
              <Inbox size={16} />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                onTransition(block);
              }}
              className={`h-9 w-9 p-0 rounded-xl transition-all duration-300 ${isHovered ? "bg-text-primary text-background hover:bg-text-secondary" : "bg-surface text-text-muted hover:text-text-primary"}`}
            >
              <Pencil size={16} />
            </Button>
            {block.task_id && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(block.task_id);
                }}
                className={`h-9 w-9 p-0 rounded-xl transition-all duration-300 ${isHovered ? "bg-danger/20 text-danger hover:bg-danger hover:text-text-primary" : "bg-surface text-text-muted hover:text-text-primary"}`}
              >
                <X size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const InboxItem = ({ task, onMoveToTimeline, onDelete }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `inbox-${task.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.6 : 1,
    scale: isDragging ? 1.05 : 1,
    boxShadow: isDragging ? "0 10px 20px rgba(0,0,0,0.5)" : undefined,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="p-4 bg-surface/60 border border-border rounded-2xl group transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing shrink-0">
            <GripVertical size={14} className="text-text-muted group-hover:text-text-secondary" />
          </div>
          <h4 className="font-bold text-xs text-text-secondary truncate">{task.title}</h4>
        </div>
        <div className="flex items-center space-x-1 shrink-0">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              onMoveToTimeline(task.id);
            }}
            className="h-8 w-8 p-0 rounded-xl bg-surface-elevated text-text-muted hover:text-text-primary hover:bg-border"
          >
            <Clock size={14} />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="h-8 w-8 p-0 rounded-xl bg-surface-elevated text-text-muted hover:text-danger hover:bg-danger/20"
          >
            <X size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
};

const RetrospectiveView = ({ 
  workspaceId, 
  onClose, 
  onShowSavedRetro 
}: { 
  workspaceId: number, 
  onClose: () => void,
  onShowSavedRetro: (retro: Retrospective) => void
}) => {
  const [tab, setTab] = useState<"create" | "browse">("create");
  const [retroType, setRetroType] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("DAILY");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dateLabel, setDateLabel] = useState(format(new Date(), "yyyy-MM-dd"));
  const [browseDate, setBrowseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isGenerating, setIsGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState("");

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenMessage("회고 생성까지 최대 3분 소요될 수 있습니다. 완료되면 데스크탑 알림으로 알려드릴게요!");
    
    try {
      const retro = await invoke<Retrospective>("generate_retrospective", {
        workspaceId,
        startDate,
        endDate,
        retroType,
        dateLabel
      });

      let permission = await isPermissionGranted();
      if (!permission) {
        permission = await requestPermission() === 'granted';
      }
      if (permission) {
        sendNotification({
          title: '회고 생성 완료!',
          body: `${dateLabel} ${retroType} 회고가 생성되었습니다. 클릭하여 확인하세요.`,
        });
      }
      
      onShowSavedRetro(retro);
    } catch (error: any) {
      alert(`Error: ${error}`);
    } finally {
      setIsGenerating(false);
      setGenMessage("");
    }
  };

  const handleBrowseLatest = async () => {
    try {
      const latest = await invoke<Retrospective | null>("get_latest_saved_retrospective", { workspaceId });
      if (latest) {
        onShowSavedRetro(latest);
      } else {
        alert("최근 회고가 없습니다.");
      }
    } catch (error: any) {
      alert(error);
    }
  };

  const handleBrowseByDate = async () => {
    try {
      const retros = await invoke<Retrospective[]>("get_saved_retrospectives", { workspaceId, dateLabel: browseDate });
      if (retros.length > 0) {
        onShowSavedRetro(retros[0]);
      } else {
        alert("해당 날짜의 회고가 없습니다.");
      }
    } catch (error: any) {
      alert(error);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-surface flex flex-col shrink-0 p-6 space-y-8">
        <div className="space-y-4">
          <h2 className="text-xl font-black tracking-tighter text-text-primary">Retrospective</h2>
          <nav className="space-y-2">
            <Button 
              variant={tab === "create" ? "secondary" : "ghost"} 
              className="w-full justify-start font-bold"
              onClick={() => setTab("create")}
            >
              회고 생성
            </Button>
            <Button 
              variant={tab === "browse" ? "secondary" : "ghost"} 
              className="w-full justify-start font-bold"
              onClick={() => setTab("browse")}
            >
              회고 톺아보기
            </Button>
          </nav>
        </div>
        <Button variant="outline" className="mt-auto border-border font-bold" onClick={onClose}>
          메인으로 돌아가기
        </Button>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-12 max-w-4xl mx-auto">
        {tab === "create" ? (
          <div className="space-y-12">
            <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tighter text-text-primary">Create New Retrospective</h1>
              <p className="text-text-secondary font-bold">AI와 함께 업무를 돌아보고 더 나은 내일을 계획하세요.</p>
            </div>

            <div className="p-8 bg-surface-elevated border border-border rounded-3xl space-y-8 shadow-2xl">
              <div className="space-y-4">
                <Label className="text-xs font-black text-text-secondary uppercase tracking-widest">Type</Label>
                <div className="flex gap-4">
                  {(["DAILY", "WEEKLY", "MONTHLY"] as const).map((type) => (
                    <Button 
                      key={type}
                      variant={retroType === type ? "default" : "outline"}
                      onClick={() => setRetroType(type)}
                      className="flex-1 font-bold h-12 rounded-xl border-border"
                    >
                      {type === "DAILY" ? "일간" : type === "WEEKLY" ? "주간" : "월간"}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <Label className="text-xs font-black text-text-secondary uppercase tracking-widest">Start Date</Label>
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-surface border-border h-12 rounded-xl px-4 font-bold [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-4">
                  <Label className="text-xs font-black text-text-secondary uppercase tracking-widest">End Date</Label>
                  <Input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-surface border-border h-12 rounded-xl px-4 font-bold [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-xs font-black text-text-secondary uppercase tracking-widest">Date Label (Title)</Label>
                <Input 
                  value={dateLabel} 
                  onChange={(e) => setDateLabel(e.target.value)}
                  placeholder="예: 2026-03-01 또는 2026년 3월 1주차"
                  className="bg-surface border-border h-12 rounded-xl px-4 font-bold"
                />
              </div>

              {genMessage && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-3">
                  <Sparkles size={18} className="text-blue-400 animate-pulse shrink-0" />
                  <p className="text-xs text-blue-400 font-bold">{genMessage}</p>
                </div>
              )}

              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating}
                className="w-full bg-text-primary text-background hover:bg-zinc-200 h-14 rounded-2xl font-black text-lg shadow-xl active:scale-95 disabled:opacity-50"
              >
                {isGenerating ? "Generating..." : "회고 생성하기"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tighter text-text-primary">Browse Retrospectives</h1>
              <p className="text-text-secondary font-bold">과거의 기록들을 톺아보며 성장을 확인하세요.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 bg-surface-elevated border border-border rounded-3xl space-y-6 shadow-xl flex flex-col">
                <div className="flex items-center gap-3">
                  <CalendarIcon size={24} className="text-text-primary" />
                  <h3 className="text-xl font-black text-text-primary">날짜로 검색</h3>
                </div>
                <div className="space-y-4 flex-1">
                  <Label className="text-xs font-black text-text-secondary uppercase tracking-widest">Select Date Label</Label>
                  <Input 
                    value={browseDate} 
                    onChange={(e) => setBrowseDate(e.target.value)}
                    placeholder="YYYY-MM-DD"
                    className="bg-surface border-border h-12 rounded-xl px-4 font-bold"
                  />
                </div>
                <Button onClick={handleBrowseByDate} variant="outline" className="w-full h-12 rounded-xl font-bold border-border">
                  검색하기
                </Button>
              </div>

              <div className="p-8 bg-surface-elevated border border-border rounded-3xl space-y-6 shadow-xl flex flex-col border-t-yellow-400/30">
                <div className="flex items-center gap-3">
                  <Sparkles size={24} className="text-yellow-400" />
                  <h3 className="text-xl font-black text-text-primary">가장 최근 회고</h3>
                </div>
                <p className="text-sm text-text-secondary font-bold flex-1">마지막으로 생성된 회고 내용을 즉시 확인합니다.</p>
                <Button onClick={handleBrowseLatest} className="w-full h-12 rounded-xl font-bold bg-surface-elevated hover:bg-border text-text-primary border border-border">
                  최근 회고 보기
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const SettingsView = ({ 
  user,
  workspaceId,
  t, 
  onClose,
  onUserUpdate,
  onWorkspaceUpdate,
  showToast
}: { 
  user: User,
  workspaceId: number,
  t: any,
  onClose: () => void,
  onUserUpdate: () => void,
  onWorkspaceUpdate: () => void,
  showToast: (msg: string, type: "success" | "error") => void
}) => {
  const [tab, setTab] = useState<"profile" | "workspace">("profile");

  // User Form
  const userForm = useForm({
    defaultValues: {
      nickname: user.nickname,
      gemini_api_key: user.gemini_api_key || "",
      lang: user.lang
    }
  });

  // Workspace Form
  const workspaceForm = useForm({
    defaultValues: async () => {
      const ws = await invoke<any>("get_workspace", { id: workspaceId });
      const ut = await invoke<any[]>("get_unplugged_times", { workspaceId });
      return {
        name: ws.name,
        core_time_start: ws.core_time_start || "",
        core_time_end: ws.core_time_end || "",
        role_intro: ws.role_intro || "",
        unplugged_times: ut.map(u => ({ label: u.label, start_time: u.start_time, end_time: u.end_time }))
      };
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: workspaceForm.control,
    name: "unplugged_times"
  });

  useEffect(() => {
    userForm.reset({
      nickname: user.nickname,
      gemini_api_key: user.gemini_api_key || "",
      lang: user.lang
    });
  }, [user]);

  const onUserSubmit = async (data: any) => {
    try {
      await invoke("save_user", { 
        nickname: data.nickname, 
        gemini_api_key: data.gemini_api_key || null,
        lang: data.lang
      });
      await onUserUpdate();
      showToast(t.main.toast.profile_updated, "success");
    } catch (error: any) {
      showToast(error.toString(), "error");
    }
  };

  const onWorkspaceSubmit = async (data: any) => {
    try {
      await invoke("update_workspace", {
        id: workspaceId,
        input: {
          ...data,
          core_time_start: data.core_time_start || null,
          core_time_end: data.core_time_end || null,
          role_intro: data.role_intro || null,
        }
      });
      await onWorkspaceUpdate();
      showToast(t.main.toast.workspace_updated, "success");
    } catch (error: any) {
      showToast(error.toString(), "error");
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-surface">
      <aside className="w-64 border-r border-border flex flex-col shrink-0 p-6 space-y-8">
        <Button 
          variant="ghost" 
          className="justify-start -ml-2 text-text-secondary hover:text-text-primary font-bold h-10 px-2 group transition-all"
          onClick={onClose}
        >
          <ChevronLeft size={18} className="mr-1 group-hover:-translate-x-1 transition-transform" />
          {t.sidebar.back}
        </Button>

        <div className="space-y-4">
          <h2 className="text-xl font-black tracking-tighter text-text-primary">{t.sidebar.settings}</h2>
          <nav className="space-y-2">
            <Button 
              variant={tab === "profile" ? "secondary" : "ghost"} 
              className="w-full justify-start font-bold"
              onClick={() => setTab("profile")}
            >
              {t.sidebar.profile}
            </Button>
            <Button 
              variant={tab === "workspace" ? "secondary" : "ghost"} 
              className="w-full justify-start font-bold"
              onClick={() => setTab("workspace")}
            >
              {t.sidebar.workspace}
            </Button>
          </nav>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-12">
        <div className="max-w-4xl">
          {tab === "profile" ? (
            <form key="profile-form" onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-12">
              <div className="space-y-2">
                <h1 className="text-4xl font-black tracking-tighter text-text-primary">{t.sidebar.profile}</h1>
                <p className="text-text-secondary font-bold">{t.sidebar.settings_desc}</p>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <Label className="text-xs font-black text-text-muted uppercase tracking-widest">{t.onboarding.nickname_label}</Label>
                  <Input {...userForm.register("nickname")} className="bg-surface-elevated border-border text-text-primary h-12 rounded-xl px-4 font-bold" />
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-black text-text-muted uppercase tracking-widest">{t.onboarding.api_key_label}</Label>
                  <Input type="password" {...userForm.register("gemini_api_key")} className="bg-surface-elevated border-border text-text-primary h-12 rounded-xl px-4 font-bold" />
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-black text-text-muted uppercase tracking-widest">{t.sidebar.lang_label}</Label>
                  <select 
                    {...userForm.register("lang")}
                    className="w-full h-12 bg-surface-elevated border border-border rounded-xl px-4 font-bold text-text-primary outline-none focus:ring-1 focus:ring-white/10 appearance-none"
                  >
                    <option value="ko">한국어 (Korean)</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <Button type="submit" className="w-full bg-text-primary text-background hover:bg-zinc-200 font-black h-12 rounded-xl text-sm transition-all shadow-xl active:scale-95">
                  {t.sidebar.save_changes}
                </Button>
              </div>
            </form>
          ) : (
            <form key="workspace-form" onSubmit={workspaceForm.handleSubmit(onWorkspaceSubmit)} className="space-y-12">
              <div className="space-y-2">
                <h1 className="text-4xl font-black tracking-tighter text-text-primary">{t.sidebar.workspace}</h1>
                <p className="text-text-secondary font-bold">{t.sidebar.workspace_settings_desc}</p>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <Label className="text-xs font-black text-text-muted uppercase tracking-widest">{t.workspace_setup.name_label}</Label>
                  <Input {...workspaceForm.register("name")} className="bg-surface-elevated border-border text-text-primary h-12 rounded-xl px-4 font-bold" />
                </div>

                <div className="space-y-4">
                  <Label className="text-xs font-black text-text-muted uppercase tracking-widest">{t.workspace_setup.core_time}</Label>
                  <div className="grid grid-cols-2 gap-6">
                    <Input type="time" {...workspaceForm.register("core_time_start")} className="bg-surface-elevated border-border text-text-primary h-12 rounded-xl px-4 font-bold [color-scheme:dark]" />
                    <Input type="time" {...workspaceForm.register("core_time_end")} className="bg-surface-elevated border-border text-text-primary h-12 rounded-xl px-4 font-bold [color-scheme:dark]" />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-black text-text-muted uppercase tracking-widest">{t.workspace_setup.unplugged_time}</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => append({ label: "", start_time: "12:00", end_time: "13:00" })} 
                      className="border-border bg-surface-elevated hover:bg-border text-text-secondary font-black rounded-lg h-9"
                    >
                      <Plus size={16} className="mr-2" /> {t.workspace_setup.add_unplugged}
                    </Button>
                  </div>
                  <div className="space-y-4 pb-2">
                    {fields.map((field, index) => (
                      <div key={field.id} className="p-5 bg-surface-elevated/60 border border-border rounded-2xl space-y-4 relative">
                        <button type="button" onClick={() => remove(index)} className="absolute top-4 right-4 text-text-muted hover:text-danger transition-colors">
                          <X size={16} />
                        </button>
                        <Input {...workspaceForm.register(`unplugged_times.${index}.label` as const)} placeholder={t.workspace_setup.unplugged_label_placeholder} className="bg-surface border-border h-11 rounded-xl px-4 font-bold" />
                        <div className="grid grid-cols-2 gap-4">
                          <Input type="time" {...workspaceForm.register(`unplugged_times.${index}.start_time` as const)} className="bg-surface border-border h-11 rounded-xl font-bold [color-scheme:dark]" />
                          <Input type="time" {...workspaceForm.register(`unplugged_times.${index}.end_time` as const)} className="bg-surface border-border h-11 rounded-xl font-bold [color-scheme:dark]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-black text-text-muted uppercase tracking-widest">{t.workspace_setup.role_intro}</Label>
                  <textarea 
                    {...workspaceForm.register("role_intro")}
                    placeholder={t.workspace_setup.role_placeholder}
                    className="w-full min-h-[120px] bg-surface-elevated border-border rounded-2xl p-5 text-sm text-text-primary focus:outline-none placeholder:text-text-muted font-bold leading-relaxed"
                  />
                </div>

                <Button type="submit" className="w-full bg-text-primary text-background hover:bg-zinc-200 font-black h-12 rounded-xl text-sm transition-all shadow-xl active:scale-95">
                  {t.sidebar.save_changes}
                </Button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

function App() {
  const [view, setView] = useState<"loading" | "onboarding" | "workspace_setup" | "main" | "retrospective" | "settings">("loading");
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [greeting, setGreeting] = useState<string>("");
  const [timeline, setTimeline] = useState<TimeBlock[]>([]);
  const [inboxTasks, setInboxTasks] = useState<Task[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [transitionBlock, setTransitionBlock] = useState<TimeBlock | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);
  const [moveAllConfirm, setMoveAllConfirm] = useState(false);
  const [reviewMemo, setReviewMemo] = useState("");
  const [retrospectiveOpen, setRetrospectiveOpen] = useState(false);
  const [retrospectiveContent, setRetrospectiveContent] = useState("");
  const [isGeneratingRetro, setIsGeneratingRetro] = useState(false);
  const [customDelay, setCustomDelay] = useState<number>(15);
  const [agoMinutes, setAgoMinutes] = useState<number>(5);
  const [hoverTaskId, setHoverTaskId] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);
  const [activeDates, setActiveDates] = useState<string[]>([]);
  const [manualDate, setManualDate] = useState("");

  const lang = useMemo(() => (user?.lang || getLang()) as Lang, [user]);
  const t = translations[lang];

  const showToast = (message: string, type: "error" | "success" = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleManualDateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId) return;

    // Validate format YYYY-MM-DD
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(manualDate)) {
      showToast("Invalid format (YYYY-MM-DD)");
      return;
    }

    const hasData = activeDates.includes(manualDate);
    if (!hasData) {
      showToast(t.main.toast.no_data_for_date);
      return;
    }

    setSelectedDate(new Date(manualDate));
    setManualDate("");
  };

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
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
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
  }, [activeWorkspaceId, view, selectedDate]);

  const init = async () => {
    try {
      const u = await invoke<User | null>("get_user");
      if (!u) {
        setView("onboarding");
        return;
      }
      setUser(u);
      
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
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const list = await invoke<TimeBlock[]>("get_timeline", { workspaceId: activeWorkspaceId, date: dateStr });
      const inbox = await invoke<Task[]>("get_inbox", { workspaceId: activeWorkspaceId });
      const activeD = await invoke<string[]>("get_active_dates", { workspaceId: activeWorkspaceId });
      
      setActiveDates(activeD);
      const now = new Date();
      const isToday = dateStr === format(now, "yyyy-MM-dd");

      if (isToday) {
        const active = list.find(b => b.status === "NOW");
        if (active && new Date(active.end_time) < now && !transitionBlock) {
          setTransitionBlock(active);
        }

        if (!active) {
          const next = list.find(b => b.status === "WILL" && new Date(b.start_time) <= now);
          if (next) {
            await invoke("update_block_status", { blockId: next.id, status: "NOW" });
            fetchMainData();
            return;
          }
        }
      }

      setTimeline(list);
      setInboxTasks(inbox);
    } catch (error) {
      console.error("Fetch failed:", error);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id.toString());
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    // Inbox -> Timeline
    if (activeId.includes("inbox") && !overId.includes("inbox")) {
      const taskId = parseInt(activeId.replace("inbox-", ""));
      if (activeWorkspaceId) {
        await invoke("move_to_timeline", { taskId, workspaceId: activeWorkspaceId });
        fetchMainData();
      }
      return;
    }

    // Timeline -> Inbox
    if (!activeId.includes("inbox") && (overId === "inbox" || overId.includes("inbox"))) {
      const blockId = parseInt(activeId);
      await invoke("move_to_inbox", { blockId });
      fetchMainData();
      return;
    }

    // Only Timeline Reordering
    if (!activeId.includes("inbox") && !overId.includes("inbox")) {
      const oldIndex = timeline.findIndex((item) => item.id.toString() === activeId);
      const newIndex = timeline.findIndex((item) => item.id.toString() === overId);

      if (oldIndex !== newIndex) {
        const nowIndex = timeline.findIndex(b => b.status === "NOW");
        const activeBlock = timeline[oldIndex];

        // Validation: Cannot move WILL/PENDING task to before/at NOW block's position
        if (activeBlock.status !== "NOW") {
          if (nowIndex !== -1 && newIndex <= nowIndex) {
            showToast(t.main.toast.past_time_error);
            return;
          }
          if (nowIndex === -1 && timeline.length > 0 && newIndex === 0 && new Date(timeline[0].start_time) < currentTime) {
            showToast(t.main.toast.past_time_error);
            return;
          }
        }

        const newTimeline = arrayMove(timeline, oldIndex, newIndex);
        setTimeline(newTimeline);
        const ids = newTimeline.filter(b => b.status !== "UNPLUGGED").map(b => b.id);
        if (activeWorkspaceId) {
          await invoke("reorder_blocks", { workspaceId: activeWorkspaceId, blockIds: ids });
          fetchMainData();
        }
      }
    }
  };

  const handleGenerateRetrospective = async (date: Date) => {
    if (!activeWorkspaceId) return;
    setRetrospectiveOpen(true);
    setIsGeneratingRetro(true);
    setRetrospectiveContent("");
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const content = await invoke<string>("generate_retrospective", { 
        workspaceId: activeWorkspaceId, 
        date: dateStr 
      });
      setRetrospectiveContent(content);
    } catch (error: any) {
      setRetrospectiveContent(`Error generating retrospective:\n\n${error}`);
    } finally {
      setIsGeneratingRetro(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const dateStr = format(date, "yyyy-MM-dd");
    const isToday = format(new Date(), "yyyy-MM-dd") === dateStr;
    
    if (!isToday && activeDates.includes(dateStr)) {
      handleGenerateRetrospective(date);
    } else {
      setSelectedDate(date);
    }
  };

  const onUserSubmit = async (data: UserFormValues) => {
    await invoke("save_user", { 
      nickname: data.nickname, 
      gemini_api_key: data.gemini_api_key || null,
      lang: getLang() 
    });
    const u = await invoke<User>("get_user");
    setUser(u);
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
          planning_memo: data.planning_memo || null,
          is_inbox: false
        } 
      });
      taskForm.reset({ title: "", hours: 0, minutes: 30, planning_memo: "", is_urgent: false });
      fetchMainData();
    } catch (error) {
      console.error("Task add failed:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteTaskId) return;
    try {
      await invoke("delete_task", { id: deleteTaskId });
      setDeleteTaskId(null);
      fetchMainData();
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const handleMoveAllToTimeline = async () => {
    if (!activeWorkspaceId) return;
    try {
      await invoke("move_all_to_timeline", { workspace_id: activeWorkspaceId });
      setMoveAllConfirm(false);
      fetchMainData();
    } catch (error) {
      console.error("Move all failed:", error);
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
      <div className="h-screen flex items-center justify-center bg-surface text-text-primary antialiased font-bold">
        <p className="animate-pulse">{t.checking}</p>
      </div>
    );
  }

  const isFirstWorkspace = workspaces.length === 0;

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <TooltipProvider>
        <div className="h-screen bg-background text-text-primary flex overflow-hidden font-sans antialiased select-none">
          
                  {/* 1차 사이드바 */}
                  {(view === "main" || view === "retrospective" || view === "settings") && (
                    <aside className="w-16 border-r border-border bg-background flex flex-col items-center py-4 space-y-4 shrink-0 shadow-2xl z-20">            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => {
                  setActiveWorkspaceId(ws.id);
                  setView("main");
                }}
                className={`w-11 h-11 rounded-xl flex items-center justify-center text-xs font-black transition-all duration-300 transform ${
                  activeWorkspaceId === ws.id 
                  ? "bg-text-primary text-background scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]" 
                  : "bg-surface-elevated text-text-muted hover:bg-border hover:text-text-primary"
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
              className="w-11 h-11 rounded-xl bg-surface-elevated border border-border flex items-center justify-center text-text-muted hover:text-text-primary hover:border-text-secondary transition-all duration-300"
            >
              <Plus size={22} />
            </button>
          </aside>
        )}

        {view === "retrospective" && activeWorkspaceId && (
          <RetrospectiveView 
            workspaceId={activeWorkspaceId} 
            onClose={() => setView("main")} 
            onShowSavedRetro={(retro) => {
              setRetrospectiveContent(retro.content);
              setRetrospectiveOpen(true);
            }}
          />
        )}

        {view === "settings" && activeWorkspaceId && user && (
          <SettingsView 
            user={user}
            workspaceId={activeWorkspaceId} 
            t={t} 
            onClose={() => setView("main")} 
            onUserUpdate={async () => {
              const u = await invoke<User>("get_user");
              setUser(u);
            }}
            onWorkspaceUpdate={async () => {
              fetchMainData();
              const wsList = await invoke<any[]>("get_workspaces");
              setWorkspaces(wsList);
            }}
            showToast={showToast}
          />
        )}

        {/* 2차 사이드바 */}
        {view === "main" && (
          <aside className="w-64 border-r border-border bg-surface flex flex-col shrink-0 z-10">
            <div className="p-5 border-b border-border space-y-4">
              <Popover>
                <PopoverTrigger asChild>
                  <div className="flex items-center space-x-3 text-text-secondary hover:text-text-primary cursor-pointer transition-all active:scale-95">
                    <CalendarIcon size={18} />
                    <span className="text-sm font-black tracking-tight">
                      {format(selectedDate, "yyyy. MM. dd.")}
                    </span>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-surface-elevated border-border" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                    className="bg-surface-elevated text-text-primary"
                    disabled={(date) => {
                      const dateStr = format(date, "yyyy-MM-dd");
                      const isToday = format(new Date(), "yyyy-MM-dd") === dateStr;
                      return !activeDates.includes(dateStr) && !isToday;
                    }}
                    modifiers={{
                      hasData: (date) => activeDates.includes(format(date, "yyyy-MM-dd"))
                    }}
                    modifiersClassNames={{
                      hasData: "font-black text-accent"
                    }}
                  />
                </PopoverContent>
              </Popover>

              <form onSubmit={handleManualDateSubmit} className="relative">
                <Input
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  placeholder="YYYY-MM-DD"
                  className="bg-background border-border text-[11px] font-mono font-bold h-9 rounded-xl focus-visible:ring-1 focus-visible:ring-white/10"
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
                  <Send size={12} />
                </button>
              </form>
            </div>
            
            <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-5 pb-2 flex items-center space-x-2">
              <Inbox size={14} className="text-text-muted" />
              <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
                {t.sidebar.inbox}
              </h3>
            </div>
              <ScrollArea className="flex-1 p-5 pt-0">
                <DroppableArea id="inbox" className="space-y-3 py-3 min-h-[100px]">
                  <SortableContext 
                    items={inboxTasks.map(t => `inbox-${t.id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    {inboxTasks.length === 0 ? (
                      <div className="p-8 border-2 border-dashed border-border bg-background/40 rounded-2xl text-center">
                        <p className="text-[11px] text-text-muted font-bold italic">{t.sidebar.no_tasks}</p>
                      </div>
                    ) : (
                      inboxTasks.map((task) => (
                        <InboxItem 
                          key={task.id} 
                          task={task} 
                          onMoveToTimeline={async (taskId: number) => {
                            if (activeWorkspaceId) {
                              await invoke("move_to_timeline", { taskId, workspaceId: activeWorkspaceId });
                              fetchMainData();
                            }
                          }}
                          onDelete={(id: number) => setDeleteTaskId(id)}
                        />
                      ))
                    )}
                  </SortableContext>
                </DroppableArea>
              </ScrollArea>
            </div>

                        <div className="p-5 border-t border-border">
                          <Button
                            onClick={() => setView("settings")}
                            variant="ghost"
                            className="w-full justify-start text-text-secondary hover:text-text-primary hover:bg-border space-x-4 h-12 px-4 rounded-xl transition-all"
                          >
                            <Settings size={20} />
                            <span className="font-bold text-sm">{t.sidebar.settings}</span>
                          </Button>
                        </div>          </aside>
        )}

        {/* 메인 영역 */}
        {(view === "main" || view === "onboarding" || view === "workspace_setup") && (
          <main className="flex-1 flex flex-col relative overflow-hidden bg-background antialiased">
          {view === "main" ? (
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
                            onClick={() => setView("retrospective")}
                            disabled={!user?.gemini_api_key}
                            className="bg-surface-elevated hover:bg-border text-text-primary font-black rounded-xl gap-2 h-11 border border-border shadow-xl shadow-black/40 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Sparkles size={18} className="text-warning" />
                            {t.main.retrospective_btn}
                          </Button>
                        </div>
                      </TooltipTrigger>
                      {!user?.gemini_api_key && (
                        <TooltipContent className="bg-surface-elevated border-border text-text-secondary font-bold text-xs p-3 rounded-xl shadow-2xl">
                                                    <p>설정에서 GOOGLE AI STUDIO API KEY를 입력해주세요.</p>
                                                  </TooltipContent>
                                                )}
                                              </Tooltip>
                                            </TooltipProvider>
                                          </div>
                          
                                          {/* Task Input Form */}
                                          <div className="p-2 bg-surface border border-border rounded-2xl shadow-2xl">
                                            <form onSubmit={taskForm.handleSubmit(onTaskSubmit)} className="flex flex-col space-y-2">
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
                                                  <input type="checkbox" {...taskForm.register("is_urgent")} className="hidden" />
                                                  <Zap size={14} className={taskForm.watch("is_urgent") ? "text-danger fill-danger" : "text-text-muted"} />
                                                  <span className={`text-[10px] font-black uppercase ${taskForm.watch("is_urgent") ? "text-danger" : "text-text-muted"}`}>{t.main.urgent}</span>
                                                </label>
                          
                                                <Button type="submit" className="h-10 px-6 bg-text-primary text-background hover:bg-zinc-200 font-black rounded-xl">
                                                  <Send size={16} className="mr-2" />
                                                  {t.main.add_task}
                                                </Button>
                                              </div>
                                              
                                              <div className="px-4 pb-2">
                                                <textarea 
                                                  {...taskForm.register("planning_memo")}
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
                                                        key={block.id === -1 ? `unplugged-${block.start_time}` : block.id}
                                                        block={block}
                                                        timeline={timeline}
                                                        currentTime={currentTime}
                                                        t={t}
                                                        onTransition={setTransitionBlock}
                                                        onMoveToInbox={async (blockId: number) => {
                                                          await invoke("move_to_inbox", { blockId });
                                                          fetchMainData();
                                                        }}
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
                                                onClick={handleDelete}
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
                                                onClick={handleMoveAllToTimeline}
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
                          
                                        {/* Retrospective Modal */}
                                        <Dialog open={retrospectiveOpen} onOpenChange={setRetrospectiveOpen}>
                                          <DialogContent className="sm:max-w-[700px] h-[85vh] bg-surface-elevated border-border text-text-primary shadow-2xl flex flex-col rounded-2xl p-0 border-t-border/50 overflow-hidden antialiased">
                                            <DialogHeader className="p-8 pb-4 shrink-0 space-y-3">
                                              <DialogTitle className="text-2xl font-black tracking-tighter text-text-primary leading-none flex items-center gap-2">
                                                <Sparkles size={24} className="text-warning" />
                                                Work Retrospective
                                              </DialogTitle>
                                              <DialogDescription className="text-text-secondary font-bold text-sm">
                                                {isGeneratingRetro ? "AI is generating your professional retrospective..." : "Your professional Brag Document."}
                                              </DialogDescription>
                                            </DialogHeader>
                                            
                                            <div className="flex-1 overflow-y-auto px-8 scrollbar-hide bg-background">
                                              <div className="py-8 text-sm leading-relaxed prose prose-invert max-w-none">
                                                {isGeneratingRetro ? (
                                                  <div className="flex flex-col items-center justify-center space-y-4 py-20">
                                                    <div className="w-10 h-10 border-4 border-border border-t-warning rounded-full animate-spin" />
                                                    <p className="text-text-muted font-bold animate-pulse">Analyzing completed tasks and memos...</p>
                                                  </div>
                                                ) : (
                                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {retrospectiveContent || "No retrospective generated yet."}
                                                  </ReactMarkdown>
                                                )}
                                              </div>
                                            </div>
                          
                                            <DialogFooter className="p-6 border-t border-border bg-surface-elevated shrink-0">
                                              <Button 
                                                onClick={() => navigator.clipboard.writeText(retrospectiveContent)}
                                                disabled={isGeneratingRetro || !retrospectiveContent}
                                                className="w-full bg-text-primary text-background hover:bg-zinc-200 font-black h-11 rounded-xl text-sm transition-all shadow-xl shadow-black/20 active:scale-95 disabled:opacity-50"
                                              >
                                                Copy to Clipboard
                                              </Button>
                                            </DialogFooter>
                                          </DialogContent>
                                        </Dialog>
                                      </div>
                                    ) : (
                                      <div className="flex-1 flex items-center justify-center p-8">
                                        {/* Onboarding Dialog */}
                                        <Dialog open={view === "onboarding"}>
                                          <DialogContent className="sm:max-w-[425px] bg-surface-elevated border-border text-text-primary shadow-2xl [&>button]:hidden rounded-2xl p-8 border-t-border/50 antialiased">
                                            <DialogHeader className="space-y-3">
                                              <DialogTitle className="text-2xl font-black tracking-tighter text-text-primary leading-none">{t.onboarding.title}</DialogTitle>
                                              <DialogDescription className="text-text-secondary font-bold text-sm leading-relaxed">{t.onboarding.description}</DialogDescription>
                                            </DialogHeader>
                                            <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-8 mt-6">
                                              <div className="space-y-3">
                                                <Label className="text-xs font-black text-text-muted uppercase tracking-widest">{t.onboarding.nickname_label}</Label>
                                                <Input {...userForm.register("nickname")} placeholder={t.onboarding.nickname_placeholder} className="bg-background border-border text-text-primary h-12 rounded-xl px-4 font-bold focus:ring-1 focus:ring-white/10" />
                                                {userForm.formState.errors.nickname && (
                                                  <p className="text-[11px] text-danger font-bold flex items-center gap-1"><AlertCircle size={12}/> {userForm.formState.errors.nickname.message}</p>
                                                )}
                                              </div>
                                              <div className="space-y-3">
                                                <Label className="text-xs font-black text-text-muted uppercase tracking-widest">{t.onboarding.api_key_label}</Label>
                                                <Input type="password" {...userForm.register("gemini_api_key")} placeholder={t.onboarding.api_key_placeholder} className="bg-background border-border text-text-primary h-12 rounded-xl px-4 font-bold focus:ring-1 focus:ring-white/10" />
                                                <p className="text-[10px] text-text-secondary font-bold leading-relaxed">{t.onboarding.api_key_guide}</p>
                                              </div>
                                              <Button type="submit" className="w-full bg-text-primary text-background hover:bg-zinc-200 font-black h-14 rounded-xl text-lg transition-all shadow-xl shadow-black/20 active:scale-95">
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
                                          <DialogContent className={`sm:max-w-[550px] h-[85vh] bg-surface-elevated border-border text-text-primary shadow-2xl flex flex-col rounded-2xl p-0 border-t-border/50 overflow-hidden antialiased ${isFirstWorkspace ? "[&>button]:hidden" : ""}`}>
                                            <DialogHeader className="p-8 pb-4 shrink-0 space-y-3">
                                              <DialogTitle className="text-2xl font-black tracking-tighter text-text-primary leading-none">
                                                {isFirstWorkspace ? t.workspace_setup.title_first : t.workspace_setup.title_new}
                                              </DialogTitle>
                                              <DialogDescription className="text-text-secondary font-bold text-sm">{t.workspace_setup.description}</DialogDescription>
                                            </DialogHeader>
                                            
                                            <div className="flex-1 overflow-y-auto px-8 scrollbar-hide">
                                              <form id="ws-form" onSubmit={workspaceForm.handleSubmit(onWorkspaceSubmit)} className="space-y-10 py-6">
                                                <div className="space-y-3">
                                                  <Label className="text-xs font-black text-text-muted uppercase tracking-widest">{t.workspace_setup.name_label}</Label>
                                                  <Input {...workspaceForm.register("name")} placeholder={t.workspace_setup.name_placeholder} className="bg-background border-border text-text-primary h-12 rounded-xl px-4 font-bold" />
                                                  {workspaceForm.formState.errors.name && (
                                                    <p className="text-[11px] text-danger font-bold flex items-center gap-1"><AlertCircle size={12}/> {workspaceForm.formState.errors.name.message}</p>
                                                  )}
                                                </div>
                          
                                                <div className="space-y-4">
                                                  <div className="flex items-center justify-between">
                                                    <div className="space-y-2">
                                                      <Label className="text-xs font-black text-text-muted uppercase tracking-widest">{t.workspace_setup.core_time}</Label>
                                                      <p className="text-[10px] text-text-secondary font-bold italic">{t.workspace_setup.core_time_guide}</p>
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
                                                      className="h-8 text-[10px] font-black text-text-secondary hover:text-text-primary hover:bg-border transition-all rounded-lg uppercase tracking-wider"
                                                    >
                                                      {t.workspace_setup.core_time_reset}
                                                    </Button>
                                                  </div>
                                                  <div className="grid grid-cols-2 gap-6">
                                                    <Input type="time" {...workspaceForm.register("core_time_start")} className="bg-background border-border text-text-primary h-12 rounded-xl px-4 font-bold [color-scheme:dark]" />
                                                    <Input type="time" {...workspaceForm.register("core_time_end")} className="bg-background border-border text-text-primary h-12 rounded-xl px-4 font-bold [color-scheme:dark]" />
                                                  </div>
                                                  {workspaceForm.formState.errors.core_time_end && (
                                                    <p className="text-[11px] text-danger font-bold flex items-center gap-1"><AlertCircle size={12}/> {workspaceForm.formState.errors.core_time_end.message}</p>
                                                  )}
                                                </div>
                          
                                                <div className="space-y-6">
                                                  <div className="flex items-center justify-between">
                                                    <div className="space-y-2">
                                                      <Label className="text-xs font-black text-text-muted uppercase tracking-widest">{t.workspace_setup.unplugged_time}</Label>
                                                      <p className="text-[10px] text-text-secondary font-bold italic">{t.workspace_setup.unplugged_guide}</p>
                                                    </div>
                                                    <Button 
                                                      type="button" 
                                                      variant="outline" 
                                                      size="sm" 
                                                      onClick={(e) => {
                                                        e.preventDefault();
                                                        append({ label: "", start_time: "12:00", end_time: "13:00" });
                                                      }} 
                                                      className="border-border bg-background hover:bg-border text-text-secondary font-black rounded-lg h-9"
                                                    >
                                                      <Plus size={16} className="mr-2" /> {t.workspace_setup.add_unplugged}
                                                    </Button>
                                                  </div>
                                                  
                                                  <div className="space-y-4 pb-2">
                                                    {fields.map((field, index) => (
                                                      <div key={field.id} className="p-5 bg-background/60 border border-border rounded-2xl space-y-5 relative animate-in slide-in-from-top-4 duration-300">
                                                        <div className="flex items-center justify-between">
                                                          <span className="text-[10px] font-black text-text-muted tracking-widest uppercase">Block #{index + 1}</span>
                                                          <button type="button" onClick={() => remove(index)} className="text-text-muted hover:text-danger transition-colors active:scale-75">
                                                            <X size={16} />
                                                          </button>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Input {...workspaceForm.register(`unplugged_times.${index}.label` as const)} placeholder={t.workspace_setup.unplugged_label_placeholder} className="bg-surface-elevated border-border h-11 rounded-xl px-4 font-bold" />
                                                            {workspaceForm.formState.errors.unplugged_times?.[index]?.label && (
                                                                <p className="text-[10px] text-danger font-bold pl-1">{workspaceForm.formState.errors.unplugged_times[index]?.label?.message}</p>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                          <Input type="time" {...workspaceForm.register(`unplugged_times.${index}.start_time` as const)} className="bg-surface-elevated border-border h-11 rounded-xl font-bold [color-scheme:dark]" />
                                                          <div className="space-y-1">
                                                            <Input type="time" {...workspaceForm.register(`unplugged_times.${index}.end_time` as const)} className="bg-surface-elevated border-border h-11 rounded-xl font-bold [color-scheme:dark]" />
                                                            {workspaceForm.formState.errors.unplugged_times?.[index]?.end_time && (
                                                                <p className="text-[10px] text-danger font-bold pl-1">{workspaceForm.formState.errors.unplugged_times[index]?.end_time?.message}</p>
                                                            )}
                                                          </div>
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                          
                                                <Separator className="bg-border" />
                          
                                                <div className="space-y-3">
                                                  <Label className="text-xs font-black text-text-muted uppercase tracking-widest">{t.workspace_setup.role_intro}</Label>
                                                  <textarea 
                                                    {...workspaceForm.register("role_intro")}
                                                    placeholder={t.workspace_setup.role_placeholder}
                                                    className="w-full min-h-[140px] bg-background border-border rounded-2xl p-5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-white/10 placeholder:text-text-muted font-bold leading-relaxed shadow-inner"
                                                  />
                                                </div>
                                              </form>
                                            </div>
                          
                                            <DialogFooter className="p-8 pt-4 pb-8 border-t border-border bg-surface-elevated shrink-0">
                                              <Button type="submit" form="ws-form" className="w-full bg-text-primary text-background hover:bg-zinc-200 font-black h-12 rounded-xl text-md transition-all shadow-xl shadow-black/20 active:scale-95">
                                                {t.workspace_setup.submit_btn}
                                              </Button>
                                            </DialogFooter>
                                          </DialogContent>
                                        </Dialog>
                                      </div>
                                    )}
                                  </main>
                                )}
                              </div>
                              <DragOverlay dropAnimation={{
        sideEffects: defaultDropAnimationSideEffects({
          styles: {
            active: {
              opacity: '0.4',
            },
          },
        }),
      }}>
        {activeId ? (
          activeId.startsWith('inbox-') ? (
            <div className="w-64 opacity-90 scale-105">
              <InboxItem 
                task={inboxTasks.find(t => `inbox-${t.id}` === activeId)} 
                onMoveToTimeline={() => {}}
                onDelete={() => {}}
              />
            </div>
          ) : (
            <div className="w-[calc(100vw-350px)] opacity-90 scale-105">
              <SortableItem 
                block={timeline.find(b => b.id.toString() === activeId)}
                timeline={timeline}
                currentTime={currentTime}
                t={t}
                onTransition={() => {}}
                onMoveToInbox={() => {}}
                onDelete={() => {}}
                hoverTaskId={null}
                setHoverTaskId={() => {}}
              />
            </div>
          )
        ) : null}
      </DragOverlay>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] ${toast.type === "success" ? "bg-emerald-600 border-emerald-500/50" : "bg-red-500 border-red-400/50"} text-text-primary px-6 py-3 rounded-2xl shadow-2xl font-black text-sm flex items-center gap-3 border`}
          >
            {toast.type === "success" ? <Sparkles size={18} /> : <AlertCircle size={18} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
      </TooltipProvider>
    </DndContext>
  );
}

export default App;
