import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";

interface Step1NicknameProps {
  userForm: UseFormReturn<any>;
  errors: any;
  t: any;
}

export const Step1Nickname = ({ userForm, errors, t }: Step1NicknameProps) => {
  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 flex-1 flex flex-col justify-center"
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary leading-tight">
          {t.onboarding.step1_title}
        </h1>
        <h3 className="text-xl font-medium text-text-secondary">
          {t.onboarding.step1_subtitle}
        </h3>
      </div>
      <div className="space-y-4">
        <Input 
          {...userForm.register("nickname")} 
          autoFocus
          placeholder={t.onboarding.nickname_placeholder} 
          className="bg-background border-border text-text-primary h-16 rounded-2xl px-6 text-xl font-bold focus:ring-2 focus:ring-text-primary/10 transition-all"
        />
        {errors.nickname && (
          <p className="text-sm text-danger font-bold flex items-center gap-1.5 pl-1">
            <AlertCircle size={16}/> {errors.nickname.message}
          </p>
        )}
      </div>
    </motion.div>
  );
};
