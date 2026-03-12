import { useState, useEffect } from "react";
import { format } from "date-fns";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { Retrospective, User } from "@/types";
import { useToast } from "@/providers/ToastProvider";
import { calculateRange } from "../utils";
import { retrospectiveApi } from "../api";

interface UseRetrospectiveProps {
  workspaceId: number;
  user: User;
  t: any;
  onShowSavedRetro: (retro: Retrospective) => void;
}

export const useRetrospective = ({
  workspaceId,
  user,
  t,
  onShowSavedRetro
}: UseRetrospectiveProps) => {
  const [tab, setTab] = useState<"create" | "browse">("create");
  const retroType = "DAILY" as const;
  const browseType = "DAILY" as const;
  const { showToast } = useToast();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isQuotaExhausted, setIsQuotaExhausted] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const [inputValue, setInputValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateLabel, setDateLabel] = useState("");

  const [browseInputValue, setBrowseInputValue] = useState("");
  const [browseDateLabel, setBrowseDateLabel] = useState("");
  const [foundRetro, setFoundRetro] = useState<Retrospective | null>(null);

  const [genMessage, setGenMessage] = useState("");
  const [activeDates, setActiveDates] = useState<string[]>([]);

  useEffect(() => {
    const fetchActiveDates = async () => {
      try {
        const dates = await retrospectiveApi.getActiveDates(workspaceId);
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
    const { start, end, label } = calculateRange(inputValue, retroType);
    setStartDate(start); setEndDate(end); setDateLabel(label);
  }, [inputValue, retroType]);

  useEffect(() => {
    if (!browseInputValue) return;
    const { label } = calculateRange(browseInputValue, browseType);
    setBrowseDateLabel(label);
  }, [browseInputValue, browseType]);

  useEffect(() => {
    const fetchSavedRetro = async () => {
      if (tab !== "browse" || !browseDateLabel) return;
      try {
        const retros = await retrospectiveApi.getSavedRetrospectives(workspaceId, browseDateLabel);
        setFoundRetro(retros.length > 0 ? retros[0] : null);
      } catch (e) { console.error(e); }
    };
    fetchSavedRetro();
  }, [browseDateLabel, workspaceId, tab]);

  const checkQuota = async () => {
    try {
      const isExhausted = await retrospectiveApi.checkDailyExhaustedLog();
      setIsQuotaExhausted(isExhausted);
      return isExhausted;
    } catch (e) {
      console.error("Failed to check quota:", e);
      return false;
    }
  };

  const handleGenerate = async (forceRetry: boolean = false) => {
    if (retroType === "DAILY" && !activeDates.includes(startDate)) {
      showToast(t.main.toast.no_data_for_date, "error");
      return;
    }

    if (!forceRetry) {
      const exhausted = await checkQuota();
      if (exhausted) return;
    }

    setGenMessage(t.retrospective.gen_message);
    setIsGenerating(true);
    
    try {
      const retro = await retrospectiveApi.generateRetrospective({
        workspaceId,
        startDate,
        endDate,
        retroType,
        dateLabel,
        forceRetry
      });
      
      setIsQuotaExhausted(false);
      setGenMessage("");

      if (retro) {
        if (user.isNotificationEnabled) {
          let permission = await isPermissionGranted();
          if (!permission) permission = await requestPermission() === 'granted';
          if (permission) {
            sendNotification({
              title: t.retrospective.notification_title,
              body: t.retrospective.notification_body
                .replace("{label}", dateLabel)
                .replace("{type}", t.retrospective[retroType.toLowerCase()]),
            });
          }
        }
        onShowSavedRetro(retro);
      }
    } catch (error: any) {
      console.error("Retrospective generation failed:", error);
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
        showToast(t.retrospective.duplicate_error, "error");
      } else if (errStr.includes("No completed tasks")) {
        showToast(t.retrospective.no_tasks_error, "error");
      } else {
        showToast(`Error: ${errStr}`, "error");
      }
    } finally {
      setIsGenerating(false);
    }
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
    isCopied,
    inputValue,
    setInputValue,
    browseInputValue,
    setBrowseInputValue,
    foundRetro,
    genMessage,
    activeDates,
    handleGenerate,
    handleCopy,
  };
};
