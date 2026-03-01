import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { Sparkles, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parse } from "date-fns";
import { Retrospective } from "@/types";

interface RetrospectiveViewProps {
  workspaceId: number;
  onClose: () => void;
  onShowSavedRetro: (retro: Retrospective) => void;
}

export const RetrospectiveView = ({ 
  workspaceId, 
  onClose, 
  onShowSavedRetro 
}: RetrospectiveViewProps) => {
  const [tab, setTab] = useState<"create" | "browse">("create");
  const [retroType, setRetroType] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("DAILY");
  
  // input value state (what the user sees/types in the input)
  const [inputValue, setInputValue] = useState(format(new Date(), "yyyy-MM-dd"));
  
  // actual date range for backend
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dateLabel, setDateLabel] = useState(format(new Date(), "yyyy-MM-dd"));
  
  const [browseDate, setBrowseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isGenerating, setIsGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState("");

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
        label = `${year}년 ${weekStr}주차 (${start} ~ ${end})`;
      } else if (retroType === "MONTHLY") {
        // HTML month input format: YYYY-MM
        const date = parse(inputValue, "yyyy-MM", new Date());
        start = format(startOfMonth(date), "yyyy-MM-dd");
        end = format(endOfMonth(date), "yyyy-MM-dd");
        label = `${format(date, "yyyy년 M월")} 회고`;
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
      setInputValue(format(now, "yyyy-'W'II"));
    } else if (retroType === "MONTHLY") {
      setInputValue(format(now, "yyyy-MM"));
    }
  }, [retroType]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenMessage("회고 생성까지 최대 3분 소요될 수 있습니다. 완료되면 데스크탑 알림으로 알려드릴게요!");
    
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
      alert(`Error: ${error}`);
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
        alert("최근 회고가 없습니다.");
      }
    } catch (error: any) {
      alert(error);
    }
  };

  const handleBrowseByDate = async () => {
    try {
      const retros = await invoke<Retrospective[]>("get_saved_retrospectives", { workspaceId, dateLabel: browseDate });
      if (retros.length > 0) {
        onShowSavedRetro(retros[0]);
      } else {
        alert("해당 날짜의 회고가 없습니다.");
      }
    } catch (error: any) {
      alert(error);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-background">
      <aside className="w-64 border-r border-border bg-surface flex flex-col shrink-0 p-6 space-y-8">
        <div className="space-y-4">
          <h2 className="text-xl font-black tracking-tighter text-text-primary">Retrospective</h2>
          <nav className="space-y-2">
            <Button 
              variant={tab === "create" ? "secondary" : "ghost"} 
              className="w-full justify-start font-bold"
              onClick={() => setTab("create")}
            >
              회고 생성
            </Button>
            <Button 
              variant={tab === "browse" ? "secondary" : "ghost"} 
              className="w-full justify-start font-bold"
              onClick={() => setTab("browse")}
            >
              회고 톺아보기
            </Button>
          </nav>
        </div>
        <Button variant="outline" className="mt-auto border-border font-bold" onClick={onClose}>
          메인으로 돌아가기
        </Button>
      </aside>

      <main className="flex-1 overflow-y-auto p-12 max-w-4xl mx-auto">
        {tab === "create" ? (
          <div className="space-y-12">
            <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tighter text-text-primary">Create New Retrospective</h1>
              <p className="text-text-secondary font-bold">AI와 함께 업무를 돌아보고 더 나은 내일을 계획하세요.</p>
            </div>

            <div className="p-8 bg-surface-elevated border border-border rounded-3xl space-y-8 shadow-2xl">
              <div className="space-y-4">
                <Label className="text-xs font-black text-text-secondary uppercase tracking-widest">Type</Label>
                <div className="flex gap-4">
                  {(["DAILY", "WEEKLY", "MONTHLY"] as const).map((type) => (
                    <Button 
                      key={type}
                      variant={retroType === type ? "default" : "outline"}
                      onClick={() => setRetroType(type)}
                      className="flex-1 font-bold h-12 rounded-xl border-border"
                    >
                      {type === "DAILY" ? "일간" : type === "WEEKLY" ? "주간" : "월간"}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                <div className="space-y-4">
                  <Label className="text-xs font-black text-text-secondary uppercase tracking-widest">
                    {retroType === "DAILY" ? "날짜 선택" : retroType === "WEEKLY" ? "주차 선택" : "월 선택"}
                  </Label>
                  <Input 
                    type={retroType === "DAILY" ? "date" : retroType === "WEEKLY" ? "week" : "month"} 
                    value={inputValue} 
                    onChange={(e) => setInputValue(e.target.value)}
                    className="bg-surface border-border h-12 rounded-xl px-4 font-bold [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="p-4 bg-surface rounded-2xl border border-border space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-text-secondary uppercase tracking-tighter">Selected Range</span>
                  <span className="text-text-primary">{startDate} ~ {endDate}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-text-secondary uppercase tracking-tighter">Final Label</span>
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
                {isGenerating ? "Generating..." : "회고 생성하기"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tighter text-text-primary">Browse Retrospectives</h1>
              <p className="text-text-secondary font-bold">과거의 기록들을 톺아보며 성장을 확인하세요.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 bg-surface-elevated border border-border rounded-3xl space-y-6 shadow-xl flex flex-col">
                <div className="flex items-center gap-3">
                  <CalendarIcon size={24} className="text-text-primary" />
                  <h3 className="text-xl font-black text-text-primary">날짜로 검색</h3>
                </div>
                <div className="space-y-4 flex-1">
                  <Label className="text-xs font-black text-text-secondary uppercase tracking-widest">Select Date Label</Label>
                  <Input 
                    value={browseDate} 
                    onChange={(e) => setBrowseDate(e.target.value)}
                    placeholder="YYYY-MM-DD"
                    className="bg-surface border-border h-12 rounded-xl px-4 font-bold"
                  />
                </div>
                <Button onClick={handleBrowseByDate} variant="outline" className="w-full h-12 rounded-xl font-bold border-border">
                  검색하기
                </Button>
              </div>

              <div className="p-8 bg-surface-elevated border border-border rounded-3xl space-y-6 shadow-xl flex flex-col border-t-yellow-400/30">
                <div className="flex items-center gap-3">
                  <Sparkles size={24} className="text-yellow-400" />
                  <h3 className="text-xl font-black text-text-primary">가장 최근 회고</h3>
                </div>
                <p className="text-sm text-text-secondary font-bold flex-1">마지막으로 생성된 회고 내용을 즉시 확인합니다.</p>
                <Button onClick={handleBrowseLatest} className="w-full h-12 rounded-xl font-bold bg-surface-elevated hover:bg-border text-text-primary border border-border">
                  최근 회고 보기
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
