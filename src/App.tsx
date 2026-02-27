import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { translations, getLang } from "@/lib/i18n";

const userSchema = z.object({
  nickname: z.string().min(1, "Nickname is required").max(20),
  gemini_api_key: z.string().optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

function App() {
  const [isChecking, setIsChecking] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [user, setUser] = useState<{ nickname: string } | null>(null);

  // 현재 언어 설정 감지
  const lang = useMemo(() => getLang(), []);
  const t = translations[lang];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
  });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const exists = await invoke<boolean>("check_user_exists");
      if (exists) {
        const userData = await invoke<{ nickname: string }>("get_user");
        setUser(userData);
        setShowModal(false);
      } else {
        setShowModal(true);
      }
    } catch (error) {
      console.error("Failed to check user:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const onSubmit = async (data: UserFormValues) => {
    try {
      await invoke("save_user", {
        nickname: data.nickname,
        gemini_api_key: data.gemini_api_key || null,
      });
      setUser({ nickname: data.nickname });
      setShowModal(false);
    } catch (error) {
      console.error("Failed to save user:", error);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-white">
        <p className="text-muted-foreground animate-pulse">{t.checking}</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#09090b] text-white p-8">
      {user ? (
        <div className="text-center space-y-4 animate-in fade-in duration-500">
          <h1 className="text-4xl font-bold tracking-tight">
            {t.welcome}
            <span className="text-primary">{user.nickname}</span>!
          </h1>
          <p className="text-muted-foreground">{t.ready_msg}</p>
        </div>
      ) : (
        <p className="text-muted-foreground">{t.checking}</p>
      )}

      {/* 모달 스타일 및 배경 조정 */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent 
          className="sm:max-w-[425px] bg-[#18181b] border-[#27272a] text-white shadow-2xl" 
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-white text-xl">{t.onboarding.title}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t.onboarding.description}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="nickname" className="text-white">{t.onboarding.nickname_label}</Label>
              <Input
                id="nickname"
                placeholder={t.onboarding.nickname_placeholder}
                {...register("nickname")}
                className={`bg-[#09090b] border-[#27272a] text-white focus:ring-primary ${errors.nickname ? "border-destructive" : ""}`}
              />
              {errors.nickname && (
                <p className="text-xs text-destructive">{t.onboarding.nickname_required}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_key" className="text-white">{t.onboarding.api_key_label}</Label>
              <Input
                id="api_key"
                type="password"
                placeholder={t.onboarding.api_key_placeholder}
                {...register("gemini_api_key")}
                className="bg-[#09090b] border-[#27272a] text-white focus:ring-primary"
              />
              <p className="text-[0.7rem] text-muted-foreground leading-relaxed">
                {t.onboarding.api_key_guide}
              </p>
            </div>

            <DialogFooter>
              <Button type="submit" className="w-full bg-white text-black hover:bg-white/90">
                {t.onboarding.submit_btn}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

export default App;
