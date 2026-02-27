import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import { OnboardingData } from "../schema";

interface Step2Props {
  register: UseFormRegister<OnboardingData>;
  errors: FieldErrors<OnboardingData>;
}

export function Step2Workspace({ register, errors }: Step2Props) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="workspaceName">Workspace Name</Label>
        <Input
          id="workspaceName"
          placeholder="e.g., Personal, Work"
          {...register("workspaceName")}
        />
        {errors.workspaceName && <p className="text-sm text-red-500">{errors.workspaceName.message}</p>}
      </div>
    </div>
  );
}
