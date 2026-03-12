import { invoke } from "@tauri-apps/api/core";
import { User } from "@/types";

export interface SaveUserParams {
  nickname: string;
  geminiApiKey: string | null;
  lang: string;
  isNotificationEnabled: boolean;
  isFreeUser: boolean;
  dayStartTime: string;
}

export const onboardingApi = {
  saveUser: (params: SaveUserParams) => 
    invoke<User>("save_user", params as any),
  
  getUser: () => 
    invoke<User | null>("get_user"),

  verifyApiKey: (apiKey: string) => 
    invoke<any>("fetch_available_models", { apiKey }),
};
