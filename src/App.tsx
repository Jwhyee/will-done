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
import { SecondarySidebar } from "@/components/layout/SecondarySidebar";
import { OnboardingView } from "@/features/onboarding/OnboardingView";
import { WorkspaceSetupView } from "@/features/onboarding/WorkspaceSetupView";
import { WorkspaceView } from "@/features/workspace/WorkspaceView";
import { SettingsView } from "@/features/settings/SettingsView";
import { RetrospectiveView } from "@/features/retrospective/RetrospectiveView";
import { InboxItem } from "@/features/workspace/components/InboxItem";
import { SortableItem } from "@/features/workspace/components/SortableItem";

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
    transitionBlock,
    setTransitionBlock,
    retrospectiveOpen,
    setRetrospectiveOpen,
    activeRetrospective,
    setActiveRetrospective,
    activeId,
    t,
    fetchMainData,
    handleDragStart,
    handleDragEnd,
    onTaskSubmit,
    onTransition,
  } = useApp();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (view === "loading") {
    return (
      <div className="h-screen flex items-center justify-center bg-surface text-text-primary antialiased font-medium">
        <p className="animate-pulse">{t.checking}</p>
      </div>
    );
  }

  const renderView = () => {
    switch (view) {
      case "onboarding":
        return <OnboardingView t={t} onComplete={(u) => { setUser(u); setView("workspace_setup"); }} />;
      case "workspace_setup":
        return (
          <WorkspaceSetupView 
            t={t} 
            isFirstWorkspace={workspaces.length === 0} 
            onComplete={async (id) => {
              const wsList = await invoke<Workspace[]>("get_workspaces");
              setWorkspaces(wsList);
              setActiveWorkspaceId(id);
              setView("main");
            }} 
            onCancel={() => setView("main")}
          />
        );
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
      case "settings":
        return (activeWorkspaceId && user) ? (
          <SettingsView 
            user={user}
            workspaceId={activeWorkspaceId} 
            t={t} 
            onClose={() => setView("main")} 
            onUserUpdate={async (updatedUser?: User) => {
              const u = updatedUser || await invoke<User>("get_user");
              setUser(u);
            }}
            onWorkspaceUpdate={async () => {
              fetchMainData();
              const wsList = await invoke<Workspace[]>("get_workspaces");
              setWorkspaces(wsList);
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
                onAddWorkspace={() => setView("workspace_setup")}
              />
            }
            sidebar2={(isCollapsed, setIsCollapsed) => (
              <SecondarySidebar
                t={t}
                user={user}
                inboxTasks={inboxTasks}
                onMoveToTimeline={async (taskId) => {
                  if (activeWorkspaceId) {
                    await invoke("move_to_timeline", { taskId, workspaceId: activeWorkspaceId });
                    fetchMainData();
                  }
                }}
                onDeleteTask={async (id) => {
                  await invoke("delete_task", { id });
                  fetchMainData();
                }}
                onOpenSettings={() => setView("settings")}
                onOpenRetrospective={() => setView("retrospective")}
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
              />
            )}
          >
            <WorkspaceView
              t={t}
              greeting={greeting}
              currentTime={currentTime}
              timeline={timeline}
              inboxTasks={inboxTasks}
              onTaskSubmit={onTaskSubmit}
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
              transitionBlock={transitionBlock}
              setTransitionBlock={setTransitionBlock}
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
      onDragEnd={handleDragEnd}
    >
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
                onMoveToTimeline={() => {}}
                onDelete={() => {}}
              />
            </div>
          ) : (
            <div className="w-[calc(100vw-350px)] opacity-90 scale-105">
              <SortableItem 
                block={timeline.find(b => b.id.toString() === activeId)!}
                timeline={timeline}
                currentTime={currentTime}
                t={t}
                onTransition={() => {}}
                onMoveToInbox={() => {}}
                onDelete={() => {}}
                hoverTaskId={null}
                setHoverTaskId={() => {}}
              />
            </div>
          )
        ) : null}
      </DragOverlay>

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
