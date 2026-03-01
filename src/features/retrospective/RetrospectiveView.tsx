import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { Sparkles, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Copy, Check } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  parse,
  isValid,
  eachWeekOfInterval,
  endOfISOWeek,
} from "date-fns";
import { Retrospective } from "@/types";
import { useToast } from "@/providers/ToastProvider";
import { cn } from "@/lib/utils";

interface RetrospectiveViewProps {
  workspaceId: number;
  t: any;
  onClose: () => void;
  onShowSavedRetro: (retro: Retrospective) => void;
}

// Helper to get consistent week key for WEEKLY view
const getWeekKey = (date: Date) => {
  const start = startOfMonth(date);
  const weeks = eachWeekOfInterval({ start, end: date }, { weekStartsOn: 1 });
  return `${format(date, "yyyy")}|${format(date, "MM")}|${weeks.length}`;
};

const Stepper = ({ 
  onPrev, 
  onNext, 
  prevDisabled, 
  nextDisabled,
  label 
}: { 
  onPrev: () => void; 
  onNext: () => void; 
  prevDisabled: boolean; 
  nextDisabled: boolean;
  label: string;
}) => (
  <div className="flex items-center justify-between w-full bg-surface border border-border rounded-2xl p-2 h-16 shadow-inner">
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={onPrev} 
      disabled={prevDisabled}
      className="rounded-xl w-12 h-12 hover:bg-primary/10 hover:text-primary transition-all active:scale-90 disabled:opacity-20"
    >
      <ChevronLeft size={24} />
    </Button>
    
    <div className="flex flex-col items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.span 
          key={label}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          className="text-lg font-black tracking-tighter text-text-primary whitespace-nowrap"
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </div>

    <Button 
      variant="ghost" 
      size="icon" 
      onClick={onNext} 
      disabled={nextDisabled}
      className="rounded-xl w-12 h-12 hover:bg-primary/10 hover:text-primary transition-all active:scale-90 disabled:opacity-20"
    >
      <ChevronRight size={24} />
    </Button>
  </div>
);

const DateSelector = ({ 
  type, 
  value, 
  onChange, 
  activeDates, 
  t 
}: { 
  type: "DAILY" | "WEEKLY" | "MONTHLY"; 
  value: string; 
  onChange: (val: string) => void; 
  activeDates: string[];
  t: any;
}) => {
  // 1. Available Dates processing
  const availableMonths = useMemo(() => {
    return Array.from(new Set(activeDates.map(d => d.substring(0, 7)))).sort();
  }, [activeDates]);

  const availableWeeks = useMemo(() => {
    const keys = new Set<string>();
    activeDates.forEach(d => {
      try {
        const date = parse(d, "yyyy-MM-dd", new Date());
        if (isValid(date)) keys.add(getWeekKey(date));
      } catch (e) { /* skip */ }
    });
    return Array.from(keys).sort((a, b) => {
      const [y1, m1, w1] = a.split("|").map(Number);
      const [y2, m2, w2] = b.split("|").map(Number);
      return y1 !== y2 ? y1 - y2 : m1 !== m2 ? m1 - m2 : w1 - w2;
    });
  }, [activeDates]);

  // 2. Stepper Logic for MONTHLY
  if (type === "MONTHLY") {
    const currentIndex = availableMonths.indexOf(value);
    const label = value ? `${value.split("-")[0]}${t.common.year} ${parseInt(value.split("-")[1])}${t.common.month}` : "---";
    
    return (
      <Stepper 
        label={label}
        onPrev={() => onChange(availableMonths[currentIndex - 1])}
        onNext={() => onChange(availableMonths[currentIndex + 1])}
        prevDisabled={currentIndex <= 0}
        nextDisabled={currentIndex === -1 || currentIndex >= availableMonths.length - 1}
      />
    );
  }

  // 3. Stepper Logic for WEEKLY
  if (type === "WEEKLY") {
    const currentIndex = availableWeeks.indexOf(value);
    let label = "---";
    if (value.includes("|")) {
      const [y, m, w] = value.split("|");
      label = `${y}${t.common.year} ${parseInt(m)}${t.common.month} ${w}${t.retrospective.week_unit || 'W'}`;
    }

    return (
      <Stepper 
        label={label}
        onPrev={() => onChange(availableWeeks[currentIndex - 1])}
        onNext={() => onChange(availableWeeks[currentIndex + 1])}
        prevDisabled={currentIndex <= 0}
        nextDisabled={currentIndex === -1 || currentIndex >= availableWeeks.length - 1}
      />
    );
  }

  // 4. Popover Logic for DAILY
  let currentParsedDate = new Date();
  try {
    const p = parse(value, "yyyy-MM-dd", new Date());
    if (isValid(p)) currentParsedDate = p;
  } catch (e) { /* ignore */ }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full h-16 bg-surface border-border rounded-2xl flex items-center justify-between px-6 hover:bg-surface-elevated transition-all group"
        >
          <div className="flex items-center gap-3">
            <CalendarIcon size={20} className="text-text-muted group-hover:text-primary transition-colors" />
            <span className="text-lg font-black tracking-tighter text-text-primary">
              {value.replace(/-/g, ". ")}
            </span>
          </div>
          <ChevronRight size={20} className="text-text-muted group-hover:translate-x-1 transition-transform" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-surface border-border rounded-2xl shadow-2xl" align="center">
        <Calendar
          mode="single"
          selected={currentParsedDate}
          onSelect={(date) => {
            if (date && isValid(date)) {
              onChange(format(date, "yyyy-MM-dd"));
            }
          }}
          disabled={(date) => !activeDates.includes(format(date, "yyyy-MM-dd"))}
          modifiers={{
            active: (date) => activeDates.includes(format(date, "yyyy-MM-dd"))
          }}
          modifiersClassNames={{
            active: "bg-primary/20 text-primary font-bold border border-primary/50"
          }}
          className="[color-scheme:dark]"
        />
      </PopoverContent>
    </Popover>
  );
};

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
          
          // Initial safe defaults
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

  const calculateRange = (val: string, type: "DAILY" | "WEEKLY" | "MONTHLY") => {
    if (!val) return { start: "", end: "", label: "" };
    try {
      if (type === "DAILY") return { start: val, end: val, label: val };
      if (type === "MONTHLY") {
        const date = parse(val, "yyyy-MM", new Date());
        if (!isValid(date)) return { start: "", end: "", label: "" };
        const label = `${val.split("-")[0]}${t.common.year} ${parseInt(val.split("-")[1])}${t.common.month} ${t.retrospective.monthly}`;
        return { 
          start: format(startOfMonth(date), "yyyy-MM-dd"), 
          end: format(endOfMonth(date), "yyyy-MM-dd"), 
          label
        };
      }
      if (type === "WEEKLY") {
        const [y, m, w] = val.split("|");
        const firstDay = new Date(parseInt(y), parseInt(m) - 1, 1);
        const weeks = eachWeekOfInterval({ start: firstDay, end: endOfMonth(firstDay) }, { weekStartsOn: 1 });
        const weekStart = weeks[parseInt(w) - 1] || weeks[0];
        const s = weekStart > firstDay ? weekStart : firstDay;
        const e_raw = endOfISOWeek(weekStart); 
        const e = e_raw < endOfMonth(firstDay) ? e_raw : endOfMonth(firstDay);
        const startStr = format(s, "yyyy-MM-dd");
        const endStr = format(e, "yyyy-MM-dd");
        return { 
          start: startStr, end: endStr, 
          label: `${y}${t.common.year} ${parseInt(m)}${t.common.month} ${w}${t.retrospective.week_unit || 'W'} (${startStr} ~ ${endStr})` 
        };
      }
    } catch (e) { console.error(e); }
    return { start: "", end: "", label: "" };
  };

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
        const retros = await invoke<Retrospective[]>("get_saved_retrospectives", { workspaceId, dateLabel: browseDateLabel });
        setFoundRetro(retros.length > 0 ? retros[0] : null);
      } catch (e) { console.error(e); }
    };
    fetchSavedRetro();
  }, [browseDateLabel, workspaceId, tab]);

  const handleGenerate = async () => {
    if (retroType === "DAILY" && !activeDates.includes(startDate)) {
      showToast(t.main.toast.no_data_for_date, "error");
      return;
    }
    setIsGenerating(true);
    setGenMessage(t.retrospective.gen_message);
    try {
      const retro = await invoke<Retrospective>("generate_retrospective", { workspaceId, startDate, endDate, retroType, dateLabel });
      let permission = await isPermissionGranted();
      if (!permission) permission = await requestPermission() === 'granted';
      if (permission) {
        sendNotification({
          title: t.retrospective.notification_title,
          body: t.retrospective.notification_body.replace("{label}", dateLabel).replace("{type}", t.retrospective[retroType.toLowerCase()]),
        });
      }
      onShowSavedRetro(retro);
    } catch (error: any) {
      if (error.toString().includes("already exists")) showToast(t.retrospective.duplicate_error, "error");
      else if (error.toString().includes("No completed tasks")) showToast(t.retrospective.no_tasks_error, "error");
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
      <aside className="w-72 border-r border-border bg-surface flex flex-col shrink-0 p-8 space-y-10">
        <Button 
          variant="ghost" 
          className="justify-start -ml-2 text-text-secondary hover:text-text-primary font-black h-12 px-3 group transition-all" 
          onClick={onClose}
        >
          <ChevronLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" />
          {t.sidebar.back}
        </Button>
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tighter text-text-primary leading-tight">
              {t.retrospective.title}
            </h2>
            <div className="h-1 w-12 bg-primary rounded-full" />
          </div>
          <nav className="space-y-3">
            {[
              { id: "create", label: t.retrospective.create_tab },
              { id: "browse", label: t.retrospective.browse_tab }
            ].map((item) => (
              <Button 
                key={item.id}
                variant={tab === item.id ? "secondary" : "ghost"} 
                className={cn(
                  "w-full justify-start h-14 rounded-2xl font-bold text-lg px-6 transition-all duration-300",
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
        <div className="flex-1 overflow-y-auto p-12 max-w-4xl mx-auto w-full space-y-12 pb-32">
          {tab === "create" ? (
            <div className="space-y-10">
              <div className="space-y-3">
                <h1 className="text-5xl font-black tracking-tighter text-text-primary leading-none">
                  {t.retrospective.create_title}
                </h1>
                <p className="text-xl text-text-secondary font-bold tracking-tight">
                  {t.retrospective.create_desc}
                </p>
              </div>

              <div className="p-10 bg-surface border border-border rounded-[32px] space-y-10 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Sparkles size={120} />
                </div>

                <div className="space-y-4">
                  <div className="flex gap-2">
                    {(["DAILY", "WEEKLY", "MONTHLY"] as const).map((type) => (
                      <Button 
                        key={type} 
                        variant={retroType === type ? "default" : "outline"} 
                        onClick={() => handleTypeChange(type)} 
                        className={cn(
                          "flex-1 font-black h-14 rounded-2xl border-border text-base transition-all",
                          retroType === type ? "shadow-lg scale-[1.02]" : "hover:bg-surface-elevated"
                        )}
                      >
                        {type === "DAILY" ? t.retrospective.daily : type === "WEEKLY" ? t.retrospective.weekly : t.retrospective.monthly}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
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
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-primary/5 border border-primary/20 rounded-2xl flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Sparkles size={20} className="text-primary animate-pulse" />
                    </div>
                    <p className="text-sm text-primary font-black tracking-tight">{genMessage}</p>
                  </motion.div>
                )}
              </div>

              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating} 
                className="w-full bg-text-primary text-background hover:bg-zinc-200 h-20 rounded-[28px] font-black text-2xl shadow-2xl active:scale-95 disabled:opacity-50 transition-all duration-300 group"
              >
                {isGenerating ? (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-4 border-background/30 border-t-background rounded-full animate-spin" />
                    {t.retrospective.generating}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    {t.retrospective.generate_btn}
                    <Sparkles size={24} className="group-hover:rotate-12 transition-transform" />
                  </div>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-10">
              <div className="space-y-3">
                <h1 className="text-5xl font-black tracking-tighter text-text-primary leading-none">
                  {t.retrospective.browse_title}
                </h1>
                <p className="text-xl text-text-secondary font-bold tracking-tight">
                  {t.retrospective.browse_desc}
                </p>
              </div>

              <div className="p-10 bg-surface border border-border rounded-[32px] space-y-10 shadow-2xl relative">
                <div className="flex gap-2">
                  {(["DAILY", "WEEKLY", "MONTHLY"] as const).map((type) => (
                    <Button 
                      key={type} 
                      variant={browseType === type ? "default" : "outline"} 
                      onClick={() => handleBrowseTypeChange(type)} 
                      className={cn(
                        "flex-1 font-black h-14 rounded-2xl border-border text-base transition-all",
                        browseType === type ? "shadow-lg scale-[1.02]" : "hover:bg-surface-elevated"
                      )}
                    >
                      {type === "DAILY" ? t.retrospective.daily : type === "WEEKLY" ? t.retrospective.weekly : t.retrospective.monthly}
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
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="p-12 bg-surface rounded-[48px] border border-border shadow-2xl space-y-10"
                  >
                    <div className="flex justify-between items-start pb-8 border-b border-border/50">
                      <div className="space-y-2">
                        <h2 className="text-3xl font-black text-text-primary tracking-tighter flex items-center gap-4 leading-none">
                          <div className="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center">
                            <Sparkles size={28} className="text-warning" />
                          </div>
                          {foundRetro.dateLabel}
                        </h2>
                        {foundRetro.usedModel && (
                          <p className="text-[11px] font-black text-text-muted uppercase tracking-[0.2em] ml-16">
                            AI Engine: {foundRetro.usedModel.replace('models/', '').toUpperCase()}
                          </p>
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="w-12 h-12 rounded-2xl hover:bg-primary/10 transition-all active:scale-90"
                        onClick={() => handleCopy(foundRetro.content)}
                      >
                        {isCopied ? <Check size={20} className="text-green-400" /> : <Copy size={20} />}
                      </Button>
                    </div>

                    <div className="prose prose-invert max-w-none prose-p:text-lg prose-p:leading-relaxed prose-p:text-text-secondary prose-headings:font-black prose-headings:tracking-tighter prose-headings:text-text-primary prose-strong:text-primary prose-code:text-warning prose-code:bg-warning/5 prose-code:px-1 prose-code:rounded prose-ul:space-y-3 prose-li:text-text-secondary">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{foundRetro.content}</ReactMarkdown>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-20 border-2 border-dashed border-border rounded-[48px] flex flex-col items-center justify-center text-center space-y-6 bg-surface/30 backdrop-blur-sm"
                  >
                    <div className="w-24 h-24 rounded-[32px] bg-border/20 flex items-center justify-center text-text-muted transition-transform hover:scale-105 duration-500">
                      <CalendarIcon size={48} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-2xl text-text-secondary font-black tracking-tight">
                        {t.retrospective.no_data_for_label}
                      </p>
                      <p className="text-text-muted font-bold tracking-tight">
                        {t.retrospective.select_another_range || "다른 기간을 선택하거나 회고를 생성해 보세요."}
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
