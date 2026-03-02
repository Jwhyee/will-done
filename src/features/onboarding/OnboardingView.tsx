import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AlertCircle, Bell, ChevronRight, User as UserIcon, Settings2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";
import {
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User } from "@/types";
import { getLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface OnboardingViewProps {
  t: any;
  onComplete: (user: User) => void;
}

export const OnboardingView = ({ t, onComplete }: OnboardingViewProps) => {
  const [activeStep, setActiveStep] = useState<"profile" | "settings">("profile");

  const userSchema = z.object({
    nickname: z.string().min(1, t.onboarding.nickname_required).max(20),
    geminiApiKey: z.string(),
    isNotificationEnabled: z.boolean(),
    dayStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "HH:mm format required"),
  });

  type UserFormValues = z.infer<typeof userSchema>;

  const userForm = useForm<UserFormValues>({ 
    resolver: zodResolver(userSchema),
    defaultValues: { nickname: "", geminiApiKey: "", isNotificationEnabled: false, dayStartTime: "04:00" }
  });

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
      userForm.setValue("isNotificationEnabled", permission);
    } else {
      userForm.setValue("isNotificationEnabled", false);
    }
  };

  const hasProfileErrors = !!(userForm.formState.errors.nickname || userForm.formState.errors.geminiApiKey);
  const hasSettingsErrors = !!(userForm.formState.errors.dayStartTime);

  return (
    <div className="flex-1 flex items-center justify-center p-8 relative h-screen">
      <Dialog open={true}>
        <DialogContent className="sm:max-w-[480px] h-[640px] bg-surface-elevated border-border text-text-primary shadow-2xl [&>button]:hidden rounded-3xl p-0 border-t-border/50 overflow-hidden flex flex-col antialiased">
          <DialogHeader className="px-8 pt-8 pb-4 shrink-0 space-y-4">
            <div className="space-y-2">
              <DialogTitle className="text-3xl font-black tracking-tighter text-text-primary leading-none">
                {t.onboarding.title}
              </DialogTitle>
              <DialogDescription className="text-text-secondary text-sm font-medium leading-relaxed">
                {t.onboarding.description}
              </DialogDescription>
            </div>

            <div className="flex p-1 bg-surface rounded-xl border border-border/50">
              <button
                onClick={() => setActiveStep("profile")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all",
                  activeStep === "profile" 
                    ? "bg-surface-elevated text-text-primary shadow-sm" 
                    : "text-text-muted hover:text-text-secondary"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] border transition-colors",
                  activeStep === "profile" ? "bg-text-primary text-background border-text-primary" : "border-border text-text-muted"
                )}>1</div>
                {t.onboarding.nickname_label}
                {hasProfileErrors && <div className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />}
              </button>
              <button
                onClick={() => setActiveStep("settings")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all",
                  activeStep === "settings" 
                    ? "bg-surface-elevated text-text-primary shadow-sm" 
                    : "text-text-muted hover:text-text-secondary"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] border transition-colors",
                  activeStep === "settings" ? "bg-text-primary text-background border-text-primary" : "border-border text-text-muted"
                )}>2</div>
                {t.onboarding.day_start_time_label}
                {hasSettingsErrors && <div className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />}
              </button>
            </div>
          </DialogHeader>

          <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-8 py-4 scrollbar-hide">
              <AnimatePresence mode="wait">
                {activeStep === "profile" ? (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-8"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-text-secondary uppercase tracking-widest">
                        <UserIcon size={14} />
                        {t.onboarding.nickname_label}
                      </div>
                      <div className="space-y-2">
                        <Input 
                          {...userForm.register("nickname")} 
                          placeholder={t.onboarding.nickname_placeholder} 
                          className="bg-background border-border text-text-primary h-14 rounded-2xl px-5 text-lg font-bold focus:ring-1 focus:ring-white/10" 
                        />
                        {userForm.formState.errors.nickname && (
                          <p className="text-xs text-danger font-bold flex items-center gap-1.5 pl-1">
                            <AlertCircle size={14}/> {userForm.formState.errors.nickname.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-text-secondary uppercase tracking-widest">
                        <Settings2 size={14} />
                        {t.onboarding.api_key_label}
                      </div>
                      <div className="space-y-3">
                        <Input 
                          type="password" 
                          {...userForm.register("geminiApiKey")} 
                          placeholder={t.onboarding.api_key_placeholder} 
                          className="bg-background border-border text-text-primary h-14 rounded-2xl px-5 font-mono focus:ring-1 focus:ring-white/10" 
                        />
                        <div className="p-4 bg-surface rounded-2xl border border-border/50">
                          <p className="text-xs text-text-secondary leading-relaxed font-medium">
                            {t.onboarding.api_key_guide}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="settings"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-8"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-text-secondary uppercase tracking-widest">
                        <Settings2 size={14} />
                        {t.onboarding.day_start_time_label}
                      </div>
                      <div className="space-y-3">
                        <Input 
                          type="time" 
                          {...userForm.register("dayStartTime")} 
                          className="bg-background border-border text-text-primary h-14 rounded-2xl px-5 text-xl font-black [color-scheme:dark] focus:ring-1 focus:ring-white/10" 
                        />
                        <div className="p-4 bg-surface rounded-2xl border border-border/50">
                          <p className="text-xs text-text-secondary leading-relaxed font-medium">
                            {t.onboarding.day_start_time_guide}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-text-secondary uppercase tracking-widest">
                        <Bell size={14} />
                        {t.onboarding.notification_label}
                      </div>
                      <div className="flex items-center justify-between p-5 bg-background border border-border rounded-2xl group cursor-pointer hover:border-text-primary/20 transition-colors" onClick={() => handleNotificationToggle(!userForm.getValues("isNotificationEnabled"))}>
                        <div className="space-y-1 pr-4">
                          <Label className="text-sm font-bold text-text-primary cursor-pointer">
                            {t.onboarding.notification_label}
                          </Label>
                          <p className="text-[11px] text-text-secondary leading-normal font-medium">
                            {t.onboarding.notification_guide}
                          </p>
                        </div>
                        <div className={cn(
                          "w-12 h-6 rounded-full p-1 transition-colors flex items-center",
                          userForm.watch("isNotificationEnabled") ? "bg-text-primary" : "bg-border"
                        )}>
                          <motion.div 
                            animate={{ x: userForm.watch("isNotificationEnabled") ? 24 : 0 }}
                            className="w-4 h-4 bg-background rounded-full shadow-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="p-8 border-t border-border bg-surface-elevated shrink-0 space-y-3">
              {activeStep === "profile" ? (
                <Button 
                  type="button"
                  onClick={() => setActiveStep("settings")}
                  className="w-full bg-text-primary text-background hover:bg-zinc-200 font-bold h-14 rounded-2xl text-lg transition-all shadow-xl shadow-black/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  {t.onboarding.next_btn}
                  <ChevronRight size={20} />
                </Button>
              ) : (
                <div className="flex gap-3">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => setActiveStep("profile")}
                    className="flex-1 bg-background border-border text-text-primary hover:bg-surface h-14 rounded-2xl font-bold transition-all"
                  >
                    {t.onboarding.prev_btn}
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-[2] bg-text-primary text-background hover:bg-zinc-200 font-bold h-14 rounded-2xl text-lg transition-all shadow-xl shadow-black/20 active:scale-95"
                  >
                    {t.onboarding.submit_btn}
                  </Button>
                </div>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

