import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  isPermissionGranted,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import {
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
} from "@dnd-kit/sortable";
import { format } from "date-fns";
import { useToast } from "@/providers/ToastProvider";
import { translations, getLang, type Lang } from "@/lib/i18n";
import { TimeBlock, Task, User, Workspace, Achievement } from "@/types";
import { validateDropPosition } from "@/features/workspace/utils/dndValidation";

import { workspaceApi } from "@/features/workspace/api";
import { onboardingApi } from "@/features/onboarding/api";

export type ViewState = "loading" | "onboarding" | "workspace_setup" | "main" | "achievement" | "workspace_settings";

export function useApp() {
  const [view, setView] = useState<ViewState>("loading");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [settingsWorkspaceId, setSettingsWorkspaceId] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [greeting, setGreeting] = useState<string>("");
  const [timeline, setTimeline] = useState<TimeBlock[]>([]);
  const [inboxTasks, setInboxTasks] = useState<Task[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  const logicalDate = useMemo(() => {
    if (!user) return currentTime;
    const [startH, startM] = user.dayStartTime.split(':').map(Number);
    const now = new Date(currentTime);
    const boundary = new Date(now);
    boundary.setHours(startH, startM, 0, 0);

    const boundaryTime = boundary.getTime();
    if (currentTime.getTime() < boundaryTime) {
      now.setDate(now.getDate() - 1);
    }
    return now;
  }, [currentTime, user]);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [transitionBlock, setTransitionBlock] = useState<TimeBlock | null>(null);
  const [achievementOpen, setAchievementOpen] = useState(false);
  const [activeAchievement, setActiveAchievement] = useState<Achievement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [isWorkspaceCreateModalOpen, setIsWorkspaceCreateModalOpen] = useState(false);
  const [todayCompletedDuration, setTodayCompletedDuration] = useState<number>(0);
  const [unfinishedPastDates, setUnfinishedPastDates] = useState<string[]>([]);
  const [dismissedBlockId, setDismissedBlockId] = useState<number | null>(null);
  const lastNotifiedBlockId = useRef<number | null>(null);

  const { showToast } = useToast();
  const isFetchingRef = useRef(false);

  const lang = useMemo(() => (user?.lang || getLang()) as Lang, [user]);
  const t = translations[lang];

  const fetchMainData = useCallback(async () => {
    if (!activeWorkspaceId || isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const g = await workspaceApi.getGreeting(activeWorkspaceId, lang);
      setGreeting(g);

      const targetDate = selectedDate || logicalDate;
      const dateStr = format(targetDate, "yyyy-MM-dd");

      let list = await workspaceApi.getTimeline(
        activeWorkspaceId, 
        selectedDate ? dateStr : undefined
      );
      const inbox = await workspaceApi.getInbox(activeWorkspaceId);

      const completedDuration = await workspaceApi.getTodayCompletedDuration(activeWorkspaceId);
      setTodayCompletedDuration(completedDuration);

      const pastDates = await workspaceApi.checkUnfinishedPastTasks(activeWorkspaceId);
      setUnfinishedPastDates(pastDates);

      const now = new Date();
      const isToday = dateStr === format(logicalDate, "yyyy-MM-dd");

      if (isToday) {
        const active = list.find(b => b.status === "NOW");
        if (active && new Date(active.endTime) < now && !transitionBlock && dismissedBlockId !== active.id) {
          // Check if this is a split task (has a future part with same taskId)
          const hasFuturePart = list.some(b => b.taskId === active.taskId && b.id !== active.id && b.status === "WILL");

          if (hasFuturePart) {
            // Silent transition: auto-complete the current block
            await workspaceApi.processTaskTransition({
              blockId: active.id,
              action: "DONE",
              extraMinutes: null,
              reviewMemo: null
            });
            // Re-fetch list after silent transition
            list = await workspaceApi.getTimeline(activeWorkspaceId);
          } else {
            setTransitionBlock(active);

            // Send Native Notification if enabled
            if (user?.isNotificationEnabled && lastNotifiedBlockId.current !== active.id) {
              const granted = await isPermissionGranted();
              if (granted) {
                sendNotification({
                  id: active.id,
                  title: t.achievement.task_notification_title,
                  body: t.achievement.task_notification_body.replace("{title}", active.title),
                });
                lastNotifiedBlockId.current = active.id;
              }
            }
          }
        }

        if (!active) {
          const next = list.find(b => b.status === "WILL" && new Date(b.startTime) <= now);
          if (next) {
            await workspaceApi.updateBlockStatus(next.id, "NOW");
            // Re-fetch timeline after status update
            list = await workspaceApi.getTimeline(activeWorkspaceId);
          }
        }
      }

      setTimeline(list);
      setInboxTasks(inbox);
    } catch (error) {
      console.error("Fetch failed:", error);
    } finally {
      isFetchingRef.current = false;
    }
  }, [activeWorkspaceId, lang, selectedDate, transitionBlock, logicalDate, user?.isNotificationEnabled, t.achievement.task_notification_body, t.achievement.task_notification_title]);

  const init = useCallback(async () => {
    try {
      const u = await onboardingApi.getUser();
      if (!u) {
        setView("onboarding");
        return;
      }
      setUser(u);

      const wsList = await workspaceApi.getWorkspaces();
      setWorkspaces(wsList);

      if (wsList.length > 0) {
        setActiveWorkspaceId(wsList[0].id);
      }
      setView("main");
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

  useEffect(() => {
    const unlistenPromise = listen<number>("open-transition-modal", (event) => {
      const blockId = event.payload;
      // Fetch latest timeline and open transition modal
      if (activeWorkspaceId) {
        workspaceApi.getTimeline(activeWorkspaceId).then(list => {
          const block = list.find(b => b.id === blockId);
          if (block) {
            setTransitionBlock(block);
            setView("main");
          }
        });
      }
    });

    return () => {
      unlistenPromise.then(unlisten => unlisten());
    };
  }, [activeWorkspaceId, setTransitionBlock, setView]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id.toString());
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over ? over.id.toString() : null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);
    
    if (!over) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    // Inbox -> Timeline
    if (activeId.includes("inbox") && !overId.includes("inbox")) {
      const taskId = parseInt(activeId.replace("inbox-", ""));
      if (activeWorkspaceId) {
        await workspaceApi.moveToTimeline(taskId, activeWorkspaceId);
        fetchMainData();
      }
      return;
    }

    // Timeline -> Inbox
    if (!activeId.includes("inbox") && (overId === "inbox" || overId.includes("inbox"))) {
      const blockId = parseInt(activeId);
      await workspaceApi.moveToInbox(blockId);
      fetchMainData();
      return;
    }

    // Inbox Reordering
    if (activeId.startsWith("inbox-") && overId.startsWith("inbox-")) {
      const oldIndex = inboxTasks.findIndex((item) => `inbox-${item.id}` === activeId);
      const newIndex = inboxTasks.findIndex((item) => `inbox-${item.id}` === overId);

      if (oldIndex !== newIndex) {
        const newInbox = arrayMove(inboxTasks, oldIndex, newIndex);
        setInboxTasks(newInbox); // Optimistic UI update

        const ids = newInbox.map(t => t.id);
        if (activeWorkspaceId) {
          try {
            await workspaceApi.reorderInbox(activeWorkspaceId, ids);
            fetchMainData();
          } catch (error) {
            console.error("Inbox reorder failed:", error);
            fetchMainData();
          }
        }
      }
      return;
    }

    // Only Timeline Reordering
    if (!activeId.includes("inbox") && !overId.includes("inbox")) {
      const validation = validateDropPosition(activeId, overId, timeline, currentTime, t);
      
      if (!validation.isValid) {
        if (validation.error) showToast(validation.error);
        return;
      }

      const oldIndex = timeline.findIndex((item) => item.id.toString() === activeId);
      const newIndex = timeline.findIndex((item) => item.id.toString() === overId);

      if (oldIndex !== newIndex) {
        const newTimeline = arrayMove(timeline, oldIndex, newIndex);
        setTimeline(newTimeline); // Optimistic UI update (visual only until fetch)
        
        const ids = newTimeline.filter(b => b.status !== "UNPLUGGED").map(b => b.id);
        if (activeWorkspaceId) {
          try {
            await workspaceApi.reorderBlocks(activeWorkspaceId, ids);
            fetchMainData();
          } catch (error) {
            console.error("Reorder failed:", error);
            // Revert on error
            fetchMainData();
          }
        }
      }
    }
  };

  const onTaskSubmit = async (data: any, isInbox: boolean = false) => {
    if (!activeWorkspaceId) return;
    try {
      await workspaceApi.addTask({
        workspaceId: activeWorkspaceId,
        ...data,
        planningMemo: data.planningMemo || null,
        isInbox
      });
      await fetchMainData();
    } catch (error) {
      console.error("Task add failed:", error);
    }
  };

  const onEditTaskSubmit = async (blockId: number, data: any) => {
    if (!activeWorkspaceId) return;
    try {
      await workspaceApi.updateTask({
        blockId,
        title: data.title,
        description: data.planningMemo,
        hours: data.hours,
        minutes: data.minutes,
        reviewMemo: data.reviewMemo,
        projectName: data.projectName,
        labelName: data.labelName,
      });
      fetchMainData();
    } catch (error) {
      console.error("Edit task failed:", error);
    }
  };

  const onTransition = async (block: TimeBlock, action: string, extraMinutes?: number, reviewMemo?: string) => {
    if (!activeWorkspaceId) return;
    try {
      const prevDuration = todayCompletedDuration;
      await workspaceApi.processTaskTransition({
        blockId: block.id,
        action,
        extraMinutes: extraMinutes || null,
        reviewMemo: reviewMemo || null
      });
      setTransitionBlock(null);
      setDismissedBlockId(null); // Clear dismissal on successful transition

      // Update duration and check threshold
      const newDuration = await workspaceApi.getTodayCompletedDuration(activeWorkspaceId);
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

  const onDismissTransition = useCallback((blockId: number) => {
    setDismissedBlockId(blockId);
    setTransitionBlock(null);
  }, []);

  const onMoveTaskStep = async (blockId: number, direction: "up" | "down") => {
    if (!activeWorkspaceId) return;
    try {
      await workspaceApi.moveTaskStep(activeWorkspaceId, blockId, direction.toUpperCase());
      await fetchMainData();
    } catch (error) {
      console.error("Move task step failed:", error);
    }
  };

  const onMoveTaskToPriority = async (blockId: number) => {
    if (!activeWorkspaceId) return;
    try {
      await workspaceApi.moveTaskToPriority(activeWorkspaceId, blockId);
      await fetchMainData();
    } catch (error) {
      console.error("Move task to priority failed:", error);
    }
  };

  const onMoveTaskToBottom = async (blockId: number) => {
    if (!activeWorkspaceId) return;
    try {
      await workspaceApi.moveTaskToBottom(activeWorkspaceId, blockId);
      await fetchMainData();
    } catch (error) {
      console.error("Move task to bottom failed:", error);
    }
  };

  return {
    view,
    setView,
    workspaces,
    setWorkspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    settingsWorkspaceId,
    setSettingsWorkspaceId,
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
    achievementOpen,
    setAchievementOpen,
    activeAchievement,
    setActiveAchievement,
    activeId,
    overId,
    isWorkspaceCreateModalOpen,
    setIsWorkspaceCreateModalOpen,
    todayCompletedDuration,
    t,
    lang,
    fetchMainData,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    onTaskSubmit,
    onEditTaskSubmit,
    onTransition,
    onDismissTransition,
    onMoveTaskStep,
    onMoveTaskToPriority,
    onMoveTaskToBottom,
    unfinishedPastDates,
  };
}
