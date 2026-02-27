import { useState } from "react";
import { useForm, SubmitHandler, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { invoke } from "../../../lib/tauri";
import { onboardingSchema, OnboardingData } from "../schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { User, ArrowRight } from "lucide-react";

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation();

  const methods = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      nickname: "",
      workspaceName: "My Workspace",
      roleIntro: "",
      unpluggedTimes: []
    }
  });
  const { register, handleSubmit, formState: { errors } } = methods;

  const onSubmit: SubmitHandler<OnboardingData> = async (data) => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: data.workspaceName || "My Workspace",
        nickname: data.nickname,
        core_time_start: null,
        core_time_end: null,
        role_intro: "",
        unplugged_times: [],
      };
      
      console.log("Quick setup invoking setup_workspace:", payload);
      await invoke("setup_workspace", payload);
      
      localStorage.setItem("nickname", data.nickname);
      onComplete();
    } catch (e) {
      console.error("Failed to setup workspace:", e);
      alert(t("alerts.setupFailed", { error: String(e) }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md p-0 bg-transparent border-none shadow-none focus:outline-none overflow-hidden">
        <Card className="w-full bg-zinc-900/90 backdrop-blur-xl border-zinc-800 shadow-2xl overflow-hidden">
          <CardHeader className="space-y-4 pt-10 pb-6">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-2">
                <User className="w-8 h-8 text-indigo-400" />
              </div>
            </div>
            <div className="text-center">
              <CardTitle className="text-2xl font-bold text-zinc-100">
                Welcome to will-done
              </CardTitle>
              <CardDescription className="text-zinc-400 mt-1">
                사용하실 닉네임을 입력해주세요.
              </CardDescription>
            </div>
          </CardHeader>

          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardContent className="pb-10 px-8">
                <div className="space-y-2">
                  <Label htmlFor="nickname" className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
                    {t("steps.profile.nickname")}
                  </Label>
                  <Input
                    id="nickname"
                    autoFocus
                    placeholder={t("steps.profile.nicknamePlaceholder")}
                    className="bg-zinc-950/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:ring-indigo-500/20 h-12 text-lg transition-all"
                    {...register("nickname")}
                  />
                  {errors.nickname && (
                    <p className="text-xs text-red-400 mt-1 animate-in fade-in slide-in-from-top-1">
                      {errors.nickname.message}
                    </p>
                  )}
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4 pb-10 px-8">
                <Button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white h-12 text-base font-medium shadow-lg shadow-indigo-500/20 group transition-all"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      시작하기
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
                <p className="text-[10px] text-zinc-500 text-center">
                  나머지 설정은 메인 화면의 설정 메뉴에서 언제든 변경할 수 있습니다.
                </p>
              </CardFooter>
            </form>
          </FormProvider>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
