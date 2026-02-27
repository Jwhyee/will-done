import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormContext } from "react-hook-form";

import { OnboardingData } from "../schema";
import { useTranslation } from "react-i18next";
import { Sparkles, KeyRound } from "lucide-react";



export function Step4AI() {
  const { register } = useFormContext<OnboardingData>();
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 mb-4">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <p className="text-zinc-400 text-sm">AI 회고 기능을 위한 API 키를 입력해주세요</p>
        <p className="text-zinc-500 text-xs mt-1">선택 사항이며, 나중에 추가할 수도 있어요</p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="apiKey" className="text-zinc-300 font-medium flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-zinc-500" />
          {t("steps.ai.apiKey")}
        </Label>
        <Input
          id="apiKey"
          type="password"
          placeholder={t("steps.ai.apiKeyPlaceholder")}
          className="bg-zinc-950/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500 focus:ring-indigo-500/20 h-12 font-mono"
          {...register("apiKey")}
        />
        <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          {t("steps.ai.apiKeyHint")}
        </p>
      </div>
    </div>
  );
}
