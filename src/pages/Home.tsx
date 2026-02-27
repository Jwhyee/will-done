import { useState, useEffect, useCallback } from "react";
import { invoke } from "@/lib/tauri";
import { Header, TaskInput, TimelineBoard } from "@/features/home/components";
import { TimelineEntry } from "@/features/home/types";
import { OnboardingModal } from "@/features/onboarding/components/OnboardingModal";

export default function Home() {
  const [nickname, setNickname] = useState("User");
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  const fetchWorkspace = useCallback(async () => {
    try {
      setIsWorkspaceLoading(true);
      const workspace = await invoke<any>("get_current_workspace");
      if (workspace) {
        const ws = workspace.workspace || workspace;
        setWorkspaceId(ws.id);
        setNickname(ws.nickname || localStorage.getItem("nickname") || "User");
        setShowOnboarding(false);
      } else {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error("Failed to fetch workspace:", error);
      setShowOnboarding(true);
    } finally {
      setIsWorkspaceLoading(false);
    }
  }, []);

  const fetchTimeline = useCallback(async () => {
    if (!workspaceId) return;
    try {
      setIsLoading(true);
      const today = new Date().toISOString().split("T")[0];
      const entries = await invoke<TimelineEntry[]>("get_timeline", {
        workspaceId,
        date: today,
      });
      setTimelineEntries(entries);
    } catch (error) {
      console.error("Failed to fetch timeline:", error);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  useEffect(() => {
    if (workspaceId) {
      fetchTimeline();
    }
  }, [workspaceId, fetchTimeline]);

  const handleTaskAdded = () => {
    fetchTimeline();
  };

  const handleReorder = (newEntries: TimelineEntry[]) => {
    setTimelineEntries(newEntries);
  };

  const handleGenerateRetrospective = () => {
    alert("Generating retrospective... (Coming soon)");
  };

  const hasCompletedTasks = timelineEntries.some((entry) => entry.status === "Done");

  if (isWorkspaceLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 md:p-12">
        <div className="w-8 h-8 border-4 border-zinc-800 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-6 md:p-12 font-sans selection:bg-zinc-800">
      <div className="max-w-3xl mx-auto">
        {workspaceId ? (
          <>
            <Header 
              nickname={nickname} 
              workspaceId={workspaceId} 
              hasCompletedTasks={hasCompletedTasks}
              onGenerateRetrospective={handleGenerateRetrospective}
            />
            
            <main className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
              <TaskInput workspaceId={workspaceId} onTaskAdded={handleTaskAdded} />
              
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-zinc-800 border-t-zinc-500 rounded-full animate-spin"></div>
                </div>
              ) : (
                <TimelineBoard entries={timelineEntries} onReorder={handleReorder} />
              )}
            </main>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-6">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
            </div>
            <h1 className="text-xl font-medium text-zinc-200 mb-2">Welcome to will-done</h1>
            <p className="text-zinc-500 max-w-xs mx-auto">Please complete the setup to start managing your workflow.</p>
          </div>
        )}
      </div>

      <OnboardingModal 
        isOpen={showOnboarding} 
        onComplete={() => {
          setShowOnboarding(false);
          fetchWorkspace();
        }} 
      />
    </div>
  );
}
