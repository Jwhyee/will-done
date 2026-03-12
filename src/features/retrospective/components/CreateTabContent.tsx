import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { DateSelector } from "./DateSelector";

interface CreateTabContentProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  activeDates: string[];
  genMessage: string;
  handleGenerate: () => void;
  isGenerating: boolean;
  t: any;
}

export const CreateTabContent = ({
  inputValue,
  setInputValue,
  activeDates,
  genMessage,
  handleGenerate,
  isGenerating,
  t
}: CreateTabContentProps) => {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-black tracking-tighter text-text-primary leading-none">
          {t.retrospective.create_title}
        </h1>
        <p className="text-sm text-text-secondary leading-relaxed">
          {t.retrospective.create_desc}
        </p>
      </div>

      <div className="p-6 bg-surface border border-border rounded-2xl space-y-6 shadow-xl relative overflow-hidden group">
        <div className="space-y-3">
          <DateSelector
            value={inputValue}
            onChange={setInputValue}
            activeDates={activeDates}
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
        onClick={() => handleGenerate()}
        disabled={isGenerating}
        className="w-full bg-text-primary text-background hover:bg-zinc-200 h-14 rounded-2xl font-black text-lg shadow-xl active:scale-95 disabled:opacity-50 transition-all duration-300 group"
      >
        {isGenerating ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            {t.retrospective.generating}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {t.retrospective.generate_btn}
          </div>
        )}
      </Button>
    </div>
  );
};
