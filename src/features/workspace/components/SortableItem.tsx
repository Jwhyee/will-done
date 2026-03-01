import { GripVertical, Pencil, X, AlertTriangle, Inbox } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TimeBlock } from "@/types";

interface SortableItemProps {
  block: TimeBlock;
  timeline: TimeBlock[];
  currentTime: Date;
  t: any;
  onTransition: (block: TimeBlock) => void;
  onMoveToInbox: (id: number) => void;
  onDelete: (id: number) => void;
  hoverTaskId: number | null;
  setHoverTaskId: (id: number | null) => void;
}

const formatDisplayTime = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

export const SortableItem = ({ 
  block, 
  timeline, 
  currentTime, 
  t, 
  onTransition, 
  onMoveToInbox, 
  onDelete, 
  hoverTaskId, 
  setHoverTaskId 
}: SortableItemProps) => {
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
    zIndex: isDragging ? 50 : (hoverTaskId === block.taskId ? 10 : 1),
    opacity: isDragging ? 0.6 : 1,
    scale: isDragging ? 1.05 : 1,
    boxShadow: isDragging ? "0 20px 40px rgba(0,0,0,0.5), 0 0 20px rgba(59,130,246,0.3)" : undefined,
  };

  const taskBlocks = block.taskId ? timeline.filter((b) => b.taskId === block.taskId) : [];
  const blockIndexInTask = taskBlocks.findIndex((b) => b.id === block.id);
  const isSplit = taskBlocks.length > 1;
  const isFirstOfTask = isSplit && blockIndexInTask === 0;
  const isLastOfTask = isSplit && blockIndexInTask === taskBlocks.length - 1;
  const isMiddleOfTask = isSplit && blockIndexInTask > 0 && blockIndexInTask < taskBlocks.length - 1;

  const isPending = block.status === "PENDING";
  const isHovered = block.taskId && hoverTaskId === block.taskId;
  const isDone = block.status === "DONE";

  return (
    <div ref={setNodeRef} style={style} className="relative group/item">
      <div className="absolute -left-[6.5rem] top-6 w-16 text-right space-y-1">
        <p className="text-[10px] font-black font-mono text-text-muted group-hover/item:text-text-secondary transition-colors">{formatDisplayTime(block.startTime)}</p>
      </div>
      
      {/* Timeline Line - Improved visibility and centering */}
      <div className={`absolute -left-16 top-4 w-[2px] bottom-[-24px] bg-border z-0 group-last/item:hidden -translate-x-1/2`} />

      {/* Status Indicator Dot - Improved centering and contrast */}
      <div className={`absolute -left-16 top-1 w-4 h-4 rounded-full border-2 bg-background z-10 transition-all duration-500 -translate-x-1/2 ${
        block.status === "DONE" ? "border-success bg-success/20 shadow-[0_0_10px_rgba(34,197,94,0.2)]" :
        block.status === "NOW" ? "border-accent scale-125 shadow-[0_0_15px_rgba(59,130,246,0.5)] bg-accent/30" :
        block.status === "PENDING" ? "border-warning bg-warning/20 shadow-[0_0_10px_rgba(234,179,8,0.2)]" :
        block.status === "UNPLUGGED" ? "border-border bg-surface-elevated" : "border-border"
      }`} />

      {isSplit && blockIndexInTask < taskBlocks.length - 1 && (
        <div className={`absolute right-[-10px] top-8 bottom-[-24px] w-[3px] rounded-full z-0 transition-colors duration-300 ${isHovered ? "bg-text-primary/40 shadow-[0_0_10px_rgba(255,255,255,0.2)]" : "bg-surface-elevated"}`} />
      )}

      <div 
        onMouseEnter={() => block.taskId && setHoverTaskId(block.taskId)}
        onMouseLeave={() => setHoverTaskId(null)}
        className={`p-5 rounded-2xl border-[1.5px] transition-all duration-300 transform ${
        block.status === "DONE" ? "bg-success/5 border-success/20 opacity-60" :
        block.status === "NOW" ? (new Date(block.endTime) < currentTime ? "bg-danger/10 border-danger animate-breathing" : "bg-accent/5 border-accent shadow-[0_0_15px_rgba(59,130,246,0.1)]") :
        block.status === "PENDING" ? "bg-warning/5 border-warning/40 opacity-80" :
        block.status === "UNPLUGGED" ? "bg-surface/40 border-border opacity-40 cursor-default" : "bg-surface-elevated/50 border-border hover:bg-surface-elevated"
      } ${isHovered ? "border-text-primary/40 bg-surface-elevated/80 -translate-x-1 shadow-[0_0_30px_rgba(255,255,255,0.05)] scale-[1.01] opacity-100" : ""} ${isSplit ? "shadow-sm" : ""} ${isFirstOfTask ? "mb-1" : ""} ${isLastOfTask ? "mt-1" : ""} ${isMiddleOfTask ? "my-1" : ""}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {!isDone && (
              <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
                <GripVertical size={14} className={`transition-opacity duration-300 ${isHovered || isDragging ? "text-text-primary opacity-100" : "text-text-muted opacity-40"}`} />
              </div>
            )}
            {isDone && <div className="w-[14px]" />} {/* Spacer for layout consistency */}
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                  {block.isUrgent && <AlertTriangle size={14} className="text-danger fill-danger/20" />}
                  <h4 className={`text-[15px] font-semibold tracking-tight transition-colors duration-300 ${block.status === "UNPLUGGED" ? "text-text-muted" : (isHovered ? "text-text-primary" : "text-text-secondary")}`}>{block.title}</h4>
                </div>
                <div className="flex items-center space-x-2">
                    <span className={`text-[12px] font-black uppercase tracking-widest ${block.status === "NOW" ? "text-accent" : (isDone ? "text-success" : "text-text-muted")}`}>{block.status}</span>
                    <span className="text-[12px] font-mono font-bold text-text-secondary bg-surface px-2 py-0.5 rounded-md border border-border/50">
                      {formatDisplayTime(block.startTime)} - {formatDisplayTime(block.endTime)}
                    </span>
                    {block.status === "NOW" && new Date(block.endTime) < currentTime && (
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
          <div className="flex items-center space-x-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveToInbox(block.id);
                    }}
                    className={`h-9 w-9 p-0 rounded-xl transition-all duration-300 border ${isHovered ? "bg-surface-elevated text-text-primary border-border shadow-lg scale-110" : "bg-surface-elevated/40 text-text-secondary border-border/30 hover:border-border/80"}`}
                  >
                    <Inbox size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-surface-elevated border-border text-text-primary font-bold text-xs rounded-xl">
                  {t.main.tooltip?.move_to_inbox || "인박스로 이동"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      disabled={isSplit && !isLastOfTask}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTransition(block);
                      }}
                      className={`h-9 w-9 p-0 rounded-xl transition-all duration-300 border ${isHovered && !(isSplit && !isLastOfTask) ? "bg-surface-elevated text-text-primary border-border shadow-lg scale-110" : "bg-surface-elevated/40 text-text-secondary border-border/30 hover:border-border/80"} disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                      <Pencil size={16} />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="bg-surface-elevated border-border text-text-primary font-bold text-xs rounded-xl">
                  {isSplit && !isLastOfTask ? (t.main.tooltip?.edit_disabled || "분할된 이전 블록은 수정할 수 없습니다.") : (t.main.tooltip?.edit || "수정")}
                </TooltipContent>
              </Tooltip>

              {block.taskId !== null && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(block.taskId!);
                      }}
                      className={`h-9 w-9 p-0 rounded-xl transition-all duration-300 border ${isHovered ? "bg-danger/20 text-danger border-danger/40 shadow-lg shadow-danger/10 scale-110" : "bg-surface-elevated/40 text-text-secondary border-border/30 hover:border-danger/40 hover:text-danger"}`}
                    >
                      <X size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-surface-elevated border-border text-text-primary font-bold text-xs rounded-xl">
                    {t.main.tooltip?.delete || "삭제"}
                  </TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>

  );

};
