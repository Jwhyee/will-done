import { Inbox, Settings, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { DroppableArea } from "@/features/workspace/components/DroppableArea";
import { InboxItem } from "@/features/workspace/components/InboxItem";
import { Task, User } from "@/types";
import { cn } from "@/lib/utils";

interface SecondarySidebarProps {
  t: any;
  user: User | null;
  inboxTasks: Task[];
  onMoveToTimeline: (taskId: number) => void;
  onDeleteTask: (id: number) => void;
  onOpenSettings: () => void;
  onOpenRetrospective: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
}

export const SecondarySidebar = ({
  t,
  user,
  inboxTasks,
  onMoveToTimeline,
  onDeleteTask,
  onOpenSettings,
  onOpenRetrospective,
  isCollapsed,
  setIsCollapsed,
}: SecondarySidebarProps) => {
  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col h-full">
        {/* Toggle Button */}
        <div className={cn(
          "py-3 px-4 flex items-center border-b border-border/50",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <Inbox size={14} className="text-accent" />
              <h3 className="text-[10px] font-black text-text-primary uppercase tracking-widest">
                {t.sidebar.inbox}
              </h3>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-7 w-7 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-all"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>
        </div>

        {/* Inbox Section */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!isCollapsed ? (
            <ScrollArea className="flex-1 px-3 py-2">
              <DroppableArea id="inbox" className="space-y-2 min-h-[100px]">
                <SortableContext 
                  items={inboxTasks.map(t => `inbox-${t.id}`)}
                  strategy={verticalListSortingStrategy}
                >
                  {inboxTasks.length === 0 ? (
                    <div className="p-6 border-2 border-dashed border-border/40 bg-background/20 rounded-2xl text-center">
                      <p className="text-[10px] text-text-muted font-bold italic">{t.sidebar.no_tasks}</p>
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
          ) : (
            <div className="flex flex-col items-center py-4 space-y-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Inbox size={20} className="text-text-muted" />
                    {inboxTasks.length > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[8px] font-black text-text-primary">
                        {inboxTasks.length}
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-surface-elevated border-border text-text-primary font-bold text-xs rounded-xl">
                  {t.sidebar.inbox} ({inboxTasks.length})
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className={cn(
          "p-3 border-t border-border/50 space-y-1.5",
          isCollapsed && "flex flex-col items-center"
        )}>
          {/* Retrospective Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onOpenRetrospective}
                disabled={!user?.geminiApiKey}
                variant="ghost"
                className={cn(
                  "w-full justify-start text-text-secondary hover:text-text-primary hover:bg-border/40 space-x-3 h-11 rounded-xl transition-all group disabled:opacity-30",
                  isCollapsed && "justify-center p-0 h-11 w-11"
                )}
              >
                <Sparkles size={18} className={cn(
                  "text-warning group-hover:scale-110 transition-transform",
                  !user?.geminiApiKey && "text-text-muted"
                )} />
                {!isCollapsed && <span className="font-bold text-sm">회고</span>}
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right" className="bg-surface-elevated border-border text-text-primary font-bold text-xs rounded-xl">
                회고
              </TooltipContent>
            )}
            {!user?.geminiApiKey && (
               <TooltipContent side="right" className="max-w-[200px] bg-surface-elevated border-border text-text-secondary font-bold text-xs p-3 rounded-xl shadow-2xl">
                <p>설정에서 GOOGLE AI STUDIO API KEY를 입력해주세요.</p>
              </TooltipContent>
            )}
          </Tooltip>

          {/* Settings Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onOpenSettings}
                variant="ghost"
                className={cn(
                  "w-full justify-start text-text-secondary hover:text-text-primary hover:bg-border/40 space-x-3 h-11 rounded-xl transition-all group",
                  isCollapsed && "justify-center p-0 h-11 w-11"
                )}
              >
                <Settings size={18} className="group-hover:rotate-45 transition-transform" />
                {!isCollapsed && <span className="font-bold text-sm">{t.sidebar.settings}</span>}
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right" className="bg-surface-elevated border-border text-text-primary font-bold text-xs rounded-xl">
                {t.sidebar.settings}
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};
