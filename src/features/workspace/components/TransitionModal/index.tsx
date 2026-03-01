import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TimeBlock } from "@/types";
import { CompletionSection } from "./CompletionSection";
import { ExtensionSection } from "./ExtensionSection";
import { cn } from "@/lib/utils";

interface TransitionModalProps {
  t: any;
  transitionBlock: TimeBlock | null;
  onClose: () => void;
  onTransition: (action: string, extraMinutes?: number, reviewMemo?: string) => Promise<void>;
}

type TabType = "COMPLETION" | "EXTENSION";
type CompletionType = "COMPLETE_ON_TIME" | "COMPLETE_NOW" | "COMPLETE_AGO";

export const TransitionModal = ({
  t,
  transitionBlock,
  onClose,
  onTransition,
}: TransitionModalProps) => {
  const [activeTab, setActiveTab] = useState<TabType>("COMPLETION");
  const [reviewMemo, setReviewMemo] = useState("");
  const [completionType, setCompletionType] = useState<CompletionType>("COMPLETE_NOW");
  const [agoHours, setAgoHours] = useState<number>(0);
  const [agoMinutes, setAgoMinutes] = useState<number>(5);
  const [customDelay, setCustomDelay] = useState<number>(15);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (transitionBlock) {
      setActiveTab("COMPLETION");
      setCompletionType("COMPLETE_NOW");
      setReviewMemo("");
    }
  }, [transitionBlock]);

  // Focus textarea when switching to COMPLETION tab
  useEffect(() => {
    if (activeTab === "COMPLETION") {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [activeTab]);

  const handleComplete = async () => {
    if (!transitionBlock) return;
    const totalAgoMinutes = (agoHours * 60) + agoMinutes;
    await onTransition(
      completionType, 
      completionType === "COMPLETE_AGO" ? totalAgoMinutes : undefined, 
      reviewMemo
    );
    resetAndClose();
  };

  const handleDelay = async () => {
    if (!transitionBlock) return;
    await onTransition("DELAY", customDelay, reviewMemo);
    resetAndClose();
  };

  const resetAndClose = () => {
    setReviewMemo("");
    onClose();
  };

  if (!transitionBlock) return null;

  return (
    <Dialog open={!!transitionBlock} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px] bg-surface-elevated border-border text-text-primary shadow-2xl rounded-3xl p-6 antialiased [&>button]:hidden overflow-hidden">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-black tracking-tighter text-text-primary">
            {t.main.transition.title}
          </DialogTitle>
          <DialogDescription className="text-text-secondary text-[11px] font-medium">
            <span className="text-accent font-bold">[{transitionBlock.title}]</span> {t.main.transition.description}
          </DialogDescription>
        </DialogHeader>

        {/* Tab Selection */}
        <div className="flex p-1 bg-background border border-border rounded-xl mt-4">
          <button
            onClick={() => setActiveTab("COMPLETION")}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
              activeTab === "COMPLETION" 
                ? "bg-surface-elevated text-text-primary shadow-sm border border-border" 
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            {t.main.transition.section_complete}
          </button>
          <button
            onClick={() => setActiveTab("EXTENSION")}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
              activeTab === "EXTENSION" 
                ? "bg-surface-elevated text-text-primary shadow-sm border border-border" 
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            {t.main.transition.section_delay}
          </button>
        </div>

        <div className="mt-5">
          {activeTab === "COMPLETION" ? (
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* Review Memo */}
              <div className="space-y-2">
                <textarea
                  ref={textareaRef}
                  autoFocus
                  value={reviewMemo}
                  onChange={(e) => setReviewMemo(e.target.value)}
                  placeholder={t.main.transition.review_placeholder}
                  className="w-full h-20 bg-background border border-border rounded-xl p-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-text-muted font-medium leading-relaxed resize-none"
                />
              </div>

              <CompletionSection
                t={t}
                completionType={completionType}
                setCompletionType={setCompletionType}
                agoHours={agoHours}
                setAgoHours={setAgoHours}
                agoMinutes={agoMinutes}
                setAgoMinutes={setAgoMinutes}
                handleComplete={handleComplete}
              />
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in duration-300 py-2">
              <ExtensionSection
                t={t}
                customDelay={customDelay}
                setCustomDelay={setCustomDelay}
                handleDelay={handleDelay}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
