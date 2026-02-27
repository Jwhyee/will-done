import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface HeaderProps {
  nickname: string;
  workspaceId: number;
  hasCompletedTasks: boolean;
  onGenerateRetrospective?: () => void;
}

export function Header({ 
  nickname, 
  workspaceId, 
  hasCompletedTasks,
  onGenerateRetrospective 
}: HeaderProps) {
  const [time, setTime] = useState(dayjs());
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(dayjs());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchGreeting = async () => {
      try {
        const msg = await invoke<string>("get_greeting", {
          nickname,
          workspaceId,
        });
        setGreeting(msg);
      } catch (error) {
        console.error("Failed to fetch greeting:", error);
      }
    };

    fetchGreeting();
    // Fetch greeting every minute
    const interval = setInterval(fetchGreeting, 60000);
    return () => clearInterval(interval);
  }, [nickname, workspaceId]);

  return (
    <header className="flex flex-col gap-1 mb-10">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <div className="text-4xl font-mono font-bold tracking-tight text-zinc-50">
            {time.format("HH:mm:ss")}
          </div>
          <div className="text-lg text-zinc-400 font-medium animate-in fade-in slide-in-from-left-2 duration-700">
            {greeting || `Hello, ${nickname}`}
          </div>
        </div>
        
        <Button
          onClick={onGenerateRetrospective}
          disabled={!hasCompletedTasks}
          className={`
            relative overflow-hidden group transition-all duration-300
            ${hasCompletedTasks 
              ? "bg-zinc-50 text-zinc-950 hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.1)]" 
              : "bg-zinc-900 text-zinc-600 border-zinc-800"}
          `}
        >
          <Sparkles className={`w-4 h-4 mr-2 ${hasCompletedTasks ? "animate-pulse" : ""}`} />
          <span className="relative z-10 font-semibold text-sm">
            Generate Retrospective
          </span>
          {hasCompletedTasks && (
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/10 to-indigo-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          )}
        </Button>
      </div>
    </header>
  );
}
