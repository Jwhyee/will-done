import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  currentStep: number;
}

export const StepIndicator = ({ currentStep }: StepIndicatorProps) => {
  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      {[1, 2, 3, 4].map((step) => (
        <div
          key={step}
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            currentStep === step ? "w-8 bg-white" : "w-2 bg-zinc-600"
          )}
        />
      ))}
    </div>
  );
};
