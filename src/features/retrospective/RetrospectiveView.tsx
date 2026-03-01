import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { Sparkles, Calendar as CalendarIcon, ChevronLeft } from "lucide-react";
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
  const { showToast } = useToast();
  
  // input value state (what the user sees/types in the input)
  const [inputValue, setInputValue] = useState(format(new Date(), "yyyy-MM-dd"));
  
  // actual date range for backend
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dateLabel, setDateLabel] = useState(format(new Date(), "yyyy-MM-dd"));
  
  const [browseDate, setBrowseDate] = useState(format(new Date(), "yyyy-MM-dd"));
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

  // Handle input change and update start/end dates
  useEffect(() => {
    if (!inputValue) return;

    let start = "";
    let end = "";
    let label = inputValue;

    try {
      if (retroType === "DAILY") {
        start = inputValue;
        end = inputValue;
      } else if (retroType === "WEEKLY") {
        // HTML week input format: YYYY-Www
        const [year, weekStr] = inputValue.split("-W");
        const date = parse(`${year}-${weekStr}-1`, "RRRR-II-i", new Date());
        start = format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
        end = format(endOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
        label = `${year} ${weekStr}W (${start} ~ ${end})`;
      } else if (retroType === "MONTHLY") {
        // HTML month input format: YYYY-MM
        const date = parse(inputValue, "yyyy-MM", new Date());
        start = format(startOfMonth(date), "yyyy-MM-dd");
        end = format(endOfMonth(date), "yyyy-MM-dd");
        label = `${format(date, "yyyy-MM")} Retrospective`;
      }

      setStartDate(start);
      setEndDate(end);
      setDateLabel(label);
    } catch (e) {
      console.error("Date parsing error:", e);
    }
  }, [inputValue, retroType]);

  // Reset input value when type changes to match the expected format
  useEffect(() => {
    const now = new Date();
    if (retroType === "DAILY") {
      setInputValue(format(now, "yyyy-MM-dd"));
    } else if (retroType === "WEEKLY") {
      setInputValue(format(now, "RRRR-'W'II"));
    } else if (retroType === "MONTHLY") {
      setInputValue(format(now, "yyyy-MM"));
    }
  }, [retroType]);

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
          title: '회고 생성 완료!',
          body: `${dateLabel} ${retroType} 회고가 생성되었습니다. 클릭하여 확인하세요.`,
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

  const handleBrowseByDate = async () => {
    try {
      const retros = await invoke<Retrospective[]>("get_saved_retrospectives", { workspaceId, dateLabel: browseDate });
      if (retros.length > 0) {
        onShowSavedRetro(retros[0]);
      } else {
        showToast(t.retrospective.no_data_for_label, "error");
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

      <main className="flex-1 overflow-y-auto p-12 max-w-4xl mx-auto w-full">
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
            <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tighter text-text-primary">{t.retrospective.browse_title}</h1>
              <p className="text-text-secondary font-bold">{t.retrospective.browse_desc}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-6 bg-surface-elevated border border-border rounded-3xl space-y-4 shadow-xl flex flex-col">
                <div className="flex items-center gap-3">
                  <CalendarIcon size={20} className="text-text-primary" />
                  <h3 className="text-lg font-black text-text-primary">{t.retrospective.search_by_date}</h3>
                </div>
                <div className="space-y-3 flex-1">
                  <Label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{t.retrospective.select_date_label}</Label>
                  <Input 
                    value={browseDate} 
                    onChange={(e) => setBrowseDate(e.target.value)}
                    placeholder="YYYY-MM-DD"
                    className="bg-surface border-border h-11 rounded-xl px-4 font-bold"
                  />
                </div>
                <Button onClick={handleBrowseByDate} variant="outline" className="w-full h-11 rounded-xl font-bold border-border">
                  {t.retrospective.search_btn}
                </Button>
              </div>

              <div className="p-6 bg-surface-elevated border border-border rounded-3xl space-y-4 shadow-xl flex flex-col border-t-yellow-400/20">
                <div className="flex items-center gap-3">
                  <Sparkles size={20} className="text-yellow-400" />
                  <h3 className="text-lg font-black text-text-primary">{t.retrospective.latest_title}</h3>
                </div>
                <p className="text-xs text-text-secondary font-bold flex-1 leading-relaxed">{t.retrospective.latest_desc}</p>
                <Button onClick={handleBrowseLatest} className="w-full h-11 rounded-xl font-bold bg-surface-elevated hover:bg-border text-text-primary border border-border">
                  {t.retrospective.latest_btn}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
