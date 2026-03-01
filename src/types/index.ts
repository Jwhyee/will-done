export interface TimeBlock {
  id: number;
  task_id: number | null;
  workspace_id: number;
  title: string;
  start_time: string;
  end_time: string;
  status: "DONE" | "NOW" | "WILL" | "UNPLUGGED" | "PENDING";
  review_memo: string | null;
  is_urgent: boolean;
}

export interface Task {
  id: number;
  workspace_id: number;
  title: string;
  planning_memo: string | null;
}

export interface User {
  id: number;
  nickname: string;
  gemini_api_key: string | null;
  lang: string;
}

export interface Retrospective {
  id: number;
  workspace_id: number;
  retro_type: "DAILY" | "WEEKLY" | "MONTHLY";
  content: string;
  date_label: string;
  created_at: string;
}

export interface Workspace {
  id: number;
  name: string;
  core_time_start: string | null;
  core_time_end: string | null;
  role_intro: string | null;
}
