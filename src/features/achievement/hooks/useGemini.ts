import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Achievement } from "@/types";
import { useToast } from "@/providers/ToastProvider";

export const useGemini = (t: any) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isQuotaExhausted, setIsQuotaExhausted] = useState(false);
    const { showToast } = useToast();

    const checkQuota = async () => {
        try {
            const isExhausted = await invoke<boolean>("check_daily_exhausted_log");
            setIsQuotaExhausted(isExhausted);
            return isExhausted;
        } catch (e) {
            console.error("Failed to check quota:", e);
            return false;
        }
    };

    const generateAchievement = async (params: {
        workspaceId: number;
        startDate: string;
        endDate: string;
        achievementType: string;
        dateLabel: string;
        forceRetry?: boolean;
    }): Promise<Achievement | null> => {
        setIsGenerating(true);
        try {
            // Align with backend snake_case parameters
            const achievement = await invoke<Achievement>("generate_achievement", {
                workspaceId: params.workspaceId,
                startDate: params.startDate,
                endDate: params.endDate,
                achievementType: params.achievementType,
                dateLabel: params.dateLabel,
                forceRetry: !!params.forceRetry,
            });
            setIsQuotaExhausted(false); // Reset if success
            return achievement;
        } catch (error: any) {
            console.error("Achievement generation failed:", error);
            
            // Safer error stringification to avoid cyclic errors during logging
            let errStr = "Unknown error";
            try {
                if (typeof error === 'string') {
                    errStr = error;
                } else if (error instanceof Error) {
                    errStr = error.message;
                } else {
                    errStr = JSON.stringify(error);
                }
            } catch (e) {
                errStr = "Cyclic error or unstringifiable object";
            }
            
            if (errStr.includes("QUOTA_EXHAUSTED")) {
                setIsQuotaExhausted(true);
            } else if (errStr.includes("already exists")) {
                showToast(t.achievement.duplicate_error, "error");
            } else if (errStr.includes("No completed tasks")) {
                showToast(t.achievement.no_tasks_error, "error");
            } else {
                showToast(`Error: ${errStr}`, "error");
            }
            return null;
        } finally {
            setIsGenerating(false);
        }
    };

    return {
        isGenerating,
        isQuotaExhausted,
        setIsQuotaExhausted,
        checkQuota,
        generateAchievement,
    };
};
