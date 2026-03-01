export interface TimeBlock {
  id: number;
  taskId: number | null;
  workspaceId: number;
  title: string;
  startTime: string;
  endTime: string;
  status: "DONE" | "NOW" | "WILL" | "UNPLUGGED" | "PENDING";
  reviewMemo: string | null;
  isUrgent: boolean;
}

export interface Task {
  id: number;
  workspaceId: number;
  title: string;
  planningMemo: string | null;
}

export interface User {
  id: number;
  nickname: string;
  geminiApiKey: string | null;
  lang: string;
  isNotificationEnabled: boolean;
}

export interface Retrospective {
  id: number;
  workspaceId: number;
  retroType: "DAILY" | "WEEKLY" | "MONTHLY";
  content: string;
  dateLabel: string;
  createdAt: string;
  usedModel?: string;
}

export interface Workspace {
  id: number;
  name: string;
  coreTimeStart: string | null;
  coreTimeEnd: string | null;
  roleIntro: string | null;
}
