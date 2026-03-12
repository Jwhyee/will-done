import { invoke } from "@tauri-apps/api/core";
import { Retrospective } from "@/types";

export interface GenerateRetrospectiveParams {
  workspaceId: number;
  startDate: string;
  endDate: string;
  retroType: "DAILY";
  dateLabel: string;
  forceRetry: boolean;
  overwrite: boolean;
}

export const retrospectiveApi = {
  getActiveDates: (workspaceId: number) =>
    invoke<string[]>("get_active_dates", { workspaceId }),

  getSavedRetrospectives: (workspaceId: number, dateLabel: string) =>
    invoke<Retrospective[]>("get_saved_retrospectives", { workspaceId, dateLabel }),

  checkDailyExhaustedLog: () =>
    invoke<boolean>("check_daily_exhausted_log"),

  generateRetrospective: (params: GenerateRetrospectiveParams) =>
    invoke<Retrospective>("generate_retrospective", params as any),
};
