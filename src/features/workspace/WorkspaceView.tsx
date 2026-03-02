import { TimeBlock, Task, User } from "@/types";
import { TransitionModal } from "./components/TransitionModal";
import { useWorkspace } from "./hooks/useWorkspace";
import { WorkspaceHeader } from "./components/WorkspaceHeader";
import { WorkspaceTimeline } from "./components/WorkspaceTimeline";
import { WorkspaceInbox } from "./components/WorkspaceInbox";
import { WorkspaceDialogs } from "./components/WorkspaceDialogs";

interface WorkspaceViewProps {
  t: any;
  user: User | null;
  greeting: string;
  currentTime: Date;
  logicalDate: Date;
  timeline: TimeBlock[];
  inboxTasks: Task[];
  onTaskSubmit: (data: any) => Promise<void>;
  onTransition: (block: TimeBlock, action: string, extraMinutes?: number, reviewMemo?: string) => Promise<void>;
  onMoveToInbox: (blockId: number) => Promise<void>;
  onDeleteTask: (taskId: number) => Promise<void>;
  onHandleSplitTaskDeletion: (taskId: number, keepPast: boolean) => Promise<void>;
  onMoveAllToTimeline: () => Promise<void>;
  onMoveToTimeline: (taskId: number) => Promise<void>;
  onOpenRetrospective: () => void;
  transitionBlock: TimeBlock | null;
  setTransitionBlock: (block: TimeBlock | null) => void;
}

export const WorkspaceView = ({
  t,
  user,
  greeting,
  currentTime,
  logicalDate,
  timeline,
  inboxTasks,
  onTaskSubmit,
  onTransition,
  onMoveToInbox,
  onDeleteTask,
  onHandleSplitTaskDeletion,
  onMoveAllToTimeline,
  onMoveToTimeline,
  onOpenRetrospective,
  transitionBlock,
  setTransitionBlock,
}: WorkspaceViewProps) => {
  const {
    hoverTaskId,
    setHoverTaskId,
    deleteTaskId,
    setDeleteTaskId,
    isSplitDelete,
    setIsSplitDelete,
    moveAllConfirm,
    setMoveAllConfirm,
    exceededConfirm,
    setExceededConfirm,
    isInboxOpen,
    setIsInboxOpen,
    taskForm,
    handleTaskSubmit,
    handleTaskError,
    calculateProgress,
  } = useWorkspace({
    t,
    user,
    currentTime,
    timeline,
    onTaskSubmit,
  });

  const dailyProgress = calculateProgress();

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background relative">
      <WorkspaceHeader
        t={t}
        greeting={greeting}
        currentTime={currentTime}
        logicalDate={logicalDate}
        dailyProgress={dailyProgress}
        inboxTasksCount={inboxTasks.length}
        taskForm={taskForm}
        onTaskSubmit={handleTaskSubmit}
        onTaskError={handleTaskError}
        onOpenInbox={() => setIsInboxOpen(true)}
        onOpenRetrospective={onOpenRetrospective}
      />

      <WorkspaceTimeline
        t={t}
        timeline={timeline}
        inboxTasksCount={inboxTasks.length}
        currentTime={currentTime}
        onTransition={setTransitionBlock}
        onMoveToInbox={onMoveToInbox}
        onDelete={(id, isSplit) => {
          setDeleteTaskId(id);
          setIsSplitDelete(isSplit);
        }}
        onMoveAllConfirm={() => setMoveAllConfirm(true)}
        hoverTaskId={hoverTaskId}
        setHoverTaskId={setHoverTaskId}
      />

      <WorkspaceInbox
        t={t}
        isOpen={isInboxOpen}
        onOpenChange={setIsInboxOpen}
        inboxTasks={inboxTasks}
        onMoveToTimeline={onMoveToTimeline}
        onDeleteTask={onDeleteTask}
        onMoveAllConfirm={() => setMoveAllConfirm(true)}
      />

      <WorkspaceDialogs
        t={t}
        userStartTime={user?.dayStartTime}
        deleteTaskId={deleteTaskId}
        isSplitDelete={isSplitDelete}
        moveAllConfirm={moveAllConfirm}
        exceededConfirm={exceededConfirm}
        onDeleteCancel={() => {
          setDeleteTaskId(null);
          setIsSplitDelete(false);
        }}
        onDeleteConfirm={async (id) => {
          await onDeleteTask(id);
          setDeleteTaskId(null);
        }}
        onSplitDeleteConfirm={async (id, keepPast) => {
          await onHandleSplitTaskDeletion(id, keepPast);
          setDeleteTaskId(null);
          setIsSplitDelete(false);
        }}
        onMoveAllCancel={() => setMoveAllConfirm(false)}
        onMoveAllConfirm={async () => {
          await onMoveAllToTimeline();
          setMoveAllConfirm(false);
        }}
        onExceededCancel={() => setExceededConfirm(null)}
        onExceededContinue={handleTaskSubmit}
        onExceededToInbox={async (data) => {
          await onTaskSubmit({ ...data, isInbox: true });
          taskForm.reset({ title: "", hours: 0, minutes: 30, planningMemo: "", isUrgent: false });
          setExceededConfirm(null);
        }}
      />

      <TransitionModal
        t={t}
        transitionBlock={transitionBlock}
        onClose={() => setTransitionBlock(null)}
        onTransition={async (action, extra, memo) => {
          if (transitionBlock) {
            await onTransition(transitionBlock, action, extra, memo);
          }
        }}
      />
    </div>
  );
};
