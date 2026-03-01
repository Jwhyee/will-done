import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { Sparkles, ChevronLeft } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  parse,
  isValid,
  endOfWeek,
  eachWeekOfInterval,
  endOfISOWeek,
} from "date-fns";
import { Retrospective } from "@/types";
import { useToast } from "@/providers/ToastProvider";

interface RetrospectiveViewProps {
  workspaceId: number;
  t: any;
  onClose: () => void;
  onShowSavedRetro: (retro: Retrospective) => void;
}

const SelectWrapper = ({ 
  label, 
  value, 
  options, 
  onChange, 
  disabled 
}: { 
  label: string; 
  value: string; 
  options: { label: string; value: string }[]; 
  onChange: (val: string) => void;
  disabled?: boolean;
}) => (
  <div className="flex-1 space-y-2">
    <Label className="text-[10px] font-black text-text-muted uppercase tracking-widest">{label}</Label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full h-12 bg-surface border border-border rounded-xl px-4 font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none disabled:opacity-50"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 1rem center',
        backgroundSize: '1.25rem'
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-surface text-text-primary">
          {opt.label}
        </option>
      ))}
    </select>
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
  const years = useMemo(() => {
    const y = new Set<string>();
    activeDates.forEach(d => {
      const year = d.split("-")[0];
      if (year) y.add(year);
    });
    if (y.size === 0) y.add(new Date().getFullYear().toString());
    return Array.from(y).sort((a, b) => parseInt(b) - parseInt(a));
  }, [activeDates]);

  const [selectedYear, setSelectedYear] = useState(years[0]);
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, "0"));
  const [selectedWeek, setSelectedWeek] = useState("1");

  useEffect(() => {
    if (type === "MONTHLY" && /^\d{4}-\d{2}$/.test(value)) {
      const [y, m] = value.split("-");
      setSelectedYear(y);
      setSelectedMonth(m);
    } else if (type === "WEEKLY" && value.includes("|")) {
      const [y, m, w] = value.split("|");
      setSelectedYear(y);
      setSelectedMonth(m);
      setSelectedWeek(w);
    }
  }, [value, type]);

  const weeksOptions = useMemo(() => {
    if (type !== "WEEKLY") return [];
    try {
      const firstDayOfMonth = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1);
      const lastDayOfMonth = endOfMonth(firstDayOfMonth);
      const weeks = eachWeekOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth }, { weekStartsOn: 1 });

      return weeks.map((weekStart, idx) => {
        const s = weekStart > firstDayOfMonth ? weekStart : firstDayOfMonth;
        const e_raw = endOfWeek(weekStart, { weekStartsOn: 1 });
        const e = e_raw < lastDayOfMonth ? e_raw : lastDayOfMonth;
        return {
          label: `${idx + 1}${t.retrospective.week_unit || 'W'} (${format(s, "MM/dd")} - ${format(e, "MM/dd")})`,
          value: (idx + 1).toString()
        };
      });
    } catch (e) {
      return [{ label: "1W", value: "1" }];
    }
  }, [selectedYear, selectedMonth, t, type]);

  const handleDropdownChange = (y: string, m: string, w?: string) => {
    if (type === "MONTHLY") {
      onChange(`${y}-${m}`);
    } else if (type === "WEEKLY") {
      onChange(`${y}|${m}|${w || selectedWeek}`);
    }
  };

  if (type === "DAILY") {
    let currentParsedDate = new Date();
    try {
      const p = parse(value, "yyyy-MM-dd", new Date());
      if (isValid(p)) currentParsedDate = p;
    } catch (e) { /* ignore */ }

    return (
      <div className="flex justify-center p-4 bg-surface rounded-2xl border border-border">
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
      </div>
    );
  }

  const monthsOptions = Array.from({ length: 12 }, (_, i) => ({
    label: `${i + 1}${t.common?.month || 'M'}`,
    value: (i + 1).toString().padStart(2, "0")
  }));

  const yearOptions = years.map(y => ({ label: `${y}${t.common?.year || 'Y'}`, value: y }));

  if (type === "MONTHLY") {
    return (
      <div className="flex gap-4 p-6 bg-surface rounded-2xl border border-border">
        <SelectWrapper 
          label={t.retrospective.year_label || "Year"}
          value={selectedYear}
          options={yearOptions}
          onChange={(y) => { setSelectedYear(y); handleDropdownChange(y, selectedMonth); }}
        />
        <SelectWrapper 
          label={t.retrospective.month_label || "Month"}
          value={selectedMonth}
          options={monthsOptions}
          onChange={(m) => { setSelectedMonth(m); handleDropdownChange(selectedYear, m); }}
        />
      </div>
    );
  }

  return (
    <div className="flex gap-4 p-6 bg-surface rounded-2xl border border-border">
      <SelectWrapper 
        label={t.retrospective.year_label || "Year"}
        value={selectedYear}
        options={yearOptions}
        onChange={(y) => { setSelectedYear(y); handleDropdownChange(y, selectedMonth, "1"); }}
      />
      <SelectWrapper 
        label={t.retrospective.month_label || "Month"}
        value={selectedMonth}
        options={monthsOptions}
        onChange={(m) => { setSelectedMonth(m); handleDropdownChange(selectedYear, m, "1"); }}
      />
      <SelectWrapper 
        label={t.retrospective.week_label || "Week"}
        value={selectedWeek}
        options={weeksOptions}
        onChange={(w) => { setSelectedWeek(w); handleDropdownChange(selectedYear, selectedMonth, w); }}
      />
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
          setInputValue(prev => prev || latest);
          setBrowseInputValue(prev => prev || latest);
        }
      } catch (e) { console.error(e); }
    };
    fetchActiveDates();
  }, [workspaceId]);

  const handleTypeChange = (newType: "DAILY" | "WEEKLY" | "MONTHLY") => {
    const latestActive = activeDates.length > 0 ? activeDates[activeDates.length - 1] : format(new Date(), "yyyy-MM-dd");
    let newValue = latestActive;
    if (newType === "MONTHLY") newValue = latestActive.substring(0, 7);
    else if (newType === "WEEKLY") newValue = `${latestActive.split("-")[0]}|${latestActive.split("-")[1]}|1`;
    setRetroType(newType);
    setInputValue(newValue);
  };

  const handleBrowseTypeChange = (newType: "DAILY" | "WEEKLY" | "MONTHLY") => {
    const latestActive = activeDates.length > 0 ? activeDates[activeDates.length - 1] : format(new Date(), "yyyy-MM-dd");
    let newValue = latestActive;
    if (newType === "MONTHLY") newValue = latestActive.substring(0, 7);
    else if (newType === "WEEKLY") newValue = `${latestActive.split("-")[0]}|${latestActive.split("-")[1]}|1`;
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
        return { 
          start: format(startOfMonth(date), "yyyy-MM-dd"), 
          end: format(endOfMonth(date), "yyyy-MM-dd"), 
          label: `${val} Retrospective` 
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
          label: `${y}-${m} ${w}${t.retrospective.week_unit || 'W'} (${startStr} ~ ${endStr})` 
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

  const handleBrowseLatest = async () => {
    try {
      const latest = await invoke<Retrospective | null>("get_latest_saved_retrospective", { workspaceId });
      if (latest) onShowSavedRetro(latest);
      else showToast(t.retrospective.no_latest, "error");
    } catch (error: any) { showToast(error.toString(), "error"); }
  };

  return (
    <div className="flex-1 flex h-screen overflow-hidden bg-background antialiased">
      <aside className="w-64 border-r border-border bg-surface flex flex-col shrink-0 p-6 space-y-8">
        <Button variant="ghost" className="justify-start -ml-2 text-text-secondary hover:text-text-primary font-bold h-10 px-2 group transition-all" onClick={onClose}>
          <ChevronLeft size={18} className="mr-1 group-hover:-translate-x-1 transition-transform" />
          {t.sidebar.back}
        </Button>
        <div className="space-y-4">
          <h2 className="text-xl font-black tracking-tighter text-text-primary">{t.retrospective.title}</h2>
          <nav className="space-y-2">
            <Button variant={tab === "create" ? "secondary" : "ghost"} className="w-full justify-start font-bold" onClick={() => setTab("create")}>{t.retrospective.create_tab}</Button>
            <Button variant={tab === "browse" ? "secondary" : "ghost"} className="w-full justify-start font-bold" onClick={() => setTab("browse")}>{t.retrospective.browse_tab}</Button>
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
                      <Button key={type} variant={retroType === type ? "default" : "outline"} onClick={() => handleTypeChange(type)} className="flex-1 font-bold h-12 rounded-xl border-border">
                        {type === "DAILY" ? t.retrospective.daily : type === "WEEKLY" ? t.retrospective.weekly : t.retrospective.monthly}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <Label className="text-xs font-black text-text-secondary uppercase tracking-widest">
                    {retroType === "DAILY" ? t.retrospective.select_date : retroType === "WEEKLY" ? t.retrospective.select_week : t.retrospective.select_month}
                  </Label>
                  <DateSelector type={retroType} value={inputValue} onChange={setInputValue} activeDates={activeDates} t={t} />
                </div>
                {genMessage && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-3">
                    <Sparkles size={18} className="text-blue-400 animate-pulse shrink-0" />
                    <p className="text-xs text-blue-400 font-bold">{genMessage}</p>
                  </div>
                )}
                <Button onClick={handleGenerate} disabled={isGenerating} className="w-full bg-text-primary text-background hover:bg-zinc-200 h-14 rounded-2xl font-black text-lg shadow-xl active:scale-95 disabled:opacity-50">
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
                <Button onClick={handleBrowseLatest} variant="outline" className="rounded-xl font-bold border-border h-12 gap-2 group">
                  <Sparkles size={18} className="text-yellow-400 group-hover:scale-110 transition-transform" />
                  {t.retrospective.latest_title}
                </Button>
              </div>
              <div className="p-8 bg-surface-elevated border border-border rounded-3xl space-y-8 shadow-2xl">
                <div className="space-y-4">
                  <Label className="text-xs font-black text-text-secondary uppercase tracking-widest">{t.retrospective.type_label}</Label>
                  <div className="flex gap-4">
                    {(["DAILY", "WEEKLY", "MONTHLY"] as const).map((type) => (
                      <Button key={type} variant={browseType === type ? "default" : "outline"} onClick={() => handleBrowseTypeChange(type)} className="flex-1 font-bold h-12 rounded-xl border-border">
                        {type === "DAILY" ? t.retrospective.daily : type === "WEEKLY" ? t.retrospective.weekly : t.retrospective.monthly}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <Label className="text-xs font-black text-text-secondary uppercase tracking-widest">
                    {browseType === "DAILY" ? t.retrospective.select_date : browseType === "WEEKLY" ? t.retrospective.select_week : t.retrospective.select_month}
                  </Label>
                  <DateSelector type={browseType} value={browseInputValue} onChange={setBrowseInputValue} activeDates={activeDates} t={t} />
                </div>
              </div>
              {foundRetro ? (
                <div className="p-10 bg-surface rounded-[40px] border border-border shadow-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between items-center pb-6 border-b border-border/50">
                    <h2 className="text-2xl font-black text-text-primary tracking-tighter flex items-center gap-3">
                      <Sparkles size={24} className="text-warning" />
                      {foundRetro.dateLabel}
                    </h2>
                    <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest h-8" onClick={() => navigator.clipboard.writeText(foundRetro.content)}>
                      {t.retrospective.copy_markdown}
                    </Button>
                  </div>
                  <div className="prose prose-invert max-w-none text-sm leading-relaxed prose-headings:font-black prose-headings:tracking-tighter">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{foundRetro.content}</ReactMarkdown>
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
