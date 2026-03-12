import { format } from "date-fns";
import { TimeBlock, Task, User, Workspace } from "@/types";
import { TransitionModal } from "./components/modals/TransitionModal";
import { EditTaskModal } from "./components/modals/EditTaskModal";
import { useWorkspace } from "./hooks/useWorkspace";
import { WorkspaceHeader } from "./components/layout/WorkspaceHeader";
import { WorkspaceTimeline } from "./components/timeline/WorkspaceTimeline";
import { WorkspaceInbox } from "./components/inbox/WorkspaceInbox";
import { WorkspaceDialogs } from "./components/modals/WorkspaceDialogs";
import { WorkspaceEmptyState } from "./components/layout/WorkspaceEmptyState";

interface WorkspaceViewProps {
  t: any;
  user: User | null;
  workspacesCount: number;
  greeting: string;
  currentTime: Date;
  logicalDate: Date;
  selectedDate: Date | null;
  onDateChange: (date: Date | null) => void;
  timeline: TimeBlock[];
  inboxTasks: Task[];
  activeWorkspaceId: number | null;
  onTaskSubmit: (data: any, isInbox?: boolean) => Promise<void>;
  onEditTaskSubmit: (blockId: number, data: any) => Promise<void>;
  onTransition: (block: TimeBlock, action: string, extraMinutes?: number, reviewMemo?: string) => Promise<void>;
  onDismissTransition: (blockId: number) => void;
  onMoveToInbox: (blockId: number) => Promise<void>;
  onDeleteTask: (taskId: number) => Promise<void>;
  onHandleSplitTaskDeletion: (taskId: number, keepPast: boolean) => Promise<void>;
  onMoveAllToTimeline: () => Promise<void>;
  onMoveToTimeline: (taskId: number) => Promise<void>;
  onMoveTaskStep: (blockId: number, direction: "up" | "down") => Promise<void>;
  onMoveTaskToPriority: (blockId: number) => Promise<void>;
  onMoveTaskToBottom: (blockId: number) => Promise<void>;
  onOpenAchievement: () => void;
  onCreateWorkspace: () => void;
  transitionBlock: TimeBlock | null;
  setTransitionBlock: (block: TimeBlock | null) => void;
  workspaces: Workspace[];
  overId: string | null;
}

export const WorkspaceView = ({
  t, user, workspacesCount, greeting, currentTime, logicalDate, selectedDate, onDateChange,
  timeline, inboxTasks, activeWorkspaceId, onTaskSubmit, onEditTaskSubmit, onTransition, onDismissTransition,
  onMoveToInbox, onDeleteTask, onHandleSplitTaskDeletion, onMoveAllToTimeline, onMoveToTimeline,
  onMoveTaskStep, onMoveTaskToPriority, onMoveTaskToBottom,
  onOpenAchievement, onCreateWorkspace, transitionBlock, setTransitionBlock, workspaces, overId,
}: WorkspaceViewProps) => {
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const {
    hoverTaskId, setHoverTaskId, deleteTaskProps, setDeleteTaskProps, isSplitDelete, setIsSplitDelete,
    moveAllConfirm, setMoveAllConfirm, exceededConfirm, setExceededConfirm, isInboxOpen, setIsInboxOpen,
    taskForm, handleTaskSubmit, handleTaskError, handleEditTaskSubmit, editTaskBlock, setEditTaskBlock, calculateProgress,
  } = useWorkspace({ t, user, currentTime, timeline, onTaskSubmit, onEditTaskSubmit });

  const dailyProgress = calculateProgress();
  const isPastView = !!selectedDate && format(selectedDate, "yyyy-MM-dd") !== format(logicalDate, "yyyy-MM-dd");

  if (workspacesCount === 0) return <WorkspaceEmptyState t={t} onCreateWorkspace={onCreateWorkspace} />;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background relative">
      <WorkspaceHeader
        t={t} user={user} greeting={greeting} currentTime={currentTime} logicalDate={logicalDate} selectedDate={selectedDate}
        onDateChange={onDateChange} activeWorkspaceId={activeWorkspaceId} dailyProgress={dailyProgress} inboxTasksCount={inboxTasks.length}
        taskForm={taskForm} onTaskSubmit={handleTaskSubmit} onTaskError={handleTaskError} onOpenInbox={() => setIsInboxOpen(true)}
        onOpenAchievement={onOpenAchievement} isPastView={isPastView}
      />

      <WorkspaceTimeline
        t={t} timeline={timeline} inboxTasksCount={inboxTasks.length} currentTime={currentTime} onTransition={setTransitionBlock}
        onEditTask={setEditTaskBlock} onMoveToInbox={onMoveToInbox} onDelete={(id, isSplit) => {
          const block = timeline.find((b) => b.taskId === id);
          if (block) { setDeleteTaskProps({ id, title: block.title, status: block.status }); setIsSplitDelete(isSplit); }
        }} onMoveAllConfirm={() => setMoveAllConfirm(true)} hoverTaskId={hoverTaskId} setHoverTaskId={setHoverTaskId}
        isPastView={isPastView} coreTimeStart={activeWorkspace?.coreTimeStart} coreTimeEnd={activeWorkspace?.coreTimeEnd}
        overId={overId}
        onMoveTaskStep={onMoveTaskStep}
        onMoveTaskToPriority={onMoveTaskToPriority}
        onMoveTaskToBottom={onMoveTaskToBottom}
      />

      <WorkspaceInbox t={t} isOpen={isInboxOpen} onOpenChange={setIsInboxOpen} inboxTasks={inboxTasks} onMoveToTimeline={onMoveToTimeline} onDeleteTask={onDeleteTask} onMoveAllConfirm={() => setMoveAllConfirm(true)} />

      <WorkspaceDialogs
        t={t} userStartTime={user?.dayStartTime} deleteTaskProps={deleteTaskProps} isSplitDelete={isSplitDelete} moveAllConfirm={moveAllConfirm} exceededConfirm={exceededConfirm}
        onDeleteCancel={() => { setDeleteTaskProps(null); setIsSplitDelete(false); }} onDeleteConfirm={async (id) => { await onDeleteTask(id); setDeleteTaskProps(null); }}
        onSplitDeleteConfirm={async (id, keepPast) => { await onHandleSplitTaskDeletion(id, keepPast); setDeleteTaskProps(null); setIsSplitDelete(false); }}
        onMoveAllCancel={() => setMoveAllConfirm(false)} onMoveAllConfirm={async () => { await onMoveAllToTimeline(); setMoveAllConfirm(false); }}
        onExceededCancel={() => setExceededConfirm(null)} onExceededContinue={handleTaskSubmit} onExceededToInbox={async (data) => {
          await onTaskSubmit(data, true); taskForm.reset({ title: "", hours: 0, minutes: 30, planningMemo: "", isUrgent: false }); setExceededConfirm(null);
        }}
      />

      <TransitionModal
        t={t}
        transitionBlock={transitionBlock}
        onClose={() => {
          if (transitionBlock) onDismissTransition(transitionBlock.id);
          setTransitionBlock(null);
        }}
        onTransition={async (action, extra, memo) => {
          if (transitionBlock) await onTransition(transitionBlock, action, extra, memo);
        }}
        currentTime={currentTime}
      />
      <EditTaskModal t={t} editTaskBlock={editTaskBlock} onClose={() => setEditTaskBlock(null)} onEditTaskSubmit={handleEditTaskSubmit} />
    </div>
  );
};
