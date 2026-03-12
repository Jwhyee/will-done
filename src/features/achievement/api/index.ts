import { invoke } from "@tauri-apps/api/core";
import { Achievement } from "@/types";
import { DbGeminiModel } from "@/types/gemini";

export interface GenerateAchievementParams {
  workspaceId: number;
  startDate: string;
  endDate: string;
  achievementType: "DAILY";
  dateLabel: string;
  forceRetry: boolean;
  overwrite: boolean;
  targetModel: string | null;
}

export const achievementApi = {
  getActiveDates: (workspaceId: number) =>
    invoke<string[]>("get_active_dates", { workspaceId }),

  getSavedAchievements: (workspaceId: number, dateLabel: string) =>
    invoke<Achievement[]>("get_saved_achievements", { workspaceId, dateLabel }),

  checkDailyExhaustedLog: () =>
    invoke<boolean>("check_daily_exhausted_log"),

  generateAchievement: (params: GenerateAchievementParams) =>
    invoke<Achievement>("generate_achievement", params as any),

  fetchAvailableModels: () =>
    invoke<DbGeminiModel[]>("fetch_available_models"),
};
