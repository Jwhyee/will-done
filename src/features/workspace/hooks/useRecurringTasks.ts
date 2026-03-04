import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "@/providers/ToastProvider";

export interface RecurringTask {
  id: number;
  workspaceId: number;
  title: string;
  planningMemo?: string;
  duration: number;
  daysOfWeek: string; // JSON array string e.g., "[1,2,3]"
  createdAt: string;
}

export const useRecurringTasks = (workspaceId: number | null) => {
  const [tasks, setTasks] = useState<RecurringTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const fetchTasks = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    try {
      const result = await invoke<RecurringTask[]>("get_recurring_tasks", {
        workspaceId,
      });
      setTasks(result);
    } catch (error: any) {
      showToast(error.toString(), "error");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, showToast]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = async (input: {
    title: string;
    duration: number;
    planningMemo?: string;
    daysOfWeek: number[];
  }) => {
    if (!workspaceId) return;
    try {
      await invoke("add_recurring_task", {
        input: {
          ...input,
          workspaceId,
        },
      });
      await fetchTasks();
    } catch (error: any) {
      showToast(error.toString(), "error");
    }
  };

  const deleteTask = async (id: number) => {
    try {
      await invoke("delete_recurring_task", { id });
      await fetchTasks();
    } catch (error: any) {
      showToast(error.toString(), "error");
    }
  };

  return {
    tasks,
    isLoading,
    fetchTasks,
    addTask,
    deleteTask,
  };
};
