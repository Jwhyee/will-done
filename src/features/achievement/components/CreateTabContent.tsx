import { Loader2, ChevronDown, Sparkles, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { DateSelector } from "./DateSelector";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DbGeminiModel } from "@/types/gemini";

interface CreateTabContentProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  activeDates: string[];
  availableModels: DbGeminiModel[];
  selectedModel: string | null;
  setSelectedModel: (val: string | null) => void;
  isFreeUser: boolean;
  genMessage: string;
  handleGenerate: () => void;
  isGenerating: boolean;
  t: any;
}

export const CreateTabContent = ({
  inputValue,
  setInputValue,
  activeDates,
  availableModels,
  selectedModel,
  setSelectedModel,
  isFreeUser,
  genMessage,
  handleGenerate,
  isGenerating,
  t
}: CreateTabContentProps) => {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-black tracking-tighter text-text-primary leading-none">
          {t.achievement.create_title}
        </h1>
        <p className="text-sm text-text-secondary leading-relaxed">
          {t.achievement.create_desc}
        </p>
      </div>

      <div className="p-6 bg-surface border border-border rounded-2xl space-y-6 shadow-xl relative overflow-hidden group">
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1 px-1">
            <Calendar size={12} className="text-primary/70" />
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Date</span>
          </div>
          <DateSelector
            value={inputValue}
            onChange={setInputValue}
            activeDates={activeDates}
          />
        </div>

        <div className="space-y-3 pt-6 border-t border-border/50">
          <div className="flex items-center gap-2 mb-1 px-1">
            <Sparkles size={12} className="text-primary/70" />
            <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">AI Model Configuration</span>
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-12 bg-surface border-border rounded-xl flex items-center justify-between px-4 hover:bg-surface-elevated transition-all group"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-sm font-bold tracking-tight text-text-primary truncate">
                    {selectedModel ? selectedModel.split('/').pop() : "최신 모델 (Latest)"}
                  </span>
                  {selectedModel && (
                    <span className="text-[10px] text-text-tertiary font-medium bg-surface-elevated px-1.5 py-0.5 rounded border border-border/50">
                      Targeted
                    </span>
                  )}
                </div>
                <ChevronDown size={16} className="text-text-secondary group-hover:translate-y-0.5 transition-transform" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2 bg-surface border-border rounded-xl shadow-2xl space-y-1" align="start">
              <button
                onClick={() => setSelectedModel(null)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between ${
                  selectedModel === null ? "bg-primary/10 text-primary font-bold border border-primary/20" : "hover:bg-surface-elevated text-text-secondary"
                }`}
              >
                <div className="flex flex-col">
                  <span>최신 모델 (Latest)</span>
                  <span className="text-[10px] opacity-60 font-medium">Auto-fallback supported</span>
                </div>
                {selectedModel === null && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
              </button>
              
              <div className="h-px bg-border my-2" />
              
              <div className="max-h-60 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-border">
                {availableModels.map((model) => (
                  <button
                    key={model.model_name}
                    onClick={() => setSelectedModel(model.model_name)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                      selectedModel === model.model_name ? "bg-primary/10 text-primary font-bold border border-primary/20" : "hover:bg-surface-elevated text-text-secondary"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium truncate max-w-[180px]">{model.model_name.split('/').pop()}</span>
                      <span className="text-[10px] opacity-50 font-medium">{model.lineup}</span>
                    </div>
                    {selectedModel === model.model_name && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {isFreeUser && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-1 text-[11px] text-text-tertiary leading-relaxed font-medium"
            >
              Free Tier는 사용 가능한 모델 폭이 좁으므로, <span className="text-text-secondary font-bold">'최신 모델'</span>을 선택하는 것을 권장합니다.
            </motion.p>
          )}
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
            {t.achievement.generating}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {t.achievement.generate_btn}
          </div>
        )}
      </Button>
    </div>
  );
};
