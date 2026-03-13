import { ChevronUp, ChevronsUp, ChevronDown, ChevronsDown, Pencil, X, AlertTriangle, Inbox } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TimeBlock } from "@/types";

interface SortableItemProps {
  block: TimeBlock;
  timeline: TimeBlock[];
  currentTime: Date;
  t: any;
  onTransition: (block: TimeBlock) => void;
  onEditTask: (block: TimeBlock) => void;
  onMoveToInbox: (id: number) => void;
  onDelete: (id: number) => void;
  hoverTaskId: number | null;
  setHoverTaskId: (id: number | null) => void;
  isPastView: boolean;
  coreTimeStart?: string | null;
  coreTimeEnd?: string | null;
  overId: string | null;
  onMoveTaskStep: (blockId: number, direction: "up" | "down") => Promise<void>;
  onMoveTaskToPriority: (blockId: number) => Promise<void>;
  onMoveTaskToBottom: (blockId: number) => Promise<void>;
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
  onEditTask,
  onMoveToInbox,
  onDelete,
  hoverTaskId,
  setHoverTaskId,
  isPastView,
  coreTimeStart,
  coreTimeEnd,
  overId,
  onMoveTaskStep,
  onMoveTaskToPriority,
  onMoveTaskToBottom,
}: SortableItemProps) => {
  const isInCoreTime = (startTime: string, endTime: string) => {
    if (!coreTimeStart || !coreTimeEnd) return false;

    const blockStart = new Date(startTime);
    const blockEnd = new Date(endTime);

    // Get minutes since start of day for comparison
    const getMinutes = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const coreStartMin = getMinutes(coreTimeStart);
    const coreEndMin = getMinutes(coreTimeEnd);

    const blockStartMin = blockStart.getHours() * 60 + blockStart.getMinutes();
    const blockEndMin = blockEnd.getHours() * 60 + blockEnd.getMinutes();

    // Check overlap
    return blockStartMin < coreEndMin && blockEndMin > coreStartMin;
  };

  const isCore = isInCoreTime(block.startTime, block.endTime);
  const taskBlocks = block.taskId ? timeline.filter((b) => b.taskId === block.taskId) : [];
  const blockIndexInTask = taskBlocks.findIndex((b) => b.id === block.id);
  const isSplit = taskBlocks.length > 1;
  const isFirstOfTask = isSplit && blockIndexInTask === 0;
  const isLastOfTask = isSplit && blockIndexInTask === taskBlocks.length - 1;
  const isMiddleOfTask = isSplit && blockIndexInTask > 0 && blockIndexInTask < taskBlocks.length - 1;

  const isPending = block.status === "PENDING";
  const isContinued = block.status === "CONTINUED";
  const {
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: block.id.toString(), 
    disabled: block.status === "UNPLUGGED" || block.status === "DONE" || isContinued || (isSplit && !isLastOfTask) 
  });

  const isOver = overId === block.id.toString();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : (hoverTaskId === block.taskId ? 10 : 1),
    opacity: isDragging ? 0.6 : 1,
    scale: isDragging ? 1.05 : 1,
    boxShadow: isDragging ? "0 20px 40px rgba(0,0,0,0.5), 0 0 20px rgba(59,130,246,0.3)" : undefined,
  };
  const isHovered = block.taskId && hoverTaskId === block.taskId;
  const isDone = block.status === "DONE";
  const isNow = block.status === "NOW";
  const remainingBlocks = timeline.filter((b) => b.status !== "DONE" && b.status !== "UNPLUGGED" && b.status !== "CONTINUED");
  const currentIdx = remainingBlocks.findIndex(b => b.id === block.id);
  const isImmediatelyAfterNow = currentIdx > 0 && remainingBlocks[currentIdx - 1].status === "NOW";
  const showControls = !(isDone || isNow || isContinued || block.status === "UNPLUGGED" || (isSplit && !isLastOfTask));

  return (
    <motion.div 
      layout
      ref={setNodeRef} 
      style={style} 
      className="relative group/item" 
      id={`block-${block.id}`}
    >
      {/* Drop Indicator - Visual Placeholder */}
      {isOver && !isDragging && (
        <div className="absolute -top-3 left-0 right-0 h-1 bg-accent rounded-full z-50 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
      )}
      <div className="absolute -left-28 top-[31px] w-14 -translate-y-1/2 text-center">
        <p className="text-[10px] font-black font-mono text-text-muted group-hover/item:text-text-secondary transition-colors">
          {formatDisplayTime(block.startTime)}
        </p>
      </div>

      {/* Timeline Line - Improved visibility and centering */}
      <div className={`absolute -left-12 top-[31px] w-[2px] bottom-[-55px] z-0 group-last/item:hidden -translate-x-1/2 ${isCore ? "bg-accent shadow-[0_0_10px_rgba(59,130,246,0.6)]" : "bg-border"}`} />

      {/* Status Indicator Dot - Improved centering and contrast */}
      <div className={`absolute -left-12 top-[31px] w-3 h-3 rounded-full border-2 bg-background z-10 transition-all duration-500 -translate-x-1/2 -translate-y-1/2 ${block.status === "DONE" ? "border-success bg-success/20 shadow-[0_0_10px_rgba(34,197,94,0.3)]" :
        block.status === "NOW" ? "border-accent scale-125 shadow-[0_0_15px_rgba(59,130,246,0.6)] bg-accent/30" :
          isContinued ? "border-accent/40 bg-accent/10 shadow-[0_0_5px_rgba(59,130,246,0.2)]" :
            isCore ? "border-accent scale-110 shadow-[0_0_12px_rgba(59,130,246,0.5)] bg-accent/40" :
              block.status === "PENDING" ? "border-warning bg-warning/20 shadow-[0_0_10px_rgba(234,179,8,0.3)]" :
                block.status === "UNPLUGGED" ? "border-border bg-surface-elevated" : "border-border"
        }`} />

      {isSplit && blockIndexInTask < taskBlocks.length - 1 && (
        <div className={`absolute right-[-10px] top-8 bottom-[-24px] w-[3px] rounded-full z-0 transition-colors duration-300 ${isHovered ? "bg-text-primary/40 shadow-[0_0_10px_rgba(255,255,255,0.2)]" : "bg-surface-elevated"}`} />
      )}

      <div
        onMouseEnter={() => block.taskId && setHoverTaskId(block.taskId)}
        onMouseLeave={() => setHoverTaskId(null)}
        className={`p-5 rounded-2xl border-[1.5px] transition-all duration-300 transform ${block.status === "DONE" ? "bg-success/5 border-success/20 opacity-60" :
          block.status === "NOW" ? (new Date(block.endTime) < currentTime ? "bg-danger/10 border-danger animate-breathing shadow-[0_0_20px_rgba(239,68,68,0.1)]" : "bg-accent/10 border-accent animate-breathing-accent shadow-[0_0_20px_rgba(59,130,246,0.15)]") :
            isContinued ? "bg-accent/5 border-accent/20 opacity-50" :
              isCore ? "bg-accent/5 border-accent/40 shadow-[0_0_15px_rgba(59,130,246,0.05)]" :
                block.status === "PENDING" ? "bg-warning/5 border-warning/40 opacity-80" :
                  block.status === "UNPLUGGED" ? "bg-surface/40 border-border opacity-40 cursor-default" : "bg-surface-elevated/50 border-border hover:bg-surface-elevated"
          } ${isHovered ? "border-text-primary/40 bg-surface-elevated/80 -translate-x-1 shadow-[0_0_30px_rgba(255,255,255,0.05)] scale-[1.01] opacity-100" : ""} ${isSplit ? "shadow-sm" : ""} ${isFirstOfTask ? "mb-1" : ""} ${isLastOfTask ? "mt-1" : ""} ${isMiddleOfTask ? "my-1" : ""}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {showControls && (
              <div className="flex flex-col -space-y-1.5 mr-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5 p-0 hover:bg-accent/20 text-text-muted hover:text-accent transition-colors" 
                        onClick={(e) => { e.stopPropagation(); onMoveTaskToPriority(block.id); }}
                      >
                        <ChevronsUp size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="bg-surface-elevated border-border text-text-primary font-bold text-xs rounded-xl">
                      NOW 다음으로 이동
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        disabled={isImmediatelyAfterNow}
                        className={`h-5 w-5 p-0 hover:bg-accent/20 text-text-muted hover:text-text-primary transition-colors disabled:opacity-30`}
                        onClick={(e) => { e.stopPropagation(); onMoveTaskStep(block.id, "up"); }}
                      >
                        <ChevronUp size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="bg-surface-elevated border-border text-text-primary font-bold text-xs rounded-xl">
                      {isImmediatelyAfterNow ? "현재 진행 중인 업무 위로 이동할 수 없습니다." : "위로 이동"}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5 p-0 hover:bg-accent/20 text-text-muted hover:text-text-primary transition-colors" 
                        onClick={(e) => { e.stopPropagation(); onMoveTaskStep(block.id, "down"); }}
                      >
                        <ChevronDown size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="bg-surface-elevated border-border text-text-primary font-bold text-xs rounded-xl">
                      아래로 이동
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5 p-0 hover:bg-accent/20 text-text-muted hover:text-accent transition-colors" 
                        onClick={(e) => { e.stopPropagation(); onMoveTaskToBottom(block.id); }}
                      >
                        <ChevronsDown size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="bg-surface-elevated border-border text-text-primary font-bold text-xs rounded-xl">
                      가장 아래로 이동
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
            {!showControls && block.status !== "UNPLUGGED" && <div className="w-[24px]" />}
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                {block.isUrgent && <AlertTriangle size={14} className="text-danger fill-danger/20" />}
                <h4 className={`text-[15px] font-semibold tracking-tight transition-colors duration-300 ${block.status === "UNPLUGGED" ? "text-text-muted" : (isHovered ? "text-text-primary" : "text-text-secondary")}`}>
                  {block.projectName && <span className="text-text-muted mr-2 font-bold">[{block.projectName}]</span>}
                  {block.title}
                </h4>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-[12px] font-black uppercase tracking-widest ${block.status === "NOW" ? "text-accent" : (isContinued ? "text-accent/50" : (isDone ? "text-success" : "text-text-muted"))}`}>{isContinued ? "NOW" : block.status}</span>
                <span className="text-[12px] font-mono font-bold text-text-secondary bg-surface px-2 py-0.5 rounded-md border border-border/50">
                  {formatDisplayTime(block.startTime)} - {formatDisplayTime(block.endTime)}
                </span>
                {block.labelName && (
                  <>
                    <span className="text-text-muted text-[10px] opacity-40">|</span>
                    <span 
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border"
                      style={{
                        color: block.labelColor || "#808080",
                        borderColor: block.labelColor || "#808080",
                        backgroundColor: `${block.labelColor || "#808080"}33`,
                      }}
                    >
                      {block.labelName}
                    </span>
                  </>
                )}
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
            {!(isSplit && !isLastOfTask) && block.status !== "UNPLUGGED" && (
              <TooltipProvider>
                {/* INBOX (WILL only) */}
                {!isNow && !isDone && !isPastView && (
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
                      {t.main.tooltip.move_to_inbox}
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* EDIT (ALL) */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditTask(block);
                        }}
                        className={`h-9 w-9 p-0 rounded-xl transition-all duration-300 border ${isHovered ? "bg-surface-elevated text-text-primary border-border shadow-lg scale-110" : "bg-surface-elevated/40 text-text-secondary border-border/30 hover:border-border/80"} disabled:opacity-30 disabled:cursor-not-allowed`}
                      >
                        <Pencil size={16} />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="bg-surface-elevated border-border text-text-primary font-bold text-xs rounded-xl">
                    {t.main.tooltip.edit}
                  </TooltipContent>
                </Tooltip>

                {/* COMPLETE (NOW only) */}
                {isNow && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTransition(block);
                          }}
                          className={`h-9 w-9 p-0 rounded-xl transition-all duration-300 border ${isHovered ? "bg-success/20 text-success border-success/40 shadow-lg scale-110" : "bg-surface-elevated/40 text-text-secondary border-border/30 hover:border-success/40 hover:text-success"}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="bg-surface-elevated border-border text-text-primary font-bold text-xs rounded-xl">
                      {t.main.tooltip.complete}
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* DELETE (NOW or WILL) */}
                {!isDone && block.taskId !== null && (
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
                      {t.main.tooltip.delete}
                    </TooltipContent>
                  </Tooltip>
                )}
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>
    </motion.div>

  );

};
