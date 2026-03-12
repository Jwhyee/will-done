import { motion } from "framer-motion";
import { 
  AlertCircle, 
  Info, 
  ExternalLink,
  CheckCircle2
} from "lucide-react";
import { openUrl as open } from "@tauri-apps/plugin-opener";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UseFormReturn } from "react-hook-form";
import { cn } from "@/lib/utils";

interface Step3ApiKeyProps {
  userForm: UseFormReturn<any>;
  verificationStatus: 'idle' | 'loading' | 'success' | 'error';
  setVerificationStatus: (status: 'idle' | 'loading' | 'success' | 'error') => void;
  isFreeUser: boolean;
  setValue: (name: any, value: any) => void;
  t: any;
}

export const Step3ApiKey = ({ 
  userForm, 
  verificationStatus, 
  setVerificationStatus, 
  isFreeUser, 
  setValue, 
  t 
}: Step3ApiKeyProps) => {
  const openGoogleAIStudio = async () => {
    await open("https://aistudio.google.com/app/apikey");
  };

  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 flex-1 flex flex-col justify-center"
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary leading-tight">
          {t.onboarding.step3_title}
        </h1>
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-medium text-text-secondary">
            {t.onboarding.step3_subtitle}
          </h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="p-1 text-text-muted hover:text-text-primary transition-colors">
                  <Info size={18} />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[200px] p-3 text-xs font-bold leading-relaxed bg-surface-elevated border-border shadow-xl">
                {t.onboarding.step3_security_tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <button 
          type="button"
          onClick={openGoogleAIStudio}
          className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-sm font-bold transition-colors group pt-1"
        >
          {t.onboarding.api_key_guide}
          <ExternalLink size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>
      <div className="space-y-4">
        <div className="relative">
          <Input 
            type="password"
            {...userForm.register("geminiApiKey", {
              onChange: () => {
                if (verificationStatus !== 'idle') setVerificationStatus('idle');
              }
            })} 
            autoFocus
            placeholder={t.onboarding.api_key_placeholder} 
            className={cn(
              "bg-background border-border text-text-primary h-16 rounded-2xl px-6 font-mono focus:ring-2 focus:ring-text-primary/10 transition-all",
              verificationStatus === 'success' && "border-success focus:ring-success/10",
              verificationStatus === 'error' && "border-danger focus:ring-danger/10"
            )}
          />
          {verificationStatus === 'success' && (
            <CheckCircle2 size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-success" />
          )}
        </div>
        {verificationStatus === 'error' && (
          <p className="text-sm text-danger font-bold flex items-center gap-1.5 pl-1">
            <AlertCircle size={16}/> {t.onboarding.api_key_invalid}
          </p>
        )}

        <div 
          className="flex items-center justify-between p-5 bg-background border border-border rounded-2xl cursor-pointer hover:border-text-primary/20 transition-all group mt-2"
          onClick={() => setValue("isFreeUser", !isFreeUser)}
        >
          <div className="space-y-0.5">
            <Label className="text-base font-bold text-text-primary cursor-pointer">
              {t.onboarding.free_user_label}
            </Label>
            <p className="text-[10px] text-text-muted font-medium leading-tight max-w-[220px]">
              {t.onboarding.free_user_guide}
            </p>
          </div>
          <div className={cn(
            "w-12 h-6 rounded-full p-1 transition-colors flex items-center shrink-0",
            isFreeUser ? "bg-text-primary" : "bg-border"
          )}>
            <motion.div 
              animate={{ x: isFreeUser ? 24 : 0 }}
              className="w-4 h-4 bg-background rounded-full shadow-sm"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
