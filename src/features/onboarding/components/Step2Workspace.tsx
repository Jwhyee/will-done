import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormContext } from "react-hook-form";

import { OnboardingData } from "../schema";
import { useTranslation } from "react-i18next";
import { Folder } from "lucide-react";



export function Step2Workspace() {
  const { register, formState: { errors } } = useFormContext<OnboardingData>();
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 mb-4">
          <Folder className="w-8 h-8 text-purple-400" />
        </div>
        <p className="text-zinc-400 text-sm">작업할 공간을 만들어주세요</p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="workspaceName" className="text-zinc-300 font-medium">
          {t("steps.workspace.workspaceName")}
        </Label>
        <Input
          id="workspaceName"
          placeholder={t("steps.workspace.workspaceNamePlaceholder")}
          className="bg-zinc-950/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-purple-500 focus:ring-purple-500/20 h-12 text-lg"
          {...register("workspaceName")}
        />
        {errors.workspaceName && (
          <p className="text-sm text-red-400 mt-1 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-red-400" />
            {errors.workspaceName.message}
          </p>
        )}
      </div>
    </div>
  );
}
