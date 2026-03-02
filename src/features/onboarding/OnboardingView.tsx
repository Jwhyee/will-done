import { useState, KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft, 
  Info, 
  ExternalLink,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";
import {
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";
import { openUrl as open } from "@tauri-apps/plugin-opener";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { User } from "@/types";
import { getLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/ToastProvider";

interface OnboardingViewProps {
  t: any;
  onComplete: (user: User) => void;
}

export const OnboardingView = ({ t, onComplete }: OnboardingViewProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const { showToast } = useToast();

  const userSchema = z.object({
    nickname: z.string().min(1, t.onboarding.nickname_required).max(20),
    geminiApiKey: z.string(),
    isNotificationEnabled: z.boolean(),
    dayStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "HH:mm format required"),
  });

  type UserFormValues = z.infer<typeof userSchema>;

  const userForm = useForm<UserFormValues>({ 
    resolver: zodResolver(userSchema),
    defaultValues: { 
      nickname: "", 
      geminiApiKey: "", 
      isNotificationEnabled: false, 
      dayStartTime: "04:00" 
    }
  });

  const { watch, setValue, handleSubmit, formState: { errors } } = userForm;
  const nickname = watch("nickname");
  const apiKey = watch("geminiApiKey");

  const onUserSubmit = async (data: UserFormValues) => {
    await invoke("save_user", { 
      nickname: data.nickname, 
      geminiApiKey: data.geminiApiKey || null,
      lang: getLang(),
      isNotificationEnabled: data.isNotificationEnabled,
      dayStartTime: data.dayStartTime,
    });
    const u = await invoke<User>("get_user");
    onComplete(u);
  };

  const handleNotificationToggle = async (checked: boolean) => {
    if (checked) {
      let permission = await isPermissionGranted();
      if (!permission) {
        permission = await requestPermission() === "granted";
      }
      setValue("isNotificationEnabled", permission);
    } else {
      setValue("isNotificationEnabled", false);
    }
  };

  const handleVerifyApiKey = async () => {
    const currentApiKey = watch("geminiApiKey");
    if (!currentApiKey) {
      nextStep();
      return;
    }
    
    setVerificationStatus('loading');
    try {
      // Use api_key to match Rust command argument name
      await invoke("fetch_available_models", { api_key: currentApiKey });
      setVerificationStatus('success');
      showToast(t.onboarding.api_key_valid, "success");
    } catch (error) {
      console.error(error);
      setVerificationStatus('error');
    }
  };

  const handleStep3Click = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!apiKey || verificationStatus === 'success') {
      nextStep(e);
    } else {
      handleVerifyApiKey();
    }
  };

  const nextStep = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (currentStep < 4) setCurrentStep(prev => prev + 1);
  };

  const prevStep = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (currentStep === 1 && nickname) {
        nextStep();
      } else if (currentStep === 2) {
        nextStep();
      } else if (currentStep === 3) {
        handleStep3Click();
      } else if (currentStep === 4) {
        handleSubmit(onUserSubmit)();
      }
    }
  };

  const openGoogleAIStudio = async () => {
    await open("https://aistudio.google.com/app/apikey");
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-background p-4 antialiased">
      {/* Draggable region for Tauri */}
      <div className="absolute top-0 left-0 w-full h-8 z-40" data-tauri-drag-region />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-surface-elevated border border-border/50 rounded-[2.5rem] shadow-2xl shadow-black/20 overflow-hidden flex flex-col h-fit relative z-50"
      >
        <form onSubmit={handleSubmit(onUserSubmit)} onKeyDown={handleKeyDown} className="flex-1 flex flex-col">
          <div className="flex-1 p-10 flex flex-col">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8 flex-1 flex flex-col justify-center"
                >
                  <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-text-primary leading-tight">
                      {t.onboarding.step1_title}
                    </h1>
                    <h3 className="text-xl font-medium text-text-secondary">
                      {t.onboarding.step1_subtitle}
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <Input 
                      {...userForm.register("nickname")} 
                      autoFocus
                      placeholder={t.onboarding.nickname_placeholder} 
                      className="bg-background border-border text-text-primary h-16 rounded-2xl px-6 text-xl font-bold focus:ring-2 focus:ring-text-primary/10 transition-all"
                    />
                    {errors.nickname && (
                      <p className="text-sm text-danger font-bold flex items-center gap-1.5 pl-1">
                        <AlertCircle size={16}/> {errors.nickname.message}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8 flex-1 flex flex-col justify-center"
                >
                  <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-text-primary leading-tight">
                      {t.onboarding.step2_title.replace("{nickname}", nickname)}
                    </h1>
                    <h3 className="text-xl font-medium text-text-secondary">
                      {t.onboarding.step2_subtitle}
                    </h3>
                    <p className="text-text-muted text-xs font-medium leading-relaxed mt-2">
                      {t.onboarding.day_start_time_guide}
                    </p>
                  </div>
                  <div className="space-y-4">
                    <Input 
                      type="time" 
                      {...userForm.register("dayStartTime")} 
                      autoFocus
                      className="bg-background border-border text-text-primary h-16 rounded-2xl px-6 text-2xl font-black [color-scheme:dark] focus:ring-2 focus:ring-text-primary/10" 
                    />
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
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
                  </div>
                </motion.div>
              )}

              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8 flex-1 flex flex-col justify-center"
                >
                  <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-text-primary leading-tight">
                      {t.onboarding.step4_title}
                    </h1>
                    <h3 className="text-xl font-medium text-text-secondary">
                      {t.onboarding.step4_subtitle}
                    </h3>
                  </div>
                  <div 
                    className="flex items-center justify-between p-6 bg-background border border-border rounded-2xl cursor-pointer hover:border-text-primary/20 transition-all group"
                    onClick={() => handleNotificationToggle(!watch("isNotificationEnabled"))}
                  >
                    <Label className="text-lg font-bold text-text-primary cursor-pointer">
                      {t.onboarding.notification_label}
                    </Label>
                    <div className={cn(
                      "w-14 h-7 rounded-full p-1 transition-colors flex items-center",
                      watch("isNotificationEnabled") ? "bg-text-primary" : "bg-border"
                    )}>
                      <motion.div 
                        animate={{ x: watch("isNotificationEnabled") ? 28 : 0 }}
                        className="w-5 h-5 bg-background rounded-full shadow-sm"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-10 pt-0 shrink-0">
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
            
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2 mt-8">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    currentStep === step ? "w-8 bg-white" : "w-2 bg-zinc-600"
                  )}
                />
              ))}
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
