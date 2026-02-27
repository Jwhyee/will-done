import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import { OnboardingData } from "../schema";

interface Step1Props {
  register: UseFormRegister<OnboardingData>;
  errors: FieldErrors<OnboardingData>;
}

export function Step1Profile({ register, errors }: Step1Props) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="nickname">Nickname</Label>
        <Input
          id="nickname"
          placeholder="Enter your nickname"
          {...register("nickname")}
        />
        {errors.nickname && <p className="text-sm text-red-500">{errors.nickname.message}</p>}
      </div>
    </div>
  );
}
