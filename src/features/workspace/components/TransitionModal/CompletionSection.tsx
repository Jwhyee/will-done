import { Target, Clock, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CompletionOption } from "./CompletionOption";

interface CompletionSectionProps {
  t: any;
  completionType: "COMPLETE_ON_TIME" | "COMPLETE_NOW" | "COMPLETE_AGO";
  setCompletionType: (type: "COMPLETE_ON_TIME" | "COMPLETE_NOW" | "COMPLETE_AGO") => void;
  agoHours: number;
  setAgoHours: (hour: number) => void;
  agoMinutes: number;
  setAgoMinutes: (min: number) => void;
  handleComplete: () => Promise<void>;
  endTime: string;
  currentTime: Date;
}

export const CompletionSection = ({
  t,
  completionType,
  setCompletionType,
  agoHours,
  setAgoHours,
  agoMinutes,
  setAgoMinutes,
  handleComplete,
  endTime,
  currentTime,
}: CompletionSectionProps) => {
  const isTargetTimeReached = new Date(endTime) <= currentTime;

  return (
    <div className="space-y-4">
      {!isTargetTimeReached && completionType === "COMPLETE_ON_TIME" && (
        <div className="text-[10px] font-bold text-accent bg-accent/5 py-1.5 px-3 rounded-lg flex items-center justify-center animate-in fade-in slide-in-from-top-1 duration-300">
          {t.main.transition.not_yet_warning}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 p-1 bg-background border border-border rounded-xl">
        <CompletionOption
          active={completionType === "COMPLETE_ON_TIME"}
          onClick={() => setCompletionType("COMPLETE_ON_TIME")}
          icon={<Target size={14} />}
          label={t.main.transition.complete_target}
          disabled={!isTargetTimeReached}
        />
        <CompletionOption
          active={completionType === "COMPLETE_NOW"}
          onClick={() => setCompletionType("COMPLETE_NOW")}
          icon={<Clock size={14} />}
          label={t.main.transition.complete_now}
        />
        <CompletionOption
          active={completionType === "COMPLETE_AGO"}
          onClick={() => setCompletionType("COMPLETE_AGO")}
          icon={<History size={14} />}
          label={t.main.transition.complete_ago}
        />
      </div>

      {/* Manual Input Area (Progressive Disclosure) */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${completionType === "COMPLETE_AGO" ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
        }`}>
        <div className="flex items-center justify-center gap-3 py-2">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              value={agoHours}
              onChange={(e) => setAgoHours(Math.max(0, parseInt(e.target.value) || 0))}
              // 아래 className 끝에 화살표 제거 클래스 추가
              className="w-14 h-9 text-center font-bold bg-background border-border rounded-lg text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none m-0 [appearance:textfield]"
            />
            <span className="text-xs font-bold text-text-muted">{t.main.hours}</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={59}
              value={agoMinutes}
              onChange={(e) => setAgoMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
              className="w-14 h-9 text-center font-bold bg-background border-border rounded-lg text-sm [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none m-0 [appearance:textfield]"
            />
            <span className="text-xs font-bold text-text-muted">{t.main.mins}</span>
          </div>
          <span className="text-xs font-bold text-text-secondary ml-1">
            {t.main.transition.ago_suffix}
          </span>
        </div>
      </div>

      <Button
        onClick={handleComplete}
        className="w-full h-12 bg-text-primary text-background hover:bg-text-primary/90 font-black rounded-xl text-sm shadow-md transition-all active:scale-[0.98] mt-2"
      >
        {t.main.transition.submit_btn}
      </Button>
    </div>
  );
};
