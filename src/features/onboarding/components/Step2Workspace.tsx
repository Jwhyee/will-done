import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import { OnboardingData } from "../schema";
import { useTranslation } from "react-i18next";

interface Step2Props {
  register: UseFormRegister<OnboardingData>;
  errors: FieldErrors<OnboardingData>;
}

export function Step2Workspace({ register, errors }: Step2Props) {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="workspaceName">{t("steps.workspace.workspaceName")}</Label>
        <Input
          id="workspaceName"
          placeholder={t("steps.workspace.workspaceNamePlaceholder")}
          {...register("workspaceName")}
        />
        {errors.workspaceName && (
          <p className="text-sm text-destructive mt-1">{errors.workspaceName.message}</p>
        )}
      </div>
    </div>
  );
}
