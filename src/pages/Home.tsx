import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Header, TaskInput, TimelineBoard } from "@/features/home/components";
import { TimelineEntry } from "@/features/home/types";

export default function Home() {
  const [nickname, setNickname] = useState("User");
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Hardcode workspace_id = 1 for MVP
  const workspaceId = 1;

  useEffect(() => {
    const storedNickname = localStorage.getItem("nickname");
    if (storedNickname) {
      setNickname(storedNickname);
    }
  }, []);

  const fetchTimeline = useCallback(async () => {
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
    fetchTimeline();
  }, [fetchTimeline]);

  const handleTaskAdded = () => {
    fetchTimeline();
  };

  const handleReorder = (newEntries: TimelineEntry[]) => {
    // In a real app, we would send the new order to the backend here
    // For now, we just update the local state
    setTimelineEntries(newEntries);
  };

  const handleGenerateRetrospective = () => {
    // This will be implemented in future sprints
    alert("Generating retrospective... (Coming soon)");
  };

  const hasCompletedTasks = timelineEntries.some((entry) => entry.status === "Done");

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
