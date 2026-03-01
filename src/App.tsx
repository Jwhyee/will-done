import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { format } from "date-fns";

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
import { useToast } from "@/providers/ToastProvider";
import { translations, getLang, type Lang } from "@/lib/i18n";
import { TimeBlock, Task, User, Workspace } from "@/types";

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

function AppContent() {
  const [view, setView] = useState<"loading" | "onboarding" | "workspace_setup" | "main" | "retrospective" | "settings">("loading");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [greeting, setGreeting] = useState<string>("");
  const [timeline, setTimeline] = useState<TimeBlock[]>([]);
  const [inboxTasks, setInboxTasks] = useState<Task[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [transitionBlock, setTransitionBlock] = useState<TimeBlock | null>(null);
  const [retrospectiveOpen, setRetrospectiveOpen] = useState(false);
  const [retrospectiveContent, setRetrospectiveContent] = useState("");
  const [isGeneratingRetro, setIsGeneratingRetro] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDates, setActiveDates] = useState<string[]>([]);
  const [manualDate, setManualDate] = useState("");
  
  const { showToast } = useToast();

  const lang = useMemo(() => (user?.lang || getLang()) as Lang, [user]);
  const t = translations[lang];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeWorkspaceId && view === "main") {
      fetchMainData();
    }
  }, [activeWorkspaceId, view, selectedDate]);

  const init = async () => {
    try {
      const u = await invoke<User | null>("get_user");
      if (!u) {
        setView("onboarding");
        return;
      }
      setUser(u);
      
      const wsList = await invoke<Workspace[]>("get_workspaces");
      setWorkspaces(wsList);

      if (wsList.length === 0) {
        setView("workspace_setup");
      } else {
        setActiveWorkspaceId(wsList[0].id);
        setView("main");
      }
    } catch (error) {
      console.error("Init failed:", error);
    }
  };

  const fetchMainData = async () => {
    if (!activeWorkspaceId) return;
    try {
      const g = await invoke<string>("get_greeting", { workspaceId: activeWorkspaceId, lang });
      setGreeting(g);
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const list = await invoke<TimeBlock[]>("get_timeline", { workspaceId: activeWorkspaceId, date: dateStr });
      const inbox = await invoke<Task[]>("get_inbox", { workspaceId: activeWorkspaceId });
      const activeD = await invoke<string[]>("get_active_dates", { workspaceId: activeWorkspaceId });
      
      setActiveDates(activeD);
      const now = new Date();
      const isToday = dateStr === format(now, "yyyy-MM-dd");

      if (isToday) {
        const active = list.find(b => b.status === "NOW");
        if (active && new Date(active.end_time) < now && !transitionBlock) {
          setTransitionBlock(active);
        }

        if (!active) {
          const next = list.find(b => b.status === "WILL" && new Date(b.start_time) <= now);
          if (next) {
            await invoke("update_block_status", { blockId: next.id, status: "NOW" });
            fetchMainData();
            return;
          }
        }
      }

      setTimeline(list);
      setInboxTasks(inbox);
    } catch (error) {
      console.error("Fetch failed:", error);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id.toString());
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    // Inbox -> Timeline
    if (activeId.includes("inbox") && !overId.includes("inbox")) {
      const taskId = parseInt(activeId.replace("inbox-", ""));
      if (activeWorkspaceId) {
        await invoke("move_to_timeline", { taskId, workspaceId: activeWorkspaceId });
        fetchMainData();
      }
      return;
    }

    // Timeline -> Inbox
    if (!activeId.includes("inbox") && (overId === "inbox" || overId.includes("inbox"))) {
      const blockId = parseInt(activeId);
      await invoke("move_to_inbox", { blockId });
      fetchMainData();
      return;
    }

    // Only Timeline Reordering
    if (!activeId.includes("inbox") && !overId.includes("inbox")) {
      const oldIndex = timeline.findIndex((item) => item.id.toString() === activeId);
      const newIndex = timeline.findIndex((item) => item.id.toString() === overId);

      if (oldIndex !== newIndex) {
        const nowIndex = timeline.findIndex(b => b.status === "NOW");
        const activeBlock = timeline[oldIndex];

        if (activeBlock.status !== "NOW") {
          if (nowIndex !== -1 && newIndex <= nowIndex) {
            showToast(t.main.toast.past_time_error);
            return;
          }
          if (nowIndex === -1 && timeline.length > 0 && newIndex === 0 && new Date(timeline[0].start_time) < currentTime) {
            showToast(t.main.toast.past_time_error);
            return;
          }
        }

        const newTimeline = arrayMove(timeline, oldIndex, newIndex);
        setTimeline(newTimeline);
        const ids = newTimeline.filter(b => b.status !== "UNPLUGGED").map(b => b.id);
        if (activeWorkspaceId) {
          await invoke("reorder_blocks", { workspaceId: activeWorkspaceId, blockIds: ids });
          fetchMainData();
        }
      }
    }
  };

  const handleManualDateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId) return;

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(manualDate)) {
      showToast("Invalid format (YYYY-MM-DD)");
      return;
    }

    const hasData = activeDates.includes(manualDate);
    if (!hasData) {
      showToast(t.main.toast.no_data_for_date);
      return;
    }

    setSelectedDate(new Date(manualDate));
    setManualDate("");
  };

  const handleGenerateRetrospective = async (date: Date) => {
    if (!activeWorkspaceId) return;
    setRetrospectiveOpen(true);
    setIsGeneratingRetro(true);
    setRetrospectiveContent("");
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const content = await invoke<string>("generate_retrospective", { 
        workspaceId: activeWorkspaceId, 
        date: dateStr 
      });
      setRetrospectiveContent(content);
    } catch (error: any) {
      setRetrospectiveContent(`Error generating retrospective:\n\n${error}`);
    } finally {
      setIsGeneratingRetro(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const dateStr = format(date, "yyyy-MM-dd");
    const isToday = format(new Date(), "yyyy-MM-dd") === dateStr;
    
    if (!isToday && activeDates.includes(dateStr)) {
      handleGenerateRetrospective(date);
    } else {
      setSelectedDate(date);
    }
  };

  const onTaskSubmit = async (data: any) => {
    if (!activeWorkspaceId) return;
    try {
      await invoke("add_task", { 
        input: {
          workspace_id: activeWorkspaceId,
          ...data,
          planning_memo: data.planning_memo || null,
          is_inbox: false
        } 
      });
      fetchMainData();
    } catch (error) {
      console.error("Task add failed:", error);
    }
  };

  const onTransition = async (block: TimeBlock, action: string, extraMinutes?: number, reviewMemo?: string) => {
    try {
      await invoke("process_task_transition", {
        input: {
          block_id: block.id,
          action,
          extra_minutes: extraMinutes || null,
          review_memo: reviewMemo || null
        }
      });
      setTransitionBlock(null);
      fetchMainData();
    } catch (error) {
      console.error("Transition failed:", error);
    }
  };

  if (view === "loading") {
    return (
      <div className="h-screen flex items-center justify-center bg-surface text-text-primary antialiased font-bold">
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
        return activeWorkspaceId ? (
          <RetrospectiveView 
            workspaceId={activeWorkspaceId} 
            onClose={() => setView("main")} 
            onShowSavedRetro={(retro) => {
              setRetrospectiveContent(retro.content);
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
            onUserUpdate={async () => {
              const u = await invoke<User>("get_user");
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
            sidebar2={
              <SecondarySidebar 
                t={t}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                activeDates={activeDates}
                manualDate={manualDate}
                onManualDateChange={setManualDate}
                onManualDateSubmit={handleManualDateSubmit}
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
              />
            }
          >
            <WorkspaceView 
              t={t}
              user={user}
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
              onMoveAllToTimeline={async () => {
                if (activeWorkspaceId) {
                  await invoke("move_all_to_timeline", { workspace_id: activeWorkspaceId });
                  fetchMainData();
                }
              }}
              onOpenRetrospective={() => setView("retrospective")}
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
              <Sparkles size={24} className="text-warning" />
              Work Retrospective
            </DialogTitle>
            <DialogDescription className="text-text-secondary font-bold text-sm">
              {isGeneratingRetro ? "AI is generating your professional retrospective..." : "Your professional Brag Document."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-8 scrollbar-hide bg-background">
            <div className="py-8 text-sm leading-relaxed prose prose-invert max-w-none">
              {isGeneratingRetro ? (
                <div className="flex flex-col items-center justify-center space-y-4 py-20">
                  <div className="w-10 h-10 border-4 border-border border-t-warning rounded-full animate-spin" />
                  <p className="text-text-muted font-bold animate-pulse">Analyzing completed tasks and memos...</p>
                </div>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {retrospectiveContent || "No retrospective generated yet."}
                </ReactMarkdown>
              )}
            </div>
          </div>

          <DialogFooter className="p-6 border-t border-border bg-surface-elevated shrink-0">
            <Button 
              onClick={() => navigator.clipboard.writeText(retrospectiveContent)}
              disabled={isGeneratingRetro || !retrospectiveContent}
              className="w-full bg-text-primary text-background hover:bg-zinc-200 font-black h-11 rounded-xl text-sm transition-all shadow-xl shadow-black/20 active:scale-95 disabled:opacity-50"
            >
              Copy to Clipboard
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
