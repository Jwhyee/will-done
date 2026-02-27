import { useState, useEffect, useCallback } from "react";
import { invoke } from "@/lib/tauri";
import { Header, TaskInput, TimelineBoard } from "@/features/home/components";
import { TimelineEntry } from "@/features/home/types";

export default function Home() {
  const [nickname, setNickname] = useState("User");
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(true);
  
  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        setIsWorkspaceLoading(true);
        const workspace = await invoke<any>("get_current_workspace");
        if (workspace) {
          // If workspace is an object with workspace field (due to setup_workspace result)
          const ws = workspace.workspace || workspace;
          setWorkspaceId(ws.id);
          setNickname(ws.nickname || localStorage.getItem("nickname") || "User");
        }
      } catch (error) {
        console.error("Failed to fetch workspace:", error);
      } finally {
        setIsWorkspaceLoading(false);
      }
    };
    fetchWorkspace();
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

  if (!workspaceId) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center">
        <p>Workspace not found. Please onboarding first.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-6 md:p-12 font-sans selection:bg-zinc-800">
      <div className="max-w-3xl mx-auto">
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
      </div>
    </div>
  );
}
