import { useState } from "react";
import { Sparkles, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { TimeBlock } from "@/types";

interface TransitionModalProps {
  t: any;
  transitionBlock: TimeBlock | null;
  onClose: () => void;
  onTransition: (action: string, extraMinutes?: number, reviewMemo?: string) => Promise<void>;
}

export const TransitionModal = ({
  t,
  transitionBlock,
  onClose,
  onTransition,
}: TransitionModalProps) => {
  const [reviewMemo, setReviewMemo] = useState("");
  const [customDelay, setCustomDelay] = useState<number>(15);
  const [agoMinutes, setAgoMinutes] = useState<number>(5);

  const handleTransition = async (action: string, extraMinutes?: number) => {
    if (!transitionBlock) return;
    await onTransition(action, extraMinutes, reviewMemo);
    setReviewMemo("");
    onClose();
  };

  return (
    <Dialog open={!!transitionBlock} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-surface-elevated border-border text-text-primary shadow-2xl rounded-3xl p-8 antialiased [&>button]:hidden">
        <DialogHeader className="space-y-4">
          <DialogTitle className="text-2xl font-black tracking-tighter text-text-primary leading-none flex items-center gap-3">
            {/* Functional Sparkles icon allowed as it represents "AI generation" or "Transition magic" */}
            <Sparkles className="text-warning" size={24} />
            {t.main.transition.title}
          </DialogTitle>
          <DialogDescription className="text-text-secondary text-sm leading-relaxed">
            {t.main.transition.description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          <div className="p-4 bg-background border border-border rounded-2xl flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary uppercase tracking-widest">Current Task</span>
            <span className="font-bold text-sm">{transitionBlock?.title}</span>
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-medium text-text-secondary uppercase tracking-widest">{t.main.transition.review_placeholder}</Label>
            <textarea 
              value={reviewMemo}
              onChange={(e) => setReviewMemo(e.target.value)}
              placeholder={t.main.transition.review_placeholder}
              className="w-full min-h-[80px] bg-background border-border rounded-2xl p-4 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-white/10 placeholder:text-text-muted font-medium leading-relaxed"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => handleTransition("COMPLETE_ON_TIME")}
                variant="outline"
                className="flex-1 border-border bg-background hover:bg-border text-text-secondary font-bold h-12 rounded-xl text-xs active:scale-95 whitespace-normal"
              >
                {t.main.transition.complete_target}
              </Button>
              <Button 
                onClick={() => handleTransition("COMPLETE_NOW")}
                className="flex-1 bg-text-primary text-background hover:bg-zinc-200 font-bold h-12 rounded-xl text-xs shadow-xl active:scale-95 whitespace-normal"
              >
                {t.main.transition.complete_now}
              </Button>
            </div>

            <div className="flex items-center space-x-3 bg-background border border-border rounded-xl px-4 h-12">
               <Input 
                  type="number" 
                  value={agoMinutes} 
                  onChange={(e) => setAgoMinutes(parseInt(e.target.value) || 0)}
                  className="w-10 bg-transparent border-none text-center font-bold focus-visible:ring-0 p-0"
                />
                <span className="text-xs font-medium text-text-secondary uppercase flex-1">{t.main.transition.complete_ago}</span>
                <Button 
                  variant="ghost" 
                  onClick={() => handleTransition("COMPLETE_AGO", agoMinutes)}
                  className="text-text-primary hover:text-text-primary font-bold hover:bg-border h-8 rounded-lg"
                >
                  <Send size={16} />
                </Button>
            </div>
            
            <Separator className="bg-border" />

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-1 flex items-center bg-background border border-border rounded-xl px-3">
                <Input 
                  type="number" 
                  value={customDelay} 
                  onChange={(e) => setCustomDelay(parseInt(e.target.value) || 0)}
                  className="w-full bg-transparent border-none text-center font-bold focus-visible:ring-0 p-0 h-10"
                />
                <span className="text-xs font-medium text-text-secondary uppercase ml-1">min</span>
              </div>
              <Button 
                variant="outline"
                onClick={() => handleTransition("DELAY", customDelay)}
                className="col-span-1 border-border bg-background hover:bg-border text-text-secondary font-bold h-10 rounded-xl active:scale-95 text-xs"
              >
                {t.main.transition.delay}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
