import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormContext } from "react-hook-form";

import { OnboardingData } from "../schema";
import { useTranslation } from "react-i18next";
import { User } from "lucide-react";



export function Step1Profile() {
  const { register, formState: { errors } } = useFormContext<OnboardingData>();
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-500/20 mb-4">
          <User className="w-8 h-8 text-indigo-400" />
        </div>
        <p className="text-zinc-400 text-sm">당신의 이름을 알려주세요</p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="nickname" className="text-zinc-300 font-medium">
          {t("steps.profile.nickname")}
        </Label>
        <div className="relative">
          <Input
            id="nickname"
            placeholder={t("steps.profile.nicknamePlaceholder")}
            className="bg-zinc-950/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500 focus:ring-indigo-500/20 h-12 text-lg"
            {...register("nickname")}
          />
        </div>
        {errors.nickname && (
          <p className="text-sm text-red-400 mt-1 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-red-400" />
            {errors.nickname.message}
          </p>
        )}
      </div>
    </div>
  );
}
