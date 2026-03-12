import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StepperProps {
  onPrev: () => void;
  onNext: () => void;
  prevDisabled: boolean;
  nextDisabled: boolean;
  label: string;
}

export const Stepper = ({ 
  onPrev, 
  onNext, 
  prevDisabled, 
  nextDisabled,
  label 
}: StepperProps) => (
  <div className="flex items-center justify-between w-full bg-surface border border-border rounded-xl p-1.5 h-12 shadow-sm">
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={onPrev} 
      disabled={prevDisabled}
      className="rounded-lg w-9 h-9 hover:bg-primary/10 hover:text-primary transition-all active:scale-90 disabled:opacity-20"
    >
      <ChevronLeft size={18} />
    </Button>
    
    <div className="flex flex-col items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.span 
          key={label}
          initial={{ y: 5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -5, opacity: 0 }}
          className="text-sm font-bold tracking-tight text-text-primary whitespace-nowrap"
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </div>

    <Button 
      variant="ghost" 
      size="icon" 
      onClick={onNext} 
      disabled={nextDisabled}
      className="rounded-lg w-9 h-9 hover:bg-primary/10 hover:text-primary transition-all active:scale-90 disabled:opacity-20"
    >
      <ChevronRight size={18} />
    </Button>
  </div>
);
