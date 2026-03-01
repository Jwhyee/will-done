import React, { ReactNode } from 'react';
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "./ToastProvider";

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ToastProvider>
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </ToastProvider>
  );
};
