import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Retrospective } from "@/types";
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

    const generateRetrospective = async (params: {
        workspaceId: number;
        startDate: string;
        endDate: string;
        retroType: string;
        dateLabel: string;
        forceRetry?: boolean;
    }): Promise<Retrospective | null> => {
        setIsGenerating(true);
        try {
            // Align with backend snake_case parameters
            const retro = await invoke<Retrospective>("generate_retrospective", {
                workspaceId: params.workspaceId,
                startDate: params.startDate,
                endDate: params.endDate,
                retroType: params.retroType,
                dateLabel: params.dateLabel,
                forceRetry: !!params.forceRetry,
            });
            setIsQuotaExhausted(false); // Reset if success
            return retro;
        } catch (error: any) {
            console.error("Retrospective generation failed:", error);
            
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
                showToast(t.retrospective.duplicate_error, "error");
            } else if (errStr.includes("No completed tasks")) {
                showToast(t.retrospective.no_tasks_error, "error");
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
        generateRetrospective,
    };
};
