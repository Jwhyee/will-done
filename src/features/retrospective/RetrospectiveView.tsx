import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  parse,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
} from "date-fns";
import { Retrospective } from "@/types";
import { useToast } from "@/providers/ToastProvider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RetrospectiveViewProps {
  workspaceId: number;
  t: any;
  onClose: () => void;
  onShowSavedRetro: (retro: Retrospective) => void;
}

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
  const activeDateObjects = useMemo(() => activeDates.map(d => parse(d, "yyyy-MM-dd", new Date())), [activeDates]);
  
  const minDate = activeDateObjects.length > 0 ? activeDateObjects[0] : null;
  const maxDate = activeDateObjects.length > 0 ? activeDateObjects[activeDateObjects.length - 1] : null;

  if (type === "DAILY") {
    const selectedDate = parse(value, "yyyy-MM-dd", new Date());
    return (
      <div className="flex justify-center p-4 bg-surface rounded-2xl border border-border">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && onChange(format(date, "yyyy-MM-dd"))}
          disabled={(date) => !activeDates.includes(format(date, "yyyy-MM-dd"))}
          modifiers={{
            active: (date) => activeDates.includes(format(date, "yyyy-MM-dd"))
          }}
          modifiersClassNames={{
            active: "bg-primary/20 text-primary font-bold border border-primary/50"
          }}
          className="[color-scheme:dark]"
        />
      </div>
    );
  }

  const handleStep = (direction: "prev" | "next") => {
    if (type === "WEEKLY") {
      const [year, weekStr] = value.split("-W");
      const current = parse(`${year}-${weekStr}-1`, "RRRR-II-i", new Date());
      const next = direction === "prev" ? subWeeks(current, 1) : addWeeks(current, 1);
      onChange(format(next, "RRRR-'W'II"));
    } else {
      const current = parse(value, "yyyy-MM", new Date());
      const next = direction === "prev" ? subMonths(current, 1) : addMonths(current, 1);
      onChange(format(next, "yyyy-MM"));
    }
  };

  const isPrevDisabled = useMemo(() => {
    if (!minDate) return true;
    if (type === "WEEKLY") {
      const [year, weekStr] = value.split("-W");
      const current = parse(`${year}-${weekStr}-1`, "RRRR-II-i", new Date());
      return startOfWeek(current, { weekStartsOn: 1 }) <= startOfWeek(minDate, { weekStartsOn: 1 });
    } else {
      const current = parse(value, "yyyy-MM", new Date());
      return startOfMonth(current) <= startOfMonth(minDate);
    }
  }, [value, type, minDate]);

  const isNextDisabled = useMemo(() => {
    if (!maxDate) return true;
    if (type === "WEEKLY") {
      const [year, weekStr] = value.split("-W");
      const current = parse(`${year}-${weekStr}-1`, "RRRR-II-i", new Date());
      return endOfWeek(current, { weekStartsOn: 1 }) >= endOfWeek(maxDate, { weekStartsOn: 1 });
    } else {
      const current = parse(value, "yyyy-MM", new Date());
      return endOfMonth(current) >= endOfMonth(maxDate);
    }
  }, [value, type, maxDate]);

  return (
    <div className="flex items-center justify-between p-6 bg-surface rounded-2xl border border-border">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => handleStep("prev")} 
              disabled={isPrevDisabled}
              className="h-12 w-12 rounded-xl border-border hover:bg-surface-elevated"
            >
              <ChevronLeft size={20} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t.retrospective.prev_period}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="text-2xl font-black text-text-primary tracking-tighter">
        {value}
      </div>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => handleStep("next")} 
              disabled={isNextDisabled}
              className="h-12 w-12 rounded-xl border-border hover:bg-surface-elevated"
            >
              <ChevronRight size={20} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t.retrospective.next_period}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
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
  
  // Create tab inputs
  const [inputValue, setInputValue] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dateLabel, setDateLabel] = useState(format(new Date(), "yyyy-MM-dd"));
  
  // Browse tab inputs
  const [browseInputValue, setBrowseInputValue] = useState(format(new Date(), "yyyy-MM-dd"));
  const [browseDateLabel, setBrowseDateLabel] = useState(format(new Date(), "yyyy-MM-dd"));
  const [foundRetro, setFoundRetro] = useState<Retrospective | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState("");
  const [activeDates, setActiveDates] = useState<string[]>([]);

  useEffect(() => {
    const fetchActiveDates = async () => {
      try {
        const dates = await invoke<string[]>("get_active_dates", { workspaceId });
        setActiveDates(dates.sort());
      } catch (e) {
        console.error("Failed to fetch active dates:", e);
      }
    };
    fetchActiveDates();
  }, [workspaceId]);

  // Helper to calculate ranges (Unify logic)
  const calculateRange = (val: string, type: "DAILY" | "WEEKLY" | "MONTHLY") => {
    let start = "";
    let end = "";
    let label = val;

    try {
      if (type === "DAILY") {
        start = val;
        end = val;
      } else if (type === "WEEKLY") {
        const [year, weekStr] = val.split("-W");
        const date = parse(`${year}-${weekStr}-1`, "RRRR-II-i", new Date());
        start = format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
        end = format(endOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
        label = `${year} ${weekStr}W (${start} ~ ${end})`;
      } else if (type === "MONTHLY") {
        const date = parse(val, "yyyy-MM", new Date());
        start = format(startOfMonth(date), "yyyy-MM-dd");
        end = format(endOfMonth(date), "yyyy-MM-dd");
        label = `${format(date, "yyyy-MM")} Retrospective`;
      }
    } catch (e) {
      console.error("Date parsing error:", e);
    }
    return { start, end, label };
  };

  // Sync Create inputs
  useEffect(() => {
    if (!inputValue) return;
    const { start, end, label } = calculateRange(inputValue, retroType);
    setStartDate(start);
    setEndDate(end);
    setDateLabel(label);
  }, [inputValue, retroType]);

  // Sync Browse inputs & Auto Query
  useEffect(() => {
    if (!browseInputValue) return;
    const { label } = calculateRange(browseInputValue, browseType);
    setBrowseDateLabel(label);
  }, [browseInputValue, browseType]);

  useEffect(() => {
    const fetchSavedRetro = async () => {
      if (tab !== "browse") return;
      try {
        const retros = await invoke<Retrospective[]>("get_saved_retrospectives", { 
          workspaceId, 
          dateLabel: browseDateLabel 
        });
        setFoundRetro(retros.length > 0 ? retros[0] : null);
      } catch (e) {
        console.error("Fetch saved retro failed:", e);
      }
    };
    fetchSavedRetro();
  }, [browseDateLabel, workspaceId, tab]);

  // Reset input value when type changes
  useEffect(() => {
    const now = new Date();
    const latestActive = activeDates.length > 0 ? activeDates[activeDates.length - 1] : format(now, "yyyy-MM-dd");
    const refDate = parse(latestActive, "yyyy-MM-dd", new Date());

    if (retroType === "DAILY") setInputValue(latestActive);
    else if (retroType === "WEEKLY") setInputValue(format(refDate, "RRRR-'W'II"));
    else if (retroType === "MONTHLY") setInputValue(format(refDate, "yyyy-MM"));
  }, [retroType, activeDates]);

  useEffect(() => {
    const now = new Date();
    const latestActive = activeDates.length > 0 ? activeDates[activeDates.length - 1] : format(now, "yyyy-MM-dd");
    const refDate = parse(latestActive, "yyyy-MM-dd", new Date());

    if (browseType === "DAILY") setBrowseInputValue(latestActive);
    else if (browseType === "WEEKLY") setBrowseInputValue(format(refDate, "RRRR-'W'II"));
    else if (browseType === "MONTHLY") setBrowseInputValue(format(refDate, "yyyy-MM"));
  }, [browseType, activeDates]);

  const handleGenerate = async () => {
    if (retroType === "DAILY" && !activeDates.includes(startDate)) {
      showToast(t.main.toast.no_data_for_date, "error");
      return;
    }

    setIsGenerating(true);
    setGenMessage(t.retrospective.gen_message);
    
    try {
      const retro = await invoke<Retrospective>("generate_retrospective", {
        workspaceId,
        startDate,
        endDate,
        retroType,
        dateLabel
      });

      let permission = await isPermissionGranted();
      if (!permission) {
        permission = await requestPermission() === 'granted';
      }
      if (permission) {
        sendNotification({
          title: t.retrospective.notification_title,
          body: t.retrospective.notification_body
            .replace("{label}", dateLabel)
            .replace("{type}", t.retrospective[retroType.toLowerCase()]),
        });
      }
      
      onShowSavedRetro(retro);
    } catch (error: any) {
      if (error.toString().includes("already exists")) {
        showToast(t.retrospective.duplicate_error, "error");
      } else if (error.toString().includes("No completed tasks")) {
        showToast(t.retrospective.no_tasks_error, "error");
      } else {
        showToast(`Error: ${error}`, "error");
      }
    } finally {
      setIsGenerating(false);
      setGenMessage("");
    }
  };

  const handleBrowseLatest = async () => {
    try {
      const latest = await invoke<Retrospective | null>("get_latest_saved_retrospective", { workspaceId });
      if (latest) {
        onShowSavedRetro(latest);
      } else {
        showToast(t.retrospective.no_latest, "error");
      }
    } catch (error: any) {
      showToast(error.toString(), "error");
    }
  };

  return (
    <div className="flex-1 flex h-screen overflow-hidden bg-background antialiased">
      <aside className="w-64 border-r border-border bg-surface flex flex-col shrink-0 p-6 space-y-8">
        <Button 
          variant="ghost" 
          className="justify-start -ml-2 text-text-secondary hover:text-text-primary font-bold h-10 px-2 group transition-all"
          onClick={onClose}
        >
          <ChevronLeft size={18} className="mr-1 group-hover:-translate-x-1 transition-transform" />
          {t.sidebar.back}
        </Button>

        <div className="space-y-4">
          <h2 className="text-xl font-black tracking-tighter text-text-primary">{t.retrospective.title}</h2>
          <nav className="space-y-2">
            <Button 
              variant={tab === "create" ? "secondary" : "ghost"} 
              className="w-full justify-start font-bold"
              onClick={() => setTab("create")}
            >
              {t.retrospective.create_tab}
            </Button>
            <Button 
              variant={tab === "browse" ? "secondary" : "ghost"} 
              className="w-full justify-start font-bold"
              onClick={() => setTab("browse")}
            >
              {t.retrospective.browse_tab}
            </Button>
          </nav>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-12 max-w-4xl mx-auto w-full space-y-12 pb-24">
          {tab === "create" ? (
            <div className="space-y-8">
              <div className="space-y-2">
                <h1 className="text-4xl font-black tracking-tighter text-text-primary">{t.retrospective.create_title}</h1>
                <p className="text-text-secondary font-bold">{t.retrospective.create_desc}</p>
              </div>

              <div className="p-8 bg-surface-elevated border border-border rounded-3xl space-y-8 shadow-2xl">
                <div className="space-y-4">
                  <Label className="text-xs font-black text-text-secondary uppercase tracking-widest">{t.retrospective.type_label}</Label>
                  <div className="flex gap-4">
                    {(["DAILY", "WEEKLY", "MONTHLY"] as const).map((type) => (
                      <Button 
                        key={type}
                        variant={retroType === type ? "default" : "outline"}
                        onClick={() => setRetroType(type)}
                        className="flex-1 font-bold h-12 rounded-xl border-border"
                      >
                        {type === "DAILY" ? t.retrospective.daily : type === "WEEKLY" ? t.retrospective.weekly : t.retrospective.monthly}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-xs font-black text-text-secondary uppercase tracking-widest">
                    {retroType === "DAILY" ? t.retrospective.select_date : retroType === "WEEKLY" ? t.retrospective.select_week : t.retrospective.select_month}
                  </Label>
                  <DateSelector 
                    type={retroType}
                    value={inputValue}
                    onChange={setInputValue}
                    activeDates={activeDates}
                    t={t}
                  />
                </div>

                {genMessage && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-3">
                    <Sparkles size={18} className="text-blue-400 animate-pulse shrink-0" />
                    <p className="text-xs text-blue-400 font-bold">{genMessage}</p>
                  </div>
                )}

                <Button 
                  onClick={handleGenerate} 
                  disabled={isGenerating}
                  className="w-full bg-text-primary text-background hover:bg-zinc-200 h-14 rounded-2xl font-black text-lg shadow-xl active:scale-95 disabled:opacity-50"
                >
                  {isGenerating ? t.retrospective.generating : t.retrospective.generate_btn}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <h1 className="text-4xl font-black tracking-tighter text-text-primary">{t.retrospective.browse_title}</h1>
                  <p className="text-text-secondary font-bold">{t.retrospective.browse_desc}</p>
                </div>
                <Button 
                  onClick={handleBrowseLatest} 
                  variant="outline"
                  className="rounded-xl font-bold border-border h-12 gap-2 group"
                >
                  <Sparkles size={18} className="text-yellow-400 group-hover:scale-110 transition-transform" />
                  {t.retrospective.latest_title}
                </Button>
              </div>

              <div className="p-8 bg-surface-elevated border border-border rounded-3xl space-y-8 shadow-2xl">
                <div className="space-y-4">
                  <Label className="text-xs font-black text-text-secondary uppercase tracking-widest">{t.retrospective.type_label}</Label>
                  <div className="flex gap-4">
                    {(["DAILY", "WEEKLY", "MONTHLY"] as const).map((type) => (
                      <Button 
                        key={type}
                        variant={browseType === type ? "default" : "outline"}
                        onClick={() => setBrowseType(type)}
                        className="flex-1 font-bold h-12 rounded-xl border-border"
                      >
                        {type === "DAILY" ? t.retrospective.daily : type === "WEEKLY" ? t.retrospective.weekly : t.retrospective.monthly}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-xs font-black text-text-secondary uppercase tracking-widest">
                    {browseType === "DAILY" ? t.retrospective.select_date : browseType === "WEEKLY" ? t.retrospective.select_week : t.retrospective.select_month}
                  </Label>
                  <DateSelector 
                    type={browseType}
                    value={browseInputValue}
                    onChange={setBrowseInputValue}
                    activeDates={activeDates}
                    t={t}
                  />
                </div>
              </div>

              {foundRetro ? (
                <div className="p-10 bg-surface rounded-[40px] border border-border shadow-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between items-center pb-6 border-b border-border/50">
                    <h2 className="text-2xl font-black text-text-primary tracking-tighter flex items-center gap-3">
                      <Sparkles size={24} className="text-warning" />
                      {foundRetro.dateLabel}
                    </h2>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-[10px] font-black uppercase tracking-widest h-8"
                      onClick={() => navigator.clipboard.writeText(foundRetro.content)}
                    >
                      {t.retrospective.copy_markdown}
                    </Button>
                  </div>
                  <div className="prose prose-invert max-w-none text-sm leading-relaxed prose-headings:font-black prose-headings:tracking-tighter">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {foundRetro.content}
                    </ReactMarkdown>
                  </div>
                  {foundRetro.usedModel && (
                    <div className="pt-6 flex justify-end border-t border-border/50">
                      <span className="text-[10px] font-black text-text-muted uppercase tracking-widest bg-surface-elevated px-2 py-1 rounded-md border border-border">
                        {t.retrospective.used_model}: {foundRetro.usedModel.replace('models/', '')}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-16 border-2 border-dashed border-border rounded-[40px] flex flex-col items-center justify-center text-center space-y-4 bg-surface/30">
                  <div className="w-16 h-16 rounded-full bg-border/30 flex items-center justify-center text-text-muted">
                    <Sparkles size={32} />
                  </div>
                  <p className="text-text-secondary font-bold">{t.retrospective.no_data_for_label}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
