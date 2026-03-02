import { Inbox } from "lucide-react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Task } from "@/types";
import { DroppableArea } from "./DroppableArea";
import { InboxItem } from "./InboxItem";

interface WorkspaceInboxProps {
  t: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  inboxTasks: Task[];
  onMoveToTimeline: (taskId: number) => Promise<void>;
  onDeleteTask: (taskId: number) => Promise<void>;
  onMoveAllConfirm: () => void;
}

export const WorkspaceInbox = ({
  t,
  isOpen,
  onOpenChange,
  inboxTasks,
  onMoveToTimeline,
  onDeleteTask,
  onMoveAllConfirm,
}: WorkspaceInboxProps) => {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
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
                  onClick={onMoveAllConfirm}
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
                items={inboxTasks.map((t) => `inbox-${t.id}`)}
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
  );
};
