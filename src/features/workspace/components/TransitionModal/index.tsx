import { useState, useRef, useEffect } from "react";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { TimeBlock } from "@/types";
import { CompletionSection } from "./CompletionSection";
import { ExtensionSection } from "./ExtensionSection";

interface TransitionModalProps {
  t: any;
  transitionBlock: TimeBlock | null;
  onClose: () => void;
  onTransition: (action: string, extraMinutes?: number, reviewMemo?: string) => Promise<void>;
}

type CompletionType = "COMPLETE_ON_TIME" | "COMPLETE_NOW" | "COMPLETE_AGO";

export const TransitionModal = ({
  t,
  transitionBlock,
  onClose,
  onTransition,
}: TransitionModalProps) => {
  const [reviewMemo, setReviewMemo] = useState("");
  const [completionType, setCompletionType] = useState<CompletionType>("COMPLETE_NOW");
  const [agoMinutes, setAgoMinutes] = useState<number>(5);
  const [customDelay, setCustomDelay] = useState<number>(15);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (transitionBlock) {
      setCompletionType("COMPLETE_NOW");
    }
  }, [transitionBlock]);

  const handleComplete = async () => {
    if (!transitionBlock) return;
    await onTransition(completionType, completionType === "COMPLETE_AGO" ? agoMinutes : undefined, reviewMemo);
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
      <DialogContent className="sm:max-w-[500px] bg-surface-elevated border-border text-text-primary shadow-2xl rounded-3xl p-8 antialiased [&>button]:hidden">
        <DialogHeader className="space-y-4">
          <DialogTitle className="text-2xl font-black tracking-tighter text-text-primary leading-none flex items-center gap-3">
            <Sparkles className="text-warning" size={24} />
            {t.main.transition.title}
          </DialogTitle>
          <DialogDescription className="text-text-secondary text-sm leading-relaxed">
            {t.main.transition.description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-8">
          {/* 1. Task Info Area */}
          <div className="p-4 bg-background border border-border rounded-2xl flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary uppercase tracking-tight">
              {t.main.transition.current_task}
            </span>
            <span className="font-bold text-sm truncate max-w-[240px]">
              {transitionBlock.title}
            </span>
          </div>

          {/* 2. Review Memo Area */}
          <div className="space-y-3">
            <Label className="text-xs font-bold text-text-secondary ml-1">
              {t.main.transition.review_label}
            </Label>
            <textarea
              ref={textareaRef}
              autoFocus
              value={reviewMemo}
              onChange={(e) => setReviewMemo(e.target.value)}
              placeholder={t.main.transition.review_placeholder}
              className="w-full min-h-[100px] bg-background border border-border rounded-2xl p-4 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-text-muted font-medium leading-relaxed resize-none"
            />
          </div>

          <div className="space-y-6">
            {/* 3. Completion Section */}
            <CompletionSection
              t={t}
              completionType={completionType}
              setCompletionType={setCompletionType}
              agoMinutes={agoMinutes}
              setAgoMinutes={setAgoMinutes}
              handleComplete={handleComplete}
            />

            <div className="relative">
              <Separator className="bg-border" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-elevated px-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                OR
              </span>
            </div>

            {/* 4. Extension Section */}
            <ExtensionSection
              t={t}
              customDelay={customDelay}
              setCustomDelay={setCustomDelay}
              handleDelay={handleDelay}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
