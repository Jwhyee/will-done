import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import dayjs from "dayjs";

interface HeaderProps {
  nickname: string;
  workspaceId: number;
}

export function Header({ nickname, workspaceId }: HeaderProps) {
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
    <header className="flex flex-col gap-1 mb-8">
      <div className="text-4xl font-mono font-bold tracking-tight text-zinc-50">
        {time.format("HH:mm:ss")}
      </div>
      <div className="text-lg text-zinc-400 font-medium">
        {greeting || `Hello, ${nickname}`}
      </div>
    </header>
  );
}
