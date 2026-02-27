import { useState, useEffect } from "react";
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

// 폼 유효성 검사 스키마
const userSchema = z.object({
  nickname: z.string().min(1, "Nickname is required").max(20),
  gemini_api_key: z.string().optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

function App() {
  const [isChecking, setIsChecking] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [user, setUser] = useState<{ nickname: string } | null>(null);

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground animate-pulse">Checking profile...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-8">
      {user ? (
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome back, <span className="text-primary">{user.nickname}</span>!
          </h1>
          <p className="text-muted-foreground">
            You are ready to manage your time with will-done.
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground">Please complete the setup.</p>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[425px]" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Create Global Profile</DialogTitle>
            <DialogDescription>
              Welcome to will-done. Please set up your profile to continue.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname (Required)</Label>
              <Input
                id="nickname"
                placeholder="How should we call you?"
                {...register("nickname")}
                className={errors.nickname ? "border-destructive" : ""}
              />
              {errors.nickname && (
                <p className="text-xs text-destructive">{errors.nickname.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_key">Google AI Studio API Key (Optional)</Label>
              <Input
                id="api_key"
                type="password"
                placeholder="Enter your API key"
                {...register("gemini_api_key")}
              />
              <p className="text-[0.7rem] text-muted-foreground leading-relaxed">
                * This key is used for AI-generated retrospectives. You can add it later in settings.
              </p>
            </div>

            <DialogFooter>
              <Button type="submit" className="w-full">
                Get Started
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

export default App;
