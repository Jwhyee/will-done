import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UseFormRegister } from "react-hook-form";
import { OnboardingData } from "../schema";

interface Step4Props {
  register: UseFormRegister<OnboardingData>;
}

export function Step4AI({ register }: Step4Props) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="apiKey">AI API Key (Optional)</Label>
        <Input
          id="apiKey"
          type="password"
          placeholder="sk-..."
          {...register("apiKey")}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Required for AI Retrospective feature.
        </p>
      </div>
    </div>
  );
}
