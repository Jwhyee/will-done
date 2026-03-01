import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { ChevronLeft, Calendar as CalendarIcon, Copy, Check, Loader2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  format, 
  parse,
  isValid,
} from "date-fns";
import { Retrospective } from "@/types";
import { useToast } from "@/providers/ToastProvider";
import { cn } from "@/lib/utils";
import { DateSelector } from "./components/DateSelector";
import { getWeekKey, calculateRange } from "./utils";

interface RetrospectiveViewProps {
  workspaceId: number;
  t: any;
  onClose: () => void;
  onShowSavedRetro: (retro: Retrospective) => void;
}

export const RetrospectiveView = ({ 
  workspaceId, 
  t,
  onClose, 
  onShowSavedRetro 
}: RetrospectiveViewProps) => {
  const [tab, setTab] = useState<"create" | "browse">("create");
  const [retroType, setRetroType] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("DAILY");
  const [browseType, setBrowseType] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("DAILY");
  const { showToast } = useToast();
  const [isCopied, setIsCopied] = useState(false);
  
  const [inputValue, setInputValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  
  const [browseInputValue, setBrowseInputValue] = useState("");
  const [browseDateLabel, setBrowseDateLabel] = useState("");
  const [foundRetro, setFoundRetro] = useState<Retrospective | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState("");
  const [activeDates, setActiveDates] = useState<string[]>([]);

  useEffect(() => {
    const fetchActiveDates = async () => {
      try {
        const dates = await invoke<string[]>("get_active_dates", { workspaceId });
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

  const handleTypeChange = (newType: "DAILY" | "WEEKLY" | "MONTHLY") => {
    const latestActive = activeDates.length > 0 ? activeDates[activeDates.length - 1] : format(new Date(), "yyyy-MM-dd");
    let newValue = latestActive;
    
    if (newType === "MONTHLY") {
      newValue = latestActive.substring(0, 7);
    } else if (newType === "WEEKLY") {
      try {
        const d = parse(latestActive, "yyyy-MM-dd", new Date());
        newValue = getWeekKey(isValid(d) ? d : new Date());
      } catch (e) { newValue = `${latestActive.split("-")[0]}|${latestActive.split("-")[1]}|1`; }
    }
    
    setRetroType(newType);
    setInputValue(newValue);
  };

  const handleBrowseTypeChange = (newType: "DAILY" | "WEEKLY" | "MONTHLY") => {
    const latestActive = activeDates.length > 0 ? activeDates[activeDates.length - 1] : format(new Date(), "yyyy-MM-dd");
    let newValue = latestActive;
    
    if (newType === "MONTHLY") {
      newValue = latestActive.substring(0, 7);
    } else if (newType === "WEEKLY") {
      try {
        const d = parse(latestActive, "yyyy-MM-dd", new Date());
        newValue = getWeekKey(isValid(d) ? d : new Date());
      } catch (e) { newValue = `${latestActive.split("-")[0]}|${latestActive.split("-")[1]}|1`; }
    }
    
    setBrowseType(newType);
    setBrowseInputValue(newValue);
  };

  useEffect(() => {
    if (!inputValue) return;
    const { start, end, label } = calculateRange(inputValue, retroType, t);
    setStartDate(start); setEndDate(end); setDateLabel(label);
  }, [inputValue, retroType, t]);

  useEffect(() => {
    if (!browseInputValue) return;
    const { label } = calculateRange(browseInputValue, browseType, t);
    setBrowseDateLabel(label);
  }, [browseInputValue, browseType, t]);

  useEffect(() => {
    const fetchSavedRetro = async () => {
      if (tab !== "browse" || !browseDateLabel) return;
      try {
        const retros = await invoke<Retrospective[]>("get_saved_retrospectives", { workspaceId, dateLabel: browseDateLabel });
        setFoundRetro(retros.length > 0 ? retros[0] : null);
      } catch (e) { console.error(e); }
    };
    fetchSavedRetro();
  }, [browseDateLabel, workspaceId, tab]);

  const handleGenerate = async () => {
    if (retroType === "DAILY" && !activeDates.includes(startDate)) {
      showToast(t.main?.toast?.no_data_for_date || '해당 날짜에 데이터가 없습니다.', "error");
      return;
    }
    setIsGenerating(true);
    setGenMessage(t.retrospective?.gen_message || '회고를 생성 중입니다...');
    try {
      const retro = await invoke<Retrospective>("generate_retrospective", { workspaceId, startDate, endDate, retroType, dateLabel });
      let permission = await isPermissionGranted();
      if (!permission) permission = await requestPermission() === 'granted';
      if (permission) {
        sendNotification({
          title: t.retrospective?.notification_title || '회고 생성 완료!',
          body: (t.retrospective?.notification_body || '{label} {type} 회고가 생성되었습니다.')
            .replace("{label}", dateLabel)
            .replace("{type}", t.retrospective?.[retroType.toLowerCase()] || ''),
        });
      }
      onShowSavedRetro(retro);
    } catch (error: any) {
      if (error.toString().includes("already exists")) showToast(t.retrospective?.duplicate_error || '이미 존재하는 회고입니다.', "error");
      else if (error.toString().includes("No completed tasks")) showToast(t.retrospective?.no_tasks_error || '완료된 태스크가 없습니다.', "error");
      else showToast(`Error: ${error}`, "error");
    } finally {
      setIsGenerating(false); setGenMessage("");
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex h-screen overflow-hidden bg-background antialiased selection:bg-primary/30">
      <aside className="w-64 border-r border-border bg-surface flex flex-col shrink-0 p-6 space-y-8">
        <Button 
          variant="ghost" 
          className="justify-start -ml-2 text-text-secondary hover:text-text-primary font-bold h-10 px-3 group transition-all" 
          onClick={onClose}
        >
          <ChevronLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm">{t.sidebar?.back || '뒤로 가기'}</span>
        </Button>
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight text-text-primary leading-tight">
              {t.retrospective?.title || '회고'}
            </h2>
          </div>
          <nav className="space-y-1.5">
            {[
              { id: "create", label: t.retrospective?.create_tab || '회고 생성' },
              { id: "browse", label: t.retrospective?.browse_tab || '회고 조회' }
            ].map((item) => (
              <Button 
                key={item.id}
                variant={tab === item.id ? "secondary" : "ghost"} 
                className={cn(
                  "w-full justify-start h-11 rounded-xl font-bold text-sm px-4 transition-all duration-300",
                  tab === item.id ? "bg-primary/10 text-primary shadow-sm" : "text-text-secondary hover:translate-x-1"
                )}
                onClick={() => setTab(item.id as any)}
              >
                {item.label}
              </Button>
            ))}
          </nav>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full space-y-8 pb-32">
          {tab === "create" ? (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <h1 className="text-2xl font-black tracking-tighter text-text-primary leading-none">
                  {t.retrospective?.create_title || '새 회고 생성'}
                </h1>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {t.retrospective?.create_desc || '업무를 돌아보고 더 나은 내일을 계획하세요.'}
                </p>
              </div>

              <div className="p-6 bg-surface border border-border rounded-2xl space-y-6 shadow-xl relative overflow-hidden group">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {(["DAILY", "WEEKLY", "MONTHLY"] as const).map((type) => (
                      <Button 
                        key={type} 
                        variant={retroType === type ? "default" : "outline"} 
                        onClick={() => handleTypeChange(type)} 
                        className={cn(
                          "flex-1 font-bold h-10 rounded-xl border-border text-xs transition-all",
                          retroType === type ? "shadow-md scale-[1.01]" : "hover:bg-surface-elevated"
                        )}
                      >
                        {type === "DAILY" ? t.retrospective?.daily : type === "WEEKLY" ? t.retrospective?.weekly : t.retrospective?.monthly}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <DateSelector 
                    type={retroType} 
                    value={inputValue} 
                    onChange={setInputValue} 
                    activeDates={activeDates} 
                    t={t} 
                  />
                </div>

                {genMessage && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center gap-3"
                  >
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    <p className="text-xs text-primary font-bold tracking-tight">{genMessage}</p>
                  </motion.div>
                )}
              </div>

              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating} 
                className="w-full bg-text-primary text-background hover:bg-zinc-200 h-14 rounded-2xl font-black text-lg shadow-xl active:scale-95 disabled:opacity-50 transition-all duration-300 group"
              >
                {isGenerating ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t.retrospective?.generating || '생성 중...'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {t.retrospective?.generate_btn || '회고 생성하기'}
                  </div>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <h1 className="text-2xl font-black tracking-tighter text-text-primary leading-none">
                  {t.retrospective?.browse_title || '회고 조회'}
                </h1>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {t.retrospective?.browse_desc || '과거의 기록들을 톺아보며 성장을 확인하세요.'}
                </p>
              </div>

              <div className="p-6 bg-surface border border-border rounded-2xl space-y-6 shadow-xl relative">
                <div className="flex gap-2">
                  {(["DAILY", "WEEKLY", "MONTHLY"] as const).map((type) => (
                    <Button 
                      key={type} 
                      variant={browseType === type ? "default" : "outline"} 
                      onClick={() => handleBrowseTypeChange(type)} 
                      className={cn(
                        "flex-1 font-bold h-10 rounded-xl border-border text-xs transition-all",
                        browseType === type ? "shadow-md scale-[1.01]" : "hover:bg-surface-elevated"
                      )}
                    >
                      {type === "DAILY" ? t.retrospective?.daily : type === "WEEKLY" ? t.retrospective?.weekly : t.retrospective?.monthly}
                    </Button>
                  ))}
                </div>
                <DateSelector 
                  type={browseType} 
                  value={browseInputValue} 
                  onChange={setBrowseInputValue} 
                  activeDates={activeDates} 
                  t={t} 
                />
              </div>

              <AnimatePresence mode="wait">
                {foundRetro ? (
                  <motion.div 
                    key={foundRetro.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-8 bg-surface rounded-3xl border border-border shadow-xl space-y-6"
                  >
                    <div className="flex justify-between items-start pb-6 border-b border-border/50">
                      <div className="space-y-1.5">
                        <h2 className="text-lg font-bold text-text-primary tracking-tight leading-none">
                          {foundRetro.dateLabel}
                        </h2>
                        {foundRetro.usedModel && (
                          <p className="text-xs font-medium text-text-secondary uppercase tracking-widest">
                            Engine: {foundRetro.usedModel.replace('models/', '').toUpperCase()}
                          </p>
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="w-10 h-10 rounded-xl hover:bg-primary/10 transition-all active:scale-90"
                        onClick={() => handleCopy(foundRetro.content)}
                      >
                        {isCopied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                      </Button>
                    </div>

                    <div className="prose prose-invert max-w-none prose-p:text-sm prose-p:leading-relaxed prose-p:text-text-secondary prose-headings:font-black prose-headings:tracking-tighter prose-headings:text-text-primary prose-strong:text-primary prose-code:text-warning prose-code:bg-warning/5 prose-code:px-1 prose-code:rounded prose-ul:space-y-2 prose-li:text-text-secondary prose-li:text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{foundRetro.content}</ReactMarkdown>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-12 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-center space-y-4 bg-surface/30 backdrop-blur-sm"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-border/20 flex items-center justify-center text-text-secondary transition-transform hover:scale-105 duration-500">
                      <CalendarIcon size={32} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg text-text-primary font-bold tracking-tight">
                        {t.retrospective?.no_data_for_label || '회고 데이터가 없습니다.'}
                      </p>
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {t.retrospective?.select_another_range || "다른 기간을 선택하거나 회고를 생성해 보세요."}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
