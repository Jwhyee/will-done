import { useFieldArray } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UseFormRegister, Control, FieldErrors, useFormContext } from "react-hook-form";
import { OnboardingData } from "../schema";
import { Plus, Trash2, Clock, Briefcase, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Step3Props {
  register: UseFormRegister<OnboardingData>;
  control: Control<OnboardingData>;
  errors: FieldErrors<OnboardingData>;
}

export function Step3TimeRole({ register, control, errors }: Step3Props) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "unpluggedTimes"
  });

  const { watch, setValue } = useFormContext();
  const coreTimeStartValue = watch("coreTimeStart");
  const coreTimeEndValue = watch("coreTimeEnd");

  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "unpluggedTimes"
  });

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 mb-4">
          <Briefcase className="w-8 h-8 text-amber-400" />
        </div>
        <p className="text-zinc-400 text-sm">근무 시간과 역할을 설정해주세요</p>
      </div>

      <div className="space-y-4">
        <Label className="text-zinc-300 font-medium flex items-center gap-2">
          <Clock className="w-4 h-4 text-zinc-500" />
          코어 타임 (선택)
        </Label>
        <p className="text-xs text-zinc-500 mt-1">{t("steps.timeRole.coreTimeDescription")}</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
          <div className="relative">
            <Input
              type="time"
              className="bg-zinc-950/50 border-zinc-700 text-zinc-100 focus:border-amber-500 focus:ring-amber-500/20 pr-8"
              {...register("coreTimeStart")}
            />
            {coreTimeStartValue && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setValue("coreTimeStart", "")}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <p className="text-xs text-zinc-500 mt-1">시작</p>
          </div>
          <div>
          <div className="relative">
            <Input
              type="time"
              className="bg-zinc-950/50 border-zinc-700 text-zinc-100 focus:border-amber-500 focus:ring-amber-500/20 pr-8"
              {...register("coreTimeEnd")}
            />
            {coreTimeEndValue && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setValue("coreTimeEnd", "")}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <p className="text-xs text-zinc-500 mt-1">종료</p>
          </div>
        </div>
        </div>
        {errors.coreTimeEnd && (
          <p className="text-xs text-red-400 mt-1 text-center">{errors.coreTimeEnd?.message}</p>
        )}

      <div className="space-y-2">
        <Label htmlFor="roleIntro" className="text-zinc-300 font-medium">
          {t("steps.timeRole.roleIntro")}
        </Label>
        <textarea
          id="roleIntro"
          rows={3}
          className="flex w-full rounded-md border border-zinc-700 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500/20 resize-none"
          placeholder={t("steps.timeRole.roleIntroPlaceholder")}
          {...register("roleIntro")}
        />
      </div>

      <div className="space-y-3">
        <Label className="text-zinc-300 font-medium">
          {t("steps.timeRole.unpluggedTimes")}
        </Label>
        <p className="text-xs text-zinc-500 mt-1">{t("steps.timeRole.unpluggedTimeDescription")}</p>
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2 items-start bg-zinc-950/30 p-3 rounded-lg">
            <div className="flex-1 space-y-1">
              <Input
                placeholder={t("steps.timeRole.labelPlaceholder")}
                className="bg-zinc-950/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500"
                {...register(`unpluggedTimes.${index}.label` as const)}
              />
              {errors.unpluggedTimes?.[index]?.label && (
                <p className="text-xs text-red-400">{errors.unpluggedTimes[index]?.label?.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Input
                type="time"
                className="w-28 bg-zinc-950/50 border-zinc-700 text-zinc-100 focus:border-amber-500"
                {...register(`unpluggedTimes.${index}.start_time` as const)}
              />
              {errors.unpluggedTimes?.[index]?.start_time && (
                <p className="text-xs text-red-400">{errors.unpluggedTimes[index]?.start_time?.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Input
                type="time"
                className="w-28 bg-zinc-950/50 border-zinc-700 text-zinc-100 focus:border-amber-500"
                {...register(`unpluggedTimes.${index}.end_time` as const)}
              />
              {errors.unpluggedTimes?.[index]?.end_time && (
                <p className="text-xs text-red-400">{errors.unpluggedTimes[index]?.end_time?.message}</p>
              )}
            </div>
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              onClick={() => remove(index)}
              className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <div className="flex flex-col items-start">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ label: "", start_time: "", end_time: "" })}
            className="border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 mt-2"
          >
            <Plus className="h-4 w-4 mr-2" /> 
            {t("steps.timeRole.addUnplugged")}
          </Button>
        </div>
    </div>
  );
}
