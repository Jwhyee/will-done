import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface StepLayoutProps {
  children: ReactNode;
  direction?: number;
}

export function StepLayout({ children, direction = 1 }: StepLayoutProps) {
  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={direction} // Simplified key; ideally step index should drive this
        initial={{ x: direction * 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: direction * -50, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
