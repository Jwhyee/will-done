import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  DndContext,
  closestCenter,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// Internal
import { AppProvider } from "@/providers/AppProvider";
import { Workspace, User } from "@/types";

// Layout & Features
import { MainLayout } from "@/components/layout/MainLayout";
import { PrimarySidebar } from "@/components/layout/PrimarySidebar";
import { OnboardingView } from "@/features/onboarding/OnboardingView";
import { WorkspaceCreateModal } from "@/features/workspace/components/modals/WorkspaceCreateModal";
import { WorkspaceView } from "@/features/workspace/WorkspaceView";
import { RetrospectiveView } from "@/features/retrospective/RetrospectiveView";
import { GlobalSettingsModal } from "@/features/settings/GlobalSettingsModal";
import { WorkspaceSettingsModal } from "@/features/workspace/components/settings/WorkspaceSettingsModal";
import { InboxItem } from "@/features/workspace/components/inbox/InboxItem";
import { SortableItem } from "@/features/workspace/components/timeline/SortableItem";

// Hooks
import { useApp } from "@/hooks/useApp";

function AppContent() {
  const {
    view,
    setView,
    workspaces,
    setWorkspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    user,
    setUser,
    greeting,
    timeline,
    inboxTasks,
    currentTime,
    logicalDate,
    selectedDate,
    setSelectedDate,
    transitionBlock,
    setTransitionBlock,
    retrospectiveOpen,
    setRetrospectiveOpen,
    activeRetrospective,
    setActiveRetrospective,
    activeId,
    overId,
    isWorkspaceCreateModalOpen,
    setIsWorkspaceCreateModalOpen,
    t,
    fetchMainData,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    onTaskSubmit,
    onEditTaskSubmit,
    onTransition,
    onMoveTaskStep,
    onMoveTaskToPriority,
    onMoveTaskToBottom,
  } = useApp();

  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);
  const [isWorkspaceSettingsOpen, setIsWorkspaceSettingsOpen] = useState(false);
  const [settingsWorkspaceId, setSettingsWorkspaceId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const isPastView = !!selectedDate && selectedDate.toDateString() !== logicalDate.toDateString();

  if (view === "loading") {
    return (
      <div className="h-screen flex items-center justify-center bg-surface text-text-primary antialiased font-medium relative">
        <p className="animate-pulse">{t.checking}</p>
      </div>
    );
  }

  const renderView = () => {
    switch (view) {
      case "onboarding":
        return <OnboardingView t={t} onComplete={(u) => { setUser(u); setView("main"); }} />;
      case "retrospective":
        return (activeWorkspaceId && user) ? (
          <RetrospectiveView
            workspaceId={activeWorkspaceId}
            user={user}
            t={t}
            onClose={() => setView("main")}
            onShowSavedRetro={(retro) => {
              setActiveRetrospective(retro);
              setRetrospectiveOpen(true);
            }}
          />
        ) : null;
      case "main":
      default:
        return (
          <MainLayout
            sidebar1={
              <PrimarySidebar
                workspaces={workspaces}
                activeWorkspaceId={activeWorkspaceId}
                onSelectWorkspace={(id) => { setActiveWorkspaceId(id); setView("main"); }}
                onAddWorkspace={() => setIsWorkspaceCreateModalOpen(true)}
                onOpenSettings={() => setIsGlobalSettingsOpen(true)}
                onOpenWorkspaceSettings={(id) => {
                  setSettingsWorkspaceId(id);
                  setIsWorkspaceSettingsOpen(true);
                }}
                t={t}
              />
            }
          >
            <WorkspaceView
              t={t}
              user={user}
              workspacesCount={workspaces.length}
              workspaces={workspaces}
              greeting={greeting}
              currentTime={currentTime}
              logicalDate={logicalDate}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              timeline={timeline}
              inboxTasks={inboxTasks}
              activeWorkspaceId={activeWorkspaceId}
              onTaskSubmit={onTaskSubmit}
              onEditTaskSubmit={onEditTaskSubmit}
              onTransition={onTransition}
              onMoveToInbox={async (blockId) => {
                await invoke("move_to_inbox", { blockId });
                fetchMainData();
              }}
              onDeleteTask={async (taskId) => {
                await invoke("delete_task", { id: taskId });
                fetchMainData();
              }}
              onHandleSplitTaskDeletion={async (taskId, keepPast) => {
                await invoke("handle_split_task_deletion", { taskId, keepPast });
                fetchMainData();
              }}
              onMoveAllToTimeline={async () => {
                if (activeWorkspaceId) {
                  await invoke("move_all_to_timeline", { workspaceId: activeWorkspaceId });
                  fetchMainData();
                }
              }}
              onMoveToTimeline={async (taskId) => {
                if (activeWorkspaceId) {
                  await invoke("move_to_timeline", { taskId, workspaceId: activeWorkspaceId });
                  fetchMainData();
                }
              }}
              onOpenRetrospective={() => setView("retrospective")}
              onCreateWorkspace={() => setIsWorkspaceCreateModalOpen(true)}
              onMoveTaskStep={onMoveTaskStep}
              onMoveTaskToPriority={onMoveTaskToPriority}
              onMoveTaskToBottom={onMoveTaskToBottom}
              transitionBlock={transitionBlock}
              setTransitionBlock={setTransitionBlock}
              overId={overId}
            />
          </MainLayout>
        );
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {/* Global Drag Region */}
      <div
        data-tauri-drag-region
        className="fixed top-0 left-0 right-0 h-8 z-[10000] bg-transparent select-none cursor-grab active:cursor-grabbing"
      />
      {renderView()}

      <DragOverlay dropAnimation={{
        sideEffects: defaultDropAnimationSideEffects({
          styles: { active: { opacity: '0.4' } },
        }),
      }}>
        {activeId ? (
          activeId.startsWith('inbox-') ? (
            <div className="w-64 opacity-90 scale-105">
              <InboxItem
                task={inboxTasks.find(t => `inbox-${t.id}` === activeId)!}
                onMoveToTimeline={() => { }}
                onDelete={() => { }}
              />
            </div>
          ) : (
            <div className="w-[calc(100vw-56px)] opacity-90 scale-105">
              <SortableItem
                block={timeline.find(b => b.id.toString() === activeId)!}
                timeline={timeline}
                currentTime={currentTime}
                t={t}
                onTransition={() => { }}
                onEditTask={() => { }}
                onMoveToInbox={() => { }}
                onDelete={() => { }}
                onMoveTaskStep={onMoveTaskStep}
                onMoveTaskToPriority={onMoveTaskToPriority}
                onMoveTaskToBottom={onMoveTaskToBottom}
                hoverTaskId={null}
                setHoverTaskId={() => { }}
                isPastView={isPastView}
                overId={overId}
              />
            </div>
          )
        ) : null}
      </DragOverlay>

      {/* Global Settings Modal */}
      {user && (
        <GlobalSettingsModal
          user={user}
          isOpen={isGlobalSettingsOpen}
          onClose={() => setIsGlobalSettingsOpen(false)}
          onUserUpdate={async (updatedUser?: User) => {
            const u = updatedUser || await invoke<User>("get_user");
            setUser(u);
          }}
          t={t}
        />
      )}

      {/* Workspace Settings Modal */}
      <WorkspaceSettingsModal
        workspaceId={settingsWorkspaceId}
        isOpen={isWorkspaceSettingsOpen}
        onClose={() => {
          setIsWorkspaceSettingsOpen(false);
          setSettingsWorkspaceId(null);
        }}
        onWorkspaceUpdate={async () => {
          fetchMainData();
          const wsList = await invoke<Workspace[]>("get_workspaces");
          setWorkspaces(wsList);
        }}
        onWorkspaceDelete={async (id) => {
          const wsList = await invoke<Workspace[]>("get_workspaces");
          setWorkspaces(wsList);
          if (wsList.length === 0) {
            setActiveWorkspaceId(null);
          } else if (activeWorkspaceId === id) {
            setActiveWorkspaceId(wsList[0].id);
          }
        }}
        workspaceCount={workspaces.length}
        t={t}
      />

      {/* Workspace Create Modal */}
      <WorkspaceCreateModal
        t={t}
        isOpen={isWorkspaceCreateModalOpen}
        onClose={() => setIsWorkspaceCreateModalOpen(false)}
        onSuccess={async (id) => {
          const wsList = await invoke<Workspace[]>("get_workspaces");
          setWorkspaces(wsList);
          setActiveWorkspaceId(id);
          setIsWorkspaceCreateModalOpen(false);
        }}
        isFirst={workspaces.length === 0}
      />

      {/* Retrospective Content Modal */}
      <Dialog open={retrospectiveOpen} onOpenChange={setRetrospectiveOpen}>
        <DialogContent className="sm:max-w-[700px] h-[85vh] bg-surface-elevated border-border text-text-primary shadow-2xl flex flex-col rounded-2xl p-0 border-t-border/50 overflow-hidden antialiased">
          <DialogHeader className="p-8 pb-4 shrink-0 space-y-3">
            <DialogTitle className="text-2xl font-black tracking-tighter text-text-primary leading-none flex items-center gap-2">
              {activeRetrospective?.dateLabel || "Retrospective"}
            </DialogTitle>
            <DialogDescription className="text-text-secondary text-sm leading-relaxed">
              {t.retrospective.brag_desc}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-8 scrollbar-hide bg-background">
            <div className="py-8 text-sm leading-relaxed prose prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {activeRetrospective?.content || "No retrospective generated yet."}
              </ReactMarkdown>
            </div>
            {activeRetrospective?.usedModel && (
              <div className="pb-8 flex justify-end">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-widest bg-surface px-2 py-1 rounded-md border border-border">
                  {t.retrospective.used_model}: {activeRetrospective.usedModel.replace('models/', '')}
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 border-t border-border bg-surface-elevated shrink-0">
            <Button
              onClick={() => activeRetrospective && navigator.clipboard.writeText(activeRetrospective.content)}
              disabled={!activeRetrospective}
              className="w-full bg-text-primary text-background hover:bg-zinc-200 font-bold h-11 rounded-xl text-sm transition-all shadow-xl shadow-black/20 active:scale-95 disabled:opacity-50"
            >
              {t.retrospective.copy_btn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
