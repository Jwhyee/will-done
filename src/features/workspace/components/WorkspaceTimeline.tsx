import { Clock, Send } from "lucide-react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { TimeBlock } from "@/types";
import { SortableItem } from "./SortableItem";
import { DroppableArea } from "./DroppableArea";

interface WorkspaceTimelineProps {
  t: any;
  timeline: TimeBlock[];
  inboxTasksCount: number;
  currentTime: Date;
  onTransition: (block: TimeBlock | null) => void;
  onEditTask: (block: TimeBlock) => void;
  onMoveToInbox: (blockId: number) => Promise<void>;
  onDelete: (id: number, isSplit: boolean) => void;
  onMoveAllConfirm: () => void;
  hoverTaskId: number | null;
  setHoverTaskId: (id: number | null) => void;
  isPastView: boolean;
}

export const WorkspaceTimeline = ({
  t,
  timeline,
  inboxTasksCount,
  currentTime,
  onTransition,
  onEditTask,
  onMoveToInbox,
  onDelete,
  onMoveAllConfirm,
  hoverTaskId,
  setHoverTaskId,
  isPastView,
}: WorkspaceTimelineProps) => {
  return (
    <ScrollArea className="flex-1 px-8">
      <div className="py-8 space-y-4">
        {timeline.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-text-secondary space-y-4 border-2 border-dashed border-border rounded-3xl group relative overflow-hidden">
            <Clock
              size={48}
              className="opacity-20 transition-transform group-hover:scale-110 duration-500"
            />
            <div className="text-center space-y-2">
              <p className="font-bold text-sm uppercase tracking-widest opacity-50">
                {t.main.empty_timeline}
              </p>
              {inboxTasksCount > 0 && (
                <Button
                  variant="ghost"
                  onClick={onMoveAllConfirm}
                  className="text-accent hover:text-accent hover:bg-accent/20 font-bold text-xs gap-2 transition-all duration-200 active:scale-95"
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
              items={timeline.map((b) => b.id.toString())}
              strategy={verticalListSortingStrategy}
            >
              {timeline.map((block) => (
                <SortableItem
                  key={block.id === -1 ? `unplugged-${block.startTime}` : block.id}
                  block={block}
                  timeline={timeline}
                  currentTime={currentTime}
                  t={t}
                  onTransition={onTransition}
                  onEditTask={onEditTask}
                  onMoveToInbox={onMoveToInbox}
                  onDelete={(id: number) => {
                    const isSplit = timeline.filter((b) => b.taskId === id).length > 1;
                    onDelete(id, isSplit);
                  }}
                  hoverTaskId={hoverTaskId}
                  setHoverTaskId={setHoverTaskId}
                  isPastView={isPastView}
                />
              ))}
            </SortableContext>
          </DroppableArea>
        )}
      </div>
    </ScrollArea>
  );
};
