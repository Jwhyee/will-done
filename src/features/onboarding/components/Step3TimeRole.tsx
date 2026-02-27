import { useFieldArray } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UseFormRegister, Control } from "react-hook-form";
import { OnboardingData } from "../schema";
import { Plus, Trash2 } from "lucide-react";

interface Step3Props {
  register: UseFormRegister<OnboardingData>;
  control: Control<OnboardingData>;
}

export function Step3TimeRole({ register, control }: Step3Props) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "unpluggedTimes"
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="coreTimeStart">Core Time Start</Label>
          <Input
            id="coreTimeStart"
            type="time"
            {...register("coreTimeStart")}
          />
        </div>
        <div>
          <Label htmlFor="coreTimeEnd">Core Time End</Label>
          <Input
            id="coreTimeEnd"
            type="time"
            {...register("coreTimeEnd")}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="roleIntro">Role Introduction</Label>
        <textarea
          id="roleIntro"
          className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          placeholder="Describe your role..."
          {...register("roleIntro")}
        />
      </div>

      <div className="space-y-2">
        <Label>Unplugged Times</Label>
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2 items-start">
            <div className="flex-1">
              <Input
                placeholder="Label (e.g. Lunch)"
                {...register(`unpluggedTimes.${index}.label` as const)}
              />
            </div>
            <Input
              type="time"
              className="w-28"
              {...register(`unpluggedTimes.${index}.start_time` as const)}
            />
            <Input
              type="time"
              className="w-28"
              {...register(`unpluggedTimes.${index}.end_time` as const)}
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ label: "", start_time: "", end_time: "" })}
        >
          <Plus className="h-4 w-4 mr-2" /> Add Unplugged Time
        </Button>
      </div>
    </div>
  );
}
