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

interface TransitionModalProps {
  t: any;
  transitionBlock: TimeBlock | null;
  onClose: () => void;
  onTransition: (action: string, extraMinutes?: number, reviewMemo?: string) => Promise<void>;
  currentTime: Date;
}

type TabType = "COMPLETION";
type CompletionType = "COMPLETE_ON_TIME" | "COMPLETE_NOW" | "COMPLETE_AGO";

export const TransitionModal = ({
  t,
  transitionBlock,
  onClose,
  onTransition,
  currentTime,
}: TransitionModalProps) => {
  const [activeTab, setActiveTab] = useState<TabType>("COMPLETION");
  const [reviewMemo, setReviewMemo] = useState("");
  const [completionType, setCompletionType] = useState<CompletionType>("COMPLETE_NOW");
  const [agoHours, setAgoHours] = useState<number>(0);
  const [agoMinutes, setAgoMinutes] = useState<number>(5);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (transitionBlock) {
      setActiveTab("COMPLETION");
      const isTargetReached = new Date(transitionBlock.endTime) <= currentTime;
      setCompletionType(isTargetReached ? "COMPLETE_ON_TIME" : "COMPLETE_NOW");
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
            {t.main.transition.modal_title || t.main.transition.title}
          </DialogTitle>
          <DialogDescription className="text-text-secondary text-[11px] font-medium">
            {t.main.transition.modal_desc ? t.main.transition.modal_desc.replace("{title}", transitionBlock.title) : t.main.transition.description}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5">
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
              endTime={transitionBlock.endTime}
              currentTime={currentTime}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
