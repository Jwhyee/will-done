import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UseFormRegister } from "react-hook-form";
import { OnboardingData } from "../schema";
import { useTranslation } from "react-i18next";

interface Step4Props {
  register: UseFormRegister<OnboardingData>;
}

export function Step4AI({ register }: Step4Props) {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="apiKey">{t("steps.ai.apiKey")}</Label>
        <Input
          id="apiKey"
          type="password"
          placeholder={t("steps.ai.apiKeyPlaceholder")}
          {...register("apiKey")}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {t("steps.ai.apiKeyHint")}
        </p>
      </div>
    </div>
  );
}
