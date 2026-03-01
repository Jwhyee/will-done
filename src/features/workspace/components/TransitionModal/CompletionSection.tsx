import { Target, Clock, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CompletionOption } from "./CompletionOption";

interface CompletionSectionProps {
  t: any;
  completionType: "COMPLETE_ON_TIME" | "COMPLETE_NOW" | "COMPLETE_AGO";
  setCompletionType: (type: "COMPLETE_ON_TIME" | "COMPLETE_NOW" | "COMPLETE_AGO") => void;
  agoMinutes: number;
  setAgoMinutes: (min: number) => void;
  handleComplete: () => Promise<void>;
}

export const CompletionSection = ({
  t,
  completionType,
  setCompletionType,
  agoMinutes,
  setAgoMinutes,
  handleComplete,
}: CompletionSectionProps) => {
  return (
    <div className="space-y-4">
      <Label className="text-xs font-bold text-text-secondary ml-1">
        {t.main.transition.section_complete}
      </Label>
      
      <div className="grid grid-cols-3 gap-2 p-1.5 bg-background border border-border rounded-2xl">
        <CompletionOption
          active={completionType === "COMPLETE_ON_TIME"}
          onClick={() => setCompletionType("COMPLETE_ON_TIME")}
          icon={<Target size={14} />}
          label={t.main.transition.complete_target}
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

      {completionType === "COMPLETE_AGO" && (
        <div className="flex items-center gap-2 px-1 animate-in fade-in slide-in-from-top-1 duration-200">
          <Input
            type="number"
            value={agoMinutes}
            onChange={(e) => setAgoMinutes(parseInt(e.target.value) || 0)}
            className="w-16 h-8 text-center font-bold bg-background border-border rounded-lg text-xs"
          />
          <span className="text-xs font-medium text-text-secondary">
            {t.main.transition.complete_ago_unit.replace("{min}", agoMinutes.toString())}
          </span>
        </div>
      )}

      <Button
        onClick={handleComplete}
        className="w-full h-14 bg-text-primary text-background hover:bg-text-primary/90 font-black rounded-2xl text-base shadow-lg transition-all active:scale-[0.98]"
      >
        {t.main.transition.submit_btn}
      </Button>
    </div>
  );
};
