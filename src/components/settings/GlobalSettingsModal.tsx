import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useForm } from "react-hook-form";
import { Bell } from "lucide-react";
import {
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { User } from "@/types";
import { useToast } from "@/providers/ToastProvider";

interface GlobalSettingsModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdate: (updatedUser?: User) => Promise<void>;
  t: any;
}

export const GlobalSettingsModal = ({
  user,
  isOpen,
  onClose,
  onUserUpdate,
  t,
}: GlobalSettingsModalProps) => {
  const { showToast } = useToast();

  const { register, handleSubmit, reset, setValue } = useForm({
    defaultValues: {
      nickname: user.nickname,
      geminiApiKey: user.geminiApiKey || "",
      lang: user.lang,
      isNotificationEnabled: user.isNotificationEnabled,
      dayStartTime: user.dayStartTime,
    }
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        nickname: user.nickname,
        geminiApiKey: user.geminiApiKey || "",
        lang: user.lang,
        isNotificationEnabled: user.isNotificationEnabled,
        dayStartTime: user.dayStartTime,
      });
    }
  }, [isOpen, user, reset]);

  const onSubmit = async (data: any) => {
    try {
      const updatedUser = await invoke<User>("save_user", { 
        nickname: data.nickname, 
        geminiApiKey: data.geminiApiKey || null,
        lang: data.lang,
        isNotificationEnabled: data.isNotificationEnabled,
        dayStartTime: data.dayStartTime,
      });
      await onUserUpdate(updatedUser);
      showToast(t.main.toast.profile_updated, "success");
      onClose();
    } catch (error: any) {
      showToast(error.toString(), "error");
    }
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-surface-elevated border-border text-text-primary shadow-2xl rounded-2xl p-0 overflow-hidden antialiased">
        <DialogHeader className="p-8 pb-4 shrink-0 space-y-1.5">
          <DialogTitle className="text-2xl font-black tracking-tighter text-text-primary leading-none">
            {t.sidebar.profile}
          </DialogTitle>
          <DialogDescription className="text-sm text-text-secondary leading-relaxed">
            {t.sidebar.settings_desc}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="px-8 pb-8 space-y-6">
          <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-1 -mr-1 scrollbar-hide">
            <div className="space-y-3">
              <Label className="text-xs font-medium text-text-secondary uppercase tracking-widest">{t.onboarding.nickname_label}</Label>
              <Input {...register("nickname")} className="bg-surface border-border text-text-primary h-12 rounded-xl px-4 font-medium focus:ring-1 focus:ring-white/10" />
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-medium text-text-secondary uppercase tracking-widest">{t.onboarding.api_key_label}</Label>
              <Input type="password" {...register("geminiApiKey")} className="bg-surface border-border text-text-primary h-12 rounded-xl px-4 font-medium focus:ring-1 focus:ring-white/10" />
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-medium text-text-secondary uppercase tracking-widest">{t.sidebar.lang_label}</Label>
              <select 
                {...register("lang")}
                className="w-full h-12 bg-surface border border-border rounded-xl px-4 font-medium text-text-primary outline-none focus:ring-1 focus:ring-white/10 appearance-none"
              >
                <option value="ko">한국어 (Korean)</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-medium text-text-secondary uppercase tracking-widest">{t.onboarding.day_start_time_label}</Label>
              <Input type="time" {...register("dayStartTime")} className="bg-surface border-border text-text-primary h-12 rounded-xl px-4 font-medium [color-scheme:dark] focus:ring-1 focus:ring-white/10" />
              <p className="text-[10px] text-text-secondary leading-relaxed">{t.onboarding.day_start_time_guide}</p>
            </div>

            <div className="space-y-3 pt-2">
              <Label className="text-xs font-medium text-text-secondary uppercase tracking-widest">{t.sidebar.notification_settings}</Label>
              <div className="flex items-center justify-between p-4 bg-surface border border-border rounded-xl">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-text-primary flex items-center gap-2 uppercase tracking-widest">
                    <Bell size={14} /> {t.onboarding.notification_label}
                  </Label>
                  <p className="text-[10px] text-text-secondary leading-none">{t.onboarding.notification_guide}</p>
                </div>
                <input 
                  type="checkbox"
                  {...register("isNotificationEnabled")}
                  onChange={(e) => handleNotificationToggle(e.target.checked)}
                  className="w-5 h-5 rounded-md accent-text-primary cursor-pointer"
                />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full bg-text-primary text-background hover:bg-zinc-200 font-bold h-12 rounded-xl text-sm transition-all shadow-xl active:scale-95">
            {t.sidebar.save_changes}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
