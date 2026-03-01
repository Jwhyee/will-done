import { useState, useEffect, useMemo, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
} from "@dnd-kit/sortable";
import { format } from "date-fns";
import { useToast } from "@/providers/ToastProvider";
import { translations, getLang, type Lang } from "@/lib/i18n";
import { TimeBlock, Task, User, Workspace, Retrospective } from "@/types";

export type ViewState = "loading" | "onboarding" | "workspace_setup" | "main" | "retrospective" | "settings";

export function useApp() {
  const [view, setView] = useState<ViewState>("loading");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [greeting, setGreeting] = useState<string>("");
  const [timeline, setTimeline] = useState<TimeBlock[]>([]);
  const [inboxTasks, setInboxTasks] = useState<Task[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate] = useState<Date>(new Date());
  const [transitionBlock, setTransitionBlock] = useState<TimeBlock | null>(null);
  const [retrospectiveOpen, setRetrospectiveOpen] = useState(false);
  const [activeRetrospective, setActiveRetrospective] = useState<Retrospective | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [todayCompletedDuration, setTodayCompletedDuration] = useState<number>(0);
  
  const { showToast } = useToast();

  const lang = useMemo(() => (user?.lang || getLang()) as Lang, [user]);
  const t = translations[lang];

  const fetchMainData = useCallback(async () => {
    if (!activeWorkspaceId) return;
    try {
      const g = await invoke<string>("get_greeting", { workspaceId: activeWorkspaceId, lang });
      setGreeting(g);
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const list = await invoke<TimeBlock[]>("get_timeline", { workspaceId: activeWorkspaceId, date: dateStr });
      const inbox = await invoke<Task[]>("get_inbox", { workspaceId: activeWorkspaceId });
      
      const completedDuration = await invoke<number>("get_today_completed_duration", { workspaceId: activeWorkspaceId });
      setTodayCompletedDuration(completedDuration);

      const now = new Date();
      const isToday = dateStr === format(now, "yyyy-MM-dd");

      if (isToday) {
        const active = list.find(b => b.status === "NOW");
        if (active && new Date(active.endTime) < now && !transitionBlock) {
          setTransitionBlock(active);
        }

        if (!active) {
          const next = list.find(b => b.status === "WILL" && new Date(b.startTime) <= now);
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
  }, [activeWorkspaceId, lang, selectedDate, transitionBlock]);

  const init = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeWorkspaceId && view === "main") {
      fetchMainData();
    }
  }, [activeWorkspaceId, view, fetchMainData]);

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
          if (nowIndex === -1 && timeline.length > 0 && newIndex === 0 && new Date(timeline[0].startTime) < currentTime) {
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

  const onTaskSubmit = async (data: any) => {
    if (!activeWorkspaceId) return;
    try {
      await invoke("add_task", { 
        input: {
          workspaceId: activeWorkspaceId,
          ...data,
          planningMemo: data.planningMemo || null,
          isInbox: false
        } 
      });
      fetchMainData();
    } catch (error) {
      console.error("Task add failed:", error);
    }
  };

  const onTransition = async (block: TimeBlock, action: string, extraMinutes?: number, reviewMemo?: string) => {
    if (!activeWorkspaceId) return;
    try {
      const prevDuration = todayCompletedDuration;
      await invoke("process_task_transition", {
        input: {
          blockId: block.id,
          action,
          extraMinutes: extraMinutes || null,
          reviewMemo: reviewMemo || null
        }
      });
      setTransitionBlock(null);
      
      // Update duration and check threshold
      const newDuration = await invoke<number>("get_today_completed_duration", { workspaceId: activeWorkspaceId });
      setTodayCompletedDuration(newDuration);

      if (Math.floor(prevDuration / 120) < Math.floor(newDuration / 120)) {
        const messages = t.main.health_care_messages;
        const randomMsg = messages[Math.floor(Math.random() * messages.length)];
        showToast(randomMsg, "success");
      }

      fetchMainData();
    } catch (error) {
      console.error("Transition failed:", error);
    }
  };

  return {
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
    selectedDate,
    transitionBlock,
    setTransitionBlock,
    retrospectiveOpen,
    setRetrospectiveOpen,
    activeRetrospective,
    setActiveRetrospective,
    activeId,
    todayCompletedDuration,
    t,
    lang,
    fetchMainData,
    handleDragStart,
    handleDragEnd,
    onTaskSubmit,
    onTransition,
  };
}
