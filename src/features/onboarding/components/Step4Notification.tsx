import { motion } from "framer-motion";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Step4NotificationProps {
  isNotificationEnabled: boolean;
  handleNotificationToggle: (checked: boolean) => void;
  t: any;
}

export const Step4Notification = ({ 
  isNotificationEnabled, 
  handleNotificationToggle, 
  t 
}: Step4NotificationProps) => {
  return (
    <motion.div
      key="step4"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 flex-1 flex flex-col justify-center"
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary leading-tight">
          {t.onboarding.step4_title}
        </h1>
        <h3 className="text-xl font-medium text-text-secondary">
          {t.onboarding.step4_subtitle}
        </h3>
      </div>
      <div 
        className="flex items-center justify-between p-6 bg-background border border-border rounded-2xl cursor-pointer hover:border-text-primary/20 transition-all group"
        onClick={() => handleNotificationToggle(!isNotificationEnabled)}
      >
        <Label className="text-lg font-bold text-text-primary cursor-pointer">
          {t.onboarding.notification_label}
        </Label>
        <div className={cn(
          "w-14 h-7 rounded-full p-1 transition-colors flex items-center",
          isNotificationEnabled ? "bg-text-primary" : "bg-border"
        )}>
          <motion.div 
            animate={{ x: isNotificationEnabled ? 28 : 0 }}
            className="w-5 h-5 bg-background rounded-full shadow-sm"
          />
        </div>
      </div>
    </motion.div>
  );
};
