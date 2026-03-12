import { invoke } from "@tauri-apps/api/core";
import { Workspace, TimeBlock, Task } from "@/types";

export interface AddTaskInput {
  workspaceId: number;
  title: string;
  hours: number;
  minutes: number;
  planningMemo: string | null;
  isUrgent: boolean;
  isInbox: boolean | null;
  projectName: string | null;
  labelName: string | null;
}

export interface TaskTransitionInput {
  blockId: number;
  action: string;
  extraMinutes: number | null;
  reviewMemo: string | null;
}

export interface UpdateTaskInput {
  blockId: number;
  title: string;
  description: string | null;
  hours: number;
  minutes: number;
  reviewMemo: string | null;
  projectName: string | null;
  labelName: string | null;
}

export const workspaceApi = {
  // Queries
  getWorkspaces: () =>
    invoke<Workspace[]>("get_workspaces"),

  getWorkspace: (id: number) =>
    invoke<Workspace>("get_workspace", { id }),

  getUnpluggedTimes: (workspaceId: number) =>
    invoke<any[]>("get_unplugged_times", { workspaceId }),

  getGreeting: (workspaceId: number, lang: string) =>
    invoke<string>("get_greeting", { workspaceId, lang }),

  getTimeline: (workspaceId: number, date?: string) =>
    invoke<TimeBlock[]>("get_timeline", { workspaceId, date }),

  getInbox: (workspaceId: number) =>
    invoke<Task[]>("get_inbox", { workspaceId }),

  getTodayCompletedDuration: (workspaceId: number) =>
    invoke<number>("get_today_completed_duration", { workspaceId }),

  getProjects: () =>
    invoke<any[]>("get_projects"),

  getLabels: () =>
    invoke<any[]>("get_labels"),

  // Actions
  createWorkspace: (input: any) =>
    invoke<number>("create_workspace", { input }),

  processTaskTransition: (input: TaskTransitionInput) =>
    invoke<void>("process_task_transition", { input }),

  updateBlockStatus: (blockId: number, status: string) =>
    invoke<void>("update_block_status", { blockId, status }),

  moveToTimeline: (taskId: number, workspaceId: number) =>
    invoke<void>("move_to_timeline", { taskId, workspaceId }),

  moveToInbox: (blockId: number) =>
    invoke<void>("move_to_inbox", { blockId }),

  reorderInbox: (workspaceId: number, taskIds: number[]) =>
    invoke<void>("reorder_inbox", { workspaceId, taskIds }),

  reorderBlocks: (workspaceId: number, blockIds: number[]) =>
    invoke<void>("reorder_blocks", { workspaceId, blockIds }),

  addTask: (input: AddTaskInput) => 
    invoke<void>("add_task", { input }),

  updateTask: (input: UpdateTaskInput) => 
    invoke<void>("update_task", { input }),

  moveTaskStep: (workspaceId: number, blockId: number, direction: string) =>
    invoke<void>("move_task_step", { workspaceId, blockId, direction }),

  moveTaskToPriority: (workspaceId: number, blockId: number) =>
    invoke<void>("move_task_to_priority", { workspaceId, blockId }),

  moveTaskToBottom: (workspaceId: number, blockId: number) =>
    invoke<void>("move_task_to_bottom", { workspaceId, blockId }),

  updateWorkspace: (id: number, input: any) =>
    invoke<void>("update_workspace", { id, input }),

  deleteWorkspace: (id: number) =>
    invoke<void>("delete_workspace", { id }),

  createLabel: (input: { name: string; color: string }) =>
    invoke<void>("create_label", { input }),

  updateLabel: (id: number, input: { name: string; color: string }) =>
    invoke<void>("update_label", { id, input }),

  deleteLabel: (id: number) =>
    invoke<void>("delete_label", { id }),

  createProject: (input: { name: string }) =>
    invoke<void>("create_project", { input }),

  updateProject: (id: number, input: { name: string }) =>
    invoke<void>("update_project", { id, input }),

  deleteProject: (id: number) =>
    invoke<void>("delete_project", { id }),

  deleteTask: (id: number) =>
    invoke<void>("delete_task", { id }),

  handleSplitTaskDeletion: (taskId: number, keepPast: boolean) =>
    invoke<void>("handle_split_task_deletion", { taskId, keepPast }),

  moveAllToTimeline: (workspaceId: number) =>
    invoke<void>("move_all_to_timeline", { workspaceId }),
};
