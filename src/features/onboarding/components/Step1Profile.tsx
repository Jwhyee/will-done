import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import { OnboardingData } from "../schema";
import { useTranslation } from "react-i18next";

interface Step1Props {
  register: UseFormRegister<OnboardingData>;
  errors: FieldErrors<OnboardingData>;
}

export function Step1Profile({ register, errors }: Step1Props) {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="nickname">{t("steps.profile.nickname")}</Label>
        <Input
          id="nickname"
          placeholder={t("steps.profile.nicknamePlaceholder")}
          {...register("nickname")}
        />
        {errors.nickname && (
          <p className="text-sm text-destructive mt-1">{errors.nickname.message}</p>
        )}
      </div>
    </div>
  );
}
