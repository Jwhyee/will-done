import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";

interface Step2TimeProps {
  userForm: UseFormReturn<any>;
  nickname: string;
  t: any;
}

export const Step2Time = ({ userForm, nickname, t }: Step2TimeProps) => {
  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 flex-1 flex flex-col justify-center"
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary leading-tight">
          {t.onboarding.step2_title.replace("{nickname}", nickname)}
        </h1>
        <h3 className="text-xl font-medium text-text-secondary">
          {t.onboarding.step2_subtitle}
        </h3>
        <p className="text-text-muted text-xs font-medium leading-relaxed mt-2">
          {t.onboarding.day_start_time_guide}
        </p>
      </div>
      <div className="space-y-4">
        <Input 
          type="time" 
          {...userForm.register("dayStartTime")} 
          autoFocus
          className="bg-background border-border text-text-primary h-16 rounded-2xl px-6 text-2xl font-black [color-scheme:dark] focus:ring-2 focus:ring-text-primary/10" 
        />
      </div>
    </motion.div>
  );
};
