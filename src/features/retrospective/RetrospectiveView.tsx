import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { Sparkles, ChevronLeft } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parse } from "date-fns";
import { Retrospective } from "@/types";
import { useToast } from "@/providers/ToastProvider";

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
        setActiveDates(dates);
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
    if (retroType === "DAILY") setInputValue(format(now, "yyyy-MM-dd"));
    else if (retroType === "WEEKLY") setInputValue(format(now, "RRRR-'W'II"));
    else if (retroType === "MONTHLY") setInputValue(format(now, "yyyy-MM"));
  }, [retroType]);

  useEffect(() => {
    const now = new Date();
    if (browseType === "DAILY") setBrowseInputValue(format(now, "yyyy-MM-dd"));
    else if (browseType === "WEEKLY") setBrowseInputValue(format(now, "RRRR-'W'II"));
    else if (browseType === "MONTHLY") setBrowseInputValue(format(now, "yyyy-MM"));
  }, [browseType]);

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
            <div className="space-y-12">
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

                <div className="grid grid-cols-1 gap-8">
                  <div className="space-y-4">
                    <Label className="text-xs font-black text-text-secondary uppercase tracking-widest">
                      {retroType === "DAILY" ? t.retrospective.select_date : retroType === "WEEKLY" ? t.retrospective.select_week : t.retrospective.select_month}
                    </Label>
                    <Input 
                      type={retroType === "DAILY" ? "date" : retroType === "WEEKLY" ? "week" : "month"} 
                      value={inputValue} 
                      onChange={(e) => setInputValue(e.target.value)}
                      className={`bg-surface border-border h-12 rounded-xl px-4 font-bold [color-scheme:dark] ${retroType === 'DAILY' && !activeDates.includes(inputValue) ? 'border-danger/50 text-danger' : ''}`}
                      list={retroType === "DAILY" ? "active-dates" : undefined}
                    />
                    {retroType === "DAILY" && (
                      <datalist id="active-dates">
                        {activeDates.map(d => <option key={d} value={d} />)}
                      </datalist>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-surface rounded-2xl border border-border space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-text-secondary uppercase tracking-tighter">{t.retrospective.selected_range}</span>
                    <span className="text-text-primary">{startDate} ~ {endDate}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-text-secondary uppercase tracking-tighter">{t.retrospective.final_label}</span>
                    <span className="text-text-primary">{dateLabel}</span>
                  </div>
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
            <div className="space-y-12">
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

                <div className="grid grid-cols-1 gap-8">
                  <div className="space-y-4">
                    <Label className="text-xs font-black text-text-secondary uppercase tracking-widest">
                      {browseType === "DAILY" ? t.retrospective.select_date : browseType === "WEEKLY" ? t.retrospective.select_week : t.retrospective.select_month}
                    </Label>
                    <Input 
                      type={browseType === "DAILY" ? "date" : browseType === "WEEKLY" ? "week" : "month"} 
                      value={browseInputValue} 
                      onChange={(e) => setBrowseInputValue(e.target.value)}
                      className="bg-surface border-border h-12 rounded-xl px-4 font-bold [color-scheme:dark]"
                    />
                  </div>
                </div>

                <div className="p-4 bg-surface rounded-2xl border border-border space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-text-secondary uppercase tracking-tighter">{t.retrospective.final_label}</span>
                    <span className="text-text-primary">{browseDateLabel}</span>
                  </div>
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
