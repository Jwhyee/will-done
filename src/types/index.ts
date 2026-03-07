export interface TimeBlock {
  id: number;
  taskId: number | null;
  workspaceId: number;
  title: string;
  startTime: string;
  endTime: string;
  status: "DONE" | "NOW" | "WILL" | "UNPLUGGED" | "PENDING";
  reviewMemo: string | null;
  planningMemo: string | null;
  isUrgent: boolean;
  projectName: string | null;
  labelName: string | null;
  labelColor: string | null;
}

export interface Task {
  id: number;
  workspaceId: number;
  title: string;
  planningMemo: string | null;
  estimatedMinutes: number;
  projectId: number | null;
  labelId: number | null;
}

export interface Project {
  id: number;
  name: string;
  lastUsed: string;
}

export interface Label {
  id: number;
  name: string;
  color: string;
  lastUsed: string;
}

export interface User {
  id: number;
  nickname: string;
  geminiApiKey: string | null;
  lang: string;
  isNotificationEnabled: boolean;
  dayStartTime: string;
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
