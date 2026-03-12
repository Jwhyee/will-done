import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OnboardingNavigationProps {
  currentStep: number;
  prevStep: (e?: React.MouseEvent) => void;
  nextStep: (e?: React.MouseEvent) => void;
  handleStep3Click: (e?: React.MouseEvent) => void;
  verificationStatus: 'idle' | 'loading' | 'success' | 'error';
  apiKey: string;
  nickname: string;
  t: any;
}

export const OnboardingNavigation = ({
  currentStep,
  prevStep,
  nextStep,
  handleStep3Click,
  verificationStatus,
  apiKey,
  nickname,
  t
}: OnboardingNavigationProps) => {
  return (
    <div className="flex gap-3">
      {currentStep > 1 && (
        <Button 
          type="button"
          variant="outline"
          onClick={prevStep}
          className="h-16 w-16 shrink-0 rounded-2xl border-border bg-background hover:bg-surface text-text-primary transition-all"
        >
          <ChevronLeft size={24} />
        </Button>
      )}
      {currentStep === 3 ? (
        <Button 
          type="button"
          disabled={verificationStatus === 'loading'}
          onClick={handleStep3Click}
          className={cn(
            "flex-1 h-16 rounded-2xl font-black text-xl transition-all shadow-xl shadow-black/10 active:scale-[0.98] group",
            verificationStatus === 'success' || !apiKey 
              ? "bg-text-primary text-background hover:bg-zinc-200" 
              : "bg-surface text-text-primary border border-border hover:bg-surface-elevated"
          )}
        >
          {verificationStatus === 'loading' ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {t.onboarding.api_key_verifying}
            </>
          ) : !apiKey ? (
            <>
              {t.onboarding.skip_btn}
              <ChevronRight size={24} className="group-hover:translate-x-0.5 transition-transform" />
            </>
          ) : verificationStatus === 'success' ? (
            <>
              {t.onboarding.next_btn}
              <ChevronRight size={24} className="group-hover:translate-x-0.5 transition-transform" />
            </>
          ) : (
            <>
              {t.onboarding.api_key_verify}
              <ChevronRight size={24} className="group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </Button>
      ) : currentStep < 4 ? (
        <Button 
          type="button"
          disabled={currentStep === 1 && !nickname}
          onClick={nextStep}
          className="flex-1 h-16 rounded-2xl bg-text-primary text-background hover:bg-zinc-200 font-black text-xl transition-all shadow-xl shadow-black/10 active:scale-[0.98] group"
        >
          {t.onboarding.next_btn}
          <ChevronRight size={24} className="group-hover:translate-x-0.5 transition-transform" />
        </Button>
      ) : (
        <Button 
          type="submit" 
          className="flex-1 h-16 rounded-2xl bg-text-primary text-background hover:bg-zinc-200 font-black text-xl transition-all shadow-xl shadow-black/10 active:scale-[0.98]"
        >
          {t.onboarding.submit_btn}
        </Button>
      )}
    </div>
  );
};
