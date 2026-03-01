import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AlertCircle } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
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

interface OnboardingViewProps {
  t: any;
  onComplete: (user: User) => void;
}

export const OnboardingView = ({ t, onComplete }: OnboardingViewProps) => {
  const userSchema = z.object({
    nickname: z.string().min(1, t.onboarding.nickname_required).max(20),
    geminiApiKey: z.string().optional(),
  });

  type UserFormValues = z.infer<typeof userSchema>;

  const userForm = useForm<UserFormValues>({ 
    resolver: zodResolver(userSchema),
    defaultValues: { nickname: "", geminiApiKey: "" }
  });

  const onUserSubmit = async (data: UserFormValues) => {
    await invoke("save_user", { 
      nickname: data.nickname, 
      geminiApiKey: data.geminiApiKey || null,
      lang: getLang() 
    });
    const u = await invoke<User>("get_user");
    onComplete(u);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <Dialog open={true}>
        <DialogContent className="sm:max-w-[425px] bg-surface-elevated border-border text-text-primary shadow-2xl [&>button]:hidden rounded-2xl p-8 border-t-border/50 antialiased">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-black tracking-tighter text-text-primary leading-none">{t.onboarding.title}</DialogTitle>
            <DialogDescription className="text-text-secondary text-sm leading-relaxed">{t.onboarding.description}</DialogDescription>
          </DialogHeader>
          <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-8 mt-6">
            <div className="space-y-3">
              <Label className="text-xs font-medium text-text-secondary uppercase tracking-widest">{t.onboarding.nickname_label}</Label>
              <Input {...userForm.register("nickname")} placeholder={t.onboarding.nickname_placeholder} className="bg-background border-border text-text-primary h-12 rounded-xl px-4 font-medium focus:ring-1 focus:ring-white/10" />
              {userForm.formState.errors.nickname && (
                <p className="text-xs text-danger font-medium flex items-center gap-1"><AlertCircle size={12}/> {userForm.formState.errors.nickname.message}</p>
              )}
            </div>
            <div className="space-y-3">
              <Label className="text-xs font-medium text-text-secondary uppercase tracking-widest">{t.onboarding.api_key_label}</Label>
              <Input type="password" {...userForm.register("geminiApiKey")} placeholder={t.onboarding.api_key_placeholder} className="bg-background border-border text-text-primary h-12 rounded-xl px-4 font-medium focus:ring-1 focus:ring-white/10" />
              <p className="text-xs text-text-secondary leading-relaxed">{t.onboarding.api_key_guide}</p>
            </div>
            <Button type="submit" className="w-full bg-text-primary text-background hover:bg-zinc-200 font-bold h-14 rounded-xl text-lg transition-all shadow-xl shadow-black/20 active:scale-95">
              {t.onboarding.submit_btn}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
