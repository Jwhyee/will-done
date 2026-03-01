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

  const zigzagBottom = "polygon(0% 0%, 100% 0%, 100% 92%, 98% 100%, 96% 92%, 94% 100%, 92% 92%, 90% 100%, 88% 92%, 86% 100%, 84% 92%, 82% 100%, 80% 92%, 78% 100%, 76% 92%, 74% 100%, 72% 92%, 70% 100%, 68% 92%, 66% 100%, 64% 92%, 62% 100%, 60% 92%, 58% 100%, 56% 92%, 54% 100%, 52% 92%, 50% 100%, 48% 92%, 46% 100%, 44% 92%, 42% 100%, 40% 92%, 38% 100%, 36% 92%, 34% 100%, 32% 92%, 30% 100%, 28% 92%, 26% 100%, 24% 92%, 22% 100%, 20% 92%, 18% 100%, 16% 92%, 14% 100%, 12% 92%, 10% 100%, 8% 92%, 6% 100%, 4% 92%, 2% 100%, 0% 92%)";
  const zigzagTop = "polygon(0% 8%, 2% 0%, 4% 8%, 6% 0%, 8% 8%, 10% 0%, 12% 8%, 14% 0%, 16% 8%, 18% 0%, 20% 8%, 22% 0%, 24% 8%, 26% 0%, 28% 8%, 30% 0%, 32% 8%, 34% 0%, 36% 8%, 38% 0%, 40% 8%, 42% 0%, 44% 8%, 46% 0%, 48% 8%, 50% 0%, 52% 8%, 54% 0%, 56% 8%, 58% 0%, 60% 8%, 62% 0%, 64% 8%, 66% 0%, 68% 8%, 70% 0%, 72% 8%, 74% 0%, 76% 8%, 78% 0%, 80% 8%, 82% 0%, 84% 8%, 86% 0%, 88% 8%, 90% 0%, 92% 8%, 94% 0%, 96% 8%, 98% 0%, 100% 8%, 100% 100%, 0% 100%)";
  const zigzagBoth = "polygon(0% 8%, 2% 0%, 4% 8%, 6% 0%, 8% 8%, 10% 0%, 12% 8%, 14% 0%, 16% 8%, 18% 0%, 20% 8%, 22% 0%, 24% 8%, 26% 0%, 28% 8%, 30% 0%, 32% 8%, 34% 0%, 36% 8%, 38% 0%, 40% 8%, 42% 0%, 44% 8%, 46% 0%, 48% 8%, 50% 0%, 52% 8%, 54% 0%, 56% 8%, 58% 0%, 60% 8%, 62% 0%, 64% 8%, 66% 0%, 68% 8%, 70% 0%, 72% 8%, 74% 0%, 76% 8%, 78% 0%, 80% 8%, 82% 0%, 84% 8%, 86% 0%, 88% 8%, 90% 0%, 92% 8%, 94% 0%, 96% 8%, 98% 0%, 100% 8%, 100% 92%, 98% 100%, 96% 92%, 94% 100%, 92% 92%, 90% 100%, 88% 92%, 86% 100%, 84% 92%, 82% 100%, 80% 92%, 78% 100%, 76% 92%, 74% 100%, 72% 92%, 70% 100%, 68% 92%, 66% 100%, 64% 92%, 62% 100%, 60% 92%, 58% 100%, 56% 92%, 54% 100%, 52% 92%, 50% 100%, 48% 92%, 46% 100%, 44% 92%, 42% 100%, 40% 92%, 38% 100%, 36% 92%, 34% 100%, 32% 92%, 30% 100%, 28% 92%, 26% 100%, 24% 92%, 22% 100%, 20% 92%, 18% 100%, 16% 92%, 14% 100%, 12% 92%, 10% 100%, 8% 92%, 6% 100%, 4% 92%, 2% 100%, 0% 92%)";

  return (
    <div ref={setNodeRef} style={style} className="relative group/item">
      <div className="absolute -left-[6.5rem] top-6 w-16 text-right space-y-1">
        <p className="text-[10px] font-black font-mono text-text-secondary">{formatDisplayTime(block.startTime)}</p>
      </div>
      
      <div className={`absolute -left-16 top-4 w-[2px] bottom-[-24px] bg-border/50 z-0 group-last/item:hidden -translate-x-1/2`} />

      <div className={`absolute -left-16 top-1 w-4 h-4 rounded-full border-2 bg-surface z-10 transition-all duration-300 -translate-x-1/2 ${
        block.status === "DONE" ? "border-success bg-success/20" :
        block.status === "NOW" ? "border-accent scale-125 shadow-[0_0_10px_rgba(59,130,246,0.5)] bg-accent/20" :
        block.status === "PENDING" ? "border-warning bg-warning/20" :
        block.status === "UNPLUGGED" ? "border-border bg-surface-elevated" : "border-border"
      }`} />

      {isSplit && blockIndexInTask < taskBlocks.length - 1 && (
        <div className={`absolute right-[-10px] top-8 bottom-[-24px] w-[3px] rounded-full z-0 transition-colors duration-300 ${isHovered ? "bg-text-primary/40 shadow-[0_0_10px_rgba(255,255,255,0.2)]" : "bg-surface-elevated"}`} />
      )}

      <div 
        onMouseEnter={() => block.taskId && setHoverTaskId(block.taskId)}
        onMouseLeave={() => setHoverTaskId(null)}
        className={`p-5 rounded-2xl border-[1.5px] transition-all duration-300 transform ${
        block.status === "DONE" ? "bg-success/5 border-success/20" :
        block.status === "NOW" ? (new Date(block.endTime) < currentTime ? "bg-danger/10 border-danger animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.2)]" : "bg-accent/5 border-accent shadow-[0_0_15px_rgba(59,130,246,0.1)]") :
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
            {!isDone && (
              <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
                <GripVertical size={14} className={`transition-opacity duration-300 ${isHovered || isDragging ? "text-text-primary opacity-100" : "text-text-muted opacity-20"}`} />
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
                    <span className="text-[12px] font-mono font-bold text-text-muted bg-background/50 px-2 py-0.5 rounded-md">
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
                    className={`h-9 w-9 p-0 rounded-xl transition-all duration-300 border border-transparent ${isHovered ? "bg-surface-elevated text-text-primary border-border/50 shadow-lg" : "bg-surface text-text-muted hover:text-text-primary"}`}
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
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onTransition(block);
                    }}
                    className={`h-9 w-9 p-0 rounded-xl transition-all duration-300 border border-transparent ${isHovered ? "bg-surface-elevated text-text-primary border-border/50 shadow-lg" : "bg-surface text-text-muted hover:text-text-primary"}`}
                  >
                    <Pencil size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-surface-elevated border-border text-text-primary font-bold text-xs rounded-xl">
                  {t.main.tooltip?.edit || "수정"}
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
                      className={`h-9 w-9 p-0 rounded-xl transition-all duration-300 border border-transparent ${isHovered ? "bg-danger/20 text-danger border-danger/20" : "bg-surface text-text-muted hover:text-text-primary"}`}
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
