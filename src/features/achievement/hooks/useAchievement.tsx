import { useState, useEffect } from "react";
import { format } from "date-fns";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { Achievement, User } from "@/types";
import { DbGeminiModel } from "@/types/gemini";
import { useToast } from "@/providers/ToastProvider";
import { calculateRange } from "../utils";
import { achievementApi } from "../api";

interface UseAchievementProps {
  workspaceId: number;
  user: User;
  t: any;
  onShowSavedAchievement: (retro: Achievement) => void;
}

export const useAchievement = ({
  workspaceId,
  user,
  t,
  onShowSavedAchievement
}: UseAchievementProps) => {
  const [tab, setTab] = useState<"create" | "browse">("create");
  const achievementType = "DAILY" as const;
  const browseType = "DAILY" as const;
  const { showToast } = useToast();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isQuotaExhausted, setIsQuotaExhausted] = useState(false);
  const [isDuplicateConfirmOpen, setIsDuplicateConfirmOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const [availableModels, setAvailableModels] = useState<DbGeminiModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const [inputValue, setInputValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateLabel, setDateLabel] = useState("");

  const [browseInputValue, setBrowseInputValue] = useState("");
  const [browseDateLabel, setBrowseDateLabel] = useState("");
  const [foundAchievement, setFoundAchievement] = useState<Achievement | null>(null);

  const [genMessage, setGenMessage] = useState("");
  const [activeDates, setActiveDates] = useState<string[]>([]);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const models = await achievementApi.fetchAvailableModels();
        if (Array.isArray(models)) {
          setAvailableModels(models);
        }
      } catch (e) {
        console.error("Failed to fetch models:", e);
      }
    };
    fetchModels();
  }, []);

  useEffect(() => {
    const fetchActiveDates = async () => {
      try {
        const dates = await achievementApi.getActiveDates(workspaceId);
        if (Array.isArray(dates)) {
          const sorted = dates.sort();
          setActiveDates(sorted);
          const latest = sorted.length > 0 ? sorted[sorted.length - 1] : format(new Date(), "yyyy-MM-dd");

          if (!inputValue) {
            setInputValue(latest);
            setBrowseInputValue(latest);
          }
        }
      } catch (e) { console.error(e); }
    };
    fetchActiveDates();
  }, [workspaceId]);

  useEffect(() => {
    if (!inputValue) return;
    const { start, end, label } = calculateRange(inputValue, achievementType);
    setStartDate(start); setEndDate(end); setDateLabel(label);
  }, [inputValue, achievementType]);

  useEffect(() => {
    if (!browseInputValue) return;
    const { label } = calculateRange(browseInputValue, browseType);
    setBrowseDateLabel(label);
  }, [browseInputValue, browseType]);

  useEffect(() => {
    const fetchSavedAchievement = async () => {
      if (tab !== "browse" || !browseDateLabel) return;
      try {
        const retros = await achievementApi.getSavedAchievements(workspaceId, browseDateLabel);
        setFoundAchievement(retros.length > 0 ? retros[0] : null);
      } catch (e) { console.error(e); }
    };
    fetchSavedAchievement();
  }, [browseDateLabel, workspaceId, tab]);

  const checkQuota = async () => {
    try {
      const isExhausted = await achievementApi.checkDailyExhaustedLog();
      setIsQuotaExhausted(isExhausted);
      return isExhausted;
    } catch (e) {
      console.error("Failed to check quota:", e);
      return false;
    }
  };

  const handleGenerate = async (forceRetry: boolean = false, overwrite: boolean = false) => {
    if (achievementType === "DAILY" && !activeDates.includes(startDate)) {
      showToast(t.main.toast.no_data_for_date, "error");
      return;
    }

    if (!forceRetry && !overwrite) {
      const exhausted = await checkQuota();
      if (exhausted) return;
    }

    setGenMessage(t.achievement.gen_message);
    setIsGenerating(true);
    
    try {
      const achievement = await achievementApi.generateAchievement({
        workspaceId,
        startDate,
        endDate,
        achievementType,
        dateLabel,
        forceRetry,
        overwrite,
        targetModel: selectedModel,
      });
      
      setIsQuotaExhausted(false);
      setIsDuplicateConfirmOpen(false);
      setGenMessage("");

      if (achievement) {
        if (user.isNotificationEnabled) {
          let permission = await isPermissionGranted();
          if (!permission) permission = await requestPermission() === 'granted';
          if (permission) {
            sendNotification({
              title: t.achievement.notification_title,
              body: t.achievement.notification_body
                .replace("{label}", dateLabel)
                .replace("{type}", t.achievement[achievementType.toLowerCase()]),
            });
          }
        }
        onShowSavedAchievement(achievement);
      }
    } catch (error: any) {
      console.error("Achievement generation failed:", error);
      setGenMessage("");
      
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
        setIsDuplicateConfirmOpen(true);
      } else if (errStr.includes("No completed tasks")) {
        showToast(t.achievement.no_tasks_error, "error");
      } else if (selectedModel && (errStr.includes("429") || errStr.toLowerCase().includes("quota") || errStr.toLowerCase().includes("limit"))) {
        // Handle specific model failure with desktop notification
        if (user.isNotificationEnabled) {
          const permission = await isPermissionGranted() || await requestPermission() === 'granted';
          if (permission) {
            sendNotification({
              title: "Model Rate Limit Exceeded",
              body: `Selected model ${selectedModel} is currently unavailable due to rate limits.`,
            });
          }
        }
        
        // Show toast with help link
        showToast(
          <div>
            <p>{selectedModel} 모델을 사용한 회고 생성에 실패했습니다.&nbsp;
              <a 
              href="https://aistudio.google.com/u/0/rate-limit?timeRange=last-hour" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline font-bold hover:text-white"
              >
              사용량 상세 페이지
              </a>
              를 확인해주세요.
            </p>
          </div>, 
          "error"
        );
      } else {
        showToast(`Error: ${errStr}`, "error");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmOverwrite = () => {
    setIsDuplicateConfirmOpen(false);
    handleGenerate(false, true);
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return {
    tab,
    setTab,
    isGenerating,
    isQuotaExhausted,
    setIsQuotaExhausted,
    isDuplicateConfirmOpen,
    setIsDuplicateConfirmOpen,
    isCopied,
    inputValue,
    setInputValue,
    browseInputValue,
    setBrowseInputValue,
    foundAchievement,
    genMessage,
    activeDates,
    availableModels,
    selectedModel,
    setSelectedModel,
    handleGenerate,
    handleConfirmOverwrite,
    handleCopy,
  };
};
