import { format } from "date-fns";
import { Rocket, Plus } from "lucide-react";
import { TimeBlock, Task, User } from "@/types";
import { TransitionModal } from "./components/TransitionModal";
import { EditTaskModal } from "./components/EditTaskModal";
import { useWorkspace } from "./hooks/useWorkspace";
import { WorkspaceHeader } from "./components/WorkspaceHeader";
import { WorkspaceTimeline } from "./components/WorkspaceTimeline";
import { WorkspaceInbox } from "./components/WorkspaceInbox";
import { WorkspaceDialogs } from "./components/WorkspaceDialogs";
import { Button } from "@/components/ui/button";

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
  onMoveToInbox: (blockId: number) => Promise<void>;
  onDeleteTask: (taskId: number) => Promise<void>;
  onHandleSplitTaskDeletion: (taskId: number, keepPast: boolean) => Promise<void>;
  onMoveAllToTimeline: () => Promise<void>;
  onMoveToTimeline: (taskId: number) => Promise<void>;
  onOpenRetrospective: () => void;
  onCreateWorkspace: () => void;
  transitionBlock: TimeBlock | null;
  setTransitionBlock: (block: TimeBlock | null) => void;
}

export const WorkspaceView = ({
  t,
  user,
  workspacesCount,
  greeting,
  currentTime,
  logicalDate,
  selectedDate,
  onDateChange,
  timeline,
  inboxTasks,
  activeWorkspaceId,
  onTaskSubmit,
  onEditTaskSubmit,
  onTransition,
  onMoveToInbox,
  onDeleteTask,
  onHandleSplitTaskDeletion,
  onMoveAllToTimeline,
  onMoveToTimeline,
  onOpenRetrospective,
  onCreateWorkspace,
  transitionBlock,
  setTransitionBlock,
}: WorkspaceViewProps) => {
  const {
    hoverTaskId,
    setHoverTaskId,
    deleteTaskProps,
    setDeleteTaskProps,
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
    handleEditTaskSubmit,
    editTaskBlock,
    setEditTaskBlock,
    calculateProgress,
  } = useWorkspace({
    t,
    user,
    currentTime,
    timeline,
    onTaskSubmit,
    onEditTaskSubmit,
  });

  const dailyProgress = calculateProgress();
  const isPastView = !!selectedDate && format(selectedDate, "yyyy-MM-dd") !== format(logicalDate, "yyyy-MM-dd");

  if (workspacesCount === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background p-8 text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-surface rounded-3xl flex items-center justify-center shadow-2xl border border-border/50">
          <Rocket size={48} className="text-text-primary animate-bounce" />
        </div>

        <div className="space-y-4 max-w-md">
          <h1 className="text-3xl font-black tracking-tighter text-text-primary leading-tight">
            {t.workspace_setup?.welcome || "환영합니다!"}
          </h1>
          <p className="text-lg font-medium text-text-secondary leading-relaxed whitespace-pre-line">
            {t.workspace_setup?.empty_desc || "아직 워크스페이스가 없습니다.\n좌측 사이드바의 + 버튼을 눌러 첫 번째 워크스페이스를 생성하고 업무를 시작해보세요."}
          </p>
        </div>

        <Button
          onClick={onCreateWorkspace}
          className="bg-text-primary text-background hover:bg-zinc-200 font-bold h-14 px-8 rounded-2xl text-lg transition-all shadow-xl shadow-black/20 active:scale-95 flex items-center gap-2"
        >
          <Plus size={20} />
          {t.workspace_setup?.create_btn || "워크스페이스 생성하기"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background relative">
      <WorkspaceHeader
        t={t}
        user={user}
        greeting={greeting}
        currentTime={currentTime}
        logicalDate={logicalDate}
        selectedDate={selectedDate}
        onDateChange={onDateChange}
        activeWorkspaceId={activeWorkspaceId}
        dailyProgress={dailyProgress}
        inboxTasksCount={inboxTasks.length}
        taskForm={taskForm}
        onTaskSubmit={handleTaskSubmit}
        onTaskError={handleTaskError}
        onOpenInbox={() => setIsInboxOpen(true)}
        onOpenRetrospective={onOpenRetrospective}
        isPastView={isPastView}
      />

      <WorkspaceTimeline
        t={t}
        timeline={timeline}
        inboxTasksCount={inboxTasks.length}
        currentTime={currentTime}
        onTransition={setTransitionBlock}
        onEditTask={setEditTaskBlock}
        onMoveToInbox={onMoveToInbox}
        onDelete={(id, isSplit) => {
          const block = timeline.find((b) => b.taskId === id);
          if (block) {
            setDeleteTaskProps({ id, title: block.title, status: block.status });
            setIsSplitDelete(isSplit);
          }
        }}
        onMoveAllConfirm={() => setMoveAllConfirm(true)}
        hoverTaskId={hoverTaskId}
        setHoverTaskId={setHoverTaskId}
        isPastView={isPastView}
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
        deleteTaskProps={deleteTaskProps}
        isSplitDelete={isSplitDelete}
        moveAllConfirm={moveAllConfirm}
        exceededConfirm={exceededConfirm}
        onDeleteCancel={() => {
          setDeleteTaskProps(null);
          setIsSplitDelete(false);
        }}
        onDeleteConfirm={async (id) => {
          await onDeleteTask(id);
          setDeleteTaskProps(null);
        }}
        onSplitDeleteConfirm={async (id, keepPast) => {
          await onHandleSplitTaskDeletion(id, keepPast);
          setDeleteTaskProps(null);
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
        currentTime={currentTime}
      />

      <EditTaskModal
        t={t}
        editTaskBlock={editTaskBlock}
        onClose={() => setEditTaskBlock(null)}
        onEditTaskSubmit={handleEditTaskSubmit}
      />
    </div>
  );
};
